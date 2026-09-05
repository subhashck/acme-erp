import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import {
  Receipt,
  Plus,
  Search,
  Printer,
  Calendar as CalendarIcon,
  CheckCircle,
  FileText,
  User,
  GraduationCap,
  BookOpen,
  Shirt,
  CreditCard,
  Trash2,
  Tag,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  ExternalLink,
  MessageSquare,
  BadgeCheck,
  Download,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Autocomplete } from "@/ui/autocomplete";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Route Definition
// ---------------------------------------------------------------------------
export const Route = createFileRoute("/_authenticated/college/general-receipts")({
  component: GeneralReceiptsPage,
});

// ---------------------------------------------------------------------------
// Categories & Presets
// ---------------------------------------------------------------------------
export const GENERAL_RECEIPT_CATEGORIES = [
  { label: "Sale of Prospectus", value: "Sale of Prospectus", icon: FileText, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800" },
  { label: "Books & Stationary", value: "Books & Stationary", icon: BookOpen, color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800" },
  { label: "Uniform & Attire", value: "Uniform", icon: Shirt, color: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800" },
  { label: "ID Card / Badge", value: "ID Card & Badge", icon: CreditCard, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800" },
  { label: "Certificate / Verification", value: "Certificate & Verification", icon: BadgeCheck, color: "text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800" },
  { label: "Fine / Penalty", value: "Fine & Penalty", icon: AlertCircle, color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800" },
  { label: "Miscellaneous", value: "Miscellaneous", icon: Tag, color: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800" },
] as const;

// ---------------------------------------------------------------------------
// Schemas & Types
// ---------------------------------------------------------------------------
const generalReceiptItemSchema = z.object({
  description: z.string().min(1, "Item description is required"),
  quantity: z.number().min(1, "Qty must be at least 1"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  amount: z.number().min(0, "Amount cannot be negative"),
});

const generalReceiptFormSchema = z.object({
  recipientType: z.enum(["student", "direct"]),
  studentId: z.number().nullable().optional(),
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientPhone: z.string().nullable().optional(),
  recipientEmail: z.string().nullable().optional(),
  category: z.string().min(1, "Category is required"),
  narration: z.string().nullable().optional(),
  useItemizedList: z.boolean(),
  items: z.array(generalReceiptItemSchema).optional(),
  amount: z.number().min(1, "Receipt amount must be greater than 0"),
  paymentMode: z.enum(["cash", "bank_transfer", "upi", "card", "cheque"]),
  paymentDate: z.string(),
  remarks: z.string().nullable().optional(),
});

type GeneralReceiptFormValues = z.infer<typeof generalReceiptFormSchema>;

export interface GeneralReceiptTransaction {
  id: number;
  studentId?: number | null;
  studentName?: string | null;
  enrollmentNo?: string | null;
  studentCourse?: string | null;
  invoiceNo: string;
  receiptNumber: string;
  feeType: string;
  amount: string | number;
  paymentMode: string;
  paymentDate: string;
  status: string;
  remarks?: any;
  createdAt: string;
}

export function parseGeneralReceiptRemarks(remarks: unknown): any {
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

// ---------------------------------------------------------------------------
// PDF Receipt Generator
// ---------------------------------------------------------------------------
export const buildGeneralReceiptPDFDoc = (
  tx: GeneralReceiptTransaction,
  userName?: string
): jsPDF => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a5",
  });

  const parsed = parseGeneralReceiptRemarks(tx.remarks);
  const recipientName =
    parsed?.recipientName || tx.studentName || "Recipient";
  const recipientPhone = parsed?.recipientPhone || "";
  const isStudent = parsed?.recipientType === "student" || !!tx.studentId;
  const enrollmentNo = parsed?.studentEnrollmentNo || tx.enrollmentNo;
  const courseName = parsed?.studentCourse;
  const category = parsed?.category || tx.feeType || "Miscellaneous";
  const narration = parsed?.narration || "";
  const items: Array<{ description: string; quantity: number; unitPrice: number; amount: number }> =
    Array.isArray(parsed?.items) && parsed.items.length > 0 ? parsed.items : [];
  const notes = parsed?.notes || "";
  const amt = Number(tx.amount || 0);

  // Top Banner (Teal 600)
  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, 148, 20, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("ACME COLLEGE OF NURSING", 10, 9);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`${category.toUpperCase()} PAYMENT RECEIPT`, 10, 15);

  const receiptNo = tx.receiptNumber || "RCP-GEN";
  const paymentDate = tx.paymentDate || format(new Date(), "yyyy-MM-dd");
  const paymentMode = (tx.paymentMode || "cash").toUpperCase();

  doc.setFontSize(7.5);
  doc.text(`Receipt No: ${receiptNo}`, 138, 9, { align: "right" });
  doc.text(`Payment Date: ${paymentDate}`, 138, 15, { align: "right" });

  // Recipient & Payment Metadata
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8);

  let metaY = 26;
  const labelX = 10;
  const valueX = 42;
  const lineSpacing = 4.5;

  // Row 1: Recipient Name
  doc.setFont("helvetica", "bold");
  doc.text(isStudent ? "Student Name:" : "Received From:", labelX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(recipientName, valueX, metaY);
  metaY += lineSpacing;

  // Row 2: Recipient Details (Enrollment No or Contact Phone)
  if (isStudent && enrollmentNo) {
    doc.setFont("helvetica", "bold");
    doc.text("Enrollment No:", labelX, metaY);
    doc.setFont("helvetica", "normal");
    doc.text(`${enrollmentNo}${courseName ? ` (${courseName})` : ""}`, valueX, metaY);
    metaY += lineSpacing;
  } else if (recipientPhone) {
    doc.setFont("helvetica", "bold");
    doc.text("Contact Phone:", labelX, metaY);
    doc.setFont("helvetica", "normal");
    doc.text(recipientPhone, valueX, metaY);
    metaY += lineSpacing;
  }

  // Row 3: Category
  doc.setFont("helvetica", "bold");
  doc.text("Receipt Category:", labelX, metaY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(13, 148, 136); // Teal highlight
  doc.text(category, valueX, metaY);
  doc.setTextColor(30, 41, 59);
  metaY += lineSpacing;

  // Row 4: Payment Mode
  doc.setFont("helvetica", "bold");
  doc.text("Payment Mode:", labelX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(paymentMode, valueX, metaY);
  metaY += lineSpacing + 1.5;

  let startY = metaY;

  // Render Table of Items or Single Row
  if (items.length > 0) {
    const tableData = items.map((it) => [
      it.description,
      String(it.quantity || 1),
      `INR ${Number(it.unitPrice || 0).toLocaleString()}`,
      `INR ${Number(it.amount || 0).toLocaleString()}`,
    ]);

    autoTable(doc, {
      startY: metaY,
      margin: { left: 10, right: 10 },
      head: [["Item Description / Particulars", "Qty", "Unit Rate", "Amount"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [13, 148, 136],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 64 },
        1: { cellWidth: 16, halign: "center" },
        2: { cellWidth: 24, halign: "right" },
        3: { cellWidth: 24, halign: "right" },
      },
    });

    startY = (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY + 4
      : metaY + 28;
  } else {
    autoTable(doc, {
      startY: metaY,
      margin: { left: 10, right: 10 },
      head: [["Particulars / Purpose", "Category", "Amount"]],
      body: [
        [
          narration || category,
          category,
          `INR ${amt.toLocaleString()}`,
        ],
      ],
      theme: "striped",
      headStyles: {
        fillColor: [13, 148, 136],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7.5,
      },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 30, halign: "center" },
        2: { cellWidth: 28, halign: "right" },
      },
    });

    startY = (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY + 4
      : metaY + 20;
  }

  // Narration Box if present (when itemized list was used and narration exists separately)
  if (items.length > 0 && narration) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(10, startY, 128, 10, 1, 1, "FD");
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(71, 85, 105);
    const narrationLines = doc.splitTextToSize(`Narration: ${narration}`, 124);
    doc.text(narrationLines, 13, startY + 4.5);
    startY += 12;
  }

  // Total Amount Box
  doc.setFillColor(240, 253, 250); // Teal 50
  doc.setDrawColor(204, 251, 241); // Teal 100
  doc.roundedRect(10, startY, 128, 12, 1.5, 1.5, "FD");

  doc.setTextColor(13, 148, 136);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL AMOUNT RECEIVED:", 14, startY + 7.5);
  doc.setFontSize(9.5);
  doc.text(`INR ${amt.toLocaleString()}`, 134, startY + 7.5, { align: "right" });

  // Optional Remarks / Notes
  if (notes) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "italic");
    doc.text(`* Remarks / Ref: ${notes}`, 10, startY + 16.5);
  }

  // Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(10, 195, 138, 195);

  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Prepared by: ${userName || "Cashier / Accounts Officer"}`, 10, 201);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  doc.text("This is a system generated receipt.", 138, 201, { align: "right" });

  return doc;
};

export const generateGeneralReceiptPDF = (
  tx: GeneralReceiptTransaction,
  userName?: string
) => {
  const doc = buildGeneralReceiptPDFDoc(tx, userName);
  doc.save(`Receipt-${tx.receiptNumber}.pdf`);
};

export const printGeneralReceiptPDF = (
  tx: GeneralReceiptTransaction,
  userName?: string
) => {
  const doc = buildGeneralReceiptPDFDoc(tx, userName);
  const pdfBlob = doc.output("blob");
  const blobUrl = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(blobUrl, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }
};

export const formatGeneralReceiptWhatsAppMessage = (
  tx: GeneralReceiptTransaction
): string => {
  const parsed = parseGeneralReceiptRemarks(tx.remarks);
  const recipientName =
    parsed?.recipientName || tx.studentName || "Recipient";
  const category = parsed?.category || tx.feeType || "Miscellaneous";
  const amt = Number(tx.amount || 0);

  const lines: string[] = [];
  lines.push(`*ACME COLLEGE OF NURSING*`);
  lines.push(`🧾 *OFFICIAL ${category.toUpperCase()} RECEIPT*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`*Receipt No:* ${tx.receiptNumber}`);
  lines.push(`*Date:* ${tx.paymentDate}`);
  lines.push(`*Received From:* ${recipientName}`);
  if (parsed?.studentEnrollmentNo || tx.enrollmentNo) {
    lines.push(`*Enrollment No:* ${parsed?.studentEnrollmentNo || tx.enrollmentNo}`);
  }
  lines.push(`*Category:* ${category}`);
  lines.push(`*Payment Mode:* ${(tx.paymentMode || "cash").toUpperCase()}`);
  lines.push(`*Total Amount Paid:* ₹${amt.toLocaleString()}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📎 *Official PDF Receipt Attached*`);
  lines.push(``);
  lines.push(`Thank you! For queries, please contact College Accounts.`);

  return lines.join("\n");
};

export const shareGeneralReceiptPDFViaWhatsApp = async (
  tx: GeneralReceiptTransaction,
  phone: string,
  userName?: string
) => {
  const doc = buildGeneralReceiptPDFDoc(tx, userName);
  const filename = `Receipt-${tx.receiptNumber}.pdf`;
  const pdfBlob = doc.output("blob");
  const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

  let cleanPhone = (phone || "").replace(/\D/g, "");
  if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

  const messageText = formatGeneralReceiptWhatsAppMessage(tx);

  // 1. Try Native Web Share API (attaches actual PDF file directly to WhatsApp on mobile & supported browsers)
  if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
    try {
      await navigator.share({
        files: [pdfFile],
        title: `Receipt-${tx.receiptNumber}`,
        text: messageText,
      });
      toast.success("Receipt PDF shared via WhatsApp!");
      return true;
    } catch (err: any) {
      if (err.name === "AbortError") return false;
    }
  }

  // 2. Desktop Fallback: Automatically save the PDF and launch WhatsApp chat
  doc.save(filename);
  toast.info("Receipt PDF saved! Opening WhatsApp chat so you can attach it...");
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
    : `https://wa.me/?text=${encodeURIComponent(messageText)}`;
  window.open(waUrl, "_blank");
  return true;
};

export const openWhatsAppGeneralReceipt = (phone: string, text: string) => {
  let clean = (phone || "").replace(/\D/g, "");
  if (!clean) {
    toast.error("Please enter a valid recipient phone number.");
    return false;
  }
  if (clean.length === 10) {
    clean = `91${clean}`;
  }
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
  return true;
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function GeneralReceiptsPage() {
  const queryClient = useQueryClient();
  const { session } = Route.useRouteContext() as { session?: any };
  const currentUserName = session?.data?.user?.name || session?.user?.name || "Cashier / Accounts Officer";

  // Filter & Pagination States
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [paymentModeFilter, setPaymentModeFilter] = React.useState("all");
  const [recipientTypeFilter, setRecipientTypeFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [fromPopoverOpen, setFromPopoverOpen] = React.useState(false);
  const [toPopoverOpen, setToPopoverOpen] = React.useState(false);

  // Modal States
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [pendingPayload, setPendingPayload] = React.useState<any | null>(null);
  const [viewReceiptTx, setViewReceiptTx] = React.useState<GeneralReceiptTransaction | null>(null);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = React.useState(false);
  const [whatsappRecipientPhone, setWhatsappRecipientPhone] = React.useState("");

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch Students for Autocomplete
  const { data: students = [] } = useQuery<any[]>({
    queryKey: ["nursing", "students", "active-list"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/students");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json.data || [];
    },
  });

  const activeStudentOptions = React.useMemo<[string, string][]>(() => {
    return students
      .filter((s: any) => s.status === "active")
      .map((s: any) => [
        String(s.id),
        `${s.name} (${s.enrollmentNo || "No Enrol"}) - ${s.courseName || "Nursing"} - AY ${s.batchYear || ""}`,
      ]);
  }, [students]);

  // Fetch General Receipts
  const {
    data: receiptsResponse,
    isLoading,
    isFetching,
  } = useQuery<{
    data: GeneralReceiptTransaction[];
    pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
    summary: {
      totalReceipts: number;
      totalCollected: number;
      filteredReceipts: number;
      filteredCollected: number;
      categoryStats: Record<string, { count: number; totalAmount: number }>;
    };
  }>({
    queryKey: [
      "nursing",
      "general-receipts",
      page,
      pageSize,
      categoryFilter,
      paymentModeFilter,
      recipientTypeFilter,
      debouncedSearch,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      if (paymentModeFilter && paymentModeFilter !== "all") params.set("paymentMode", paymentModeFilter);
      if (recipientTypeFilter && recipientTypeFilter !== "all") params.set("recipientType", recipientTypeFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/nursing/general-receipts?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch general receipts");
      }
      return res.json();
    },
  });

  const receipts = receiptsResponse?.data || [];
  const pagination = receiptsResponse?.pagination || { page: 1, pageSize: 15, totalRecords: 0, totalPages: 1 };
  const summary = receiptsResponse?.summary || {
    totalReceipts: 0,
    totalCollected: 0,
    filteredReceipts: 0,
    filteredCollected: 0,
    categoryStats: {},
  };

  // Form Setup
  const form = useForm<GeneralReceiptFormValues>({
    resolver: zodResolver(generalReceiptFormSchema) as any,
    defaultValues: {
      recipientType: "direct",
      studentId: null,
      recipientName: "",
      recipientPhone: "",
      recipientEmail: "",
      category: "Sale of Prospectus",
      narration: "",
      useItemizedList: false,
      items: [
        {
          description: "Prospectus Kit & Admission Form",
          quantity: 1,
          unitPrice: 500,
          amount: 500,
        },
      ],
      amount: 500,
      paymentMode: "cash",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      remarks: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchRecipientType = form.watch("recipientType");
  const watchCategory = form.watch("category");
  const watchUseItemizedList = form.watch("useItemizedList");
  const watchItems = form.watch("items");

  // Auto calculate total amount from items if itemized list is used
  React.useEffect(() => {
    if (watchUseItemizedList && Array.isArray(watchItems) && watchItems.length > 0) {
      const calculatedTotal = watchItems.reduce(
        (sum, item) => sum + Number(item?.amount || 0),
        0
      );
      if (calculatedTotal > 0) {
        form.setValue("amount", calculatedTotal);
      }
    }
  }, [watchUseItemizedList, watchItems, form]);

  // Create General Receipt Mutation
  const createReceiptMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/nursing/general-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate general receipt");
      }
      return res.json();
    },
    onSuccess: (newTx) => {
      toast.success(`General Receipt Generated! Number: ${newTx.receiptNumber}`);
      queryClient.invalidateQueries({ queryKey: ["nursing", "general-receipts"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "fee-transactions"] });
      setConfirmModalOpen(false);
      setCreateModalOpen(false);
      setPendingPayload(null);
      form.reset();

      // Open View / Print dialog immediately
      setViewReceiptTx(newTx);
      setViewModalOpen(true);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate receipt");
    },
  });

  const handleStudentSelect = (studentIdStr: string) => {
    const sid = Number(studentIdStr);
    const selectedStudent = students.find((s: any) => s.id === sid);
    if (selectedStudent) {
      form.setValue("studentId", sid);
      form.setValue("recipientName", selectedStudent.name);
      form.setValue("recipientPhone", selectedStudent.phone || "");
      form.setValue("recipientEmail", selectedStudent.email || "");
    }
  };

  const handleCategorySelect = (catValue: string) => {
    form.setValue("category", catValue);
    // Set smart default narration and item description
    if (catValue === "Sale of Prospectus") {
      form.setValue("narration", "Prospectus kit with official nursing admission application form.");
      if (watchUseItemizedList) {
        form.setValue("items", [
          { description: "Prospectus Kit & Admission Form", quantity: 1, unitPrice: 500, amount: 500 },
        ]);
        form.setValue("amount", 500);
      }
    } else if (catValue === "Uniform") {
      form.setValue("narration", "Official nursing student clinical uniform & lab coat kit.");
      if (watchUseItemizedList) {
        form.setValue("items", [
          { description: "Clinical Uniform Set (Top & Trousers)", quantity: 1, unitPrice: 2000, amount: 2000 },
          { description: "Lab Coat with College Emblem", quantity: 1, unitPrice: 800, amount: 800 },
        ]);
        form.setValue("amount", 2800);
      }
    } else if (catValue === "Books & Stationary") {
      form.setValue("narration", "Textbooks, clinical log books, and curriculum course study material.");
    } else if (catValue === "ID Card & Badge") {
      form.setValue("narration", "Student identification smart badge & lanyard replacement.");
      form.setValue("amount", 150);
    } else if (catValue === "Certificate & Verification") {
      form.setValue("narration", "Official document transcript, bonafide verification certificate fee.");
      form.setValue("amount", 300);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Receipt className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              General & Miscellaneous Receipts
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              ACON
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Issue receipts for generic transactions such as Prospectus Sales, Uniforms, Books & Stationery, Certificates, and Miscellaneous collections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              form.reset({
                recipientType: "direct",
                studentId: null,
                recipientName: "",
                recipientPhone: "",
                recipientEmail: "",
                category: "Sale of Prospectus",
                narration: "Prospectus kit with official nursing admission application form.",
                useItemizedList: false,
                items: [
                  { description: "Prospectus Kit & Admission Form", quantity: 1, unitPrice: 500, amount: 500 },
                ],
                amount: 500,
                paymentMode: "cash",
                paymentDate: format(new Date(), "yyyy-MM-dd"),
                remarks: "",
              });
              setCreateModalOpen(true);
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-xs"
          >
            <Plus size={16} />
            Generate General Receipt
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-teal-200 dark:border-teal-900 bg-gradient-to-br from-card to-teal-50/30 dark:to-teal-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total General Receipts</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{summary.totalReceipts}</h3>
              <p className="text-[11px] text-teal-700 dark:text-teal-300 mt-0.5 font-medium">
                {summary.filteredReceipts} matching filters
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-700 dark:text-teal-300 shrink-0">
              <Receipt size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-card to-emerald-50/30 dark:to-emerald-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Revenue Collected</p>
              <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                ₹{summary.totalCollected.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Filtered: ₹{summary.filteredCollected.toLocaleString()}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
              <CreditCard size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-br from-card to-amber-50/30 dark:to-amber-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Prospectus Sales</p>
              <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                ₹{(summary.categoryStats["Sale of Prospectus"]?.totalAmount || 0).toLocaleString()}
              </h3>
              <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5 font-medium">
                {summary.categoryStats["Sale of Prospectus"]?.count || 0} Prospectuses Sold
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
              <FileText size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-900 bg-gradient-to-br from-card to-purple-50/30 dark:to-purple-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Uniforms & Books</p>
              <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                ₹{((summary.categoryStats["Uniform"]?.totalAmount || 0) + (summary.categoryStats["Books & Stationary"]?.totalAmount || 0)).toLocaleString()}
              </h3>
              <p className="text-[11px] text-purple-800 dark:text-purple-400 mt-0.5 font-medium">
                {(summary.categoryStats["Uniform"]?.count || 0) + (summary.categoryStats["Books & Stationary"]?.count || 0)} Transactions
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0">
              <Shirt size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search by receipt no, recipient name, phone, or narration..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-hidden focus:ring-1 focus:ring-teal-500 h-9"
              />
            </div>

            {/* Category Dropdown */}
            <div className="w-full lg:w-[200px]">
              <Select
                value={categoryFilter}
                onValueChange={(val) => {
                  setCategoryFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                  {GENERAL_RECEIPT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="text-xs">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Recipient Type Dropdown */}
            <div className="w-full lg:w-[150px]">
              <Select
                value={recipientTypeFilter}
                onValueChange={(val) => {
                  setRecipientTypeFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Recipients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Recipients</SelectItem>
                  <SelectItem value="student" className="text-xs">Students Only</SelectItem>
                  <SelectItem value="direct" className="text-xs">Direct / Visitors</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Mode Dropdown */}
            <div className="w-full lg:w-[150px]">
              <Select
                value={paymentModeFilter}
                onValueChange={(val) => {
                  setPaymentModeFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Payment Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Modes</SelectItem>
                  <SelectItem value="cash" className="text-xs">Cash</SelectItem>
                  <SelectItem value="bank_transfer" className="text-xs">Bank Transfer</SelectItem>
                  <SelectItem value="upi" className="text-xs">UPI / QR</SelectItem>
                  <SelectItem value="card" className="text-xs">Card</SelectItem>
                  <SelectItem value="cheque" className="text-xs">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range: Start Date */}
            <Popover open={fromPopoverOpen} onOpenChange={setFromPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 px-2.5 text-xs font-normal justify-start text-left bg-background border",
                    !startDate && "text-muted-foreground",
                    startDate && "text-foreground font-medium border-teal-600/40 bg-teal-50/20"
                  )}
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-teal-600 shrink-0" />
                  {startDate ? (
                    <span className="flex items-center gap-1">
                      From: {format(new Date(startDate + "T00:00:00"), "dd MMM yyyy")}
                      <span
                        role="button"
                        tabIndex={0}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStartDate("");
                          setPage(1);
                        }}
                      >
                        <X size={11} />
                      </span>
                    </span>
                  ) : (
                    <span>From Date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <CalendarPicker
                  mode="single"
                  selected={startDate ? new Date(startDate + "T00:00:00") : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, "0");
                      const dd = String(date.getDate()).padStart(2, "0");
                      setStartDate(`${yyyy}-${mm}-${dd}`);
                    } else {
                      setStartDate("");
                    }
                    setPage(1);
                    setFromPopoverOpen(false);
                  }}
                  captionLayout="dropdown"
                  startMonth={new Date(2020, 0)}
                  endMonth={new Date(2035, 11)}
                />
              </PopoverContent>
            </Popover>

            {/* Date Range: End Date */}
            <Popover open={toPopoverOpen} onOpenChange={setToPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-9 px-2.5 text-xs font-normal justify-start text-left bg-background border",
                    !endDate && "text-muted-foreground",
                    endDate && "text-foreground font-medium border-teal-600/40 bg-teal-50/20"
                  )}
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-teal-600 shrink-0" />
                  {endDate ? (
                    <span className="flex items-center gap-1">
                      To: {format(new Date(endDate + "T00:00:00"), "dd MMM yyyy")}
                      <span
                        role="button"
                        tabIndex={0}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEndDate("");
                          setPage(1);
                        }}
                      >
                        <X size={11} />
                      </span>
                    </span>
                  ) : (
                    <span>To Date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-50" align="start">
                <CalendarPicker
                  mode="single"
                  selected={endDate ? new Date(endDate + "T00:00:00") : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, "0");
                      const dd = String(date.getDate()).padStart(2, "0");
                      setEndDate(`${yyyy}-${mm}-${dd}`);
                    } else {
                      setEndDate("");
                    }
                    setPage(1);
                    setToPopoverOpen(false);
                  }}
                  captionLayout="dropdown"
                  startMonth={new Date(2020, 0)}
                  endMonth={new Date(2035, 11)}
                />
              </PopoverContent>
            </Popover>

            {/* Reset Filters */}
            {(categoryFilter !== "all" || paymentModeFilter !== "all" || recipientTypeFilter !== "all" || searchQuery || startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategoryFilter("all");
                  setPaymentModeFilter("all");
                  setRecipientTypeFilter("all");
                  setSearchQuery("");
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
                className="text-xs h-9 text-muted-foreground hover:text-foreground"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Receipts Ledger Table */}
      <Card>
        <CardHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-semibold">General Receipts Ledger</CardTitle>
              <CardDescription className="text-xs">
                Showing {receipts.length} of {pagination.totalRecords} receipts
              </CardDescription>
            </div>
            {isFetching && (
              <span className="text-xs text-teal-600 dark:text-teal-400 font-medium animate-pulse">
                Updating ledger...
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground border-b font-semibold">
                  <th className="p-3">Receipt No</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Recipient</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Narration & Particulars</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      Loading general receipts...
                    </td>
                  </tr>
                ) : receipts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No general receipts found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  receipts.map((tx) => {
                    const parsed = parseGeneralReceiptRemarks(tx.remarks);
                    const isStudent = parsed?.recipientType === "student" || !!tx.studentId;
                    const recipientName =
                      parsed?.recipientName || tx.studentName || "Direct Recipient";
                    const recipientPhone = parsed?.recipientPhone;
                    const enrollmentNo = parsed?.studentEnrollmentNo || tx.enrollmentNo;
                    const category = parsed?.category || tx.feeType || "Miscellaneous";
                    const narration = parsed?.narration || "";
                    const items = Array.isArray(parsed?.items) ? parsed.items : [];
                    const categoryMatch = GENERAL_RECEIPT_CATEGORIES.find(
                      (c) => c.value.toLowerCase() === category.toLowerCase()
                    );

                    return (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                        {/* Receipt No */}
                        <td className="p-3 font-mono font-bold text-teal-700 dark:text-teal-300">
                          {tx.receiptNumber}
                        </td>

                        {/* Date */}
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {tx.paymentDate}
                        </td>

                        {/* Recipient */}
                        <td className="p-3">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                              <span>{recipientName}</span>
                              {isStudent ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800">
                                  <GraduationCap size={10} /> Student
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-800">
                                  <User size={10} /> Direct
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              {isStudent && enrollmentNo ? (
                                <span>Enrol: {enrollmentNo}</span>
                              ) : recipientPhone ? (
                                <span>Ph: {recipientPhone}</span>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="p-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border",
                              categoryMatch?.color || "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {categoryMatch && <categoryMatch.icon size={11} />}
                            {category}
                          </span>
                        </td>

                        {/* Narration & Particulars */}
                        <td className="p-3 max-w-[280px]">
                          {items.length > 0 ? (
                            <div className="space-y-0.5">
                              <p className="font-medium text-foreground truncate">
                                {items.map((i: any) => `${i.description} (${i.quantity})`).join(", ")}
                              </p>
                              {narration && (
                                <p className="text-[11px] text-muted-foreground truncate italic">
                                  {narration}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-muted-foreground truncate" title={narration}>
                              {narration || "—"}
                            </p>
                          )}
                        </td>

                        {/* Mode */}
                        <td className="p-3 capitalize text-muted-foreground whitespace-nowrap">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted border">
                            {tx.paymentMode}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="p-3 text-right font-bold text-foreground font-mono">
                          ₹{Number(tx.amount || 0).toLocaleString()}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950"
                              onClick={() => {
                                setViewReceiptTx(tx);
                                setViewModalOpen(true);
                              }}
                              title="View & Print Receipt"
                            >
                              <Printer size={13} className="mr-1" /> View / Print
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                              onClick={() => {
                                setViewReceiptTx(tx);
                                const parsedR = parseGeneralReceiptRemarks(tx.remarks);
                                setWhatsappRecipientPhone(parsedR?.recipientPhone || "");
                                setWhatsappModalOpen(true);
                              }}
                              title="Share via WhatsApp"
                            >
                              <MessageSquare size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Footer */}
          <div className="p-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            {/* Rows Per Page & Record Info */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">Rows per page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-[68px] text-xs bg-background">
                    <SelectValue placeholder={String(pageSize)} />
                  </SelectTrigger>
                  <SelectContent side="top">
                    <SelectItem value="10" className="text-xs">10</SelectItem>
                    <SelectItem value="15" className="text-xs">15</SelectItem>
                    <SelectItem value="25" className="text-xs">25</SelectItem>
                    <SelectItem value="50" className="text-xs">50</SelectItem>
                    <SelectItem value="100" className="text-xs">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <span>
                {pagination.totalRecords > 0 ? (
                  <>
                    Showing <strong className="text-foreground">{(pagination.page - 1) * pagination.pageSize + 1}</strong>–
                    <strong className="text-foreground">
                      {Math.min(pagination.page * pagination.pageSize, pagination.totalRecords)}
                    </strong>{" "}
                    of <strong className="text-foreground">{pagination.totalRecords}</strong> records
                  </>
                ) : (
                  "0 records found"
                )}
              </span>
            </div>

            {/* Page Navigation Buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={pagination.page <= 1}
                onClick={() => setPage(1)}
                title="First Page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>

              <span className="px-2 font-medium text-foreground text-xs">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>

              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={pagination.page >= pagination.totalPages || pagination.totalPages === 0}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={pagination.page >= pagination.totalPages || pagination.totalPages === 0}
                onClick={() => setPage(pagination.totalPages)}
                title="Last Page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate General Receipt Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
              <Receipt className="h-5 w-5" /> Generate General / Misc Receipt
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record receipt collection for Prospectus Sales, Books & Stationery, Uniforms, ID Badges, or Custom Services.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit((values: GeneralReceiptFormValues) => {
              if (values.amount <= 0) {
                toast.error("Receipt amount must be greater than zero.");
                return;
              }
              if (!values.recipientName || !values.recipientName.trim()) {
                toast.error("Recipient name is required.");
                return;
              }
              setPendingPayload(values);
              setConfirmModalOpen(true);
            })}
            className="space-y-4 py-2 text-xs"
          >
            {/* Recipient Type Toggle */}
            <div className="p-3 rounded-xl border bg-muted/20 space-y-3">
              <label className="font-semibold text-foreground block">1. Select Recipient Type *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    form.setValue("recipientType", "student");
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                    watchRecipientType === "student"
                      ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                      : "bg-background text-muted-foreground hover:text-foreground border-input"
                  )}
                >
                  <GraduationCap size={15} />
                  Enrolled College Student
                </button>
                <button
                  type="button"
                  onClick={() => {
                    form.setValue("recipientType", "direct");
                    form.setValue("studentId", null);
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                    watchRecipientType === "direct"
                      ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                      : "bg-background text-muted-foreground hover:text-foreground border-input"
                  )}
                >
                  <User size={15} />
                  Direct Recipient / External Visitor
                </button>
              </div>

              {watchRecipientType === "student" ? (
                <div className="space-y-2 pt-1">
                  <label className="text-[11px] font-medium text-foreground block">
                    Search Active Student by Name, Enrollment No, or Course *
                  </label>
                  <Autocomplete
                    value={form.watch("studentId") ? String(form.watch("studentId")) : ""}
                    placeholder="Type student name or enrollment number..."
                    options={activeStudentOptions}
                    onChange={handleStudentSelect}
                  />
                  {form.watch("studentId") && (
                    <p className="text-[11px] text-teal-700 dark:text-teal-300 font-medium">
                      ✓ Selected Student: <strong>{form.watch("recipientName")}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-medium text-foreground block mb-1">
                      Recipient Full Name *
                    </label>
                    <Controller
                      control={form.control}
                      name="recipientName"
                      render={({ field }) => (
                        <Input
                          placeholder="e.g. Rahul Sharma, Prospective Parent / Candidate"
                          {...field}
                          className="h-8 text-xs bg-background"
                        />
                      )}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-foreground block mb-1">
                      Contact Phone / WhatsApp No (Optional)
                    </label>
                    <Controller
                      control={form.control}
                      name="recipientPhone"
                      render={({ field }) => (
                        <Input
                          placeholder="e.g. 9876543210"
                          {...field}
                          value={field.value || ""}
                          className="h-8 text-xs bg-background"
                        />
                      )}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Category Selector */}
            <div className="p-3 rounded-xl border bg-muted/20 space-y-2.5">
              <label className="font-semibold text-foreground block">2. Receipt Category *</label>
              <div className="flex flex-wrap gap-1.5">
                {GENERAL_RECEIPT_CATEGORIES.map((cat) => {
                  const isSelected = watchCategory === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => handleCategorySelect(cat.value)}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                        isSelected
                          ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                          : "bg-background text-muted-foreground hover:text-foreground border-input"
                      )}
                    >
                      <cat.icon size={13} />
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom Category Input if needed */}
              <div className="pt-1">
                <Controller
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <Input
                      placeholder="Or enter custom category name..."
                      {...field}
                      className="h-8 text-xs bg-background"
                    />
                  )}
                />
              </div>
            </div>

            {/* Narration & Description */}
            <div className="p-3 rounded-xl border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center">
                <label className="font-semibold text-foreground block">3. Narration & Particulars</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="use-itemized-cb"
                    checked={watchUseItemizedList}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => form.setValue("useItemizedList", e.target.checked)}
                    className="h-3.5 w-3.5 rounded text-teal-600 cursor-pointer"
                  />
                  <label htmlFor="use-itemized-cb" className="text-[11px] font-medium text-foreground cursor-pointer">
                    Use Itemized Breakdown Table
                  </label>
                </div>
              </div>

              <Controller
                control={form.control}
                name="narration"
                render={({ field }) => (
                  <textarea
                    placeholder="Enter detailed description, purpose, kit contents, batch year, or candidate remarks..."
                    {...field}
                    value={field.value || ""}
                    rows={2}
                    className="w-full text-xs bg-background rounded-md border border-input p-2 resize-none focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                )}
              />

              {/* Itemized Table Builder if checked */}
              {watchUseItemizedList && (
                <div className="pt-2 space-y-2 border-t mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-teal-800 dark:text-teal-300">
                      Line Items (Items & Quantity):
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => append({ description: "", quantity: 1, unitPrice: 0, amount: 0 })}
                      className="h-6 text-[11px] px-2 text-teal-600 border-teal-300"
                    >
                      <Plus size={11} className="mr-0.5" /> Add Row
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    {fields.map((itemField, index) => (
                      <div key={itemField.id} className="flex items-center gap-2">
                        <Input
                          placeholder="Item Description"
                          {...form.register(`items.${index}.description`)}
                          className="h-7 text-xs flex-1 bg-background"
                        />
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          {...form.register(`items.${index}.quantity`, {
                            valueAsNumber: true,
                            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                              const qty = Number(e.target.value) || 1;
                              const rate = Number(form.getValues(`items.${index}.unitPrice`)) || 0;
                              form.setValue(`items.${index}.amount`, qty * rate);
                            },
                          })}
                          className="h-7 text-xs w-[60px] text-center bg-background"
                        />
                        <Input
                          type="number"
                          min="0"
                          placeholder="Unit Rate"
                          {...form.register(`items.${index}.unitPrice`, {
                            valueAsNumber: true,
                            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                              const rate = Number(e.target.value) || 0;
                              const qty = Number(form.getValues(`items.${index}.quantity`)) || 1;
                              form.setValue(`items.${index}.amount`, qty * rate);
                            },
                          })}
                          className="h-7 text-xs w-[80px] text-right bg-background"
                        />
                        <Input
                          type="number"
                          min="0"
                          placeholder="Amount"
                          {...form.register(`items.${index}.amount`, { valueAsNumber: true })}
                          className="h-7 text-xs w-[90px] text-right bg-background font-semibold"
                        />
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => remove(index)}
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 size={12} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Mode, Date & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl border bg-muted/20">
              {/* Total Amount */}
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Total Amount Received (₹) *
                </label>
                <Controller
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <Input
                      type="number"
                      min="1"
                      placeholder="0"
                      {...field}
                      value={field.value || ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(Number(e.target.value))}
                      className="h-9 text-base font-bold text-teal-700 dark:text-teal-300 font-mono bg-background"
                    />
                  )}
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="font-semibold text-foreground block mb-1">Payment Mode *</label>
                <Controller
                  control={form.control}
                  name="paymentMode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-9 text-xs bg-background">
                        <SelectValue placeholder="Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash" className="text-xs">Cash</SelectItem>
                        <SelectItem value="bank_transfer" className="text-xs">Bank Transfer / NEFT</SelectItem>
                        <SelectItem value="upi" className="text-xs">UPI / GPay / PhonePe</SelectItem>
                        <SelectItem value="card" className="text-xs">Credit / Debit Card</SelectItem>
                        <SelectItem value="cheque" className="text-xs">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="font-semibold text-foreground block mb-1">Payment Date *</label>
                <Controller
                  control={form.control}
                  name="paymentDate"
                  render={({ field }) => {
                    const selectedDate = field.value ? new Date(field.value) : new Date();
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-9 text-xs border-input bg-background",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-teal-600" />
                            {field.value ? format(selectedDate, "PPP") : "Pick Date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 z-99999" align="start">
                          <CalendarPicker
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(format(date, "yyyy-MM-dd"));
                              }
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    );
                  }}
                />
              </div>
            </div>

            {/* Optional Remarks */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                Transaction Reference / Internal Remarks (Optional)
              </label>
              <Controller
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <Input
                    placeholder="e.g. UTR Ref No, Cheque No, Bank Name, or notes"
                    {...field}
                    value={field.value || ""}
                    className="h-8 text-xs bg-background"
                  />
                )}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white"
                disabled={form.watch("amount") <= 0}
              >
                Proceed to Issue Receipt (₹{Number(form.watch("amount") || 0).toLocaleString()})
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700">
              <CheckCircle className="h-5 w-5 text-teal-600" /> Confirm General Receipt
            </DialogTitle>
            <DialogDescription className="text-xs">
              Please verify the recipient details and collection amount before recording.
            </DialogDescription>
          </DialogHeader>

          {pendingPayload && (
            <div className="space-y-3 text-xs py-2">
              <div className="bg-muted/40 p-3.5 rounded-xl space-y-2 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipient Name:</span>
                  <span className="font-bold text-foreground">{pendingPayload.recipientName}</span>
                </div>
                {pendingPayload.recipientPhone && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contact Phone:</span>
                    <span className="font-mono">{pendingPayload.recipientPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-semibold text-teal-700 dark:text-teal-300">
                    {pendingPayload.category}
                  </span>
                </div>
                {pendingPayload.narration && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Narration:</span>
                    <span className="font-medium text-right max-w-[240px] truncate">
                      {pendingPayload.narration}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-bold text-sm">
                  <span className="text-foreground">Total Amount:</span>
                  <span className="text-teal-600 dark:text-teal-400 text-base">
                    ₹{Number(pendingPayload.amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground pt-1 text-[11px]">
                  <span>Mode: <strong>{String(pendingPayload.paymentMode).toUpperCase()}</strong></span>
                  <span>Date: <strong>{pendingPayload.paymentDate}</strong></span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              disabled={createReceiptMutation.isPending}
            >
              Back to Edit
            </Button>
            <Button
              type="button"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={createReceiptMutation.isPending}
              onClick={() => {
                if (pendingPayload) {
                  createReceiptMutation.mutate(pendingPayload);
                }
              }}
            >
              {createReceiptMutation.isPending ? "Issuing..." : "Confirm & Issue Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View & Print Receipt Dialog */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
          {viewReceiptTx && (
            <div className="p-6 space-y-4">
              <div className="border-b pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-teal-700 dark:text-teal-400">
                    ACME College of Nursing
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Official Miscellaneous / General Payment Receipt
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2.5 py-1 rounded font-bold border border-teal-200 dark:border-teal-800 block">
                    {viewReceiptTx.receiptNumber}
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-1">
                    Date: {viewReceiptTx.paymentDate}
                  </span>
                </div>
              </div>

              {(() => {
                const parsed = parseGeneralReceiptRemarks(viewReceiptTx.remarks);
                const recipientName =
                  parsed?.recipientName || viewReceiptTx.studentName || "Recipient";
                const isStudent = parsed?.recipientType === "student" || !!viewReceiptTx.studentId;
                const enrollmentNo = parsed?.studentEnrollmentNo || viewReceiptTx.enrollmentNo;
                const category = parsed?.category || viewReceiptTx.feeType || "Miscellaneous";
                const narration = parsed?.narration || "";
                const items = Array.isArray(parsed?.items) ? parsed.items : [];

                return (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-lg border">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Received From:</span>
                        <span className="font-bold text-foreground text-sm">{recipientName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[11px]">
                          {isStudent ? "Enrollment / Student ID:" : "Contact Phone:"}
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {isStudent ? enrollmentNo || "N/A" : parsed?.recipientPhone || "N/A"}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block text-[11px]">Category / Purpose:</span>
                        <span className="font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800 inline-block mt-0.5">
                          {category}
                        </span>
                      </div>
                    </div>

                    {/* Particulars Breakdown */}
                    {items.length > 0 ? (
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/60 text-muted-foreground border-b font-semibold text-[11px]">
                              <th className="p-2">Particulars / Item</th>
                              <th className="p-2 text-center">Qty</th>
                              <th className="p-2 text-right">Unit Rate</th>
                              <th className="p-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {items.map((it: any, idx: number) => (
                              <tr key={idx}>
                                <td className="p-2 font-medium text-foreground">{it.description}</td>
                                <td className="p-2 text-center">{it.quantity}</td>
                                <td className="p-2 text-right">₹{Number(it.unitPrice || 0).toLocaleString()}</td>
                                <td className="p-2 text-right font-bold">₹{Number(it.amount || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : narration ? (
                      <div className="p-3 bg-muted/30 rounded-lg border">
                        <span className="text-[11px] text-muted-foreground font-semibold block mb-0.5">
                          Narration / Description:
                        </span>
                        <p className="text-foreground italic">{narration}</p>
                      </div>
                    ) : null}

                    {/* Total Amount Box */}
                    <div className="border rounded-lg p-3.5 bg-teal-50/50 dark:bg-teal-950/30 flex justify-between items-center">
                      <div>
                        <span className="text-xs text-teal-800 dark:text-teal-300 font-bold block">
                          TOTAL AMOUNT RECEIVED
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Payment Mode: {String(viewReceiptTx.paymentMode).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                        ₹{Number(viewReceiptTx.amount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <DialogFooter className="border-t pt-3 flex flex-wrap items-center justify-between sm:justify-between gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewModalOpen(false)}>
                  Close
                </Button>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 gap-1.5"
                    onClick={() => {
                      const parsedR = parseGeneralReceiptRemarks(viewReceiptTx.remarks);
                      setWhatsappRecipientPhone(parsedR?.recipientPhone || "");
                      setWhatsappModalOpen(true);
                    }}
                  >
                    <MessageSquare size={13} /> Share WhatsApp PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-teal-700 border-teal-300 gap-1.5"
                    onClick={() => printGeneralReceiptPDF(viewReceiptTx, currentUserName)}
                  >
                    <Printer size={13} /> Print
                  </Button>
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
                    onClick={() => generateGeneralReceiptPDF(viewReceiptTx, currentUserName)}
                  >
                    <Download size={13} /> Download PDF
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* WhatsApp Share Modal */}
      <Dialog open={whatsappModalOpen} onOpenChange={setWhatsappModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <MessageSquare className="h-5 w-5 text-emerald-600" /> Share PDF Receipt via WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send the official PDF receipt directly to the recipient via WhatsApp.
            </DialogDescription>
          </DialogHeader>

          {viewReceiptTx && (
            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="font-semibold block text-foreground mb-1">
                  Recipient WhatsApp / Phone Number *
                </label>
                <input
                  placeholder="e.g. 9876543210"
                  value={whatsappRecipientPhone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWhatsappRecipientPhone(e.target.value)}
                  className="w-full text-sm font-mono p-2 border border-input rounded-md bg-background focus:outline-hidden focus:ring-1 focus:ring-emerald-500 h-9"
                />
              </div>

              <div className="bg-muted/40 p-3 rounded-lg border space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground block">Message Preview (with PDF Attached):</span>
                <pre className="text-[10px] text-foreground font-mono whitespace-pre-wrap max-h-[160px] overflow-y-auto">
                  {formatGeneralReceiptWhatsAppMessage(viewReceiptTx)}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setWhatsappModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              onClick={async () => {
                if (!whatsappRecipientPhone) {
                  toast.error("Please enter a valid phone number.");
                  return;
                }
                if (viewReceiptTx) {
                  const success = await shareGeneralReceiptPDFViaWhatsApp(
                    viewReceiptTx,
                    whatsappRecipientPhone,
                    currentUserName
                  );
                  if (success) {
                    setWhatsappModalOpen(false);
                  }
                }
              }}
            >
              <ExternalLink size={13} /> Share PDF via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
