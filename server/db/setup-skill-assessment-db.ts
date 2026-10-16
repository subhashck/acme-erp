import { pool } from "./client.ts";
import { migrateExamQuestionMix } from "./migrate-exam-question-mix.ts";

export async function createSkillAssessmentSchemaAndTables() {
  console.log("Setting up and verifying PostgreSQL 'skill_assessment' schema and tables...");

  const ddl = `
    CREATE SCHEMA IF NOT EXISTS "skill_assessment";

    -- 1. Competency Domains Master
    CREATE TABLE IF NOT EXISTS "skill_assessment"."competency_domains" (
      "id" SERIAL PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "name" TEXT NOT NULL,
      "nabh_standard_ref" TEXT,
      "description" TEXT,
      "display_order" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 2. Competency Criteria / Objectives (Theoretical & Practical)
    CREATE TABLE IF NOT EXISTS "skill_assessment"."competency_criteria" (
      "id" SERIAL PRIMARY KEY,
      "domain_id" INTEGER NOT NULL REFERENCES "skill_assessment"."competency_domains"("id") ON DELETE CASCADE,
      "code" TEXT NOT NULL UNIQUE,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "clinical_scenario" TEXT,
      "skill_type" TEXT NOT NULL DEFAULT 'both',
      "theoretical_guideline" TEXT NOT NULL,
      "practical_guideline" TEXT NOT NULL,
      "target_score" NUMERIC(4, 2) NOT NULL DEFAULT 4.00,
      "weightage" NUMERIC(4, 2) NOT NULL DEFAULT 1.00,
      "display_order" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE "skill_assessment"."competency_criteria" ADD COLUMN IF NOT EXISTS "clinical_scenario" TEXT;

    -- 3. Assessment Cycles
    CREATE TABLE IF NOT EXISTS "skill_assessment"."assessment_cycles" (
      "id" SERIAL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "year" INTEGER NOT NULL DEFAULT 2026,
      "quarter" TEXT DEFAULT 'Annual',
      "start_date" DATE NOT NULL,
      "end_date" DATE NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "description" TEXT,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 4. Staff Skill Assessments Header
    CREATE TABLE IF NOT EXISTS "skill_assessment"."staff_skill_assessments" (
      "id" SERIAL PRIMARY KEY,
      "assessment_no" TEXT NOT NULL UNIQUE,
      "cycle_id" INTEGER REFERENCES "skill_assessment"."assessment_cycles"("id") ON DELETE SET NULL,
      "staff_id" INTEGER NOT NULL,
      "department_id" INTEGER NOT NULL,
      "designation" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'draft',
      
      -- Self Assessment
      "self_assessed_at" TIMESTAMP,
      "self_overall_score" NUMERIC(5, 2) DEFAULT 0,
      "self_theoretical_score" NUMERIC(5, 2) DEFAULT 0,
      "self_practical_score" NUMERIC(5, 2) DEFAULT 0,
      "self_remarks" TEXT,

      -- Dept Incharge Assessment
      "incharge_staff_id" INTEGER,
      "incharge_assessed_at" TIMESTAMP,
      "incharge_overall_score" NUMERIC(5, 2) DEFAULT 0,
      "incharge_theoretical_score" NUMERIC(5, 2) DEFAULT 0,
      "incharge_practical_score" NUMERIC(5, 2) DEFAULT 0,
      "incharge_decision" TEXT,
      "incharge_remarks" TEXT,

      -- Nursing Supervisor Verification
      "nursing_super_staff_id" INTEGER,
      "nursing_super_assessed_at" TIMESTAMP,
      "nursing_super_overall_score" NUMERIC(5, 2) DEFAULT 0,
      "nursing_super_theoretical_score" NUMERIC(5, 2) DEFAULT 0,
      "nursing_super_practical_score" NUMERIC(5, 2) DEFAULT 0,
      "nursing_super_decision" TEXT,
      "nursing_super_remarks" TEXT,
      "clinical_strengths" TEXT,
      "improvement_areas" TEXT,

      -- HR Sign-Off
      "hr_user_id" TEXT,
      "hr_completed_at" TIMESTAMP,
      "final_score" NUMERIC(5, 2) DEFAULT 0,
      "competency_level" TEXT,
      "hr_decision" TEXT,
      "assigned_trainings" JSONB DEFAULT '[]'::jsonb,
      "next_assessment_due_date" DATE,
      "start_date" DATE,
      "end_date" DATE,
      "hr_remarks" TEXT,

      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE "skill_assessment"."staff_skill_assessments" ADD COLUMN IF NOT EXISTS "start_date" DATE;
    ALTER TABLE "skill_assessment"."staff_skill_assessments" ADD COLUMN IF NOT EXISTS "end_date" DATE;

    -- 5. Staff Skill Assessment Line Items
    CREATE TABLE IF NOT EXISTS "skill_assessment"."staff_skill_assessment_items" (
      "id" SERIAL PRIMARY KEY,
      "assessment_id" INTEGER NOT NULL REFERENCES "skill_assessment"."staff_skill_assessments"("id") ON DELETE CASCADE,
      "criterion_id" INTEGER NOT NULL REFERENCES "skill_assessment"."competency_criteria"("id") ON DELETE CASCADE,
      "self_theoretical_score" NUMERIC(4, 2) DEFAULT 0,
      "self_practical_score" NUMERIC(4, 2) DEFAULT 0,
      "self_comments" TEXT,
      "incharge_theoretical_score" NUMERIC(4, 2) DEFAULT 0,
      "incharge_practical_score" NUMERIC(4, 2) DEFAULT 0,
      "incharge_comments" TEXT,
      "nursing_super_theoretical_score" NUMERIC(4, 2) DEFAULT 0,
      "nursing_super_practical_score" NUMERIC(4, 2) DEFAULT 0,
      "nursing_super_comments" TEXT,
      "is_satisfactory" BOOLEAN DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 6. Theoretical Question Bank
    CREATE TABLE IF NOT EXISTS "skill_assessment"."theoretical_questions" (
      "id" SERIAL PRIMARY KEY,
      "code" TEXT NOT NULL UNIQUE,
      "domain_code" TEXT NOT NULL,
      "question" TEXT NOT NULL,
      "options" JSONB NOT NULL,
      "correct_option_index" INTEGER NOT NULL,
      "explanation" TEXT,
      "department_tags" JSONB DEFAULT '[]'::jsonb,
      "difficulty" TEXT NOT NULL DEFAULT 'medium',
      "default_time_seconds" INTEGER NOT NULL DEFAULT 60,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 7. Exam Configuration
    CREATE TABLE IF NOT EXISTS "skill_assessment"."exam_configs" (
      "id" SERIAL PRIMARY KEY,
      "title" TEXT NOT NULL DEFAULT 'Clinical Staff NABH Theoretical Examination',
      "total_questions" INTEGER NOT NULL DEFAULT 20,
      "total_time_seconds" INTEGER NOT NULL DEFAULT 1200,
      "per_question_time_seconds" INTEGER NOT NULL DEFAULT 60,
      "pass_percentage" NUMERIC(4, 2) NOT NULL DEFAULT 60.00,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    -- 8. Online Exam Attempts
    CREATE TABLE IF NOT EXISTS "skill_assessment"."exam_attempts" (
      "id" SERIAL PRIMARY KEY,
      "attempt_no" TEXT NOT NULL UNIQUE,
      "assessment_id" INTEGER REFERENCES "skill_assessment"."staff_skill_assessments"("id") ON DELETE SET NULL,
      "staff_id" INTEGER NOT NULL,
      "department_id" INTEGER,
      "department_name" TEXT,
      "status" TEXT NOT NULL DEFAULT 'in_progress',
      "total_questions" INTEGER NOT NULL DEFAULT 20,
      "total_time_seconds" INTEGER NOT NULL DEFAULT 1200,
      "per_question_time_seconds" INTEGER NOT NULL DEFAULT 60,
      "started_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "completed_at" TIMESTAMP,
      "time_spent_seconds" INTEGER DEFAULT 0,
      "score" NUMERIC(5, 2) DEFAULT 0,
      "theoretical_rating" NUMERIC(4, 2) DEFAULT 0,
      "correct_count" INTEGER DEFAULT 0,
      "incorrect_count" INTEGER DEFAULT 0,
      "unanswered_count" INTEGER DEFAULT 0,
      "question_ids" JSONB NOT NULL,
      "answers" JSONB DEFAULT '{}'::jsonb,
      "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
      "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
    );

    ALTER TABLE "skill_assessment"."exam_configs" ALTER COLUMN "pass_percentage" TYPE NUMERIC(5, 2);
    ALTER TABLE "skill_assessment"."exam_attempts" ADD COLUMN IF NOT EXISTS "question_snapshot" JSONB;
    ALTER TABLE "skill_assessment"."exam_attempts" ADD COLUMN IF NOT EXISTS "pass_percentage" NUMERIC(5, 2) NOT NULL DEFAULT 60.00;

    -- Legacy attempts have no original version. Freeze the currently available
    -- content once; future edits must never change an existing attempt.
    UPDATE "skill_assessment"."exam_attempts" a
    SET "question_snapshot" = (
      SELECT jsonb_agg(jsonb_build_object(
        'id', q.id, 'code', q.code, 'domainCode', q.domain_code,
        'question', q.question, 'options', q.options,
        'correctOptionIndex', q.correct_option_index, 'explanation', q.explanation,
        'difficulty', q.difficulty, 'defaultTimeSeconds', q.default_time_seconds
      ) ORDER BY ids.position)
      FROM jsonb_array_elements_text(a.question_ids) WITH ORDINALITY AS ids(id, position)
      JOIN "skill_assessment"."theoretical_questions" q ON q.id = ids.id::integer
    )
    WHERE a.question_snapshot IS NULL;

    -- Indices for high performance
    CREATE INDEX IF NOT EXISTS "idx_skill_staff_assessments_staff" ON "skill_assessment"."staff_skill_assessments" ("staff_id");
    CREATE INDEX IF NOT EXISTS "idx_skill_staff_assessments_dept" ON "skill_assessment"."staff_skill_assessments" ("department_id");
    CREATE INDEX IF NOT EXISTS "idx_skill_staff_assessments_status" ON "skill_assessment"."staff_skill_assessments" ("status");
    CREATE INDEX IF NOT EXISTS "idx_skill_staff_assessments_cycle" ON "skill_assessment"."staff_skill_assessments" ("cycle_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_skill_staff_cycle_unique" ON "skill_assessment"."staff_skill_assessments" ("staff_id", "cycle_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "idx_skill_cycles_title_unique" ON "skill_assessment"."assessment_cycles" ("title");
    CREATE INDEX IF NOT EXISTS "idx_skill_items_assessment" ON "skill_assessment"."staff_skill_assessment_items" ("assessment_id");
    CREATE INDEX IF NOT EXISTS "idx_skill_items_criterion" ON "skill_assessment"."staff_skill_assessment_items" ("criterion_id");
    CREATE INDEX IF NOT EXISTS "idx_skill_exam_questions_domain" ON "skill_assessment"."theoretical_questions" ("domain_code");
    CREATE INDEX IF NOT EXISTS "idx_skill_exam_attempts_staff" ON "skill_assessment"."exam_attempts" ("staff_id");
    CREATE INDEX IF NOT EXISTS "idx_skill_exam_attempts_assessment" ON "skill_assessment"."exam_attempts" ("assessment_id");

    -- PostgreSQL Sequences for robust, collision-free numbering
    CREATE SEQUENCE IF NOT EXISTS "skill_assessment"."staff_skill_assessments_seq";
    CREATE SEQUENCE IF NOT EXISTS "skill_assessment"."exam_attempts_seq";
  `;

  await pool.query(ddl);
  await migrateExamQuestionMix(pool);

  // Synchronize sequences to highest existing values so nextval never collides
  await pool.query(`
    SELECT setval(
      'skill_assessment.staff_skill_assessments_seq',
      GREATEST(
        COALESCE(
          (SELECT MAX(SUBSTRING(assessment_no FROM 'SKL-[0-9]{4}-([0-9]+)')::integer) 
           FROM "skill_assessment"."staff_skill_assessments"), 
          0
        ), 
        1
      )
    );
    SELECT setval(
      'skill_assessment.exam_attempts_seq',
      GREATEST(
        COALESCE(
          (SELECT MAX(SUBSTRING(attempt_no FROM 'EXAM-[0-9]{4}-([0-9]+)')::integer) 
           FROM "skill_assessment"."exam_attempts"), 
          0
        ), 
        1
      )
    );
  `);

  console.log("PostgreSQL 'skill_assessment' schema, tables, and sequences ready.");

  // Seed NABH competency guidelines and default active cycle
  await seedNabhGuidelines();
  await seedTheoreticalQuestionsAndExamConfig();
}

