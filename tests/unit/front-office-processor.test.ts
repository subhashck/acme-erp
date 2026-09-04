import { describe, it, expect } from "vitest";
import {
  parseCompoundAmount,
  normalizeConsultationRows,
  normalizeProcedureRows,
  reconcileCompoundCollections,
  applyKnownConsultationOnlySplitRule,
  compilePatients,
  calculateKPIs,
  isTimeInShiftWindow,
  filterRowsByShift,
  calculateDenominationsTotal,
  calculateOnlinePayments,
} from "../../src/lib/front-office-processor";
import { generateFrontOfficePDF } from "../../src/lib/front-office-export";
import {
  parseDocterzCsvResponse,
  parseRawHeadersOrCurl,
  DEFAULT_DOCTERZ_CONFIG,
} from "../../server/services/docterz";

describe("Front Office Processor Engine", () => {
  it("should parse compound amount string correctly", () => {
    const raw = "5620 (Cash: 500, Online Payment: 5120)";
    const parsed = parseCompoundAmount(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.total).toBe(5620);
    expect(parsed?.parts).toHaveLength(2);
    expect(parsed?.parts[0]).toEqual({ mode: "Cash", amount: 500 });
    expect(parsed?.parts[1]).toEqual({ mode: "Online Payment", amount: 5120 });
  });

  it("should reconcile duplicate invoice collections and attribute consultation share", () => {
    const consultationRows = normalizeConsultationRows([
      {
        "Patient Name": "Jane Doe",
        "Patient UID": "UID-001",
        "Purpose Of Visit": "Follow-up",
        "Total Revenue Billed": "500",
        "Amount collected": "0",
        "Total Revenue Billed Pending Dues": "500",
      },
    ]);

    const labRows = normalizeProcedureRows([
      {
        "Patient Name": "Jane Doe",
        "Patient UID": "UID-001",
        "Procedure Name": "CBC Test",
        "Total Revenue Billed": "2500",
        "Amount collected": "5620 (Cash: 500, Online Payment: 5120)",
        "Total Revenue Billed Pending Dues": "0",
      },
      {
        "Patient Name": "Jane Doe",
        "Patient UID": "UID-001",
        "Procedure Name": "Lipid Profile",
        "Total Revenue Billed": "2620",
        "Amount collected": "5620 (Cash: 500, Online Payment: 5120)",
        "Total Revenue Billed Pending Dues": "0",
      },
    ]);

    reconcileCompoundCollections(consultationRows, labRows);

    // One lab row should hold the ₹5120 share, the other ₹0
    const totalLabCollected = labRows.reduce((s, r) => s + r.collected, 0);
    expect(totalLabCollected).toBe(5120);

    // The consultation row should have received its ₹500 share
    expect(consultationRows[0].collected).toBe(500);
    expect(consultationRows[0].paymentMode).toBe("Cash");
  });

  it("should apply known ₹600 consultation-only split rule", () => {
    const consultationRows = normalizeConsultationRows([
      {
        "Patient Name": "John Smith",
        "Patient UID": "UID-002",
        "Purpose Of Visit": "Consultation",
        "Total Revenue Billed": "600",
        "Amount collected": "600",
        "Total Revenue Billed Pending Dues": "0",
        "Mode Of Payment": "Split Payment",
      },
    ]);

    applyKnownConsultationOnlySplitRule(consultationRows, []);

    expect(consultationRows[0].knownSplit).toEqual([
      { mode: "Patient APP", amount: 500 },
      { mode: "Cash", amount: 100 },
    ]);
    expect(consultationRows[0].paymentMode).toBe("Patient APP, Cash");
    expect(consultationRows[0].remarks).toBeDefined();
    expect(consultationRows[0].remarks?.length).toBeGreaterThan(0);
  });

  it("should compile patients and roll up totals by UID", () => {
    const consultationRows = normalizeConsultationRows([
      {
        "Patient Name": "Alice",
        "Patient UID": "UID-A",
        "Purpose Of Visit": "Consultation",
        "Total Revenue Billed": "600",
        "Amount collected": "600",
        "Total Revenue Billed Pending Dues": "0",
      },
    ]);

    const labRows = normalizeProcedureRows([
      {
        "Patient Name": "Alice",
        "Patient UID": "UID-A",
        "Procedure Name": "Ultrasound",
        "Total Revenue Billed": "1200",
        "Amount collected": "1200",
        "Total Revenue Billed Pending Dues": "0",
      },
    ]);

    const compiled = compilePatients(consultationRows, labRows);
    expect(compiled).toHaveLength(1);
    expect(compiled[0].patientUid).toBe("UID-A");
    expect(compiled[0].consultations).toHaveLength(1);
    expect(compiled[0].procedures).toHaveLength(1);
    expect(compiled[0].totalBill).toBe(1800);
    expect(compiled[0].totalCollected).toBe(1800);

    const kpis = calculateKPIs([...consultationRows, ...labRows]);
    expect(kpis.totalPatients).toBe(1);
    expect(kpis.totalBill).toBe(1800);
    expect(kpis.totalCollected).toBe(1800);
    expect(kpis.realizationRate).toBe(100);
  });

  it("should sort compiled patients chronologically by consultation timing", () => {
    const consultationRows = normalizeConsultationRows([
      {
        "Patient Name": "Zack Afternoon",
        "Patient UID": "UID-Z",
        "Consultation Date": "01-09-2026 02:30 PM",
        "Purpose Of Visit": "Consultation",
        "Total Revenue Billed": "600",
        "Amount collected": "600",
        "Total Revenue Billed Pending Dues": "0",
        "Sr No": 3,
      },
      {
        "Patient Name": "Alice Late Morning",
        "Patient UID": "UID-A",
        "Consultation Date": "01-09-2026 11:15 AM",
        "Purpose Of Visit": "Follow-up",
        "Total Revenue Billed": "500",
        "Amount collected": "500",
        "Total Revenue Billed Pending Dues": "0",
        "Sr No": 2,
      },
      {
        "Patient Name": "Mary Early Morning",
        "Patient UID": "UID-M",
        "Consultation Date": "01-09-2026 09:15 AM",
        "Purpose Of Visit": "Consultation",
        "Total Revenue Billed": "700",
        "Amount collected": "700",
        "Total Revenue Billed Pending Dues": "0",
        "Sr No": 1,
      },
    ]);

    const labRows = normalizeProcedureRows([
      {
        "Patient Name": "Lab Only Patient",
        "Patient UID": "UID-LAB",
        "Date": "01-09-2026 10:00 AM",
        "Procedure Name": "CBC Test",
        "Total Revenue Billed": "800",
        "Amount collected": "800",
        "Total Revenue Billed Pending Dues": "0",
        "Sr No": 4,
      },
    ]);

    const compiled = compilePatients(consultationRows, labRows);
    expect(compiled).toHaveLength(4);

    // 1st should be Mary (09:15 AM)
    expect(compiled[0].patientName).toBe("Mary Early Morning");
    expect(compiled[0].patientUid).toBe("UID-M");

    // 2nd should be Alice (11:15 AM)
    expect(compiled[1].patientName).toBe("Alice Late Morning");
    expect(compiled[1].patientUid).toBe("UID-A");

    // 3rd should be Zack (02:30 PM)
    expect(compiled[2].patientName).toBe("Zack Afternoon");
    expect(compiled[2].patientUid).toBe("UID-Z");

    // 4th should be Lab-only patient (placed after consultation visits)
    expect(compiled[3].patientName).toBe("Lab Only Patient");
    expect(compiled[3].patientUid).toBe("UID-LAB");
  });

  describe("Shift Window & Transaction Time Filtering", () => {
    it("should correctly identify Morning Shift boundaries (00:00 - 12:00)", () => {
      const d1 = new Date(2026, 8, 3, 9, 30); // 09:30 AM
      const d2 = new Date(2026, 8, 3, 11, 59); // 11:59 AM
      const d3 = new Date(2026, 8, 3, 12, 0); // 12:00 PM (starts Afternoon)

      expect(isTimeInShiftWindow(d1, "00:00", "12:00")).toBe(true);
      expect(isTimeInShiftWindow(d2, "00:00", "12:00")).toBe(true);
      expect(isTimeInShiftWindow(d3, "00:00", "12:00")).toBe(false);
    });

    it("should correctly identify Afternoon Shift boundaries (12:00 - 16:30)", () => {
      const d1 = new Date(2026, 8, 3, 12, 0); // 12:00 PM
      const d2 = new Date(2026, 8, 3, 15, 45); // 03:45 PM
      const d3 = new Date(2026, 8, 3, 16, 30); // 04:30 PM (starts Night)

      expect(isTimeInShiftWindow(d1, "12:00", "16:30")).toBe(true);
      expect(isTimeInShiftWindow(d2, "12:00", "16:30")).toBe(true);
      expect(isTimeInShiftWindow(d3, "12:00", "16:30")).toBe(false);
    });

    it("should correctly identify Night Shift boundaries (16:30 - 23:59)", () => {
      const d1 = new Date(2026, 8, 3, 16, 30); // 04:30 PM
      const d2 = new Date(2026, 8, 3, 21, 15); // 09:15 PM
      const d3 = new Date(2026, 8, 3, 23, 59); // 11:59 PM
      const d4 = new Date(2026, 8, 3, 10, 0); // 10:00 AM (Morning)

      expect(isTimeInShiftWindow(d1, "16:30", "23:59")).toBe(true);
      expect(isTimeInShiftWindow(d2, "16:30", "23:59")).toBe(true);
      expect(isTimeInShiftWindow(d3, "16:30", "23:59")).toBe(true);
      expect(isTimeInShiftWindow(d4, "16:30", "23:59")).toBe(false);
    });

    it("should filter rows by shift window correctly", () => {
      const rows = [
        {
          patientName: "Morning Patient",
          dateText: "03-09-2026 10:15 AM",
          dateObj: new Date(2026, 8, 3, 10, 15),
        },
        {
          patientName: "Afternoon Patient",
          dateText: "03-09-2026 02:30 PM",
          dateObj: new Date(2026, 8, 3, 14, 30),
        },
        {
          patientName: "Night Patient",
          dateText: "03-09-2026 07:45 PM",
          dateObj: new Date(2026, 8, 3, 19, 45),
        },
        {
          patientName: "No Time Row",
          dateText: "03-09-2026",
          dateObj: null,
        },
      ];

      const morning = filterRowsByShift(rows, "00:00", "12:00");
      expect(morning.map((r) => r.patientName)).toContain("Morning Patient");
      expect(morning.map((r) => r.patientName)).not.toContain("Afternoon Patient");
      expect(morning.map((r) => r.patientName)).not.toContain("Night Patient");
      // Row with null date is safely preserved
      expect(morning.map((r) => r.patientName)).toContain("No Time Row");

      const afternoon = filterRowsByShift(rows, "12:00", "16:30");
      expect(afternoon.map((r) => r.patientName)).toContain("Afternoon Patient");
      expect(afternoon.map((r) => r.patientName)).not.toContain("Morning Patient");
      expect(afternoon.map((r) => r.patientName)).not.toContain("Night Patient");

      const night = filterRowsByShift(rows, "16:30", "23:59");
      expect(night.map((r) => r.patientName)).toContain("Night Patient");
      expect(night.map((r) => r.patientName)).not.toContain("Morning Patient");
      expect(night.map((r) => r.patientName)).not.toContain("Afternoon Patient");
    });
  });

  describe("Docterz API Response Parser", () => {
    it("should transform Docterz array-of-arrays CSV structure into record objects", () => {
      const mockApiResponse = {
        data: [
          ["Sr No", "Patient Name", "Patient UID", "Consultation Date", "Doctor", "Bill Amount", "Amount collected", "Mode Of Payment"],
          ["Acme Fertility & HealthCare Centre"],
          [1, "Amita Nameirakpam", "YQQPI80347", "01-09-2026 02:15 PM", "James Elangbam", 700.0, "1200", "Cash "],
          [2, "Kalpana Thokchom", "RNZIW82307", "01-09-2026 02:10 PM", "James Elangbam", 1600.0, "1600", "Online Payment"],
          ["", "Total", "", "", "", 2300.0, 2800.0, ""],
          [],
          ["Mode of Payment Collection Details"]
        ]
      };

      const parsed = parseDocterzCsvResponse(mockApiResponse);
      expect(parsed).toHaveLength(2);
      expect(parsed[0]["Patient Name"]).toBe("Amita Nameirakpam");
      expect(parsed[0]["Patient UID"]).toBe("YQQPI80347");
      expect(parsed[0]["Bill Amount"]).toBe(700.0);
      expect(parsed[0]["Amount collected"]).toBe("1200");
      expect(parsed[0]["Mode Of Payment"]).toBe("Cash ");

      expect(parsed[1]["Patient Name"]).toBe("Kalpana Thokchom");
      expect(parsed[1]["Patient UID"]).toBe("RNZIW82307");
    });

    it("should reconcile multi-item invoices where single payment is repeated on consultation and procedure rows", () => {
      const consRows = normalizeConsultationRows([
        {
          "Patient Name": "Khuraijam Joylata Devi",
          "Patient UID": "WAMSV12934",
          "Invoice No.": "1747",
          "Bill Amount": "600",
          "Amount collected": "1300",
          "Mode Of Payment": "Cash ",
        },
      ]);

      const radRows = normalizeProcedureRows([
        {
          "Patient Name": "Khuraijam Joylata Devi",
          "Patient UID": "WAMSV12934",
          "Invoice No.": "1747",
          "Procedure Name": "TVS GYNAE",
          "Bill Amount": "700",
          "Amount collected": "1300",
          "Mode Of Payment": "Cash ",
        },
      ]);

      reconcileCompoundCollections(consRows, radRows);

      expect(consRows[0].collected).toBe(600);
      expect(radRows[0].collected).toBe(700);

      const patients = compilePatients(consRows, radRows);
      expect(patients[0].totalBill).toBe(1300);
      expect(patients[0].totalCollected).toBe(1300);
      expect(patients[0].totalPending).toBe(0);
    });
  });

  describe("Shift Handover & Currency Denominations", () => {
    it("should calculate currency note totals and summary accurately", () => {
      const denoms = {
        500: 10, // 5,000
        200: 5,  // 1,000
        100: 8,  // 800
        50: 4,   // 200
        20: 5,   // 100
        10: 10,  // 100
      };

      const result = calculateDenominationsTotal(denoms);
      expect(result.totalCount).toBe(42);
      expect(result.totalAmount).toBe(7200);
      expect(result.breakdown).toHaveLength(6);
      expect(result.breakdown[0]).toEqual({ note: 500, count: 10, total: 5000 });
      expect(result.breakdown[1]).toEqual({ note: 200, count: 5, total: 1000 });
    });

    it("should handle empty or zero denominations safely", () => {
      const result = calculateDenominationsTotal({});
      expect(result.totalCount).toBe(0);
      expect(result.totalAmount).toBe(0);
    });

    it("should correctly fetch online payments via app, card, or upi", () => {
      const rows = normalizeConsultationRows([
        {
          "Patient Name": "Patient 1",
          "Patient UID": "UID-001",
          "Total Revenue Billed": "500",
          "Amount collected": "500",
          "Mode Of Payment": "UPI",
        },
        {
          "Patient Name": "Patient 2",
          "Patient UID": "UID-002",
          "Total Revenue Billed": "1000",
          "Amount collected": "1000",
          "Mode Of Payment": "GPay",
        },
        {
          "Patient Name": "Patient 3",
          "Patient UID": "UID-003",
          "Total Revenue Billed": "2000",
          "Amount collected": "2000",
          "Mode Of Payment": "Credit Card",
        },
        {
          "Patient Name": "Patient 4",
          "Patient UID": "UID-004",
          "Total Revenue Billed": "800",
          "Amount collected": "800",
          "Mode Of Payment": "POS Machine",
        },
        {
          "Patient Name": "Patient 5",
          "Patient UID": "UID-005",
          "Total Revenue Billed": "600",
          "Amount collected": "600",
          "Mode Of Payment": "Patient APP",
        },
        {
          "Patient Name": "Patient 6",
          "Patient UID": "UID-006",
          "Total Revenue Billed": "1200",
          "Amount collected": "1200",
          "Mode Of Payment": "Cash",
        },
        {
          "Patient Name": "Patient 7",
          "Patient UID": "UID-007",
          "Total Revenue Billed": "2500",
          "Amount collected": "2500 (Cash: 500, UPI: 1000, Card: 1000)",
          "Mode Of Payment": "Split Payment",
        },
      ]);

      const online = calculateOnlinePayments(rows);
      // UPI: 500 (UID-001) + 1000 (UID-002) + 1000 (UID-007 split) = 2500
      expect(online.upi).toBe(2500);
      // Card: 2000 (UID-003) + 800 (UID-004) + 1000 (UID-007 split) = 3800
      expect(online.card).toBe(3800);
      // App: 600 (UID-005) = 600
      expect(online.app).toBe(600);
      // Cash: 1200 (UID-006) + 500 (UID-007) is excluded from online payments
      expect(online.total).toBe(2500 + 3800 + 600);
    });
  });

  describe("Front Office PDF Generation", () => {
    it("should generate PDF in portrait mode with Handover Sheet as Sheet 2 and Patient Directory as Sheet 3", () => {
      const mockData = {
        reportDate: "2026-09-04",
        shiftLabel: "Morning Shift",
        preparedBy: "Front Desk Staff",
        kpis: {
          totalPatients: 2,
          totalBill: 2500,
          totalCollected: 2500,
          totalPending: 0,
          totalDiscount: 0,
          realizationRate: 100,
          patientMixText: "2 Cons / 0 Lab",
          consultationCount: 2,
          serviceCount: 0,
        },
        revenueCategories: [
          { label: "Consultation", count: 2, billAmount: 2500, discount: 0, collected: 2500, pending: 0 },
        ],
        itemsBilled: [
          { name: "General Consultation", count: 2, amount: 2500 },
        ],
        patients: [
          {
            patientUid: "UID-001",
            patientName: "Patient One",
            consultations: [],
            procedures: [],
            totalBill: 1500,
            totalCollected: 1500,
            totalPending: 0,
            totalDiscount: 0,
          },
          {
            patientUid: "UID-002",
            patientName: "Patient Two",
            consultations: [],
            procedures: [],
            totalBill: 1000,
            totalCollected: 1000,
            totalPending: 0,
            totalDiscount: 0,
          },
        ],
        expenses: [
          { id: "e1", category: "Stationery", description: "Paper clips", amount: 150, paymentMode: "Cash" },
        ],
        admissions: [
          { id: "a1", patientName: "Admitted Patient", amount: 10000, remark: "Advance" },
        ],
        discharges: [
          { id: "d1", patientName: "Discharged Patient", amount: 5000, remark: "Final Settlement" },
        ],
        cashDenominations: {
          500: 20,
          200: 5,
        },
        handoverSummary: {
          grandTotal: 17500,
          expenditure: 150,
          cardSale: 0,
          advanceHandover: 0,
          cashToHandover: 17350,
        },
        signatures: {
          handedOverBy: "Staff A",
          receivedBy: "Staff B",
          remarks: "All reconciled",
        },
      };

      const doc = generateFrontOfficePDF(mockData as any);
      expect(doc).toBeDefined();

      // Verify portrait dimensions (A4 portrait: width 210mm, height 297mm)
      const width = Math.round(doc.internal.pageSize.getWidth());
      const height = Math.round(doc.internal.pageSize.getHeight());
      expect(width).toBe(210);
      expect(height).toBe(297);

      // Verify at least 3 pages exist:
      // Page 1: Executive Summary
      // Page 2: Shift Handover Sheet
      // Page 3: Patient Visit Directory
      const totalPages = doc.getNumberOfPages();
      expect(totalPages).toBeGreaterThanOrEqual(3);
    });

    it("should render complete listing of all procedure & laboratory items without 8-item restriction", () => {
      // Create 20 items to verify complete listing is handled
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        name: `Procedure Test Item ${i + 1}`,
        count: i + 1,
        amount: (i + 1) * 500,
      }));

      const mockData = {
        reportDate: "2026-09-04",
        shiftLabel: "Full Day",
        preparedBy: "Staff Member",
        kpis: {
          totalPatients: 10,
          totalBill: 105000,
          totalCollected: 105000,
          totalPending: 0,
          totalDiscount: 0,
          realizationRate: 100,
          patientMixText: "10 Cons / 20 Proc",
          consultationCount: 10,
          serviceCount: 20,
        },
        revenueCategories: [
          { key: "procedure", label: "Procedures & Surgeries", count: 20, billAmount: 105000, discount: 0, collected: 105000, pending: 0 },
        ],
        itemsBilled: manyItems,
        patients: [],
        expenses: [
          { id: "e1", category: "Tea/Snacks", description: "Refreshment", amount: 200, paymentMode: "Cash" },
        ],
        admissions: [],
        discharges: [],
        cashDenominations: {},
        handoverSummary: {
          grandTotal: 105000,
          expenditure: 200,
          onlinePayments: 0,
          cashToHandover: 104800,
        },
      };

      const doc = generateFrontOfficePDF(mockData as any);
      expect(doc).toBeDefined();
      expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Front Office Report Versioning Contract", () => {
    it("should compute next version and ensure latest version is marked active", () => {
      interface MockReportRecord {
        id: number;
        reportDate: string;
        shiftLabel: string;
        version: number;
        isActive: boolean;
      }

      const records: MockReportRecord[] = [];

      const saveVersion = (reportDate: string, shiftLabel: string): MockReportRecord => {
        const existing = records.filter(
          (r) => r.reportDate === reportDate && r.shiftLabel === shiftLabel
        );
        const maxVersion = existing.length > 0 ? Math.max(...existing.map((r) => r.version)) : 0;
        const nextVersion = maxVersion + 1;

        // Deactivate previous versions
        existing.forEach((r) => {
          r.isActive = false;
        });

        const newRecord: MockReportRecord = {
          id: records.length + 1,
          reportDate,
          shiftLabel,
          version: nextVersion,
          isActive: true,
        };
        records.push(newRecord);
        return newRecord;
      };

      // Version 1
      const v1 = saveVersion("2026-09-04", "Morning Shift");
      expect(v1.version).toBe(1);
      expect(v1.isActive).toBe(true);

      // Version 2 for same date + shift
      const v2 = saveVersion("2026-09-04", "Morning Shift");
      expect(v2.version).toBe(2);
      expect(v2.isActive).toBe(true);
      expect(v1.isActive).toBe(false);

      // Version 3 for same date + shift
      const v3 = saveVersion("2026-09-04", "Morning Shift");
      expect(v3.version).toBe(3);
      expect(v3.isActive).toBe(true);
      expect(v2.isActive).toBe(false);
      expect(v1.isActive).toBe(false);

      // Distinct shift should start independently at version 1
      const eveningV1 = saveVersion("2026-09-04", "Night Shift");
      expect(eveningV1.version).toBe(1);
      expect(eveningV1.isActive).toBe(true);
      expect(v3.isActive).toBe(true);

      // Exactly one active report for Morning Shift
      const activeMorning = records.filter(
        (r) => r.reportDate === "2026-09-04" && r.shiftLabel === "Morning Shift" && r.isActive
      );
      expect(activeMorning).toHaveLength(1);
      expect(activeMorning[0].version).toBe(3);
    });
  });

  describe("Front Office Reports Server-Side Pagination Contract", () => {
    interface MockReport {
      id: number;
      reportDate: string;
      shiftLabel: string;
      createdByName: string;
      consultationFileName: string;
      isActive: boolean;
    }

    const mockReports: MockReport[] = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      reportDate: `2026-09-${String(i + 1).padStart(2, "0")}`,
      shiftLabel: i % 2 === 0 ? "Morning Shift" : "Night Shift",
      createdByName: i % 3 === 0 ? "Dr. Sharma" : "Nurse Priya",
      consultationFileName: `consultation_batch_${i + 1}.csv`,
      isActive: i < 20, // 20 active, 5 superseded
    }));

    const paginateReports = (
      reports: MockReport[],
      query: { page?: number; pageSize?: number; search?: string; all?: boolean }
    ) => {
      let filtered = query.all ? reports : reports.filter((r) => r.isActive);

      if (query.search) {
        const s = query.search.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.reportDate.toLowerCase().includes(s) ||
            r.shiftLabel.toLowerCase().includes(s) ||
            r.createdByName.toLowerCase().includes(s) ||
            r.consultationFileName.toLowerCase().includes(s)
        );
      }

      const isPaginated = query.page !== undefined;
      const page = Math.max(1, query.page || 1);
      const pageSize = Math.min(Math.max(1, query.pageSize || 10), 100);

      if (!isPaginated) {
        return filtered;
      }

      const totalRecords = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
      const offset = (page - 1) * pageSize;
      const data = filtered.slice(offset, offset + pageSize);

      return {
        data,
        pagination: {
          page,
          pageSize,
          totalRecords,
          totalPages,
        },
      };
    };

    it("should calculate page metadata correctly for page 1 with default page size 10", () => {
      const res = paginateReports(mockReports, { page: 1, pageSize: 10 }) as any;
      expect(res.data).toHaveLength(10);
      expect(res.pagination.page).toBe(1);
      expect(res.pagination.pageSize).toBe(10);
      expect(res.pagination.totalRecords).toBe(20); // Only active reports by default
      expect(res.pagination.totalPages).toBe(2);
    });

    it("should paginate correctly onto page 2 and page 3 when showing all versions", () => {
      const page2 = paginateReports(mockReports, { page: 2, pageSize: 10, all: true }) as any;
      expect(page2.data).toHaveLength(10);
      expect(page2.pagination.page).toBe(2);
      expect(page2.pagination.totalRecords).toBe(25);
      expect(page2.pagination.totalPages).toBe(3);

      const page3 = paginateReports(mockReports, { page: 3, pageSize: 10, all: true }) as any;
      expect(page3.data).toHaveLength(5);
      expect(page3.pagination.page).toBe(3);
    });

    it("should filter reports by search query across date, shift, staff, and file names", () => {
      const res = paginateReports(mockReports, { page: 1, pageSize: 10, search: "Night Shift" }) as any;
      expect(res.data.every((r: MockReport) => r.shiftLabel === "Night Shift")).toBe(true);
      expect(res.pagination.totalRecords).toBe(10); // 10 active Night Shifts
    });

    it("should return backward-compatible array when page is not specified", () => {
      const res = paginateReports(mockReports, { all: true });
      expect(Array.isArray(res)).toBe(true);
      expect((res as MockReport[]).length).toBe(25);
    });

    it("should handle empty dataset gracefully with totalPages 1 and 0 records", () => {
      const res = paginateReports([], { page: 1, pageSize: 10 }) as any;
      expect(res.data).toHaveLength(0);
      expect(res.pagination.totalRecords).toBe(0);
      expect(res.pagination.totalPages).toBe(1);
    });
  });

  describe("Docterz API Headers Configuration & Parsing Engine", () => {
    it("should provide default fallback configuration with clinic and doctor IDs", () => {
      expect(DEFAULT_DOCTERZ_CONFIG.authorization).toBeDefined();
      expect(DEFAULT_DOCTERZ_CONFIG.apiKey).toBeDefined();
      expect(DEFAULT_DOCTERZ_CONFIG.appKey).toBe("79ca90b3");
      expect(DEFAULT_DOCTERZ_CONFIG.clinicId).toBe("5760");
      expect(DEFAULT_DOCTERZ_CONFIG.doctorIds).toContain("11299");
      expect(DEFAULT_DOCTERZ_CONFIG.baseUrl).toContain("api.docterz.in");
    });

    it("should extract authorization, x-api-key, and x-app-key from raw headers text", () => {
      const rawText = `
        accept: text/csv
        authorization: test-token-123456
        x-api-key: eyJhbGciOiJIUzI1NiJ9.test-jwt-payload
        x-app-key: 79ca90b3
        Referer: https://web.docterz.in/
      `;
      const parsed = parseRawHeadersOrCurl(rawText);
      expect(parsed.authorization).toBe("test-token-123456");
      expect(parsed.apiKey).toBe("eyJhbGciOiJIUzI1NiJ9.test-jwt-payload");
      expect(parsed.appKey).toBe("79ca90b3");
      expect(parsed.referer).toBe("https://web.docterz.in/");
    });

    it("should extract parameters from DevTools cURL command", () => {
      const curlCommand = `
        curl 'https://api.docterz.in/admin/reports/clinic/consultation_report?clinic_id=5760&doctor_ids=%5B11299%5D' \\
          -H 'authorization: my-curl-auth-token' \\
          -H 'x-api-key: my-curl-api-key' \\
          -H 'x-app-key: 79ca90b3' \\
          -H 'Referer: https://web.docterz.in/'
      `;
      const parsed = parseRawHeadersOrCurl(curlCommand);
      expect(parsed.authorization).toBe("my-curl-auth-token");
      expect(parsed.apiKey).toBe("my-curl-api-key");
      expect(parsed.appKey).toBe("79ca90b3");
      expect(parsed.clinicId).toBe("5760");
      expect(parsed.doctorIds).toBe("[11299]");
    });

    it("should handle empty or malformed strings safely without throwing", () => {
      expect(parseRawHeadersOrCurl("")).toEqual({});
      expect(parseRawHeadersOrCurl("random garbage with no colon")).toEqual({});
      expect(parseRawHeadersOrCurl(null as any)).toEqual({});
    });
  });
});


