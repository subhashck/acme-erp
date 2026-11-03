import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { formatCollegePaymentMode } from "./college-payment";

export interface CollegeReceiptItem {
  category?: string;
  description: string;
  periodLabel?: string;
  selectedMonths?: string[];
  quantity?: number;
  unitPrice?: number;
  baseAmount?: number;
  discountType?: "flat" | "percent";
  discountPercent?: number | null;
  discountAmount?: number;
  discountReason?: string | null;
  discountPerMonth?: number;
  surchargeType?: "flat" | "percent";
  surchargePercent?: number | null;
  surchargeAmount?: number;
  surchargeReason?: string | null;
  surchargePerMonth?: number;
  netUnitPrice?: number;
  amount: number;
}

export interface CollegeReceiptData {
  id?: number;
  receiptNumber: string;
  invoiceNo?: string;
  paymentDate: string;
  paymentMode: string;
  amount: number | string;
  feeType?: string;
  studentId?: number | null;
  studentName?: string | null;
  enrollmentNo?: string | null;
  studentCourse?: string | null;
  batchName?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  remarks?: any;
}

export function parseReceiptRemarks(remarks: unknown): any {
  if (!remarks) return null;
  if (typeof remarks === "object") return remarks;
  if (typeof remarks === "string") {
    try {
      return JSON.parse(remarks);
    } catch {
      return null;
    }
  }
  return null;
}

export function parseMonthTokens(input: unknown): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.flatMap((x) => String(x).split(",").map((s) => s.trim())).filter(Boolean);
  }
  return String(input).split(",").map((s) => s.trim()).filter(Boolean);
}

export function formatMonthToken(token: string): { short: string; full: string } {
  const trimmed = token.trim();
  // Format: "October 2026" or "Oct 2026"
  const match = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (match) {
    const mon = match[1].slice(0, 3);
    const yr = match[2].slice(-2);
    return { short: `${mon} '${yr}`, full: trimmed };
  }
  // Format: "2026-10"
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})$/);
  if (isoMatch) {
    const date = new Date(Date.UTC(Number(isoMatch[1]), Number(isoMatch[2]) - 1, 1));
    const mon = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    const yr = isoMatch[1].slice(-2);
    return {
      short: `${mon} '${yr}`,
      full: date.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    };
  }
  return { short: trimmed, full: trimmed };
}

