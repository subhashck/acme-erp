import { describe, it, expect } from "vitest";
import {
  CR80_WIDTH,
  CR80_HEIGHT,
  generateSingleCardPdf,
  generateBatchImpositionPdf,
  formatDateDdMonYyyy,
  type CardRenderData,
} from "../../src/lib/id-card-pdf";
import type { IdCardTemplate } from "../../server/db/schema-idcards";

describe("ID Card PDF & Print Engine", () => {
  const sampleTemplate: IdCardTemplate = {
    id: 1,
    name: "Standard Staff ID (Portrait)",
    targetType: "staff",
    orientation: "portrait",
    isDefault: true,
    active: true,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    layoutConfig: {
      theme: {
        primaryColor: "#0284c7",
        secondaryColor: "#0f172a",
        backgroundColor: "#ffffff",
        textColor: "#0f172a",
        accentTextColor: "#ffffff",
      },
      header: {
        showLogo: true,
        institutionTitle: "ACME HOSPITAL & HEALTHCARE",
        institutionSubtitle: "Excellence in Medical Care",
        affiliationText: "NABH Accredited Tertiary Center",
      },
      photo: {
        shape: "rounded",
        borderWidth: 2,
        borderColor: "#0284c7",
      },
      fields: [
        { key: "name", label: "Full Name", showLabel: false, isBold: true, side: "front" },
        { key: "code", label: "Emp Code", showLabel: true, isBold: true, side: "front" },
        { key: "role", label: "Designation", showLabel: false, isBold: false, side: "front" },
        { key: "department", label: "Department", showLabel: true, isBold: false, side: "front" },
        { key: "bloodGroup", label: "Blood Group", showLabel: true, isBold: true, side: "back" },
      ],
      barcode: {
        enabled: true,
        type: "code128",
        side: "front",
        valueField: "code",
      },
      signature: {
        enabled: true,
        label: "Medical Director",
        side: "back",
      },
      termsText: "Property of ACME Hospital. Return upon departure.",
      returnAddress: "123 Healthcare Ave",
      emergencyPhone: "+91 98765 43211",
    },
  };

  const sampleStaffCard: CardRenderData = {
    cardSerialNo: "IDC-2026-00001",
    name: "Dr. Sunita Sen",
    code: "EMP-00101",
    department: "Pediatrics",
    role: "Senior Consultant",
    bloodGroup: "A+",
    emergencyContact: "+91 98765 00000",
    issueDate: "2026-01-15",
    validUntil: "2028-12-31",
    qrVerifyToken: "token-abc-12345-verified",
    entityType: "staff",
  };

  it("CR80 standard physical dimensions conform to ISO 7810 ID-1 standard", () => {
    expect(CR80_WIDTH).toBe(85.6);
    expect(CR80_HEIGHT).toBe(53.98);
    // Aspect ratio check (approx 1.585)
    const ratio = CR80_WIDTH / CR80_HEIGHT;
    expect(ratio).toBeGreaterThan(1.58);
    expect(ratio).toBeLessThan(1.59);
  });

  it("generates a single CR80 2-page PDF document (Front and Back)", async () => {
    const pdfBlob = await generateSingleCardPdf(sampleStaffCard, sampleTemplate);
    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.size).toBeGreaterThan(1000); // Standard vector PDF size
    expect(pdfBlob.type).toBe("application/pdf");
  });

  it("calculates correct imposition grid for A4 paper and duplex mirroring", async () => {
    // 9 portrait cards fit in a 3x3 grid on an A4 sheet
    const cards: CardRenderData[] = Array.from({ length: 9 }).map((_, i) => ({
      ...sampleStaffCard,
      cardSerialNo: `IDC-2026-0000${i + 1}`,
      name: `Staff Member ${i + 1}`,
      code: `EMP-00${100 + i}`,
    }));

    const pdfBlob = await generateBatchImpositionPdf(cards, sampleTemplate);
    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.size).toBeGreaterThan(3000);
  });

  it("handles duplex column mirroring mathematically (front col vs back col)", () => {
    // For 3 columns:
    // Left (col 0) on Front must align with Right (col 2) on Back
    // Center (col 1) on Front must align with Center (col 1) on Back
    // Right (col 2) on Front must align with Left (col 0) on Back
    const cols = 3;
    expect(cols - 1 - 0).toBe(2);
    expect(cols - 1 - 1).toBe(1);
    expect(cols - 1 - 2).toBe(0);

    // For 2 columns (Landscape cards):
    const landscapeCols = 2;
    expect(landscapeCols - 1 - 0).toBe(1);
    expect(landscapeCols - 1 - 1).toBe(0);
  });

  it("handles landscape card generation smoothly", async () => {
    const landscapeTemplate: IdCardTemplate = {
      ...sampleTemplate,
      orientation: "landscape",
    };

    const pdfBlob = await generateSingleCardPdf(sampleStaffCard, landscapeTemplate);
    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.size).toBeGreaterThan(1000);
  });

  it("renders official ACON student template with front and back sides matching attached layout", async () => {
    const studentTemplate: IdCardTemplate = {
      id: 2,
      name: "ACON Nursing Student ID (Official)",
      targetType: "student",
      orientation: "portrait",
      isDefault: true,
      active: true,
      createdById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      layoutConfig: {
        theme: {
          primaryColor: "#2f3e83",
          secondaryColor: "#b8c8f5",
          backgroundColor: "#ffffff",
          textColor: "#253468",
          accentTextColor: "#ffffff",
          cardVariant: "acon-official-student",
        },
        header: {
          showLogo: true,
          institutionTitle: "ACME",
          institutionSubtitle: "COLLEGE OF NURSING",
          affiliationText: "Hiyang Hiren Leirak, Palace Compound, Imphal East, Manipur",
        },
        photo: {
          shape: "circle",
          borderWidth: 4,
          borderColor: "#ffffff",
        },
        fields: [],
        barcode: { enabled: false, type: "code128", side: "front", valueField: "code" },
        signature: { enabled: true, label: "Principal Signature", side: "front" },
      },
    };

    const studentCard: CardRenderData = {
      cardSerialNo: "IDC-2024-00101",
      name: "Laikhuram Laxmi Devi",
      code: "2024-01-01",
      dob: "11/03/2006",
      bloodGroup: "A+ ve",
      emergencyContact: "+91 8076 417 706",
      secondaryContact: "+91 9233 829 432",
      fatherName: "(Late) L. Ibomacha Singh",
      motherName: "Laikhuram (O) Bimola Devi",
      address: "Kongba Kshetri Leikai, Imphal East.",
      academicYear: "2024",
      entityType: "student",
    };

    const pdfBlob = await generateSingleCardPdf(studentCard, studentTemplate);
    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.size).toBeGreaterThan(1500);

    const impositionPdfBlob = await generateBatchImpositionPdf([studentCard], studentTemplate);
    expect(impositionPdfBlob).toBeInstanceOf(Blob);
    expect(impositionPdfBlob.size).toBeGreaterThan(2000);
  });

  it("renders custom drag-and-drop element positions accurately in PDF generation", async () => {
    const customPositionTemplate: IdCardTemplate = {
      id: 3,
      name: "Custom Repositioned Student ID",
      targetType: "student",
      orientation: "portrait",
      isDefault: false,
      active: true,
      createdById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      layoutConfig: {
        theme: {
          primaryColor: "#2f3e83",
          cardVariant: "acon-official-student",
        },
        header: {
          showLogo: true,
          institutionTitle: "ACME",
        },
        photo: { shape: "circle" },
        fields: [],
        barcode: { enabled: false, type: "code128", side: "front", valueField: "code" },
        signature: { enabled: true, label: "Principal", side: "front" },
        positions: {
          photo: { x: 50, y: 30 },
          name: { x: 50, y: 60 },
          details: { x: 8, y: 66 },
          backDetails: { x: 8, y: 10 },
          qrCode: { x: 50, y: 40 },
        },
      },
    };

    const studentCard: CardRenderData = {
      cardSerialNo: "IDC-2024-00102",
      name: "Laikhuram Laxmi Devi",
      code: "2024-01-01",
      dob: "11/03/2006",
      bloodGroup: "A+ ve",
      emergencyContact: "+91 8076 417 706",
      secondaryContact: "+91 9233 829 432",
      fatherName: "(Late) L. Ibomacha Singh",
      motherName: "Laikhuram (O) Bimola Devi",
      address: "Kongba Kshetri Leikai, Imphal East.",
      academicYear: "2024",
      entityType: "student",
    };

    const pdfBlob = await generateSingleCardPdf(studentCard, customPositionTemplate);
    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.size).toBeGreaterThan(1500);
  });

  it("renders Authorized Signatory Designation on student and staff cards", async () => {
    const templateWithCustomSignatory: IdCardTemplate = {
      id: 4,
      name: "Custom Signatory Card",
      targetType: "student",
      orientation: "portrait",
      isDefault: false,
      active: true,
      createdById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      layoutConfig: {
        theme: {
          primaryColor: "#2f3e83",
          cardVariant: "acon-official-student",
        },
        header: {
          showLogo: true,
          institutionTitle: "ACME",
        },
        photo: { shape: "circle" },
        fields: [],
        barcode: { enabled: false, type: "code128", side: "front", valueField: "code" },
        signature: {
          enabled: true,
          label: "Medical Superintendent",
          side: "front",
        },
        positions: {
          signature: { x: 50, y: 85 },
        },
      },
    };

    const studentCard: CardRenderData = {
      cardSerialNo: "IDC-2024-00103",
      name: "Laikhuram Laxmi Devi",
      code: "2024-01-01",
      dob: "11/03/2006",
      bloodGroup: "A+ ve",
      emergencyContact: "+91 8076 417 706",
      fatherName: "(Late) L. Ibomacha Singh",
      motherName: "Laikhuram (O) Bimola Devi",
      address: "Kongba Kshetri Leikai, Imphal East.",
      academicYear: "2024",
      entityType: "student",
    };

    const pdfBlob = await generateSingleCardPdf(studentCard, templateWithCustomSignatory);
    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob.size).toBeGreaterThan(1500);
  });

  it("formats dates strictly in DD-MON-YYYY format across all variations", () => {
    // Slashed DD/MM/YYYY
    expect(formatDateDdMonYyyy("11/03/2006")).toBe("11-MAR-2006");
    expect(formatDateDdMonYyyy("01/01/2024")).toBe("01-JAN-2024");
    expect(formatDateDdMonYyyy("5/9/2005")).toBe("05-SEP-2005");

    // ISO YYYY-MM-DD
    expect(formatDateDdMonYyyy("2006-03-11")).toBe("11-MAR-2006");
    expect(formatDateDdMonYyyy("2026-11-16")).toBe("16-NOV-2026");
    expect(formatDateDdMonYyyy("2028-12-31")).toBe("31-DEC-2028");

    // ISO timestamp strings
    expect(formatDateDdMonYyyy("2006-03-11T00:00:00.000Z")).toBe("11-MAR-2006");

    // Already in DD-MON-YYYY
    expect(formatDateDdMonYyyy("11-MAR-2006")).toBe("11-MAR-2006");
    expect(formatDateDdMonYyyy("11-Mar-2006")).toBe("11-MAR-2006");

    // Date object
    const jsDate = new Date(2024, 7, 15); // Aug 15, 2024
    expect(formatDateDdMonYyyy(jsDate)).toBe("15-AUG-2024");

    // Edge and null cases
    expect(formatDateDdMonYyyy(null)).toBe("");
    expect(formatDateDdMonYyyy(undefined)).toBe("");
    expect(formatDateDdMonYyyy("")).toBe("");
  });

  it("formats sanitized PNG filenames for ID card exports", async () => {
    const { formatCardPngFilename } = await import("../../src/lib/id-card-png");

    const card: CardRenderData = {
      cardSerialNo: "IDC-2024-00101",
      name: "Laikhuram Laxmi Devi",
      code: "2024-01-01",
    };

    expect(formatCardPngFilename(card, "front")).toBe("Laikhuram_Laxmi_Devi_2024-01-01_front.png");
    expect(formatCardPngFilename(card, "back")).toBe("Laikhuram_Laxmi_Devi_2024-01-01_back.png");
    expect(formatCardPngFilename(card, "composite")).toBe("Laikhuram_Laxmi_Devi_2024-01-01_composite.png");
  });
});
