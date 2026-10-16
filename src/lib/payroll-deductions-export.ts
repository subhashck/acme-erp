import XLSX from "xlsx-js-style";
import { deductionFields, deductionTabs, type DeductionTab, type DeductionExportRow, type DeductionAmountKey } from "./payroll-deductions";
export { deductionTabs, type DeductionExportRow } from "./payroll-deductions";

export function buildPayrollDeductionWorkbook(rows: DeductionExportRow[], tabId: DeductionTab) {
  const tab = deductionTabs.find(item => item.id === tabId)!;
  const labels = new Map<DeductionAmountKey, string>(deductionFields);
  const headers = ["Employee Code", "Employee", "Department", ...tab.fields.map(key => `${labels.get(key)} (INR)`), ...(tabId === "securityDeposit" ? ["First Deduction Month"] : [])];
  const data = rows.map(row => [row.employeeCode, row.name, row.departmentName || "Unassigned", ...tab.fields.map(key => Number(row[key] || 0)), ...(tabId === "securityDeposit" ? [row.securityDepositStartMonth || ""] : [])]);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  sheet["!cols"] = headers.map((label, index) => ({ wch: index === 1 ? 32 : Math.max(20, Math.min(42, label.length + 2)) }));
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ r: 0, c: 0 }, { r: rows.length, c: headers.length - 1 }) };
  for (let column = 0; column < headers.length; column++) {
    const header = sheet[XLSX.utils.encode_cell({ r: 0, c: column })];
    header.s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "0F766E" } }, alignment: { wrapText: true, vertical: "center" } };
    if (column >= 3 && column < 3 + tab.fields.length) {
      for (let row = 1; row <= rows.length; row++) sheet[XLSX.utils.encode_cell({ r: row, c: column })].z = "#,##0.00";
    }
  }
  sheet["!rows"] = [{ hpt: 32 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, tab.label);
  return workbook;
}

export function exportPayrollDeductions(rows: DeductionExportRow[], tab: DeductionTab) {
  XLSX.writeFile(buildPayrollDeductionWorkbook(rows, tab), `Payroll_Deductions_${tab}.xlsx`);
}
