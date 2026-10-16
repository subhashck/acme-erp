/**
 * ============================================================================
 * ACME ERP: Reviewed Question Bank Seeder Utility
 * ============================================================================
 *
 * Seeds reviewed clinical and HR questions across seven competency domains.
 * The historical filename is retained for the existing package command.
 * Each written question is emitted once; numbering prefixes are not new items.
 *
 * Usage:
 *   pnpm tsx scripts/seed_500_questions.ts
 *   pnpm tsx scripts/seed_500_questions.ts --check  (no database connection)
 *
 * ============================================================================
 */

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { generateDepartmentQuestions } from "./department_questions_data.ts";
import { curateQuestionBank, getRetiredQuestionCodes } from "./question-bank-quality.ts";
import { departmentScenarios, scenarioGuidelines } from "./department_scenarios_data.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvironment() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, "../../.env"),
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      try {
        if (typeof process.loadEnvFile === "function") {
          process.loadEnvFile(envPath);
        }
      } catch {
        // Preserve support for optional environment files.
      }
    }
  }
}

export interface QuestionDef {
  code: string;
  domainCode: "HIC" | "PSQ" | "MOM" | "COP_BLS" | "PROCEDURES" | "DOC_COMM" | "HR_POLICY";
  question: string;
  options: [string, string, string, string];
  correctOptionIndex: 0 | 1 | 2 | 3;
  explanation: string;
  departmentTags: string[];
  difficulty: "basic" | "medium" | "advanced";
  defaultTimeSeconds: number;
}

interface QuestionTemplate {
  q: string;
  opts: [string, string, string, string];
  ans: 0 | 1 | 2 | 3;
  exp: string;
  diff: "basic" | "medium" | "advanced";
  tags: string[];
}

// Helper builder to create consistent question records
function makeQ(
  code: string,
  domainCode: QuestionDef["domainCode"],
  question: string,
  options: [string, string, string, string],
  correctOptionIndex: 0 | 1 | 2 | 3,
  explanation: string,
  departmentTags: string[],
  difficulty: QuestionDef["difficulty"] = "medium",
  defaultTimeSeconds: number = 60
): QuestionDef {
  return {
    code,
    domainCode,
    question,
    options,
    correctOptionIndex,
    explanation,
    departmentTags,
    difficulty,
    defaultTimeSeconds,
  };
}

