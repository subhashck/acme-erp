import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { toNum } from "@/utils/math";

export interface HospitalSettings {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxNumber?: string; // GSTIN
}

// Convert numbers to Indian English Words (Rupees and Paise)
export function numberToWordsIndian(amount: number): string {
  if (isNaN(amount) || amount === 0) return "Zero Rupees Only";

  const singleDigits = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function convertGroup(num: number): string {
    let str = "";
    if (num >= 100) {
      str += singleDigits[Math.floor(num / 100)] + " Hundred ";
      num %= 100;
    }
    if (num >= 20) {
      str += tens[Math.floor(num / 10)] + " ";
      num %= 10;
    }
    if (num > 0) {
      str += singleDigits[num] + " ";
    }
    return str.trim();
  }

  const [rupeesPart, paisePart] = Math.abs(amount).toFixed(2).split(".");
  let rupees = parseInt(rupeesPart, 10);
  const paise = parseInt(paisePart, 10);

  let result = "";

  const crore = Math.floor(rupees / 10000000);
  rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000);
  rupees %= 100000;
  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;
  const hundred = rupees;

  if (crore > 0) result += convertGroup(crore) + " Crore ";
  if (lakh > 0) result += convertGroup(lakh) + " Lakh ";
  if (thousand > 0) result += convertGroup(thousand) + " Thousand ";
  if (hundred > 0) result += convertGroup(hundred) + " ";

  result = result.trim();
  if (!result) result = "Zero";
  result = "Rupees " + result;

  if (paise > 0) {
    result += " and " + convertGroup(paise) + " Paise";
  }

  return result + " Only";
}

