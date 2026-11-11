import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Search,
  Users,
  CheckCircle2,
  Clock,
  ShieldAlert,
  CalendarDays,
  ArrowUpRight,
  ExternalLink,
  BookOpen,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Receipt,
  Tag,
  AlertCircle,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Download,
  Printer,
  Share2,
  Home,
  Utensils,
  GraduationCap,
  X,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatCollegePaymentMode } from "@/lib/college-payment";
import { CollegeReceiptDialog } from "@/components/college/CollegeReceiptDialog";
import { MonthBox, MonthBoxList } from "@/components/college/MonthBox";
import {
  printCollegeReceipt,
  downloadCollegeReceipt,
  CollegeReceiptData,
} from "@/lib/college-receipt-pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/college/fee-dues")({
  component: StudentFeeDueTrackingPage,
});

const formatFeeComponentName = (name: string): string => {
  const n = (name || "").trim();
  if (n.toLowerCase() === "tuition fee" || n.toLowerCase() === "tuition & composite fee") {
    return "Course Fee";
  }
  return n || "Course Fee";
};

interface BatchSummary {
  batchId: number;
  batchName: string;
  courseName: string;
  academicYear: string;
  section: string;
  totalStudents: number;
  termStartDate: string | null;
  termEndDate: string | null;
  feeDueDate: string | null;
  totalExpected: number;
  totalCollected: number;
  totalBalanceDue: number;
  overdueCount: number;
  status: "on_track" | "due_soon" | "overdue";
}

interface TermDetail {
  semester: number;
  academicYear: string;
  startDate: string;
  feeDueDate: string;
  expectedFee: number;
  cumulativeExpected: number;
  status: "paid" | "upcoming" | "overdue";
  daysDiffText: string;
}

interface ComponentPayment {
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  targetPeriod: string | null;
  isProportional: boolean;
}

interface InstallmentPeriod {
  period: string;
  monthKey?: string;
  dueDate?: string | null;
  expectedAmount: number;
  paidAmount: number;
  dueAmount: number;
  scheduledBalance?: number;
  status: "paid" | "partial" | "due" | "upcoming";
}

interface ComponentDue {
  name: string;
  frequency: string;
  frequencyKey: string;
  expectedAmount: number;
  paidAmount: number;
  dueAmount: number;
  scheduledBalance?: number;
  remainingBalance?: number;
  status: "paid" | "partial" | "due" | "upcoming";
  payments: ComponentPayment[];
  installments: InstallmentPeriod[];
}

interface YearlyComponentDue {
  academicYear: string;
  yearNumber: number;
  totalExpected: number;
  totalPaid: number;
  totalDue: number;
  scheduledBalance?: number;
  components: ComponentDue[];
}

interface PaymentHistoryItem {
  id: number;
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  grossAmount: number;
  discountAmount: number;
  paymentMode: string;
  feeType: string;
  components: string;
  targetPeriod?: string | null;
  remarks?: any;
}

export interface HeadDueSummary {
  expected: number;
  paid: number;
  dueNow: number;
  futureScheduled: number;
  status: "paid" | "partial" | "due" | "upcoming";
  overdueMonthsCount: number;
}

interface StudentDue {
  studentId: number;
  name: string;
  enrollmentNo: string;
  email: string;
  phone: string;
  batchId: number;
  batchName: string;
  courseName: string;
  quotaCategory: string;
  semester: number;
  grossFee?: number;
  totalFee: number;
  paidAmount: number;
  balanceDue: number;
  remainingBalance?: number;
  scheduledBalance?: number;
  totalDiscountConcessions?: number;
  termStartDate: string | null;
  feeDueDate: string | null;
  dueStatus: "paid" | "upcoming" | "overdue";
  daysDiffText: string;
  overdueAgingDays?: number;
  overdueAgingCategory?: "current" | "1_30" | "31_60" | "61_90" | "90_plus";
  heads?: {
    course: HeadDueSummary;
    hostel: HeadDueSummary;
    mess: HeadDueSummary;
    other: HeadDueSummary;
  };
  termDetails?: TermDetail[];
  componentDues?: ComponentDue[];
  yearlyComponentDues?: YearlyComponentDue[];
  paymentHistory?: PaymentHistoryItem[];
}

interface HeadMetrics {
  expected: number;
  collected: number;
  due: number;
  overdueCount: number;
}

interface DueDashboardMetrics {
  totalStudents: number;
  totalExpected: number;
  totalCollected: number;
  totalBalanceDue: number;
  overdueCount: number;
  byHead?: {
    course: HeadMetrics;
    hostel: HeadMetrics;
    mess: HeadMetrics;
    other: HeadMetrics;
  };
}

