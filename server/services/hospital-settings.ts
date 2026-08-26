import { db } from "../db/client.ts";
import { hospitalSettings } from "../db/schema.ts";
import { pool } from "../db/client.ts";

export interface HospitalDbSettings {
  id?: number;
  name: string;
  tagline?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  emergencyPhone?: string | null;
  opdPhone?: string | null;
  editorialDivision?: string | null;
  copyrightText?: string | null;
}

const DEFAULT_SETTINGS: HospitalDbSettings = {
  name: "ACME Hospital & Healthcare",
  tagline: "Excellence in Medical Care, Research & Healthcare Innovation",
  address: "123 Healthcare Ave, Medical District, Healthcare Campus",
  phone: "+91 98765 43210",
  email: "editorial@acmehospital.com",
  website: "www.acmehospital.com",
  emergencyPhone: "+91 98765 43211",
  opdPhone: "+91 98765 43212",
  editorialDivision: "ACME Healthcare Communications & Editorial Division",
  copyrightText: "ACME Monthly Electronic Magazine. All rights reserved.",
};

let tableEnsured = false;

export async function ensureHospitalSettingsTable(): Promise<void> {
  if (tableEnsured) return;
  try {
    const ddl = `
      CREATE TABLE IF NOT EXISTS "public"."hospital_settings" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL DEFAULT 'ACME Hospital & Healthcare',
        "tagline" TEXT DEFAULT 'Excellence in Medical Care, Research & Healthcare Innovation',
        "logo_url" TEXT,
        "phone" TEXT DEFAULT '+91 98765 43210',
        "email" TEXT DEFAULT 'editorial@acmehospital.com',
        "website" TEXT DEFAULT 'www.acmehospital.com',
        "address" TEXT DEFAULT '123 Healthcare Ave, Medical District, Healthcare Campus',
        "emergency_phone" TEXT DEFAULT '+91 98765 43211',
        "opd_phone" TEXT DEFAULT '+91 98765 43212',
        "editorial_division" TEXT DEFAULT 'ACME Healthcare Communications & Editorial Division',
        "copyright_text" TEXT DEFAULT 'ACME Monthly Electronic Magazine. All rights reserved.',
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    await pool.query(ddl);
    tableEnsured = true;
  } catch (err) {
    console.error("Error creating hospital_settings table:", err);
  }
}

export async function getHospitalSettingsFromDb(): Promise<HospitalDbSettings> {
  try {
    await ensureHospitalSettingsTable();

    const rows = await db.select().from(hospitalSettings).limit(1);
    if (rows.length > 0 && rows[0]) {
      return {
        ...DEFAULT_SETTINGS,
        ...rows[0],
      };
    }

    // Insert initial default row if empty
    const [inserted] = await db
      .insert(hospitalSettings)
      .values(DEFAULT_SETTINGS)
      .returning();

    return inserted || DEFAULT_SETTINGS;
  } catch (err) {
    console.error("Failed to fetch hospital settings from DB, falling back to defaults:", err);
    return DEFAULT_SETTINGS;
  }
}
