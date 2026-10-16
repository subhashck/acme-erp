# Department-specific assessment expansion

Initial expansion, 15 October 2026: 12 practical simulations and 36 linked MCQs across 12 departments. A further [ACME obstetrics, gynaecology and infertility expansion](acme-obgyn-infertility-assessments.md) adds 12 scenarios and 36 MCQs. The combined authored seed now contains 301 questions and 24 scenarios; the original 12 cases are described below.

Run `pnpm assessments:seed-departments` to apply both questions and scenarios atomically. Use `pnpm assessments:seed-departments --check` for question validation without a database connection. The database must already have the assessment schema and core domains.

Existing question codes are upserted by the established seed. Scenario criteria use stable DS-prefixed codes and are inserted only when absent, preserving local edits and existing scored criteria. Existing exam attempts and assessment items are not rewritten. Scenario titles identify the department; the existing criterion schema has no department routing field, so these remain available in the shared criteria library. The MCQs have explicit department tags for the existing exam selection logic.

Practical cases use the current 1-5 scale and target 4. Critical failures are explicit assessor guidance; the current module does not automatically override scores from those narrative failures. Local approved protocols and staff scope govern clinical actions.

| Department | Scenario | New MCQs |
| --- | --- | --- |
| NICU | Reducing unnecessary neonatal central-line access | 3 |
| OPD | Vaccine refrigerator temperature excursion | 3 |
| Ward | Escalating deteriorating suspected infection | 3 |
| CSSD | Implant-load release and traceability | 3 |
| OT | Resolving a surgical specimen laterality discrepancy | 3 |
| ICU/HDU | Recognizing hypoactive delirium in critical care | 3 |
| ART | Witnessing-system identity mismatch before embryo transfer | 3 |
| Emergency | Repeated reassessment of suspected sepsis at triage | 3 |
| LABORATORY | Unresolved identity on an urgent laboratory sample | 3 |
| Pharmacy | High-alert infusion concentration mismatch | 3 |
| Dialysis | Aseptic dialysis catheter connection | 3 |
| Maternity | Coordinated response to postpartum bleeding | 3 |

## DS-NICU-01: NICU - Reducing unnecessary neonatal central-line access

A stable preterm infant has a central line for parenteral nutrition. Several routine blood tests have been requested at different times. A colleague suggests opening the line separately for each sample. The assessor provides the line-care SOP and the current test requests.

### Observation checklist

- Review the necessity and timing of requests with the neonatal team; consolidate only where clinically appropriate.
- Prepare supplies and perform hand hygiene before accessing the line.
- Demonstrate hub disinfection and drying using the approved product instructions and aseptic technique.
- Keep the system closed when not in use; document access and raise daily line-necessity review.

### Critical safety failures

- Accessing a visibly contaminated connector without appropriate disinfection.
- Delaying an urgent clinically necessary sample simply to reduce the access count.

### Linked questions

**MCQ-DS-NICU-01-01: In NICU, three nonurgent tests are scheduled from a central line within a short interval. Which plan best reduces avoidable line manipulation?**

A. Ask the neonatal team whether sampling can be safely consolidated
B. Open the line separately for each request without review
C. Cancel the tests without discussing their indications
D. Use the line for every routine test regardless of necessity

Correct answer before deterministic shuffling: A. Consolidate clinically compatible requests to reduce unnecessary hub access; urgent care must remain timely.

**MCQ-DS-NICU-01-02: After disinfecting a neonatal central-line connector, what should happen before connection?**

A. Allow the product-specified drying time without touching the disinfected surface
B. Wipe it dry with a used glove
C. Reconnect while it is wet to shorten line-open time
D. Touch the connector to check whether it feels clean

Correct answer before deterministic shuffling: A. Aseptic access includes correct product contact and drying time and avoiding recontamination.

**MCQ-DS-NICU-01-03: A preterm infant develops sudden deterioration while the team is consolidating routine line blood tests. How should a newly ordered urgent sample be handled?**

A. Obtain it promptly using the approved aseptic method
B. Wait for the next routine consolidated collection
C. Omit it to meet the line-access reduction target
D. Collect it only after the next daily line review

Correct answer before deterministic shuffling: A. Reducing unnecessary access must never delay a clinically necessary urgent investigation.

