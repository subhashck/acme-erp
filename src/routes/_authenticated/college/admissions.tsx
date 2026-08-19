import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import {
  UserCheck,
  Plus,
  CheckCircle,
  XCircle,
  X,
  ArrowRight,
  UserPlus,
  Filter,
  Search,
  Calendar as CalendarIcon,
  Eye,
  Edit,
  Save,
  Tag,
  Download,
  Printer,
  Receipt,
  DollarSign,
  Info,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { z } from "zod";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const entranceMeritScoreSchema = z.coerce
  .number({ message: "Merit score must be a valid number" })
  .min(0, "Entrance / Merit Score (%) must be at least 0%")
  .max(100, "Entrance / Merit Score (%) cannot exceed 100%");

import { CollegeAccessGuard } from "@/components/CollegeAccessGuard";

export const Route = createFileRoute("/_authenticated/college/admissions")({
  component: () => (
    <CollegeAccessGuard>
      <AdmissionsPage />
    </CollegeAccessGuard>
  ),
});

interface Applicant {
  id: number;
  applicationNo: string;
  courseId: number;
  courseName: string;
  academicYear: string;
  name: string;
  email: string;
  phone: string;
  gender: string;
  dob?: string;
  address?: string;
  entranceMeritScore: number;
  quotaCategory: "general" | "reserved" | "management";
  status: "pending" | "approved" | "rejected" | "converted";
  seatBookingAmount?: string | number | null;
  seatBookingStatus?: "unadjusted" | "adjusted" | "refunded" | null;
  seatBookingReceiptNo?: string | null;
  seatBookingDate?: string | null;
  seatBookingPaymentMode?: string | null;
  seatBookingNotes?: string | null;
  notes?: string;
  createdAt: string;
}

const buildSeatBookingReceiptDoc = (applicant: Applicant): jsPDF => {
  const doc = new jsPDF();

  doc.setFillColor(13, 148, 136); // Teal 600
  doc.rect(0, 0, 210, 26, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("ACME COLLEGE OF NURSING", 14, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("SEAT BOOKING ADVANCE PAYMENT RECEIPT", 14, 21);

  doc.setFontSize(9);
  doc.text(`Receipt No: ${applicant.seatBookingReceiptNo || "RCP-ADV"}`, 196, 14, { align: "right" });
  doc.text(`Payment Date: ${applicant.seatBookingDate || format(new Date(), "yyyy-MM-dd")}`, 196, 21, { align: "right" });

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);

  let metaY = 35;
  const labelX = 14;
  const valueX = 54;
  const lineSpacing = 6;

  doc.setFont("helvetica", "bold");
  doc.text("Applicant Name:", labelX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(applicant.name || "N/A", valueX, metaY);
  metaY += lineSpacing;

  doc.setFont("helvetica", "bold");
  doc.text("Application No:", labelX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(applicant.applicationNo || "N/A", valueX, metaY);
  metaY += lineSpacing;

  doc.setFont("helvetica", "bold");
  doc.text("Target Program:", labelX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text(`${applicant.courseName || "B.Sc Nursing"} (${applicant.academicYear || "AY"})`, valueX, metaY);
  metaY += lineSpacing;

  doc.setFont("helvetica", "bold");
  doc.text("Payment Mode:", labelX, metaY);
  doc.setFont("helvetica", "normal");
  doc.text((applicant.seatBookingPaymentMode || "cash").toUpperCase(), valueX, metaY);
  metaY += lineSpacing + 2;

  const amt = Number(applicant.seatBookingAmount || 0);

  autoTable(doc, {
    startY: metaY,
    head: [["Description / Item", "Booking Status", "Advance Amount"]],
    body: [
      [
        `Provisional Seat Reservation Fee (${applicant.courseName || "Nursing Program"})`,
        applicant.seatBookingStatus === "adjusted" ? "Adjusted in Admission" : "Valid Advance (Unadjusted)",
        `INR ${amt.toLocaleString()}`,
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 45, halign: "center" },
      2: { cellWidth: 35, halign: "right" },
    },
  });

  const startY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : metaY + 30;

  // Total Box
  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(204, 251, 241);
  doc.roundedRect(14, startY, 182, 16, 2, 2, "FD");

  doc.setTextColor(13, 148, 136);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL ADVANCE RECEIVED:", 20, startY + 10);
  doc.setFontSize(13);
  doc.text(`INR ${amt.toLocaleString()}`, 190, startY + 10, { align: "right" });

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "italic");
  doc.text("* Note: This advance is adjustable against course and admission fees during the final enrollment process.", 14, startY + 22);

  // Signatures
  const sigY = Math.max(startY + 45, 230);
  doc.setFont("helvetica", "normal");
  doc.text("Cashier / Accounts Officer", 14, sigY);
  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigY + 10, 60, sigY + 10);

  doc.text("Authorized Signatory", 196, sigY, { align: "right" });
  doc.text("Verified System Receipt", 196, sigY + 12, { align: "right" });

  return doc;
};

const printSeatBookingReceipt = (applicant: Applicant) => {
  const doc = buildSeatBookingReceiptDoc(applicant);
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

const downloadSeatBookingPDF = (applicant: Applicant) => {
  const doc = buildSeatBookingReceiptDoc(applicant);
  doc.save(`Seat-Booking-Receipt-${applicant.applicationNo || "receipt"}.pdf`);
};

function AdmissionsPage() {
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [courseFilter, setCourseFilter] = React.useState<number>(0);
  const [quotaFilter, setQuotaFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const [intakeDialogOpen, setIntakeDialogOpen] = React.useState(false);
  const [convertModalOpen, setConvertModalOpen] = React.useState(false);
  const [selectedApplicant, setSelectedApplicant] = React.useState<Applicant | null>(null);

  // Seat Booking Advance modal state
  const [seatBookingModalOpen, setSeatBookingModalOpen] = React.useState(false);
  const [seatBookingApplicant, setSeatBookingApplicant] = React.useState<Applicant | null>(null);

  // Profile View/Edit Dialog state
  const [profileDialogOpen, setProfileDialogOpen] = React.useState(false);
  const [viewApplicant, setViewApplicant] = React.useState<Applicant | null>(null);
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["nursing", "courses"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/courses");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: batches = [] } = useQuery<any[]>({
    queryKey: ["nursing", "batches"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/batches");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: applicantsResponse, isLoading } = useQuery<{
    data: Applicant[];
    pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
  }>({
    queryKey: ["nursing", "applicants", statusFilter, courseFilter, quotaFilter, debouncedSearch, currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (courseFilter > 0) params.append("courseId", String(courseFilter));
      if (quotaFilter !== "all") params.append("quotaCategory", quotaFilter);
      if (debouncedSearch) params.append("search", debouncedSearch);
      params.append("page", String(currentPage));
      params.append("pageSize", String(pageSize));
      const res = await fetch(`/api/nursing/applicants?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch applicants");
      const json = await res.json();
      if (Array.isArray(json)) {
        return {
          data: json,
          pagination: { page: 1, pageSize: json.length, totalRecords: json.length, totalPages: 1 },
        };
      }
      return json;
    },
  });

  const applicants = applicantsResponse?.data || [];
  const pagination = applicantsResponse?.pagination;

  const currentYear = new Date().getFullYear();
  const defaultAcademicYear = `${currentYear}-${currentYear + 4}`;

  const intakeForm = useForm({
    defaultValues: {
      courseId: 0,
      academicYear: defaultAcademicYear,
      name: "",
      email: "",
      phone: "",
      gender: "Female",
      dob: "",
      address: "",
      entranceMeritScore: 0,
      quotaCategory: "general" as "general" | "reserved" | "management",
      notes: "",
    },
  });

  const convertForm = useForm<{
    batchId: number;
    enrollmentNo: string;
    guardianName: string;
    guardianPhone: string;
    guardianRelation: string;
  }>({
    defaultValues: {
      batchId: 0,
      enrollmentNo: "",
      guardianName: "",
      guardianPhone: "",
      guardianRelation: "Mother",
    },
  });

  const [isFetchingSeq, setIsFetchingSeq] = React.useState(false);

  // Auto-sync suggested sequential enrollment number when convert modal opens or batch changes
  const watchConvertBatchId = convertForm.watch("batchId");
  React.useEffect(() => {
    if (!convertModalOpen || !selectedApplicant) return;

    let activeBatchId = convertForm.getValues("batchId");
    if (!activeBatchId || activeBatchId <= 0) {
      const matchedBatch =
        batches.find((b) => b.courseId === selectedApplicant.courseId && b.academicYear === selectedApplicant.academicYear) ||
        batches.find((b) => b.courseId === selectedApplicant.courseId) ||
        batches[0];

      if (matchedBatch) {
        activeBatchId = matchedBatch.id;
        convertForm.setValue("batchId", matchedBatch.id);
      }
    }

    const fetchNextSeq = async () => {
      try {
        const query = activeBatchId ? `?batchId=${activeBatchId}` : "";
        const res = await fetch(`/api/nursing/next-enrollment-no${query}`);
        if (res.ok) {
          const data = await res.json();
          if (data.enrollmentNo) {
            const currentVal = convertForm.getValues("enrollmentNo");
            // Only update if field is empty or starts with standard sequence prefix
            if (!currentVal || currentVal.startsWith("NUR-STU-")) {
              convertForm.setValue("enrollmentNo", data.enrollmentNo);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch next enrollment number", err);
      }
    };

    fetchNextSeq();
  }, [convertModalOpen, selectedApplicant, watchConvertBatchId, batches]);

  const handleResetToAutoSequence = async () => {
    setIsFetchingSeq(true);
    try {
      const batchId = convertForm.getValues("batchId");
      const query = batchId ? `?batchId=${batchId}` : "";
      const res = await fetch(`/api/nursing/next-enrollment-no${query}`);
      if (res.ok) {
        const data = await res.json();
        if (data.enrollmentNo) {
          convertForm.setValue("enrollmentNo", data.enrollmentNo, { shouldValidate: true });
          toast.info(`Suggested sequence applied: ${data.enrollmentNo}`);
        }
      }
    } catch (e) {
      toast.error("Failed to fetch next sequence number");
    } finally {
      setIsFetchingSeq(false);
    }
  };

  const profileForm = useForm<{
    courseId: number;
    academicYear: string;
    name: string;
    email: string;
    phone: string;
    gender: string;
    dob: string;
    address: string;
    entranceMeritScore: number;
    quotaCategory: "general" | "reserved" | "management";
    notes: string;
  }>({
    defaultValues: {
      courseId: 0,
      academicYear: defaultAcademicYear,
      name: "",
      email: "",
      phone: "",
      gender: "Female",
      dob: "",
      address: "",
      entranceMeritScore: 0,
      quotaCategory: "general",
      notes: "",
    },
  });

  const createApplicantMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/nursing/applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit application");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Application registered successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "applicants"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "dashboard-stats"] });
      setIntakeDialogOpen(false);
      setStep(1);
      intakeForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/nursing/applicants/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update status");
      }
      return res.json();
    },
    onSuccess: (updated) => {
      toast.success(`Applicant status updated to ${updated.status}`);
      queryClient.invalidateQueries({ queryKey: ["nursing", "applicants"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "dashboard-stats"] });
      if (updated && viewApplicant && viewApplicant.id === updated.id) {
        setViewApplicant((prev) => (prev ? { ...prev, status: updated.status } : null));
      }
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const updateApplicantMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!viewApplicant) return;
      const res = await fetch(`/api/nursing/applicants/${viewApplicant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: (updated) => {
      toast.success("Applicant profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "applicants"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "dashboard-stats"] });
      setIsEditingProfile(false);
      if (updated) {
        setViewApplicant((prev) => {
          if (!prev) return null;
          const course = courses.find((c) => c.id === updated.courseId);
          return {
            ...prev,
            ...updated,
            courseName: course ? course.name : prev.courseName,
          };
        });
      }
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const convertToStudentMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!selectedApplicant) return;
      const res = await fetch(`/api/nursing/applicants/${selectedApplicant.id}/convert-to-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || "Failed to convert to student");
      }
      return res.json();
    },
    onSuccess: (student) => {
      toast.success(`Converted to student! Enrollment No: ${student.enrollmentNo}`);
      queryClient.invalidateQueries({ queryKey: ["nursing", "applicants"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "students"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "dashboard-stats"] });
      setConvertModalOpen(false);
      setSelectedApplicant(null);
      convertForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const seatBookingForm = useForm<{
    amount: number;
    paymentMode: string;
    paymentDate: string;
    notes: string;
  }>({
    defaultValues: {
      amount: 25000,
      paymentMode: "cash",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  const recordSeatBookingMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: any }) => {
      const res = await fetch(`/api/nursing/applicants/${id}/seat-booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || "Failed to record seat booking payment");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const amt = Number(data.applicant?.seatBookingAmount || 0).toLocaleString();
      toast.success(`Seat booking advance of ₹${amt} recorded! Receipt: ${data.receiptNumber}`);
      queryClient.invalidateQueries({ queryKey: ["nursing", "applicants"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "fees"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "dashboard-stats"] });
      if (viewApplicant && data.applicant && viewApplicant.id === data.applicant.id) {
        setViewApplicant((prev) => (prev ? { ...prev, ...data.applicant } : null));
      }
      setSeatBookingModalOpen(false);
      setSeatBookingApplicant(null);
      seatBookingForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const handleOpenProfile = (applicant: Applicant) => {
    setViewApplicant(applicant);
    setIsEditingProfile(false);
    profileForm.reset({
      courseId: applicant.courseId,
      academicYear: applicant.academicYear || defaultAcademicYear,
      name: applicant.name || "",
      email: applicant.email || "",
      phone: applicant.phone || "",
      gender: applicant.gender || "Female",
      dob: applicant.dob || "",
      address: applicant.address || "",
      entranceMeritScore: applicant.entranceMeritScore ?? 0,
      quotaCategory: applicant.quotaCategory || "general",
      notes: applicant.notes || "",
    });
    setProfileDialogOpen(true);
  };

  const onProfileSubmit = (data: any) => {
    const courseId = Number(data.courseId);
    if (!courseId || courseId <= 0) {
      profileForm.setError("courseId", { type: "manual", message: "Please select a target program course" });
      toast.error("Please select a valid target program course");
      return;
    }
    if (!data.name || !data.name.trim()) {
      profileForm.setError("name", { type: "manual", message: "Full applicant name is required" });
      toast.error("Please enter applicant full name");
      return;
    }
    const phoneDigits = data.phone ? String(data.phone).replace(/\D/g, "") : "";
    if (phoneDigits.length !== 10) {
      profileForm.setError("phone", { type: "manual", message: "Phone number must be exactly 10 digits" });
      toast.error("Phone number must be exactly 10 digits");
      return;
    }

    const meritScoreResult = entranceMeritScoreSchema.safeParse(data.entranceMeritScore);
    if (!meritScoreResult.success) {
      const errMsg = meritScoreResult.error.issues[0]?.message || "Entrance / Merit score must be between 0 and 100%";
      profileForm.setError("entranceMeritScore", { type: "manual", message: errMsg });
      toast.error(errMsg);
      return;
    }

    updateApplicantMutation.mutate({
      ...data,
      courseId,
      entranceMeritScore: meritScoreResult.data,
    });
  };

  const onIntakeSubmit = (data: any) => {
    const courseId = Number(data.courseId);
    if (!courseId || courseId <= 0) {
      intakeForm.setError("courseId", { type: "manual", message: "Please select a target program course" });
      toast.error("Please select a valid target program course");
      return;
    }
    if (!data.name || !data.name.trim()) {
      intakeForm.setError("name", { type: "manual", message: "Full applicant name is required" });
      toast.error("Please enter applicant full name");
      return;
    }
    const phoneDigits = data.phone ? String(data.phone).replace(/\D/g, "") : "";
    if (phoneDigits.length !== 10) {
      intakeForm.setError("phone", { type: "manual", message: "Phone number must be exactly 10 digits" });
      toast.error("Phone number must be exactly 10 digits");
      return;
    }

    const meritScoreResult = entranceMeritScoreSchema.safeParse(data.entranceMeritScore);
    if (!meritScoreResult.success) {
      const errMsg = meritScoreResult.error.issues[0]?.message || "Entrance / Merit score must be between 0 and 100%";
      intakeForm.setError("entranceMeritScore", { type: "manual", message: errMsg });
      toast.error(errMsg);
      return;
    }

    createApplicantMutation.mutate({
      ...data,
      courseId,
      entranceMeritScore: meritScoreResult.data,
    });
  };

  const onConvertSubmit = (data: any) => {
    const batchId = Number(data.batchId);
    if (!batchId || batchId <= 0) {
      convertForm.setError("batchId", { type: "manual", message: "Please select an academic batch" });
      toast.error("Please select a valid academic batch for student enrollment");
      return;
    }
    convertToStudentMutation.mutate({
      ...data,
      batchId,
      enrollmentNo: data.enrollmentNo ? data.enrollmentNo.trim() : undefined,
    });
  };

  const handleNextStep = () => {
    let hasError = false;
    if (step === 1) {
      const courseId = Number(intakeForm.getValues("courseId"));
      const name = intakeForm.getValues("name");
      const phone = intakeForm.getValues("phone");
      const email = intakeForm.getValues("email");

      if (!courseId || courseId <= 0) {
        intakeForm.setError("courseId", { type: "manual", message: "Please select a target program course" });
        hasError = true;
      } else {
        intakeForm.clearErrors("courseId");
      }

      if (!name || !name.trim()) {
        intakeForm.setError("name", { type: "manual", message: "Full applicant name is required" });
        hasError = true;
      } else {
        intakeForm.clearErrors("name");
      }

      const phoneDigits = phone ? String(phone).replace(/\D/g, "") : "";
      if (phoneDigits.length !== 10) {
        intakeForm.setError("phone", { type: "manual", message: "Phone number must be exactly 10 digits" });
        hasError = true;
      } else {
        intakeForm.clearErrors("phone");
      }

      if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        intakeForm.setError("email", { type: "manual", message: "Please enter a valid email address" });
        hasError = true;
      } else {
        intakeForm.clearErrors("email");
      }
    }

    if (step === 2) {
      const meritScoreResult = entranceMeritScoreSchema.safeParse(intakeForm.getValues("entranceMeritScore"));
      if (!meritScoreResult.success) {
        const errMsg = meritScoreResult.error.issues[0]?.message || "Enter a valid score percentage (0 - 100%)";
        intakeForm.setError("entranceMeritScore", { type: "manual", message: errMsg });
        hasError = true;
      } else {
        intakeForm.clearErrors("entranceMeritScore");
      }
    }

    if (hasError) {
      toast.error("Please fill out all highlighted mandatory fields before proceeding");
      return;
    }

    setStep((s) => Math.min(s + 1, 3) as any);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 shrink-0" />
            Admissions Pipeline & Intake
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage applicant pipeline, quota reservations, seat advances, and student conversions.
          </p>
        </div>

        {/* New Applicant Multi-step Modal */}
        <Dialog open={intakeDialogOpen} onOpenChange={(open) => {
          setIntakeDialogOpen(open);
          if (open) {
            setStep(1);
            intakeForm.clearErrors();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 shadow-xs">
              <Plus size={16} /> New Application Registration
            </Button>
          </DialogTrigger>
          <DialogContent
            className="w-full max-w-[95vw] sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 space-y-0 gap-2">
              <div>
                <DialogTitle className="text-lg font-bold">Applicant Intake Form</DialogTitle>
                <DialogDescription className="text-xs">
                  Step {step} of 3 • Register new candidate for provisional admission
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setIntakeDialogOpen(false)}
              >
                <X size={16} />
                <span className="sr-only">Close</span>
              </Button>
            </DialogHeader>

            <form onSubmit={intakeForm.handleSubmit(onIntakeSubmit)} className="space-y-4 py-1">
              {step === 1 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Step 1: Personal Details</h4>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Target Course *</label>
                    <Controller
                      control={intakeForm.control}
                      name="courseId"
                      render={({ field, fieldState }) => (
                        <div>
                          <select
                            className={cn(
                              "w-full border rounded-md p-2 bg-background text-sm transition-colors",
                              fieldState.error ? "border-red-500 focus:ring-red-500 bg-red-50/20 dark:bg-red-950/20" : "border-input"
                            )}
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(Number(e.target.value));
                              if (Number(e.target.value) > 0) intakeForm.clearErrors("courseId");
                            }}
                          >
                            <option value={0}>-- Select Course --</option>
                            {courses.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.code} - {c.name}
                              </option>
                            ))}
                          </select>
                          {fieldState.error && (
                            <p className="text-xs text-red-500 font-medium mt-1">{fieldState.error.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </div>

                  <Controller
                    control={intakeForm.control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <Field label="Full Applicant Name *" placeholder="e.g. Ananya Sharma" {...field} error={fieldState.error?.message} />
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Controller
                      control={intakeForm.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <Field label="Email Address" type="email" placeholder="ananya@example.com" {...field} error={fieldState.error?.message} />
                      )}
                    />
                    <Controller
                      control={intakeForm.control}
                      name="phone"
                      render={({ field, fieldState }) => (
                        <Field label="Phone Number *" placeholder="9876543210" {...field} error={fieldState.error?.message} />
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Controller
                      control={intakeForm.control}
                      name="gender"
                      render={({ field }) => (
                        <div>
                          <label className="text-sm font-medium text-foreground block mb-1">Gender</label>
                          <select
                            className="w-full border border-input rounded-md p-2 bg-background text-sm font-medium"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          >
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      )}
                    />

                    <Controller
                      control={intakeForm.control}
                      name="dob"
                      render={({ field, fieldState }) => {
                        let parsedDate: Date | undefined = undefined;
                        if (field.value) {
                          const d = new Date(field.value);
                          if (!isNaN(d.getTime())) parsedDate = d;
                        }

                        return (
                          <div>
                            <label className="text-sm font-medium text-foreground block mb-1">Date of Birth</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal h-9 border-input bg-background text-sm",
                                    !field.value && "text-muted-foreground",
                                    fieldState.error && "border-red-500"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4 text-teal-600 shrink-0" />
                                  {parsedDate ? (
                                    format(parsedDate, "PPP")
                                  ) : (
                                    <span>Pick date of birth</span>
                                  )}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 z-[99999]" align="start">
                                <Calendar
                                  mode="single"
                                  selected={parsedDate}
                                  onSelect={(date) => {
                                    if (date) {
                                      const yyyy = date.getFullYear();
                                      const mm = String(date.getMonth() + 1).padStart(2, "0");
                                      const dd = String(date.getDate()).padStart(2, "0");
                                      field.onChange(`${yyyy}-${mm}-${dd}`);
                                    } else {
                                      field.onChange("");
                                    }
                                  }}
                                  captionLayout="dropdown"
                                  startMonth={new Date(1970, 0)}
                                  endMonth={new Date(new Date().getFullYear(), 11)}
                                />
                              </PopoverContent>
                            </Popover>
                            {fieldState.error && (
                              <p className="text-xs text-red-500 font-medium mt-1">{fieldState.error.message}</p>
                            )}
                          </div>
                        );
                      }}
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Step 2: Entrance Score & Quota Selection</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Controller
                      control={intakeForm.control}
                      name="entranceMeritScore"
                      render={({ field, fieldState }) => (
                        <Field label="Entrance / Merit Score (%) *" type="number" step="0.01" {...field} error={fieldState.error?.message} />
                      )}
                    />
                    <Controller
                      control={intakeForm.control}
                      name="quotaCategory"
                      render={({ field }) => (
                        <div>
                          <label className="text-sm font-medium text-foreground block mb-1">Quota Category</label>
                          <select
                            className="w-full border border-input rounded-md p-2 bg-background text-sm font-medium"
                            value={field.value || "general"}
                            onChange={(e) => field.onChange(e.target.value)}
                          >
                            <option value="general">General Quota</option>
                            <option value="reserved">Reserved Quota</option>
                            <option value="management">Management Quota</option>
                          </select>
                        </div>
                      )}
                    />
                  </div>

                  <Controller
                    control={intakeForm.control}
                    name="address"
                    render={({ field, fieldState }) => (
                      <Field label="Residential Address" placeholder="City, State, Pincode" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Step 3: Summary & Notes</h4>
                  <Controller
                    control={intakeForm.control}
                    name="notes"
                    render={({ field, fieldState }) => (
                      <Field label="Admission Notes / Reference" placeholder="Any special recommendation or verification notes" {...field} error={fieldState.error?.message} />
                    )}
                  />

                  <div className="p-3 bg-muted rounded-md text-xs space-y-1">
                    <div className="font-semibold text-foreground">Intake Summary:</div>
                    <div>Applicant: <strong className="text-foreground">{intakeForm.watch("name") || "N/A"}</strong></div>
                    <div>Score: <strong className="text-teal-600">{intakeForm.watch("entranceMeritScore")}%</strong></div>
                    <div>Quota: <span className="capitalize">{intakeForm.watch("quotaCategory") || "general"}</span></div>
                  </div>
                </div>
              )}

              <DialogFooter className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-3 border-t">
                {step > 1 ? (
                  <Button type="button" variant="outline" onClick={() => setStep((s) => (s - 1) as any)}>
                    Back
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" onClick={() => setIntakeDialogOpen(false)}>
                    Cancel
                  </Button>
                )}

                {step < 3 ? (
                  <Button type="button" className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleNextStep}>
                    Next Step <ArrowRight size={14} className="ml-1" />
                  </Button>
                ) : (
                  <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={createApplicantMutation.isPending}>
                    {createApplicantMutation.isPending ? "Submitting..." : "Submit Application"}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Status Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search applicants by name, application number, email, or phone..."
                className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={courseFilter}
                onChange={(e) => {
                  setCourseFilter(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={0}>All Target Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="converted">Converted</option>
              </select>

              <select
                className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
                value={quotaFilter}
                onChange={(e) => {
                  setQuotaFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Quotas</option>
                <option value="general">General Quota</option>
                <option value="reserved">Reserved Quota</option>
                <option value="management">Management Quota</option>
              </select>
            </div>
          </div>

          {(Boolean(searchQuery) || statusFilter !== "all" || courseFilter > 0 || quotaFilter !== "all") && (
            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <span>Filters active</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                onClick={() => {
                  setSearchQuery("");
                  setDebouncedSearch("");
                  setStatusFilter("all");
                  setCourseFilter(0);
                  setQuotaFilter("all");
                  setCurrentPage(1);
                }}
              >
                <RotateCcw size={11} /> Reset Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Applicants List Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold">
              Application Pipeline {pagination ? `(${pagination.totalRecords})` : `(${applicants.length})`}
            </CardTitle>
            <CardDescription>Registered pre-enrollment candidate records</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading applicants...</div>
          ) : applicants.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No applicants found matching filter criteria.</div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <th className="p-3">Application No</th>
                      <th className="p-3">Applicant Name</th>
                      <th className="p-3">Course</th>
                      <th className="p-3">Merit Score</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Seat Advance</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {applicants.map((app) => (
                      <tr key={app.id} className="hover:bg-muted/30">
                        <td className="p-3 font-semibold font-mono text-teal-600 dark:text-teal-400">
                          <button
                            type="button"
                            className="hover:underline text-left cursor-pointer focus:outline-none"
                            onClick={() => handleOpenProfile(app)}
                          >
                            {app.applicationNo}
                          </button>
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            className="font-medium text-left hover:text-teal-600 focus:outline-none cursor-pointer"
                            onClick={() => handleOpenProfile(app)}
                          >
                            {app.name}
                          </button>
                          <div className="text-xs text-muted-foreground">
                            {[app.email, app.phone].filter(Boolean).join(" • ") || "No contact provided"}
                          </div>
                        </td>
                        <td className="p-3">{app.courseName || "B.Sc Nursing"}</td>
                        <td className="p-3 font-semibold">{app.entranceMeritScore}%</td>
                        <td className="p-3">
                          {app.status === "pending" && <span className="text-amber-600 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded text-xs font-medium border border-amber-200 dark:border-amber-800">Pending Review</span>}
                          {app.status === "approved" && <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded text-xs font-medium border border-emerald-200 dark:border-emerald-800">Approved</span>}
                          {app.status === "rejected" && <span className="text-rose-600 bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded text-xs font-medium border border-rose-200 dark:border-rose-800">Rejected</span>}
                          {app.status === "converted" && <span className="text-blue-600 bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded text-xs font-medium border border-blue-200 dark:border-blue-800">Converted</span>}
                        </td>
                        <td className="p-3">
                          {Number(app.seatBookingAmount || 0) > 0 ? (
                            <div className="space-y-0.5">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border",
                                app.seatBookingStatus === "adjusted"
                                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                  : "bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800"
                              )}>
                                <Tag size={11} className={app.seatBookingStatus === "adjusted" ? "text-emerald-600" : "text-cyan-600"} />
                                ₹{Number(app.seatBookingAmount).toLocaleString()}
                                <span className="text-[10px] font-normal opacity-80">
                                  ({app.seatBookingStatus === "adjusted" ? "Adjusted" : "Advance"})
                                </span>
                              </span>
                              {app.seatBookingReceiptNo && (
                                <div className="text-[10px] font-mono text-muted-foreground">
                                  {app.seatBookingReceiptNo}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2 gap-1"
                            onClick={() => handleOpenProfile(app)}
                          >
                            <Eye size={12} /> View
                          </Button>
                          {Number(app.seatBookingAmount || 0) > 0 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-7 px-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950"
                              title="Print Seat Advance Receipt"
                              onClick={() => printSeatBookingReceipt(app)}
                            >
                              <Printer size={12} className="mr-1" /> Receipt
                            </Button>
                          )}
                          {(!app.seatBookingAmount || Number(app.seatBookingAmount) <= 0) && app.status !== "rejected" && app.status !== "converted" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-cyan-300 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950 text-xs h-7 px-2 gap-1"
                              onClick={() => {
                                setSeatBookingApplicant(app);
                                seatBookingForm.reset({
                                  amount: 25000,
                                  paymentMode: "cash",
                                  paymentDate: format(new Date(), "yyyy-MM-dd"),
                                  notes: "",
                                });
                                setSeatBookingModalOpen(true);
                              }}
                            >
                              <Tag size={12} /> Book Seat
                            </Button>
                          )}
                          {(app.status === "approved" || app.status === "pending") && (
                            <Button
                              size="sm"
                              className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-7 px-2"
                              onClick={() => {
                                setSelectedApplicant(app);
                                setConvertModalOpen(true);
                              }}
                            >
                              <UserPlus size={12} className="mr-1" /> Convert
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Server-Side Pagination Controls */}
              {pagination && pagination.totalRecords > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>
                      Showing{" "}
                      <strong className="text-foreground">
                        {(pagination.page - 1) * pagination.pageSize + 1}
                      </strong>{" "}
                      to{" "}
                      <strong className="text-foreground">
                        {Math.min(pagination.page * pagination.pageSize, pagination.totalRecords)}
                      </strong>{" "}
                      of{" "}
                      <strong className="text-foreground">{pagination.totalRecords}</strong> applicants
                    </span>

                    <div className="flex items-center gap-1.5 pl-2 border-l">
                      <span>Per page:</span>
                      <select
                        className="border rounded px-1.5 py-0.5 text-xs bg-background text-foreground"
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(1)}
                      disabled={pagination.page <= 1}
                      title="First Page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page <= 1}
                      title="Previous Page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-2.5 font-medium text-foreground">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={pagination.page >= pagination.totalPages}
                      title="Next Page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(pagination.totalPages)}
                      disabled={pagination.page >= pagination.totalPages}
                      title="Last Page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View / Edit Admission Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent
          className="w-full max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {viewApplicant && (
            <div className="space-y-4 sm:space-y-5">
              {/* Header section with Application No, Badges & Close Button */}
              <DialogHeader className="border-b pb-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                      {viewApplicant.applicationNo}
                    </span>
                    <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                      {viewApplicant.quotaCategory} quota
                    </span>
                    {viewApplicant.status === "pending" && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        ● Pending Review
                      </span>
                    )}
                    {viewApplicant.status === "approved" && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        ● Approved
                      </span>
                    )}
                    {viewApplicant.status === "rejected" && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        ● Rejected
                      </span>
                    )}
                    {viewApplicant.status === "converted" && (
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        ● Converted to Student
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => setProfileDialogOpen(false)}
                  >
                    <X size={18} />
                    <span className="sr-only">Close</span>
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                    {viewApplicant.name}
                  </DialogTitle>
                  <Button
                    size="sm"
                    variant={isEditingProfile ? "ghost" : "outline"}
                    className="h-8 text-xs gap-1.5 self-start sm:self-auto"
                    onClick={() => {
                      if (!isEditingProfile) {
                        profileForm.reset({
                          courseId: viewApplicant.courseId,
                          academicYear: viewApplicant.academicYear || defaultAcademicYear,
                          name: viewApplicant.name || "",
                          email: viewApplicant.email || "",
                          phone: viewApplicant.phone || "",
                          gender: viewApplicant.gender || "Female",
                          dob: viewApplicant.dob || "",
                          address: viewApplicant.address || "",
                          entranceMeritScore: viewApplicant.entranceMeritScore ?? 0,
                          quotaCategory: viewApplicant.quotaCategory || "general",
                          notes: viewApplicant.notes || "",
                        });
                      }
                      setIsEditingProfile(!isEditingProfile);
                    }}
                  >
                    {isEditingProfile ? (
                      <>
                        <Eye size={14} /> View Details
                      </>
                    ) : (
                      <>
                        <Edit size={14} /> Edit Profile
                      </>
                    )}
                  </Button>
                </div>
              </DialogHeader>

              {/* Status Decision Bar (Approve / Reject / Convert) */}
              <div className="p-3 rounded-lg border bg-muted/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="text-xs font-medium">
                  <span className="text-muted-foreground block text-[11px]">Application Decision & Status</span>
                  <span className="font-semibold text-foreground">
                    Current: {viewApplicant.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {viewApplicant.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 gap-1.5 flex-1 sm:flex-initial"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => updateStatusMutation.mutate({ id: viewApplicant.id, status: "approved" })}
                      >
                        <CheckCircle size={14} /> Approve Application
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs h-8 px-3 gap-1.5 flex-1 sm:flex-initial"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => updateStatusMutation.mutate({ id: viewApplicant.id, status: "rejected" })}
                      >
                        <XCircle size={14} /> Reject Application
                      </Button>
                    </>
                  )}
                  {viewApplicant.status === "approved" && (
                    <Button
                      size="sm"
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 px-3 gap-1.5 w-full sm:w-auto"
                      onClick={() => {
                        setProfileDialogOpen(false);
                        setSelectedApplicant(viewApplicant);
                        setConvertModalOpen(true);
                      }}
                    >
                      <UserPlus size={14} /> Convert to Enrolled Student
                    </Button>
                  )}
                  {viewApplicant.status === "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 w-full sm:w-auto"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => updateStatusMutation.mutate({ id: viewApplicant.id, status: "pending" })}
                    >
                      Reopen Application
                    </Button>
                  )}
                </div>
              </div>

              {/* Details View OR Edit Form */}
              {!isEditingProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="p-3 rounded-md bg-card border space-y-1">
                      <div className="text-xs text-muted-foreground font-medium">Target Program</div>
                      <div className="text-sm font-semibold text-foreground">
                        {viewApplicant.courseName || "B.Sc Nursing"}
                      </div>
                      <div className="text-xs text-muted-foreground">Session: {viewApplicant.academicYear}</div>
                    </div>

                    <div className="p-3 rounded-md bg-card border space-y-1">
                      <div className="text-xs text-muted-foreground font-medium">Entrance / Merit Score</div>
                      <div className="text-base font-bold text-teal-600 dark:text-teal-400">
                        {viewApplicant.entranceMeritScore}%
                      </div>
                      <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-teal-600 h-full rounded-full"
                          style={{ width: `${Math.min(viewApplicant.entranceMeritScore, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-md bg-card border space-y-1 sm:col-span-2 lg:col-span-1">
                      <div className="text-xs text-muted-foreground font-medium">Quota Category</div>
                      <div className="text-sm font-semibold text-foreground capitalize">
                        {viewApplicant.quotaCategory} Quota
                      </div>
                      <div className="text-xs text-muted-foreground">Allocation Reserved</div>
                    </div>
                  </div>

                  {/* Seat Booking Advance Section in Profile */}
                  <div className="border rounded-md p-4 space-y-3 bg-cyan-50/40 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-900 dark:text-cyan-300 flex items-center gap-1.5">
                        <Tag size={14} className="text-cyan-600" />
                        Seat Reservation & Advance Payment
                      </h4>
                      {Number(viewApplicant.seatBookingAmount || 0) > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-cyan-300 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100/60"
                            onClick={() => printSeatBookingReceipt(viewApplicant)}
                          >
                            <Printer size={12} className="mr-1" /> Print Receipt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-cyan-300 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100/60"
                            onClick={() => downloadSeatBookingPDF(viewApplicant)}
                          >
                            <Download size={12} className="mr-1" /> PDF
                          </Button>
                        </div>
                      ) : (
                        viewApplicant.status !== "rejected" && viewApplicant.status !== "converted" && (
                          <Button
                            size="sm"
                            className="bg-cyan-600 hover:bg-cyan-700 text-white text-xs h-7 px-2.5 gap-1 self-start sm:self-auto"
                            onClick={() => {
                              setSeatBookingApplicant(viewApplicant);
                              seatBookingForm.reset({
                                amount: 25000,
                                paymentMode: "cash",
                                paymentDate: format(new Date(), "yyyy-MM-dd"),
                                notes: "",
                              });
                              setSeatBookingModalOpen(true);
                            }}
                          >
                            <Tag size={12} /> Record Seat Booking Advance
                          </Button>
                        )
                      )}
                    </div>

                    {Number(viewApplicant.seatBookingAmount || 0) > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                        <div className="p-2.5 rounded bg-background border">
                          <span className="text-muted-foreground block text-[11px]">Advance Amount</span>
                          <span className="font-bold text-sm text-cyan-700 dark:text-cyan-300 font-mono">
                            ₹{Number(viewApplicant.seatBookingAmount).toLocaleString()}
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-background border">
                          <span className="text-muted-foreground block text-[11px]">Advance Status</span>
                          <span className={cn(
                            "font-semibold text-xs",
                            viewApplicant.seatBookingStatus === "adjusted" ? "text-emerald-600 dark:text-emerald-400" : "text-cyan-700 dark:text-cyan-300"
                          )}>
                            {viewApplicant.seatBookingStatus === "adjusted" ? "Adjusted in Admission" : "Valid (Unadjusted)"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-background border">
                          <span className="text-muted-foreground block text-[11px]">Receipt Number</span>
                          <span className="font-mono font-semibold text-foreground text-xs">
                            {viewApplicant.seatBookingReceiptNo || "N/A"}
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-background border">
                          <span className="text-muted-foreground block text-[11px]">Payment Date / Mode</span>
                          <span className="font-medium text-foreground text-xs">
                            {viewApplicant.seatBookingDate || "N/A"} • {(viewApplicant.seatBookingPaymentMode || "CASH").toUpperCase()}
                          </span>
                        </div>
                        {viewApplicant.seatBookingNotes && (
                          <div className="col-span-1 sm:col-span-2 lg:col-span-4 p-2 rounded bg-background/60 border text-[11px] text-muted-foreground italic">
                            Notes: {viewApplicant.seatBookingNotes}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        No seat booking advance payment recorded yet for this applicant.
                      </p>
                    )}
                  </div>

                  <div className="border rounded-md p-4 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Personal & Contact Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs block">Full Name</span>
                        <span className="font-medium text-foreground">{viewApplicant.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Gender</span>
                        <span className="font-medium text-foreground">{viewApplicant.gender || "Female"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Email Address</span>
                        <span className="font-medium text-foreground">{viewApplicant.email || "Not specified"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Phone Number</span>
                        <span className="font-medium text-foreground">{viewApplicant.phone}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Date of Birth</span>
                        <span className="font-medium text-foreground">
                          {viewApplicant.dob
                            ? format(new Date(viewApplicant.dob), "PPP")
                            : "Not specified"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Registration Date</span>
                        <span className="font-medium text-foreground">
                          {viewApplicant.createdAt
                            ? format(new Date(viewApplicant.createdAt), "PPP")
                            : "N/A"}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-muted-foreground text-xs block">Residential Address</span>
                        <span className="font-medium text-foreground">{viewApplicant.address || "Not specified"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-md p-4 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Admission Notes & Remarks
                    </h4>
                    <p className="text-sm text-foreground bg-muted/30 p-2.5 rounded border italic">
                      {viewApplicant.notes || "No notes recorded for this applicant."}
                    </p>
                  </div>

                  {/* View Mode Footer with Close and Quick Actions */}
                  <DialogFooter className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2 pt-3 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setProfileDialogOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Close Profile
                    </Button>
                    <div className="flex flex-wrap items-center gap-2">
                      {Number(viewApplicant.seatBookingAmount || 0) > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-teal-600 border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950 flex-1 sm:flex-initial"
                          onClick={() => printSeatBookingReceipt(viewApplicant)}
                        >
                          <Printer size={13} className="mr-1" /> Seat Receipt
                        </Button>
                      )}
                      {(viewApplicant.status === "approved" || viewApplicant.status === "pending") && (
                        <Button
                          type="button"
                          size="sm"
                          className="bg-teal-600 hover:bg-teal-700 text-white flex-1 sm:flex-initial"
                          onClick={() => {
                            setProfileDialogOpen(false);
                            setSelectedApplicant(viewApplicant);
                            setConvertModalOpen(true);
                          }}
                        >
                          <UserPlus size={13} className="mr-1" /> Convert to Student
                        </Button>
                      )}
                    </div>
                  </DialogFooter>
                </div>
              ) : (
                /* Profile Edit Form */
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1">Target Course *</label>
                      <Controller
                        control={profileForm.control}
                        name="courseId"
                        render={({ field, fieldState }) => (
                          <div>
                            <select
                              className={cn(
                                "w-full border rounded-md p-2 bg-background text-sm transition-colors",
                                fieldState.error ? "border-red-500 bg-red-50/20" : "border-input"
                              )}
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            >
                              <option value={0}>-- Select Course --</option>
                              {courses.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.code} - {c.name}
                                </option>
                              ))}
                            </select>
                            {fieldState.error && (
                              <p className="text-xs text-red-500 font-medium mt-1">{fieldState.error.message}</p>
                            )}
                          </div>
                        )}
                      />
                    </div>

                    <Controller
                      control={profileForm.control}
                      name="quotaCategory"
                      render={({ field }) => (
                        <div>
                          <label className="text-sm font-medium text-foreground block mb-1">Quota Category</label>
                          <select
                            className="w-full border border-input rounded-md p-2 bg-background text-sm"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          >
                            <option value="general">General Quota</option>
                            <option value="reserved">Reserved Quota</option>
                            <option value="management">Management Quota</option>
                          </select>
                        </div>
                      )}
                    />
                  </div>

                  <Controller
                    control={profileForm.control}
                    name="name"
                    render={({ field, fieldState }) => (
                      <Field label="Full Applicant Name *" placeholder="Applicant Name" {...field} error={fieldState.error?.message} />
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Controller
                      control={profileForm.control}
                      name="email"
                      render={({ field, fieldState }) => (
                        <Field label="Email Address" type="email" placeholder="email@example.com" {...field} error={fieldState.error?.message} />
                      )}
                    />
                    <Controller
                      control={profileForm.control}
                      name="phone"
                      render={({ field, fieldState }) => (
                        <Field label="Phone Number *" placeholder="10-digit phone" {...field} error={fieldState.error?.message} />
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Controller
                      control={profileForm.control}
                      name="gender"
                      render={({ field }) => (
                        <div>
                          <label className="text-sm font-medium text-foreground block mb-1">Gender</label>
                          <select
                            className="w-full border border-input rounded-md p-2 bg-background text-sm"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          >
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      )}
                    />

                    <Controller
                      control={profileForm.control}
                      name="dob"
                      render={({ field, fieldState }) => {
                        let parsedDate: Date | undefined = undefined;
                        if (field.value) {
                          const d = new Date(field.value);
                          if (!isNaN(d.getTime())) parsedDate = d;
                        }
                        return (
                          <div>
                            <label className="text-sm font-medium text-foreground block mb-1">Date of Birth</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal h-9 border-input bg-background text-sm",
                                    !field.value && "text-muted-foreground",
                                    fieldState.error && "border-red-500"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4 text-teal-600 shrink-0" />
                                  {parsedDate ? format(parsedDate, "PPP") : <span>Pick date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 z-[99999]" align="start">
                                <Calendar
                                  mode="single"
                                  selected={parsedDate}
                                  onSelect={(date) => {
                                    if (date) {
                                      const yyyy = date.getFullYear();
                                      const mm = String(date.getMonth() + 1).padStart(2, "0");
                                      const dd = String(date.getDate()).padStart(2, "0");
                                      field.onChange(`${yyyy}-${mm}-${dd}`);
                                    } else {
                                      field.onChange("");
                                    }
                                  }}
                                  captionLayout="dropdown"
                                  startMonth={new Date(1970, 0)}
                                  endMonth={new Date(new Date().getFullYear(), 11)}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        );
                      }}
                    />

                    <Controller
                      control={profileForm.control}
                      name="entranceMeritScore"
                      render={({ field, fieldState }) => (
                        <Field label="Merit Score (%) *" type="number" step="0.01" {...field} error={fieldState.error?.message} />
                      )}
                    />
                  </div>

                  <Controller
                    control={profileForm.control}
                    name="address"
                    render={({ field, fieldState }) => (
                      <Field label="Residential Address" placeholder="Address, City, State, Pincode" {...field} error={fieldState.error?.message} />
                    )}
                  />

                  <Controller
                    control={profileForm.control}
                    name="notes"
                    render={({ field, fieldState }) => (
                      <Field label="Admission Notes / Remarks" placeholder="Remarks or notes" {...field} error={fieldState.error?.message} />
                    )}
                  />

                  <DialogFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsEditingProfile(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={updateApplicantMutation.isPending}>
                      {updateApplicantMutation.isPending ? "Saving..." : "Save Profile Changes"}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert to Student Modal */}
      <Dialog open={convertModalOpen} onOpenChange={setConvertModalOpen}>
        <DialogContent
          className="w-full max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 space-y-0 gap-2">
            <div>
              <DialogTitle className="text-lg font-bold">Convert Applicant to Student</DialogTitle>
              <DialogDescription className="text-xs">
                Finalize candidate enrollment and assign to academic batch
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setConvertModalOpen(false)}
            >
              <X size={16} />
              <span className="sr-only">Close</span>
            </Button>
          </DialogHeader>

          <form onSubmit={convertForm.handleSubmit(onConvertSubmit)} className="space-y-4 py-1">
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-md text-xs space-y-1">
              <div className="font-semibold text-foreground">Applicant Details:</div>
              <div>Name: <span className="font-medium text-foreground">{selectedApplicant?.name}</span></div>
              <div>Application No: <span className="font-medium text-foreground">{selectedApplicant?.applicationNo}</span></div>
            </div>

            {/* Seat Booking Advance Linked Notice */}
            {selectedApplicant && Number(selectedApplicant.seatBookingAmount || 0) > 0 && (
              <div className="p-3 bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 rounded-md text-xs space-y-1">
                <div className="font-semibold text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
                  <Tag size={13} className="text-cyan-600" /> Seat Booking Advance Linked:
                </div>
                <div className="text-cyan-800 dark:text-cyan-300">
                  ₹{Number(selectedApplicant.seatBookingAmount).toLocaleString()} ({selectedApplicant.seatBookingStatus === "adjusted" ? "Already Adjusted" : "Unadjusted - will be eligible for deduction in Fees"})
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  Receipt Ref: {selectedApplicant.seatBookingReceiptNo || "N/A"}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Assign Academic Batch *</label>
              <Controller
                control={convertForm.control}
                name="batchId"
                render={({ field, fieldState }) => (
                  <div>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => {
                        const num = Number(val);
                        field.onChange(num);
                        if (num > 0) convertForm.clearErrors("batchId");
                      }}
                    >
                      <SelectTrigger className={cn("w-full", fieldState.error && "border-red-500 bg-red-50/20")}>
                        <SelectValue placeholder="-- Select Academic Batch --" />
                      </SelectTrigger>
                      <SelectContent className="z-[99999]">
                        {batches.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.courseName} - {b.academicYear} (Section {b.section})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.error && (
                      <p className="text-xs text-red-500 font-medium mt-1">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-foreground">Enrollment Number</label>
                <button
                  type="button"
                  onClick={handleResetToAutoSequence}
                  disabled={isFetchingSeq}
                  className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1 font-medium underline"
                >
                  <RotateCcw size={11} className={cn(isFetchingSeq && "animate-spin")} />
                  {isFetchingSeq ? "Generating..." : "Auto-generate sequence"}
                </button>
              </div>
              <Controller
                control={convertForm.control}
                name="enrollmentNo"
                render={({ field, fieldState }) => (
                  <div>
                    <input
                      {...field}
                      placeholder="e.g. NUR-STU-2026-0001 (or leave blank for auto)"
                      className={cn(
                        "w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono",
                        fieldState.error && "border-red-500 bg-red-50/20"
                      )}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Defaults to sequential order upon conversion. You can customize it if needed (must be unique).
                    </p>
                    {fieldState.error && (
                      <p className="text-xs text-red-500 font-medium mt-1">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Controller
                control={convertForm.control}
                name="guardianName"
                render={({ field, fieldState }) => (
                  <Field label="Guardian Name" placeholder="Father/Mother Name" {...field} error={fieldState.error?.message} />
                )}
              />
              <Controller
                control={convertForm.control}
                name="guardianPhone"
                render={({ field, fieldState }) => (
                  <Field label="Guardian Phone" placeholder="+91 9876543210" {...field} error={fieldState.error?.message} />
                )}
              />
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setConvertModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={convertToStudentMutation.isPending}>
                {convertToStudentMutation.isPending ? "Converting..." : "Confirm Student Enrollment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Seat Booking Advance Modal */}
      <Dialog open={seatBookingModalOpen} onOpenChange={setSeatBookingModalOpen}>
        <DialogContent
          className="w-full max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 space-y-0 gap-2">
            <div>
              <DialogTitle className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300 text-lg font-bold">
                <Tag className="h-5 w-5 text-cyan-600 shrink-0" /> Record Seat Booking Advance
              </DialogTitle>
              <DialogDescription className="text-xs">
                Record seat reservation advance payment for candidate provisional admission.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setSeatBookingModalOpen(false)}
            >
              <X size={16} />
              <span className="sr-only">Close</span>
            </Button>
          </DialogHeader>

          {seatBookingApplicant && (
            <form
              onSubmit={seatBookingForm.handleSubmit((values) => {
                recordSeatBookingMutation.mutate({
                  id: seatBookingApplicant.id,
                  values,
                });
              })}
              className="space-y-4 py-1"
            >
              <div className="p-3 bg-cyan-50/60 dark:bg-cyan-950/40 rounded-lg text-xs space-y-1 border border-cyan-200 dark:border-cyan-800">
                <div className="font-semibold text-foreground">Candidate Details:</div>
                <div>Name: <strong className="text-foreground">{seatBookingApplicant.name}</strong></div>
                <div>Application No: <span className="font-mono text-cyan-700 dark:text-cyan-300 font-semibold">{seatBookingApplicant.applicationNo}</span></div>
                <div>Course: <span className="text-foreground">{seatBookingApplicant.courseName || "B.Sc Nursing"}</span></div>
              </div>

              <div>
                <Controller
                  control={seatBookingForm.control}
                  name="amount"
                  rules={{ required: "Advance amount is required", min: { value: 1, message: "Amount must be greater than 0" } }}
                  render={({ field, fieldState }) => (
                    <Field
                      label="Seat Booking Advance Amount (₹) *"
                      type="number"
                      min="1"
                      placeholder="25000"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Payment Mode *</label>
                  <Controller
                    control={seatBookingForm.control}
                    name="paymentMode"
                    render={({ field }) => (
                      <Select value={field.value || "cash"} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Payment Mode" />
                        </SelectTrigger>
                        <SelectContent className="z-[99999]">
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer / NEFT</SelectItem>
                          <SelectItem value="upi">UPI / GPay / PhonePe</SelectItem>
                          <SelectItem value="card">Credit / Debit Card</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Payment Date *</label>
                  <Controller
                    control={seatBookingForm.control}
                    name="paymentDate"
                    render={({ field }) => {
                      const selectedDate = field.value ? new Date(field.value) : new Date();
                      return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-9 border-input bg-background text-xs",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-cyan-600 shrink-0" />
                              {field.value ? format(selectedDate, "PPP") : <span>Pick date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-[99999]" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                if (date) {
                                  field.onChange(format(date, "yyyy-MM-dd"));
                                }
                              }}
                              captionLayout="dropdown"
                              startMonth={new Date(2020, 0)}
                              endMonth={new Date(2035, 11)}
                            />
                          </PopoverContent>
                        </Popover>
                      );
                    }}
                  />
                </div>
              </div>

              <Controller
                control={seatBookingForm.control}
                name="notes"
                render={({ field }) => (
                  <Field
                    label="Transaction Reference / Notes"
                    placeholder="e.g. UTR number, provisional reservation notes"
                    {...field}
                  />
                )}
              />

              <DialogFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSeatBookingModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                  disabled={recordSeatBookingMutation.isPending}
                >
                  {recordSeatBookingMutation.isPending ? "Recording..." : "Record Payment & Issue Receipt"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
