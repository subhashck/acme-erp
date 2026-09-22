# End-to-End Manual Test Cases: Unit Types & Items to PO to Inventory to POS

This test suite covers the complete procurement, inventory lifecycle, and point-of-sale dispensing workflow in **ACME ERP**.

---

## Workflow Overview Diagram

```
[1. Unit & Item Master] ──> [2. Vendor Master] ──> [3. Purchase Order (PO)]
                                                             │
                                                             ▼
[5. Store Transfer]   <── [4. Goods Receipt Note (GRN) / Inwarding]
       │                                                     │
       ▼                                                     ▼
[6. Pharmacy POS Sale] ──> [7. Sales Return & Refund] ──> [8. Stock Ledger Audit]
```

---

## Test Suite Summary

| Module / Phase | Test Case ID | Test Scenario | Priority |
| :--- | :--- | :--- | :--- |
| **1. Unit & Item Masters** | `TC-MST-01` | Create Base Units, Secondary Units & Conversion Multipliers | High |
| | `TC-MST-02` | Create Item with Unit Pricing Matrix, GST %, and Reorder Levels | High |
| | `TC-MST-03` | Verify Unit Conversion Multiplier Calculations on Item Profile | Medium |
| **2. Vendor Management** | `TC-VND-01` | Create Vendor with GSTIN, Contact & Payment Terms | Medium |
| **3. Purchase Orders (PO)** | `TC-PO-01` | Create Multi-Item PO with Auto GST & Line-Item Calculations | High |
| | `TC-PO-02` | Verify PO Number Auto-Generation (`PO-YYYY-XXXX`) | Medium |
| | `TC-PO-03` | Record Partial / Full Advance Payment against PO | High |
| **4. Goods Receipt Note (GRN)** | `TC-GRN-01` | Inward Goods against PO with Batch, Expiry & Free Qty | Critical |
| | `TC-GRN-02` | Direct GRN Inwarding (Without PO) | High |
| | `TC-GRN-03` | Partial GRN Receiving & PO Status Auto-Transition (`partial` ➔ `closed`) | High |
| | `TC-GRN-04` | Stock Ledger & Store Batch Stock Inward Verification | Critical |
| **5. Purchase Invoices & Bills** | `TC-PINV-01` | Convert GRN to Purchase Invoice & Settle Vendor Payable | High |
| **6. Store Transfers & Indents**| `TC-TRN-01` | Create Inter-Store Requisition from Pharmacy to Central Store | High |
| | `TC-TRN-02` | Fulfill Requisition & Issue Stock Transfer (`in_transit`) | High |
| | `TC-TRN-03` | Receive Stock Transfer at Destination Store & Verify Balances | Critical |
| **7. Stock Adjustments** | `TC-ADJ-01` | Physical Audit Reconciliation (Gain / Loss / Expiry Write-Off) | Medium |
| **8. Pharmacy POS Billing** | `TC-POS-01` | Walk-in Patient Sale with Barcode Scan & FEFO Auto-Select | Critical |
| | `TC-POS-02` | Prescription-Linked Billing with Doctor & Patient Selection | High |
| | `TC-POS-03` | Split / Mixed Payment Processing (Cash + UPI) | High |
| | `TC-POS-04` | Out-of-Stock / Insufficient Quantity Validation | High |
| **9. Sales Returns & Refunds** | `TC-RET-01` | Process Partial Sales Return with Cash Refund & Stock Restoration | High |
| **10. Ledger & Audit Trail** | `TC-AUD-01` | End-to-End Stock Ledger Verification (`stockLedger` FIFO/FEFO trace) | Critical |

---

## Detailed Test Cases

### Phase 1: Unit Types, Conversions & Item Master Setup