[Clinical reference](https://www.cdc.gov/infection-control/hcp/nicu-clabsi/recommendations.html) (checked 15 October 2026).

## DS-OPD-01: OPD - Vaccine refrigerator temperature excursion

Before the morning immunization clinic, the digital logger shows an overnight temperature excursion. The refrigerator currently reads within range. Several families are waiting. The assessor supplies a simulated logger trace and vaccine inventory.

### Observation checklist

- Identify affected stock, label it DO NOT USE, and separate it while maintaining the recommended storage conditions.
- Notify the vaccine coordinator; record the temperature range, duration, affected products and lot numbers.
- Seek product-specific viability advice through the approved manufacturer or immunization-program channel.
- Use unaffected suitable stock if available; record the authorized disposition before releasing or discarding affected stock.

### Critical safety failures

- Administering quarantined vaccine before a viability decision.
- Discarding affected stock immediately without the required assessment and records.

### Linked questions

**MCQ-DS-OPD-01-01: An OPD refrigerator is back within range after an overnight excursion. What is the correct status of the exposed vaccine stock?**

A. Hold it separately as DO NOT USE pending a viability assessment
B. Release it because the current reading is normal
C. Release only the unopened vials without further assessment
D. Discard every vial before documenting the event

Correct answer before deterministic shuffling: A. A normal current reading does not establish viability after an excursion; quarantine and obtain product-specific advice.

**MCQ-DS-OPD-01-02: Which OPD record is most useful for assessing vaccine viability after an overnight temperature excursion?**

A. The logger time-temperature history together with affected product and lot details
B. Only the room temperature when staff arrived
C. Only the number of patients booked that day
D. Only the refrigerator purchase date

Correct answer before deterministic shuffling: A. Exposure duration, temperatures and product identity support the authorized viability decision.

**MCQ-DS-OPD-01-03: A family is waiting for a vaccine from a quarantined lot. Which action is appropriate?**

A. Use unaffected appropriate stock or arrange a safe alternative appointment
B. Administer the held vaccine with verbal consent alone
C. Warm the affected vial before administering it
D. Remove the quarantine label once the vial looks normal

Correct answer before deterministic shuffling: A. Clinical convenience and appearance cannot establish vaccine potency after a storage excursion.

[Clinical reference](https://www.cdc.gov/pinkbook/hcp/table-of-contents/chapter-5-vaccine-storage-and-handling.html) (checked 15 October 2026).

## DS-WARD-01: Ward - Escalating deteriorating suspected infection

An adult inpatient being treated for infection becomes newly confused with worsening observations. The early-warning score is below the hospital's automatic emergency-call threshold. The usual reviewing clinician has not responded to the first call. The assessor provides an observation chart and escalation contacts.

### Observation checklist

- Assess airway, breathing, circulation, mental state and the observation trend; call for urgent clinical review based on concern.
- Use the locally approved early-warning and suspected-sepsis pathway without treating the score as a substitute for judgment.
- Escalate through the next response tier if the initial clinician is unavailable; remain with the patient or ensure appropriate supervision.
- Give a structured handover with changes, relevant treatment and response; record calls, observations and reassessment.

### Critical safety failures

- Deferring escalation solely because the aggregate score is below a trigger.
- Leaving a deteriorating patient without appropriate monitoring or handover.

### Linked questions

**MCQ-DS-WARD-01-01: On a ward, new confusion develops during suspected infection despite an early-warning score below the automatic call threshold. What should the nurse do?**

A. Escalate the clinical concern urgently and reassess
B. Wait until the score reaches the automatic threshold
C. Record the change only at routine handover
D. Repeat the score tomorrow before notifying anyone

Correct answer before deterministic shuffling: A. Clinical deterioration can warrant urgent escalation even when a numerical score has not reached a trigger.

**MCQ-DS-WARD-01-02: The first clinician called for a deteriorating ward patient has not responded. What is the safest next step?**

A. Use the next tier of the escalation pathway while maintaining patient observation
B. Stop escalation because a call has already been placed
C. Ask the family to locate the clinician before reassessing
D. Wait for the next routine ward round

Correct answer before deterministic shuffling: A. Escalation must achieve a clinical response; an unanswered call is not completed care.

**MCQ-DS-WARD-01-03: Which handover best supports urgent review of a ward patient with suspected sepsis?**

A. Time-stamped deterioration, observation trends, relevant treatment and a clear request for review
B. Only the bed number and the word unwell
C. Only the latest total early-warning score
D. Only the planned discharge date

Correct answer before deterministic shuffling: A. Structured communication should convey current concern, relevant trends and the response required.

[Clinical reference](https://www.nice.org.uk/guidance/ng253/chapter/Managing-suspected-sepsis) (checked 15 October 2026).

## DS-CSSD-01: CSSD - Implant-load release and traceability

An implant-containing steam-sterilizer load has completed its cycle. The physical and chemical records are acceptable, but its biological-indicator result is pending. The theatre requests the implants for a scheduled case. The assessor provides the release SOP and load log.

### Observation checklist

- Check the load identifier, cycle records and monitoring results against release criteria.
- Quarantine implantable items pending a negative biological result whenever possible; explain the restriction to theatre.
- If an exceptional urgent release is requested, escalate through the authorized documented risk process rather than releasing independently.
- Maintain traceability from load and indicator result to any released item and receiving location.

### Critical safety failures

- Routine release of implants on chemical-indicator color alone despite a pending required biological result.
- Losing the link between the sterilization load and the implant supplied.

### Linked questions

**MCQ-DS-CSSD-01-01: CSSD has an implant load with acceptable physical and chemical checks but a pending biological indicator. What is the preferred release decision?**

A. Quarantine the implants until a negative biological result whenever possible
B. Release because the external indicator changed color
C. Release because the packs are cool
D. Ignore the indicator because the load contains implants

Correct answer before deterministic shuffling: A. CDC recommends biological monitoring for every implant-containing load and quarantine pending a negative result whenever possible.

**MCQ-DS-CSSD-01-02: An urgent request is made to release a quarantined implant before the biological result. What should the CSSD technician do?**

A. Escalate under the authorized exceptional-release process and document the decision
B. Release on the basis of the caller's seniority alone
C. Change the pending indicator result to negative
D. Remove the implant from the load log before release

Correct answer before deterministic shuffling: A. Exceptional release requires authorization and traceability; staff must not invent monitoring results.

**MCQ-DS-CSSD-01-03: Which CSSD record permits targeted follow-up if an implant load later fails monitoring?**

A. The load identifier linked to monitoring results and the destination of each released item
B. A monthly total of all processed packs
C. The instrument purchase price alone
D. A list of staff attendance without load details

Correct answer before deterministic shuffling: A. Load-level traceability supports investigation and retrieval of affected items.

[Clinical reference](https://www.cdc.gov/infection-control/hcp/disinfection-sterilization/summary-recommendations.html) (checked 15 October 2026).

## DS-OT-01: OT - Resolving a surgical specimen laterality discrepancy

At sign-out, the surgeon describes a left-sided specimen, while the container label says right. The patient is still in theatre and the specimen has not left the room. The assessor supplies a mock label, request form and operative record.

### Observation checklist

- Pause specimen dispatch and clearly state the discrepancy to the team.
- Reconcile patient identifiers, specimen name, site and side with the responsible surgeon and contemporaneous operative information.
- Correct documentation through the approved traceable process; do not guess or conceal the original discrepancy.
- Read back the resolved label and request information, document the checks and complete sign-out before dispatch.

### Critical safety failures

- Dispatching the specimen with unresolved patient or site information.
- Relabeling the specimen by guessing the side.

### Linked questions

**MCQ-DS-OT-01-01: During OT sign-out, the specimen container says right but the surgeon says left. What should happen before dispatch?**

A. Pause dispatch and reconcile the discrepancy with the responsible team
B. Send the container and let the laboratory choose the side
C. Use whichever side is printed on the request first
D. Remove laterality from all records to avoid conflict

Correct answer before deterministic shuffling: A. Specimen labeling must be reconciled before leaving theatre; uncertainty must not be transferred downstream.

**MCQ-DS-OT-01-02: After resolving an OT specimen-label discrepancy, which final check best supports safe sign-out?**

A. Read back patient identifiers and specimen site or side against the corrected request
B. Check only that the container lid is closed
C. Check only the surgeon's handwriting
D. Check only that the courier has arrived

Correct answer before deterministic shuffling: A. Verbal confirmation of identifying and specimen details helps detect remaining mismatches.

**MCQ-DS-OT-01-03: What is the appropriate record of a corrected surgical specimen-label error?**

A. A traceable correction showing verification and the responsible staff
B. A replacement label with the discrepancy deliberately omitted from records
C. A verbal assurance with no updated request
D. Deletion of the specimen from the operative record

Correct answer before deterministic shuffling: A. Corrections should preserve an auditable account of verification and the resolved discrepancy.

[Clinical reference](https://www.who.int/teams/integrated-health-services/quality-of-care-and-patient-safety/patient-safety-guidance-and-tools/safe-surgery/tool-and-resources) (checked 15 October 2026).

## DS-ICU-01: ICU/HDU - Recognizing hypoactive delirium in critical care

An older adult in ICU becomes unusually withdrawn and inattentive after previously interacting normally. There is no agitation. The assessor provides recent observations, medication changes and the unit's delirium tool.

### Observation checklist

- Assess for acute deterioration and reversible contributors, including oxygenation, infection, pain and medication effects; notify the clinical team.
- Assess delirium using CAM-ICU or ICDSC, applying the tool's arousal requirements.
- Document baseline, onset, fluctuation and tool findings; seek collateral information where appropriate.
- Provide orientation and appropriate sensory aids, protect sleep and support safe mobilization in the individualized care plan.

### Critical safety failures

- Assuming absence of agitation excludes delirium.
- Treating an unassessable deeply sedated patient as a negative delirium screen.

### Linked questions

**MCQ-DS-ICU-01-01: An ICU patient becomes quiet, withdrawn and inattentive without agitation. Which interpretation is safest?**

A. Possible hypoactive delirium requiring assessment for causes
B. Normal recovery because there is no agitation
C. Proof of dementia without further assessment
D. Evidence that delirium monitoring can stop

Correct answer before deterministic shuffling: A. Delirium can present with reduced activity and withdrawal, so quiet behavior does not exclude it.

**MCQ-DS-ICU-01-02: Which delirium tools does NICE recommend in critical care rather than the general-ward 4AT?**

A. CAM-ICU or ICDSC
B. Braden scale or Waterlow score
C. Glasgow Coma Scale alone
D. A falls-risk score alone

Correct answer before deterministic shuffling: A. CAM-ICU and ICDSC are recommended assessment tools in critical care.

**MCQ-DS-ICU-01-03: An ICU patient is too deeply sedated for the selected delirium assessment. How should the result be handled?**

A. Document that assessment is not possible and reassess when appropriate
B. Record a negative screen because no answers were obtained
C. Record normal attention by default
D. Diagnose dementia from the failed assessment

Correct answer before deterministic shuffling: A. Inability to assess must be distinguished from a negative screen; use the tool's arousal criteria.

[Clinical reference](https://www.nice.org.uk/guidance/cg103/chapter/Recommendations) (checked 15 October 2026).

## DS-ART-01: ART - Witnessing-system identity mismatch before embryo transfer

Immediately before an embryo-transfer step, the witnessing system flags a mismatch between the patient's treatment record and the material identifier. A colleague suggests bypassing the alert to keep the list moving. No transfer has taken place.

### Observation checklist

- Stop the affected step and maintain secure segregation and appropriate conditions for the biological material.
- Notify the responsible embryologist and clinical lead; reconcile identifiers against original traceability and consent records.
- Use only the validated contingency witnessing procedure if a system fault is established and authorized.
- Document the deviation, investigation, verification and authorization before any restart; maintain communication through the responsible clinical team.

### Critical safety failures

- Bypassing an unresolved mismatch and proceeding with transfer.
- Changing material identifiers merely to make the system accept them.

### Linked questions

**MCQ-DS-ART-01-01: An ART witnessing-system mismatch occurs before embryo transfer. What is the immediate response?**

A. Stop the affected step and secure the material while the discrepancy is investigated
B. Override the mismatch because the patient is ready
C. Relabel the material to match the screen without verification
D. Use the appointment order to infer identity

Correct answer before deterministic shuffling: A. An unresolved identity mismatch requires a stop and investigation before the affected procedure proceeds.

**MCQ-DS-ART-01-02: The ART team confirms an electronic witnessing-system fault. What allows work to restart safely?**

A. The authorized validated contingency procedure with documented identity checks
B. One staff member's memory of the patient's case
C. Disabling all future alerts for that patient
D. Using the treatment-room number as the sole identifier

Correct answer before deterministic shuffling: A. A system fault does not remove the need for validated witnessing, identity verification and traceable authorization.

**MCQ-DS-ART-01-03: Which ART record best documents resolution of a witnessing deviation?**

A. The mismatch, material identifiers, verification, staff, timing and authorized restart
B. Only a note saying computer error
C. Only the next appointment time
D. Only the invoice number with no material traceability

Correct answer before deterministic shuffling: A. Traceability must link the material and verification process to the staff and time of the resolved event.

[Clinical reference](https://www.asrm.org/practice-guidance/practice-committee-documents/witnessing-and-protocol-deviations-in-the-in-vitro-fertilization-and-andrology-laboratory-a-committee-opinion/) (checked 15 October 2026).

## DS-EMERGENCY-01: Emergency - Repeated reassessment of suspected sepsis at triage

An adult with suspected infection is awaiting review in Emergency. A repeat set of observations is worse and the patient is increasingly drowsy. The patient is not pregnant or recently pregnant. The assessor provides the adult suspected-sepsis pathway and escalation contacts.

### Observation checklist

- Reassess promptly using an ABCDE approach and call for urgent appropriate clinical support.
- Update the locally approved risk assessment using current observations and clinical concern, rather than the arrival category alone.
- Move to an appropriately monitored care area through the department's escalation process and begin prescribed or protocol-authorized care within role.
- Hand over the trend and actions taken; document and repeat reassessment according to risk and response.

### Critical safety failures

- Leaving the patient in the original queue despite worsening consciousness and observations.
- Using an adult nonpregnant pathway without checking whether it applies to the patient.

### Linked questions

**MCQ-DS-EMERGENCY-01-01: In Emergency, a patient with suspected infection deteriorates after the initial triage category was assigned. Which priority should guide care?**

A. The current assessment and deterioration trend
B. The original queue position regardless of change
C. The planned laboratory turnaround time alone
D. The registration time alone

Correct answer before deterministic shuffling: A. Sepsis risk and clinical priority require reassessment when the patient's condition changes.

**MCQ-DS-EMERGENCY-01-02: Before using a nonpregnant adult suspected-sepsis pathway, which patient characteristic requires checking?**

A. Whether the patient is pregnant or recently pregnant and needs the relevant pathway
B. Whether the patient has paid the registration fee
C. Whether the patient arrived before the shift change
D. Whether the patient has attended this hospital previously

Correct answer before deterministic shuffling: A. Sepsis guidance is population-specific; pregnancy and recent pregnancy require the appropriate pathway.

**MCQ-DS-EMERGENCY-01-03: A suspected-sepsis patient becomes drowsier in the Emergency waiting area. What is the safest location plan?**

A. Escalate for an appropriately monitored care area with clinical review
B. Keep the original waiting location until every test is complete
C. Send the patient unaccompanied to locate a clinician
D. Ask the patient to return if the next observation is worse

Correct answer before deterministic shuffling: A. Deterioration requires active escalation and a care setting appropriate to the current risk.

[Clinical reference](https://www.nice.org.uk/guidance/ng253/chapter/Evaluating-risk) (checked 15 October 2026).

## DS-LAB-01: LABORATORY - Unresolved identity on an urgent laboratory sample

An urgent blood tube arrives with identifiers that do not match the request. The collector asks the laboratory to change the label based on a telephone description. The assessor provides the sample acceptance and exceptional-sample SOPs.

### Observation checklist

- Hold processing or reporting as required by the SOP and record the discrepancy without guessing identity.
- Contact the requesting team promptly and explain the clinical delay and need for resolution or recollection.
- For an irreplaceable or exceptional sample, involve the authorized laboratory clinician and follow the documented exception process.
- Record the decision, communications and any specimen limitations; preserve sample-to-patient traceability.

### Critical safety failures

- Relabeling the sample from an unverified telephone description.
- Releasing a result under an unresolved patient identity.

### Linked questions

**MCQ-DS-LAB-01-01: An urgent blood tube and its request have conflicting identifiers. What should laboratory staff do?**

A. Follow the acceptance SOP, hold unsafe release and contact the requesting team
B. Choose the identity with the more complete handwriting
C. Change the tube label using an unverified phone description
D. Release under both patients so one receives the result

Correct answer before deterministic shuffling: A. Urgency does not establish specimen identity; discrepancies require a controlled resolution process.

**MCQ-DS-LAB-01-02: A laboratory sample with an identity discrepancy is considered irreplaceable. Who should determine whether exceptional processing is permitted?**

A. The authorized laboratory clinician under the documented exception SOP
B. Any available courier
C. The receptionist using arrival order
D. The analyzer operator without an exception record

Correct answer before deterministic shuffling: A. Exceptional acceptance requires authorized assessment and documented limitations, rather than informal relabeling.

**MCQ-DS-LAB-01-03: Which communication is essential when an urgent laboratory specimen cannot be safely accepted?**

A. Promptly tell the clinical team the reason, required next step and potential delay
B. Wait until the end-of-day rejection summary
C. Silently remove the request from the worklist
D. Report a normal result to avoid delaying care

Correct answer before deterministic shuffling: A. Timely communication enables safe recollection or an authorized exception and reduces avoidable treatment delays.

[Clinical reference](https://www.who.int/publications/m/item/laboratory-quality-manual) (checked 15 October 2026).

## DS-PHARMACY-01: Pharmacy - High-alert infusion concentration mismatch

A high-alert infusion is requested from Pharmacy. The written order specifies a concentration different from the prepared label and the ward's standard pump-library entry. The product has not been dispatched. The assessor supplies a mock order, label and high-alert medication SOP.

### Observation checklist

- Hold dispatch and reconcile the order, prepared product and approved concentration with the prescriber and receiving team.
- Verify patient, drug, concentration, dose units and route against the resolved order.
- Apply the required independent check for this selected high-risk process; the second checker verifies separately against the source information.
- Correct the product and documentation through the approved process; communicate the resolved concentration and report the intercepted error.

### Critical safety failures

- Dispatching an unresolved high-alert concentration mismatch.
- Treating two signatures without separate verification as an independent check.

### Linked questions

**MCQ-DS-PHARMACY-01-01: Pharmacy finds that a high-alert infusion label differs from the prescribed concentration and standard pump entry. What is the safest action?**

A. Hold dispatch and reconcile all three through the authorized clinical process
B. Send it and ask the ward to select whichever concentration is available
C. Change only the label without checking the contents
D. Override the pump entry to match an unverified preparation

Correct answer before deterministic shuffling: A. Concentration mismatches must be resolved before supply; labels and device settings must match the verified product and order.

**MCQ-DS-PHARMACY-01-02: For a selected high-alert preparation requiring an independent double check, which method is appropriate?**

A. A second qualified checker separately verifies the relevant information against the source order
B. The first checker reads out the answer and the second signs
C. Two signatures are added after dispatch without checking
D. A single checker signs twice using two initials

Correct answer before deterministic shuffling: A. Independent checks require separate verification and complement other medication safety controls.

**MCQ-DS-PHARMACY-01-03: A concentration error is intercepted in Pharmacy before dispatch. How should it be handled after correction?**

A. Document and report the near miss through the medication-safety process
B. Ignore it because the patient did not receive the product
C. Delete the order so the discrepancy is no longer visible
D. Record that the patient had an adverse reaction

Correct answer before deterministic shuffling: A. Near-miss reporting supports learning about preparation and concentration controls without misrepresenting patient harm.

[Clinical reference](https://ismpcanada.ca/bulletin/a-new-canadian-approach-to-high-alert-medications/) (checked 15 October 2026).

## DS-DIALYSIS-01: Dialysis - Aseptic dialysis catheter connection

During hemodialysis setup, a disinfected catheter hub is accidentally touched by a contaminated glove before connection. The patient is stable and treatment has not started. The assessor provides the catheter connection SOP and compatible disinfection supplies.

### Observation checklist

- Stop the connection attempt and identify the break in aseptic technique.
- Perform hand hygiene and change contaminated gloves or supplies as indicated; repeat hub disinfection under the approved SOP.
- Observe the specified contact and drying requirements and avoid recontamination before connection.
- Explain the safety step to the patient, document any incident according to policy and reinforce catheter-care education.

### Critical safety failures

- Connecting to the extracorporeal circuit after a contaminated hub touch without corrective disinfection.
- Using a product incompatible with the catheter contrary to the approved SOP.

### Linked questions

**MCQ-DS-DIALYSIS-01-01: A dialysis catheter hub is touched by a contaminated glove after disinfection but before connection. What should happen?**

A. Stop and repeat the necessary aseptic preparation before connecting
B. Connect quickly because the hub was cleaned earlier
C. Cover the touched hub with tape and start treatment
D. Flush the circuit to replace hub disinfection

Correct answer before deterministic shuffling: A. A contaminated touch breaches asepsis and requires correction before catheter access.

**MCQ-DS-DIALYSIS-01-02: Which instruction should guide dialysis catheter-hub disinfectant contact and drying times?**

A. The approved catheter-care SOP and compatible product instructions
B. The time remaining before the next appointment
C. The operator's preferred shortest interval
D. The external appearance of the catheter alone

Correct answer before deterministic shuffling: A. Use validated, compatible products with the specified application requirements.

**MCQ-DS-DIALYSIS-01-03: Which patient education supports dialysis catheter infection prevention?**

A. Report redness, drainage, fever or catheter problems promptly and follow access-care instructions
B. Open the catheter caps at home to inspect the lumen
C. Use leftover antibiotics whenever the dressing feels uncomfortable
D. Ignore new fever if the catheter still functions

Correct answer before deterministic shuffling: A. Patients should recognize and report possible infection and avoid unauthorized catheter manipulation.

[Clinical reference](https://www.cdc.gov/dialysis-safety/hcp/clinical-safety/) (checked 15 October 2026).

## DS-MATERNITY-01: Maternity - Coordinated response to postpartum bleeding

Soon after vaginal birth, a woman has ongoing heavy bleeding, pallor and worsening observations. The team is still calculating cumulative blood loss. The assessor provides the hospital's postpartum-haemorrhage response chart and emergency equipment checklist.

### Observation checklist

- Recognize the emergency and activate the obstetric haemorrhage response without waiting for a perfect blood-loss calculation.
- Assess the woman and measure cumulative blood loss objectively where possible while monitoring clinical status.
- Assist the authorized team with the local first-response treatment bundle, equipment and prescribed medicines within role.
- Assign communication and documentation roles; track response, escalate ongoing bleeding and give a structured handover.

### Critical safety failures

- Delaying the emergency response until a final blood-loss total is available despite deterioration.
- Leaving ongoing bleeding unmonitored after the initial intervention.

### Linked questions

**MCQ-DS-MATERNITY-01-01: After vaginal birth, ongoing heavy bleeding is accompanied by pallor and worsening observations while cumulative loss is still being calculated. What is the priority?**

A. Activate the obstetric haemorrhage response and begin assessment and authorized care
B. Wait for a final calculated volume before calling for help
C. Complete the discharge paperwork first
D. Reassess only after the next routine observation interval

Correct answer before deterministic shuffling: A. Clinical deterioration with ongoing postpartum bleeding requires immediate coordinated care; measurement must not delay response.

**MCQ-DS-MATERNITY-01-02: Which approach best supports assessment of postpartum blood loss?**

A. Objective cumulative measurement combined with the woman's clinical condition
B. Visual estimation alone regardless of available measurement tools
C. Counting pads without assessing the woman
D. Using pulse rate alone as the total blood-loss estimate

Correct answer before deterministic shuffling: A. Objective measurement and clinical assessment support earlier recognition and response.

**MCQ-DS-MATERNITY-01-03: Bleeding continues after the first postpartum-haemorrhage interventions. What should the team do?**

A. Reassess response and escalate promptly under the obstetric pathway
B. Assume the first response is sufficient and stop monitoring
C. Wait for routine ward transfer before informing the obstetrician
D. Record the initial treatment as successful without reassessment

Correct answer before deterministic shuffling: A. Ongoing bleeding requires reassessment and escalation within a coordinated treatment pathway.

[Clinical reference](https://www.who.int/publications/i/item/9789240115637) (checked 15 October 2026).
