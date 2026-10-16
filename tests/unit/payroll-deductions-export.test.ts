import { describe, expect, it } from "vitest";
import XLSX from "xlsx-js-style";
import { buildPayrollDeductionWorkbook, deductionTabs, type DeductionExportRow } from "../../src/lib/payroll-deductions-export";

const row: DeductionExportRow = {
  employeeCode: "0007", name: "Test Employee", departmentName: "Nursing", epf: "1200.50", esi: "180.25", professionalTax: "200",
  securityDeposit: "500", securityDepositTotal: "10000", securityDepositOpeningBalance: "2500.75", securityDepositStartMonth: "2026-10",
};

describe("payroll deduction Excel export", () => {
  it.each(deductionTabs.filter(tab => tab.id !== "securityDeposit"))("exports only $label and preserves numeric amounts", tab => {
    const workbook = buildPayrollDeductionWorkbook([row], tab.id);
    const data = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[tab.label], { header: 1 });
    expect(data[0]).toHaveLength(4);
    expect(data[1]).toEqual(["0007", "Test Employee", "Nursing", Number(row[tab.fields[0]])]);
    expect(workbook.Sheets[tab.label].D2.t).toBe("n");
    expect(workbook.Sheets[tab.label].D2.z).toBe("#,##0.00");
  });
  it("round-trips security deposit rules through a real xlsx file", () => {
    const original = buildPayrollDeductionWorkbook([row], "securityDeposit");
    const workbook = XLSX.read(XLSX.write(original, { type: "buffer", bookType: "xlsx" }), { type: "buffer" });
    const data = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets["Security Deposit"], { header: 1 });
    expect(data[1]).toEqual(["0007", "Test Employee", "Nursing", 500, 10000, 2500.75, "2026-10"]);
  });
  it("exports only the supplied filtered staff and keeps names as literal text", () => {
    const workbook = buildPayrollDeductionWorkbook([{ ...row, name: "=A1", departmentName: null, epf: null }], "epf");
    const sheet = workbook.Sheets.PF;
    expect(XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })).toHaveLength(2);
    expect(sheet.B2.t).toBe("s");
    expect(sheet.B2.f).toBeUndefined();
    expect(sheet.C2.v).toBe("Unassigned");
    expect(sheet.D2.v).toBe(0);
  });
});
