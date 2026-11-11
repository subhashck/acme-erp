import { pool } from '../db/client.ts';

// Magazine-owned branding. This does not read or update ERP hospital_settings.
const defaults = {
  name: 'ACME Hospital & Healthcare', tagline: '', logoUrl: null,
  address: '', phone: '', email: '', website: '', emergencyPhone: '', opdPhone: '',
  editorialDivision: 'Editorial Division', copyrightText: 'All rights reserved.',
};
export async function getHospitalSettingsFromDb() {
  const result = await pool.query('SELECT settings FROM magazine.branding WHERE id = 1');
  return { ...defaults, ...result.rows[0]?.settings };
}
export async function updateHospitalSettingsInDb(updates: Record<string, unknown>) {
  await pool.query('UPDATE magazine.branding SET settings = settings || $1::jsonb WHERE id = 1', [JSON.stringify(updates)]);
  return getHospitalSettingsFromDb();
}
