# ACME ERP — Comprehensive Architecture Audit & Inventory Transformation Roadmap

---

## Executive Summary

An architectural audit of the ACME ERP codebase was conducted to assess the transformation of the current purchasing and item catalog setup into a **Marg ERP–grade enterprise inventory, multi-store, batch-tracked, FEFO-driven, GST-compliant hospital/pharma ERP system**.

The current stack is built on:
- **Backend**: Node.js + [Hono](https://hono.dev/) + TypeScript
- **Database & ORM**: PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better-Auth](https://www.better-auth.com/) (session & role-based)
- **Frontend SPA**: React 19 + TypeScript + [Vite](https://vitejs.dev/) + [TanStack Router](https://tanstack.com/router)
- **State & Data Fetching**: `@tanstack/react-query` + `@hono/client` (RPC)
- **Styling & UI**: TailwindCSS v4 + Radix UI primitives + Lucide React + Sonner

While the existing purchasing baseline (Vendors, POs, GRNs, Item Masters, Multi-unit conversions) provides a robust UI and schema foundation, **the physical inventory engine is currently non-operational (posting a GRN does not modify physical stock, batches are not indexed as live inventory balance units, stores/locations do not exist, and stock ledgers are absent)**.

This document serves as the permanent reference architecture and transformation roadmap.

---

## 1. Comprehensive 18-Point Codebase Audit

| # | Inspection Dimension | Current Repository State & Implementation Details |
|---|---|---|
| **1** | **Directory Structure** | Clean SPA + API architecture. Backend in `server/` (`routes/`, `db/`, `utils/`), Frontend in `src/` (`routes/`, `components/`, `lib/`, `services/`, `ui/`). Root contains docker, drizzle, and package configs. |
| **2** | **Existing Drizzle Schemas** | Defined in `server/db/schema.ts` (~1,540 lines). Contains Auth, HR/Payroll, Organization Masters, Accounts & Daily Closing, Nursing College (ACON), Purchasing (`itemTypes`, `unitTypes`, `unitConversions`, `items`, `itemUnitPrices`, `vendors`, `purchaseOrders`, `poItems`, `grns`, `grnItems`, `poPayments`), and legacy clinical tables (`medicines`, `inventoryItems`, `prescriptions`). |
| **3** | **Existing Relations** | Fully declared using Drizzle `relations()` mapping one-to-many and many-to-one associations across POs, GRNs, Vendors, Items, and Units for query builders. |
| **4** | **Existing Migrations** | 17 SQL migrations in `drizzle/` (from `0000` to `0016`). Managed via `drizzle-kit push` and manual migration scripts in `server/db/`. |
| **5** | **Database Conventions** | PostgreSQL connection pooling via `pg` / `@neondatabase/serverless` in `server/db/client.ts`. Table names in `snake_case`, TypeScript model keys in `camelCase`. Primary keys: `id: serial("id").primaryKey()`. Precise numerics: `numeric(..., { precision: 12, scale: 2, mode: "number" })`. Standard timestamp helpers for `createdAt` and `updatedAt`. |
| **6** | **API Route Conventions** | Modular Hono sub-routers in `server/routes/*.ts` combined in `server/routes.ts`. Standard REST verbs (`GET`, `POST`, `PATCH`, `PUT`, `DELETE`). Endpoints validate request payloads and return typed JSON envelopes. |
| **7** | **Service / Repository Architecture** | Route-level Drizzle transactions (`db.transaction(async (tx) => { ... })`). Shared utility functions located in `server/utils/` (`poStatus.ts`, `minio.ts`, `upload.ts`). Frontend consumes endpoints via `@hono/client` (`hc<AppType>("/api")`). |
| **8** | **Authentication & Authorization** | Better-Auth session tokens via cookies/headers. Backend authorization guards in `server/routes/shared.ts` (`requireAdmin`, `getCurrentStaff`, `hasCollegeAccess`, `isManagementApprover`). Frontend hook `useUserPermissions()` in `src/lib/permissions.ts`. |
| **9** | **Better-Auth Integration** | Configured in `server/auth.ts` bound to PostgreSQL pool. Custom session plugin enriches session with user role, bans, and `mustChangePassword`. Client in `src/services/auth.ts`. |
| **10** | **Frontend Feature Structure** | File-based routing under `src/routes/_authenticated/purchases/` (`items.tsx`, `vendors.tsx`, `unit-types.tsx`, `item-types.tsx`, `bills.tsx`, `purchase-orders/`, `grns/`). Modular layout wrappers (`ModuleLayout.tsx`, `Shell.tsx`). |
| **11** | **TanStack Query Patterns** | Custom `useRpcQuery()` wrapper in `src/lib/query.ts` integrating Hono RPC client with TanStack Query. Cache invalidation managed via `queryClient.invalidateQueries()`. |
| **12** | **TanStack Router Patterns** | `createFileRoute` with Zod search param validation (`validateSearch`), typed navigation (`useNavigate()`), query parameter-driven pagination, and auto-generated route tree in `src/routeTree.gen.ts`. |
| **13** | **Form Validation** | Zod schemas on both backend (`jsonBody(c, schema)`) and frontend (`react-hook-form` + `@hookform/resolvers/zod`). Comprehensive field-level validations and refinements (e.g. batch and expiry mandatory when `receivedQty > 0`). |
| **14** | **Error Handling** | `HTTPException` from `hono/http-exception` on schema parsing failures. Try/catch blocks returning `{ error: message }` with HTTP status `400`/`404`/`500`. Client-side error toasts via `sonner`. |
| **15** | **Transaction Handling** | Drizzle `tx` used for multi-table writes (e.g. inserting PO + PO items, inserting GRN + GRN items + updating PO status). Status recalculations encapsulated in helper `recalculatePoStatus(tx, poId)`. |
| **16** | **Existing Tests** | No automated unit/integration test suites (Vitest/Jest) configured. Only manual scratch verification scripts. |
| **17** | **Numbering / Document Generation** | Auto-numbering currently uses `count(*)` queries (e.g. `PO00001-26`, `GRN00001-26`). Note: Table row counting is susceptible to race conditions and gaps upon deletions; requires a central transactional sequence generator. |
| **18** | **Existing Item / Vendor / PO / GRN** | Core CRUD UI and schema exist. GRN captures batches and expiry dates, but **currently does not create inventory batches or record stock ledger transactions**. Legacy `inventoryItems` and `medicines` tables are disconnected. |

---

## 2. PostgreSQL Schema Architecture (`pgSchema("inventory")`)

To maintain clean separation of concerns, all inventory and store management tables will reside in a dedicated PostgreSQL schema (`inventory`), leaving core hospital, auth, and HR tables in `public`.

```
┌────────────────────────────────────────────────────────┐
│                     PUBLIC SCHEMA                      │
│  - user, session, account, verification                │
│  - staff, staff_departments, staff_salaries, rosters   │
│  - departments, designations, shifts, banks            │
│  - daily_closing_reports, bank_accounts                │
│  - nursing_courses, nursing_students, nursing_fees     │
└───────────────────────────┬────────────────────────────┘
                            │ Foreign Keys (userId, staffId, deptId)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   INVENTORY SCHEMA                     │
│  - inventory.stores                                    │
│  - inventory.store_staff_assignments                   │
│  - inventory.item_batches                              │
│  - inventory.store_batch_stock                         │
│  - inventory.stock_ledger                              │
│  - inventory.store_requisitions & items                │
│  - inventory.stock_transfers & items                   │
│  - inventory.stock_adjustments & items                 │
│  - inventory.sales_invoices & items (POS)              │
│  - inventory.sales_returns & items                     │
│  - inventory.document_sequences                        │
└────────────────────────────────────────────────────────┘
```

---

## 3. Inventory Architecture & Data Flow

```
                                 ┌───────────────────────────────┐
                                 │       STORES & LOCATIONS      │
                                 │ (Central, Pharmacy, Wards...) │
                                 └──────────────┬────────────────┘
                                                │
                                                ▼
┌──────────────────┐           ┌─────────────────────────────────┐           ┌──────────────────┐
│  PURCHASE / GRN  │ ────────► │         IMMUTABLE LEDGER        │ ────────► │     POS / SALE   │
│ (Inward Batches) │           │     (inventory.stock_ledger)    │           │ (FEFO Allocation)│
└──────────────────┘           └────────────────┬────────────────┘           └──────────────────┘
                                                │
                                                ▼
                               ┌─────────────────────────────────┐
                               │   STORE BATCH CURRENT BALANCE   │
                               │  (inventory.store_batch_stock)  │
                               └────────────────┬────────────────┘
                                                │
                                                ▼
                               ┌─────────────────────────────────┐
                               │  TRANSFERS & STORE REQUISITIONS │
                               │ (Indent -> Dispatch -> Receive) │
                               └─────────────────────────────────┘
```

---

## 4. Analysis Breakdown

### A. What Already Exists and Can Be Reused
1. **Vendor Master**: `vendors` table, backend routes, and `src/routes/_authenticated/purchases/vendors.tsx` UI (GSTIN, contact details, status).
2. **Item Master & Categorization**: `itemTypes`, `items`, and `itemUnitPrices` with dynamic multi-unit conversions (e.g., Strip -> Box -> Tablet).
3. **Unit Master & Conversion Matrix**: `unitTypes` and `unitConversions` tables with multiplier logic and UI (`src/routes/_authenticated/purchases/unit-types.tsx`).
4. **Purchase Order Lifecycle**: `purchaseOrders`, `poItems`, and `poPayments` with status transitions (`open`, `partial`, `closed`, `cancelled`) and payment tracking (`unpaid`, `partial`, `paid`).
5. **Goods Receipt Note (GRN) Foundation**: `grns` and `grnItems` tables capturing PO references, supplier details, delivery date, item-level batch number, expiry date, received quantity, free quantity, GST %, and unit rate.
6. **Hono RPC & TanStack Data Layer**: `useRpcQuery`, `client`, and standard pagination/filter conventions.
7. **Auth & Permission Guards**: Session context, user role extraction, and layout shell navigation integration.

---

### B. What Must Be Modified
1. **GRN Posting Workflow (`grns` & `server/routes/purchases.ts`)**:
   - Add `storeId` (target warehouse/store) to `grns`.
   - When GRN status changes from `draft` to `posted`, execute an atomic transaction that:
     1. Creates/updates stock batches (`inventory.item_batches`).
     2. Appends positive debit entries to the immutable stock ledger (`inventory.stock_ledger`).
     3. Increments store-level batch inventory (`inventory.store_batch_stock`).
     4. Recalculates PO fulfillment status.
   - Prevent updating/deleting GRNs once status is `posted` (require debit note / purchase return instead).
2. **Item Master (`items`)**:
   - Add pharma & store attributes: `hsnCode`, `taxCategory` (taxable / nil / exempt), `drugSchedule` (H, H1, X, G, General), `storageCondition` (Cold Chain, Room Temp), `reorderLevel`, `reorderQty`, `barcode`, `isNarcotic`, `allowFractional`.
3. **GRN Items (`grnItems`)**:
   - Link explicitly to `batchId` (generated upon GRN post) and store cost price, MRP, sale price, discount %, and HSN code per line.
4. **Document Numbering Engine (`server/utils/numbering.ts`)**:
   - Replace vulnerable `count(*)` pattern with a robust, concurrency-safe document sequence table (`inventory.document_sequences`) with prefix, financial year, padding, and atomic increment (`UPDATE document_sequences SET current_val = current_val + 1 WHERE ... RETURNING current_val`).
5. **Permissions & Roles (`src/lib/permissions.ts` & `server/routes/shared.ts`)**:
   - Introduce store-level permissions: `canManageStore`, `canApproveRequisition`, `canCreateSalesBill`, `canPerformStockAdjustment`.
   - Support staff store assignment (which store(s) a user can view or bill from).

---

### C. New Modules, Tables, and Services Required

#### 1. New Tables in `inventory` Schema
- `inventory.stores`: Master store definitions (Central Store, Pharmacy 1, Ward Floor 2, College Lab Store).
- `inventory.store_staff_assignments`: Staff access control to specific stores.
- `inventory.item_batches`: Master batch registry (batch number, mfg date, expiry date, MRP, purchase rate, sale rate, barcode).
- `inventory.store_batch_stock`: Live quantity on hand and available quantity per store and batch. Unique on `(storeId, batchId)`.
- `inventory.stock_ledger`: Immutable audit trail for every single stock movement (GRN, SALE, POS_RETURN, TRANSFER_IN, TRANSFER_OUT, ADJUSTMENT_ADD, ADJUSTMENT_SUB, DAMAGE).
- `inventory.store_requisitions` & `inventory.store_requisition_items`: Department/Ward indents and fulfillment tracking.
- `inventory.stock_transfers` & `inventory.stock_transfer_items`: Inter-store stock transfer with two-phase commit (dispatch `TRANSFER_OUT` -> in-transit -> receipt `TRANSFER_IN`).
- `inventory.stock_adjustments` & `inventory.stock_adjustment_items`: Physical verification audit differences and write-offs.
- `inventory.sales_invoices` & `inventory.sales_invoice_items`: Retail/IPD pharmacy POS billing with GST breakdown.
- `inventory.sales_returns` & `inventory.sales_return_items`: Customer returns / credit notes.
- `inventory.document_sequences`: Transactional document sequence generator.

#### 2. New Backend Services (`server/services/`)
- `StockEngineService` (`server/services/stock-engine.ts`):
  - Row-level locking on `store_batch_stock` using `FOR UPDATE`.
  - Enforces negative stock prevention.
  - Inserts immutable entries into `stock_ledger`.
  - Recalculates and updates `store_batch_stock`.
- `FefoAllocationService` (`server/services/fefo.ts`):
  - First-Expired, First-Out automatic batch picking algorithm for sales and store transfers.
- `GstCalculationService` (`server/services/gst.ts`):
  - Item-level GST computation (taxable value, CGST 50% + SGST 50% vs IGST 100%, discount allocation, rounding).
- `SequenceNumberService` (`server/services/sequence.ts`):
  - Concurrency-safe document numbering (`generateDocNumber(tx, "INV")`).

---

### D. Architectural Risks & Mitigations

1. **Multi-Store Inventory**: Separate store master from catalog metadata; stock balance is tracked per `(storeId, batchId)`.
2. **Batch Tracking & FEFO**: Order batches by `expiryDate ASC, createdAt ASC`. Filter out expired batches automatically.
3. **Concurrency & Negative Stock**: All stock operations run inside database transactions with `FOR UPDATE` row locking on `store_batch_stock`.
4. **In-Transit Transfers**: Two-phase transfer lifecycle prevents double-counting or disappearing inventory during transit.
5. **POS Billing Performance**: Dedicated fast keyboard-driven POS UI (F2 item search, barcode listener, rapid tender, 80mm thermal / A4 receipt generation).
6. **GST Compliance**: Strict storage of line-level HSN, taxable values, and tax components for seamless GSTR-1 / GSTR-2 reporting.

---

### E. Naming Conventions

| Layer | Convention | Example |
|---|---|---|
| **Database Schema** | Dedicated pgSchema | `inventorySchema = pgSchema("inventory")` |
| **Database Tables** | Plural snake_case | `stores`, `item_batches`, `store_batch_stock`, `stock_ledger`, `sales_invoices` |
| **Database Columns** | snake_case in SQL / camelCase in Drizzle | `store_id` (`storeId`), `expiry_date` (`expiryDate`), `quantity_on_hand` (`quantityOnHand`) |
| **Enums** | Singular snake_case + `_enum` | `stock_movement_type_enum`, `requisition_status_enum`, `transfer_status_enum` |
| **Route Files** | Kebab-case in `server/routes/` | `server/routes/inventory.ts`, `server/routes/stores.ts`, `server/routes/pos.ts`, `server/routes/transfers.ts` |
| **Route Path Prefixes** | Plural kebab-case | `/inventory/*`, `/stores/*`, `/transfers/*`, `/pos/*`, `/requisitions/*` |
| **Frontend Routes** | TanStack Router file paths in `src/routes/_authenticated/` | `src/routes/_authenticated/inventory/stock.tsx`, `src/routes/_authenticated/pos/terminal.tsx` |
| **Document Codes** | Standard ERP prefixes with FY | `GRN/26-27/00001`, `PO/26-27/00001`, `INV/26-27/00001`, `TRN/26-27/00001`, `REQ/26-27/00001` |

---

### F. What Should NOT Be Rewritten Unnecessarily
1. **Authentication Core (`server/auth.ts`, `src/services/auth.ts`)**: Keep Better-Auth setup unchanged.
2. **Nursing College Module (`server/routes/nursing.ts`, `src/routes/_authenticated/college/`)**: Self-contained module with established schemas and workflows.
3. **HR & Payroll Module (`server/routes/payroll.ts`, `staff.ts`, `leaves.ts`)**: Keep existing staff directory and payroll processing intact.
4. **Accounts & Daily Closing (`server/routes/daily-closing.ts`)**: Preserve existing cash denomination and daily closing forms.
5. **Existing Unit Conversion Engine (`unitTypes`, `unitConversions`)**: The multiplier and conversion logic is complete and will directly serve item packing conversions (e.g. 1 Strip = 10 Tabs).
6. **Existing UI Component Library (`src/ui/*`)**: Reuse standard Radix UI primitives, badges, dialogs, and tables.

---

### G. Phased Implementation Sequence

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Core Multi-Store & Stock Ledger Foundation                         │
│ - Schemas: inventory schema, stores, item_batches, store_batch_stock,       │
│   stock_ledger, document_sequences                                          │
│ - StockEngineService: row locking, atomic ledger writes, stock balance math │
│ - GRN Integration: posting GRN creates batches and stock ledger records     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Live Stock Inquiry, FEFO Engine & Store Management UI              │
│ - Backend: FEFO allocation service, stock query endpoints with batch filters │
│ - Frontend: Stores master, Live Stock Ledger view, Batch Expiry Tracker     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: Store Requisitions & Inter-Store Transfers                         │
│ - Schemas: store_requisitions, stock_transfers (dispatch/receive workflow)  │
│ - Backend: Requisition approval, transfer dispatch (out) and receipt (in)   │
│ - Frontend: Indent requisition form, transfer issuance & receiving screens  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Marg-Style POS Billing & GST Invoicing                             │
│ - Schemas: sales_invoices, sales_invoice_items, sales_returns, GST fields   │
│ - Backend: POS checkout with auto-FEFO batch deduction, invoice numbering   │
│ - Frontend: Fast-entry POS terminal, thermal/A4 receipt printing, returns   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Stock Audit, Physical Verification & Inventory Reports             │
│ - Schemas: stock_adjustments, physical verification audit records          │
│ - Reports: Stock valuation (FIFO/Weighted Avg), Fast/Slow moving, GST-R1/R2 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Implementation Readiness Report

| Assessment Area | Status | Comments |
|---|---|---|
| **Tech Stack Compatibility** | **Ready** | Hono + Drizzle ORM (PostgreSQL) + React 19 + TanStack Query/Router is ideal for transactional ERP workloads. |
| **Schema Foundation** | **Ready for Extension** | Purchasing tables (`vendors`, `purchaseOrders`, `grns`, `items`, `unitTypes`) are in place. Extension creates the `inventory` pgSchema with stores, batches, live stock, and ledger tables. |
| **Concurrency & Integrity** | **Ready with `FOR UPDATE`** | PostgreSQL and Drizzle transactions support `FOR UPDATE` row locking to guarantee ledger consistency and eliminate negative stock conditions. |
| **Breaking Change Risk** | **Low** | Existing PO and Vendor features remain backward-compatible; changes to GRN posting only enhance data persistence into the stock ledger. |
| **Readiness Verdict** | **GO — Ready for Phase 1 Execution** | All prerequisites, schema dependencies, and architectural patterns have been identified and mapped. |