#### `TC-MST-01`: Create Base Units, Secondary Units & Conversion Multipliers
- **Preconditions**: Logged in with `admin` role.
- **Navigation**: Sidebar ➔ `Purchases` ➔ `Unit Types` (`/purchases/unit-types`).
- **Test Steps**:
  1. Click **"New Unit Type"**.
  2. Create Base Unit: Name = `Tablet`, Symbol = `TAB`, Category = `Count/Quantity`, Check **"Base Unit"** = `Yes`. Click **Save**.
  3. Create Secondary Unit: Name = `Strip of 10`, Symbol = `STRIP-10`, Category = `Count/Quantity`, Check **"Base Unit"** = `No`. Click **Save**.
  4. Create Packaging Unit: Name = `Box of 10 Strips`, Symbol = `BOX-100`, Category = `Count/Quantity`, Check **"Base Unit"** = `No`. Click **Save**.
  5. Go to **"Unit Conversions"** tab.
  6. Add Conversion 1: `1 STRIP-10` = `10 TAB` (Multiplier = `10`).
  7. Add Conversion 2: `1 BOX-100` = `10 STRIP-10` (Multiplier = `10`).
- **Expected Results**:
  - All unit types are listed with appropriate base unit badges.
  - Conversion matrix validates forward and reverse multiplication factors without circular errors.

---

#### `TC-MST-02`: Create Item with Multi-Unit Pricing, GST %, and Reorder Levels
- **Preconditions**: Units from `TC-MST-01` exist. Item Type `Medicines` exists.
- **Navigation**: Sidebar ➔ `Purchases` ➔ `Items` (`/purchases/items`).
- **Test Steps**:
  1. Click **"Add New Item"**.
  2. Enter Details:
     - **Item Name**: `Paracetamol 500mg (Acme)`
     - **Category / Item Type**: `Medicines`
     - **Base Unit**: `Tablet (TAB)`
     - **Purchase Unit**: `Box of 10 Strips (BOX-100)`
     - **Sale Unit**: `Strip of 10 (STRIP-10)`
     - **HSN Code**: `30049099`
     - **GST Rate**: `12%`
     - **Purchase Rate (per Purchase Unit)**: `₹ 250.00`
     - **Sale Price (per Sale Unit)**: `₹ 35.00`
     - **Reorder Level**: `50`
     - **Reorder Quantity**: `100`
     - **Drug Schedule**: `Schedule H`
  3. Click **"Save Item"**.
- **Expected Results**:
  - Item is created with ID and appears in items directory.
  - Unit price matrix calculates base cost per tablet (`₹ 2.50`) and retail price per tablet (`₹ 3.50`).

---

### Phase 2: Vendor Management

#### `TC-VND-01`: Create Supplier / Vendor
- **Navigation**: Sidebar ➔ `Purchases` ➔ `Vendors` (`/purchases/vendors`).
- **Test Steps**:
  1. Click **"Add Vendor"**.
  2. Enter:
     - **Vendor Name**: `MedPharma Distributors Ltd`
     - **GSTIN**: `27AABCU9603R1ZM` (Valid 15-character GSTIN)
     - **Phone**: `9876543210`
     - **Contact Person**: `Rajesh Kumar`
     - **Address**: `Plot 42, MIDC Pharma Zone, Mumbai`
  3. Click **"Save"**.
- **Expected Results**:
  - Vendor saved successfully with active status.
  - Vendor is immediately searchable in PO vendor dropdown.

---

### Phase 3: Purchase Order (PO) Creation & Payment

#### `TC-PO-01`: Create Multi-Item Purchase Order with Automated Tax Calculation
- **Preconditions**: Vendor `MedPharma Distributors Ltd` and Item `Paracetamol 500mg` exist.
- **Navigation**: Sidebar ➔ `Purchases` ➔ `Purchase Orders` ➔ `New PO` (`/purchases/purchase-orders/new`).
- **Test Steps**:
  1. Select Vendor: `MedPharma Distributors Ltd`.
  2. Set **PO Date**: Current Date.
  3. Add Line Item 1:
     - Item: `Paracetamol 500mg (Acme)`
     - Unit: `Box of 10 Strips (BOX-100)`
     - Ordered Qty: `20`
     - Unit Rate: `₹ 250.00`
     - GST %: `12%`
     - Expected Line Value: `20 * 250 = ₹ 5,000.00` + `12% GST (₹ 600.00)` = `₹ 5,600.00`.
  4. Enter Remarks: `Urgent stock replenishment for central pharmacy`.
  5. Click **"Create Purchase Order"**.
