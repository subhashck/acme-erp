import { db } from "./server/db/client.ts";
import { leaveRequests, staff, staffSupervisors, staffDepartments, departments, departmentLeaders } from "./server/db/schema.ts";
import { eq, sql, desc } from "drizzle-orm";

async function main() {
    const rows = await db
      .select({
        id: leaveRequests.id,
        requestNo: leaveRequests.requestNo,
        staffId: leaveRequests.staffId,
        staffName: staff.name,
        supervisorLevel1Id: staffSupervisors.supervisor1Id,
        supervisorLevel2Id: staffSupervisors.supervisor2Id,
      })
      .from(leaveRequests)
      .innerJoin(staff, eq(leaveRequests.staffId, staff.staffId))
      .leftJoin(
        staffSupervisors,
        sql`${staff.staffId} = ${staffSupervisors.staffId} AND ${staff.version} = ${staffSupervisors.staffVersion}`
      )
      .leftJoin(
        staffDepartments,
        sql`${staff.staffId} = ${staffDepartments.staffId} AND ${staff.version} = ${staffDepartments.staffVersion} AND ${staffDepartments.status} = 'Active'`
      )
      .leftJoin(departments, eq(staffDepartments.departmentId, departments.id))
      .leftJoin(departmentLeaders, eq(departments.id, departmentLeaders.departmentId))
      .where(eq(staff.active, true))
      .orderBy(desc(leaveRequests.createdAt))
      .execute();
      
    console.log(rows);
    process.exit(0);
}
main();