export function formatINR(val: number): string {
  return "Rs. " + Number(val || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function buildPurchaseOrderPDF(
  po: any,
  hospitalSettings?: HospitalSettings,
  userName?: string
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4", // 210 x 297 mm
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182 mm
  let currentY = 12;

  // Colors
  const primaryNavy = [15, 23, 42]; // #0f172a
  const secondarySlate = [51, 65, 85]; // #334155
  const mutedGray = [100, 116, 139]; // #64748b
  const lightBg = [248, 250, 252]; // #f8fafc
  const borderColor = [226, 232, 240]; // #e2e8f0
  const emeraldGreen = [16, 149, 93];

  // 1. Hospital / Organization Header
  const orgName = hospitalSettings?.name || "ACME HOSPITAL & RESEARCH CENTRE";
  const orgAddress = hospitalSettings?.address || "Medical Square, Healthcare Avenue, City Center";
  const orgPhone = hospitalSettings?.phone || "+91 98765 43210";
  const orgEmail = hospitalSettings?.email || "procurement@acmehospital.com";
  const orgGstin = hospitalSettings?.taxNumber || "27AABCA1234F1Z5";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text(orgName.toUpperCase(), pageWidth / 2, currentY, { align: "center" });
  currentY += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text(orgAddress, pageWidth / 2, currentY, { align: "center" });
  currentY += 4.2;

  const contactLine = `Phone: ${orgPhone}   |   Email: ${orgEmail}   |   GSTIN: ${orgGstin}`;
  doc.text(contactLine, pageWidth / 2, currentY, { align: "center" });
  currentY += 5;

  // Title Banner: PURCHASE ORDER
  doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.roundedRect(margin, currentY, contentWidth, 7, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("PURCHASE ORDER", pageWidth / 2, currentY + 4.8, { align: "center" });
  currentY += 10;

  // 2. PO Metadata and Vendor Box (Two Column Layout)
  const boxHeight = 32;
  const colWidth = (contentWidth - 4) / 2; // 89 mm each
  const leftBoxX = margin;
  const rightBoxX = margin + colWidth + 4;

  // Left Box: Vendor Details
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(leftBoxX, currentY, colWidth, boxHeight, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text("VENDOR / SUPPLIER DETAILS", leftBoxX + 4, currentY + 5);

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(leftBoxX + 4, currentY + 6.5, leftBoxX + colWidth - 4, currentY + 6.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text(po.vendorName || (po.vendor?.name) || "N/A", leftBoxX + 4, currentY + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);

  let vDetailsY = currentY + 15.5;
  if (po.vendor?.contactPerson) {
    doc.text(`Contact: ${po.vendor.contactPerson}`, leftBoxX + 4, vDetailsY);
    vDetailsY += 4;
  }
  if (po.vendor?.phone) {
    doc.text(`Phone: ${po.vendor.phone}`, leftBoxX + 4, vDetailsY);
    vDetailsY += 4;
  }
  if (po.vendor?.gstNumber) {
    doc.text(`GSTIN: ${po.vendor.gstNumber}`, leftBoxX + 4, vDetailsY);
    vDetailsY += 4;
  } else if (po.vendor?.address) {
    const splitAddr = doc.splitTextToSize(`Addr: ${po.vendor.address}`, colWidth - 8);
    doc.text(splitAddr.slice(0, 2), leftBoxX + 4, vDetailsY);
  }

  // Right Box: PO Details
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(rightBoxX, currentY, colWidth, boxHeight, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text("ORDER SUMMARY", rightBoxX + 4, currentY + 5);

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(rightBoxX + 4, currentY + 6.5, rightBoxX + colWidth - 4, currentY + 6.5);

  const poDateFormatted = po.poDate ? format(new Date(po.poDate), "dd MMM yyyy") : "-";

  doc.setFontSize(8);
  // Row 1: PO No
  doc.setFont("helvetica", "bold");
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  doc.text("PO Number:", rightBoxX + 4, currentY + 11);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text(po.poNo || "-", rightBoxX + 32, currentY + 11);

  // Row 2: PO Date
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  doc.text("PO Date:", rightBoxX + 4, currentY + 16);
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text(poDateFormatted, rightBoxX + 32, currentY + 16);

  // Row 3: PO Status
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  doc.text("PO Status:", rightBoxX + 4, currentY + 21);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text(String(po.poStatus || "OPEN").toUpperCase(), rightBoxX + 32, currentY + 21);

  // Row 4: Payment Status
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  doc.text("Payment:", rightBoxX + 4, currentY + 26);
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text(String(po.paymentStatus || "UNPAID").toUpperCase(), rightBoxX + 32, currentY + 26);

  currentY += boxHeight + 6;

  // 3. Line Items Table (jspdf-autotable)
  let subtotalAmount = 0;
  let totalGstAmount = 0;

  const tableBody = (po.items || []).map((item: any, index: number) => {
    const qty = toNum(item.orderedQty);
    const rate = toNum(item.unitRate);
    const gstPercent = toNum(item.gstPercent);
    const basicLineVal = qty * rate;
    const gstLineVal = basicLineVal * (gstPercent / 100);
    const totalLineVal = toNum(item.lineValue) || (basicLineVal + gstLineVal);

    subtotalAmount += basicLineVal;
    totalGstAmount += gstLineVal;

    return [
      String(index + 1),
      item.itemName || "Item",
      item.category || "-",
      item.unit || "Unit",
      String(qty),
      Number(rate).toFixed(2),
      `${gstPercent}%`,
      Number(gstLineVal).toFixed(2),
      Number(totalLineVal).toFixed(2),
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [
      [
        "#",
        "Item Description",
        "Category",
        "Unit",
        "Qty",
        "Rate (INR)",
        "GST %",
        "GST (INR)",
        "Line Total (INR)",
      ],
    ],
    body: tableBody,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 8 },
      1: { halign: "left", cellWidth: 52 },
      2: { halign: "left", cellWidth: 26 },
      3: { halign: "center", cellWidth: 16 },
      4: { halign: "right", cellWidth: 14, fontStyle: "bold" },
      5: { halign: "right", cellWidth: 18 },
      6: { halign: "right", cellWidth: 14 },
      7: { halign: "right", cellWidth: 16 },
      8: { halign: "right", cellWidth: 18, fontStyle: "bold" },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  const finalTableY = (doc as any).lastAutoTable?.finalY || (currentY + 40);
  currentY = finalTableY + 4;

  // Check if we need page break for summary & terms
  if (currentY > 230) {
    doc.addPage();
    currentY = 16;
  }

  // 4. Financial Totals Box
  const grandTotal = toNum(po.totalValue) || (subtotalAmount + totalGstAmount);
  const totalPaid = (po.payments || []).reduce((sum: number, p: any) => sum + toNum(p.amount), 0);
  const balanceDue = Math.max(0, grandTotal - totalPaid);

  const summaryWidth = 80;
  const summaryX = pageWidth - margin - summaryWidth;

  // Amount In Words (Left Column)
  const leftSummaryWidth = contentWidth - summaryWidth - 6;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(margin, currentY, leftSummaryWidth, 24, 1.5, 1.5, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  doc.text("AMOUNT IN WORDS:", margin + 3, currentY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  const words = numberToWordsIndian(grandTotal);
  const splitWords = doc.splitTextToSize(words, leftSummaryWidth - 6);
  doc.text(splitWords, margin + 3, currentY + 11);

  if (po.remarks) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
    const remarksText = doc.splitTextToSize(`Remarks: ${po.remarks}`, leftSummaryWidth - 6);
    doc.text(remarksText.slice(0, 2), margin + 3, currentY + 19);
  }

  // Summary Breakdown (Right Column)
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.roundedRect(summaryX, currentY, summaryWidth, 24, 1.5, 1.5, "FD");

  doc.setFontSize(8);
  // Basic Subtotal
  doc.setFont("helvetica", "normal");
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  doc.text("Taxable Subtotal:", summaryX + 4, currentY + 5.5);
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text(formatINR(subtotalAmount), summaryX + summaryWidth - 4, currentY + 5.5, { align: "right" });

  // Total GST
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  doc.text("Total GST Tax:", summaryX + 4, currentY + 10.5);
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text(formatINR(totalGstAmount), summaryX + summaryWidth - 4, currentY + 10.5, { align: "right" });

  // Divider
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(summaryX + 4, currentY + 12.5, summaryX + summaryWidth - 4, currentY + 12.5);

  // Grand Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
  doc.text("Grand Total:", summaryX + 4, currentY + 17.5);
  doc.text(formatINR(grandTotal), summaryX + summaryWidth - 4, currentY + 17.5, { align: "right" });

  if (totalPaid > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(emeraldGreen[0], emeraldGreen[1], emeraldGreen[2]);
    doc.text(`Paid: ${formatINR(totalPaid)}  |  Bal: ${formatINR(balanceDue)}`, summaryX + summaryWidth - 4, currentY + 22, { align: "right" });
  }

  currentY += 28;

  // 5. Payment & GRN History (If Present)
  if (po.payments && po.payments.length > 0) {
    if (currentY > 240) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text("Payment Transactions", margin, currentY);
    currentY += 2;

    const paymentRows = po.payments.map((p: any) => [
      p.paymentDate ? format(new Date(p.paymentDate), "dd/MM/yyyy") : "-",
      formatINR(toNum(p.amount)),
      String(p.paymentMode || "").toUpperCase(),
      p.referenceNo || "-",
      p.remarks || "-",
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [["Date", "Amount", "Mode", "Reference No / UTR", "Remarks"]],
      body: paymentRows,
      theme: "plain",
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [30, 41, 59],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      styles: { fontSize: 7, cellPadding: 1.8 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // 6. Terms & Conditions and Signature Blocks
  if (currentY > 240) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text("Terms & Conditions:", margin, currentY);
  currentY += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  const terms = [
    "1. Delivery must be strictly completed as per the agreed schedule to the destination hospital store.",
    "2. All pharmaceuticals/supplies must carry valid batch numbers and minimum 18 months shelf-life remaining.",
    "3. Mention this PO Number on all delivery challans, packages, and tax invoices for automated 3-way matching.",
  ];
  terms.forEach((t) => {
    doc.text(t, margin, currentY);
    currentY += 3.5;
  });

  currentY += 6;

  // Signature Block
  const sigY = currentY + 12;
  const colSigWidth = contentWidth / 3;

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.line(margin + 4, sigY, margin + colSigWidth - 4, sigY);
  doc.line(margin + colSigWidth + 4, sigY, margin + colSigWidth * 2 - 4, sigY);
  doc.line(margin + colSigWidth * 2 + 4, sigY, margin + contentWidth - 4, sigY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(secondarySlate[0], secondarySlate[1], secondarySlate[2]);
  doc.text("Prepared By", margin + colSigWidth / 2, sigY + 4, { align: "center" });
  doc.text("Store Pharmacist", margin + colSigWidth + colSigWidth / 2, sigY + 4, { align: "center" });
  doc.text("Authorized Signatory", margin + colSigWidth * 2 + colSigWidth / 2, sigY + 4, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
  doc.text(userName || "Procurement Dept", margin + colSigWidth / 2, sigY + 7.5, { align: "center" });
  doc.text("Acme Store", margin + colSigWidth + colSigWidth / 2, sigY + 7.5, { align: "center" });
  doc.text("Acme Hospital", margin + colSigWidth * 2 + colSigWidth / 2, sigY + 7.5, { align: "center" });

  // 7. Page numbering footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(mutedGray[0], mutedGray[1], mutedGray[2]);
    doc.line(margin, 287, pageWidth - margin, 287);
    doc.text(
      `Generated on ${format(new Date(), "dd/MM/yyyy hh:mm a")} • Acme ERP Hospital Procurement System`,
      margin,
      291
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, 291, { align: "right" });
  }

  return doc;
}

export function printPurchaseOrderPDF(
  po: any,
  hospitalSettings?: HospitalSettings,
  userName?: string
) {
  const doc = buildPurchaseOrderPDF(po, hospitalSettings, userName);
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(blobUrl, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }
}

export function downloadPurchaseOrderPDF(
  po: any,
  hospitalSettings?: HospitalSettings,
  userName?: string
) {
  const doc = buildPurchaseOrderPDF(po, hospitalSettings, userName);
  doc.save(`PO-${po.poNo || "PurchaseOrder"}.pdf`);
}
