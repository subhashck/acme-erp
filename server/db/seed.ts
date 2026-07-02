import { eq } from "drizzle-orm";
import { pathToFileURL } from "node:url";
import { auth } from "../auth.ts";
import { db } from "./client.ts";
import {
  departments,
  immunizationRecords,
  immunizationSchedules,
  leaveTypes,
  patients,
  designations,
  staff,
  staffDepartments,
  shifts,
  user,
  banks
} from "./schema.ts";

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@acmehospital.local";
const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin@12345";
const employeePassword = process.env.EMPLOYEE_PASSWORD ?? "Staff@12345";

async function ensureAuthUser(name: string, email: string, password: string, role: "admin" | "staff") {
  const [existing] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (!existing) {
    await auth.api.signUpEmail({
      body: {
        name,
        email,
        password
      }
    });
  }
  await db.update(user).set({ role, emailVerified: true }).where(eq(user.email, email)).execute();
}

async function seedAdmin() {
  await ensureAuthUser("System Administrator", adminEmail, adminPassword, "admin");
}

async function seedDomain() {
  const [hasDepts] = await db.select().from(departments).limit(1);
  if (hasDepts) return;

  await db.insert(shifts).values([
    { name: "Morning", code: "M", startTime: "07:00", endTime: "15:00" },
    { name: "Evening", code: "E", startTime: "15:00", endTime: "23:00" },
    { name: "Night", code: "N", startTime: "23:00", endTime: "07:00" }
  ]).execute();

  await db.insert(designations).values([
    { name: "Billing Executive" },
    { name: "Lab Technician" },
    { name: "Ward Nurse" },
    { name: "Front Desk Coordinator" },
    { name: "Inventory Associate" },
    { name: "Pharmacy Assistant" },
    { name: "Doctor" },
    { name: "System Administrator" }
  ]).execute();

  await db.insert(leaveTypes).values([
    { name: "Casual Leave", maxDays: 12, payable: true, paymentRate: 100.0 },
    { name: "Sick Leave", maxDays: 10, payable: true, paymentRate: 100.0 },
    { name: "Maternity Leave", maxDays: 180, payable: true, paymentRate: 100.0 },
    { name: "Paternity Leave", maxDays: 15, payable: true, paymentRate: 100.0 },
    { name: "Loss of Pay", maxDays: 365, payable: false, paymentRate: 0.0 }
  ]).execute();

  const deptRows = await db.insert(departments).values([
    { name: "General Medicine", floor: "1st Floor", head: "Dr. Arvind Swamy" },
    { name: "Pediatrics", floor: "2nd Floor", head: "Dr. Anjali Sen" },
    { name: "Orthopedics", floor: "G Floor", head: "Dr. Vikram Seth" },
    { name: "Emergency", floor: "G Floor", head: "Dr. Kabir Khan" }
  ]).returning().execute();

  await db.insert(banks).values([
    { name: "State Bank of India" },
    { name: "HDFC Bank" },
    { name: "ICICI Bank" },
    { name: "Axis Bank" }
  ]).execute();

  // const genMed = deptRows.find((d) => d.name === "General Medicine")!;
  // const ped = deptRows.find((d) => d.name === "Pediatrics")!;
  // const ortho = deptRows.find((d) => d.name === "Orthopedics")!;
  // const emergency = deptRows.find((d) => d.name === "Emergency")!;
}

async function seedImmunizationSchedule() {
  const [hasSchedules] = await db.select().from(immunizationSchedules).limit(1);
  if (hasSchedules) return;

  await db.insert(immunizationSchedules).values([
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
  ]).execute();
}

