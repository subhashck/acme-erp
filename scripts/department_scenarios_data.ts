import type { QuestionDef } from "./seed_500_questions.ts";
import { acmeObgynInfertilityScenarios } from "./acme_obgyn_infertility_scenarios.ts";

type Question = {
  stem: string;
  /** Correct answer first; the combined bank shuffles options deterministically. */
  choices: [string, string, string, string];
  rationale: string;
};

export interface DepartmentScenario {
  code: string;
  department: string;
  domainCode: QuestionDef["domainCode"];
  title: string;
  situation: string;
  actions: string[];
  criticalFailures: string[];
  questions: Question[];
  source: string;
}

/** Original teaching cases; medication doses and device settings follow approved local protocols. */
export const departmentScenarios: DepartmentScenario[] = [
  {
    code: "DS-NICU-01", department: "NICU", domainCode: "HIC",
    title: "Reducing unnecessary neonatal central-line access",
    situation: "A stable preterm infant has a central line for parenteral nutrition. Several routine blood tests have been requested at different times. A colleague suggests opening the line separately for each sample. The assessor provides the line-care SOP and the current test requests.",
    actions: ["Review the necessity and timing of requests with the neonatal team; consolidate only where clinically appropriate.", "Prepare supplies and perform hand hygiene before accessing the line.", "Demonstrate hub disinfection and drying using the approved product instructions and aseptic technique.", "Keep the system closed when not in use; document access and raise daily line-necessity review."],
    criticalFailures: ["Accessing a visibly contaminated connector without appropriate disinfection.", "Delaying an urgent clinically necessary sample simply to reduce the access count."],
    questions: [
      { stem: "In NICU, three nonurgent tests are scheduled from a central line within a short interval. Which plan best reduces avoidable line manipulation?", choices: ["Ask the neonatal team whether sampling can be safely consolidated", "Open the line separately for each request without review", "Cancel the tests without discussing their indications", "Use the line for every routine test regardless of necessity"], rationale: "Consolidate clinically compatible requests to reduce unnecessary hub access; urgent care must remain timely." },
      { stem: "After disinfecting a neonatal central-line connector, what should happen before connection?", choices: ["Allow the product-specified drying time without touching the disinfected surface", "Wipe it dry with a used glove", "Reconnect while it is wet to shorten line-open time", "Touch the connector to check whether it feels clean"], rationale: "Aseptic access includes correct product contact and drying time and avoiding recontamination." },
      { stem: "A preterm infant develops sudden deterioration while the team is consolidating routine line blood tests. How should a newly ordered urgent sample be handled?", choices: ["Obtain it promptly using the approved aseptic method", "Wait for the next routine consolidated collection", "Omit it to meet the line-access reduction target", "Collect it only after the next daily line review"], rationale: "Reducing unnecessary access must never delay a clinically necessary urgent investigation." },
    ],
    source: "https://www.cdc.gov/infection-control/hcp/nicu-clabsi/recommendations.html",
  },
  {
    code: "DS-OPD-01", department: "OPD", domainCode: "PSQ",
    title: "Vaccine refrigerator temperature excursion",
    situation: "Before the morning immunization clinic, the digital logger shows an overnight temperature excursion. The refrigerator currently reads within range. Several families are waiting. The assessor supplies a simulated logger trace and vaccine inventory.",
    actions: ["Identify affected stock, label it DO NOT USE, and separate it while maintaining the recommended storage conditions.", "Notify the vaccine coordinator; record the temperature range, duration, affected products and lot numbers.", "Seek product-specific viability advice through the approved manufacturer or immunization-program channel.", "Use unaffected suitable stock if available; record the authorized disposition before releasing or discarding affected stock."],
    criticalFailures: ["Administering quarantined vaccine before a viability decision.", "Discarding affected stock immediately without the required assessment and records."],
    questions: [
      { stem: "An OPD refrigerator is back within range after an overnight excursion. What is the correct status of the exposed vaccine stock?", choices: ["Hold it separately as DO NOT USE pending a viability assessment", "Release it because the current reading is normal", "Release only the unopened vials without further assessment", "Discard every vial before documenting the event"], rationale: "A normal current reading does not establish viability after an excursion; quarantine and obtain product-specific advice." },
      { stem: "Which OPD record is most useful for assessing vaccine viability after an overnight temperature excursion?", choices: ["The logger time-temperature history together with affected product and lot details", "Only the room temperature when staff arrived", "Only the number of patients booked that day", "Only the refrigerator purchase date"], rationale: "Exposure duration, temperatures and product identity support the authorized viability decision." },
      { stem: "A family is waiting for a vaccine from a quarantined lot. Which action is appropriate?", choices: ["Use unaffected appropriate stock or arrange a safe alternative appointment", "Administer the held vaccine with verbal consent alone", "Warm the affected vial before administering it", "Remove the quarantine label once the vial looks normal"], rationale: "Clinical convenience and appearance cannot establish vaccine potency after a storage excursion." },
    ],
    source: "https://www.cdc.gov/pinkbook/hcp/table-of-contents/chapter-5-vaccine-storage-and-handling.html",
  },
  {
    code: "DS-WARD-01", department: "Ward", domainCode: "COP_BLS",
    title: "Escalating deteriorating suspected infection",
    situation: "An adult inpatient being treated for infection becomes newly confused with worsening observations. The early-warning score is below the hospital's automatic emergency-call threshold. The usual reviewing clinician has not responded to the first call. The assessor provides an observation chart and escalation contacts.",
    actions: ["Assess airway, breathing, circulation, mental state and the observation trend; call for urgent clinical review based on concern.", "Use the locally approved early-warning and suspected-sepsis pathway without treating the score as a substitute for judgment.", "Escalate through the next response tier if the initial clinician is unavailable; remain with the patient or ensure appropriate supervision.", "Give a structured handover with changes, relevant treatment and response; record calls, observations and reassessment."],
    criticalFailures: ["Deferring escalation solely because the aggregate score is below a trigger.", "Leaving a deteriorating patient without appropriate monitoring or handover."],
    questions: [
      { stem: "On a ward, new confusion develops during suspected infection despite an early-warning score below the automatic call threshold. What should the nurse do?", choices: ["Escalate the clinical concern urgently and reassess", "Wait until the score reaches the automatic threshold", "Record the change only at routine handover", "Repeat the score tomorrow before notifying anyone"], rationale: "Clinical deterioration can warrant urgent escalation even when a numerical score has not reached a trigger." },
      { stem: "The first clinician called for a deteriorating ward patient has not responded. What is the safest next step?", choices: ["Use the next tier of the escalation pathway while maintaining patient observation", "Stop escalation because a call has already been placed", "Ask the family to locate the clinician before reassessing", "Wait for the next routine ward round"], rationale: "Escalation must achieve a clinical response; an unanswered call is not completed care." },
      { stem: "Which handover best supports urgent review of a ward patient with suspected sepsis?", choices: ["Time-stamped deterioration, observation trends, relevant treatment and a clear request for review", "Only the bed number and the word unwell", "Only the latest total early-warning score", "Only the planned discharge date"], rationale: "Structured communication should convey current concern, relevant trends and the response required." },
    ],
    source: "https://www.nice.org.uk/guidance/ng253/chapter/Managing-suspected-sepsis",
  },
  {
    code: "DS-CSSD-01", department: "CSSD", domainCode: "HIC",
    title: "Implant-load release and traceability",
    situation: "An implant-containing steam-sterilizer load has completed its cycle. The physical and chemical records are acceptable, but its biological-indicator result is pending. The theatre requests the implants for a scheduled case. The assessor provides the release SOP and load log.",
    actions: ["Check the load identifier, cycle records and monitoring results against release criteria.", "Quarantine implantable items pending a negative biological result whenever possible; explain the restriction to theatre.", "If an exceptional urgent release is requested, escalate through the authorized documented risk process rather than releasing independently.", "Maintain traceability from load and indicator result to any released item and receiving location."],
    criticalFailures: ["Routine release of implants on chemical-indicator color alone despite a pending required biological result.", "Losing the link between the sterilization load and the implant supplied."],
    questions: [
      { stem: "CSSD has an implant load with acceptable physical and chemical checks but a pending biological indicator. What is the preferred release decision?", choices: ["Quarantine the implants until a negative biological result whenever possible", "Release because the external indicator changed color", "Release because the packs are cool", "Ignore the indicator because the load contains implants"], rationale: "CDC recommends biological monitoring for every implant-containing load and quarantine pending a negative result whenever possible." },
      { stem: "An urgent request is made to release a quarantined implant before the biological result. What should the CSSD technician do?", choices: ["Escalate under the authorized exceptional-release process and document the decision", "Release on the basis of the caller's seniority alone", "Change the pending indicator result to negative", "Remove the implant from the load log before release"], rationale: "Exceptional release requires authorization and traceability; staff must not invent monitoring results." },
      { stem: "Which CSSD record permits targeted follow-up if an implant load later fails monitoring?", choices: ["The load identifier linked to monitoring results and the destination of each released item", "A monthly total of all processed packs", "The instrument purchase price alone", "A list of staff attendance without load details"], rationale: "Load-level traceability supports investigation and retrieval of affected items." },
    ],
    source: "https://www.cdc.gov/infection-control/hcp/disinfection-sterilization/summary-recommendations.html",
  },
  {
    code: "DS-OT-01", department: "OT", domainCode: "DOC_COMM",
    title: "Resolving a surgical specimen laterality discrepancy",
    situation: "At sign-out, the surgeon describes a left-sided specimen, while the container label says right. The patient is still in theatre and the specimen has not left the room. The assessor supplies a mock label, request form and operative record.",
    actions: ["Pause specimen dispatch and clearly state the discrepancy to the team.", "Reconcile patient identifiers, specimen name, site and side with the responsible surgeon and contemporaneous operative information.", "Correct documentation through the approved traceable process; do not guess or conceal the original discrepancy.", "Read back the resolved label and request information, document the checks and complete sign-out before dispatch."],
    criticalFailures: ["Dispatching the specimen with unresolved patient or site information.", "Relabeling the specimen by guessing the side."],
    questions: [
      { stem: "During OT sign-out, the specimen container says right but the surgeon says left. What should happen before dispatch?", choices: ["Pause dispatch and reconcile the discrepancy with the responsible team", "Send the container and let the laboratory choose the side", "Use whichever side is printed on the request first", "Remove laterality from all records to avoid conflict"], rationale: "Specimen labeling must be reconciled before leaving theatre; uncertainty must not be transferred downstream." },
      { stem: "After resolving an OT specimen-label discrepancy, which final check best supports safe sign-out?", choices: ["Read back patient identifiers and specimen site or side against the corrected request", "Check only that the container lid is closed", "Check only the surgeon's handwriting", "Check only that the courier has arrived"], rationale: "Verbal confirmation of identifying and specimen details helps detect remaining mismatches." },
      { stem: "What is the appropriate record of a corrected surgical specimen-label error?", choices: ["A traceable correction showing verification and the responsible staff", "A replacement label with the discrepancy deliberately omitted from records", "A verbal assurance with no updated request", "Deletion of the specimen from the operative record"], rationale: "Corrections should preserve an auditable account of verification and the resolved discrepancy." },
    ],
    source: "https://www.who.int/teams/integrated-health-services/quality-of-care-and-patient-safety/patient-safety-guidance-and-tools/safe-surgery/tool-and-resources",
  },
  {
    code: "DS-ICU-01", department: "ICU/HDU", domainCode: "PSQ",
    title: "Recognizing hypoactive delirium in critical care",
    situation: "An older adult in ICU becomes unusually withdrawn and inattentive after previously interacting normally. There is no agitation. The assessor provides recent observations, medication changes and the unit's delirium tool.",
    actions: ["Assess for acute deterioration and reversible contributors, including oxygenation, infection, pain and medication effects; notify the clinical team.", "Assess delirium using CAM-ICU or ICDSC, applying the tool's arousal requirements.", "Document baseline, onset, fluctuation and tool findings; seek collateral information where appropriate.", "Provide orientation and appropriate sensory aids, protect sleep and support safe mobilization in the individualized care plan."],
    criticalFailures: ["Assuming absence of agitation excludes delirium.", "Treating an unassessable deeply sedated patient as a negative delirium screen."],
    questions: [
      { stem: "An ICU patient becomes quiet, withdrawn and inattentive without agitation. Which interpretation is safest?", choices: ["Possible hypoactive delirium requiring assessment for causes", "Normal recovery because there is no agitation", "Proof of dementia without further assessment", "Evidence that delirium monitoring can stop"], rationale: "Delirium can present with reduced activity and withdrawal, so quiet behavior does not exclude it." },
      { stem: "Which delirium tools does NICE recommend in critical care rather than the general-ward 4AT?", choices: ["CAM-ICU or ICDSC", "Braden scale or Waterlow score", "Glasgow Coma Scale alone", "A falls-risk score alone"], rationale: "CAM-ICU and ICDSC are recommended assessment tools in critical care." },
      { stem: "An ICU patient is too deeply sedated for the selected delirium assessment. How should the result be handled?", choices: ["Document that assessment is not possible and reassess when appropriate", "Record a negative screen because no answers were obtained", "Record normal attention by default", "Diagnose dementia from the failed assessment"], rationale: "Inability to assess must be distinguished from a negative screen; use the tool's arousal criteria." },
    ],
    source: "https://www.nice.org.uk/guidance/cg103/chapter/Recommendations",
  },
  {
    code: "DS-ART-01", department: "ART", domainCode: "PSQ",
    title: "Witnessing-system identity mismatch before embryo transfer",
    situation: "Immediately before an embryo-transfer step, the witnessing system flags a mismatch between the patient's treatment record and the material identifier. A colleague suggests bypassing the alert to keep the list moving. No transfer has taken place.",
    actions: ["Stop the affected step and maintain secure segregation and appropriate conditions for the biological material.", "Notify the responsible embryologist and clinical lead; reconcile identifiers against original traceability and consent records.", "Use only the validated contingency witnessing procedure if a system fault is established and authorized.", "Document the deviation, investigation, verification and authorization before any restart; maintain communication through the responsible clinical team."],
    criticalFailures: ["Bypassing an unresolved mismatch and proceeding with transfer.", "Changing material identifiers merely to make the system accept them."],
    questions: [
      { stem: "An ART witnessing-system mismatch occurs before embryo transfer. What is the immediate response?", choices: ["Stop the affected step and secure the material while the discrepancy is investigated", "Override the mismatch because the patient is ready", "Relabel the material to match the screen without verification", "Use the appointment order to infer identity"], rationale: "An unresolved identity mismatch requires a stop and investigation before the affected procedure proceeds." },
      { stem: "The ART team confirms an electronic witnessing-system fault. What allows work to restart safely?", choices: ["The authorized validated contingency procedure with documented identity checks", "One staff member's memory of the patient's case", "Disabling all future alerts for that patient", "Using the treatment-room number as the sole identifier"], rationale: "A system fault does not remove the need for validated witnessing, identity verification and traceable authorization." },
      { stem: "Which ART record best documents resolution of a witnessing deviation?", choices: ["The mismatch, material identifiers, verification, staff, timing and authorized restart", "Only a note saying computer error", "Only the next appointment time", "Only the invoice number with no material traceability"], rationale: "Traceability must link the material and verification process to the staff and time of the resolved event." },
    ],
    source: "https://www.asrm.org/practice-guidance/practice-committee-documents/witnessing-and-protocol-deviations-in-the-in-vitro-fertilization-and-andrology-laboratory-a-committee-opinion/",
  },
  {
    code: "DS-EMERGENCY-01", department: "Emergency", domainCode: "COP_BLS",
    title: "Repeated reassessment of suspected sepsis at triage",
    situation: "An adult with suspected infection is awaiting review in Emergency. A repeat set of observations is worse and the patient is increasingly drowsy. The patient is not pregnant or recently pregnant. The assessor provides the adult suspected-sepsis pathway and escalation contacts.",
    actions: ["Reassess promptly using an ABCDE approach and call for urgent appropriate clinical support.", "Update the locally approved risk assessment using current observations and clinical concern, rather than the arrival category alone.", "Move to an appropriately monitored care area through the department's escalation process and begin prescribed or protocol-authorized care within role.", "Hand over the trend and actions taken; document and repeat reassessment according to risk and response."],
    criticalFailures: ["Leaving the patient in the original queue despite worsening consciousness and observations.", "Using an adult nonpregnant pathway without checking whether it applies to the patient."],
    questions: [
      { stem: "In Emergency, a patient with suspected infection deteriorates after the initial triage category was assigned. Which priority should guide care?", choices: ["The current assessment and deterioration trend", "The original queue position regardless of change", "The planned laboratory turnaround time alone", "The registration time alone"], rationale: "Sepsis risk and clinical priority require reassessment when the patient's condition changes." },
      { stem: "Before using a nonpregnant adult suspected-sepsis pathway, which patient characteristic requires checking?", choices: ["Whether the patient is pregnant or recently pregnant and needs the relevant pathway", "Whether the patient has paid the registration fee", "Whether the patient arrived before the shift change", "Whether the patient has attended this hospital previously"], rationale: "Sepsis guidance is population-specific; pregnancy and recent pregnancy require the appropriate pathway." },
      { stem: "A suspected-sepsis patient becomes drowsier in the Emergency waiting area. What is the safest location plan?", choices: ["Escalate for an appropriately monitored care area with clinical review", "Keep the original waiting location until every test is complete", "Send the patient unaccompanied to locate a clinician", "Ask the patient to return if the next observation is worse"], rationale: "Deterioration requires active escalation and a care setting appropriate to the current risk." },
    ],
    source: "https://www.nice.org.uk/guidance/ng253/chapter/Evaluating-risk",
  },
  {
    code: "DS-LAB-01", department: "LABORATORY", domainCode: "DOC_COMM",
    title: "Unresolved identity on an urgent laboratory sample",
    situation: "An urgent blood tube arrives with identifiers that do not match the request. The collector asks the laboratory to change the label based on a telephone description. The assessor provides the sample acceptance and exceptional-sample SOPs.",
    actions: ["Hold processing or reporting as required by the SOP and record the discrepancy without guessing identity.", "Contact the requesting team promptly and explain the clinical delay and need for resolution or recollection.", "For an irreplaceable or exceptional sample, involve the authorized laboratory clinician and follow the documented exception process.", "Record the decision, communications and any specimen limitations; preserve sample-to-patient traceability."],
    criticalFailures: ["Relabeling the sample from an unverified telephone description.", "Releasing a result under an unresolved patient identity."],
    questions: [
      { stem: "An urgent blood tube and its request have conflicting identifiers. What should laboratory staff do?", choices: ["Follow the acceptance SOP, hold unsafe release and contact the requesting team", "Choose the identity with the more complete handwriting", "Change the tube label using an unverified phone description", "Release under both patients so one receives the result"], rationale: "Urgency does not establish specimen identity; discrepancies require a controlled resolution process." },
      { stem: "A laboratory sample with an identity discrepancy is considered irreplaceable. Who should determine whether exceptional processing is permitted?", choices: ["The authorized laboratory clinician under the documented exception SOP", "Any available courier", "The receptionist using arrival order", "The analyzer operator without an exception record"], rationale: "Exceptional acceptance requires authorized assessment and documented limitations, rather than informal relabeling." },
      { stem: "Which communication is essential when an urgent laboratory specimen cannot be safely accepted?", choices: ["Promptly tell the clinical team the reason, required next step and potential delay", "Wait until the end-of-day rejection summary", "Silently remove the request from the worklist", "Report a normal result to avoid delaying care"], rationale: "Timely communication enables safe recollection or an authorized exception and reduces avoidable treatment delays." },
    ],
    source: "https://www.who.int/publications/m/item/laboratory-quality-manual",
  },
  {
    code: "DS-PHARMACY-01", department: "Pharmacy", domainCode: "MOM",
    title: "High-alert infusion concentration mismatch",
    situation: "A high-alert infusion is requested from Pharmacy. The written order specifies a concentration different from the prepared label and the ward's standard pump-library entry. The product has not been dispatched. The assessor supplies a mock order, label and high-alert medication SOP.",
    actions: ["Hold dispatch and reconcile the order, prepared product and approved concentration with the prescriber and receiving team.", "Verify patient, drug, concentration, dose units and route against the resolved order.", "Apply the required independent check for this selected high-risk process; the second checker verifies separately against the source information.", "Correct the product and documentation through the approved process; communicate the resolved concentration and report the intercepted error."],
    criticalFailures: ["Dispatching an unresolved high-alert concentration mismatch.", "Treating two signatures without separate verification as an independent check."],
    questions: [
      { stem: "Pharmacy finds that a high-alert infusion label differs from the prescribed concentration and standard pump entry. What is the safest action?", choices: ["Hold dispatch and reconcile all three through the authorized clinical process", "Send it and ask the ward to select whichever concentration is available", "Change only the label without checking the contents", "Override the pump entry to match an unverified preparation"], rationale: "Concentration mismatches must be resolved before supply; labels and device settings must match the verified product and order." },
      { stem: "For a selected high-alert preparation requiring an independent double check, which method is appropriate?", choices: ["A second qualified checker separately verifies the relevant information against the source order", "The first checker reads out the answer and the second signs", "Two signatures are added after dispatch without checking", "A single checker signs twice using two initials"], rationale: "Independent checks require separate verification and complement other medication safety controls." },
      { stem: "A concentration error is intercepted in Pharmacy before dispatch. How should it be handled after correction?", choices: ["Document and report the near miss through the medication-safety process", "Ignore it because the patient did not receive the product", "Delete the order so the discrepancy is no longer visible", "Record that the patient had an adverse reaction"], rationale: "Near-miss reporting supports learning about preparation and concentration controls without misrepresenting patient harm." },
    ],
    source: "https://ismpcanada.ca/bulletin/a-new-canadian-approach-to-high-alert-medications/",
  },
  {
    code: "DS-DIALYSIS-01", department: "Dialysis", domainCode: "HIC",
    title: "Aseptic dialysis catheter connection",
    situation: "During hemodialysis setup, a disinfected catheter hub is accidentally touched by a contaminated glove before connection. The patient is stable and treatment has not started. The assessor provides the catheter connection SOP and compatible disinfection supplies.",
    actions: ["Stop the connection attempt and identify the break in aseptic technique.", "Perform hand hygiene and change contaminated gloves or supplies as indicated; repeat hub disinfection under the approved SOP.", "Observe the specified contact and drying requirements and avoid recontamination before connection.", "Explain the safety step to the patient, document any incident according to policy and reinforce catheter-care education."],
    criticalFailures: ["Connecting to the extracorporeal circuit after a contaminated hub touch without corrective disinfection.", "Using a product incompatible with the catheter contrary to the approved SOP."],
    questions: [
      { stem: "A dialysis catheter hub is touched by a contaminated glove after disinfection but before connection. What should happen?", choices: ["Stop and repeat the necessary aseptic preparation before connecting", "Connect quickly because the hub was cleaned earlier", "Cover the touched hub with tape and start treatment", "Flush the circuit to replace hub disinfection"], rationale: "A contaminated touch breaches asepsis and requires correction before catheter access." },
      { stem: "Which instruction should guide dialysis catheter-hub disinfectant contact and drying times?", choices: ["The approved catheter-care SOP and compatible product instructions", "The time remaining before the next appointment", "The operator's preferred shortest interval", "The external appearance of the catheter alone"], rationale: "Use validated, compatible products with the specified application requirements." },
      { stem: "Which patient education supports dialysis catheter infection prevention?", choices: ["Report redness, drainage, fever or catheter problems promptly and follow access-care instructions", "Open the catheter caps at home to inspect the lumen", "Use leftover antibiotics whenever the dressing feels uncomfortable", "Ignore new fever if the catheter still functions"], rationale: "Patients should recognize and report possible infection and avoid unauthorized catheter manipulation." },
    ],
    source: "https://www.cdc.gov/dialysis-safety/hcp/clinical-safety/",
  },
  {
    code: "DS-MATERNITY-01", department: "Maternity", domainCode: "COP_BLS",
    title: "Coordinated response to postpartum bleeding",
    situation: "Soon after vaginal birth, a woman has ongoing heavy bleeding, pallor and worsening observations. The team is still calculating cumulative blood loss. The assessor provides the hospital's postpartum-haemorrhage response chart and emergency equipment checklist.",
    actions: ["Recognize the emergency and activate the obstetric haemorrhage response without waiting for a perfect blood-loss calculation.", "Assess the woman and measure cumulative blood loss objectively where possible while monitoring clinical status.", "Assist the authorized team with the local first-response treatment bundle, equipment and prescribed medicines within role.", "Assign communication and documentation roles; track response, escalate ongoing bleeding and give a structured handover."],
    criticalFailures: ["Delaying the emergency response until a final blood-loss total is available despite deterioration.", "Leaving ongoing bleeding unmonitored after the initial intervention."],
    questions: [
      { stem: "After vaginal birth, ongoing heavy bleeding is accompanied by pallor and worsening observations while cumulative loss is still being calculated. What is the priority?", choices: ["Activate the obstetric haemorrhage response and begin assessment and authorized care", "Wait for a final calculated volume before calling for help", "Complete the discharge paperwork first", "Reassess only after the next routine observation interval"], rationale: "Clinical deterioration with ongoing postpartum bleeding requires immediate coordinated care; measurement must not delay response." },
      { stem: "Which approach best supports assessment of postpartum blood loss?", choices: ["Objective cumulative measurement combined with the woman's clinical condition", "Visual estimation alone regardless of available measurement tools", "Counting pads without assessing the woman", "Using pulse rate alone as the total blood-loss estimate"], rationale: "Objective measurement and clinical assessment support earlier recognition and response." },
      { stem: "Bleeding continues after the first postpartum-haemorrhage interventions. What should the team do?", choices: ["Reassess response and escalate promptly under the obstetric pathway", "Assume the first response is sufficient and stop monitoring", "Wait for routine ward transfer before informing the obstetrician", "Record the initial treatment as successful without reassessment"], rationale: "Ongoing bleeding requires reassessment and escalation within a coordinated treatment pathway." },
    ],
    source: "https://www.who.int/publications/i/item/9789240115637",
  },
  ...acmeObgynInfertilityScenarios,
];

