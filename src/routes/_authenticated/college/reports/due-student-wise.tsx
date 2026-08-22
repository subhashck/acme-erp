import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Share2,
  MessageCircle,
  RefreshCw,
  ExternalLink,
  BookOpen,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
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
import { CollegeAccessGuard } from "@/components/CollegeAccessGuard";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/college/reports/due-student-wise")({
  component: () => (
    <CollegeAccessGuard>
      <DueReportStudentWisePage />
    </CollegeAccessGuard>
  ),
});

interface StudentDueRow {
  id: number;
  enrollmentNo: string;
  name: string;
  phone?: string;
  fatherName?: string;
  courseId: number;
  courseName: string;
  batchId: number;
  batchName: string;
  academicYear: string;
  quotaCategory: string;
  demandedFee: number;
  totalPaid: number;
  advanceAmt: number;
  balanceDue: number;
  status: "paid" | "partial" | "unpaid";
  lastPaymentDate?: string | null;
}

interface ReportData {
  students: StudentDueRow[];
  summary: {
    totalStudents: number;
    totalDemanded: number;
    totalCollected: number;
    totalOutstandingDues: number;
    paidCount: number;
    partialCount: number;
    unpaidCount: number;
  };
}

export default function DueReportStudentWisePage() {
  const [courseFilter, setCourseFilter] = React.useState("all");
  const [academicYearFilter, setAcademicYearFilter] = React.useState("all");
  const [quotaFilter, setQuotaFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // WhatsApp Modal
  const [whatsAppModalOpen, setWhatsAppModalOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<StudentDueRow | null>(null);
  const [whatsAppPhone, setWhatsAppPhone] = React.useState("");

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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
    queryKey: ["nursing", "reports", "due-student-wise", courseFilter, academicYearFilter, quotaFilter, statusFilter, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (courseFilter !== "all") params.set("courseId", courseFilter);
      if (academicYearFilter !== "all") params.set("academicYear", academicYearFilter);
      if (quotaFilter !== "all") params.set("quotaCategory", quotaFilter);
      if (statusFilter !== "all") params.set("dueStatus", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/nursing/reports/due-student-wise?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch student dues report");
      return res.json();
    },
  });

  const summary = data?.summary || {
    totalStudents: 0,
    totalDemanded: 0,
    totalCollected: 0,
    totalOutstandingDues: 0,
    paidCount: 0,
    partialCount: 0,
    unpaidCount: 0,
  };

  const students = data?.students || [];

  // Generate PDF Document
  const generatePDFDoc = (targetStudents = students) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ACME COLLEGE OF NURSING", 14, 16);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Student Wise Fee Dues Report", 14, 24);

    doc.setFontSize(9);
    doc.text(`Generated Date: ${new Date().toLocaleString()}`, 14, 30);

    // Summary Box
    doc.setFillColor(245, 247, 250);
    doc.rect(14, 34, 182, 22, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Students: ${summary.totalStudents}`, 18, 42);
    doc.text(`Demanded Fee: Rs. ${summary.totalDemanded.toLocaleString()}`, 18, 50);
    doc.text(`Total Outstanding Dues: Rs. ${summary.totalOutstandingDues.toLocaleString()}`, 110, 42);
    doc.text(`Total Collected: Rs. ${summary.totalCollected.toLocaleString()}`, 110, 50);

    // Table
    autoTable(doc, {
      startY: 60,
      head: [["Enrollment #", "Student Name", "Course & Batch", "Quota", "Demanded (Rs.)", "Paid (Rs.)", "Due (Rs.)", "Status"]],
      body: targetStudents.map((s) => [
        s.enrollmentNo,
        s.name,
        `${s.courseName} (${s.batchName})`,
        s.quotaCategory.toUpperCase(),
        s.demandedFee.toLocaleString(),
        s.totalPaid.toLocaleString(),
        s.balanceDue.toLocaleString(),
        s.status.toUpperCase(),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }, // Teal
    });

    return doc;
  };

  const handleDownloadPDF = () => {
    try {
      const doc = generatePDFDoc();
      doc.save(`ACON-Student-Due-Report-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Student due report downloaded successfully!");
    } catch (e: any) {
      toast.error("Failed to generate PDF: " + e.message);
    }
  };

  const handleOpenWhatsAppModal = (st?: StudentDueRow) => {
    if (st) {
      setSelectedStudent(st);
      setWhatsAppPhone(st.phone || "");
    } else {
      setSelectedStudent(null);
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
      let doc: jsPDF;
      let filename: string;
      let msgText: string;

      if (selectedStudent) {
        doc = generatePDFDoc([selectedStudent]);
        filename = `Due-Statement-${selectedStudent.enrollmentNo}.pdf`;
        msgText = `*ACME COLLEGE OF NURSING*\n*Student Fee Due Statement*\nStudent: ${selectedStudent.name} (${selectedStudent.enrollmentNo})\nCourse: ${selectedStudent.courseName}\nTotal Fee Demanded: ₹${selectedStudent.demandedFee.toLocaleString()}\nTotal Fee Paid: ₹${selectedStudent.totalPaid.toLocaleString()}\n*Net Outstanding Balance Due: ₹${selectedStudent.balanceDue.toLocaleString()}*\n\nOfficial PDF Statement attached.`;
      } else {
        doc = generatePDFDoc();
        filename = `ACON-Student-Due-Report.pdf`;
        msgText = `*ACME COLLEGE OF NURSING*\n*Student Wise Due Report Summary*\nTotal Enrolled Students: ${summary.totalStudents}\nTotal Demanded Fee: ₹${summary.totalDemanded.toLocaleString()}\nTotal Collected: ₹${summary.totalCollected.toLocaleString()}\n*Total Outstanding Dues: ₹${summary.totalOutstandingDues.toLocaleString()}*\n\nDetailed PDF Report attached.`;
      }

      const pdfBlob = doc.output("blob");
      const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

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
              <BookOpen className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              Due Report Student Wise
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              ACON Reports
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Student-by-student fee structure demand, payments collected, and balance dues ledger.
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
        {/* Total Students */}
        <Card className="border-teal-200 dark:border-teal-900 bg-gradient-to-br from-card to-teal-50/30 dark:to-teal-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Students</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{summary.totalStudents}</h3>
              <p className="text-[11px] text-teal-700 dark:text-teal-300 mt-0.5 font-medium">
                {summary.paidCount} fully paid | {summary.unpaidCount} unpaid
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-700 dark:text-teal-300 shrink-0">
              <Users size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Demanded Fees */}
        <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-card to-blue-50/30 dark:to-blue-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Fee Demanded</p>
              <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                ₹{summary.totalDemanded.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                From course fee structures
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-700 dark:text-blue-300 shrink-0">
              <DollarSign size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Total Collected */}
        <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-card to-emerald-50/30 dark:to-emerald-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Fees Collected</p>
              <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                ₹{summary.totalCollected.toLocaleString()}
              </h3>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5 font-medium">
                Actual payments received
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
              <CheckCircle2 size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Dues */}
        <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-br from-card to-amber-50/30 dark:to-amber-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Outstanding Balance Dues</p>
              <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                ₹{summary.totalOutstandingDues.toLocaleString()}
              </h3>
              <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5 font-medium">
                Pending collection target
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
              <AlertTriangle size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Course</label>
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

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Academic Year</label>
              <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Academic Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Years</SelectItem>
                  <SelectItem value="2025-2026" className="text-xs">2025-2026</SelectItem>
                  <SelectItem value="2026-2027" className="text-xs">2026-2027</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Quota</label>
              <Select value={quotaFilter} onValueChange={setQuotaFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Quotas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Quotas</SelectItem>
                  <SelectItem value="general" className="text-xs">General</SelectItem>
                  <SelectItem value="management" className="text-xs">Management</SelectItem>
                  <SelectItem value="reserved" className="text-xs">Reserved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Due Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Status</SelectItem>
                  <SelectItem value="paid" className="text-xs">Fully Paid</SelectItem>
                  <SelectItem value="partial" className="text-xs">Partially Paid</SelectItem>
                  <SelectItem value="unpaid" className="text-xs">Unpaid / Dues Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Search Student</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search name, enrollment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student Dues Directory Table */}
      <Card>
        <CardHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-semibold">Student Fee Dues Directory</CardTitle>
              <CardDescription className="text-xs">
                Showing {students.length} student records
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
                  <th className="p-3">Enrollment #</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Course & Batch</th>
                  <th className="p-3 text-center">Quota</th>
                  <th className="p-3 text-right">Demanded Fee</th>
                  <th className="p-3 text-right">Fee Paid</th>
                  <th className="p-3 text-right">Outstanding Due</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-muted-foreground">
                      Loading student dues directory...
                    </td>
                  </tr>
                ) : students.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-muted-foreground">
                      No student records found matching selected filters.
                    </td>
                  </tr>
                ) : (
                  students.map((st) => (
                    <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono font-semibold text-foreground">{st.enrollmentNo}</td>
                      <td className="p-3 font-semibold text-foreground">
                        <div>
                          <span>{st.name}</span>
                          {st.phone && <span className="block text-[10px] text-muted-foreground font-mono">{st.phone}</span>}
                        </div>
                      </td>
                      <td className="p-3 text-foreground">
                        <div>
                          <span className="font-medium">{st.courseName}</span>
                          <span className="block text-[10px] text-muted-foreground">{st.batchName} ({st.academicYear})</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="uppercase text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border">
                          {st.quotaCategory}
                        </span>
                      </td>
                      <td className="p-3 text-right font-medium text-foreground">
                        ₹{st.demandedFee.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹{st.totalPaid.toLocaleString()}
                      </td>
                      <td className="p-3 text-right font-bold text-amber-700 dark:text-amber-400">
                        ₹{st.balanceDue.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        {st.status === "paid" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 size={11} /> Fully Paid
                          </span>
                        )}
                        {st.status === "partial" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300">
                            <Clock size={11} /> Partial Dues
                          </span>
                        )}
                        {st.status === "unpaid" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950 dark:text-rose-300">
                            <AlertTriangle size={11} /> Unpaid
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            to={`/college/student/${st.id}` as any}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950 rounded border border-teal-200 dark:border-teal-800"
                            title="View Student Fee Ledger"
                          >
                            Ledger <ExternalLink size={10} />
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            title="Send Due PDF Statement via WhatsApp"
                            onClick={() => handleOpenWhatsAppModal(st)}
                          >
                            <MessageCircle size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
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
              Share Due Statement via WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedStudent
                ? `Send fee due statement PDF for ${selectedStudent.name} (${selectedStudent.enrollmentNo}).`
                : "Send complete student-wise due report PDF."}
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
