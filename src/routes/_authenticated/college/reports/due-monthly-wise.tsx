import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Download,
  Share2,
  MessageCircle,
  RefreshCw,
  Percent,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Users,
  ExternalLink,
  Layers,
  Clock,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/ui/input";
import { CollegeAccessGuard } from "@/components/CollegeAccessGuard";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/college/reports/due-monthly-wise")({
  component: () => (
    <CollegeAccessGuard>
      <DueReportPeriodicPage />
    </CollegeAccessGuard>
  ),
});

interface StudentDrillDown {
  studentId: number;
  enrollmentNo: string;
  name: string;
  phone?: string;
  quotaCategory: string;
  expectedTarget: number;
  collectedAmount: number;
  balanceDue: number;
  status: "paid" | "partial" | "unpaid";
}

interface BatchDrillDown {
  batchId: number;
  batchName: string;
  courseName: string;
  studentCount: number;
  expectedTarget: number;
  collectedAmount: number;
  pendingDues: number;
  collectionEfficiency: number;
  students: StudentDrillDown[];
}

interface PeriodBreakdown {
  periodKey: string;
  periodName: string;
  expectedTarget: number;
  collectedAmount: number;
  pendingDues: number;
  collectionEfficiency: number;
  transactionsCount: number;
  batches: BatchDrillDown[];
}

interface ReportData {
  academicYear: string;
  frequency: "monthly" | "quarterly" | "annually";
  summary: {
    totalEnrolledStudents: number;
    totalDemanded: number;
    totalCollected: number;
    totalPendingDues: number;
    overallEfficiency: number;
  };
  periods: PeriodBreakdown[];
}

