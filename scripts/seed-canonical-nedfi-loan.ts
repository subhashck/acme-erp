import { pool } from "../server/db/client.ts";
import {
  generateCanonicalAmortizationSchedule,
  type LoanParameters,
} from "../server/services/loan-engine.ts";

export async function seedCanonicalNedfiLoan() {
  console.log("Starting seeding of Canonical NEDFi Term Loan test data into dev DB...");

  const NEDFI_PARAMS: LoanParameters = {
    sanctionedAmount: 50_000_000,
    disbursedAmount: 50_000_000,
    disbursementDate: "2020-04-01",
    tenorMonths: 120,
    annualInterestRate: 10.0,
    interestType: "reducing",
    moratoriums: [
      {
        startDate: "2020-04-01",
        endDate: "2021-03-31",
        months: 12,
        type: "capitalized",
        notes: "Moratorium #1: Construction/Grace Period",
      },
      {
        startDate: "2022-04-01",
        endDate: "2023-03-31",
        months: 12,
        type: "capitalized",
        notes: "Moratorium #2: COVID-19 / Special Restructuring",
      },
    ],
    recastAtMoratoriumEnd: true,
    roundingDecimals: 2,
  };

  // Generate full canonical schedule
  const result = generateCanonicalAmortizationSchedule(NEDFI_PARAMS);

  // Today is September 2026.
  // Historical payments serviced up to August 2026:
  const currentDateCutoff = "2026-08-31";
  const historicalServicingLines = result.schedule.filter(
    (line) => !line.isMoratorium && line.date <= currentDateCutoff
  );

  // Calculate cumulative totals up to August 2026
  let totalPrincipalPaidToDate = 0;
  let totalInterestPaidToDate = 0;
  for (const line of historicalServicingLines) {
    totalPrincipalPaidToDate += line.principalComponent;
    totalInterestPaidToDate += line.interestComponent;
  }

  // Find the closing balance at August 2026
  const lastHistoricalLine = historicalServicingLines[historicalServicingLines.length - 1];
  const currentOutstandingBalance = lastHistoricalLine ? lastHistoricalLine.closingBalance : 50_000_000;

  // Next installment amount (current recast monthly EMI)
  const currentInstallmentAmount = 931_862;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Clean up existing placeholder facility 7 or NEDFi test facilities if any
    const existingNedfi = await client.query(
      "SELECT id FROM capital.facilities WHERE facility_code IN ('LIABILITY-LOAN-001', 'CAP-FAC-003') OR name ILIKE '%NEDFI%'"
    );

    for (const row of existingNedfi.rows) {
      const facId = row.id;
      await client.query("DELETE FROM capital.cash_flow_entries WHERE facility_id = $1", [facId]);
      await client.query("DELETE FROM capital.repayments WHERE facility_id = $1", [facId]);
      await client.query("DELETE FROM capital.facilities WHERE id = $1", [facId]);
      console.log(`Cleaned up previous placeholder facility ID ${facId}`);
    }

    // 1. Insert Canonical Facility
    const insertFacilitySql = `
      INSERT INTO capital.facilities (
        facility_code, name, lender_name, category, facility_type,
        sanctioned_amount, disbursed_amount, interest_rate, interest_type,
        tenor_months, repayment_frequency, installment_amount, outstanding_balance,
        total_principal_paid, total_interest_paid, total_charges_paid,
        sanction_date, disbursement_date, maturity_date,
        moratorium_months, moratorium_type, repayment_start_date,
        status, notes
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18, $19,
        $20, $21, $22,
        $23, $24
      ) RETURNING id;
    `;

    const facRes = await client.query(insertFacilitySql, [
      "LIABILITY-LOAN-001",
      "NEDFi Term Loan ₹5Cr",
      "NEDFi",
      "Bank Loan",
      "Term Loan",
      50_000_000.0,
      50_000_000.0,
      10.0,
      "reducing",
      120.0,
      "monthly",
      currentInstallmentAmount,
      currentOutstandingBalance,
      totalPrincipalPaidToDate,
      totalInterestPaidToDate,
      0.0,
      "2020-03-15",
      "2020-04-01",
      "2030-03-31",
      12.0,
      "capitalized",
      "2021-04-01",
      "active",
      "Canonical institutional debt facility: ₹5 Crore Term Loan from NEDFi with 2 capitalized moratorium windows (FY20-21 & FY22-23), recast EMI servicing at ₹9,31,862/month.",
    ]);

    const facilityId = facRes.rows[0].id;
    console.log(`Created Canonical NEDFi Facility ID: ${facilityId}`);

    // 2. Insert Disbursement Cash Flow Entry
    const disbCfSql = `
      INSERT INTO capital.cash_flow_entries (
        entry_code, entry_date, transaction_type, category,
        party_name, description, inflow_amount, outflow_amount,
        net_amount, reference_number, facility_id
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, $8,
        $9, $10, $11
      );
    `;

    await client.query(disbCfSql, [
      "CF-2020-0001",
      "2020-04-01",
      "debt_inflow",
      "Bank Loan Disbursement",
      "NEDFi",
      "Initial full disbursement receipt for NEDFi Term Loan ₹5Cr",
      50_000_000.0,
      0.0,
      50_000_000.0,
      "NEDFI-SANCTION-2020-01",
      facilityId,
    ]);
    console.log("Logged initial ₹5 Cr disbursement inflow in Treasury Cash Flow ledger.");

    // 3. Insert All Historical Repayments and Linked Outflow Entries
    let paymentSeq = 1;
    for (const line of historicalServicingLines) {
      const year = line.date.slice(0, 4);
      const seqStr = String(paymentSeq).padStart(4, "0");
      const paymentCode = `CAP-PAY-${year}-${seqStr}`;
      const cfCode = `CF-${year}-TL${seqStr}`;
      const refNumber = `NEDFI-AUTO-DEBIT-${line.date.replace(/-/g, "")}`;

      // Insert Repayment
      const repayRes = await client.query(
        `INSERT INTO capital.repayments (
          payment_code, facility_id, payment_date, payment_type,
          principal_paid, interest_paid, charges_paid, total_amount,
          payment_method, reference_number, status, notes
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12
        ) RETURNING id;`,
        [
          paymentCode,
          facilityId,
          line.date,
          "emi",
          line.principalComponent,
          line.interestComponent,
          0.0,
          line.installmentAmount,
          "auto_debit",
          refNumber,
          "completed",
          `Monthly EMI for ${line.financialYear} (Period ${line.periodNumber}): Principal ₹${Math.round(line.principalComponent).toLocaleString()}, Interest ₹${Math.round(line.interestComponent).toLocaleString()}`,
        ]
      );

      const repaymentId = repayRes.rows[0].id;

      // Insert Linked Cash Flow Entry
      await client.query(
        `INSERT INTO capital.cash_flow_entries (
          entry_code, entry_date, transaction_type, category,
          party_name, description, inflow_amount, outflow_amount,
          net_amount, reference_number, facility_id, repayment_id
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8,
          $9, $10, $11, $12
        );`,
        [
          cfCode,
          line.date,
          "debt_servicing",
          "Bank Loan Repayment",
          "NEDFi",
          `Monthly EMI servicing for NEDFi Term Loan ₹5Cr (${refNumber})`,
          0.0,
          line.installmentAmount,
          -line.installmentAmount,
          refNumber,
          facilityId,
          repaymentId,
        ]
      );

      paymentSeq++;
    }

    await client.query("COMMIT");
    console.log(`Successfully seeded ${historicalServicingLines.length} historical repayments and linked cash flow records.`);
    console.log(`Current Facility Status: Active, Outstanding: ₹${Math.round(currentOutstandingBalance).toLocaleString()}, Next EMI: ₹${currentInstallmentAmount.toLocaleString()}/mo`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to seed Canonical NEDFi Loan:", err);
    throw err;
  } finally {
    client.release();
  }
}

// Auto-run if executed directly via tsx
seedCanonicalNedfiLoan()
  .then(() => {
    console.log("Canonical NEDFi loan test data successfully seeded into dev DB.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seeding error:", err);
    process.exit(1);
  });
