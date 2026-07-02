import { db } from "./server/db/client.ts";
import { staff, staffSupervisors, leaveRequests } from "./server/db/schema.ts";
import { eq, sql } from "drizzle-orm";

async function main() {
  const allStaff = await db.select().from(staff).execute();
  const sara = allStaff.filter(s => s.name.toLowerCase().includes("sara thomas"));
  const manager = allStaff.filter(s => s.name.toLowerCase().includes("manager 1"));
  
  console.log("Sara Thomas records:", sara);
  console.log("Manager 1 records:", manager);

  if (sara.length > 0) {
    const saraSupervisors = await db.select().from(staffSupervisors).where(eq(staffSupervisors.staffId, sara[0].staffId)).execute();
    console.log("Sara Supervisors:", saraSupervisors);
    
    const saraLeaves = await db.select().from(leaveRequests).where(eq(leaveRequests.staffId, sara[0].staffId)).execute();
    console.log("Sara Leaves:", saraLeaves);
  }
  
  process.exit(0);
}
main();
