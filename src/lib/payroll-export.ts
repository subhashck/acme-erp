import XLSX from "xlsx-js-style";

interface PayslipRow {
  month: string;
  employeeCode: string;
  name: string;
  role: string;
  departmentName: string | null;
  basicSalary: number;
  hra: number;
  conveyance: number;
  skillAllowance: number;
  special: number;
  earnedLeaveEncashment?: number;
  extraDayAllowance?: number;
  epf: number;
  esi: number;
  professionalTax: number;
  tds?: number;
  securityDeposit?: number;
  otherDeductions: number;
  lateAttendance: number;
  leaveDaysTaken: number;
  leaveDeduction: number;
  netSalary: number;
  status: string;
  version: number;
  createdAt: string;
}

interface ExportOptions {
  payslips: PayslipRow[];
  filterMonth?: string;
}

type ColGroup = "info" | "earning" | "earning-total" | "deduction" | "deduction-total" | "net";

const HEADER_FILL: Record<ColGroup, string> = {
  "info":             "1E293B", // slate-900
  "earning":          "14532D", // emerald-900
  "earning-total":    "166534", // emerald-800
  "deduction":        "7F1D1D", // red-900
  "deduction-total":  "991B1B", // red-800
  "net":              "1E3A5F", // blue-900
};

const DATA_FILL: Record<ColGroup, string> = {
  "info":             "FFFFFF",
  "earning":          "F0FDF4", // emerald-50
  "earning-total":    "DCFCE7", // emerald-100
  "deduction":        "FEF2F2", // red-50
  "deduction-total":  "FEE2E2", // red-100
  "net":              "EFF6FF", // blue-50
};

const BORDER = {
  top:    { style: "thin", color: { rgb: "D1D5DB" } },
  bottom: { style: "thin", color: { rgb: "D1D5DB" } },
  left:   { style: "thin", color: { rgb: "D1D5DB" } },
  right:  { style: "thin", color: { rgb: "D1D5DB" } },
};

const COLUMNS: { key: string; label: string; group: ColGroup }[] = [
  { key: "Month",                 label: "Month",                     group: "info"            },
  { key: "Employee Code",         label: "Employee Code",             group: "info"            },
  { key: "Name",                  label: "Name",                      group: "info"            },
  { key: "Role",                  label: "Role",                      group: "info"            },
  { key: "Department",            label: "Department",                group: "info"            },
  { key: "Basic Salary",          label: "Basic Salary (₹)",          group: "earning"         },
  { key: "HRA",                   label: "HRA (₹)",                   group: "earning"         },
  { key: "Conveyance",            label: "Conveyance (₹)",            group: "earning"         },
  { key: "Skill Allowance",       label: "Skill Allowance (₹)",       group: "earning"         },
  { key: "Special",               label: "Special (₹)",               group: "earning"         },
  { key: "Earned Leave Encashment", label: "Earned Leave Encashment (₹)", group: "earning"    },
  { key: "Extra Day Allowance",   label: "Extra Day Allowance (₹)",   group: "earning"         },
  { key: "Gross Salary",          label: "Gross Salary (₹)",          group: "earning-total"   },
  { key: "EPF",                   label: "EPF (₹)",                   group: "deduction"       },
  { key: "ESI",                   label: "ESI (₹)",                   group: "deduction"       },
  { key: "Professional Tax",      label: "Professional Tax (₹)",      group: "deduction"       },
  { key: "TDS",                   label: "TDS (₹)",                   group: "deduction"       },
  { key: "Security Deposit",      label: "Security Deposit (₹)",      group: "deduction"       },
  { key: "Other Deductions",      label: "Other Deductions (₹)",      group: "deduction"       },
  { key: "Late Attendance",       label: "Late Attendance (₹)",       group: "deduction"       },
  { key: "Leave Days Taken",      label: "Leave Days Taken",          group: "deduction"       },
  { key: "Leave Deduction",       label: "Leave Deduction (₹)",       group: "deduction"       },
  { key: "Total Deductions",      label: "Total Deductions (₹)",      group: "deduction-total" },
  { key: "Net Salary",            label: "Net Salary (₹)",            group: "net"             },
  { key: "Status",                label: "Status",                    group: "info"            },
  { key: "Version",               label: "Version",                   group: "info"            },
  { key: "Generated On",          label: "Generated On",              group: "info"            },
];

type DataRow = Record<string, string | number>;

