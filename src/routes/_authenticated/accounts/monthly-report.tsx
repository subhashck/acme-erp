import { createFileRoute } from "@tanstack/react-router";
import {
  Calendar as CalendarIcon,
  Coins,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Activity,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Pill,
  Loader2,
  Search,
} from "lucide-react";
import * as React from "react";
import { format, startOfMonth, subMonths, endOfMonth, addMonths } from "date-fns";
import { Calendar } from "../../../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../components/ui/dialog";
import { useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../ui/card";
import { Badge } from "../../../ui/badge";
import { cn } from "../../../utils/cn";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/accounts/monthly-report")(
  {
    component: MonthlyReport,
  }
);

// ---------------------------------------------------------------------------
// Colour palettes
// ---------------------------------------------------------------------------
const INCOME_COLORS = [
  "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1",
  "#8b5cf6", "#a855f7", "#ec4899", "#f97316", "#eab308",
  "#84cc16", "#22d3ee",
];
const EXPENSE_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#ec4899", "#8b5cf6",
  "#6366f1", "#3b82f6", "#06b6d4", "#14b8a6", "#10b981",
];
const PHARMACY_LABELS: Record<string, string> = {
  otWardTotal: "OT / Ward",
  acmeNewTotal: "Acme New",
  parking: "Parking",
  coffeeShop: "Coffee Shop",
  canteenIncome: "Canteen",
  creditCardChargesNight: "Credit Card Charges (Night)",
  trainingFee: "Training Fee",
  humankindSales: "Humankind Sales",
  miscTotal: "Miscellaneous",
};

// ---------------------------------------------------------------------------
// Currency formatter
// ---------------------------------------------------------------------------
const fmt = (num: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);

