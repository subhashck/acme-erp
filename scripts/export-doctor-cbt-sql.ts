import fs from "fs";
import path from "path";

// Helper to escape single quotes for SQL string literals
function sqlStr(str: string | null | undefined): string {
  if (str === null || str === undefined) return "NULL";
  return `'${String(str).replace(/'/g, "''")}'`;
}

function sqlJson(obj: any): string {
  if (obj === null || obj === undefined) return "'[]'::jsonb";
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

async function run() {
  const setupFile = fs.readFileSync("server/db/setup-doctor-cbt-db.ts", "utf8");
  const ddlStart = setupFile.indexOf("const ddl = `") + "const ddl = `".length;
  const ddlEnd = setupFile.indexOf("`;\n\n  await pool.query(ddl);");
  const ddl = setupFile.slice(ddlStart, ddlEnd).trim();

  let sql = `-- ===========================================================================\n`;
  sql += `-- ACME ERP: Doctor Skill Upgradation (CBT) Module Full Production Migration\n`;
  sql += `-- Target: PostgreSQL 14+\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- Idempotent: Can be safely re-run without affecting existing hospital data\n`;
  sql += `-- ===========================================================================\n\n`;

  sql += `BEGIN;\n\n`;

  sql += `-- ===========================================================================\n`;
  sql += `-- STEP 1: DDL — CREATE SCHEMA, TABLES, ALTERATIONS & INDEXES\n`;
  sql += `-- ===========================================================================\n\n`;
  sql += ddl + "\n\n";

  sql += `-- ===========================================================================\n`;
  sql += `-- STEP 2: DEFAULT MODULE CONFIGURATION SETTINGS\n`;
  sql += `-- ===========================================================================\n\n`;
  sql += `INSERT INTO "doctor_cbt"."module_settings" ("setting_key", "setting_value")\nVALUES\n`;
  sql += `  ('assigned_module_admins', '[]'::jsonb),\n`;
  sql += `  ('default_pass_percentage', '75.0'::jsonb),\n`;
  sql += `  ('enable_google_whitelist', 'true'::jsonb),\n`;
  sql += `  ('default_negative_marking', '{"enabled": false, "penalty": 0.25}'::jsonb)\n`;
  sql += `ON CONFLICT ("setting_key") DO NOTHING;\n\n`;

  sql += `-- ===========================================================================\n`;
  sql += `-- STEP 3: PROGRAM MASTER — BASIC COURSE IN REPRODUCTIVE MEDICINE\n`;
  sql += `-- ===========================================================================\n\n`;
  sql += `INSERT INTO "doctor_cbt"."programs" ("code", "title", "specialty", "duration_months", "total_cme_credits", "description", "active")\n`;
  sql += `VALUES (\n`;
  sql += `  'ACME-BRM-2601',\n`;
  sql += `  'Basic Course in Reproductive Medicine',\n`;
  sql += `  'Reproductive Medicine & Infertility (OBGY)',\n`;
  sql += `  6,\n`;
  sql += `  15.00,\n`;
  sql += `  'Comprehensive clinical skill upgradation program covering infertility workup, ovarian physiology, andrology, ovulation induction, IUI, embryology foundations, IVF/ICSI, and ART (Regulation) Act 2021.',\n`;
  sql += `  true\n`;
  sql += `)\nON CONFLICT ("code") DO UPDATE SET\n`;
  sql += `  "title" = EXCLUDED."title",\n`;
  sql += `  "specialty" = EXCLUDED."specialty",\n`;
  sql += `  "duration_months" = EXCLUDED."duration_months",\n`;
  sql += `  "total_cme_credits" = EXCLUDED."total_cme_credits",\n`;
  sql += `  "description" = EXCLUDED."description",\n`;
  sql += `  "active" = true,\n`;
  sql += `  "updated_at" = NOW();\n\n`;

  sql += `-- ===========================================================================\n`;
  sql += `-- STEP 4: CLINICAL CURRICULUM TOPICS (10 Modules)\n`;
  sql += `-- ===========================================================================\n\n`;
  sql += `INSERT INTO "doctor_cbt"."clinical_topics" ("program_id", "code", "title", "description", "cme_credits", "display_order", "active")\n`;
  sql += `SELECT p.id, t.code, t.title, t.description, t.cme_credits, t.display_order, true\n`;
  sql += `FROM "doctor_cbt"."programs" p,\n`;
  sql += `(VALUES\n`;
  sql += `  ('BCRM-TOPIC-01', 'Infertility Definition, Evaluation & Tubal Patency', 'Definition of infertility, primary vs secondary, initial diagnostic workup, Pelvic Inflammatory Disease risk, and HSG.', 1.50, 1),\n`;
  sql += `  ('BCRM-TOPIC-02', 'Reproductive Physiology & Ovarian Endocrinology', 'Pituitary-ovarian axis, LH surge, FSH folliculogenesis, ampullary fertilisation site, and luteal progesterone secretion.', 1.50, 2),\n`;
  sql += `  ('BCRM-TOPIC-03', 'Male Infertility, Andrology & Semen Analysis', 'Testicular spermatogenesis, epididymal maturation, WHO semen analysis, asthenozoospermia, azoospermia, and DNA fragmentation index (DFI).', 1.50, 3),\n`;
  sql += `  ('BCRM-TOPIC-04', 'Female Etiologies: PCOS, Endometriosis & Tubal Factor', 'Polycystic ovary syndrome, ovulatory dysfunction symptoms, endometriosis presentation, bilateral tubal obstruction, and thyroid function (TSH).', 1.50, 4),\n`;
  sql += `  ('BCRM-TOPIC-05', 'Clinical Pelvic Ultrasonography in Infertility', 'Transvaginal sonography (TVS), antral follicle count (AFC), normal menstrual endometrium pattern, sonohysterography, and ovarian volume.', 1.50, 5),\n`;
  sql += `  ('BCRM-TOPIC-06', 'Ovulation Induction Strategies & Monitoring', 'Aims of ovulation induction, Letrozole in PCOS, serial follicular tracking, hCG maturation triggers, and OHSS prevention.', 1.50, 6),\n`;
  sql += `  ('BCRM-TOPIC-07', 'Intrauterine Insemination (IUI) & Sperm Processing', 'Sperm washing/preparation, uterine placement mechanics, clinical eligibility (tubal patency), and multi-follicular multiple pregnancy risks.', 1.50, 7),\n`;
  sql += `  ('BCRM-TOPIC-08', 'Cryopreservation & Embryology Laboratory Foundations', 'Gamete/embryo cryopreservation, ultra-rapid vitrification, syngamy, Day 5-6 blastocyst morphology, and embryology lab cleanroom standards.', 1.50, 8),\n`;
  sql += `  ('BCRM-TOPIC-09', 'Assisted Reproductive Technology (IVF & ICSI)', 'In Vitro Fertilisation (IVF) culture system, controlled ovarian stimulation, ultrasound-guided embryo transfer, and Intracytoplasmic Sperm Injection (ICSI).', 1.50, 9),\n`;
  sql += `  ('BCRM-TOPIC-10', 'Ethics, Patient Counselling & ART (Regulation) Act, 2021', 'Voluntary informed consent, reproductive record confidentiality, pre-ART psychological counselling, autonomy, and Assisted Reproductive Technology (Regulation) Act, 2021 statutory mandates.', 1.50, 10)\n`;
  sql += `) AS t(code, title, description, cme_credits, display_order)\n`;
  sql += `WHERE p.code = 'ACME-BRM-2601'\n`;
  sql += `ON CONFLICT ("code") DO UPDATE SET\n`;
  sql += `  "title" = EXCLUDED."title",\n`;
  sql += `  "description" = EXCLUDED."description",\n`;
  sql += `  "cme_credits" = EXCLUDED."cme_credits",\n`;
  sql += `  "display_order" = EXCLUDED."display_order",\n`;
  sql += `  "active" = true,\n`;
  sql += `  "updated_at" = NOW();\n\n`;

  sql += `-- ===========================================================================\n`;
  sql += `-- STEP 5: ASSESSMENT BLUEPRINTS (Pre-Test & Exit-Test Exams)\n`;
  sql += `-- ===========================================================================\n\n`;
  sql += `INSERT INTO "doctor_cbt"."assessment_blueprints" (\n`;
  sql += `  "topic_id", "title", "exam_type", "total_questions", "duration_minutes",\n`;
  sql += `  "passing_percentage", "has_negative_marking", "negative_marking_penalty",\n`;
  sql += `  "max_attempts", "active"\n`;
  sql += `)\n`;
  sql += `SELECT t.id, bp.title, bp.exam_type, bp.total_questions, bp.duration_minutes,\n`;
  sql += `       bp.passing_percentage, bp.has_negative_marking, bp.negative_marking_penalty,\n`;
  sql += `       bp.max_attempts, true\n`;
  sql += `FROM "doctor_cbt"."clinical_topics" t,\n`;
  sql += `(VALUES\n`;
  sql += `  ('Basic Course in Reproductive Medicine - Pre-Test Assessment', 'pre_test', 50, 20, 70.00, false, 0.00, 1),\n`;
  sql += `  ('Basic Course in Reproductive Medicine - Exit-Test Certification Exam', 'exit_test', 50, 20, 70.00, false, 0.00, 1)\n`;
  sql += `) AS bp(title, exam_type, total_questions, duration_minutes, passing_percentage, has_negative_marking, negative_marking_penalty, max_attempts)\n`;
  sql += `WHERE t.code = 'BCRM-TOPIC-01'\n`;
  sql += `ON CONFLICT DO NOTHING;\n\n`;

  // Dynamic extract of 50 questions from seed file
  const seedSrc = fs.readFileSync("server/db/seed-doctor-cbt-dev.ts", "utf8");
  const qStart = seedSrc.indexOf("const rawQuestions = [");
  const qEnd = seedSrc.indexOf("const stripOptionPrefix =");
  const rawQBlock = seedSrc.slice(qStart, qEnd);
  // evaluate rawQuestions safely
  const evalQuestions = new Function(`${rawQBlock}; return rawQuestions;`)();

  sql += `-- ===========================================================================\n`;
  sql += `-- STEP 6: 50 CLINICAL MCQS WITH VIGNETTES, OPTIONS & EVIDENCE EXPLANATIONS\n`;
  sql += `-- ===========================================================================\n\n`;

  const stripOptionPrefix = (opt: string) =>
    typeof opt === "string" ? opt.replace(/^(\([A-Da-d]\)|[A-Da-d][.)])\s*/, "") : opt;

  for (const q of evalQuestions) {
    const code = `BCRM-Q${q.num.toString().padStart(2, "0")}`;
    const sanitizedOptions = q.options.map(stripOptionPrefix);
    sql += `INSERT INTO "doctor_cbt"."question_bank" (\n`;
    sql += `  "code", "topic_id", "difficulty", "cognitive_level", "clinical_vignette",\n`;
    sql += `  "attachments", "question_prompt", "options", "correct_option_index",\n`;
    sql += `  "clinical_explanation", "status", "active"\n`;
    sql += `)\n`;
    sql += `SELECT ${sqlStr(code)}, t.id, 'core', 'clinical_management', ${sqlStr(q.prompt)},\n`;
    sql += `       '[]'::jsonb, ${sqlStr(q.prompt)}, ${sqlJson(sanitizedOptions)}, ${q.key},\n`;
    sql += `       ${sqlStr(q.explanation)}, 'approved', true\n`;
    sql += `FROM "doctor_cbt"."clinical_topics" t\n`;
    sql += `WHERE t.code = ${sqlStr(q.topicCode)}\n`;
    sql += `ON CONFLICT ("code") DO UPDATE SET\n`;
    sql += `  "clinical_vignette" = EXCLUDED."clinical_vignette",\n`;
    sql += `  "question_prompt" = EXCLUDED."question_prompt",\n`;
    sql += `  "options" = EXCLUDED."options",\n`;
    sql += `  "correct_option_index" = EXCLUDED."correct_option_index",\n`;
    sql += `  "clinical_explanation" = EXCLUDED."clinical_explanation",\n`;
    sql += `  "status" = 'approved',\n`;
    sql += `  "active" = true,\n`;
    sql += `  "updated_at" = NOW();\n\n`;
  }

  // Dynamic extract of candidates
  const cStart = seedSrc.indexOf("const attachedCandidates = [");
  const cEnd = seedSrc.indexOf("];", cStart) + 2;
  const rawCBlock = seedSrc.slice(cStart, cEnd).replace(/\s+as const/g, "");
  const evalCandidates = new Function(`${rawCBlock}; return attachedCandidates;`)();

  sql += `-- ===========================================================================\n`;
  sql += `-- STEP 7: DOCTOR CANDIDATE PROFILES, ENROLLMENTS & VERIFIED PAYMENTS\n`;
  sql += `-- ===========================================================================\n\n`;

  for (const c of evalCandidates) {
    const cleanEmail = c.email.trim().toLowerCase();
    // 1. User account insert
    sql += `-- Candidate: ${c.fullName} (${c.candidateId})\n`;
    sql += `INSERT INTO "user" ("id", "name", "email", "emailVerified", "role", "mustChangePassword", "createdAt", "updatedAt")\n`;
    sql += `VALUES (gen_random_uuid()::text, ${sqlStr(c.fullName)}, ${sqlStr(cleanEmail)}, true, 'doctor_candidate', false, NOW(), NOW())\n`;
    sql += `ON CONFLICT ("email") DO UPDATE SET "role" = CASE WHEN "user"."role" = 'admin' THEN "user"."role" ELSE 'doctor_candidate' END;\n\n`;

    // 2. Doctor profile insert
    sql += `INSERT INTO "doctor_cbt"."doctor_profiles" (\n`;
    sql += `  "user_id", "candidate_id", "full_name", "email", "mobile", "address",\n`;
    sql += `  "university_institute", "year_of_passing", "experience", "primary_specialty",\n`;
    sql += `  "institution_name", "candidate_type", "status"\n`;
    sql += `)\n`;
    sql += `SELECT u.id, ${sqlStr(c.candidateId)}, ${sqlStr(c.fullName)}, ${sqlStr(cleanEmail)}, ${sqlStr(c.mobile)}, ${sqlStr(c.address)},\n`;
    sql += `       ${sqlStr(c.universityInstitute)}, ${sqlStr(c.yearOfPass)}, ${sqlStr(c.experience)}, ${sqlStr(c.primarySpecialty)},\n`;
    sql += `       ${sqlStr(c.institutionName)}, 'external_trainee', 'enrolled'\n`;
    sql += `FROM "user" u WHERE LOWER(TRIM(u.email)) = ${sqlStr(cleanEmail)}\n`;
    sql += `ON CONFLICT ("email") DO UPDATE SET\n`;
    sql += `  "candidate_id" = EXCLUDED."candidate_id",\n`;
    sql += `  "full_name" = EXCLUDED."full_name",\n`;
    sql += `  "mobile" = EXCLUDED."mobile",\n`;
    sql += `  "address" = EXCLUDED."address",\n`;
    sql += `  "university_institute" = EXCLUDED."university_institute",\n`;
    sql += `  "year_of_passing" = EXCLUDED."year_of_passing",\n`;
    sql += `  "experience" = EXCLUDED."experience",\n`;
    sql += `  "primary_specialty" = EXCLUDED."primary_specialty",\n`;
    sql += `  "institution_name" = EXCLUDED."institution_name",\n`;
    sql += `  "status" = 'enrolled',\n`;
    sql += `  "updated_at" = NOW();\n\n`;

    // 3. Program enrollment
    sql += `INSERT INTO "doctor_cbt"."doctor_enrollments" ("doctor_id", "program_id", "batch_code", "status")\n`;
    sql += `SELECT dp.id, p.id, 'ACME-BRM-2601', 'enrolled'\n`;
    sql += `FROM "doctor_cbt"."doctor_profiles" dp, "doctor_cbt"."programs" p\n`;
    sql += `WHERE LOWER(TRIM(dp.email)) = ${sqlStr(cleanEmail)} AND p.code = 'ACME-BRM-2601'\n`;
    sql += `ON CONFLICT ("doctor_id", "program_id", "batch_code") DO NOTHING;\n\n`;

    // 4. Payment record
    sql += `INSERT INTO "doctor_cbt"."doctor_payments" (\n`;
    sql += `  "doctor_id", "enrollment_id", "candidate_id", "payment_term", "amount",\n`;
    sql += `  "payment_mode", "transaction_id", "payment_date", "status", "notes"\n`;
    sql += `)\n`;
    sql += `SELECT dp.id, de.id, ${sqlStr(c.candidateId)}, ${sqlStr(c.paymentTerm)}, ${c.receivedAmount},\n`;
    sql += `       ${sqlStr(c.paymentMode)}, ${sqlStr(c.transactionId)}, ${sqlStr(c.paymentDate)}::date, 'verified',\n`;
    sql += `       ${sqlStr(`Recorded from Candidate Payment Status Sheet (${c.candidateId})`)}\n`;
    sql += `FROM "doctor_cbt"."doctor_profiles" dp\n`;
    sql += `JOIN "doctor_cbt"."doctor_enrollments" de ON de.doctor_id = dp.id\n`;
    sql += `WHERE LOWER(TRIM(dp.email)) = ${sqlStr(cleanEmail)}\n`;
    sql += `  AND NOT EXISTS (\n`;
    sql += `    SELECT 1 FROM "doctor_cbt"."doctor_payments" p\n`;
    sql += `    WHERE p.doctor_id = dp.id AND p.payment_date = ${sqlStr(c.paymentDate)}::date\n`;
    sql += `  );\n\n`;
  }

  sql += `COMMIT;\n`;

  fs.writeFileSync("server/db/doctor-cbt-production-migration.sql", sql, "utf8");
  console.log("Full SQL migration generated: server/db/doctor-cbt-production-migration.sql");
  console.log("Total bytes:", sql.length);
}

run().catch(console.error);
