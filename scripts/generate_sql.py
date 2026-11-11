import json

with open('scripts/parsed_training_assessment_questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

def escape_sql_string(s):
    if s is None:
        return 'NULL'
    # Escape single quotes
    return "'" + str(s).replace("'", "''") + "'"

def escape_json_sql(obj):
    json_str = json.dumps(obj, ensure_ascii=False)
    return "'" + json_str.replace("'", "''") + "'::jsonb"

sql_lines = [
    "-- ============================================================================",
    "-- ACME Hospital ERP: Training Assessment 2026 Question Bank Insert Script",
    "-- Generated from: Acme Training Assessment 2026.docx",
    "-- Total Questions: 545",
    "--   Part A: 195 Clinical Questions (Sections 1 to 39)",
    "--   Part B: 350 Departmental Non-Clinical Questions (FO, HK, MTS, Pharmacy, Store, Maint, Canteen)",
    "-- Idempotent: Uses ON CONFLICT (code) DO UPDATE",
    "-- ============================================================================",
    "",
    "BEGIN;",
    "",
    "INSERT INTO skill_assessment.theoretical_questions (",
    "  code,",
    "  domain_code,",
    "  question,",
    "  options,",
    "  correct_option_index,",
    "  explanation,",
    "  department_tags,",
    "  difficulty,",
    "  default_time_seconds,",
    "  active,",
    "  created_at,",
    "  updated_at",
    ") VALUES"
]

values_entries = []
for q in questions:
    code_sql = escape_sql_string(q['code'])
    domain_sql = escape_sql_string(q['domainCode'])
    q_sql = escape_sql_string(q['question'])
    opts_sql = escape_json_sql(q['options'])
    correct_idx = q['correctOptionIndex']
    exp_sql = escape_sql_string(q['explanation'])
    tags_sql = escape_json_sql(q['departmentTags'])
    diff_sql = escape_sql_string(q['difficulty'])
    time_sec = q['defaultTimeSeconds']
    active_val = 'TRUE' if q['active'] else 'FALSE'
    
    entry = f"  ({code_sql}, {domain_sql}, {q_sql}, {opts_sql}, {correct_idx}, {exp_sql}, {tags_sql}, {diff_sql}, {time_sec}, {active_val}, NOW(), NOW())"
    values_entries.append(entry)

sql_lines.append(',\n'.join(values_entries))
sql_lines.extend([
    "ON CONFLICT (code) DO UPDATE SET",
    "  domain_code = EXCLUDED.domain_code,",
    "  question = EXCLUDED.question,",
    "  options = EXCLUDED.options,",
    "  correct_option_index = EXCLUDED.correct_option_index,",
    "  explanation = EXCLUDED.explanation,",
    "  department_tags = EXCLUDED.department_tags,",
    "  difficulty = EXCLUDED.difficulty,",
    "  default_time_seconds = EXCLUDED.default_time_seconds,",
    "  active = EXCLUDED.active,",
    "  updated_at = NOW();",
    "",
    "COMMIT;",
    ""
])

sql_content = '\n'.join(sql_lines)
with open('scripts/insert_training_assessment_2026.sql', 'w', encoding='utf-8') as f:
    f.write(sql_content)

print(f"Generated SQL insert script: scripts/insert_training_assessment_2026.sql ({len(values_entries)} rows, {len(sql_content)} bytes)")
