import { db } from "../server/db/client.ts";
import { departments, staff, staffDepartments } from "../server/db/schema.ts";
import { eq } from "drizzle-orm";

async function main() {
  // 1. Setup COO staff
  // Let's update EMP-2006 (Rohan Kulkarni) to Chief Operating Officer
  const [rohan] = await db.select().from(staff).where(eq(staff.employeeCode, "EMP-2006")).limit(1);
  if (rohan) {
    await db.update(staff).set({ role: "Chief Operating Officer" }).where(eq(staff.staffId, rohan.staffId)).execute();
    console.log("Updated Rohan Kulkarni to Chief Operating Officer");
  } else {
    console.log("Rohan Kulkarni not found");
  }

  // 2. Setup Accounts department
  let [accountsDept] = await db.select().from(departments).where(eq(departments.name, "Accounts")).limit(1);
  if (!accountsDept) {
    [accountsDept] = await db.insert(departments).values({ name: "Accounts", floor: "3rd Floor", head: "Anaya Rao", active: true }).returning().execute();
    console.log("Created Accounts department");
  } else {
    console.log("Accounts department already exists");
  }

  // 3. Assign EMP-2001 (Anaya Rao) to Accounts department
  const [anaya] = await db.select().from(staff).where(eq(staff.employeeCode, "EMP-2001")).limit(1);
  if (anaya && accountsDept) {
    // Set active = false or delete old department relationships for Anaya
    await db.update(staffDepartments).set({ status: "Inactive" }).where(eq(staffDepartments.staffId, anaya.staffId)).execute();
    // Insert new Active relationship
    await db.insert(staffDepartments).values({
      staffId: anaya.staffId,
      departmentId: accountsDept.id,
      version: anaya.version,
      status: "Active"
    }).execute();
    console.log("Assigned Anaya Rao to Accounts department");
  } else {
    console.log("Anaya Rao not found");
  }
}

main().catch(console.error);
