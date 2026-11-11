import XLSX from "xlsx-js-style";

export interface StudentDrillDown {
  studentId: number;
  enrollmentNo: string;
  name: string;
  phone?: string;
  quotaCategory: string;
  expectedTarget: number;
  collectedAmount: number;
  balanceDue: number;
  status: "paid" | "partial" | "unpaid";
}

interface BatchDrillDown {
  batchId: number;
  batchName: string;
  courseName: string;
  studentCount: number;
  expectedTarget: number;
  collectedAmount: number;
  pendingDues: number;
  collectionEfficiency: number;
  students: StudentDrillDown[];
}

interface PeriodBreakdown {
  periodKey: string;
  periodName: string;
  expectedTarget: number;
  collectedAmount: number;
  pendingDues: number;
  collectionEfficiency: number;
  transactionsCount: number;
  batches: BatchDrillDown[];
}

export interface PeriodicDuesReport {
  academicYear: string;
  frequency: "monthly" | "quarterly" | "annually";
  summary: {
    totalEnrolledStudents: number;
    totalDemanded: number;
    totalCollected: number;
    totalPendingDues: number;
    overallEfficiency: number;
  };
  periods: PeriodBreakdown[];
}

type CellValue = string | number | Date;
const number = (value: number) => Number(value) || 0;
const percent = (value: number) => number(value) / 100;

function detailSheet(headers: string[], rows: CellValue[][], currencyColumns: number[], percentColumns: number[] = []) {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  sheet["!cols"] = headers.map(label => ({ wch: label === "Student Name" ? 32 : label === "Sl. No." ? 9 : Math.max(16, Math.min(36, label.length + 4)) }));
  sheet["!rows"] = [{ hpt: 32 }];
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ r: 0, c: 0 }, { r: rows.length, c: headers.length - 1 }) };
  headers.forEach((_, column) => {
    sheet[XLSX.utils.encode_cell({ r: 0, c: column })].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F766E" } },
      alignment: { vertical: "center", wrapText: true },
    };
    const format = currencyColumns.includes(column) ? "#,##0.00" : percentColumns.includes(column) ? "0%" : null;
    if (format) rows.forEach((_, index) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: index + 1, c: column })];
      if (cell) cell.z = format;
    });
  });
  return sheet;
}

export function buildPeriodicDuesWorkbook(report: PeriodicDuesReport, courseLabel: string) {
  const workbook = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet([
    ["ACME COLLEGE OF NURSING"],
    ["Report", "Periodic Fee Dues — Full Details"],
    ["Generated", new Date()],
    ["Academic Year", report.academicYear],
    ["Frequency", report.frequency.toUpperCase()],
    ["Course", courseLabel],
    [],
    ["Enrolled Students", number(report.summary.totalEnrolledStudents)],
    ["Annual Target (INR)", number(report.summary.totalDemanded)],
    ["Total Collected (INR)", number(report.summary.totalCollected)],
    ["Pending Dues (INR)", number(report.summary.totalPendingDues)],
    ["Overall Collection Efficiency", percent(report.summary.overallEfficiency)],
    [],
    ["Details", "Includes every period, batch and student, including collapsed rows."],
    ["Student rows", "Each student appears once per period. Period amounts are allocations for that period."],
    ["Transaction counts", "Receipts spanning multiple periods can appear in more than one period's count."],
  ]);
  summary["!cols"] = [{ wch: 32 }, { wch: 105 }];
  summary.B3.z = "dd-mmm-yy hh:mm";
  ["B9", "B10", "B11"].forEach(cell => { summary[cell].z = "#,##0.00"; });
  summary.B12.z = "0%";
  summary.A1.s = { font: { bold: true, sz: 14, color: { rgb: "0F766E" } } };
  XLSX.utils.book_append_sheet(workbook, summary, "Summary");

  const periodRows: CellValue[][] = [];
  const batchRows: CellValue[][] = [];
  const studentRows: CellValue[][] = [];
  const statusLabels = { paid: "Paid", partial: "Partial", unpaid: "Unpaid" };
  for (const period of report.periods) {
    const context = [report.academicYear, report.frequency.toUpperCase(), period.periodKey, period.periodName];
    periodRows.push([periodRows.length + 1, ...context, number(period.expectedTarget), number(period.collectedAmount), number(period.pendingDues), percent(period.collectionEfficiency), number(period.transactionsCount), period.batches.length]);
    for (const batch of period.batches) {
      const batchContext = [...context, batch.courseName, batch.batchId, batch.batchName];
      batchRows.push([batchRows.length + 1, ...batchContext, number(batch.studentCount), number(batch.expectedTarget), number(batch.collectedAmount), number(batch.pendingDues), percent(batch.collectionEfficiency)]);
      for (const student of batch.students) {
        studentRows.push([studentRows.length + 1, ...batchContext, student.studentId, student.enrollmentNo || "", student.name || "", student.phone || "", (student.quotaCategory || "").toUpperCase(), number(student.expectedTarget), number(student.collectedAmount), number(student.balanceDue), statusLabels[student.status]]);
      }
    }
  }
  const contextHeaders = ["Academic Year", "Frequency", "Period Key", "Period"];
  const batchHeaders = [...contextHeaders, "Course", "Batch ID", "Batch"];
  XLSX.utils.book_append_sheet(workbook, detailSheet(
    ["Sl. No.", ...contextHeaders, "Expected Target (INR)", "Collected (INR)", "Pending Dues (INR)", "Collection Efficiency", "Transaction Count", "Batch Count"],
    periodRows, [5, 6, 7], [8]
  ), "Period Summary");
  XLSX.utils.book_append_sheet(workbook, detailSheet(
    ["Sl. No.", ...batchHeaders, "Student Count", "Expected Target (INR)", "Collected (INR)", "Pending Dues (INR)", "Collection Efficiency"],
    batchRows, [9, 10, 11], [12]
  ), "Batch Details");
  XLSX.utils.book_append_sheet(workbook, detailSheet(
    ["Sl. No.", ...batchHeaders, "Student ID", "Enrollment #", "Student Name", "Phone", "Quota", "Expected Target (INR)", "Collected (INR)", "Balance Due (INR)", "Status"],
    studentRows, [13, 14, 15]
  ), "Student Details");
  return workbook;
}