- **Expected Results**:
  - PO created with auto-generated code `PO-2026-XXXX`.
  - PO Status is marked **"open"** and Payment Status is marked **"unpaid"**.
  - Total PO Amount displays `₹ 5,600.00`.

---

#### `TC-PO-03`: Record Advance Payment against Purchase Order
- **Preconditions**: `TC-PO-01` completed.
- **Navigation**: View PO Details (`/purchases/purchase-orders/$id`).
- **Test Steps**:
  1. Click **"Record Payment"** button.
  2. Amount: `₹ 2,000.00` (Partial advance).
  3. Payment Mode: `Bank Transfer (RTGS/NEFT)`.
  4. Reference No: `UTR9928374112`.
  5. Payment Date: Today.
  6. Click **"Save Payment"**.
- **Expected Results**:
  - Payment entry is logged in PO payment history table.
  - PO Payment Status updates from **"unpaid"** to **"partial"**.
  - Remaining balance displays `₹ 3,600.00`.

---

### Phase 4: Goods Receipt Note (GRN) & Stock Inwarding

#### `TC-GRN-01`: Inward Goods against PO with Batch, Expiry & Unit Conversion
- **Preconditions**: `TC-PO-01` created. Store `Central Medical Store` exists.
- **Navigation**: Sidebar ➔ `Purchases` ➔ `GRN` ➔ `New GRN` (`/purchases/grns/new`).
- **Test Steps**:
  1. Select **PO Number**: Select `PO-2026-XXXX`.
  2. Select **Destination Store**: `Central Medical Store`.
  3. Verify PO items auto-populate into GRN line table.
  4. Fill Inward Item Details:
     - Received Qty: `20` (Boxes)
     - Free Qty: `2` (Boxes promo)
     - Batch Number: `PARA-2026-B1`
     - Expiry Date: `2028-06-30` (Future date)
     - Unit Rate: `₹ 250.00`
     - Sale Price (per Strip): `₹ 35.00`
  5. Enter Challan / Delivery Note No: `DC-98441`.
  6. Set Status: **"Posted"** (or Submit & Post).
  7. Click **"Save & Post GRN"**.
- **Expected Results**:
  - GRN created with sequential code `GRN-2026-XXXX`.
  - PO status transitions from **"open"** to **"closed"** (all ordered qty received).
  - Stock is atomically incremented in `inventory.store_batch_stock` for `Central Medical Store`.
  - Total received units converted to base units (e.g. `22 boxes * 10 strips = 220 strips` or `2,200 tablets`).
  - Audit trail entry written to `inventory.stock_ledger` with movement type `GRN`.

---

#### `TC-GRN-03`: Partial GRN Receiving Workflow
- **Preconditions**: Create a new PO for `50` boxes.
- **Test Steps**:
  1. Create GRN against this PO receiving only `20` boxes out of `50`.
  2. Post the GRN.
- **Expected Results**:
  - PO Status updates to **"partial"**.
  - Subsequent GRN form displays remaining pending quantity = `30` boxes.

---

### Phase 5: Inter-Store Stock Requisitions & Transfers

#### `TC-TRN-01`: Requisition Indent from Retail Pharmacy to Central Store
- **Preconditions**: Stock exists in `Central Medical Store`.
- **Navigation**: Sidebar ➔ `Inventory` ➔ `Requisitions` ➔ `New Requisition` (`/inventory/requisitions/new`).
- **Test Steps**:
  1. From Store (Requesting): `Retail Pharmacy`.
  2. To Store (Supplying): `Central Medical Store`.
  3. Priority: `Normal`.
  4. Item: `Paracetamol 500mg (Acme)`.
  5. Requested Quantity: `50` (Strips).
  6. Purpose: `Daily dispensing buffer refill`.
  7. Click **"Submit Requisition"**.
