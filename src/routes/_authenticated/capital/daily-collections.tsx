import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Landmark,
  Plus,
  Receipt,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  AlertCircle,
  Building2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/capital/daily-collections")({
  component: DailyCollectionsPage,
});

function formatINR(val: number | string | null | undefined): string {
  const num = typeof val === "number" ? val : parseFloat(String(val || 0)) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

export function DailyCollectionsPage() {
  const queryClient = useQueryClient();
  const [isBatchModalOpen, setIsBatchModalOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().slice(0, 10));

  // Fetch Daily Collection Data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["capital-daily-collections"],
    queryFn: async () => {
      const res = await fetch("/api/capital/daily-collections");
      if (!res.ok) throw new Error("Failed to fetch daily collections");
      return res.json();
    },
  });

  const totalDailyTarget = data?.totalDailyTarget || 0;
  const totalCollectedToday = data?.totalCollectedToday || 0;
  const completionRate = data?.completionRate || 0;
  const facilitiesStatus = data?.facilities || [];
  const recentHistory = data?.recentHistory || [];

  // Batch Form State
  const [batchDate, setBatchDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [batchRef, setBatchRef] = React.useState("");
  const [batchMethod, setBatchMethod] = React.useState("daily_collection");
  const [batchItems, setBatchItems] = React.useState<any[]>([]);

  // Pre-fill batch form items based on active daily facilities
  React.useEffect(() => {
    if (facilitiesStatus.length > 0 && isBatchModalOpen) {
      const items = facilitiesStatus
        .filter((f: any) => f.facility.status === "active")
        .map((f: any) => {
          const totalAmt = parseFloat(f.facility.installmentAmount || 0);
          const outBal = parseFloat(f.facility.outstandingBalance || 0);
          const rate = parseFloat(f.facility.interestRate || 15);

          // Estimate daily interest = (balance * rate / 100) / 365, balance is principal
          const estInterest = Math.round((outBal * (rate / 100)) / 365);
          const estPrincipal = Math.max(0, totalAmt - estInterest);

          return {
            facilityId: f.facility.id,
            facilityName: f.facility.name,
            lenderName: f.facility.lenderName,
            totalAmount: totalAmt,
            principalPaid: estPrincipal,
            interestPaid: estInterest,
            chargesPaid: 0,
            notes: "",
            included: !f.isCollectedToday, // auto-select uncollected
          };
        });
      setBatchItems(items);
    }
  }, [facilitiesStatus, isBatchModalOpen]);

  // Bulk Mutation
  const bulkMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/capital/repayments/bulk-daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to log daily collections");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast.success(data.message || "Daily collections recorded successfully");
      setIsBatchModalOpen(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["capital-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["capital-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["capital-repayments"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to log daily collections");
    },
  });

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selected = batchItems.filter((item) => item.included && item.totalAmount > 0);
    if (selected.length === 0) {
      toast.error("Please select at least one facility to record collection");
      return;
    }

    bulkMutation.mutate({
      paymentDate: batchDate,
      paymentMethod: batchMethod,
      referenceNumber: batchRef.trim() || null,
      items: selected.map((item) => ({
        facilityId: item.facilityId,
        principalPaid: parseFloat(item.principalPaid) || 0,
        interestPaid: parseFloat(item.interestPaid) || 0,
        chargesPaid: parseFloat(item.chargesPaid) || 0,
        totalAmount: parseFloat(item.totalAmount) || 0,
        notes: item.notes || null,
      })),
    });
  };

  // Revert payment mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/capital/repayments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revert payment");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Daily collection record reverted and balance restored");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["capital-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["capital-facilities"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to revert payment");
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
            <span className="text-foreground font-medium">Daily Collection Financing Hub</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Daily Collection Financing</span>
            <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-xs font-semibold">
              Live Field Monitor
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tracking daily market advances, daily installments, and agent collection receipts (Keishamthong / Golden tranches)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsBatchModalOpen(true)}
            size="sm"
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-xs"
          >
            <Receipt className="h-4 w-4" />
            <span>Record Today's Batch Collection</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards: Today's Collection Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Daily Commitment Target */}
        <Card className="border-l-4 border-l-blue-500 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
              Today's Daily Target
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground mt-1">
              {formatINR(totalDailyTarget)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Across {facilitiesStatus.length} active daily advances
            </p>
          </CardContent>
        </Card>

        {/* 2. Collected Today */}
        <Card className="border-l-4 border-l-emerald-500 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
              Collected Today
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatINR(totalCollectedToday)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <p className="text-xs text-muted-foreground">
              {completionRate}% of today's target achieved
            </p>
          </CardContent>
        </Card>

        {/* 3. Pending Collection */}
        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
              Pending Collection
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {formatINR(Math.max(0, totalDailyTarget - totalCollectedToday))}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Remaining dues for date: {data?.todayDate}
            </p>
          </CardContent>
        </Card>

        {/* 4. Total Outstanding Daily Balance */}
        <Card className="border-l-4 border-l-rose-500 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
              Total Daily Debt Outstanding
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {formatINR(
                facilitiesStatus.reduce((sum: number, f: any) => sum + parseFloat(f.facility.outstandingBalance || 0), 0)
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Principal remaining across daily tranches
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Facility Status Checklist Cards */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>Today's Daily Collection Checklist ({data?.todayDate})</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Direct verification of agent receipts for each active daily financing tranche
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsBatchModalOpen(true)}
            size="sm"
            variant="outline"
            className="text-xs h-8"
          >
            Quick Batch Entry
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facilitiesStatus.map((item: any) => {
              const fac = item.facility;
              const isDone = item.isCollectedToday;

              return (
                <div
                  key={fac.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isDone
                      ? "bg-emerald-500/5 border-emerald-500/30 dark:bg-emerald-950/10"
                      : "bg-card border-border hover:border-blue-500/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground text-sm">{fac.name}</h4>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          #{fac.facilityCode}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Lender: <strong className="text-foreground">{fac.lenderName}</strong>
                      </p>
                    </div>

                    {isDone ? (
                      <Badge className="bg-emerald-600 text-white text-[11px] gap-1 py-0.5 px-2">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Collected</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[11px] py-0.5 px-2">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>Due Today</span>
                      </Badge>
                    )}
                  </div>

                  {/* Financial Metrics */}
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Daily Due</span>
                      <strong className="text-foreground text-sm">{formatINR(fac.installmentAmount)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Outstanding</span>
                      <strong className="text-rose-600 dark:text-rose-400 text-xs">{formatINR(fac.outstandingBalance)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Principal Repaid</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 text-xs">{formatINR(fac.totalPrincipalPaid)}</strong>
                    </div>
                  </div>

                  {/* Today payment details or action */}
                  <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                    {isDone ? (
                      <div className="text-[11px] text-muted-foreground">
                        Receipt / Ref: <strong className="text-foreground font-mono">{item.todayPayment?.referenceNumber || "Logged"}</strong>
                        <span className="ml-2">({formatINR(item.todayPayment?.totalAmount)})</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">No payment logged yet for today</span>
                    )}

                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs text-primary px-2">
                      <Link to="/capital/facility/$id" params={{ id: fac.id.toString() }}>
                        <span>Details</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Historical Daily Collections Audit Log */}
      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-bold">Daily Collection History (Last 30 Days)</CardTitle>
            <CardDescription className="text-xs">
              Audit log of recorded daily field collections across Keishamthong and other advances
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                  <th className="py-2.5 px-4 text-left">Date</th>
                  <th className="py-2.5 px-4 text-left">Facility Name</th>
                  <th className="py-2.5 px-4 text-left">Receipt / UTR #</th>
                  <th className="py-2.5 px-4 text-right">Principal Paid</th>
                  <th className="py-2.5 px-4 text-right">Interest Paid</th>
                  <th className="py-2.5 px-4 text-right font-bold">Total Collected</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs">
                      No daily collection logs found in recent history.
                    </td>
                  </tr>
                ) : (
                  recentHistory.map((item: any) => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {item.paymentDate}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        {item.facilityName}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs font-bold text-foreground">
                        {item.referenceNumber || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatINR(item.principalPaid)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs text-muted-foreground">
                        {formatINR(item.interestPaid)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-foreground">
                        {formatINR(item.totalAmount)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <Badge variant="outline" className="text-[10px] uppercase font-semibold text-emerald-600 border-emerald-500/30">
                          {item.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Revert collection on ${item.paymentDate} (Ref: ${item.referenceNumber}) for ${formatINR(item.totalAmount)}?`)) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
                          title="Revert collection"
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
        </CardContent>
      </Card>

      {/* Batch Daily Collection Entry Dialog */}
      <Dialog open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-blue-600" />
              <span>Record Daily Collection Batch</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              One-click entry for daily collector receipts (e.g. Golden 20K & Golden 15K)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBatchSubmit} className="space-y-4 py-1 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg border border-border/50">
              <div className="space-y-1">
                <Label htmlFor="batchDate" className="text-xs font-semibold">Collection Date *</Label>
                <Input
                  id="batchDate"
                  type="date"
                  value={batchDate}
                  onChange={(e) => setBatchDate(e.target.value)}
                  required
                  className="h-8 text-xs bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="batchRef" className="text-xs font-semibold">Collector Receipt / UTR #</Label>
                <Input
                  id="batchRef"
                  placeholder="e.g. 22023, 20882"
                  value={batchRef}
                  onChange={(e) => setBatchRef(e.target.value)}
                  className="h-8 text-xs font-mono bg-background"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="batchMethod" className="text-xs font-semibold">Method</Label>
                <select
                  id="batchMethod"
                  value={batchMethod}
                  onChange={(e) => setBatchMethod(e.target.value)}
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="daily_collection">Daily Collection (Agent / Cash)</option>
                  <option value="bank_transfer">Bank Transfer / UPI</option>
                  <option value="cash">Direct Cash Handover</option>
                </select>
              </div>
            </div>

            {/* Facilities Checklist Table */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Select Tranches & Confirm Daily Amounts</Label>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold">
                      <th className="py-2 px-3 text-center w-10">Select</th>
                      <th className="py-2 px-3 text-left">Facility</th>
                      <th className="py-2 px-3 text-right">Principal (₹)</th>
                      <th className="py-2 px-3 text-right">Interest (₹)</th>
                      <th className="py-2 px-3 text-right">Total Due (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {batchItems.map((item, idx) => (
                      <tr key={item.facilityId} className={item.included ? "bg-card" : "bg-muted/20 opacity-60"}>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={item.included}
                            onChange={(e) => {
                              const copy = [...batchItems];
                              copy[idx].included = e.target.checked;
                              setBatchItems(copy);
                            }}
                            className="rounded border-input text-primary"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <strong className="text-foreground block">{item.facilityName}</strong>
                          <span className="text-[10px] text-muted-foreground">{item.lenderName}</span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Input
                            type="number"
                            value={item.principalPaid}
                            onChange={(e) => {
                              const copy = [...batchItems];
                              copy[idx].principalPaid = e.target.value;
                              const p = parseFloat(e.target.value) || 0;
                              const i = parseFloat(copy[idx].interestPaid) || 0;
                              copy[idx].totalAmount = p + i;
                              setBatchItems(copy);
                            }}
                            disabled={!item.included}
                            className="h-7 w-24 text-right font-mono text-xs inline-block"
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <Input
                            type="number"
                            value={item.interestPaid}
                            onChange={(e) => {
                              const copy = [...batchItems];
                              copy[idx].interestPaid = e.target.value;
                              const i = parseFloat(e.target.value) || 0;
                              const p = parseFloat(copy[idx].principalPaid) || 0;
                              copy[idx].totalAmount = p + i;
                              setBatchItems(copy);
                            }}
                            disabled={!item.included}
                            className="h-7 w-24 text-right font-mono text-xs inline-block"
                          />
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-foreground">
                          {formatINR(item.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-muted/40 font-bold">
                      <td colSpan={4} className="py-2 px-3 text-right">Total Batch Collection:</td>
                      <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400">
                        {formatINR(
                          batchItems.filter((i) => i.included).reduce((sum, i) => sum + (parseFloat(i.totalAmount) || 0), 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBatchModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={bulkMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {bulkMutation.isPending ? "Recording Collections..." : "Submit Batch Collection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