export default function DueReportPeriodicPage() {
  const [academicYear, setAcademicYear] = React.useState("2025-2026");
  const [frequency, setFrequency] = React.useState<"monthly" | "quarterly" | "annually">("monthly");
  const [courseFilter, setCourseFilter] = React.useState("all");

  // Expanded rows state tracking
  const [expandedPeriods, setExpandedPeriods] = React.useState<Record<string, boolean>>({});
  const [expandedBatches, setExpandedBatches] = React.useState<Record<string, boolean>>({});

  // WhatsApp Modal
  const [whatsAppModalOpen, setWhatsAppModalOpen] = React.useState(false);
  const [selectedStudentForWA, setSelectedStudentForWA] = React.useState<{
    student: StudentDrillDown;
    periodName: string;
  } | null>(null);
  const [whatsAppPhone, setWhatsAppPhone] = React.useState("");

  // Fetch Courses for filter
  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["nursing", "courses"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/courses");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data, isLoading, isFetching, refetch } = useQuery<ReportData>({
    queryKey: ["nursing", "reports", "due-periodic", academicYear, frequency, courseFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("academicYear", academicYear);
      params.set("frequency", frequency);
      if (courseFilter !== "all") params.set("courseId", courseFilter);

      const res = await fetch(`/api/nursing/reports/due-monthly-wise?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch periodic due report");
      return res.json();
    },
  });

  const summary = data?.summary || {
    totalEnrolledStudents: 0,
    totalDemanded: 0,
    totalCollected: 0,
    totalPendingDues: 0,
    overallEfficiency: 0,
  };

  const periods = data?.periods || [];

  const togglePeriod = (pKey: string) => {
    setExpandedPeriods((prev) => ({ ...prev, [pKey]: !prev[pKey] }));
  };

  const toggleBatch = (bKey: string) => {
    setExpandedBatches((prev) => ({ ...prev, [bKey]: !prev[bKey] }));
  };

  // Generate PDF Document
  const generatePDFDoc = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ACME COLLEGE OF NURSING", 14, 16);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Periodic Fee Dues Report - ${frequency.toUpperCase()} (${academicYear})`, 14, 24);

    doc.setFontSize(9);
    doc.text(`Generated Date: ${new Date().toLocaleString()}`, 14, 30);

    // Summary Box
    doc.setFillColor(245, 247, 250);
    doc.rect(14, 34, 182, 22, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Enrolled Students: ${summary.totalEnrolledStudents}`, 18, 42);
    doc.text(`Annual Target: Rs. ${summary.totalDemanded.toLocaleString()}`, 18, 50);
    doc.text(`Total Collected: Rs. ${summary.totalCollected.toLocaleString()}`, 110, 42);
    doc.text(`Overall Efficiency: ${summary.overallEfficiency}% | Pending Dues: Rs. ${summary.totalPendingDues.toLocaleString()}`, 110, 50);

    // Flat rows for PDF export (Period -> Batch summary)
    const tableBody: any[] = [];
    periods.forEach((p) => {
      tableBody.push([
        { content: p.periodName, colSpan: 6, styles: { fillColor: [240, 245, 245], fontStyle: "bold" } },
      ]);
      p.batches.forEach((b) => {
        tableBody.push([
          `  ${b.batchName} (${b.courseName})`,
          b.studentCount.toString(),
          b.expectedTarget.toLocaleString(),
          b.collectedAmount.toLocaleString(),
          b.pendingDues.toLocaleString(),
          `${b.collectionEfficiency}%`,
        ]);
      });
    });

    autoTable(doc, {
      startY: 60,
      head: [["Period / Batch Breakdown", "Students", "Target (Rs.)", "Collected (Rs.)", "Pending Dues (Rs.)", "Efficiency"]],
      body: tableBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }, // Teal
    });

    return doc;
  };

  const handleDownloadPDF = () => {
    try {
      const doc = generatePDFDoc();
      doc.save(`ACON-Periodic-Due-Report-${frequency}-${academicYear}.pdf`);
      toast.success("Periodic due report downloaded successfully!");
    } catch (e: any) {
      toast.error("Failed to generate PDF: " + e.message);
    }
  };

  const handleOpenWhatsAppModal = (st?: StudentDrillDown, periodName?: string) => {
    if (st && periodName) {
      setSelectedStudentForWA({ student: st, periodName });
      setWhatsAppPhone(st.phone || "");
    } else {
      setSelectedStudentForWA(null);
      setWhatsAppPhone("");
    }
    setWhatsAppModalOpen(true);
  };

  const handleShareWhatsApp = async () => {
    let cleanPhone = whatsAppPhone.replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("Please enter a valid recipient WhatsApp number.");
      return;
    }
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    try {
      const doc = generatePDFDoc();
      const filename = `ACON-Periodic-Due-Report-${frequency}-${academicYear}.pdf`;
      const pdfBlob = doc.output("blob");
      const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

      let msgText = "";
      if (selectedStudentForWA) {
        const st = selectedStudentForWA.student;
        msgText = `*ACME COLLEGE OF NURSING*\n*Fee Due Statement (${selectedStudentForWA.periodName})*\nStudent: ${st.name} (${st.enrollmentNo})\nPeriod Target: ₹${st.expectedTarget.toLocaleString()}\nPeriod Paid: ₹${st.collectedAmount.toLocaleString()}\n*Net Period Balance Due: ₹${st.balanceDue.toLocaleString()}*\n\nOfficial PDF Report Attached.`;
      } else {
        msgText = `*ACME COLLEGE OF NURSING*\n*Periodic Fee Due & Collection Forecast (${frequency.toUpperCase()} - ${academicYear})*\nEnrolled Students: ${summary.totalEnrolledStudents}\nAnnual Target: ₹${summary.totalDemanded.toLocaleString()}\nTotal Collected: ₹${summary.totalCollected.toLocaleString()}\nOutstanding Pending Dues: ₹${summary.totalPendingDues.toLocaleString()}\nOverall Efficiency: ${summary.overallEfficiency}%\n\nDetailed PDF Report Attached.`;
      }

      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: filename,
          text: msgText,
        });
        toast.success("Due report PDF shared via WhatsApp!");
        setWhatsAppModalOpen(false);
        return;
      }

      doc.save(filename);
      toast.info("Report PDF downloaded! Opening WhatsApp chat...");
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgText)}`;
      window.open(url, "_blank");
      setWhatsAppModalOpen(false);
    } catch (err: any) {
      toast.error("Error sharing report via WhatsApp: " + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              Due Report (Periodic)
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              ACON Reports
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Periodic fee collection targets with 3-tier drill-down: Period &rarr; Batch &rarr; Student.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="gap-1.5 text-xs h-9 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950"
          >
            <Download size={14} />
            Export PDF
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenWhatsAppModal()}
            className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <MessageCircle size={14} />
            WhatsApp PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Annual Target */}
        <Card className="border-teal-200 dark:border-teal-900 bg-gradient-to-br from-card to-teal-50/30 dark:to-teal-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Annual Fee Target</p>
              <h3 className="text-2xl font-bold text-teal-700 dark:text-teal-300 mt-1">
                ₹{summary.totalDemanded.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {summary.totalEnrolledStudents} enrolled students
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-700 dark:text-teal-300 shrink-0">
              <DollarSign size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Collected YTD */}
        <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-card to-emerald-50/30 dark:to-emerald-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Collected YTD</p>
              <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                ₹{summary.totalCollected.toLocaleString()}
              </h3>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5 font-medium">
                Fee collections received
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
              <CheckCircle2 size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Total Pending Dues */}
        <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-br from-card to-amber-50/30 dark:to-amber-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Outstanding Pending Dues</p>
              <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                ₹{summary.totalPendingDues.toLocaleString()}
              </h3>
              <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5 font-medium">
                Remaining collection target
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
              <AlertTriangle size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Collection Efficiency */}
        <Card className="border-purple-200 dark:border-purple-900 bg-gradient-to-br from-card to-purple-50/30 dark:to-purple-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Overall Collection Efficiency</p>
              <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                {summary.overallEfficiency}%
              </h3>
              <p className="text-[11px] text-purple-800 dark:text-purple-400 mt-0.5 font-medium">
                Target achievement rate
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0">
              <Percent size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Frequency Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Frequency selector pill tabs */}
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Report Period Frequency
              </label>
              <div className="grid grid-cols-3 gap-1 bg-muted/60 p-1 rounded-lg">
                <button
                  onClick={() => setFrequency("monthly")}
                  className={cn(
                    "py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                    frequency === "monthly"
                      ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setFrequency("quarterly")}
                  className={cn(
                    "py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                    frequency === "quarterly"
                      ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Quarterly
                </button>
                <button
                  onClick={() => setFrequency("annually")}
                  className={cn(
                    "py-1 text-xs font-semibold rounded-md transition-all cursor-pointer",
                    frequency === "annually"
                      ? "bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Annually
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Academic Year</label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select Academic Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-2026" className="text-xs">2025 - 2026</SelectItem>
                  <SelectItem value="2026-2027" className="text-xs">2026 - 2027</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Course Filter</label>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Courses</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drill-Down Matrix Table */}
      <Card>
        <CardHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Layers className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                Periodic Breakdown & Drill-Down ({frequency.toUpperCase()} - {academicYear})
              </CardTitle>
              <CardDescription className="text-xs">
                Click any Period row to drill down into Batches, then click any Batch to view Student Dues.
              </CardDescription>
            </div>
            {isFetching && (
              <span className="text-xs text-teal-600 dark:text-teal-400 font-medium animate-pulse">
                Refreshing...
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground border-b font-semibold">
                  <th className="p-3">Period / Batch / Student</th>
                  <th className="p-3 text-right">Expected Target</th>
                  <th className="p-3 text-right">Collected Amount</th>
                  <th className="p-3 text-right">Pending Dues</th>
                  <th className="p-3 text-center">Collection Efficiency</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Loading periodic drill-down data...
                    </td>
                  </tr>
                ) : periods.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No data available for the selected parameters.
                    </td>
                  </tr>
                ) : (
                  periods.map((p) => {
                    const isPeriodExpanded = !!expandedPeriods[p.periodKey];

                    return (
                      <React.Fragment key={p.periodKey}>
                        {/* LEVEL 1: PERIOD ROW */}
                        <tr
                          onClick={() => togglePeriod(p.periodKey)}
                          className={cn(
                            "cursor-pointer font-semibold transition-colors hover:bg-teal-50/50 dark:hover:bg-teal-950/20",
                            isPeriodExpanded ? "bg-teal-50/70 dark:bg-teal-950/30" : "bg-card"
                          )}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {isPeriodExpanded ? (
                                <ChevronDown size={16} className="text-teal-600 shrink-0" />
                              ) : (
                                <ChevronRight size={16} className="text-muted-foreground shrink-0" />
                              )}
                              <span className="text-sm font-bold text-foreground">{p.periodName}</span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border text-slate-600 dark:text-slate-400">
                                {p.batches.length} Batches
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-medium text-foreground">
                            ₹{p.expectedTarget.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                            ₹{p.collectedAmount.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-bold text-amber-700 dark:text-amber-400">
                            ₹{p.pendingDues.toLocaleString()}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-slate-100 dark:bg-slate-900 rounded-full h-2 overflow-hidden border">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    p.collectionEfficiency >= 80 ? "bg-emerald-500" : p.collectionEfficiency >= 40 ? "bg-amber-500" : "bg-rose-500"
                                  )}
                                  style={{ width: `${Math.min(100, p.collectionEfficiency)}%` }}
                                />
                              </div>
                              <span className="font-bold text-[11px] font-mono">{p.collectionEfficiency}%</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-[11px] gap-1 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900"
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePeriod(p.periodKey);
                              }}
                            >
                              {isPeriodExpanded ? "Hide Batches" : "Drill Down"}
                            </Button>
                          </td>
                        </tr>

                        {/* LEVEL 2: BATCH ROWS */}
                        {isPeriodExpanded &&
                          p.batches.map((b) => {
                            const bCompositeKey = `${p.periodKey}-B${b.batchId}`;
                            const isBatchExpanded = !!expandedBatches[bCompositeKey];

                            return (
                              <React.Fragment key={bCompositeKey}>
                                <tr
                                  onClick={() => toggleBatch(bCompositeKey)}
                                  className={cn(
                                    "cursor-pointer transition-colors bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/80 border-l-4 border-l-teal-500",
                                    isBatchExpanded && "bg-slate-100/80 dark:bg-slate-900/90"
                                  )}
                                >
                                  <td className="p-3 pl-8">
                                    <div className="flex items-center gap-2">
                                      {isBatchExpanded ? (
                                        <ChevronDown size={14} className="text-teal-600 shrink-0" />
                                      ) : (
                                        <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                                      )}
                                      <Users size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
                                      <div>
                                        <span className="font-semibold text-foreground">{b.batchName}</span>
                                        <span className="text-[10px] text-muted-foreground ml-2 font-normal">
                                          ({b.courseName}) &bull; {b.studentCount} Students
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3 text-right font-medium text-foreground">
                                    ₹{b.expectedTarget.toLocaleString()}
                                  </td>
                                  <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                    ₹{b.collectedAmount.toLocaleString()}
                                  </td>
                                  <td className="p-3 text-right font-bold text-amber-700 dark:text-amber-400">
                                    ₹{b.pendingDues.toLocaleString()}
                                  </td>
                                  <td className="p-3 text-center font-mono font-semibold">
                                    {b.collectionEfficiency}%
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className="text-[11px] text-teal-700 dark:text-teal-300 font-semibold hover:underline">
                                      {isBatchExpanded ? "Hide Students" : "View Students"}
                                    </span>
                                  </td>
                                </tr>

                                {/* LEVEL 3: STUDENT ROWS */}
                                {isBatchExpanded &&
                                  b.students.map((st) => (
                                    <tr
                                      key={`${bCompositeKey}-ST${st.studentId}`}
                                      className="bg-white dark:bg-slate-950 hover:bg-muted/30 transition-colors border-l-4 border-l-emerald-400"
                                    >
                                      <td className="p-2.5 pl-14">
                                        <div className="flex items-center gap-2">
                                          <UserCheck size={13} className="text-slate-400 shrink-0" />
                                          <div>
                                            <span className="font-semibold text-foreground">{st.name}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono ml-2">
                                              ({st.enrollmentNo})
                                            </span>
                                            {st.phone && (
                                              <span className="text-[10px] text-slate-500 font-mono ml-2">
                                                Ph: {st.phone}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="p-2.5 text-right font-medium text-foreground">
                                        ₹{st.expectedTarget.toLocaleString()}
                                      </td>
                                      <td className="p-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                        ₹{st.collectedAmount.toLocaleString()}
                                      </td>
                                      <td className="p-2.5 text-right font-bold text-amber-700 dark:text-amber-400">
                                        ₹{st.balanceDue.toLocaleString()}
                                      </td>
                                      <td className="p-2.5 text-center">
                                        {st.status === "paid" && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                                            <CheckCircle2 size={10} /> Paid
                                          </span>
                                        )}
                                        {st.status === "partial" && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                                            <Clock size={10} /> Partial
                                          </span>
                                        )}
                                        {st.status === "unpaid" && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300">
                                            <AlertTriangle size={10} /> Unpaid
                                          </span>
                                        )}
                                      </td>
                                      <td className="p-2.5 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          <Link
                                            to={`/college/student/${st.studentId}` as any}
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-teal-700 hover:text-teal-900 dark:text-teal-400 rounded border border-teal-200 dark:border-teal-800"
                                            title="View Ledger"
                                          >
                                            Ledger <ExternalLink size={9} />
                                          </Link>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                            title="Send WhatsApp Statement"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenWhatsAppModal(st, p.periodName);
                                            }}
                                          >
                                            <MessageCircle size={13} />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                              </React.Fragment>
                            );
                          })}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Modal */}
      <Dialog open={whatsAppModalOpen} onOpenChange={setWhatsAppModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <MessageCircle size={20} />
              Share Periodic Due Report via WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedStudentForWA
                ? `Send due statement PDF for ${selectedStudentForWA.student.name} (${selectedStudentForWA.periodName}).`
                : `Send ${frequency.toUpperCase()} periodic due report PDF (${academicYear}).`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Recipient WhatsApp Mobile Number</label>
              <Input
                placeholder="e.g. 9876543210"
                value={whatsAppPhone}
                onChange={(e) => setWhatsAppPhone(e.target.value)}
                className="text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                10-digit mobile number. Country code +91 will be added automatically.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setWhatsAppModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleShareWhatsApp} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              <Share2 size={14} />
              Send PDF via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