- **Expected Results**:
  - Requisition generated with code `SREQ-2026-XXXX` and status **"submitted"**.

---

#### `TC-TRN-02` & `TC-TRN-03`: Fulfill Requisition, Stock Transfer Issue & Receipt
- **Navigation**: Sidebar ➔ `Inventory` ➔ `Transfers` ➔ `New Transfer` (`/inventory/transfers/new`).
- **Test Steps**:
  1. Select Source: `Central Medical Store`, Destination: `Retail Pharmacy`.
  2. Select Requisition: `SREQ-2026-XXXX`.
  3. Select Batch: `PARA-2026-B1` (Shows available stock).
  4. Transfer Qty: `50` strips.
  5. Click **"Dispatch / Issue Stock"**.
  6. Verify Transfer Status becomes **"in_transit"**.
  7. Switch / Log in as Retail Pharmacy In-charge.
  8. Open Transfer `STRN-2026-XXXX` and click **"Confirm Receipt"**.
- **Expected Results**:
  - `Central Medical Store` stock decreases by `50` strips (`TRANSFER_OUT` in ledger).
  - `Retail Pharmacy` stock increases by `50` strips (`TRANSFER_IN` in ledger).
  - Batch `PARA-2026-B1` is now active and sellable in `Retail Pharmacy`.

---

### Phase 6: Pharmacy Point-of-Sale (POS) Billing

#### `TC-POS-01`: Walk-in Patient Quick Sale with Auto-FEFO Batch Selection
- **Preconditions**: Stock available in `Retail Pharmacy` (`50` strips of `PARA-2026-B1`).
- **Navigation**: Sidebar ➔ `Inventory` ➔ `Point of Sale (POS)` (`/inventory/pos`).
- **Test Steps**:
  1. Select Active Store: `Retail Pharmacy`.
  2. Customer / Patient Type: `Walk-in`.
  3. Customer Name: `John Doe`, Phone: `9811223344`.
  4. In Search bar, type `Paracetamol` or scan barcode.
  5. Select `Paracetamol 500mg (Acme)`.
  6. Verify the system auto-picks batch `PARA-2026-B1` with earliest expiry.
  7. Set Qty: `2` (Strips) @ `₹ 35.00` per strip.
  8. Verify Subtotal = `₹ 70.00`.
  9. Add 5% Line Discount (`₹ 3.50`).
  10. Net Amount = `₹ 66.50`.
  11. Select Payment Method: `Cash`. Enter Tendered Amount = `₹ 100.00`.
  12. Verify Change Return = `₹ 33.50`.
  13. Click **"Complete Sale & Print Receipt"**.
- **Expected Results**:
  - Sales invoice created with sequential number `SINV-2026-XXXX`.
  - Thermal / PDF receipt modal triggers for printing.
  - Retail Pharmacy batch stock decreases from `50` to `48` strips.
  - `stockLedger` logs a `SALE` entry of `-2` strips.

---

#### `TC-POS-02`: Prescription-Linked Sale with Doctor & OPD Encounter
- **Preconditions**: Patient `Anjali Sharma` registered with doctor prescription.
- **Navigation**: `POS` (`/inventory/pos`).
- **Test Steps**:
  1. Select **"Prescription Lookup"**.
  2. Search by Patient Name or MRN.
  3. Select prescription: Prescribed medicines auto-populate into billing cart with exact dosages.
  4. Select Payment Method: `UPI` (Enter Txn ID / QR scan).
  5. Click **"Complete Sale"**.
- **Expected Results**:
  - Sale successfully tied to Patient ID and Doctor ID.
  - Prescription marked as dispensed/completed.

---

#### `TC-POS-03`: Split / Mixed Payment Processing
- **Navigation**: `POS` (`/inventory/pos`).
- **Test Steps**:
  1. Add items totaling `₹ 1,500.00`.
  2. Select Payment Mode: **"Mixed"**.
  3. Split 1: `Cash` = `₹ 500.00`.
  4. Split 2: `Card` = `₹ 1,000.00` (Auth Code: `TXN88392`).
  5. Click **"Complete Sale"**.
