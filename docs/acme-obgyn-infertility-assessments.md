# ACME obstetrics, gynaecology and infertility expansion

Adds 12 original practical simulations and 36 distinct, linked MCQs to the existing assessment library. The combined authored seed now has 301 questions and 24 scenarios. These cases model ACME's stated service mix; they do not assert that ACME has a particular device, emergency number or approved treatment policy.

| Audience tag | Scenario | Code |
| --- | --- | --- |
| Maternity | Severe hypertension with headache and visual symptoms | DS-ACME-OBS-01 |
| Maternity | Excessive contractions and fetal concern during oxytocin | DS-ACME-OBS-02 |
| Maternity | Telephone triage for reduced fetal movements | DS-ACME-OBS-03 |
| Maternity | Acute post-caesarean breathlessness | DS-ACME-OBS-04 |
| OPD | Worsening symptoms in pregnancy of unknown location | DS-ACME-GYN-01 |
| OPD | Sensitive pregnancy-loss communication | DS-ACME-GYN-02 |
| ART | Escalating possible OHSS | DS-ACME-ART-01 |
| ART | Concurrent infertility evaluation without blame | DS-ACME-ART-02 |
| ART | Counselling about low AMH | DS-ACME-ART-03 |
| ART | Incomplete semen collection | DS-ACME-ART-04 |
| ART | Unresolved embryo-disposition consent | DS-ACME-ART-05 |
| ART | Uncertain trigger-injection timing | DS-ACME-ART-06 |

Each case includes an observable checklist, critical safety failures and three MCQs with explanations. Existing domain codes and department tags support the current CBT mix settings. Scenario criteria remain in the shared library because criteria do not currently have a department routing column. New criteria are available for newly created assessments; existing assessment item lists and attempt snapshots are not rewritten.

Medication doses, restart decisions, retrieval scheduling and emergency actions remain subject to approved ACME protocols, clinician authorization and staff scope. ASRM and UK sources inform clinical safety content, not Indian statutory consent rules; the disposition scenario explicitly defers authorization to applicable Indian requirements and local policy. Narrative critical failures remain assessor guidance, not an automatic scoring override.

## Validation and additive seed

```powershell
pnpm exec tsx scripts/seed_500_questions.ts --check
pnpm exec vitest run tests/unit/question-bank-quality.test.ts
pnpm assessments:seed-departments --acme-only --check
pnpm assessments:seed-departments --acme-only
```

The targeted flag processes only the new `DS-ACME-*` scenarios and `MCQ-DS-ACME-*` questions in one transaction. It does not reseed unrelated question codes or retire historical codes. Criteria insert only when absent, preserving local edits; questions upsert by stable code, making reruns idempotent. No question-bank purge is needed.

## References

References are stored with each practical guideline, checked 15 October 2026:

- [NICE: hypertension in pregnancy](https://www.nice.org.uk/guidance/ng133/chapter/Recommendations)
- [NICE: fetal monitoring in labour](https://www.nice.org.uk/guidance/ng229/chapter/Recommendations)
- [RCOG: reduced fetal movements](https://www.rcog.org.uk/guidance/browse-all-guidance/green-top-guidelines/reduced-fetal-movements-green-top-guideline-no-57/)
- [RCOG: venous thrombosis in pregnancy and after birth](https://www.rcog.org.uk/for-the-public/browse-our-patient-information/diagnosis-and-treatment-of-venous-thrombosis-in-pregnancy-and-after-birth/)
- [NICE: pregnancy of unknown location](https://www.nice.org.uk/guidance/NG126/chapter/diagnosis-of-viable-intrauterine-pregnancy-and-of-tubal-ectopic-pregnancy)
- [NICE: ectopic pregnancy and miscarriage](https://www.nice.org.uk/guidance/ng126)
- [RCOG: OHSS](https://www.rcog.org.uk/for-the-public/browse-our-patient-information/ovarian-hyperstimulation-syndrome/)
- [ASRM: fertility evaluation](https://www.asrm.org/practice-guidance/practice-committee-documents/fertility-evaluation-of-infertile-women-a-committee-opinion-2021/)
- [ASRM: ovarian reserve testing](https://www.asrm.org/practice-guidance/practice-committee-documents/testing-and-interpreting-measures-of-ovarian-reserve-a-committee-opinion-2020/)
- [WHO: semen examination manual, sixth edition](https://www.who.int/publications/i/item/9789240030787)
- [ASRM: witnessing and protocol deviations](https://www.asrm.org/practice-guidance/practice-committee-documents/witnessing-and-protocol-deviations-in-the-in-vitro-fertilization-and-andrology-laboratory-a-committee-opinion/)
- [Saint Mary's Hospital: IVF and trigger injection](https://mft.nhs.uk/saint-marys/services/gynaecology/reproductive-medicine/in-vitro-fertilisation-ivf/)
