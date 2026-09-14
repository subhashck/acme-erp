import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Landmark,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Calendar,
  CreditCard,
  Building2,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Receipt,
  FileText,
  BadgePercent,
  Wallet,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/capital/")({
  component: CapitalDashboardPage,
});

function formatINR(val: number | string | null | undefined): string {
  const num = typeof val === "number" ? val : parseFloat(String(val || 0)) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function CapitalDashboardPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["capital-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/capital/dashboard");
      if (!res.ok) throw new Error("Failed to fetch capital dashboard");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const kpis = data?.kpis;
  const portfolioBreakdown = data?.portfolioBreakdown || [];
  const dailyFinancing = data?.dailyFinancingSummary;
  const recentRepayments = data?.recentRepayments || [];
  const recentCashFlow = data?.recentCashFlow || [];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-sm mb-1">
            <Landmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Treasury & Debt Servicing</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Capital Finances & Liabilities
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Executive borrowing portfolio, repayments, chit funds, advances & daily collection financing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2 shadow-xs">
            <Link to="/capital/cash-flow">
              <Coins className="h-4 w-4 text-amber-500" />
              <span>Cash Flow & Infusions</span>
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="gap-2 shadow-xs">
            <Link to="/capital/daily-collections">
              <Receipt className="h-4 w-4 text-blue-500" />
              <span>Daily Collection Hub</span>
            </Link>
          </Button>

          <Button asChild size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs">
            <Link to="/capital/facilities">
              <Plus className="h-4 w-4" />
              <span>Manage Liabilities</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 6 Executive KPI Metric Cards (Matching Spreadsheet Overview) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Total Outstanding Debt */}
        <Card className="border-l-4 border-l-rose-500 shadow-xs hover:shadow-md transition-all">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Outstanding Debt
            </CardDescription>
            <CardTitle className="text-xl font-bold text-foreground mt-1">
              {isLoading ? "..." : formatINR(kpis?.totalOutstandingDebt)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">
              Across {kpis?.activeFacilitiesCount || 0} active borrowing facilities
            </p>
          </CardContent>
        </Card>

        {/* 2. Monthly Debt Servicing */}
        <Card className="border-l-4 border-l-amber-500 shadow-xs hover:shadow-md transition-all">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Monthly Debt Servicing
            </CardDescription>
            <CardTitle className="text-xl font-bold text-foreground mt-1">
              {isLoading ? "..." : formatINR(kpis?.monthlyDebtServicing)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">Committed EMIs & daily servicing</p>
          </CardContent>
        </Card>

        {/* 3. Net Cash Position */}
        <Card className="border-l-4 border-l-emerald-500 shadow-xs hover:shadow-md transition-all">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net Cash Position
            </CardDescription>
            <CardTitle className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {isLoading ? "..." : formatINR(kpis?.netCashPosition)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">Cumulative cash balance in treasury</p>
          </CardContent>
        </Card>

        {/* 4. Total Capital Infusions */}
        <Card className="border-l-4 border-l-indigo-500 shadow-xs hover:shadow-md transition-all">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Capital Infusions
            </CardDescription>
            <CardTitle className="text-xl font-bold text-foreground mt-1">
              {isLoading ? "..." : formatINR(kpis?.totalCapitalInfusions)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">Angel, equity & founder funding</p>
          </CardContent>
        </Card>

        {/* 5. Principal Repaid to Date */}
        <Card className="border-l-4 border-l-teal-500 shadow-xs hover:shadow-md transition-all">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Principal Repaid
            </CardDescription>
            <CardTitle className="text-xl font-bold text-foreground mt-1">
              {isLoading ? "..." : formatINR(kpis?.totalPrincipalPaid)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">Total debt reduction achieved</p>
          </CardContent>
        </Card>

        {/* 6. Total Interest & Charges Paid */}
        <Card className="border-l-4 border-l-blue-500 shadow-xs hover:shadow-md transition-all">
          <CardHeader className="p-4 pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Interest & Charges
            </CardDescription>
            <CardTitle className="text-xl font-bold text-foreground mt-1">
              {isLoading ? "..." : formatINR(kpis?.totalInterestPaid)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-xs text-muted-foreground">Servicing cost paid across tenors</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Collection Spotlight Banner */}
      <Card className="bg-gradient-to-r from-blue-900/10 via-indigo-900/10 to-teal-900/10 border-blue-200 dark:border-blue-900/50 shadow-xs">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <Receipt className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-base">
                  Daily Collection Financing Monitor
                </h3>
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs">
                  Active tranches: {dailyFinancing?.activeDailyFacilitiesCount || 0}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily collection facilities (e.g. KEISHAMTHONG/GOLDEN tranches) require daily field receipt entry.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase font-medium">Today's Daily Target</p>
              <p className="text-lg font-bold text-foreground">
                {formatINR(dailyFinancing?.dailyTargetDue || 0)}
              </p>
            </div>

            <div className="text-right border-l pl-4 border-border">
              <p className="text-xs text-muted-foreground uppercase font-medium">Collected Today</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {formatINR(dailyFinancing?.collectedToday || 0)}
              </p>
            </div>

            <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
              <Link to="/capital/daily-collections">
                <span>Open Collection Hub</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Layout: Portfolio Breakdown Table & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Debt Portfolio Breakdown (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Debt Portfolio Breakdown</CardTitle>
                <CardDescription className="text-xs">
                  Borrowing exposure categorized by lender institution type
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/capital/facilities">
                  <span>View All Facilities</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                      <th className="py-3 px-4 text-left">Debt Category</th>
                      <th className="py-3 px-4 text-right">Sanctioned</th>
                      <th className="py-3 px-4 text-right">Outstanding</th>
                      <th className="py-3 px-4 text-right">Commitment / Due</th>
                      <th className="py-3 px-4 text-right">Principal Repaid</th>
                      <th className="py-3 px-4 text-right w-28">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {portfolioBreakdown.map((item: any) => {
                      const isDaily = item.isDaily || item.category === "Daily Collection Financing" || item.dueType === "daily";
                      const dueVal = isDaily ? (item.dailyDue || item.dueAmount || item.monthlyDue) : item.monthlyDue;
                      return (
                        <tr key={item.category} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-primary/70" />
                              <span>{item.category}</span>
                              {item.activeFacilitiesCount > 0 && (
                                <span className="text-[11px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">
                                  {item.activeFacilitiesCount}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground">
                            {formatINR(item.sanctionedAmount)}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-foreground">
                            {formatINR(item.currentOutstanding)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-semibold text-foreground">
                                {formatINR(dueVal)}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] uppercase font-bold tracking-wider",
                                  isDaily ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground font-normal"
                                )}
                              >
                                {isDaily ? "Daily Due" : "Monthly Due"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                            {formatINR(item.principalPaid)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs font-medium w-10 text-right">
                                {item.percentageOfTotalDebt}%
                              </span>
                              <div className="w-14 bg-muted rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-primary h-full rounded-full"
                                  style={{ width: `${Math.min(100, item.percentageOfTotalDebt)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border font-bold bg-muted/20">
                      <td className="py-3 px-4">Total Portfolio</td>
                      <td className="py-3 px-4 text-right">
                        {formatINR(portfolioBreakdown.reduce((sum: number, r: any) => sum + r.sanctionedAmount, 0))}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                        {formatINR(kpis?.totalOutstandingDebt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {dailyFinancing?.dailyTargetDue > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-foreground">
                              {formatINR(dailyFinancing.dailyTargetDue)}
                            </span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">
                              Daily Due
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-foreground">
                              {formatINR(kpis?.monthlyDebtServicing)}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-wider">
                              Monthly Due
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                        {formatINR(kpis?.totalPrincipalPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">100.0%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Repayment Ledger Activity */}
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Recent Debt Repayments</CardTitle>
                <CardDescription className="text-xs">
                  Latest recorded installments, EMIs, and daily field collections
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/capital/repayments">
                  <span>Full Ledger</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                      <th className="py-2.5 px-4 text-left">Date</th>
                      <th className="py-2.5 px-4 text-left">Facility</th>
                      <th className="py-2.5 px-4 text-left">Method</th>
                      <th className="py-2.5 px-4 text-left">Ref / UTR</th>
                      <th className="py-2.5 px-4 text-right">Principal</th>
                      <th className="py-2.5 px-4 text-right">Interest</th>
                      <th className="py-2.5 px-4 text-right">Total Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentRepayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-muted-foreground text-xs">
                          No repayment records logged yet.
                        </td>
                      </tr>
                    ) : (
                      recentRepayments.slice(0, 6).map((item: any) => (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {item.paymentDate}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-foreground">
                            <div>{item.facilityName}</div>
                            <span className="text-[11px] text-muted-foreground">{item.category}</span>
                          </td>
                          <td className="py-2.5 px-4 text-xs capitalize">
                            <Badge variant="outline" className="text-[11px] font-normal py-0">
                              {item.paymentMethod.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground">
                            {item.referenceNumber || "-"}
                          </td>
                          <td className="py-2.5 px-4 text-right text-xs">
                            {formatINR(item.principalPaid)}
                          </td>
                          <td className="py-2.5 px-4 text-right text-xs text-muted-foreground">
                            {formatINR(item.interestPaid)}
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold text-foreground">
                            {formatINR(item.totalAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Quick Navigation, Treasury Health & Cash Flow Feed (1 col) */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Capital Actions</CardTitle>
              <CardDescription className="text-xs">
                Frequent operations for treasury and facility servicing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start gap-2 text-xs h-9">
                <Link to="/capital/facilities">
                  <Plus className="h-4 w-4 text-emerald-500" />
                  <span>Register New Borrowing Facility / Advance</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start gap-2 text-xs h-9">
                <Link to="/capital/daily-collections">
                  <Receipt className="h-4 w-4 text-blue-500" />
                  <span>Record Today's Daily Collections</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start gap-2 text-xs h-9">
                <Link to="/capital/repayments">
                  <CreditCard className="h-4 w-4 text-teal-500" />
                  <span>Record Standard Repayment / Loan EMI</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start gap-2 text-xs h-9">
                <Link to="/capital/cash-flow">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span>Log Capital Infusion / Equity Inflow</span>
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Recent Cash Flow / Infusions Ticker */}
          <Card className="shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Treasury Movements</CardTitle>
                <CardDescription className="text-xs">
                  Latest capital injections and operating flows
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/capital/cash-flow">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {recentCashFlow.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No cash flow entries recorded yet.
                  </div>
                ) : (
                  recentCashFlow.slice(0, 5).map((cf: any) => {
                    const isInflow = parseFloat(cf.inflowAmount) > 0;
                    return (
                      <div key={cf.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/20">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {isInflow ? (
                              <ArrowDownRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <ArrowUpRight className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            )}
                            <p className="text-xs font-medium text-foreground truncate">
                              {cf.description || cf.category}
                            </p>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {cf.entryDate} • {cf.partyName || cf.category}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-semibold ${isInflow ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                            {isInflow ? `+${formatINR(cf.inflowAmount)}` : `-${formatINR(cf.outflowAmount)}`}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {cf.entryCode}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
