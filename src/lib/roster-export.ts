import type { RosterRow, ShiftRow } from "../types";
import XLSX from "xlsx-js-style";

interface ExportOptions {
  exportMonth: string;
  rosters: RosterRow[];
  shifts: ShiftRow[];
  departmentName?: string | null;
  preparerName?: string | null;
}

export const exportRosterToExcel = async ({
  exportMonth,
  rosters,
  shifts,
  departmentName,
  preparerName
}: ExportOptions) => {
  const [year, month] = exportMonth.split("-").map(Number);
  const numDays = new Date(year, month, 0).getDate();
  const firstDay = `${exportMonth}-01`;
  const lastDay = `${exportMonth}-${numDays.toString().padStart(2, "0")}`;

  const monthRosters = rosters.filter(
    (r) => r.startDate <= lastDay && r.endDate >= firstDay
  );

  if (monthRosters.length === 0) {
    alert(`No assignments found for ${departmentName ?? "this department"} in ${exportMonth}.`);
    return;
  }

  // Get list of days in the month as string dates: YYYY-MM-DD
  const dayDates: string[] = [];
  for (let d = 1; d <= numDays; d++) {
    dayDates.push(`${exportMonth}-${d.toString().padStart(2, "0")}`);
  }

  const staffNames = Array.from(new Set(monthRosters.map((r) => r.staffName))).sort();

  // Helper to get Excel column letter (1-indexed)
  const getColLetter = (colIdx: number): string => {
    let temp: number = 0, letter = "";
    while (colIdx > 0) {
      temp = (colIdx - 1) % 26;
      letter = String.fromCharCode(65 + temp) + letter;
      colIdx = Math.floor((colIdx - temp - 1) / 26);
    }
    return letter;
  };

  // Styling configurations
  const styleHeader = {
    fill: { fgColor: { rgb: "115E59" } }, // teal-800
    font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "0F766E" } },
      bottom: { style: "medium", color: { rgb: "0F766E" } },
      left: { style: "thin", color: { rgb: "0F766E" } },
      right: { style: "thin", color: { rgb: "0F766E" } }
    }
  };

  const styleEmployee = {
    fill: { fgColor: { rgb: "F1F5F9" } }, // slate-100
    font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "1E293B" } },
    alignment: { vertical: "center", horizontal: "left" },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } }
    }
  };

  const shiftStyles: Record<string, any> = {
    Morning: {
      fill: { fgColor: { rgb: "FEF9EE" } },
      font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "92400E" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: {
        top: { style: "thin", color: { rgb: "FDE68A" } },
        bottom: { style: "thin", color: { rgb: "FDE68A" } },
        left: { style: "thin", color: { rgb: "FDE68A" } },
        right: { style: "thin", color: { rgb: "FDE68A" } }
      }
    },
    Afternoon: {
      fill: { fgColor: { rgb: "EFF6FF" } },
      font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "1E3A8A" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: {
        top: { style: "thin", color: { rgb: "BFDBFE" } },
        bottom: { style: "thin", color: { rgb: "BFDBFE" } },
        left: { style: "thin", color: { rgb: "BFDBFE" } },
        right: { style: "thin", color: { rgb: "BFDBFE" } }
      }
    },
    Evening: {
      fill: { fgColor: { rgb: "FFF7ED" } },
      font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "9A3412" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: {
        top: { style: "thin", color: { rgb: "FED7AA" } },
        bottom: { style: "thin", color: { rgb: "FED7AA" } },
        left: { style: "thin", color: { rgb: "FED7AA" } },
        right: { style: "thin", color: { rgb: "FED7AA" } }
      }
    },
    Night: {
      fill: { fgColor: { rgb: "F5F3FF" } },
      font: { name: "Segoe UI", sz: 9, bold: true, color: { rgb: "4C1D95" } },
      alignment: { vertical: "center", horizontal: "center" },
      border: {
        top: { style: "thin", color: { rgb: "DDD6FE" } },
        bottom: { style: "thin", color: { rgb: "DDD6FE" } },
        left: { style: "thin", color: { rgb: "DDD6FE" } },
        right: { style: "thin", color: { rgb: "DDD6FE" } }
      }
    }
  };

  const styleTitle = {
    font: { name: "Segoe UI", sz: 14, bold: true, color: { rgb: "115E59" } },
    alignment: { vertical: "center", horizontal: "left" }
  };

  const styleMetaLabel = {
    font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "475569" } },
    alignment: { vertical: "center", horizontal: "left" }
  };

  const styleMetaVal = {
    font: { name: "Segoe UI", sz: 10, color: { rgb: "1E293B" } },
    alignment: { vertical: "center", horizontal: "left" }
  };

  const styleDefaultShift = {
    fill: { fgColor: { rgb: "F8FAFC" } },
    font: { name: "Segoe UI", sz: 9, color: { rgb: "334155" } },
    alignment: { vertical: "center", horizontal: "center" },
    border: {
      top: { style: "thin", color: { rgb: "E2E8F0" } },
      bottom: { style: "thin", color: { rgb: "E2E8F0" } },
      left: { style: "thin", color: { rgb: "E2E8F0" } },
      right: { style: "thin", color: { rgb: "E2E8F0" } }
    }
  };

  const styleEmpty = {
    border: {
      top: { style: "thin", color: { rgb: "F3F4F6" } },
      bottom: { style: "thin", color: { rgb: "F3F4F6" } },
      left: { style: "thin", color: { rgb: "F3F4F6" } },
      right: { style: "thin", color: { rgb: "F3F4F6" } }
    }
  };

  const getShiftCode = (name: string): string => {
    const dbShift = shifts.find((s) => s.name === name);
    if (dbShift?.code) return dbShift.code;
    if (name === "Morning") return "M";
    if (name === "Afternoon") return "A";
    if (name === "Evening") return "E";
    if (name === "Night") return "N";
    return name.substring(0, 2).toUpperCase();
  };

  const ws: Record<string, any> = {};

  // Metadata header section (Rows 1-3)
  ws["A1"] = { v: "MONTHLY ROSTER REPORT", t: "s", s: styleTitle };
  ws["A2"] = { v: "Department:", t: "s", s: styleMetaLabel };
  ws["B2"] = { v: departmentName ?? "N/A", t: "s", s: styleMetaVal };
  ws["A3"] = { v: "Period:", t: "s", s: styleMetaLabel };
  ws["B3"] = { v: exportMonth, t: "s", s: styleMetaVal };
  ws["D3"] = { v: "Prepared By:", t: "s", s: styleMetaLabel };
  ws["E3"] = { v: preparerName ?? "System User", t: "s", s: styleMetaVal };

  // Headers (Row 6)
  ws["A6"] = { v: "Employee", t: "s", s: styleHeader };
  dayDates.forEach((dateStr, idx) => {
    const colLetter = getColLetter(idx + 2);
    const dayNum = dateStr.split("-")[2];
    ws[`${colLetter}6`] = { v: dayNum, t: "s", s: styleHeader };
  });

  // Employee Rows (Row 7 onwards)
  staffNames.forEach((staffName, rowIdx) => {
    const excelRow = rowIdx + 7;
    ws[`A${excelRow}`] = { v: staffName, t: "s", s: styleEmployee };

    const staffRosters = monthRosters.filter((r) => r.staffName === staffName);

    dayDates.forEach((dateStr, colIdx) => {
      const colLetter = getColLetter(colIdx + 2);
      const activeAssignment = staffRosters.find(
        (r) => r.startDate <= dateStr && r.endDate >= dateStr
      );

      if (activeAssignment) {
        const shiftName = activeAssignment.shift;
        const shiftStyle = shiftStyles[shiftName] || styleDefaultShift;
        const shiftCode = getShiftCode(shiftName);
        ws[`${colLetter}${excelRow}`] = { v: shiftCode, t: "s", s: shiftStyle };
      } else {
        ws[`${colLetter}${excelRow}`] = { v: "", t: "s", s: styleEmpty };
      }
    });
  });

  // Legend
  const activeDbShifts = shifts.filter((s) => s.active && s.code);
  const legendText = activeDbShifts.length > 0
    ? `Shift Key:  ${activeDbShifts.map((s) => `${s.code} = ${s.name}`).join("  |  ")}`
    : "Shift Key:  M = Morning  |  A = Afternoon  |  E = Evening  |  N = Night";

  const legendRowIdx = staffNames.length + 9;
  ws[`A${legendRowIdx}`] = {
    v: legendText,
    t: "s",
    s: {
      font: { name: "Segoe UI", sz: 9, italic: true, color: { rgb: "475569" } },
      alignment: { vertical: "center", horizontal: "left" }
    }
  };

  const totalCols = dayDates.length + 1;
  ws["!ref"] = `A1:${getColLetter(totalCols)}${legendRowIdx}`;

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
    { s: { r: legendRowIdx - 1, c: 0 }, e: { r: legendRowIdx - 1, c: totalCols - 1 } }
  ];

  ws["!cols"] = [
    { wch: 22 },
    ...Array.from({ length: dayDates.length }, () => ({ wch: 4 }))
  ];

  const rowHeights = [
    { hpt: 24 }, // Row 1
    { hpt: 18 }, // Row 2
    { hpt: 18 }, // Row 3
    { hpt: 8 },  // Row 4
    { hpt: 8 },  // Row 5
    { hpt: 28 }, // Row 6
    ...Array.from({ length: staffNames.length }, () => ({ hpt: 22 })),
    { hpt: 12 }, // Spacer
    { hpt: 20 }  // Legend
  ];
  ws["!rows"] = rowHeights;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Monthly Roster");
  XLSX.writeFile(wb, `roster-${(departmentName ?? "dept").replace(/\s+/g, "-")}-${exportMonth}.xlsx`);
};
