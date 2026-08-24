# ACME ERP Inventory Implementation Contract

---

## Document Status & Authority
- **Status**: APPROVED ARCHITECTURAL CONTRACT
- **Target Subsystem**: Inventory, Multi-Store, Batch Tracking, Stock Ledger, Transfers, Indents & POS Billing
- **Target Schema**: PostgreSQL `inventory` Schema
- **Parent System**: ACME ERP (Hospital / Pharma / Store ERP)

---

## A. Existing Architecture Summary

ACME ERP is a production-oriented ERP platform structured as a cohesive full-stack TypeScript repository:

```
acme-erp/
├── server/                 # Hono Backend Application
│   ├── auth.ts             # Better-Auth configuration (PostgreSQL pool bound)
│   ├── routes.ts           # Root API mounting & AppType export
│   ├── routes/             # Feature-specific sub-routers (purchases, staff, nursing, etc.)
│   ├── db/
│   │   ├── client.ts       # Database client & connection pool
│   │   └── schema.ts       # Drizzle ORM schema definitions (public schema)
│   └── utils/              # Calculation & status recalculation utilities
├── src/                    # React 19 Frontend SPA (Vite + TanStack Router)
│   ├── routes/             # File-based routing tree (_authenticated/...)
│   ├── components/         # High-level layouts, navigation, and dialogs
│   ├── lib/                # Query client, permissions, UI stores, settings
│   ├── services/           # Better-Auth client & Hono RPC client (hc<AppType>)
│   └── ui/                 # Radix UI primitives with Tailwind CSS v4 styling
└── drizzle/                # SQL migrations (0000 - 0016)
```

---

## B. Reusable Components & Modules

The following elements are production-ready and **MUST BE REUSED DIRECTLY**:

1. **Authentication & Session Provider**: Better-Auth setup (`server/auth.ts`, `src/services/auth.ts`).
2. **Unit Conversion Matrix Engine**:
   - `public.unit_types` & `public.unit_conversions` tables.
   - UI master at `src/routes/_authenticated/purchases/unit-types.tsx`.
   - Multiplier algorithm bridging base units to purchase/sale packing units (e.g. 1 Box = 10 Strips = 100 Tablets).
3. **Item Catalog Master**:
   - `public.items`, `public.item_types`, and `public.item_unit_prices`.
   - UI at `src/routes/_authenticated/purchases/items.tsx`.
4. **Vendor Master**:
   - `public.vendors` table and `src/routes/_authenticated/purchases/vendors.tsx`.
5. **Purchase Order Workflow**:
   - `public.purchase_orders`, `public.po_items`, and `public.po_payments` with status recalculation logic in `server/utils/poStatus.ts`.
6. **Data Transport & RPC Bridge**:
   - Hono RPC client (`client` from `src/services/rpc.ts`).
   - TanStack Query wrapper (`useRpcQuery` from `src/lib/query.ts`).
7. **Design System & UI Primitives**:
   - `src/ui/` primitives (Card, Button, Dialog, Select, Input, Badge, Table, Popover, DropdownMenu).
   - Shell and Breadcrumbs (`src/components/Shell.tsx`, `src/components/ModuleLayout.tsx`).

---

## C. Existing Code That Must Be Modified

1. **`server/db/schema.ts` (or `server/db/schema-inventory.ts`)**:
   - Add the dedicated PostgreSQL schema `inventory = pgSchema("inventory")`.
   - Declare all inventory tables within `inventorySchema`.
2. **`public.grns` & `public.grn_items`**:
   - Add `storeId: integer("store_id").references(() => stores.id)` to `grns` (specifies target receiving store).
   - Add `batchId: integer("batch_id").references(() => itemBatches.id)` to `grn_items`.
   - Prevent updating/deleting GRNs once status is `'posted'`.
3. **`public.items`**:
   - Add enterprise pharma fields: `hsnCode`, `taxCategory`, `drugSchedule`, `storageCondition`, `reorderLevel`, `reorderQty`, `barcode`, `isNarcotic`, `allowFractional`.
4. **`server/routes/purchases.ts`**:
   - Integrate `StockEngineService` during GRN posting:
     - Posting a GRN must atomically generate/find `item_batches`, insert positive entries into `inventory.stock_ledger`, and increment `inventory.store_batch_stock`.
5. **`src/lib/permissions.ts` & `server/routes/shared.ts`**:
   - Add store permissions (`canManageStore`, `canApproveRequisition`, `canCreateSalesBill`, `canPerformStockAdjustment`).

---

## D. Existing Code That Must NOT Be Rewritten

