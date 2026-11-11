import XLSX from "xlsx-js-style";

interface PayslipRow {
  month: string;
  employeeCode: string;
  name: string;
  role: string;
  departmentName: string | null;
  paymentMode?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  bankAccountName?: string | null;
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
  { key: "Name (in Bank Records)", label: "Name (in Bank Records)",    group: "info"            },
  { key: "Role",                  label: "Role",                      group: "info"            },
  { key: "Department",            label: "Department",                group: "info"            },
  { key: "Payment Mode",          label: "Payment Mode",              group: "info"            },
  { key: "Bank Name",             label: "Bank Name",                 group: "info"            },
  { key: "Account Number",        label: "Account Number",            group: "info"            },
  { key: "IFSC Code",             label: "IFSC Code",                 group: "info"            },
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
      "Name (in Bank Records)": p.bankAccountName || p.name,
      "Role":                  p.role,
      "Department":            p.departmentName ?? "General",
      "Payment Mode":          p.paymentMode || "Bank Transfer",
      "Bank Name":             p.bankName || "—",
      "Account Number":        p.accountNumber ? String(p.accountNumber) : "—",
      "IFSC Code":             p.ifscCode ? String(p.ifscCode).toUpperCase() : "—",
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

function sanitizeSheetName(name: string, existingNames: Set<string>): string {
  let cleaned = name.replace(/[\\/?*:[\]]/g, " ").trim() || "Sheet";
  if (cleaned.length > 31) {
    cleaned = cleaned.slice(0, 31).trim();
  }
  let finalName = cleaned;
  let counter = 1;
  while (existingNames.has(finalName.toLowerCase())) {
    const suffix = ` (${counter})`;
    const maxBaseLen = Math.max(1, 31 - suffix.length);
    finalName = `${cleaned.slice(0, maxBaseLen)}${suffix}`;
    counter++;
  }
  existingNames.add(finalName.toLowerCase());
  return finalName;
}

const STATUS_ORDER = [
  "Paid",
  "Approved by Management",
  "Approved by COO",
  "Approved by HR",
  "Active",
  "Draft",
  "Cancelled",
  "Superseded",
];

function notifyUser(message: string) {
  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert(message);
  } else if (typeof globalThis !== "undefined" && typeof (globalThis as any).alert === "function") {
    (globalThis as any).alert(message);
  } else {
    console.warn("[payroll-export]", message);
  }
}

export function exportPayrollToExcel({ payslips, filterMonth }: ExportOptions): void {
  if (!filterMonth || !filterMonth.trim()) {
    notifyUser("Please select a specific month to export. Payroll export is restricted to a particular month.");
    return;
  }

  // Ensure export is strictly for the chosen month only
  const targetPayslips = payslips.filter((p) => p.month === filterMonth);

  if (targetPayslips.length === 0) {
    notifyUser(`No payslips found to export for ${filterMonth}. Adjust filters and try again.`);
    return;
  }

  // Group payslips strictly by status into separate sheets
  const payslipsByStatus = new Map<string, PayslipRow[]>();
  for (const p of targetPayslips) {
    const st = p.status?.trim() || "Unknown";
    const list = payslipsByStatus.get(st) || [];
    list.push(p);
    payslipsByStatus.set(st, list);
  }

  const sortedStatuses = Array.from(payslipsByStatus.keys()).sort((a, b) => {
    const idxA = STATUS_ORDER.indexOf(a);
    const idxB = STATUS_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const wb = XLSX.utils.book_new();
  const existingSheetNames = new Set<string>();

  for (const status of sortedStatuses) {
    const groupPayslips = payslipsByStatus.get(status)!;
    const dataRows = buildDataRows(groupPayslips);
    const ws = buildWorksheet(dataRows);
    const sheetName = sanitizeSheetName(status, existingSheetNames);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const fileName = `payroll-${filterMonth}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
