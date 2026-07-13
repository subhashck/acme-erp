import { jsPDF } from "jspdf";
// @ts-ignore
import XLSX from "xlsx-js-style";

export function exportClosingToPDF(report: any, categoriesList: any[], expCategoriesList: any[]) {
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

  const doc = new jsPDF("p", "mm", "a4");

  // Header Background banner
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 210, 40, "F");

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("ACME FERTILITY & HEALTHCARE CENTRE", 15, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Daily Closing Report & Financial Reconciliation", 15, 23);

  // Metadata Row
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const dateStr = new Date(report.reportDate).toLocaleDateString([], { dateStyle: "long" });
  doc.text(`REPORT DATE: ${dateStr.toUpperCase()}`, 15, 33);
  doc.text(`CREATOR: ${report.creatorName.toUpperCase()}`, 95, 33);
  doc.text(`STATUS: ${report.status.toUpperCase()}`, 165, 33);

  let y = 52;

  const checkPageBreak = (neededSpace = 10) => {
    if (y + neededSpace > 280) {
      doc.addPage();
      y = 20;
    }
  };

  const drawSectionHeader = (title: string) => {
    checkPageBreak(15);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 118, 110);
    doc.text(title, 15, y);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;
  };

  const drawRow = (leftText: string, rightText: string, isBold = false, indent = 0) => {
    checkPageBreak(8);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(9);
    doc.setTextColor(isBold ? 15 : 71, isBold ? 23 : 85, isBold ? 42 : 105);
    doc.text(leftText, 15 + indent, y);
    doc.text(rightText, 195, y, { align: "right" });
    y += 6;
  };

  // 1. Income Streams
  drawSectionHeader("1. INCOME STREAMS");
  drawRow("To Balance B/f (Opening Balance)", fmt(openingBalance));

  displayedCategories.forEach((cat: any) => {
    drawRow(cat.label, fmt(cat.total));
    cat.lines.forEach((line: any) => {
      checkPageBreak(6);
      doc.setFont("helvetica", "oblique");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`- ${line.serviceName} (${line.quantity} × ${fmt(line.rate)})`, 20, y);
      doc.text(fmt(line.amount), 195, y, { align: "right" });
      y += 5;
    });
  });

  if (report.ipdAdmissions?.length > 0) {
    drawRow("IPD Admissions / Advances", fmt(ipdAdmissionsTotal));
    report.ipdAdmissions.forEach((item: any) => {
      checkPageBreak(6);
      doc.setFont("helvetica", "oblique");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`- ${item.patientName} (${item.type})`, 20, y);
      doc.text(fmt(item.amount), 195, y, { align: "right" });
      y += 5;
    });
  }

  if (report.ipdDischarges?.length > 0) {
    drawRow("IPD Discharges", fmt(ipdDischargesTotal));
  }

  if (report.additionalIncome?.length > 0) {
    drawRow("Additional Incomes", fmt(additionalIncomeTotal));
  }

  if (nightServicesTotal > 0) {
    drawRow("Night / After-EOD Services", fmt(nightServicesTotal));
    report.serviceLines?.filter((l: any) => l.isNightEntry).forEach((line: any) => {
      checkPageBreak(6);
      doc.setFont("helvetica", "oblique");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`- ${line.serviceName} (${line.quantity} × ${fmt(line.rate)})`, 20, y);
      doc.text(fmt(line.amount), 195, y, { align: "right" });
      y += 5;
    });
  }

  if (discountsTotal > 0) {
    drawRow("Less: Discounts & Returns", `-${fmt(discountsTotal)}`);
  }

  y += 2;
  checkPageBreak(8);
  doc.setDrawColor(203, 213, 225);
  doc.line(15, y - 1, 195, y - 1);
  drawRow("TOTAL INCOME", fmt(totalIncome), true);
  y += 4;

  // 2. Expenditures & Advances
  drawSectionHeader("2. EXPENDITURES & ADVANCES");

  groupedExpenditures.forEach((group: any) => {
    const catLabel = expCategoriesList.find((c: any) => c.code === group.category)?.label || group.category;
    drawRow(catLabel, fmt(group.total));
    group.items.forEach((item: any) => {
      checkPageBreak(6);
      doc.setFont("helvetica", "oblique");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`- ${item.details}`, 20, y);
      doc.text(fmt(item.amount), 195, y, { align: "right" });
      y += 5;
    });
  });

  if (staffAdvancesTotal > 0) {
    drawRow("Staff Advances", fmt(staffAdvancesTotal));
    report.staffAdvances.forEach((item: any) => {
      checkPageBreak(6);
      doc.setFont("helvetica", "oblique");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`- ${item.staffName}`, 20, y);
      doc.text(fmt(item.amount), 195, y, { align: "right" });
      y += 5;
    });
  }

  y += 2;
  checkPageBreak(8);
  doc.setDrawColor(203, 213, 225);
  doc.line(15, y - 1, 195, y - 1);
  drawRow("TOTAL EXPENDITURE", fmt(totalExpenditure), true);
  y += 4;

  // 3. Cash Management & Closing
  drawSectionHeader("3. CASH MANAGEMENT");
  drawRow("Opening Balance", fmt(openingBalance));
  drawRow("Cash Receipt (Sir)", fmt(cashSir));
  drawRow("Cash Receipt (Mam)", fmt(cashMam));
  drawRow("Cash Receipt (Acon)", fmt(cashAcon));
  if (bankReceiptSir > 0) {
    drawRow(`Bank Receipt (Sir) [${bankReceiptSirBank || "N/A"}]`, fmt(bankReceiptSir));
  }
  drawRow("Add Cash Income Receipts (Payment Channels)", fmt(cashReceipts));
  drawRow("Less Cash Expenditures", `-${fmt(expendituresTotal)}`);
  drawRow("Less Bank Deposit", `-${fmt(bankDeposit)}`);
  try {
    const parsed = JSON.parse(report.bankDeposits || "[]");
    if (Array.isArray(parsed)) {
      parsed.filter((item: any) => (parseFloat(item.amount) || 0) > 0).forEach((item: any) => {
        drawRow(`  - ${item.bankName}`, `-${fmt(parseFloat(item.amount))}`);
      });
    }
  } catch (e) {
    // ignore
  }
  drawRow("Handover (Sir)", `-${fmt(handoverSir)}`);
  drawRow("Handover (Madam)", `-${fmt(handoverMadam)}`);

  y += 2;
  checkPageBreak(8);
  doc.setDrawColor(203, 213, 225);
  doc.line(15, y - 1, 195, y - 1);
  drawRow("CALCULATED CLOSING BALANCE", fmt(closingBalance), true);
  y += 6;

  // Reconciliation Check
  checkPageBreak(30);
  doc.setFillColor(isReconciled ? 240 : 254, isReconciled ? 253 : 242, isReconciled ? 250 : 242);
  doc.setDrawColor(isReconciled ? 15 : 225, isReconciled ? 118 : 29, isReconciled ? 110 : 72);
  doc.rect(15, y, 180, 22, "FD");

  doc.setTextColor(isReconciled ? 15 : 153, isReconciled ? 118 : 27, isReconciled ? 110 : 27);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`RECONCILIATION: ${isReconciled ? "SUCCESSFUL" : "MISMATCH DETECTED"}`, 20, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Payment Channel Sum: ${fmt(paymentChannelsTotal)}`, 20, y + 12);
  doc.text(`Net Daily Revenues: ${fmt(totalIncome)}`, 20, y + 17);
  if (!isReconciled) {
    doc.setTextColor(225, 29, 72);
    doc.text(`Mismatch Amount: ${fmt(Math.abs(paymentChannelsTotal - totalIncome))}`, 110, y + 12);
  }

  doc.save(`daily-closing-report-${report.reportDate}.pdf`);
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
      addRow([`  - ${line.serviceName}`, "", `${line.quantity} × ${fmt(line.rate)}`, line.amount], [styleItalic, null, styleItalic, styleNumber]);
    });
  }

  displayedCategories.forEach((cat: any) => {
    addRow([cat.label, "", "", cat.total], [styleBold, null, styleRegular, styleNumber]);
    cat.lines.forEach((line: any) => {
      addRow([`  - ${line.serviceName}`, "", `${line.quantity} × ${fmt(line.rate)}`, line.amount], [styleItalic, null, styleItalic, styleNumber]);
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
      addRow([`  - ${item.details}`, "", "", item.amount], [styleItalic, null, styleItalic, styleNumber]);
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
