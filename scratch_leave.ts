import { db } from "./server/db/client.ts";
import { leaveRequests, staff, staffSupervisors, staffDepartments, departments, departmentLeaders } from "./server/db/schema.ts";
import { eq, sql, desc, and } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm";

async function main() {
    const manager = aliasedTable(staff, "manager");
    const director = aliasedTable(staff, "director");

    const row = await db
      .select({
        id: leaveRequests.id,
        staffId: leaveRequests.staffId,
        supervisorLevel1Id: manager.staffId,
        supervisorLevel1Name: manager.name,
      })
      .from(leaveRequests)
      .innerJoin(staff, eq(leaveRequests.staffId, staff.staffId))
      .leftJoin(
        staffSupervisors,
        sql`${staff.staffId} = ${staffSupervisors.staffId} AND ${staff.version} = ${staffSupervisors.staffVersion}`
      )
      .leftJoin(manager, eq(staffSupervisors.supervisor1Id, manager.staffId))
      .where(and(eq(leaveRequests.id, 1), eq(staff.active, true)))
      .limit(1)
      .then((res: any) => res[0]) as any;

    console.log("Returned row:", row);
    process.exit(0);
}
main();
