import { eq } from "drizzle-orm";
import { auth } from "../auth.ts";
import { db, sqlite } from "./client.ts";
import {
  appointments,
  departments,
  inventoryItems,
  leaveRequests,
  leaveTypes,
  medicines,
  patients,
  prescriptionLines,
  prescriptions,
  roleTypes,
  staff,
  staffDepartments,
  shifts,
  user
} from "./schema.ts";

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@acmehospital.local";
const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@12345";
const employeePassword = process.env.EMPLOYEE_PASSWORD ?? "Staff@12345";

async function ensureAuthUser(name: string, email: string, password: string, role: "admin" | "staff") {
  const existing = db.select().from(user).where(eq(user.email, email)).get();
  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        name,
        email,
        password
      }
    });
  }
  db.update(user).set({ role, emailVerified: true }).where(eq(user.email, email)).run();
}

async function seedAdmin() {
  await ensureAuthUser("System Administrator", adminEmail, adminPassword, "admin");
}

function seedDomain() {
  if (db.select().from(departments).get()) return;

  db.insert(shifts).values([
    { name: "Morning", code: "M", startTime: "07:00", endTime: "15:00" },
    { name: "Afternoon", code: "A", startTime: "15:00", endTime: "23:00" },
    { name: "Evening", code: "E", startTime: "17:00", endTime: "01:00" },
    { name: "Night", code: "N", startTime: "23:00", endTime: "07:00" }
  ]).run();

  db.insert(roleTypes).values([
    { name: "Consultant Physician" },
    { name: "Pediatrician" },
    { name: "Head Nurse" },
    { name: "Pharmacist" },
    { name: "Billing Executive" },
    { name: "Lab Technician" },
    { name: "Ward Nurse" },
    { name: "Front Desk Coordinator" },
    { name: "Inventory Associate" },
    { name: "Pharmacy Assistant" }
  ]).run();

  db.insert(leaveTypes).values([
    { name: "Casual Leave", maxDays: 8 },
    { name: "Sick Leave", maxDays: 4 },
    { name: "Earned Leave", maxDays: 13 },
    { name: "Emergency Leave", maxDays: 5 }
  ]).run();

  const deptRows = db.insert(departments).values([
    { name: "General Medicine", floor: "1A", head: "Dr. Kavya Menon" },
    { name: "Pediatrics", floor: "2B", head: "Dr. Nikhil Shah" },
    { name: "Orthopedics", floor: "3C", head: "Dr. Rhea Iyer" },
    { name: "Emergency", floor: "Ground", head: "Dr. Arjun Rao" }
  ]).returning().all();

  const staffRows = db.insert(staff).values([
    { employeeCode: "EMP-1001", name: "Dr. Kavya Menon", role: "Consultant Physician", phone: "9876500011", email: "kavya@acmehospital.local", salary: 220000, status: "Active", aadhar: "111122223333", pan: "ABCDE1234F" },
    { employeeCode: "EMP-1002", name: "Dr. Nikhil Shah", role: "Pediatrician", phone: "9876500012", email: "nikhil@acmehospital.local", salary: 210000, status: "Active", aadhar: "222233334444", pan: "BCDEF2345G" },
    { employeeCode: "EMP-1003", name: "Maya Fernandes", role: "Head Nurse", phone: "9876500013", email: "maya@acmehospital.local", salary: 85000, status: "Active", aadhar: "333344445555", pan: "CDEFG3456H" },
    { employeeCode: "EMP-1004", name: "Sameer Khan", role: "Pharmacist", phone: "9876500014", email: "sameer@acmehospital.local", salary: 65000, status: "Active", aadhar: "444455556666", pan: "DEFGH4567I" }
  ]).returning().all();

  db.insert(staffDepartments).values([
    { staffId: staffRows[0].id, departmentId: deptRows[0].id, version: 1, status: "Active" },
    { staffId: staffRows[1].id, departmentId: deptRows[1].id, version: 1, status: "Active" },
    { staffId: staffRows[2].id, departmentId: deptRows[3].id, version: 1, status: "Active" },
    { staffId: staffRows[3].id, departmentId: deptRows[0].id, version: 1, status: "Active" }
  ]).run();

  db.update(staff).set({ supervisorLevel1Id: staffRows[0].id, supervisorLevel2Id: staffRows[0].id }).where(eq(staff.id, staffRows[1].id)).run();
  db.update(staff).set({ supervisorLevel1Id: staffRows[1].id, supervisorLevel2Id: staffRows[0].id }).where(eq(staff.id, staffRows[2].id)).run();
  db.update(staff).set({ supervisorLevel1Id: staffRows[2].id, supervisorLevel2Id: staffRows[0].id }).where(eq(staff.id, staffRows[3].id)).run();

  const patientRows = db.insert(patients).values([
    { mrn: "MRN-24001", name: "Aarav Patel", age: 34, gender: "Male", phone: "9876511101", address: "Indiranagar, Bengaluru", bloodGroup: "B+", allergies: "Penicillin" },
    { mrn: "MRN-24002", name: "Meera Nair", age: 7, gender: "Female", phone: "9876511102", address: "Koramangala, Bengaluru", bloodGroup: "O+", allergies: "None" },
    { mrn: "MRN-24003", name: "Vikram Desai", age: 61, gender: "Male", phone: "9876511103", address: "HSR Layout, Bengaluru", bloodGroup: "A-", allergies: "Sulfa drugs" }
  ]).returning().all();

  db.insert(appointments).values([
    { token: "OPD-101", patientId: patientRows[0].id, doctorId: staffRows[0].id, departmentId: deptRows[0].id, scheduledAt: new Date(), reason: "Fever and fatigue", status: "Waiting" },
    { token: "OPD-102", patientId: patientRows[1].id, doctorId: staffRows[1].id, departmentId: deptRows[1].id, scheduledAt: new Date(Date.now() + 45 * 60_000), reason: "Persistent cough", status: "Checked In" },
    { token: "OPD-103", patientId: patientRows[2].id, doctorId: staffRows[0].id, departmentId: deptRows[0].id, scheduledAt: new Date(Date.now() + 90 * 60_000), reason: "Diabetes review", status: "Waiting" }
  ]).run();

  db.insert(leaveRequests).values([
    { requestNo: "LV-1001", staffId: staffRows[2].id, leaveType: "Sick Leave", startDate: new Date(), endDate: new Date(Date.now() + 24 * 60 * 60_000), reason: "Fever and rest advised", status: "Pending" },
    { requestNo: "LV-1002", staffId: staffRows[3].id, leaveType: "Casual Leave", startDate: new Date(Date.now() + 4 * 24 * 60 * 60_000), endDate: new Date(Date.now() + 5 * 24 * 60 * 60_000), reason: "Family function", status: "Approved", reviewedAt: new Date(), reviewerNote: "Shift coverage arranged" }
  ]).run();

  db.insert(inventoryItems).values([
    { sku: "INV-GLV01", name: "Nitrile Gloves", category: "Consumables", unit: "box", quantity: 36, reorderLevel: 20, supplier: "MediSupply Co", location: "Central Store" },
    { sku: "INV-SYR02", name: "5ml Syringe", category: "Consumables", unit: "pack", quantity: 14, reorderLevel: 25, supplier: "CareLine Distributors", location: "Emergency Store" },
    { sku: "INV-OXY03", name: "Oxygen Mask", category: "Equipment", unit: "piece", quantity: 42, reorderLevel: 12, supplier: "MediSupply Co", location: "Ward Store" }
  ]).run();

  const medicineRows = db.insert(medicines).values([
    { sku: "MED-PAR01", name: "Paracip 500", genericName: "Paracetamol", form: "Tablet", strength: "500mg", stock: 320, reorderLevel: 80, price: 1.6, batchNo: "B24P11", expiryDate: new Date("2027-11-30") },
    { sku: "MED-AMX02", name: "Amoxil", genericName: "Amoxicillin", form: "Capsule", strength: "250mg", stock: 44, reorderLevel: 60, price: 7.5, batchNo: "B24A08", expiryDate: new Date("2027-08-31") },
    { sku: "MED-CET03", name: "Cetral", genericName: "Cetirizine", form: "Tablet", strength: "10mg", stock: 180, reorderLevel: 50, price: 2.2, batchNo: "B25C02", expiryDate: new Date("2028-02-28") }
  ]).returning().all();

  const [rx] = db.insert(prescriptions).values({
    patientId: patientRows[0].id,
    doctorId: staffRows[0].id,
    status: "Open"
  }).returning().all();

  db.insert(prescriptionLines).values([
    { prescriptionId: rx.id, medicineId: medicineRows[0].id, dosage: "1-0-1", duration: "3 days", quantity: 6, instructions: "After food" },
    { prescriptionId: rx.id, medicineId: medicineRows[2].id, dosage: "0-0-1", duration: "5 days", quantity: 5, instructions: "At night" }
  ]).run();
}

