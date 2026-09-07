import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportPayrollToExcel } from "../../src/lib/payroll-export";
import XLSX from "xlsx-js-style";

describe("exportPayrollToExcel", () => {
  const mockPayslips = [
    {
      month: "2026-09",
      employeeCode: "EMP001",
      name: "Dr. Sharma",
      role: "Doctor",
      departmentName: "Cardiology",
      paymentMode: "Bank Transfer",
      bankName: "State Bank of India",
      accountNumber: "00123456789012",
      ifscCode: "SBIN0001234",
      basicSalary: 50000,
      hra: 15000,
      conveyance: 5000,
      skillAllowance: 2000,
      special: 1000,
      epf: 1800,
      esi: 0,
      professionalTax: 200,
      otherDeductions: 0,
      lateAttendance: 0,
      leaveDaysTaken: 0,
      leaveDeduction: 0,
      netSalary: 71000,
      status: "Approved",
      version: 1,
      createdAt: "2026-09-01T10:00:00.000Z",
    },
    {
      month: "2026-08",
      employeeCode: "EMP002",
      name: "Nurse Priya",
      role: "Staff Nurse",
      departmentName: "ICU",
      paymentMode: "Bank Transfer",
      bankName: "HDFC Bank",
      accountNumber: "98765432109876",
      ifscCode: "HDFC0005678",
      basicSalary: 25000,
      hra: 8000,
      conveyance: 2000,
      skillAllowance: 1000,
      special: 0,
      epf: 1800,
      esi: 500,
      professionalTax: 200,
      otherDeductions: 0,
      lateAttendance: 0,
      leaveDaysTaken: 0,
      leaveDeduction: 0,
      netSalary: 33500,
      status: "Approved",
      version: 1,
      createdAt: "2026-08-01T10:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requires filterMonth and refuses export if filterMonth is missing", () => {
    const alertSpy = vi.fn();
    (globalThis as any).alert = alertSpy;
    const writeFileSpy = vi.spyOn(XLSX, "writeFile").mockImplementation(() => {});

    exportPayrollToExcel({ payslips: mockPayslips as any, filterMonth: "" });

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining("restricted to a particular month")
    );
    expect(writeFileSpy).not.toHaveBeenCalled();
  });

  it("exports strictly for the chosen month and includes bank details in columns", () => {
    (globalThis as any).alert = vi.fn();
    let generatedWorkbook: any = null;
    vi.spyOn(XLSX, "writeFile").mockImplementation((wb: any, filename: string) => {
      generatedWorkbook = wb;
      return undefined as any;
    });

    exportPayrollToExcel({
      payslips: mockPayslips as any,
      filterMonth: "2026-09",
    });

    expect(generatedWorkbook).not.toBeNull();
    const sheet = generatedWorkbook.Sheets["Approved"];
    expect(sheet).toBeDefined();

    // Check header row contains Bank details
    const cells = Object.keys(sheet).map((k) => sheet[k]?.v);
    expect(cells).toContain("Payment Mode");
    expect(cells).toContain("Bank Name");
    expect(cells).toContain("Account Number");
    expect(cells).toContain("IFSC Code");

    // Check that EMP001 (September) data is present with bank details
    expect(cells).toContain("State Bank of India");
    expect(cells).toContain("00123456789012");
    expect(cells).toContain("SBIN0001234");

    // Check that EMP002 (August) is EXCLUDED because export is strictly for 2026-09
    expect(cells).not.toContain("Nurse Priya");
    expect(cells).not.toContain("HDFC Bank");
    expect(cells).not.toContain("98765432109876");
  });

  it("creates separate Excel sheets for different payroll statuses within the selected month", () => {
    (globalThis as any).alert = vi.fn();
    let generatedWorkbook: any = null;
    vi.spyOn(XLSX, "writeFile").mockImplementation((wb: any) => {
      generatedWorkbook = wb;
      return undefined as any;
    });

    const multiStatusPayslips = [
      {
        month: "2026-09",
        employeeCode: "EMP101",
        name: "Alice Paid",
        role: "Staff Nurse",
        departmentName: "Emergency",
        basicSalary: 30000,
        hra: 10000,
        conveyance: 2000,
        skillAllowance: 0,
        special: 0,
        epf: 1800,
        esi: 0,
        professionalTax: 200,
        otherDeductions: 0,
        lateAttendance: 0,
        leaveDaysTaken: 0,
        leaveDeduction: 0,
        netSalary: 40000,
        status: "Paid",
        version: 1,
        createdAt: "2026-09-01T10:00:00.000Z",
      },
      {
        month: "2026-09",
        employeeCode: "EMP102",
        name: "Bob Draft",
        role: "Technician",
        departmentName: "Lab",
        basicSalary: 20000,
        hra: 5000,
        conveyance: 1000,
        skillAllowance: 0,
        special: 0,
        epf: 1800,
        esi: 0,
        professionalTax: 200,
        otherDeductions: 0,
        lateAttendance: 0,
        leaveDaysTaken: 0,
        leaveDeduction: 0,
        netSalary: 24000,
        status: "Draft",
        version: 1,
        createdAt: "2026-09-01T10:00:00.000Z",
      },
      {
        month: "2026-09",
        employeeCode: "EMP103",
        name: "Carol Approved",
        role: "Doctor",
        departmentName: "General Medicine",
        basicSalary: 60000,
        hra: 20000,
        conveyance: 5000,
        skillAllowance: 0,
        special: 0,
        epf: 1800,
        esi: 0,
        professionalTax: 200,
        otherDeductions: 0,
        lateAttendance: 0,
        leaveDaysTaken: 0,
        leaveDeduction: 0,
        netSalary: 83000,
        status: "Approved by Management",
        version: 1,
        createdAt: "2026-09-01T10:00:00.000Z",
      },
    ];

    exportPayrollToExcel({
      payslips: multiStatusPayslips as any,
      filterMonth: "2026-09",
    });

    expect(generatedWorkbook).not.toBeNull();
    expect(generatedWorkbook.SheetNames).toEqual([
      "Paid",
      "Approved by Management",
      "Draft",
    ]);

    // Check "Paid" sheet content
    const paidSheet = generatedWorkbook.Sheets["Paid"];
    const paidCells = Object.keys(paidSheet).map((k) => paidSheet[k]?.v);
    expect(paidCells).toContain("Alice Paid");
    expect(paidCells).not.toContain("Bob Draft");
    expect(paidCells).not.toContain("Carol Approved");

    // Check "Draft" sheet content
    const draftSheet = generatedWorkbook.Sheets["Draft"];
    const draftCells = Object.keys(draftSheet).map((k) => draftSheet[k]?.v);
    expect(draftCells).toContain("Bob Draft");
    expect(draftCells).not.toContain("Alice Paid");
    expect(draftCells).not.toContain("Carol Approved");

    // Check "Approved by Management" sheet content
    const mgmtSheet = generatedWorkbook.Sheets["Approved by Management"];
    const mgmtCells = Object.keys(mgmtSheet).map((k) => mgmtSheet[k]?.v);
    expect(mgmtCells).toContain("Carol Approved");
    expect(mgmtCells).not.toContain("Alice Paid");
    expect(mgmtCells).not.toContain("Bob Draft");
  });
});