function parseTxRemarks(remarks: unknown): any {
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

function StudentFeeDueTrackingPage() {
  const queryClient = useQueryClient();
  const [collectStudentId, setCollectStudentId] = React.useState<number | null>(null);
  const [collectDialogOpen, setCollectDialogOpen] = React.useState<boolean>(false);
  const [selectedBatchFilter, setSelectedBatchFilter] = React.useState<number>(0);
  const [dueStatusFilter, setDueStatusFilter] = React.useState<string>("all");
  const [feeHeadFilter, setFeeHeadFilter] = React.useState<string>("all");
  const [agingFilter, setAgingFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [sorting, setSorting] = React.useState<{ column: string; direction: "asc" | "desc" } | null>(null);
  const [expandedStudentIds, setExpandedStudentIds] = React.useState<Record<number, boolean>>({});
  const [expandedCompKeys, setExpandedCompKeys] = React.useState<Record<string, boolean>>({});
  const [selectedReceiptTx, setSelectedReceiptTx] = React.useState<{ tx: PaymentHistoryItem; student: StudentDue } | null>(null);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);

  // Debounce search input — wait 400ms after user stops typing before triggering API
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedBatchFilter, dueStatusFilter, feeHeadFilter, agingFilter]);

  const { data: batches = [] } = useQuery<any[]>({
    queryKey: ["nursing", "batches"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/batches");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: dueDashboard, isLoading: isLoadingDashboard, isFetching: isFetchingDashboard } = useQuery<{
    batchSummaries: BatchSummary[];
    studentDues: StudentDue[];
    pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
    metrics: DueDashboardMetrics;
  }>({
    queryKey: [
      "nursing",
      "fees",
      "due-dashboard",
      selectedBatchFilter,
      debouncedSearch,
      dueStatusFilter,
      feeHeadFilter,
      agingFilter,
      currentPage,
      pageSize,
      sorting,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBatchFilter > 0) params.append("batchId", String(selectedBatchFilter));
      params.append("page", String(currentPage));
      params.append("pageSize", String(pageSize));
      if (sorting) {
        params.set("sortBy", sorting.column);
        params.set("sortDirection", sorting.direction);
      }
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (dueStatusFilter !== "all") params.append("dueStatus", dueStatusFilter);
      if (feeHeadFilter !== "all") params.append("feeHead", feeHeadFilter);
      if (agingFilter !== "all") params.append("aging", agingFilter);
      const res = await fetch(`/api/nursing/fees/due-dashboard?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch fee due dashboard");
      return res.json();
    },
  });

  const toggleStudentExpand = (studentId: number) => {
    setExpandedStudentIds((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const pagination = dueDashboard?.pagination;
  const metrics = dueDashboard?.metrics;

  const totalStudents = metrics?.totalStudents || 0;
  const totalExpected = metrics?.totalExpected || 0;
  const totalCollected = metrics?.totalCollected || 0;
  const totalBalanceDue = metrics?.totalBalanceDue || 0;
  const overdueCount = metrics?.overdueCount || 0;

  const byHead = metrics?.byHead || {
    course: { expected: 0, collected: 0, due: 0, overdueCount: 0 },
    hostel: { expected: 0, collected: 0, due: 0, overdueCount: 0 },
    mess: { expected: 0, collected: 0, due: 0, overdueCount: 0 },
    other: { expected: 0, collected: 0, due: 0, overdueCount: 0 },
  };

  // CSV Export for Calling Rosters & Institutional Due Follow-ups
  const handleExportDefaultersCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (selectedBatchFilter > 0) params.append("batchId", String(selectedBatchFilter));
      params.append("page", "1");
      params.append("pageSize", "1000"); // export up to 1000 matching records
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (dueStatusFilter !== "all") params.append("dueStatus", dueStatusFilter);
      if (feeHeadFilter !== "all") params.append("feeHead", feeHeadFilter);
      if (agingFilter !== "all") params.append("aging", agingFilter);

      const res = await fetch(`/api/nursing/fees/due-dashboard?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch due export data");
      const json = await res.json();
      const records: StudentDue[] = json.studentDues || [];

      if (records.length === 0) {
        toast.info("No records found matching current criteria to export.");
        setIsExporting(false);
        return;
      }

      const headers = [
        "Sl No",
        "Enrollment No",
        "Student Name",
        "Mobile Phone",
        "Email",
        "Batch Name",
        "Course Name",
        "Quota",
        "Course Fee Due (Rs)",
        "Hostel Fee Due (Rs)",
        "Mess Fee Due (Rs)",
        "Total Due Now (Rs)",
        "Future Scheduled (Rs)",
        "Total Gross Expected (Rs)",
        "Total Paid (Rs)",
        "Due Status",
        "Days Overdue",
        "Active Due Date",
      ];

      const rows = records.map((s, idx) => [
        idx + 1,
        `"${s.enrollmentNo || ""}"`,
        `"${s.name || ""}"`,
        `"${s.phone || ""}"`,
        `"${s.email || ""}"`,
        `"${s.batchName || ""}"`,
        `"${s.courseName || ""}"`,
        `"${s.quotaCategory || ""}"`,
        s.heads?.course?.dueNow || 0,
        s.heads?.hostel?.dueNow || 0,
        s.heads?.mess?.dueNow || 0,
        s.balanceDue || 0,
        s.scheduledBalance || 0,
        s.totalFee || 0,
        s.paidAmount || 0,
        `"${s.dueStatus || ""}"`,
        s.overdueAgingDays || 0,
        `"${s.feeDueDate || ""}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateTag = format(new Date(), "yyyyMMdd_HHmm");
      link.setAttribute("href", url);
      link.setAttribute("download", `ACON_Fee_Defaulters_${feeHeadFilter}_${dateTag}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${records.length} student due records to CSV.`);
    } catch (e: any) {
      toast.error(e.message || "Failed to export defaulter roster.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintReceipt = (tx: PaymentHistoryItem, st: StudentDue) => {
    const parsed = parseTxRemarks(tx.remarks);
    const receiptData: CollegeReceiptData = {
      receiptNumber: tx.receiptNumber,
      invoiceNo: tx.receiptNumber,
      paymentDate: tx.paymentDate,
      paymentMode: tx.paymentMode,
      amount: tx.amount,
      feeType: tx.feeType,
      studentId: st.studentId,
      studentName: st.name,
      enrollmentNo: st.enrollmentNo,
      studentCourse: st.courseName,
      remarks: parsed || {
        isCollegeReceipt: true,
        grossSubtotal: tx.grossAmount || tx.amount,
        discountAmount: tx.discountAmount || 0,
        items: [
          {
            category: tx.feeType || "Course Fee",
            description: tx.feeType || "Course Fee Payment",
            amount: tx.amount,
          },
        ],
      },
    };
    printCollegeReceipt(receiptData);
  };

  const handleDownloadReceipt = (tx: PaymentHistoryItem, st: StudentDue) => {
    const parsed = parseTxRemarks(tx.remarks);
    const receiptData: CollegeReceiptData = {
      receiptNumber: tx.receiptNumber,
      invoiceNo: tx.receiptNumber,
      paymentDate: tx.paymentDate,
      paymentMode: tx.paymentMode,
      amount: tx.amount,
      feeType: tx.feeType,
      studentId: st.studentId,
      studentName: st.name,
      enrollmentNo: st.enrollmentNo,
      studentCourse: st.courseName,
      remarks: parsed || {
        isCollegeReceipt: true,
        grossSubtotal: tx.grossAmount || tx.amount,
        discountAmount: tx.discountAmount || 0,
        items: [
          {
            category: tx.feeType || "Course Fee",
            description: tx.feeType || "Course Fee Payment",
            amount: tx.amount,
          },
        ],
      },
    };
    downloadCollegeReceipt(receiptData);
  };

  return (
    <div className="min-w-0 p-3 sm:p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-start gap-2">
            <DollarSign className="h-6 w-6 shrink-0 text-teal-600" />
            Student Fee Due & Payment Tracking
          </h1>
          <p className="text-sm text-muted-foreground">
            Multi-head fee liability engine: track Tuition, Hostel, Mess schedules, active monthly dues, and overdue timelines.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 [&>a]:min-h-11">
          <Button variant="outline" asChild size="sm">
            <Link to="/college/fee-structures" className="flex items-center gap-1.5 text-xs">
              <Layers size={14} /> Fee Structures
            </Link>
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link to="/college/academic-schedules" className="flex items-center gap-1.5 text-xs">
              <CalendarDays size={14} /> Academic Schedules
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportDefaultersCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200"
            title="Download CSV roster of all students with due fees based on active filters"
          >
            <Download size={14} /> {isExporting ? "Exporting..." : "Export Dues (CSV)"}
          </Button>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 text-xs shadow-xs"
            onClick={() => {
              setCollectStudentId(null);
              setCollectDialogOpen(true);
            }}
          >
            <Plus size={14} /> Collect Fee / Issue Receipt
          </Button>
          <Button variant="outline" asChild size="sm">
            <Link to="/college/fees" className="flex items-center gap-1.5 text-xs text-teal-600 border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950">
              <ExternalLink size={14} /> Fee Ledger
            </Link>
          </Button>
        </div>
      </div>

      {/* Global Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Enrolled Students Tracked</p>
              <h3 className="text-xl font-bold text-foreground mt-1">{totalStudents}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Users size={20} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Expected Liability</p>
              <h3 className="text-xl font-bold text-foreground mt-1">₹{totalExpected.toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <BookOpen size={20} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Fees Collected</p>
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">₹{totalCollected.toLocaleString()}</h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={20} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Active Due Balance</p>
              <h3 className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">₹{totalBalanceDue.toLocaleString()}</h3>
              {overdueCount > 0 && (
                <span className="text-[11px] text-rose-600 font-medium">({overdueCount} students overdue)</span>
              )}
            </div>
            <div className="h-10 w-10 rounded-full bg-rose-50 dark:bg-rose-950 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <ShieldAlert size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Head Interactive Fee Summary Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Sparkles size={12} className="text-teal-600" /> Fee Head Breakdown (Click to filter)
          </span>
          {feeHeadFilter !== "all" && (
            <button
              onClick={() => setFeeHeadFilter("all")}
              className="text-teal-600 hover:underline flex items-center gap-1 text-[11px] font-medium"
            >
              <X size={11} /> Clear Head Filter
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Head 1: Course / Tuition */}
          <div
            onClick={() => setFeeHeadFilter(feeHeadFilter === "course" ? "all" : "course")}
            className={cn(
              "p-3.5 rounded-xl border bg-card cursor-pointer transition-all hover:shadow-xs",
              feeHeadFilter === "course"
                ? "ring-2 ring-blue-500 border-blue-500 bg-blue-50/20 dark:bg-blue-950/20"
                : "hover:border-blue-300 dark:hover:border-blue-900"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  <GraduationCap size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Tuition & Course Fee</h4>
                  <p className="text-[11px] text-muted-foreground">Academic programs</p>
                </div>
              </div>
              <span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
                ₹{byHead.course.due.toLocaleString()} Due
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t flex justify-between text-[11px] text-muted-foreground">
              <span>Collected: <strong className="text-emerald-600 font-mono">₹{byHead.course.collected.toLocaleString()}</strong></span>
              <span>Defaulters: <strong className={byHead.course.overdueCount > 0 ? "text-rose-600" : "text-foreground"}>{byHead.course.overdueCount}</strong></span>
            </div>
          </div>

          {/* Head 2: Hostel Accommodation */}
          <div
            onClick={() => setFeeHeadFilter(feeHeadFilter === "hostel" ? "all" : "hostel")}
            className={cn(
              "p-3.5 rounded-xl border bg-card cursor-pointer transition-all hover:shadow-xs",
              feeHeadFilter === "hostel"
                ? "ring-2 ring-purple-500 border-purple-500 bg-purple-50/20 dark:bg-purple-950/20"
                : "hover:border-purple-300 dark:hover:border-purple-900"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  <Home size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Hostel Accommodation</h4>
                  <p className="text-[11px] text-muted-foreground">Room & lodging tariffs</p>
                </div>
              </div>
              <span className="text-xs font-bold font-mono text-purple-700 dark:text-purple-300">
                ₹{byHead.hostel.due.toLocaleString()} Due
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t flex justify-between text-[11px] text-muted-foreground">
              <span>Collected: <strong className="text-emerald-600 font-mono">₹{byHead.hostel.collected.toLocaleString()}</strong></span>
              <span>Defaulters: <strong className={byHead.hostel.overdueCount > 0 ? "text-rose-600" : "text-foreground"}>{byHead.hostel.overdueCount}</strong></span>
            </div>
          </div>

          {/* Head 3: Mess & Catering */}
          <div
            onClick={() => setFeeHeadFilter(feeHeadFilter === "mess" ? "all" : "mess")}
            className={cn(
              "p-3.5 rounded-xl border bg-card cursor-pointer transition-all hover:shadow-xs",
              feeHeadFilter === "mess"
                ? "ring-2 ring-amber-500 border-amber-500 bg-amber-50/20 dark:bg-amber-950/20"
                : "hover:border-amber-300 dark:hover:border-amber-900"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                  <Utensils size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Mess & Catering</h4>
                  <p className="text-[11px] text-muted-foreground">Dining & meal plans</p>
                </div>
              </div>
              <span className="text-xs font-bold font-mono text-amber-700 dark:text-amber-300">
                ₹{byHead.mess.due.toLocaleString()} Due
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t flex justify-between text-[11px] text-muted-foreground">
              <span>Collected: <strong className="text-emerald-600 font-mono">₹{byHead.mess.collected.toLocaleString()}</strong></span>
              <span>Defaulters: <strong className={byHead.mess.overdueCount > 0 ? "text-rose-600" : "text-foreground"}>{byHead.mess.overdueCount}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Summaries Quick Strip */}
      {(dueDashboard?.batchSummaries || []).length > 0 && (
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen size={16} className="text-teal-600" />
              Batch-wise Due Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(dueDashboard?.batchSummaries || []).map((b) => (
                <div
                  key={b.batchId}
                  className="p-3 border rounded-lg bg-card/60 space-y-1.5 text-xs hover:border-teal-300 dark:hover:border-teal-800 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-foreground">{b.batchName}</span>
                      <p className="text-[11px] text-muted-foreground">{b.courseName} • Sec {b.section}</p>
                    </div>
                    {b.status === "overdue" ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                        <ShieldAlert size={10} /> Overdue
                      </span>
                    ) : b.status === "due_soon" ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                        <Clock size={10} /> Due Soon
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 size={10} /> On Track
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-muted-foreground pt-1 border-t">
                    <span>Due Date: <strong className="text-foreground">{b.feeDueDate ? format(new Date(b.feeDueDate + "T00:00:00"), "PP") : "N/A"}</strong></span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">Due: ₹{b.totalBalanceDue.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Student Dues Table Card */}
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <CardTitle className="text-base font-semibold">Student-Level Fee & Due Schedule</CardTitle>
              <CardDescription>
                Detailed month-by-month and head-wise view: Click on any student row to view breakdowns, MonthBox heatmaps, and payment receipts
              </CardDescription>
            </div>
            {isFetchingDashboard && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 self-start sm:self-auto">
                <RefreshCw size={12} className="animate-spin text-teal-600" /> Updating...
              </span>
            )}
          </div>

          {/* Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 [&>select]:min-w-0 [&>select]:min-h-10">
            <div className="relative min-w-0 lg:col-span-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by student name, enrollment no, or phone..."
                className="min-h-10 w-full pl-8 pr-3 py-1.5 border rounded-md text-xs bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="border rounded-md px-2.5 py-1.5 text-xs bg-background"
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(Number(e.target.value))}
            >
              <option value={0}>All Academic Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.courseName} - {b.academicYear}
                </option>
              ))}
            </select>

            <select
              className="border rounded-md px-2.5 py-1.5 text-xs bg-background"
              value={feeHeadFilter}
              onChange={(e) => setFeeHeadFilter(e.target.value)}
            >
              <option value="all">All Fee Heads</option>
              <option value="course">Course / Tuition Due Only</option>
              <option value="hostel">Hostel Accommodation Due Only</option>
              <option value="mess">Mess & Catering Due Only</option>
              <option value="other">One-Time / Misc Due Only</option>
            </select>

            <select
              className="border rounded-md px-2.5 py-1.5 text-xs bg-background"
              value={dueStatusFilter}
              onChange={(e) => setDueStatusFilter(e.target.value)}
            >
              <option value="all">All Due Statuses</option>
              <option value="overdue">Overdue Only</option>
              <option value="upcoming">Upcoming Scheduled</option>
              <option value="paid">Fully Settled</option>
            </select>
          </div>

          {/* Aging Filter Sub-strip */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1 border-t text-muted-foreground">
            <span className="font-semibold text-[11px] uppercase mr-1">Overdue Aging:</span>
            {[
              ["all", "All"],
              ["current", "On-Track / Current"],
              ["1_30", "1-30 Days"],
              ["31_60", "31-60 Days"],
              ["61_90", "61-90 Days"],
              ["90_plus", "90+ Days"],
            ].map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => setAgingFilter(val)}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] transition-colors border",
                  agingFilter === val
                    ? "bg-teal-600 text-white border-teal-600 font-semibold"
                    : "bg-muted/40 hover:bg-muted text-muted-foreground border-transparent"
                )}
              >
                {label}
              </button>
            ))}
            {(feeHeadFilter !== "all" || dueStatusFilter !== "all" || agingFilter !== "all" || selectedBatchFilter > 0 || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedBatchFilter(0);
                  setFeeHeadFilter("all");
                  setDueStatusFilter("all");
                  setAgingFilter("all");
                  setSearchQuery("");
                }}
                className="ml-auto text-[11px] text-rose-600 hover:underline flex items-center gap-1 font-medium"
              >
                <X size={11} /> Reset All Filters
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="min-w-0 px-3 sm:px-5">
          {isLoadingDashboard ? (
            <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
              <RefreshCw size={24} className="animate-spin text-teal-600" />
              <span>Loading student fee schedules and reconciliations...</span>
            </div>
          ) : (dueDashboard?.studentDues || []).length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No student fee records found matching the filter criteria.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-300 text-sm text-left border-collapse [&_td]:align-top">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <th className="p-3 w-8"></th>
                      <th className="p-3 whitespace-nowrap" scope="col">Sl.No.</th>
                      {[
                        ["enrollmentNo", "Enrollment No"],
                        ["name", "Student & Contact"],
                        ["batchName", "Batch & Quota"],
                        ["courseDue", "Course Due"],
                        ["hostelDue", "Hostel Due"],
                        ["messDue", "Mess Due"],
                        ["balanceDue", "Total Due Now"],
                        ["scheduledBalance", "Future Scheduled"],
                        ["feeDueDate", "Next / Active Due"],
                        ["dueStatus", "Status & Aging"],
                      ].map(([column, label]) => {
                        const active = sorting?.column === column;
                        const SortIcon = active ? (sorting.direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                        const numeric = ["courseDue", "hostelDue", "messDue", "balanceDue", "scheduledBalance"].includes(column);
                        return (
                          <th
                            key={column}
                            scope="col"
                            className={cn("p-3", numeric && "text-right")}
                            aria-sort={active ? (sorting.direction === "asc" ? "ascending" : "descending") : "none"}
                          >
                            <button
                              type="button"
                              className="inline-flex min-h-10 items-center gap-1 text-left rounded hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Sort ${label} ${active && sorting.direction === "asc" ? "descending" : "ascending"}`}
                              onClick={() => {
                                setSorting({ column, direction: active && sorting.direction === "asc" ? "desc" : "asc" });
                                setCurrentPage(1);
                              }}
                            >
                              {label}
                              <SortIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            </button>
                          </th>
                        );
                      })}
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(dueDashboard?.studentDues || []).map((st, index) => {
                      const isExpanded = !!expandedStudentIds[st.studentId];
                      const courseDue = st.heads?.course?.dueNow || 0;
                      const hostelDue = st.heads?.hostel?.dueNow || 0;
                      const messDue = st.heads?.mess?.dueNow || 0;

                      return (
                        <React.Fragment key={st.studentId}>
                          <tr
                            className={cn(
                              "hover:bg-muted/30 transition-colors cursor-pointer",
                              isExpanded && "bg-teal-50/30 dark:bg-teal-950/10"
                            )}
                            onClick={() => toggleStudentExpand(st.studentId)}
                          >
                            <td className="p-3 text-center">
                              <Button
                                type="button"
                                className="p-1 rounded hover:bg-muted text-muted-foreground bg-transparent"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStudentExpand(st.studentId);
                                }}
                              >
                                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              </Button>
                            </td>
                            <td className="p-3 tabular-nums text-muted-foreground">
                              {((pagination?.page ?? currentPage) - 1) * (pagination?.pageSize ?? pageSize) + index + 1}
                            </td>
                            <td className="p-3 font-semibold text-teal-600 dark:text-teal-400">
                              <Link
                                to="/college/student/$id"
                                params={{ id: String(st.studentId) }}
                                onClick={(e) => e.stopPropagation()}
                                className="hover:underline flex items-center gap-1"
                              >
                                {st.enrollmentNo}
                                <ArrowUpRight size={12} className="opacity-60" />
                              </Link>
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-foreground">{st.name}</div>
                              <div className="text-xs text-muted-foreground">{st.phone}</div>
                            </td>
                            <td className="p-3 font-medium text-xs">
                              <div>{st.batchName}</div>
                              <div className="text-muted-foreground capitalize">{st.quotaCategory} Quota</div>
                            </td>

                            {/* Head-Wise Due Columns */}
                            <td className="p-3 text-right tabular-nums">
                              {courseDue > 0 ? (
                                <span className="font-bold text-rose-600 font-mono">₹{courseDue.toLocaleString()}</span>
                              ) : (
                                <span className="text-emerald-600 text-xs font-medium">✓ Settled</span>
                              )}
                            </td>
                            <td className="p-3 text-right tabular-nums">
                              {hostelDue > 0 ? (
                                <span className="font-bold text-purple-600 font-mono">₹{hostelDue.toLocaleString()}</span>
                              ) : st.heads?.hostel?.expected && st.heads.hostel.expected > 0 ? (
                                <span className="text-emerald-600 text-xs font-medium">✓ Settled</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </td>
                            <td className="p-3 text-right tabular-nums">
                              {messDue > 0 ? (
                                <span className="font-bold text-amber-600 font-mono">₹{messDue.toLocaleString()}</span>
                              ) : st.heads?.mess?.expected && st.heads.mess.expected > 0 ? (
                                <span className="text-emerald-600 text-xs font-medium">✓ Settled</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </td>

                            {/* Total Due Now */}
                            <td className="p-3 text-right tabular-nums font-bold">
                              {st.balanceDue > 0 ? (
                                <span className="text-rose-600 dark:text-rose-400 font-mono">₹{st.balanceDue.toLocaleString()}</span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-mono">₹0</span>
                              )}
                            </td>

                            {/* Scheduled Future Balance */}
                            <td className="p-3 text-right tabular-nums text-xs font-mono text-sky-600">
                              ₹{Number(st.scheduledBalance || 0).toLocaleString()}
                            </td>

                            {/* Active Due Date */}
                            <td className="p-3 font-medium text-xs">
                              {st.feeDueDate ? format(new Date(st.feeDueDate + "T00:00:00"), "PP") : "N/A"}
                            </td>

                            {/* Status & Aging */}
                            <td className="p-3">
                              {st.dueStatus === "paid" && (
                                <span className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded text-xs font-semibold inline-block">
                                  ● Fully Settled
                                </span>
                              )}
                              {st.dueStatus === "upcoming" && (
                                <span className="text-amber-700 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded text-xs font-medium inline-block">
                                  ● {st.daysDiffText}
                                </span>
                              )}
                              {st.dueStatus === "overdue" && (
                                <span className="text-rose-700 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded text-xs font-bold inline-block">
                                  ● {st.daysDiffText}
                                </span>
                              )}
                            </td>

                            {/* Quick Collect Action */}
                            <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-teal-600 text-white hover:bg-teal-700 px-2.5"
                                onClick={() => {
                                  setCollectStudentId(st.studentId);
                                  setCollectDialogOpen(true);
                                }}
                              >
                                Collect
                              </Button>
                            </td>
                          </tr>

                          {/* Inline Expanded Dossier Row */}
                          {isExpanded && (
                            <tr className="bg-muted/15 border-b">
                              <td colSpan={13} className="p-3 sm:p-4 sm:pl-10 sm:pr-6">
                                <div className="space-y-4">
                                  {/* Student Summary Top Strip */}
                                  <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-lg border">
                                    <div className="flex flex-wrap items-center gap-4 text-xs">
                                      <div>
                                        <span className="text-muted-foreground block text-[11px]">Gross Liability</span>
                                        <strong className="text-foreground">₹{Number(st.grossFee ?? st.totalFee).toLocaleString()}</strong>
                                      </div>
                                      {Number(st.totalDiscountConcessions || 0) > 0 && (
                                        <div>
                                          <span className="text-emerald-600 block text-[11px]">Scholarships / Concessions</span>
                                          <strong className="text-emerald-600">-₹{Number(st.totalDiscountConcessions).toLocaleString()}</strong>
                                        </div>
                                      )}
                                      <div>
                                        <span className="text-muted-foreground block text-[11px]">Total Settled</span>
                                        <strong className="text-emerald-600">₹{st.paidAmount.toLocaleString()}</strong>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground block text-[11px]">Active Due Now</span>
                                        <strong className={st.balanceDue > 0 ? "text-rose-600 text-sm font-mono" : "text-emerald-600 text-sm font-mono"}>
                                          ₹{st.balanceDue.toLocaleString()}
                                        </strong>
                                      </div>
                                      <div>
                                        <span className="text-sky-600 block text-[11px]">Future Scheduled Commitments</span>
                                        <strong className="text-sky-600 font-mono">₹{Number(st.scheduledBalance || 0).toLocaleString()}</strong>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Button size="sm" asChild variant="outline" className="h-7 text-xs">
                                        <Link to="/college/student/$id" params={{ id: String(st.studentId) }}>
                                          Full Dossier
                                        </Link>
                                      </Button>
                                      {Number(st.remainingBalance ?? st.balanceDue) > 0 && (
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs bg-teal-600 text-white hover:bg-teal-700"
                                          onClick={() => {
                                            setCollectStudentId(st.studentId);
                                            setCollectDialogOpen(true);
                                          }}
                                        >
                                          Collect Outstanding Fee
                                        </Button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="space-y-4">
                                    {/* Fee Types Due Tabular Breakdown Per Academic Year */}
                                    <div className="border rounded-lg p-3 bg-card space-y-3">
                                      <div className="flex items-center justify-between pb-1.5 border-b text-xs font-semibold text-foreground">
                                        <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                                          <Tag size={14} /> Fee Component Breakdown & Monthly Progress
                                        </span>
                                        <span className="text-muted-foreground font-normal text-[11px]">
                                          {(st.yearlyComponentDues || []).length} Academic Year{(st.yearlyComponentDues || []).length === 1 ? "" : "s"}
                                        </span>
                                      </div>

                                      {(!st.yearlyComponentDues || st.yearlyComponentDues.length === 0) ? (
                                        <p className="text-xs text-muted-foreground py-2">No component fee breakdown found.</p>
                                      ) : (
                                        <div className="space-y-3">
                                          {st.yearlyComponentDues.map((yearGroup, yIdx) => (
                                            <div key={yIdx} className="border rounded-lg overflow-hidden bg-background">
                                              <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-muted/50 border-b text-xs">
                                                <div className="font-bold text-foreground flex items-center gap-2">
                                                  <span className="bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded text-[11px]">
                                                    Year {yearGroup.yearNumber}
                                                  </span>
                                                  <span>Academic Session {yearGroup.academicYear}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px]">
                                                  <span>Expected: <strong>₹{yearGroup.totalExpected.toLocaleString()}</strong></span>
                                                  <span>Settled: <strong className="text-emerald-600">₹{yearGroup.totalPaid.toLocaleString()}</strong></span>
                                                  <span>Due Now: <strong className={yearGroup.totalDue > 0 ? "text-rose-600" : "text-emerald-600"}>₹{yearGroup.totalDue.toLocaleString()}</strong></span>
                                                  <span>Scheduled: <strong className="text-sky-600">₹{Number(yearGroup.scheduledBalance || 0).toLocaleString()}</strong></span>
                                                </div>
                                              </div>

                                              <table className="w-full text-xs text-left">
                                                <thead className="bg-muted/30 text-muted-foreground font-semibold border-b text-[11px]">
                                                  <tr>
                                                    <th className="p-2 pl-3 w-6"></th>
                                                    <th className="p-2">Fee Head / Component</th>
                                                    <th className="p-2">Schedule</th>
                                                    <th className="p-2 text-right">Annual Expected</th>
                                                    <th className="p-2 text-right">Settled</th>
                                                    <th className="p-2 text-right">Active Due Now</th>
                                                    <th className="p-2 text-right">Future Scheduled</th>
                                                    <th className="p-2 pr-3">Status</th>
                                                  </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                  {yearGroup.components.map((comp, idx) => {
                                                    const compKey = `${st.studentId}-${yIdx}-${idx}`;
                                                    const isCompExpanded = !!expandedCompKeys[compKey];
                                                    const hasDetails = (comp.installments?.length > 0 && (comp.frequencyKey !== "annually" && comp.frequencyKey !== "one_time")) || comp.payments?.length > 0;
                                                    return (
                                                      <React.Fragment key={idx}>
                                                        <tr
                                                          className={cn(
                                                            "transition-colors",
                                                            hasDetails && "cursor-pointer hover:bg-muted/20",
                                                            !hasDetails && "hover:bg-muted/20",
                                                            comp.status === "due" && "bg-rose-50/20 dark:bg-rose-950/10",
                                                            comp.status === "paid" && "bg-emerald-50/15 dark:bg-emerald-950/10",
                                                            isCompExpanded && "bg-teal-50/40 dark:bg-teal-950/20"
                                                          )}
                                                          onClick={() => {
                                                            if (hasDetails) {
                                                              setExpandedCompKeys((prev) => ({
                                                                ...prev,
                                                                [compKey]: !prev[compKey],
                                                              }));
                                                            }
                                                          }}
                                                        >
                                                          <td className="p-2 pl-3 text-center">
                                                            {hasDetails && (
                                                              <span className="text-muted-foreground">
                                                                {isCompExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                              </span>
                                                            )}
                                                          </td>
                                                          <td className="p-2 font-semibold text-foreground">
                                                            <span className="flex items-center gap-1.5">
                                                              <Tag size={12} className="text-teal-600 shrink-0" />
                                                              {formatFeeComponentName(comp.name)}
                                                            </span>
                                                          </td>
                                                          <td className="p-2 capitalize text-muted-foreground">{comp.frequency}</td>
                                                          <td className="p-2 text-right font-medium">₹{comp.expectedAmount.toLocaleString()}</td>
                                                          <td className="p-2 text-right text-emerald-600 font-medium">₹{comp.paidAmount.toLocaleString()}</td>
                                                          <td className="p-2 text-right font-bold">
                                                            {comp.dueAmount > 0 ? (
                                                              <span className="text-rose-600 font-mono">₹{comp.dueAmount.toLocaleString()}</span>
                                                            ) : (
                                                              <span className="text-emerald-600">₹0</span>
                                                            )}
                                                          </td>
                                                          <td className="p-2 text-right font-medium text-sky-600 font-mono">
                                                            ₹{Number(comp.scheduledBalance || 0).toLocaleString()}
                                                          </td>
                                                          <td className="p-2 pr-3">
                                                            {comp.status === "paid" && (
                                                              <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded text-[10px] font-medium inline-block">
                                                                ● Settled
                                                              </span>
                                                            )}
                                                            {comp.status === "partial" && (
                                                              <span className="text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded text-[10px] font-medium inline-block">
                                                                ● Partial
                                                              </span>
                                                            )}
                                                            {comp.status === "due" && (
                                                              <span className="text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded text-[10px] font-semibold inline-block">
                                                                ● Due
                                                              </span>
                                                            )}
                                                            {comp.status === "upcoming" && (
                                                              <span className="text-sky-600 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded text-[10px] font-medium inline-block">
                                                                ● Scheduled
                                                              </span>
                                                            )}
                                                          </td>
                                                        </tr>

                                                        {/* Expanded Component Details */}
                                                        {isCompExpanded && (
                                                          <tr className="bg-muted/10">
                                                            <td colSpan={8} className="p-0">
                                                              <div className="px-6 py-3 space-y-3 border-t border-dashed">
                                                                {/* Installment Month-by-Month Progress */}
                                                                {comp.installments?.length > 0 && comp.frequencyKey !== "annually" && comp.frequencyKey !== "one_time" && (
                                                                  <div>
                                                                    <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                                      <CalendarDays size={12} className="text-teal-600" /> Monthly Timeline & Matured Status
                                                                    </h5>
                                                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                                                                      {comp.installments.map((inst, iIdx) => (
                                                                        <div
                                                                          key={iIdx}
                                                                          className={cn(
                                                                            "p-2.5 rounded-lg border text-[11px] transition-all",
                                                                            inst.status === "paid" && "bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800",
                                                                            inst.status === "partial" && "bg-amber-50/70 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800",
                                                                            inst.status === "due" && "bg-rose-50/70 border-rose-300 dark:bg-rose-950/30 dark:border-rose-800 shadow-2xs",
                                                                            inst.status === "upcoming" && "bg-sky-50/50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-800"
                                                                          )}
                                                                        >
                                                                          <div className="flex items-center justify-between font-bold">
                                                                            <span className="text-foreground">{inst.period}</span>
                                                                            {inst.status === "paid" && (
                                                                              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 rounded">
                                                                                ✓ Paid
                                                                              </span>
                                                                            )}
                                                                            {inst.status === "due" && (
                                                                              <span className="text-[10px] text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-1.5 rounded font-bold">
                                                                                Due Now
                                                                              </span>
                                                                            )}
                                                                            {inst.status === "partial" && (
                                                                              <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1.5 rounded font-bold">
                                                                                Partial
                                                                              </span>
                                                                            )}
                                                                            {inst.status === "upcoming" && (
                                                                              <span className="text-[10px] text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 px-1.5 rounded">
                                                                                Future
                                                                              </span>
                                                                            )}
                                                                          </div>
                                                                          <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground font-mono">
                                                                            <span>Rate: ₹{inst.expectedAmount.toLocaleString()}</span>
                                                                            {inst.status === "due" && (
                                                                              <span className="font-bold text-rose-600">₹{inst.dueAmount.toLocaleString()}</span>
                                                                            )}
                                                                            {inst.status === "partial" && (
                                                                              <span className="font-bold text-amber-600">₹{inst.dueAmount.toLocaleString()} due</span>
                                                                            )}
                                                                          </div>
                                                                          {inst.dueDate && (
                                                                            <div className="text-[9.5px] text-muted-foreground mt-1">
                                                                              Due: {format(new Date(inst.dueDate + "T00:00:00"), "MMM d")}
                                                                            </div>
                                                                          )}
                                                                        </div>
                                                                      ))}
                                                                    </div>
                                                                  </div>
                                                                )}

                                                                {/* Payment Receipts List */}
                                                                {comp.payments?.length > 0 ? (
                                                                  <div>
                                                                    <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                                      <Receipt size={12} className="text-teal-600" /> Settled Payment Receipts ({comp.payments.length})
                                                                    </h5>
                                                                    <div className="space-y-1.5">
                                                                      {comp.payments.map((pmt, pIdx) => {
                                                                        const fullTx = (st.paymentHistory || []).find((h) => h.receiptNumber === pmt.receiptNumber);
                                                                        return (
                                                                          <div
                                                                            key={pIdx}
                                                                            onClick={() => {
                                                                              if (fullTx) {
                                                                                setSelectedReceiptTx({ tx: fullTx, student: st });
                                                                              }
                                                                            }}
                                                                            className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-card border hover:border-teal-400 hover:shadow-2xs transition-all cursor-pointer group"
                                                                          >
                                                                            <div className="flex flex-wrap items-center gap-2.5">
                                                                              <span className="font-mono font-bold text-teal-600 dark:text-teal-400 group-hover:underline flex items-center gap-1">
                                                                                <Receipt size={11} /> #{pmt.receiptNumber}
                                                                              </span>
                                                                              <span className="text-muted-foreground">
                                                                                {format(new Date(pmt.paymentDate + "T00:00:00"), "PP")}
                                                                              </span>
                                                                              <span className="uppercase font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                                                                                {formatCollegePaymentMode(pmt.paymentMode)}
                                                                              </span>
                                                                              {pmt.targetPeriod && (
                                                                                <span className="text-[10px] bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-1.5 py-0.5 rounded font-medium">
                                                                                  {pmt.targetPeriod}
                                                                                </span>
                                                                              )}
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                              <span className="font-bold text-emerald-600 font-mono text-xs">
                                                                                ₹{pmt.amount.toLocaleString()}
                                                                              </span>
                                                                              <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-teal-600 transition-opacity" />
                                                                            </div>
                                                                          </div>
                                                                        );
                                                                      })}
                                                                    </div>
                                                                  </div>
                                                                ) : (
                                                                  <p className="text-[11px] text-muted-foreground italic">No payments recorded for this component.</p>
                                                                )}
                                                              </div>
                                                            </td>
                                                          </tr>
                                                        )}
                                                      </React.Fragment>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      {/* Scheduled Academic Milestones */}
                                      <div className="border rounded-lg p-3 bg-card space-y-2">
                                        <div className="flex items-center justify-between pb-1.5 border-b text-xs font-semibold text-foreground">
                                          <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                                            <CalendarDays size={14} /> Scheduled Academic Terms & Milestones
                                          </span>
                                          <span className="text-muted-foreground font-normal text-[11px]">
                                            {(st.termDetails || []).length} Terms
                                          </span>
                                        </div>

                                        {(st.termDetails || []).length === 0 ? (
                                          <p className="text-xs text-muted-foreground py-2">No term schedules configured.</p>
                                        ) : (
                                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                            {(st.termDetails || []).map((term, idx) => (
                                              <div
                                                key={idx}
                                                className={cn(
                                                  "p-2.5 rounded-lg border text-xs flex justify-between items-center transition-colors",
                                                  term.status === "overdue"
                                                    ? "bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-900"
                                                    : term.status === "paid"
                                                    ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900"
                                                    : "bg-muted/40 border-muted"
                                                )}
                                              >
                                                <div>
                                                  <div className="font-semibold text-foreground flex items-center gap-2">
                                                    <span>Semester {term.semester} ({term.academicYear})</span>
                                                    {term.status === "overdue" ? (
                                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200 font-bold">
                                                        {term.daysDiffText}
                                                      </span>
                                                    ) : term.status === "paid" ? (
                                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-semibold">
                                                        Settled
                                                      </span>
                                                    ) : (
                                                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 font-medium">
                                                        {term.daysDiffText}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                                    Due: <strong className="text-foreground">{format(new Date(term.feeDueDate + "T00:00:00"), "PPP")}</strong>
                                                    {" • "}
                                                    Term Start: {format(new Date(term.startDate + "T00:00:00"), "PP")}
                                                  </div>
                                                </div>

                                                <div className="text-right">
                                                  <span className="font-bold text-foreground font-mono">₹{term.expectedFee.toLocaleString()}</span>
                                                  <span className="block text-[10px] text-muted-foreground">Target: ₹{term.cumulativeExpected.toLocaleString()}</span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                      {/* Complete Recorded Receipts Ledger */}
                                      <div className="border rounded-lg p-3 bg-card space-y-2">
                                        <div className="flex items-center justify-between pb-1.5 border-b text-xs font-semibold text-foreground">
                                          <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                                            <Receipt size={14} /> Official Fee Receipts Ledger
                                          </span>
                                          <span className="text-muted-foreground font-normal text-[11px]">
                                            {(st.paymentHistory || []).length} Receipts (₹{st.paidAmount.toLocaleString()})
                                          </span>
                                        </div>

                                        {(st.paymentHistory || []).length === 0 ? (
                                          <p className="text-xs text-muted-foreground py-4 text-center">No fee receipts recorded yet.</p>
                                        ) : (
                                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                            {(st.paymentHistory || []).map((tx) => (
                                              <div
                                                key={tx.id}
                                                onClick={() => setSelectedReceiptTx({ tx, student: st })}
                                                className="p-2.5 rounded-lg border bg-card text-xs flex justify-between items-center hover:border-teal-400 hover:shadow-2xs transition-all cursor-pointer group"
                                              >
                                                <div>
                                                  <div className="font-semibold text-foreground flex items-center gap-2">
                                                    <span className="font-mono text-teal-600 dark:text-teal-400 group-hover:underline">
                                                      Receipt #{tx.receiptNumber}
                                                    </span>
                                                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground font-semibold">
                                                      {formatCollegePaymentMode(tx.paymentMode)}
                                                    </span>
                                                    {tx.targetPeriod && (
                                                      <span className="text-[10px] bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-1.5 py-0.2 rounded font-medium">
                                                        {tx.targetPeriod}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                                    Paid on: <strong className="text-foreground">{format(new Date(tx.paymentDate + "T00:00:00"), "PPP")}</strong>
                                                    {tx.feeType && <span> • {tx.feeType}</span>}
                                                  </div>
                                                  {tx.discountAmount > 0 && (
                                                    <div className="text-[10px] text-emerald-600 font-medium">
                                                      Includes ₹{tx.discountAmount.toLocaleString()} concession/discount
                                                    </div>
                                                  )}
                                                </div>

                                                <div className="text-right flex items-center gap-2">
                                                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                                                    ₹{tx.amount.toLocaleString()}
                                                  </span>
                                                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 text-teal-600 transition-opacity" />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
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
                      <strong className="text-foreground">{pagination.totalRecords}</strong> students
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

      {/* College Fee Collection Dialog */}
      <CollegeReceiptDialog
        open={collectDialogOpen}
        onOpenChange={setCollectDialogOpen}
        initialStudentId={collectStudentId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["nursing"] });
        }}
      />

      {/* Receipt Inspection Preview Modal with Print & WhatsApp Sharing */}
      <Dialog
        open={!!selectedReceiptTx}
        onOpenChange={(open) => {
          if (!open) setSelectedReceiptTx(null);
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-160 max-h-[92dvh] p-0 flex flex-col overflow-hidden rounded-xl">
          {selectedReceiptTx && (
            <>
              <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
                <div className="border-b pb-3 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-teal-700 dark:text-teal-400">ACME College of Nursing</h2>
                    <p className="text-xs text-muted-foreground">Official Fee Payment Receipt</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 px-2 py-1 rounded font-bold border border-teal-200 dark:border-teal-800 block">
                      #{selectedReceiptTx.tx.receiptNumber}
                    </span>
                    <span className="text-[11px] text-muted-foreground block mt-1">
                      Date: {format(new Date(selectedReceiptTx.tx.paymentDate + "T00:00:00"), "PPP")}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-muted/20 p-3 rounded-lg border">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Student Name</span>
                    <span className="font-bold text-foreground text-sm">{selectedReceiptTx.student.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Enrollment No</span>
                    <span className="font-mono font-bold text-foreground">{selectedReceiptTx.student.enrollmentNo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Course & Batch</span>
                    <span className="font-medium text-foreground">{selectedReceiptTx.student.courseName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Payment Mode</span>
                    <span className="font-mono font-semibold uppercase text-foreground">
                      {formatCollegePaymentMode(selectedReceiptTx.tx.paymentMode)}
                    </span>
                  </div>
                </div>

                {/* Breakdown Items Table */}
                {(() => {
                  const parsed = parseTxRemarks(selectedReceiptTx.tx.remarks);
                  const items: any[] = Array.isArray(parsed?.items) ? parsed.items : [];
                  const gross = Number(parsed?.grossSubtotal || selectedReceiptTx.tx.grossAmount || 0);
                  const discount = Number(parsed?.discountAmount || selectedReceiptTx.tx.discountAmount || 0);
                  const surcharge = Number(parsed?.surchargeAmount || 0);
                  const advanceAdjusted = Number(parsed?.advanceAdjustedAmount || 0);

                  return (
                    <div className="space-y-3 font-sans">
                      {items.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full text-xs text-left border-collapse">
                            <thead>
                              <tr className="bg-muted/60 text-muted-foreground border-b font-semibold text-[11px]">
                                <th className="p-2 pl-3">Fee Head</th>
                                <th className="p-2">Covered Months</th>
                                <th className="p-2 text-center">Qty</th>
                                <th className="p-2 text-right">Rate/Mo</th>
                                <th className="p-2 text-right pr-3">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y text-xs">
                              {items.map((it: any, idx: number) => {
                                const headName = it.category || it.name || "Fee Head";
                                const months = it.selectedMonths || it.coveredMonths || it.periodLabel;
                                return (
                                  <tr key={idx} className="hover:bg-muted/30">
                                    <td className="p-2 pl-3 font-semibold text-foreground">{headName}</td>
                                    <td className="p-2">
                                      {months ? <MonthBoxList months={months} size="xs" /> : <span className="text-muted-foreground">-</span>}
                                    </td>
                                    <td className="p-2 text-center font-mono">{it.quantity || 1}</td>
                                    <td className="p-2 text-right font-mono">₹{Number(it.unitPrice || it.amount).toLocaleString()}</td>
                                    <td className="p-2 text-right pr-3 font-bold font-mono">₹{Number(it.amount).toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-3 border rounded-lg bg-card text-xs flex justify-between items-center">
                          <span className="font-semibold text-foreground">{selectedReceiptTx.tx.feeType || "Course Fee"}</span>
                          <span className="font-bold text-sm font-mono text-emerald-600">₹{selectedReceiptTx.tx.amount.toLocaleString()}</span>
                        </div>
                      )}

                      {/* Summary Breakup */}
                      <div className="bg-muted/30 p-3 rounded-lg border space-y-1.5 text-xs font-mono">
                        {gross > 0 && gross !== selectedReceiptTx.tx.amount && (
                          <div className="flex justify-between items-center text-muted-foreground">
                            <span>Gross Liability:</span>
                            <span>₹{gross.toLocaleString()}</span>
                          </div>
                        )}
                        {discount > 0 && (
                          <div className="flex justify-between items-center text-emerald-600">
                            <span>Concession / Discount:</span>
                            <span>-₹{discount.toLocaleString()}</span>
                          </div>
                        )}
                        {surcharge > 0 && (
                          <div className="flex justify-between items-center text-rose-600">
                            <span>Surcharge / Late Fine:</span>
                            <span>+₹{surcharge.toLocaleString()}</span>
                          </div>
                        )}
                        {advanceAdjusted > 0 && (
                          <div className="flex justify-between items-center text-teal-600">
                            <span>Advance Fee Offset:</span>
                            <span>-₹{advanceAdjusted.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-foreground font-bold text-sm pt-1 border-t">
                          <span>Total Amount Collected:</span>
                          <span className="text-emerald-600">₹{selectedReceiptTx.tx.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <DialogFooter className="p-3 sm:px-6 bg-muted/40 border-t flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 text-xs"
                    onClick={() => handlePrintReceipt(selectedReceiptTx.tx, selectedReceiptTx.student)}
                  >
                    <Printer size={14} /> Print A5 Receipt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1.5 text-xs"
                    onClick={() => handleDownloadReceipt(selectedReceiptTx.tx, selectedReceiptTx.student)}
                  >
                    <Download size={14} /> PDF
                  </Button>
                  {selectedReceiptTx.student.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1.5 text-xs text-emerald-700 border-emerald-300 dark:border-emerald-800"
                      onClick={() => {
                        const phone = selectedReceiptTx.student.phone.replace(/\D/g, "");
                        const text = encodeURIComponent(
                          `Official Fee Receipt - ACME College of Nursing\n` +
                          `Receipt No: ${selectedReceiptTx.tx.receiptNumber}\n` +
                          `Student: ${selectedReceiptTx.student.name} (${selectedReceiptTx.student.enrollmentNo})\n` +
                          `Amount Paid: Rs. ${selectedReceiptTx.tx.amount.toLocaleString()}\n` +
                          `Date: ${selectedReceiptTx.tx.paymentDate}\n` +
                          `Thank you for your payment.`
                        );
                        window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
                      }}
                    >
                      <Share2 size={14} /> WhatsApp
                    </Button>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedReceiptTx(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
