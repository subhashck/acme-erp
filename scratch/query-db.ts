import { db } from "../server/db/client.ts";
import { payslips, leaveRequests, rosters, attendance, staff } from "../server/db/schema.ts";
import { eq, and, sql } from "drizzle-orm";

async function main() {
  const [payslip] = await db.select().from(payslips).where(eq(payslips.id, 37)).limit(1);
  if (!payslip) {
    console.log("Payslip not found!");
    process.exit(1);
  }

  const staffId = payslip.staffId;
  const month = payslip.month; // "2026-07"
  const daysInMonth = new Date(2026, 7, 0).getDate(); // July has 31 days

  const employeeRosters = await db
    .select()
    .from(rosters)
    .where(eq(rosters.staffId, staffId))
    .execute();

  const monthStartStr = `${month}-01`;
  const monthEndStr = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const employeeAttendance = await db
    .select()
    .from(attendance)
    .where(
      sql`${attendance.staffId} = ${staffId} AND ${attendance.date} >= ${monthStartStr} AND ${attendance.date} <= ${monthEndStr}`
    )
    .execute();

  console.log("Rosters:", employeeRosters.map(r => ({
    startDate: r.startDate,
    endDate: r.endDate,
  })));

  console.log("Attendance:", employeeAttendance.map(a => ({
    date: a.date,
    status: a.status,
  })));
}

main().catch(console.error);
