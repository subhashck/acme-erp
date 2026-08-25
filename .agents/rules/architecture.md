# ACME ERP Codebase Architecture & Reference Map

This document serves as the persistent knowledge index and architecture guide for the ACME ERP project. Consult this reference map to immediately locate source files, schema definitions, API endpoints, permissions, core domain engines, and architectural conventions without requiring exploratory searches.

---

## 1. Project Tech Stack & Layout

- **Backend Runtime**: Node.js + [Hono](https://hono.dev/) (`server/index.ts`, `server/routes.ts`)
- **Database & ORM**: PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/) (`server/db/schema.ts`, `server/db/schema-inventory.ts`, `server/db/client.ts`)
- **Authentication**: [Better-Auth](https://www.better-auth.com/) (`server/auth.ts`, `src/services/auth.ts`)
- **Frontend SPA**: React 19 + TypeScript + [Vite](https://vitejs.dev/) + [TanStack Router](https://tanstack.com/router) (`src/routes/`)
- **State & Data Fetching**: `@tanstack/react-query` (`useQuery`, `useMutation`), RPC client (`src/services/rpc.ts`)
- **Styling & UI**: TailwindCSS, Radix UI primitives, Lucide React icons, Sonner toast notifications
- **Testing**: Vitest (`tests/integration/`, `tests/unit/`, `tests/setup/global-setup.ts`)

---

## 2. Module Sitemaps & API Endpoints

### A. Nursing College Module (ACON)
- **Access Policy**: Restricted strictly to `admin`, `accounts` role/department, and `ACON` department staff (`canViewCollege`).
- **Route Guard**: `<CollegeAccessGuard>` (`src/components/CollegeAccessGuard.tsx`) & backend middleware `requireCollegeAccess` (`server/routes/shared.ts`).
- **Frontend Routes** (`src/routes/_authenticated/college/`):
  - `index.tsx`: Dashboard with summary KPIs, fee trend charts, quota distribution.
  - `admissions.tsx`: Applicant pipeline, merit scoring, seat booking advance fee, conversion to student.
  - `students.tsx`: Student master directory with server-side pagination & multi-filter bar.
  - `student/$id.tsx`: Comprehensive student profile (tabs: Info, Documents, Ledger, Attendance).
  - `fees.tsx`: Fee ledger, fee collection dialog with receipt generation (PDF export via jsPDF).
  - `general-receipts.tsx`: Non-tuition miscellaneous receipts and collections.
  - `fee-dues.tsx`: Real-time fee due tracking, installment reminders, overdue lists.
  - `fee-structures.tsx`: Course & quota fee structures (One-time, Annual, Semester, Monthly frequencies).
  - `courses.tsx`: Course programs and batch master (with seat quotas, academic years).
  - `academic-schedules.tsx`: Academic session schedules, milestones, fee due dates.
  - `subjects.tsx`: Semester & course subject curriculum master.
  - `attendance.tsx`: Batch-wise daily attendance marking (theory / practical).
  - `referrers.tsx`: Referrer directory, referral commission tracking, payment vouchers & allocations.
  - `reports/`: College audit, fee realization, and admission reports.
- **Backend Route File**: `server/routes/nursing.ts` (all endpoints prefixed with `/nursing/*`).
- **Key Tables**: `nursingCourses`, `nursingBatches`, `nursingApplicants`, `nursingStudents`, `nursingStudentDocuments`, `nursingFeeStructures`, `nursingFeeTransactions`, `nursingStudentFeeFrequencies`, `nursingAttendanceRecords`, `nursingSubjects`, `nursingAcademicSchedules`, `nursingReferrers`, `nursingReferrerPayments`, `nursingReferrerPaymentAllocations`, `nursingAuditLogs`.

---

### B. Accounts & Daily Financial Closing
- **Access Policy**: Restricted to `admin`, `accounts` department, and `managementApprovers` (`canViewAccounts`).
- **Frontend Routes** (`src/routes/_authenticated/accounts/`):
  - `reports/index.tsx`: List of daily closing reports with status (Draft, Pending Approval, Approved).
  - `reports/$id.tsx`: Detailed daily closing view & PDF/Excel export (`src/lib/closing-export.ts`).
  - `monthly-report.tsx`: Monthly consolidated revenue, department breakdowns, expense audit.
  - `bank-expenses.tsx`: Direct bank-level expenditures ledger and vendor payments.
  - `bank-accounts.tsx`: Entity-tagged bank accounts master and balances.
  - `service-charges.tsx`: Hospital billing service catalog, pricing, and category mappings.
  - `consultant-charges.tsx`: Doctor/consultant OPD rates and revenue sharing.
- **Frontend Components**: `src/components/ReportForm.tsx` (closing form with live totals, denomination calculator, handover reconciliations).
- **Backend Route Files**: `server/routes/daily-closing.ts`, `server/routes/monthly-report.ts`, `server/routes/accounts.ts`, `server/routes/bank-expenses.ts`, `server/routes/bank-accounts.ts`.
- **Key Tables**: `dailyClosingReports`, `dailyServiceLines`, `dailyPharmacyIncome`, `dailyExpenditures`, `dailyStaffAdvances`, `dailyIpdAdmissions`, `dailyIpdDischarges`, `dailyAdditionalIncome`, `dailyDiscountsReturns`, `dailyPaymentChannels`, `reportCategoryExclusions`, `monthlyBankExpenses`, `bankAccounts`, `serviceCategories`, `serviceCatalog`, `expenseCategories`, `expenseCatalog`, `consultantRates`, `transactions`.

---

### C. HR & Payroll Management
- **Access Policy**: Restricted to `admin`, `hr` role, and management approvers (`canViewHr`).
- **Frontend Routes** (`src/routes/_authenticated/hr/`):
  - `staff-list.tsx`: Staff directory with search, multi-department filtering, and version details.
  - `view-staff.tsx`: Detailed employee 360° profile, salary history, KYC, nominees, certifications.
  - `add-staff.tsx`: Multi-tab staff onboarding form (statutory EPF/ESI, bank, initial salary).
  - `roster.tsx`: Clinical & departmental shift roster planner.
  - `leaves.tsx` & `review-leave.tsx`: Employee leave requests, quota tracking, leave approval workflow.
  - `payroll.tsx`: Monthly payroll processing, statutory deductions, TDS, security deposits, payslip generation.
  - `view-payslip.tsx`: Detailed payslip viewer and printable salary slip.
  - `attendance.tsx`: Daily attendance logs and biometric machine mapping.
  - `off-day-requests.tsx`: Shift swap, off-day requests, and weekly off-day rules.
- **Backend Route Files**: `server/routes/staff.ts`, `server/routes/roster.ts`, `server/routes/leaves.ts`, `server/routes/attendance.ts`, `server/routes/payroll.ts`, `server/routes/off-days.ts`.
- **Key Tables**: `staff`, `staffDepartments`, `departmentLeaders`, `staffSalaries`, `staffHrProfiles`, `staffSupervisors`, `shifts`, `rosters`, `staffOffDayRequests`, `staffWeeklyOffDays`, `leaveRequests`, `leaveTypes`, `payslips`, `securityDepositRefunds`, `attendance`, `biometricMappings`.

---

### D. Purchases & Procurement
- **Frontend Routes** (`src/routes/_authenticated/purchases/`):
  - `purchase-orders/`: PO list, create PO, view PO details (`index.tsx`, `new.tsx`, `$id.tsx`).
  - `grns/`: Goods Receipt Notes (GRN) against PO or direct delivery (`index.tsx`, `new.tsx`, `$id.tsx`).
  - `bills.tsx`: Vendor bills and payment tracking.
  - `items.tsx`: Items catalog with multi-unit pricing, tax categories, reorder levels.
  - `item-types.tsx`: Item categories master (Medicines, Consumables, Surgicals, etc.).
  - `unit-types.tsx`: Measurement unit definitions and conversion matrices.
  - `vendors.tsx`: Vendor / supplier master directory.
- **Backend Route File**: `server/routes/purchases.ts`.
- **Key Tables**: `vendors`, `purchaseOrders`, `poItems`, `grns`, `grnItems`, `poPayments`, `items`, `itemTypes`, `unitTypes`, `unitConversions`, `itemUnitPrices`.

---

### E. Store Inventory & Pharmacy Management
- **Schema**: PostgreSQL dedicated schema `inventory` (`server/db/schema-inventory.ts`).
- **Core Services**:
  - `server/services/stock-engine.ts`: Atomic stock movements (`recordStockMovement`), batch stock updates, ledger audit trail.
  - `server/services/sequence.ts`: Concurrency-safe sequential document numbering (`generateDocNumber`).
- **Frontend Routes** (`src/routes/_authenticated/inventory/`):
  - `stores.tsx`: Store locations master (Central, Retail Pharmacy, Wards, College, Lab) & staff assignments.
  - `stock.tsx`: Real-time batch-wise inventory stock view across stores.
  - `ledger.tsx`: Complete stock transaction audit ledger (`stockLedger`).
  - `pos.tsx`: Pharmacy Point-of-Sale billing with batch auto-select, barcoding, prescription link, discount & mixed payments.
  - `requisitions/`: Inter-store stock requests and approval workflow (`index.tsx`, `new.tsx`, `$id.tsx`).
  - `transfers/`: Stock issue, in-transit tracking, and store receipt confirmation (`index.tsx`, `new.tsx`, `$id.tsx`).
  - `adjustments/`: Physical audit reconciliations, gain/loss, expiry, damaged goods adjustments (`index.tsx`, `new.tsx`, `$id.tsx`).
  - `purchase-invoices/`: Direct vendor purchase invoice entry, GRN conversion, payment logging (`index.tsx`, `new.tsx`, `$id.tsx`).
  - `invoices/`: Sales invoice archive, customer returns, credit notes (`index.tsx`, `new.tsx`, `$id.tsx`).
  - `reports/`: Stock valuation, inventory expiry alerts, consumption reports.
- **Backend Route Files**: `server/routes/inventory.ts`, `server/routes/transfers.ts`, `server/routes/pos.ts`.
- **Key Tables** (`inventory.*`): `stores`, `storeStaffAssignments`, `itemBatches`, `storeBatchStock`, `stockLedger`, `documentSequences`, `stockRequisitions`, `stockRequisitionItems`, `stockTransfers`, `stockTransferItems`, `stockAdjustments`, `stockAdjustmentItems`, `salesInvoices`, `salesInvoiceItems`, `salesReturns`, `salesReturnItems`, `purchaseInvoices`, `purchaseInvoiceItems`, `purchaseInvoicePayments`.

---

### F. Clinical, Communication & Hospital Administration
- **Clinical Routes** (`src/routes/_authenticated/clinical/`):
  - `immunization.tsx`: Pediatric & adult immunization schedule, vaccine administration records, batch tracking.
- **Communication Routes**:
  - `src/routes/_authenticated/communication.tsx`: Internal messaging, department announcements, chat threads.
  - `src/routes/_authenticated/settings.tsx`: User profile, notification preferences, password updates.
- **Master Data Routes** (`src/routes/_authenticated/masters/` & `admin/`):
  - `admin/users.tsx`: User accounts, Better-Auth roles, bans, mandatory password change.
  - `admin/hospital.tsx`: Hospital settings, branding, header metadata.
  - `masters/departments.tsx`: Hospital departments (clinical / non-clinical, department heads).
  - `masters/designations.tsx`: Job roles and designations.
  - `masters/shifts.tsx`: Shift timings, codes, off-day flags.
  - `masters/banks.tsx`: Bank masters.
  - `masters/leave-types.tsx`: Leave policies and paid/unpaid quotas.
  - `masters/roles.tsx`: User role permissions.
  - `masters/salary-templates.tsx`: Standard salary compensation structures.
  - `masters/management-approvers.tsx`: Designated management approval officers.
  - `masters/nursing-supers.tsx`: Nursing superintendents master.
- **Backend Route Files**: `server/routes/immunization.ts`, `server/routes/messages.ts`, `server/routes/notifications.ts`, `server/routes/admin-users.ts`, `server/routes/masters.ts`, `server/routes/dashboard.ts`, `server/routes/public.ts`.
- **Key Tables**: `patients`, `appointments`, `encounters`, `medicines`, `prescriptions`, `prescriptionLines`, `immunizationSchedules`, `immunizationRecords`, `messages`, `notifications`, `user`, `session`, `account`, `verification`, `departments`, `designations`, `shifts`, `banks`, `leaveTypes`, `managementApprovers`, `nursingSupers`, `hospitalSettings`.

---

## 3. Security & Permission Architecture

1. **Frontend Permissions Hook** (`src/lib/permissions.ts`):
   - `useUserPermissions()` exposes:
     - `isAdmin`: User role is `"admin"`.
     - `isHr`: User role is `"hr"` or staff record role is `"hr"`.
     - `isAccounts`: Staff department is `"Accounts"` or user role is `"accounts"`.
     - `isAcon`: Staff department is `"ACON"` or user role is `"acon"`.
     - `isManagementApprover`: Staff member is marked active in `managementApprovers` table.
     - `canViewAccounts`: `isAdmin || isAccounts || isManagementApprover`.
     - `canViewHr`: `isAdmin || isHr || isManagementApprover`.
     - `canViewCollege`: `isAdmin || isAccounts || isAcon`.
     - `canViewInventory`: Access to inventory, store management, and POS.
     - `canManageStores`: Store configuration restricted to `isAdmin || isManagementApprover`.
2. **Backend Authentication & Authorization Guards** (`server/routes/shared.ts`):
   - `getCurrentStaff(c)`: Finds active staff record matching session `userId` or `email`.
   - `requireAdmin(c, next)`: Enforces `user.role === 'admin'`.
   - `hasHrOrAccountsViewAccess(c)`: Verifies Admin / HR / Accounts / Management approver.
   - `hasCollegeAccess(c)`: Verifies `role in ('admin', 'accounts', 'acon')` or active department `in ('Accounts', 'ACON')`.
   - `requireCollegeAccess(c, next)`: Reusable middleware throwing `403` on unauthorized college access.
   - `hasInventoryAccess(c)` & `requireInventoryAccess(c, next)`: Guards store inventory and pharmacy operations.
   - `isManagementApprover(c)`: Checks active management approver status.

---

## 4. Common Coding & Design Conventions

1. **Server-Side Pagination Pattern**:
   - Query params: `page` (1-indexed), `pageSize` (default 10, 20, 50, 100), `search` (debounced string), plus entity-specific filters.
   - Response envelope: `{ data: T[], pagination: { page: number, pageSize: number, totalRecords: number, totalPages: number } }`.
   - Ensure backward compatibility by returning `data` array directly when `page` is omitted for dropdown callers.
2. **Sequential Entity Code Generation** (`server/services/sequence.ts`):
   - Purchase Orders: `PO-YYYY-XXXX`
   - Goods Receipt Notes: `GRN-YYYY-XXXX`
   - Purchase Invoices: `PINV-YYYY-XXXX`
   - Sales Invoices (POS): `SINV-YYYY-XXXX`
   - Stock Transfers: `STRN-YYYY-XXXX`
   - Stock Requisitions: `SREQ-YYYY-XXXX`
   - Stock Adjustments: `SADJ-YYYY-XXXX`
   - Nursing Students: `NUR-STU-<YEAR>-<0001>`
   - Nursing Applications: `APP-<YEAR>-<0001>`
   - Fee Receipts: `REC-NUR-<YEAR>-<0001>`
3. **Database Null-Safety & Numeric Casting**:
   - Drizzle numeric columns return string values in JavaScript: always wrap with `toNum(val)` or `parseFloat(val) || 0`.
   - For timestamps, use Drizzle `timestamp("col_name").defaultNow()`.
4. **Stock Engine Integrity**:
   - Stock movements must never directly mutate `storeBatchStock` without also writing a corresponding entry in `stockLedger`.
   - Use `recordStockMovement()` in `server/services/stock-engine.ts` for all stock adjustments, transfers, sales, returns, and GRNs.
5. **Sidebar Navigation** (`src/components/Shell.tsx`):
   - Always guard navigation links using permission booleans (`canViewCollege`, `canViewAccounts`, `canViewHr`, `canViewInventory`).
6. **Testing Conventions**:
   - Integration tests live in `tests/integration/<module>/` and test end-to-end Hono route handlers against test database fixtures.
   - Global database setup, cleanup, and transaction rollbacks are managed in `tests/setup/global-setup.ts`.
