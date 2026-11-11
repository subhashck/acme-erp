import XLSX from "xlsx-js-style";

interface StudentDueExportRow {
  enrollmentNo: string;
  name: string;
  courseName: string;
  batchName: string;
  quotaCategory: string;
  demandedFee: number;
  totalPaid: number;
  balanceDue: number;
  status: string;
}

export function buildStudentDuesWorkbook(rows: StudentDueExportRow[], filters: Record<string, string>) {
  const headers = ["Sl. No.", "Enrollment #", "Student Name", "Course & Batch", "Quota", "Demanded Fee (INR)", "Fee Paid (INR)", "Outstanding Due (INR)", "Status"];
  const statusLabels: Record<string, string> = { paid: "Fully Paid", partial: "Partial Dues", unpaid: "Unpaid" };
  const totals = rows.reduce((sum, row) => ({
    demanded: sum.demanded + (Number(row.demandedFee) || 0),
    paid: sum.paid + (Number(row.totalPaid) || 0),
    due: sum.due + (Number(row.balanceDue) || 0),
  }), { demanded: 0, paid: 0, due: 0 });
  const sheet = XLSX.utils.aoa_to_sheet([
    headers,
    ...rows.map((row, index) => [index + 1, row.enrollmentNo, row.name, `${row.courseName} (${row.batchName})`, (row.quotaCategory || "").toUpperCase(), Number(row.demandedFee) || 0, Number(row.totalPaid) || 0, Number(row.balanceDue) || 0, statusLabels[row.status] || row.status]),
    ["", "", "TOTAL", "", "", totals.demanded, totals.paid, totals.due, ""],
  ]);
  sheet["!cols"] = [9, 24, 32, 42, 18, 22, 22, 24, 18].map(wch => ({ wch }));
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ r: 0, c: 0 }, { r: rows.length, c: headers.length - 1 }) };
  sheet["!rows"] = [{ hpt: 30 }];
  for (let column = 0; column < headers.length; column++) {
    sheet[XLSX.utils.encode_cell({ r: 0, c: column })].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F766E" } },
      alignment: { vertical: "center", wrapText: true },
    };
    const totalCell = sheet[XLSX.utils.encode_cell({ r: rows.length + 1, c: column })];
    if (totalCell) totalCell.s = { font: { bold: true }, fill: { fgColor: { rgb: "F0FDFA" } } };
    if (column >= 5 && column <= 7) {
      for (let row = 1; row <= rows.length + 1; row++) {
        sheet[XLSX.utils.encode_cell({ r: row, c: column })].z = "#,##0.00";
      }
    }
  }
  const summary = XLSX.utils.aoa_to_sheet([
    ["ACME COLLEGE OF NURSING"],
    ["Report", "Student Wise Fee Dues Report"],
    ["Generated", new Date()],
    ...Object.entries(filters),
    [],
    ["Total Students", rows.length],
    ["Demanded Fee (INR)", totals.demanded],
    ["Fee Paid (INR)", totals.paid],
    ["Outstanding Due (INR)", totals.due],
  ]);
  summary["!cols"] = [{ wch: 28 }, { wch: 60 }];
  summary.B3.z = "dd-mmm-yy hh:mm";
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Student Dues");
  XLSX.utils.book_append_sheet(workbook, summary, "Summary");
  return workbook;
}
