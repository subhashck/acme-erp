import { db } from "./server/db/client.ts";
import { user, staff, leaveRequests, staffSupervisors, departmentLeaders } from "./server/db/schema.ts";
import { eq, sql } from "drizzle-orm";

async function main() {
    const managerUser = await db.select().from(user).where(eq(user.email, "www@ddd.ff")).limit(1).then(r => r[0]);
    const currentStaff = await db.select().from(staff).where(sql`(${staff.userId} = ${managerUser.id} OR ${staff.email} = ${managerUser.email}) AND ${staff.active} = true`).limit(1).then(r => r[0]);

    console.log("Current Staff:", currentStaff.name, currentStaff.staffId);

    const leaveRequest = await db.select().from(leaveRequests).where(eq(leaveRequests.id, 1)).limit(1).then(r => r[0]);
    
    const employee = await db.select().from(staff).where(sql`${staff.staffId} = ${leaveRequest.staffId} AND ${staff.active} = true`).limit(1).then(r => r[0]);

    const supervisors = await db
      .select()
      .from(staffSupervisors)
      .where(sql`${staffSupervisors.staffId} = ${employee.staffId} AND ${staffSupervisors.staffVersion} = ${employee.version}`)
      .limit(1)
      .then((res: any) => res[0]);

    const isDirectSupervisor = currentStaff && supervisors && (currentStaff.staffId === supervisors.supervisor1Id || currentStaff.staffId === supervisors.supervisor2Id);

    console.log("Is direct supervisor:", isDirectSupervisor);
    
    // Dept leaders mock
    const leaders = null;
    const empIsHead = false;
    const empIsSubhead = false;

    const canAct = (() => {
      const isAdmin = false;
      if (isAdmin) return true;
      if (!currentStaff) return false;
      if (empIsHead) return false; // Only admin acts on dept head's leave
      if (empIsSubhead) return isDirectSupervisor || currentStaff.staffId === leaders?.headStaffId;
      // Regular staff
      if (leaveRequest.status === "Pending")
        return isDirectSupervisor || currentStaff.staffId === leaders?.headStaffId || currentStaff.staffId === leaders?.subheadStaffId;
      if (leaveRequest.status === "Forwarded")
        return isDirectSupervisor || currentStaff.staffId === leaders?.headStaffId;
      return false;
    })();

    console.log("Can Act:", canAct);
    process.exit(0);
}
main();
