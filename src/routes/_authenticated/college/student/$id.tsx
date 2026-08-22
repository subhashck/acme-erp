import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { 
  GraduationCap, 
  FileText, 
  Receipt, 
  Calendar, 
  User, 
  Users,
  MapPin,
  BookOpen,
  Award,
  CheckCircle2, 
  XCircle, 
  Upload, 
  ArrowLeft,
  ShieldCheck,
  Pencil,
  Tag,
  Download,
  Phone,
  Mail,
  CreditCard,
  Building2,
  Briefcase,
  IndianRupee,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { EditStudentModal, ExamDetail } from "@/components/EditStudentModal";
import { Field } from "@/components/Field";
import { toast } from "sonner";
import { toNum } from "@/utils/math";
import { cn } from "@/utils/cn";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { CollegeAccessGuard } from "@/components/CollegeAccessGuard";

export const Route = createFileRoute("/_authenticated/college/student/$id")({
  component: () => (
    <CollegeAccessGuard>
      <StudentProfilePage />
    </CollegeAccessGuard>
  ),
});

const generateStudentProfilePDF = (student: any) => {
  const doc = new jsPDF();

  // Header Banner
  doc.setFillColor(13, 148, 136); // Teal 600
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text("ACME COLLEGE OF NURSING", 14, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("STUDENT MASTER DOSSIER & ADMISSION RECORD", 14, 22);

  doc.setFontSize(9);
  doc.text(`Enrollment: ${student.enrollmentNo || "N/A"}`, 196, 14, { align: "right" });
  doc.text(`Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`, 196, 22, { align: "right" });

  doc.setTextColor(30, 41, 59);

  let currentY = 36;
  const leftCol = 14;
  const midCol = 110;
  const lineHeight = 5.5;

  // Section 1: Basic & Program Details
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(13, 148, 136);
  doc.text("1. BASIC IDENTITY & ACADEMIC PROGRAM", 17, currentY + 5);

  currentY += 12;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);

  const drawRow = (label1: string, val1: string, label2: string, val2: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label1, leftCol, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(val1 || "N/A", leftCol + 36, currentY);

    if (label2) {
      doc.setFont("helvetica", "bold");
      doc.text(label2, midCol, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(val2 || "N/A", midCol + 38, currentY);
    }
    currentY += lineHeight;
  };

  drawRow("Student Name:", student.name, "Enrollment No:", student.enrollmentNo);
  drawRow("Program Course:", student.courseName, "Academic Batch:", `${student.batchYear || "N/A"} (Sec ${student.batchSection || "A"})`);
  drawRow("Application No:", student.applicationNo || "Direct Enrol", "Admission Date:", student.admissionDate || "N/A");
  drawRow("Date of Birth:", student.dob || "N/A", "Gender:", student.gender || "Female");
  drawRow("Contact Phone:", student.phone || "N/A", "Email Address:", student.email || "N/A");
  drawRow("Aadhar Number:", student.aadharNo || "N/A", "Enrollment Status:", (student.status || "active").toUpperCase());
  drawRow("Quota Category:", (student.quotaCategory || "general").toUpperCase(), "Merit / Score:", student.entranceMeritScore ? `${student.entranceMeritScore}%` : "N/A");

  currentY += 4;

  // Section 2: Parent & Guardian Details
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(13, 148, 136);
  doc.text("2. FAMILY & GUARDIAN BACKGROUND", 17, currentY + 5);

  currentY += 12;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);

  drawRow("Father's Name:", student.fatherName || "N/A", "Mother's Name:", student.motherName || "N/A");
  drawRow("Father's Phone:", student.fatherPhone || "N/A", "Mother's Phone:", student.motherPhone || "N/A");
  drawRow("Father's Aadhar:", student.fatherAadharNo || "N/A", "Mother's Aadhar:", student.motherAadharNo || "N/A");
  drawRow("Father's Occupation:", student.fatherOccupation || "N/A", "Mother's Occupation:", student.motherOccupation || "N/A");
  drawRow("Father's Employer:", student.fatherOrganization || "N/A", "Mother's Employer:", student.motherOrganization || "N/A");
  drawRow(
    "Father's Income:", 
    student.fatherAnnualIncome ? `INR ${Number(student.fatherAnnualIncome).toLocaleString()}` : "N/A", 
    "Mother's Income:", 
    student.motherAnnualIncome ? `INR ${Number(student.motherAnnualIncome).toLocaleString()}` : "N/A"
  );
  drawRow("Guardian Contact:", `${student.guardianName || "N/A"} (${student.guardianRelation || "Parent"})`, "Guardian Phone:", student.guardianPhone || "N/A");

  currentY += 4;

  // Section 3: Addresses
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(13, 148, 136);
  doc.text("3. RESIDENTIAL & PERMANENT ADDRESSES", 17, currentY + 5);

  currentY += 12;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);

  const presentFull = [student.presentAddress || student.address, student.presentDistrict, student.presentState, student.presentPincode].filter(Boolean).join(", ") || "N/A";
  const permanentFull = [student.permanentAddress, student.permanentDistrict, student.permanentState, student.permanentPincode].filter(Boolean).join(", ") || "N/A";

  doc.setFont("helvetica", "bold");
  doc.text("Present Address:", leftCol, currentY);
  doc.setFont("helvetica", "normal");
  const splitPresent = doc.splitTextToSize(presentFull, 140);
  doc.text(splitPresent, leftCol + 36, currentY);

  currentY += Math.max(splitPresent.length * 4.8, lineHeight) + 2.5;

  doc.setFont("helvetica", "bold");
  doc.text("Permanent Address:", leftCol, currentY);
  doc.setFont("helvetica", "normal");
  const splitPermanent = doc.splitTextToSize(permanentFull, 140);
  doc.text(splitPermanent, leftCol + 36, currentY);

  currentY += Math.max(splitPermanent.length * 4.8, lineHeight) + 4;

  // Section 4: Academic History Table
  let academicList: ExamDetail[] = [];
  if (typeof student.academicHistory === "string") {
    try {
      academicList = JSON.parse(student.academicHistory);
    } catch {
      academicList = [];
    }
  } else if (Array.isArray(student.academicHistory)) {
    academicList = student.academicHistory;
  }

  const tableBody = (academicList.length > 0 ? academicList : [
    { exam: "10th", instituteName: "N/A", board: "N/A", year: "N/A", percentage: "N/A", subjects: "N/A" },
    { exam: "12th", instituteName: "N/A", board: "N/A", year: "N/A", percentage: "N/A", subjects: "N/A" },
  ]).map((item) => [
    item.exam || "Standard",
    item.instituteName || "N/A",
    item.board || "N/A",
    item.year || "N/A",
    item.percentage ? `${item.percentage}%` : "N/A",
    item.subjects || "N/A",
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Standard / Level", "School / Institute", "Board / University", "Passing Year", "Score / %", "Subjects"]],
    body: tableBody,
    theme: "striped",
    headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : currentY + 40;

  // Footer Signatures
  if (finalY < 265) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Student Signature", 24, 275);
    doc.text("Admission Officer / Principal", 140, 275);
    doc.setDrawColor(203, 213, 225);
    doc.line(20, 270, 70, 270);
    doc.line(135, 270, 195, 270);
  }

  doc.save(`Student_Dossier_${student.enrollmentNo || student.id}.pdf`);
  toast.success("Student profile dossier exported to PDF");
};

function StudentProfilePage() {
  const params: any = Route.useParams();
  const studentId = Number(params?.id || 0);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = React.useState<"info" | "docs" | "fees" | "attendance">("info");
  const [docModalOpen, setDocModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);

  const { data: student, isLoading, isError } = useQuery<any>({
    queryKey: ["nursing", "student", studentId],
    queryFn: async () => {
      if (!studentId || isNaN(studentId) || studentId <= 0) return null;
      const res = await fetch(`/api/nursing/students/${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch student details");
      return res.json();
    },
    enabled: Boolean(studentId && !isNaN(studentId) && studentId > 0),
  });

  const docForm = useForm({
    defaultValues: {
      documentType: "certificate",
      title: "",
      fileUrl: "",
    },
  });

  const addDocMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch(`/api/nursing/students/${studentId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to attach document");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Document attached successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "student", studentId] });
      setDocModalOpen(false);
      docForm.reset();
    },
  });

  const verifyDocMutation = useMutation({
    mutationFn: async ({ docId, verificationStatus }: { docId: number; verificationStatus: string }) => {
      const res = await fetch(`/api/nursing/documents/${docId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus }),
      });
      if (!res.ok) throw new Error("Failed to update verification status");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Document verification updated");
      queryClient.invalidateQueries({ queryKey: ["nursing", "student", studentId] });
    },
  });

  if (isLoading) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Loading comprehensive student profile...</div>;
  }

  if (!student) {
    return <div className="p-6 text-center text-sm text-red-500">Student record not found.</div>;
  }

  // Parse Academic History
  let parsedAcademicHistory: ExamDetail[] = [];
  if (typeof student.academicHistory === "string") {
    try {
      parsedAcademicHistory = JSON.parse(student.academicHistory);
    } catch {
      parsedAcademicHistory = [];
    }
  } else if (Array.isArray(student.academicHistory)) {
    parsedAcademicHistory = student.academicHistory;
  }

  const meritScoreVal = Number(student.entranceMeritScore || 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-card border rounded-xl p-5 shadow-sm">
        <div className="flex items-start sm:items-center gap-4">
          <Link to={"/college/students" as any}>
            <Button variant="outline" size="sm" className="h-9 px-3 shrink-0">
              <ArrowLeft size={16} className="mr-1" /> Back
            </Button>
          </Link>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-foreground">
                <GraduationCap className="h-6 w-6 text-teal-600 shrink-0" />
                {student.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {student.status}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {student.quotaCategory || "general"} Quota
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                Enrollment: <strong className="font-mono text-teal-600 dark:text-teal-400">{student.enrollmentNo}</strong>
              </span>
              {student.applicationNo && (
                <span>
                  App No: <strong className="font-mono text-foreground">{student.applicationNo}</strong>
                </span>
              )}
              <span>
                Course: <strong className="text-foreground">{student.courseName}</strong> ({student.batchYear} • Sec {student.batchSection})
              </span>
              {student.admissionDate && (
                <span>
                  Admitted: <strong className="text-foreground">{student.admissionDate}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateStudentProfilePDF(student)}
            className="flex items-center gap-1.5 text-xs h-9"
          >
            <Download size={14} /> Export Profile PDF
          </Button>

          <Button
            onClick={() => setEditModalOpen(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-sm text-xs h-9"
          >
            <Pencil size={14} /> Edit All Details
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b space-x-2 sm:space-x-4 overflow-x-auto">
        <button
          className={`pb-2.5 px-2 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "info" ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("info")}
        >
          <User size={16} /> Admission Master Profile
        </button>
        <button
          className={`pb-2.5 px-2 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "docs" ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("docs")}
        >
          <FileText size={16} /> Documents & Verification ({student.documents?.length || 0})
        </button>
        <button
          className={`pb-2.5 px-2 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "fees" ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("fees")}
        >
          <Receipt size={16} /> Fee Ledger & Advance
        </button>
        <button
          className={`pb-2.5 px-2 text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
            activeTab === "attendance" ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("attendance")}
        >
          <Calendar size={16} /> Attendance History ({student.attendanceStats?.attendancePercent}%)
        </button>
      </div>

      {/* Tab 1: Comprehensive Admission Profile */}
      {activeTab === "info" && (
        <div className="space-y-6">
          {/* Quick KPI Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-teal-100 dark:border-teal-900 bg-teal-50/40 dark:bg-teal-950/20">
              <CardContent className="p-4 space-y-1">
                <div className="text-xs font-semibold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                  <Award size={15} /> Entrance & Merit Score
                </div>
                <div className="text-2xl font-bold text-teal-950 dark:text-teal-100">
                  {meritScoreVal > 0 ? `${meritScoreVal}%` : "Not Evaluated"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Quota Category: <strong className="text-foreground capitalize">{student.quotaCategory || "General"}</strong>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20">
              <CardContent className="p-4 space-y-1">
                <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <GraduationCap size={15} /> Program Enrollment
                </div>
                <div className="text-base font-bold text-blue-950 dark:text-blue-100 truncate">
                  {student.courseName}
                </div>
                <div className="text-xs text-muted-foreground">
                  Batch: {student.batchYear} (Section {student.batchSection})
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-100 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20">
              <CardContent className="p-4 space-y-1">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck size={15} /> Document Status
                </div>
                <div className="text-2xl font-bold text-emerald-950 dark:text-emerald-100">
                  {student.documents?.filter((d: any) => d.verificationStatus === "verified").length || 0} / {student.documents?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  Verified / Attached Documents
                </div>
              </CardContent>
            </Card>

            <Card className="border-cyan-100 dark:border-cyan-900 bg-cyan-50/40 dark:bg-cyan-950/20">
              <CardContent className="p-4 space-y-1">
                <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                  <Tag size={15} /> Seat Booking Advance
                </div>
                <div className="text-2xl font-bold text-cyan-950 dark:text-cyan-100">
                  {Number(student.seatBookingAmount || 0) > 0 ? `₹${Number(student.seatBookingAmount).toLocaleString()}` : "No Advance"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Status: <span className="capitalize font-medium text-foreground">{student.seatBookingStatus || "None"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Student Personal & Identity Information */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User size={18} className="text-teal-600" />
                  Personal & Identification Details
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  onClick={() => setEditModalOpen(true)}
                >
                  <Pencil size={13} /> Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-sm divide-y">
                <div className="flex justify-between items-center pt-1">
                  <span className="text-muted-foreground">Full Student Name:</span>
                  <span className="font-semibold text-foreground">{student.name}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Enrollment Number:</span>
                  <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">{student.enrollmentNo}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Admission Application No:</span>
                  <span className="font-mono text-foreground">{student.applicationNo || "Direct Admission"}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Aadhar Card Number:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {student.aadharNo ? student.aadharNo.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3") : "Not Provided"}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Email Address:</span>
                  <span className="font-medium text-foreground">{student.email}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Primary Contact Phone:</span>
                  <span className="font-semibold text-foreground">{student.phone}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Gender:</span>
                  <span className="font-medium text-foreground">{student.gender || "Female"}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Date of Birth:</span>
                  <span className="font-medium text-foreground">{student.dob || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Admission Date:</span>
                  <span className="font-medium text-foreground">{student.admissionDate || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-muted-foreground">Quota Category:</span>
                  <span className="capitalize font-semibold text-teal-700 dark:text-teal-300">{student.quotaCategory || "General"}</span>
                </div>
                {(student.referrerId || student.referrerName || student.referralAmount) && (
                  <div className="flex justify-between items-center pt-2.5 mt-1 border-t border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 p-2 rounded">
                    <div>
                      <span className="text-amber-800 dark:text-amber-300 font-semibold block text-xs">
                        Referred By:
                      </span>
                      <span className="text-xs text-foreground font-medium">
                        {student.referrerName || `Referrer #${student.referrerId}`}
                        {student.referrerPhone ? ` (${student.referrerPhone})` : ""}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">Referral Amount</span>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-xs">
                        {student.referralAmount ? `₹${Number(student.referralAmount).toLocaleString()}` : "—"}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Parent & Family Background */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users size={18} className="text-teal-600" />
                  Parents & Guardian Details
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2.5 text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                  onClick={() => setEditModalOpen(true)}
                >
                  <Pencil size={13} /> Edit
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {/* Father Info */}
                <div className={cn(
                  "p-3 border rounded-lg space-y-2",
                  student.fatherDeceased ? "bg-slate-100/50 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800" : "bg-muted/20"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={13} /> Father's Profile
                    </div>
                    {student.fatherDeceased && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Deceased
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Name: </span>
                      <strong className="text-foreground">{student.fatherName || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contact: </span>
                      <strong className={cn(student.fatherDeceased ? "text-muted-foreground italic font-normal" : "text-foreground font-mono")}>
                        {student.fatherDeceased ? "N/A (Deceased)" : (student.fatherPhone || "N/A")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Aadhar: </span>
                      <strong className="font-mono text-foreground">
                        {student.fatherDeceased ? "N/A (Deceased)" : (student.fatherAadharNo || "N/A")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Occupation: </span>
                      <strong className="text-foreground">
                        {student.fatherDeceased ? "N/A (Deceased)" : (student.fatherOccupation || "N/A")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Organization: </span>
                      <strong className="text-foreground">
                        {student.fatherDeceased ? "N/A (Deceased)" : (student.fatherOrganization || "N/A")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Annual Income: </span>
                      <strong className="text-foreground">
                        {student.fatherDeceased ? "N/A" : (student.fatherAnnualIncome ? `₹${Number(student.fatherAnnualIncome).toLocaleString()}` : "N/A")}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Mother Info */}
                <div className={cn(
                  "p-3 border rounded-lg space-y-2",
                  student.motherDeceased ? "bg-slate-100/50 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800" : "bg-muted/20"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-xs text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                      <User size={13} /> Mother's Profile
                    </div>
                    {student.motherDeceased && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Deceased
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Name: </span>
                      <strong className="text-foreground">{student.motherName || "N/A"}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contact: </span>
                      <strong className={cn(student.motherDeceased ? "text-muted-foreground italic font-normal" : "text-foreground font-mono")}>
                        {student.motherDeceased ? "N/A (Deceased)" : (student.motherPhone || "N/A")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Aadhar: </span>
                      <strong className="font-mono text-foreground">
                        {student.motherDeceased ? "N/A (Deceased)" : (student.motherAadharNo || "N/A")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Occupation: </span>
                      <strong className="text-foreground">
                        {student.motherDeceased ? "N/A (Deceased)" : (student.motherOccupation || "N/A")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Organization: </span>
                      <strong className="text-foreground">
                        {student.motherDeceased ? "N/A (Deceased)" : (student.motherOrganization || "N/A")}
                      </strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Annual Income: </span>
                      <strong className="text-foreground">
                        {student.motherDeceased ? "N/A" : (student.motherAnnualIncome ? `₹${Number(student.motherAnnualIncome).toLocaleString()}` : "N/A")}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Guardian Info */}
                {(student.hasGuardian || student.guardianName) && (
                  <div className="p-3 bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/60 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                        <User size={13} /> Guardian / Local Guardian's Profile
                      </div>
                      {student.guardianRelation && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          {student.guardianRelation}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Name: </span>
                        <strong className="text-foreground">{student.guardianName || "N/A"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Relationship: </span>
                        <strong className="text-foreground">{student.guardianRelation || "Guardian"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Contact: </span>
                        <strong className="font-mono text-teal-700 dark:text-teal-300 font-semibold">{student.guardianPhone || "N/A"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Aadhar: </span>
                        <strong className="font-mono text-foreground">{student.guardianAadharNo || "N/A"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Occupation: </span>
                        <strong className="text-foreground">{student.guardianOccupation || "N/A"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Organization: </span>
                        <strong className="text-foreground">{student.guardianOrganization || "N/A"}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Annual Income: </span>
                        <strong className="text-foreground">
                          {student.guardianAnnualIncome ? `₹${Number(student.guardianAnnualIncome).toLocaleString()}` : "N/A"}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 3. Addresses Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <MapPin size={18} className="text-teal-600" />
                Residential & Permanent Addresses
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                onClick={() => setEditModalOpen(true)}
              >
                <Pencil size={13} /> Edit
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-4 rounded-lg border bg-muted/10 space-y-2">
                  <div className="font-semibold text-xs text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={14} /> Present / Residential Address
                  </div>
                  <p className="text-foreground font-medium">
                    {student.presentAddress || student.address || "Not specified"}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pt-1 border-t">
                    <div>District: <strong className="text-foreground">{student.presentDistrict || "N/A"}</strong></div>
                    <div>State: <strong className="text-foreground">{student.presentState || "N/A"}</strong></div>
                    <div>Pincode: <strong className="text-foreground font-mono">{student.presentPincode || "N/A"}</strong></div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-muted/10 space-y-2">
                  <div className="font-semibold text-xs text-teal-700 dark:text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={14} /> Permanent Address
                  </div>
                  <p className="text-foreground font-medium">
                    {student.permanentAddress || "Same as present address"}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pt-1 border-t">
                    <div>District: <strong className="text-foreground">{student.permanentDistrict || "N/A"}</strong></div>
                    <div>State: <strong className="text-foreground">{student.permanentState || "N/A"}</strong></div>
                    <div>Pincode: <strong className="text-foreground font-mono">{student.permanentPincode || "N/A"}</strong></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Previous Academic Qualifications (10th, 11th, 12th) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BookOpen size={18} className="text-teal-600" />
                  Previous Academic History & Qualifying Examinations
                </CardTitle>
                <CardDescription>Academic track record entered during admission</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                onClick={() => setEditModalOpen(true)}
              >
                <Pencil size={13} /> Edit
              </Button>
            </CardHeader>
            <CardContent>
              {parsedAcademicHistory.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No previous qualification records logged.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
                        <th className="p-3">Examination / Level</th>
                        <th className="p-3">School / College Institute</th>
                        <th className="p-3">Board / University</th>
                        <th className="p-3">Passing Year</th>
                        <th className="p-3">Score / Percentage</th>
                        <th className="p-3">Subjects Studied</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parsedAcademicHistory.map((item, index) => (
                        <tr key={index} className="hover:bg-muted/30">
                          <td className="p-3 font-semibold text-teal-700 dark:text-teal-400">
                            {item.exam || `Standard ${index + 1}`}
                          </td>
                          <td className="p-3 font-medium text-foreground">
                            {item.instituteName || "N/A"}
                            {item.instituteAddress && (
                              <div className="text-xs text-muted-foreground">{item.instituteAddress}</div>
                            )}
                          </td>
                          <td className="p-3 text-foreground">{item.board || "N/A"}</td>
                          <td className="p-3 font-mono">{item.year || "N/A"}</td>
                          <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                            {item.percentage ? `${item.percentage}%` : "N/A"}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">
                            {item.subjects || "N/A"}
                            {item.subjectScores && (
                              <div className="text-teal-600 dark:text-teal-400 font-medium">{item.subjectScores}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Admission Notes / Remarks (if any) */}
          {(student.applicantNotes || student.notes) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <FileText size={16} /> Admission Remarks & Special Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground bg-muted/20 p-3 rounded-lg border">
                  {student.applicantNotes || student.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Document Verification */}
      {activeTab === "docs" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Student Document Repository</CardTitle>
              <CardDescription>Upload and verify certificates, ID proof, and medical fitness records</CardDescription>
            </div>
            <Dialog open={docModalOpen} onOpenChange={setDocModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-teal-600 text-white flex items-center gap-1">
                  <Upload size={14} /> Attach Document
                </Button>
              </DialogTrigger>
              <DialogContent
                className="sm:max-w-[400px]"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>Attach Document</DialogTitle>
                </DialogHeader>
                <form onSubmit={docForm.handleSubmit((data) => addDocMutation.mutate(data))} className="space-y-3 py-2">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Document Type</label>
                    <Controller
                      control={docForm.control}
                      name="documentType"
                      render={({ field }) => (
                        <select className="w-full border rounded-md p-2 bg-background text-sm" {...field}>
                          <option value="certificate">Secondary / Higher Secondary Certificate</option>
                          <option value="medical_fitness">Medical Fitness Certificate</option>
                          <option value="id_proof">Aadhar / National ID</option>
                          <option value="mark_sheet">Mark Sheet (10th / 12th)</option>
                          <option value="transfer_certificate">Transfer Certificate (TC)</option>
                          <option value="conduct_certificate">Conduct / Character Certificate</option>
                        </select>
                      )}
                    />
                  </div>
                  <Controller
                    control={docForm.control}
                    name="title"
                    render={({ field, fieldState }) => (
                      <Field label="Document Title *" placeholder="e.g. 10+2 Mark Sheet" {...field} error={fieldState.error?.message} />
                    )}
                  />
                  <Controller
                    control={docForm.control}
                    name="fileUrl"
                    render={({ field, fieldState }) => (
                      <Field label="File Reference / URL *" placeholder="https://..." {...field} error={fieldState.error?.message} />
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDocModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-teal-600 text-white" disabled={addDocMutation.isPending}>
                      Save Document
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {student.documents?.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No documents attached yet.</div>
            ) : (
              <div className="divide-y border rounded-md">
                {student.documents?.map((doc: any) => (
                  <div key={doc.id} className="p-3 flex items-center justify-between hover:bg-muted/30">
                    <div>
                      <div className="font-semibold text-sm">{doc.title}</div>
                      <div className="text-xs text-muted-foreground uppercase">{doc.documentType?.replace("_", " ")}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {doc.verificationStatus === "verified" && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      )}
                      {doc.verificationStatus === "rejected" && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded-full">
                          <XCircle size={12} /> Rejected
                        </span>
                      )}
                      {doc.verificationStatus === "pending" && (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-full">
                          Pending Verification
                        </span>
                      )}

                      {doc.verificationStatus !== "verified" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                          onClick={() => verifyDocMutation.mutate({ docId: doc.id, verificationStatus: "verified" })}
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Fee Ledger & Advance */}
      {activeTab === "fees" && (
        <div className="space-y-4">
          {Number(student.seatBookingAmount || 0) > 0 && (
            <div className="p-4 rounded-xl border bg-cyan-50/50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-cyan-950 dark:text-cyan-200 text-sm flex items-center gap-1.5">
                  <Tag size={15} className="text-cyan-600" />
                  Pre-Admission Seat Reservation Advance
                </div>
                <div className="text-cyan-800 dark:text-cyan-300">
                  Advance Paid: <strong className="font-mono text-sm">₹{Number(student.seatBookingAmount).toLocaleString()}</strong>
                  {student.seatBookingReceiptNo && ` • Receipt: ${student.seatBookingReceiptNo}`}
                  {student.seatBookingDate && ` • Date: ${student.seatBookingDate}`}
                  {student.seatBookingPaymentMode && ` • Mode: ${student.seatBookingPaymentMode.toUpperCase()}`}
                </div>
              </div>
              <div>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-semibold uppercase border inline-flex items-center gap-1",
                  student.seatBookingStatus === "adjusted"
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                    : "bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800"
                )}>
                  {student.seatBookingStatus === "adjusted" ? "● Adjusted in Admission" : "● Unadjusted Balance"}
                </span>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Student Fee Ledger & Transactions</CardTitle>
              <CardDescription>Payment receipts logged for this student</CardDescription>
            </CardHeader>
            <CardContent>
              {student.feeTransactions?.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">No fee payment receipts recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                        <th className="p-3">Receipt No</th>
                        <th className="p-3">Invoice No</th>
                        <th className="p-3">Payment Date</th>
                        <th className="p-3">Payment Mode</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {student.feeTransactions?.map((tx: any) => (
                        <tr key={tx.id}>
                          <td className="p-3 font-semibold text-teal-600">{tx.receiptNumber}</td>
                          <td className="p-3 text-xs">{tx.invoiceNo}</td>
                          <td className="p-3">{tx.paymentDate}</td>
                          <td className="p-3 uppercase text-xs">{tx.paymentMode}</td>
                          <td className="p-3 font-bold text-emerald-600">
                            {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(toNum(tx.amount))}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {tx.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Attendance History */}
      {activeTab === "attendance" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Attendance History & Eligibility Status</CardTitle>
              <CardDescription>Overall session attendance percentage check</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-teal-600">
                {student.attendanceStats?.attendancePercent}%
              </div>
              <div className="text-xs text-muted-foreground">
                {student.attendanceStats?.attendancePercent >= 75 ? (
                  <span className="text-emerald-600 font-semibold flex items-center justify-end gap-1">
                    <ShieldCheck size={14} /> Eligible for Examinations
                  </span>
                ) : (
                  <span className="text-rose-600 font-semibold">Deficient (&lt;75%)</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {student.attendanceRecords?.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No attendance records logged for this student yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <th className="p-3">Session Date</th>
                      <th className="p-3">Subject / Session</th>
                      <th className="p-3">Session Type</th>
                      <th className="p-3">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {student.attendanceRecords?.map((rec: any) => (
                      <tr key={rec.id}>
                        <td className="p-3 font-medium">{rec.sessionDate}</td>
                        <td className="p-3">{rec.subjectName || "General Session"}</td>
                        <td className="p-3 uppercase text-xs">{rec.sessionType}</td>
                        <td className="p-3">
                          {rec.status === "present" && <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded text-xs font-semibold">Present</span>}
                          {rec.status === "absent" && <span className="text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded text-xs font-semibold">Absent</span>}
                          {rec.status === "late" && <span className="text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded text-xs font-semibold">Late</span>}
                          {rec.status === "leave" && <span className="text-blue-600 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded text-xs font-semibold">Leave</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Student Profile Modal */}
      <EditStudentModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        student={student}
      />
    </div>
  );
}
