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

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@acmehospital.health";
const adminPassword = process.env.ADMIN_PASSWORD ?? "AdminAdmin@12345";
const employeePassword = process.env.EMPLOYEE_PASSWORD ?? "StaffStaff@12345";

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
  // const [hasDepts] = await db.select().from(departments).limit(1);
  // if (hasDepts) return;

  await db.insert(leaveTypes).values([
    { name: "Casual Leave", maxDays: 7, payable: true, paymentRate: "100.0" },
    { name: "Sick Leave", maxDays: 5, payable: true, paymentRate: "100.0" },
    { name: "Maternity Leave", maxDays: 180, payable: true, paymentRate: "50.0" },
    { name: "Paternity Leave", maxDays: 10, payable: true, paymentRate: "50.0" },
    { name: "Loss of Pay", maxDays: 365, payable: false, paymentRate: "0.0" }
  ]).execute();

  await db.insert(designations).values([
    {
      "name": "Lab Technician",
      "active": true
    },
    {
      "name": "Front Desk Coordinator",
      "active": true
    },
    {
      "name": "Inventory Associate",
      "active": true
    },
    {
      "name": "Pharmacy Assistant",
      "active": true
    },
    {
      "name": "System Administrator",
      "active": true
    },
    {
      "name": "HR Executive",
      "active": true
    },
    {
      "name": "Floor Master",
      "active": true
    },
    {
      "name": "Nursing officer ",
      "active": true
    },
    {
      "name": "Front  Office Executive",
      "active": true
    },
    {
      "name": "Chief Operating Officer/Medical Superintendent ",
      "active": true
    },
    {
      "name": "RMO/Clinical Assistant ",
      "active": true
    },
    {
      "name": "Pharmacist ",
      "active": true
    },
    {
      "name": "Nursing Supervisor ",
      "active": true
    },
    {
      "name": "Customer Relationship Officer",
      "active": true
    },
    {
      "name": "Trainee staff Nurse ",
      "active": true
    },
    {
      "name": "Andrologist cum Trainee Embryologist ",
      "active": true
    },
    {
      "name": "Nursing Incharge ",
      "active": true
    },
    {
      "name": "Assistant Nursing Incharge ",
      "active": true
    },
    {
      "name": "Assistant Lab. Director",
      "active": true
    },
    {
      "name": "Incharge ",
      "active": true
    },
    {
      "name": "Assistant Incharge",
      "active": true
    },
    {
      "name": "General Manager ",
      "active": true
    },
    {
      "name": "Assistant General Manager ",
      "active": true
    },
    {
      "name": "Manager",
      "active": true
    },
    {
      "name": "Assistant Manager ",
      "active": true
    },
    {
      "name": "Pathologist ",
      "active": true
    },
    {
      "name": "Multi Tasking Staff",
      "active": true
    },
    {
      "name": "Laboratory Technician ",
      "active": true
    },
    {
      "name": "Assistant Cook",
      "active": true
    },
    {
      "name": "Maintenance Executive ",
      "active": true
    },
    {
      "name": "CSSD Technician ",
      "active": true
    },
    {
      "name": "Dental Surgeon ",
      "active": true
    },
    {
      "name": "Managing Director ",
      "active": true
    },
    {
      "name": "Nursing Superintendent ",
      "active": true
    },
    {
      "name": "OT Technician ",
      "active": true
    },
    {
      "name": "Consultant OBGY",
      "active": true
    },
    {
      "name": "Embryologist ",
      "active": true
    },
    {
      "name": "Consultant Anaesthetist ",
      "active": true
    },
    {
      "name": "Operations Executive ",
      "active": true
    },
    {
      "name": "Executive Marketing & BD",
      "active": true
    }
  ]).execute();



  const deptRows = await db.insert(departments).values([
    {
      "name": "Operations",
      "floor": "1st Floor",
      "head": "",
      "active": true
    },
    {
      "name": "Management",
      "floor": "1st Floor",
      "head": "",
      "active": true
    },
    {
      "name": "OPD",
      "floor": "Ground Floor",
      "head": "",
      "active": true
    },
    {
      "name": "Housekeeping",
      "floor": "Any Floor",
      "head": "",
      "active": true
    },
    {
      "name": "MTS",
      "floor": "Any Floor",
      "head": "",
      "active": true
    },
    {
      "name": "Accounts",
      "floor": "1st Floor",
      "head": "",
      "active": true
    },
    {
      "name": "Front Office ",
      "floor": "Ground Floor",
      "head": "",
      "active": true
    },
    {
      "name": "NICU",
      "floor": "Second Floor ",
      "head": "",
      "active": true
    },
    {
      "name": "CSSD",
      "floor": "1st Floor",
      "head": "",
      "active": true
    },
    {
      "name": "Dispensary ",
      "floor": "Ground Floor",
      "head": "",
      "active": true
    },
    {
      "name": "Purchase and Store",
      "floor": "Ground Floor",
      "head": "",
      "active": true
    },
    {
      "name": "Canteen ",
      "floor": "Ground Floor",
      "head": "",
      "active": true
    },
    {
      "name": "RMO",
      "floor": "Any floor ",
      "head": "",
      "active": true
    },
    {
      "name": "Radiology ",
      "floor": "3rd floor ",
      "head": "",
      "active": true
    },
    {
      "name": "Assisted Reproductive Technology (ART)",
      "floor": "2nd Floor ",
      "head": "",
      "active": true
    },
    {
      "name": "Administrative ",
      "floor": "1st Floor",
      "head": "",
      "active": true
    },
    {
      "name": "Human Resources ",
      "floor": "1st Floor",
      "head": "",
      "active": true
    },
    {
      "name": "Asthetic ",
      "floor": "2nd Floor",
      "head": "",
      "active": true
    },
    {
      "name": "OT",
      "floor": "1st Floor",
      "head": "",
      "active": true
    },
    {
      "name": "Ward",
      "floor": "2nd Floor",
      "head": "",
      "active": true
    }
  ]).returning().execute();



  await db.insert(banks).values([
    {
      "name": "State Bank of India",
      "active": true
    },
    {
      "name": "HDFC Bank",
      "active": true
    },
    {
      "name": "ICICI Bank",
      "active": true
    },
    {
      "name": "Axis Bank",
      "active": true
    },
    {
      "name": "Bank Of India",
      "active": true
    },
    {
      "name": "Manipur Rural Bank ",
      "active": true
    },
    {
      "name": "Central Bank of India ",
      "active": true
    },
    {
      "name": "Punjab National Bank ",
      "active": true
    }
  ]).execute();

  await db.insert(shifts).values([
    {
      "name": "Leave",
      "code": "LV",
      "startTime": "00:00",
      "endTime": "23:59",
      "isOffDay": true,
      "sortOrder": 0
    },
    {
      "name": "Morning",
      "code": "M",
      "startTime": "07:00",
      "endTime": "12:30",
      "isOffDay": false,
      "sortOrder": 0
    },
    {
      "name": "Evening",
      "code": "E",
      "startTime": "12:00",
      "endTime": "18:00",
      "isOffDay": false,
      "sortOrder": 0
    },
    {
      "name": "Night",
      "code": "N",
      "startTime": "17:30",
      "endTime": "07:00",
      "isOffDay": false,
      "sortOrder": 0
    },
    {
      "name": "Half Day Leave",
      "code": "HDLV",
      "startTime": "13:00",
      "endTime": "17:00",
      "isOffDay": false,
      "sortOrder": 0
    }
  ]).execute();


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
  // await clearDatabase();

  await seedAdmin();
  await seedDomain();
  // await seedImmunizationSchedule();
  // await seedPatientData();
  // await seedEmployeeUsers();

  console.log(`Seed complete. Admin login: ${adminEmail} / ${adminPassword}`);
  console.log(`Employee logins use password: ${employeePassword}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