async function seedNabhGuidelines() {
  console.log("Seeding NABH Clinical Skill Assessment Guidelines & Rubrics...");

  // Default Active Cycle
  await pool.query(`
    INSERT INTO "skill_assessment"."assessment_cycles" ("title", "year", "quarter", "start_date", "end_date", "status", "description")
    VALUES (
      'Annual NABH Clinical Staff Competency Audit 2026',
      2026,
      'Annual',
      '2026-01-01',
      '2026-12-31',
      'active',
      'Hospital-wide mandatory clinical & nursing competency assessment measuring theoretical and practical skills under NABH 5th Edition Standards.'
    )
    ON CONFLICT ("title") DO NOTHING;
  `);

  // Domain definitions
  const domains = [
    {
      code: "HIC",
      name: "Hospital Infection Control (HIC)",
      nabh: "NABH 5th Ed: HIC.2, HIC.3, HIC.4",
      desc: "Infection prevention practices, aseptic techniques, personal protection, and biomedical waste management.",
      order: 1,
    },
    {
      code: "PSQ",
      name: "Patient Safety & Rights (PSQ / PRE)",
      nabh: "NABH 5th Ed: PSQ.1, PRE.2, PRE.3",
      desc: "Patient identification, fall risk mitigation, pressure ulcer care, and vulnerable patient protection.",
      order: 2,
    },
    {
      code: "MOM",
      name: "Medication Administration & Safety (MOM)",
      nabh: "NABH 5th Ed: MOM.5, MOM.6, MOM.7",
      desc: "Safe medication practices, LASA / High-alert medications, dosage calculations, and adverse event reporting.",
      order: 3,
    },
    {
      code: "COP_BLS",
      name: "Emergency Care & Resuscitation (COP / BLS)",
      nabh: "NABH 5th Ed: COP.3, COP.4",
      desc: "Basic Life Support (BLS), CPR sequence, crash cart management, and Code Blue emergency activation.",
      order: 4,
    },
    {
      code: "PROCEDURES",
      name: "Core Clinical Procedures & Nursing Care",
      nabh: "NABH 5th Ed: COP.5, COP.6, HIC.5",
      desc: "Peripheral IV line care, Foley catheterization, NG tube insertion, and blood transfusion protocols.",
      order: 5,
    },
    {
      code: "DOC_COMM",
      name: "Clinical Documentation & Handover Communication",
      nabh: "NABH 5th Ed: HRM.3, HRM.4, AAC.2",
      desc: "ISBAR clinical handover, nursing care plans, critical value read-back, and incident reporting.",
      order: 6,
    },
  ];

  for (const d of domains) {
    await pool.query(
      `
      INSERT INTO "skill_assessment"."competency_domains" ("code", "name", "nabh_standard_ref", "description", "display_order")
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT ("code") DO UPDATE
      SET "name" = EXCLUDED."name",
          "nabh_standard_ref" = EXCLUDED."nabh_standard_ref",
          "description" = EXCLUDED."description",
          "display_order" = EXCLUDED."display_order";
    `,
      [d.code, d.name, d.nabh, d.desc, d.order]
    );
  }

  // Fetch domain IDs
  const domainRows = await pool.query(`SELECT id, code FROM "skill_assessment"."competency_domains"`);
  const domainMap = new Map<string, number>();
  for (const r of domainRows.rows) {
    domainMap.set(r.code, r.id);
  }

  // Comprehensive NABH Clinical Skill Assessment Guidelines (measuring theoretical + practical)
  const criteria = [
    // --- 1. Hospital Infection Control ---
    {
      domainCode: "HIC",
      code: "HIC-01",
      title: "Five Moments of Hand Hygiene & Hand Rub Technique",
      desc: "Adherence to WHO 5 Moments of Hand Hygiene and demonstration of 6-step hand washing / hand rub technique.",
      skillType: "both",
      theoretical: "Able to state all 5 WHO hand hygiene moments (before patient touch, before aseptic procedure, after body fluid exposure, after patient touch, after touching surroundings) and minimum contact time (20-30s rub, 40-60s wash).",
      practical: "Flawless demonstration of the 6 WHO hand hygiene steps (palm to palm, interlaced, dorsum, knuckles, thumbs, fingernails) in correct order with adequate rub volume and drying.",
      order: 1,
    },
    {
      domainCode: "HIC",
      code: "HIC-02",
      title: "Personal Protective Equipment (PPE) Donning & Doffing",
      desc: "Correct selection and step-by-step donning and doffing sequence for gloves, mask/N95, gown, and eye protection.",
      skillType: "both",
      theoretical: "Explains standard and transmission-based precautions (contact, droplet, airborne) and rationale for sequential doffing to prevent self-contamination.",
      practical: "Demonstrates correct sequence of donning (gown -> mask -> eye wear -> gloves) and doffing (gloves -> gown -> eye wear -> mask) followed by immediate hand hygiene.",
      order: 2,
    },
    {
      domainCode: "HIC",
      code: "HIC-03",
      title: "Biomedical Waste (BMW) Color Coding & Segregation",
      desc: "NABH and national BMW rules for segregation into Yellow, Red, Blue, and White translucent containers.",
      skillType: "both",
      theoretical: "Correctly identifies waste categories for Yellow (anatomical, soiled cotton, expired drugs), Red (tubings, IV bottles, catheters), White (sharps, needles), and Blue (glassware, ampoules, implants).",
      practical: "Accurately discards clinical items into designated color-coded bins at the point of generation without cross-contamination or needle recapping.",
      order: 3,
    },
    {
      domainCode: "HIC",
      code: "HIC-04",
      title: "Needle Stick Injury (NSI) & Spill Management",
      desc: "Immediate management of occupational exposure to blood/body fluids and chemical/mercury spill protocols.",
      skillType: "both",
      theoretical: "Explains immediate first aid for NSI (wash with soap & water under running tap, no squeezing/bleeding), PEP timeline (<2 hours), and reporting to ICN/Infection Control Committee.",
      practical: "Demonstrates body fluid spill management using spill kit: PPE application, covering with absorbent tissue, 1% sodium hypochlorite 20-min contact, and disposal into yellow bag.",
      order: 4,
    },
    {
      domainCode: "HIC",
      code: "HIC-05",
      title: "Care Bundles (CAUTI, CLABSI, VAP Prevention)",
      desc: "Implementation of evidence-based infection prevention bundles for indwelling medical devices.",
      skillType: "both",
      theoretical: "Explains core elements of CAUTI bundle (daily need review, sterile insertion, closed drainage below bladder) and CLABSI bundle (maximal barrier precautions, chlorhexidine skin prep).",
      practical: "Performs catheter toilet with soap/water, maintains tamper-evident seal, ensures unobstructed drainage, and documents daily bundle checklist.",
      order: 5,
    },

    // --- 2. Patient Safety & Rights ---
    {
      domainCode: "PSQ",
      code: "PSQ-01",
      title: "Two-Patient Identifiers Verification Protocol",
      desc: "Verification of patient identity using two unique identifiers prior to medications, investigations, and procedures.",
      skillType: "both",
      theoretical: "Identifies the two approved hospital identifiers (Full Patient Name and UHID / IPD No.) and cites why room/bed number must NEVER be used.",
      practical: "Actively cross-verifies ID band details with patient verbal confirmation and MAR/treatment chart before administering medication or collecting sample.",
      order: 1,
    },
    {
      domainCode: "PSQ",
      code: "PSQ-02",
      title: "Morse Fall Scale Assessment & Fall Prevention",
      desc: "Assessment of fall risk on admission and shift change with implementation of targeted fall precautions.",
      skillType: "both",
      theoretical: "Explains Morse Fall Scale risk parameters (history of falls, secondary diagnosis, ambulatory aid, IV therapy, gait, mental status) and score cutoffs.",
      practical: "Demonstrates application of high-fall risk identifier (Yellow wristband, bed sign), side-rails up, call bell within reach, and patient/bystander education.",
      order: 2,
    },
    {
      domainCode: "PSQ",
      code: "PSQ-03",
      title: "Braden Scale & Pressure Injury Prevention / Staging",
      desc: "Systematic skin assessment, pressure ulcer staging (Stage I-IV, Unstageable), and 2-hourly repositioning.",
      skillType: "both",
      theoretical: "Lists Braden scale subscales (sensory perception, moisture, activity, mobility, nutrition, friction/shear) and identifies early Stage I non-blanchable erythema.",
      practical: "Performs skin inspection over bony prominences (sacrum, heels, trochanters), executes log-roll 2-hourly turning schedule, and applies pressure-relieving mattress/cushions.",
      order: 3,
    },
    {
      domainCode: "PSQ",
      code: "PSQ-04",
      title: "Restraint Protocol & Vulnerable Patient Care",
      desc: "Safe application, doctor order requirement, and 2-hourly monitoring for physical and chemical restraints.",
      skillType: "both",
      theoretical: "Explains ethical and NABH guidelines on least restrictive measures, necessity of signed consent and time-limited physician order (valid 24h).",
      practical: "Demonstrates proper padding, quick-release knot tied to bed frame (never side-rails), and neurovascular checks (pulse, color, temp) every 2 hours with documentation.",
      order: 4,
    },

    // --- 3. Medication Administration & Safety ---
    {
      domainCode: "MOM",
      code: "MOM-01",
      title: "Seven Rights of Medication Administration",
      desc: "Executing Right Patient, Right Drug, Right Dose, Right Route, Right Time, Right Reason, and Right Documentation.",
      skillType: "both",
      theoretical: "Recalls all 7 rights and discusses potential medication errors related to similar sound/look or unapproved abbreviations.",
      practical: "Performs triple check (while taking drug from bin, preparing dose, before administering to patient) against physician's signed treatment sheet.",
      order: 1,
    },
    {
      domainCode: "MOM",
      code: "MOM-02",
      title: "High-Alert & Look-Alike Sound-Alike (LASA) Drug Protocol",
      desc: "Storage segregation, warning labels, and independent double-check for high-risk medications.",
      skillType: "both",
      theoretical: "Identifies hospital high-alert categories (Concentrated electrolytes, Insulin, Heparin/Anticoagulants, Chemotherapy, Narcotics) and LASA medication lists.",
      practical: "Demonstrates independent double-check procedure with a colleague nurse (reading vial label, calculating dosage, witnessing injection/infusion rate setting).",
      order: 2,
    },
    {
      domainCode: "MOM",
      code: "MOM-03",
      title: "Dosage & IV Infusion Rate Calculation",
      desc: "Mathematical competence in calculating drug dosages, drops per minute (gtts/min), and infusion pump rates (ml/hr).",
      skillType: "both",
      theoretical: "Solves clinical dosage problems: conversion of mcg to mg to g, reconstituting powdered vials, and micro/macro drip factor calculations.",
      practical: "Programs volumetric infusion pump and syringe driver accurately, verifies programmed rate against doctor prescription, and monitors infusion site.",
      order: 3,
    },
    {
      domainCode: "MOM",
      code: "MOM-04",
      title: "Narcotic & Psychotropic Drug Custody & Administration",
      desc: "Double-lock cabinet storage, inventory balance verification, prescription validation, and witness disposal.",
      skillType: "both",
      theoretical: "Explains NDPS legal requirements, documentation in Narcotic Register, and disposal protocol for unused ampoule remnants.",
      practical: "Demonstrates key handover protocol, physical stock count verification against ledger, dual nurse sign-off in narcotic register and patient chart.",
      order: 4,
    },
    {
      domainCode: "MOM",
      code: "MOM-05",
      title: "Adverse Drug Reaction (ADR) & Extravasation Management",
      desc: "Early recognition of anaphylaxis, drug allergies, IV infiltration/extravasation, and reporting workflow.",
      skillType: "both",
      theoretical: "Identifies signs of anaphylaxis (stridor, urticaria, bronchospasm, hypotension) and distinguishes vesicant vs irritant drug extravasation.",
      practical: "Demonstrates immediate stopping of infusion, emergency physician notification, adrenaline administration preparation, and filing ADR Pharmacovigilance form.",
      order: 5,
    },

    // --- 4. Emergency Care & Resuscitation (BLS) ---
    {
      domainCode: "COP_BLS",
      code: "BLS-01",
      title: "Basic Life Support (BLS) & CPR Sequence (C-A-B)",
      desc: "Recognition of cardiac arrest, high-quality chest compressions, airway management, and rescue breaths.",
      skillType: "both",
      theoretical: "Explains AHA/NABH BLS algorithm: scene safety, check responsiveness & carotid pulse (5-10s), compression depth (5-6 cm), rate (100-120/min), 30:2 ratio.",
      practical: "Demonstrates high-quality CPR on mannequin: correct hand placement, full chest recoil, minimal interruptions (<10s), and bag-valve-mask (Ambu) ventilation.",
      order: 1,
    },
    {
      domainCode: "COP_BLS",
      code: "BLS-02",
      title: "Code Blue Emergency Activation & Team Roles",
      desc: "Rapid escalation of medical emergencies, announcing Code Blue, and fulfilling assigned resuscitation roles.",
      skillType: "both",
      theoretical: "States hospital Code Blue phone extension, criteria for activation (unresponsive, apnea/agonal breathing, pulse absent), and team role assignments.",
      practical: "Simulates immediate Code Blue activation, starts compressions within 10 seconds, and guides arriving code blue team with concise clinical handover.",
      order: 2,
    },
    {
      domainCode: "COP_BLS",
      code: "BLS-03",
      title: "Crash Cart Readiness & Defibrillator / AED Operation",
      desc: "Daily crash cart checklist verification, checking expiry/seals, and operating defibrillator / AED safely.",
      skillType: "both",
      theoretical: "Explains shockable rhythms (VF, Pulseless VT) vs non-shockable (Asystole, PEA), safety command 'Stand Clear', and biphasic energy settings.",
      practical: "Checks crash cart seal, suction apparatus, and oxygen cylinder; applies defibrillator pads correctly (antero-lateral), ensures all clear, and delivers shock.",
      order: 3,
    },
    {
      domainCode: "COP_BLS",
      code: "BLS-04",
      title: "Oxygen Therapy & Airway Suctioning",
      desc: "Selection of oxygen delivery devices (nasal prongs, simple mask, Venturi, NRBM) and safe suctioning technique.",
      skillType: "both",
      theoretical: "Explains FiO2 ranges for different oxygen devices, risk of hyperoxia in COPD, and suctioning contraindications/complications (hypoxia, bradycardia).",
      practical: "Demonstrates flow meter adjustment, humidification bottle check, correct sterile suction catheter insertion (<10-15 seconds), with pre-oxygenation.",
      order: 4,
    },

    // --- 5. Core Clinical Procedural Competencies ---
    {
      domainCode: "PROCEDURES",
      code: "PROC-01",
      title: "Peripheral Intravenous (IV) Cannulation & Care",
      desc: "Cannula size selection, aseptic vein puncture, fixation, and Visual Infusion Phlebitis (VIP) score monitoring.",
      skillType: "both",
      theoretical: "Selects cannula gauge based on clinical indication (14-16G trauma/blood, 18-20G routine IV, 22-24G pediatric/fragile) and explains VIP score criteria (0-5).",
      practical: "Performs sterile venipuncture: skin disinfection, flashback confirmation, stylet retraction, transparent dressing application, flushing with saline, and dating.",
      order: 1,
    },
    {
      domainCode: "PROCEDURES",
      code: "PROC-02",
      title: "Foley Catheterization with Sterile Technique",
      desc: "Aseptic insertion of indwelling urinary catheter, balloon inflation, and closed drainage maintenance.",
      skillType: "both",
      theoretical: "Explains catheter sizes (Fr 12-16), sterile water requirement for balloon (never saline), and contraindications (suspected urethral injury/blood at meatus).",
      practical: "Demonstrates sterile glove donning, peri-urethral cleaning, lubrication, gentle insertion until urine flows, balloon inflation without resistance, and secure fixation to thigh.",
      order: 2,
    },
    {
      domainCode: "PROCEDURES",
      code: "PROC-03",
      title: "Nasogastric (NG) Tube Insertion & Position Verification",
      desc: "NEX measurement (Nose-Ear-Xiphoid), gentle insertion, and reliable confirmation of gastric placement before feeding.",
      skillType: "both",
      theoretical: "Explains NEX measurement technique, complications of misplaced tube, and why auscultation whoosh test alone is insufficient under modern NABH guidelines.",
      practical: "Demonstrates patient positioning (high Fowler's), lubrication, guiding swallowing, aspirating gastric fluid to verify pH (<5.5), and secure nose taping.",
      order: 3,
    },
    {
      domainCode: "PROCEDURES",
      code: "PROC-04",
      title: "Blood Component Transfusion Protocol & Reaction Management",
      desc: "Pre-transfusion bedside verification, vital signs baseline, infusion rate monitoring, and transfusion reaction handling.",
      skillType: "both",
      theoretical: "Outlines 2-nurse cross-check items (Patient Name, UHID, Blood Group/Rh, Unit Bag No., Expiry Date) and signs of Acute Hemolytic Transfusion Reaction.",
      practical: "Monitors vitals before, at 15 minutes, and hourly; uses blood administration set with 170-260 micron filter; demonstrates immediate stopping if fever/chills occur.",
      order: 4,
    },
    {
      domainCode: "PROCEDURES",
      code: "PROC-05",
      title: "Wound Care, Surgical Dressing & Aseptic No-Touch Technique (ANTT)",
      desc: "Principles of surgical dressing, wound assessment (REEDA scale), and maintaining sterile field.",
      skillType: "both",
      theoretical: "Describes wound healing phases, signs of surgical site infection (SSI), and ANTT principles (Key-Parts and Key-Sites protection).",
      practical: "Performs sterile dressing tray setup, cleaning from clean to contaminated wound area with separate swabs, sterile dressing application, and bio-waste disposal.",
      order: 5,
    },

    // --- 6. Clinical Documentation & Handover Communication ---
    {
      domainCode: "DOC_COMM",
      code: "DOC-01",
      title: "ISBAR Clinical Shift Handover Communication",
      desc: "Structured handover between shifts using ISBAR: Identify, Situation, Background, Assessment, Recommendation.",
      skillType: "both",
      theoretical: "Explains each ISBAR element and discusses how structured communication prevents sentinel communication gaps during shift transitions.",
      practical: "Delivers concise, complete bedside ISBAR verbal handover for a clinical case, addressing pending investigations, high-risk medications, and alerts.",
      order: 1,
    },
    {
      domainCode: "DOC_COMM",
      code: "DOC-02",
      title: "Nursing Care Plan & Modified Early Warning Score (MEWS)",
      desc: "Assessment of patient clinical deterioration using MEWS, nursing diagnoses, and recording nursing care plans.",
      skillType: "both",
      theoretical: "Explains MEWS scoring parameters (RR, HR, Systolic BP, Temperature, AVPU consciousness) and escalation trigger thresholds (score >= 4 or single parameter 3).",
      practical: "Accurately calculates MEWS from vital signs, charts nursing care plan with measurable goals, and initiates medical officer escalation when trigger met.",
      order: 2,
    },
    {
      domainCode: "DOC_COMM",
      code: "DOC-03",
      title: "Critical Lab Value Read-Back & Telephone Order Protocol",
      desc: "Documenting and repeating back critical diagnostic alerts and verbal/telephone physician orders.",
      skillType: "both",
      theoretical: "Defines hospital Critical Value lists (e.g. K+ <2.5 or >6.0, Hb <6.0, Troponin elevated) and policy on verbal orders (restricted to emergencies only).",
      practical: "Demonstrates Write Down, Read Back, and Confirm (W-R-C) process: records caller name, date/time, exact value/order, and ensures doctor countersignature within 24 hours.",
      order: 3,
    },
    {
      domainCode: "DOC_COMM",
      code: "DOC-04",
      title: "Incident, Near-Miss & Sentinel Event Reporting",
      desc: "Identification and non-punitive reporting of clinical adverse events, near-misses, and medication errors.",
      skillType: "both",
      theoretical: "Distinguishes Near-Miss, Adverse Event, and Sentinel Event (e.g. wrong-site surgery, unexpected maternal death); explains culture of safety and root cause analysis.",
      practical: "Completes hospital Incident Report Form accurately within 24 hours of occurrence without punitive bias or altered medical records.",
      order: 4,
    },
  ];

  for (const c of criteria) {
    const domainId = domainMap.get(c.domainCode);
    if (!domainId) continue;

    await pool.query(
      `
      INSERT INTO "skill_assessment"."competency_criteria" (
        "domain_id", "code", "title", "description", "skill_type",
        "theoretical_guideline", "practical_guideline", "display_order"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT ("code") DO UPDATE
      SET "title" = EXCLUDED."title",
          "description" = EXCLUDED."description",
          "skill_type" = EXCLUDED."skill_type",
          "theoretical_guideline" = EXCLUDED."theoretical_guideline",
          "practical_guideline" = EXCLUDED."practical_guideline",
          "display_order" = EXCLUDED."display_order";
    `,
      [
        domainId,
        c.code,
        c.title,
        c.desc,
        c.skillType,
        c.theoretical,
        c.practical,
        c.order,
      ]
    );
  }

  console.log(`Successfully verified ${criteria.length} NABH Clinical & Nursing Competency criteria.`);
}

