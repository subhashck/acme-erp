import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Coins,
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
  Building,
  RefreshCw,
  X,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/capital/cash-flow")({
  component: CashFlowLedgerPage,
});

function formatINR(val: number | string | null | undefined): string {
  const num = typeof val === "number" ? val : parseFloat(String(val || 0)) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

const TXN_TYPES = [
  { id: "all", label: "All Transactions" },
  { id: "capital_infusion", label: "Capital Infusions" },
  { id: "operating_income", label: "Operating Income" },
  { id: "operating_expense", label: "Operating Expenses" },
  { id: "debt_inflow", label: "Debt Inflow" },
  { id: "debt_servicing", label: "Debt Servicing" },
];

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

export function CashFlowLedgerPage() {
  const queryClient = useQueryClient();

  // Filters State
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [txnTypeFilter, setTxnTypeFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Pagination State
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  // Sorting State
  const [sortBy, setSortBy] = React.useState("entryDate");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  // Fetch Bank Accounts for Dropdown
  const { data: bankAccountsList = [] } = useQuery({
    queryKey: ["bank-accounts-for-cashflow"],
    queryFn: async () => {
      const res = await fetch("/api/accounts/bank-accounts");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch Cash Flow Entries with Server-Side Pagination, Filters, and Sorting
  const { data: cashFlowData, isLoading, refetch } = useQuery({
    queryKey: [
      "capital-cash-flow",
      startDate,
      endDate,
      txnTypeFilter,
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
      if (txnTypeFilter !== "all") params.set("transactionType", txnTypeFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/capital/cash-flow?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch cash flow");
      return res.json();
    },
  });

  const entries = cashFlowData?.data || [];
  const pagination = cashFlowData?.pagination || {
    page,
    pageSize,
    totalRecords: entries.length,
    totalPages: Math.max(1, Math.ceil(entries.length / pageSize)),
  };
  const summary = cashFlowData?.summary || {
    totalInflow: 0,
    totalOutflow: 0,
    netCashFlow: 0,
    latestRunningBalance: 0,
    totalRecords: 0,
  };

  const startRecord = pagination.totalRecords === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endRecord = Math.min(pagination.page * pagination.pageSize, pagination.totalRecords);

  const hasActiveFilters = Boolean(startDate || endDate || txnTypeFilter !== "all" || searchQuery.trim());

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setTxnTypeFilter("all");
    setSearchQuery("");
    setPage(1);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder(
        column === "entryCode" || column === "partyName" || column === "category"
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

  // Add Cash Flow Form State
  const [formData, setFormData] = React.useState({
    entryDate: new Date().toISOString().slice(0, 10),
    transactionType: "capital_infusion",
    category: "Angel Investment",
    partyName: "",
    description: "",
    amount: "",
    flowDirection: "inflow" as "inflow" | "outflow",
    bankAccountId: "",
    referenceNumber: "",
  });

  // Add Cash Flow Mutation
  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/capital/cash-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create entry");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Cash flow entry recorded successfully");
      setIsAddModalOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["capital-dashboard"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record cash flow entry");
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formData.amount) || 0;
    if (amt <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const isInflow = formData.flowDirection === "inflow";

    addMutation.mutate({
      entryDate: formData.entryDate,
      transactionType: formData.transactionType,
      category: formData.category,
      partyName: formData.partyName.trim() || null,
      description: formData.description.trim() || null,
      inflowAmount: isInflow ? amt : 0,
      outflowAmount: !isInflow ? amt : 0,
      bankAccountId: formData.bankAccountId ? parseInt(formData.bankAccountId, 10) : null,
      referenceNumber: formData.referenceNumber.trim() || null,
    });
  };

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/capital/cash-flow/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete cash flow entry");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Cash flow entry deleted");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["capital-dashboard"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete entry");
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
            <span className="text-foreground font-medium">Cash Flow & Capital Treasury</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Cash Flow & Capital Infusions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reconciliation of angel funding, founder capital, operating revenues, operational burn, and debt disbursements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setFormData({
                entryDate: new Date().toISOString().slice(0, 10),
                transactionType: "capital_infusion",
                category: "Founder Capital",
                partyName: "",
                description: "",
                amount: "",
                flowDirection: "inflow",
                bankAccountId: "",
                referenceNumber: "",
              });
              setIsAddModalOpen(true);
            }}
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Cash Flow / Infusion</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards: Inflows, Outflows, Net Position, Running Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Inflows */}
        <Card className="border-l-4 border-l-emerald-500 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
              Total Inflows in View
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              +{formatINR(summary.totalInflow)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Capital injections & operating income
            </p>
          </CardContent>
        </Card>

        {/* 2. Outflows */}
        <Card className="border-l-4 border-l-rose-500 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
              Total Outflows in View
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              -{formatINR(summary.totalOutflow)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Payroll, lease rent, infra & debt servicing
            </p>
          </CardContent>
        </Card>

        {/* 3. Net Cash Flow */}
        <Card className="border-l-4 border-l-blue-500 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
              Net Period Cash Flow
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground mt-1">
              {formatINR(summary.netCashFlow)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Net operating liquidity generation
            </p>
          </CardContent>
        </Card>

        {/* 4. Cumulative Treasury Running Balance */}
        <Card className="border-l-4 border-l-indigo-500 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
              Current Treasury Balance
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              {formatINR(summary.latestRunningBalance)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Net cash reserve balance across all periods
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-3">
        {/* Transaction Type Tabs */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {TXN_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTxnTypeFilter(t.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap cursor-pointer ${
                  txnTypeFilter === t.id
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 shrink-0"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
            </Button>
          )}
        </div>

        {/* Date Filters & Search Query using Shadcn Calendar */}
        <Card className="p-3.5 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs items-end">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                Search Cash Flow Ledger
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search party, description, or txn ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <FilterDatePicker
                id="filterStartDate"
                label="From Date"
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  setPage(1);
                }}
                placeholder="Select start date"
              />
            </div>

            <div>
              <FilterDatePicker
                id="filterEndDate"
                label="To Date"
                value={endDate}
                onChange={(val) => {
                  setEndDate(val);
                  setPage(1);
                }}
                placeholder="Select end date"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Cash Flow Table with Server-Side Sorting & Pagination */}
      <Card className="shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                  {renderSortHeader("Date", "entryDate", "left")}
                  {renderSortHeader("Txn Code", "entryCode", "left")}
                  {renderSortHeader("Type", "transactionType", "left")}
                  {renderSortHeader("Category", "category", "left")}
                  {renderSortHeader("Description / Party", "partyName", "left")}
                  {renderSortHeader("Inflow (₹)", "inflowAmount", "right")}
                  {renderSortHeader("Outflow (₹)", "outflowAmount", "right")}
                  {renderSortHeader("Net Flow (₹)", "netAmount", "right")}
                  {renderSortHeader("Running Balance", "runningBalance", "right")}
                  {renderSortHeader("Reference / Ref ID", "referenceNumber", "left")}
                  <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-muted-foreground text-xs">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2 text-primary" />
                      Loading cash flow transactions...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-muted-foreground text-xs">
                      No cash flow transactions match the current filter selection.
                    </td>
                  </tr>
                ) : (
                  entries.map((item: any) => {
                    const isInflow = parseFloat(item.inflowAmount) > 0;
                    const isOutflow = parseFloat(item.outflowAmount) > 0;

                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {item.entryDate}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs text-foreground font-medium">
                          {item.entryCode}
                        </td>
                        <td className="py-2.5 px-4 text-xs">
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize font-medium ${
                              item.transactionType === "capital_infusion"
                                ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30"
                                : item.transactionType === "operating_income"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                                : item.transactionType === "operating_expense"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30"
                                : item.transactionType === "debt_inflow"
                                ? "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30"
                                : item.transactionType === "debt_servicing"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                                : "text-muted-foreground"
                            }`}
                          >
                            {item.transactionType.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-xs font-medium text-foreground">
                          {item.category}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-muted-foreground">
                          <span className="text-foreground font-medium block">{item.partyName || item.description}</span>
                          {item.description && item.partyName && (
                            <span className="text-[11px] text-muted-foreground">{item.description}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {isInflow ? formatINR(item.inflowAmount) : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs font-semibold text-rose-600 dark:text-rose-400">
                          {isOutflow ? formatINR(item.outflowAmount) : "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right text-xs font-bold text-foreground">
                          {isInflow ? `+${formatINR(item.inflowAmount)}` : `-${formatINR(item.outflowAmount)}`}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {formatINR(item.runningBalance)}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                          {item.referenceNumber || "—"}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Delete cash flow entry ${item.entryCode}?`)) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500 cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
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
                  <strong className="text-foreground font-semibold">{pagination.totalRecords}</strong> entries
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

                <div className="px-2 font-medium">
                  Page {pagination.page} of {pagination.totalPages}
                </div>

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

      {/* Add Cash Flow / Infusion Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" />
              <span>Record Treasury Cash Flow / Infusion</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add equity funding, operating revenues, or direct expenditures
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-3.5 py-1 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <FilterDatePicker
                id="entryDate"
                label="Date *"
                value={formData.entryDate}
                onChange={(val) => setFormData({ ...formData, entryDate: val })}
                placeholder="Select entry date"
                quickAction={
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        entryDate: new Date().toISOString().slice(0, 10),
                      }))
                    }
                    className="text-[10px] text-primary hover:underline cursor-pointer"
                  >
                    Today
                  </button>
                }
              />

              <div className="space-y-1">
                <Label htmlFor="flowDirection" className="text-xs font-semibold">Cash Direction *</Label>
                <select
                  id="flowDirection"
                  value={formData.flowDirection}
                  onChange={(e) => setFormData({ ...formData, flowDirection: e.target.value as any })}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold"
                >
                  <option value="inflow">Inflow (+ Cash Receipt)</option>
                  <option value="outflow">Outflow (- Expenditure)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="transactionType" className="text-xs font-semibold">Transaction Type *</Label>
                <select
                  id="transactionType"
                  value={formData.transactionType}
                  onChange={(e) => {
                    const t = e.target.value;
                    const defDir = (t === "capital_infusion" || t === "operating_income" || t === "debt_inflow") ? "inflow" : "outflow";
                    setFormData({ ...formData, transactionType: t as any, flowDirection: defDir });
                  }}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="capital_infusion">Capital Infusion (Equity / Angels)</option>
                  <option value="operating_income">Operating Income / Retainer</option>
                  <option value="operating_expense">Operating Expense</option>
                  <option value="debt_inflow">Debt Loan Inflow</option>
                  <option value="debt_servicing">Debt Servicing Outflow</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="category" className="text-xs font-semibold">Category *</Label>
                <Input
                  id="category"
                  placeholder="e.g. Angel Investment, Retainer, Payroll"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="amount" className="text-xs font-semibold">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="e.g. 500000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="partyName" className="text-xs font-semibold">Counterparty / Investor</Label>
                <Input
                  id="partyName"
                  placeholder="e.g. Peak Ventures, Alpha Corp"
                  value={formData.partyName}
                  onChange={(e) => setFormData({ ...formData, partyName: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs font-semibold">Description / Notes</Label>
              <Input
                id="description"
                placeholder="e.g. Seed Capital Infusion - Peak Ventures"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bankAccountId" className="text-xs font-semibold">Target ACME Bank A/c</Label>
                <select
                  id="bankAccountId"
                  value={formData.bankAccountId}
                  onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">Select bank account...</option>
                  {bankAccountsList.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.bankName})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="referenceNumber" className="text-xs font-semibold">Reference / Txn ID</Label>
                <Input
                  id="referenceNumber"
                  placeholder="e.g. TXN-CAP-001"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={addMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {addMutation.isPending ? "Recording..." : "Record Entry"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
