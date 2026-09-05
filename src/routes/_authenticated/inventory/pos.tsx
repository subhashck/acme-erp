import { createFileRoute } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery, queryClient } from "@/lib/query";
import { client } from "@/services/rpc";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Badge } from "@/ui/badge";
import { toast } from "sonner";
import {
  ShoppingCart,
  Search,
  Trash2,
  Plus,
  Minus,
  Printer,
  CreditCard,
  Receipt,
  Loader2,
  CheckCircle,
  Warehouse,
  User,
  Phone,
  Stethoscope,
  Sparkles,
  Download,
  History,
  FileText,
  Clock,
  X,
  Percent,
  Tag
} from "lucide-react";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/cn";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useHospitalSettings, type HospitalSettings } from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/inventory/pos")({
  component: PosTerminal,
});

interface CartItem {
  itemId: number;
  batchId?: number;
  itemName: string;
  batchNumber?: string;
  expiryDate?: string;
  quantity: number;
  availableQty: number;
  unit: string;
  unitRate: number;
  mrp: number;
  discountPercent: number;
  gstPercent: number;
}

// Convert numbers into Indian Currency words
function numberToIndianWords(num: number): string {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
    "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ",
    "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return "Zero Rupees Only";

  function convertTwoDigits(val: number): string {
    if (val < 20) return a[val];
    return b[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + a[val % 10] : " ");
  }

  function convertThreeDigits(val: number): string {
    const hundred = Math.floor(val / 100);
    const rest = val % 100;
    let res = "";
    if (hundred > 0) res += a[hundred] + "Hundred ";
    if (rest > 0) res += convertTwoDigits(rest);
    return res;
  }

  let str = "";
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remainder = n % 1000;

  if (crore > 0) str += convertThreeDigits(crore) + "Crore ";
  if (lakh > 0) str += convertThreeDigits(lakh) + "Lakh ";
  if (thousand > 0) str += convertThreeDigits(thousand) + "Thousand ";
  if (remainder > 0) str += convertThreeDigits(remainder);

  return `Rupees ${str.trim()} Only`;
}

// Format number to Indian Currency string for PDF export (e.g. "Rs. 1,250.00")
function formatPdfCurrency(amount: number | string, includePrefix = true): string {
  const val = Number(amount) || 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(val));
  const prefix = includePrefix ? "Rs. " : "";
  if (val < 0) {
    return `-${prefix}${formatted}`;
  }
  return `${prefix}${formatted}`;
}

