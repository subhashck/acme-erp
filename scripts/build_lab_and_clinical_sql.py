import zipfile
import xml.etree.ElementTree as ET
import re
import json
import os

LAB_DOCX = r'c:\Users\subha\Downloads\Acme Training Assessment 2026 - Laboratory.docx'
CLN_DOCX = r'c:\Users\subha\Downloads\Acme Training Assessment 2026 - Clinical.docx'

def parse_docx_paras(path):
    with zipfile.ZipFile(path) as z:
        xml_content = z.read("word/document.xml")
    root = ET.fromstring(xml_content)
    return [
        "".join(p.itertext()).strip()
        for p in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p")
        if "".join(p.itertext()).strip()
    ]

def split_options(text):
    m = re.search(r"A\.\s*(.*?)\s*B\.\s*(.*?)\s*C\.\s*(.*?)\s*D\.\s*(.*)$", text)
    if m:
        return [m.group(1).strip(), m.group(2).strip(), m.group(3).strip(), m.group(4).strip()]
    return None

def escape_sql_str(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

def escape_json_sql(obj):
    json_str = json.dumps(obj, ensure_ascii=False)
    return "'" + json_str.replace("'", "''") + "'::jsonb"

# ---------------------------------------------------------------------------
# 1. PARSE LABORATORY (50 MCQs)
# ---------------------------------------------------------------------------
lab_paras = parse_docx_paras(LAB_DOCX)
lab_questions = []

# Mapping domain for Laboratory questions
LAB_DOMAINS = {
    14: "PSQ", 28: "PSQ", 30: "PSQ", 34: "PSQ", 42: "PSQ", 46: "PSQ", 48: "PSQ",
    22: "DOC_COMM", 50: "DOC_COMM",
    18: "HIC", 23: "HIC", 35: "HIC", 37: "HIC", 39: "HIC", 44: "HIC", 47: "HIC", 49: "HIC"
}

i = 0
while i < len(lab_paras):
    p = lab_paras[i]
    m_q = re.match(r"^Q(\d+)\.\s*(.*)", p)
    if m_q:
        q_num = int(m_q.group(1))
        q_prompt = m_q.group(2).strip()
        opts_raw = lab_paras[i+1]
        ans_raw = lab_paras[i+2]
        
        opts = split_options(opts_raw)
        m_ans = re.search(r"Answer(?: key)?:\s*([A-D])(?:\.?\s*(.*))?", ans_raw, re.IGNORECASE)
        ans_letter = m_ans.group(1).upper()
        ans_desc = m_ans.group(2).strip() if m_ans and m_ans.group(2) else ""
        correct_idx = {"A": 0, "B": 1, "C": 2, "D": 3}[ans_letter]
        
        domain = LAB_DOMAINS.get(q_num, "PROCEDURES")
        explanation = f"Correct answer is option {ans_letter}: {ans_desc}."
        
        lab_questions.append({
            "code": f"MCQ-OCT26-LAB-{q_num:02d}",
            "domainCode": domain,
            "question": q_prompt,
            "options": opts,
            "correctOptionIndex": correct_idx,
            "explanation": explanation,
            "departmentTags": ["Laboratory", "Clinical"],
            "difficulty": "medium",
            "defaultTimeSeconds": 60,
            "active": True
        })
        i += 3
    else:
        i += 1

print(f"Parsed Laboratory questions: {len(lab_questions)}")
assert len(lab_questions) == 50, f"Expected 50 Lab questions, got {len(lab_questions)}"

# ---------------------------------------------------------------------------
# 2. PARSE CLINICAL (75 MCQs)
# ---------------------------------------------------------------------------
cln_paras = parse_docx_paras(CLN_DOCX)
with open("scripts/october_2026_clinical_questions.json", "r", encoding="utf-8") as f:
    cln_meta_list = json.load(f)

CLN_SECTION_METADATA = {
    (1, 2):   {"domain": "HIC",        "tags": ["Nursing Central", "Ward", "ICU/HDU", "OT", "NICU", "OPD", "Clinical"]},
    (3, 5):   {"domain": "MOM",        "tags": ["Nursing Central", "Ward", "ICU/HDU", "OT", "NICU", "Clinical"]},
    (6, 10):  {"domain": "PSQ",        "tags": ["Ward", "Nursing Central", "Clinical"]},
    (11, 15): {"domain": "PSQ",        "tags": ["OT", "Clinical"]},
    (16, 20): {"domain": "COP_BLS",    "tags": ["NICU", "Clinical"]},
    (21, 25): {"domain": "PROCEDURES", "tags": ["Laboratory", "Nursing Central", "Ward", "Clinical"]},
    (26, 29): {"domain": "PROCEDURES", "tags": ["Laboratory", "Clinical"]},
    (30, 30): {"domain": "PROCEDURES", "tags": ["Ward", "ICU/HDU", "Nursing Central", "Clinical"]},
    (31, 35): {"domain": "DOC_COMM",   "tags": ["OPD", "Clinical"]},
    (36, 38): {"domain": "COP_BLS",    "tags": ["OPD", "Nursing Central", "ICU/HDU", "Clinical"]},
    (39, 43): {"domain": "HIC",        "tags": ["CSSD", "Clinical"]},
    (44, 48): {"domain": "HIC",        "tags": ["OT", "CSSD", "Clinical"]},
    (49, 50): {"domain": "HIC",        "tags": ["Housekeeping", "Ward", "ICU/HDU", "Clinical"]},
    (51, 51): {"domain": "PSQ",        "tags": ["Ward", "Nursing Central", "Clinical"]},
    (52, 53): {"domain": "HIC",        "tags": ["Nursing Central", "Ward", "OT", "Laboratory", "Clinical"]},
    (54, 55): {"domain": "DOC_COMM",   "tags": ["Front Office", "Ward", "OPD", "Clinical"]},
    (56, 59): {"domain": "DOC_COMM",   "tags": ["Ward", "ICU/HDU", "OT", "Nursing Central", "Clinical"]},
    (60, 61): {"domain": "COP_BLS",    "tags": ["ICU/HDU", "Ward", "Nursing Central", "Clinical"]},
    (62, 63): {"domain": "COP_BLS",    "tags": ["Operations", "Nursing Central", "Clinical"]},
    (64, 67): {"domain": "PSQ",        "tags": ["Assisted Reproductive Technology (ART)", "Clinical"]},
    (68, 70): {"domain": "DOC_COMM",   "tags": ["Assisted Reproductive Technology (ART)", "Clinical"]},
    (71, 75): {"domain": "MOM",        "tags": ["NICU", "Ward", "Clinical"]},
}

def get_cln_meta(q_num):
    for (start, end), data in CLN_SECTION_METADATA.items():
        if start <= q_num <= end:
            return data["domain"], data["tags"]
    return "PSQ", ["Clinical"]

cln_questions = []
i = 0
while i < len(cln_paras):
    p = cln_paras[i]
    m_q = re.match(r"^Q(\d+)\.\s*(.*)", p)
    if m_q:
        q_num = int(m_q.group(1))
        q_prompt = m_q.group(2).strip()
        opts_raw = cln_paras[i+1]
        ans_raw = cln_paras[i+2]
        
        opts = split_options(opts_raw)
        m_ans = re.search(r"Answer(?: key)?:\s*([A-D])", ans_raw, re.IGNORECASE)
        ans_letter = m_ans.group(1).upper()
        correct_idx = {"A": 0, "B": 1, "C": 2, "D": 3}[ans_letter]
        
        domain, tags = get_cln_meta(q_num)
        
        # Clinical explanation from reference list
        meta_entry = cln_meta_list[q_num - 1] if q_num <= len(cln_meta_list) else {}
        explanation = meta_entry.get("explanation", f"Correct answer is option {ans_letter}: {opts[correct_idx]}.")
        
        cln_questions.append({
            "code": f"MCQ-OCT26-CLN-{q_num:02d}",
            "domainCode": domain,
            "question": q_prompt,
            "options": opts,
            "correctOptionIndex": correct_idx,
            "explanation": explanation,
            "departmentTags": tags,
            "difficulty": "medium",
            "defaultTimeSeconds": 40,
            "active": True
        })
        i += 3
    else:
        i += 1

print(f"Parsed Clinical questions: {len(cln_questions)}")
assert len(cln_questions) == 75, f"Expected 75 Clinical questions, got {len(cln_questions)}"

# ---------------------------------------------------------------------------
# 3. SQL GENERATOR HELPER
# ---------------------------------------------------------------------------
def format_question_values(q_list):
    entries = []
    for q in q_list:
        code_sql = escape_sql_str(q["code"])
        domain_sql = escape_sql_str(q["domainCode"])
        q_sql = escape_sql_str(q["question"])
        opts_sql = escape_json_sql(q["options"])
        correct_idx = q["correctOptionIndex"]
        exp_sql = escape_sql_str(q["explanation"])
        tags_sql = escape_json_sql(q["departmentTags"])
        diff_sql = escape_sql_str(q["difficulty"])
        time_sec = q["defaultTimeSeconds"]
        
        entry = (
            f"  ({code_sql}, {domain_sql}, {q_sql}, {opts_sql}, {correct_idx}, "
            f"{exp_sql}, {tags_sql}, {diff_sql}, {time_sec}, TRUE, NOW(), NOW())"
        )
        entries.append(entry)
    return ",\n".join(entries)

# ---------------------------------------------------------------------------
# 4. GENERATE COMBINED SQL (scripts/update_production_lab_and_clinical_question_bank.sql)
# ---------------------------------------------------------------------------
combined_sql = f"""-- ============================================================================
-- ACME FERTILITY & HEALTHCARE CENTRE
-- Production Question Bank Deployment Script
-- Laboratory (50 MCQs) & Clinical Staff (75 MCQs) Competency Assessments
-- Sources:
--   1. "Acme Training Assessment 2026 - Laboratory.docx" (50 MCQs, MCQ-OCT26-LAB-01 to 50)
--   2. "Acme Training Assessment 2026 - Clinical.docx"   (75 MCQs, MCQ-OCT26-CLN-01 to 75)
-- Total Questions: 125 MCQs
-- Idempotency: Fully idempotent with ON CONFLICT (code) DO UPDATE
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Upsert all 50 Laboratory Questions (MCQ-OCT26-LAB-01 to 50)
-- ============================================================================
INSERT INTO skill_assessment.theoretical_questions (
  code,
  domain_code,
  question,
  options,
  correct_option_index,
  explanation,
  department_tags,
  difficulty,
  default_time_seconds,
  active,
  created_at,
  updated_at
) VALUES
{format_question_values(lab_questions)}
ON CONFLICT (code) DO UPDATE SET
  domain_code = EXCLUDED.domain_code,
  question = EXCLUDED.question,
  options = EXCLUDED.options,
  correct_option_index = EXCLUDED.correct_option_index,
  explanation = EXCLUDED.explanation,
  department_tags = EXCLUDED.department_tags,
  difficulty = EXCLUDED.difficulty,
  default_time_seconds = EXCLUDED.default_time_seconds,
  active = TRUE,
  updated_at = NOW();

-- ============================================================================
-- STEP 2: Upsert all 75 Clinical Staff Questions (MCQ-OCT26-CLN-01 to 75)
-- ============================================================================
INSERT INTO skill_assessment.theoretical_questions (
  code,
  domain_code,
  question,
  options,
  correct_option_index,
  explanation,
  department_tags,
  difficulty,
  default_time_seconds,
  active,
  created_at,
  updated_at
) VALUES
{format_question_values(cln_questions)}
ON CONFLICT (code) DO UPDATE SET
  domain_code = EXCLUDED.domain_code,
  question = EXCLUDED.question,
  options = EXCLUDED.options,
  correct_option_index = EXCLUDED.correct_option_index,
  explanation = EXCLUDED.explanation,
  department_tags = EXCLUDED.department_tags,
  difficulty = EXCLUDED.difficulty,
  default_time_seconds = EXCLUDED.default_time_seconds,
  active = TRUE,
  updated_at = NOW();

-- ============================================================================
-- STEP 3: Ensure Department Records Exist in departments Table
-- ============================================================================
INSERT INTO departments (name, floor, head, active, created_at, updated_at)
VALUES 
  ('Laboratory', 'Ground Floor', '', true, NOW(), NOW()),
  ('Clinical Staff', 'All Clinical Floors', '', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 4: Populate / Update Laboratory Monthly Question Banks (2026-10 & 2026-11)
-- ============================================================================
INSERT INTO skill_assessment.department_monthly_question_banks (
  department_id,
  department_name,
  month_year,
  title,
  description,
  total_questions,
  question_ids,
  status,
  created_at,
  updated_at
)
SELECT
  d.id,
  d.name,
  m.month_year,
  TRIM(d.name) || ' - ' || m.month_year || ' Question Bank (50 MCQs)',
  'Laboratory monthly competency assessment question bank (strictly 50 MCQs) for ' || m.month_year,
  COUNT(q.id),
  jsonb_agg(q.id ORDER BY q.code ASC),
  'active',
  NOW(),
  NOW()
FROM departments d
CROSS JOIN (
  VALUES 
    ('2026-10'),
    ('2026-11')
) AS m(month_year)
CROSS JOIN skill_assessment.theoretical_questions q
WHERE LOWER(TRIM(d.name)) = 'laboratory'
  AND q.code LIKE 'MCQ-OCT26-LAB-%'
  AND q.active = TRUE
GROUP BY d.id, d.name, m.month_year
ON CONFLICT (department_name, month_year) DO UPDATE SET
  department_id = EXCLUDED.department_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  total_questions = EXCLUDED.total_questions,
  question_ids = EXCLUDED.question_ids,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================================================
-- STEP 5: Populate / Update Clinical Staff Monthly Question Banks (2026-10 & 2026-11)
-- ============================================================================
INSERT INTO skill_assessment.department_monthly_question_banks (
  department_id,
  department_name,
  month_year,
  title,
  description,
  total_questions,
  question_ids,
  status,
  created_at,
  updated_at
)
SELECT
  d.id,
  d.name,
  m.month_year,
  TRIM(d.name) || ' - ' || m.month_year || ' Question Bank (75 MCQs)',
  'Clinical Staff monthly competency assessment question bank (strictly 75 MCQs) for ' || m.month_year,
  COUNT(q.id),
  jsonb_agg(q.id ORDER BY q.code ASC),
  'active',
  NOW(),
  NOW()
FROM departments d
CROSS JOIN (
  VALUES 
    ('2026-10'),
    ('2026-11')
) AS m(month_year)
CROSS JOIN skill_assessment.theoretical_questions q
WHERE LOWER(TRIM(d.name)) IN ('clinical staff', 'nursing central', 'ward', 'ot', 'nicu', 'icu/hdu', 'opd')
  AND q.code LIKE 'MCQ-OCT26-CLN-%'
  AND q.active = TRUE
GROUP BY d.id, d.name, m.month_year
ON CONFLICT (department_name, month_year) DO UPDATE SET
  department_id = EXCLUDED.department_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  total_questions = EXCLUDED.total_questions,
  question_ids = EXCLUDED.question_ids,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ============================================================================
-- STEP 6: Verification & Integrity Summary
-- ============================================================================
DO $$
DECLARE
  v_lab_questions_count INTEGER;
  v_cln_questions_count INTEGER;
  v_lab_bank_10_count   INTEGER;
  v_lab_bank_11_count   INTEGER;
  v_cln_bank_10_count   INTEGER;
  v_cln_bank_11_count   INTEGER;
BEGIN
  -- Count active questions in master
  SELECT COUNT(*) INTO v_lab_questions_count
  FROM skill_assessment.theoretical_questions
  WHERE code LIKE 'MCQ-OCT26-LAB-%' AND active = TRUE;

  SELECT COUNT(*) INTO v_cln_questions_count
  FROM skill_assessment.theoretical_questions
  WHERE code LIKE 'MCQ-OCT26-CLN-%' AND active = TRUE;

  -- Inspect Laboratory monthly banks
  SELECT total_questions INTO v_lab_bank_10_count
  FROM skill_assessment.department_monthly_question_banks
  WHERE LOWER(TRIM(department_name)) = 'laboratory' AND month_year = '2026-10';

  SELECT total_questions INTO v_lab_bank_11_count
  FROM skill_assessment.department_monthly_question_banks
  WHERE LOWER(TRIM(department_name)) = 'laboratory' AND month_year = '2026-11';

  -- Inspect Clinical Staff monthly banks
  SELECT total_questions INTO v_cln_bank_10_count
  FROM skill_assessment.department_monthly_question_banks
  WHERE LOWER(TRIM(department_name)) = 'clinical staff' AND month_year = '2026-10';

  SELECT total_questions INTO v_cln_bank_11_count
  FROM skill_assessment.department_monthly_question_banks
  WHERE LOWER(TRIM(department_name)) = 'clinical staff' AND month_year = '2026-11';

  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'ACME LABORATORY & CLINICAL QUESTION BANK DEPLOYMENT VERIFICATION';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'Active Laboratory Questions in Master (MCQ-OCT26-LAB-*): % / 50', v_lab_questions_count;
  RAISE NOTICE 'Active Clinical Questions in Master   (MCQ-OCT26-CLN-*): % / 75', v_cln_questions_count;
  RAISE NOTICE 'Laboratory October 2026 Bank:                            % / 50', v_lab_bank_10_count;
  RAISE NOTICE 'Laboratory November 2026 Bank:                           % / 50', v_lab_bank_11_count;
  RAISE NOTICE 'Clinical Staff October 2026 Bank:                        % / 75', v_cln_bank_10_count;
  RAISE NOTICE 'Clinical Staff November 2026 Bank:                       % / 75', v_cln_bank_11_count;
  RAISE NOTICE '==================================================================';

  IF v_lab_questions_count <> 50 THEN
    RAISE EXCEPTION 'Verification Failed: Expected 50 Laboratory questions, found %', v_lab_questions_count;
  END IF;

  IF v_cln_questions_count <> 75 THEN
    RAISE EXCEPTION 'Verification Failed: Expected 75 Clinical questions, found %', v_cln_questions_count;
  END IF;

  RAISE NOTICE 'SUCCESS: All 125 questions and monthly banks verified successfully!';
END $$;

COMMIT;
"""

with open("scripts/update_production_lab_and_clinical_question_bank.sql", "w", encoding="utf-8") as f:
    f.write(combined_sql)

print(f"Generated scripts/update_production_lab_and_clinical_question_bank.sql ({len(combined_sql)} chars)")

# ---------------------------------------------------------------------------
# 5. GENERATE DEDICATED LABORATORY SQL (scripts/update_production_laboratory_question_bank.sql)
# ---------------------------------------------------------------------------
lab_only_sql = f"""-- ============================================================================
-- ACME FERTILITY & HEALTHCARE CENTRE
-- Production Question Bank Deployment Script
-- Laboratory Department Assessment (50 MCQs)
-- Source: "Acme Training Assessment 2026 - Laboratory.docx"
-- Total Questions: 50 MCQs (MCQ-OCT26-LAB-01 to MCQ-OCT26-LAB-50)
-- Idempotency: Fully idempotent with ON CONFLICT (code) DO UPDATE
-- ============================================================================

BEGIN;

INSERT INTO departments (name, floor, head, active, created_at, updated_at)
VALUES ('Laboratory', 'Ground Floor', '', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO skill_assessment.theoretical_questions (
  code,
  domain_code,
  question,
  options,
  correct_option_index,
  explanation,
  department_tags,
  difficulty,
  default_time_seconds,
  active,
  created_at,
  updated_at
) VALUES
{format_question_values(lab_questions)}
ON CONFLICT (code) DO UPDATE SET
  domain_code = EXCLUDED.domain_code,
  question = EXCLUDED.question,
  options = EXCLUDED.options,
  correct_option_index = EXCLUDED.correct_option_index,
  explanation = EXCLUDED.explanation,
  department_tags = EXCLUDED.department_tags,
  difficulty = EXCLUDED.difficulty,
  default_time_seconds = EXCLUDED.default_time_seconds,
  active = TRUE,
  updated_at = NOW();

INSERT INTO skill_assessment.department_monthly_question_banks (
  department_id,
  department_name,
  month_year,
  title,
  description,
  total_questions,
  question_ids,
  status,
  created_at,
  updated_at
)
SELECT
  d.id,
  d.name,
  m.month_year,
  TRIM(d.name) || ' - ' || m.month_year || ' Question Bank (50 MCQs)',
  'Laboratory monthly competency assessment question bank (strictly 50 MCQs) for ' || m.month_year,
  COUNT(q.id),
  jsonb_agg(q.id ORDER BY q.code ASC),
  'active',
  NOW(),
  NOW()
FROM departments d
CROSS JOIN (
  VALUES 
    ('2026-10'),
    ('2026-11')
) AS m(month_year)
CROSS JOIN skill_assessment.theoretical_questions q
WHERE LOWER(TRIM(d.name)) = 'laboratory'
  AND q.code LIKE 'MCQ-OCT26-LAB-%'
  AND q.active = TRUE
GROUP BY d.id, d.name, m.month_year
ON CONFLICT (department_name, month_year) DO UPDATE SET
  department_id = EXCLUDED.department_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  total_questions = EXCLUDED.total_questions,
  question_ids = EXCLUDED.question_ids,
  status = EXCLUDED.status,
  updated_at = NOW();

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM skill_assessment.theoretical_questions
  WHERE code LIKE 'MCQ-OCT26-LAB-%' AND active = TRUE;

  RAISE NOTICE 'SUCCESS: Deployed % / 50 Laboratory questions into theoretical_questions and monthly banks.', v_count;
  IF v_count <> 50 THEN
    RAISE EXCEPTION 'Expected 50 Laboratory questions, found %', v_count;
  END IF;
END $$;

COMMIT;
"""

with open("scripts/update_production_laboratory_question_bank.sql", "w", encoding="utf-8") as f:
    f.write(lab_only_sql)

print(f"Generated scripts/update_production_laboratory_question_bank.sql ({len(lab_only_sql)} chars)")

# ---------------------------------------------------------------------------
# 6. UPDATE DEDICATED CLINICAL SQL (scripts/update_production_clinical_question_bank.sql)
# ---------------------------------------------------------------------------
cln_only_sql = f"""-- ============================================================================
-- ACME FERTILITY & HEALTHCARE CENTRE
-- Production Question Bank Deployment Script
-- Clinical Staff NABH & Competency Assessment (75 Questions)
-- Source: "Acme Training Assessment 2026 - Clinical.docx"
-- Total Questions: 75 MCQs (MCQ-OCT26-CLN-01 to MCQ-OCT26-CLN-75)
-- Idempotency: Fully idempotent with ON CONFLICT (code) DO UPDATE
-- ============================================================================

BEGIN;

INSERT INTO departments (name, floor, head, active, created_at, updated_at)
VALUES ('Clinical Staff', 'All Clinical Floors', '', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO skill_assessment.theoretical_questions (
  code,
  domain_code,
  question,
  options,
  correct_option_index,
  explanation,
  department_tags,
  difficulty,
  default_time_seconds,
  active,
  created_at,
  updated_at
) VALUES
{format_question_values(cln_questions)}
ON CONFLICT (code) DO UPDATE SET
  domain_code = EXCLUDED.domain_code,
  question = EXCLUDED.question,
  options = EXCLUDED.options,
  correct_option_index = EXCLUDED.correct_option_index,
  explanation = EXCLUDED.explanation,
  department_tags = EXCLUDED.department_tags,
  difficulty = EXCLUDED.difficulty,
  default_time_seconds = EXCLUDED.default_time_seconds,
  active = TRUE,
  updated_at = NOW();

INSERT INTO skill_assessment.department_monthly_question_banks (
  department_id,
  department_name,
  month_year,
  title,
  description,
  total_questions,
  question_ids,
  status,
  created_at,
  updated_at
)
SELECT
  d.id,
  d.name,
  m.month_year,
  TRIM(d.name) || ' - ' || m.month_year || ' Question Bank (75 MCQs)',
  'Clinical Staff monthly competency assessment question bank (strictly 75 MCQs) for ' || m.month_year,
  COUNT(q.id),
  jsonb_agg(q.id ORDER BY q.code ASC),
  'active',
  NOW(),
  NOW()
FROM departments d
CROSS JOIN (
  VALUES 
    ('2026-10'),
    ('2026-11')
) AS m(month_year)
CROSS JOIN skill_assessment.theoretical_questions q
WHERE LOWER(TRIM(d.name)) IN ('clinical staff', 'nursing central', 'ward', 'ot', 'nicu', 'icu/hdu', 'opd')
  AND q.code LIKE 'MCQ-OCT26-CLN-%'
  AND q.active = TRUE
GROUP BY d.id, d.name, m.month_year
ON CONFLICT (department_name, month_year) DO UPDATE SET
  department_id = EXCLUDED.department_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  total_questions = EXCLUDED.total_questions,
  question_ids = EXCLUDED.question_ids,
  status = EXCLUDED.status,
  updated_at = NOW();

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM skill_assessment.theoretical_questions
  WHERE code LIKE 'MCQ-OCT26-CLN-%' AND active = TRUE;

  RAISE NOTICE 'SUCCESS: Deployed % / 75 Clinical questions into theoretical_questions and monthly banks.', v_count;
  IF v_count <> 75 THEN
    RAISE EXCEPTION 'Expected 75 Clinical questions, found %', v_count;
  END IF;
END $$;

COMMIT;
"""

with open("scripts/update_production_clinical_question_bank.sql", "w", encoding="utf-8") as f:
    f.write(cln_only_sql)

print(f"Generated scripts/update_production_clinical_question_bank.sql ({len(cln_only_sql)} chars)")
print("ALL SQL FILES PREPARED SUCCESSFULLY!")
