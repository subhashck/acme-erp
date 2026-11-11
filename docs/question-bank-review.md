# Question bank review

Reviewed on 14 October 2026. Scope: `scripts/seed_500_questions.ts` and its imported department bank, `scripts/department_questions_data.ts`.

This records the initial combined review. The subsequent [department-only review](department-question-bank-review.md) removed the 18 consolidated definitions from the department file itself and refined 57 retained specialty items. The combined bank still contains 229 questions.

## Findings and resulting bank

| Measure | Original generator | After initial combined review |
| --- | ---: | ---: |
| Generated questions | 1,270 | 229 |
| Written question templates | 247 | 247, with 18 explicit consolidations |
| Copies created by cycling through templates | 1,023 | 0 |
| Additional cross-bank overlaps consolidated | — | 18 |
| Written option sets revised | — | 233, including the consolidated definitions |
| Retained questions with revised content/options | — | 215 |

The original six core-domain loops emitted 520 items from 57 written questions. HR contributed 50 written questions. Each of seven departments emitted 100 items from 20 written questions, contributing another 700 items from 140 written questions. Prefixes such as `[Clinical Scenario #21]` changed neither the clinical problem nor its answers. Cycling the difficulty label also did not make the repeated question harder.

The combined review changed the generator to emit each written topic once, preserve its original code and authored difficulty, and apply an explicit reviewed consolidation map. At that stage, department definitions retained for consolidation used the same reviewed content and answer as their canonical question. An empty department-tag list means applicable to all departments; otherwise tags are combined. The subsequent department-only review replaced those repeated definitions with retirement and audience metadata.

## Consolidated overlaps

| Retired code | Retained code | Shared learning objective |
| --- | --- | --- |
| MCQ-OPD-002 | MCQ-PSQ-001 | Two patient identifiers |
| MCQ-OPD-008 | MCQ-MOM-005 | Refrigerated unopened insulin storage |
| MCQ-OPD-012 | MCQ-HIC-005 | Contaminated recyclable plastic disposal |
| MCQ-OPD-016 | MCQ-HIC-006 | Sharps disposal |
| MCQ-WARD-002 | MCQ-DOC-002 | Early-warning score purpose |
| MCQ-WARD-003 | MCQ-PSQ-002 | Adult fall-risk assessment tool |
| MCQ-WARD-005 | MCQ-PSQ-005 | Pressure-injury repositioning planning |
| MCQ-WARD-006 | MCQ-PROC-009 | Phlebitis assessment |
| MCQ-WARD-007 | MCQ-PROC-008 | Pulsatile vascular-access flushing |
| MCQ-WARD-008 | MCQ-PROC-004 | NG tube placement confirmation |
| MCQ-WARD-010 | MCQ-HIC-013 | Urinary drainage-bag position |
| MCQ-WARD-012 | MCQ-PROC-003 | Red-cell administration time limit |
| MCQ-WARD-013 | MCQ-PROC-010 | Suspected transfusion reaction |
| MCQ-WARD-017 | MCQ-DOC-001 | ISBAR components |
| MCQ-ICU-008 | MCQ-PROC-006 | Adult artificial-airway suction pressure |
| MCQ-ICU-009 | MCQ-PROC-007 | Suction duration |
| MCQ-ICU-018 | MCQ-MOM-002 | Rapid IV potassium hazard |
| MCQ-ICU-019 | MCQ-PROC-005 | Chest-drain water-seal air leak |

Related questions retained because they assess different decisions include PPE donning versus doffing; GCS minimum versus maximum; surgical checklist timing versus checklist content; suction pressure versus suction duration; Braden purpose versus its components; and wound first aid versus subsequent occupational-exposure escalation. The ICU VAP repeat now assesses sedation and readiness for awakening/breathing trials. The HR needle-stick repeat now assesses reporting and urgent exposure assessment after first aid. Emergency-code recall questions now assess practical emergency-response decisions rather than assuming a universal local color chart.

A token-overlap scan of the retained bank was also reviewed. Its closest matches were these related but distinct topics. Text similarity alone was not used to merge questions.

## Answer and option quality

Three original department keys selected the wrong answer:

| Original question | Incorrect keyed option | Corrected concept |
| --- | --- | --- |
| MCQ-ICU-009 | Suction for 30–45 seconds | Maximum suction application of 15 seconds; consolidated into MCQ-PROC-007 |
| MCQ-OT-020 | A semi-public lounge is the restricted zone | The controlled operating-room area |
| MCQ-ART-016 | Liquid nitrogen is −20°C | Approximately −196°C at atmospheric pressure |