// Build standardized POS Invoice jsPDF Document (A5 Landscape or Portrait)
export function buildPosReceiptPDF(
  invoice: any,
  hospitalSettings?: HospitalSettings,
  currentStore?: any,
  cashierName?: string,
  orientation: "landscape" | "portrait" = "landscape"
) {
  const isLandscape = orientation === "landscape";
  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a5", // 210 x 148 mm (landscape) or 148 x 210 mm (portrait)
  });

  const pageWidth = isLandscape ? 210 : 148;
  const pageHeight = isLandscape ? 148 : 210;
  const margin = isLandscape ? 8 : 6;
  const contentWidth = pageWidth - margin * 2;
  let currentY = isLandscape ? 6 : 8;

  // 1. Hospital / Pharmacy Header
  const orgName = hospitalSettings?.name || "ACME HOSPITAL PHARMACY";
  const orgAddress = hospitalSettings?.address || "Medical District, Healthcare Ave";
  const orgPhone = hospitalSettings?.phone || "+91 98765 43210";
  const orgEmail = hospitalSettings?.email || "pharmacy@acmehospital.com";
  const storeName = currentStore?.name || invoice?.store?.name || "Main Retail Pharmacy";
  const storeCode = currentStore?.code || invoice?.store?.code || "";

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(orgName.toUpperCase(), pageWidth / 2, currentY, { align: "center" });
  currentY += 4.2;

  // Subtitle / Address & Contact
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // slate-600
  const subText = `${storeName}${storeCode ? ` (${storeCode})` : ""} • ${orgAddress}`;
  doc.text(subText, pageWidth / 2, currentY, { align: "center" });
  currentY += isLandscape ? 3.4 : 3.6;

  const contactText = `Phone: ${orgPhone} | Email: ${orgEmail}`;
  doc.text(contactText, pageWidth / 2, currentY, { align: "center" });
  currentY += 4;

  // Banner: TAX INVOICE / RETAIL BILL (Border only to save printer ink)
  doc.setDrawColor(15, 23, 42); // slate-900
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, currentY, contentWidth, isLandscape ? 5 : 5.5, 1, 1, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(isLandscape ? 7.8 : 8);
  doc.setTextColor(15, 23, 42);
  doc.text("TAX INVOICE / RETAIL CASH MEMO", pageWidth / 2, currentY + (isLandscape ? 3.5 : 3.8), { align: "center" });
  currentY += isLandscape ? 6.5 : 7.2;

  // 2. Metadata Box
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.25);
  const metaHeight = isLandscape ? 13 : 18;
  doc.roundedRect(margin, currentY, contentWidth, metaHeight, 1, 1, "S");

  const invDate = invoice.invoiceDate || invoice.createdAt || new Date();
  let formattedDate = "";
  try {
    formattedDate = format(new Date(invDate), "dd/MM/yyyy hh:mm a");
  } catch {
    formattedDate = String(invDate);
  }
  const cashier = invoice.cashier?.name || cashierName || "Cashier";
  const phoneDoc = [invoice.customerPhone, invoice.doctorName ? `Dr. ${invoice.doctorName}` : ""]
    .filter(Boolean)
    .join(" | ") || "-";

  doc.setFontSize(isLandscape ? 7.2 : 7.5);

  if (isLandscape) {
    // 3 columns in landscape
    const leftColX = margin + 3;
    const leftValX = margin + 20;
    const midColX = margin + 68;
    const midValX = margin + 85;
    const rightColX = margin + 138;
    const rightValX = margin + 158;

    // Col 1
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice No:", leftColX, currentY + 4.2);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.invoiceNo || "-", leftValX, currentY + 4.2);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Date & Time:", leftColX, currentY + 8.8);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text(formattedDate, leftValX, currentY + 8.8);

    // Col 2
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Customer:", midColX, currentY + 4.2);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.customerName || "Walk-in Customer", midValX, currentY + 4.2);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Phone / Doc:", midColX, currentY + 8.8);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text(phoneDoc, midValX, currentY + 8.8);

    // Col 3
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Pharmacist:", rightColX, currentY + 4.2);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text(cashier, rightValX, currentY + 4.2);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Pay Mode:", rightColX, currentY + 8.8);
    doc.setTextColor(16, 185, 129);
    doc.setFont("helvetica", "bold");
    doc.text((invoice.paymentMode || "CASH").toUpperCase(), rightValX, currentY + 8.8);

    currentY += 15;
  } else {
    // 2 columns in portrait
    const leftColX = margin + 3;
    const leftValX = margin + 22;
    const rightColX = margin + 68;
    const rightValX = margin + 88;

    // Left col
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice No:", leftColX, currentY + 4.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.invoiceNo || "-", leftValX, currentY + 4.5);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Date & Time:", leftColX, currentY + 9);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text(formattedDate, leftValX, currentY + 9);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Cashier:", leftColX, currentY + 13.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text(cashier, leftValX, currentY + 13.5);

    // Right col
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Customer:", rightColX, currentY + 4.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.customerName || "Walk-in Customer", rightValX, currentY + 4.5);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Phone / Doc:", rightColX, currentY + 9);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "normal");
    doc.text(phoneDoc, rightValX, currentY + 9);

    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "bold");
    doc.text("Pay Mode:", rightColX, currentY + 13.5);
    doc.setTextColor(16, 185, 129);
    doc.setFont("helvetica", "bold");
    doc.text((invoice.paymentMode || "CASH").toUpperCase(), rightValX, currentY + 13.5);

    currentY += 20;
  }

  // 3. Line Items Table
  const items = invoice.items || [];
  const hasGst =
    items.some((item: any) => Number(item.gstPercent || 0) > 0) ||
    Number(invoice.cgstAmount || 0) > 0 ||
    Number(invoice.sgstAmount || 0) > 0;

  const tableData = items.map((item: any, idx: number) => {
    const itemName = item.item?.name || item.itemName || "Item";
    const batchNo = item.batch?.batchNumber || item.batchNumber || "-";
    const exp = item.batch?.expiryDate || item.expiryDate || "-";

    let formattedExp = exp;
    if (exp && exp !== "-") {
      const expDate = new Date(exp);
      if (!isNaN(expDate.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        formattedExp = diffDays <= 90 ? exp : format(expDate, "MMM-yyyy");
      }
    }

    const batchExpDetails = [
      batchNo && batchNo !== "-" ? `Batch: ${batchNo}` : null,
      formattedExp && formattedExp !== "-" ? `Exp: ${formattedExp}` : null,
    ].filter(Boolean).join("   |   ");

    const itemDescription = batchExpDetails ? `${itemName}\n${batchExpDetails}` : itemName;

    const qty = `${item.quantity} ${item.unit || "Unit"}`;
    const rate = formatPdfCurrency(item.unitRate || 0);
    const disc = Number(item.discountPercent || 0) > 0 ? `${item.discountPercent}%` : "-";
    const gst = Number(item.gstPercent || 0) > 0 ? `${item.gstPercent}%` : "-";
    const total = formatPdfCurrency(item.totalAmount ?? (Number(item.quantity || 0) * Number(item.unitRate || 0)));

    if (hasGst) {
      return [
        String(idx + 1),
        itemDescription,
        qty,
        rate,
        disc,
        gst,
        total,
      ];
    }

    return [
      String(idx + 1),
      itemDescription,
      qty,
      rate,
      disc,
      total,
    ];
  });

  const tableHead = hasGst
    ? [["#", "Item Description / Batch & Exp", "Qty", "Rate", "Disc", "GST", "Amount"]]
    : [["#", "Item Description / Batch & Exp", "Qty", "Rate", "Disc", "Amount"]];

  const emptyTableBody = hasGst
    ? [["-", "No items", "-", "-", "-", "-", "-"]]
    : [["-", "No items", "-", "-", "-", "-"]];

  const columnStyles: Record<string, any> = isLandscape
    ? (hasGst
      ? {
        0: { cellWidth: 7, halign: "center" },
        1: { cellWidth: 88, halign: "left" },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 24, halign: "right" },
        4: { cellWidth: 12, halign: "center" },
        5: { cellWidth: 12, halign: "center" },
        6: { cellWidth: 33, halign: "right", fontStyle: "bold" },
      }
      : {
        0: { cellWidth: 7, halign: "center" },
        1: { cellWidth: 103, halign: "left" },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 28, halign: "right" },
        4: { cellWidth: 12, halign: "center" },
        5: { cellWidth: 24, halign: "right", fontStyle: "bold" },
      })
    : (hasGst
      ? {
        0: { cellWidth: 5, halign: "center" },
        1: { cellWidth: 55, halign: "left" },
        2: { cellWidth: 14, halign: "center" },
        3: { cellWidth: 20, halign: "right" },
        4: { cellWidth: 9, halign: "center" },
        5: { cellWidth: 9, halign: "center" },
        6: { cellWidth: 24, halign: "right", fontStyle: "bold" },
      }
      : {
        0: { cellWidth: 5, halign: "center" },
        1: { cellWidth: 64, halign: "left" },
        2: { cellWidth: 14, halign: "center" },
        3: { cellWidth: 22, halign: "right" },
        4: { cellWidth: 9, halign: "center" },
        5: { cellWidth: 22, halign: "right", fontStyle: "bold" },
      });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: tableHead,
    body: tableData.length > 0 ? tableData : emptyTableBody,
    theme: "plain",
    headStyles: {
      fillColor: false,
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 7.2,
      halign: "center",
      cellPadding: 2,
      lineWidth: { top: 0.35, bottom: 0.35, left: 0, right: 0 },
      lineColor: [15, 23, 42],
    },
    styles: {
      fontSize: 7,
      cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
      textColor: [30, 41, 59],
      valign: "middle",
      lineWidth: { bottom: 0.15, top: 0, left: 0, right: 0 },
      lineColor: [226, 232, 240],
    },
    columnStyles,
    willDrawCell: (data) => {
      // Suppress default text rendering for Item Description column to draw custom sized and colored lines
      if (data.section === "body" && data.column.index === 1) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const item = items[data.row.index];
        if (!item) return;
        const itemName = item.item?.name || item.itemName || "Item";
        const batchNo = item.batch?.batchNumber || item.batchNumber || "-";
        const exp = item.batch?.expiryDate || item.expiryDate || "-";

        let formattedExp = exp;
        if (exp && exp !== "-") {
          const expDate = new Date(exp);
          if (!isNaN(expDate.getTime())) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
            formattedExp = diffDays <= 90 ? exp : format(expDate, "MMM-yyyy");
          }
        }

        const batchExpDetails = [
          batchNo && batchNo !== "-" ? `Batch: ${batchNo}` : null,
          formattedExp && formattedExp !== "-" ? `Exp: ${formattedExp}` : null,
        ].filter(Boolean).join("   |   ");

        const padLeft = typeof data.cell.padding === "function" ? data.cell.padding("left") : 2;
        const padTop = typeof data.cell.padding === "function" ? data.cell.padding("top") : 2;
        const padRight = typeof data.cell.padding === "function" ? data.cell.padding("right") : 2;

        const cellX = data.cell.x + padLeft;
        const topY = data.cell.y + padTop;
        const maxTextWidth = data.cell.width - (padLeft + padRight);

        // 1. Item Name: larger font (7.8pt), bold, dark slate
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.8);
        doc.setTextColor(15, 23, 42); // slate-900
        const nameLines = doc.splitTextToSize(itemName, maxTextWidth);
        doc.text(nameLines, cellX, topY + 2.7);

        // 2. Batch & Exp: smaller font (5.3pt), normal, muted slate-500
        if (batchExpDetails) {
          const lineOffset = (nameLines.length - 1) * 3.2;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5.3);
          doc.setTextColor(100, 116, 139); // slate-500 muted
          doc.text(batchExpDetails, cellX, topY + 2.7 + lineOffset + 3.4);
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 3 : currentY + 25;
  let summaryY = finalY;

  // 4. Financial Summary & Amount in Words
  const subtotal = Number(invoice.subtotal || 0);
  const discountAmount = Number(invoice.discountAmount || 0);
  const taxableAmount = Number(invoice.taxableAmount || 0);
  const cgstAmount = Number(invoice.cgstAmount || 0);
  const sgstAmount = Number(invoice.sgstAmount || 0);
  const roundOff = Number(invoice.roundOff || 0);
  const netAmount = Number(invoice.netAmount || 0);

  // Left: Amount in Words box & Remarks (Border only)
  const wordsBoxWidth = isLandscape ? 100 : 62;
  const wordsBoxHeight = isLandscape ? 22 : 24;
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, summaryY, wordsBoxWidth, wordsBoxHeight, 1, 1, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("AMOUNT IN WORDS:", margin + 2, summaryY + (isLandscape ? 3.8 : 4));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  const words = numberToIndianWords(netAmount);
  const wordLines = doc.splitTextToSize(words, wordsBoxWidth - 4);
  doc.text(wordLines, margin + 2, summaryY + (isLandscape ? 7.5 : 8));

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text("* Returns accepted within 7 days with original invoice.", margin + 2, summaryY + (isLandscape ? 15 : 17));
  doc.text("* Keep medicines stored in cool & dry place.", margin + 2, summaryY + (isLandscape ? 18.5 : 21));

  // Right: Numerical Breakdown
  const sumLabelX = margin + wordsBoxWidth + (isLandscape ? 6 : 4);
  const sumValX = pageWidth - margin - 3;
  const sumRowH = isLandscape ? 3.5 : 3.8;
  let rY = summaryY + (isLandscape ? 3 : 3.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);

  doc.text("Gross Subtotal:", sumLabelX, rY);
  doc.text(formatPdfCurrency(subtotal), sumValX, rY, { align: "right" });
  rY += sumRowH;

  if (discountAmount > 0) {
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text("Total Discount:", sumLabelX, rY);
    doc.text(formatPdfCurrency(-discountAmount), sumValX, rY, { align: "right" });
    rY += sumRowH;
  }

  // Only show Taxable Value & CGST/SGST lines when GST is present/non-zero
  if (hasGst && (cgstAmount > 0 || sgstAmount > 0)) {
    doc.setTextColor(71, 85, 105);
    doc.text("Taxable Value:", sumLabelX, rY);
    doc.text(formatPdfCurrency(taxableAmount), sumValX, rY, { align: "right" });
    rY += sumRowH;

    doc.text("CGST / SGST:", sumLabelX, rY);
    doc.text(`${formatPdfCurrency(cgstAmount)} + ${formatPdfCurrency(sgstAmount)}`, sumValX, rY, { align: "right" });
    rY += sumRowH;
  }

  if (roundOff !== 0) {
    doc.setTextColor(71, 85, 105);
    doc.text("Round Off:", sumLabelX, rY);
    doc.text(`${roundOff >= 0 ? "+" : ""}${formatPdfCurrency(roundOff)}`, sumValX, rY, { align: "right" });
    rY += sumRowH;
  }

  // Net Total Highlight Box (Border only to save printer ink)
  rY += 1;
  const netBoxW = contentWidth - wordsBoxWidth - 3;
  doc.setDrawColor(15, 23, 42); // slate-900 border
  doc.setLineWidth(0.4);
  doc.roundedRect(sumLabelX - 2, rY - (isLandscape ? 2.5 : 3), netBoxW, isLandscape ? 7 : 7.5, 1, 1, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("NET AMOUNT:", sumLabelX + 1, rY + (isLandscape ? 2 : 1.8));
  doc.setFontSize(9);
  doc.text(formatPdfCurrency(netAmount), sumValX, rY + (isLandscape ? 2 : 1.8), { align: "right" });

  // 5. Footer
  const footerY = isLandscape ? 141 : 198;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Thank you for your visit! Wishing you good health.", margin, footerY + 3.5);
  doc.text(
    "Computer Generated Invoice • No signature required",
    isLandscape ? pageWidth - margin : margin,
    footerY + (isLandscape ? 3.5 : 7.5),
    isLandscape ? { align: "right" } : undefined
  );

  return doc;
}

