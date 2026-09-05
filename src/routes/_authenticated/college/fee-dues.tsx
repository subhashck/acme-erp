import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  CreditCard,
  Tag,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  expectedAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: "paid" | "partial" | "due";
}

interface ComponentDue {
  name: string;
  frequency: string;
  frequencyKey: string;
  expectedAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: "paid" | "partial" | "due";
  payments: ComponentPayment[];
  installments: InstallmentPeriod[];
}

interface YearlyComponentDue {
  academicYear: string;
  yearNumber: number;
  totalExpected: number;
  totalPaid: number;
  totalDue: number;
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
  totalFee: number;
  paidAmount: number;
  balanceDue: number;
  totalDiscountConcessions?: number;
  termStartDate: string | null;
  feeDueDate: string | null;
  dueStatus: "paid" | "upcoming" | "overdue";
  daysDiffText: string;
  termDetails?: TermDetail[];
  componentDues?: ComponentDue[];
  yearlyComponentDues?: YearlyComponentDue[];
  paymentHistory?: PaymentHistoryItem[];
}

function StudentFeeDueTrackingPage() {
  const [selectedBatchFilter, setSelectedBatchFilter] = React.useState<number>(0);
  const [dueStatusFilter, setDueStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = React.useState<string>("");
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(20);
  const [expandedStudentIds, setExpandedStudentIds] = React.useState<Record<number, boolean>>({});
  const [expandedCompKeys, setExpandedCompKeys] = React.useState<Record<string, boolean>>({});

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
  }, [selectedBatchFilter, dueStatusFilter]);

  const { data: batches = [] } = useQuery<any[]>({
    queryKey: ["nursing", "batches"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/batches");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: dueDashboard, isLoading: isLoadingDashboard } = useQuery<{
    batchSummaries: BatchSummary[];
    studentDues: StudentDue[];
    pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
    metrics: { totalStudents: number; totalExpected: number; totalCollected: number; totalBalanceDue: number; overdueCount: number };
  }>({
    queryKey: ["nursing", "fees", "due-dashboard", selectedBatchFilter, debouncedSearch, dueStatusFilter, currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBatchFilter > 0) params.append("batchId", String(selectedBatchFilter));
      params.append("page", String(currentPage));
      params.append("pageSize", String(pageSize));
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (dueStatusFilter !== "all") params.append("dueStatus", dueStatusFilter);
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

  // Calculate high-level metrics from server-provided aggregates
  const totalStudents = metrics?.totalStudents || 0;
  const totalExpected = metrics?.totalExpected || 0;
  const totalCollected = metrics?.totalCollected || 0;
  const totalBalanceDue = metrics?.totalBalanceDue || 0;
  const overdueCount = metrics?.overdueCount || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-teal-600" />
            Student Fee Due & Payment Tracking
          </h1>
          <p className="text-sm text-muted-foreground">
            Track individual student fee schedules, detailed payment receipts, semester due dates, and overdue timelines.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
          <Button variant="outline" asChild size="sm">
            <Link to="/college/fees" className="flex items-center gap-1.5 text-xs text-teal-600 border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950">
              <ExternalLink size={14} /> Record Payment
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
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
              <p className="text-xs font-medium text-muted-foreground">Total Expected Fees</p>
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
              <p className="text-xs font-medium text-muted-foreground">Outstanding Due Balance</p>
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
        <CardHeader className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Student-Level Fee & Due Schedule</CardTitle>
            <CardDescription>Click on any student row or expand details to inspect chronological term due dates and paid transactions</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search student or enrollment no..."
                className="pl-8 pr-3 py-1.5 border rounded-md text-xs bg-background w-48 sm:w-64"
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
              value={dueStatusFilter}
              onChange={(e) => setDueStatusFilter(e.target.value)}
            >
              <option value="all">All Due Statuses</option>
              <option value="overdue">Overdue Only</option>
              <option value="upcoming">Upcoming Due</option>
              <option value="paid">Fully Paid</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingDashboard ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading student fee dues...</div>
          ) : (dueDashboard?.studentDues || []).length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No student fee records found matching filter criteria.</div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <th className="p-3 w-8"></th>
                      <th className="p-3">Enrollment No</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Batch & Quota</th>
                      <th className="p-3">Total Expected</th>
                      <th className="p-3">Paid Amount</th>
                      <th className="p-3">Balance Due</th>
                      <th className="p-3">Next / Active Due Date</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(dueDashboard?.studentDues || []).map((st) => {
                    const isExpanded = !!expandedStudentIds[st.studentId];
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
                            <div className="font-medium text-foreground">{st.name}</div>
                            <div className="text-xs text-muted-foreground">{st.phone}</div>
                          </td>
                          <td className="p-3 font-medium text-xs">
                            <div>{st.batchName}</div>
                            <div className="text-muted-foreground capitalize">{st.quotaCategory} Quota</div>
                          </td>
                          <td className="p-3 font-medium">₹{st.totalFee.toLocaleString()}</td>
                          <td className="p-3 text-emerald-600 dark:text-emerald-400 font-medium">
                            ₹{st.paidAmount.toLocaleString()}
                          </td>
                          <td className="p-3 font-bold text-foreground">
                            {st.balanceDue > 0 ? (
                              <span className="text-rose-600 dark:text-rose-400">₹{st.balanceDue.toLocaleString()}</span>
                            ) : (
                              <span className="text-emerald-600 dark:text-emerald-400">₹0</span>
                            )}
                          </td>
                          <td className="p-3 font-medium text-xs">
                            {st.feeDueDate ? format(new Date(st.feeDueDate + "T00:00:00"), "PPP") : "N/A"}
                          </td>
                          <td className="p-3">
                            {st.dueStatus === "paid" && (
                              <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded text-xs font-medium inline-block">
                                ● Fully Paid
                              </span>
                            )}
                            {st.dueStatus === "upcoming" && (
                              <span className="text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded text-xs font-medium inline-block">
                                ● {st.daysDiffText}
                              </span>
                            )}
                            {st.dueStatus === "overdue" && (
                              <span className="text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded text-xs font-medium inline-block">
                                ● {st.daysDiffText}
                              </span>
                            )}
                          </td>
                        </tr>

                        {/* Inline Expanded Row */}
                        {isExpanded && (
                          <tr className="bg-muted/15 border-b">
                            <td colSpan={9} className="p-4 pl-10 pr-6">
                              <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-lg border">
                                  <div className="flex items-center gap-4 text-xs">
                                    <div>
                                      <span className="text-muted-foreground block text-[11px]">Gross Course Liability</span>
                                      <strong className="text-foreground">₹{st.totalFee.toLocaleString()}</strong>
                                    </div>
                                    {Number(st.totalDiscountConcessions || 0) > 0 && (
                                      <div>
                                        <span className="text-emerald-600 block text-[11px]">Scholarships / Discounts</span>
                                        <strong className="text-emerald-600">-₹{Number(st.totalDiscountConcessions).toLocaleString()}</strong>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-muted-foreground block text-[11px]">Total Paid So Far</span>
                                      <strong className="text-emerald-600">₹{st.paidAmount.toLocaleString()}</strong>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground block text-[11px]">Current Outstanding Due</span>
                                      <strong className={st.balanceDue > 0 ? "text-rose-600 text-sm" : "text-emerald-600 text-sm"}>
                                        ₹{st.balanceDue.toLocaleString()}
                                      </strong>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <Button size="sm" asChild variant="outline" className="h-7 text-xs">
                                      <Link to="/college/student/$id" params={{ id: String(st.studentId) }}>
                                        Student Profile
                                      </Link>
                                    </Button>
                                    {st.balanceDue > 0 && (
                                      <Button size="sm" asChild className="h-7 text-xs bg-teal-600 text-white hover:bg-teal-700">
                                        <Link to="/college/fees">
                                          Collect Payment
                                        </Link>
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  {/* Fee Types Due Tabular Breakdown Per Academic Year */}
                                  <div className="border rounded-lg p-3 bg-card space-y-3">
                                    <div className="flex items-center justify-between pb-1.5 border-b text-xs font-semibold text-foreground">
                                      <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                                        <Tag size={14} /> Fee Types & Component-wise Breakdown (Per Academic Year)
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
                                                <span>Academic Year {yearGroup.academicYear}</span>
                                              </div>
                                              <div className="flex items-center gap-3 text-[11px]">
                                                <span>Expected: <strong>₹{yearGroup.totalExpected.toLocaleString()}</strong></span>
                                                <span>Paid: <strong className="text-emerald-600">₹{yearGroup.totalPaid.toLocaleString()}</strong></span>
                                                <span>Due: <strong className={yearGroup.totalDue > 0 ? "text-rose-600" : "text-emerald-600"}>₹{yearGroup.totalDue.toLocaleString()}</strong></span>
                                              </div>
                                            </div>

                                            <table className="w-full text-xs text-left">
                                              <thead className="bg-muted/30 text-muted-foreground font-semibold border-b text-[11px]">
                                                <tr>
                                                  <th className="p-2 pl-3 w-6"></th>
                                                  <th className="p-2">Fee Type / Component</th>
                                                  <th className="p-2">Payment Schedule</th>
                                                  <th className="p-2 text-right">Expected Fee</th>
                                                  <th className="p-2 text-right">Paid Amount</th>
                                                  <th className="p-2 text-right">Outstanding Due</th>
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
                                                            <span className="text-rose-600">₹{comp.dueAmount.toLocaleString()}</span>
                                                          ) : (
                                                            <span className="text-emerald-600">₹0</span>
                                                          )}
                                                        </td>
                                                        <td className="p-2 pr-3">
                                                          {comp.status === "paid" && (
                                                            <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded text-[10px] font-medium inline-block">
                                                              ● Fully Paid
                                                            </span>
                                                          )}
                                                          {comp.status === "partial" && (
                                                            <span className="text-amber-600 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded text-[10px] font-medium inline-block">
                                                              ● Partially Paid
                                                            </span>
                                                          )}
                                                          {comp.status === "due" && (
                                                            <span className="text-rose-600 bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded text-[10px] font-medium inline-block">
                                                              ● Due
                                                            </span>
                                                          )}
                                                        </td>
                                                      </tr>

                                                      {/* Expanded Component Details */}
                                                      {isCompExpanded && (
                                                        <tr className="bg-muted/10">
                                                          <td colSpan={7} className="p-0">
                                                            <div className="px-6 py-3 space-y-3 border-t border-dashed">
                                                              {/* Installment Period Breakdown */}
                                                              {comp.installments?.length > 0 && comp.frequencyKey !== "annually" && comp.frequencyKey !== "one_time" && (
                                                                <div>
                                                                  <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                                    <CalendarDays size={11} className="text-teal-600" /> Period-wise Breakdown
                                                                  </h5>
                                                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-1.5">
                                                                    {comp.installments.map((inst, iIdx) => (
                                                                      <div
                                                                        key={iIdx}
                                                                        className={cn(
                                                                          "p-2 rounded border text-[11px]",
                                                                          inst.status === "paid" && "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900",
                                                                          inst.status === "partial" && "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900",
                                                                          inst.status === "due" && "bg-muted/30 border-muted"
                                                                        )}
                                                                      >
                                                                        <div className="font-semibold text-foreground truncate">{inst.period}</div>
                                                                        <div className="flex items-center justify-between mt-1 text-[10px]">
                                                                          <span className="text-muted-foreground">₹{inst.expectedAmount.toLocaleString()}</span>
                                                                          {inst.status === "paid" ? (
                                                                            <span className="text-emerald-600 font-medium">✓ Paid</span>
                                                                          ) : inst.status === "partial" ? (
                                                                            <span className="text-amber-600 font-medium">₹{inst.dueAmount.toLocaleString()} due</span>
                                                                          ) : (
                                                                            <span className="text-rose-500 font-medium">Due</span>
                                                                          )}
                                                                        </div>
                                                                      </div>
                                                                    ))}
                                                                  </div>
                                                                </div>
                                                              )}

                                                              {/* Payment Receipts */}
                                                              {comp.payments?.length > 0 ? (
                                                                <div>
                                                                  <h5 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                                    <Receipt size={11} className="text-teal-600" /> Payment Receipts ({comp.payments.length})
                                                                  </h5>
                                                                  <div className="space-y-1">
                                                                    {comp.payments.map((pmt, pIdx) => (
                                                                      <div
                                                                        key={pIdx}
                                                                        className="flex items-center justify-between text-[11px] p-1.5 rounded bg-card border"
                                                                      >
                                                                        <div className="flex items-center gap-3">
                                                                          <span className="font-mono font-semibold text-teal-600 dark:text-teal-400">
                                                                            #{pmt.receiptNumber}
                                                                          </span>
                                                                          <span className="text-muted-foreground">
                                                                            {format(new Date(pmt.paymentDate + "T00:00:00"), "PP")}
                                                                          </span>
                                                                          <span className="uppercase font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                                            {pmt.paymentMode}
                                                                          </span>
                                                                          {pmt.targetPeriod && (
                                                                            <span className="text-[10px] bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-1.5 py-0.5 rounded font-medium">
                                                                              {pmt.targetPeriod}
                                                                            </span>
                                                                          )}
                                                                          {pmt.isProportional && (
                                                                            <span className="text-[10px] text-muted-foreground italic">(proportional)</span>
                                                                          )}
                                                                        </div>
                                                                        <span className="font-bold text-emerald-600">₹{pmt.amount.toLocaleString()}</span>
                                                                      </div>
                                                                    ))}
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
                                    {/* Semester / Term Due Date Schedule */}
                                    <div className="border rounded-lg p-3 bg-card space-y-2">
                                      <div className="flex items-center justify-between pb-1.5 border-b text-xs font-semibold text-foreground">
                                        <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                                          <CalendarDays size={14} /> Scheduled Terms & Due Dates
                                        </span>
                                        <span className="text-muted-foreground font-normal text-[11px]">
                                          {(st.termDetails || []).length} Terms
                                        </span>
                                      </div>

                                      {(st.termDetails || []).length === 0 ? (
                                        <p className="text-xs text-muted-foreground py-2">No specific term schedules configured.</p>
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
                                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200 font-medium">
                                                      {term.daysDiffText}
                                                    </span>
                                                  ) : term.status === "paid" ? (
                                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 font-medium">
                                                      Paid
                                                    </span>
                                                  ) : (
                                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 font-medium">
                                                      {term.daysDiffText}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                                  Due Date: <strong className="text-foreground">{format(new Date(term.feeDueDate + "T00:00:00"), "PPP")}</strong>
                                                  {" • "}
                                                  Start: {format(new Date(term.startDate + "T00:00:00"), "PP")}
                                                </div>
                                              </div>

                                              <div className="text-right">
                                                <span className="font-bold text-foreground">₹{term.expectedFee.toLocaleString()}</span>
                                                <span className="block text-[10px] text-muted-foreground">Target: ₹{term.cumulativeExpected.toLocaleString()}</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                    {/* Recorded Fee Transactions Ledger */}
                                    <div className="border rounded-lg p-3 bg-card space-y-2">
                                      <div className="flex items-center justify-between pb-1.5 border-b text-xs font-semibold text-foreground">
                                        <span className="flex items-center gap-1.5 text-teal-700 dark:text-teal-400">
                                          <Receipt size={14} /> Recorded Fee Payments
                                        </span>
                                        <span className="text-muted-foreground font-normal text-[11px]">
                                          {(st.paymentHistory || []).length} Transactions (₹{st.paidAmount.toLocaleString()})
                                        </span>
                                      </div>

                                      {(st.paymentHistory || []).length === 0 ? (
                                        <p className="text-xs text-muted-foreground py-4 text-center">No fee payments recorded yet.</p>
                                      ) : (
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                          {(st.paymentHistory || []).map((tx) => (
                                            <div
                                              key={tx.id}
                                              className="p-2.5 rounded-lg border bg-card text-xs flex justify-between items-center"
                                            >
                                              <div>
                                                <div className="font-semibold text-foreground flex items-center gap-2">
                                                  <span>Receipt #{tx.receiptNumber}</span>
                                                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                                    {tx.paymentMode}
                                                  </span>
                                                  {tx.targetPeriod && (
                                                    <span className="text-[10px] bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-1.5 py-0.2 rounded font-medium">
                                                      {tx.targetPeriod}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                                  Paid on: <strong className="text-foreground">{format(new Date(tx.paymentDate + "T00:00:00"), "PPP")}</strong>
                                                  {tx.feeType && <span> • {tx.feeType.replace(/tuition/gi, "Course Fee")}</span>}
                                                </div>
                                                {tx.discountAmount > 0 && (
                                                  <div className="text-[10px] text-emerald-600 font-medium">
                                                    Includes ₹{tx.discountAmount.toLocaleString()} concession/discount
                                                  </div>
                                                )}
                                              </div>

                                              <div className="text-right">
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                  ₹{tx.amount.toLocaleString()}
                                                </span>
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
  </div>
  );
}
