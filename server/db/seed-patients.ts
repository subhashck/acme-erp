import { eq } from "drizzle-orm";
import { db } from "./client.ts";
import { patients } from "./schema.ts";

export const samplePatients = [
  {
    mrn: "MRN-2026-0001",
    name: "Aarav Sharma",
    age: 28,
    gender: "Male",
    phone: "+91 98765 43210",
    address: "124 Park Street, Flat 4B, Mumbai, Maharashtra - 400001",
    bloodGroup: "O+",
    allergies: "Penicillin",
  },
  {
    mrn: "MRN-2026-0002",
    name: "Priya Patel",
    age: 34,
    gender: "Female",
    phone: "+91 98234 56781",
    address: "45 Civil Lines, Near Judges Bungalow, Ahmedabad, Gujarat - 380006",
    bloodGroup: "B+",
    allergies: "Sulfa antibiotics",
  },
  {
    mrn: "MRN-2026-0003",
    name: "Rajesh Kumar",
    age: 52,
    gender: "Male",
    phone: "+91 98112 23344",
    address: "78 MG Road, Indiranagar, Bengaluru, Karnataka - 560038",
    bloodGroup: "A+",
    allergies: "None",
  },
  {
    mrn: "MRN-2026-0004",
    name: "Ananya Sen",
    age: 8,
    gender: "Female",
    phone: "+91 98301 12233",
    address: "12 Lake Gardens, South Kolkata, West Bengal - 700045",
    bloodGroup: "AB+",
    allergies: "Peanuts, Dust mites",
  },
  {
    mrn: "MRN-2026-0005",
    name: "Vikramaditya Singh",
    age: 67,
    gender: "Male",
    phone: "+91 99445 56677",
    address: "56 Raja Park, Adarsh Nagar, Jaipur, Rajasthan - 302004",
    bloodGroup: "O-",
    allergies: "Aspirin, NSAIDs",
  },
  {
    mrn: "MRN-2026-0006",
    name: "Sunita Deshmukh",
    age: 45,
    gender: "Female",
    phone: "+91 98220 01122",
    address: "89 FC Road, Shivajinagar, Pune, Maharashtra - 411005",
    bloodGroup: "B-",
    allergies: "None",
  },
  {
    mrn: "MRN-2026-0007",
    name: "Mohammed Farhan",
    age: 22,
    gender: "Male",
    phone: "+91 98450 12345",
    address: "34 Commercial Street, Tasker Town, Bengaluru, Karnataka - 560001",
    bloodGroup: "A-",
    allergies: "None",
  },
  {
    mrn: "MRN-2026-0008",
    name: "Meera Nair",
    age: 61,
    gender: "Female",
    phone: "+91 98471 23456",
    address: "15 Marine Drive, Ernakulam, Kochi, Kerala - 682011",
    bloodGroup: "AB-",
    allergies: "Iodine contrast dye",
  },
  {
    mrn: "MRN-2026-0009",
    name: "Rohan Verma",
    age: 14,
    gender: "Male",
    phone: "+91 98199 88776",
    address: "23 Sector 14, DLF Phase 2, Gurugram, Haryana - 122002",
    bloodGroup: "B+",
    allergies: "None",
  },
  {
    mrn: "MRN-2026-0010",
    name: "Deepa Ranganathan",
    age: 29,
    gender: "Female",
    phone: "+91 98401 23456",
    address: "67 2nd Avenue, Anna Nagar, Chennai, Tamil Nadu - 600040",
    bloodGroup: "O+",
    allergies: "Amoxicillin",
  },
  {
    mrn: "MRN-2026-0011",
    name: "Gurpreet Singh",
    age: 38,
    gender: "Male",
    phone: "+91 98140 12345",
    address: "90 Model Town, Link Road, Ludhiana, Punjab - 141002",
    bloodGroup: "A+",
    allergies: "None",
  },
  {
    mrn: "MRN-2026-0012",
    name: "Fatima Begum",
    age: 73,
    gender: "Female",
    phone: "+91 98490 12345",
    address: "102 Road No. 12, Banjara Hills, Hyderabad, Telangana - 500034",
    bloodGroup: "O+",
    allergies: "None",
  },
  {
    mrn: "MRN-2026-0013",
    name: "Karan Johar Mehta",
    age: 41,
    gender: "Male",
    phone: "+91 98200 99887",
    address: "18 Juhu Tara Road, Vile Parle West, Mumbai, Maharashtra - 400049",
    bloodGroup: "B+",
    allergies: "Shellfish",
  },
  {
    mrn: "MRN-2026-0014",
    name: "Shweta Tiwari",
    age: 31,
    gender: "Female",
    phone: "+91 98390 11224",
    address: "41 Hazratganj, Park Road, Lucknow, Uttar Pradesh - 226001",
    bloodGroup: "A+",
    allergies: "Latex",
  },
  {
    mrn: "MRN-2026-0015",
    name: "Amitabh Banerjee",
    age: 58,
    gender: "Male",
    phone: "+91 98310 99881",
    address: "88 Ballygunge Circular Road, Kolkata, West Bengal - 700019",
    bloodGroup: "O+",
    allergies: "Ciprofloxacin",
  },
];

export async function seedPatients() {
  console.log("🌱 Seeding Patients master data...");

  let insertedCount = 0;
  for (const p of samplePatients) {
    const [existing] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.mrn, p.mrn))
      .limit(1);

    if (!existing) {
      await db.insert(patients).values(p).execute();
      insertedCount++;
    }
  }

  console.log(`✅ Seeded ${insertedCount} new patients (${samplePatients.length} total in catalog).`);
}

// Auto-run when executed directly via `tsx server/db/seed-patients.ts`
if (process.argv[1] && process.argv[1].endsWith("seed-patients.ts")) {
  seedPatients()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Failed to seed patients:", err);
      process.exit(1);
    });
}