export function printPosReceiptPDF(
  invoice: any,
  hospitalSettings?: HospitalSettings,
  currentStore?: any,
  cashierName?: string,
  orientation: "landscape" | "portrait" = "landscape"
) {
  const doc = buildPosReceiptPDF(invoice, hospitalSettings, currentStore, cashierName, orientation);
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

export function downloadPosReceiptPDF(
  invoice: any,
  hospitalSettings?: HospitalSettings,
  currentStore?: any,
  cashierName?: string,
  orientation: "landscape" | "portrait" = "landscape"
) {
  const doc = buildPosReceiptPDF(invoice, hospitalSettings, currentStore, cashierName, orientation);
  doc.save(`Invoice-${invoice.invoiceNo || "POS"}.pdf`);
}

function PosTerminal() {
  const [storeId, setStoreId] = React.useState<number>(0);
  const [customerName, setCustomerName] = React.useState("");
  const [customerPhone, setCustomerPhone] = React.useState("");
  const [doctorName, setDoctorName] = React.useState("");
  const [paymentMode, setPaymentMode] = React.useState<"cash" | "card" | "upi" | "credit">("cash");
  const [billDiscountType, setBillDiscountType] = React.useState<"percent" | "fixed">("percent");
  const [billDiscountValue, setBillDiscountValue] = React.useState<number>(0);
  const [isZeroGst, setIsZeroGst] = React.useState(true);
  const [printOrientation, setPrintOrientation] = React.useState<"landscape" | "portrait">(() => {
    try {
      const saved = localStorage.getItem("pos_print_orientation");
      if (saved === "portrait" || saved === "landscape") return saved;
    } catch { }
    return "landscape";
  });

  const handleOrientationChange = (val: "landscape" | "portrait") => {
    setPrintOrientation(val);
    try {
      localStorage.setItem("pos_print_orientation", val);
    } catch { }
  };

  const [searchTerm, setSearchTerm] = React.useState("");
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [completedInvoice, setCompletedInvoice] = React.useState<any | null>(null);
  const [showRecentInvoices, setShowRecentInvoices] = React.useState(false);
  const [recentSearch, setRecentSearch] = React.useState("");

  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const hospitalSettings = useHospitalSettings();
  const { session } = Route.useRouteContext() as { session?: any };
  const currentUserName = session?.data?.user?.name || session?.user?.name || "Cashier";

  // Fetch stores
  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  const currentStore = React.useMemo(() => {
    return storesList.find((s: any) => s.id === storeId);
  }, [storesList, storeId]);

  React.useEffect(() => {
    if (storesList.length > 0 && !storeId) {
      const dispensaryStore = storesList.find(
        (s: any) =>
          s.code?.toUpperCase() === "DISP" ||
          s.code?.toUpperCase() === "DISPENSARY" ||
          s.name?.trim().toUpperCase() === "DISPENSARY" ||
          s.name?.toUpperCase().includes("DISPENSARY")
      );
      const def = dispensaryStore || storesList.find((s: any) => s.isDefault) || storesList[0];
      if (def) {
        setStoreId(def.id);
      }
    }
  }, [storesList, storeId]);

  // Fast item search
  const { data: searchResults = [], isFetching: isSearching } = useRpcQuery<any[]>(
    ["pos-item-search", storeId, searchTerm],
    () =>
      client.inventory.pos["item-search"].$get({
        query: {
          storeId: storeId ? String(storeId) : undefined,
          search: searchTerm || undefined,
        },
      }),
    { enabled: !!storeId && searchTerm.length >= 1 }
  );

  // Recent invoices query
  const { data: recentInvoicesData, isFetching: isLoadingRecent } = useRpcQuery<any>(
    ["pos-recent-invoices", storeId, recentSearch],
    () =>
      client.inventory.pos.invoices.$get({
        query: {
          storeId: storeId ? String(storeId) : undefined,
          search: recentSearch || undefined,
          page: "1",
          limit: "25",
        },
      }),
    { enabled: showRecentInvoices }
  );

  // Keyboard Shortcuts (F2 = search, F9 = checkout, Esc = clear)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F9") {
        e.preventDefault();
        if (cart.length > 0) {
          handleCheckout();
        }
      } else if (e.key === "Escape") {
        setSearchTerm("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart]);

  const addToCart = (stockItem: any) => {
    const existing = cart.find(
      (ci) => ci.itemId === stockItem.itemId && ci.batchId === stockItem.batchId
    );

    if (existing) {
      if (existing.quantity >= Number(stockItem.availableQty)) {
        toast.error(`Cannot add more than available stock (${stockItem.availableQty} ${stockItem.unit})`);
        return;
      }
      setCart((prev) =>
        prev.map((item) =>
          item.itemId === stockItem.itemId && item.batchId === stockItem.batchId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          itemId: stockItem.itemId,
          batchId: stockItem.batchId,
          itemName: stockItem.itemName,
          batchNumber: stockItem.batchNumber,
          expiryDate: stockItem.expiryDate,
          quantity: 1,
          availableQty: Number(stockItem.availableQty),
          unit: stockItem.unit || "Unit",
          unitRate: Number(stockItem.saleRate || stockItem.mrp || 0),
          mrp: Number(stockItem.mrp || 0),
          discountPercent: 0,
          gstPercent: Number(stockItem.gstPercent || 0),
        },
      ]);
    }

    setSearchTerm("");
    searchInputRef.current?.focus();
    toast.success(`Added ${stockItem.itemName} to bill`);
  };

  const updateQuantity = (index: number, newQty: number) => {
    const val = isNaN(newQty) ? 0 : Math.max(0, newQty);
    const target = cart[index];
    if (val > target.availableQty) {
      toast.error(`Max available quantity is ${target.availableQty}`);
      return;
    }
    setCart((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, quantity: val } : item))
    );
  };

  const updateDiscount = (index: number, discountPct: number) => {
    setCart((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, discountPercent: Math.max(0, Math.min(100, discountPct)) } : item
      )
    );
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Item-level and Bill-level Calculations
  const grossSubtotal = React.useMemo(() => {
    return cart.reduce((acc, item) => acc + Number((item.quantity * item.unitRate).toFixed(2)), 0);
  }, [cart]);

  const itemDiscountsTotal = React.useMemo(() => {
    return cart.reduce((acc, item) => {
      const gross = Number((item.quantity * item.unitRate).toFixed(2));
      const disc = Number(((gross * (item.discountPercent || 0)) / 100).toFixed(2));
      return acc + disc;
    }, 0);
  }, [cart]);

  const subtotalAfterItemDiscounts = Math.max(0, grossSubtotal - itemDiscountsTotal);

  const billDiscountAmountCalculated = React.useMemo(() => {
    if (!billDiscountValue || billDiscountValue <= 0 || subtotalAfterItemDiscounts <= 0) return 0;
    if (billDiscountType === "percent") {
      const pct = Math.min(100, Math.max(0, billDiscountValue));
      return Number(((subtotalAfterItemDiscounts * pct) / 100).toFixed(2));
    }
    return Math.min(Number(billDiscountValue), subtotalAfterItemDiscounts);
  }, [billDiscountType, billDiscountValue, subtotalAfterItemDiscounts]);

  const calculatedLines = React.useMemo(() => {
    return cart.map((item) => {
      const gross = Number((item.quantity * item.unitRate).toFixed(2));
      const itemDisc = Number(((gross * (item.discountPercent || 0)) / 100).toFixed(2));
      const itemBaseForBillDisc = Math.max(0, gross - itemDisc);

      const itemBillDisc = subtotalAfterItemDiscounts > 0 && billDiscountAmountCalculated > 0
        ? Number(((itemBaseForBillDisc / subtotalAfterItemDiscounts) * billDiscountAmountCalculated).toFixed(2))
        : 0;

      const totalItemDiscount = Number((itemDisc + itemBillDisc).toFixed(2));
      const effectiveDiscountPercent = gross > 0
        ? Math.min(100, Number(((totalItemDiscount / gross) * 100).toFixed(2)))
        : 0;

      const taxable = Math.max(0, Number((gross - totalItemDiscount).toFixed(2)));
      const effectiveGstPercent = isZeroGst ? 0 : Number(item.gstPercent || 0);
      const gstAmt = Number(((taxable * effectiveGstPercent) / 100).toFixed(2));
      const lineTotal = Number((taxable + gstAmt).toFixed(2));

      return {
        gross,
        itemDisc,
        itemBillDisc,
        totalItemDiscount,
        effectiveDiscountPercent,
        taxable,
        effectiveGstPercent,
        gstAmt,
        lineTotal,
      };
    });
  }, [cart, subtotalAfterItemDiscounts, billDiscountAmountCalculated, isZeroGst]);

  const subtotal = Number(grossSubtotal.toFixed(2));
  const totalDiscount = Number((itemDiscountsTotal + billDiscountAmountCalculated).toFixed(2));
  const totalTaxable = Number(calculatedLines.reduce((acc, l) => acc + l.taxable, 0).toFixed(2));
  const totalGst = Number(calculatedLines.reduce((acc, l) => acc + l.gstAmt, 0).toFixed(2));
  const cgstAmount = Number((totalGst / 2).toFixed(2));
  const sgstAmount = Number((totalGst / 2).toFixed(2));
  const rawTotal = totalTaxable + totalGst;
  const netAmount = Math.round(rawTotal);
  const roundOff = Number((netAmount - rawTotal).toFixed(2));

  const invoiceMutation = useMutation({
    mutationFn: async () => {
      const res = await client.inventory.pos.invoices.$post({
        json: {
          storeId,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          doctorName: doctorName || null,
          paymentMode,
          isInterState: false,
          items: cart.map((item, idx) => ({
            itemId: item.itemId,
            batchId: item.batchId,
            quantity: item.quantity,
            unit: item.unit,
            unitRate: item.unitRate,
            mrp: item.mrp,
            discountPercent: calculatedLines[idx]?.effectiveDiscountPercent ?? item.discountPercent,
            gstPercent: isZeroGst ? 0 : item.gstPercent,
          })),
        },
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || "Failed to process sale");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast.success(`Invoice #${data.invoiceNo} generated successfully!`);
      // If data doesn't have items populated, attach cart items for instant printing
      const completeData = {
        ...data,
        items: data.items && data.items.length > 0 ? data.items : cart.map((c, idx) => ({
          ...c,
          discountPercent: calculatedLines[idx]?.effectiveDiscountPercent ?? c.discountPercent,
          discountAmount: calculatedLines[idx]?.totalItemDiscount ?? 0,
          totalAmount: calculatedLines[idx]?.lineTotal ?? (c.quantity * c.unitRate),
          item: { name: c.itemName },
          batch: { batchNumber: c.batchNumber, expiryDate: c.expiryDate },
        })),
        store: currentStore,
        cashier: { name: currentUserName },
      };
      setCompletedInvoice(completeData);
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setDoctorName("");
      setBillDiscountValue(0);
      setBillDiscountType("percent");
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["pos-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["pos-recent-invoices"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    const zeroItem = cart.find((item) => !item.quantity || item.quantity <= 0);
    if (zeroItem) {
      toast.error(`Please enter a valid quantity for "${zeroItem.itemName}" or click trash to remove it`);
      return;
    }
    invoiceMutation.mutate();
  };

  const handlePrint = (invToPrint?: any, orient?: "landscape" | "portrait") => {
    const inv = invToPrint || completedInvoice;
    if (!inv) return;
    printPosReceiptPDF(inv, hospitalSettings, currentStore, currentUserName, orient || printOrientation);
  };

  const handleDownload = (invToDownload?: any, orient?: "landscape" | "portrait") => {
    const inv = invToDownload || completedInvoice;
    if (!inv) return;
    downloadPosReceiptPDF(inv, hospitalSettings, currentStore, currentUserName, orient || printOrientation);
  };

  return (
    <ModuleLayout
      title="POS Billing Terminal"
      description="Marg ERP–inspired high-speed retail pharmacy and dispensing billing counter"
      action={
        <div className="flex items-center gap-2">
          {/* Print Format Selector */}
          <div className="flex items-center gap-1.5 bg-muted/60 px-2 py-1 rounded-md border text-xs">
            <span className="text-muted-foreground font-medium text-[11px]">Print:</span>
            <Select
              value={printOrientation}
              onValueChange={(val: "landscape" | "portrait") => handleOrientationChange(val)}
            >
              <SelectTrigger className="h-7 w-28 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="landscape">Landscape (A5)</SelectItem>
                <SelectItem value="portrait">Portrait (A5)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRecentInvoices(true)}
            className="h-8 text-xs font-semibold"
          >
            <History className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Recent Bills / Reprint
          </Button>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            [F2] Search Item
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            [F9] Complete Bill
          </Badge>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Customer Bar, Item Search, Cart Grid */}
        <div className="lg:col-span-2 space-y-4">
          {/* Header Customer Metadata */}
          <Card>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Billing Store</Label>
                <div className="mt-1">
                  <Select
                    value={storeId ? String(storeId) : ""}
                    onValueChange={(val) => {
                      setStoreId(Number(val));
                      setCart([]);
                    }}
                  >
                    <SelectTrigger className="w-full h-9 text-xs">
                      <SelectValue placeholder="Select Store" />
                    </SelectTrigger>
                    <SelectContent>
                      {storesList.map((st: any) => (
                        <SelectItem key={st.id} value={String(st.id)}>
                          {st.name} ({st.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Customer Name</Label>
                <div className="relative mt-1">
                  <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Walk-in Customer"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Mobile Phone</Label>
                <div className="relative mt-1">
                  <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="e.g. 9876543210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Doctor / Consultant</Label>
                <div className="relative mt-1">
                  <Stethoscope className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Dr. Name"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fast Item Search Bar */}
          <div className="relative">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type item name, code, or scan barcode... (Press F2 to focus)"
                className="pl-10 pr-10 h-11 border-2 border-emerald-500/40 text-sm font-medium focus-visible:ring-emerald-500 shadow-sm"
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 absolute right-3 top-3.5 animate-spin text-emerald-600" />
              )}
            </div>

            {/* Live Search Suggestions Dropdown */}
            {searchTerm.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-12 z-50 bg-popover text-popover-foreground rounded-lg border shadow-xl max-h-72 overflow-y-auto divide-y">
                {searchResults.length === 0 && !isSearching ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No matching batches available in this store.
                  </div>
                ) : (
                  searchResults.map((result: any) => (
                    <div
                      key={`${result.itemId}-${result.batchId}`}
                      onClick={() => addToCart(result)}
                      className="p-3 hover:bg-muted/50 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-sm">{result.itemName}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>Batch: <strong>{result.batchNumber}</strong></span>
                          <span>Exp: <strong>{result.expiryDate}</strong></span>
                          <span>GST: <strong>{result.gstPercent}%</strong></span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-sm text-emerald-600">₹{Number(result.saleRate || result.mrp || 0).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">Avail: <strong>{result.availableQty} {result.unit}</strong></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Cart Table */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3">Batch / Exp</th>
                    <th className="py-2.5 px-3 w-28 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate</th>
                    <th className="py-2.5 px-3 w-16 text-center">Disc %</th>
                    <th className="py-2.5 px-3 text-right">GST</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                    <th className="py-2.5 px-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted-foreground">
                        <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="font-medium">Billing cart is empty</p>
                        <p className="text-[11px]">Scan barcode or search items above (F2) to add</p>
                      </td>
                    </tr>
                  ) : (
                    cart.map((item, index) => {
                      const line = calculatedLines[index];
                      return (
                        <tr key={`${item.itemId}-${item.batchId}`} className="hover:bg-muted/30">
                          <td className="py-2.5 px-3 text-muted-foreground">{index + 1}</td>
                          <td className="py-2.5 px-3 font-semibold">{item.itemName}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono">{item.batchNumber}</span>
                            <span className="text-[10px] text-muted-foreground block">{item.expiryDate}</span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => updateQuantity(index, Math.max(0, item.quantity - 1))}
                                className="w-6 h-6 rounded"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                value={item.quantity === 0 ? "" : item.quantity}
                                onChange={(e) => updateQuantity(index, e.target.value === "" ? 0 : Number(e.target.value))}
                                className="w-14 h-6 text-center font-mono font-bold text-xs p-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => updateQuantity(index, item.quantity + 1)}
                                className="w-6 h-6 rounded"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium">₹{item.unitRate.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent}
                              onChange={(e) => updateDiscount(index, Number(e.target.value))}
                              className="w-14 h-6 text-center font-mono text-xs p-1"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            ₹{line.gstAmt.toFixed(2)}
                            <span className="text-[10px] text-muted-foreground block">
                              {isZeroGst ? (
                                <span className="text-cyan-400 font-semibold font-sans">0% (Waived)</span>
                              ) : (
                                `(${item.gstPercent}%)`
                              )}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            ₹{line.lineTotal.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(index)}
                              className="w-6 h-6 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Summary Card & Tender Workspace */}
        <div className="space-y-4">
          <Card className="bg-slate-900 text-white shadow-xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Payable</span>
                <span className="text-3xl font-black font-mono text-emerald-400">
                  ₹{netAmount.toFixed(2)}
                </span>
              </div>

              {/* Bill Level Discount Control */}
              <div className="bg-slate-800/90 rounded-lg p-3.5 border border-slate-700/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    Bill-Level Discount
                  </Label>

                  {/* Toggle % vs Flat ₹ */}
                  <div className="flex items-center bg-slate-950 p-0.5 rounded-md border border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setBillDiscountType("percent");
                        setBillDiscountValue(0);
                      }}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer",
                        billDiscountType === "percent"
                          ? "bg-amber-500 text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      % Percent
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBillDiscountType("fixed");
                        setBillDiscountValue(0);
                      }}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer",
                        billDiscountType === "fixed"
                          ? "bg-amber-500 text-slate-950 shadow-sm"
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      ₹ Flat Amount
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-2.5 top-2 text-xs font-bold text-slate-400 pointer-events-none">
                    {billDiscountType === "percent" ? "%" : "₹"}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    max={billDiscountType === "percent" ? "100" : undefined}
                    step={billDiscountType === "percent" ? "0.5" : "1"}
                    value={billDiscountValue === 0 ? "" : billDiscountValue}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      if (billDiscountType === "percent") {
                        setBillDiscountValue(Math.max(0, Math.min(100, val)));
                      } else {
                        setBillDiscountValue(Math.max(0, val));
                      }
                    }}
                    placeholder={
                      billDiscountType === "percent"
                        ? "Enter % (e.g. 5, 10)"
                        : "Enter amount (e.g. 50, 100)"
                    }
                    className="pl-7 pr-8 h-8 bg-slate-950 border-slate-700 text-xs font-mono font-bold text-amber-300 placeholder:text-slate-500 placeholder:font-normal focus-visible:ring-amber-500"
                  />
                  {billDiscountValue > 0 && (
                    <button
                      type="button"
                      onClick={() => setBillDiscountValue(0)}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                      title="Clear discount"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Preset Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-400 mr-0.5">Quick:</span>
                  {(billDiscountType === "percent" ? [5, 10, 15, 20] : [20, 50, 100, 200]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setBillDiscountValue(preset)}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer border",
                        billDiscountValue === preset
                          ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                          : "bg-slate-950/60 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                      )}
                    >
                      {billDiscountType === "percent" ? `${preset}%` : `₹${preset}`}
                    </button>
                  ))}
                  {billDiscountValue > 0 && (
                    <button
                      type="button"
                      onClick={() => setBillDiscountValue(0)}
                      className="px-1.5 py-0.5 rounded text-[10px] text-red-400 hover:text-red-300 hover:bg-red-950/40 border border-red-900/40 transition-colors ml-auto cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                </div>

                {billDiscountAmountCalculated > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-amber-400 font-mono pt-1 border-t border-slate-700/50">
                    <span>Applied Bill Discount:</span>
                    <span className="font-bold">-₹{billDiscountAmountCalculated.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Zero GST (0% Tax Exempt) Toggle */}
              <div className="bg-slate-800/90 rounded-lg p-3 border border-slate-700/70 flex items-center justify-between">
                <div>
                  <Label
                    className="text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    onClick={() => setIsZeroGst(!isZeroGst)}
                  >
                    <Percent className="w-3.5 h-3.5 text-cyan-400" />
                    Zero GST (0% Tax)
                  </Label>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {isZeroGst ? "Tax waived (0% GST applied to all items)" : "Standard item tax rates applied"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsZeroGst(!isZeroGst)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden",
                    isZeroGst ? "bg-cyan-500" : "bg-slate-700"
                  )}
                  role="switch"
                  aria-checked={isZeroGst}
                  title="Toggle Zero GST (0% Tax)"
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                      isZeroGst ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Breakdown */}
              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Gross Subtotal</span>
                  <span className="font-mono">₹{subtotal.toFixed(2)}</span>
                </div>
                {itemDiscountsTotal > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Item Discounts</span>
                    <span className="font-mono">-₹{itemDiscountsTotal.toFixed(2)}</span>
                  </div>
                )}
                {billDiscountAmountCalculated > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>
                      Bill Discount ({billDiscountType === "percent" ? `${billDiscountValue}%` : "Flat ₹"})
                    </span>
                    <span className="font-mono">-₹{billDiscountAmountCalculated.toFixed(2)}</span>
                  </div>
                )}
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-amber-300 font-semibold border-t border-slate-800/60 pt-1">
                    <span>Total Discount</span>
                    <span className="font-mono">-₹{totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Taxable Amount</span>
                  <span className="font-mono">₹{totalTaxable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1">
                    CGST (Central Tax)
                    {isZeroGst && <span className="text-[10px] text-cyan-400 font-semibold">(0% Waived)</span>}
                  </span>
                  <span className="font-mono">₹{cgstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1">
                    SGST (State Tax)
                    {isZeroGst && <span className="text-[10px] text-cyan-400 font-semibold">(0% Waived)</span>}
                  </span>
                  <span className="font-mono">₹{sgstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Round Off</span>
                  <span className="font-mono">{roundOff >= 0 ? `+₹${roundOff}` : `-₹${Math.abs(roundOff)}`}</span>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <Label className="text-xs text-slate-400">Payment Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["cash", "upi", "card", "credit"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={cn(
                        "py-2 px-3 rounded-md text-xs font-bold uppercase transition-colors cursor-pointer border",
                        paymentMode === mode
                          ? "bg-emerald-600 border-emerald-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      )}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={cart.length === 0 || invoiceMutation.isPending}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base shadow-lg cursor-pointer"
              >
                {invoiceMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2" />
                )}
                Complete Sale (F9)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoice Success & jsPDF Print Dialog */}
      {completedInvoice && (
        <Dialog open={!!completedInvoice} onOpenChange={() => setCompletedInvoice(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="w-5 h-5" /> Sale Completed
              </DialogTitle>
              <DialogDescription>
                Invoice #{completedInvoice.invoiceNo} has been generated and stock updated.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-center">
              <div className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-900/50">
                <p className="text-xs text-muted-foreground">Net Amount Paid</p>
                <p className="text-3xl font-bold font-mono mt-1 text-emerald-600">
                  ₹{Number(completedInvoice.netAmount).toFixed(2)}
                </p>
                <Badge variant="outline" className="mt-2 capitalize bg-emerald-50 text-emerald-700 border-emerald-200">
                  Paid via {completedInvoice.paymentMode}
                </Badge>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
                <span className="text-[11px] font-medium">Format:</span>
                <div className="inline-flex rounded-md border p-0.5 bg-slate-100 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOrientationChange("landscape")}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded font-medium transition-all cursor-pointer",
                      printOrientation === "landscape"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Landscape (A5)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOrientationChange("portrait")}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded font-medium transition-all cursor-pointer",
                      printOrientation === "portrait"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Portrait (A5)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  onClick={() => handlePrint(completedInvoice)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownload(completedInvoice)}
                  className="cursor-pointer"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>

              <Button
                variant="ghost"
                className="w-full text-xs text-muted-foreground cursor-pointer"
                onClick={() => setCompletedInvoice(null)}
              >
                Close & New Bill
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Recent Invoices / Reprint Sheet (Slide-over from right) */}
      <Sheet open={showRecentInvoices} onOpenChange={setShowRecentInvoices}>
        <SheetContent side="right" className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl p-6 flex flex-col">
          <SheetHeader className="pb-2 border-b">
            <SheetTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              Recent POS Invoices & Reprint
            </SheetTitle>
            <SheetDescription>
              Search past bills, view details, and instantly generate or print receipts with jsPDF.
            </SheetDescription>
          </SheetHeader>

          <div className="py-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search by invoice #, customer name or phone..."
                value={recentSearch}
                onChange={(e) => setRecentSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Select
              value={printOrientation}
              onValueChange={(val: "landscape" | "portrait") => handleOrientationChange(val)}
            >
              <SelectTrigger className="h-9 w-36 text-xs shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="landscape">Landscape (A5)</SelectItem>
                <SelectItem value="portrait">Portrait (A5)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-lg">
            {isLoadingRecent ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground text-xs">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading recent sales...
              </div>
            ) : !recentInvoicesData?.data || recentInvoicesData.data.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground text-xs">
                No recent invoices found for this store.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 sticky top-0 border-b">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3 text-right">Net Amount</th>
                    <th className="py-2.5 px-3 text-center">Mode</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentInvoicesData.data.map((inv: any) => {
                    let formattedDate = "";
                    try {
                      formattedDate = format(new Date(inv.invoiceDate || inv.createdAt), "dd/MM/yy hh:mm a");
                    } catch {
                      formattedDate = String(inv.invoiceDate || "");
                    }

                    return (
                      <tr key={inv.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                          {inv.invoiceNo}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium">{inv.customerName || "Walk-in"}</div>
                          {inv.customerPhone && (
                            <div className="text-[10px] text-muted-foreground">{inv.customerPhone}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                          ₹{Number(inv.netAmount).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {inv.paymentMode}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrint(inv)}
                              className="h-7 px-2 text-[11px] font-medium"
                              title="Print Receipt"
                            >
                              <Printer className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Print
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDownload(inv)}
                              className="h-7 w-7 p-0"
                              title="Download PDF"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </ModuleLayout>
  );
}
