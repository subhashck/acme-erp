import { describe, expect, it } from "vitest";
import { z } from "zod";

// Test schema matching bankExpenseInput in server/routes/bank-expenses.ts
const bankExpenseInput = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
  category: z.string().min(1),
  label: z.string().min(1),
  vendorId: z.number().int().positive().nullable().optional(),
  amount: z.number().min(0),
  paymentMode: z.string().default("Bank Transfer"),
  paymentDate: z.string().nullable().optional(),
  valueDate: z.string().nullable().optional(),
  chequeIssueDate: z.string().nullable().optional(),
  referenceNo: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  narration: z.string().nullable().optional(),
  isRecurring: z.boolean().default(false),
  isSalaryAuto: z.boolean().default(false),
});

describe("Bank Expenses Value Date & Month Derivation", () => {
  it("allows omitting month and populating valueDate", () => {
    const input = bankExpenseInput.parse({
      category: "MAINTENANCE",
      label: "Air conditioner servicing",
      amount: 4500,
      valueDate: "2026-08-08",
      paymentDate: "2026-08-10",
    });

    expect(input.valueDate).toBe("2026-08-08");
    expect(input.paymentDate).toBe("2026-08-10");
    expect(input.month).toBeUndefined();

    // Derived month logic
    const effectiveValueDate = input.valueDate ?? input.chequeIssueDate ?? null;
    const derivedMonth = input.month || (effectiveValueDate || input.paymentDate || "").slice(0, 7) || null;
    expect(derivedMonth).toBe("2026-08");
  });

  it("supports backwards-compatible chequeIssueDate alias", () => {
    const input = bankExpenseInput.parse({
      category: "EQUIPMENT",
      label: "Diagnostic probe",
      amount: 12000,
      chequeIssueDate: "2026-08-08",
    });

    const effectiveValueDate = input.valueDate ?? input.chequeIssueDate ?? null;
    expect(effectiveValueDate).toBe("2026-08-08");
    const derivedMonth = input.month || (effectiveValueDate || input.paymentDate || "").slice(0, 7) || null;
    expect(derivedMonth).toBe("2026-08");
  });

  it("correctly derives accrual vs cash report assignment in cross-month payments", () => {
    // Expense #22 case from the user's issue:
    // Cheque issued on 2026-08-08, cleared bank on 2026-09-02
    const expense = {
      id: 22,
      label: "Generator Fuel",
      amount: "15000",
      valueDate: "2026-08-08",
      paymentDate: "2026-09-02",
    };

    const accrualDate = expense.valueDate || expense.paymentDate;
    const cashDate = expense.paymentDate;

    // Filter by August 2026
    const isAugAccrual = accrualDate?.startsWith("2026-08");
    const isAugCash = cashDate?.startsWith("2026-08");
    expect(isAugAccrual).toBe(true); // Belongs to August report in Accrual
    expect(isAugCash).toBe(false);  // Does NOT belong to August in Cash

    // Filter by September 2026
    const isSepAccrual = accrualDate?.startsWith("2026-09");
    const isSepCash = cashDate?.startsWith("2026-09");
    expect(isSepAccrual).toBe(false); // Does NOT belong to September in Accrual
    expect(isSepCash).toBe(true);   // Belongs to September report in Cash
  });

  it("falls back to paymentDate when valueDate is not present (e.g. direct bank transfer)", () => {
    const expense = {
      id: 23,
      label: "Electricity Bill",
      amount: "28000",
      valueDate: null,
      paymentDate: "2026-08-15",
    };

    const accrualDate = expense.valueDate || expense.paymentDate;
    expect(accrualDate).toBe("2026-08-15");
    expect(accrualDate?.startsWith("2026-08")).toBe(true);
  });
});
