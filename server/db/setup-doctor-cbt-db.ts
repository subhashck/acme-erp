import { pool } from "./client.ts";

export async function createDoctorCbtSchemaAndTables() {
  console.log("Setting up and verifying PostgreSQL 'doctor_cbt' schema and tables...");

  const ddl = `
    CREATE SCHEMA IF NOT EXISTS "doctor_cbt";

    -- 1. Master Table of Module Users (Staff + External Faculty / Assessors)
    CREATE TABLE IF NOT EXISTS "doctor_cbt"."module_users" (
      "id" SERIAL PRIMARY KEY,
      "user_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL,
      "staff_id" INTEGER,
      "full_name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "mobile" TEXT,
      "role_in_module" TEXT NOT NULL DEFAULT 'faculty_author',
      "is_external" BOOLEAN NOT NULL DEFAULT false,
      "institution" TEXT,
      "designation_title" TEXT,
      "notes" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_module_users_role" ON "doctor_cbt"."module_users"("role_in_module");
    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_module_users_active" ON "doctor_cbt"."module_users"("active");

    -- 2. Module Settings & Administration Configuration
    CREATE TABLE IF NOT EXISTS "doctor_cbt"."module_settings" (
      "id" SERIAL PRIMARY KEY,
      "setting_key" TEXT NOT NULL UNIQUE,
      "setting_value" JSONB NOT NULL,
      "updated_by_user_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 3. Doctor Profiles (Internal Staff Doctors & External Trainee Candidates)
    CREATE TABLE IF NOT EXISTS "doctor_cbt"."doctor_profiles" (
      "id" SERIAL PRIMARY KEY,
      "user_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL,
      "staff_id" INTEGER,
      "full_name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "mobile" TEXT,
      "nmc_smc_number" TEXT,
      "qualifications" TEXT,
      "primary_specialty" TEXT,
      "institution_name" TEXT,
      "candidate_id" TEXT,
      "address" TEXT,
      "university_institute" TEXT,
      "year_of_passing" TEXT,
      "experience" TEXT,
      "candidate_type" TEXT NOT NULL DEFAULT 'external_trainee',
      "status" TEXT NOT NULL DEFAULT 'enrolled',
      "notes" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE "doctor_cbt"."doctor_profiles" ADD COLUMN IF NOT EXISTS "candidate_id" TEXT;
    ALTER TABLE "doctor_cbt"."doctor_profiles" ADD COLUMN IF NOT EXISTS "address" TEXT;
    ALTER TABLE "doctor_cbt"."doctor_profiles" ADD COLUMN IF NOT EXISTS "university_institute" TEXT;
    ALTER TABLE "doctor_cbt"."doctor_profiles" ADD COLUMN IF NOT EXISTS "year_of_passing" TEXT;
    ALTER TABLE "doctor_cbt"."doctor_profiles" ADD COLUMN IF NOT EXISTS "experience" TEXT;

    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_profiles_status" ON "doctor_cbt"."doctor_profiles"("status");
    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_profiles_candidate_type" ON "doctor_cbt"."doctor_profiles"("candidate_type");
    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_profiles_candidate_id" ON "doctor_cbt"."doctor_profiles"("candidate_id");

    -- 4. Programs / Fellowships / Courses Master
    CREATE TABLE IF NOT EXISTS "doctor_cbt"."programs" (
      "id" SERIAL PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "specialty" TEXT NOT NULL,
      "duration_months" INTEGER NOT NULL DEFAULT 6,
      "total_cme_credits" NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
      "description" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 5. Clinical Curriculum Topics
    CREATE TABLE IF NOT EXISTS "doctor_cbt"."clinical_topics" (
      "id" SERIAL PRIMARY KEY,
      "program_id" INTEGER NOT NULL REFERENCES "doctor_cbt"."programs"("id") ON DELETE CASCADE,
      "code" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "description" TEXT,
      "cme_credits" NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
      "display_order" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_topics_program" ON "doctor_cbt"."clinical_topics"("program_id");

    -- 6. Doctor Program Enrollments
    CREATE TABLE IF NOT EXISTS "doctor_cbt"."doctor_enrollments" (
      "id" SERIAL PRIMARY KEY,
      "doctor_id" INTEGER NOT NULL REFERENCES "doctor_cbt"."doctor_profiles"("id") ON DELETE CASCADE,
      "program_id" INTEGER NOT NULL REFERENCES "doctor_cbt"."programs"("id") ON DELETE CASCADE,
      "batch_code" TEXT NOT NULL DEFAULT '2026-Q1',
      "enrolled_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "status" TEXT NOT NULL DEFAULT 'enrolled',
      "completed_at" TIMESTAMP,
      "notes" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      CONSTRAINT "uniq_doctor_program_batch" UNIQUE ("doctor_id", "program_id", "batch_code")
    );

    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_enrollments_doctor" ON "doctor_cbt"."doctor_enrollments"("doctor_id");
    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_enrollments_program" ON "doctor_cbt"."doctor_enrollments"("program_id");

    -- 7. Clinical Vignette Question Bank
    CREATE TABLE IF NOT EXISTS "doctor_cbt"."question_bank" (
      "id" SERIAL PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "topic_id" INTEGER NOT NULL REFERENCES "doctor_cbt"."clinical_topics"("id") ON DELETE CASCADE,
      "difficulty" TEXT NOT NULL DEFAULT 'core',
      "cognitive_level" TEXT NOT NULL DEFAULT 'clinical_management',
      "clinical_vignette" TEXT NOT NULL,
      "attachments" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "question_prompt" TEXT NOT NULL,
      "options" JSONB NOT NULL,
      "correct_option_index" INTEGER NOT NULL,
      "clinical_explanation" TEXT,
      "author_user_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL,
      "approved_by_user_id" TEXT REFERENCES "user"("id") ON DELETE SET NULL,
      "status" TEXT NOT NULL DEFAULT 'approved',
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_questions_topic" ON "doctor_cbt"."question_bank"("topic_id");
    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_questions_status" ON "doctor_cbt"."question_bank"("status");

    -- 8. Assessment Blueprints
    CREATE TABLE IF NOT EXISTS "doctor_cbt"."assessment_blueprints" (
      "id" SERIAL PRIMARY KEY,
      "topic_id" INTEGER NOT NULL REFERENCES "doctor_cbt"."clinical_topics"("id") ON DELETE CASCADE,
      "title" TEXT NOT NULL,
      "exam_type" TEXT NOT NULL DEFAULT 'pre_test',
      "total_questions" INTEGER NOT NULL DEFAULT 20,
      "duration_minutes" INTEGER NOT NULL DEFAULT 30,
      "passing_percentage" NUMERIC(5, 2) NOT NULL DEFAULT 75.00,
      "has_negative_marking" BOOLEAN NOT NULL DEFAULT false,
      "negative_marking_penalty" NUMERIC(4, 2) NOT NULL DEFAULT 0.25,
      "max_attempts" INTEGER,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE "doctor_cbt"."assessment_blueprints" ADD COLUMN IF NOT EXISTS "exam_type" TEXT NOT NULL DEFAULT 'pre_test';

    -- 9. Exam Sessions (Candidate Test Attempts)
    CREATE TABLE IF NOT EXISTS "doctor_cbt"."exam_sessions" (
      "id" SERIAL PRIMARY KEY,
      "attempt_no" TEXT NOT NULL UNIQUE,
      "enrollment_id" INTEGER NOT NULL REFERENCES "doctor_cbt"."doctor_enrollments"("id") ON DELETE CASCADE,
      "blueprint_id" INTEGER NOT NULL REFERENCES "doctor_cbt"."assessment_blueprints"("id") ON DELETE CASCADE,
      "doctor_id" INTEGER NOT NULL REFERENCES "doctor_cbt"."doctor_profiles"("id") ON DELETE CASCADE,
      "exam_type" TEXT NOT NULL DEFAULT 'pre_test',
      "status" TEXT NOT NULL DEFAULT 'in_progress',
      "started_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "completed_at" TIMESTAMP,
      "time_spent_seconds" INTEGER NOT NULL DEFAULT 0,
      "score_percentage" NUMERIC(5, 2) DEFAULT 0,
      "raw_score" NUMERIC(6, 2) DEFAULT 0,
      "total_possible_marks" NUMERIC(6, 2) DEFAULT 0,
      "passed" BOOLEAN DEFAULT false,
      "correct_count" INTEGER DEFAULT 0,
      "incorrect_count" INTEGER DEFAULT 0,
      "unanswered_count" INTEGER DEFAULT 0,
      "question_snapshots" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "proctoring_flags" JSONB DEFAULT '[]'::jsonb,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE "doctor_cbt"."exam_sessions" ADD COLUMN IF NOT EXISTS "exam_type" TEXT NOT NULL DEFAULT 'pre_test';

    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_sessions_doctor" ON "doctor_cbt"."exam_sessions"("doctor_id");
    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_sessions_enrollment" ON "doctor_cbt"."exam_sessions"("enrollment_id");

    -- 10. Exam Session Answers
    CREATE TABLE IF NOT EXISTS "doctor_cbt"."exam_session_answers" (
      "id" SERIAL PRIMARY KEY,
      "session_id" INTEGER NOT NULL REFERENCES "doctor_cbt"."exam_sessions"("id") ON DELETE CASCADE,
      "question_id" INTEGER NOT NULL REFERENCES "doctor_cbt"."question_bank"("id") ON DELETE CASCADE,
      "selected_option_index" INTEGER,
      "is_correct" BOOLEAN,
      "marks_awarded" NUMERIC(5, 2) DEFAULT 0,
      "time_spent_seconds" INTEGER DEFAULT 0,
      "flagged_for_review" BOOLEAN DEFAULT false,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_answers_session" ON "doctor_cbt"."exam_session_answers"("session_id");

    -- 11. Doctor Certificates & Credentialing
    CREATE TABLE IF NOT EXISTS "doctor_cbt"."doctor_certificates" (
      "id" SERIAL PRIMARY KEY,
      "certificate_no" TEXT NOT NULL UNIQUE,
      "certificate_type" TEXT NOT NULL DEFAULT 'modular_topic',
      "enrollment_id" INTEGER NOT NULL REFERENCES "doctor_cbt"."doctor_enrollments"("id") ON DELETE CASCADE,
      "doctor_id" INTEGER NOT NULL REFERENCES "doctor_cbt"."doctor_profiles"("id") ON DELETE CASCADE,
      "topic_id" INTEGER REFERENCES "doctor_cbt"."clinical_topics"("id") ON DELETE SET NULL,
      "program_id" INTEGER NOT NULL REFERENCES "doctor_cbt"."programs"("id") ON DELETE CASCADE,
      "issue_date" DATE NOT NULL,
      "cme_credits_awarded" NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
      "verification_token" TEXT NOT NULL UNIQUE,
      "qr_code_payload" TEXT NOT NULL,
      "pdf_storage_path" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_certs_token" ON "doctor_cbt"."doctor_certificates"("verification_token");
    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_certs_doctor" ON "doctor_cbt"."doctor_certificates"("doctor_id");

    -- 12. Doctor Program Fee & Payment Transactions
    CREATE TABLE IF NOT EXISTS "doctor_cbt"."doctor_payments" (
      "id" SERIAL PRIMARY KEY,
      "doctor_id" INTEGER NOT NULL REFERENCES "doctor_cbt"."doctor_profiles"("id") ON DELETE CASCADE,
      "enrollment_id" INTEGER REFERENCES "doctor_cbt"."doctor_enrollments"("id") ON DELETE SET NULL,
      "candidate_id" TEXT,
      "receipt_no" TEXT,
      "payment_term" TEXT NOT NULL,
      "amount" NUMERIC(10, 2) NOT NULL,
      "payment_mode" TEXT NOT NULL,
      "transaction_id" TEXT,
      "payment_date" DATE NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'verified',
      "notes" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_payments_doctor" ON "doctor_cbt"."doctor_payments"("doctor_id");
    CREATE INDEX IF NOT EXISTS "idx_doctor_cbt_payments_candidate_id" ON "doctor_cbt"."doctor_payments"("candidate_id");
  `;

  await pool.query(ddl);

  // Initialize default module settings if not present
  const defaultSettings = [
    {
      key: "assigned_module_admins",
      value: JSON.stringify([]),
    },
    {
      key: "default_pass_percentage",
      value: JSON.stringify(75.0),
    },
    {
      key: "enable_google_whitelist",
      value: JSON.stringify(true),
    },
    {
      key: "default_negative_marking",
      value: JSON.stringify({ enabled: false, penalty: 0.25 }),
    },
  ];

  for (const s of defaultSettings) {
    await pool.query(
      `
      INSERT INTO "doctor_cbt"."module_settings" ("setting_key", "setting_value")
      VALUES ($1, $2::jsonb)
      ON CONFLICT ("setting_key") DO NOTHING
    `,
      [s.key, s.value]
    );
  }

  console.log("PostgreSQL 'doctor_cbt' schema and tables initialized successfully.");
}

// Allow direct CLI execution: tsx server/db/setup-doctor-cbt-db.ts
if (process.argv[1]?.endsWith("setup-doctor-cbt-db.ts")) {
  createDoctorCbtSchemaAndTables()
    .then(() => {
      console.log("Doctor CBT DB setup completed.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Failed to setup Doctor CBT database:", err);
      process.exit(1);
    });
}
