import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar as CalendarIcon,
  CreditCard,
  Download,
  Filter,
  Landmark,
  Plus,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
  Wallet,
  Building2,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { calculateRepaymentSplit } from "@/lib/capital-calculator";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
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

export const Route = createFileRoute("/_authenticated/capital/repayments")({
  component: RepaymentsLedgerPage,
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
    <div className="space-y-1">
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

export function RepaymentsLedgerPage() {
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [facilityFilter, setFacilityFilter] = React.useState("all");
  const [methodFilter, setMethodFilter] = React.useState("all");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Server-Side Pagination & Sorting State
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [sortBy, setSortBy] = React.useState("paymentDate");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  const [isRecordModalOpen, setIsRecordModalOpen] = React.useState(false);

  // Fetch Facilities for Filter & Dialog
  const { data: facilities = [] } = useQuery({
    queryKey: ["capital-facilities-for-repayments"],
    queryFn: async () => {
      const res = await fetch("/api/capital/facilities?status=all");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch Repayments Ledger with Server-Side Pagination, Filters & Sorting
  const { data: repaymentsData, isLoading, refetch } = useQuery({
    queryKey: [
      "capital-repayments",
      startDate,
      endDate,
      facilityFilter,
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
      params.set("page", page.toString());
      params.set("pageSize", pageSize.toString());
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (facilityFilter !== "all") params.set("facilityId", facilityFilter);
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
  const summary = repaymentsData?.summary || {
    totalPaid: 0,
    totalPrincipal: 0,
    totalInterest: 0,
    totalCharges: 0,
    count: 0,
  };

  const startRecord = pagination.totalRecords === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endRecord = Math.min(pagination.page * pagination.pageSize, pagination.totalRecords);

  const hasActiveFilters = Boolean(
    startDate ||
    endDate ||
    facilityFilter !== "all" ||
    methodFilter !== "all" ||
    typeFilter !== "all" ||
    searchQuery.trim()
  );

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setFacilityFilter("all");
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
        column === "paymentCode" ||
        column === "facilityName" ||
        column === "facilityCategory" ||
        column === "paymentMethod" ||
        column === "status"
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

  // Record Repayment Form State
  const [formData, setFormData] = React.useState({
    facilityId: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentType: "emi",
    principalPaid: "",
    interestPaid: "",
    chargesPaid: "0",
    totalAmount: "",
    paymentMethod: "auto_debit",
    referenceNumber: "",
    notes: "",
    postToCashFlow: true,
  });
  const [calculationNote, setCalculationNote] = React.useState("");
  const [proRataDaily, setProRataDaily] = React.useState(false);
  const [daysElapsed, setDaysElapsed] = React.useState(0);

  // Fetch full details of selected facility (including allRepayments) for exact historical balance calculation
  const { data: selectedFacilityDetails } = useQuery({
    queryKey: ["capital-facility-repayments-calc", formData.facilityId],
    queryFn: async () => {
      if (!formData.facilityId) return null;
      const res = await fetch(`/api/capital/facilities/${formData.facilityId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: Boolean(formData.facilityId && isRecordModalOpen),
  });

  const facilityRepayments = React.useMemo(() => {
    return selectedFacilityDetails?.allRepayments || selectedFacilityDetails?.repayments || [];
  }, [selectedFacilityDetails]);

  // Helper to determine latest repayment date for a specific facility
  const getLastPaymentDate = (facilityId: string) => {
    const list = facilityRepayments.length > 0
      ? facilityRepayments
      : repaymentsList.filter((r: any) => r.facilityId?.toString() === facilityId);
    if (!list.length) return null;
    return list.reduce((max: string, r: any) => (!max || (r.paymentDate && r.paymentDate > max) ? r.paymentDate : max), null);
  };

  // Toggle pro-rata daily interest calculation
  const handleProRataToggle = (checked: boolean) => {
    setProRataDaily(checked);
    const fac = facilities.find((f: any) => f.id.toString() === formData.facilityId);
    if (fac) {
      const targetDate = formData.paymentDate || new Date().toISOString().slice(0, 10);
      const lastPaymentDate = getLastPaymentDate(formData.facilityId);
      const split = calculateRepaymentSplit({
        facility: fac,
        repayments: facilityRepayments,
        paymentType: formData.paymentType,
        paymentDate: targetDate,
        lastPaymentDate,
        currentTotalAmount: formData.totalAmount,
        currentPrincipalPaid: formData.principalPaid,
        proRataDaily: checked,
      });
      setCalculationNote(split.calculationNote);
      setDaysElapsed(split.daysElapsed);
      setFormData((prev) => ({
        ...prev,
        principalPaid: split.principalPaid,
        interestPaid: split.interestPaid,
        totalAmount: split.totalAmount,
      }));
    }
  };

  // Handle facility selection change in modal
  const handleFacilityChange = (facIdStr: string) => {
    const fac = facilities.find((f: any) => f.id.toString() === facIdStr);
    if (fac) {
      const isDaily = fac.repaymentFrequency === "daily";
      const defaultMethod = isDaily ? "daily_collection" : "auto_debit";
      const isInterestOnly = fac.interestType === "interest_only";
      const defaultType = isInterestOnly
        ? "interest_only"
        : (isDaily ? "daily_collection" : "emi");
      const disbursal = fac.disbursementDate || fac.sanctionDate;
      let targetDate = formData.paymentDate || new Date().toISOString().slice(0, 10);
      if (disbursal && targetDate < disbursal.slice(0, 10)) {
        targetDate = disbursal.slice(0, 10);
      }
      const lastPaymentDate = getLastPaymentDate(facIdStr);

      const initialProRata = isDaily;
      setProRataDaily(initialProRata);

      const split = calculateRepaymentSplit({
        facility: fac,
        repayments: facilityRepayments,
        paymentType: defaultType,
        paymentDate: targetDate,
        lastPaymentDate,
        proRataDaily: initialProRata,
      });

      setCalculationNote(split.calculationNote);
      setDaysElapsed(split.daysElapsed);
      setFormData((prev) => ({
        ...prev,
        facilityId: facIdStr,
        paymentDate: targetDate,
        paymentType: defaultType,
        paymentMethod: defaultMethod,
        totalAmount: split.totalAmount,
        principalPaid: split.principalPaid,
        interestPaid: split.interestPaid,
      }));
    } else {
      setCalculationNote("");
      setFormData((prev) => ({ ...prev, facilityId: facIdStr }));
    }
  };

  // Recalculate on payment date change
  const handlePaymentDateChange = (newDate: string) => {
    const fac = facilities.find((f: any) => f.id.toString() === formData.facilityId);
    const disbursal = fac?.disbursementDate || fac?.sanctionDate;
    if (disbursal && newDate && newDate < disbursal.slice(0, 10)) {
      toast.error(`Payment date cannot be earlier than facility disbursal date (${disbursal.slice(0, 10)})`);
      return;
    }
    const targetDate = newDate || new Date().toISOString().slice(0, 10);
    if (fac) {
      const lastPaymentDate = getLastPaymentDate(formData.facilityId);
      const split = calculateRepaymentSplit({
        facility: fac,
        repayments: facilityRepayments,
        paymentType: formData.paymentType,
        paymentDate: targetDate,
        lastPaymentDate,
        currentTotalAmount: formData.totalAmount,
        currentPrincipalPaid: formData.principalPaid,
        proRataDaily,
      });
      setCalculationNote(split.calculationNote);
      setDaysElapsed(split.daysElapsed);
      setFormData((prev) => ({
        ...prev,
        paymentDate: newDate,
        principalPaid: split.principalPaid,
        interestPaid: split.interestPaid,
        totalAmount: split.totalAmount,
      }));
    } else {
      setFormData((prev) => ({ ...prev, paymentDate: newDate }));
    }
  };

  // Recalculate on payment type change
  const handlePaymentTypeChange = (newType: string) => {
    const fac = facilities.find((f: any) => f.id.toString() === formData.facilityId);
    if (fac) {
      const lastPaymentDate = getLastPaymentDate(formData.facilityId);
      const split = calculateRepaymentSplit({
        facility: fac,
        repayments: facilityRepayments,
        paymentType: newType,
        paymentDate: formData.paymentDate,
        lastPaymentDate,
        currentTotalAmount: formData.totalAmount,
        currentPrincipalPaid: formData.principalPaid,
        proRataDaily,
      });
      setCalculationNote(split.calculationNote);
      setDaysElapsed(split.daysElapsed);
      setFormData((prev) => ({
        ...prev,
        paymentType: newType,
        principalPaid: split.principalPaid,
        interestPaid: split.interestPaid,
        totalAmount: split.totalAmount,
      }));
    } else {
      setFormData((prev) => ({ ...prev, paymentType: newType }));
    }
  };

  // Sync split calculation once detailed facility repayments load
  React.useEffect(() => {
    if (formData.facilityId && selectedFacilityDetails && isRecordModalOpen) {
      const fac = facilities.find((f: any) => f.id.toString() === formData.facilityId);
      if (fac) {
        const split = calculateRepaymentSplit({
          facility: fac,
          repayments: facilityRepayments,
          paymentType: formData.paymentType,
          paymentDate: formData.paymentDate,
          currentTotalAmount: formData.totalAmount,
          currentPrincipalPaid: formData.principalPaid,
          proRataDaily,
        });
        setCalculationNote(split.calculationNote);
        setDaysElapsed(split.daysElapsed);
        setFormData((prev) => ({
          ...prev,
          principalPaid: split.principalPaid,
          interestPaid: split.interestPaid,
          totalAmount: split.totalAmount,
        }));
      }
    }
  }, [selectedFacilityDetails, isRecordModalOpen, proRataDaily]);

  // Record Repayment Mutation
  const recordMutation = useMutation({
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
      toast.success("Repayment recorded and balance updated");
      setIsRecordModalOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["capital-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["capital-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["capital-daily-collections"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record payment");
    },
  });

  const handleRecordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.facilityId) {
      toast.error("Please select a borrowing facility");
      return;
    }
    if (!formData.paymentDate) {
      toast.error("Please select a payment date");
      return;
    }
    const fac = facilities.find((f: any) => f.id.toString() === formData.facilityId);
    const disbursal = fac?.disbursementDate || fac?.sanctionDate;
    if (disbursal && formData.paymentDate < disbursal.slice(0, 10)) {
      toast.error(`Payment date cannot be earlier than facility disbursal date (${disbursal.slice(0, 10)})`);
      return;
    }
    const principal = formData.paymentType === "interest_only" ? 0 : (parseFloat(formData.principalPaid) || 0);
    const interest = parseFloat(formData.interestPaid) || 0;
    const charges = parseFloat(formData.chargesPaid) || 0;
    const total = parseFloat(formData.totalAmount) || (principal + interest + charges);

    if (total <= 0) {
      toast.error("Total payment amount must be greater than 0");
      return;
    }

    recordMutation.mutate({
      facilityId: parseInt(formData.facilityId, 10),
      paymentDate: formData.paymentDate,
      paymentType: formData.paymentType,
      principalPaid: principal,
      interestPaid: interest,
      chargesPaid: charges,
      totalAmount: total,
      paymentMethod: formData.paymentMethod,
      referenceNumber: formData.referenceNumber.trim() || null,
      notes: formData.notes.trim() || null,
      status: "completed",
      postToCashFlow: formData.postToCashFlow,
    });
  };

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/capital/repayments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete payment");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Payment deleted and balance rolled back");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["capital-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["capital-facilities"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete payment");
    },
  });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <Link to="/capital" className="hover:underline flex items-center gap-1">
              <Landmark className="h-3 w-3" />
              <span>Capital</span>
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Repayment Ledger</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Debt Servicing & Repayment Ledger
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete transaction ledger of EMIs, principal reductions, chit installments, and daily collections
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              if (facilities.length > 0) {
                handleFacilityChange(facilities[0].id.toString());
              }
              setIsRecordModalOpen(true);
            }}
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Record Repayment</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 shadow-xs border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Total Repayments in View</p>
          <p className="text-xl font-bold text-foreground mt-1">{formatINR(summary.totalPaid)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{summary.count} payment events</p>
        </Card>

        <Card className="p-4 shadow-xs border-l-4 border-l-teal-500">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Principal Reductions</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(summary.totalPrincipal)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Direct debt balance relief</p>
        </Card>

        <Card className="p-4 shadow-xs border-l-4 border-l-blue-500">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Interest & Financing Costs</p>
          <p className="text-xl font-bold text-foreground mt-1">{formatINR(summary.totalInterest)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Borrowing servicing expenditure</p>
        </Card>

        <Card className="p-4 shadow-xs border-l-4 border-l-amber-500">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Charges & Penalties</p>
          <p className="text-xl font-bold text-foreground mt-1">{formatINR(summary.totalCharges)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Overdue / processing charges</p>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            <span>Filter Ledger</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Facility */}
          <div>
            <Label className="text-[11px] font-semibold text-muted-foreground">Facility</Label>
            <select
              value={facilityFilter}
              onChange={(e) => {
                setFacilityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1 cursor-pointer"
            >
              <option value="all">All Facilities</option>
              {facilities.map((fac: any) => (
                <option key={fac.id} value={fac.id.toString()}>
                  {fac.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <FilterDatePicker
              id="filter-start-date"
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
              id="filter-end-date"
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
      </Card>

      {/* Ledger Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                  {renderSortHeader("Date", "paymentDate", "left")}
                  {renderSortHeader("Payment Code", "paymentCode", "left")}
                  {renderSortHeader("Facility", "facilityName", "left")}
                  {renderSortHeader("Category", "facilityCategory", "left")}
                  {renderSortHeader("Method", "paymentMethod", "left")}
                  {renderSortHeader("Ref / UTR #", "referenceNumber", "left")}
                  {renderSortHeader("Principal", "principalPaid", "right")}
                  {renderSortHeader("Interest", "interestPaid", "right")}
                  {renderSortHeader("Total Paid", "totalAmount", "right")}
                  {renderSortHeader("Status", "status", "center")}
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-muted-foreground text-xs">
                      Loading repayment records...
                    </td>
                  </tr>
                ) : repaymentsList.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-muted-foreground text-xs">
                      No repayment records match the current filter selection.
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
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        <Link
                          to="/capital/facility/$id"
                          params={{ id: r.facilityId.toString() }}
                          className="hover:underline text-primary"
                        >
                          {r.facilityName}
                        </Link>
                        <span className="text-[11px] text-muted-foreground block">{r.lenderName}</span>
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        <Badge variant="outline" className="text-[10px]">
                          {r.facilityCategory}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-xs capitalize">
                        <Badge variant="outline" className="text-[11px] font-normal py-0">
                          {r.paymentMethod?.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs font-semibold text-foreground">
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
                            if (confirm(`Revert payment ${r.paymentCode} for ${formatINR(r.totalAmount)}? This will restore the facility's debt balance.`)) {
                              deleteMutation.mutate(r.id);
                            }
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
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
          {!isLoading && pagination.totalRecords > 0 && (
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

      {/* Record Repayment Dialog */}
      <Dialog open={isRecordModalOpen} onOpenChange={setIsRecordModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              <span>Record Debt Repayment</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Log an EMI, chit installment, or private advance payment
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordSubmit} className="space-y-3.5 py-1 text-xs">
            <div className="space-y-1">
              <Label htmlFor="facilityId" className="text-xs font-semibold">Select Borrowing Facility *</Label>
              <select
                id="facilityId"
                value={formData.facilityId}
                onChange={(e) => handleFacilityChange(e.target.value)}
                required
                className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-medium"
              >
                <option value="">Select a facility...</option>
                {facilities.map((fac: any) => (
                  <option key={fac.id} value={fac.id.toString()}>
                    {fac.name} (Balance: {formatINR(fac.outstandingBalance)})
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const selectedFac = facilities.find((f: any) => f.id.toString() === formData.facilityId);
              const selectedDisbursalDate = selectedFac?.disbursementDate || selectedFac?.sanctionDate || "";
              return (
                <div className="grid grid-cols-2 gap-3">
                  <FormDatePicker
                    id="payDate"
                    label="Payment Date *"
                    value={formData.paymentDate}
                    onChange={handlePaymentDateChange}
                    placeholder="Select payment date"
                    minDate={selectedDisbursalDate}
                    quickAction={
                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date().toISOString().slice(0, 10);
                          const target = selectedDisbursalDate && today < selectedDisbursalDate.slice(0, 10)
                            ? selectedDisbursalDate.slice(0, 10)
                            : today;
                          handlePaymentDateChange(target);
                        }}
                        className="text-[10px] text-primary hover:underline cursor-pointer"
                      >
                        Today
                      </button>
                    }
                  />

                  <div className="space-y-1">
                    <Label htmlFor="payType" className="text-xs font-semibold">Payment Type</Label>
                    <select
                      id="payType"
                      value={formData.paymentType}
                      onChange={(e) => handlePaymentTypeChange(e.target.value)}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="emi">Regular EMI</option>
                      <option value="daily_collection">Daily Field Collection</option>
                      <option value="principal_part">Principal Part-Payment</option>
                      <option value="interest_only">Interest Only</option>
                      <option value="chit_installment">Chit Installment</option>
                      <option value="foreclosure">Full Foreclosure</option>
                    </select>
                  </div>
                </div>
              );
            })()}

            {/* Pro-Rata Daily Calculation Switch */}
            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30 border-border">
              <div className="space-y-0.5 pr-2">
                <Label htmlFor="proRataSwitchModal" className="text-xs font-semibold cursor-pointer">
                  Pro-Rata Daily Calculation
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  {proRataDaily
                    ? `Enabled: Pro-rata daily interest based on actual days elapsed (${daysElapsed > 0 ? daysElapsed : 1} day${daysElapsed > 1 ? "s" : ""})`
                    : "Disabled: Standard full periodic interest (1 month / cycle)"}
                </p>
              </div>
              <Switch
                id="proRataSwitchModal"
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
                  <Label htmlFor="pPaid" className="text-xs font-semibold">Principal Repaid (₹) *</Label>
                  {formData.paymentType === "interest_only" && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded">
                      ₹0 for Interest-Only
                    </span>
                  )}
                </div>
                <Input
                  id="pPaid"
                  type="number"
                  placeholder="0"
                  value={formData.paymentType === "interest_only" ? "0" : formData.principalPaid}
                  disabled={formData.paymentType === "interest_only"}
                  onChange={(e) => {
                    const p = parseFloat(e.target.value) || 0;
                    const i = parseFloat(formData.interestPaid) || 0;
                    setFormData({ ...formData, principalPaid: e.target.value, totalAmount: (p + i).toString() });
                  }}
                  required
                  className={cn(
                    "h-8 text-xs font-mono font-bold text-emerald-600",
                    formData.paymentType === "interest_only" && "opacity-75 bg-muted cursor-not-allowed"
                  )}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="iPaid" className="text-xs font-semibold">Interest Paid (₹) *</Label>
                <Input
                  id="iPaid"
                  type="number"
                  placeholder="0"
                  value={formData.interestPaid}
                  onChange={(e) => {
                    if (formData.paymentType === "interest_only") {
                      setFormData({
                        ...formData,
                        interestPaid: e.target.value,
                        principalPaid: "0",
                        totalAmount: e.target.value,
                      });
                    } else {
                      const i = parseFloat(e.target.value) || 0;
                      const p = parseFloat(formData.principalPaid) || 0;
                      setFormData({ ...formData, interestPaid: e.target.value, totalAmount: (p + i).toString() });
                    }
                  }}
                  required
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="totAmt" className="text-xs font-semibold">Total Amount (₹) *</Label>
                <Input
                  id="totAmt"
                  type="number"
                  value={formData.totalAmount}
                  onChange={(e) => {
                    if (formData.paymentType === "interest_only") {
                      setFormData({
                        ...formData,
                        totalAmount: e.target.value,
                        principalPaid: "0",
                        interestPaid: e.target.value,
                      });
                    } else if (formData.paymentType === "principal_part") {
                      setFormData({
                        ...formData,
                        totalAmount: e.target.value,
                        principalPaid: e.target.value,
                        interestPaid: "0",
                      });
                    } else {
                      setFormData({ ...formData, totalAmount: e.target.value });
                    }
                  }}
                  required
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="pMethod" className="text-xs font-semibold">Payment Method *</Label>
                <select
                  id="pMethod"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="auto_debit">Bank Auto-Debit / NACH</option>
                  <option value="daily_collection">Daily Field Collection</option>
                  <option value="bank_transfer">Bank Transfer / NEFT / RTGS</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="refNo" className="text-xs font-semibold">Reference / UTR / Receipt #</Label>
              <Input
                id="refNo"
                placeholder="e.g. 22023, UTR99410543, CHQ-88192"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs font-semibold">Notes</Label>
              <Input
                id="notes"
                placeholder="Handover remarks or collector details"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="pt-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="postCashFlow"
                checked={formData.postToCashFlow}
                onChange={(e) => setFormData({ ...formData, postToCashFlow: e.target.checked })}
                className="rounded border-input text-primary"
              />
              <label htmlFor="postCashFlow" className="text-xs text-foreground cursor-pointer">
                Automatically post debt servicing Outflow to Cash Flow Treasury
              </label>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsRecordModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={recordMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {recordMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
