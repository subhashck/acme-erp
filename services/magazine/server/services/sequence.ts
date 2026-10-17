import { sql } from 'drizzle-orm';

export async function generateDocNumber(tx: any, code: string): Promise<string> {
  if (code !== 'MAG') throw new Error('Magazine owns only MAG issue numbers');
  const now = new Date();
  const year = now.getFullYear() - (now.getMonth() < 3 ? 1 : 0);
  const fy = `${String(year).slice(-2)}-${String(year + 1).slice(-2)}`;
  const result = await tx.execute(sql`
    INSERT INTO magazine.issue_sequences (financial_year, current_val) VALUES (${fy}, 1)
    ON CONFLICT (financial_year) DO UPDATE SET current_val = magazine.issue_sequences.current_val + 1
    RETURNING current_val
  `);
  return `MAG/${fy}/${String(result.rows[0].current_val).padStart(5, '0')}`;
}