const fmtCompact = (num: number) => {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}K`;
  return `₹${num.toFixed(0)}`;
};

// ---------------------------------------------------------------------------
// Custom chart tooltip
// ---------------------------------------------------------------------------
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover/95 backdrop-blur px-3 py-2.5 shadow-xl text-xs">
      <p className="font-bold text-foreground mb-1.5">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold text-foreground">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breakdown table row
// ---------------------------------------------------------------------------
function HeadRow({
  label,
  total,
  grandTotal,
  color,
  onClick,
}: {
  label: string;
  total: number;
  grandTotal: number;
  color: string;
  onClick?: () => void;
}) {
  const pct = grandTotal > 0 ? (total / grandTotal) * 100 : 0;
  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 py-2.5 px-3 rounded-lg transition-all group",
        onClick
          ? "cursor-pointer hover:bg-violet-500/10 dark:hover:bg-violet-500/15"
          : "hover:bg-muted/40"
      )}
    >
      <div
        className="shrink-0 h-3 w-3 rounded-sm"
        style={{ backgroundColor: color }}
      />
      <span className="flex-1 text-sm font-semibold text-foreground truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
        {label}
      </span>
      <div className="flex items-center gap-3">
        <div className="w-28 h-2 rounded-full bg-muted/60 overflow-hidden hidden sm:block">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-semibold w-12 text-right">
          {pct.toFixed(1)}%
        </span>
        <span className="text-sm font-bold text-foreground w-28 text-right">
          {fmt(total)}
        </span>
        {onClick && (
          <ChevronRight
            size={14}
            className="text-muted-foreground/60 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-transform group-hover:translate-x-0.5"
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Itemized Entries Modal Dialog
// ---------------------------------------------------------------------------
function HeadEntriesDialog({
  selectedHead,
  onClose,
  periodLabel,
}: {
  selectedHead: {
    title: string;
    type: "income" | "expenditure";
    total: number;
    entries: Array<{
      id: string;
      reportDate: string;
      description: string;
      amount: number;
      quantity?: number;
      rate?: number;
      narration?: string | null;
      isNightEntry?: boolean;
    }>;
  } | null;
  onClose: () => void;
  periodLabel: string;
}) {
  const [filterText, setFilterText] = React.useState("");

  if (!selectedHead) return null;

  const filtered = selectedHead.entries.filter((e) => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return (
      e.description.toLowerCase().includes(q) ||
      e.reportDate.toLowerCase().includes(q) ||
      (e.narration && e.narration.toLowerCase().includes(q))
    );
  });

  const filteredTotal = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <Dialog open={Boolean(selectedHead)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl border-border/80">
        <DialogHeader className="p-5 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge
                className={cn(
                  "text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border",
                  selectedHead.type === "income"
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400"
                )}
              >
                {selectedHead.type === "income" ? "Income Head" : "Expenditure Head"}
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">
                {periodLabel}
              </span>
            </div>
            <DialogTitle className="text-xl font-extrabold tracking-tight">
              {selectedHead.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Itemized entries recorded across daily closing statements.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-semibold">Total Amount</div>
              <div
                className={cn(
                  "text-lg font-black tracking-tight",
                  selectedHead.type === "income"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                )}
              >
                {fmt(selectedHead.total)}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Filter bar */}
        <div className="p-4 border-b border-border/40 bg-background/50 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search description, date, narration..."
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>
          <div className="text-xs text-muted-foreground font-semibold">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"} found
          </div>
        </div>

        {/* Entries Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground font-medium">
              No entries found for this head in the selected period.
            </div>
          ) : (
            <div className="border border-border/60 rounded-lg overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-muted-foreground font-bold uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3 w-28">Date</th>
                    <th className="py-2.5 px-3">Description / Details</th>
                    <th className="py-2.5 px-3 text-right w-24">Qty / Rate</th>
                    <th className="py-2.5 px-3 text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {filtered.map((entry, idx) => (
                    <tr
                      key={entry.id || idx}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                        {entry.reportDate}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-foreground">
                          {entry.description}
                          {entry.isNightEntry && (
                            <span className="ml-1.5 inline-block text-[9px] px-1.5 py-0.2 font-extrabold rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                              Night
                            </span>
                          )}
                        </div>
                        {entry.narration && (
                          <div className="text-[11px] text-muted-foreground mt-0.5 italic">
                            {entry.narration}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground whitespace-nowrap">
                        {entry.quantity && entry.quantity > 1
                          ? `${entry.quantity} × ${fmt(entry.rate || 0)}`
                          : entry.rate
                          ? fmt(entry.rate)
                          : "—"}
                      </td>
                      <td
                        className={cn(
                          "py-2.5 px-3 text-right font-black whitespace-nowrap",
                          selectedHead.type === "income"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {fmt(entry.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border/60 bg-muted/10 flex items-center justify-between text-xs">
          <div className="text-muted-foreground font-semibold">
            Showing {filtered.length} of {selectedHead.entries.length} total entries
          </div>
          <div className="font-extrabold text-foreground flex items-center gap-1.5">
            <span>Filtered Total:</span>
            <span
              className={cn(
                "font-black text-sm",
                selectedHead.type === "income"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {fmt(filteredTotal)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
function MonthlyReport() {
  const today = new Date();
  const monthStart = startOfMonth(today);

  const [startDate, setStartDate] = React.useState<Date>(monthStart);
  const [endDate, setEndDate] = React.useState<Date>(today);
  const [startPickerOpen, setStartPickerOpen] = React.useState(false);
  const [endPickerOpen, setEndPickerOpen] = React.useState(false);
  const [pharmacyExpanded, setPharmacyExpanded] = React.useState(false);
  const [selectedHead, setSelectedHead] = React.useState<{
    title: string;
    type: "income" | "expenditure";
    total: number;
    entries: Array<any>;
  } | null>(null);

  const handlePreviousMonth = () => {
    const prev = subMonths(startDate, 1);
    setStartDate(startOfMonth(prev));
    setEndDate(endOfMonth(prev));
  };

  const handleNextMonth = () => {
    const next = addMonths(startDate, 1);
    const nStart = startOfMonth(next);
    const nEnd = endOfMonth(next);
    setStartDate(nStart);
    setEndDate(nEnd > today ? today : nEnd);
  };

  const handleThisMonth = () => {
    setStartDate(monthStart);
    setEndDate(today);
  };

  const startStr = format(startDate, "yyyy-MM-dd");
  const endStr = format(endDate, "yyyy-MM-dd");

  const reportQuery = useRpcQuery<any>(
    ["monthly-report", startStr, endStr],
    () =>
      (client["daily-closing"] as any)["monthly-report"].$get({
        query: { startDate: startStr, endDate: endStr },
      })
  );

  const data = reportQuery.data;
  const isLoading = reportQuery.isLoading;

  // Pharmacy total
  const pharmacyTotal = data
    ? Object.entries(data.pharmacyIncome || {}).reduce(
      (s, [, v]) => s + (v as number),
      0
    )
    : 0;

  // Grand totals for percentage calculations
  const grandIncome = data
    ? (data.incomeByHead || []).reduce(
      (s: number, h: any) => s + h.total,
      0
    ) +
    pharmacyTotal +
    (data.ipdAdmissionsTotal || 0) +
    (data.ipdDischargesTotal || 0) +
    (data.additionalIncomeTotal || 0)
    : 0;

  const grandExpenditure = data
    ? (data.expenditureByHead || []).reduce(
      (s: number, h: any) => s + h.total,
      0
    ) + (data.staffAdvancesTotal || 0)
    : 0;

  // Chart data
  const trendData = React.useMemo(() => {
    if (!data?.dailyTrends) return [];
    return data.dailyTrends.map((d: any) => ({
      date: d.date.slice(5), // MM-DD
      Income: d.income,
      Expenditure: d.expenditure,
      Balance: d.balance,
    }));
  }, [data]);

  const groupPieItemsUnderFivePercent = (items: { name: string; value: number }[]) => {
    const raw = items.filter((i) => i.value > 0);
    const totalSum = raw.reduce((sum, item) => sum + item.value, 0);
    if (totalSum <= 0) return [];

    const result: { name: string; value: number }[] = [];
    let othersSum = 0;

    for (const item of raw) {
      if (item.value / totalSum < 0.05) {
        othersSum += item.value;
      } else {
        result.push(item);
      }
    }

    if (othersSum > 0) {
      result.push({
        name: "Others",
        value: Math.round(othersSum * 100) / 100,
      });
    }

    return result;
  };

  const incomePieData = React.useMemo(() => {
    if (!data) return [];
    const items: { name: string; value: number }[] = [];
    (data.incomeByHead || []).forEach((h: any) =>
      items.push({ name: h.label, value: h.total })
    );
    if (pharmacyTotal > 0) items.push({ name: "Pharmacy & Other", value: pharmacyTotal });
    if (data.ipdAdmissionsTotal > 0)
      items.push({ name: "IPD Admissions", value: data.ipdAdmissionsTotal });
    if (data.ipdDischargesTotal > 0)
      items.push({ name: "IPD Discharges", value: data.ipdDischargesTotal });
    if (data.additionalIncomeTotal > 0)
      items.push({ name: "Additional Income", value: data.additionalIncomeTotal });
    return groupPieItemsUnderFivePercent(items);
  }, [data, pharmacyTotal]);

  const expensePieData = React.useMemo(() => {
    if (!data) return [];
    const items: { name: string; value: number }[] = [];
    (data.expenditureByHead || []).forEach((h: any) =>
      items.push({ name: h.label, value: h.total })
    );
    if (data.staffAdvancesTotal > 0)
      items.push({ name: "Staff Advances", value: data.staffAdvancesTotal });
    return groupPieItemsUnderFivePercent(items);
  }, [data]);

  const periodLabel = React.useMemo(() => {
    try {
      return `${format(startDate, "dd MMM yyyy")} – ${format(endDate, "dd MMM yyyy")}`;
    } catch {
      return "";
    }
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-fuchsia-400">
            Monthly Financial Report
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cumulative summary of earnings & expenditures across daily closing
            reports.
          </p>
        </div>

        {/* Date Range Picker & Quick Month Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Month Preset Buttons */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
            <Button
              variant="outline"
              onClick={handlePreviousMonth}
              className="h-7 px-2 text-xs font-semibold gap-1 cursor-pointer bg-background hover:bg-muted shadow-2xs"
              title="View Previous Month Report"
            >
              <ChevronLeft size={13} />
              Prev Month
            </Button>
            <Button
              variant="outline"
              onClick={handleThisMonth}
              className="h-7 px-2 text-xs font-semibold cursor-pointer bg-background hover:bg-muted shadow-2xs"
              title="View Current Month Report"
            >
              This Month
            </Button>
            <Button
              variant="outline"
              onClick={handleNextMonth}
              className="h-7 px-1.5 text-xs font-semibold cursor-pointer bg-background hover:bg-muted shadow-2xs"
              title="View Next Month Report"
            >
              <ChevronRight size={13} />
            </Button>
          </div>

          {/* Start Date */}
          <Popover open={startPickerOpen} onOpenChange={setStartPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 px-3 text-xs font-semibold gap-2 cursor-pointer shadow-xs"
              >
                <CalendarIcon size={14} />
                {format(startDate, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d: any) => {
                  if (d) {
                    setStartDate(d);
                    if (d > endDate) setEndDate(d);
                  }
                  setStartPickerOpen(false);
                }}
                disabled={{ after: endDate }}
              />
            </PopoverContent>
          </Popover>

          <span className="text-xs text-muted-foreground font-bold">to</span>

          {/* End Date */}
          <Popover open={endPickerOpen} onOpenChange={setEndPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 px-3 text-xs font-semibold gap-2 cursor-pointer shadow-xs"
              >
                <CalendarIcon size={14} />
                {format(endDate, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(d: any) => {
                  if (d) {
                    setEndDate(d);
                    if (d < startDate) setStartDate(d);
                  }
                  setEndPickerOpen(false);
                }}
                disabled={{ before: startDate, after: today }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Period Badge */}
      <div className="flex items-center gap-2">
        <Badge className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30">
          {periodLabel}
        </Badge>
        {data && (
          <Badge className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30">
            {data.reportCount} report{data.reportCount !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          Aggregating financial data…
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data && data.reportCount === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <BarChart3 className="size-12 opacity-30" />
          <p className="font-semibold">No closing reports found in this period</p>
          <p className="text-xs">
            Try selecting a different date range or ensure daily closing reports
            have been submitted.
          </p>
        </div>
      )}

      {/* Dashboard Content */}
      {!isLoading && data && data.reportCount > 0 && (
        <>
          {/* ============= SUMMARY CARDS ============= */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {/* Total Income */}
            <Card className="border border-border/60 bg-linear-to-br from-emerald-500/5 to-teal-500/5 shadow-xs hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-1.5">
                <CardDescription className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                  <TrendingUp size={13} /> Total Income
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-350">
                  {fmt(data.summary.totalIncome)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <ArrowUpRight size={10} className="text-emerald-500" />
                  Avg {fmt(data.summary.avgDailyIncome)}/day
                </p>
              </CardContent>
            </Card>

            {/* Total Expenditure */}
            <Card className="border border-border/60 bg-linear-to-br from-rose-500/5 to-red-500/5 shadow-xs hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-1.5">
                <CardDescription className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                  <TrendingDown size={13} /> Total Expenditure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold tracking-tight text-rose-700 dark:text-rose-350">
                  {fmt(data.summary.totalExpenditure)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                  <ArrowDownRight size={10} className="text-rose-500" />
                  Avg {fmt(data.summary.avgDailyExpenditure)}/day
                </p>
              </CardContent>
            </Card>

            {/* Net Balance */}
            <Card className="border border-border/60 bg-linear-to-br from-violet-500/5 to-purple-500/5 shadow-xs hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-1.5">
                <CardDescription className="font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                  <Activity size={13} /> Net Balance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    "text-2xl font-extrabold tracking-tight",
                    data.summary.netBalance >= 0
                      ? "text-violet-700 dark:text-violet-350"
                      : "text-rose-700 dark:text-rose-350"
                  )}
                >
                  {fmt(data.summary.netBalance)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Income − Expenditure
                </p>
              </CardContent>
            </Card>

            {/* Reports Count */}
            <Card className="border border-border/60 bg-linear-to-br from-amber-500/5 to-orange-500/5 shadow-xs hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-1.5">
                <CardDescription className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                  <FileText size={13} /> Reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold tracking-tight text-amber-700 dark:text-amber-350">
                  {data.reportCount}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Daily closing statements
                </p>
              </CardContent>
            </Card>

            {/* Discounts / Returns */}
            <Card className="border border-border/60 bg-linear-to-br from-pink-500/5 to-fuchsia-500/5 shadow-xs hover:shadow-md transition-all duration-300">
              <CardHeader className="pb-1.5">
                <CardDescription className="font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                  <Coins size={13} /> Discounts / Returns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold tracking-tight text-pink-700 dark:text-pink-350">
                  {fmt(data.discountsReturnsTotal)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Deducted from income
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ============= DAILY TRENDS CHART ============= */}
          <Card className="border border-border/60 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" />
                Daily Income vs Expenditure Trends
              </CardTitle>
              <CardDescription className="text-xs">
                Daily financial trends across the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart
                    data={trendData}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="incomeGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#34d399"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#34d399"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="expenseGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#f87171"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="95%"
                          stopColor="#f87171"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="opacity-30"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={fmtCompact}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 11, fontWeight: 500, paddingTop: "8px" }}
                      formatter={(value) => (
                        <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 500, marginLeft: "4px" }}>
                          {value}
                        </span>
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="Income"
                      stroke="#34d399"
                      strokeWidth={2}
                      fill="url(#incomeGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Expenditure"
                      stroke="#f87171"
                      strokeWidth={2}
                      fill="url(#expenseGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* ============= DISTRIBUTION CHARTS (PIE) ============= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Income Distribution */}
            <Card className="border border-border/60 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-500" />
                  Income Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incomePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={incomePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }: any) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {incomePieData.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={INCOME_COLORS[idx % INCOME_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => fmt(Number(value ?? 0))}
                        contentStyle={{
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                    No income data
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expenditure Distribution */}
            <Card className="border border-border/60 shadow-xs">
              <CardHeader>
                <CardTitle className="text-base font-extrabold flex items-center gap-2">
                  <TrendingDown size={16} className="text-rose-500" />
                  Expenditure Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expensePieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }: any) =>
                          `${name} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {expensePieData.map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => fmt(Number(value ?? 0))}
                        contentStyle={{
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                    No expenditure data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ============= INCOME BY HEAD BREAKDOWN ============= */}
          <Card className="border border-border/60 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <Coins size={16} className="text-emerald-500" />
                Income by Head
              </CardTitle>
              <CardDescription className="text-xs">
                Cumulative income per service category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0.5">
              {(data.incomeByHead || []).map((h: any, idx: number) => (
                <HeadRow
                  key={h.code}
                  label={h.label}
                  total={h.total}
                  grandTotal={grandIncome}
                  color={INCOME_COLORS[idx % INCOME_COLORS.length]}
                  onClick={() =>
                    setSelectedHead({
                      title: h.label,
                      type: "income",
                      total: h.total,
                      entries: h.entries || [],
                    })
                  }
                />
              ))}

              {/* Pharmacy Income — broken out individually */}
              {pharmacyTotal > 0 && (
                <div className="mt-2">
                  <button
                    onClick={() => setPharmacyExpanded(!pharmacyExpanded)}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors w-full cursor-pointer"
                  >
                    <Pill
                      size={13}
                      className="shrink-0 text-cyan-500"
                    />
                    <span className="flex-1 text-sm font-semibold text-foreground text-left">
                      Pharmacy & Other Income
                    </span>
                    <span className="text-sm font-bold text-foreground mr-2">
                      {fmt(pharmacyTotal)}
                    </span>
                    {pharmacyExpanded ? (
                      <ChevronUp size={14} className="text-muted-foreground" />
                    ) : (
                      <ChevronDown size={14} className="text-muted-foreground" />
                    )}
                  </button>
                  {pharmacyExpanded && (
                    <div className="ml-6 pl-4 border-l border-border/50 space-y-0.5">
                      {Object.entries(data.pharmacyIncome || {})
                        .filter(([, v]) => (v as number) > 0)
                        .map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between py-1.5 px-3 text-xs"
                          >
                            <span className="text-muted-foreground font-semibold">
                              {PHARMACY_LABELS[key] || key}
                            </span>
                            <span className="font-bold text-foreground">
                              {fmt(value as number)}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* IPD Admissions */}
              {data.ipdAdmissionsTotal > 0 && (
                <HeadRow
                  label="IPD Admissions"
                  total={data.ipdAdmissionsTotal}
                  grandTotal={grandIncome}
                  color="#06b6d4"
                  onClick={() =>
                    setSelectedHead({
                      title: "IPD Admissions",
                      type: "income",
                      total: data.ipdAdmissionsTotal,
                      entries: data.ipdAdmissionsEntries || [],
                    })
                  }
                />
              )}

              {/* IPD Discharges */}
              {data.ipdDischargesTotal > 0 && (
                <HeadRow
                  label="IPD Discharges"
                  total={data.ipdDischargesTotal}
                  grandTotal={grandIncome}
                  color="#3b82f6"
                  onClick={() =>
                    setSelectedHead({
                      title: "IPD Discharges",
                      type: "income",
                      total: data.ipdDischargesTotal,
                      entries: data.ipdDischargesEntries || [],
                    })
                  }
                />
              )}

              {/* Additional Income */}
              {data.additionalIncomeTotal > 0 && (
                <HeadRow
                  label="Additional Income"
                  total={data.additionalIncomeTotal}
                  grandTotal={grandIncome}
                  color="#8b5cf6"
                  onClick={() =>
                    setSelectedHead({
                      title: "Additional Income",
                      type: "income",
                      total: data.additionalIncomeTotal,
                      entries: data.additionalIncomeEntries || [],
                    })
                  }
                />
              )}

              {/* Discounts deduction */}
              {data.discountsReturnsTotal > 0 && (
                <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-rose-500/5 mt-1">
                  <div className="shrink-0 h-3 w-3 rounded-sm bg-rose-500" />
                  <span className="flex-1 text-sm font-semibold text-rose-600 dark:text-rose-400">
                    Less: Discounts / Returns
                  </span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    −{fmt(data.discountsReturnsTotal)}
                  </span>
                </div>
              )}

              {/* Total */}
              <div className="flex items-center justify-between py-3 px-3 mt-2 border-t-2 border-emerald-500/30">
                <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                  TOTAL INCOME
                </span>
                <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                  {fmt(data.summary.totalIncome)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ============= EXPENDITURE BY HEAD BREAKDOWN ============= */}
          <Card className="border border-border/60 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <FileText size={16} className="text-rose-500" />
                Expenditure by Head
              </CardTitle>
              <CardDescription className="text-xs">
                Cumulative expenditure per expense category
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-0.5">
              {(data.expenditureByHead || []).map((h: any, idx: number) => (
                <HeadRow
                  key={h.code}
                  label={h.label}
                  total={h.total}
                  grandTotal={grandExpenditure}
                  color={EXPENSE_COLORS[idx % EXPENSE_COLORS.length]}
                  onClick={() =>
                    setSelectedHead({
                      title: h.label,
                      type: "expenditure",
                      total: h.total,
                      entries: h.entries || [],
                    })
                  }
                />
              ))}

              {/* Staff Advances */}
              {data.staffAdvancesTotal > 0 && (
                <HeadRow
                  label="Staff Advances"
                  total={data.staffAdvancesTotal}
                  grandTotal={grandExpenditure}
                  color="#f59e0b"
                  onClick={() =>
                    setSelectedHead({
                      title: "Staff Advances",
                      type: "expenditure",
                      total: data.staffAdvancesTotal,
                      entries: data.staffAdvancesEntries || [],
                    })
                  }
                />
              )}

              {/* Total */}
              <div className="flex items-center justify-between py-3 px-3 mt-2 border-t-2 border-rose-500/30">
                <span className="text-sm font-extrabold text-rose-700 dark:text-rose-400">
                  TOTAL EXPENDITURE
                </span>
                <span className="text-lg font-extrabold text-rose-700 dark:text-rose-400">
                  {fmt(data.summary.totalExpenditure)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ============= INCOME BAR CHART COMPARISON ============= */}
          <Card className="border border-border/60 shadow-xs">
            <CardHeader>
              <CardTitle className="text-base font-extrabold flex items-center gap-2">
                <BarChart3 size={16} className="text-violet-500" />
                Income vs Expenditure by Head
              </CardTitle>
              <CardDescription className="text-xs">
                Horizontal comparison of top earning and spending categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const barData = [
                  ...(data.incomeByHead || []).slice(0, 6).map((h: any) => ({
                    name: h.label,
                    Income: h.total,
                    Expenditure: 0,
                  })),
                  ...(data.expenditureByHead || []).slice(0, 6).map((h: any) => ({
                    name: h.label,
                    Income: 0,
                    Expenditure: h.total,
                  })),
                ];
                if (barData.length === 0)
                  return (
                    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                      No data available
                    </div>
                  );
                return (
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart
                      data={barData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="opacity-30"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{
                          fontSize: 10,
                          fill: "#94a3b8",
                        }}
                        tickFormatter={fmtCompact}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{
                          fontSize: 10,
                          fill: "#94a3b8",
                        }}
                        tickLine={false}
                        axisLine={false}
                        width={75}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 11, fontWeight: 500, paddingTop: "8px" }}
                        formatter={(value) => (
                          <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 500, marginLeft: "4px" }}>
                            {value}
                          </span>
                        )}
                      />
                      <Bar
                        dataKey="Income"
                        fill="#34d399"
                        radius={[0, 4, 4, 0]}
                        barSize={14}
                      />
                      <Bar
                        dataKey="Expenditure"
                        fill="#f87171"
                        radius={[0, 4, 4, 0]}
                        barSize={14}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </CardContent>
          </Card>
        </>
      )}

      {/* Itemized Entries Drill-down Dialog */}
      <HeadEntriesDialog
        selectedHead={selectedHead}
        onClose={() => setSelectedHead(null)}
        periodLabel={periodLabel}
      />
    </div>
  );
}
