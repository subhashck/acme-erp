import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller, useFieldArray, Control } from "react-hook-form";
import {
  UserCheck,
  Plus,
  CheckCircle,
  XCircle,
  X,
  ArrowRight,
  UserPlus,
  Search,
  Calendar as CalendarIcon,
  Eye,
  Edit,
  Tag,
  Download,
  Printer,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  GraduationCap,
  User,
  Users,
  MapPin,
  BookOpen,
  Award,
  FileText,
  Building2,
  Briefcase,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/ui/label";
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
  .number({ message: "Entrance / Merit score must be a valid number" })
  .min(0, "Score must be a valid percentage between 0% and 100%")
  .max(100, "Score must be a valid percentage between 0% and 100%");

import { CollegeAccessGuard } from "@/components/CollegeAccessGuard";

export const Route = createFileRoute("/_authenticated/college/admissions")({
  component: () => (
    <CollegeAccessGuard>
      <AdmissionsPage />
    </CollegeAccessGuard>
  ),
});

export interface ExamDetail {
  exam: "10th" | "11th" | "12th" | string;
  instituteName?: string;
  instituteAddress?: string;
  board: string;
  year: string;
  subjects: string;
  subjectScores?: string;
  percentage: number | string;
}

export interface Applicant {
  id: number;
  applicationNo: string;
  courseId: number;
  courseName: string;
  academicYear: string;
  name: string;
  email: string;
  phone: string;
  aadharNo?: string | null;
  gender: string;
  dob?: string;
  address?: string;
  // Parents Information
  fatherName?: string | null;
  fatherPhone?: string | null;
  fatherAadharNo?: string | null;
  fatherOccupation?: string | null;
  fatherOrganization?: string | null;
  fatherAnnualIncome?: string | number | null;
  motherName?: string | null;
  motherPhone?: string | null;
  motherAadharNo?: string | null;
  motherOccupation?: string | null;
  motherOrganization?: string | null;
  motherAnnualIncome?: string | number | null;
  // Addresses
  presentAddress?: string | null;
  presentDistrict?: string | null;
  presentPincode?: string | null;
  presentState?: string | null;
  permanentAddress?: string | null;
  permanentDistrict?: string | null;
  permanentPincode?: string | null;
  permanentState?: string | null;
  // Academic & Exam History (10th, 11th, 12th)
  academicHistory?: ExamDetail[] | null;
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

export interface ApplicantFormData {
  batchId?: number;
  courseId: number;
  academicYear: string;
  name: string;
  email: string;
  phone: string;
  aadharNo: string;
  gender: string;
  dob: string;
  fatherName: string;
  fatherPhone: string;
  fatherAadharNo: string;
  fatherOccupation: string;
  fatherOrganization: string;
  fatherAnnualIncome: string | number;
  motherName: string;
  motherPhone: string;
  motherAadharNo: string;
  motherOccupation: string;
  motherOrganization: string;
  motherAnnualIncome: string | number;
  presentAddress: string;
  presentDistrict: string;
  presentPincode: string;
  presentState: string;
  permanentAddress: string;
  permanentDistrict: string;
  permanentPincode: string;
  permanentState: string;
  academicHistory: ExamDetail[];
  entranceMeritScore: number;
  quotaCategory: "general" | "reserved" | "management";
  notes: string;
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

const defaultAcademicHistory: ExamDetail[] = [
  { exam: "10th", instituteName: "", instituteAddress: "", board: "", year: "", subjects: "", subjectScores: "", percentage: "" },
  { exam: "11th", instituteName: "", instituteAddress: "", board: "", year: "", subjects: "", subjectScores: "", percentage: "" },
  { exam: "12th", instituteName: "", instituteAddress: "", board: "", year: "", subjects: "", subjectScores: "", percentage: "" },
];

export function ApplicantFormPanels({
  form,
  courses,
  batches = [],
}: {
  form: any;
  courses: any[];
  batches?: any[];
}) {
  const [sameAddress, setSameAddress] = React.useState(false);

  const handleSameAddressChange = (checked: boolean) => {
    setSameAddress(checked);
    if (checked) {
      form.setValue("permanentAddress", form.getValues("presentAddress") || "");
      form.setValue("permanentDistrict", form.getValues("presentDistrict") || "");
      form.setValue("permanentPincode", form.getValues("presentPincode") || "");
      form.setValue("permanentState", form.getValues("presentState") || "");
    }
  };

  return (
    <div className="space-y-4">
      {/* Panel 1: Academic Program, Batch & Quota Selection */}
      <Card className="border shadow-xs">
        <CardHeader className="py-2.5 px-4 bg-muted/30 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <GraduationCap className="h-4 w-4 text-teal-600" />
            1. Academic Program & Quota Allocation
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            {/* Academic Batch SELECT from master */}
            <div>
              <Label className="text-xs font-medium text-foreground block mb-1">Academic Batch</Label>
              <Controller
                control={form.control}
                name="batchId"
                render={({ field }) => {
                  const selectedCourseId = Number(form.watch("courseId") || 0);
                  const filteredBatches = selectedCourseId > 0
                    ? batches.filter((b) => Number(b.courseId) === selectedCourseId)
                    : batches;

                  return (
                    <select
                      className="w-full border border-input rounded-md p-2 bg-background text-sm font-medium transition-colors"
                      value={field.value || 0}
                      onChange={(e) => {
                        const bId = Number(e.target.value);
                        field.onChange(bId);
                        if (bId > 0) {
                          const matched = batches.find((b) => b.id === bId);
                          if (matched) {
                            if (matched.courseId) {
                              form.setValue("courseId", Number(matched.courseId));
                              form.clearErrors("courseId");
                            }
                            if (matched.academicYear) {
                              form.setValue("academicYear", matched.academicYear.toUpperCase());
                              form.clearErrors("academicYear");
                            }
                          }
                        }
                      }}
                    >
                      <option value={0}>-- Select Academic Batch --</option>
                      {filteredBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name ? `${b.name} (${b.academicYear || ""})` : `${b.courseName || "Batch"} - ${b.academicYear || ""}`}
                        </option>
                      ))}
                    </select>
                  );
                }}
              />
            </div>

            {/* Target Program / Course */}
            <div>
              <Label htmlFor="courseId" className="text-xs font-medium text-foreground block mb-1">Target Program / Course *</Label>
              <Controller
                control={form.control}
                name="courseId"
                render={({ field, fieldState }) => (
                  <div>
                    <select
                      className={cn(
                        "w-full border rounded-md p-2 bg-background text-sm transition-colors",
                        fieldState.error ? "border-red-500 focus:ring-red-500 bg-red-50/20 dark:bg-red-950/20" : "border-input"
                      )}
                      value={field.value || 0}
                      onChange={(e) => {
                        const cId = Number(e.target.value);
                        field.onChange(cId);
                        if (cId > 0) form.clearErrors("courseId");
                      }}
                    >
                      <option value={0}>-- Select Program Course --</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
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

            {/* Academic Session (Derived from current year, editable) */}
            <Controller
              control={form.control}
              name="academicYear"
              render={({ field, fieldState }) => (
                <Field
                  label="Academic Session *"
                  placeholder="e.g. 2026-2030"
                  {...field}
                  value={field.value || ""}
                  className="uppercase"
                  onChange={(e: any) => {
                    const val = typeof e === "string" ? e : e?.target?.value ?? "";
                    field.onChange(val.toUpperCase());
                  }}
                  error={fieldState.error?.message}
                />
              )}
            />

            {/* Quota Category */}
            <Controller
              control={form.control}
              name="quotaCategory"
              render={({ field }) => (
                <div>
                  <Label className="text-xs font-medium text-foreground block mb-1">Quota Category</Label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Controller
              control={form.control}
              name="entranceMeritScore"
              render={({ field, fieldState }) => (
                <Field
                  label="Entrance / Merit Score (%) *"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  placeholder="e.g. 85.50"
                  {...field}
                  value={field.value !== undefined && field.value !== null ? field.value : ""}
                  onChange={(e: any) => {
                    const rawVal = e?.target ? e.target.value : e;
                    if (rawVal === "") {
                      field.onChange("");
                      form.setError("entranceMeritScore", {
                        type: "manual",
                        message: "Entrance / Merit Score is required",
                      });
                      return;
                    }
                    const num = Number(rawVal);
                    field.onChange(num);
                    if (isNaN(num) || num < 0 || num > 100) {
                      form.setError("entranceMeritScore", {
                        type: "manual",
                        message: "Score must be a valid percentage between 0% and 100%",
                      });
                    } else {
                      form.clearErrors("entranceMeritScore");
                    }
                  }}
                  error={fieldState.error?.message}
                />
              )}
            />
            <div className="text-xs text-muted-foreground flex items-center p-3 rounded-md bg-muted/40 border">
              Provisional admission merit percentage (0.00% – 100.00%) used for quota ranking and seat allocation.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel 2: Applicant Personal Details */}
      <Card className="border shadow-xs">
        <CardHeader className="py-2.5 px-4 bg-muted/30 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <User className="h-4 w-4 text-teal-600" />
            2. Applicant Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field
                label="Full Applicant Name (Uppercase) *"
                placeholder="e.g. ANANYA SHARMA"
                {...field}
                value={field.value || ""}
                className="uppercase"
                onChange={(e: any) => {
                  const val = typeof e === "string" ? e : e?.target?.value ?? "";
                  field.onChange(val.toUpperCase());
                }}
                error={fieldState.error?.message}
              />
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Controller
              control={form.control}
              name="dob"
              render={({ field, fieldState }) => {
                let parsedDate: Date | undefined = undefined;
                if (field.value) {
                  const d = new Date(field.value);
                  if (!isNaN(d.getTime())) parsedDate = d;
                }

                return (
                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1">Date of Birth</label>
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
                          {parsedDate ? format(parsedDate, "PPP") : <span>Pick date of birth</span>}
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

            <Controller
              control={form.control}
              name="gender"
              render={({ field }) => (
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Gender</label>
                  <select
                    className="w-full border border-input rounded-md p-2 bg-background text-sm font-medium h-9"
                    value={field.value || "Female"}
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
              control={form.control}
              name="phone"
              render={({ field, fieldState }) => (
                <Field
                  label="Student Contact No *"
                  placeholder="10-digit number"
                  {...field}
                  value={field.value || ""}
                  onChange={(e: any) => {
                    const val = typeof e === "string" ? e : e?.target?.value ?? "";
                    field.onChange(val.replace(/\D/g, "").slice(0, 10));
                  }}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={form.control}
              name="aadharNo"
              render={({ field, fieldState }) => (
                <Field
                  label="Student Aadhar No *"
                  placeholder="12-digit Aadhar"
                  {...field}
                  value={field.value || ""}
                  className="uppercase"
                  maxLength={12}
                  onChange={(e: any) => {
                    const val = typeof e === "string" ? e : e?.target?.value ?? "";
                    field.onChange(val.replace(/\D/g, "").slice(0, 12));
                  }}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field label="Email Address" type="email" placeholder="applicant@example.com" {...field} error={fieldState.error?.message} />
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Panel 3: Parents & Family Details */}
      <Card className="border shadow-xs">
        <CardHeader className="py-2.5 px-4 bg-muted/30 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Users className="h-4 w-4 text-teal-600" />
            3. Parents Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Father's Info */}
          <div className="p-3.5 rounded-lg border bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-teal-600" /> Father's Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Controller
                control={form.control}
                name="fatherName"
                render={({ field }) => (
                  <Field
                    label="Father's Full Name"
                    placeholder="e.g. RAJESH SHARMA"
                    {...field}
                    value={field.value || ""}
                    className="uppercase"
                    onChange={(e: any) => {
                      const val = typeof e === "string" ? e : e?.target?.value ?? "";
                      field.onChange(val.toUpperCase());
                    }}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="fatherPhone"
                render={({ field, fieldState }) => (
                  <Field
                    label="Father's Contact No *"
                    placeholder="10-digit number"
                    {...field}
                    value={field.value || ""}
                    onChange={(e: any) => {
                      const val = typeof e === "string" ? e : e?.target?.value ?? "";
                      field.onChange(val.replace(/\D/g, "").slice(0, 10));
                    }}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="fatherAadharNo"
                render={({ field, fieldState }) => (
                  <Field
                    label="Father's Aadhar No *"
                    placeholder="12-digit Aadhar"
                    {...field}
                    value={field.value || ""}
                    className="uppercase"
                    maxLength={12}
                    onChange={(e: any) => {
                      const val = typeof e === "string" ? e : e?.target?.value ?? "";
                      field.onChange(val.replace(/\D/g, "").slice(0, 12));
                    }}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="fatherOccupation"
                render={({ field }) => (
                  <Field
                    label="Occupation"
                    placeholder="e.g. GOVERNMENT SERVICE / BUSINESS"
                    {...field}
                    value={field.value || ""}
                    className="uppercase"
                    onChange={(e: any) => {
                      const val = typeof e === "string" ? e : e?.target?.value ?? "";
                      field.onChange(val.toUpperCase());
                    }}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="fatherOrganization"
                render={({ field }) => (
                  <Field
                    label="Organization / Employer"
                    placeholder="e.g. HEALTH DEPARTMENT"
                    {...field}
                    value={field.value || ""}
                    className="uppercase"
                    onChange={(e: any) => {
                      const val = typeof e === "string" ? e : e?.target?.value ?? "";
                      field.onChange(val.toUpperCase());
                    }}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="fatherAnnualIncome"
                render={({ field }) => (
                  <Field label="Annual Income (₹)" type="number" placeholder="e.g. 600000" {...field} value={field.value || ""} />
                )}
              />
            </div>
          </div>

          {/* Mother's Info */}
          <div className="p-3.5 rounded-lg border bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-teal-600" /> Mother's Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Controller
                control={form.control}
                name="motherName"
                render={({ field }) => (
                  <Field
                    label="Mother's Full Name"
                    placeholder="e.g. SUNITA SHARMA"
                    {...field}
                    value={field.value || ""}
                    className="uppercase"
                    onChange={(e: any) => {
                      const val = typeof e === "string" ? e : e?.target?.value ?? "";
                      field.onChange(val.toUpperCase());
                    }}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="motherPhone"
                render={({ field, fieldState }) => (
                  <Field
                    label="Mother's Contact No *"
                    placeholder="10-digit number"
                    {...field}
                    value={field.value || ""}
                    onChange={(e: any) => {
                      const val = typeof e === "string" ? e : e?.target?.value ?? "";
                      field.onChange(val.replace(/\D/g, "").slice(0, 10));
                    }}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="motherAadharNo"
                render={({ field, fieldState }) => (
                  <Field
                    label="Mother's Aadhar No *"
                    placeholder="12-digit Aadhar"
                    {...field}
                    value={field.value || ""}
                    className="uppercase"
                    maxLength={12}
                    onChange={(e: any) => {
                      const val = typeof e === "string" ? e : e?.target?.value ?? "";
                      field.onChange(val.replace(/\D/g, "").slice(0, 12));
                    }}
                    error={fieldState.error?.message}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="motherOccupation"
                render={({ field }) => (
                  <Field
                    label="Occupation"
                    placeholder="e.g. TEACHER / HOMEMAKER"
                    {...field}
                    value={field.value || ""}
                    className="uppercase"
                    onChange={(e: any) => {
                      const val = typeof e === "string" ? e : e?.target?.value ?? "";
                      field.onChange(val.toUpperCase());
                    }}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="motherOrganization"
                render={({ field }) => (
                  <Field
                    label="Organization / Employer"
                    placeholder="e.g. PUBLIC SCHOOL"
                    {...field}
                    value={field.value || ""}
                    className="uppercase"
                    onChange={(e: any) => {
                      const val = typeof e === "string" ? e : e?.target?.value ?? "";
                      field.onChange(val.toUpperCase());
                    }}
                  />
                )}
              />
              <Controller
                control={form.control}
                name="motherAnnualIncome"
                render={({ field }) => (
                  <Field label="Annual Income (₹)" type="number" placeholder="e.g. 450000" {...field} value={field.value || ""} />
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel 4: Residential Addresses */}
      <Card className="border shadow-xs">
        <CardHeader className="py-2.5 px-4 bg-muted/30 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <MapPin className="h-4 w-4 text-teal-600" />
            4. Residential Addresses (Present & Permanent)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            {/* Present Address */}
            <div className="p-3.5 rounded-lg border bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
              <div className="flex items-center justify-between h-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-teal-600" /> Present Address
                </h4>
              </div>
              <div>
                <Label>Address (Street / House / Landmark) *</Label>
                <Controller
                  control={form.control}
                  name="presentAddress"
                  render={({ field }) => (
                    <Textarea
                      placeholder="ENTER FULL PRESENT RESIDENTIAL ADDRESS..."
                      rows={3}
                      className="resize-none bg-background uppercase"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Controller
                  control={form.control}
                  name="presentDistrict"
                  render={({ field }) => (
                    <Field
                      label="District"
                      placeholder="e.g. IMPHAL WEST"
                      {...field}
                      value={field.value || ""}
                      className="uppercase"
                      onChange={(e: any) => {
                        const val = typeof e === "string" ? e : e?.target?.value ?? "";
                        field.onChange(val.toUpperCase());
                      }}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="presentPincode"
                  render={({ field }) => (
                    <Field
                      label="Pin Code"
                      placeholder="e.g. 795001"
                      {...field}
                      value={field.value || ""}
                      className="uppercase"
                      onChange={(e: any) => {
                        const val = typeof e === "string" ? e : e?.target?.value ?? "";
                        field.onChange(val.toUpperCase());
                      }}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="presentState"
                  render={({ field }) => (
                    <Field
                      label="State"
                      placeholder="e.g. MANIPUR"
                      {...field}
                      value={field.value || ""}
                      className="uppercase"
                      onChange={(e: any) => {
                        const val = typeof e === "string" ? e : e?.target?.value ?? "";
                        field.onChange(val.toUpperCase());
                      }}
                    />
                  )}
                />
              </div>
            </div>

            {/* Permanent Address */}
            <div className="p-3.5 rounded-lg border bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
              <div className="flex items-center justify-between h-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-teal-600" /> Permanent Address
                </h4>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="same-present-address"
                    checked={sameAddress}
                    onChange={(e) => handleSameAddressChange(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <label htmlFor="same-present-address" className="text-xs font-medium text-muted-foreground cursor-pointer select-none">
                    Same as Present
                  </label>
                </div>
              </div>
              <div>
                <Label>Address (Street / House / Landmark)</Label>
                <Controller
                  control={form.control}
                  name="permanentAddress"
                  render={({ field }) => (
                    <Textarea
                      placeholder="ENTER FULL PERMANENT ADDRESS..."
                      rows={3}
                      className="resize-none bg-background uppercase"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Controller
                  control={form.control}
                  name="permanentDistrict"
                  render={({ field }) => (
                    <Field
                      label="District"
                      placeholder="e.g. IMPHAL WEST"
                      {...field}
                      value={field.value || ""}
                      className="uppercase"
                      onChange={(e: any) => {
                        const val = typeof e === "string" ? e : e?.target?.value ?? "";
                        field.onChange(val.toUpperCase());
                      }}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="permanentPincode"
                  render={({ field }) => (
                    <Field
                      label="Pin Code"
                      placeholder="e.g. 795001"
                      {...field}
                      value={field.value || ""}
                      className="uppercase"
                      onChange={(e: any) => {
                        const val = typeof e === "string" ? e : e?.target?.value ?? "";
                        field.onChange(val.toUpperCase());
                      }}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name="permanentState"
                  render={({ field }) => (
                    <Field
                      label="State"
                      placeholder="e.g. MANIPUR"
                      {...field}
                      value={field.value || ""}
                      className="uppercase"
                      onChange={(e: any) => {
                        const val = typeof e === "string" ? e : e?.target?.value ?? "";
                        field.onChange(val.toUpperCase());
                      }}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Panel 5: Examination History (Class 10, 11, 12) */}
      <Card className="border shadow-xs">
        <CardHeader className="py-2.5 px-4 bg-muted/30 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <BookOpen className="h-4 w-4 text-teal-600" />
            5. Academic & Qualifying Examination History (Class 10, 11, 12)
          </CardTitle>
          <CardDescription className="text-xs">
            Capture Board/University, Passing Year, Multiline Subjects Taken, and Percentage Scored in each subject.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {[
            { index: 0, title: "Class 10 / Matriculation / SSLC", defaultExam: "10th" },
            { index: 1, title: "Class 11 / Higher Secondary Year 1", defaultExam: "11th" },
            { index: 2, title: "Class 12 / Higher Secondary (10+2)", defaultExam: "12th" },
          ].map((examItem) => (
            <div key={examItem.index} className="p-3.5 rounded-lg border bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-teal-600" /> {examItem.title}
                </h4>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                  {examItem.defaultExam}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Controller
                  control={form.control}
                  name={`academicHistory.${examItem.index}.instituteName`}
                  render={({ field }) => (
                    <Field
                      label="School / College / Institute Name"
                      placeholder="e.g. ST. JOSEPH HIGHER SECONDARY SCHOOL"
                      {...field}
                      value={field.value || ""}
                      className="uppercase"
                      onChange={(e: any) => {
                        const val = typeof e === "string" ? e : e?.target?.value ?? "";
                        field.onChange(val.toUpperCase());
                      }}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name={`academicHistory.${examItem.index}.instituteAddress`}
                  render={({ field }) => (
                    <Field
                      label="Institute Address / Location"
                      placeholder="e.g. IMPHAL, MANIPUR"
                      {...field}
                      value={field.value || ""}
                      className="uppercase"
                      onChange={(e: any) => {
                        const val = typeof e === "string" ? e : e?.target?.value ?? "";
                        field.onChange(val.toUpperCase());
                      }}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Controller
                  control={form.control}
                  name={`academicHistory.${examItem.index}.board`}
                  render={({ field }) => (
                    <Field
                      label="University / Board"
                      placeholder="e.g. CBSE / STATE BOARD / COHSEM"
                      {...field}
                      value={field.value || ""}
                      className="uppercase"
                      onChange={(e: any) => {
                        const val = typeof e === "string" ? e : e?.target?.value ?? "";
                        field.onChange(val.toUpperCase());
                      }}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name={`academicHistory.${examItem.index}.year`}
                  render={({ field }) => (
                    <Field
                      label="Year of Passing"
                      placeholder="e.g. 2022"
                      {...field}
                      value={field.value || ""}
                      className="uppercase"
                      onChange={(e: any) => {
                        const val = typeof e === "string" ? e : e?.target?.value ?? "";
                        field.onChange(val.toUpperCase());
                      }}
                    />
                  )}
                />
                <Controller
                  control={form.control}
                  name={`academicHistory.${examItem.index}.percentage`}
                  render={({ field }) => (
                    <Field
                      label="Aggregate / Total %"
                      placeholder="e.g. 86.4%"
                      {...field}
                      value={field.value || ""}
                      className="uppercase"
                      onChange={(e: any) => {
                        const val = typeof e === "string" ? e : e?.target?.value ?? "";
                        field.onChange(val.toUpperCase());
                      }}
                    />
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Subjects Taken (Multiline Input)</Label>
                  <Controller
                    control={form.control}
                    name={`academicHistory.${examItem.index}.subjects`}
                    render={({ field }) => (
                      <Textarea
                        placeholder="ENTER SUBJECTS (MULTILINE)&#10;E.G.&#10;ENGLISH&#10;PHYSICS&#10;CHEMISTRY&#10;BIOLOGY&#10;MATHEMATICS"
                        rows={3}
                        className="font-mono text-xs resize-none uppercase"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label>Percentage / Marks Scored in Each Subject</Label>
                  <Controller
                    control={form.control}
                    name={`academicHistory.${examItem.index}.subjectScores`}
                    render={({ field }) => (
                      <Textarea
                        placeholder="ENTER SUBJECT-WISE SCORES&#10;E.G.&#10;ENGLISH: 85%&#10;PHYSICS: 90%&#10;CHEMISTRY: 88%&#10;BIOLOGY: 92%"
                        rows={3}
                        className="font-mono text-xs resize-none uppercase"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    )}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Panel 6: Admission Remarks & Verification Notes */}
      <Card className="border shadow-xs">
        <CardHeader className="py-2.5 px-4 bg-muted/30 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <FileText className="h-4 w-4 text-teal-600" />
            6. Admission Notes & Remarks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Controller
            control={form.control}
            name="notes"
            render={({ field }) => (
              <Textarea
                placeholder="ENTER ANY ADMISSION REMARKS, SPECIAL QUOTAS, REFERENCE DETAILS, OR VERIFICATION NOTES..."
                rows={2}
                className="resize-none uppercase"
                {...field}
                value={field.value || ""}
                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
              />
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function AdmissionsPage() {
  const queryClient = useQueryClient();
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

  const defaultApplicantFormValues: ApplicantFormData = {
    batchId: 0,
    courseId: 0,
    academicYear: defaultAcademicYear,
    name: "",
    email: "",
    phone: "",
    aadharNo: "",
    gender: "Female",
    dob: "",
    fatherName: "",
    fatherPhone: "",
    fatherAadharNo: "",
    fatherOccupation: "",
    fatherOrganization: "",
    fatherAnnualIncome: "",
    motherName: "",
    motherPhone: "",
    motherAadharNo: "",
    motherOccupation: "",
    motherOrganization: "",
    motherAnnualIncome: "",
    presentAddress: "",
    presentDistrict: "",
    presentPincode: "",
    presentState: "",
    permanentAddress: "",
    permanentDistrict: "",
    permanentPincode: "",
    permanentState: "",
    academicHistory: [
      { exam: "10th", board: "", year: "", subjects: "", subjectScores: "", percentage: "" },
      { exam: "11th", board: "", year: "", subjects: "", subjectScores: "", percentage: "" },
      { exam: "12th", board: "", year: "", subjects: "", subjectScores: "", percentage: "" },
    ],
    entranceMeritScore: 0,
    quotaCategory: "general",
    notes: "",
  };

  const intakeForm = useForm<ApplicantFormData>({
    defaultValues: defaultApplicantFormValues,
  });

  const profileForm = useForm<ApplicantFormData>({
    defaultValues: defaultApplicantFormValues,
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
      intakeForm.reset(defaultApplicantFormValues);
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
      amount: 3000,
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

    let parsedHistory = applicant.academicHistory;
    if (typeof parsedHistory === "string") {
      try {
        parsedHistory = JSON.parse(parsedHistory);
      } catch (e) {
        parsedHistory = defaultAcademicHistory;
      }
    }
    if (!Array.isArray(parsedHistory) || parsedHistory.length === 0) {
      parsedHistory = defaultAcademicHistory;
    } else {
      const exams = ["10th", "11th", "12th"];
      parsedHistory = exams.map((ex) => {
        const found = (parsedHistory as ExamDetail[]).find((p) => p.exam === ex);
        return found || { exam: ex, instituteName: "", instituteAddress: "", board: "", year: "", subjects: "", subjectScores: "", percentage: "" };
      });
    }

    const matchedBatch = batches.find(
      (b) => b.courseId === applicant.courseId && b.academicYear === applicant.academicYear
    );

    profileForm.reset({
      batchId: matchedBatch ? matchedBatch.id : 0,
      courseId: applicant.courseId,
      academicYear: applicant.academicYear || defaultAcademicYear,
      name: applicant.name || "",
      email: applicant.email || "",
      phone: applicant.phone || "",
      aadharNo: applicant.aadharNo || "",
      gender: applicant.gender || "Female",
      dob: applicant.dob || "",
      fatherName: applicant.fatherName || "",
      fatherPhone: applicant.fatherPhone || "",
      fatherAadharNo: applicant.fatherAadharNo || "",
      fatherOccupation: applicant.fatherOccupation || "",
      fatherOrganization: applicant.fatherOrganization || "",
      fatherAnnualIncome: applicant.fatherAnnualIncome != null ? String(applicant.fatherAnnualIncome) : "",
      motherName: applicant.motherName || "",
      motherPhone: applicant.motherPhone || "",
      motherAadharNo: applicant.motherAadharNo || "",
      motherOccupation: applicant.motherOccupation || "",
      motherOrganization: applicant.motherOrganization || "",
      motherAnnualIncome: applicant.motherAnnualIncome != null ? String(applicant.motherAnnualIncome) : "",
      presentAddress: applicant.presentAddress || applicant.address || "",
      presentDistrict: applicant.presentDistrict || "",
      presentPincode: applicant.presentPincode || "",
      presentState: applicant.presentState || "",
      permanentAddress: applicant.permanentAddress || "",
      permanentDistrict: applicant.permanentDistrict || "",
      permanentPincode: applicant.permanentPincode || "",
      permanentState: applicant.permanentState || "",
      academicHistory: parsedHistory,
      entranceMeritScore: applicant.entranceMeritScore ?? 0,
      quotaCategory: applicant.quotaCategory || "general",
      notes: applicant.notes || "",
    });
    setProfileDialogOpen(true);
  };

  const sanitizeApplicantData = (data: any) => {
    const sanitized: any = { ...data };
    const textKeys = [
      "name",
      "academicYear",
      "aadharNo",
      "fatherName",
      "fatherPhone",
      "fatherAadharNo",
      "fatherOccupation",
      "fatherOrganization",
      "motherName",
      "motherPhone",
      "motherAadharNo",
      "motherOccupation",
      "motherOrganization",
      "presentAddress",
      "presentDistrict",
      "presentPincode",
      "presentState",
      "permanentAddress",
      "permanentDistrict",
      "permanentPincode",
      "permanentState",
      "notes",
    ];
    for (const k of textKeys) {
      if (typeof sanitized[k] === "string") {
        sanitized[k] = sanitized[k].trim().toUpperCase();
      }
    }
    if (Array.isArray(sanitized.academicHistory)) {
      sanitized.academicHistory = sanitized.academicHistory.map((h: any) => ({
        ...h,
        instituteName: typeof h.instituteName === "string" ? h.instituteName.trim().toUpperCase() : h.instituteName,
        instituteAddress: typeof h.instituteAddress === "string" ? h.instituteAddress.trim().toUpperCase() : h.instituteAddress,
        board: typeof h.board === "string" ? h.board.trim().toUpperCase() : h.board,
        year: typeof h.year === "string" ? h.year.trim().toUpperCase() : h.year,
        percentage: typeof h.percentage === "string" ? h.percentage.trim().toUpperCase() : h.percentage,
        subjects: typeof h.subjects === "string" ? h.subjects.trim().toUpperCase() : h.subjects,
        subjectScores: typeof h.subjectScores === "string" ? h.subjectScores.trim().toUpperCase() : h.subjectScores,
      }));
    }
    return sanitized;
  };

  const validateApplicantMandatoryFields = (form: any, data: any): boolean => {
    let isValid = true;

    if (!data.name || !data.name.trim()) {
      form.setError("name", { type: "manual", message: "Full applicant name is required" });
      isValid = false;
    }

    const studentPhone = data.phone ? String(data.phone).replace(/\D/g, "") : "";
    if (studentPhone.length !== 10) {
      form.setError("phone", { type: "manual", message: "Student contact number is required (10 digits)" });
      isValid = false;
    }

    const studentAadhar = data.aadharNo ? String(data.aadharNo).replace(/\D/g, "") : "";
    if (studentAadhar.length !== 12) {
      form.setError("aadharNo", { type: "manual", message: "Student Aadhar number is required (12 digits)" });
      isValid = false;
    }

    const fatherPhone = data.fatherPhone ? String(data.fatherPhone).replace(/\D/g, "") : "";
    if (fatherPhone.length !== 10) {
      form.setError("fatherPhone", { type: "manual", message: "Father's contact number is required (10 digits)" });
      isValid = false;
    }

    const fatherAadhar = data.fatherAadharNo ? String(data.fatherAadharNo).replace(/\D/g, "") : "";
    if (fatherAadhar.length !== 12) {
      form.setError("fatherAadharNo", { type: "manual", message: "Father's Aadhar number is required (12 digits)" });
      isValid = false;
    }

    const motherPhone = data.motherPhone ? String(data.motherPhone).replace(/\D/g, "") : "";
    if (motherPhone.length !== 10) {
      form.setError("motherPhone", { type: "manual", message: "Mother's contact number is required (10 digits)" });
      isValid = false;
    }

    const motherAadhar = data.motherAadharNo ? String(data.motherAadharNo).replace(/\D/g, "") : "";
    if (motherAadhar.length !== 12) {
      form.setError("motherAadharNo", { type: "manual", message: "Mother's Aadhar number is required (12 digits)" });
      isValid = false;
    }

    return isValid;
  };

  const onProfileSubmit = (data: any) => {
    const courseId = Number(data.courseId);
    if (!courseId || courseId <= 0) {
      profileForm.setError("courseId", { type: "manual", message: "Please select a target program course" });
      toast.error("Please select a valid target program course");
      return;
    }

    const isMandatoryValid = validateApplicantMandatoryFields(profileForm, data);
    if (!isMandatoryValid) {
      toast.error("Please fill in all mandatory contact numbers (10 digits) and Aadhar numbers (12 digits)");
      return;
    }

    const meritScoreResult = entranceMeritScoreSchema.safeParse(data.entranceMeritScore);
    if (!meritScoreResult.success) {
      const errMsg = meritScoreResult.error.issues[0]?.message || "Score must be a valid percentage between 0% and 100%";
      profileForm.setError("entranceMeritScore", { type: "manual", message: errMsg });
      toast.error(errMsg);
      return;
    }

    const payload = sanitizeApplicantData(data);
    updateApplicantMutation.mutate({
      ...payload,
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

    const isMandatoryValid = validateApplicantMandatoryFields(intakeForm, data);
    if (!isMandatoryValid) {
      toast.error("Please fill in all mandatory contact numbers (10 digits) and Aadhar numbers (12 digits)");
      return;
    }

    const meritScoreResult = entranceMeritScoreSchema.safeParse(data.entranceMeritScore);
    if (!meritScoreResult.success) {
      const errMsg = meritScoreResult.error.issues[0]?.message || "Score must be a valid percentage between 0% and 100%";
      intakeForm.setError("entranceMeritScore", { type: "manual", message: errMsg });
      toast.error(errMsg);
      return;
    }

    const payload = sanitizeApplicantData(data);
    createApplicantMutation.mutate({
      ...payload,
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
      enrollmentNo: data.enrollmentNo ? data.enrollmentNo.trim().toUpperCase() : undefined,
      guardianName: data.guardianName ? data.guardianName.trim().toUpperCase() : undefined,
    });
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

        {/* New Applicant Multi-Panel Modal */}
        <Dialog open={intakeDialogOpen} onOpenChange={(open) => {
          setIntakeDialogOpen(open);
          if (open) {
            intakeForm.clearErrors();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 shadow-xs">
              <Plus size={16} /> New Application Registration
            </Button>
          </DialogTrigger>
          <DialogContent
            className="w-full max-w-[95vw] sm:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-3 space-y-0 gap-2">
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">New Applicant Registration</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Complete candidate admission intake details across all sections below.
                </DialogDescription>
              </div>
              {/* <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setIntakeDialogOpen(false)}
              >
                <X size={16} />
                <span className="sr-only">Close</span>
              </Button> */}
            </DialogHeader>

            <form onSubmit={intakeForm.handleSubmit(onIntakeSubmit)} className="space-y-4 py-2">
              <ApplicantFormPanels
                form={intakeForm}
                courses={courses}
                batches={batches}
              />

              <DialogFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur-xs py-2">
                <Button type="button" variant="outline" onClick={() => setIntakeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={createApplicantMutation.isPending}>
                  {createApplicantMutation.isPending ? "Registering Application..." : "Submit Application"}
                </Button>
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
          className="w-full max-w-[95vw] sm:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6"
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
                        let parsedHistory = viewApplicant.academicHistory;
                        if (typeof parsedHistory === "string") {
                          try {
                            parsedHistory = JSON.parse(parsedHistory);
                          } catch (e) {
                            parsedHistory = defaultAcademicHistory;
                          }
                        }
                        if (!Array.isArray(parsedHistory) || parsedHistory.length === 0) {
                          parsedHistory = defaultAcademicHistory;
                        } else {
                          const exams = ["10th", "11th", "12th"];
                          parsedHistory = exams.map((ex) => {
                            const found = (parsedHistory as ExamDetail[]).find((p) => p.exam === ex);
                            return found || { exam: ex, instituteName: "", instituteAddress: "", board: "", year: "", subjects: "", subjectScores: "", percentage: "" };
                          });
                        }

                        const matchedBatch = batches.find(
                          (b) => b.courseId === viewApplicant.courseId && b.academicYear === viewApplicant.academicYear
                        );

                        profileForm.reset({
                          batchId: matchedBatch ? matchedBatch.id : 0,
                          courseId: viewApplicant.courseId,
                          academicYear: viewApplicant.academicYear || defaultAcademicYear,
                          name: viewApplicant.name || "",
                          email: viewApplicant.email || "",
                          phone: viewApplicant.phone || "",
                          aadharNo: viewApplicant.aadharNo || "",
                          gender: viewApplicant.gender || "Female",
                          dob: viewApplicant.dob || "",
                          fatherName: viewApplicant.fatherName || "",
                          fatherPhone: viewApplicant.fatherPhone || "",
                          fatherAadharNo: viewApplicant.fatherAadharNo || "",
                          fatherOccupation: viewApplicant.fatherOccupation || "",
                          fatherOrganization: viewApplicant.fatherOrganization || "",
                          fatherAnnualIncome: viewApplicant.fatherAnnualIncome != null ? String(viewApplicant.fatherAnnualIncome) : "",
                          motherName: viewApplicant.motherName || "",
                          motherPhone: viewApplicant.motherPhone || "",
                          motherAadharNo: viewApplicant.motherAadharNo || "",
                          motherOccupation: viewApplicant.motherOccupation || "",
                          motherOrganization: viewApplicant.motherOrganization || "",
                          motherAnnualIncome: viewApplicant.motherAnnualIncome != null ? String(viewApplicant.motherAnnualIncome) : "",
                          presentAddress: viewApplicant.presentAddress || viewApplicant.address || "",
                          presentDistrict: viewApplicant.presentDistrict || "",
                          presentPincode: viewApplicant.presentPincode || "",
                          presentState: viewApplicant.presentState || "",
                          permanentAddress: viewApplicant.permanentAddress || "",
                          permanentDistrict: viewApplicant.permanentDistrict || "",
                          permanentPincode: viewApplicant.permanentPincode || "",
                          permanentState: viewApplicant.permanentState || "",
                          academicHistory: parsedHistory,
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
                                amount: 3000,
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

                  {/* Personal & Contact Info Card */}
                  <div className="border rounded-md p-4 space-y-3 bg-card">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-teal-600" /> Personal & Contact Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs block">Full Name</span>
                        <span className="font-semibold text-foreground uppercase">{viewApplicant.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Gender</span>
                        <span className="font-medium text-foreground">{viewApplicant.gender || "Female"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Date of Birth</span>
                        <span className="font-medium text-foreground">
                          {viewApplicant.dob ? format(new Date(viewApplicant.dob), "PPP") : "Not specified"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Student Contact No</span>
                        <span className="font-semibold text-teal-700 dark:text-teal-300 font-mono">{viewApplicant.phone}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Student Aadhar No</span>
                        <span className="font-medium text-foreground font-mono">{viewApplicant.aadharNo || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Email Address</span>
                        <span className="font-medium text-foreground">{viewApplicant.email || "Not specified"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Parents Information Card */}
                  <div className="border rounded-md p-4 space-y-3 bg-card">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-teal-600" /> Parents Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Father */}
                      <div className="p-3 rounded-lg border bg-muted/20 space-y-2 text-xs">
                        <div className="font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wide">
                          Father's Details
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Name</span>
                            <span className="font-medium text-foreground">{viewApplicant.fatherName || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Contact No</span>
                            <span className="font-semibold text-teal-700 dark:text-teal-300 font-mono">{viewApplicant.fatherPhone || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Aadhar No</span>
                            <span className="font-medium text-foreground font-mono">{viewApplicant.fatherAadharNo || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Occupation</span>
                            <span className="font-medium text-foreground">{viewApplicant.fatherOccupation || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Organization / Employer</span>
                            <span className="font-medium text-foreground">{viewApplicant.fatherOrganization || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Annual Income</span>
                            <span className="font-medium text-foreground font-mono">
                              {viewApplicant.fatherAnnualIncome ? `₹${Number(viewApplicant.fatherAnnualIncome).toLocaleString()}` : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Mother */}
                      <div className="p-3 rounded-lg border bg-muted/20 space-y-2 text-xs">
                        <div className="font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wide">
                          Mother's Details
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Name</span>
                            <span className="font-medium text-foreground">{viewApplicant.motherName || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Contact No</span>
                            <span className="font-semibold text-teal-700 dark:text-teal-300 font-mono">{viewApplicant.motherPhone || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Aadhar No</span>
                            <span className="font-medium text-foreground font-mono">{viewApplicant.motherAadharNo || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Occupation</span>
                            <span className="font-medium text-foreground">{viewApplicant.motherOccupation || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Organization / Employer</span>
                            <span className="font-medium text-foreground">{viewApplicant.motherOrganization || "N/A"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[11px]">Annual Income</span>
                            <span className="font-medium text-foreground font-mono">
                              {viewApplicant.motherAnnualIncome ? `₹${Number(viewApplicant.motherAnnualIncome).toLocaleString()}` : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Residential Addresses Card */}
                  <div className="border rounded-md p-4 space-y-3 bg-card">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-teal-600" /> Residential Addresses
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
                        <span className="font-bold text-muted-foreground uppercase text-[11px] block">Present Address</span>
                        <p className="font-medium text-foreground whitespace-pre-wrap">
                          {viewApplicant.presentAddress || viewApplicant.address || "Not specified"}
                        </p>
                        <div className="text-muted-foreground pt-1 flex flex-wrap gap-2">
                          {viewApplicant.presentDistrict && <span>District: <strong>{viewApplicant.presentDistrict}</strong></span>}
                          {viewApplicant.presentPincode && <span>PIN: <strong>{viewApplicant.presentPincode}</strong></span>}
                          {viewApplicant.presentState && <span>State: <strong>{viewApplicant.presentState}</strong></span>}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
                        <span className="font-bold text-muted-foreground uppercase text-[11px] block">Permanent Address</span>
                        <p className="font-medium text-foreground whitespace-pre-wrap">
                          {viewApplicant.permanentAddress || "Same as Present / Not specified"}
                        </p>
                        <div className="text-muted-foreground pt-1 flex flex-wrap gap-2">
                          {viewApplicant.permanentDistrict && <span>District: <strong>{viewApplicant.permanentDistrict}</strong></span>}
                          {viewApplicant.permanentPincode && <span>PIN: <strong>{viewApplicant.permanentPincode}</strong></span>}
                          {viewApplicant.permanentState && <span>State: <strong>{viewApplicant.permanentState}</strong></span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Academic & Examination History Card */}
                  <div className="border rounded-md p-4 space-y-3 bg-card">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-teal-600" /> Academic & Qualifying Examination History (10th, 11th, 12th)
                    </h4>
                    <div className="space-y-3">
                      {(() => {
                        let history = viewApplicant.academicHistory;
                        if (typeof history === "string") {
                          try { history = JSON.parse(history); } catch (e) { history = []; }
                        }
                        if (!Array.isArray(history) || history.length === 0) {
                          return <p className="text-xs text-muted-foreground italic">No academic exam records captured yet.</p>;
                        }
                        return history.map((h, i) => (
                          <div key={i} className="p-3 rounded-lg border bg-muted/20 space-y-2 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-1.5 gap-1">
                              <span className="font-bold text-teal-800 dark:text-teal-300 uppercase">
                                {h.exam === "10th" ? "Class 10 / Matriculation" : h.exam === "11th" ? "Class 11" : "Class 12 / Higher Secondary (10+2)"}
                              </span>
                              <div className="flex flex-wrap items-center gap-3">
                                {h.board && <span>Board: <strong>{h.board}</strong></span>}
                                {h.year && <span>Year: <strong>{h.year}</strong></span>}
                                {h.percentage && <span className="font-bold text-teal-600">Total: {h.percentage}%</span>}
                              </div>
                            </div>
                            {(h.instituteName || h.instituteAddress) && (
                              <div className="text-xs text-foreground/90 bg-background/60 p-2 rounded border flex flex-wrap gap-x-4 gap-y-1">
                                {h.instituteName && <span>Institute: <strong>{h.instituteName}</strong></span>}
                                {h.instituteAddress && <span>Address: <strong>{h.instituteAddress}</strong></span>}
                              </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                              <div>
                                <span className="text-muted-foreground block text-[11px] font-semibold">Subjects Taken:</span>
                                <p className="font-mono text-xs whitespace-pre-wrap bg-background/80 p-2 rounded border mt-0.5">
                                  {h.subjects || "N/A"}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground block text-[11px] font-semibold">Subject-wise Scores:</span>
                                <p className="font-mono text-xs whitespace-pre-wrap bg-background/80 p-2 rounded border mt-0.5">
                                  {h.subjectScores || "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Notes & Remarks Card */}
                  <div className="border rounded-md p-4 space-y-2 bg-card">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-teal-600" /> Admission Notes & Remarks
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
                /* Profile Edit Form using multi-panel cards */
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4 py-2">
                  <ApplicantFormPanels
                    form={profileForm}
                    courses={courses}
                    batches={batches}
                  />

                  <DialogFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t sticky bottom-0 bg-background/95 backdrop-blur-xs py-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditingProfile(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={updateApplicantMutation.isPending}>
                      {updateApplicantMutation.isPending ? "Saving Changes..." : "Save Profile Changes"}
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
                        "w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono uppercase",
                        fieldState.error && "border-red-500 bg-red-50/20"
                      )}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
                  <Field
                    label="Guardian Name"
                    placeholder="e.g. FATHER / MOTHER NAME"
                    {...field}
                    value={field.value || ""}
                    className="uppercase"
                    onChange={(e: any) => {
                      const val = typeof e === "string" ? e : e?.target?.value ?? "";
                      field.onChange(val.toUpperCase());
                    }}
                    error={fieldState.error?.message}
                  />
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
                    placeholder="e.g. UTR NUMBER, PROVISIONAL RESERVATION NOTES"
                    {...field}
                    value={field.value || ""}
                    className="uppercase"
                    onChange={(e: any) => {
                      const val = typeof e === "string" ? e : e?.target?.value ?? "";
                      field.onChange(val.toUpperCase());
                    }}
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
