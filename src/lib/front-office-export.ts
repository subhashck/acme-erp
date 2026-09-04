import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  type CompiledPatient,
  type FrontOfficeSummaryKPIs,
  type RevenueCategorySummary,
  type ItemBilledSummary,
  type FrontOfficeExpense,
  type FrontOfficeAdmissionRow,
  type FrontOfficeDischargeRow,
  type FrontOfficeDenominations,
  type FrontOfficeHandoverSummary,
  type FrontOfficeSignatures,
  calculateDenominationsTotal,
  formatMoney,
  formatNumber,
  visitTypeLabel,
} from "./front-office-processor";

export interface FrontOfficeExportData {
  reportDate: string;
  shiftLabel?: string;
  preparedBy?: string;
  consultationFileName?: string;
  procedureFileName?: string;
  radiologyFileName?: string;
  kpis: FrontOfficeSummaryKPIs;
  revenueCategories: RevenueCategorySummary[];
  itemsBilled: ItemBilledSummary[];
  patients: CompiledPatient[];
  expenses?: FrontOfficeExpense[];
  admissions?: FrontOfficeAdmissionRow[];
  discharges?: FrontOfficeDischargeRow[];
  cashDenominations?: FrontOfficeDenominations;
  handoverSummary?: Partial<FrontOfficeHandoverSummary>;
  signatures?: FrontOfficeSignatures;
}

const formatPdfMoney = (value: number | string | null | undefined): string => {
  const n = Math.round(Number(value || 0));
  return "Rs. " + new Intl.NumberFormat("en-IN").format(n);
};

