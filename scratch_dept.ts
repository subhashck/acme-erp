import { db } from "./server/db/client.ts";
import { departmentLeaders, staffDepartments } from "./server/db/schema.ts";
import { eq } from "drizzle-orm";

async function main() {
    const sDepts = await db.select().from(staffDepartments).where(eq(staffDepartments.staffId, 5)).execute();
    console.log("Sara Depts:", sDepts);
    
    if (sDepts.length > 0) {
      const leaders = await db.select().from(departmentLeaders).where(eq(departmentLeaders.departmentId, sDepts[0].departmentId)).execute();
      console.log("Dept Leaders:", leaders);
    }
    process.exit(0);
}
main();