async function seedTheoreticalQuestionsAndExamConfig() {
  console.log("Seeding Theoretical Clinical Question Bank and Exam Configurations...");

  // Default Exam Configuration (20 questions, 1200 seconds / 20 mins, 60s per question)
  await pool.query(`
    INSERT INTO "skill_assessment"."exam_configs" (
      "title", "total_questions", "total_time_seconds", "per_question_time_seconds", "pass_percentage", "active"
    )
    SELECT 'Clinical Staff NABH Theoretical Examination', 20, 1200, 60, 60.00, true
    WHERE NOT EXISTS (SELECT 1 FROM "skill_assessment"."exam_configs" WHERE "active" = true)
    ON CONFLICT DO NOTHING;
  `);

  const questions = [
    {
      code: "MCQ-HIC-01",
      domainCode: "HIC",
      question: "According to the WHO 5 Moments for Hand Hygiene, which of the following is considered Moment 1?",
      options: [
        "Before touching a patient",
        "After touching a patient",
        "After body fluid exposure risk",
        "Before clean/aseptic procedure"
      ],
      correctOptionIndex: 0,
      explanation: "Moment 1 is 'Before touching a patient' to protect the patient against colonization and exogenous pathogens carried on healthcare worker hands.",
      departmentTags: [],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-HIC-02",
      domainCode: "HIC",
      question: "Following an accidental needle stick injury from a known Hepatitis B positive patient, what is the immediate first aid step?",
      options: [
        "Squeeze the puncture site vigorously to express blood",
        "Wash the puncture site immediately under running water with soap without squeezing",
        "Apply concentrated bleach or pure alcohol directly into the puncture wound",
        "Immediately bandage the site and report only at the end of the shift"
      ],
      correctOptionIndex: 1,
      explanation: "Immediately wash the puncture site under running water with soap. Do not squeeze, scrub, or suck the wound. Report to the hospital infection control officer within 2 hours for Post-Exposure Prophylaxis (PEP).",
      departmentTags: [],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-HIC-03",
      domainCode: "HIC",
      question: "Under national Bio-Medical Waste (BMW) management rules, into which color-coded container must used intravenous tubing, syringes without needles, and Foley catheters be disposed?",
      options: [
        "Yellow bag",
        "Red bag/container",
        "Blue cardboard box",
        "White translucent puncture-proof container"
      ],
      correctOptionIndex: 1,
      explanation: "Recyclable contaminated plastic waste such as IV tubes, syringes without needles, catheters, and urine bags must be placed in Red bags for autoclaving/shredding.",
      departmentTags: [],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-HIC-04",
      domainCode: "HIC",
      question: "What is the recommended minimum contact time for alcohol-based hand rub (ABHR) to achieve adequate clinical antisepsis?",
      options: [
        "5 to 10 seconds",
        "20 to 30 seconds",
        "45 to 60 seconds",
        "2 full minutes"
      ],
      correctOptionIndex: 1,
      explanation: "Hand rubbing with alcohol-based formulations should cover all surfaces of both hands and rub vigorously for 20 to 30 seconds until completely dry.",
      departmentTags: [],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-HIC-05",
      domainCode: "HIC",
      question: "Which of the following personal protective equipment (PPE) sequence is correct for DONNING (putting on) PPE before entering an airborne isolation room?",
      options: [
        "Gloves -> Mask -> Gown -> Eyewear",
        "Gown -> Mask/N95 Respirator -> Goggles/Face Shield -> Gloves",
        "Mask -> Gloves -> Goggles -> Gown",
        "Goggles -> Gown -> Gloves -> Mask"
      ],
      correctOptionIndex: 1,
      explanation: "Standard CDC/NABH Donning sequence is: Gown first, followed by Mask/N95 respirator, Goggles/face shield, and finally Gloves over gown cuffs.",
      departmentTags: [],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-BLS-01",
      domainCode: "COP_BLS",
      question: "What is the standard chest compression to ventilation ratio for an adult patient in cardiac arrest when performed by healthcare providers?",
      options: [
        "15 compressions to 2 ventilations",
        "30 compressions to 2 ventilations",
        "50 compressions to 5 ventilations",
        "Continuous compressions with no ventilations permitted"
      ],
      correctOptionIndex: 1,
      explanation: "AHA/ERC BLS guidelines mandate a 30:2 ratio of compressions to breaths for adults in cardiac arrest prior to advanced airway placement.",
      departmentTags: ["ICU/HDU", "Ward", "OT", "OPD"],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-BLS-02",
      domainCode: "COP_BLS",
      question: "What is the recommended chest compression rate for high-quality adult cardiopulmonary resuscitation (CPR)?",
      options: [
        "60 to 80 compressions per minute",
        "80 to 100 compressions per minute",
        "100 to 120 compressions per minute",
        "130 to 150 compressions per minute"
      ],
      correctOptionIndex: 2,
      explanation: "High-quality CPR requires a compression rate of 100 to 120 beats per minute with full chest recoil between compressions.",
      departmentTags: ["ICU/HDU", "Ward", "OT", "OPD"],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-BLS-03",
      domainCode: "COP_BLS",
      question: "Which of the following cardiac arrest rhythms is an electrical shock (defibrillation) indicated?",
      options: [
        "Asystole (flat line)",
        "Pulseless Electrical Activity (PEA)",
        "Ventricular Fibrillation (VF)",
        "Sinus Bradycardia with hypotension"
      ],
      correctOptionIndex: 2,
      explanation: "Shockable rhythms in cardiac arrest are Ventricular Fibrillation (VF) and Pulseless Ventricular Tachycardia (pVT). Asystole and PEA are non-shockable.",
      departmentTags: ["ICU/HDU", "OT", "Ward"],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-BLS-04",
      domainCode: "COP_BLS",
      question: "What is the standard first-line intravenous/intraosseous dose of Epinephrine (Adrenaline) during adult cardiac arrest and how frequently is it repeated?",
      options: [
        "0.5 mg every 10 minutes",
        "1 mg (1:10,000) every 3 to 5 minutes",
        "2 mg bolus given only once",
        "10 mg infusion over 30 minutes"
      ],
      correctOptionIndex: 1,
      explanation: "Epinephrine 1 mg (10 mL of 1:10,000 solution) is administered IV/IO every 3 to 5 minutes during resuscitation in cardiac arrest.",
      departmentTags: ["ICU/HDU", "OT", "Ward"],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-BLS-05",
      domainCode: "COP_BLS",
      question: "If an adult choking patient with severe foreign body airway obstruction suddenly becomes unresponsive, what is the immediate action?",
      options: [
        "Perform a blind finger sweep inside the oral cavity",
        "Carefully lower the patient to the floor and initiate CPR starting with 30 chest compressions",
        "Administer 5 back blows while keeping the patient upright",
        "Immediately attempt tracheostomy"
      ],
      correctOptionIndex: 1,
      explanation: "When a choking victim loses consciousness, ease them to the ground and start CPR (30 compressions). Check the airway for visible foreign objects before ventilations; never do blind sweeps.",
      departmentTags: [],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-MOM-01",
      domainCode: "MOM",
      question: "Why is concentrated Potassium Chloride (KCl) ampoules strictly prohibited from being administered via direct IV push/bolus injection?",
      options: [
        "It causes severe subcutaneous skin discoloration",
        "It rapidly triggers fatal cardiac arrest and malignant arrhythmias",
        "It precipitates and blocks the IV cannula immediately",
        "It causes acute permanent renal cortical necrosis"
      ],
      correctOptionIndex: 1,
      explanation: "Concentrated KCl IV push produces rapid hyperkalemia causing instantaneous cardiac arrest. It must always be diluted in IV infusion fluids and administered using an infusion pump.",
      departmentTags: ["ICU/HDU", "Ward", "NICU", "OT"],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-MOM-02",
      domainCode: "MOM",
      question: "Which practice is mandated by NABH Medication Management (MOM) standards to prevent Look-Alike Sound-Alike (LASA) dispensing errors?",
      options: [
        "Storing all LASA drugs in the same drawer for easy retrieval",
        "Tall-Man lettering and physically separated storage with distinct color warning labels",
        "Dispensing LASA medications without doctor prescription verification",
        "Replacing chemical names with handwritten nicknames"
      ],
      correctOptionIndex: 1,
      explanation: "Tall-Man lettering (e.g., DOPamine vs DoBUTamine) and physical separation with designated LASA labels prevent inadvertent mix-ups.",
      departmentTags: [],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-MOM-03",
      domainCode: "MOM",
      question: "What are the essential 'Rights of Medication Administration' that every nurse must verify prior to administering any drug?",
      options: [
        "Right patient, Right drug, Right dose, Right route, Right time, Right documentation, Right reason",
        "Right cost, Right room, Right bed, Right hospital, Right nurse, Right counter",
        "Right insurance, Right physician, Right shelf, Right syringe, Right tray",
        "Right diagnosis, Right shift, Right ward, Right pharmacy, Right locker"
      ],
      correctOptionIndex: 0,
      explanation: "The 7 Rights ensure clinical patient safety: Right Patient, Right Drug, Right Dose, Right Route, Right Time, Right Documentation, and Right Reason.",
      departmentTags: [],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-PSQ-01",
      domainCode: "PSQ",
      question: "What are the two mandatory, acceptable patient identifiers required by NABH standards before administering medication or taking samples?",
      options: [
        "Bed number and ward name",
        "Patient full name and unique hospital identification number (UHID/IPD No.)",
        "Room number and attending doctor's name",
        "Patient diagnosis and age"
      ],
      correctOptionIndex: 1,
      explanation: "Room number and bed number are strictly unacceptable because patients frequently change beds. Two independent identifiers (Name and UHID) must be matched.",
      departmentTags: [],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-PSQ-02",
      domainCode: "PSQ",
      question: "In the WHO Surgical Safety Checklist, when is the 'Time-Out' performed?",
      options: [
        "Before induction of anesthesia",
        "Immediately after the patient enters the operating suite",
        "Just before the surgical skin incision is made",
        "After wound closure in the recovery room"
      ],
      correctOptionIndex: 2,
      explanation: "Time-Out is performed immediately before skin incision. The entire team pauses to confirm patient identity, surgical site, procedure, and consent.",
      departmentTags: ["OT"],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-PSQ-03",
      domainCode: "PSQ",
      question: "According to the Braden Scale for pressure injury risk assessment, what does a score of 12 or less indicate?",
      options: [
        "No risk of pressure ulcer development",
        "Mild risk",
        "High risk of pressure ulcer development requiring aggressive preventive protocols",
        "Patient has completely healed pressure injuries"
      ],
      correctOptionIndex: 2,
      explanation: "A Braden score of 12 or less signifies High Risk, requiring pressure-relieving air mattresses, 2-hourly turning schedule, and barrier creams.",
      departmentTags: ["ICU/HDU", "Ward"],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-ICU-01",
      domainCode: "PROCEDURES",
      question: "To prevent Ventilator-Associated Pneumonia (VAP) in an intubated intensive care patient, what is the recommended head-of-bed elevation?",
      options: [
        "Flat / supine (0 degrees)",
        "10 to 15 degrees",
        "30 to 45 degrees",
        "Upright 90 degrees at all times"
      ],
      correctOptionIndex: 2,
      explanation: "Elevating the head of bed between 30 and 45 degrees significantly reduces aspiration of gastrointestinal secretions and lowers VAP incidence.",
      departmentTags: ["ICU/HDU"],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-ICU-02",
      domainCode: "PROCEDURES",
      question: "What is the maximum duration for a single endotracheal suctioning pass to avoid causing severe hypoxia and cardiac arrhythmias?",
      options: [
        "5 to 10 seconds (never exceeding 15 seconds)",
        "30 to 45 seconds",
        "60 seconds continuous suction",
        "Until no more secretions are visible in the catheter"
      ],
      correctOptionIndex: 0,
      explanation: "Endotracheal suctioning must not exceed 10 to 15 seconds per pass. The patient must be pre-oxygenated with 100% O2 before and after suctioning.",
      departmentTags: ["ICU/HDU", "Ward", "OT"],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-ICU-03",
      domainCode: "PROCEDURES",
      question: "In the Glasgow Coma Scale (GCS), what is the maximum possible score indicating a fully conscious, alert patient?",
      options: [
        "10",
        "12",
        "15",
        "20"
      ],
      correctOptionIndex: 2,
      explanation: "GCS assesses Eye Opening (4), Verbal Response (5), and Motor Response (6), with a maximum score of 15 and minimum score of 3.",
      departmentTags: ["ICU/HDU", "Ward", "OPD"],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-ICU-04",
      domainCode: "PROCEDURES",
      question: "Which of the following interventions is part of the 'Hour-1 Bundle' in the initial resuscitation of septic shock?",
      options: [
        "Measure serum lactate, obtain blood cultures before broad-spectrum antibiotics, and initiate rapid crystalloid bolus for hypotension",
        "Withhold all IV fluids until urine output is confirmed",
        "Administer oral antibiotics and discharge patient to general ward",
        "Perform lumbar puncture before hemodynamic stabilization"
      ],
      correctOptionIndex: 0,
      explanation: "Surviving Sepsis Campaign Hour-1 bundle mandates lactate measurement, blood cultures prior to antibiotics, broad-spectrum IV antibiotics, and 30 mL/kg crystalloids for hypotension.",
      departmentTags: ["ICU/HDU", "Ward", "OPD"],
      difficulty: "advanced",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-OT-01",
      domainCode: "PROCEDURES",
      question: "What is the mandatory protocol when a surgical sponge or instrument count discrepancy occurs before closing a surgical cavity?",
      options: [
        "Assume the count was documented incorrectly and proceed with closure",
        "Immediately notify the operating surgeon, recount all items, search surgical field/drapes/bins, and order intraoperative X-ray if unresolved",
        "Close the incision and order routine X-ray next day",
        "Discharge patient to recovery room and document later"
      ],
      correctOptionIndex: 1,
      explanation: "The surgeon must be alerted immediately. Wound exploration, recounting, and mandatory mobile X-ray must be executed before closing the cavity.",
      departmentTags: ["OT"],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-OT-02",
      domainCode: "PROCEDURES",
      question: "What is the recommended scrub time for the initial surgical hand antisepsis using antimicrobial soap before donning sterile attire?",
      options: [
        "30 seconds",
        "1 minute",
        "3 to 5 minutes",
        "15 minutes"
      ],
      correctOptionIndex: 2,
      explanation: "Initial surgical scrub requires 3 to 5 minutes covering hands, forearms, and elbows up to 2 inches above the elbow, drying with a sterile towel.",
      departmentTags: ["OT", "CSSD"],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-OT-03",
      domainCode: "PROCEDURES",
      question: "Where should the electrosurgical dispersive return electrode (cautery grounding pad) be placed on an adult patient?",
      options: [
        "Over a bony prominence or scar tissue",
        "Over a clean, well-vascularized, large muscle mass as close to the operative site as practical",
        "Directly over a metal prosthesis or artificial joint replacement",
        "Under the patient's heels without skin contact"
      ],
      correctOptionIndex: 1,
      explanation: "Grounding plates must be placed over large, clean, well-vascularized muscle (e.g. thigh) away from bony prominences, implants, and excessive hair to prevent electrosurgical burns.",
      departmentTags: ["OT"],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-NICU-01",
      domainCode: "PROCEDURES",
      question: "What is the normal resting heart rate range for a healthy newborn infant?",
      options: [
        "60 to 80 beats per minute",
        "80 to 100 beats per minute",
        "120 to 160 beats per minute",
        "180 to 220 beats per minute"
      ],
      correctOptionIndex: 2,
      explanation: "Normal resting newborn heart rate ranges between 120 and 160 beats per minute. Rates below 100 require immediate neonatal resuscitation evaluation.",
      departmentTags: ["NICU", "Ward"],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-NICU-02",
      domainCode: "PROCEDURES",
      question: "In the 'Golden Minute' of neonatal resuscitation at birth, what are the initial sequential actions to be completed within the first 60 seconds?",
      options: [
        "Administer IV epinephrine immediately",
        "Dry, position head to open airway, clear secretions if needed, stimulate, and assess breathing and heart rate",
        "Perform chest compressions without drying",
        "Intubate and start blood transfusion immediately"
      ],
      correctOptionIndex: 1,
      explanation: "The Golden Minute emphasizes thermal control (drying), airway positioning, clearing secretions, tactile stimulation, and evaluating heart rate/respiration.",
      departmentTags: ["NICU", "Ward"],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-NICU-03",
      domainCode: "PROCEDURES",
      question: "What protective measures must be strictly enforced for a newborn undergoing intensive phototherapy for severe neonatal hyperbilirubinemia?",
      options: [
        "Opaque eye shields covering eyes and genital shielding with diaper, monitoring temperature, and maintaining hydration",
        "Leaving eyes completely uncovered to absorb light",
        "Administering high-dose antibiotics concurrently",
        "Restricting all feeds for 24 hours"
      ],
      correctOptionIndex: 0,
      explanation: "Phototherapy light can cause retinal damage; eye shields are mandatory along with genital shielding, hydration support, and continuous temperature monitoring.",
      departmentTags: ["NICU", "Ward"],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-EMERG-01",
      domainCode: "COP_BLS",
      question: "What is the first-line drug of choice and route of administration for an acute severe anaphylactic reaction?",
      options: [
        "Oral diphenhydramine (antihistamine)",
        "Intramuscular Epinephrine (1:1,000) in the anterolateral thigh",
        "Intravenous hydrocortisone bolus",
        "Subcutaneous insulin"
      ],
      correctOptionIndex: 1,
      explanation: "Intramuscular Epinephrine into the mid-anterolateral thigh is the first-line lifesaving treatment for anaphylaxis. Antihistamines and steroids are secondary adjunctive agents.",
      departmentTags: ["OPD", "ICU/HDU", "Ward"],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-EMERG-02",
      domainCode: "PSQ",
      question: "In hospital emergency triage, which triage category designates a patient with an immediately life-threatening condition requiring resuscitation without delay?",
      options: [
        "Green (Non-urgent)",
        "Yellow (Urgent)",
        "Red (Immediate / Resuscitation)",
        "Black (Expectant)"
      ],
      correctOptionIndex: 2,
      explanation: "Red (Priority 1) indicates critical, life-threatening conditions (e.g. airway compromise, severe shock, cardiac arrest) requiring instantaneous care.",
      departmentTags: ["OPD"],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-DOC-01",
      domainCode: "DOC_COMM",
      question: "What does the clinical handoff acronym 'SBAR' stand for?",
      options: [
        "Subjective, Baseline, Assessment, Recovery",
        "Situation, Background, Assessment, Recommendation",
        "Symptoms, Blood pressure, Airway, Respiration",
        "Safety, Biometrics, Audit, Review"
      ],
      correctOptionIndex: 1,
      explanation: "SBAR stands for Situation, Background, Assessment, Recommendation. It provides a standardized framework for communication between clinical staff.",
      departmentTags: [],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-DOC-02",
      domainCode: "DOC_COMM",
      question: "When taking an emergency telephone or verbal order from a doctor, what is the mandatory communication protocol to prevent errors?",
      options: [
        "Listen and acknowledge with 'OK'",
        "Write Down, Read Back, and Confirm (W-R-C)",
        "Execute the order without writing it down",
        "Ask the patient if the order sounds correct"
      ],
      correctOptionIndex: 1,
      explanation: "The receiver must write down the order verbatim, read it back to the prescriber, and receive verbal confirmation before administering the medication.",
      departmentTags: [],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-DOC-03",
      domainCode: "DOC_COMM",
      question: "Within what time frame must a critical diagnostic laboratory alert (e.g. Potassium 6.8 mEq/L) be communicated to the treating clinician?",
      options: [
        "Within 30 minutes of result verification",
        "At the end of the shift report",
        "Within 24 to 48 hours",
        "During weekly grand rounds"
      ],
      correctOptionIndex: 0,
      explanation: "NABH and NABL mandate critical laboratory values to be communicated to the clinical care team within 30 minutes of verification and documented in the critical alert log.",
      departmentTags: [],
      difficulty: "basic",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-CSSD-01",
      domainCode: "HIC",
      question: "Which chemical biological indicator is considered the gold standard for validating steam autoclave sterilization efficacy?",
      options: [
        "Bacillus atrophaeus spores",
        "Geobacillus stearothermophilus spores",
        "Clostridium tetani spores",
        "Pseudomonas aeruginosa culture"
      ],
      correctOptionIndex: 1,
      explanation: "Geobacillus stearothermophilus endospores are highly resistant to heat and serve as the biological indicator to verify steam sterilization efficacy.",
      departmentTags: ["CSSD", "OT"],
      difficulty: "advanced",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-RAD-01",
      domainCode: "PSQ",
      question: "Which of the following safety measures is essential before wheeling a clinical patient into the MRI scanning suite?",
      options: [
        "Screening for all ferromagnetic metallic implants, pacemakers, and removing external metal items",
        "Administering full-dose IV heparin",
        "Ensuring patient has an empty stomach for 24 hours",
        "Placing an lead apron over the patient's head"
      ],
      correctOptionIndex: 0,
      explanation: "MRI magnetic fields exert tremendous projectile forces on ferromagnetic objects; screening for pacemakers, aneurysm clips, and metal objects is mandatory.",
      departmentTags: ["Radiology ", "ICU/HDU"],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-ART-01",
      domainCode: "PSQ",
      question: "In Assisted Reproductive Technology (ART) and embryology clinical nursing, what is the mandatory identity verification rule during gamete/embryo transfer?",
      options: [
        "Verification of woman's photograph only",
        "Double-witness cross-verification of couple identities, barcode, and dish/straw labeling by two qualified professionals",
        "Verifying the referring agent's name",
        "Using verbal confirmation without document check"
      ],
      correctOptionIndex: 1,
      explanation: "Dual-witness witness checks with matching barcode and photo ID verification are compulsory to prevent gamete and embryo mix-ups in ART clinics.",
      departmentTags: ["Assisted Reproductive Technology (ART)", "OT"],
      difficulty: "advanced",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-WARD-01",
      domainCode: "PSQ",
      question: "A nurse identifies a patient with sudden unilateral facial droop, arm weakness, and slurred speech. What is the suspected condition and priority action?",
      options: [
        "Acute hypoglycemia; give fruit juice and re-check in 2 hours",
        "Acute Ischemic Stroke; activate Stroke Code / rapid brain CT protocol immediately",
        "Muscle strain; advise bed rest and prescribe paracetamol",
        "Bell's palsy; schedule outpatient neurology review next week"
      ],
      correctOptionIndex: 1,
      explanation: "FAST symptoms denote Acute Stroke. Activating the emergency stroke protocol allows prompt CT imaging and intravenous thrombolysis within the 4.5-hour therapeutic window.",
      departmentTags: ["Ward", "OPD"],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    },
    {
      code: "MCQ-WARD-02",
      domainCode: "PROCEDURES",
      question: "During intravenous infusion of blood products, within what time period do the majority of severe, acute hemolytic transfusion reactions occur?",
      options: [
        "Within the first 15 minutes of initiating the transfusion",
        "Between hours 4 and 6",
        "12 hours after completion",
        "Only on the second day post-transfusion"
      ],
      correctOptionIndex: 0,
      explanation: "Acute hemolytic and severe allergic transfusion reactions typically manifest within the first 15 minutes (first 50 mL). The nurse must remain at the bedside during this initial period.",
      departmentTags: ["Ward", "ICU/HDU", "OT"],
      difficulty: "medium",
      defaultTimeSeconds: 60,
    }
  ];

  for (const q of questions) {
    await pool.query(
      `
      INSERT INTO "skill_assessment"."theoretical_questions" (
        "code", "domain_code", "question", "options", "correct_option_index",
        "explanation", "department_tags", "difficulty", "default_time_seconds"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT ("code") DO UPDATE
      SET "domain_code" = EXCLUDED."domain_code",
          "question" = EXCLUDED."question",
          "options" = EXCLUDED."options",
          "correct_option_index" = EXCLUDED."correct_option_index",
          "explanation" = EXCLUDED."explanation",
          "department_tags" = EXCLUDED."department_tags",
          "difficulty" = EXCLUDED."difficulty",
          "default_time_seconds" = EXCLUDED."default_time_seconds";
      `,
      [
        q.code,
        q.domainCode,
        q.question,
        JSON.stringify(q.options),
        q.correctOptionIndex,
        q.explanation,
        JSON.stringify(q.departmentTags),
        q.difficulty,
        q.defaultTimeSeconds,
      ]
    );
  }

  console.log(`Successfully verified and seeded ${questions.length} Theoretical Clinical Questions and Exam Configurations.`);
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  createSkillAssessmentSchemaAndTables()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed to setup skill assessment DB:", err);
      process.exit(1);
    });
}
