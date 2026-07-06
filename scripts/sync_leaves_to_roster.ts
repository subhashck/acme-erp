import { sql, eq, inArray, like } from "drizzle-orm";
import { db } from "../server/db/client.ts";
import { leaveRequests, rosters, shifts, staffDepartments, staff } from "../server/db/schema.ts";

async function main() {
  console.log("Starting leave-to-roster sync...");

  // 1. Get or create Leave shift
  let leaveShift = await db.select().from(shifts).where(eq(shifts.name, 'Leave')).limit(1).then((res) => res[0]);
  if (!leaveShift) {
    const [insertedShift] = await db.insert(shifts).values({
      name: 'Leave',
      code: 'LV',
      startTime: '00:00',
      endTime: '23:59',
      active: true,
      isOffDay: true,
    }).returning().execute();
    leaveShift = insertedShift;
    console.log("Created Leave shift.");
  } else {
    console.log("Found Leave shift:", leaveShift.id);
  }

  // 2. Fetch all approved/pending-payroll leaves
  const approvedLeaves = await db
    .select()
    .from(leaveRequests)
    .where(inArray(leaveRequests.status, ["Approved", "Pending Payroll Approval"]))
    .execute();

  console.log(`Found ${approvedLeaves.length} approved/pending-payroll leaves to process.`);

  // 3. Process each leave
  for (const leave of approvedLeaves) {
    // Get staff info to find current version
    const employee = await db
      .select()
      .from(staff)
      .where(sql`${staff.staffId} = ${leave.staffId} AND ${staff.active} = true`)
      .limit(1)
      .then((res) => res[0]);

    if (!employee) {
      console.log(`Skipping leave ${leave.requestNo}: staff not found.`);
      continue;
    }

    // Get active department
    const activeDept = await db
      .select({ departmentId: staffDepartments.departmentId })
      .from(staffDepartments)
      .where(
        sql`${staffDepartments.staffId} = ${employee.staffId}
          AND ${staffDepartments.staffVersion} = ${employee.version}
          AND ${staffDepartments.status} = 'Active'`
      )
      .limit(1)
      .then((res) => res[0]);

    if (!activeDept) {
      console.log(`Skipping leave ${leave.requestNo}: active department not found.`);
      continue;
    }

    // Delete existing roster entries for this leave request (to fix any 1-day gaps/duplicates)
    const notePattern = `Leave Request: ${leave.requestNo}`;
    await db.delete(rosters).where(like(rosters.notes, notePattern)).execute();

    // Format dates correctly (local dates)
    const getLocalDateStr = (d: string | Date) => {
      const date = new Date(d);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDateStr = getLocalDateStr(leave.startDate);
    const endDateStr = getLocalDateStr(leave.endDate);

    // Insert corrected roster entry
    await db.insert(rosters).values({
      staffId: employee.staffId,
      departmentId: activeDept.departmentId,
      shiftId: leaveShift.id,
      startDate: startDateStr,
      endDate: endDateStr,
      notes: notePattern,
    }).execute();

    console.log(`Synced leave ${leave.requestNo} for staff ${employee.staffId} (${startDateStr} to ${endDateStr}).`);
  }

  console.log("Sync complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error running script:", err);
  process.exit(1);
});