// Build question library
export function generateQuestions(): QuestionDef[] {
  const list: QuestionDef[] = [];

  // ==========================================================================
  // 1. HOSPITAL INFECTION CONTROL (HIC)
  // ==========================================================================
  const hicTopics: QuestionTemplate[] = [
    {
      q: "Which of the following is Moment 1 of the WHO 5 Moments for Hand Hygiene?",
      opts: ["Before touching a patient", "After touching a patient", "After body fluid exposure risk", "Before clean/aseptic procedure"],
      ans: 0,
      exp: "Moment 1 is 'Before touching a patient' to protect the patient from harmful pathogens carried on the healthcare provider's hands.",
      diff: "basic",
      tags: [],
    },
    {
      q: "How long does the WHO alcohol-based hand rub technique usually take?",
      opts: ["10 to 15 seconds", "20 to 30 seconds", "40 to 60 seconds", "60 to 90 seconds"],
      ans: 1,
      exp: "WHO describes a 20-30 second hand rub procedure; cover all hand surfaces and rub until dry.",
      diff: "basic",
      tags: [],
    },
    {
      q: "In which situation is soap and water required instead of alcohol-based hand rub?",
      opts: ["Before touching a patient when hands look clean", "After patient care when hands are visibly soiled", "After removing gloves when hands look clean", "Before an aseptic procedure when hands look clean"],
      ans: 1,
      exp: "Wash visibly soiled hands with soap and water. Alcohol-based hand rub is preferred for most other clinical situations; follow additional organism-specific or outbreak precautions.",
      diff: "basic",
      tags: ["ICU/HDU", "Ward"],
    },
    {
      q: "In healthcare biomedical waste management, which waste category is disposed of in the Yellow container?",
      opts: ["Plastics, catheters, and IV tubing", "Infectious anatomical waste, soiled dressings, and expired drugs", "Glass ampoules and vials", "Sharps, needles, and scalpel blades"],
      ans: 1,
      exp: "Yellow bins are designated for anatomical waste, soiled cotton/gauze dressings, pathological waste, and expired medications.",
      diff: "basic",
      tags: [],
    },
    {
      q: "Which waste container receives contaminated recyclable plastics like IV tubing, Foley catheters, and disposable syringes without needles?",
      opts: ["Yellow bag", "Red bag/container", "Blue container", "Translucent puncture-proof white box"],
      ans: 1,
      exp: "Red bags/bins are designated for recyclable contaminated plastic wastes like catheters, IV tubing, urine bags, and syringes without needles.",
      diff: "basic",
      tags: [],
    },
    {
      q: "Under Biomedical Waste rules, where must discarded surgical sharps and hypodermic needles be disposed?",
      opts: ["Yellow bin with biohazard label", "Red bin", "White translucent, puncture-proof, tamper-proof container", "Blue cardboard box"],
      ans: 2,
      exp: "Sharps, needles, scalpels, and blades must be discarded directly into a puncture-proof, tamper-proof white translucent container.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What is the recommended immediate first aid action following an accidental needle-stick injury?",
      opts: ["Express blood from the puncture, then apply antiseptic", "Wash the puncture with soap and running water without squeezing", "Apply alcohol to the puncture, then cover it", "Cover the puncture first and wash it after reporting"],
      ans: 1,
      exp: "Wash the puncture immediately with running water and soap without squeezing or scrubbing, then immediately report for post-exposure prophylaxis (PEP).",
      diff: "medium",
      tags: [],
    },
    {
      q: "When should HIV post-exposure prophylaxis begin after an exposure that warrants treatment?",
      opts: ["As soon as possible; no later than 72 hours after exposure", "After the source patient results return, even beyond 72 hours", "At the next occupational health appointment within seven days", "Only after an exposed worker has a positive HIV test"],
      ans: 0,
      exp: "Start indicated HIV PEP as soon as possible and no later than 72 hours after exposure. Do not wait for source-patient results to initiate indicated treatment.",
      diff: "medium",
      tags: ["Emergency", "ICU/HDU", "OT"],
    },
    {
      q: "What is the correct sequence for donning Personal Protective Equipment (PPE)?",
      opts: ["Gloves -> Mask -> Gown -> Goggles", "Gown -> Mask/Respirator -> Goggles/Face Shield -> Gloves", "Mask -> Gloves -> Gown -> Goggles", "Gloves -> Gown -> Mask -> Goggles"],
      ans: 1,
      exp: "CDC/WHO standard donning order: Gown first, then Mask/Respirator, then Goggles/Face Shield, and Gloves last (pulled over the gown cuffs).",
      diff: "basic",
      tags: [],
    },
    {
      q: "What is the correct sequence for doffing (removing) Personal Protective Equipment (PPE)?",
      opts: ["Mask -> Gown -> Gloves -> Goggles", "Gloves -> Goggles/Face Shield -> Gown -> Mask/Respirator", "Gown -> Mask -> Goggles -> Gloves", "Mask -> Gloves -> Gown -> Goggles"],
      ans: 1,
      exp: "Standard doffing order: Remove Gloves first (most contaminated), then Goggles/Face Shield, then Gown, and remove Mask/Respirator outside the patient room.",
      diff: "basic",
      tags: [],
    },
    {
      q: "Which type of isolation precaution is mandatory for a patient diagnosed with Pulmonary Tuberculosis (active TB)?",
      opts: ["Contact precautions with gown and gloves", "Droplet precautions with a surgical mask", "Airborne precautions with a fit-tested respirator", "Standard precautions with routine hand hygiene"],
      ans: 2,
      exp: "Active Pulmonary TB transmits via airborne droplet nuclei (<5 microns) requiring Airborne Precautions, negative pressure isolation, and N95 masks.",
      diff: "medium",
      tags: ["Ward", "ICU/HDU"],
    },
    {
      q: "Which organism is the most common cause of Catheter-Associated Urinary Tract Infections (CAUTI)?",
      opts: ["Klebsiella pneumoniae", "Escherichia coli", "Pseudomonas aeruginosa", "Enterococcus faecalis"],
      ans: 1,
      exp: "Escherichia coli is the leading uropathogen responsible for over 70% of Catheter-Associated Urinary Tract Infections.",
      diff: "medium",
      tags: ["Ward", "ICU/HDU"],
    },
    {
      q: "To prevent CAUTI, where should the urinary drainage bag always be positioned?",
      opts: ["Below the bladder, resting on the floor", "At bladder level, attached to the bed frame", "Below the bladder, supported clear of the floor", "Above the bladder, secured to the IV pole"],
      ans: 2,
      exp: "The drainage bag must remain below bladder level at all times to prevent retrograde flow of urine, and off the floor to avoid contact contamination.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU"],
    },
    {
      q: "Which key intervention is part of the evidence-based Ventilator-Associated Pneumonia (VAP) prevention bundle?",
      opts: ["Elevate the head of the bed to 30-45 degrees when appropriate", "Keep the head of the bed flat during enteral feeding", "Replace the ventilator circuit every day regardless of condition", "Instill saline into the airway before every suction pass"],
      ans: 0,
      exp: "Elevating the head of bed between 30 and 45 degrees significantly reduces the aspiration of gastric contents, a cornerstone of the VAP bundle.",
      diff: "medium",
      tags: ["ICU/HDU"],
    },
    {
      q: "For an adult without a contraindication to chlorhexidine, which skin preparation is preferred before central venous catheter insertion?",
      opts: ["Use sterile normal saline and allow it to dry", "Use more than 0.5% chlorhexidine in alcohol and allow it to dry", "Use plain alcohol and immediately cover the wet site", "Use an aqueous skin cleanser without an antiseptic"],
      ans: 1,
      exp: "CDC and NABH recommend >0.5% chlorhexidine gluconate in 70% alcohol due to superior residual bactericidal efficacy.",
      diff: "medium",
      tags: ["ICU/HDU", "OT"],
    },
  ];

  // Preserve one stable code for each written HIC topic.
  for (let i = 0; i < hicTopics.length; i++) {
    const base = hicTopics[i];
    const code = `MCQ-HIC-${String(i + 1).padStart(3, "0")}`;
    list.push(
      makeQ(
        code,
        "HIC",
        base.q,
        base.opts,
        base.ans,
        base.exp,
        base.tags,
        base.diff,
        60
      )
    );
  }

  // ==========================================================================
  // 2. PATIENT SAFETY & QUALITY (PSQ)
  // ==========================================================================
  const psqTopics: QuestionTemplate[] = [
    {
      q: "Which pair provides two acceptable patient identifiers before blood collection or medication administration?",
      opts: ["Full name and bed number", "Full name and hospital UHID", "UHID and ward number", "Full name and treating consultant"],
      ans: 1,
      exp: "NABH and JCI mandate using at least two independent identifiers (Full Name and UHID/DOB). Bed or room numbers are strictly prohibited as identifiers.",
      diff: "basic",
      tags: [],
    },
    {
      q: "Which validated clinical scale is widely recommended for evaluating adult inpatient Fall Risk upon admission?",
      opts: ["Braden Scale", "Morse Fall Scale", "Glasgow Coma Scale", "Modified Aldrete Score"],
      ans: 1,
      exp: "The Morse Fall Scale and Hendrich II Fall Risk Model are standard validated tools for inpatient fall risk stratification.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU"],
    },
    {
      q: "What is the primary purpose of the Braden Scale in clinical nursing care?",
      opts: ["Risk of falls during mobilization", "Risk of developing pressure injuries", "Risk of venous thromboembolism", "Risk of postoperative respiratory complications"],
      ans: 1,
      exp: "The Braden Scale assesses sensory perception, moisture, activity, mobility, nutrition, and friction/shear to quantify pressure injury risk.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU"],
    },
    {
      q: "In pressure injury staging, what characterizes a Stage 2 Pressure Injury?",
      opts: ["Intact skin with non-blanchable redness", "Partial-thickness skin loss with exposed dermis", "Full-thickness skin loss with visible adipose tissue", "Full-thickness tissue loss with exposed bone or tendon"],
      ans: 1,
      exp: "Stage 2 pressure injuries present with partial-thickness loss of dermis presenting as a shallow open ulcer with a red/pink wound bed or an intact/ruptured serum blister.",
      diff: "medium",
      tags: ["Ward", "ICU/HDU"],
    },
    {
      q: "How should a repositioning schedule be planned for a bedbound patient at high risk of pressure injury?",
      opts: ["Keep the same interval even if skin damage develops", "Use a fixed interval regardless of the support surface", "Individualize the interval using skin response, mobility, and support surface", "Turn only when the patient reports discomfort"],
      ans: 2,
      exp: "Repositioning frequency should be individualized to mobility, tissue tolerance, skin findings, comfort, and the support surface. A fixed two-hour rule is not appropriate for every patient.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU"],
    },
    {
      q: "When conducting the WHO Surgical Safety Checklist, when is the 'Time Out' phase performed?",
      opts: ["Before induction of anesthesia", "Immediately before skin incision", "At the start of wound closure", "Before transfer out of the operating room"],
      ans: 1,
      exp: "The Time Out phase occurs immediately before the surgical incision is made, where the surgeon, anesthetist, and nurse pause to confirm identity, procedure, site, and critical steps.",
      diff: "medium",
      tags: ["OT"],
    },
    {
      q: "Which element is verified during the 'Sign Out' phase of the WHO Surgical Safety Checklist?",
      opts: ["Identity, procedure, site, and consent", "Counts, specimen labels, and recovery concerns", "Airway risk, allergies, and anesthesia equipment", "Team introductions, antibiotics, and imaging"],
      ans: 1,
      exp: "Sign Out confirms the recorded procedure name, correct instrument/sponge/needle counts, pathology specimen labeling with patient identifiers, and equipment issues.",
      diff: "medium",
      tags: ["OT"],
    },
    {
      q: "Under NABH incident reporting guidelines, what defines a 'Sentinel Event'?",
      opts: ["A prescribing error intercepted before administration", "An unexpected care-related event causing death or serious harm", "A medication dose given late without clinical harm", "A temporary equipment failure with no patient exposure"],
      ans: 1,
      exp: "Sentinel events are severe unexpected safety occurrences involving death, permanent harm, or severe temporary harm that demand immediate root cause analysis (RCA).",
      diff: "advanced",
      tags: [],
    },
    {
      q: "What is the fire emergency response protocol represented by the acronym 'R-A-C-E'?",
      opts: ["Rescue, Assess, Confine, Evacuate", "Rescue, Activate alarm, Confine, Extinguish or evacuate", "Respond, Activate alarm, Check, Extinguish", "Rescue, Alert, Clear the area, Evaluate"],
      ans: 1,
      exp: "R-A-C-E stands for: Rescue anyone in immediate danger, Activate fire alarm, Confine fire by closing doors, and Extinguish if safe or Evacuate.",
      diff: "basic",
      tags: [],
    },
    {
      q: "How should a fire extinguisher be operated according to the 'P-A-S-S' technique?",
      opts: ["Pull the pin, aim at the flames, squeeze, sweep", "Pull the pin, aim at the base, squeeze, sweep", "Pull the pin, squeeze, aim at the base, sweep", "Pull the pin, aim at the base, sweep, then squeeze"],
      ans: 1,
      exp: "P-A-S-S: Pull the safety pin, Aim low at the base of the flame, Squeeze the lever, and Sweep from side to side.",
      diff: "basic",
      tags: [],
    },
  ];

  for (let i = 0; i < psqTopics.length; i++) {
    const base = psqTopics[i];
    const code = `MCQ-PSQ-${String(i + 1).padStart(3, "0")}`;
    list.push(
      makeQ(
        code,
        "PSQ",
        base.q,
        base.opts,
        base.ans,
        base.exp,
        base.tags,
        base.diff,
        60
      )
    );
  }

  // ==========================================================================
  // 3. MEDICATION MANAGEMENT & SAFETY (MOM)
  // ==========================================================================
  const momTopics: QuestionTemplate[] = [
    {
      q: "Which approach best applies the core rights of medication administration?",
      opts: ["Match the drug and dose to the chart; use bed number for identity", "Verify patient, drug, dose, route, time, and document after administration", "Verify patient and drug; use the previous shift dose if unclear", "Match the label to the chart; document before giving the dose"],
      ans: 1,
      exp: "Verify the right patient, medicine, dose, route, and time, with appropriate indication and monitoring. Document what was actually administered after administration.",
      diff: "basic",
      tags: [],
    },
    {
      q: "Why must concentrated potassium chloride never be administered as a rapid IV bolus?",
      opts: ["A rapid dose can cause severe local vein irritation only", "A rapid IV dose can cause fatal cardiac arrhythmias", "A rapid dose can reduce the effect of other medicines", "A rapid IV dose primarily causes transient hypertension"],
      ans: 1,
      exp: "Rapid IV potassium delivery can cause fatal arrhythmias or cardiac arrest. Use the prescribed dilution, infusion rate, pump, and monitoring; follow local high-alert medicine policy.",
      diff: "advanced",
      tags: ["ICU/HDU", "Ward"],
    },
    {
      q: "What is the recommended practice for Look-Alike Sound-Alike (LASA) medications in hospital pharmacy and ward carts?",
      opts: ["Keep similar products together and rely on brand color", "Separate similar products and use Tall-Man lettering and alerts", "Remove outer labels and organize products by container size", "Use alphabetical storage alone for all similar product names"],
      ans: 1,
      exp: "Tall-Man lettering (e.g. predniSONE vs prednisoLONE), distinct warning labels, and physical separation prevent picking errors.",
      diff: "medium",
      tags: [],
    },
    {
      q: "What is the first-line drug of choice, standard concentration, and route for acute adult Anaphylaxis?",
      opts: ["Adrenaline 1 mg/mL, 0.5 mg subcutaneously", "Adrenaline 1 mg/mL, 0.5 mg intramuscularly in the thigh", "Adrenaline 0.1 mg/mL, 1 mg intravenously as a bolus", "Adrenaline 1 mg/mL, 0.1 mg intramuscularly in the arm"],
      ans: 1,
      exp: "Anaphylaxis first-line treatment is Epinephrine 1:1,000 (0.5 mg / 0.5 mL in adults) injected IM into the vastus lateralis (anterolateral thigh) for rapid absorption.",
      diff: "medium",
      tags: ["Emergency", "ICU/HDU"],
    },
    {
      q: "At what temperature should unopened regular insulin labeled for refrigeration be stored?",
      opts: ["Below 0 degrees C", "2 to 8 degrees C", "10 to 15 degrees C", "20 to 25 degrees C"],
      ans: 1,
      exp: "Store unopened regular insulin according to the product label, generally at 2-8 degrees C, and do not freeze. In-use storage limits are product-specific.",
      diff: "basic",
      tags: [],
    },
    {
      q: "When taking a critical telephone order from a physician, what protocol must the nurse strictly adhere to?",
      opts: ["Write the order and ask the prescriber to sign later", "Write the complete order, read it back, and obtain confirmation", "Repeat the medicine name and record the dose after giving it", "Record the order from memory after the call is complete"],
      ans: 1,
      exp: "NABH mandates the Write down, Read back, and Confirm (W-R-C) protocol for all verbal or telephone orders to eliminate auditory misinterpretation.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU"],
    },
    {
      q: "What is the reversal agent (antidote) for Heparin-induced anticoagulation overdose?",
      opts: ["Vitamin K1 (Phytonadione)", "Protamine Sulfate", "Flumazenil", "Naloxone"],
      ans: 1,
      exp: "Protamine sulfate directly neutralizes unfractionated heparin by forming a stable, inactive salt complex.",
      diff: "medium",
      tags: ["ICU/HDU", "OT"],
    },
    {
      q: "What is the specific opioid antagonist used to reverse life-threatening respiratory depression caused by Morphine or Fentanyl?",
      opts: ["Flumazenil", "Naloxone", "Atropine", "Neostigmine"],
      ans: 1,
      exp: "Naloxone is a pure competitive opioid receptor antagonist that rapidly reverses opioid-induced respiratory and CNS depression.",
      diff: "basic",
      tags: ["Emergency", "ICU/HDU", "PACU"],
    },
  ];

  for (let i = 0; i < momTopics.length; i++) {
    const base = momTopics[i];
    const code = `MCQ-MOM-${String(i + 1).padStart(3, "0")}`;
    list.push(
      makeQ(
        code,
        "MOM",
        base.q,
        base.opts,
        base.ans,
        base.exp,
        base.tags,
        base.diff,
        60
      )
    );
  }

  // ==========================================================================
  // 4. CPR, BLS & EMERGENCY PROTOCOLS (COP_BLS)
  // ==========================================================================
  const blsTopics: QuestionTemplate[] = [
    {
      q: "What is the recommended chest compression rate for high-quality adult cardiopulmonary resuscitation (CPR)?",
      opts: ["60 to 80 compressions per minute", "80 to 100 compressions per minute", "100 to 120 compressions per minute", "At least 140 compressions per minute"],
      ans: 2,
      exp: "AHA and ERC guidelines mandate a compression rate of 100 to 120 beats per minute to generate adequate coronary perfusion pressure.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What is the recommended chest compression depth for an average adult in cardiac arrest?",
      opts: ["5 to 6 cm", "3 to 4 cm", "7 to 8 cm", "1 to 2 cm"],
      ans: 0,
      exp: "Adult chest compressions should depress the lower half of the sternum at least 5 cm (2 inches), without exceeding 6 cm to avoid visceral injury.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What compression-to-ventilation ratio should trained rescuers use for adult CPR before an advanced airway is placed?",
      opts: ["15 compressions to 2 breaths", "30 compressions to 2 breaths", "3 compressions to 1 breath", "Continuous compressions with 20 breaths per minute"],
      ans: 1,
      exp: "The standard adult CPR ratio for all out-of-hospital and in-hospital adult cardiac arrests prior to advanced airway placement is 30:2.",
      diff: "basic",
      tags: [],
    },
    {
      q: "Which cardiac arrest rhythm is classified as 'shockable' by an Automated External Defibrillator (AED)?",
      opts: ["Asystole and ventricular fibrillation", "Pulseless electrical activity and asystole", "Ventricular fibrillation and pulseless ventricular tachycardia", "Pulseless electrical activity and pulseless ventricular tachycardia"],
      ans: 2,
      exp: "Defibrillation is indicated exclusively for shockable rhythms: Ventricular Fibrillation (VF) and Pulseless Ventricular Tachycardia (pVT).",
      diff: "medium",
      tags: ["ICU/HDU", "Emergency"],
    },
    {
      q: "What is the standard first-line intravenous/intraosseous dose of Epinephrine (Adrenaline) during adult cardiac arrest, and how often is it repeated?",
      opts: ["1 mg IV/IO every 3 to 5 minutes", "1 mg IV/IO every 1 to 2 minutes", "0.1 mg IV/IO every 3 to 5 minutes", "0.5 mg IV/IO every 5 to 10 minutes"],
      ans: 0,
      exp: "ACLS protocols dictate 1 mg Epinephrine (10 mL of 1:10,000 solution) IV/IO administered every 3 to 5 minutes during cardiac arrest.",
      diff: "medium",
      tags: ["ICU/HDU", "Emergency"],
    },
    {
      q: "When amiodarone is selected for shock-refractory adult VF or pulseless VT, what is its initial IV/IO bolus dose?",
      opts: ["Amiodarone 300 mg IV/IO", "Amiodarone 150 mg IV/IO", "Amiodarone 1 mg/kg IV/IO", "Amiodarone 50 mg IV/IO"],
      ans: 0,
      exp: "The initial amiodarone dose is 300 mg IV/IO; a subsequent dose is 150 mg. Lidocaine is an alternative in adult cardiac arrest.",
      diff: "advanced",
      tags: ["ICU/HDU", "Emergency"],
    },
    {
      q: "What airway maneuver is indicated to open the airway of an unconscious trauma patient with suspected cervical spine injury?",
      opts: ["Head tilt with full neck extension", "Jaw thrust with minimal neck movement", "Chin lift while rotating the neck", "Neck flexion with a pillow under the head"],
      ans: 1,
      exp: "The jaw-thrust maneuver opens the airway while minimizing cervical spine manipulation in trauma patients.",
      diff: "medium",
      tags: ["Emergency", "OT"],
    },
    {
      q: "How often should rescuers switch compressor roles during CPR to prevent rescuer fatigue and deterioration of compression quality?",
      opts: ["Every 1 minute", "About every 2 minutes, or sooner if fatigued", "Every 4 minutes", "At each return of spontaneous circulation"],
      ans: 1,
      exp: "Compressor fatigue degrades depth after 1 to 2 minutes; rescuers should swap roles every 2 minutes or rhythm analysis cycle.",
      diff: "basic",
      tags: [],
    },
  ];

  for (let i = 0; i < blsTopics.length; i++) {
    const base = blsTopics[i];
    const code = `MCQ-BLS-${String(i + 1).padStart(3, "0")}`;
    list.push(
      makeQ(
        code,
        "COP_BLS",
        base.q,
        base.opts,
        base.ans,
        base.exp,
        base.tags,
        base.diff,
        60
      )
    );
  }

  // ==========================================================================
  // 5. CORE CLINICAL PROCEDURES (PROCEDURES)
  // ==========================================================================
  const procTopics: QuestionTemplate[] = [
    {
      q: "When performing female urethral catheterization, how should the labia and urethral meatus be cleansed?",
      opts: ["Back to front, using a new swab for each stroke", "Front to back, using a new swab for each stroke", "Front to back, reusing the same swab for all strokes", "From the perineum toward the urethra in circular strokes"],
      ans: 1,
      exp: "Clean from front to back (anterior to posterior) using a fresh sterile antiseptic swab for each stroke to avoid introducing rectal flora into the urethra.",
      diff: "basic",
      tags: ["Ward", "OT"],
    },
    {
      q: "What is the standard pore size of the filter incorporated in a blood administration infusion set?",
      opts: ["10 to 20 microns", "170 to 260 microns", "0.22 microns", "500 microns"],
      ans: 1,
      exp: "Blood component transfusion sets contain a standard 170 to 260 micron screen filter to trap clots and cellular debris.",
      diff: "medium",
      tags: ["Ward", "ICU/HDU", "OT"],
    },
    {
      q: "What is the usual maximum time a red-cell unit may remain out of controlled storage while being administered?",
      opts: ["Within 1 hour", "Within 4 hours", "Within 6 hours", "Within 8 hours"],
      ans: 1,
      exp: "Complete red-cell administration within four hours of removal from controlled storage, or sooner if the product or local transfusion policy requires.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU"],
    },
    {
      q: "When gastric aspirate pH cannot confirm a newly inserted NG tube position, what should confirm placement before feeding?",
      opts: ["Air insufflation with epigastric auscultation", "Appropriately interpreted radiography", "Absence of coughing during insertion", "Matching the external tube length to the expected length"],
      ans: 1,
      exp: "Do not feed until placement is confirmed. Use appropriately interpreted radiography when a reliable aspirate pH check is unavailable or inconclusive; the whoosh test is unreliable.",
      diff: "medium",
      tags: ["Ward", "ICU/HDU"],
    },
    {
      q: "What does continuous vigorous bubbling in the water-seal chamber of an Intercostal Chest Tube Drainage (ICD) system indicate?",
      opts: ["Normal fluctuation with the respiratory cycle", "An ongoing air leak from the patient or drainage system", "A blocked drain preventing air from leaving the pleural space", "Resolution of the pneumothorax with no residual air"],
      ans: 1,
      exp: "Continuous bubbling in the water seal chamber indicates an ongoing air leak, either from the pulmonary parenchyma or an external disconnection.",
      diff: "advanced",
      tags: ["ICU/HDU", "Ward"],
    },
    {
      q: "According to the AARC 2022 guideline, which suction-pressure approach is appropriate for an adult artificial airway?",
      opts: ["Use the highest pressure available to shorten each pass", "Use the lowest effective pressure, keeping magnitude below 200 mmHg", "Use at least 250 mmHg to clear an adult airway", "Increase pressure until the catheter adheres to the airway wall"],
      ans: 1,
      exp: "Use the lowest effective suction pressure; the AARC 2022 guideline recommends keeping adult suction-pressure magnitude below 200 mmHg. Follow device and local protocol limits, which may be lower.",
      diff: "medium",
      tags: ["ICU/HDU"],
    },
    {
      q: "According to the AARC 2022 guideline, what is the maximum duration of suction application during an artificial-airway suctioning procedure?",
      opts: ["No more than 15 seconds", "No more than 25 seconds", "No more than 40 seconds", "No more than 60 seconds"],
      ans: 0,
      exp: "Apply suction for a maximum of 15 seconds; preoxygenate as indicated and monitor tolerance.",
      diff: "basic",
      tags: ["ICU/HDU"],
    },
    {
      q: "Which approach is appropriate when a vascular access device protocol specifies pulsatile flushing?",
      opts: ["Maintain a slow continuous push and clamp after disconnecting", "Use push-pause flushing with the device-specific closure sequence", "Increase force if resistance occurs until the line clears", "Use a smaller syringe to generate more flushing pressure"],
      ans: 1,
      exp: "Use push-pause flushing and follow the device-specific clamping/disconnection sequence. Do not force a flush against resistance; connector requirements differ.",
      diff: "medium",
      tags: ["ICU/HDU", "Ward"],
    },
    {
      q: "What clinical parameter is assessed when evaluating a peripheral IV insertion site using the Visual Infusion Phlebitis (VIP) score?",
      opts: ["Local pain, redness, swelling, and palpable venous cord", "Distal pulse, capillary refill, and limb temperature", "Cannula gauge, infusion rate, and fluid volume", "Dressing size, insertion date, and tubing length"],
      ans: 0,
      exp: "The VIP score monitors signs of vein inflammation: erythema, localized pain, edema, induration, and palpable cord.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU"],
    },
    {
      q: "What is the primary action if an acute hemolytic blood transfusion reaction (fever, chills, back pain, hypotension) is suspected?",
      opts: ["Reduce the transfusion rate and reassess in 15 minutes", "Stop the transfusion and maintain IV access with fresh saline tubing", "Give an antipyretic and restart when the fever settles", "Pause the transfusion and restart using the same tubing"],
      ans: 1,
      exp: "Stop the transfusion instantly, preserve the IV access with fresh normal saline tubing, verify patient tags, alert the physician, and return the unit and tubing to the blood bank.",
      diff: "medium",
      tags: ["Ward", "ICU/HDU", "Emergency"],
    },
  ];

  for (let i = 0; i < procTopics.length; i++) {
    const base = procTopics[i];
    const code = `MCQ-PROC-${String(i + 1).padStart(3, "0")}`;
    list.push(
      makeQ(
        code,
        "PROCEDURES",
        base.q,
        base.opts,
        base.ans,
        base.exp,
        base.tags,
        base.diff,
        60
      )
    );
  }

  // ==========================================================================
  // 6. CLINICAL DOCUMENTATION & COMMUNICATION (DOC_COMM)
  // ==========================================================================
  const docTopics: QuestionTemplate[] = [
    {
      q: "What does each component of the structured clinical handover communication tool 'ISBAR' represent?",
      opts: ["Identify, Situation, Background, Assessment, Recommendation", "Identify, Symptoms, Background, Action, Review", "Information, Situation, Baseline, Assessment, Response", "Introduction, Summary, Background, Action, Referral"],
      ans: 0,
      exp: "ISBAR stands for Identify (patient/staff), Situation (current issue), Background (clinical context), Assessment (vitals/findings), and Recommendation.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What is the primary purpose of the Modified Early Warning Score (MEWS) in inpatient nursing?",
      opts: ["Predicting the likely discharge date", "Identifying deterioration that requires timely escalation", "Replacing the need for a bedside clinical assessment", "Determining whether an incident is a sentinel event"],
      ans: 1,
      exp: "MEWS tracks vital sign trends (RR, HR, Systolic BP, Conscious Level, Temperature) to alert teams before cardiac arrest occurs.",
      diff: "medium",
      tags: ["Ward", "ICU/HDU"],
    },
    {
      q: "What is the minimum score achievable on the Glasgow Coma Scale (GCS)?",
      opts: ["0", "1", "3", "5"],
      ans: 2,
      exp: "The minimum total GCS is 3: eye opening 1, verbal response 1, and motor response 1. Interpret the components and clinical context; confounders can make components untestable.",
      diff: "basic",
      tags: ["ICU/HDU", "Emergency"],
    },
    {
      q: "What is the maximum total score on the Glasgow Coma Scale (GCS)?",
      opts: ["12", "14", "15", "18"],
      ans: 2,
      exp: "The maximum GCS score is 15 (Eye: 4, Verbal: 5, Motor: 6), indicating a fully alert and oriented patient.",
      diff: "basic",
      tags: ["ICU/HDU", "Emergency"],
    },
    {
      q: "How must a correction be made if a nurse makes an error in a handwritten clinical chart?",
      opts: ["Erase the entry and replace it with the correct information", "Cover the entry with correction fluid and rewrite it", "Strike through once, keep it legible, and date and sign the correction", "Rewrite the page and discard the original record"],
      ans: 2,
      exp: "Medical-legal standards require a single neat strike-through leaving original text legible, accompanied by correction, date, time, and initials. Obliteration is forbidden.",
      diff: "basic",
      tags: [],
    },
    {
      q: "How should monitoring of a patient in physical restraints be scheduled and documented?",
      opts: ["Use the observation schedule in the order and restraint policy", "Check only at routine vital-sign rounds for other patients", "Reassess only when the patient asks for release", "Document circulation once after restraints are applied"],
      ans: 0,
      exp: "Follow the clinical order and approved restraint policy, with monitoring and reassessment appropriate to the restraint type, patient condition, and applicable requirements. Escalate compromise immediately; there is no single universal interval for all restraint situations.",
      diff: "medium",
      tags: ["ICU/HDU", "Ward"],
    },
  ];

  for (let i = 0; i < docTopics.length; i++) {
    const base = docTopics[i];
    const code = `MCQ-DOC-${String(i + 1).padStart(3, "0")}`;
    list.push(
      makeQ(
        code,
        "DOC_COMM",
        base.q,
        base.opts,
        base.ans,
        base.exp,
        base.tags,
        base.diff,
        60
      )
    );
  }

  // ==========================================================================
  // 7. HOSPITAL HR POLICIES & CODE OF CONDUCT (HR_POLICY)
  // ==========================================================================
  const hrTopics: QuestionTemplate[] = [
    {
      q: "What is the mandatory attendance recording procedure for hospital employees upon entering and exiting the hospital premises?",
      opts: ["Record only the arrival punch for a completed shift", "Record both arrival and departure using the approved attendance system", "Use the roster as proof of actual attendance", "Ask a colleague to record attendance after the shift"],
      ans: 1,
      exp: "Record your own arrival and departure through the approved attendance system, and use the authorized correction process for missing or erroneous records.",
      diff: "basic",
      tags: [],
    },
    {
      q: "How should an employee determine the permitted grace period for late arrival?",
      opts: ["Use the grace period followed in the previous workplace", "Check the current approved attendance policy for the applicable rule", "Assume every clinical department allows 15 minutes", "Use the average arrival time of colleagues as the cutoff"],
      ans: 1,
      exp: "Attendance grace periods are institution-specific. Check the current approved policy rather than assuming a standard 15-minute allowance.",
      diff: "basic",
      tags: [],
    },
    {
      q: "How should repeated unapproved late arrivals be addressed?",
      opts: ["Apply an automatic half-day deduction after any three late marks", "Review attendance facts and apply the approved policy through due process", "Treat all late arrivals as approved casual leave", "Ignore late marks when the employee completes total monthly hours"],
      ans: 1,
      exp: "Verify the attendance record, any approved exceptions, and the applicable policy before taking proportionate action. A universal three-late-marks deduction cannot be assumed.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What should an employee do after a missed attendance punch caused by an emergency or device failure?",
      opts: ["Wait for payroll to infer attendance from the duty roster", "Report the missing punch and submit evidence through the approved correction process", "Add extra punches the next day to offset the missed record", "Use a colleague attendance record to establish the missing time"],
      ans: 1,
      exp: "Report promptly and use the approved attendance correction process with supporting evidence and required approval. Follow the actual local deadline; no universal 48-hour limit applies.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What is the policy regarding punching attendance on behalf of an absent or late colleague ('buddy punching')?",
      opts: ["Permit it when the colleague gives written permission", "Prohibit it because it falsifies the attendance record", "Permit it if the total shift hours are later completed", "Permit it when the supervisor is informed afterward"],
      ans: 1,
      exp: "Buddy punching is considered an act of forgery and financial fraud against hospital rules, leading to immediate disciplinary proceedings for both employees.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What is the patient-safety purpose of planned overlap between clinical shifts?",
      opts: ["Finish the department stock count before seeing patients", "Receive a structured handover and clarify patient risks before accepting care", "Check only that the outgoing nurse signed the roster", "Review only patients who have procedures scheduled"],
      ans: 1,
      exp: "A planned overlap allows structured handover, questions, and transfer of responsibility. The exact overlap duration should come from the approved roster and handover policy.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU", "Emergency"],
    },
    {
      q: "How should two employees arrange a mutual clinical shift swap?",
      opts: ["Exchange shifts privately and update attendance afterward", "Obtain roster approval and document the swap through the approved process", "Swap once both staff agree, without checking skill mix", "Treat a verbal agreement as sufficient authorization"],
      ans: 1,
      exp: "Use the approved roster process and obtain authorization before the swap, ensuring staffing and competence requirements are met. Deadlines depend on local policy.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What is the strict rule if an incoming shift reliever fails to arrive on time at the end of your shift?",
      opts: ["Leave after sending the supervisor a message", "Escalate immediately and maintain safe care until an authorized handover", "Transfer responsibility to any staff member nearby", "Leave after documenting that the reliever did not arrive"],
      ans: 1,
      exp: "Leaving a clinical station without handing over to an authorized reliever constitutes patient abandonment, a serious medico-legal violation and grounds for disciplinary dismissal.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU", "OT", "Emergency"],
    },
    {
      q: "What is the primary purpose and rule regarding Casual Leave (CL) at ACME Hospital?",
      opts: ["Use it as a substitute for planned annual vacation", "Use it for eligible short personal needs through the approved leave process", "Use it to cover every missed attendance punch", "Use it without approval whenever a balance is available"],
      ans: 1,
      exp: "Casual leave covers eligible short personal needs according to the approved local leave rules. Apply through the authorized process; entitlement and approval conditions are policy-specific.",
      diff: "basic",
      tags: [],
    },
    {
      q: "How should an employee determine when medical documentation is required for sick leave?",
      opts: ["Submit a certificate only if the supervisor requests it verbally", "Follow the documentation requirements in the approved sick-leave policy", "Assume a certificate is needed only after 30 days", "Use the same certificate for all future absences"],
      ans: 1,
      exp: "Medical documentation thresholds are policy-specific. Check the approved sick-leave rules and submit the required evidence through the authorized process.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What should an employee do before taking planned annual or privilege leave?",
      opts: ["Book travel first and apply after the leave begins", "Apply using the approved lead time and obtain approval before taking leave", "Assume every hospital requires exactly seven days notice", "Treat the available leave balance as automatic permission"],
      ans: 1,
      exp: "Apply through the approved process with the policy-specific notice period and obtain authorization. A leave balance alone does not approve an absence.",
      diff: "basic",
      tags: [],
    },
    {
      q: "Under section 5 of the Maternity Benefit Act, what is the maximum maternity-benefit period for an eligible woman with fewer than two surviving children?",
      opts: ["12 weeks", "18 weeks", "26 weeks", "24 weeks"],
      ans: 2,
      exp: "The maximum is 26 weeks for an eligible woman with fewer than two surviving children, with up to eight weeks before expected delivery. Women with two or more surviving children have a different entitlement.",
      diff: "basic",
      tags: [],
    },
    {
      q: "How should an unapproved absence be handled for attendance and payroll?",
      opts: ["Convert the absence automatically to paid casual leave", "Review it under attendance, leave, and disciplinary rules before payroll action", "Deduct a fixed three-month salary regardless of the absence", "Approve it retrospectively without checking the employee explanation"],
      ans: 1,
      exp: "Verify facts and any explanation, apply the approved leave and payroll rules, and follow due process for disciplinary action. Deductions must comply with applicable requirements.",
      diff: "basic",
      tags: [],
    },
    {
      q: "How should leave eligibility during probation be determined?",
      opts: ["Assume probation removes every statutory leave entitlement", "Check the appointment terms, approved policy, and applicable statutory rights", "Assume the full annual leave balance is available on joining", "Use the leave rules of a colleague in a different employment category"],
      ans: 1,
      exp: "Probationary leave depends on appointment terms, approved policy, and statutory entitlements. Probation does not automatically remove statutory rights.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What is the hospital policy regarding wearing the official employee Photo Identity Badge while on duty?",
      opts: ["Keep the badge in a pocket for occasional inspection", "Display the approved identity badge as required during duty", "Wear it only at the entrance and remove it during care", "Use the department access card instead of personal identification"],
      ans: 1,
      exp: "Display the approved personal identity badge according to duty, infection-control, and access policy so patients and colleagues can identify staff.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What type of footwear is strictly mandated for staff working in wards, ICUs, and operating theaters?",
      opts: ["Closed-toe shoes with a smooth slippery sole", "Closed-toe, slip-resistant footwear suitable for clinical work", "Open-back shoes with a slip-resistant sole", "Fabric shoes that readily absorb liquid spills"],
      ans: 1,
      exp: "Use footwear appropriate to the clinical area and hazard assessment, including closed-toe and slip-resistant protection as required by the approved policy.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU", "OT"],
    },
    {
      q: "Why does hospital HR and Infection Control policy prohibit wristwatches, rings, and bracelets below the elbow for clinical staff during patient care?",
      opts: ["It reduces the time needed to put on a uniform", "It supports effective hand hygiene and reduces microbial reservoirs", "It removes the need for glove changes between patients", "It replaces the need to clean reusable equipment"],
      ans: 1,
      exp: "Under WHO and NABH 'Bare Below the Elbows' guidelines, wristwatches and rings harbor bacteria and obstruct effective hand hygiene and glove compliance.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU", "OT"],
    },
    {
      q: "Which nail-care practice best supports infection prevention during high-risk patient care?",
      opts: ["Artificial nails are acceptable if covered by gloves", "Keep natural nails short and avoid artificial nails in high-risk patient care", "Artificial nails are acceptable if alcohol rub is used twice", "Nail length does not matter when sterile gloves are available"],
      ans: 1,
      exp: "Keep natural nails short and follow infection-control policy. CDC advises against artificial nails or extenders when caring for high-risk patients; gloves do not remove that risk.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU", "OT"],
    },
    {
      q: "How should an employee respond when a patient offers a personal cash tip or valuable gift?",
      opts: ["Accept the gift if it is offered after discharge", "Follow the gifts policy, decline prohibited personal gifts, and disclose the offer", "Accept it if shared with the entire shift team", "Accept it if the patient says no special favor is expected"],
      ans: 1,
      exp: "Follow the approved gifts and conflicts-of-interest policy, decline prohibited gifts, and use any required disclosure process.",
      diff: "basic",
      tags: [],
    },
    {
      q: "Can a healthcare worker take a photograph of an interesting surgical case or cured patient and post it on their personal social media account without the patient's face showing?",
      opts: ["Yes, cropping the face always makes an image anonymous", "No; follow consent, confidentiality, and institutional authorization requirements", "Yes, if access is restricted to professional colleagues", "Yes, if the post is removed within 24 hours"],
      ans: 1,
      exp: "Taking or sharing patient images, pathology specimens, or medical records on social media is a severe breach of patient confidentiality and medical ethics, punishable by termination.",
      diff: "basic",
      tags: [],
    },
    {
      q: "Where is it strictly forbidden to discuss identifiable patient clinical conditions or diagnoses?",
      opts: ["In a private handover with the responsible care team", "In a public lift or cafeteria where others can overhear", "During a confidential multidisciplinary care discussion", "During an authorized clinical review in a private room"],
      ans: 1,
      exp: "Discussing patients in elevators, public lobbies, or cafeterias breaches patient privacy rights and violates NABH confidentiality standards.",
      diff: "basic",
      tags: [],
    },
    {
      q: "How should staff apply a hospital tobacco-free campus policy?",
      opts: ["Use tobacco only in stairwells away from patients", "Follow the posted tobacco-free campus policy throughout the grounds", "Use tobacco in parking areas if no patients are present", "Permit tobacco use during staff breaks regardless of location"],
      ans: 1,
      exp: "Observe the approved policy and posted restrictions across the campus. Do not invent exceptions for shifts or locations.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What is the priority response when a staff member appears impaired by alcohol or another substance on duty?",
      opts: ["Assign only medication preparation until the shift ends", "Remove the person from patient care and arrange prompt assessment and escalation", "Ask a colleague to supervise while normal duties continue", "Wait for a patient complaint before taking action"],
      ans: 1,
      exp: "Protect patients, remove the person from safety-sensitive care, arrange appropriate assessment, and notify the authorized supervisor. Investigation and employment action follow policy and due process.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What constitutes workplace sexual harassment under the POSH (Prevention of Sexual Harassment) Act, 2013 at ACME Hospital?",
      opts: ["A respectful disagreement about the duty roster", "Unwelcome sexual comments, contact, demands, or other sexual conduct", "A documented performance review using objective criteria", "A necessary clinical examination with appropriate consent"],
      ans: 1,
      exp: "The POSH Act covers any unwelcome verbal, physical, or visual conduct of a sexual nature that creates an intimidating, hostile, or offensive working environment.",
      diff: "basic",
      tags: [],
    },
    {
      q: "Which designated body investigates formal complaints of workplace sexual harassment within the hospital?",
      opts: ["The departmental disciplinary panel", "The statutory Internal Committee constituted under POSH", "The occupational health review board", "The patient grievance committee"],
      ans: 1,
      exp: "Every hospital with 10+ employees must maintain an Internal Complaints Committee (ICC) headed by a senior woman employee to impartially investigate sexual harassment complaints.",
      diff: "basic",
      tags: [],
    },
    {
      q: "Under POSH section 9, when should a complaint normally be submitted?",
      opts: ["One month, with no possible extension", "Three months from the incident or last incident, with a permitted extension", "Six months from the date of resignation", "Twelve months from completion of an internal investigation"],
      ans: 1,
      exp: "Normally within three months of the incident, or the last incident in a series. The committee may extend by up to three further months for recorded reasons when circumstances prevented timely filing.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What does the law mandate regarding the publication or disclosure of details of a POSH complaint or inquiry?",
      opts: ["Share identities with the whole department for transparency", "Restrict disclosure to authorized handling and protect identities and proceedings", "Publish a case summary identifying the parties after inquiry", "Allow witness names to circulate if the complainant is unnamed"],
      ans: 1,
      exp: "Section 16 of the POSH Act prohibits disclosing the identity, address, or proceedings of the aggrieved woman and witnesses; violations attract statutory fines and penalties.",
      diff: "basic",
      tags: [],
    },
    {
      q: "For a routine roster disagreement with no safety or harassment concern, what is the usual first step?",
      opts: ["Ask all colleagues to sign a public complaint first", "Use the approved grievance route, usually starting with the immediate supervisor", "Stop attending assigned shifts until the issue is resolved", "Ask patients to raise the grievance with management"],
      ans: 1,
      exp: "Use the approved grievance process, usually beginning with the immediate supervisor. Safety, harassment, retaliation, or conflicts of interest may require a different route.",
      diff: "basic",
      tags: [],
    },
    {
      q: "If an employee's grievance directly involves their Department Incharge, to whom should the complaint be escalated?",
      opts: ["Ask the same incharge to approve whether the complaint may be filed", "Use the alternate HR or designated grievance route", "Submit it only through a colleague informal message", "Wait until the incharge changes departments"],
      ans: 1,
      exp: "When a grievance involves the immediate supervisor, the employee has the right to escalate directly to HR or the designated Management Grievance Officer in confidence.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What is the purpose of issuing a 'Show-Cause Notice' to an employee in a hospital disciplinary procedure?",
      opts: ["Confirm a final penalty before hearing the employee", "Explain the allegation and provide an opportunity to respond", "Replace the investigation with a supervisor verbal warning", "Approve a payroll deduction without reviewing the facts"],
      ans: 1,
      exp: "A Show-Cause Notice guarantees natural justice by detailing alleged infractions and granting the employee a formal opportunity to respond before any disciplinary action.",
      diff: "basic",
      tags: [],
    },
    {
      q: "Which of the following constitutes gross willful misconduct that may warrant immediate termination following inquiry?",
      opts: ["A first isolated documentation omission reported promptly", "Deliberate falsification of patient records", "A delayed leave request with a documented explanation", "A good-faith report of an intercepted medication error"],
      ans: 1,
      exp: "Gross misconduct includes theft, intentional alteration of patient records, physical violence, and actions endangering human life, justifying immediate dismissal.",
      diff: "basic",
      tags: [],
    },
    {
      q: "How should an employee verify when monthly salary is due?",
      opts: ["Rely only on the date a colleague was paid last month", "Check the approved payroll calendar and raise unexplained delays with HR", "Assume every hospital pays by the same calendar date", "Use the attendance cutoff date as the salary payment date"],
      ans: 1,
      exp: "Use the approved payroll calendar and applicable employment requirements. A specific ACME salary date should not be asserted without an approved source.",
      diff: "basic",
      tags: [],
    },
    {
      q: "For an EPF-covered establishment using the standard 12% rate, what is the employee contribution rate on eligible EPF wages?",
      opts: ["8%", "10%", "12%", "15%"],
      ans: 2,
      exp: "The standard employee EPF contribution rate is 12% of eligible EPF wages, subject to coverage, wage ceilings, and applicable exceptions. It is not always 12% of total gross salary.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What is the primary benefit provided to eligible low-wage employees enrolled under the Employees' State Insurance (ESI) scheme?",
      opts: ["A private investment fund for voluntary employee savings", "Social insurance with medical care and specified cash benefits", "A salary advance repayable through monthly deductions", "A scheme that replaces all employer leave obligations"],
      ans: 1,
      exp: "The ESI scheme provides comprehensive medical cover and socio-economic cash benefits to insured hospital employees and their families during illness or injury.",
      diff: "basic",
      tags: [],
    },
    {
      q: "How can ACME Hospital employees access and verify their monthly salary payslips, tax deductions, and EPF details?",
      opts: ["Use a colleague login to download the department payroll list", "Use your authorized staff account to view the available payslip", "Treat the bank credit alone as a full salary breakdown", "Request another employee payslip as a template for your deductions"],
      ans: 1,
      exp: "Use your own authorized staff account to access available payslips and payroll details. Seek clarification from HR/accounts through the approved route when information is missing.",
      diff: "basic",
      tags: [],
    },
    {
      q: "How should a new employee determine probation duration and confirmation requirements?",
      opts: ["Assume confirmation occurs automatically after three months", "Check appointment terms and obtain the formal confirmation decision", "Treat completion of induction as employment confirmation", "Assume another employee probation period applies to everyone"],
      ans: 1,
      exp: "Check the appointment letter and approved HR policy. Confirmation requirements and probation length are employment-specific.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What is the requirement when an employee decides to resign from ACME Hospital?",
      opts: ["Inform the roster team verbally and stop attending after the current shift", "Submit formal notice and follow the appointment terms and approved exit process", "Use unused leave as a substitute for an approved notice arrangement", "Assume sending a message immediately ends employment obligations"],
      ans: 1,
      exp: "Staff must submit written resignation and serve the stipulated notice period (typically 1 to 3 months) to ensure clinical continuity and proper patient handover.",
      diff: "basic",
      tags: [],
    },
    {
      q: "Why is completing the 'Exit Clearance / No Dues Process' mandatory prior to final settlement and relieving letter issuance?",
      opts: ["To replace the need for a patient-care handover", "To reconcile hospital property, assigned responsibilities, and pending clearances", "To extend the notice period automatically for every employee", "To remove all records of the employee employment"],
      ans: 1,
      exp: "Exit clearance ensures all hospital property, keys, locker contents, and medical documentations are safely handed over before full and final salary settlement.",
      diff: "basic",
      tags: [],
    },
    {
      q: "When raising an alarm for smoke in a patient-care area, what information most helps the emergency responders?",
      opts: ["Report only that there is a fire somewhere in the building", "Give the exact location, observed hazard, and immediate patient risk", "Give the name of the staff member who discovered it only", "Wait to confirm the fire cause before raising the alarm"],
      ans: 1,
      exp: "Communicate the exact location, nature of the hazard, and immediate patient risk through the approved alarm pathway while taking safe protective actions.",
      diff: "basic",
      tags: [],
    },
    {
      q: "A resuscitation alert is announced in another ward while you are responsible for an unstable patient. What is the safest response?",
      opts: ["Leave the current patient immediately without handing over care", "Follow the assigned response role while ensuring current patients have safe coverage", "Ignore the alert because it is in a different ward", "Ask an untrained attendant to take full responsibility for current patients"],
      ans: 1,
      exp: "Follow the assigned emergency-response role and arrange appropriate coverage or escalation for current patients. An emergency elsewhere does not justify abandoning an unstable patient.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU", "Emergency", "OT"],
    },
    {
      q: "A possible infant abduction is reported from the maternity ward. What should staff do first?",
      opts: ["Activate the approved security response and assigned exit and identity checks", "Let all visitors leave quickly to clear the ward", "Share the infant details on a personal social media account", "Wait for relatives to search the building before notifying security"],
      ans: 0,
      exp: "Activate the approved infant-security response, protect remaining infants, and follow assigned exit-control, identification, and escalation procedures.",
      diff: "basic",
      tags: ["NICU", "Ward", "Emergency"],
    },
    {
      q: "The hospital receives notice of a major external incident with many casualties expected. What should the receiving team do?",
      opts: ["Admit patients strictly in order of arrival without triage", "Activate the disaster plan and prepare triage, capacity, and assigned response roles", "Discharge every current inpatient immediately", "Send all staff to the entrance without allocating responsibilities"],
      ans: 1,
      exp: "Activate the approved disaster response, establish triage and clinical capacity, allocate roles, and protect continuity of care for existing patients.",
      diff: "basic",
      tags: ["Emergency", "Ward", "ICU/HDU"],
    },
    {
      q: "An unidentified chemical spills in a hospital work area. What is the safest initial staff response?",
      opts: ["Clean the spill immediately with the nearest detergent", "Keep people away, protect yourself, and call the trained spill-response team", "Move the spill into the nearest floor drain", "Mix it with bleach before checking the substance"],
      ans: 1,
      exp: "Avoid exposure, isolate the area, and alert the trained response team under the approved spill plan. Identify the material safely; do not mix chemicals or improvise cleanup.",
      diff: "basic",
      tags: ["Emergency", "ICU/HDU", "OT"],
    },
    {
      q: "After first aid for an occupational needle-stick injury, what should the employee do next?",
      opts: ["Wait for the next routine staff health appointment", "Report immediately and obtain urgent occupational exposure assessment", "Report only if the source patient is known to have HIV", "Obtain a baseline blood test before notifying anyone"],
      ans: 1,
      exp: "Report promptly through the occupational exposure pathway for risk assessment, baseline testing, and indicated prophylaxis. The action tested here is escalation after first aid, not wound washing.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU", "OT", "Emergency"],
    },
    {
      q: "Why does ACME Hospital provide mandatory Hepatitis B vaccination to all healthcare workers at the time of induction?",
      opts: ["It prevents all blood-borne infections after sharps injuries", "It reduces the risk of occupational hepatitis B infection", "It removes the need to report blood exposures", "It replaces safe sharps handling for immune staff"],
      ans: 1,
      exp: "Hepatitis B vaccination is mandatory for healthcare personnel under NABH and OSHA guidelines due to the high risk of transmission via blood-borne occupational exposures.",
      diff: "basic",
      tags: [],
    },
    {
      q: "How should staff occupational health screening be planned?",
      opts: ["Arrange a chest X-ray every year without considering risk", "Follow the approved occupational health program and exposure-specific assessment", "Use the same screening package for every role regardless of hazards", "Defer every health concern until the next routine annual check"],
      ans: 1,
      exp: "Screening should follow the approved occupational health program, job hazards, exposure history, and clinical need. Annual chest X-rays or a free fixed test package cannot be assumed for every employee.",
      diff: "basic",
      tags: [],
    },
    {
      q: "Under NABH accreditation criteria, why must hospital clinical staff attend regular in-service training and CME sessions throughout the year?",
      opts: ["To replace all supervised competency assessments", "To maintain competence and apply updated safe-care practices", "To satisfy attendance requirements without checking learning", "To allow any employee to perform any clinical procedure"],
      ans: 1,
      exp: "Continuing training supports clinical competence and adoption of updated safe-care practices. Training requirements and competency reassessment follow the applicable accreditation and institutional program.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What should a staff member do upon identifying a clinical 'Near Miss' (an error caught before reaching the patient)?",
      opts: ["Report only if the same error happens a second time", "Report through the approved system so contributing factors can be addressed", "Record it only in a personal notebook because no harm occurred", "Wait for the person involved to decide whether to report"],
      ans: 1,
      exp: "A non-punitive Near-Miss reporting culture enables hospitals to identify systemic vulnerabilities and implement safeguards before an adverse event harms a patient.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What is the ethical and legal duty of hospital staff regarding patient rights during clinical procedures?",
      opts: ["Treat a signed admission form as consent for every later procedure", "Respect privacy and support valid informed consent for the proposed procedure", "Obtain a relative signature instead of speaking to a capable patient", "Use technical language so the procedure is explained quickly"],
      ans: 1,
      exp: "Patients possess statutory rights to dignity, confidentiality, second opinions, and full explanation of risks and benefits before giving voluntary informed consent.",
      diff: "basic",
      tags: [],
    },
    {
      q: "What is ACME Hospital's HR policy regarding the use of personal mobile phones for entertainment, games, or non-work calls during active clinical duty hours?",
      opts: ["Use personal messages while another staff member watches the patient", "Follow phone-use policy and avoid non-work distractions during direct care", "Finish personal calls while preparing medicines if labels are visible", "Use headphones during routine patient monitoring"],
      ans: 1,
      exp: "Distraction from mobile phones in clinical environments is a documented cause of medication errors; personal phone use during direct patient care is strictly restricted.",
      diff: "basic",
      tags: ["Ward", "ICU/HDU", "OT", "Emergency"],
    },
  ];

  for (let i = 0; i < hrTopics.length; i++) {
    const base = hrTopics[i];
    const code = `MCQ-HR-${String(i + 1).padStart(3, "0")}`;
    list.push(
      makeQ(
        code,
        "HR_POLICY",
        base.q,
        base.opts,
        base.ans,
        base.exp,
        base.tags,
        base.diff,
        60
      )
    );
  }

  // Add the written department topics, then consolidate reviewed overlaps.
  const deptQuestions = generateDepartmentQuestions({ shuffleOptions: false });
  list.push(...deptQuestions);

  return curateQuestionBank(list);
}

