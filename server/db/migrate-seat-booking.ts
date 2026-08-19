import { pool } from "./client.ts";

async function migrate() {
  console.log("Applying database migration for Seat Booking Advance & Adjustment...");
  try {
    await pool.query(`
      ALTER TABLE nursing_applicants
      ADD COLUMN IF NOT EXISTS seat_booking_amount NUMERIC(12, 2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS seat_booking_status TEXT DEFAULT 'none',
      ADD COLUMN IF NOT EXISTS seat_booking_receipt_no TEXT,
      ADD COLUMN IF NOT EXISTS seat_booking_date TEXT,
      ADD COLUMN IF NOT EXISTS seat_booking_payment_mode TEXT,
      ADD COLUMN IF NOT EXISTS seat_booking_notes TEXT;

      ALTER TABLE nursing_fee_transactions
      ALTER COLUMN student_id DROP NOT NULL,
      ADD COLUMN IF NOT EXISTS applicant_id INTEGER REFERENCES nursing_applicants(id) ON DELETE SET NULL;
    `);
    console.log("Migration executed successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