- **Expected Results**:
  - Invoice logs both payment lines with respective payment channels.
  - Handover and daily cash closing correctly account for ₹500 in physical cash drawer and ₹1,000 in bank POS terminal.

---

#### `TC-POS-04`: Negative / Out-of-Stock Validation
- **Navigation**: `POS` (`/inventory/pos`).
- **Test Steps**:
  1. Add an item with available stock = `5` strips.
  2. Attempt to input quantity = `10` strips.
  3. Click **"Complete Sale"**.
- **Expected Results**:
  - System blocks checkout with clear validation error: *"Requested quantity (10) exceeds available stock (5) for Batch XXX"*.
  - No negative stock is allowed in the ledger.

---

### Phase 7: Sales Returns & Credit Notes

#### `TC-RET-01`: Process Partial Sales Return with Stock Restoration
- **Preconditions**: Invoice `SINV-2026-XXXX` from `TC-POS-01` completed.
- **Navigation**: Sidebar ➔ `Inventory` ➔ `Invoices / Returns` (`/inventory/invoices`).
- **Test Steps**:
  1. Search and open invoice `SINV-2026-XXXX`.
  2. Click **"Initiate Return / Credit Note"**.
  3. Select Item: `Paracetamol 500mg`.
  4. Return Qty: `1` (Strip).
  5. Return Reason: `Unopened medicine returned by patient`.
  6. Refund Mode: `Cash`.
  7. Click **"Process Refund & Restock"**.
- **Expected Results**:
  - Return voucher generated with status **"completed"**.
  - Stock for `PARA-2026-B1` in `Retail Pharmacy` restores from `48` back to `49` strips.
  - Stock ledger creates a `POS_RETURN` entry of `+1` strip.

---

### Phase 8: Stock Ledger Audit & Reconciliations

#### `TC-AUD-01`: End-to-End Stock Ledger Audit Trail Verification
- **Navigation**: Sidebar ➔ `Inventory` ➔ `Stock Ledger` (`/inventory/ledger`).
- **Test Steps**:
  1. Filter by Item: `Paracetamol 500mg (Acme)`.
  2. Filter by Date: Today.
  3. Observe chronological sequence of movements:
     - Entry 1: `GRN` (Inward `+220` strips into Central Store).
     - Entry 2: `TRANSFER_OUT` (`-50` strips from Central Store).
     - Entry 3: `TRANSFER_IN` (`+50` strips into Retail Pharmacy).
     - Entry 4: `SALE` (`-2` strips from Retail Pharmacy).
     - Entry 5: `POS_RETURN` (`+1` strip into Retail Pharmacy).
  4. Verify running balance columns match actual physical stock:
     - `Central Medical Store`: `170` strips.
     - `Retail Pharmacy`: `49` strips.
     - Total Entity Stock: `219` strips.
- **Expected Results**:
  - Zero discrepancies across all stores and transaction types.
  - Every ledger entry is mapped to a valid document number and user ID.

---

## Boundary, Security & Edge Cases Matrix

| Case ID | Scenario | Input / Action | Expected Behavior |
| :--- | :--- | :--- | :--- |
| `TC-SEC-01` | Role-based store isolation | Non-pharmacist staff attempting POS sale | Access restricted (`403 Forbidden` / store selection hidden). |
| `TC-EDG-01` | Expired batch dispensing | Attempting to bill batch with `expiryDate < today` | POS prevents selection and marks batch as expired. |
| `TC-EDG-02` | Fractional unit dispensing | Prescribing `0.5` strip or liquid measurement | Supported only when `allowFractional = true` on Item master. |
| `TC-EDG-03` | Concurrent checkout race | Two counters selling last batch unit simultaneously | Database transaction locks stock row; second transaction fails gracefully with out-of-stock notification. |
