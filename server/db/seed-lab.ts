import { db } from "./client.ts";
import {
  labTestCategories,
  labTests,
  labTestReferenceRanges,
  labPanels,
  labPanelTests,
} from "./schema-lab.ts";

export async function seedLabData() {
  console.log("🌱 Seeding Lab master data...");

  // 1. Categories
  const categoriesData = [
    { name: "Hematology", code: "HEM", sortOrder: 1 },
    { name: "Biochemistry", code: "BIO", sortOrder: 2 },
    { name: "Clinical Pathology", code: "CP", sortOrder: 3 },
    { name: "Serology & Immunology", code: "SERO", sortOrder: 4 },
    { name: "Microbiology", code: "MICRO", sortOrder: 5 },
  ];

  const categoryMap = new Map<string, number>();
  for (const cat of categoriesData) {
    const [inserted] = await db
      .insert(labTestCategories)
      .values(cat)
      .onConflictDoUpdate({
        target: [labTestCategories.code],
        set: { name: cat.name, sortOrder: cat.sortOrder },
      })
      .returning({ id: labTestCategories.id, code: labTestCategories.code });
    categoryMap.set(inserted.code, inserted.id);
  }

  // 2. Tests and Reference Ranges
  interface TestSeed {
    categoryCode: string;
    code: string;
    name: string;
    specimenType: string;
    unit?: string;
    price: string;
    turnaroundHours: number;
    method?: string;
    ranges: Array<{
      gender: "Male" | "Female" | "Both";
      ageMin: number;
      ageMax: number;
      lowValue?: string;
      highValue?: string;
      criticalLow?: string;
      criticalHigh?: string;
      textRange?: string;
      remarks?: string;
    }>;
  }

  const testsSeed: TestSeed[] = [
    // Hematology - CBC components
    {
      categoryCode: "HEM",
      code: "HB",
      name: "Hemoglobin",
      specimenType: "Whole Blood EDTA",
      unit: "g/dL",
      price: "120.00",
      turnaroundHours: 4,
      method: "Spectrophotometry",
      ranges: [
        { gender: "Male", ageMin: 15, ageMax: 120, lowValue: "13.0", highValue: "17.0", criticalLow: "7.0", criticalHigh: "20.0" },
        { gender: "Female", ageMin: 15, ageMax: 120, lowValue: "12.0", highValue: "15.5", criticalLow: "7.0", criticalHigh: "20.0" },
        { gender: "Both", ageMin: 0, ageMax: 14, lowValue: "11.0", highValue: "14.5", criticalLow: "6.5", criticalHigh: "19.0" },
      ],
    },
    {
      categoryCode: "HEM",
      code: "TLC",
      name: "Total Leucocyte Count (WBC)",
      specimenType: "Whole Blood EDTA",
      unit: "/cumm",
      price: "100.00",
      turnaroundHours: 4,
      method: "Automated Cell Counter",
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "4000", highValue: "11000", criticalLow: "2000", criticalHigh: "30000" },
      ],
    },
    {
      categoryCode: "HEM",
      code: "PLT",
      name: "Platelet Count",
      specimenType: "Whole Blood EDTA",
      unit: "/cumm",
      price: "120.00",
      turnaroundHours: 4,
      method: "Automated Cell Counter",
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "150000", highValue: "450000", criticalLow: "50000", criticalHigh: "1000000" },
      ],
    },
    {
      categoryCode: "HEM",
      code: "RBC",
      name: "Total RBC Count",
      specimenType: "Whole Blood EDTA",
      unit: "mil/cumm",
      price: "100.00",
      turnaroundHours: 4,
      method: "Automated Cell Counter",
      ranges: [
        { gender: "Male", ageMin: 15, ageMax: 120, lowValue: "4.5", highValue: "5.9" },
        { gender: "Female", ageMin: 15, ageMax: 120, lowValue: "4.0", highValue: "5.2" },
      ],
    },
    {
      categoryCode: "HEM",
      code: "PCV",
      name: "Packed Cell Volume (Hematocrit)",
      specimenType: "Whole Blood EDTA",
      unit: "%",
      price: "90.00",
      turnaroundHours: 4,
      method: "Automated Calculation",
      ranges: [
        { gender: "Male", ageMin: 15, ageMax: 120, lowValue: "40.0", highValue: "50.0" },
        { gender: "Female", ageMin: 15, ageMax: 120, lowValue: "36.0", highValue: "46.0" },
      ],
    },

    // Biochemistry - LFT components
    {
      categoryCode: "BIO",
      code: "BILI_T",
      name: "Total Bilirubin",
      specimenType: "Serum",
      unit: "mg/dL",
      price: "150.00",
      turnaroundHours: 6,
      method: "Jendrassik-Grof",
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "0.2", highValue: "1.2", criticalHigh: "15.0" },
      ],
    },
    {
      categoryCode: "BIO",
      code: "BILI_D",
      name: "Direct Bilirubin",
      specimenType: "Serum",
      unit: "mg/dL",
      price: "100.00",
      turnaroundHours: 6,
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "0.0", highValue: "0.3" },
      ],
    },
    {
      categoryCode: "BIO",
      code: "SGOT",
      name: "SGOT (AST)",
      specimenType: "Serum",
      unit: "IU/L",
      price: "150.00",
      turnaroundHours: 6,
      method: "IFCC UV Kinetic",
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "5.0", highValue: "40.0", criticalHigh: "500.0" },
      ],
    },
    {
      categoryCode: "BIO",
      code: "SGPT",
      name: "SGPT (ALT)",
      specimenType: "Serum",
      unit: "IU/L",
      price: "150.00",
      turnaroundHours: 6,
      method: "IFCC UV Kinetic",
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "5.0", highValue: "45.0", criticalHigh: "500.0" },
      ],
    },
    {
      categoryCode: "BIO",
      code: "ALP",
      name: "Alkaline Phosphatase (ALP)",
      specimenType: "Serum",
      unit: "IU/L",
      price: "160.00",
      turnaroundHours: 6,
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "30.0", highValue: "120.0" },
      ],
    },
    {
      categoryCode: "BIO",
      code: "TP",
      name: "Total Protein",
      specimenType: "Serum",
      unit: "g/dL",
      price: "130.00",
      turnaroundHours: 6,
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "6.0", highValue: "8.3" },
      ],
    },
    {
      categoryCode: "BIO",
      code: "ALB",
      name: "Serum Albumin",
      specimenType: "Serum",
      unit: "g/dL",
      price: "130.00",
      turnaroundHours: 6,
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "3.5", highValue: "5.0" },
      ],
    },

    // Biochemistry - KFT components
    {
      categoryCode: "BIO",
      code: "UREA",
      name: "Blood Urea",
      specimenType: "Serum",
      unit: "mg/dL",
      price: "140.00",
      turnaroundHours: 6,
      method: "GLDH UV Kinetic",
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "15.0", highValue: "40.0", criticalHigh: "100.0" },
      ],
    },
    {
      categoryCode: "BIO",
      code: "CREAT",
      name: "Serum Creatinine",
      specimenType: "Serum",
      unit: "mg/dL",
      price: "140.00",
      turnaroundHours: 6,
      method: "Modified Jaffe",
      ranges: [
        { gender: "Male", ageMin: 15, ageMax: 120, lowValue: "0.7", highValue: "1.3", criticalHigh: "6.0" },
        { gender: "Female", ageMin: 15, ageMax: 120, lowValue: "0.6", highValue: "1.1", criticalHigh: "6.0" },
        { gender: "Both", ageMin: 0, ageMax: 14, lowValue: "0.3", highValue: "0.8" },
      ],
    },
    {
      categoryCode: "BIO",
      code: "URIC",
      name: "Serum Uric Acid",
      specimenType: "Serum",
      unit: "mg/dL",
      price: "160.00",
      turnaroundHours: 6,
      ranges: [
        { gender: "Male", ageMin: 15, ageMax: 120, lowValue: "3.4", highValue: "7.0" },
        { gender: "Female", ageMin: 15, ageMax: 120, lowValue: "2.4", highValue: "5.7" },
      ],
    },
    {
      categoryCode: "BIO",
      code: "NA",
      name: "Serum Sodium (Na+)",
      specimenType: "Serum",
      unit: "mEq/L",
      price: "150.00",
      turnaroundHours: 4,
      method: "ISE Direct",
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "135.0", highValue: "145.0", criticalLow: "120.0", criticalHigh: "160.0" },
      ],
    },
    {
      categoryCode: "BIO",
      code: "K",
      name: "Serum Potassium (K+)",
      specimenType: "Serum",
      unit: "mEq/L",
      price: "150.00",
      turnaroundHours: 4,
      method: "ISE Direct",
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "3.5", highValue: "5.1", criticalLow: "2.8", criticalHigh: "6.5" },
      ],
    },

    // Diabetes & Routine
    {
      categoryCode: "BIO",
      code: "FBS",
      name: "Fasting Blood Sugar (FBS)",
      specimenType: "Sodium Fluoride Plasma",
      unit: "mg/dL",
      price: "90.00",
      turnaroundHours: 4,
      method: "GOD-POD",
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "70.0", highValue: "100.0", criticalLow: "45.0", criticalHigh: "400.0" },
      ],
    },
    {
      categoryCode: "BIO",
      code: "PPBS",
      name: "Post Prandial Blood Sugar (PPBS)",
      specimenType: "Sodium Fluoride Plasma",
      unit: "mg/dL",
      price: "90.00",
      turnaroundHours: 4,
      method: "GOD-POD",
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "70.0", highValue: "140.0", criticalHigh: "400.0" },
      ],
    },
    {
      categoryCode: "BIO",
      code: "HBA1C",
      name: "Glycated Hemoglobin (HbA1c)",
      specimenType: "Whole Blood EDTA",
      unit: "%",
      price: "450.00",
      turnaroundHours: 12,
      method: "HPLC",
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, lowValue: "4.0", highValue: "5.6", remarks: "Normal: <5.7%, Prediabetes: 5.7-6.4%, Diabetes: >=6.5%" },
      ],
    },

    // Clinical Pathology & Serology
    {
      categoryCode: "CP",
      code: "URINE_R",
      name: "Urine Routine & Microscopic Examination",
      specimenType: "Clean Catch Midstream Urine",
      unit: "",
      price: "150.00",
      turnaroundHours: 4,
      method: "Strip & Microscopy",
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, textRange: "Normal / Nil protein / Nil sugar / 0-2 Pus cells" },
      ],
    },
    {
      categoryCode: "SERO",
      code: "WIDAL",
      name: "Widal Test (Typhoid Antibody)",
      specimenType: "Serum",
      unit: "Titre",
      price: "200.00",
      turnaroundHours: 6,
      method: "Slide Agglutination",
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, textRange: "Negative (< 1:80)" },
      ],
    },
    {
      categoryCode: "SERO",
      code: "DENGUE_NS1",
      name: "Dengue NS1 Antigen Rapid Test",
      specimenType: "Serum",
      unit: "",
      price: "500.00",
      turnaroundHours: 4,
      method: "Immunochromatography",
      ranges: [
        { gender: "Both", ageMin: 0, ageMax: 120, textRange: "Negative" },
      ],
    },
  ];

  const testMap = new Map<string, number>();
  for (const t of testsSeed) {
    const categoryId = categoryMap.get(t.categoryCode);
    if (!categoryId) continue;

    const [inserted] = await db
      .insert(labTests)
      .values({
        categoryId,
        code: t.code,
        name: t.name,
        specimenType: t.specimenType,
        unit: t.unit,
        price: t.price,
        turnaroundHours: t.turnaroundHours,
        method: t.method,
      })
      .onConflictDoUpdate({
        target: [labTests.code],
        set: {
          categoryId,
          name: t.name,
          specimenType: t.specimenType,
          unit: t.unit,
          price: t.price,
          turnaroundHours: t.turnaroundHours,
          method: t.method,
        },
      })
      .returning({ id: labTests.id, code: labTests.code });

    testMap.set(inserted.code, inserted.id);

    // Reference ranges
    for (const r of t.ranges) {
      await db.insert(labTestReferenceRanges).values({
        testId: inserted.id,
        gender: r.gender,
        ageMin: r.ageMin,
        ageMax: r.ageMax,
        lowValue: r.lowValue,
        highValue: r.highValue,
        criticalLow: r.criticalLow,
        criticalHigh: r.criticalHigh,
        textRange: r.textRange,
        remarks: r.remarks,
      });
    }
  }

  // 3. Panels & Join Table
  const panelsSeed = [
    {
      code: "CBC",
      name: "Complete Blood Count (CBC)",
      description: "Hemoglobin, TLC, Platelet Count, RBC, PCV and blood cell indices",
      price: "350.00",
      tests: ["HB", "TLC", "PLT", "RBC", "PCV"],
    },
    {
      code: "LFT",
      name: "Liver Function Test (LFT)",
      description: "Bilirubin Total/Direct, SGOT, SGPT, ALP, Total Protein, Albumin",
      price: "750.00",
      tests: ["BILI_T", "BILI_D", "SGOT", "SGPT", "ALP", "TP", "ALB"],
    },
    {
      code: "KFT",
      name: "Kidney Function Test / Renal Profile (KFT)",
      description: "Urea, Creatinine, Uric Acid, Sodium, Potassium",
      price: "650.00",
      tests: ["UREA", "CREAT", "URIC", "NA", "K"],
    },
    {
      code: "DIABETES_SCREEN",
      name: "Diabetic Profile",
      description: "Fasting Blood Sugar, PPBS, and HbA1c",
      price: "550.00",
      tests: ["FBS", "PPBS", "HBA1C"],
    },
  ];

  for (const p of panelsSeed) {
    const [panel] = await db
      .insert(labPanels)
      .values({
        code: p.code,
        name: p.name,
        description: p.description,
        price: p.price,
      })
      .onConflictDoUpdate({
        target: [labPanels.code],
        set: {
          name: p.name,
          description: p.description,
          price: p.price,
        },
      })
      .returning({ id: labPanels.id, code: labPanels.code });

    let sortOrder = 1;
    for (const testCode of p.tests) {
      const testId = testMap.get(testCode);
      if (testId) {
        await db.insert(labPanelTests).values({
          panelId: panel.id,
          testId,
          sortOrder: sortOrder++,
        });
      }
    }
  }

  console.log("✅ Lab master data successfully seeded.");
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  seedLabData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Failed to seed lab data:", err);
      process.exit(1);
    });
}
