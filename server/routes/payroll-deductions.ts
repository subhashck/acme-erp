import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import { departments, staff, staffDepartments, staffSalaries, payslips, securityDepositRefunds, securityDepositRuleChanges } from "../db/schema.ts";
import { securityDepositBalances } from "../services/security-deposit.ts";

const money = z.coerce.number().min(0).max(9999999999.99).multipleOf(0.01);
const ruleSchema = z.object({
  epf: money, esi: money, professionalTax: money,
  securityDepositTotal: money, securityDeposit: money, securityDepositOpeningBalance: money,
  securityDepositStartMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).nullable(),
});
const inputSchema = ruleSchema.extend({ version: z.number().int().positive(), expected: ruleSchema });

export const payrollDeductionRoutes = new Hono<AuthEnv>()
  .use("/hr/payroll-deductions/*", async (c, next) => {
    const session = c.get("session");
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    if (!["admin", "hr"].includes(session.user.role ?? "")) return c.json({ error: "HR or Admin access required" }, 403);
    await next();
  })
  .get("/hr/payroll-deductions/staff", async (c) => {
    const rows = await db.selectDistinctOn([staff.staffId], {
      staffId: staff.staffId, version: staff.version, name: staff.name, employeeCode: staff.employeeCode,
      departmentName: departments.name, salaryId: staffSalaries.id, epf: staffSalaries.epf, esi: staffSalaries.esi,
      professionalTax: staffSalaries.professionalTax, securityDepositTotal: staffSalaries.securityDepositTotal,
      securityDeposit: staffSalaries.securityDeposit, securityDepositStartMonth: staffSalaries.securityDepositStartMonth,
      securityDepositOpeningBalance: staffSalaries.securityDepositOpeningBalance,
    }).from(staff)
      .leftJoin(staffSalaries, and(eq(staff.staffId, staffSalaries.staffId), eq(staff.version, staffSalaries.staffVersion)))
      .leftJoin(staffDepartments, and(eq(staff.staffId, staffDepartments.staffId), eq(staff.version, staffDepartments.staffVersion), eq(staffDepartments.status, "Active")))
      .leftJoin(departments, eq(departments.id, staffDepartments.departmentId))
      .where(eq(staff.active, true)).orderBy(staff.staffId, departments.id);
    return c.json(rows.sort((a, b) => a.name.localeCompare(b.name)));
  })
  .put("/hr/payroll-deductions/staff/:id", async (c) => {
    const staffId = z.coerce.number().int().positive().parse(c.req.param("id"));
    const input = inputSchema.parse(await c.req.json());
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(73421, ${staffId})`);
      const [employee] = await tx.select().from(staff).where(and(eq(staff.staffId, staffId), eq(staff.active, true))).limit(1).for("update");
      if (!employee) throw new HTTPException(404, { message: "Staff member not found" });
      if (employee.version !== input.version) throw new HTTPException(409, { message: "Staff details changed. Refresh and reopen the editor." });
      const [salary] = await tx.select().from(staffSalaries).where(and(eq(staffSalaries.staffId, staffId), eq(staffSalaries.staffVersion, employee.version))).limit(1);
      if (!salary) throw new HTTPException(409, { message: "Set up this employee salary structure in Payroll before editing deductions." });
      for (const key of Object.keys(input.expected) as Array<keyof typeof input.expected>) {
        const current = key === "securityDepositStartMonth" ? salary?.[key] ?? null : Number(salary?.[key] || 0);
        if (current !== input.expected[key]) throw new HTTPException(409, { message: "Deduction rules changed. Refresh and reopen the editor." });
      }
      const deductions = await tx.select({ status: payslips.status, securityDeposit: payslips.securityDeposit }).from(payslips).where(eq(payslips.staffId, staffId));
      const refunds = await tx.select({ amount: securityDepositRefunds.amount }).from(securityDepositRefunds).where(eq(securityDepositRefunds.staffId, staffId));
      if (securityDepositBalances(input.securityDepositOpeningBalance, deductions, refunds).netHeld < 0) {
        throw new HTTPException(400, { message: "Opening balance cannot be reduced below deposits already refunded." });
      }
      const rules = {
        epf: String(input.epf), esi: String(input.esi), professionalTax: String(input.professionalTax),
        securityDepositTotal: String(input.securityDepositTotal), securityDeposit: String(input.securityDeposit),
        securityDepositOpeningBalance: String(input.securityDepositOpeningBalance), securityDepositStartMonth: input.securityDepositStartMonth,
      };
      await tx.update(staffSalaries).set({ ...rules, updatedAt: new Date() }).where(eq(staffSalaries.id, salary.id));
      const previousRules = Object.fromEntries(Object.keys(rules).map(key => [key, salary?.[key as keyof typeof salary] ?? (key === "securityDepositStartMonth" ? null : "0")]));
      await tx.insert(securityDepositRuleChanges).values({ staffId, previousRules, newRules: rules, processedBy: c.get("session")!.user.id });
    });
    return c.json({ ok: true });
  });
