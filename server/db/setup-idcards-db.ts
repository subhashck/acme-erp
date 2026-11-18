import { pool } from "./client.ts";

export async function setupIdCardsDb() {
  console.log("Setting up and verifying PostgreSQL 'id_card_templates' and 'id_card_issuances' tables...");

  const ddl = `
    -- 1. Create id_card_templates table
    CREATE TABLE IF NOT EXISTS "id_card_templates" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "target_type" TEXT NOT NULL,
      "orientation" TEXT NOT NULL DEFAULT 'portrait',
      "is_default" BOOLEAN NOT NULL DEFAULT false,
      "layout_config" JSONB NOT NULL,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_by_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_id_card_templates_target" ON "id_card_templates" ("target_type");

    -- 2. Create id_card_issuances table
    CREATE TABLE IF NOT EXISTS "id_card_issuances" (
      "id" SERIAL PRIMARY KEY,
      "card_serial_no" TEXT NOT NULL UNIQUE,
      "template_id" INTEGER NOT NULL REFERENCES "id_card_templates"("id"),
      "entity_type" TEXT NOT NULL,
      "staff_id" INTEGER,
      "student_id" INTEGER,
      "printed_name" TEXT NOT NULL,
      "printed_code" TEXT NOT NULL,
      "printed_department" TEXT,
      "printed_role" TEXT,
      "printed_blood_group" TEXT,
      "printed_emergency_contact" TEXT,
      "photo_url" TEXT,
      "issue_date" TEXT NOT NULL,
      "valid_until" TEXT,
      "qr_verify_token" TEXT NOT NULL UNIQUE,
      "status" TEXT NOT NULL DEFAULT 'active',
      "print_count" INTEGER NOT NULL DEFAULT 1,
      "last_printed_at" TIMESTAMP DEFAULT NOW(),
      "issued_by_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_id_card_issuances_entity" ON "id_card_issuances" ("entity_type", "staff_id", "student_id");
    CREATE INDEX IF NOT EXISTS "idx_id_card_issuances_status" ON "id_card_issuances" ("status");

    -- 3. Enhance staff and nursing_students with photo_url and blood_group column if not present
    ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
    ALTER TABLE "nursing_students" ADD COLUMN IF NOT EXISTS "photo_url" TEXT;
    ALTER TABLE "nursing_students" ADD COLUMN IF NOT EXISTS "blood_group" TEXT;
  `;

  await pool.query(ddl);
  console.log("ID Card schema tables verified.");

  const aconOfficialStudentConfig = {
    theme: {
      primaryColor: "#2f3e83", // Official Royal Navy
      secondaryColor: "#b8c8f5", // Official Periwinkle/Lavender for Back
      backgroundColor: "#ffffff",
      textColor: "#253468",
      accentTextColor: "#ffffff",
      cardVariant: "acon-official-student",
    },
    header: {
      showLogo: true,
      institutionTitle: "ACME",
      institutionSubtitle: "COLLEGE OF NURSING",
      affiliationText: "Hiyang Hiren Leirak, Palace Compound, Imphal East, Manipur",
      unitTitle: "A UNIT OF ACME IGNITE FOUNDATION",
      phones: ["0385-3500803", "+91 9436 676 980"],
    },
    photo: {
      shape: "circle",
      borderWidth: 4,
      borderColor: "#ffffff",
    },
    fields: [
      { key: "name", label: "Student Name", showLabel: false, isBold: true, side: "front" },
      { key: "validity", label: "Validity", showLabel: true, isBold: true, side: "front" },
      { key: "dob", label: "Date of Birth", showLabel: true, isBold: false, side: "front" },
      { key: "bloodGroup", label: "Blood Group", showLabel: true, isBold: false, side: "front" },
      { key: "emergencyContact", label: "Parent's No.", showLabel: true, isBold: false, side: "front" },
      { key: "fatherName", label: "Father Name", showLabel: true, isBold: false, side: "back" },
      { key: "motherName", label: "Mother Name", showLabel: true, isBold: false, side: "back" },
      { key: "address", label: "Address", showLabel: true, isBold: false, side: "back" },
    ],
    barcode: {
      enabled: false,
      type: "code128",
      side: "front",
      valueField: "code",
    },
    signature: {
      enabled: true,
      label: "Principal Signature",
      side: "front",
    },
    background: {
      frontImageUrl: "/templates/acon-student-front.jpg",
      backImageUrl: "/templates/acon-student-back.jpg",
      useCustomBackground: true,
    },
    termsText:
      "INSTRUCTIONS : 1) This card must be worn to display when in the College premises 2) This card is not transferable 3) In case of loss of identity card the holder of this card must intimate the Registrar's office immediately 4) Any one who finds this card is requested to deposit it with the Registrar's office 5) This card must be returned at the time of collection of result at the end of the academic year.",
    socialLinks: {
      facebook: "Acme College of Nursing",
      instagram: "acme_college_of_nursing",
      email: "acmenursingcollege.info@gmail.com",
    },
    returnAddress: "Hiyang Hiren Leirak, Palace Compound, Imphal East, Manipur",
    emergencyPhone: "+91 9436 676 980",
  };

  // Always keep student template updated with official ACON styling
  await pool.query(
    `UPDATE "id_card_templates" 
     SET "layout_config" = $1, 
         "name" = 'ACON Nursing Student ID (Official)' 
     WHERE "target_type" = 'student'`,
    [JSON.stringify(aconOfficialStudentConfig)]
  );

  // Check if default templates exist; if not, seed defaults
  const existingTemplates = await pool.query(`SELECT COUNT(*) FROM "id_card_templates"`);
  if (parseInt(existingTemplates.rows[0].count, 10) === 0) {
    console.log("Seeding default ID Card templates for Hospital Staff and ACON Students...");

    const defaultStaffConfig = {
      theme: {
        primaryColor: "#0284c7", // Sky/Blue
        secondaryColor: "#0f172a", // Dark slate
        backgroundColor: "#ffffff",
        textColor: "#0f172a",
        accentTextColor: "#ffffff",
      },
      header: {
        showLogo: true,
        institutionTitle: "ACME HOSPITAL & HEALTHCARE",
        institutionSubtitle: "Excellence in Medical Care & Innovation",
        affiliationText: "NABH Accredited Tertiary Care Center",
      },
      photo: {
        shape: "rounded",
        borderWidth: 2,
        borderColor: "#0284c7",
      },
      fields: [
        { key: "name", label: "Full Name", showLabel: false, isBold: true, side: "front" },
        { key: "code", label: "Emp Code", showLabel: true, isBold: true, side: "front" },
        { key: "role", label: "Designation", showLabel: false, isBold: false, side: "front" },
        { key: "department", label: "Department", showLabel: true, isBold: false, side: "front" },
        { key: "bloodGroup", label: "Blood Group", showLabel: true, isBold: true, side: "back" },
        { key: "emergencyContact", label: "Emergency Contact", showLabel: true, isBold: false, side: "back" },
        { key: "issueDate", label: "Date of Issue", showLabel: true, isBold: false, side: "back" },
        { key: "validUntil", label: "Valid Upto", showLabel: true, isBold: false, side: "back" },
      ],
      barcode: {
        enabled: true,
        type: "code128",
        side: "front",
        valueField: "code",
      },
      signature: {
        enabled: true,
        label: "Medical Director / Issuing Authority",
        side: "back",
      },
      termsText: "This card is the property of ACME Hospital. If found, please return to the HR Department or call the emergency contact number.",
      returnAddress: "123 Healthcare Ave, Medical District, Healthcare Campus",
      emergencyPhone: "+91 98765 43211",
    };

    const defaultStudentConfig = {
      theme: {
        primaryColor: "#059669", // Emerald Green for College
        secondaryColor: "#064e3b",
        backgroundColor: "#ffffff",
        textColor: "#0f172a",
        accentTextColor: "#ffffff",
      },
      header: {
        showLogo: true,
        institutionTitle: "ACME COLLEGE OF NURSING",
        institutionSubtitle: "Affiliated to State Health University",
        affiliationText: "Recognized by Indian Nursing Council (INC)",
      },
      photo: {
        shape: "rounded",
        borderWidth: 2,
        borderColor: "#059669",
      },
      fields: [
        { key: "name", label: "Student Name", showLabel: false, isBold: true, side: "front" },
        { key: "code", label: "Enrollment No", showLabel: true, isBold: true, side: "front" },
        { key: "role", label: "Course Program", showLabel: false, isBold: true, side: "front" },
        { key: "department", label: "Academic Batch", showLabel: true, isBold: false, side: "front" },
        { key: "bloodGroup", label: "Blood Group", showLabel: true, isBold: true, side: "back" },
        { key: "emergencyContact", label: "Guardian Contact", showLabel: true, isBold: false, side: "back" },
        { key: "issueDate", label: "Admission Date", showLabel: true, isBold: false, side: "back" },
        { key: "validUntil", label: "Valid Upto", showLabel: true, isBold: false, side: "back" },
      ],
      barcode: {
        enabled: true,
        type: "code128",
        side: "front",
        valueField: "code",
      },
      signature: {
        enabled: true,
        label: "Principal / Academic Dean",
        side: "back",
      },
      termsText: "This identity card must be carried at all times on the college campus and during clinical postings. Report loss immediately to the academic office.",
      returnAddress: "ACON Campus, Academic Block, Healthcare Campus",
      emergencyPhone: "+91 98765 43210",
    };

    const landscapeStaffConfig = {
      ...defaultStaffConfig,
      theme: {
        primaryColor: "#1e3a8a", // Navy Blue
        secondaryColor: "#d97706", // Amber
        backgroundColor: "#ffffff",
        textColor: "#0f172a",
        accentTextColor: "#ffffff",
      },
    };

    await pool.query(
      `INSERT INTO "id_card_templates" ("name", "target_type", "orientation", "is_default", "layout_config")
       VALUES 
       ($1, 'staff', 'portrait', true, $2),
       ($3, 'student', 'portrait', true, $4),
       ($5, 'staff', 'landscape', false, $6)`,
      [
        "Standard Staff ID (Portrait)",
        JSON.stringify(defaultStaffConfig),
        "ACON Nursing Student ID (Portrait)",
        JSON.stringify(defaultStudentConfig),
        "Executive Clinical ID (Landscape)",
        JSON.stringify(landscapeStaffConfig),
      ]
    );
    console.log("Default ID Card templates seeded successfully.");
  }
}

if (process.argv[1]?.includes("setup-idcards-db.ts")) {
  setupIdCardsDb()
    .then(() => {
      console.log("ID Card DB setup complete.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("ID Card DB setup failed:", err);
      process.exit(1);
    });
}
