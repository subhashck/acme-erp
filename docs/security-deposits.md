# Payroll security deposits

Set rules under **HR → Payroll → Security Deposit Dashboard → Set Target**.

- **Target total** is the lifetime amount to collect. A zero target disables new deductions without erasing money already collected.
- **Monthly deduction** is the maximum per payslip. The last installment is capped at the remaining target.
- **First deduction month** is inclusive. No collections are assumed between joining and this month. Leaving it empty applies the rule to any generated payroll month.
- **Opening balance already collected** records historical collections missing from paid ERP payslips. Do not include deductions already present in paid payslips. It defaults to zero; no historical amounts are inferred or backfilled.

Collected funds equal opening balance plus deductions on **Paid** payslips. Draft, Active, HR-approved and Management/COO-approved deductions are pending: they reserve part of the target but cannot be refunded. Cancelled and Superseded payslips contribute nothing.

Refunds require HR/Admin access, a date and reason. The server checks collected funds less previous refunds under a per-staff transaction lock. Refunds do not restart collection. Opening-balance changes cannot reduce collected funds below amounts already refunded. Rule edits through Set Target store before/after values, actor and timestamp in `security_deposit_rule_changes`; refund records store the actor and reason.

Changing rules does not rewrite existing payslips. Regenerate eligible draft payroll to apply corrected rules. Verify existing opening collections against source records before entering an opening balance.

For an existing database, run `pnpm exec tsx server/db/migrate-security-deposit-opening.ts`. This additive migration also runs in `pnpm db:setup`.

## HR deduction management

**HR → Payroll Deductions** (`/hr/payroll-deductions`) allows only users with the HR or Admin account role to read and edit staff PF, ESI, professional tax, security deposit target/monthly amount, opening balance and first deduction month. Both the frontend route and `/api/hr/payroll-deductions/*` enforce this restriction; Accounts and management approvers are excluded.

The editor saves only these deduction fields. Changes are transactional and audited in `security_deposit_rule_changes`, including PF, ESI and professional tax values. Stale staff versions or changed deduction values return a conflict instead of overwriting newer edits. Use **Deposit Balances & Refunds** to open the existing security deposit dashboard.

Deduction management uses separate PF, ESI, Professional Tax and Security Deposit tabs. Each tab has its own fields and editor. Export Excel downloads the active tab for the current search and department filters, using saved values and numeric INR cells. Unsaved edits are excluded from exports.
