import { eq } from "drizzle-orm";
import { pathToFileURL } from "node:url";
import { auth } from "../auth.ts";
import { db, sqlite } from "./client.ts";
import {
  appointments,
  departments,
  immunizationRecords,
  immunizationSchedules,
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

export function seedImmunizationSchedule() {
  if (db.select().from(immunizationSchedules).get()) return;

  db.insert(immunizationSchedules).values([
    { vaccineCode: "BCG", vaccineName: "BCG", doseLabel: "Birth dose", dueAgeDays: 0, dueAgeLabel: "At birth or as early as possible up to 1 year", maxAgeDays: 365, doseAmount: "0.1 ml", route: "Intradermal", site: "Left upper arm", sortOrder: 10 },
    { vaccineCode: "HEPB", vaccineName: "Hepatitis B", doseLabel: "Birth dose", dueAgeDays: 0, dueAgeLabel: "At birth or within 24 hours", maxAgeDays: 1, doseAmount: "0.5 ml", route: "Intramuscular", site: "Anterolateral side of mid-thigh", sortOrder: 20 },
    { vaccineCode: "OPV", vaccineName: "Oral Polio Vaccine", doseLabel: "Zero dose", dueAgeDays: 0, dueAgeLabel: "At birth or within first 15 days", maxAgeDays: 15, doseAmount: "2 drops", route: "Oral", site: "Oral", sortOrder: 30 },
    { vaccineCode: "OPV", vaccineName: "Oral Polio Vaccine", doseLabel: "Dose 1", dueAgeDays: 42, dueAgeLabel: "6 weeks", doseAmount: "2 drops", route: "Oral", site: "Oral", sortOrder: 40 },
    { vaccineCode: "RVV", vaccineName: "Rotavirus Vaccine", doseLabel: "Dose 1", dueAgeDays: 42, dueAgeLabel: "6 weeks", doseAmount: "5 drops", route: "Oral", site: "Oral", sortOrder: 50 },
    { vaccineCode: "FIPV", vaccineName: "Fractional IPV", doseLabel: "Dose 1", dueAgeDays: 42, dueAgeLabel: "6 weeks", doseAmount: "0.1 ml", route: "Intradermal", site: "Right upper arm", sortOrder: 60 },
    { vaccineCode: "PENTA", vaccineName: "Pentavalent", doseLabel: "Dose 1", dueAgeDays: 42, dueAgeLabel: "6 weeks", doseAmount: "0.5 ml", route: "Intramuscular", site: "Anterolateral side of mid-thigh", sortOrder: 70 },
    { vaccineCode: "PCV", vaccineName: "Pneumococcal Conjugate Vaccine", doseLabel: "Dose 1", dueAgeDays: 42, dueAgeLabel: "6 weeks", doseAmount: "0.5 ml", route: "Intramuscular", site: "Anterolateral side of mid-thigh", appliesIn: "UIP states/districts where PCV is implemented", sortOrder: 80 },
    { vaccineCode: "OPV", vaccineName: "Oral Polio Vaccine", doseLabel: "Dose 2", dueAgeDays: 70, dueAgeLabel: "10 weeks", doseAmount: "2 drops", route: "Oral", site: "Oral", sortOrder: 90 },
    { vaccineCode: "RVV", vaccineName: "Rotavirus Vaccine", doseLabel: "Dose 2", dueAgeDays: 70, dueAgeLabel: "10 weeks", doseAmount: "5 drops", route: "Oral", site: "Oral", sortOrder: 100 },
    { vaccineCode: "PENTA", vaccineName: "Pentavalent", doseLabel: "Dose 2", dueAgeDays: 70, dueAgeLabel: "10 weeks", doseAmount: "0.5 ml", route: "Intramuscular", site: "Anterolateral side of mid-thigh", sortOrder: 110 },
    { vaccineCode: "OPV", vaccineName: "Oral Polio Vaccine", doseLabel: "Dose 3", dueAgeDays: 98, dueAgeLabel: "14 weeks", doseAmount: "2 drops", route: "Oral", site: "Oral", sortOrder: 120 },
    { vaccineCode: "RVV", vaccineName: "Rotavirus Vaccine", doseLabel: "Dose 3", dueAgeDays: 98, dueAgeLabel: "14 weeks", doseAmount: "5 drops", route: "Oral", site: "Oral", sortOrder: 130 },
    { vaccineCode: "FIPV", vaccineName: "Fractional IPV", doseLabel: "Dose 2", dueAgeDays: 98, dueAgeLabel: "14 weeks", doseAmount: "0.1 ml", route: "Intradermal", site: "Right upper arm", sortOrder: 140 },
    { vaccineCode: "PENTA", vaccineName: "Pentavalent", doseLabel: "Dose 3", dueAgeDays: 98, dueAgeLabel: "14 weeks", doseAmount: "0.5 ml", route: "Intramuscular", site: "Anterolateral side of mid-thigh", sortOrder: 150 },
    { vaccineCode: "PCV", vaccineName: "Pneumococcal Conjugate Vaccine", doseLabel: "Dose 2", dueAgeDays: 98, dueAgeLabel: "14 weeks", doseAmount: "0.5 ml", route: "Intramuscular", site: "Anterolateral side of mid-thigh", appliesIn: "UIP states/districts where PCV is implemented", sortOrder: 160 },
    { vaccineCode: "MR", vaccineName: "Measles Rubella", doseLabel: "Dose 1", dueAgeDays: 270, dueAgeLabel: "9-12 months", maxAgeDays: 365, doseAmount: "0.5 ml", route: "Subcutaneous", site: "Right upper arm", sortOrder: 170 },
    { vaccineCode: "JE", vaccineName: "Japanese Encephalitis", doseLabel: "Dose 1", dueAgeDays: 270, dueAgeLabel: "9-12 months", maxAgeDays: 365, doseAmount: "0.5 ml", route: "Subcutaneous", site: "Left upper arm", appliesIn: "JE endemic districts", notes: "Administer only in JE endemic districts under UIP.", sortOrder: 180 },
    { vaccineCode: "PCV", vaccineName: "Pneumococcal Conjugate Vaccine", doseLabel: "Booster", dueAgeDays: 270, dueAgeLabel: "9-12 months", maxAgeDays: 365, doseAmount: "0.5 ml", route: "Intramuscular", site: "Anterolateral side of mid-thigh", appliesIn: "UIP states/districts where PCV is implemented", sortOrder: 190 },
    { vaccineCode: "VITA", vaccineName: "Vitamin A", doseLabel: "Dose 1", dueAgeDays: 270, dueAgeLabel: "9 months with MR-1", maxAgeDays: 365, doseAmount: "1 ml", route: "Oral", site: "Oral", sortOrder: 200 },
    { vaccineCode: "DPT", vaccineName: "DPT", doseLabel: "Booster 1", dueAgeDays: 480, dueAgeLabel: "16-24 months", maxAgeDays: 730, doseAmount: "0.5 ml", route: "Intramuscular", site: "Anterolateral side of mid-thigh", sortOrder: 210 },
    { vaccineCode: "OPV", vaccineName: "Oral Polio Vaccine", doseLabel: "Booster", dueAgeDays: 480, dueAgeLabel: "16-24 months", maxAgeDays: 730, doseAmount: "2 drops", route: "Oral", site: "Oral", sortOrder: 220 },
    { vaccineCode: "MR", vaccineName: "Measles Rubella", doseLabel: "Dose 2", dueAgeDays: 480, dueAgeLabel: "16-24 months", maxAgeDays: 730, doseAmount: "0.5 ml", route: "Subcutaneous", site: "Right upper arm", sortOrder: 230 },
    { vaccineCode: "JE", vaccineName: "Japanese Encephalitis", doseLabel: "Dose 2", dueAgeDays: 480, dueAgeLabel: "16-24 months", maxAgeDays: 730, doseAmount: "0.5 ml", route: "Subcutaneous", site: "Left upper arm", appliesIn: "JE endemic districts", notes: "Administer only in JE endemic districts under UIP.", sortOrder: 240 },
    { vaccineCode: "VITA", vaccineName: "Vitamin A", doseLabel: "Dose 2-9", dueAgeDays: 480, dueAgeLabel: "16-18 months, then every 6 months up to 5 years", maxAgeDays: 1825, doseAmount: "2 ml", route: "Oral", site: "Oral", notes: "Tracks the recurring 2nd through 9th Vitamin A doses as one schedule line.", sortOrder: 250 },
    { vaccineCode: "DPT", vaccineName: "DPT", doseLabel: "Booster 2", dueAgeDays: 1825, dueAgeLabel: "5-6 years", maxAgeDays: 2190, doseAmount: "0.5 ml", route: "Intramuscular", site: "Upper arm", sortOrder: 260 },
    { vaccineCode: "TD", vaccineName: "Td", doseLabel: "10 years", dueAgeDays: 3650, dueAgeLabel: "10 years", doseAmount: "0.5 ml", route: "Intramuscular", site: "Upper arm", sortOrder: 270 },
    { vaccineCode: "TD", vaccineName: "Td", doseLabel: "16 years", dueAgeDays: 5840, dueAgeLabel: "16 years", doseAmount: "0.5 ml", route: "Intramuscular", site: "Upper arm", sortOrder: 280 },
    { vaccineCode: "TD-PREG", vaccineName: "Td for pregnant women", doseLabel: "Dose 1", beneficiaryType: "Pregnant woman", dueAgeDays: null, dueAgeLabel: "Early in pregnancy", doseAmount: "0.5 ml", route: "Intramuscular", site: "Upper arm", notes: "Second Td dose is due 4 weeks after Td-1; use booster if adequately immunized in a pregnancy within last 3 years.", sortOrder: 290 }
  ]).run();
}

function ensurePatientTable() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      mrn TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      blood_group TEXT,
      allergies TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
}

