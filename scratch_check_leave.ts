import { db } from "./server/db/client.ts";
import { staff, leaveRequests, staffSupervisors, departmentLeaders } from "./server/db/schema.ts";
import { eq, sql } from "drizzle-orm";

async function main() {
  const allStaff = await db.select().from(staff).where(eq(staff.active, true));
  const sara = allStaff.find(s => s.name.toLowerCase().includes("sara"));
  const manager = allStaff.find(s => s.name.toLowerCase().includes("manager 1"));

  console.log("Sara:", sara?.staffId, sara?.name);
  console.log("Manager:", manager?.staffId, manager?.name);

  if (sara) {
    const leaves = await db.select().from(leaveRequests).where(eq(leaveRequests.staffId, sara.staffId));
    console.log("Leaves:", leaves.map(l => ({ id: l.id, requestNo: l.requestNo, status: l.status, approverIds: l.approverIds, forwardedTo: l.forwardedToStaffId })));
  }
  process.exit(0);
}

main().catch(console.error);