The following subsystems are mission-critical and must remain untouched:

1. **Nursing College Module (ACON)** (`server/routes/nursing.ts`, `src/routes/_authenticated/college/`).
2. **HR, Biometrics & Payroll Processing** (`server/routes/payroll.ts`, `staff.ts`, `leaves.ts`, `attendance.ts`, `roster.ts`).
3. **Accounts & Daily Closing Engine** (`server/routes/daily-closing.ts`, `server/routes/monthly-report.ts`, `src/components/ReportForm.tsx`).
4. **Hospital Organization Masters** (`departments`, `designations`, `shifts`, `banks`, `management_approvers`).
5. **Better-Auth Core Infrastructure**.

---

## E. Database Conventions

All new database entities must strictly adhere to the following rules:

1. **Schema Qualification**: All inventory tables MUST be declared using `inventorySchema.table("table_name", { ... })`.
2. **Table Naming**: Plural `snake_case` (e.g. `inventory.stores`, `inventory.item_batches`, `inventory.stock_ledger`).
3. **Column Naming**: `snake_case` in SQL / `camelCase` in TypeScript Drizzle schema.
4. **Primary Keys**: `id: serial("id").primaryKey()`.
5. **Numerics & Currencies**:
   - Monetary values: `numeric("col", { precision: 12, scale: 2, mode: "number" })`.
   - Quantities / Units: `numeric("col", { precision: 12, scale: 3, mode: "number" })` to support fractional measurements.
   - Conversion multipliers: `numeric("multiplier", { precision: 12, scale: 6, mode: "number" })`.
6. **Foreign Keys**:
   - Cross-schema foreign keys referencing `public` tables must be explicitly typed (e.g. `text("created_by").references(() => user.id)`).
7. **Timestamps**:
   ```typescript
   createdAt: timestamp("created_at").notNull().defaultNow(),
   updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date())
   ```

---

## F. API Conventions

1. **Routing Files**: Place inventory routes in `server/routes/inventory.ts` (and sub-routers like `server/routes/pos.ts`, `server/routes/transfers.ts` if needed) and mount them in `server/routes.ts` under typed endpoints.
2. **URL Namespaces**:
   - `/inventory/stores`
   - `/inventory/stock`
   - `/inventory/batches`
   - `/inventory/requisitions`
   - `/inventory/transfers`
   - `/inventory/adjustments`
   - `/inventory/pos`
3. **Input Validation**: Use Zod schemas with `jsonBody(c, schema)` and `idParam`.
4. **Response Envelope**:
   - List endpoints with pagination: `{ data: T[], pagination: { page: number, pageSize: number, totalRecords: number, totalPages: number } }`.
   - Detail endpoints: Direct JSON entity `c.json(entity)`.
   - Error envelope: `c.json({ error: "Descriptive error message" }, 400 | 404 | 500)`.

---

## G. Frontend Conventions

1. **Route Hierarchy**: `src/routes/_authenticated/inventory/` (e.g. `stores.tsx`, `stock.tsx`, `requisitions/`, `transfers/`, `adjustments/`, `pos.tsx`).
2. **Routing Definition**: TanStack Router `createFileRoute("/_authenticated/inventory/...")({ validateSearch, component })`.
3. **Data Fetching**:
   - Wrap RPC calls with `useRpcQuery(["inventory", ...], () => client.inventory[...].$get())`.
   - Use `useMutation` for writes, followed by `queryClient.invalidateQueries()`.
4. **Forms**: Use `react-hook-form` paired with `@hookform/resolvers/zod`.
5. **Aesthetics & Ergonomics**:
   - Marg ERP–inspired high-efficiency layout.
   - Keyboard navigation support for POS (F2 for item search, Enter for batch selection, Esc to dismiss).
   - Printable layouts (80mm thermal receipt & A4 invoice via CSS `@media print` / PDF export).

---

## H. Authorization & Security Conventions

1. **Store-Level Isolation**:
   - Staff members are linked to stores via `inventory.store_staff_assignments`.
   - Requests to bill, dispatch, or receive stock must verify that the calling staff has active privileges on the target `storeId`.
2. **Role Guards**:
   - `canManageStore`: Admin or Head of Store.
   - `canApproveRequisition`: Store Manager or Department Head.
   - `canPerformStockAdjustment`: Requires Admin or designated Auditor role.
3. **Audit Trail**:
   - Every ledger and transaction record must store `createdBy: session.user.id`.

---

## I. Transaction & Concurrency Conventions

