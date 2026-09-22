import { describe, it, expect, vi } from "vitest";
import { createDailyRevenueStatementSheet, exportClosingToExcel } from "../../src/lib/closing-export";
// @ts-ignore
import XLSX from "xlsx-js-style";

describe("Closing Export - Daily Revenue Statement Sheet", () => {
  const mockReport = {
    id: 1,
    reportDate: "2026-08-23",
    status: "submitted",
    openingBalance: "10000",
    cashReceipts: "150000",
    bankReceiptsTotal: "85000",
    closingBalance: "25000",
    serviceLines: [
      {
        serviceId: 1,
        serviceName: "Dental OPD Consultation",
        department: "DENTAL",
        rate: "500",
        quantity: 2,
        amount: "1000",
        isNightEntry: false,
      },
      {
        serviceId: 2,
        serviceName: "OPD Consultation",
        department: "OPD",
        rate: "600",
        quantity: 10,
        amount: "6000",
        isNightEntry: false,
      },
      {
        serviceId: 3,
        serviceName: "Injection Administration",
        department: "OPD-INJECTION",
        rate: "100",
        quantity: 5,
        amount: "500",
        isNightEntry: false,
      },
      {
        serviceId: 4,
        serviceName: "AGNY Card Registration",
        department: "MINOR_INCOME",
        rate: "300",
        quantity: 1,
        amount: "300",
        isNightEntry: false,
      },
      {
        serviceId: 5,
        serviceName: "LIFECELL Prenatal Test",
        department: "OUTSOURCING",
        rate: "4000",
        quantity: 1,
        amount: "4000",
        isNightEntry: false,
      },
    ],
    pharmacyIncome: {
      acmeNewTotal: "25000",
      parking: "450",
      coffeeShop: "780",
      canteenIncome: "1200",
      creditCardChargesNight: "150",
    },
    ipdAdmissions: [{ patientName: "John Doe", type: "ADMISSION", amount: "15000" }],
    ipdDischarges: [{ patientName: "Jane Smith", amount: "5000" }],
    additionalIncome: [{ label: "Misc Sale", amount: "200" }],
    discountsReturns: [],
    paymentChannels: [
      {
        bank: "ICICI",
        channel: "CARD",
        sourceLabel: "Front OPD Card",
        amount: "2000",
      },
      {
        bank: "ICICI",
        channel: "UPI",
        sourceLabel: "Front OPD UPI",
        amount: "3000",
      },
      {
        bank: "HDFC",
        channel: "UPI",
        sourceLabel: "Pharmacy UPI",
        amount: "15000",
      },
    ],
    expenditures: [],
    staffAdvances: [],
  };

  it("should generate Daily Revenue Statement sheet with correct structure and headers", () => {
    const ws = createDailyRevenueStatementSheet(mockReport);

    // Title
    expect(ws["B1"]?.v).toBe("Daily Revenue Statement for month of Aug'2026");

    // Dated
    expect(ws["A2"]?.v).toBe("Dated");
    expect(ws["B2"]?.v).toContain("23");
    expect(ws["B2"]?.v).toContain("08");
    expect(ws["B2"]?.v).toContain("2026");

    // Table Headers
    expect(ws["A4"]?.v).toBe("A");
    expect(ws["B4"]?.v).toBe("Major Income Head");
    expect(ws["C4"]?.v).toBe("Cash");
    expect(ws["D4"]?.v).toBe("Card ( ICICI )");
    expect(ws["E4"]?.v).toBe("UPI ( ICICI )");
    expect(ws["F4"]?.v).toBe("Razorpay (Online )");
    expect(ws["G4"]?.v).toBe("Card ( HDFC )");
    expect(ws["H4"]?.v).toBe("UPI ( HDFC )");
    expect(ws["I4"]?.v).toBe("Total Amt. Rs.");
    expect(ws["J4"]?.v).toBe("Remarks");

    // Section A data rows (5 to 12)
    expect(ws["B5"]?.v).toBe("Income from Dental");
    expect(ws["I5"]?.v).toBe(1000); // 1000 total from Dental
    expect(ws["I5"]?.f).toBe("SUM(C5:H5)");

    expect(ws["B6"]?.v).toBe("Income from Dispensary ( Pharma)");
    expect(ws["H6"]?.v).toBe(15000); // HDFC UPI mapped to Pharmacy

    expect(ws["B7"]?.v).toBe("Income from Immunisation ( NICU )");
    expect(ws["B8"]?.v).toBe("Income from Injection");
    expect(ws["B9"]?.v).toBe("Income from IPD");
    expect(ws["I9"]?.v).toBe(20000); // 15000 adm + 5000 dis

    expect(ws["B10"]?.v).toBe("Income from IVF");

    expect(ws["B11"]?.v).toBe("Income from OPD");
    expect(ws["D11"]?.v).toBe(2000); // ICICI Card OPD
    expect(ws["E11"]?.v).toBe(3000); // ICICI UPI OPD
    expect(ws["C11"]?.v).toBe(1000); // 6000 total - 5000 non-cash = 1000 cash

    expect(ws["B12"]?.v).toBe("Income from SATYAM LAB");

    // Section B (rows 13 to 16)
    expect(ws["A13"]?.v).toBe("B");
    expect(ws["B13"]?.v).toBe("Minor Income Head");
    expect(ws["B14"]?.v).toBe("Income from AGNY Health Card ( Other Income )");
    expect(ws["I14"]?.v).toBe(300);

    expect(ws["B15"]?.v).toBe("Income from Parking (Income)");
    expect(ws["I15"]?.v).toBe(450);

    expect(ws["B16"]?.v).toBe("Income from Priviledge Card ( Other Income )");

    // Section C (rows 17 to 20)
    expect(ws["A17"]?.v).toBe("C");
    expect(ws["B17"]?.v).toBe("Outsource Income Head");
    expect(ws["B18"]?.v).toBe("Income from Escent Diagnostic (Other Income)");
    expect(ws["B19"]?.v).toBe("Income from Life Cell (Other Income)");
    expect(ws["I19"]?.v).toBe(4000);

    expect(ws["B20"]?.v).toBe("Income from NAOKON DIAGNOSTIC (Other Income )");

    // Section D (rows 21 to 25)
    expect(ws["A21"]?.v).toBe("D");
    expect(ws["B21"]?.v).toBe("Misc Income");
    expect(ws["B22"]?.v).toBe("Credit Card Surcharge");
    expect(ws["I22"]?.v).toBe(150);

    expect(ws["B23"]?.v).toBe("Coffee Shop Income");
    expect(ws["I23"]?.v).toBe(780);

    expect(ws["B24"]?.v).toBe("Canteen Income");
    expect(ws["I24"]?.v).toBe(1200);

    expect(ws["B25"]?.v).toBe("Other Income");
    expect(ws["I25"]?.v).toBe(200);

    // Row 26: Grand Total
    expect(ws["B26"]?.v).toBe("Grand Total ( Amount Rs. )");
    expect(ws["C26"]?.f).toBe("SUM(C5:C25)");
    expect(ws["D26"]?.f).toBe("SUM(D5:D25)");
    expect(ws["E26"]?.f).toBe("SUM(E5:E25)");
    expect(ws["F26"]?.f).toBe("SUM(F5:F25)");
    expect(ws["G26"]?.f).toBe("SUM(G5:G25)");
    expect(ws["H26"]?.f).toBe("SUM(H5:H25)");
    expect(ws["I26"]?.f).toBe("SUM(I5:I25)");

    // Merges
    expect(ws["!merges"]).toEqual([{ s: { r: 0, c: 1 }, e: { r: 0, c: 8 } }]);

    // Grid range
    expect(ws["!ref"]).toBe("A1:J26");
  });

  it("should append both sheets in exportClosingToExcel", () => {
    const appendSheetSpy = vi.spyOn(XLSX.utils, "book_append_sheet");
    const writeFileSpy = vi.spyOn(XLSX, "writeFile").mockImplementation(() => {});

    exportClosingToExcel(mockReport, [], []);

    expect(appendSheetSpy).toHaveBeenCalledTimes(2);
    expect(appendSheetSpy).toHaveBeenNthCalledWith(1, expect.anything(), expect.anything(), "Daily Closing Report");
    expect(appendSheetSpy).toHaveBeenNthCalledWith(2, expect.anything(), expect.anything(), "Daily Revenue Statement");
    expect(writeFileSpy).toHaveBeenCalledWith(expect.anything(), "daily-closing-report-2026-08-23.xlsx");

    appendSheetSpy.mockRestore();
    writeFileSpy.mockRestore();
  });
});