async function seedEmployeeUsers() {
  const deptRows = db.select().from(departments).all();
  if (!deptRows.length) return;

  const employees = [
    { employeeCode: "EMP-2001", name: "Anaya Rao", role: "Billing Executive", departmentName: "General Medicine", phone: "9876500211", email: "anaya.rao@acmehospital.local", shift: "Morning", salary: 48000 },
    { employeeCode: "EMP-2002", name: "Kabir Sethi", role: "Lab Technician", departmentName: "Emergency", phone: "9876500212", email: "kabir.sethi@acmehospital.local", shift: "Evening", salary: 56000 },
    { employeeCode: "EMP-2003", name: "Ishita Varma", role: "Ward Nurse", departmentName: "Pediatrics", phone: "9876500213", email: "ishita.varma@acmehospital.local", shift: "Night", salary: 62000 },
    { employeeCode: "EMP-2004", name: "Dev Mehta", role: "Front Desk Coordinator", departmentName: "Orthopedics", phone: "9876500214", email: "dev.mehta@acmehospital.local", shift: "Morning", salary: 42000 },
    { employeeCode: "EMP-2005", name: "Sara Thomas", role: "Inventory Associate", departmentName: "Emergency", phone: "9876500215", email: "sara.thomas@acmehospital.local", shift: "Evening", salary: 45000 },
    { employeeCode: "EMP-2006", name: "Rohan Kulkarni", role: "Pharmacy Assistant", departmentName: "General Medicine", phone: "9876500216", email: "rohan.kulkarni@acmehospital.local", shift: "Morning", salary: 47000 }
  ];

  for (const employee of employees) {
    const existingStaff = db.select().from(staff).where(eq(staff.employeeCode, employee.employeeCode)).get();
    const department = deptRows.find((row) => row.name === employee.departmentName) ?? deptRows[0];
    if (!existingStaff) {
      const [newStaff] = db.insert(staff).values({
        employeeCode: employee.employeeCode,
        name: employee.name,
        role: employee.role,
        phone: employee.phone,
        email: employee.email,
        salary: employee.salary,
        status: "Active",
        aadhar: "555566667777",
        pan: "EFGHI5678J"
      }).returning().all();

      db.insert(staffDepartments).values({
        staffId: newStaff.id,
        departmentId: department.id,
        version: 1,
        status: "Active"
      }).run();
    }
    await ensureAuthUser(employee.name, employee.email, employeePassword, "staff");
  }
}

