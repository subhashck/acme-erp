import zipfile
import xml.etree.ElementTree as ET
import re
import json

docx_path = r'c:\Users\subha\Downloads\Acme Training Assessment 2026.docx'
with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read('word/document.xml')

root = ET.fromstring(xml_content)
paragraphs = [ ''.join(p.itertext()).strip() for p in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p') if ''.join(p.itertext()).strip() ]

# Handle merged lines like Answer key: C.Q29.
cleaned = []
for p in paragraphs:
    m = re.search(r'(Answer key:\s*[A-D]\.?)(\s*Q\d+\..*)', p, re.IGNORECASE)
    if m:
        cleaned.append(m.group(1).strip())
        cleaned.append(m.group(2).strip())
    else:
        cleaned.append(p)

def split_options(text):
    m_a = re.search(r'(?:^|\s)A\.\s*', text)
    if not m_a:
        return None
    pos_a = m_a.end()
    
    m_b = re.search(r'(?:^|\s|(?<=[^\s]))B\.\s*', text[pos_a:])
    if not m_b:
        return None
    pos_b = pos_a + m_b.start()
    pos_b_end = pos_a + m_b.end()
    
    m_c = re.search(r'(?:^|\s|(?<=[^\s]))C\.\s*', text[pos_b_end:])
    if not m_c:
        return None
    pos_c = pos_b_end + m_c.start()
    pos_c_end = pos_b_end + m_c.end()
    
    m_d = re.search(r'(?:^|\s|(?<=[^\s]))D\.\s*', text[pos_c_end:])
    if not m_d:
        return None
    pos_d = pos_c_end + m_d.start()
    pos_d_end = pos_c_end + m_d.end()
    
    opt_a = text[pos_a:pos_b].strip()
    opt_b = text[pos_b_end:pos_c].strip()
    opt_c = text[pos_c_end:pos_d].strip()
    opt_d = text[pos_d_end:].strip()
    
    return [opt_a, opt_b, opt_c, opt_d]

def parse_answer_key(ans_text):
    m = re.match(r'Answer key:\s*([A-D])(?:\.?\s*(.*))?', ans_text, re.IGNORECASE)
    if m:
        letter = m.group(1).upper()
        exp = m.group(2).strip() if m.group(2) else ''
        idx = {'A': 0, 'B': 1, 'C': 2, 'D': 3}[letter]
        return idx, exp
    return None, None

# Section metadata mapping
SECTION_METADATA = {
    1: {'domain': 'HIC', 'tags': ['Nursing Central', 'Ward', 'ICU/HDU', 'OT', 'NICU', 'OPD'], 'code_prefix': 'CLN-01'},
    2: {'domain': 'MOM', 'tags': ['Nursing Central', 'Ward', 'ICU/HDU', 'OT', 'NICU'], 'code_prefix': 'CLN-02'},
    3: {'domain': 'MOM', 'tags': ['Dispensary', 'Nursing Central', 'Purchase and Store'], 'code_prefix': 'CLN-03'},
    4: {'domain': 'PROCEDURES', 'tags': ['Purchase and Store', 'Nursing Central'], 'code_prefix': 'CLN-04'},
    5: {'domain': 'PSQ', 'tags': ['Ward', 'Nursing Central'], 'code_prefix': 'CLN-05'},
    6: {'domain': 'PSQ', 'tags': ['OT'], 'code_prefix': 'CLN-06'},
    7: {'domain': 'COP_BLS', 'tags': ['NICU'], 'code_prefix': 'CLN-07'},
    8: {'domain': 'PROCEDURES', 'tags': ['Laboratory', 'Nursing Central', 'Ward'], 'code_prefix': 'CLN-08'},
    9: {'domain': 'PROCEDURES', 'tags': ['Laboratory'], 'code_prefix': 'CLN-09'},
    10: {'domain': 'DOC_COMM', 'tags': ['Front Office', 'Ward'], 'code_prefix': 'CLN-10'},
    11: {'domain': 'DOC_COMM', 'tags': ['Front Office', 'Accounts'], 'code_prefix': 'CLN-11'},
    12: {'domain': 'PROCEDURES', 'tags': ['Ward', 'ICU/HDU', 'Nursing Central'], 'code_prefix': 'CLN-12'},
    13: {'domain': 'COP_BLS', 'tags': ['ICU/HDU', 'Ward', 'OT', 'Nursing Central'], 'code_prefix': 'CLN-13'},
    14: {'domain': 'DOC_COMM', 'tags': ['OPD'], 'code_prefix': 'CLN-14'},
    15: {'domain': 'COP_BLS', 'tags': ['OPD', 'Nursing Central', 'ICU/HDU'], 'code_prefix': 'CLN-15'},
    16: {'domain': 'COP_BLS', 'tags': ['Operations', 'Front Office'], 'code_prefix': 'CLN-16'},
    17: {'domain': 'HIC', 'tags': ['CSSD'], 'code_prefix': 'CLN-17'},
    18: {'domain': 'HIC', 'tags': ['OT', 'CSSD'], 'code_prefix': 'CLN-18'},
    19: {'domain': 'HIC', 'tags': ['Housekeeping', 'Ward', 'ICU/HDU'], 'code_prefix': 'CLN-19'},
    20: {'domain': 'PSQ', 'tags': ['Ward', 'Nursing Central'], 'code_prefix': 'CLN-20'},
    21: {'domain': 'PSQ', 'tags': ['Operations', 'Housekeeping'], 'code_prefix': 'CLN-21'},
    22: {'domain': 'HIC', 'tags': ['Nursing Central', 'Ward', 'OT', 'Laboratory'], 'code_prefix': 'CLN-22'},
    23: {'domain': 'PSQ', 'tags': ['Ward', 'OPD', 'Front Office'], 'code_prefix': 'CLN-23'},
    24: {'domain': 'DOC_COMM', 'tags': ['Front Office', 'Ward', 'OPD'], 'code_prefix': 'CLN-24'},
    25: {'domain': 'DOC_COMM', 'tags': ['Ward', 'ICU/HDU', 'OT', 'Nursing Central'], 'code_prefix': 'CLN-25'},
    26: {'domain': 'DOC_COMM', 'tags': ['Operations', 'Nursing Central'], 'code_prefix': 'CLN-26'},
    27: {'domain': 'DOC_COMM', 'tags': ['Front Office', 'OPD'], 'code_prefix': 'CLN-27'},
    28: {'domain': 'DOC_COMM', 'tags': ['Front Office'], 'code_prefix': 'CLN-28'},
    29: {'domain': 'COP_BLS', 'tags': ['ICU/HDU', 'Ward', 'Nursing Central'], 'code_prefix': 'CLN-29'},
    30: {'domain': 'COP_BLS', 'tags': ['Operations', 'Nursing Central'], 'code_prefix': 'CLN-30'},
    31: {'domain': 'PSQ', 'tags': ['Ward', 'OT', 'Nursing Central'], 'code_prefix': 'CLN-31'},
    32: {'domain': 'PSQ', 'tags': ['Assisted Reproductive Technology (ART)'], 'code_prefix': 'CLN-32'},
    33: {'domain': 'DOC_COMM', 'tags': ['Assisted Reproductive Technology (ART)'], 'code_prefix': 'CLN-33'},
    34: {'domain': 'MOM', 'tags': ['NICU', 'Ward'], 'code_prefix': 'CLN-34'},
    35: {'domain': 'DOC_COMM', 'tags': ['NICU', 'Ward', 'OPD'], 'code_prefix': 'CLN-35'},
    36: {'domain': 'COP_BLS', 'tags': ['OT', 'ICU/HDU', 'NICU'], 'code_prefix': 'CLN-36'},
    37: {'domain': 'COP_BLS', 'tags': ['all'], 'code_prefix': 'CLN-37'},
    38: {'domain': 'COP_BLS', 'tags': ['ICU/HDU', 'Ward', 'Nursing Central'], 'code_prefix': 'CLN-38'},
    39: {'domain': 'DOC_COMM', 'tags': ['Nursing Central', 'Ward', 'Administrative '], 'code_prefix': 'CLN-39'},
    40: {'domain': 'DOC_COMM', 'tags': ['Front Office'], 'code_prefix': 'FO'},
    41: {'domain': 'HIC', 'tags': ['Housekeeping'], 'code_prefix': 'HK'},
    42: {'domain': 'PROCEDURES', 'tags': ['MTS'], 'code_prefix': 'MTS'},
    43: {'domain': 'MOM', 'tags': ['Dispensary'], 'code_prefix': 'PHARM'},
    44: {'domain': 'PROCEDURES', 'tags': ['Purchase and Store'], 'code_prefix': 'STORE'},
    45: {'domain': 'PSQ', 'tags': ['Operations'], 'code_prefix': 'MAINT'},
    46: {'domain': 'HIC', 'tags': ['Canteen'], 'code_prefix': 'CANT'},
}

current_part = ''
current_section_idx = 0
current_section_title = ''
parsed_questions = []

q_indices = [i for i, p in enumerate(cleaned) if re.match(r'^Q\d+\.', p)]

def clean_txt(s):
    if not s: return ''
    return (s
        .replace('\u2013', '-')
        .replace('\u2014', '-')
        .replace('\ufffd', '-')
        .replace('\u2018', "'")
        .replace('\u2019', "'")
        .replace('\u201c', '"')
        .replace('\u201d', '"')
        .replace('\u00a0', ' ')
        .strip())

for idx_pos, q_idx in enumerate(q_indices):
    for j in range(q_idx, -1, -1):
        if cleaned[j].startswith('Section '):
            sec_match = re.match(r'Section\s+(\d+)\.\s*(.*)', cleaned[j])
            if sec_match:
                current_section_idx = int(sec_match.group(1))
                current_section_title = clean_txt(sec_match.group(2))
            break
        if cleaned[j].startswith('PART '):
            current_part = clean_txt(cleaned[j])

    next_limit = q_indices[idx_pos + 1] if idx_pos + 1 < len(q_indices) else len(cleaned)
    q_paras = cleaned[q_idx : next_limit]
    
    raw_q = q_paras[0]
    q_num_match = re.match(r'^Q(\d+)\.\s*(.*)', raw_q)
    if q_num_match:
        in_sec_num = int(q_num_match.group(1))
        question_text = q_num_match.group(2).strip()
    else:
        in_sec_num = 1
        question_text = raw_q.strip()
        
    opts_paras = [p for p in q_paras[1:] if not p.lower().startswith('answer key') and not p.startswith('Section ') and not p.startswith('PART ')]
    ans_paras = [p for p in q_paras[1:] if p.lower().startswith('answer key')]
    
    full_opts_text = ' '.join(opts_paras)
    opts = split_options(full_opts_text)
    
    ans_text = ans_paras[0] if ans_paras else ''
    correct_idx, explanation = parse_answer_key(ans_text)
    
    meta = SECTION_METADATA.get(current_section_idx, {
        'domain': 'PSQ', 'tags': ['all'], 'code_prefix': f'SEC{current_section_idx:02d}'
    })
    
    sec_prefix = meta['code_prefix']
    code = f'MCQ-TRN-{sec_prefix}-{in_sec_num:02d}'
    
    question_text = clean_txt(question_text)
    opts = [clean_txt(o) for o in opts]
    explanation = clean_txt(explanation)
    
    parsed_questions.append({
        'code': code,
        'domainCode': meta['domain'],
        'question': question_text,
        'options': opts,
        'correctOptionIndex': correct_idx,
        'explanation': explanation or f'Standard protocol for {current_section_title}.',
        'departmentTags': meta['tags'],
        'difficulty': 'medium',
        'defaultTimeSeconds': 60,
        'active': True,
        'sectionNumber': current_section_idx,
        'sectionTitle': current_section_title,
    })

print(f'Successfully built {len(parsed_questions)} questions.')
with open('scripts/parsed_training_assessment_questions.json', 'w', encoding='utf-8') as f:
    json.dump(parsed_questions, f, indent=2, ensure_ascii=False)

print('Saved to scripts/parsed_training_assessment_questions.json')
