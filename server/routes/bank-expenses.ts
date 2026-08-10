import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { auth, type AuthEnv } from "../auth.ts";
import { db } from "../db/client.ts";
import {
  monthlyBankExpenses,
  vendors,
  payslips,
  user,
} from "../db/schema.ts";
import { hasHrOrAccountsViewAccess } from "./shared.ts";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------
const bankExpenseInput = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  category: z.string().min(1),
  label: z.string().min(1),
  vendorId: z.number().int().positive().nullable().optional(),
  amount: z.number().min(0),
  paymentMode: z.string().default("Bank Transfer"),
  paymentDate: z.string().nullable().optional(),
  chequeIssueDate: z.string().nullable().optional(),
  referenceNo: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  narration: z.string().nullable().optional(),
  isRecurring: z.boolean().default(false),
  isSalaryAuto: z.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
export const bankExpensesRoutes = new Hono<AuthEnv>()

  // =========================================================================
  // Salary Auto-Pull
  // =========================================================================
  .get("/accounts/bank-expenses/salary-summary", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const month = c.req.query("month");
    if (!month) {
      return c.json({ error: "month query parameter required (YYYY-MM)" }, 400);
    }

    const [result] = await db
      .select({
        totalNetSalary: sql<string>`coalesce(sum(${payslips.netSalary}::numeric), 0)`,
        paidCount: sql<number>`count(*)::int`,
      })
      .from(payslips)
      .where(
        and(
          eq(payslips.month, month),
          eq(payslips.status, "Paid"),
          eq(payslips.paymentMode, "Bank Transfer")
        )
      )
      .execute();

    return c.json({
      month,
      totalNetSalary: Math.round(parseFloat(result?.totalNetSalary || "0") * 100) / 100,
      paidCount: result?.paidCount || 0,
    });
  })

  // =========================================================================
  // Copy from Previous Month
  // =========================================================================
  .post("/accounts/bank-expenses/copy-previous", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const userId = session?.user?.id;

    const body = await c.req.json();
    const targetMonth = z.string().regex(/^\d{4}-\d{2}$/).parse(body.month);

    // Compute previous month
    const [year, mon] = targetMonth.split("-").map(Number);
    const prevDate = new Date(year, mon - 2, 1); // month is 0-indexed; mon-1 is current, mon-2 is prev
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

    // Fetch recurring entries from previous month
    const prevEntries = await db
      .select()
      .from(monthlyBankExpenses)
      .where(
        and(
          eq(monthlyBankExpenses.month, prevMonth),
          eq(monthlyBankExpenses.isRecurring, true)
        )
      )
      .execute();

    if (prevEntries.length === 0) {
      return c.json({ copied: 0, skipped: 0, message: "No recurring entries found in previous month" });
    }

    // Check existing entries for target month to avoid duplicates
    const existingEntries = await db
      .select({ category: monthlyBankExpenses.category, label: monthlyBankExpenses.label })
      .from(monthlyBankExpenses)
      .where(eq(monthlyBankExpenses.month, targetMonth))
      .execute();

    const existingKeys = new Set(
      existingEntries.map((e) => `${e.category}::${e.label}`)
    );

    const toCopy = prevEntries.filter(
      (e) => !existingKeys.has(`${e.category}::${e.label}`)
    );

    if (toCopy.length > 0) {
      await db
        .insert(monthlyBankExpenses)
        .values(
          toCopy.map((e) => ({
            month: targetMonth,
            category: e.category,
            label: e.label,
            vendorId: e.vendorId,
            amount: e.amount,
            paymentMode: e.paymentMode,
            paymentDate: null,
            chequeIssueDate: null,
            referenceNo: null,
            bankName: e.bankName,
            narration: e.narration,
            isRecurring: true,
            isSalaryAuto: false,
            createdBy: userId || null,
          }))
        )
        .execute();
    }

    return c.json({
      copied: toCopy.length,
      skipped: prevEntries.length - toCopy.length,
      message: `Copied ${toCopy.length} recurring entries from ${prevMonth}`,
    });
  })

  // =========================================================================
  // Bank Expenses CRUD
  // =========================================================================
  .get("/accounts/bank-expenses", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const month = c.req.query("month");
    if (!month) {
      return c.json({ error: "month query parameter required (YYYY-MM)" }, 400);
    }

    const rows = await db
      .select({
        id: monthlyBankExpenses.id,
        month: monthlyBankExpenses.month,
        category: monthlyBankExpenses.category,
        label: monthlyBankExpenses.label,
        vendorId: monthlyBankExpenses.vendorId,
        vendorName: vendors.name,
        amount: monthlyBankExpenses.amount,
        paymentMode: monthlyBankExpenses.paymentMode,
        paymentDate: monthlyBankExpenses.paymentDate,
        chequeIssueDate: monthlyBankExpenses.chequeIssueDate,
        referenceNo: monthlyBankExpenses.referenceNo,
        bankName: monthlyBankExpenses.bankName,
        narration: monthlyBankExpenses.narration,
        isRecurring: monthlyBankExpenses.isRecurring,
        isSalaryAuto: monthlyBankExpenses.isSalaryAuto,
        createdBy: monthlyBankExpenses.createdBy,
        createdAt: monthlyBankExpenses.createdAt,
      })
      .from(monthlyBankExpenses)
      .leftJoin(vendors, eq(monthlyBankExpenses.vendorId, vendors.id))
      .where(eq(monthlyBankExpenses.month, month))
      .orderBy(asc(monthlyBankExpenses.category), asc(monthlyBankExpenses.label))
      .execute();

    return c.json(rows);
  })

  .post("/accounts/bank-expenses", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    const userId = session?.user?.id;

    const body = await c.req.json();
    const input = bankExpenseInput.parse(body);

    const [row] = await db
      .insert(monthlyBankExpenses)
      .values({
        month: input.month,
        category: input.category,
        label: input.label,
        vendorId: input.vendorId ?? null,
        amount: input.amount.toFixed(2),
        paymentMode: input.paymentMode,
        paymentDate: input.paymentDate ?? null,
        chequeIssueDate: input.chequeIssueDate ?? null,
        referenceNo: input.referenceNo ?? null,
        bankName: input.bankName ?? null,
        narration: input.narration ?? null,
        isRecurring: input.isRecurring,
        isSalaryAuto: input.isSalaryAuto,
        createdBy: userId || null,
      })
      .returning();

    return c.json(row, 201);
  })

  .put("/accounts/bank-expenses/:id", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const id = parseInt(c.req.param("id"), 10);
    const body = await c.req.json();
    const input = bankExpenseInput.partial().parse(body);

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (input.month !== undefined) updateData.month = input.month;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.label !== undefined) updateData.label = input.label;
    if (input.vendorId !== undefined) updateData.vendorId = input.vendorId ?? null;
    if (input.amount !== undefined) updateData.amount = input.amount.toFixed(2);
    if (input.paymentMode !== undefined) updateData.paymentMode = input.paymentMode;
    if (input.paymentDate !== undefined) updateData.paymentDate = input.paymentDate ?? null;
    if (input.chequeIssueDate !== undefined) updateData.chequeIssueDate = input.chequeIssueDate ?? null;
    if (input.referenceNo !== undefined) updateData.referenceNo = input.referenceNo ?? null;
    if (input.bankName !== undefined) updateData.bankName = input.bankName ?? null;
    if (input.narration !== undefined) updateData.narration = input.narration ?? null;
    if (input.isRecurring !== undefined) updateData.isRecurring = input.isRecurring;
    if (input.isSalaryAuto !== undefined) updateData.isSalaryAuto = input.isSalaryAuto;

    const [updated] = await db
      .update(monthlyBankExpenses)
      .set(updateData)
      .where(eq(monthlyBankExpenses.id, id))
      .returning();

    if (!updated) return c.json({ error: "Expense not found" }, 404);
    return c.json(updated);
  })

  .delete("/accounts/bank-expenses/:id", async (c) => {
    if (!(await hasHrOrAccountsViewAccess(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const id = parseInt(c.req.param("id"), 10);

    const [deleted] = await db
      .delete(monthlyBankExpenses)
      .where(eq(monthlyBankExpenses.id, id))
      .returning();

    if (!deleted) return c.json({ error: "Expense not found" }, 404);
    return c.json({ success: true });
  });