async function main() {
  console.log("=============================================================================");
  console.log(" ACME ERP: Reviewed Theoretical Questions for CBT Question Bank");
  console.log("=============================================================================\n");

  const acmeOnly = process.argv.includes("--acme-only");
  const allQuestions = generateQuestions();
  const questions = acmeOnly ? allQuestions.filter(q => q.code.startsWith("MCQ-DS-ACME-")) : allQuestions;
  const scenarios = acmeOnly ? departmentScenarios.filter(s => s.code.startsWith("DS-ACME-")) : departmentScenarios;
  const retiredCodes = acmeOnly ? [] : getRetiredQuestionCodes(allQuestions);
  console.log(`Generated ${questions.length} reviewed questions.`);
  console.log(`Prepared ${scenarios.length} department-specific practical scenarios.`);

  const domainCounts: Record<string, number> = {};
  const diffCounts: Record<string, number> = {};
  const deptCounts: Record<string, number> = {};

  for (const q of questions) {
    domainCounts[q.domainCode] = (domainCounts[q.domainCode] || 0) + 1;
    diffCounts[q.difficulty] = (diffCounts[q.difficulty] || 0) + 1;
    for (const d of q.departmentTags) {
      deptCounts[d] = (deptCounts[d] || 0) + 1;
    }
  }

  console.log("\nQuestion Catalog Breakdown:");
  console.log("By Competency Domain:");
  for (const [k, v] of Object.entries(domainCounts)) {
    console.log(`  • ${k.padEnd(14)}: ${v} questions`);
  }
  console.log("\nBy Clinical Department Tag:");
  for (const [k, v] of Object.entries(deptCounts)) {
    console.log(`  • ${k.padEnd(14)}: ${v} questions`);
  }
  console.log("\nBy Difficulty Level:");
  for (const [k, v] of Object.entries(diffCounts)) {
    console.log(`  • ${k.padEnd(14)}: ${v} questions`);
  }

  console.log(`\n${retiredCodes.length} historical seed codes are retired (repeats or reviewed overlaps).`);
  if (process.argv.includes("--check")) {
    const answerCounts = [0, 0, 0, 0];
    for (const q of questions) answerCounts[q.correctOptionIndex]++;
    console.log(`Answer positions A/B/C/D: ${answerCounts.join(" / ")}`);
    console.log("Question-bank checks passed. No database connection was made.");
    return;
  }

  loadEnvironment();
  const { pool } = await import("../server/db/client.ts");

  console.log(`\nInserting/Updating ${questions.length} questions into PostgreSQL database...`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert scenario masters once. Never overwrite a criterion that may already
    // have staff assessment scores or local edits attached to it.
    let scenariosInserted = 0;
    for (const scenario of scenarios) {
      const guidelines = scenarioGuidelines(scenario);
      const result = await client.query(
        `INSERT INTO skill_assessment.competency_criteria
          (domain_id, code, title, description, clinical_scenario, skill_type,
           theoretical_guideline, practical_guideline, target_score, weightage, display_order)
         SELECT id, $2, $3, $4, $5, 'both', $6, $7, 4, 1, $8
         FROM skill_assessment.competency_domains WHERE code = $1
         ON CONFLICT (code) DO NOTHING`,
        [scenario.domainCode, scenario.code, `${scenario.department}: ${scenario.title}`,
          `Department-specific simulation for ${scenario.department}: ${scenario.title}.`,
          scenario.situation, guidelines.theoretical, guidelines.practical,
          100 + departmentScenarios.indexOf(scenario)],
      );
      // A missing domain must roll back the whole seed rather than silently skip a case.
      const exists = await client.query(
        `SELECT id FROM skill_assessment.competency_criteria WHERE code = $1`, [scenario.code],
      );
      if (!exists.rowCount) throw new Error(`Missing competency domain for ${scenario.code}: ${scenario.domainCode}`);
      scenariosInserted += result.rowCount ?? 0;
    }
    console.log(`Inserted ${scenariosInserted} new practical scenarios (${scenarios.length} seed scenarios available).`);

    // The targeted addition does not modify unrelated domain masters.
    if (!acmeOnly) await client.query(`
      INSERT INTO "skill_assessment"."competency_domains" ("code", "name", "nabh_standard_ref", "description", "display_order")
      VALUES ('HR_POLICY', 'Hospital HR Policies & Code of Conduct', 'NABH 5th Ed: HRM.1 - HRM.6', 'Hospital HR rules, staff conduct, attendance, leave entitlements, POSH, and statutory compliance.', 7)
      ON CONFLICT ("code") DO NOTHING;
    `);

    let inserted = 0;
    for (const q of questions) {
      await client.query(
        `
        INSERT INTO "skill_assessment"."theoretical_questions" (
          "code", "domain_code", "question", "options", "correct_option_index",
          "explanation", "department_tags", "difficulty", "default_time_seconds", "active"
        )
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::jsonb, $8, $9, true)
        ON CONFLICT ("code") DO UPDATE SET
          "domain_code" = EXCLUDED."domain_code",
          "question" = EXCLUDED."question",
          "options" = EXCLUDED."options",
          "correct_option_index" = EXCLUDED."correct_option_index",
          "explanation" = EXCLUDED."explanation",
          "department_tags" = EXCLUDED."department_tags",
          "difficulty" = EXCLUDED."difficulty",
          "default_time_seconds" = EXCLUDED."default_time_seconds",
          "active" = true,
          "updated_at" = NOW();
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
      inserted++;
      if (inserted % 100 === 0 || inserted === questions.length) {
        process.stdout.write(`  -> Seeded ${inserted}/${questions.length} questions...\n`);
      }
    }

    // Preserve old rows and exam snapshots, but exclude retired seeded items
    // from new exams. Match only the explicit historical seed-code inventory.
    const retired = await client.query(
      `UPDATE "skill_assessment"."theoretical_questions"
       SET "active" = false, "updated_at" = NOW()
       WHERE "code" = ANY($1::text[]) AND "active" = true`,
      [retiredCodes]
    );
    console.log(`Retired ${retired.rowCount ?? 0} previously active duplicate seed rows.`);

    await client.query("COMMIT");
    console.log("\n✅ Transaction committed successfully!");

    const countRes = await pool.query(
      `SELECT count(*) as total, count(*) filter (where active = true) as active FROM skill_assessment.theoretical_questions`
    );
    console.log(
      `\n📊 Current DB State: ${countRes.rows[0].total} total questions in question bank (${countRes.rows[0].active} active).\n`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Failed to seed question bank:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((err) => {
    console.error("Execution failed:", err);
    process.exitCode = 1;
  });
}