1. **Atomic Stock Movements**:
   - **No stock modification is allowed outside of `db.transaction(async (tx) => { ... })`**.
2. **Pessimistic Row Locking (`FOR UPDATE`)**:
   - Before modifying a batch balance, lock the target row:
     ```typescript
     const [batchStock] = await tx
       .select()
       .from(storeBatchStock)
       .where(and(eq(storeBatchStock.storeId, storeId), eq(storeBatchStock.batchId, batchId)))
       .for("update");
     ```
3. **Strict Non-Negative Balance Check**:
   - If `quantityChange < 0` and `(currentQty + quantityChange) < 0`, the transaction must abort immediately with a `400 Bad Request` ("Insufficient stock available for batch X").
4. **Immutable Ledger Append**:
   - Rows in `inventory.stock_ledger` are **NEVER updated or deleted**. Corrections require compensatory entries (`ADJUSTMENT_ADD`, `ADJUSTMENT_SUB`, `POS_RETURN`).

---

## J. Document Numbering Rules

1. **Problem in Existing Code**: Previous modules used `count(*)` or random alphanumeric strings (`code()`), creating collision vulnerabilities under concurrency.
2. **Mandatory Sequence Engine**:
   - Use `inventory.document_sequences` table.
   - Document generation runs within the same transaction (`tx`):
     ```sql
     UPDATE inventory.document_sequences 
     SET current_val = current_val + 1, updated_at = NOW()
     WHERE code = $1 AND financial_year = $2
     RETURNING prefix, financial_year, current_val, padding;
     ```
   - Standard Format: `{PREFIX}/{FY}/{PADDED_NUMBER}` (e.g. `GRN/26-27/00001`, `INV/26-27/00042`, `TRN/26-27/00005`, `REQ/26-27/00012`).

---

## K. Testing & Verification Requirements

1. **Automated Transaction Verification**:
   - Concurrent sale test: Verify row locking prevents overselling when two requests attempt to sell the last unit of a batch.
   - FEFO test: Verify sales engine picks the batch expiring soonest.
   - GRN reversal / cancellation prevention test.
2. **Transfer In-Transit Verification**:
   - Verify stock leaves Source Store immediately, remains in `in_transit`, and only appears in Target Store upon explicit receipt.

---

## L. Detailed Target Inventory Architecture (`inventory` Schema)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PURCHASE ORDER (PO)                              │
│                       (public.purchase_orders)                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GOODS RECEIPT NOTE (GRN)                            │
│                            (public.grns)                                    │
│   Status: Draft ──────► POSTED (triggers StockEngineService)                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       StockEngineService.recordMovement()                   │
│                                                                             │
│  1. Lock inventory.store_batch_stock FOR UPDATE                             │
│  2. Create / resolve inventory.item_batches                                 │
│  3. Insert append-only entry into inventory.stock_ledger                    │
│  4. Update inventory.store_batch_stock balance                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                  ┌────────────────────┴────────────────────┐
                  ▼                                         ▼
┌───────────────────────────────────┐     ┌───────────────────────────────────┐
│     STORE TRANSFERS & INDENTS     │     │      PHARMACY / STORE POS         │
│  - stock_requisitions (indents)   │     │  - sales_invoices                 │
│  - stock_transfers (dispatch/rcv) │     │  - sales_invoice_items (FEFO)     │
│  - in_transit tracking            │     │  - sales_returns & credit notes   │
└───────────────────────────────────┘     └───────────────────────────────────┘
```

### Table Definitions in `inventory` Schema

```typescript
// 1. Stores / Warehouses
inventory.stores
- id: serial primaryKey
- name: text notNull
- code: text notNull unique
- type: text notNull default 'retail_pharmacy' // central, retail_pharmacy, ward, college, lab
- departmentId: integer references public.departments.id
- location: text
- active: boolean notNull default true
- isDefault: boolean notNull default false
- createdAt, updatedAt

// 2. Staff Store Assignments
inventory.store_staff_assignments
- id: serial primaryKey
- staffId: integer notNull // references public.staff.staffId
- storeId: integer notNull references inventory.stores.id
- canBill: boolean default true
- canReceive: boolean default true
- canTransfer: boolean default true
- active: boolean default true
- createdAt, updatedAt

// 3. Master Item Batches
inventory.item_batches
- id: serial primaryKey
- itemId: integer notNull references public.items.id
- batchNumber: text notNull
- mfgDate: date
- expiryDate: date notNull
- mrp: numeric(12, 2) notNull default 0
- purchaseRate: numeric(12, 2) notNull default 0
- saleRate: numeric(12, 2) notNull default 0
- barcode: text
- supplierId: integer references public.vendors.id
- isActive: boolean default true
- createdAt, updatedAt
// Unique constraint on (itemId, batchNumber)

