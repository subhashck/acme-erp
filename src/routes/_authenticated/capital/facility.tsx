import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Calendar,
  ChevronRight,
  Coins,
  CreditCard,
  ExternalLink,
  Filter,
  Grid,
  Landmark,
  Layers,
  List,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Wallet,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { calculateCurrentInstallmentDue } from "@/lib/capital-calculator";

export const Route = createFileRoute("/_authenticated/capital/facility")({
  component: FacilityRouteComponent,
});

function formatINR(val: number | string | null | undefined): string {
  const num = typeof val === "number" ? val : parseFloat(String(val || 0)) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

const CATEGORIES = [
  "All",
  "Bank Loan",
  "NBFC",
  "Chit Fund",
  "Private Lending",
  "Daily Collection Financing",
  "Credit Card",
  "Other",
];

function FacilityRouteComponent() {
  const matches = useMatches();
  // Check if current route is the exact /capital/facility route or a child like /capital/facility/$id
  const isExactFacility = matches[matches.length - 1]?.routeId === Route.id;

  if (!isExactFacility) {
    return <Outlet />;
  }

  return <FacilityDirectoryView />;
}

function FacilityDirectoryView() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("All");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");

  const {
    data: facilities = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<any[]>({
    queryKey: ["capital-facilities", selectedCategory, statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "All") params.set("category", selectedCategory);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/capital/facilities?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch facilities");
      return res.json();
    },
  });

  // Calculate aggregates
  const stats = React.useMemo(() => {
    let totalSanctioned = 0;
    let totalOutstanding = 0;
    let totalPrincipalPaid = 0;
    let activeCount = 0;

    facilities.forEach((fac) => {
      const sanc = parseFloat(fac.sanctionedAmount || 0);
      const out = parseFloat(fac.outstandingBalance || 0);
      const paid = parseFloat(fac.totalPrincipalPaid || 0);
      totalSanctioned += sanc;
      totalOutstanding += out;
      totalPrincipalPaid += paid;
      if (fac.status === "active") activeCount++;
    });

    const percentRepaid =
      totalSanctioned > 0
        ? Math.min(100, Math.round((totalPrincipalPaid / totalSanctioned) * 100))
        : 0;

    return {
      totalSanctioned,
      totalOutstanding,
      totalPrincipalPaid,
      activeCount,
      totalCount: facilities.length,
      percentRepaid,
    };
  }, [facilities]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/capital" className="hover:underline flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" />
              <span>Capital Finances</span>
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Facility 360° Profiles</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Layers className="h-7 w-7 text-primary" />
            <span>Facility 360° Profiles</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select any borrowing facility to inspect its full 360° profile, live amortization progress, repayment history, and servicing metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="cursor-pointer text-xs h-9"
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRefetching && "animate-spin")} />
            Refresh
          </Button>
          <Link to="/capital/facilities">
            <Button variant="outline" size="sm" className="cursor-pointer text-xs h-9 gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Manage Liabilities
            </Button>
          </Link>
        </div>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Facilities
            </CardTitle>
            <Landmark className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              of {stats.totalCount} total registered facilities
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Sanctioned
            </CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground font-mono">
              {formatINR(stats.totalSanctioned)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Approved borrowing facilities
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Outstanding Debt
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground font-mono">
              {formatINR(stats.totalOutstanding)}
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
              Active principal liability
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Principal Repaid
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatINR(stats.totalPrincipalPaid)}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <Progress value={stats.percentRepaid} className="h-1.5 flex-1" />
              <span className="text-[11px] font-semibold text-muted-foreground">
                {stats.percentRepaid}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border/60">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by facility name, code, lender..."
              className="pl-9 text-xs h-9 bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs h-9 px-3 rounded-md border border-input bg-background text-foreground cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="closed">Closed Only</option>
              <option value="restructured">Restructured</option>
            </select>

            <div className="flex items-center border border-border rounded-md overflow-hidden p-0.5 bg-muted/40">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-sm cursor-pointer"
                onClick={() => setViewMode("cards")}
                title="Cards View"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-sm cursor-pointer"
                onClick={() => setViewMode("table")}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 cursor-pointer",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Facilities Directory List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading facility profiles...</p>
        </div>
      ) : facilities.length === 0 ? (
        <Card className="py-16 text-center border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3">
            <Landmark className="h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-lg font-semibold text-foreground">No Facilities Found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchQuery || selectedCategory !== "All" || statusFilter !== "all"
                ? "No borrowing facilities match the specified search or filter criteria."
                : "No borrowing facilities have been registered yet."}
            </p>
            {(searchQuery || selectedCategory !== "All" || statusFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setStatusFilter("all");
                }}
                className="cursor-pointer text-xs mt-2"
              >
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "cards" ? (
        /* Grid of Facility Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {facilities.map((fac: any) => {
            const sanctioned = parseFloat(fac.sanctionedAmount || 0);
            const outstanding = parseFloat(fac.outstandingBalance || 0);
            const principalPaid = parseFloat(fac.totalPrincipalPaid || 0);
            const percentPaid =
              sanctioned > 0
                ? Math.min(100, Math.round((principalPaid / sanctioned) * 100))
                : 0;
            const due = calculateCurrentInstallmentDue(fac);
            const installment = due.dueAmount;

            return (
              <Card
                key={fac.id}
                className="shadow-xs hover:shadow-md transition-all border-border/70 flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Card Header Banner */}
                  <div className="p-4 border-b border-border/50 bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[11px] text-muted-foreground font-semibold">
                            {fac.facilityCode || `#${fac.id}`}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {fac.category}
                          </Badge>
                        </div>
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {fac.name}
                        </h3>
                      </div>

                      <Badge
                        className={cn(
                          "text-[10px] uppercase font-semibold shrink-0",
                          fac.status === "active"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            : fac.status === "closed"
                            ? "bg-slate-500/10 text-slate-700 dark:text-slate-300 border border-slate-500/30"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {fac.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{fac.lenderName}</span>
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <CardContent className="p-4 space-y-4">
                    {/* Sanctioned vs Outstanding */}
                    <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg border border-border/40">
                      <div>
                        <div className="text-[11px] text-muted-foreground font-medium">Sanctioned</div>
                        <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                          {formatINR(sanctioned)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] text-muted-foreground font-medium">Outstanding</div>
                        <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                          {formatINR(outstanding)}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Principal Repaid</span>
                        <span className="font-semibold text-foreground">{percentPaid}%</span>
                      </div>
                      <Progress value={percentPaid} className="h-1.5" />
                    </div>

                    {/* Terms Details */}
                    <div className="grid grid-cols-2 gap-y-2 text-xs border-t border-border/40 pt-3">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Interest Rate</span>
                        <span className="font-semibold text-foreground">
                          {fac.interestRate ? `${fac.interestRate}% ${fac.interestType || "reducing"}` : "0%"}
                        </span>
                      </div>

                      <div>
                        <span className="text-muted-foreground block text-[11px]">Installment / Due</span>
                        <span className="font-semibold font-mono text-foreground">
                          {installment > 0 ? formatINR(installment) : "—"}
                          {fac.repaymentFrequency ? ` / ${fac.repaymentFrequency}` : ""}
                        </span>
                      </div>

                      {fac.isInMoratorium && (
                        <div className="col-span-2 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>Moratorium active ({fac.moratoriumMonths || 0} mos)</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 pt-0">
                  <Link
                    to="/capital/facility/$id"
                    params={{ id: String(fac.id) }}
                    className="w-full block"
                  >
                    <Button
                      variant="default"
                      className="w-full cursor-pointer text-xs font-semibold h-9 gap-1.5 justify-center shadow-xs"
                    >
                      <span>View 360° Profile</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="overflow-hidden border-border/70 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-muted-foreground">
                  <th className="py-3 px-4 font-semibold">Code</th>
                  <th className="py-3 px-4 font-semibold">Facility Name</th>
                  <th className="py-3 px-4 font-semibold">Lender</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold text-right">Sanctioned</th>
                  <th className="py-3 px-4 font-semibold text-right">Outstanding</th>
                  <th className="py-3 px-4 font-semibold text-center">Progress</th>
                  <th className="py-3 px-4 font-semibold text-right">Installment</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {facilities.map((fac: any) => {
                  const sanctioned = parseFloat(fac.sanctionedAmount || 0);
                  const outstanding = parseFloat(fac.outstandingBalance || 0);
                  const principalPaid = parseFloat(fac.totalPrincipalPaid || 0);
                  const percentPaid =
                    sanctioned > 0
                      ? Math.min(100, Math.round((principalPaid / sanctioned) * 100))
                      : 0;
                  const due = calculateCurrentInstallmentDue(fac);
                  const installment = due.dueAmount;

                  return (
                    <tr key={fac.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        {fac.facilityCode || `#${fac.id}`}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <Link
                          to="/capital/facility/$id"
                          params={{ id: String(fac.id) }}
                          className="hover:underline text-primary"
                        >
                          {fac.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{fac.lenderName}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[11px]">
                          {fac.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium">
                        {formatINR(sanctioned)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-amber-600 dark:text-amber-400">
                        {formatINR(outstanding)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={percentPaid} className="h-1.5 w-16" />
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {percentPaid}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {installment > 0 ? (
                          <>
                            {formatINR(installment)}
                            <span className="text-[10px] text-muted-foreground ml-1">
                              /{fac.repaymentFrequency?.[0]}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          className={cn(
                            "text-[10px] uppercase font-semibold",
                            fac.status === "active"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {fac.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to="/capital/facility/$id"
                          params={{ id: String(fac.id) }}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer text-xs h-7 gap-1"
                          >
                            <span>Profile</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
