import { jsPDF } from "jspdf";
// @ts-ignore
import XLSX from "xlsx-js-style";

export function exportClosingToPDF(report: any, categoriesList: any[], expCategoriesList: any[]) {
  const fmt = (num: number) => {
    const val = parseFloat(String(num)) || 0;
    const formatted = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(val));
    return val < 0 ? `-Rs. ${formatted}` : `Rs. ${formatted}`;
  };

  // Group service lines by department code dynamically (exactly like React UI)
  const reportCategoryCodes = new Set(report.serviceLines?.map((l: any) => l.department).filter(Boolean) as string[]);
  const allCategoryCodes = Array.from(new Set([
    ...categoriesList.map((c) => c.code),
    ...reportCategoryCodes
  ]));

  const displayedCategories = allCategoryCodes
    .map((code) => {
      const catObj = categoriesList.find((c) => c.code === code);
      const isCategoryActive = catObj ? catObj.active : false;
      const lines = report.serviceLines?.filter((l: any) => l.department === code && !l.isNightEntry) ?? [];
      const sortedLines = [...lines].sort((a: any, b: any) => {
        const orderA = a.sortOrder !== undefined && a.sortOrder !== null ? Number(a.sortOrder) : 999999;
        const orderB = b.sortOrder !== undefined && b.sortOrder !== null ? Number(b.sortOrder) : 999999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.serviceName || "").localeCompare(b.serviceName || "");
      });
      const total = sortedLines.reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0);
      const label = catObj ? catObj.label : code;
      const sortOrder = catObj ? catObj.sortOrder : 999999;

      return {
        code,
        label,
        active: isCategoryActive,
        lines: sortedLines,
        total,
        sortOrder,
      };
    })
    .filter((cat) => cat.lines.length > 0);

  const categoryIncomeTotal = displayedCategories.reduce((sum, cat) => sum + cat.total, 0);
  const nightServicesTotal = report.serviceLines?.filter((l: any) => l.isNightEntry).reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0) ?? 0;
  const nightLines = report.serviceLines?.filter((l: any) => l.isNightEntry) ?? [];
  const sortedNightLines = [...nightLines].sort((a: any, b: any) => {
    const orderA = a.sortOrder !== undefined && a.sortOrder !== null ? Number(a.sortOrder) : 999999;
    const orderB = b.sortOrder !== undefined && b.sortOrder !== null ? Number(b.sortOrder) : 999999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.serviceName || "").localeCompare(b.serviceName || "");
  });

  // Expenditures & Advances
  const expendituresTotal = report.expenditures?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  const expendituresByCategory = (report.expenditures || []).reduce((acc: any, item: any) => {
    if (!acc[item.category]) acc[item.category] = { category: item.category, total: 0, items: [] };
    acc[item.category].total += parseFloat(item.amount);
    acc[item.category].items.push(item);
    return acc;
  }, {});
  const groupedExpenditures = Object.values(expendituresByCategory).sort((a: any, b: any) => a.category.localeCompare(b.category));

  const staffAdvancesTotal = report.staffAdvances?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // IPD Admissions & Discharges
  const ipdAdmissionsTotal = report.ipdAdmissions?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;
  const ipdDischargesTotal = report.ipdDischarges?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // Additional Incomes
  const additionalIncomeTotal = report.additionalIncome?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // Discounts & Returns
  const discountsReturnsList = report.discountsReturns ?? [];
  const discountsTotal = discountsReturnsList.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // Recomputed Grand Totals
  const openingBalance = parseFloat(report.openingBalance) || 0;
  const totalIncome = categoryIncomeTotal + nightServicesTotal + ipdAdmissionsTotal + ipdDischargesTotal + additionalIncomeTotal - discountsTotal;
  const totalExpenditure = expendituresTotal + staffAdvancesTotal;
  const netBalance = totalIncome - totalExpenditure;

  const bankDeposit = parseFloat(report.bankDeposit) || 0;
  const handoverSir = parseFloat(report.fundHandoverSir) || 0;
  const handoverMadam = parseFloat(report.fundHandoverMadam) || 0;

  const bankDepositsList = (() => {
    if (report.bankDeposits) {
      try {
        const parsed = JSON.parse(report.bankDeposits);
        if (Array.isArray(parsed)) {
          return parsed.filter((item: any) => (parseFloat(item.amount) || 0) > 0);
        }
      } catch (e) {
        // ignore
      }
    }
    const total = parseFloat(report.bankDeposit) || 0;
    if (total > 0) {
      return [{ bankName: "Sir (ICICI)", amount: total }];
    }
    return [];
  })();

  const cashSir = parseFloat(report.cashReceiptSir) || 0;
  const cashMam = parseFloat(report.cashReceiptMam) || 0;
  const cashAcon = parseFloat(report.cashReceiptAcon) || 0;
  const bankReceiptSir = parseFloat(report.bankReceiptSir) || 0;
  const bankReceiptSirBank = report.bankReceiptSirBank || "";
  const cashReceipts = parseFloat(report.cashReceipts) || 0;
  const bankReceiptsTotal = parseFloat(report.bankReceiptsTotal) || 0;
  const closingBalance = parseFloat(report.closingBalance) || 0;

  const paymentChannelsTotal = bankReceiptsTotal + cashReceipts;
  const paymentChannelsListTotal = report.paymentChannels?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;
  const isReconciled = Math.abs(paymentChannelsTotal - totalIncome) < 1;

  // Initialize jsPDF
  const doc = new jsPDF("p", "mm", "a4");

  // Style constants
  const cTeal = [13, 148, 136];      // Slate-teal #0d9488
  const cTealDark = [15, 118, 110];  // Deep teal #0f766e
  const cTealLight = [240, 253, 250]; // Light teal #f0fdfa
  const cSlate = [15, 23, 42];        // #0f172a
  const cSlateLight = [71, 85, 105];  // #475569
  const cMuted = [100, 116, 139];    // #64748b
  const cBorder = [226, 232, 240];    // #e2e8f0
  const cBorderDark = [203, 213, 225]; // #cbd5e1
  const cRose = [225, 29, 72];        // #e11d48
  const cRoseLight = [255, 241, 242]; // #fff1f2
  const cRoseDark = [190, 24, 74];    // #be184a
  const cAmber = [217, 119, 6];       // #d97706
  const cAmberLight = [254, 243, 199]; // #fef3c7
  const cAmberDark = [180, 83, 9];    // #b45309
  const cEmerald = [16, 185, 129];    // #10b981
  const cEmeraldLight = [209, 250, 229]; // #d1fae5
  const cEmeraldDark = [4, 120, 87];   // #047857

  // Helper function to draw text
  const drawText = (text: string, x: number, y: number, size: number, style: "bold" | "normal" | "italic" | "oblique" = "normal", color: number[] = cSlate, align: "left" | "right" | "center" = "left") => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, x, y, { align });
  };

  // Helper to draw horizontal lines
  const drawHorizontalLine = (x1: number, x2: number, y: number, color: number[] = cBorder, width = 0.2) => {
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(width);
    doc.line(x1, y, x2, y);
  };

  // Page tracking and footers
  let currentPage = 1;
  const drawPageFooter = (pageNum: number) => {
    doc.setPage(pageNum);
    // Draw thin line above footer
    drawHorizontalLine(15, 195, 282, cBorder, 0.3);
    // Left text: report timestamp
    const dateStr = new Date(report.reportDate).toLocaleDateString([], { dateStyle: "long" });
    drawText(`Report generated on: ${new Date().toLocaleString()} | Statement for ${dateStr}`, 15, 287, 7, "normal", cMuted);
    // Right text: page numbers
    drawText(`Page ${pageNum}`, 195, 287, 7, "normal", cMuted, "right");
  };

  // Keep track of current y position
  let y = 15;

  const startNewPage = () => {
    doc.addPage();
    currentPage++;
    y = 20;
    drawHeader(false);
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > 275) {
      startNewPage();
    }
  };

  // Draw Page Header (premium vertical bar branding accent)
  const drawHeader = (isFirstPage = true) => {
    if (isFirstPage) {
      // Left vertical accent bar
      doc.setFillColor(cTeal[0], cTeal[1], cTeal[2]);
      doc.rect(15, y, 1.5, 9, "F");

      // Header title texts
      drawText("ACME FERTILITY & HEALTHCARE CENTRE", 18.5, y + 3, 11, "bold", cTealDark);
      drawText("DAILY CLOSING REPORT & FINANCIAL RECONCILIATION", 18.5, y + 7.5, 7.5, "bold", cSlateLight);
      drawHorizontalLine(15, 195, y + 11, cTeal, 0.3);
      y += 16;
    } else {
      doc.setFillColor(cTeal[0], cTeal[1], cTeal[2]);
      doc.rect(15, y, 1, 5, "F");

      drawText("ACME FERTILITY & HEALTHCARE CENTRE - DAILY CLOSING REPORT", 17.5, y + 3.8, 7.5, "bold", cTealDark);
      const dateStr = new Date(report.reportDate).toLocaleDateString([], { dateStyle: "medium" });
      drawText(`Report Date: ${dateStr.toUpperCase()}`, 195, y + 3.8, 7.5, "bold", cSlateLight, "right");
      drawHorizontalLine(15, 195, y + 6, cTeal, 0.2);
      y += 10;
    }
  };

  // Render First Page
  drawHeader(true);

  // Metadata Card
  checkPageBreak(25);
  doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
  doc.setFillColor(250, 252, 252);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, y, 180, 22, 2, 2, "FD");

  // Draw grid vertical lines
  drawHorizontalLine(85, 85, y + 3, cBorderDark, 0.2);
  doc.line(85, y + 3, 85, y + 19);
  doc.line(140, y + 3, 140, y + 19);

  const dateStrLong = new Date(report.reportDate).toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  drawText("STATEMENT DATE:", 20, y + 7, 7.5, "bold", cMuted);
  drawText(dateStrLong.toUpperCase(), 20, y + 14, 8.5, "bold", cSlate);

  drawText("CREATOR:", 90, y + 7, 7.5, "bold", cMuted);
  drawText(report.creatorName.toUpperCase(), 90, y + 14, 8.5, "bold", cSlate);

  drawText("STATUS:", 145, y + 7, 7.5, "bold", cMuted);
  
  // Status Badge fill
  const statusUpper = report.status.toUpperCase();
  let badgeBg = cMuted;
  let badgeText = [255, 255, 255];
  if (report.status === "draft") { badgeBg = cAmberLight; badgeText = cAmberDark; }
  else if (report.status === "submitted") { badgeBg = cEmeraldLight; badgeText = cEmeraldDark; }
  else if (report.status === "locked") { badgeBg = [241, 245, 249]; badgeText = cSlateLight; }

  doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2]);
  doc.roundedRect(145, y + 10, 35, 6, 1, 1, "F");
  drawText(statusUpper, 162.5, y + 14.2, 7.5, "bold", badgeText, "center");

  y += 28;

  // Discrepancy Banner (if applicable)
  if (!isReconciled) {
    checkPageBreak(20);
    doc.setFillColor(cRoseLight[0], cRoseLight[1], cRoseLight[2]);
    doc.setDrawColor(cRose[0], cRose[1], cRose[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(15, y, 180, 16, 2, 2, "FD");

    drawText("RECONCILIATION MISMATCH DETECTED!", 20, y + 6, 8.5, "bold", cRoseDark);
    drawText(`Channel Sum: ${fmt(paymentChannelsTotal)} | Net Revenue: ${fmt(totalIncome)} | Mismatch: ${fmt(Math.abs(paymentChannelsTotal - totalIncome))}`, 20, y + 11, 7.5, "normal", cSlateLight);
    y += 22;
  }

  // Summary Card Box (Dual Column) - Dynamic Height Calculation
  const leftItemsCount = (nightServicesTotal > 0 ? 1 : 0) + displayedCategories.length + (discountsTotal > 0 ? 1 : 0) + 6;
  const leftH = 12 + leftItemsCount * 5.5 + 4;

  const rightItemsCount = 1 + (cashSir > 0 ? 1 : 0) + (cashMam > 0 ? 1 : 0) + (cashAcon > 0 ? 1 : 0) + (bankReceiptSir > 0 ? 1 : 0) + 5;
  const rightH = 12 + rightItemsCount * 5.5 + 4;

  const innerH = Math.max(leftH, rightH);
  const cardH = 15 + innerH + 22;

  checkPageBreak(cardH + 10);
  const cardY = y;
  
  doc.setFillColor(cTealLight[0], cTealLight[1], cTealLight[2]);
  doc.setDrawColor(cTeal[0], cTeal[1], cTeal[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(15, cardY, 180, cardH, 3, 3, "FD");

  // Title
  drawText("CLOSING STATEMENT SUMMARY", 22, cardY + 8, 9.5, "bold", cTealDark);
  drawHorizontalLine(22, 188, cardY + 11, cTeal, 0.3);

  // Column A: Income & Expenditure (left)
  const colX1 = 22;
  const colW1 = 80;
  const colA_Y = cardY + 15;

  // Column A container
  doc.setFillColor(230, 250, 246); // bg-teal-500/10 slightly darker for readability
  doc.roundedRect(colX1, colA_Y, colW1, innerH, 2, 2, "F");
  drawText("INCOME AND EXPENDITURE", colX1 + 4, colA_Y + 6, 8, "bold", cTealDark);
  drawHorizontalLine(colX1 + 4, colX1 + colW1 - 4, colA_Y + 8, cTeal, 0.2);

  let itemY = colA_Y + 13.5;
  if (nightServicesTotal > 0) {
    drawText("Night / After-EOD Services", colX1 + 4, itemY, 7.5, "normal", cSlate);
    drawText(fmt(nightServicesTotal), colX1 + colW1 - 4, itemY, 7.5, "bold", cSlate, "right");
    itemY += 5.5;
  }
  displayedCategories.forEach((cat) => {
    drawText(cat.label, colX1 + 4, itemY, 7.5, "normal", cSlate);
    drawText(fmt(cat.total), colX1 + colW1 - 4, itemY, 7.5, "bold", cSlate, "right");
    itemY += 5.5;
  });
  if (discountsTotal > 0) {
    drawText("Less: Discounts/Returns", colX1 + 4, itemY, 7.5, "normal", cRoseDark);
    drawText(`-${fmt(discountsTotal)}`, colX1 + colW1 - 4, itemY, 7.5, "bold", cRoseDark, "right");
    itemY += 5.5;
  }

  // Divider and Total Income
  drawHorizontalLine(colX1 + 4, colX1 + colW1 - 4, itemY - 1, cMuted, 0.15);
  drawText("Total Income:", colX1 + 4, itemY + 3.5, 7.5, "bold", cTealDark);
  drawText(fmt(totalIncome), colX1 + colW1 - 4, itemY + 3.5, 7.5, "bold", cTealDark, "right");

  drawText("  Cash Receipts", colX1 + 4, itemY + 8.5, 7, "italic", cSlateLight);
  drawText(fmt(cashReceipts), colX1 + colW1 - 4, itemY + 8.5, 7, "normal", cSlateLight, "right");

  drawText("  Bank Receipts", colX1 + 4, itemY + 12.5, 7, "italic", cSlateLight);
  drawText(fmt(bankReceiptsTotal), colX1 + colW1 - 4, itemY + 12.5, 7, "normal", cSlateLight, "right");

  // Expenditure
  drawText("Total Expenditures:", colX1 + 4, itemY + 18.5, 7.5, "bold", cRoseDark);
  drawText(`-${fmt(totalExpenditure)}`, colX1 + colW1 - 4, itemY + 18.5, 7.5, "bold", cRoseDark, "right");

  drawHorizontalLine(colX1 + 4, colX1 + colW1 - 4, itemY + 21, cMuted, 0.15);
  drawText("Net Gross Balance:", colX1 + 4, itemY + 25.5, 8, "bold", cSlate);
  drawText(fmt(netBalance), colX1 + colW1 - 4, itemY + 25.5, 8, "bold", cSlate, "right");


  // Column B: Cash Management (right)
  const colX2 = 108;
  const colW2 = 80;
  const colB_Y = cardY + 15;

  // Column B container
  doc.setFillColor(254, 252, 220); // bg-amber-200/10 slightly darker for readability
  doc.roundedRect(colX2, colB_Y, colW2, innerH, 2, 2, "F");
  drawText("CASH MANAGEMENT", colX2 + 4, colB_Y + 6, 8, "bold", cAmberDark);
  drawHorizontalLine(colX2 + 4, colX2 + colW2 - 4, colB_Y + 8, cAmber, 0.2);

  itemY = colB_Y + 13.5;
  drawText("Opening Balance:", colX2 + 4, itemY, 7.5, "normal", cSlate);
  drawText(fmt(openingBalance), colX2 + colW2 - 4, itemY, 7.5, "bold", cSlate, "right");
  itemY += 5.5;

  drawText("Cash Receipt (Sir):", colX2 + 4, itemY, 7.5, "normal", cSlate);
  drawText(fmt(cashSir), colX2 + colW2 - 4, itemY, 7.5, "normal", cSlate, "right");
  itemY += 5.5;

  drawText("Cash Receipt (Mam):", colX2 + 4, itemY, 7.5, "normal", cSlate);
  drawText(fmt(cashMam), colX2 + colW2 - 4, itemY, 7.5, "normal", cSlate, "right");
  itemY += 5.5;

  drawText("Cash Receipt (Acon):", colX2 + 4, itemY, 7.5, "normal", cSlate);
  drawText(fmt(cashAcon), colX2 + colW2 - 4, itemY, 7.5, "normal", cSlate, "right");
  itemY += 5.5;

  if (bankReceiptSir > 0) {
    drawText(`Bank Receipt (Sir) [${bankReceiptSirBank}]`, colX2 + 4, itemY, 7, "normal", cSlate);
    drawText(fmt(bankReceiptSir), colX2 + colW2 - 4, itemY, 7, "normal", cSlate, "right");
    itemY += 5.5;
  }

  drawText("Add Cash Income Receipts:", colX2 + 4, itemY, 7.5, "normal", cSlate);
  drawText(fmt(cashReceipts), colX2 + colW2 - 4, itemY, 7.5, "normal", cSlate, "right");
  itemY += 5.5;

  drawText("Less Cash Expenditure:", colX2 + 4, itemY, 7.5, "normal", cRoseDark);
  drawText(`-${fmt(expendituresTotal)}`, colX2 + colW2 - 4, itemY, 7.5, "normal", cRoseDark, "right");
  itemY += 5.5;

  drawText("Less Bank Deposit:", colX2 + 4, itemY, 7.5, "normal", cRoseDark);
  drawText(`-${fmt(bankDeposit)}`, colX2 + colW2 - 4, itemY, 7.5, "normal", cRoseDark, "right");
  itemY += 5.5;

  drawText("Handover (Sir):", colX2 + 4, itemY, 7.5, "normal", cRoseDark);
  drawText(`-${fmt(handoverSir)}`, colX2 + colW2 - 4, itemY, 7.5, "normal", cRoseDark, "right");
  itemY += 5.5;

  drawText("Handover (Madam):", colX2 + 4, itemY, 7.5, "normal", cRoseDark);
  drawText(`-${fmt(handoverMadam)}`, colX2 + colW2 - 4, itemY, 7.5, "normal", cRoseDark, "right");

  // Calculated Closing & Reconciliation Check Badge
  const checkY = cardY + 15 + innerH + 4;
  
  // Wrap Calculated Closing in a premium card box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(cBorderDark[0], cBorderDark[1], cBorderDark[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(colX2, checkY, colW2, 16, 2, 2, "FD");
  drawText("Calculated Closing", colX2 + 4, checkY + 6, 7.5, "bold", cMuted);
  drawText(fmt(closingBalance), colX2 + colW2 - 4, checkY + 12, 9.5, "bold", cTealDark, "right");

  // Reconciliation Check Badge
  const badgeX = colX1;
  const badgeW = colW1;
  let recBg = cEmeraldLight;
  let recBorder = cEmerald;
  let recText = cEmeraldDark;
  let recTitle = "RECONCILIATION SUCCESSFUL";
  let recSub = `Channel sum equals Net revenues exactly.`;

  if (!isReconciled) {
    recBg = cRoseLight;
    recBorder = cRose;
    recText = cRoseDark;
    recTitle = "RECONCILIATION MISMATCH";
    recSub = `Diff: ${fmt(Math.abs(paymentChannelsTotal - totalIncome))}`;
  }

  doc.setFillColor(recBg[0], recBg[1], recBg[2]);
  doc.setDrawColor(recBorder[0], recBorder[1], recBorder[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(badgeX, checkY, badgeW, 16, 2, 2, "FD");

  drawText(recTitle, badgeX + 4, checkY + 6.2, 7.5, "bold", recText);
  drawText(recSub, badgeX + 4, checkY + 12, 7, "normal", cSlateLight);

  y += cardH + 10;

  // Detail sheets on page 2
  startNewPage();

  // Helper to draw a section header in details sheet
  const drawDetailSectionHeader = (title: string) => {
    checkPageBreak(15);
    drawText(title, 15, y, 9.5, "bold", cTealDark);
    drawHorizontalLine(15, 195, y + 2, cTeal, 0.4);
    y += 8;
  };

  // Helper to draw a Panel header (darker header background for modern clean UI feel)
  const drawPanelHeader = (title: string, amountStr: string, borderCol = cBorderDark, bgCol = [241, 245, 249]) => {
    checkPageBreak(14);
    doc.setFillColor(bgCol[0], bgCol[1], bgCol[2]);
    doc.setDrawColor(borderCol[0], borderCol[1], borderCol[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(15, y, 180, 8, 1.5, 1.5, "FD");
    drawText(title.toUpperCase(), 18.5, y + 5.5, 7.5, "bold", cSlate);
    drawText(amountStr, 191.5, y + 5.5, 8, "bold", cSlate, "right");
    y += 8;
  };

  // Helper to draw table rows with clean spacing and truncation
  const drawTableRow = (col1: string, col2: string, col3: string, isHeader = false) => {
    checkPageBreak(6);
    const truncate = (str: string, limit = 55) => {
      if (str.length > limit) return str.substring(0, limit - 3) + "...";
      return str;
    };
    
    if (isHeader) {
      drawText(col1, 18.5, y + 4, 7, "bold", cMuted);
      drawText(col2, 120, y + 4, 7, "bold", cMuted, "center");
      drawText(col3, 191.5, y + 4, 7, "bold", cMuted, "right");
      drawHorizontalLine(15, 195, y + 6, [203, 213, 225], 0.3);
      y += 8;
    } else {
      drawText(truncate(col1), 18.5, y + 4, 7.5, "normal", cSlate);
      drawText(col2, 120, y + 4, 7, "normal", cMuted, "center");
      drawText(col3, 191.5, y + 4, 7.5, "bold", cSlate, "right");
      drawHorizontalLine(15, 195, y + 6, [226, 232, 240], 0.2);
      y += 6;
    }
  };

  // 1. Income Streams
  drawDetailSectionHeader("1. INCOME STREAMS");

  // Opening Balance panel
  drawPanelHeader("To Balance B/f (Opening Balance)", fmt(openingBalance));
  y += 3; // Panel spacer

  // Night Services panel
  if (nightServicesTotal > 0) {
    drawPanelHeader("Night / After-EOD Services", fmt(nightServicesTotal));
    drawTableRow("Service Rendered", "Quantity / Rate", "Amount", true);
    sortedNightLines.forEach((line: any) => {
      const rateText = parseFloat(line.rate) > 0 ? `${line.quantity} × ${fmt(line.rate)}` : `${line.quantity} qty`;
      const nameWithNarration = line.narration ? `${line.serviceName} (${line.narration.replace(/\n/g, " ")})` : line.serviceName;
      drawTableRow(nameWithNarration, rateText, fmt(parseFloat(line.amount)));
    });
    y += 4;
  }

  // Dynamic Categories Services Panels
  displayedCategories.forEach((cat) => {
    drawPanelHeader(cat.label, fmt(cat.total));
    drawTableRow("Service Rendered", "Quantity / Rate", "Amount", true);
    cat.lines.forEach((line: any) => {
      const rateText = parseFloat(line.rate) > 0 ? `${line.quantity} × ${fmt(line.rate)}` : `${line.quantity} qty`;
      const nameWithNarration = line.narration ? `${line.serviceName} (${line.narration.replace(/\n/g, " ")})` : line.serviceName;
      drawTableRow(nameWithNarration, rateText, fmt(parseFloat(line.amount)));
    });
    y += 4;
  });

  // IPD Admissions Panel
  if (report.ipdAdmissions?.length > 0) {
    drawPanelHeader("IPD Admissions / Advances", fmt(ipdAdmissionsTotal));
    drawTableRow("Patient Name", "Admission Type", "Amount", true);
    report.ipdAdmissions.forEach((item: any) => {
      drawTableRow(item.patientName, item.type, fmt(parseFloat(item.amount)));
    });
    y += 4;
  }

  // IPD Discharges Panel
  if (report.ipdDischarges?.length > 0) {
    drawPanelHeader("IPD Discharges", fmt(ipdDischargesTotal));
    drawTableRow("Patient Name", "", "Amount", true);
    report.ipdDischarges.forEach((item: any) => {
      drawTableRow(item.patientName, "", fmt(parseFloat(item.amount)));
    });
    y += 4;
  }

  // Additional Incomes Panel
  if (report.additionalIncome?.length > 0) {
    drawPanelHeader("Additional Incomes (Add)", fmt(additionalIncomeTotal));
    drawTableRow("Income Particulars", "", "Amount", true);
    report.additionalIncome.forEach((item: any) => {
      drawTableRow(item.label, "", fmt(parseFloat(item.amount)));
    });
    y += 4;
  }

  // Discounts Panel
  if (discountsReturnsList.length > 0) {
    drawPanelHeader("Discounts & Returns", "-" + fmt(discountsTotal), cRose, cRoseLight);
    drawTableRow("Particulars", "", "Amount", true);
    discountsReturnsList.forEach((item: any) => {
      drawTableRow(item.label, "", "-" + fmt(parseFloat(item.amount)));
    });
    y += 4;
  }

  // Total Income Panel
  checkPageBreak(12);
  doc.setFillColor(cTealLight[0], cTealLight[1], cTealLight[2]);
  doc.setDrawColor(cTeal[0], cTeal[1], cTeal[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(15, y, 180, 8, 1, 1, "FD");
  drawText("TOTAL STATEMENT INCOME", 18.5, y + 5.5, 7.5, "bold", cTealDark);
  drawText(fmt(totalIncome), 191.5, y + 5.5, 8.5, "bold", cTealDark, "right");
  y += 14;


  // 2. Expenditures & Advances
  drawDetailSectionHeader("2. EXPENDITURES & ADVANCES");

  // Expenditures Panel
  drawPanelHeader("Expenditures (Out Flow)", fmt(expendituresTotal));
  if (groupedExpenditures.length === 0) {
    checkPageBreak(10);
    drawText("No logged expenditures.", 18.5, y + 5, 7.5, "italic", cMuted);
    y += 8;
  } else {
    groupedExpenditures.forEach((group: any) => {
      const catLabel = expCategoriesList.find((c: any) => c.code === group.category)?.label || group.category;
      
      // Draw subpanel header line
      checkPageBreak(12);
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(18, y, 174, 6, 1, 1, "F");
      drawText(catLabel.toUpperCase(), 22, y + 4.2, 7, "bold", cSlateLight);
      drawText(fmt(group.total), 188, y + 4.2, 7, "bold", cRoseDark, "right");
      y += 8;

      group.items.forEach((item: any) => {
        checkPageBreak(6);
        const detailsWithNarration = item.narration ? `${item.details} (${item.narration.replace(/\n/g, " ")})` : item.details;
        drawText(detailsWithNarration, 22, y + 4, 7, "normal", cSlate);
        drawText(fmt(parseFloat(item.amount)), 188, y + 4, 7, "bold", cSlate, "right");
        drawHorizontalLine(18, 192, y + 6, [226, 232, 240], 0.2);
        y += 6;
      });
      y += 2;
    });
  }
  y += 2;

  // Staff Advances Panel
  if (report.staffAdvances?.length > 0) {
    drawPanelHeader("Staff Advances", fmt(staffAdvancesTotal));
    drawTableRow("Staff Member", "", "Amount", true);
    report.staffAdvances.forEach((item: any) => {
      drawTableRow(item.staffName, "", fmt(parseFloat(item.amount)));
    });
    y += 4;
  }

  // Total Expenditure Panel
  checkPageBreak(12);
  doc.setFillColor(cRoseLight[0], cRoseLight[1], cRoseLight[2]);
  doc.setDrawColor(cRose[0], cRose[1], cRose[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(15, y, 180, 8, 1, 1, "FD");
  drawText("TOTAL STATEMENT EXPENDITURE", 18.5, y + 5.5, 7.5, "bold", cRoseDark);
  drawText(fmt(totalExpenditure), 191.5, y + 5.5, 8.5, "bold", cRoseDark, "right");
  y += 14;


  // 3. Channel Reconciliation
  drawDetailSectionHeader("3. CHANNEL RECONCILIATION");

  // Payment channel collection panel
  drawPanelHeader("Payment Channel Collections", fmt(paymentChannelsListTotal));
  if (!report.paymentChannels || report.paymentChannels.length === 0) {
    checkPageBreak(10);
    drawText("No logged payment channels.", 18.5, y + 5, 7.5, "italic", cMuted);
    y += 8;
  } else {
    drawTableRow("Channel / Bank", "Transaction Source", "Amount", true);
    report.paymentChannels.forEach((item: any) => {
      checkPageBreak(8);
      drawText(item.channel, 18.5, y + 3.5, 7.5, "bold", cSlate);
      drawText(item.bank ? item.bank.toUpperCase() : "CASH", 18.5, y + 7, 6.5, "bold", cMuted);
      
      drawText(item.sourceLabel || "", 120, y + 5, 7, "normal", cMuted, "center");
      drawText(fmt(parseFloat(item.amount)), 191.5, y + 5, 7.5, "bold", cSlate, "right");
      
      drawHorizontalLine(15, 195, y + 8.5, [226, 232, 240], 0.2);
      y += 10;
    });
  }
  y += 3;

  // Bank Deposits & Handovers details Panel
  drawPanelHeader("Bank Deposits & Handovers Breakdown", "");
  
  const drawBreakdownRow = (label: string, amountVal: number, isNegative = false, extraDetails = "") => {
    checkPageBreak(6);
    drawText(label, 18.5, y + 4, 7.5, "normal", cSlate);
    if (extraDetails) {
      drawText(`[${extraDetails}]`, 85, y + 4, 7, "italic", cMuted);
    }
    const color = isNegative ? cRoseDark : cEmeraldDark;
    const sign = isNegative ? "-" : "";
    drawText(`${sign}${fmt(Math.abs(amountVal))}`, 191.5, y + 4, 7.5, "bold", color, "right");
    drawHorizontalLine(15, 195, y + 6, [226, 232, 240], 0.2);
    y += 6;
  };

  if (bankReceiptSir > 0) {
    drawBreakdownRow("Bank Receipt (Sir)", bankReceiptSir, false, bankReceiptSirBank);
  }
  if (cashSir > 0) {
    drawBreakdownRow("Cash Receipt (Sir)", cashSir);
  }
  if (cashMam > 0) {
    drawBreakdownRow("Cash Receipt (Mam)", cashMam);
  }
  if (cashAcon > 0) {
    drawBreakdownRow("Cash Receipt (Acon)", cashAcon);
  }

  // Deposits list
  if (bankDepositsList.length > 0) {
    bankDepositsList.forEach((dep) => {
      drawBreakdownRow(`Less Deposit: ${dep.bankName}`, dep.amount, true);
    });
  } else if (bankDeposit > 0) {
    drawBreakdownRow("Less Bank Deposit", bankDeposit, true);
  }

  if (handoverSir > 0) {
    drawBreakdownRow("Fund Handover Sir", handoverSir, true);
  }
  if (handoverMadam > 0) {
    drawBreakdownRow("Fund Handover Madam", handoverMadam, true);
  }
  y += 3;

  // 4. Cash Denominations & Soiled Notes Section
  const CASH_DENOMS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
  const denomsObj = (() => {
    if (!report.cashDenominations) return {};
    if (typeof report.cashDenominations === "string") {
      try { return JSON.parse(report.cashDenominations); } catch { return {}; }
    }
    return report.cashDenominations as Record<string, number>;
  })();
  const totalPhysicalCashPDF = CASH_DENOMS.reduce((sum, d) => {
    const count = Number(denomsObj[d] || denomsObj[String(d)] || 0);
    return sum + count * d;
  }, 0) + Number(report.soiledNotes || 0);
  const activeDenomCounts = CASH_DENOMS.filter((d) => Number(denomsObj[d] || denomsObj[String(d)] || 0) > 0);

  if (activeDenomCounts.length > 0 || report.soiledNotes) {
    y += 2;
    drawDetailSectionHeader("4. CASH DENOMINATIONS & SOILED NOTES");
    drawPanelHeader("Physical Cash Denominations Tally", fmt(totalPhysicalCashPDF));

    drawTableRow("Denomination Note/Coin", "Count", "Subtotal Amount", true);
    activeDenomCounts.forEach((d) => {
      const count = Number(denomsObj[d] || denomsObj[String(d)] || 0);
      const subtotal = count * d;
      drawTableRow(`Rs. ${d} ${d >= 10 ? "Note" : "Coin"}`, `${count} pcs`, fmt(subtotal));
    });
    if (report.soiledNotes) {
      drawTableRow("Soiled Notes Amount", "-", fmt(Number(report.soiledNotes)));
    }
    y += 2;
  }

  // Reconciled check box at the end
  checkPageBreak(25);
  doc.setFillColor(recBg[0], recBg[1], recBg[2]);
  doc.setDrawColor(recBorder[0], recBorder[1], recBorder[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(15, y, 180, 16, 2, 2, "FD");

  drawText("STATEMENT RECONCILIATION SUMMARY", 20, y + 6, 8, "bold", recText);
  drawText(`Calculated Closing: ${fmt(closingBalance)}  |  Channel Collections: ${fmt(paymentChannelsTotal)}  |  Net Daily Income: ${fmt(totalIncome)}`, 20, y + 11, 7, "normal", cSlateLight);


  // Apply footers dynamically on all generated pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    drawPageFooter(i);
  }

  // Save the PDF
  const reportDateStr = new Date(report.reportDate).toISOString().split("T")[0];
  doc.save(`daily-closing-report-${reportDateStr}.pdf`);
}

export function exportClosingToExcel(report: any, categoriesList: any[], expCategoriesList: any[]) {
  const fmt = (num: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num);

  // Group service lines by department code dynamically
  const reportCategoryCodes = new Set(report.serviceLines?.filter((l: any) => !l.isNightEntry).map((l: any) => l.department).filter(Boolean) as string[]);
  const allCategoryCodes = Array.from(new Set([
    ...categoriesList.map((c) => c.code),
    ...reportCategoryCodes
  ]));

  const displayedCategories = allCategoryCodes
    .map((code) => {
      const catObj = categoriesList.find((c) => c.code === code);
      const isCategoryActive = catObj ? catObj.active : false;
      const lines = report.serviceLines?.filter((l: any) => l.department === code && !l.isNightEntry) ?? [];
      const total = lines.reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0);
      const label = catObj ? catObj.label : code;
      const sortOrder = catObj ? catObj.sortOrder : 999999;

      return {
        code,
        label,
        active: isCategoryActive,
        lines,
        total,
        sortOrder,
      };
    })
    .filter((cat) => cat.lines.length > 0);

  const categoryIncomeTotal = displayedCategories.reduce((sum, cat) => sum + cat.total, 0);

  // Expenditures & Advances
  const expendituresTotal = report.expenditures?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  const expendituresByCategory = (report.expenditures || []).reduce((acc: any, item: any) => {
    if (!acc[item.category]) acc[item.category] = { category: item.category, total: 0, items: [] };
    acc[item.category].total += parseFloat(item.amount);
    acc[item.category].items.push(item);
    return acc;
  }, {});
  const groupedExpenditures = Object.values(expendituresByCategory).sort((a: any, b: any) => a.category.localeCompare(b.category));

  const staffAdvancesTotal = report.staffAdvances?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // IPD Admissions & Discharges
  const ipdAdmissionsTotal = report.ipdAdmissions?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;
  const ipdDischargesTotal = report.ipdDischarges?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // Additional Incomes
  const additionalIncomeTotal = report.additionalIncome?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // Discounts & Returns
  const discountsReturnsList = report.discountsReturns ?? [];
  const discountsTotal = discountsReturnsList.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // Night Services
  const nightServicesTotal = report.serviceLines?.filter((l: any) => l.isNightEntry).reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0) ?? 0;

  // Recomputed Grand Totals
  const openingBalance = parseFloat(report.openingBalance) || 0;
  const totalIncome = categoryIncomeTotal + nightServicesTotal + ipdAdmissionsTotal + ipdDischargesTotal + additionalIncomeTotal - discountsTotal;
  const totalExpenditure = expendituresTotal + staffAdvancesTotal;

  const bankDeposit = parseFloat(report.bankDeposit) || 0;
  const handoverSir = parseFloat(report.fundHandoverSir) || 0;
  const handoverMadam = parseFloat(report.fundHandoverMadam) || 0;

  // Reconciled Payment Channels
  const cashSir = parseFloat(report.cashReceiptSir) || 0;
  const cashMam = parseFloat(report.cashReceiptMam) || 0;
  const cashAcon = parseFloat(report.cashReceiptAcon) || 0;
  const bankReceiptSir = parseFloat(report.bankReceiptSir) || 0;
  const bankReceiptSirBank = report.bankReceiptSirBank || "";
  const cashReceipts = parseFloat(report.cashReceipts) || 0;
  const bankReceiptsTotal = parseFloat(report.bankReceiptsTotal) || 0;
  const closingBalance = parseFloat(report.closingBalance) || 0;

  const paymentChannelsTotal = bankReceiptsTotal + cashReceipts;
  const isReconciled = Math.abs(paymentChannelsTotal - totalIncome) < 1;

  const wb = XLSX.utils.book_new();

  const rows: any[] = [];

  const styleHeader = {
    font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "0F766E" } },
    alignment: { horizontal: "center", vertical: "center" }
  };

  const styleSection = {
    font: { name: "Calibri", sz: 12, bold: true, color: { rgb: "0F766E" } },
    fill: { fgColor: { rgb: "F0FDF4" } }
  };

  const styleBold = {
    font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "0F172A" } }
  };

  const styleRegular = {
    font: { name: "Calibri", sz: 10, color: { rgb: "334155" } }
  };

  const styleItalic = {
    font: { name: "Calibri", sz: 9, italic: true, color: { rgb: "64748B" } }
  };

  const styleNumber = {
    font: { name: "Calibri", sz: 10, color: { rgb: "334155" } },
    alignment: { horizontal: "right" },
    numFmt: '"₹"#,##0.00'
  };

  const styleBoldNumber = {
    font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "0F172A" } },
    alignment: { horizontal: "right" },
    numFmt: '"₹"#,##0.00'
  };

  const sheetStyles: { [key: string]: any } = {};

  const addRow = (cellValues: any[], cellStyles: any[]) => {
    const rowIndex = rows.length;
    rows.push(cellValues);
    cellValues.forEach((val, colIndex) => {
      const colLetter = String.fromCharCode(65 + colIndex);
      const cellRef = `${colLetter}${rowIndex + 1}`;
      let style = cellStyles[colIndex];

      // Color-code column D (colIndex === 3) if it is a number
      if (colIndex === 3 && typeof val === "number" && val !== 0) {
        const isPositive = val > 0;
        style = {
          ...style,
          font: {
            ...style?.font,
            color: { rgb: isPositive ? "15803D" : "B91C1C" } // Green-700 / Red-700
          }
        };
      }

      if (style) {
        sheetStyles[cellRef] = style;
      }
    });
  };

  // Title Block
  addRow(["ACME FERTILITY & HEALTHCARE CENTRE", "", "", ""], [styleHeader, null, null, null]);
  addRow(["Daily Closing & Financial Reconciliation Report", "", "", ""], [{ font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "0F766E" } } }, null, null, null]);
  addRow(["", "", "", ""], []);

  // Metadata
  addRow(["Report Date:", report.reportDate, "Status:", report.status.toUpperCase()], [styleBold, styleRegular, styleBold, styleRegular]);
  addRow(["Creator:", report.creatorName, "Reconciled:", isReconciled ? "YES" : "NO"], [styleBold, styleRegular, styleBold, styleRegular]);
  addRow(["", "", "", ""], []);

  // 1. Income Streams
  addRow(["1. INCOME STREAMS", "", "", ""], [styleSection, null, null, null]);
  addRow(["Item Description", "", "Quantity/Details", "Amount"], [styleBold, null, styleBold, styleBoldNumber]);

  addRow(["Opening Balance B/f", "", "", openingBalance], [styleRegular, null, styleRegular, styleNumber]);

  if (nightServicesTotal > 0) {
    addRow(["Night / After-EOD Services", "", "", nightServicesTotal], [styleBold, null, styleRegular, styleNumber]);
    report.serviceLines?.filter((l: any) => l.isNightEntry).forEach((line: any) => {
      const details = parseFloat(line.rate) > 0 ? `${line.quantity} × ${fmt(line.rate)}` : `${line.quantity} qty`;
      const nameWithNarration = line.narration ? `  - ${line.serviceName} (${line.narration.replace(/\n/g, " ")})` : `  - ${line.serviceName}`;
      addRow([nameWithNarration, "", details, line.amount], [styleItalic, null, styleItalic, styleNumber]);
    });
  }

  displayedCategories.forEach((cat: any) => {
    addRow([cat.label, "", "", cat.total], [styleBold, null, styleRegular, styleNumber]);
    cat.lines.forEach((line: any) => {
      const details = parseFloat(line.rate) > 0 ? `${line.quantity} × ${fmt(line.rate)}` : `${line.quantity} qty`;
      const nameWithNarration = line.narration ? `  - ${line.serviceName} (${line.narration.replace(/\n/g, " ")})` : `  - ${line.serviceName}`;
      addRow([nameWithNarration, "", details, line.amount], [styleItalic, null, styleItalic, styleNumber]);
    });
  });

  if (report.ipdAdmissions?.length > 0) {
    addRow(["IPD Admissions / Advances", "", "", ipdAdmissionsTotal], [styleBold, null, styleRegular, styleNumber]);
    report.ipdAdmissions.forEach((item: any) => {
      addRow([`  - ${item.patientName}`, "", item.type, item.amount], [styleItalic, null, styleItalic, styleNumber]);
    });
  }

  if (report.ipdDischarges?.length > 0) {
    addRow(["IPD Discharges", "", "", ipdDischargesTotal], [styleBold, null, styleRegular, styleNumber]);
  }

  if (report.additionalIncome?.length > 0) {
    addRow(["Additional Incomes", "", "", additionalIncomeTotal], [styleBold, null, styleRegular, styleNumber]);
  }



  if (discountsTotal > 0) {
    addRow(["Less: Discounts & Returns", "", "", -discountsTotal], [styleRegular, null, styleRegular, styleNumber]);
  }

  addRow(["TOTAL INCOME", "", "", totalIncome], [styleBold, null, null, styleBoldNumber]);
  addRow(["", "", "", ""], []);

  // 2. Expenditures & Advances
  addRow(["2. EXPENDITURES & ADVANCES", "", "", ""], [styleSection, null, null, null]);
  addRow(["Item Description", "", "Details", "Amount"], [styleBold, null, styleBold, styleBoldNumber]);

  groupedExpenditures.forEach((group: any) => {
    const catLabel = expCategoriesList.find((c: any) => c.code === group.category)?.label || group.category;
    addRow([catLabel, "", "", group.total], [styleBold, null, styleRegular, styleNumber]);
    group.items.forEach((item: any) => {
      const detailsWithNarration = item.narration ? `  - ${item.details} (${item.narration.replace(/\n/g, " ")})` : `  - ${item.details}`;
      addRow([detailsWithNarration, "", "", item.amount], [styleItalic, null, styleItalic, styleNumber]);
    });
  });

  if (staffAdvancesTotal > 0) {
    addRow(["Staff Advances", "", "", staffAdvancesTotal], [styleBold, null, styleRegular, styleNumber]);
    report.staffAdvances.forEach((item: any) => {
      addRow([`  - ${item.staffName}`, "", "", item.amount], [styleItalic, null, styleItalic, styleNumber]);
    });
  }

  addRow(["TOTAL EXPENDITURE", "", "", totalExpenditure], [styleBold, null, null, styleBoldNumber]);
  addRow(["", "", "", ""], []);

  // 3. Cash Management & Reconciliation
  addRow(["3. CASH MANAGEMENT", "", "", ""], [styleSection, null, null, null]);
  addRow(["Cash Component", "", "Details", "Amount"], [styleBold, null, styleBold, styleBoldNumber]);

  addRow(["Opening Balance", "", "", openingBalance], [styleRegular, null, styleRegular, styleNumber]);
  addRow(["Cash Receipt (Sir)", "", "", cashSir], [styleRegular, null, styleRegular, styleNumber]);
  addRow(["Cash Receipt (Mam)", "", "", cashMam], [styleRegular, null, styleRegular, styleNumber]);
  addRow(["Cash Receipt (Acon)", "", "", cashAcon], [styleRegular, null, styleRegular, styleNumber]);
  if (bankReceiptSir > 0) {
    addRow([`Bank Receipt (Sir) [${bankReceiptSirBank || "N/A"}]`, "", "", bankReceiptSir], [styleRegular, null, styleRegular, styleNumber]);
  }
  addRow(["Add Cash Income Receipts (Channels)", "", "", cashReceipts], [styleRegular, null, styleRegular, styleNumber]);
  addRow(["Less Cash Expenditures", "", "", -expendituresTotal], [styleRegular, null, styleRegular, styleNumber]);
  addRow(["Less Bank Deposit", "", "", -bankDeposit], [styleRegular, null, styleRegular, styleNumber]);
  try {
    const parsed = JSON.parse(report.bankDeposits || "[]");
    if (Array.isArray(parsed)) {
      parsed.filter((item: any) => (parseFloat(item.amount) || 0) > 0).forEach((item: any) => {
        addRow([`  - ${item.bankName}`, "", "", -parseFloat(item.amount)], [styleItalic, null, styleItalic, styleNumber]);
      });
    }
  } catch (e) {
    // ignore
  }
  addRow(["Handover (Sir)", "", "", -handoverSir], [styleRegular, null, styleRegular, styleNumber]);
  addRow(["Handover (Madam)", "", "", -handoverMadam], [styleRegular, null, styleRegular, styleNumber]);

  addRow(["CALCULATED CLOSING BALANCE", "", "", closingBalance], [styleBold, null, null, styleBoldNumber]);
  addRow(["", "", "", ""], []);

  addRow(["RECONCILIATION SUMMARY", "", "", ""], [styleSection, null, null, null]);
  addRow(["Payment Channel Sum:", "", "", paymentChannelsTotal], [styleBold, null, null, styleBoldNumber]);
  addRow(["Net Daily Revenues:", "", "", totalIncome], [styleBold, null, null, styleBoldNumber]);
  addRow(["Reconciliation Mismatch:", "", "", Math.abs(paymentChannelsTotal - totalIncome)], [styleBold, null, null, styleBoldNumber]);
  addRow(["", "", "", ""], []);

  // 4. Cash Denominations & Soiled Notes
  const CASH_DENOMS_XL = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
  const denomsObjXL = (() => {
    if (!report.cashDenominations) return {};
    if (typeof report.cashDenominations === "string") {
      try { return JSON.parse(report.cashDenominations); } catch { return {}; }
    }
    return report.cashDenominations as Record<string, number>;
  })();
  const totalPhysicalCashXL = CASH_DENOMS_XL.reduce((sum, d) => {
    const count = Number(denomsObjXL[d] || denomsObjXL[String(d)] || 0);
    return sum + count * d;
  }, 0) + Number(report.soiledNotes || 0);
  const activeDenomsXL = CASH_DENOMS_XL.filter((d) => Number(denomsObjXL[d] || denomsObjXL[String(d)] || 0) > 0);

  if (activeDenomsXL.length > 0 || report.soiledNotes) {
    addRow(["4. CASH DENOMINATIONS & SOILED NOTES", "", "", ""], [styleSection, null, null, null]);
    addRow(["Currency Denomination", "", "Count", "Subtotal Amount"], [styleBold, null, styleBold, styleBoldNumber]);

    activeDenomsXL.forEach((d) => {
      const count = Number(denomsObjXL[d] || denomsObjXL[String(d)] || 0);
      const subtotal = count * d;
      addRow([`₹${d} (${d >= 10 ? "Note" : "Coin"})`, "", `${count} pcs`, subtotal], [styleItalic, null, styleItalic, styleNumber]);
    });

    if (report.soiledNotes) {
      addRow(["Soiled Notes Amount", "", "-", Number(report.soiledNotes)], [styleItalic, null, styleItalic, styleNumber]);
    }

    addRow(["TOTAL PHYSICAL CASH TALLY", "", "", totalPhysicalCashXL], [styleBold, null, null, styleBoldNumber]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  Object.keys(sheetStyles).forEach((cellRef) => {
    if (ws[cellRef]) {
      ws[cellRef].s = sheetStyles[cellRef];
    }
  });

  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }
  ];

  ws["!cols"] = [
    { wch: 35 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Daily Closing Report");
  XLSX.writeFile(wb, `daily-closing-report-${report.reportDate}.xlsx`);
}
