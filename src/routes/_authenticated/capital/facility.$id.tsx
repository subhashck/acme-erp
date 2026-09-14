import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  Edit2,
  FileText,
  Filter,
  Landmark,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Percent,
  Layers,
  Coins,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import CurrencyFormat from "react-currency-format";
import { calculateRepaymentSplit, calculateCurrentInstallmentDue } from "@/lib/capital-calculator";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/capital/facility/$id")({
  component: FacilityDetailPage,
});

function formatINR(val: number | string | null | undefined): string {
  const num = typeof val === "number" ? val : parseFloat(String(val || 0)) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

interface FormDatePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  quickAction?: React.ReactNode;
  minDate?: string;
}

function FormDatePicker({
  id,
  label,
  value,
  onChange,
  placeholder = "Select date",
  quickAction,
  minDate,
}: FormDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    const parts = value.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? undefined : d;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  const parsedMinDate = React.useMemo(() => {
    if (!minDate) return undefined;
    const parts = minDate.slice(0, 10).split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day, 0, 0, 0, 0);
      return isNaN(d.getTime()) ? undefined : d;
    }
    const d = new Date(minDate);
    return isNaN(d.getTime()) ? undefined : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }, [minDate]);

  const isBeforeMin = Boolean(
    value && minDate && value < minDate.slice(0, 10)
  );

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={id} className="text-xs font-semibold">
            {label}
          </Label>
          {minDate && parsedMinDate && (
            <span className="text-[10px] text-muted-foreground">
              (Min: {format(parsedMinDate, "dd MMM yyyy")})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {quickAction}
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-[10px] text-muted-foreground hover:text-rose-500 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-8 text-xs border-input bg-background cursor-pointer",
              !parsedDate && "text-muted-foreground",
              isBeforeMin && "border-rose-500 text-rose-600 dark:text-rose-400"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-primary shrink-0" />
            {parsedDate ? (
              <span className="font-medium text-foreground">{format(parsedDate, "dd MMM yyyy")}</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[99999]" align="start">
          <Calendar
            mode="single"
            selected={parsedDate}
            disabled={(date) => {
              if (parsedMinDate) {
                const cmp = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
                return cmp < parsedMinDate;
              }
              return false;
            }}
            startMonth={parsedMinDate}
            onSelect={(selected) => {
              if (selected) {
                if (parsedMinDate) {
                  const cmp = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 0, 0, 0, 0);
                  if (cmp < parsedMinDate) return;
                }
                const yyyy = selected.getFullYear();
                const mm = String(selected.getMonth() + 1).padStart(2, "0");
                const dd = String(selected.getDate()).padStart(2, "0");
                onChange(`${yyyy}-${mm}-${dd}`);
              } else {
                onChange("");
              }
              setOpen(false);
            }}
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
      {isBeforeMin && parsedMinDate && (
        <p className="text-[10px] text-rose-500 font-medium">
          Cannot be earlier than disbursal date ({format(parsedMinDate, "dd MMM yyyy")})
        </p>
      )}
    </div>
  );
}

interface FilterDatePickerProps {
  id: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  quickAction?: React.ReactNode;
}

function FilterDatePicker({
  id,
  label,
  value,
  onChange,
  placeholder = "Select date",
  quickAction,
}: FilterDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    const parts = value.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? undefined : d;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between">
          <Label htmlFor={id} className="text-[11px] font-semibold text-muted-foreground">
            {label}
          </Label>
          <div className="flex items-center gap-1.5">
            {quickAction}
            {value && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="text-[10px] text-muted-foreground hover:text-rose-500 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-8 text-xs border-input bg-background cursor-pointer",
              !parsedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-primary shrink-0" />
            {parsedDate ? (
              <span className="font-medium text-foreground">{format(parsedDate, "dd MMM yyyy")}</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[99999]" align="start">
          <Calendar
            mode="single"
            selected={parsedDate}
            onSelect={(selected) => {
              if (selected) {
                const yyyy = selected.getFullYear();
                const mm = String(selected.getMonth() + 1).padStart(2, "0");
                const dd = String(selected.getDate()).padStart(2, "0");
                onChange(`${yyyy}-${mm}-${dd}`);
              } else {
                onChange("");
              }
              setOpen(false);
            }}
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function FacilityDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isLogPaymentOpen, setIsLogPaymentOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  // Filter & Pagination & Sorting state for Facility Repayments
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [methodFilter, setMethodFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [sortBy, setSortBy] = React.useState("paymentDate");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  // Fetch Facility Details
  const { data: facility, isLoading, error, refetch } = useQuery({
    queryKey: ["capital-facility", id],
    queryFn: async () => {
      const res = await fetch(`/api/capital/facilities/${id}`);
      if (!res.ok) throw new Error("Failed to fetch facility details");
      return res.json();
    },
  });

  // Fetch Repayments for this Facility with Server-Side Filters, Sorting & Pagination
  const {
    data: repaymentsData,
    isLoading: isRepaymentsLoading,
    refetch: refetchRepayments,
  } = useQuery({
    queryKey: [
      "capital-facility-repayments",
      id,
      startDate,
      endDate,
      methodFilter,
      typeFilter,
      searchQuery,
      page,
      pageSize,
      sortBy,
      sortOrder,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("facilityId", id);
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (methodFilter !== "all") params.set("paymentMethod", methodFilter);
      if (typeFilter !== "all") params.set("paymentType", typeFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/capital/repayments?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch repayments");
      return res.json();
    },
  });

  const repaymentsList = repaymentsData?.data || [];
  const pagination = repaymentsData?.pagination || {
    page,
    pageSize,
    totalRecords: repaymentsList.length,
    totalPages: Math.max(1, Math.ceil(repaymentsList.length / pageSize)),
  };

  const startRecord = pagination.totalRecords === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endRecord = Math.min(pagination.page * pagination.pageSize, pagination.totalRecords);

  const hasActiveFilters = Boolean(
    startDate ||
    endDate ||
    methodFilter !== "all" ||
    typeFilter !== "all" ||
    searchQuery.trim()
  );

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setMethodFilter("all");
    setTypeFilter("all");
    setSearchQuery("");
    setPage(1);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder(
        column === "paymentCode" || column === "paymentMethod" || column === "paymentType" || column === "status"
          ? "asc"
          : "desc"
      );
    }
    setPage(1);
  };

  const renderSortHeader = (label: string, column: string, align: "left" | "right" | "center" = "left") => {
    const isSorted = sortBy === column;
    return (
      <th
        onClick={() => handleSort(column)}
        className={`py-3 px-4 text-${align} text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer select-none transition-colors group`}
      >
        <div className={`flex items-center gap-1.5 ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}>
          <span>{label}</span>
          <span className="shrink-0 text-muted-foreground/60 group-hover:text-foreground">
            {isSorted ? (
              sortOrder === "asc" ? (
                <ArrowUp className="h-3 w-3 text-primary font-bold" />
              ) : (
                <ArrowDown className="h-3 w-3 text-primary font-bold" />
              )
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100" />
            )}
          </span>
        </div>
      </th>
    );
  };

  // Repayment Form State
  const [repayForm, setRepayForm] = React.useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentType: "emi",
    principalPaid: "",
    interestPaid: "",
    chargesPaid: "0",
    totalAmount: "",
    paymentMethod: "daily_collection",
    referenceNumber: "",
    notes: "",
    postToCashFlow: true,
  });
  const [calculationNote, setCalculationNote] = React.useState("");
  const [proRataDaily, setProRataDaily] = React.useState(false);
  const [daysElapsed, setDaysElapsed] = React.useState(0);

  // Complete list of repayments for this facility (for calculating balance as of selected payment date)
  const facilityRepayments = React.useMemo(() => {
    return facility?.allRepayments || facility?.repayments || repaymentsData?.data || [];
  }, [facility, repaymentsData]);

  // Determine latest repayment date made for this facility
  const lastRepaymentDate = React.useMemo(() => {
    if (!facilityRepayments.length) return null;
    return facilityRepayments.reduce((max: string, r: any) => (!max || (r.paymentDate && r.paymentDate > max) ? r.paymentDate : max), null);
  }, [facilityRepayments]);

  const disbursalDateStr = facility?.disbursementDate || facility?.sanctionDate || "";

  // Toggle pro-rata daily interest calculation
  const handleProRataToggle = (checked: boolean) => {
    setProRataDaily(checked);
    const targetDate = repayForm.paymentDate || new Date().toISOString().slice(0, 10);
    const split = calculateRepaymentSplit({
      facility,
      repayments: facilityRepayments,
      paymentType: repayForm.paymentType,
      paymentDate: targetDate,
      lastPaymentDate: lastRepaymentDate,
      currentTotalAmount: repayForm.totalAmount,
      currentPrincipalPaid: repayForm.principalPaid,
      proRataDaily: checked,
    });
    setCalculationNote(split.calculationNote);
    setDaysElapsed(split.daysElapsed);
    setRepayForm((prev) => ({
      ...prev,
      principalPaid: split.principalPaid,
      interestPaid: split.interestPaid,
      totalAmount: split.totalAmount,
    }));
  };

  // Recalculate on payment date change
  const handlePaymentDateChange = (newDate: string) => {
    if (disbursalDateStr && newDate && newDate < disbursalDateStr.slice(0, 10)) {
      toast.error(`Payment date cannot be earlier than facility disbursal date (${disbursalDateStr.slice(0, 10)})`);
      return;
    }
    const targetDate = newDate || new Date().toISOString().slice(0, 10);
    const split = calculateRepaymentSplit({
      facility,
      repayments: facilityRepayments,
      paymentType: repayForm.paymentType,
      paymentDate: targetDate,
      lastPaymentDate: lastRepaymentDate,
      currentTotalAmount: repayForm.totalAmount,
      currentPrincipalPaid: repayForm.principalPaid,
      proRataDaily,
    });
    setCalculationNote(split.calculationNote);
    setDaysElapsed(split.daysElapsed);
    setRepayForm((prev) => ({
      ...prev,
      paymentDate: newDate,
      principalPaid: split.principalPaid,
      interestPaid: split.interestPaid,
      totalAmount: split.totalAmount,
    }));
  };

  // Recalculate on payment type change
  const handlePaymentTypeChange = (newType: string) => {
    const split = calculateRepaymentSplit({
      facility,
      repayments: facilityRepayments,
      paymentType: newType,
      paymentDate: repayForm.paymentDate,
      lastPaymentDate: lastRepaymentDate,
      currentTotalAmount: repayForm.totalAmount,
      currentPrincipalPaid: repayForm.principalPaid,
      proRataDaily,
    });
    setCalculationNote(split.calculationNote);
    setDaysElapsed(split.daysElapsed);
    setRepayForm((prev) => ({
      ...prev,
      paymentType: newType,
      principalPaid: split.principalPaid,
      interestPaid: split.interestPaid,
      totalAmount: split.totalAmount,
    }));
  };

  // Initialize repayment form defaults when facility loads or dialog opens
  React.useEffect(() => {
    if (facility && isLogPaymentOpen) {
      const isInterestOnly = facility.interestType === "interest_only";
      const defaultMethod = facility.repaymentFrequency === "daily" ? "daily_collection" : "auto_debit";
      const defaultType = isInterestOnly
        ? "interest_only"
        : (facility.repaymentFrequency === "daily" ? "daily_collection" : "emi");
      const disbursal = facility.disbursementDate || facility.sanctionDate;
      const todayStr = new Date().toISOString().slice(0, 10);
      const initialDate = disbursal && todayStr < disbursal.slice(0, 10)
        ? disbursal.slice(0, 10)
        : todayStr;

      const initialProRata = facility.repaymentFrequency === "daily";
      setProRataDaily(initialProRata);

      const split = calculateRepaymentSplit({
        facility,
        repayments: facilityRepayments,
        paymentType: defaultType,
        paymentDate: initialDate,
        lastPaymentDate: lastRepaymentDate,
        proRataDaily: initialProRata,
      });

      setCalculationNote(split.calculationNote);
      setDaysElapsed(split.daysElapsed);
      setRepayForm((prev) => ({
        ...prev,
        paymentDate: initialDate,
        paymentType: defaultType,
        paymentMethod: defaultMethod,
        totalAmount: split.totalAmount,
        principalPaid: split.principalPaid,
        interestPaid: split.interestPaid,
        chargesPaid: "0",
      }));
    }
  }, [facility, isLogPaymentOpen, lastRepaymentDate, facilityRepayments]);

  // Log Repayment Mutation
  const logRepaymentMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/capital/repayments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Repayment recorded successfully");
      setIsLogPaymentOpen(false);
      refetch();
      refetchRepayments();
      queryClient.invalidateQueries({ queryKey: ["capital-facility-repayments", id] });
      queryClient.invalidateQueries({ queryKey: ["capital-repayments"] });
      queryClient.invalidateQueries({ queryKey: ["capital-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["capital-facilities"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record payment");
    },
  });

  const handleLogRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    const principal = repayForm.paymentType === "interest_only" ? 0 : (parseFloat(repayForm.principalPaid) || 0);
    const interest = parseFloat(repayForm.interestPaid) || 0;
    const charges = parseFloat(repayForm.chargesPaid) || 0;
    const total = parseFloat(repayForm.totalAmount) || (principal + interest + charges);

    if (!repayForm.paymentDate) {
      toast.error("Please select a payment date");
      return;
    }

    if (disbursalDateStr && repayForm.paymentDate < disbursalDateStr.slice(0, 10)) {
      toast.error(`Payment date cannot be earlier than facility disbursal date (${disbursalDateStr.slice(0, 10)})`);
      return;
    }

    if (total <= 0) {
      toast.error("Total payment amount must be greater than 0");
      return;
    }

    logRepaymentMutation.mutate({
      facilityId: parseInt(id, 10),
      paymentDate: repayForm.paymentDate,
      paymentType: repayForm.paymentType,
      principalPaid: principal,
      interestPaid: interest,
      chargesPaid: charges,
      totalAmount: total,
      paymentMethod: repayForm.paymentMethod,
      referenceNumber: repayForm.referenceNumber.trim() || null,
      notes: repayForm.notes.trim() || null,
      status: "completed",
      postToCashFlow: repayForm.postToCashFlow,
    });
  };

  // Delete / Revert Repayment Mutation
  const deleteRepaymentMutation = useMutation({
    mutationFn: async (repaymentId: number) => {
      const res = await fetch(`/api/capital/repayments/${repaymentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to revert payment");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Payment reverted and facility balance restored");
      refetch();
      refetchRepayments();
      queryClient.invalidateQueries({ queryKey: ["capital-facility-repayments", id] });
      queryClient.invalidateQueries({ queryKey: ["capital-repayments"] });
      queryClient.invalidateQueries({ queryKey: ["capital-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["capital-facilities"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to revert payment");
    },
  });

  // Edit Facility Form State
  const [editForm, setEditForm] = React.useState<any>({});
  React.useEffect(() => {
    if (facility) {
      setEditForm({
        name: facility.name || "",
        lenderName: facility.lenderName || "",
        category: facility.category || "",
        facilityType: facility.facilityType || "",
        interestRate: facility.interestRate || "",
        interestType: facility.interestType || "reducing",
        installmentAmount: facility.installmentAmount || "",
        repaymentFrequency: facility.repaymentFrequency || "monthly",
        status: facility.status || "active",
        notes: facility.notes || "",
        moratoriumMonths: facility.moratoriumMonths ?? 0,
        moratoriumType: facility.moratoriumType || "none",
        repaymentStartDate: facility.repaymentStartDate || "",
      });
    }
  }, [facility, isEditOpen]);

  const editMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/capital/facilities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update facility");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Facility details updated");
      setIsEditOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["capital-facilities"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update facility");
    },
  });

  const handleEditFacility = (e: React.FormEvent) => {
    e.preventDefault();
    editMutation.mutate({
      name: editForm.name,
      lenderName: editForm.lenderName,
      category: editForm.category,
      facilityType: editForm.facilityType,
      interestRate: parseFloat(editForm.interestRate) || 0,
      interestType: editForm.interestType,
      installmentAmount: parseFloat(editForm.installmentAmount) || 0,
      repaymentFrequency: editForm.repaymentFrequency,
      status: editForm.status,
      notes: editForm.notes,
      moratoriumMonths: Number(editForm.moratoriumMonths) || 0,
      moratoriumType: editForm.moratoriumType || "none",
      repaymentStartDate: editForm.repaymentStartDate || null,
    });
  };

  // Delete Facility Mutation
  const deleteFacilityMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/capital/facilities/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete facility");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Facility deleted");
      navigate({ to: "/capital/facilities" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete facility");
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Loading borrowing facility profile...
      </div>
    );
  }

  if (error || !facility) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
        <p className="text-foreground font-semibold">Facility not found</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/capital/facilities">Back to Facilities</Link>
        </Button>
      </div>
    );
  }

  const sanctioned = parseFloat(facility.sanctionedAmount || 0);
  const outstanding = parseFloat(facility.outstandingBalance || 0);
  const principalPaid = parseFloat(facility.totalPrincipalPaid || 0);
  const interestPaid = parseFloat(facility.totalInterestPaid || 0);
  const percentPaid = sanctioned > 0 ? Math.min(100, Math.round((principalPaid / sanctioned) * 100)) : 0;
  const totalPaymentEvents =
    repaymentsData?.pagination?.totalRecords ??
    facility.repaymentsPagination?.totalRecords ??
    facility.repayments?.length ??
    0;
  const repayments = facility.repayments || [];
  const currentDue = calculateCurrentInstallmentDue(facility);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Link to="/capital" className="hover:underline flex items-center gap-1">
              <Landmark className="h-3 w-3" />
              <span>Capital</span>
            </Link>
            <span>/</span>
            <Link to="/capital/facilities" className="hover:underline">
              <span>Liabilities</span>
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{facility.facilityCode || facility.id}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              {facility.name}
            </h1>
            <Badge variant="outline" className="text-xs">
              {facility.category}
            </Badge>
            <Badge
              className={`text-xs uppercase font-semibold ${
                facility.status === "active"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {facility.status}
            </Badge>

            {facility.isInMoratorium && (
              <Badge className="text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  In Moratorium ({facility.moratoriumType === "capitalized" ? "Capitalized" : "Pre-EMI Interest"})
                </span>
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5" />
            <span>Counterparty: <strong className="text-foreground">{facility.lenderName}</strong></span>
            {facility.facilityCode && <span>• Ref: #{facility.facilityCode}</span>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsEditOpen(true)}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs shadow-xs"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit Terms</span>
          </Button>

          <Button
            onClick={() => setIsLogPaymentOpen(true)}
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs"
          >
            <Receipt className="h-4 w-4" />
            <span>Record Repayment</span>
          </Button>
        </div>
      </div>

      {/* Moratorium Active Alert Banner */}
      {facility.isInMoratorium && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div className="space-y-1 text-xs">
            <h4 className="font-semibold text-amber-900 dark:text-amber-200">
              Loan is Currently in Moratorium / Grace Window
            </h4>
            <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              This facility has a {facility.moratoriumMonths}-month principal moratorium period until{" "}
              <strong>{facility.repaymentStartDate || "repayment start date"}</strong>.
              {facility.moratoriumType === "pre_emi_interest" ? (
                <> Principal amortization is deferred; monthly Pre-EMI simple interest is payable during this window.</>
              ) : (
                <> Debt servicing holiday is active; interest accrued is capitalized into principal balance.</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* 4 Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Outstanding Balance */}
        <Card className="border-l-4 border-l-rose-500 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
              Current Outstanding Balance
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {formatINR(facility.outstandingBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Sanctioned: {formatINR(facility.sanctionedAmount)}</span>
                <span>{100 - percentPaid}% balance</span>
              </div>
              <Progress value={percentPaid} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* 2. Total Principal Paid */}
        <Card className="border-l-4 border-l-emerald-500 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
              Principal Repaid to Date
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatINR(facility.totalPrincipalPaid)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <p className="text-xs text-muted-foreground">
              {percentPaid}% of initial borrowed principal amortized
            </p>
          </CardContent>
        </Card>

        {/* 3. Total Interest & Charges Paid */}
        <Card className="border-l-4 border-l-blue-500 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
              Interest & Charges Paid
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground mt-1">
              {formatINR(interestPaid + parseFloat(facility.totalChargesPaid || 0))}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Servicing cost paid across {totalPaymentEvents} payment events
            </p>
          </CardContent>
        </Card>

        {/* 4. Installment Due */}
        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
              Regular Installment / Due
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground mt-1">
              {formatINR(currentDue.dueAmount)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <p className="text-xs text-muted-foreground capitalize">
              {currentDue.subtitle}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Facility Terms Specification Card */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Facility Agreement & Financial Terms</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Interest Rate</span>
              <span className="text-sm font-bold text-foreground">{facility.interestRate}% p.a.</span>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Calculation Basis</span>
              <span className="text-sm font-semibold capitalize text-foreground">
                {facility.interestType?.replace("_", " ")}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Tenor / Term</span>
              <span className="text-sm font-semibold text-foreground">
                {parseFloat(facility.tenorMonths || 0) > 0 ? `${facility.tenorMonths} months` : "Open-ended / Revolving"}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Frequency</span>
              <span className="text-sm font-semibold capitalize text-foreground">{facility.repaymentFrequency}</span>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Disbursed On</span>
              <span className="text-sm font-semibold text-foreground">
                {facility.disbursementDate || "—"}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Servicing Bank A/c</span>
              <span className="text-sm font-semibold text-foreground truncate block">
                {facility.bankAccountName ? `${facility.bankAccountName} (${facility.bankName})` : "—"}
              </span>
            </div>
          </div>

          {Number(facility.moratoriumMonths || 0) > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Moratorium Window</span>
                <span className="text-sm font-semibold text-foreground">
                  {facility.moratoriumMonths} Months
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Moratorium Servicing</span>
                <span className="text-sm font-semibold capitalize text-foreground">
                  {facility.moratoriumType === "pre_emi_interest"
                    ? "Pre-EMI Simple Interest"
                    : facility.moratoriumType === "capitalized"
                    ? "Interest Capitalized"
                    : "None"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Full EMI Start Date</span>
                <span className="text-sm font-semibold text-foreground">
                  {facility.repaymentStartDate || "—"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px] uppercase font-semibold">Current Servicing Status</span>
                <span className="text-sm font-semibold text-foreground">
                  {facility.isInMoratorium ? (
                    <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                      <Clock className="h-3 w-3" /> In Moratorium
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Regular Amortization
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}

          {(facility.collateralSecurity || facility.notes) && (
            <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {facility.collateralSecurity && (
                <div>
                  <strong className="text-muted-foreground">Collateral / Pledged Security:</strong>
                  <p className="text-foreground mt-0.5">{facility.collateralSecurity}</p>
                </div>
              )}
              {facility.notes && (
                <div>
                  <strong className="text-muted-foreground">Operational Remarks:</strong>
                  <p className="text-foreground mt-0.5">{facility.notes}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Facility Repayment History Ledger */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-3 border-b border-border/40">
          <div>
            <CardTitle className="text-base font-bold">Repayment & Servicing Ledger</CardTitle>
            <CardDescription className="text-xs">
              Chronological log of payments, principal reductions, and interest servicing
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsLogPaymentOpen(true)}
            size="sm"
            variant="outline"
            className="text-xs h-8 gap-1.5 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Payment</span>
          </Button>
        </CardHeader>

        {/* Filter Bar */}
        <div className="p-4 border-b border-border/40 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              <span>Filter Repayments</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  Active
                </Badge>
              )}
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-primary hover:underline cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Reset Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
            {/* Start Date */}
            <div>
              <FilterDatePicker
                id="filter-facility-start-date"
                label="From Date"
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  setPage(1);
                }}
                placeholder="From Date"
              />
            </div>

            {/* End Date */}
            <div>
              <FilterDatePicker
                id="filter-facility-end-date"
                label="To Date"
                value={endDate}
                onChange={(val) => {
                  setEndDate(val);
                  setPage(1);
                }}
                placeholder="To Date"
                quickAction={
                  <button
                    type="button"
                    onClick={() => {
                      setEndDate(new Date().toISOString().slice(0, 10));
                      setPage(1);
                    }}
                    className="text-[10px] text-primary hover:underline cursor-pointer"
                  >
                    Today
                  </button>
                }
              />
            </div>

            {/* Method */}
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground">Payment Method</Label>
              <select
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1 cursor-pointer"
              >
                <option value="all">All Methods</option>
                <option value="daily_collection">Daily Field Collection</option>
                <option value="auto_debit">Auto-Debit / NACH</option>
                <option value="bank_transfer">Bank Transfer / NEFT</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
              </select>
            </div>

            {/* Type */}
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground">Payment Type</Label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1 cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="emi">Regular EMI</option>
                <option value="daily_collection">Daily Collection</option>
                <option value="principal_part">Principal Part-Payment</option>
                <option value="interest_only">Interest Only</option>
                <option value="chit_installment">Chit Installment</option>
                <option value="foreclosure">Foreclosure</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <Label className="text-[11px] font-semibold text-muted-foreground">Search Ref / Code</Label>
              <Input
                type="text"
                placeholder="e.g. 22023 or UTR"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                  {renderSortHeader("Date", "paymentDate", "left")}
                  {renderSortHeader("Payment Code", "paymentCode", "left")}
                  {renderSortHeader("Type", "paymentType", "left")}
                  {renderSortHeader("Method", "paymentMethod", "left")}
                  {renderSortHeader("Ref / UTR #", "referenceNumber", "left")}
                  {renderSortHeader("Principal Paid", "principalPaid", "right")}
                  {renderSortHeader("Interest / Fees", "interestPaid", "right")}
                  {renderSortHeader("Total Paid", "totalAmount", "right")}
                  {renderSortHeader("Status", "status", "center")}
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isRepaymentsLoading ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-muted-foreground text-xs">
                      Loading repayment records...
                    </td>
                  </tr>
                ) : repaymentsList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-muted-foreground text-xs">
                      No repayments match the current filter selection.
                    </td>
                  </tr>
                ) : (
                  repaymentsList.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {r.paymentDate}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-foreground font-medium">
                        {r.paymentCode}
                      </td>
                      <td className="py-2.5 px-4 text-xs capitalize">
                        {r.paymentType?.replace("_", " ")}
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        <Badge variant="outline" className="text-[11px] capitalize font-normal">
                          {r.paymentMethod?.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                        {r.referenceNumber || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {formatINR(r.principalPaid)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs text-muted-foreground">
                        {formatINR(r.interestPaid)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-foreground">
                        {formatINR(r.totalAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-semibold text-emerald-600 border-emerald-500/30"
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Revert payment ${r.paymentCode} and restore ${formatINR(r.principalPaid)} to balance?`)) {
                              deleteRepaymentMutation.mutate(r.id);
                            }
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500 cursor-pointer"
                          title="Revert Payment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Footer Controls */}
          {!isRepaymentsLoading && pagination.totalRecords > 0 && (
            <div className="px-4 py-3 border-t flex flex-wrap items-center justify-between gap-3 bg-muted/10 text-xs">
              <div className="flex items-center gap-4 text-muted-foreground">
                <div>
                  Showing <strong className="text-foreground font-semibold">{startRecord}</strong> to{" "}
                  <strong className="text-foreground font-semibold">{endRecord}</strong> of{" "}
                  <strong className="text-foreground font-semibold">{pagination.totalRecords}</strong> repayments
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-7 w-16 rounded-md border border-input bg-background px-1.5 text-xs font-medium cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(1)}
                  className="h-8 px-2 cursor-pointer"
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 px-2 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <span className="px-2 font-medium text-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className="h-8 px-2 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(pagination.totalPages)}
                  className="h-8 px-2 cursor-pointer"
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone: Delete Facility */}
      <div className="pt-6 border-t border-border flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-rose-600">Danger Zone</h4>
          <p className="text-xs text-muted-foreground">
            Delete this facility record and its linked historical repayment logs.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm(`Are you sure you want to delete facility ${facility.name}? This action cannot be undone.`)) {
              deleteFacilityMutation.mutate();
            }
          }}
          disabled={deleteFacilityMutation.isPending}
          className="text-xs"
        >
          Delete Facility
        </Button>
      </div>

      {/* Record Repayment Dialog */}
      <Dialog open={isLogPaymentOpen} onOpenChange={setIsLogPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              <span>Record Debt Repayment</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Posting payment against <strong>{facility.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLogRepayment} className="space-y-3.5 py-1 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <FormDatePicker
                id="paymentDate"
                label="Payment Date *"
                value={repayForm.paymentDate}
                onChange={handlePaymentDateChange}
                placeholder="Select payment date"
                minDate={disbursalDateStr}
              />

              <div className="space-y-1">
                <Label htmlFor="paymentType" className="text-xs font-semibold">Payment Type *</Label>
                <select
                  id="paymentType"
                  value={repayForm.paymentType}
                  onChange={(e) => handlePaymentTypeChange(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="emi">Regular EMI</option>
                  <option value="daily_collection">Daily Field Collection</option>
                  <option value="principal_part">Principal Part-Payment</option>
                  <option value="interest_only">Interest Only</option>
                  <option value="chit_installment">Chit Installment</option>
                  <option value="foreclosure">Full Settlement / Foreclosure</option>
                </select>
              </div>
            </div>

            {/* Pro-Rata Daily Calculation Switch */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 border-border">
              <div className="space-y-0.5 pr-2">
                <Label htmlFor="proRataSwitch" className="text-xs font-semibold cursor-pointer">
                  Pro-Rata Daily Calculation
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  {proRataDaily
                    ? `Enabled: Pro-rata daily interest based on actual days elapsed (${daysElapsed > 0 ? daysElapsed : 1} day${daysElapsed > 1 ? "s" : ""})`
                    : "Disabled: Standard full periodic interest (1 month / cycle)"}
                </p>
              </div>
              <Switch
                id="proRataSwitch"
                checked={proRataDaily}
                onCheckedChange={handleProRataToggle}
              />
            </div>

            {calculationNote && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-md px-2.5 py-1.5 font-medium">
                <Info className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Calculation Basis: {calculationNote}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="principalPaid" className="text-xs font-semibold">Principal Repaid (₹) *</Label>
                  {repayForm.paymentType === "interest_only" && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded">
                      ₹0 for Interest-Only
                    </span>
                  )}
                </div>
                <CurrencyFormat
                  id="principalPaid"
                  customInput={Input}
                  thousandSeparator={true}
                  thousandSpacing="2s"
                  prefix="₹"
                  placeholder="₹0"
                  allowNegative={false}
                  value={repayForm.paymentType === "interest_only" ? "0" : repayForm.principalPaid}
                  disabled={repayForm.paymentType === "interest_only"}
                  onValueChange={(values: CurrencyFormat.Values) => {
                    const p = parseFloat(values.value) || 0;
                    const i = parseFloat(repayForm.interestPaid) || 0;
                    setRepayForm((prev) => ({ ...prev, principalPaid: values.value, totalAmount: (p + i).toString() }));
                  }}
                  required
                  className={cn(
                    "h-8 text-xs font-mono font-bold text-emerald-600",
                    repayForm.paymentType === "interest_only" && "opacity-75 bg-muted cursor-not-allowed"
                  )}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="interestPaid" className="text-xs font-semibold">Interest Paid (₹) *</Label>
                <CurrencyFormat
                  id="interestPaid"
                  customInput={Input}
                  thousandSeparator={true}
                  thousandSpacing="2s"
                  prefix="₹"
                  placeholder="₹2,609"
                  allowNegative={false}
                  value={repayForm.interestPaid}
                  onValueChange={(values: CurrencyFormat.Values) => {
                    if (repayForm.paymentType === "interest_only") {
                      setRepayForm((prev) => ({
                        ...prev,
                        interestPaid: values.value,
                        principalPaid: "0",
                        totalAmount: values.value,
                      }));
                    } else {
                      const i = parseFloat(values.value) || 0;
                      const p = parseFloat(repayForm.principalPaid) || 0;
                      setRepayForm((prev) => ({ ...prev, interestPaid: values.value, totalAmount: (p + i).toString() }));
                    }
                  }}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="totalAmount" className="text-xs font-semibold">Total Paid (₹) *</Label>
                <CurrencyFormat
                  id="totalAmount"
                  customInput={Input}
                  thousandSeparator={true}
                  thousandSpacing="2s"
                  prefix="₹"
                  allowNegative={false}
                  value={repayForm.totalAmount}
                  onValueChange={(values: CurrencyFormat.Values) => {
                    if (repayForm.paymentType === "interest_only") {
                      setRepayForm((prev) => ({
                        ...prev,
                        totalAmount: values.value,
                        principalPaid: "0",
                        interestPaid: values.value,
                      }));
                    } else if (repayForm.paymentType === "principal_part") {
                      setRepayForm((prev) => ({
                        ...prev,
                        totalAmount: values.value,
                        principalPaid: values.value,
                        interestPaid: "0",
                      }));
                    } else {
                      setRepayForm((prev) => ({ ...prev, totalAmount: values.value }));
                    }
                  }}
                  required
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="paymentMethod" className="text-xs font-semibold">Payment Method *</Label>
                <select
                  id="paymentMethod"
                  value={repayForm.paymentMethod}
                  onChange={(e) => setRepayForm({ ...repayForm, paymentMethod: e.target.value })}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="daily_collection">Daily Field Collection</option>
                  <option value="auto_debit">Bank Auto-Debit / NACH</option>
                  <option value="bank_transfer">Bank Transfer / NEFT / RTGS</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="referenceNumber" className="text-xs font-semibold">Reference / UTR / Receipt #</Label>
              <Input
                id="referenceNumber"
                placeholder="e.g. 22023, UTR99410543, CHQ-00129"
                value={repayForm.referenceNumber}
                onChange={(e) => setRepayForm({ ...repayForm, referenceNumber: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs font-semibold">Notes / Handover Details</Label>
              <Input
                id="notes"
                placeholder="Remarks or collector name"
                value={repayForm.notes}
                onChange={(e) => setRepayForm({ ...repayForm, notes: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="repayPostCash"
                checked={repayForm.postToCashFlow}
                onChange={(e) => setRepayForm({ ...repayForm, postToCashFlow: e.target.checked })}
                className="rounded border-input text-primary"
              />
              <label htmlFor="repayPostCash" className="text-xs text-foreground cursor-pointer">
                Post Outflow transaction to Cash Flow Treasury Ledger
              </label>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsLogPaymentOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={logRepaymentMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {logRepaymentMutation.isPending ? "Logging..." : "Confirm Repayment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Facility Terms Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="h-4 w-4" />
              <span>Edit Facility Information</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditFacility} className="space-y-3.5 py-1 text-xs">
            <div className="space-y-1">
              <Label htmlFor="editName" className="text-xs font-semibold">Facility Name</Label>
              <Input
                id="editName"
                value={editForm.name || ""}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="editLender" className="text-xs font-semibold">Lender Name</Label>
                <Input
                  id="editLender"
                  value={editForm.lenderName || ""}
                  onChange={(e) => setEditForm({ ...editForm, lenderName: e.target.value })}
                  required
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="editStatus" className="text-xs font-semibold">Status</Label>
                <select
                  id="editStatus"
                  value={editForm.status || "active"}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="active">Active</option>
                  <option value="closed">Closed / Fully Settled</option>
                  <option value="restructured">Restructured</option>
                  <option value="defaulted">Defaulted</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="editRate" className="text-xs font-semibold">Interest Rate (% p.a.)</Label>
                <Input
                  id="editRate"
                  type="number"
                  step="0.01"
                  value={editForm.interestRate || ""}
                  onChange={(e) => setEditForm({ ...editForm, interestRate: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="editInstallment" className="text-xs font-semibold">Installment Due (₹)</Label>
                <CurrencyFormat
                  id="editInstallment"
                  customInput={Input}
                  thousandSeparator={true}
                  thousandSpacing="2s"
                  prefix="₹"
                  placeholder="e.g. ₹20,000"
                  allowNegative={false}
                  value={editForm.installmentAmount || ""}
                  onValueChange={(values: CurrencyFormat.Values) => {
                    setEditForm({ ...editForm, installmentAmount: values.value });
                  }}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="editMoratoriumMonths" className="text-xs font-semibold">Moratorium (Months)</Label>
                <Input
                  id="editMoratoriumMonths"
                  type="number"
                  min="0"
                  value={editForm.moratoriumMonths ?? 0}
                  onChange={(e) => setEditForm({ ...editForm, moratoriumMonths: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="editMoratoriumType" className="text-xs font-semibold">Moratorium Type</Label>
                <select
                  id="editMoratoriumType"
                  value={editForm.moratoriumType || "none"}
                  onChange={(e) => setEditForm({ ...editForm, moratoriumType: e.target.value })}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="none">None (Immediate Amortization)</option>
                  <option value="pre_emi_interest">Pre-EMI Simple Interest</option>
                  <option value="capitalized">Interest Capitalized (Compounded)</option>
                </select>
              </div>
            </div>

            {Number(editForm.moratoriumMonths || 0) > 0 && (
              <FormDatePicker
                id="editRepaymentStartDate"
                label="Repayment Start Date (First Full EMI)"
                value={editForm.repaymentStartDate || ""}
                onChange={(val) => setEditForm({ ...editForm, repaymentStartDate: val })}
                placeholder="Select full EMI start date"
              />
            )}

            <div className="space-y-1">
              <Label htmlFor="editNotes" className="text-xs font-semibold">Notes</Label>
              <Input
                id="editNotes"
                value={editForm.notes || ""}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={editMutation.isPending}>
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