function buildDataRows(payslips: PayslipRow[]): DataRow[] {
  return payslips.map((p) => {
    const basic = Number(p.basicSalary || 0);
    const hra = Number(p.hra || 0);
    const conveyance = Number(p.conveyance || 0);
    const skill = Number(p.skillAllowance || 0);
    const special = Number(p.special || 0);
    const leaveEncash = Number(p.earnedLeaveEncashment || 0);
    const extraDay = Number(p.extraDayAllowance || 0);
    const gross = basic + hra + conveyance + skill + special + leaveEncash + extraDay;

    const epf = Number(p.epf || 0);
    const esi = Number(p.esi || 0);
    const pt = Number(p.professionalTax || 0);
    const tds = Number(p.tds || 0);
    const secDep = Number(p.securityDeposit || 0);
    const other = Number(p.otherDeductions || 0);
    const late = Number(p.lateAttendance || 0);
    const leaveDed = Number(p.leaveDeduction || 0);
    const totalDeductions = epf + esi + pt + tds + secDep + other + late + leaveDed;

    return {
      "Month":                 p.month,
      "Employee Code":         p.employeeCode,
      "Name":                  p.name,
      "Role":                  p.role,
      "Department":            p.departmentName ?? "General",
      "Basic Salary":          basic,
      "HRA":                   hra,
      "Conveyance":            conveyance,
      "Skill Allowance":        skill,
      "Special":               special,
      "Earned Leave Encashment": leaveEncash,
      "Extra Day Allowance":   extraDay,
      "Gross Salary":          gross,
      "EPF":                   epf,
      "ESI":                   esi,
      "Professional Tax":      pt,
      "TDS":                   tds,
      "Security Deposit":      secDep,
      "Other Deductions":      other,
      "Late Attendance":       late,
      "Leave Days Taken":      p.leaveDaysTaken,
      "Leave Deduction":       leaveDed,
      "Total Deductions":      totalDeductions,
      "Net Salary":            p.netSalary,
      "Status":                p.status,
      "Version":               `v${p.version}`,
      "Generated On":          new Date(p.createdAt).toLocaleDateString("en-IN"),
    };
  });
}

function buildWorksheet(dataRows: DataRow[]): Record<string, unknown> {
  const ws: Record<string, unknown> = {};
  const summaryGroups = new Set<ColGroup>(["earning-total", "deduction-total", "net"]);

  // Header row
  COLUMNS.forEach((col, ci) => {
    const addr = XLSX.utils.encode_cell({ r: 0, c: ci });
    ws[addr] = {
      v: col.label,
      t: "s",
      s: {
        font:      { name: "Segoe UI", bold: true, color: { rgb: "FFFFFF" }, sz: 10 },
        fill:      { fgColor: { rgb: HEADER_FILL[col.group] }, patternType: "solid" },
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border:    BORDER,
      },
    };
  });

  // Data rows
  dataRows.forEach((row, ri) => {
    COLUMNS.forEach((col, ci) => {
      const addr = XLSX.utils.encode_cell({ r: ri + 1, c: ci });
      const val = row[col.key];
      const isNumeric = typeof val === "number" && col.key !== "Leave Days Taken";
      const isBold = summaryGroups.has(col.group as ColGroup);
      ws[addr] = {
        v: val,
        t: typeof val === "number" ? "n" : "s",
        s: {
          font:      { name: "Segoe UI", bold: isBold, sz: 10 },
          fill:      { fgColor: { rgb: DATA_FILL[col.group] }, patternType: "solid" },
          alignment: { horizontal: isNumeric ? "right" : "left", vertical: "center" },
          border:    BORDER,
        },
      };
    });
  });

  ws["!ref"] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: dataRows.length, c: COLUMNS.length - 1 },
  });

  ws["!cols"] = COLUMNS.map((col) => ({
    wch: Math.max(col.label.length, ...dataRows.map((r) => String(r[col.key] ?? "").length)) + 2,
  }));

  // Freeze header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  return ws;
}

export function exportPayrollToExcel({ payslips, filterMonth }: ExportOptions): void {
  if (payslips.length === 0) {
    alert("No payslips to export. Adjust filters and try again.");
    return;
  }

  const dataRows = buildDataRows(payslips);
  const ws = buildWorksheet(dataRows);

  const wb = XLSX.utils.book_new();
  const sheetName = filterMonth ? `Payroll ${filterMonth}` : "Payroll Export";
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const fileName = filterMonth
    ? `payroll-${filterMonth}.xlsx`
    : `payroll-export-${new Date().toISOString().slice(0, 10)}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
