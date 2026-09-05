import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users,
  Plus,
  Search,
  UserCheck,
  GraduationCap,
  FileText,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  DollarSign,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  UserPlus,
  Sparkles,
  CreditCard,
  Receipt,
  Clock,
  ArrowUpRight,
  History,
  Check,
  X,
  Info,
  Wallet,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
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
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Route Definition
// ---------------------------------------------------------------------------
export const Route = createFileRoute("/_authenticated/college/referrers")({
  component: ReferrersMasterPage,
});

// ---------------------------------------------------------------------------
// Schema & Types
// ---------------------------------------------------------------------------
const referrerFormSchema = z.object({
  name: z.string().min(1, "Referrer full name is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")).nullable(),
  address: z.string().optional().nullable(),
  comments: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

type ReferrerFormValues = z.infer<typeof referrerFormSchema>;

export interface ReferredCandidate {
  id: number;
  name: string;
  applicationNo?: string;
  enrollmentNo?: string;
  status: string;
  referralAmount?: string | null;
  referralComments?: string | null;
  promisedAmount: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: "paid" | "partial" | "unpaid" | "no_dues";
}

export interface ReferrerRecord {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  comments?: string | null;
  active: boolean;
  referredApplicantsCount: number;
  referredStudentsCount: number;
  totalReferralAmount: number; // backward compatibility
  totalCommission: number;
  totalPaid: number;
  balanceDue: number;
  paymentStatus: "paid" | "partial" | "unpaid" | "no_dues";
  paymentCount: number;
  applicants?: ReferredCandidate[];
  students?: ReferredCandidate[];
  createdAt: string;
  updatedAt: string;
}

export interface ReferrerPaymentAllocation {
  id: number;
  paymentId: number;
  studentId?: number | null;
  applicantId?: number | null;
  amount: string | number;
  notes?: string | null;
  studentName?: string | null;
  studentEnrollmentNo?: string | null;
  applicantName?: string | null;
  applicantApplicationNo?: string | null;
}

export interface ReferrerPaymentRecord {
  id: number;
  referrerId: number;
  voucherNo: string;
  paymentDate: string;
  amount: string | number;
  paymentMode: string;
  referenceNumber?: string | null;
  notes?: string | null;
  paidBy?: string | null;
  paidByName?: string | null;
  createdAt: string;
  allocations: ReferrerPaymentAllocation[];
}

export interface ReferrerSummary {
  totalReferrers: number;
  activeReferrers: number;
  totalReferredApplicants: number;
  totalReferredStudents: number;
  totalReferralAmount: number;
  totalPaidAmount: number;
  totalBalanceDue: number;
}

// ---------------------------------------------------------------------------
// Payment Status Badge Component
// ---------------------------------------------------------------------------
function PaymentStatusBadge({ status, className }: { status?: string; className?: string }) {
  switch (status) {
    case "paid":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800",
            className
          )}
        >
          <CheckCircle2 size={11} className="shrink-0 text-emerald-600" /> Fully Paid
        </span>
      );
    case "partial":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800",
            className
          )}
        >
          <Clock size={11} className="shrink-0 text-amber-600" /> Partially Paid
        </span>
      );
    case "unpaid":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800",
            className
          )}
        >
          <AlertTriangle size={11} className="shrink-0 text-rose-600" /> Unpaid
        </span>
      );
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-800",
            className
          )}
        >
          No Dues
        </span>
      );
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ReferrersMasterPage() {
  const queryClient = useQueryClient();

  // Search & Filter States
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Modal States
  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [viewModalOpen, setViewModalOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [activeReferrer, setActiveReferrer] = React.useState<ReferrerRecord | null>(null);
  const [viewActiveTab, setViewActiveTab] = React.useState<"candidates" | "payments">("candidates");

  // Payment Recording State
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [paymentReferrer, setPaymentReferrer] = React.useState<ReferrerRecord | null>(null);
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [paymentMode, setPaymentMode] = React.useState<string>("bank_transfer");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [paymentNotes, setPaymentNotes] = React.useState("");
  const [allocationsState, setAllocationsState] = React.useState<
    Record<string, { enabled: boolean; amount: number; notes: string; candidateName: string; type: "student" | "applicant"; id: number }>
  >({});

  // Debounce search
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page when status filter changes
  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  // Fetch Referrers
  const { data: responseData, isLoading, isFetching } = useQuery<{
    data: ReferrerRecord[];
    pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
    summary?: ReferrerSummary;
  }>({
    queryKey: ["nursing", "referrers", debouncedSearch, statusFilter, currentPage, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "all") params.set("active", statusFilter === "active" ? "true" : "false");
      params.set("page", String(currentPage));
      params.set("pageSize", String(pageSize));
      const res = await fetch(`/api/nursing/referrers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch referrers");
      const json = await res.json();
      if (Array.isArray(json)) {
        return {
          data: json,
          pagination: { page: 1, pageSize: json.length, totalRecords: json.length, totalPages: 1 },
          summary: {
            totalReferrers: json.length,
            activeReferrers: json.filter((r) => r.active).length,
            totalReferredApplicants: json.reduce((sum, r) => sum + (r.referredApplicantsCount || 0), 0),
            totalReferredStudents: json.reduce((sum, r) => sum + (r.referredStudentsCount || 0), 0),
            totalReferralAmount: json.reduce((sum, r) => sum + (r.totalCommission || r.totalReferralAmount || 0), 0),
            totalPaidAmount: json.reduce((sum, r) => sum + (r.totalPaid || 0), 0),
            totalBalanceDue: json.reduce((sum, r) => sum + (r.balanceDue || 0), 0),
          },
        };
      }
      return json;
    },
  });

  const referrers = responseData?.data || [];
  const pagination = responseData?.pagination;
  const summary = responseData?.summary;

  // Fetch Payment History for Active Referrer in Profile View Modal
  const { data: activeReferrerPayments = [], isLoading: isLoadingPayments, refetch: refetchPayments } = useQuery<
    ReferrerPaymentRecord[]
  >({
    queryKey: ["nursing", "referrers", activeReferrer?.id, "payments"],
    queryFn: async () => {
      if (!activeReferrer) return [];
      const res = await fetch(`/api/nursing/referrers/${activeReferrer.id}/payments`);
      if (!res.ok) throw new Error("Failed to fetch payment history");
      return res.json();
    },
    enabled: Boolean(viewModalOpen && activeReferrer),
  });

  // Forms
  const addForm = useForm<ReferrerFormValues>({
    resolver: zodResolver(referrerFormSchema) as any,
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      comments: "",
      active: true,
    },
  });

  const editForm = useForm<ReferrerFormValues>({
    resolver: zodResolver(referrerFormSchema) as any,
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      comments: "",
      active: true,
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (values: ReferrerFormValues) => {
      const res = await fetch("/api/nursing/referrers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create referrer");
      }
      return res.json();
    },
    onSuccess: (created) => {
      toast.success(`Referrer "${created.name}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: ["nursing", "referrers"] });
      setAddModalOpen(false);
      addForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create referrer");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: ReferrerFormValues }) => {
      const res = await fetch(`/api/nursing/referrers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update referrer");
      }
      return res.json();
    },
    onSuccess: (updated) => {
      toast.success(`Referrer "${updated.name}" updated successfully!`);
      queryClient.invalidateQueries({ queryKey: ["nursing", "referrers"] });
      setEditModalOpen(false);
      setActiveReferrer(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update referrer");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/nursing/referrers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete referrer");
      }
      return res.json();
    },
    onSuccess: (res) => {
      toast.success(res.message || "Referrer processed successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "referrers"] });
      setDeleteConfirmOpen(false);
      setActiveReferrer(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete referrer");
    },
  });

  // Record Payment Mutation
  const recordPaymentMutation = useMutation({
    mutationFn: async ({ referrerId, payload }: { referrerId: number; payload: any }) => {
      const res = await fetch(`/api/nursing/referrers/${referrerId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: (res) => {
      toast.success(`Payment voucher "${res.voucherNo}" of ₹${Number(res.amount).toLocaleString()} recorded successfully!`);
      queryClient.invalidateQueries({ queryKey: ["nursing", "referrers"] });
      if (activeReferrer) {
        refetchPayments();
      }
      setPaymentModalOpen(false);
      setPaymentReferrer(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record payment");
    },
  });

  // Delete Payment Voucher Mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const res = await fetch(`/api/nursing/referrers/payments/${paymentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete payment voucher");
      }
      return res.json();
    },
    onSuccess: (res) => {
      toast.success(res.message || "Payment voucher deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "referrers"] });
      refetchPayments();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete payment voucher");
    },
  });

  // Aggregate Metrics
  const totalReferrers = summary?.totalReferrers ?? referrers.length;
  const activeReferrers = summary?.activeReferrers ?? referrers.filter((r) => r.active).length;
  const totalCommission = summary?.totalReferralAmount ?? referrers.reduce((sum, r) => sum + (r.totalCommission || 0), 0);
  const totalPaid = summary?.totalPaidAmount ?? referrers.reduce((sum, r) => sum + (r.totalPaid || 0), 0);
  const totalBalanceDue = summary?.totalBalanceDue ?? referrers.reduce((sum, r) => sum + (r.balanceDue || 0), 0);

  const handleOpenEdit = (ref: ReferrerRecord) => {
    setActiveReferrer(ref);
    editForm.reset({
      name: ref.name,
      phone: ref.phone || "",
      email: ref.email || "",
      address: ref.address || "",
      comments: ref.comments || "",
      active: ref.active,
    });
    setEditModalOpen(true);
  };

  const handleOpenView = (ref: ReferrerRecord) => {
    setActiveReferrer(ref);
    setViewActiveTab("candidates");
    setViewModalOpen(true);
  };

  // Open Payment Recording Modal
  const handleOpenPayment = (ref: ReferrerRecord) => {
    setPaymentReferrer(ref);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMode("bank_transfer");
    setReferenceNumber("");
    setPaymentNotes("");

    // Initialize allocations state from students and applicants
    const initialAlloc: Record<
      string,
      { enabled: boolean; amount: number; notes: string; candidateName: string; type: "student" | "applicant"; id: number }
    > = {};

    (ref.students || []).forEach((st) => {
      const key = `student_${st.id}`;
      const defaultAmt = st.balanceDue > 0 ? st.balanceDue : 0;
      initialAlloc[key] = {
        enabled: st.balanceDue > 0,
        amount: defaultAmt,
        notes: "",
        candidateName: `${st.name} (${st.enrollmentNo})`,
        type: "student",
        id: st.id,
      };
    });

    (ref.applicants || []).forEach((ap) => {
      if (ap.status !== "converted") {
        const key = `applicant_${ap.id}`;
        const defaultAmt = ap.balanceDue > 0 ? ap.balanceDue : 0;
        initialAlloc[key] = {
          enabled: ap.balanceDue > 0,
          amount: defaultAmt,
          notes: "",
          candidateName: `${ap.name} (${ap.applicationNo})`,
          type: "applicant",
          id: ap.id,
        };
      }
    });

    setAllocationsState(initialAlloc);
    setPaymentModalOpen(true);
  };

  // Compute live total payment amount in modal
  const totalAllocatedAmount = Object.values(allocationsState)
    .filter((a) => a.enabled && a.amount > 0)
    .reduce((sum, a) => sum + Number(a.amount || 0), 0);

  const handleSavePayment = () => {
    if (!paymentReferrer) return;
    if (totalAllocatedAmount <= 0) {
      toast.error("Please enter a payment amount greater than ₹0 for at least one candidate.");
      return;
    }

    const allocations = Object.entries(allocationsState)
      .filter(([_, val]) => val.enabled && val.amount > 0)
      .map(([_, val]) => ({
        studentId: val.type === "student" ? val.id : undefined,
        applicantId: val.type === "applicant" ? val.id : undefined,
        amount: val.amount,
        notes: val.notes?.trim() || undefined,
      }));

    recordPaymentMutation.mutate({
      referrerId: paymentReferrer.id,
      payload: {
        paymentDate,
        amount: totalAllocatedAmount,
        paymentMode,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: paymentNotes.trim() || undefined,
        allocations,
      },
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              Referrals & Agents Master
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              ACON Masters
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage consultants, agents, alumni, commission tracking, and payout settlements for student admissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              addForm.reset({
                name: "",
                phone: "",
                email: "",
                address: "",
                comments: "",
                active: true,
              });
              setAddModalOpen(true);
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-xs"
          >
            <UserPlus size={16} />
            Add New Referrer
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Referrers */}
        <Card className="border-teal-200 dark:border-teal-900 bg-gradient-to-br from-card to-teal-50/30 dark:to-teal-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Partners</p>
              <h3 className="text-2xl font-bold text-foreground mt-1">{totalReferrers}</h3>
              <p className="text-[11px] text-teal-700 dark:text-teal-300 mt-0.5 font-medium">
                {activeReferrers} active referral partners
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-700 dark:text-teal-300 shrink-0">
              <Users size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Total Commission Promised */}
        <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-card to-blue-50/30 dark:to-blue-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Promised Payout</p>
              <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                ₹{totalCommission.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">Calculated from student admissions</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-700 dark:text-blue-300 shrink-0">
              <FileText size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Total Paid */}
        <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-card to-emerald-50/30 dark:to-emerald-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Settled / Paid Amount</p>
              <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                ₹{totalPaid.toLocaleString()}
              </h3>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5 font-medium">
                Vouchers recorded to agents
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
              <Wallet size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Balance Due */}
        <Card className="border-amber-200 dark:border-amber-900 bg-gradient-to-br from-card to-amber-50/30 dark:to-amber-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Outstanding Balance Due</p>
              <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                ₹{totalBalanceDue.toLocaleString()}
              </h3>
              <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5 font-medium">
                Pending payouts to be settled
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shrink-0">
              <DollarSign size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search referrer by name, phone, email, address, or comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-input bg-background focus:outline-hidden focus:ring-1 focus:ring-teal-500 h-9"
              />
            </div>

            <div className="w-full sm:w-[160px]">
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Referrers</SelectItem>
                  <SelectItem value="active" className="text-xs">Active Only</SelectItem>
                  <SelectItem value="inactive" className="text-xs">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchQuery || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCurrentPage(1);
                }}
                className="text-xs h-9 text-muted-foreground hover:text-foreground"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Referrers Table */}
      <Card>
        <CardHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-semibold">Referral Partners Directory</CardTitle>
              <CardDescription className="text-xs">
                {pagination
                  ? `Showing ${pagination.totalRecords === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1} to ${Math.min(pagination.page * pagination.pageSize, pagination.totalRecords)} of ${pagination.totalRecords} referral partners`
                  : `Showing ${referrers.length} referral partners`}
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
                  <th className="p-3">Referrer Name</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3 text-center">Leads / Students</th>
                  <th className="p-3 text-right">Promised Payout</th>
                  <th className="p-3 text-right">Total Paid</th>
                  <th className="p-3 text-right">Balance Due</th>
                  <th className="p-3 text-center">Payout Status</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      Loading referrers directory...
                    </td>
                  </tr>
                ) : referrers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No referrers found. Click &quot;Add New Referrer&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  referrers.map((ref) => (
                    <tr key={ref.id} className="hover:bg-muted/30 transition-colors">
                      {/* Name */}
                      <td className="p-3 font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-xs shrink-0 border border-teal-200 dark:border-teal-800">
                            {ref.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold block">{ref.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">ID: #{ref.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="p-3">
                        <div className="space-y-0.5">
                          {ref.phone && (
                            <div className="flex items-center gap-1 text-foreground font-mono">
                              <Phone size={11} className="text-teal-600 shrink-0" />
                              <span>{ref.phone}</span>
                            </div>
                          )}
                          {ref.email && (
                            <div className="flex items-center gap-1 text-muted-foreground truncate max-w-[140px]">
                              <Mail size={11} className="text-blue-500 shrink-0" />
                              <span title={ref.email}>{ref.email}</span>
                            </div>
                          )}
                          {!ref.phone && !ref.email && <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>

                      {/* Referred Leads & Students */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                            title="Pipeline Leads"
                          >
                            <FileText size={10} />
                            {ref.referredApplicantsCount}
                          </span>
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            title="Enrolled Students"
                          >
                            <GraduationCap size={10} />
                            {ref.referredStudentsCount}
                          </span>
                        </div>
                      </td>

                      {/* Total Promised Payout */}
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        ₹{Number(ref.totalCommission || 0).toLocaleString()}
                      </td>

                      {/* Total Paid */}
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(ref.totalPaid || 0).toLocaleString()}
                      </td>

                      {/* Balance Due */}
                      <td className="p-3 text-right font-mono font-bold text-amber-700 dark:text-amber-400">
                        {ref.balanceDue > 0 ? (
                          `₹${Number(ref.balanceDue).toLocaleString()}`
                        ) : (
                          <span className="text-muted-foreground font-normal">₹0</span>
                        )}
                      </td>

                      {/* Payout Status */}
                      <td className="p-3 text-center">
                        <PaymentStatusBadge status={ref.paymentStatus} />
                      </td>

                      {/* Status */}
                      <td className="p-3 text-center">
                        {ref.active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-800">
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Make Payment Button */}
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-teal-600 hover:bg-teal-700 text-white gap-1 px-2 shadow-xs"
                            onClick={() => handleOpenPayment(ref)}
                            title="Make Payment / Record Payout"
                          >
                            <CreditCard size={12} /> Pay
                          </Button>

                          {/* View Details / Payouts */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 px-2"
                            onClick={() => handleOpenView(ref)}
                            title="View Leads & Payment History"
                          >
                            <Users size={12} className="mr-1" /> Profile
                          </Button>

                          {/* Edit */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(ref)}
                            title="Edit Partner"
                          >
                            <Edit size={13} />
                          </Button>

                          {/* Delete */}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                            onClick={() => {
                              setActiveReferrer(ref);
                              setDeleteConfirmOpen(true);
                            }}
                            title="Delete or Deactivate"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Controls */}
          {pagination && pagination.totalRecords > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t text-xs text-muted-foreground">
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
                  <strong className="text-foreground">{pagination.totalRecords}</strong> referrers
                </span>

                <div className="flex items-center gap-1.5 pl-2 border-l">
                  <span>Per page:</span>
                  <select
                    className="border rounded px-1.5 py-0.5 text-xs bg-background text-foreground cursor-pointer"
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
        </CardContent>
      </Card>

      {/* Record Payment to Referrer Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[92vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b bg-teal-50/40 dark:bg-teal-950/20">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-teal-800 dark:text-teal-300">
                  <CreditCard className="h-5 w-5 text-teal-600" />
                  Record Payment to Referrer
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Pay commissions against single or multiple referred students / leads.
                </DialogDescription>
              </div>
              {paymentReferrer && (
                <div className="text-right">
                  <span className="text-xs font-bold text-foreground block">{paymentReferrer.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">ID: #{paymentReferrer.id}</span>
                </div>
              )}
            </div>
          </DialogHeader>

          {paymentReferrer && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Partner Balance Banner */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-lg border bg-muted/30">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Total Commission</span>
                  <span className="text-sm font-bold text-foreground">
                    ₹{Number(paymentReferrer.totalCommission || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Already Settled</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{Number(paymentReferrer.totalPaid || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Current Balance Due</span>
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    ₹{Number(paymentReferrer.balanceDue || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Candidate Allocation Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <GraduationCap size={14} className="text-teal-600" />
                    Select Candidates & Allocate Payout Amount
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] px-2 text-teal-600 hover:text-teal-700"
                      onClick={() => {
                        const updated = { ...allocationsState };
                        Object.keys(updated).forEach((k) => {
                          updated[k].enabled = true;
                        });
                        setAllocationsState(updated);
                      }}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        const updated = { ...allocationsState };
                        Object.keys(updated).forEach((k) => {
                          updated[k].enabled = false;
                        });
                        setAllocationsState(updated);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                {Object.keys(allocationsState).length === 0 ? (
                  <div className="p-4 text-center rounded-lg border bg-muted/20 text-muted-foreground italic">
                    No referred candidates found for this partner.
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/50 text-muted-foreground border-b font-semibold text-[11px]">
                          <th className="p-2 w-8 text-center">Pay</th>
                          <th className="p-2">Candidate & Type</th>
                          <th className="p-2 text-right">Promised</th>
                          <th className="p-2 text-right">Paid</th>
                          <th className="p-2 text-right">Balance</th>
                          <th className="p-2 text-right w-36">This Payment (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {Object.entries(allocationsState).map(([key, item]) => {
                          // Find source candidate record
                          const candidate =
                            item.type === "student"
                              ? paymentReferrer.students?.find((s) => s.id === item.id)
                              : paymentReferrer.applicants?.find((a) => a.id === item.id);

                          const promised = candidate?.promisedAmount ?? 0;
                          const paid = candidate?.paidAmount ?? 0;
                          const balance = candidate?.balanceDue ?? 0;

                          return (
                            <tr
                              key={key}
                              className={cn(
                                "hover:bg-muted/20 transition-colors",
                                item.enabled ? "bg-teal-50/20 dark:bg-teal-950/10" : "opacity-60"
                              )}
                            >
                              <td className="p-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={item.enabled}
                                  onChange={(e) => {
                                    setAllocationsState((prev) => ({
                                      ...prev,
                                      [key]: {
                                        ...prev[key],
                                        enabled: e.target.checked,
                                        amount: e.target.checked && prev[key].amount === 0 ? balance : prev[key].amount,
                                      },
                                    }));
                                  }}
                                  className="h-4 w-4 rounded text-teal-600 cursor-pointer"
                                />
                              </td>
                              <td className="p-2">
                                <div className="font-semibold text-foreground">{item.candidateName}</div>
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                  <span className="capitalize">{item.type}</span>
                                  {candidate?.status && (
                                    <span className="px-1 py-0.2 rounded bg-muted text-foreground text-[9px]">
                                      {candidate.status}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2 text-right font-mono">₹{promised.toLocaleString()}</td>
                              <td className="p-2 text-right font-mono text-emerald-600">₹{paid.toLocaleString()}</td>
                              <td className="p-2 text-right font-mono font-semibold text-amber-700 dark:text-amber-400">
                                ₹{balance.toLocaleString()}
                              </td>
                              <td className="p-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={promised > 0 ? promised : undefined}
                                    value={item.amount || ""}
                                    disabled={!item.enabled}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      setAllocationsState((prev) => ({
                                        ...prev,
                                        [key]: {
                                          ...prev[key],
                                          amount: val,
                                        },
                                      }));
                                    }}
                                    placeholder="0"
                                    className="h-7 text-right text-xs font-mono w-24"
                                  />
                                  {balance > 0 && item.enabled && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-1.5 text-[10px] text-teal-700 shrink-0"
                                      onClick={() => {
                                        setAllocationsState((prev) => ({
                                          ...prev,
                                          [key]: {
                                            ...prev[key],
                                            amount: balance,
                                          },
                                        }));
                                      }}
                                      title="Set to full remaining balance"
                                    >
                                      Full
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payment Details Section */}
              <div className="space-y-3 pt-2 border-t">
                <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                  <Receipt size={14} className="text-teal-600" />
                  Transaction & Voucher Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Payment Date */}
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Payment Date *</label>
                    <Input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <label className="font-semibold text-foreground block mb-1">Payment Mode *</label>
                    <Select value={paymentMode} onValueChange={setPaymentMode}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer" className="text-xs">Bank Transfer (NEFT/IMPS)</SelectItem>
                        <SelectItem value="upi" className="text-xs">UPI / GPay / PhonePe</SelectItem>
                        <SelectItem value="cash" className="text-xs">Cash</SelectItem>
                        <SelectItem value="cheque" className="text-xs">Cheque / Demand Draft</SelectItem>
                        <SelectItem value="card" className="text-xs">Credit / Debit Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Reference Number */}
                  <div>
                    <label className="font-semibold text-foreground block mb-1">
                      Ref / UTR / Cheque No
                    </label>
                    <Input
                      placeholder="e.g. UTR-98319203, Cheque #004312"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="font-semibold text-foreground block mb-1">Remarks / Settlement Notes</label>
                  <textarea
                    placeholder="Enter any voucher notes, approvals, or terms for this payout..."
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={2}
                    className="w-full text-xs bg-background rounded-md border border-input p-2 resize-none focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Dialog Footer with Total Sum Banner */}
          <DialogFooter className="p-4 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Total Payout Amount:</span>
              <span className="text-lg font-bold font-mono text-teal-700 dark:text-teal-300">
                ₹{totalAllocatedAmount.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
                disabled={recordPaymentMutation.isPending || totalAllocatedAmount <= 0}
                onClick={handleSavePayment}
              >
                <Check size={14} />
                {recordPaymentMutation.isPending ? "Recording..." : "Record Payment Voucher"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Referrer Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
              <UserPlus className="h-5 w-5" /> Add New Referrer / Agent
            </DialogTitle>
            <DialogDescription className="text-xs">
              Register a referrer to attribute student admissions and record commission payouts.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={addForm.handleSubmit((values) => createMutation.mutate(values))}
            className="space-y-3.5 py-2 text-xs"
          >
            {/* Full Name */}
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Referrer Full Name *
              </label>
              <Controller
                control={addForm.control}
                name="name"
                render={({ field, fieldState }) => (
                  <div>
                    <Input placeholder="e.g. Ramesh Kumar, City Education Trust" {...field} className="h-8 text-xs" />
                    {fieldState.error && (
                      <p className="text-[11px] text-destructive mt-0.5">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Contact Phone No
                </label>
                <Controller
                  control={addForm.control}
                  name="phone"
                  render={({ field }) => (
                    <Input placeholder="e.g. 9876543210" {...field} value={field.value || ""} className="h-8 text-xs" />
                  )}
                />
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Email Address
                </label>
                <Controller
                  control={addForm.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <div>
                      <Input placeholder="e.g. ramesh@example.com" {...field} value={field.value || ""} className="h-8 text-xs" />
                      {fieldState.error && (
                        <p className="text-[11px] text-destructive mt-0.5">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Office / Residential Address
              </label>
              <Controller
                control={addForm.control}
                name="address"
                render={({ field }) => (
                  <textarea
                    placeholder="Enter city, district, full address..."
                    {...field}
                    value={field.value || ""}
                    rows={2}
                    className="w-full text-xs bg-background rounded-md border border-input p-2 resize-none focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                )}
              />
            </div>

            {/* Comments / Notes */}
            <div>
              <label className="font-semibold text-foreground block mb-1">
                Comments / Special Terms
              </label>
              <Controller
                control={addForm.control}
                name="comments"
                render={({ field }) => (
                  <textarea
                    placeholder="e.g. Default referral incentive ₹10,000 per student, nursing consultant for Kerala/Assam region"
                    {...field}
                    value={field.value || ""}
                    rows={2}
                    className="w-full text-xs bg-background rounded-md border border-input p-2 resize-none focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                  />
                )}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Saving..." : "Save Referrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Referrer Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
              <Edit className="h-5 w-5" /> Edit Referrer Details
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update partner contact information and notes.
            </DialogDescription>
          </DialogHeader>

          {activeReferrer && (
            <form
              onSubmit={editForm.handleSubmit((values) =>
                updateMutation.mutate({ id: activeReferrer.id, values })
              )}
              className="space-y-3.5 py-2 text-xs"
            >
              {/* Full Name */}
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Referrer Full Name *
                </label>
                <Controller
                  control={editForm.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <div>
                      <Input {...field} className="h-8 text-xs" />
                      {fieldState.error && (
                        <p className="text-[11px] text-destructive mt-0.5">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Contact Phone No
                  </label>
                  <Controller
                    control={editForm.control}
                    name="phone"
                    render={({ field }) => (
                      <Input {...field} value={field.value || ""} className="h-8 text-xs" />
                    )}
                  />
                </div>

                <div>
                  <label className="font-semibold text-foreground block mb-1">
                    Email Address
                  </label>
                  <Controller
                    control={editForm.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <div>
                        <Input {...field} value={field.value || ""} className="h-8 text-xs" />
                        {fieldState.error && (
                          <p className="text-[11px] text-destructive mt-0.5">{fieldState.error.message}</p>
                        )}
                      </div>
                    )}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Office / Residential Address
                </label>
                <Controller
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <textarea
                      {...field}
                      value={field.value || ""}
                      rows={2}
                      className="w-full text-xs bg-background rounded-md border border-input p-2 resize-none focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                    />
                  )}
                />
              </div>

              {/* Comments */}
              <div>
                <label className="font-semibold text-foreground block mb-1">
                  Comments / Special Terms
                </label>
                <Controller
                  control={editForm.control}
                  name="comments"
                  render={({ field }) => (
                    <textarea
                      {...field}
                      value={field.value || ""}
                      rows={2}
                      className="w-full text-xs bg-background rounded-md border border-input p-2 resize-none focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                    />
                  )}
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <Controller
                  control={editForm.control}
                  name="active"
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      id="edit-active-cb"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4 rounded text-teal-600 cursor-pointer"
                    />
                  )}
                />
                <label htmlFor="edit-active-cb" className="text-xs font-semibold text-foreground cursor-pointer">
                  Referrer is currently Active
                </label>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Updating..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* View Leads, Candidates & Payment Ledger Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold text-teal-700 dark:text-teal-400">
                  <Users className="h-5 w-5" /> Referrer 360° Profile & Settlement Ledger
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Detailed candidates, commission allocations, and payment voucher records.
                </DialogDescription>
              </div>
              {activeReferrer && (
                <Button
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white gap-1 text-xs"
                  onClick={() => {
                    setViewModalOpen(false);
                    handleOpenPayment(activeReferrer);
                  }}
                >
                  <CreditCard size={13} /> Make Payment
                </Button>
              )}
            </div>
          </DialogHeader>

          {activeReferrer && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Partner Card Summary */}
              <div className="p-3.5 bg-muted/30 rounded-xl border space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{activeReferrer.name}</h3>
                    <p className="text-[11px] text-muted-foreground font-mono">Referrer ID: #{activeReferrer.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PaymentStatusBadge status={activeReferrer.paymentStatus} />
                    {activeReferrer.active ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t">
                  {activeReferrer.phone && (
                    <div className="flex items-center gap-1">
                      <Phone size={11} className="text-teal-600" />
                      <span>{activeReferrer.phone}</span>
                    </div>
                  )}
                  {activeReferrer.email && (
                    <div className="flex items-center gap-1">
                      <Mail size={11} className="text-blue-500" />
                      <span>{activeReferrer.email}</span>
                    </div>
                  )}
                  {activeReferrer.address && (
                    <div className="col-span-2 flex items-start gap-1">
                      <MapPin size={11} className="text-rose-500 shrink-0 mt-0.5" />
                      <span>{activeReferrer.address}</span>
                    </div>
                  )}
                </div>

                {activeReferrer.comments && (
                  <div className="text-[11px] pt-1 text-muted-foreground italic border-t">
                    <strong>Notes / Terms:</strong> {activeReferrer.comments}
                  </div>
                )}
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-lg border bg-blue-50/40 dark:bg-blue-950/20 text-center">
                  <span className="text-[10px] text-muted-foreground block">Promised Commission</span>
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-300 font-mono">
                    ₹{Number(activeReferrer.totalCommission || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border bg-emerald-50/40 dark:bg-emerald-950/20 text-center">
                  <span className="text-[10px] text-muted-foreground block">Total Settled</span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                    ₹{Number(activeReferrer.totalPaid || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg border bg-amber-50/40 dark:bg-amber-950/20 text-center">
                  <span className="text-[10px] text-muted-foreground block">Balance Due</span>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-300 font-mono">
                    ₹{Number(activeReferrer.balanceDue || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-border">
                <button
                  type="button"
                  onClick={() => setViewActiveTab("candidates")}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
                    viewActiveTab === "candidates"
                      ? "border-teal-600 text-teal-700 dark:text-teal-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <GraduationCap size={14} />
                  Referred Candidates ({(activeReferrer.students?.length || 0) + (activeReferrer.applicants?.length || 0)})
                </button>
                <button
                  type="button"
                  onClick={() => setViewActiveTab("payments")}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
                    viewActiveTab === "payments"
                      ? "border-teal-600 text-teal-700 dark:text-teal-400"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <History size={14} />
                  Payment Vouchers & Ledger ({activeReferrerPayments.length})
                </button>
              </div>

              {/* Tab 1: Candidates & Payout Status */}
              {viewActiveTab === "candidates" && (
                <div className="space-y-4">
                  {/* Enrolled Students */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-emerald-600" />
                      Enrolled Students ({activeReferrer.students?.length || 0})
                    </h4>
                    {activeReferrer.students && activeReferrer.students.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/50 text-muted-foreground border-b font-semibold text-[11px]">
                              <th className="p-2">Student Name</th>
                              <th className="p-2">Enrollment No</th>
                              <th className="p-2 text-right">Promised</th>
                              <th className="p-2 text-right">Paid</th>
                              <th className="p-2 text-right">Balance</th>
                              <th className="p-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {activeReferrer.students.map((st) => (
                              <tr key={st.id} className="hover:bg-muted/20">
                                <td className="p-2 font-medium text-foreground">{st.name}</td>
                                <td className="p-2 font-mono">{st.enrollmentNo}</td>
                                <td className="p-2 text-right font-mono">₹{st.promisedAmount.toLocaleString()}</td>
                                <td className="p-2 text-right font-mono text-emerald-600">
                                  ₹{st.paidAmount.toLocaleString()}
                                </td>
                                <td className="p-2 text-right font-mono font-semibold text-amber-700 dark:text-amber-400">
                                  ₹{st.balanceDue.toLocaleString()}
                                </td>
                                <td className="p-2 text-center">
                                  <PaymentStatusBadge status={st.paymentStatus} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic text-center py-2 bg-muted/20 rounded-lg border">
                        No converted students linked to this referrer yet.
                      </p>
                    )}
                  </div>

                  {/* Pipeline Applicants */}
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <FileText size={14} className="text-blue-600" />
                      Admission Pipeline Leads ({activeReferrer.applicants?.length || 0})
                    </h4>
                    {activeReferrer.applicants && activeReferrer.applicants.length > 0 ? (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/50 text-muted-foreground border-b font-semibold text-[11px]">
                              <th className="p-2">Applicant Name</th>
                              <th className="p-2">Application No</th>
                              <th className="p-2">Stage</th>
                              <th className="p-2 text-right">Promised</th>
                              <th className="p-2 text-right">Paid</th>
                              <th className="p-2 text-right">Balance</th>
                              <th className="p-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {activeReferrer.applicants.map((app) => (
                              <tr key={app.id} className="hover:bg-muted/20">
                                <td className="p-2 font-medium text-foreground">{app.name}</td>
                                <td className="p-2 font-mono">{app.applicationNo}</td>
                                <td className="p-2 capitalize">
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-[10px] font-semibold",
                                      app.status === "converted"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : app.status === "approved"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-amber-100 text-amber-800"
                                    )}
                                  >
                                    {app.status}
                                  </span>
                                </td>
                                <td className="p-2 text-right font-mono">₹{app.promisedAmount.toLocaleString()}</td>
                                <td className="p-2 text-right font-mono text-emerald-600">
                                  ₹{app.paidAmount.toLocaleString()}
                                </td>
                                <td className="p-2 text-right font-mono font-semibold text-amber-700 dark:text-amber-400">
                                  ₹{app.balanceDue.toLocaleString()}
                                </td>
                                <td className="p-2 text-center">
                                  <PaymentStatusBadge status={app.paymentStatus} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-muted-foreground italic text-center py-2 bg-muted/20 rounded-lg border">
                        No pipeline applicants linked to this referrer.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Payment Vouchers History */}
              {viewActiveTab === "payments" && (
                <div className="space-y-3">
                  {isLoadingPayments ? (
                    <div className="p-6 text-center text-muted-foreground">Loading payment vouchers...</div>
                  ) : activeReferrerPayments.length === 0 ? (
                    <div className="p-8 text-center bg-muted/20 rounded-lg border space-y-2">
                      <Receipt className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                      <p className="text-muted-foreground">No payment vouchers recorded for this partner yet.</p>
                      <Button
                        size="sm"
                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1 mt-1"
                        onClick={() => {
                          setViewModalOpen(false);
                          handleOpenPayment(activeReferrer);
                        }}
                      >
                        <CreditCard size={12} /> Record First Payment
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {activeReferrerPayments.map((pmt) => (
                        <div key={pmt.id} className="p-3 bg-background rounded-lg border shadow-2xs space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-teal-700 dark:text-teal-400 text-xs">
                                {pmt.voucherNo}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-muted uppercase">
                                {pmt.paymentMode.replace("_", " ")}
                              </span>
                              {pmt.referenceNumber && (
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  Ref: {pmt.referenceNumber}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                ₹{Number(pmt.amount).toLocaleString()}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to void voucher ${pmt.voucherNo}?`)) {
                                    deletePaymentMutation.mutate(pmt.id);
                                  }
                                }}
                                title="Void Voucher"
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>

                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>Date: {pmt.paymentDate}</span>
                            <span>Recorded by: {pmt.paidByName || "System Staff"}</span>
                          </div>

                          {pmt.notes && (
                            <p className="text-[11px] text-muted-foreground italic bg-muted/30 p-1.5 rounded">
                              &ldquo;{pmt.notes}&rdquo;
                            </p>
                          )}

                          {/* Candidate Breakdown */}
                          {pmt.allocations && pmt.allocations.length > 0 && (
                            <div className="pt-1">
                              <span className="text-[10px] font-semibold text-muted-foreground block mb-1">
                                Candidate Allocations:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {pmt.allocations.map((al) => (
                                  <div
                                    key={al.id}
                                    className="flex justify-between items-center bg-muted/20 px-2 py-1 rounded text-[11px] border"
                                  >
                                    <span className="font-medium text-foreground truncate max-w-[180px]">
                                      {al.studentName
                                        ? `${al.studentName} (${al.studentEnrollmentNo})`
                                        : `${al.applicantName} (${al.applicantApplicationNo})`}
                                    </span>
                                    <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
                                      ₹{Number(al.amount).toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="p-4 border-t bg-muted/20">
            <Button variant="outline" size="sm" onClick={() => setViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete / Deactivate Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" /> Remove or Deactivate Referrer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove &quot;{activeReferrer?.name}&quot;?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs space-y-2">
            <p className="text-muted-foreground">
              If this partner is already linked to candidates, students, or recorded payment vouchers, they will be safely marked as{" "}
              <strong>Inactive</strong> to preserve admission and financial audit history.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (activeReferrer) {
                  deleteMutation.mutate(activeReferrer.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Processing..." : "Confirm Deletion / Deactivation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