export function generateScenarioQuestions(): QuestionDef[] {
  return departmentScenarios.flatMap(s => s.questions.map((q, index) => ({
    code: `MCQ-${s.code}-${String(index + 1).padStart(2, "0")}`,
    domainCode: s.domainCode,
    question: q.stem,
    options: [...q.choices] as QuestionDef["options"],
    correctOptionIndex: 0,
    explanation: q.rationale,
    departmentTags: [s.department],
    difficulty: "medium",
    defaultTimeSeconds: 90,
  })));
}

export function scenarioGuidelines(s: DepartmentScenario) {
  return {
    theoretical: s.questions.map((q, i) => `${i + 1}. ${q.stem}\nExpected answer: ${q.choices[0]}\nRationale: ${q.rationale}`).join("\n\n"),
    practical: [
      "Observe in simulation using the approved local SOP and the staff member's scope of practice.",
      ...s.actions.map((action, i) => `${i + 1}. ${action}`),
      "Critical safety failures (record explicitly and escalate for remediation under the assessment policy):",
      ...s.criticalFailures.map(failure => `- ${failure}`),
      "Use the existing 1-5 assessment scale; target 4. Critical failures are assessor guidance, not an automated score override.",
      `Reference checked 2026-10-15: ${s.source}`,
    ].join("\n"),
  };
}