Options now use recognizable clinical actions, commonly confused tools, comparable doses/routes, or realistic administrative alternatives. Joke choices about holidays, fruit, handwriting, or staff appearance were replaced. Correct options were shortened where excess detail acted as a clue, and explanations retain the teaching detail.

The original written templates keyed B in 221 of 247 cases, keyed A in 14 and C in 12, and never keyed D. A deterministic per-code option shuffle now preserves answer identity while distributing the retained bank across A/B/C/D as **52 / 53 / 69 / 55**. The same code and content produce the same option order on each seed run.

Several stems needed clinical context so there is one defensible answer. Examples include neonatal oxygen guidance for a specified gestational range; product-specific unopened insulin storage; radiography when NG aspirate confirmation is unavailable; device-specific flushing and sterilization instructions; and individualized pressure-injury and restraint care. Unsupported ACME-specific deadlines, deductions, probation periods, screening packages, and salary dates were replaced with approved-policy or employment-term decisions. These edits do not establish new hospital policy.

## Reference checks

The following primary references informed the relevant corrections and qualifications. This is a content/code review, not a claim that every retained item has received specialist clinical sign-off.

- [AHA/AAP 2025 neonatal resuscitation guidance](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/neonatal-resuscitation): gestation-specific initial oxygen, ventilation, compression, and epinephrine context.
- [AARC 2022 artificial-airway suctioning guideline](https://www.aarc.org/wp-content/uploads/2022/10/cpg-artificial-airway-suctioning.pdf): adult suction-pressure limits and maximum 15-second suction application.
- [CDC healthcare hand hygiene](https://www.cdc.gov/clean-hands/hcp/clinical-safety/index.html): visibly soiled hands, alcohol hand rub, and artificial nails in high-risk care.
- [CDC occupational HIV exposure](https://www.cdc.gov/hiv/causes/occupational-transmission.html): urgent assessment and timely indicated PEP.
- [NICE pressure-injury prevention](https://www.nice.org.uk/guidance/cg179/chapter/Recommendations): assessment, documented care planning, and repositioning.
- [NICE enteral nutrition recommendations](https://www.nice.org.uk/guidance/cg32/chapter/Recommendations): NG position checks and radiography when necessary.
- [CDC sterilizing practices](https://www.cdc.gov/infection-control/hcp/disinfection-sterilization/sterilizing-practices.html): validated processing, wet packs, packaging integrity, and inspection of dropped packs.
- [CDC hydrogen-peroxide gas-plasma sterilization](https://www.cdc.gov/infection-control/hcp/disinfection-sterilization/hydrogen-peroxide-gas-plasma-file-name.html): material and lumen compatibility limitations.
- [SHEA 2022 VAP prevention update](https://shea-online.org/guidance-type/ventilator-associated-pneumonia/): ventilation exposure, sedation/weaning practices, and oral-care qualifications.
- [India Code: ART Act 2021](https://www.indiacode.nic.in/indiacode/handle/123456789/17031?view_type=browse): treatment ages and oocyte-donor eligibility.
- [India Code: Maternity Benefit Act](https://www.indiacode.nic.in/handle/123456789/1681?col=123456789%2F1362): eligibility and the fewer-than-two-surviving-children distinction.
- [India Code: POSH Act](https://www.indiacode.nic.in/handle/123456789/17057?sam_handle=123456789%2F2490): committee, complaint timing, and confidentiality.
- [EPFO contribution rates](https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/ContributionRate.pdf): standard rate, applicable wages, and exceptions.
- [ASRM embryo-transfer guidance](https://www.asrm.org/practice-guidance/practice-committee-documents/performing-the-embryo-transfer-a-guideline-2017/): atraumatic placement in the upper or middle cavity.

## Validation and database behavior

Run a content-only check without loading environment files or connecting to PostgreSQL:

```powershell
pnpm exec tsx scripts/seed_500_questions.ts --check
```

Run the focused regression suite:

```powershell
pnpm exec vitest run tests/unit/question-bank-quality.test.ts
```

Validation rejects duplicate codes or normalized stems, numbered pseudo-variants, duplicate/empty options, missing explanations, and invalid answer indexes. Tests also check the corrected keys, deterministic answer preservation, merged department coverage, stable codes/difficulty, and retirement scope.

The database was not reseeded during this review. The existing command `pnpm assessments:seed-questions` will upsert the 229 retained questions and deactivate existing rows matching the 1,041 retired historical seed codes in the same transaction. It preserves retired rows and exam snapshots, and does not deactivate custom codes outside the explicit historical seed inventory. The filename no longer promises a count of 500; reaching that size requires genuinely new written questions.