// 4. Live Store Batch Stock
inventory.store_batch_stock
- id: serial primaryKey
- storeId: integer notNull references inventory.stores.id
- itemId: integer notNull references public.items.id
- batchId: integer notNull references inventory.item_batches.id
- quantityOnHand: numeric(12, 3) notNull default 0
- allocatedQty: numeric(12, 3) notNull default 0
- availableQty: numeric(12, 3) notNull default 0
- updatedAt: timestamp notNull defaultNow
// Unique constraint on (storeId, batchId)

// 5. Immutable Stock Ledger
inventory.stock_ledger
- id: serial primaryKey
- transactionDate: timestamp notNull defaultNow
- storeId: integer notNull references inventory.stores.id
- itemId: integer notNull references public.items.id
- batchId: integer notNull references inventory.item_batches.id
- movementType: enum ('GRN', 'SALE', 'POS_RETURN', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT_ADD', 'ADJUSTMENT_SUB', 'DAMAGE')
- referenceType: text notNull // 'GRN', 'SALE_INVOICE', 'TRANSFER', 'ADJUSTMENT'
- referenceId: integer notNull
- quantityChange: numeric(12, 3) notNull
- balanceAfter: numeric(12, 3) notNull
- costPrice: numeric(12, 2) notNull default 0
- salePrice: numeric(12, 2) notNull default 0
- createdBy: text references public.user.id
- createdAt: timestamp notNull defaultNow

// 6. Store Requisitions (Indents)
inventory.stock_requisitions
- id: serial primaryKey
- requisitionNo: text notNull unique
- requestingStoreId: integer notNull references inventory.stores.id
- fulfillingStoreId: integer notNull references inventory.stores.id
- status: enum ('draft', 'submitted', 'approved', 'partially_fulfilled', 'fulfilled', 'rejected')
- priority: enum ('normal', 'urgent', 'emergency') default 'normal'
- requestedBy: text references public.user.id
- approvedBy: text references public.user.id
- remarks: text
- createdAt, updatedAt

// 7. Store Requisition Items
inventory.stock_requisition_items
- id: serial primaryKey
- requisitionId: integer notNull references inventory.stock_requisitions.id onDelete cascade
- itemId: integer notNull references public.items.id
- requestedQty: numeric(12, 3) notNull
- approvedQty: numeric(12, 3)
- fulfilledQty: numeric(12, 3) notNull default 0
- unit: text notNull

// 8. Stock Transfers
inventory.stock_transfers
- id: serial primaryKey
- transferNo: text notNull unique
- fromStoreId: integer notNull references inventory.stores.id
- toStoreId: integer notNull references inventory.stores.id
- requisitionId: integer references inventory.stock_requisitions.id
- status: enum ('draft', 'in_transit', 'received', 'cancelled') default 'draft'
- dispatchedBy: text references public.user.id
- receivedBy: text references public.user.id
- dispatchedAt: timestamp
- receivedAt: timestamp
- remarks: text
- createdAt, updatedAt

// 9. Stock Transfer Items
inventory.stock_transfer_items
- id: serial primaryKey
- transferId: integer notNull references inventory.stock_transfers.id onDelete cascade
- itemId: integer notNull references public.items.id
- batchId: integer notNull references inventory.item_batches.id
- quantity: numeric(12, 3) notNull
- unit: text notNull
- unitRate: numeric(12, 2) notNull default 0

// 10. Physical Stock Adjustments
inventory.stock_adjustments
- id: serial primaryKey
- adjustmentNo: text notNull unique
- storeId: integer notNull references inventory.stores.id
- reason: text notNull
- status: enum ('draft', 'posted') default 'draft'
- createdBy: text references public.user.id
- approvedBy: text references public.user.id
- createdAt, updatedAt

// 11. Stock Adjustment Items
inventory.stock_adjustment_items
- id: serial primaryKey
- adjustmentId: integer notNull references inventory.stock_adjustments.id onDelete cascade
- itemId: integer notNull references public.items.id
- batchId: integer notNull references inventory.item_batches.id
- systemQty: numeric(12, 3) notNull
- physicalQty: numeric(12, 3) notNull
- differenceQty: numeric(12, 3) notNull
- type: enum ('gain', 'loss', 'expired', 'damaged')

// 12. POS Sales Invoices
inventory.sales_invoices
- id: serial primaryKey
- invoiceNo: text notNull unique
- invoiceDate: timestamp notNull defaultNow
- storeId: integer notNull references inventory.stores.id
- patientId: integer references public.patients.id
- customerName: text
- customerPhone: text
- doctorName: text
- prescriptionId: integer references public.prescriptions.id
- subtotal: numeric(12, 2) notNull default 0
- discountAmount: numeric(12, 2) notNull default 0
- taxableAmount: numeric(12, 2) notNull default 0
- cgstAmount: numeric(12, 2) notNull default 0
- sgstAmount: numeric(12, 2) notNull default 0
- igstAmount: numeric(12, 2) notNull default 0
- roundOff: numeric(12, 2) notNull default 0
- netAmount: numeric(12, 2) notNull default 0
- paymentMode: enum ('cash', 'upi', 'card', 'credit', 'mixed') default 'cash'
- status: enum ('completed', 'cancelled', 'refunded') default 'completed'
- cashierId: text references public.user.id
- createdAt, updatedAt

// 13. POS Sales Invoice Items
inventory.sales_invoice_items
- id: serial primaryKey
- invoiceId: integer notNull references inventory.sales_invoices.id onDelete cascade
- itemId: integer notNull references public.items.id
- batchId: integer notNull references inventory.item_batches.id
- quantity: numeric(12, 3) notNull
- unit: text notNull
- unitRate: numeric(12, 2) notNull
- mrp: numeric(12, 2) notNull
- discountPercent: numeric(5, 2) default 0
- discountAmount: numeric(12, 2) default 0
- taxableAmount: numeric(12, 2) notNull
- gstPercent: numeric(5, 2) notNull default 0
- cgstAmount: numeric(12, 2) notNull default 0
- sgstAmount: numeric(12, 2) notNull default 0
- igstAmount: numeric(12, 2) notNull default 0
- totalAmount: numeric(12, 2) notNull

// 14. POS Sales Returns
inventory.sales_returns
- id: serial primaryKey
- returnNo: text notNull unique
- originalInvoiceId: integer references inventory.sales_invoices.id
- storeId: integer notNull references inventory.stores.id
- returnDate: timestamp notNull defaultNow
- totalRefundAmount: numeric(12, 2) notNull default 0
- refundMode: enum ('cash', 'upi', 'credit_note') default 'cash'
- reason: text
- cashierId: text references public.user.id
- createdAt

// 15. POS Sales Return Items
inventory.sales_return_items
- id: serial primaryKey
- returnId: integer notNull references inventory.sales_returns.id onDelete cascade
- itemId: integer notNull references public.items.id
- batchId: integer notNull references inventory.item_batches.id
- returnedQty: numeric(12, 3) notNull
- unitRate: numeric(12, 2) notNull
- refundAmount: numeric(12, 2) notNull

// 16. Concurrency-Safe Sequence Numbers
inventory.document_sequences
- id: serial primaryKey
- code: text notNull // 'GRN', 'INV', 'PO', 'TRN', 'REQ', 'ADJ', 'RET'
- prefix: text notNull
- financialYear: text notNull // e.g. '26-27'
- currentVal: integer notNull default 0
- padding: integer notNull default 5
- updatedAt: timestamp notNull defaultNow
// Unique constraint on (code, financialYear)
```

---

## M. Execution Phase Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Core Multi-Store & Stock Ledger Foundation                         │
│ - Create server/db/schema-inventory.ts and export inventorySchema           │
│ - Build SequenceNumberService (server/services/sequence.ts)                 │
│ - Build StockEngineService (server/services/stock-engine.ts)                │
│ - Integrate GRN posting in server/routes/purchases.ts                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Live Stock Ledger & Store Management UI                            │
│ - Backend endpoints: /inventory/stores, /inventory/stock, /inventory/ledger │
│ - Frontend UI: Stores master, Live Stock Ledger, Expiry Tracker             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Requisitions (Indents) & Inter-Store Transfers                     │
│ - Backend: Requisition approval, transfer dispatch and receiving            │
│ - Frontend: Requisition form, Transfer issuance and receipt screens        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Marg-Style POS Billing & GST Invoicing                             │
│ - Build FefoAllocationService (server/services/fefo.ts)                     │
│ - Build GstCalculationService (server/services/gst.ts)                      │
│ - Fast-entry POS terminal UI with thermal / A4 receipt printing             │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Physical Verification Audits & Advanced Analytics                  │
│ - Physical stock counting, discrepancy write-offs, valuation reports        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Contract Acceptance

Every subsequent prompt and code change in this repository **MUST** adhere to this contract without deviations.
