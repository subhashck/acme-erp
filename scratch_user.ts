import { db } from "./server/db/client.ts";
import { user, staff } from "./server/db/schema.ts";
import { eq } from "drizzle-orm";

async function main() {
    const users = await db.select().from(user).execute();
    const staffs = await db.select().from(staff).where(eq(staff.staffId, 8)).execute();
    
    console.log("Users:", users.filter(u => u.email.includes("jjjk") || u.name.includes("Manager")));
    console.log("Manager 1 Staff:", staffs);
    process.exit(0);
}
main();
