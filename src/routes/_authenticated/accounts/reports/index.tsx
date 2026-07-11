import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Calendar as CalendarIcon, Coins, FileText, Lock, Trash2, RefreshCw, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import * as React from "react";
import { Calendar } from "../../../../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";
import { format } from "date-fns";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useRpcQuery } from "../../../../lib/query";
import { client } from "../../../../services/rpc";
import { Button } from "../../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../../ui/card";
import { Input } from "../../../../ui/input";
import { Badge } from "../../../../ui/badge";
import { cn } from "../../../../utils/cn";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/accounts/reports/")({
  component: ReportsHistory,
});

function ReportsHistory() {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  // Query reports list
  const reportsQuery = useRpcQuery<any[]>(
    ["daily-closing-reports", startDate, endDate, sortOrder],
    () => client["daily-closing"].reports.$get({ query: { startDate, endDate, sortOrder } })
  );

  const reportsData = reportsQuery.data ?? [];


  // Delete draft report mutation
  const deleteReportMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await (client["daily-closing"].reports as any)[":id"].$delete({
        param: { id: String(id) },
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-closing-reports"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to delete report");
    },
  });

  // Calculate statistics (from last 30 days of data in current view)
  const totalIncomesSum = reportsData.reduce((sum, r) => sum + parseFloat(r.totalIncome), 0);
  const totalExpendituresSum = reportsData.reduce((sum, r) => sum + parseFloat(r.totalExpenditure), 0);
  const avgClosingBalance = reportsData.length > 0
    ? reportsData.reduce((sum, r) => sum + parseFloat(r.closingBalance), 0) / reportsData.length
    : 0;

  // Chart data: sort reports ascending by date
  const chartData = [...reportsData]
    .sort((a, b) => a.reportDate.localeCompare(b.reportDate))
    .slice(-15) // last 15 reports for trend
    .map((r) => ({
      date: r.reportDate.slice(5), // YYYY-MM-DD -> MM-DD
      Income: parseFloat(r.totalIncome),
      Expense: parseFloat(r.totalExpenditure),
      Closing: parseFloat(r.closingBalance),
    }));

  const fmt = (num: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num);

  return (
    <div className="space-y-6">
      {/* Title & Banner */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent dark:from-teal-400 dark:to-emerald-400">
            Daily Closing Reports
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Browse daily operational closes, log reports, and reconcile financial streams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          <Button asChild className="bg-teal-650 hover:bg-teal-700 text-white font-semibold cursor-pointer">
            <Link to="/accounts/reports/new">
              <Plus size={16} className="mr-1.5" /> New Closing Report
            </Link>
          </Button>
        </div>
      </div>


      {/* Analytics Summary */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="border border-border/60 bg-linear-to-br from-emerald-500/5 to-teal-500/5 shadow-xs hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Coins size={14} /> Total Revenues (Logged View)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-350">{fmt(totalIncomesSum)}</div>
            <p className="text-xs text-muted-foreground mt-1">Sum of OPD, pharmacy, dental & IPD receipts</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-linear-to-br from-rose-500/5 to-red-500/5 shadow-xs hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="font-bold text-rose-600 dark:text-rose-455 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <FileText size={14} /> Total Expenditures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-rose-700 dark:text-rose-350">{fmt(totalExpendituresSum)}</div>
            <p className="text-xs text-muted-foreground mt-1">Sum of payouts, advances & vendor payments</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60 bg-linear-to-br from-teal-500/5 to-cyan-500/5 shadow-xs hover:shadow-md transition-all duration-300">
          <CardHeader className="pb-2">
            <CardDescription className="font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <TrendingUp size={14} /> Avg. Closing Cash In Hand
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-teal-700 dark:text-teal-350">{fmt(avgClosingBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">Average daily closing balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Recharts Area Chart for Trend */}
      {chartData.length > 0 && (
        <Card className="border border-border shadow-xs bg-white/70 dark:bg-slate-900/40 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base font-extrabold">Closing Cash Flow Trends</CardTitle>
            <CardDescription>Daily comparison of total income, expenditures, and closing cash balances (last 15 records)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tickLine={false} style={{ fontSize: 11 }} />
                <YAxis tickLine={false} style={{ fontSize: 11 }} />
                <Tooltip formatter={(value: any) => fmt(Number(value))} />
                <Legend style={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="Expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                <Area type="monotone" dataKey="Closing" stroke="#06b6d4" strokeWidth={1.5} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filters & Listing Grid */}
      <Card className="border border-border shadow-xs bg-white/70 dark:bg-slate-900/40 backdrop-blur">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div>
            <CardTitle className="text-base font-extrabold">Reconciliation Log History</CardTitle>
            <CardDescription>Daily balance closing statements and handovers.</CardDescription>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-2.5 items-center">
            {/* Start Date Selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 font-semibold justify-start text-xs cursor-pointer border rounded-lg bg-card px-3 py-1 shadow-xs",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon size={14} className="mr-1.5 text-muted-foreground shrink-0" />
                  {startDate ? (
                    format(new Date(startDate), "MMM dd, yyyy")
                  ) : (
                    <span>Start Date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate ? new Date(startDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, '0');
                      const dd = String(date.getDate()).padStart(2, '0');
                      setStartDate(`${yyyy}-${mm}-${dd}`);
                    } else {
                      setStartDate("");
                    }
                  }}
                />
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground text-xs font-semibold select-none">to</span>

            {/* End Date Selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 font-semibold justify-start text-xs cursor-pointer border rounded-lg bg-card px-3 py-1 shadow-xs",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon size={14} className="mr-1.5 text-muted-foreground shrink-0" />
                  {endDate ? (
                    format(new Date(endDate), "MMM dd, yyyy")
                  ) : (
                    <span>End Date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate ? new Date(endDate) : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, '0');
                      const dd = String(date.getDate()).padStart(2, '0');
                      setEndDate(`${yyyy}-${mm}-${dd}`);
                    } else {
                      setEndDate("");
                    }
                  }}
                />
              </PopoverContent>
            </Popover>

            {/* Clear Filters Button */}
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs h-9 cursor-pointer text-muted-foreground hover:text-foreground font-semibold px-2"
              >
                Clear Filters
              </Button>
            )}

            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ["daily-closing-reports"] });
              }}
              title="Refresh logs"
              className="h-9 w-9 shrink-0 cursor-pointer"
              disabled={reportsQuery.isFetching}
            >
              <RefreshCw size={14} className={cn(reportsQuery.isFetching && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {reportsQuery.isLoading ? (
            <div className="flex h-36 items-center justify-center text-sm text-muted-foreground">
              Loading report history...
            </div>
          ) : reportsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
              <FileText className="size-10 mb-2 opacity-40 text-teal-650" />
              <p className="text-sm font-bold">No daily closing reports found.</p>
              <p className="text-xs max-w-xs mt-1">Start by clicking the "New Closing Report" button to create one for today.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                    <th
                      className="p-4 cursor-pointer select-none hover:bg-muted/50 hover:text-foreground transition-colors group"
                      onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                    >
                      <div className="flex items-center gap-1">
                        <span>Report Date</span>
                        {sortOrder === "asc" ? (
                          <ArrowUp size={14} className="text-teal-650 dark:text-teal-400" />
                        ) : (
                          <ArrowDown size={14} className="text-teal-650 dark:text-teal-400" />
                        )}
                      </div>
                    </th>
                    <th className="p-4">Opening Balance</th>
                    <th className="p-4">Total Income</th>
                    <th className="p-4">Total Expenditure</th>
                    <th className="p-4">Closing Balance</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Created By</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportsData.map((report) => (
                    <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-bold text-foreground">
                        <Link
                          to="/accounts/reports/$id"
                          params={{ id: String(report.id) }}
                          className="hover:underline text-teal-650 dark:text-teal-400"
                        >
                          {new Date(report.reportDate).toLocaleDateString([], {
                            month: "short",
                            day: "2-digit",
                            year: "numeric",
                          })}
                        </Link>
                      </td>
                      <td className="p-4 font-medium">{fmt(report.openingBalance)}</td>
                      <td className="p-4 font-bold text-emerald-600 dark:text-emerald-450">
                        {fmt(report.totalIncome)}
                      </td>
                      <td className="p-4 font-bold text-rose-600 dark:text-rose-455">
                        {fmt(report.totalExpenditure)}
                      </td>
                      <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                        {fmt(report.closingBalance)}
                      </td>
                      <td className="p-4">
                        <Badge
                          className={cn(
                            "font-bold text-[10px]",
                            report.status === "draft" && "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400",
                            report.status === "submitted" && "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400",
                            report.status === "locked" && "bg-slate-100 text-slate-700 border-slate-250 dark:bg-slate-950/30 dark:text-slate-400"
                          )}
                        >
                          {report.status === "locked" && <Lock size={10} className="inline mr-1" />}
                          {report.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground font-semibold">{report.creatorName}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button variant="ghost" size="icon" asChild title="View Report" className="cursor-pointer">
                            <Link to="/accounts/reports/$id" params={{ id: String(report.id) }}>
                              <FileText size={16} />
                            </Link>
                          </Button>

                          {report.status === "draft" && (
                            <>
                              <Button variant="ghost" size="icon" asChild title="Edit Report" className="cursor-pointer">
                                <Link to="/accounts/reports/edit/$id" params={{ id: String(report.id) }}>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="lucide lucide-edit"
                                  >
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                  </svg>
                                </Link>
                              </Button>

                              <button
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this daily closing draft report?")) {
                                    deleteReportMutation.mutate(report.id);
                                  }
                                }}
                                className="p-1.5 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer bg-transparent border-0"
                                title="Delete Draft Report"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
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
  );
}
