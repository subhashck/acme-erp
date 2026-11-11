import { eq, and, sql } from "drizzle-orm";
import { documentSequences } from "../db/schema-inventory.ts";

export function getCurrentFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();

  let startYear: number;
  let endYear: number;

  if (month >= 4) {
    startYear = year;
    endYear = year + 1;
  } else {
    startYear = year - 1;
    endYear = year;
  }

  const startStr = startYear.toString().slice(-2);
  const endStr = endYear.toString().slice(-2);
  return `${startStr}-${endStr}`;
}

export async function generateDocNumber(
  tx: any,
  code: string, // 'GRN', 'INV', 'PO', 'TRN', 'REQ', 'ADJ', 'RET'
  overrideFy?: string
): Promise<string> {
  const fy = overrideFy || getCurrentFinancialYear();
  const upperCode = code.toUpperCase();

  // Try to atomically increment existing sequence
  const updated = await tx
    .update(documentSequences)
    .set({
      currentVal: sql`${documentSequences.currentVal} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(documentSequences.code, upperCode),
        eq(documentSequences.financialYear, fy)
      )
    )
    .returning();

  let row = updated[0];

  if (!row) {
    // Insert initial row for this code & financial year
    const inserted = await tx
      .insert(documentSequences)
      .values({
        code: upperCode,
        prefix: upperCode,
        financialYear: fy,
        currentVal: 1,
        padding: 5,
      })
      .onConflictDoUpdate({
        target: [documentSequences.code, documentSequences.financialYear],
        set: {
          currentVal: sql`${documentSequences.currentVal} + 1`,
          updatedAt: new Date(),
        },
      })
      .returning();

    row = inserted[0];
  }

  const paddedNum = row.currentVal.toString().padStart(row.padding, "0");
  return `${row.prefix}/${fy}/${paddedNum}`;
}