function clearDatabase() {
  sqlite.pragma("foreign_keys = OFF");

  // Drop tables we modified
  // sqlite.exec("DROP TABLE IF EXISTS staff_departments;");
  // sqlite.exec("DROP TABLE IF EXISTS staff;");

  // // Recreate staff table with correct columns
  // sqlite.exec(`
  //   CREATE TABLE staff (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     employee_code TEXT NOT NULL UNIQUE,
  //     name TEXT NOT NULL,
  //     role TEXT NOT NULL,
  //     supervisor_level_1_id INTEGER REFERENCES staff(id),
  //     supervisor_level_2_id INTEGER REFERENCES staff(id),
  //     phone TEXT NOT NULL,
  //     email TEXT NOT NULL,
  //     salary REAL NOT NULL,
  //     status TEXT NOT NULL DEFAULT 'Active',
  //     aadhar TEXT NOT NULL DEFAULT '',
  //     pan TEXT NOT NULL DEFAULT '',
  //     created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  //     updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  //   );
  // `);

  // Recreate staff_departments table with correct columns
  // sqlite.exec(`
  //   CREATE TABLE staff_departments (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  //     department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  //     version INTEGER NOT NULL DEFAULT 1,
  //     status TEXT NOT NULL DEFAULT 'Active',
  //     changed_by_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  //     changed_by_name TEXT,
  //     changed_at INTEGER NOT NULL DEFAULT (unixepoch()),
  //     created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  //     updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  //   );
  // `);

  const tables = [
    "user", "session", "account", "verification", "role_types", "leave_types", "staff_departments",
    "staff", "departments", "shifts", "rosters",
    "leave_requests", "patients", "appointments", "encounters",
    "inventory_items", "medicines", "prescriptions", "prescription_lines"
  ];
  for (const table of tables) {
    try {
      sqlite.prepare(`DELETE FROM ${table}`).run();
    } catch (e) {
      // Table might not exist yet
    }
  }
  sqlite.pragma("foreign_keys = ON");
  console.log("Cleared all tables successfully (recreated staff & staff_departments).");
}

clearDatabase();

await seedAdmin();
seedDomain();
await seedEmployeeUsers();

console.log(`Seed complete. Admin login: ${adminEmail} / ${adminPassword}`);
console.log(`Employee logins use password: ${employeePassword}`);