export function buildCollegeReceiptPDFDoc(
  tx: CollegeReceiptData,
  cashierName?: string
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5",
  });

  const parsed = parseReceiptRemarks(tx.remarks);
  const isStudent = !!tx.studentId || parsed?.recipientType === "student";
  const recipientName =
    tx.studentName ||
    parsed?.studentName ||
    parsed?.recipientName ||
    tx.recipientName ||
    "Student / Payee";
  const enrollmentNo =
    tx.enrollmentNo ||
    parsed?.studentEnrollmentNo ||
    parsed?.enrollmentNo ||
    "";
  const courseName =
    tx.studentCourse ||
    parsed?.studentCourse ||
    parsed?.courseName ||
    "";
  const recipientPhone =
    parsed?.recipientPhone ||
    tx.recipientPhone ||
    "";

  const primaryCategory =
    parsed?.category ||
    tx.feeType ||
    "Fee Payment";

  const narration = parsed?.narration || "";
  const notes = parsed?.notes || (typeof tx.remarks === "string" ? tx.remarks : "");
  const totalAmount = Number(tx.amount || 0);

  // Extract items
  let items: CollegeReceiptItem[] = [];
  if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
    items = parsed.items.map((it: any) => {
      const selectedMonths = Array.isArray(it.selectedMonths) ? it.selectedMonths : [];
      const periodLabel =
        it.periodLabel ||
        (selectedMonths.length > 0 ? selectedMonths.join(", ") : (it.frequency || undefined));
      const quantity = Number(it.quantity || it.multiplier || 1);
      const amount = Number(it.amount || 0);
      const unitPrice = Number(
        it.unitPrice || (quantity > 1 ? Math.round(amount / quantity) : amount)
      );

      return {
        category: it.category || it.name || primaryCategory,
        description: it.description || it.name || primaryCategory,
        periodLabel: periodLabel || undefined,
        selectedMonths: selectedMonths.length > 0 ? selectedMonths : undefined,
        quantity,
        unitPrice,
        amount,
      };
    });
  } else if (Array.isArray(parsed?.breakdown) && parsed.breakdown.length > 0) {
    items = parsed.breakdown.map((it: any) => ({
      category: it.name || primaryCategory,
      description: it.name || primaryCategory,
      periodLabel: it.frequency || undefined,
      quantity: 1,
      unitPrice: Number(it.amount || 0),
      amount: Number(it.amount || 0),
    }));
  } else {
    items = [
      {
        category: primaryCategory,
        description: narration || primaryCategory,
        periodLabel: parsed?.periodLabel || (Array.isArray(parsed?.selectedMonths) && parsed.selectedMonths.length > 0 ? parsed.selectedMonths.join(", ") : undefined),
        selectedMonths: parsed?.selectedMonths,
        quantity: 1,
        unitPrice: totalAmount,
        amount: totalAmount,
      },
    ];
  }

  // Top Banner (Teal 600)
  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, 148, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ACME COLLEGE OF NURSING", 10, 9);

  const isAdvanceReceipt = parsed?.isSeatBookingAdvance || tx.feeType?.toLowerCase().includes("seat booking");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(isAdvanceReceipt ? "SEAT BOOKING ADVANCE PAYMENT RECEIPT" : "OFFICIAL FEE & PAYMENT RECEIPT", 10, 15);

  const receiptNo = tx.receiptNumber || tx.invoiceNo || "REC-NUR";
  const paymentDate = tx.paymentDate || format(new Date(), "yyyy-MM-dd");
  const paymentMode = formatCollegePaymentMode(tx.paymentMode);

  doc.setFontSize(7.5);
  doc.text(`Receipt No: ${receiptNo}`, 138, 9, { align: "right" });
  doc.text(`Payment Date: ${paymentDate}`, 138, 15, { align: "right" });

  // Recipient Details Grid
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8);

  let metaY = 27;
  const labelX = 10;
  const valueX = 38;
  const lineSpacing = 4.2;

  // Row 1: Student / Recipient Name
  doc.setFont("helvetica", "bold");
  doc.text(isStudent ? "Student Name:" : "Received From:", labelX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(recipientName, valueX, metaY);
  metaY += lineSpacing;

  // Row 2: Enrollment No & Course (if student) or Phone
  if (isStudent && (enrollmentNo || courseName)) {
    doc.setFont("helvetica", "bold");
    doc.text(isAdvanceReceipt ? "Application No:" : "Course / Roll:", labelX, metaY);
    doc.setFont("helvetica", "normal");
    const courseText = isAdvanceReceipt
      ? (enrollmentNo || "N/A")
      : [courseName, enrollmentNo ? `Roll: ${enrollmentNo}` : ""].filter(Boolean).join(" | ");
    doc.text(courseText, valueX, metaY);
    metaY += lineSpacing;
  } else if (recipientPhone) {
    doc.setFont("helvetica", "bold");
    doc.text("Contact Phone:", labelX, metaY);
    doc.setFont("helvetica", "normal");
    doc.text(recipientPhone, valueX, metaY);
    metaY += lineSpacing;
  }

  // Row 3: Academic Session (if available)
  const academicYear = parsed?.academicYear || parsed?.periodDetails?.academicYear || "";
  if (academicYear) {
    doc.setFont("helvetica", "bold");
    doc.text("Academic Session:", labelX, metaY);

    const sessText = `AY ${academicYear}`;
    doc.setFillColor(240, 253, 250); // Teal 50
    doc.setDrawColor(13, 148, 136); // Teal 600
    doc.setLineWidth(0.2);
    doc.roundedRect(valueX, metaY - 3.2, 22, 4.4, 0.8, 0.8, "FD");

    doc.setTextColor(13, 148, 136);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(sessText, valueX + 2, metaY - 0.2);

    metaY += lineSpacing + 0.5;
  }

  // Row 4: Payment Mode & Reference
  doc.setFont("helvetica", "bold");
  doc.text("Payment Mode:", labelX, metaY);
  doc.setFont("helvetica", "normal");
  const refText = parsed?.referenceNo ? ` (Ref: ${parsed.referenceNo})` : "";
  doc.text(`${paymentMode}${refText}`, valueX, metaY);
  metaY += lineSpacing + 1.5;

  // Check if any item has covered months or period details
  const hasCoveredMonths =
    items.some((it) => !!(it.periodLabel || (it.selectedMonths && it.selectedMonths.length > 0))) ||
    !!(parsed?.selectedMonths && parsed.selectedMonths.length > 0) ||
    !!parsed?.periodDetails?.periodSummary;

  const tableData = hasCoveredMonths
    ? items.map((it, idx) => {
        const monthsText =
          it.periodLabel ||
          (it.selectedMonths && it.selectedMonths.length > 0 ? it.selectedMonths.join(", ") : "") ||
          (items.length === 1 && parsed?.selectedMonths && parsed.selectedMonths.length > 0
            ? parsed.selectedMonths.join(", ")
            : "-");

        let particulars = it.description || it.category || "Fee Component";
        if (monthsText && monthsText !== "-") {
          const stripped = particulars.replace(
            /\s*\([^)]*(?:January|February|March|April|May|June|July|August|September|October|November|December|Semester|Quarter|AY|20\d\d)[^)]*\)$/i,
            ""
          ).trim();
          if (stripped) particulars = stripped;
        }

        const tokens = parseMonthTokens(
          it.selectedMonths && it.selectedMonths.length > 0
            ? it.selectedMonths
            : (it.periodLabel || monthsText)
        ).filter((t) => t !== "-");

        const numBoxRows = Math.max(1, Math.ceil(tokens.length / 2));
        const monthCell = tokens.length > 0
          ? {
              content: tokens.map((t) => formatMonthToken(t).short).join("  "),
              styles: { minCellHeight: Math.max(7, numBoxRows * 5.6 + 2) },
            }
          : { content: "-" };

        const discAmt = Number(it.discountAmount || 0);
        const surAmt = Number(it.surchargeAmount || 0);
        const discPerMo = Number(it.discountPerMonth || (discAmt > 0 ? Math.round(discAmt / Math.max(1, Number(it.quantity || 1))) : 0));
        const surPerMo = Number(it.surchargePerMonth || (surAmt > 0 ? Math.round(surAmt / Math.max(1, Number(it.quantity || 1))) : 0));
        const displayRate = (discAmt > 0 || surAmt > 0) && it.netUnitPrice
          ? Number(it.netUnitPrice)
          : Number(it.unitPrice || 0);

        return [
          String(idx + 1),
          particulars,
          monthCell,
          String(it.quantity || 1),
          `INR ${displayRate.toLocaleString()}`,
          `INR ${Number(it.amount || 0).toLocaleString()}`,
        ];
      })
    : items.map((it, idx) => {
        const discAmt = Number(it.discountAmount || 0);
        const surAmt = Number(it.surchargeAmount || 0);
        const displayRate = (discAmt > 0 || surAmt > 0) && it.netUnitPrice
          ? Number(it.netUnitPrice)
          : Number(it.unitPrice || 0);
        return [
          String(idx + 1),
          it.description || it.category || "Fee Component",
          String(it.quantity || 1),
          `INR ${displayRate.toLocaleString()}`,
          `INR ${Number(it.amount || 0).toLocaleString()}`,
        ];
      });

  autoTable(doc, {
    startY: metaY,
    margin: { left: 10, right: 10 },
    head: hasCoveredMonths
      ? [["#", "Particulars / Fee Head", "Covered Month(s)", "Qty", "Rate/Mo", "Amount"]]
      : [["#", "Particulars / Description", "Qty", "Rate", "Amount"]],
    body: tableData as any,
    theme: "striped",
    headStyles: {
      fillColor: [13, 148, 136],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: hasCoveredMonths
      ? {
          0: { cellWidth: 7, halign: "center" as const },
          1: { cellWidth: 50 },
          2: { cellWidth: 37 },
          3: { cellWidth: 8, halign: "center" as const },
          4: { cellWidth: 13, halign: "right" as const },
          5: { cellWidth: 13, halign: "right" as const },
        }
      : {
          0: { cellWidth: 8, halign: "center" as const },
          1: { cellWidth: 68 },
          2: { cellWidth: 12, halign: "center" as const },
          3: { cellWidth: 20, halign: "right" as const },
          4: { cellWidth: 20, halign: "right" as const },
        },
    willDrawCell: (data) => {
      if (hasCoveredMonths && data.section === "body" && data.column.index === 2) {
        const item = items[data.row.index];
        const tokens = parseMonthTokens(
          item?.selectedMonths && item.selectedMonths.length > 0
            ? item.selectedMonths
            : (item?.periodLabel || "")
        ).filter((t) => t !== "-");
        if (tokens.length > 0) {
          // Clear default raw text so custom styled month boxes are rendered
          data.cell.text = [];
        }
      }
    },
    didDrawCell: (data) => {
      if (hasCoveredMonths && data.section === "body" && data.column.index === 2) {
        const item = items[data.row.index];
        const tokens = parseMonthTokens(
          item?.selectedMonths && item.selectedMonths.length > 0
            ? item.selectedMonths
            : (item?.periodLabel || "")
        ).filter((t) => t !== "-");

        if (tokens.length > 0) {
          const cell = data.cell;
          let curX = cell.x + 1.4;
          let curY = cell.y + 1.6;
          const boxH = 4.2;
          const gapX = 1.4;
          const gapY = 1.4;

          tokens.forEach((token) => {
            const { short } = formatMonthToken(token);
            doc.setFontSize(6);
            doc.setFont("helvetica", "bold");
            const textW = doc.getTextWidth(short);
            const boxW = Math.max(14, textW + 5.5);

            // Wrap to next row inside cell if box exceeds cell boundary
            if (curX + boxW > cell.x + cell.width - 1.4 && curX > cell.x + 1.4) {
              curX = cell.x + 1.4;
              curY += boxH + gapY;
            }

            // Draw solid teal chip box (matches fee payment dialog chip)
            doc.setFillColor(13, 148, 136); // Teal 600
            doc.roundedRect(curX, curY, boxW, boxH, 0.7, 0.7, "F");

            // Month text
            doc.setTextColor(255, 255, 255);
            doc.text(short, curX + 1.6, curY + 2.9);

            // Vector checkmark
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.3);
            const chkX = curX + boxW - 3.2;
            const chkY = curY + 2.1;
            doc.line(chkX, chkY, chkX + 0.7, chkY + 0.9);
            doc.line(chkX + 0.7, chkY + 0.9, chkX + 1.8, chkY - 0.9);

            curX += boxW + gapX;
          });
        }
      }
    },
  });

  let startY = (doc as any).lastAutoTable?.finalY
    ? (doc as any).lastAutoTable.finalY + 3
    : metaY + 28;

  // Discounts, Surcharges or Advance adjustments summary if present
  const discountAmt = Number(parsed?.discountAmount || 0);
  const surchargeAmt = Number(parsed?.surchargeAmount || 0);
  const advanceAdjusted = Number(parsed?.advanceAdjustedAmount || 0);

  if (discountAmt > 0 || surchargeAmt > 0 || advanceAdjusted > 0) {
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    if (discountAmt > 0) {
      const itemDiscs = items.filter((i) => Number(i.discountAmount || 0) > 0);
      if (itemDiscs.length > 0) {
        itemDiscs.forEach((i) => {
          const dAmt = Number(i.discountAmount);
          const dMo = Number(i.discountPerMonth || Math.round(dAmt / Math.max(1, Number(i.quantity || 1))));
          const reasonStr = i.discountReason ? ` - ${i.discountReason}` : "";
          doc.text(`* Concession on ${i.category || i.description}: INR ${dAmt.toLocaleString()} (INR ${dMo}/mo across ${i.quantity || 1} mo)${reasonStr}`, 10, startY + 3);
          startY += 4.2;
        });
      } else {
        const pctStr = parsed?.discountPercent ? ` (${parsed.discountPercent}%)` : "";
        const reasonStr = parsed?.discountReason ? ` - ${parsed.discountReason}` : "";
        doc.text(`* Concession/Discount applied: INR ${discountAmt.toLocaleString()}${pctStr}${reasonStr}`, 10, startY + 3);
        startY += 4.5;
      }
    }
    if (surchargeAmt > 0) {
      const itemSurs = items.filter((i) => Number(i.surchargeAmount || 0) > 0);
      if (itemSurs.length > 0) {
        itemSurs.forEach((i) => {
          const sAmt = Number(i.surchargeAmount);
          const sMo = Number(i.surchargePerMonth || Math.round(sAmt / Math.max(1, Number(i.quantity || 1))));
          const reasonStr = i.surchargeReason ? ` - ${i.surchargeReason}` : "";
          doc.text(`* Surcharge on ${i.category || i.description}: INR ${sAmt.toLocaleString()} (+INR ${sMo}/mo across ${i.quantity || 1} mo)${reasonStr}`, 10, startY + 3);
          startY += 4.2;
        });
      } else {
        const pctStr = parsed?.surchargePercent ? ` (${parsed.surchargePercent}%)` : "";
        const reasonStr = parsed?.surchargeReason ? ` - ${parsed.surchargeReason}` : "";
        doc.text(`* Surcharge/Late fee applied: INR ${surchargeAmt.toLocaleString()}${pctStr}${reasonStr}`, 10, startY + 3);
        startY += 4.5;
      }
    }
    if (advanceAdjusted > 0) {
      doc.text(`* Advance fee adjusted: INR ${advanceAdjusted.toLocaleString()}`, 10, startY + 3);
      startY += 4.5;
    }
  }

  // Narration Box if present
  if (narration) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(10, startY, 128, 8, 1, 1, "FD");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(71, 85, 105);
    const narrationLines = doc.splitTextToSize(`Narration: ${narration}`, 124);
    doc.text(narrationLines, 12, startY + 5);
    startY += 10;
  }

  // Total Amount Box
  doc.setFillColor(240, 253, 250); // Teal 50
  doc.setDrawColor(204, 251, 241); // Teal 100
  doc.roundedRect(10, startY, 128, 11, 1.5, 1.5, "FD");

  doc.setTextColor(13, 148, 136);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(
    discountAmt > 0 || advanceAdjusted > 0 ? "NET AMOUNT RECEIVED NOW:" : "TOTAL AMOUNT RECEIVED:",
    14,
    startY + 7
  );
  doc.setFontSize(9.5);
  doc.text(`INR ${totalAmount.toLocaleString()}`, 134, startY + 7, { align: "right" });

  // Optional Remarks / Notes
  if (notes && typeof notes === "string" && !notes.startsWith("{")) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.text(`* Note / Ref: ${notes}`, 10, startY + 15);
  }

  // Signatures Section at bottom
  const footerY = 190;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(10, footerY, 50, footerY);
  doc.line(98, footerY, 138, footerY);

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.text("Student / Depositor Signature", 12, footerY + 3.5);
  doc.text("Authorized Signatory / Accounts", 100, footerY + 3.5);

  if (cashierName) {
    doc.text(`Issued by: ${cashierName}`, 10, 199);
  }
  doc.text("This is a computer generated receipt.", 138, 199, { align: "right" });

  return doc;
}

export function printCollegeReceipt(tx: CollegeReceiptData, cashierName?: string): void {
  const doc = buildCollegeReceiptPDFDoc(tx, cashierName);
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

export function downloadCollegeReceipt(tx: CollegeReceiptData, cashierName?: string): void {
  const doc = buildCollegeReceiptPDFDoc(tx, cashierName);
  const safeReceiptNo = (tx.receiptNumber || "receipt").replace(/[^a-zA-Z0-9-_]/g, "_");
  doc.save(`${safeReceiptNo}.pdf`);
}