export function seedPatientData() {
  ensurePatientTable();
  seedImmunizationSchedule();

  const samplePatients = [
    { mrn: "MRN-26001", name: "Aarohi Sharma", age: 0, gender: "Female", phone: "9876526001", address: "Jayanagar, Bengaluru", bloodGroup: "O+", allergies: "None" },
    { mrn: "MRN-26002", name: "Vihaan Reddy", age: 1, gender: "Male", phone: "9876526002", address: "Whitefield, Bengaluru", bloodGroup: "B+", allergies: "None" },
    { mrn: "MRN-26003", name: "Myra Iyer", age: 2, gender: "Female", phone: "9876526003", address: "Indiranagar, Bengaluru", bloodGroup: "A+", allergies: "Egg intolerance noted by parent" },
    { mrn: "MRN-26004", name: "Kabir Menon", age: 5, gender: "Male", phone: "9876526004", address: "Koramangala, Bengaluru", bloodGroup: "AB+", allergies: "None" },
    { mrn: "MRN-26005", name: "Saanvi Rao", age: 10, gender: "Female", phone: "9876526005", address: "Malleshwaram, Bengaluru", bloodGroup: "O-", allergies: "None" },
    { mrn: "MRN-26006", name: "Anika Thomas", age: 28, gender: "Female", phone: "9876526006", address: "HSR Layout, Bengaluru", bloodGroup: "B-", allergies: "Sulfa drugs" },
    { mrn: "MRN-26007", name: "Rohan Kulkarni", age: 34, gender: "Male", phone: "9876526007", address: "Basavanagudi, Bengaluru", bloodGroup: "A-", allergies: "Penicillin" },
    { mrn: "MRN-26008", name: "Meera Nair", age: 7, gender: "Female", phone: "9876526008", address: "BTM Layout, Bengaluru", bloodGroup: "O+", allergies: "None" }
  ];

  for (const patient of samplePatients) {
    const existing = db.select().from(patients).where(eq(patients.mrn, patient.mrn)).get();
    if (!existing) {
      db.insert(patients).values(patient).run();
    }
  }

  const schedules = db.select().from(immunizationSchedules).all();
  const staffRows = db.select().from(staff).all();
  const defaultStaffId = staffRows[0]?.id ?? null;
  const scheduleFor = (code: string, doseLabel: string) =>
    schedules.find((item) => item.vaccineCode === code && item.doseLabel === doseLabel);

  const recordSamples = [
    { mrn: "MRN-26001", code: "BCG", dose: "Birth dose", date: "2026-05-20", batchNo: "BCG-2605-A" },
    { mrn: "MRN-26001", code: "HEPB", dose: "Birth dose", date: "2026-05-20", batchNo: "HBV-2605-B" },
    { mrn: "MRN-26001", code: "OPV", dose: "Zero dose", date: "2026-05-20", batchNo: "OPV-2605-Z" },
    { mrn: "MRN-26002", code: "BCG", dose: "Birth dose", date: "2025-06-14", batchNo: "BCG-2506-A" },
    { mrn: "MRN-26002", code: "PENTA", dose: "Dose 1", date: "2025-07-26", batchNo: "PEN-2507-1" },
    { mrn: "MRN-26002", code: "PENTA", dose: "Dose 2", date: "2025-08-23", batchNo: "PEN-2508-2" },
    { mrn: "MRN-26003", code: "MR", dose: "Dose 1", date: "2024-03-18", batchNo: "MR-2403-1" },
    { mrn: "MRN-26003", code: "DPT", dose: "Booster 1", date: "2025-01-28", batchNo: "DPT-2501-B1" },
    { mrn: "MRN-26004", code: "DPT", dose: "Booster 2", date: "2026-03-10", batchNo: "DPT-2603-B2" },
    { mrn: "MRN-26005", code: "TD", dose: "10 years", date: "2026-04-04", batchNo: "TD-2604-10" },
    { mrn: "MRN-26006", code: "TD-PREG", dose: "Dose 1", date: "2026-06-12", batchNo: "TD-2606-P1" }
  ];

  for (const sample of recordSamples) {
    const patient = db.select().from(patients).where(eq(patients.mrn, sample.mrn)).get();
    const schedule = scheduleFor(sample.code, sample.dose);
    if (!patient || !schedule) continue;

    const existingRecord = db
      .select()
      .from(immunizationRecords)
      .where(eq(immunizationRecords.patientId, patient.id))
      .all()
      .some((record) => record.scheduleId === schedule.id && record.administeredAt === sample.date);

    if (existingRecord) continue;

    db.insert(immunizationRecords).values({
      patientId: patient.id,
      scheduleId: schedule.id,
      vaccineCode: schedule.vaccineCode,
      vaccineName: schedule.vaccineName,
      doseLabel: schedule.doseLabel,
      administeredAt: sample.date,
      administeredByStaffId: defaultStaffId,
      batchNo: sample.batchNo,
      manufacturer: "Govt UIP Supply",
      route: schedule.route,
      site: schedule.site,
      status: "Administered",
      notes: "Seeded demonstration record"
    }).run();
  }
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
    "inventory_items", "medicines", "prescriptions", "prescription_lines",
    "immunization_records", "immunization_schedules"
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

async function main() {
  clearDatabase();

  await seedAdmin();
  seedDomain();
  seedImmunizationSchedule();
  await seedEmployeeUsers();

  console.log(`Seed complete. Admin login: ${adminEmail} / ${adminPassword}`);
  console.log(`Employee logins use password: ${employeePassword}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
