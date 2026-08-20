# ACME ERP Codebase Architecture & Reference Map

This document serves as the persistent knowledge index and architecture guide for the ACME ERP project. Consult this reference map to immediately locate source files, schema definitions, API endpoints, permissions, and architectural conventions without requiring exploratory searches.

---

## 1. Project Tech Stack & Layout

- **Backend Runtime**: Node.js + [Hono](https://hono.dev/) (`server/index.ts`, `server/routes.ts`)
- **Database & ORM**: PostgreSQL + [Drizzle ORM](https://orm.drizzle.team/) (`server/db/schema.ts`, `server/db/client.ts`)
- **Authentication**: [Better-Auth](https://www.better-auth.com/) (`server/auth.ts`, `src/services/auth.ts`)
- **Frontend SPA**: React 19 + TypeScript + [Vite](https://vitejs.dev/) + [TanStack Router](https://tanstack.com/router) (`src/routes/`)
- **State & Data Fetching**: `@tanstack/react-query` (`useQuery`, `useMutation`), RPC client (`src/services/rpc.ts`)
- **Styling & UI**: TailwindCSS, Radix UI primitives, Lucide React icons, Sonner toast notifications

---

## 2. Module Sitemaps & API Endpoints

### A. Nursing College Module (ACON)
- **Access Policy**: Restricted strictly to `admin`, `accounts` role/department, and `ACON` department staff (`canViewCollege`).
- **Route Guard**: `<CollegeAccessGuard>` (`src/components/CollegeAccessGuard.tsx`) & backend middleware `requireCollegeAccess` (`server/routes/shared.ts`).
- **Frontend Routes** (`src/routes/_authenticated/college/`):
  - `index.tsx`: Dashboard with summary KPIs, fee trend line charts, quota distribution.
  - `admissions.tsx`: Applicant pipeline, merit scoring, seat booking advance fee, conversion to student.
  - `students.tsx`: Student master directory with server-side pagination & multi-filter bar.
  - `student/$id.tsx`: Comprehensive student profile (tabs: Info, Documents, Ledger, Attendance).
  - `fees.tsx`: Fee ledger, fee collection dialog with receipt generation (PDF export via jsPDF).
  - `fee-dues.tsx`: Real-time fee due tracking, installment reminders, overdue lists.
  - `fee-structures.tsx`: Course & quota fee structures (One-time, Per-semester, Annual, Monthly frequencies).
  - `courses.tsx`: Course programs and batch master (with seat quotas, academic years).
  - `academic-schedules.tsx`: Academic session schedules and milestones.
  - `subjects.tsx`: Semester & course subject curriculum master.
  - `attendance.tsx`: Batch-wise daily attendance marking (theory / practical).
- **Backend Route File**: `server/routes/nursing.ts` (all endpoints prefixed with `/nursing/*`).
- **Key Tables**: `nursingCourses`, `nursingBatches`, `nursingApplicants`, `nursingStudents`, `nursingStudentDocuments`, `nursingFeeStructures`, `nursingFeeTransactions`, `nursingStudentFeeFrequencies`, `nursingAttendanceRecords`, `nursingSubjects`, `nursingAcademicSchedules`.

---

### B. Accounts & Daily Financial Closing
- **Access Policy**: Restricted to `admin`, `accounts` department, and `managementApprovers` (`canViewAccounts`).
- **Frontend Routes** (`src/routes/_authenticated/accounts/`):
  - `reports/index.tsx`: List of daily closing reports with status (Draft, Pending Approval, Approved).
  - `reports/$id.tsx`: Detailed daily closing view & PDF/Excel export (`src/lib/closing-export.ts`).
  - `bank-expenses.tsx`: Direct bank-level expenditures ledger.
  - `bank-accounts.tsx` & `bank-transfers.tsx`: Bank account balances and inter-account fund transfers.
- **Frontend Components**: `src/components/ReportForm.tsx` (complex closing form with live totals, denomination calculator, handover reconciliations).
- **Backend Route Files**: `server/routes/daily-closing.ts`, `server/routes/monthly-report.ts`, `server/routes/accounts.ts`, `server/routes/bank-expenses.ts`, `server/routes/bank-accounts.ts`.
- **Key Tables**: `dailyClosingReports`, `bankExpenses`, `bankAccounts`, `bankTransfers`, `expenditures`, `cashDenominations`.

---

### C. HR & Payroll Management
- **Access Policy**: Restricted to `admin`, `hr` role, and management approvers (`canViewHr`).
- **Frontend Routes** (`src/routes/_authenticated/hr/`):
  - `staff-list.tsx`: Staff directory with search, department filtering, and active version details.
  - `view-staff.tsx`: Detailed employee 360-degree profile, salary breakdown, version history sidebar.
  - `add-staff.tsx`: Multi-tab staff onboarding form (statutory EPF/ESI, bank, initial salary).
  - `roster.tsx`: Clinical & departmental shift roster planner.
  - `leaves.tsx` & `review-leave.tsx`: Employee leave requests, quota tracking, leave approval workflow.
  - `payroll.tsx`: Monthly payroll processing, statutory deductions, payslip generator.
  - `off-day-requests.tsx` & `shift-change-requests.tsx`: Shift swap and off-day workflows.
- **Backend Route Files**: `server/routes/staff.ts`, `server/routes/roster.ts`, `server/routes/leaves.ts`, `server/routes/attendance.ts`, `server/routes/payroll.ts`, `server/routes/off-days.ts`.
- **Key Tables**: `staff`, `staffDepartments`, `staffSalaries`, `staffDesignations`, `staffSupervisors`, `leaves`, `leaveTypes`, `rosterAssignments`, `shifts`, `payrollSlips`, `attendanceLogs`.

---

### D. Purchases & Store Inventory
- **Frontend Routes** (`src/routes/_authenticated/purchases/`): `purchase-orders/`, `items/`, `item-types/`, `unit-types/`, `suppliers/`, `payments/`.
- **Backend Route File**: `server/routes/purchases.ts`.
- **Key Tables**: `purchaseOrders`, `purchaseOrderItems`, `items`, `itemTypes`, `unitTypes`, `unitConversions`, `suppliers`, `purchasePayments`.

---

### E. Administration & Master Tables
- **Frontend Routes** (`src/routes/_authenticated/admin/` & `masters/`):
  - `admin/users.tsx`: User accounts, password resets, role assignment.
  - `admin/hospital.tsx`: Hospital profile and header metadata.
  - `masters/departments.tsx`, `masters/designations.tsx`, `masters/shifts.tsx`, `masters/banks.tsx`, `masters/management-approvers.tsx`, `masters/nursing-supers.tsx`.
- **Backend Route Files**: `server/routes/admin-users.ts`, `server/routes/masters.ts`.
- **Key Tables**: `user`, `session`, `account`, `departments`, `designations`, `shifts`, `banks`, `managementApprovers`, `nursingSupers`, `hospitalSettings`.

---

## 3. Security & Permission Architecture

1. **Frontend Permissions Hook** (`src/lib/permissions.ts`):
   - `useUserPermissions()` exposes:
     - `isAdmin`: User has role `"admin"`.
     - `isHr`: User has role `"hr"` or staff role is `"hr"`.
     - `isAccounts`: Staff department name is `"Accounts"` or user role is `"accounts"`.
     - `isAcon`: Staff department name is `"ACON"` or user role is `"acon"`.
     - `isManagementApprover`: Staff member is marked active in `managementApprovers` table.
     - `canViewAccounts`: `isAdmin || isAccounts || isManagementApprover`
     - `canViewHr`: `isAdmin || isHr || isManagementApprover`
     - `canViewCollege`: `isAdmin || isAccounts || isAcon`
2. **Backend Authentication & Authorization Guards** (`server/routes/shared.ts`):
   - `getCurrentStaff(c)`: Finds staff record matching active session `userId` or `email`.
   - `requireAdmin(c, next)`: Enforces `user.role === 'admin'`.
   - `hasHrOrAccountsViewAccess(c)`: Verifies Admin / HR / Accounts / Management approver.
   - `hasCollegeAccess(c)`: Verifies `role in ('admin', 'accounts', 'acon')` or active department `in ('Accounts', 'ACON')`.
   - `requireCollegeAccess(c, next)`: Reusable middleware throwing `403` on unauthorized requests.

---

## 4. Common Coding & Design Conventions

1. **Server-Side Pagination Pattern**:
   - Query params: `page` (1-indexed), `pageSize` (default 10, 20, 50, 100), `search` (debounced string), plus entity-specific filters.
   - Response envelope: `{ data: T[], pagination: { page: number, pageSize: number, totalRecords: number, totalPages: number } }`.
   - Ensure backward compatibility by returning `data` array directly when `page` is omitted for dropdown callers.
2. **Sequential Entity Code Generation**:
   - Students: `NUR-STU-<YEAR>-<0001>` (4-digit padded sequential index with collision prevention).
   - Applications: `APP-<YEAR>-<0001>`.
   - Fee Receipts: `REC-NUR-<YEAR>-<0001>`.
3. **Database Null-Safety & Numeric Casting**:
   - Drizzle numeric columns return string values in JavaScript: always wrap with `toNum(val)` or `parseFloat(val) || 0`.
   - For timestamps, use Drizzle `timestamp("col_name").defaultNow()`.
4. **Sidebar Navigation** (`src/components/Shell.tsx`):
   - Always guard navigation links using permission booleans (`canViewCollege`, `isAccountsVisible`, `canViewHr`).