export function generateFrontOfficePDF(data: FrontOfficeExportData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const dateStr = data.reportDate || new Date().toISOString().slice(0, 10);
  const shiftStr = data.shiftLabel ? `Shift: ${data.shiftLabel}` : "Shift: Full Day";
  const prepStr = data.preparedBy ? `Prepared By: ${data.preparedBy}` : "";

  // -------------------------------------------------------------------------
  // Sheet 1: Executive Summary & Overview (Ink-saving Clean Portrait Layout)
  // -------------------------------------------------------------------------
  // Header: Clean dark text on white with subtle divider (No heavy background fill)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("ACME FERTILITY & HEALTHCARE CENTRE", 14, 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Front Office — Operations & Revenue Dashboard", 14, 16.5);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${shiftStr}${prepStr ? `   |   ${prepStr}` : ""}`, 14, 21.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Report Date: ${dateStr}`, pageWidth - 14, 11, { align: "right" });

  if (data.shiftLabel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(data.shiftLabel, pageWidth - 14, 16.5, { align: "right" });
  }

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(14, 25, pageWidth - 14, 25);

  let y = 30;

  // 1. KPI Summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Key Performance Indicators", 14, y);
  y += 3.5;

  autoTable(doc, {
    startY: y,
    head: [
      [
        { content: "Total Patient Visits", styles: { halign: "center" } },
        { content: "Total Revenue Billed", styles: { halign: "center" } },
        { content: "Realized Collections", styles: { halign: "center" } },
        { content: "Pending Dues", styles: { halign: "center" } },
        { content: "Realization Rate", styles: { halign: "center" } },
        { content: "Patient Service Mix", styles: { halign: "center" } },
      ],
    ],
    body: [
      [
        { content: formatNumber(data.kpis.totalPatients), styles: { halign: "center", fontSize: 9.5, fontStyle: "bold" } },
        { content: formatPdfMoney(data.kpis.totalBill), styles: { halign: "center", fontSize: 9.5, fontStyle: "bold" } },
        { content: formatPdfMoney(data.kpis.totalCollected), styles: { halign: "center", fontSize: 9.5, fontStyle: "bold", textColor: "#15803d" } },
        { content: formatPdfMoney(data.kpis.totalPending), styles: { halign: "center", fontSize: 9.5, fontStyle: "bold", textColor: "#b91c1c" } },
        { content: `${data.kpis.realizationRate.toFixed(1)}%`, styles: { halign: "center", fontSize: 9.5, fontStyle: "bold" } },
        { content: data.kpis.patientMixText, styles: { halign: "center", fontSize: 8.5, fontStyle: "bold" } },
      ],
    ],
    theme: "plain",
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [30, 41, 59],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 2,
      lineWidth: { bottom: 0.35 },
      lineColor: [148, 163, 184],
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      cellPadding: 3,
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 30 },
      2: { cellWidth: 32 },
      3: { cellWidth: 26 },
      4: { cellWidth: 25 },
      5: { cellWidth: 44 },
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 7;

  // 2. Revenue & Collections by Category
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Revenue & Collections by Category", 14, y);
  y += 3.5;

  const revTotalCount = data.revenueCategories.reduce((s, r) => s + r.count, 0);
  const revTotalBill = data.revenueCategories.reduce((s, r) => s + r.billAmount, 0);
  const revTotalDiscount = data.revenueCategories.reduce((s, r) => s + (r.discount || 0), 0);
  const revTotalCollected = data.revenueCategories.reduce((s, r) => s + r.collected, 0);
  const revTotalPending = data.revenueCategories.reduce((s, r) => s + r.pending, 0);

  const revenueRows = data.revenueCategories.map((r) => [
    { content: r.label, styles: { halign: "left" as const, fontStyle: "bold" as const } },
    { content: formatNumber(r.count), styles: { halign: "right" as const } },
    { content: formatPdfMoney(r.billAmount), styles: { halign: "right" as const } },
    { content: r.discount ? `-${formatPdfMoney(r.discount)}` : "—", styles: { halign: "right" as const, textColor: "#7e22ce" } },
    { content: formatPdfMoney(r.collected), styles: { halign: "right" as const, textColor: "#15803d" } },
    { content: formatPdfMoney(r.pending), styles: { halign: "right" as const, textColor: "#b91c1c" } },
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [
        { content: "Category", styles: { halign: "left" } },
        { content: "Count", styles: { halign: "right" } },
        { content: "Bill (Rs.)", styles: { halign: "right" } },
        { content: "Disc (Rs.)", styles: { halign: "right" } },
        { content: "Collected (Rs.)", styles: { halign: "right" } },
        { content: "Pending (Rs.)", styles: { halign: "right" } },
      ],
    ],
    body: revenueRows,
    foot: [
      [
        { content: "Total", styles: { halign: "left", fontStyle: "bold" } },
        { content: formatNumber(revTotalCount), styles: { halign: "right", fontStyle: "bold" } },
        { content: formatPdfMoney(revTotalBill), styles: { halign: "right", fontStyle: "bold" } },
        { content: formatPdfMoney(revTotalDiscount), styles: { halign: "right", fontStyle: "bold", textColor: "#7e22ce" } },
        { content: formatPdfMoney(revTotalCollected), styles: { halign: "right", fontStyle: "bold", textColor: "#15803d" } },
        { content: formatPdfMoney(revTotalPending), styles: { halign: "right", fontStyle: "bold", textColor: "#b91c1c" } },
      ],
    ],
    theme: "plain",
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 2,
      lineWidth: { bottom: 0.35 },
      lineColor: [148, 163, 184],
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineWidth: { bottom: 0.1 },
      lineColor: [226, 232, 240],
    },
    footStyles: {
      fillColor: false,
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 2,
      lineWidth: { top: 0.35 },
      lineColor: [148, 163, 184],
    },
    columnStyles: {
      0: { cellWidth: 52 },
      1: { cellWidth: 18, halign: "right" },
      2: { cellWidth: 28, halign: "right" },
      3: { cellWidth: 26, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 28, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 7;

  // 3. Procedure & Lab Items Breakdown
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text("Top Procedure & Laboratory Items", 14, y);
  y += 3.5;

  const itemsTotalCount = data.itemsBilled.reduce((s, i) => s + i.count, 0);
  const itemsTotalAmount = data.itemsBilled.reduce((s, i) => s + i.amount, 0);

  const itemRows = data.itemsBilled.slice(0, 8).map((item) => [
    { content: item.name, styles: { halign: "left" as const } },
    { content: formatNumber(item.count), styles: { halign: "right" as const } },
    { content: formatPdfMoney(item.amount), styles: { halign: "right" as const } },
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [
        { content: "Item Name", styles: { halign: "left" } },
        { content: "Count", styles: { halign: "right" } },
        { content: "Billed Amount (Rs.)", styles: { halign: "right" } },
      ],
    ],
    body: itemRows,
    foot: [
      [
        { content: `Total (${data.itemsBilled.length} items billed)`, styles: { halign: "left", fontStyle: "bold" } },
        { content: formatNumber(itemsTotalCount), styles: { halign: "right", fontStyle: "bold" } },
        { content: formatPdfMoney(itemsTotalAmount), styles: { halign: "right", fontStyle: "bold" } },
      ],
    ],
    theme: "plain",
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 2,
      lineWidth: { bottom: 0.35 },
      lineColor: [148, 163, 184],
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineWidth: { bottom: 0.1 },
      lineColor: [226, 232, 240],
    },
    footStyles: {
      fillColor: false,
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 2,
      lineWidth: { top: 0.35 },
      lineColor: [148, 163, 184],
    },
    columnStyles: {
      0: { cellWidth: 106 },
      1: { cellWidth: 28, halign: "right" },
      2: { cellWidth: 48, halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  // 4. Front Office Petty Cash & Outflows
  const expenses = data.expenses || [];
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const netCollections = Number(data.kpis.totalCollected || 0) - totalExpenses;

  if (expenses.length > 0) {
    y = (doc as any).lastAutoTable.finalY + 7;

    if (y < 235) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`Front Office Petty Cash & Outflows (${expenses.length} Entries)`, 14, y);
      y += 3.5;

      const expRows = expenses.slice(0, 6).map((e, idx) => [
        { content: String(idx + 1), styles: { halign: "center" as const } },
        { content: e.category, styles: { halign: "left" as const, fontStyle: "bold" as const } },
        { content: e.description || "—", styles: { halign: "left" as const } },
        { content: e.paymentMode || "Cash", styles: { halign: "center" as const } },
        { content: e.voucherNumber || "—", styles: { halign: "center" as const } },
        { content: formatPdfMoney(e.amount), styles: { halign: "right" as const } },
      ]);

      autoTable(doc, {
        startY: y,
        head: [
          [
            { content: "Sr", styles: { halign: "center" } },
            { content: "Category", styles: { halign: "left" } },
            { content: "Description", styles: { halign: "left" } },
            { content: "Mode", styles: { halign: "center" } },
            { content: "Voucher #", styles: { halign: "center" } },
            { content: "Amount (Rs.)", styles: { halign: "right" } },
          ],
        ],
        body: expRows,
        foot: [
          [
            {
              content: `Total Outflows: ${formatPdfMoney(totalExpenses)}   |   Net Shift Handover: ${formatPdfMoney(netCollections)}`,
              colSpan: 6,
              styles: { halign: "right", fontStyle: "bold", textColor: "#15803d" },
            },
          ],
        ],
        theme: "plain",
        headStyles: {
          fillColor: [248, 250, 252],
          textColor: [15, 23, 42],
          fontStyle: "bold",
          fontSize: 7.5,
          cellPadding: 2,
          lineWidth: { bottom: 0.35 },
          lineColor: [148, 163, 184],
        },
        bodyStyles: {
          fontSize: 7.5,
          cellPadding: 2,
          textColor: [15, 23, 42],
          lineWidth: { bottom: 0.1 },
          lineColor: [226, 232, 240],
        },
        footStyles: {
          fillColor: false,
          textColor: [15, 23, 42],
          fontStyle: "bold",
          fontSize: 7.5,
          cellPadding: 2,
          lineWidth: { top: 0.35 },
          lineColor: [148, 163, 184],
        },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 42, halign: "left" },
          2: { cellWidth: 60, halign: "left" },
          3: { cellWidth: 20, halign: "center" },
          4: { cellWidth: 24, halign: "center" },
          5: { cellWidth: 28, halign: "right" },
        },
        margin: { left: 14, right: 14 },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Sheet 2: Daily Shift Handover Sheet (Strictly Second Sheet)
  // -------------------------------------------------------------------------
  doc.addPage();

  const admissions = data.admissions || [];
  const discharges = data.discharges || [];
  const denoms = data.cashDenominations || {};
  const handover = data.handoverSummary;
  const sigs = data.signatures;

  // Header: Clean dark text on white with subtle divider (Zero ink-wasting solid banner)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("ACME FERTILITY & HEALTHCARE CENTRE", 14, 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("DAILY SHIFT HANDOVER & CASH RECONCILIATION SHEET", 14, 16.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Shift: ${data.shiftLabel || "Full Day"}   |   Report Date: ${dateStr}   |   Staff: ${data.preparedBy || sigs?.handedOverBy || "—"}`,
    14,
    21.5
  );

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(14, 24.5, pageWidth - 14, 24.5);

  // Side-by-side Layout: Width = 88mm each with 6mm gap
  const halfColWidth = 88;
  const rightColX = 14 + halfColWidth + 6; // 108mm
  let curY = 28.5;

  // Section 1 Titles: Admission (Left) & Discharge (Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("ADMISSION / ADVANCE / IVF / PRE-BOOKING", 14, curY);
  doc.text("DISCHARGE", rightColX, curY);
  curY += 2.5;

  // Admission Rows
  const admTotal = admissions.reduce((s, a) => s + Number(a.amount || 0), 0);
  const admBody =
    admissions.length > 0
      ? admissions.map((a, i) => [
          { content: String(i + 1), styles: { halign: "center" as const } },
          { content: a.patientName || "—", styles: { halign: "left" as const, fontStyle: "bold" as const } },
          { content: formatPdfMoney(a.amount), styles: { halign: "right" as const } },
          { content: a.remark || "—", styles: { halign: "left" as const } },
        ])
      : [
          [
            { content: "1", styles: { halign: "center" as const } },
            { content: "—" },
            { content: "Rs. 0", styles: { halign: "right" as const } },
            { content: "No admissions recorded" },
          ],
        ];

  autoTable(doc, {
    startY: curY,
    head: [
      [
        { content: "SL", styles: { halign: "center" } },
        { content: "PATIENT NAME", styles: { halign: "left" } },
        { content: "AMOUNT", styles: { halign: "right" } },
        { content: "REMARK", styles: { halign: "left" } },
      ],
    ],
    body: admBody,
    foot: [
      [
        { content: "TOTAL:", colSpan: 2, styles: { halign: "right", fontStyle: "bold" } },
        { content: formatPdfMoney(admTotal), styles: { halign: "right", fontStyle: "bold", textColor: "#15803d" } },
        { content: "" },
      ],
    ],
    theme: "plain",
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
      lineWidth: { bottom: 0.35 },
      lineColor: [148, 163, 184],
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [15, 23, 42],
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
    },
    footStyles: {
      fillColor: false,
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
      lineWidth: { top: 0.35 },
      lineColor: [148, 163, 184],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 32 },
      2: { cellWidth: 24, halign: "right" },
      3: { cellWidth: 24 },
    },
    margin: { left: 14, right: pageWidth - 14 - halfColWidth },
  });

  const admFinalY = (doc as any).lastAutoTable.finalY;

  // Discharge Rows
  const disTotal = discharges.reduce((s, d) => s + Number(d.amount || 0), 0);
  const disBody =
    discharges.length > 0
      ? discharges.map((d, i) => [
          { content: String(i + 1), styles: { halign: "center" as const } },
          { content: d.patientName || "—", styles: { halign: "left" as const, fontStyle: "bold" as const } },
          { content: formatPdfMoney(d.amount), styles: { halign: "right" as const } },
          { content: d.remark || "—", styles: { halign: "left" as const } },
        ])
      : [
          [
            { content: "1", styles: { halign: "center" as const } },
            { content: "—" },
            { content: "Rs. 0", styles: { halign: "right" as const } },
            { content: "No discharges recorded" },
          ],
        ];

  autoTable(doc, {
    startY: curY,
    head: [
      [
        { content: "SL", styles: { halign: "center" } },
        { content: "PATIENT NAME", styles: { halign: "left" } },
        { content: "AMOUNT", styles: { halign: "right" } },
        { content: "REMARK", styles: { halign: "left" } },
      ],
    ],
    body: disBody,
    foot: [
      [
        { content: "TOTAL:", colSpan: 2, styles: { halign: "right", fontStyle: "bold" } },
        { content: formatPdfMoney(disTotal), styles: { halign: "right", fontStyle: "bold", textColor: "#15803d" } },
        { content: "" },
      ],
    ],
    theme: "plain",
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
      lineWidth: { bottom: 0.35 },
      lineColor: [148, 163, 184],
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [15, 23, 42],
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
    },
    footStyles: {
      fillColor: false,
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
      lineWidth: { top: 0.35 },
      lineColor: [148, 163, 184],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 32 },
      2: { cellWidth: 24, halign: "right" },
      3: { cellWidth: 24 },
    },
    margin: { left: rightColX, right: 14 },
  });

  const disFinalY = (doc as any).lastAutoTable.finalY;
  curY = Math.max(admFinalY, disFinalY) + 6;

  // Section 2: Cash Detail Denominations (Left) & Reconciliation Summary (Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("CASH DETAIL (PHYSICAL DENOMINATIONS)", 14, curY);
  doc.text("SHIFT RECONCILIATION & HANDOVER SUMMARY", rightColX, curY);
  curY += 2.5;

  // Denominations breakdown
  const denomCalc = calculateDenominationsTotal(denoms);
  const denomRows = denomCalc.breakdown.map((b) => [
    { content: `${b.note}x`, styles: { halign: "center" as const, fontStyle: "bold" as const } },
    { content: formatNumber(b.count), styles: { halign: "center" as const } },
    { content: formatPdfMoney(b.total), styles: { halign: "right" as const } },
  ]);

  autoTable(doc, {
    startY: curY,
    head: [
      [
        { content: "NOTE", styles: { halign: "center" } },
        { content: "NUMBER", styles: { halign: "center" } },
        { content: "TOTAL", styles: { halign: "right" } },
      ],
    ],
    body: denomRows,
    foot: [
      [
        { content: "TOTAL", styles: { halign: "center", fontStyle: "bold" } },
        { content: formatNumber(denomCalc.totalCount), styles: { halign: "center", fontStyle: "bold" } },
        { content: formatPdfMoney(denomCalc.totalAmount), styles: { halign: "right", fontStyle: "bold", textColor: "#15803d" } },
      ],
    ],
    theme: "plain",
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
      lineWidth: { bottom: 0.35 },
      lineColor: [148, 163, 184],
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [15, 23, 42],
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
    },
    footStyles: {
      fillColor: false,
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
      lineWidth: { top: 0.35 },
      lineColor: [148, 163, 184],
    },
    columnStyles: {
      0: { cellWidth: 26, halign: "center" },
      1: { cellWidth: 26, halign: "center" },
      2: { cellWidth: 36, halign: "right" },
    },
    margin: { left: 14, right: pageWidth - 14 - halfColWidth },
  });

  const denomFinalY = (doc as any).lastAutoTable.finalY;

  // Handover Summary Box on Right
  const grandTotal = handover?.grandTotal ?? (Number(data.kpis.totalCollected || 0) + admTotal + disTotal);
  const expTotal = handover?.expenditure ?? totalExpenses;
  const onlinePayments = handover?.onlinePayments ?? handover?.cardSale ?? 0;
  const advHandover = handover?.advanceHandover ?? 0;
  const cashToHandover = handover?.cashToHandover ?? (grandTotal - expTotal - onlinePayments - advHandover);
  const actualCash = denomCalc.totalAmount;
  const diff = actualCash - cashToHandover;

  const onlineBreakdown = handover?.onlineBreakdown;
  const breakdownParts: string[] = [];
  if (onlineBreakdown) {
    if (onlineBreakdown.app > 0) breakdownParts.push(`App: ${formatPdfMoney(onlineBreakdown.app)}`);
    if (onlineBreakdown.card > 0) breakdownParts.push(`Card: ${formatPdfMoney(onlineBreakdown.card)}`);
    if (onlineBreakdown.upi > 0) breakdownParts.push(`UPI: ${formatPdfMoney(onlineBreakdown.upi)}`);
    if (onlineBreakdown.otherOnline && onlineBreakdown.otherOnline > 0) breakdownParts.push(`Other: ${formatPdfMoney(onlineBreakdown.otherOnline)}`);
  }
  const onlineSubtitle = breakdownParts.length > 0 ? `\n(${breakdownParts.join(" | ")})` : "";

  const summaryRows = [
    [{ content: "GRAND TOTAL -", styles: { fontStyle: "bold" as const } }, { content: formatPdfMoney(grandTotal), styles: { halign: "right" as const, fontStyle: "bold" as const } }],
    [{ content: "EXPENDITURE -", styles: {} }, { content: `- ${formatPdfMoney(expTotal)}`, styles: { halign: "right" as const, textColor: "#c2410c" } }],
    [{ content: `ONLINE / APP / CARD / UPI -${onlineSubtitle}`, styles: {} }, { content: `- ${formatPdfMoney(onlinePayments)}`, styles: { halign: "right" as const, textColor: "#2563eb" } }],
    [{ content: "ADV. HANDOVER -", styles: {} }, { content: `- ${formatPdfMoney(advHandover)}`, styles: { halign: "right" as const, textColor: "#7c3aed" } }],
    [{ content: "CASH TO HANDOVER -", styles: { fontStyle: "bold" as const, fontSize: 7.5 } }, { content: formatPdfMoney(cashToHandover), styles: { halign: "right" as const, fontStyle: "bold" as const, fontSize: 7.5, textColor: "#15803d" } }],
    [{ content: "PHYSICAL CASH COUNTED", styles: { fontStyle: "bold" as const } }, { content: formatPdfMoney(actualCash), styles: { halign: "right" as const, fontStyle: "bold" as const } }],
    [
      { content: "RECONCILIATION VARIANCE", styles: { fontStyle: "bold" as const } },
      {
        content: diff === 0 ? "EXACT MATCH (Balanced)" : diff > 0 ? `+ ${formatPdfMoney(diff)} (SURPLUS)` : `- ${formatPdfMoney(Math.abs(diff))} (SHORTAGE)`,
        styles: { halign: "right" as const, fontStyle: "bold" as const, textColor: diff === 0 ? "#15803d" : diff > 0 ? "#2563eb" : "#b91c1c" },
      },
    ],
  ];

  autoTable(doc, {
    startY: curY,
    head: [
      [
        { content: "PARTICULARS", styles: { halign: "left" } },
        { content: "AMOUNT (RS.)", styles: { halign: "right" } },
      ],
    ],
    body: summaryRows,
    theme: "plain",
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
      lineWidth: { bottom: 0.35 },
      lineColor: [148, 163, 184],
    },
    bodyStyles: {
      fontSize: 7,
      cellPadding: 1.8,
      textColor: [15, 23, 42],
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
    },
    columnStyles: {
      0: { cellWidth: 52 },
      1: { cellWidth: 36, halign: "right" },
    },
    margin: { left: rightColX, right: 14 },
  });

  const summaryFinalY = (doc as any).lastAutoTable.finalY;
  curY = Math.max(denomFinalY, summaryFinalY) + 8;

  // Signatures block
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(14, curY, pageWidth - 14, curY);
  curY += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  const handedByStr = sigs?.handedOverBy || data.preparedBy || "Staff";
  const receivedByStr = sigs?.receivedBy || "__________________________";
  doc.text(`Handed Over By:  ${handedByStr}`, 14, curY);
  doc.text(`Received By:  ${receivedByStr}`, 108, curY);

  if (sigs?.remarks) {
    curY += 5;
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Handover Remarks: ${sigs.remarks}`, 14, curY);
  }

  // -------------------------------------------------------------------------
  // Sheet 3+: Full Patient Visit Directory (Portrait Layout, Minimal Ink)
  // -------------------------------------------------------------------------
  doc.addPage();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Patient Visit Directory (${data.patients.length} Unique Patients)`, 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Shift: ${data.shiftLabel || "Full Day"}   |   Report Date: ${dateStr}   |   Sorted by Consultation Timing`, 14, 17.5);

  const patientRows = data.patients.map((p, idx) => {
    const consLines = p.consultations.map(
      (c) => `${visitTypeLabel(c.purpose)} (${c.doctor || "Dr"}) - ${c.dateText || "Date unavailable"}`
    );
    const procLines = p.procedures.map(
      (pr) => `[${pr.category}] ${pr.procedure} - ${pr.dateText || "Date unavailable"}`
    );
    const modes = [
      ...new Set([...p.consultations, ...p.procedures].map((x) => x.paymentMode).filter(Boolean)),
    ].join(", ");

    const discNotes = p.discountNotes && p.discountNotes.length > 0 ? ` (${p.discountNotes.join(", ")})` : "";
    const discText = p.totalDiscount > 0 ? `-${formatPdfMoney(p.totalDiscount)}${discNotes}` : "—";

    return [
      { content: String(idx + 1), styles: { halign: "center" as const } },
      { content: p.patientName || "Unknown Patient", styles: { halign: "left" as const, fontStyle: "bold" as const } },
      { content: p.patientUid || "No UID", styles: { halign: "center" as const } },
      { content: consLines.join("\n") || "—", styles: { halign: "left" as const } },
      { content: procLines.join("\n") || "—", styles: { halign: "left" as const } },
      { content: formatPdfMoney(p.totalBill), styles: { halign: "right" as const } },
      { content: discText, styles: { halign: "right" as const, textColor: "#7e22ce" } },
      { content: formatPdfMoney(p.totalCollected), styles: { halign: "right" as const, textColor: "#15803d" } },
      { content: formatPdfMoney(p.totalPending), styles: { halign: "right" as const, textColor: "#b91c1c" } },
      { content: modes || "—", styles: { halign: "left" as const } },
    ];
  });

  const patTotalBill = data.patients.reduce((s, p) => s + p.totalBill, 0);
  const patTotalDiscount = data.patients.reduce((s, p) => s + (p.totalDiscount || 0), 0);
  const patTotalCollected = data.patients.reduce((s, p) => s + p.totalCollected, 0);
  const patTotalPending = data.patients.reduce((s, p) => s + p.totalPending, 0);

  autoTable(doc, {
    startY: 20,
    head: [
      [
        { content: "Sr", styles: { halign: "center" } },
        { content: "Patient Name", styles: { halign: "left" } },
        { content: "UID", styles: { halign: "center" } },
        { content: "Consultation Details", styles: { halign: "left" } },
        { content: "Laboratory / Radiology", styles: { halign: "left" } },
        { content: "Bill (Rs.)", styles: { halign: "right" } },
        { content: "Discount (Rs.)", styles: { halign: "right" } },
        { content: "Collected (Rs.)", styles: { halign: "right" } },
        { content: "Pending (Rs.)", styles: { halign: "right" } },
        { content: "Payment Mode", styles: { halign: "left" } },
      ],
    ],
    body: patientRows,
    foot: [
      [
        { content: `Total (${data.patients.length} Patients)`, colSpan: 5, styles: { halign: "right", fontStyle: "bold" } },
        { content: formatPdfMoney(patTotalBill), styles: { halign: "right", fontStyle: "bold" } },
        { content: formatPdfMoney(patTotalDiscount), styles: { halign: "right", fontStyle: "bold", textColor: "#7e22ce" } },
        { content: formatPdfMoney(patTotalCollected), styles: { halign: "right", fontStyle: "bold", textColor: "#15803d" } },
        { content: formatPdfMoney(patTotalPending), styles: { halign: "right", fontStyle: "bold", textColor: "#b91c1c" } },
        { content: "", colSpan: 1 },
      ],
    ],
    theme: "plain",
    showHead: "everyPage",
    showFoot: "lastPage",
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
      lineWidth: { bottom: 0.35 },
      lineColor: [148, 163, 184],
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: [15, 23, 42],
      overflow: "linebreak",
      cellPadding: 1.8,
      valign: "top",
      lineWidth: { bottom: 0.1 },
      lineColor: [226, 232, 240],
    },
    footStyles: {
      fillColor: false,
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7,
      cellPadding: 2,
      lineWidth: { top: 0.35 },
      lineColor: [148, 163, 184],
    },
    columnStyles: {
      0: { cellWidth: 6, halign: "center" },
      1: { cellWidth: 24, halign: "left" },
      2: { cellWidth: 16, halign: "center" },
      3: { cellWidth: 34, halign: "left" },
      4: { cellWidth: 32, halign: "left" },
      5: { cellWidth: 15, halign: "right" },
      6: { cellWidth: 13, halign: "right" },
      7: { cellWidth: 15, halign: "right" },
      8: { cellWidth: 13, halign: "right" },
      9: { cellWidth: 14, halign: "left" },
    },
    margin: { left: 14, right: 14, top: 16, bottom: 12 },
  });

  // -------------------------------------------------------------------------
  // Page Numbers Footer on Every Page
  // -------------------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - 14,
      pageHeight - 5,
      { align: "right" }
    );
    const footerParts = [
      `ACME Fertility & Healthcare Centre — Front Office Report (${dateStr})`,
      data.shiftLabel ? `Shift: ${data.shiftLabel}` : "Shift: Full Day",
      data.preparedBy ? `Prepared By: ${data.preparedBy}` : null,
    ].filter(Boolean);

    doc.text(
      footerParts.join("  •  "),
      14,
      pageHeight - 5
    );
  }

  return doc;
}
