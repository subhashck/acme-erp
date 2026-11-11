# Department question bank review

Reviewed on 14 October 2026. Scope: `scripts/department_questions_data.ts`, with compatibility checks against the combined seeder.

## Duplicate and similarity findings

The earlier combined review already excluded 18 department questions that repeat core-bank learning objectives. However, the department file still contained those definitions and returned them when called independently. They have now been removed from the file. The explicit consolidation map records their retired codes, canonical core questions, and department audiences.

| Department | Definitions before this pass | Repeated core items removed | Specialty questions retained |
| --- | ---: | ---: | ---: |
| NICU | 20 | 0 | 20 |
| OPD | 20 | 4 | 16 |
| Ward | 20 | 10 | 10 |
| CSSD | 20 | 0 | 20 |
| OT | 20 | 0 | 20 |
| ICU/HDU | 20 | 4 | 16 |
| ART | 20 | 0 | 20 |
| Total | 140 | 18 | 122 |

The [original consolidation table](question-bank-review.md#consolidated-overlaps) lists all 18 mappings. This does not subtract 18 more questions from the combined bank: it still contains **229 questions**, comprising 107 core/HR questions and 122 specialty questions.

No further exact stem duplicates were found. A token-overlap scan found no remaining specialty-pair matches at the selected 0.30 Jaccard threshold after removing common question words. This scan is a review aid, not proof of semantic uniqueness. Related subjects were also read manually: temperature control and warmer probe placement; surfactant indication and INSURE; OHSS mechanism and prevention; sterilization test purpose and indicator organisms; and surgical field control and skin preparation assess different knowledge or decisions and remain separate.

Original numeric code suffixes are now explicit in each template. Removing `MCQ-WARD-002` does not renumber `MCQ-WARD-004` or assign an old code to a different topic. The combined seeder adds the retired items' department coverage to their canonical questions; an empty tag list remains hospital-wide.

## Content and option changes

This pass revised **57 retained questions**, including **24 option sets**. The main changes are:

- Comparable oxygen-concentration alternatives for a specified neonatal gestational range, without making every distractor obviously wrong by omitting monitoring.
- A neonatal temperature question that distinguishes patient body temperature from equipment settings and uses nonoverlapping answer ranges.
- Clinical application questions for suspected NEC, vaccine vial monitor status, safe oral hypoglycemia treatment, and oocyte-donor eligibility.
- A warfarin-specific counseling stem, avoiding an implication that all oral anticoagulants require INR monitoring.
- CSSD questions that distinguish instrument workflow from airflow, Bowie-Dick testing from proof of sterility, and event-related storage from unlimited unconditional shelf life.
- Manufacturer- and protocol-specific qualifications for aeration, cuff pressure, defibrillation energy, skin preparation, and specimen handling.
- Explanations that distinguish risk reduction from guarantees: citrate anticoagulation, witnessing, OHSS prevention, warming, and feeding position do not make all adverse outcomes impossible.
- ART explanations that avoid asserting that every volatile exposure causes chromosome damage, that all transfer cycles need identical progesterone support, or that a beta-hCG rise alone confirms pregnancy location or viability.
- ICU wording that separates the moderate-to-severe ARDS population from a misleading definition of severe ARDS based solely on a P/F ratio below 150. The MAP question now specifies a younger adult because current sepsis guidance includes separate considerations for older adults.

The department generator now validates its own questions and deterministically shuffles options by default. Raw answer positions before this pass were A/B/C/D = **3 / 131 / 5 / 1** across 140 definitions. The standalone reviewed bank is **32 / 26 / 41 / 23** across 122 questions. The combined seeder requests raw specialty options and shuffles the complete bank once, so the same specialty code has the same options and answer in either output.

## Primary reference checks

These references support the relevant refinements; the review does not claim specialist clinical approval of every item.

- [AHA/AAP 2025 neonatal resuscitation](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/neonatal-resuscitation): early ventilation, coordinated compressions, oxygen context, and newborn temperature.
- [SCCM Surviving Sepsis Campaign 2026](https://www.sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026): vasopressor choice, initial MAP and older-adult considerations, and prone ventilation context.
- [CDC ethylene oxide sterilization](https://www.cdc.gov/infection-control/hcp/disinfection-sterilization/ethylene-oxide-sterilization.html): residual exposure and aeration.
- [CDC sterilizing practices](https://www.cdc.gov/infection-control/hcp/disinfection-sterilization/sterilizing-practices.html): processing controls, packaging integrity, and storage.
- [MHAUS crisis management](https://www.mhaus.org/healthcare-professionals/managing-a-crisis/): prompt recognition and emergency response for malignant hyperthermia, including CO2, rigidity, and temperature monitoring.
- [ASRM OHSS prevention guidance](https://www.asrm.org/practice-guidance/practice-committee-documents/prevention-of-moderate-and-severe-ovarian-hyperstimulation-syndrome-a-guideline-2023/): appropriate trigger strategies, freeze-all, and reduction rather than universal elimination of risk.
- [NICE early-pregnancy diagnosis](https://www.nice.org.uk/guidance/NG126/chapter/diagnosis-of-viable-intrauterine-pregnancy-and-of-tubal-ectopic-pregnancy): limitations of hCG for determining pregnancy location and interpreting uncertain early pregnancy.
- [India Code ART Act](https://www.indiacode.nic.in/indiacode/handle/123456789/17031?view_type=browse): oocyte-donor eligibility context retained from the initial review.

## Validation and persistence

The combined content check and nine focused regression tests pass, along with the focused TypeScript check. Tests cover standalone duplicate validation, retained code/topic identity, canonical department coverage after definition removal, deterministic answer preservation, equality of standalone and combined specialty output, and retirement scope.

```powershell
pnpm exec tsx scripts/seed_500_questions.ts --check
pnpm exec vitest run tests/unit/question-bank-quality.test.ts
```

No database changes were made. On a later explicit seed run, the existing command still upserts 229 retained questions and deactivates the same 1,041 retired historical seed codes, preserving rows and existing exam snapshots.