async function seedPatientData() {
  await seedImmunizationSchedule();

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
    const [existing] = await db.select().from(patients).where(eq(patients.mrn, patient.mrn)).limit(1);
    if (!existing) {
      await db.insert(patients).values(patient).execute();
    }
  }

  const schedules = await db.select().from(immunizationSchedules).execute();
  const staffRows = await db.select().from(staff).execute();
  const defaultStaffId = staffRows[0]?.staffId ?? null;
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
    const [patient] = await db.select().from(patients).where(eq(patients.mrn, sample.mrn)).limit(1);
    const schedule = scheduleFor(sample.code, sample.dose);
    if (!patient || !schedule) continue;

    const patientRecords = await db
      .select()
      .from(immunizationRecords)
      .where(eq(immunizationRecords.patientId, patient.id))
      .execute();

    const existingRecord = patientRecords.some((record) => record.scheduleId === schedule.id && record.administeredAt === sample.date);

    if (existingRecord) continue;

    await db.insert(immunizationRecords).values({
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
    }).execute();
  }
}

async function seedEmployeeUsers() {
  const deptRows = await db.select().from(departments).execute();
  if (!deptRows.length) return;

  const employees = [
    { employeeCode: "EMP-2001", name: "Anaya Rao", role: "Billing Executive", departmentName: "General Medicine", phone: "9876500211", email: "anaya.rao@acmehospital.local", shift: "Morning", salary: 48000 },
    { employeeCode: "EMP-2002", name: "Kabir Sethi", role: "Lab Technician", departmentName: "Emergency", phone: "9876500212", email: "kabir.sethi@acmehospital.local", shift: "Evening", salary: 56000 },
    { employeeCode: "EMP-2003", name: "Ishita Varma", role: "Ward Nurse", departmentName: "Pediatrics", phone: "9876500213", email: "ishita.varma@acmehospital.local", shift: "Night", salary: 62000 },
    { employeeCode: "EMP-2004", name: "Dev Mehta", role: "Front Desk Coordinator", departmentName: "Orthopedics", phone: "9876500214", email: "dev.mehta@acmehospital.local", shift: "Morning", salary: 42000 },
    { employeeCode: "EMP-2005", name: "Sara Thomas", role: "Inventory Associate", departmentName: "Emergency", phone: "9876500215", email: "sara.thomas@acmehospital.local", shift: "Evening", salary: 45000 },
    { employeeCode: "EMP-2006", name: "Rohan Kulkarni", role: "Pharmacy Assistant", departmentName: "General Medicine", phone: "9876500216", email: "rohan.kulkarni@acmehospital.local", shift: "Morning", salary: 47000 }
  ];

  let nextStaffId = 1;
  for (const employee of employees) {
    const [existingStaff] = await db.select().from(staff).where(eq(staff.employeeCode, employee.employeeCode)).limit(1);
    const department = deptRows.find((row) => row.name === employee.departmentName) ?? deptRows[0];
    if (!existingStaff) {
      const [newStaff] = await db.insert(staff).values({
        staffId: nextStaffId++,
        employeeCode: employee.employeeCode,
        name: employee.name,
        role: employee.role,
        phone: employee.phone,
        email: employee.email,
        salary: employee.salary,
        status: "Active",
        aadhar: "555566667777",
        pan: "EFGHI5678J"
      }).returning().execute();

      await db.insert(staffDepartments).values({
        staffId: newStaff.staffId,
        departmentId: department.id,
        version: 1,
        status: "Active"
      }).execute();
    }
    await ensureAuthUser(employee.name, employee.email, employeePassword, "staff");
  }
}

async function clearDatabase() {
  const tables = [
    "session", "account", "verification", "staff_departments", "designations", "leave_types",
    "rosters", "leave_requests", "appointments", "encounters", "prescription_lines", "prescriptions",
    "inventory_items", "medicines", "immunization_records", "immunization_schedules", "patients",
    "staff", "departments", "shifts", "banks", "user"
  ];
  for (const table of tables) {
    try {
      await db.execute(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch (e) {
      // Table might not exist or failed
    }
  }
  console.log("Cleared all tables successfully.");
}

async function main() {
  await clearDatabase();

  await seedAdmin();
  await seedDomain();
  await seedImmunizationSchedule();
  await seedPatientData();
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
