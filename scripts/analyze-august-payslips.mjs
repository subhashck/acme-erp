import pg from "pg";
import fs from "node:fs/promises";
import path from "node:path";

const earnings = ["basic_salary", "hra", "conveyance", "skill_allowance", "special", "earned_leave_encashment", "extra_day_allowance"];
const deductions = ["epf", "esi", "professional_tax", "tds", "security_deposit", "other_deductions", "late_attendance", "leave_deduction"];
const cash = value => Math.round(Number(value || 0) * 100);
const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
const inr = cents => `₹${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pct = (a, b) => b ? `${(a / b * 100).toFixed(2)}%` : "n/a";
const median = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2 : 0;
};
const table = (headers, rows) => [headers, headers.map(() => "---"), ...rows]
  .map(row => `| ${row.map(value => String(value ?? "").replaceAll("|", "/").replaceAll("\n", " ")).join(" | ")} |`).join("\n");
const summarize = rows => ({ count: rows.length, gross: sum(rows, "gross"), deductions: sum(rows, "deductions"), net: sum(rows, "net_salary") });
const group = (rows, key) => {
  const buckets = new Map();
  for (const row of rows) {
    const label = row[key] || "Unassigned";
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label).push(row);
  }
  return [...buckets].map(([label, members]) => ({ label, ...summarize(members) })).sort((a, b) => b.net - a.net);
};

if (!process.env.DATABASE_URL) process.loadEnvFile(".env");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
const client = await pool.connect();
try {
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  const months = (await client.query(`SELECT month, status, count(*)::int AS count,
    count(DISTINCT staff_id)::int AS staff FROM payslips GROUP BY month,status ORDER BY month DESC,status`)).rows;
  const month = process.argv.find(arg => /^--month=/.test(arg))?.slice(8)
    || months.find(row => /^\d{4}-08$/.test(row.month))?.month;
  if (!month || !/^\d{4}-08$/.test(month)) throw new Error("No August payslips found; specify --month=YYYY-08.");
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;
  const rows = (await client.query(`SELECT p.id,p.staff_id,p.month,p.version,p.status,p.payment_mode,
      p.created_at,p.updated_at,p.leave_days_taken,${[...earnings, ...deductions, "net_salary"].map(key => `p.${key}`).join(",")},
      s.name,s.employee_code,s.role,s.status AS employment_status,s.active AS staff_record_active,
      s.employment_start_date,s.employment_end_date,
      (SELECT count(*)::int FROM staff z WHERE z.staff_id=p.staff_id AND z.active=true) AS active_staff_versions,
      coalesce(dept.names,'Unassigned') AS department,
      coalesce(dept.n,0) AS department_count,
      nullif(trim(coalesce(nullif(p.bank_name,''),ss.bank_name)), '') IS NOT NULL AS has_bank_name,
      nullif(trim(coalesce(nullif(p.account_number,''),ss.account_number)), '') IS NOT NULL AS has_bank_account,
      nullif(trim(coalesce(nullif(p.ifsc_code,''),ss.ifsc_code)), '') IS NOT NULL AS has_ifsc
    FROM payslips p
    LEFT JOIN LATERAL (SELECT * FROM staff s WHERE s.staff_id=p.staff_id ORDER BY s.active DESC,s.version DESC LIMIT 1) s ON true
    LEFT JOIN staff_salaries ss ON ss.staff_id=s.staff_id AND ss.staff_version=s.version
    LEFT JOIN LATERAL (
      SELECT string_agg(DISTINCT d.name, ' / ' ORDER BY d.name) AS names,count(DISTINCT d.id)::int AS n
      FROM staff_departments sd JOIN departments d ON d.id=sd.department_id
      WHERE sd.staff_id=s.staff_id AND sd.staff_version=s.version AND sd.status='Active'
    ) dept ON true
    WHERE p.month >= $1 AND p.month <= $2 ORDER BY p.month,p.staff_id,p.version DESC,p.created_at DESC,p.id DESC`,
    [month, `${Number(month.slice(0,4))}-09`])).rows.map(row => {
      const result = { ...row, leave_days_taken: Number(row.leave_days_taken) };
      for (const key of [...earnings, ...deductions, "net_salary"]) result[key] = cash(row[key]);
      result.base_gross = earnings.slice(0,5).reduce((total, key) => total + result[key], 0);
      result.gross = earnings.reduce((total, key) => total + result[key], 0);
      result.deductions = deductions.reduce((total, key) => total + result[key], 0);
      result.expected_net = Math.max(0, result.gross - result.deductions);
      result.arithmetic_difference = result.net_salary - result.expected_net;
      return result;
    });
  const candidates = rows.filter(row => !["Superseded", "Cancelled"].includes(row.status));
  const current = [];
  const duplicateRows = [];
  const seen = new Set();
  for (const row of candidates) {
    const key = `${row.month}/${row.staff_id}`;
    if (seen.has(key)) duplicateRows.push(row);
    else { seen.add(key); current.push(row); }
  }
  const august = current.filter(row => row.month === month);
  if (!august.length) throw new Error(`No operative payslips for ${month}`);
  const september = current.filter(row => row.month !== month);
  const approvedLeaves = (await client.query(`SELECT lr.id,lr.staff_id,lr.leave_type,lr.is_half_day,
    lr.start_date::text,lr.end_date::text,lr.reviewed_at,lr.created_at,lr.updated_at,
    lt.payable,lt.payment_rate FROM leave_requests lr LEFT JOIN leave_types lt ON lt.name=lr.leave_type
    WHERE lr.status='Approved' AND lr.end_date >= $1::date AND lr.start_date <= $2::date`, [startDate,endDate])).rows;
  const advances = (await client.query(`SELECT a.staff_id,sum(a.amount)::text AS amount,count(*)::int AS count
    FROM daily_staff_advances a JOIN daily_closing_reports r ON r.id=a.report_id
    WHERE r.report_date >= $1 AND r.report_date <= $2 GROUP BY a.staff_id`, [startDate,endDate])).rows;
  const advanceByStaff = new Map(advances.map(row => [row.staff_id,cash(row.amount)]));
  for (const row of august) {
    const leaves = approvedLeaves.filter(leave => leave.staff_id === row.staff_id);
    row.current_approved_leave_days = 0;
    let weightedDays = 0;
    for (const leave of leaves) {
      const start = leave.start_date < startDate ? startDate : leave.start_date;
      const end = leave.end_date > endDate ? endDate : leave.end_date;
      const days = leave.is_half_day ? 0.5 : Math.round((Date.parse(end) - Date.parse(start))/86400000) + 1;
      const rate = leave.payable ? Math.max(0, Math.min(100, 100 - Number(leave.payment_rate))) : 100;
      row.current_approved_leave_days += days;
      weightedDays += days * rate / 100;
    }
    row.current_policy_leave_deduction = Math.round(row.base_gross / 31 * weightedDays);
    row.leave_recheck_difference = row.leave_deduction - row.current_policy_leave_deduction;
    row.current_month_advances = advanceByStaff.get(row.staff_id) || 0;
    row.leave_approval_after_payslip = leaves.some(leave => leave.reviewed_at && new Date(leave.reviewed_at) > new Date(row.created_at));
  }
  const stats = summarize(august);
  // Independently reconcile the report to PostgreSQL numeric aggregates, without metadata joins.
  const [sqlTotals] = (await client.query(`WITH latest AS (
    SELECT DISTINCT ON (staff_id) * FROM payslips
    WHERE month=$1 AND status NOT IN ('Superseded','Cancelled')
    ORDER BY staff_id,version DESC,created_at DESC,id DESC
  ) SELECT count(*)::int AS count,sum(${earnings.join("+")})::text AS gross,
    sum(${deductions.join("+")})::text AS deductions,sum(net_salary)::text AS net FROM latest`,[month])).rows;
  if (sqlTotals.count !== stats.count || cash(sqlTotals.gross) !== stats.gross
      || cash(sqlTotals.deductions) !== stats.deductions || cash(sqlTotals.net) !== stats.net) {
    throw new Error("Report totals do not reconcile to independent PostgreSQL numeric aggregates.");
  }
  const statuses = group(august,"status");
  const departments = group(august,"department");
  const modes = group(august,"payment_mode");
  const arithmetic = august.filter(row => Math.abs(row.arithmetic_difference) > 1);
  const roundingOnly = august.filter(row => Math.abs(row.arithmetic_difference) === 1);
  const leaveReview = august.filter(row => Math.abs(row.leave_recheck_difference) > 1 || row.leave_days_taken !== row.current_approved_leave_days);
  const missingBank = august.filter(row => row.payment_mode === "Bank Transfer" && !(row.has_bank_name && row.has_bank_account && row.has_ifsc));
  const highDeductions = august.filter(row => row.gross > 0 && row.deductions / row.gross >= 0.25).sort((a,b) => b.deductions/b.gross - a.deductions/a.gross);
  const zeroPay = august.filter(row => row.net_salary <= 0);
  const drafts = august.filter(row => row.status === "Draft");
  const otherUnderAdvances = august.filter(row => row.other_deductions < row.current_month_advances);
  const unassigned = august.filter(row => row.department === "Unassigned");
  const common = august.map(a => ({ a,b:september.find(b => b.staff_id === a.staff_id) })).filter(pair => pair.b);
  const movers = common.map(({a,b}) => ({ staff_id:a.staff_id,name:a.name,code:a.employee_code,
    august_net:a.net_salary,september_net:b.net_salary,difference:b.net_salary-a.net_salary,
    base_gross_change:b.base_gross-a.base_gross,deduction_change:b.deductions-a.deductions,
    additions_change:(b.gross-b.base_gross)-(a.gross-a.base_gross) })).sort((a,b) => Math.abs(b.difference)-Math.abs(a.difference));
  const names = row => `${row.employee_code || row.staff_id} — ${row.name || "Unknown staff"} (#${row.id})`;
  const lines = [
    `# August ${month.slice(0,4)} payslip analysis`,
    `Generated ${new Date().toISOString()}. Live database examined in a repeatable-read, read-only transaction. No payroll or payment records were changed. All amounts are INR.`,
    `## Findings and review priorities`,
    `The operative August payroll is ${inr(stats.gross)} gross less ${inr(stats.deductions)} deductions, giving ${inr(stats.net)} net across ${stats.count} staff. Deductions are ${pct(stats.deductions,stats.gross)} of gross. Mean net ${inr(stats.net/stats.count)} is materially above median net ${inr(median(august.map(row=>row.net_salary)))}, indicating that higher-paid roles lift the average.`,
    `- Calculation integrity: ${arithmetic.length} net arithmetic exceptions and ${duplicateRows.filter(row=>row.month===month).length} duplicate operative payslip rows. Superseded records are version history and do not contribute to payroll totals.
- Workflow: ${drafts.length} drafts total ${inr(sum(drafts,"net_salary"))}; ${august.filter(row=>row.status==="Paid").length} payslips are marked Paid. Payment outside the recorded workflow has not been verified.
- Bank readiness: ${missingBank.length} Bank Transfer payslip(s), net ${inr(sum(missingBank,"net_salary"))}, lack at least one effective bank name, account or IFSC field. Verify details before preparing a transfer.
- Zero-pay review: ${zeroPay.length} payslips have zero net; ${zeroPay.filter(row=>row.status!=="Draft").length} of these are outside Draft status. Confirm that zero earnings are intentional.
- Deduction review: ${highDeductions.length} staff have deductions of at least 25% of gross. This is a review threshold, not a conclusion that deductions are incorrect.
- Leave reconciliation: ${leaveReview.length} record(s) differ from current approved-leave data or the current-policy calculation. Resolve the source and timing of any difference before considering a correction.`,
    `## Scope and method`,
    `The latest available August is ${month}. Payroll totals use ${august.length} operative payslips, excluding Superseded and Cancelled rows. If duplicate operative staff/month rows exist, only the highest version, then latest creation/id, contributes to totals and duplicates are separately flagged. Metadata uses one current staff version (latest historical fallback) and aggregated department assignments; no staff or department join multiplies payslip amounts. Department labels and bank fallback availability reflect current metadata, not an immutable August snapshot.`,
    table(["August stored status","Rows"],months.filter(row => row.month===month).map(row => [row.status,row.count])),
    `## Payroll totals`,
    table(["Measure","Amount / count"],[["Staff/payslips",stats.count],["Gross earnings",inr(stats.gross)],["Deductions",inr(stats.deductions)],["Net payroll",inr(stats.net)],["Deductions / gross",pct(stats.deductions,stats.gross)],["Average net",inr(stats.net/stats.count)],["Median net",inr(median(august.map(row=>row.net_salary)))],["Minimum net",inr(Math.min(...august.map(row=>row.net_salary)))],["Maximum net",inr(Math.max(...august.map(row=>row.net_salary)))]]),
    `Gross includes basic, HRA, conveyance, skill allowance, special allowance, earned-leave encashment and extra-day allowance. Deductions include EPF, ESI, professional tax, TDS, security deposit, other deductions, late attendance and leave deduction. Stored net is checked against max(0, gross − deductions). Statutory rates or remittance compliance have not been audited.`,
    `Counts and monetary totals independently reconcile to PostgreSQL numeric sums taken directly from payslips, without staff or department joins.`,
    `## Workflow status`,
    table(["Status","Staff","Gross","Deductions","Net"],statuses.map(row=>[row.label,row.count,inr(row.gross),inr(row.deductions),inr(row.net)])),
    `A recorded approval is not evidence of bank settlement. Only Paid status is counted as paid in this analysis.`,
    `## Earnings and deduction composition`,
    table(["Earning","Staff with nonzero amount","Total"],earnings.map(key=>[key,august.filter(row=>row[key]!==0).length,inr(sum(august,key))])),
    table(["Deduction","Staff with nonzero amount","Total","Share of deductions"],deductions.map(key=>[key,august.filter(row=>row[key]!==0).length,inr(sum(august,key)),pct(sum(august,key),stats.deductions)])),
    `## Department distribution`,
    table(["Current department","Staff","Gross","Deductions","Net","Net share"],departments.map(row=>[row.label,row.count,inr(row.gross),inr(row.deductions),inr(row.net),pct(row.net,stats.net)])),
    `## Payment modes`,
    table(["Mode","Staff","Net"],modes.map(row=>[row.label,row.count,inr(row.net)])),
    `## Checks and exceptions`,
    table(["Check","Count"],[["Duplicate operative August payslip rows",duplicateRows.filter(row=>row.month===month).length],["Net arithmetic difference over ₹0.01",arithmetic.length],["Net difference of exactly ₹0.01",roundingOnly.length],["Zero/negative net",zeroPay.length],["Drafts",drafts.length],["Bank transfer rows missing effective bank/account/IFSC",missingBank.length],["Deductions at least 25% of gross",highDeductions.length],["Current approved-leave comparison differences",leaveReview.length],["Other deductions below currently recorded August advances",otherUnderAdvances.length],["Unassigned department",unassigned.length],["More than one current staff version",august.filter(row=>row.active_staff_versions>1).length],["Multiple current departments",august.filter(row=>row.department_count>1).length],["Negative earning/deduction components",august.filter(row=>[...earnings,...deductions].some(key=>row[key]<0)).length]]),
    `### Draft payslips`,
    table(["Staff / payslip","Gross","Deductions","Net"],drafts.map(row=>[names(row),inr(row.gross),inr(row.deductions),inr(row.net_salary)])),
    `### Zero-net payslips`,
    table(["Staff / payslip","Status","Gross","Deductions","Net"],zeroPay.map(row=>[names(row),row.status,inr(row.gross),inr(row.deductions),inr(row.net_salary)])),
    `### Net arithmetic exceptions`,
    table(["Staff / payslip","Stored net","Calculated net","Stored minus calculated"],arithmetic.map(row=>[names(row),inr(row.net_salary),inr(row.expected_net),inr(row.arithmetic_difference)])),
    `### Bank detail exceptions`,
    table(["Staff / payslip","Net","Bank name available","Account available","IFSC available"],missingBank.map(row=>[names(row),inr(row.net_salary),row.has_bank_name,row.has_bank_account,row.has_ifsc])),
    `### Deductions at least 25% of gross`,
    table(["Staff / payslip","Gross","Deductions","Rate","Leave deduction","Other deductions","Net"],highDeductions.map(row=>[names(row),inr(row.gross),inr(row.deductions),pct(row.deductions,row.gross),inr(row.leave_deduction),inr(row.other_deductions),inr(row.net_salary)])),
    `### Approved-leave reconciliation for review`,
    `This compares saved August payslips against approved leave and leave-type payment rates available now, using the application's calendar-day gross/31 method and half-day handling. It is not proof of an August payroll error: approvals, manual adjustments or policy rates may have changed after generation. Stored minus recalculated is positive when the saved deduction is higher. Overlapping approved requests are counted per the application, not independently adjudicated.`,
    table(["Staff / payslip","Stored days","Approved days now","Stored deduction","Current-policy deduction","Difference","Approval after generation"],leaveReview.map(row=>[names(row),row.leave_days_taken,row.current_approved_leave_days,inr(row.leave_deduction),inr(row.current_policy_leave_deduction),inr(row.leave_recheck_difference),row.leave_approval_after_payslip])),
    `### Advances comparison`,
    `Recorded August staff advances total ${inr(advances.reduce((total,row)=>total+cash(row.amount),0))}. The generator adds advances to other deductions. Timing, manual recovery and reconciliation require source review; this check does not establish an unpaid debt.`,
    table(["Staff / payslip","Other deductions","Recorded August advances","Shortfall for review"],otherUnderAdvances.map(row=>[names(row),inr(row.other_deductions),inr(row.current_month_advances),inr(row.current_month_advances-row.other_deductions)])),
    `## Available adjacent-month comparison`,
    `No July payroll is available in the database, so a July-to-August trend cannot be calculated. September is the next available payroll. Comparing those months is descriptive and includes any staffing or later salary changes.`,
    table(["Month","Staff","Gross","Deductions","Net"],[[month,...[stats.count,inr(stats.gross),inr(stats.deductions),inr(stats.net)]],...(september.length?[[september[0].month,september.length,inr(sum(september,"gross")),inr(sum(september,"deductions")),inr(sum(september,"net_salary"))]]:[])]),
    `There are ${common.length} staff common to both months; ${september.filter(row=>!august.some(a=>a.staff_id===row.staff_id)).length} September-only and ${august.filter(row=>!september.some(b=>b.staff_id===row.staff_id)).length} August-only staff.`,
    `### Largest common-staff net changes, August to September`,
    table(["Staff","August net","September net","Net change","Base gross change","Additions change","Deduction change"],movers.slice(0,15).map(row=>[`${row.code} — ${row.name}`,inr(row.august_net),inr(row.september_net),inr(row.difference),inr(row.base_gross_change),inr(row.additions_change),inr(row.deduction_change)])),
    `## Detailed workbook data`,
    `The companion CSV contains one row per operative August payslip with component amounts and review flags. It omits bank account numbers, IFSC values, government identifiers and contact details.`,
  ];
  const outDir = path.resolve("scratch",`payroll-analysis-${month}`);
  await fs.mkdir(outDir,{recursive:true});
  const reportPath = path.join(outDir,"analysis.md");
  await fs.writeFile(reportPath,lines.join("\n\n")+"\n","utf8");
  const csvFields = ["id","staff_id","employee_code","name","department","status","payment_mode",...earnings,"gross",...deductions,"deductions","net_salary","arithmetic_difference","leave_days_taken","current_approved_leave_days","current_policy_leave_deduction","leave_recheck_difference","current_month_advances"];
  const moneyFields = new Set([...earnings,...deductions,"gross","deductions","net_salary","arithmetic_difference","current_policy_leave_deduction","leave_recheck_difference","current_month_advances"]);
  const csvCell = value => `"${String(value??"").replaceAll('"','""')}"`;
  const csv = [csvFields,...august.map(row=>csvFields.map(key=>moneyFields.has(key)?(row[key]/100).toFixed(2):row[key]))].map(row=>row.map(csvCell).join(",")).join("\r\n");
  await fs.writeFile(path.join(outDir,"payslip-detail.csv"),"\ufeff"+csv+"\r\n","utf8");
  const summary = {
    month, storedStatuses:months.filter(row=>row.month===month),
    operativePayslips:stats.count,gross:inr(stats.gross),deductions:inr(stats.deductions),net:inr(stats.net),
    averageNet:inr(stats.net/stats.count),medianNet:inr(median(august.map(row=>row.net_salary))),
    statuses:statuses.map(row=>({...row,gross:inr(row.gross),deductions:inr(row.deductions),net:inr(row.net)})),
    departments:departments.map(row=>({...row,gross:inr(row.gross),deductions:inr(row.deductions),net:inr(row.net)})),
    deductionTotals:deductions.map(key=>({key,total:inr(sum(august,key)),staff:august.filter(row=>row[key]!==0).length})),
    arithmetic:arithmetic.map(row=>({staff:names(row),difference:inr(row.arithmetic_difference)})),
    drafts:drafts.map(row=>({staff:names(row),net:inr(row.net_salary)})),
    highDeductionCount:highDeductions.length,missingBankCount:missingBank.length,zeroPayCount:zeroPay.length,
    leaveReviewCount:leaveReview.length,leaveReviewDifference:inr(sum(leaveReview,"leave_recheck_difference")),
    advanceShortfallCount:otherUnderAdvances.length,duplicateOperativeCount:duplicateRows.filter(row=>row.month===month).length,
    september:september.length?{staff:september.length,net:inr(sum(september,"net_salary")),netChange:inr(sum(september,"net_salary")-stats.net),commonStaff:common.length,commonStaffChange:inr(movers.reduce((total,row)=>total+row.difference,0))}:null,
    reportPath,
  };
  await fs.writeFile(path.join(outDir,"summary.json"),JSON.stringify(summary,null,2)+"\n","utf8");
  console.log(JSON.stringify(summary,null,2));
  await client.query("ROLLBACK");
} finally {
  client.release();
  await pool.end();
}
