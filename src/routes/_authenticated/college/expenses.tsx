import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BanknoteArrowDown, CalendarIcon, Edit, Eye, Search, ShieldCheck, Trash2, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/lib/toast";
import { useUserPermissions } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/college/expenses")({
  component: CollegeExpenseVouchersPage,
});

interface ExpenseVoucher {
  id: number;
  reportId: number;
  reportDate: string;
  reportStatus: string;
  status: string;
  category: string;
  voucherNo: string;
  payee: string;
  amount: string;
  narration?: string | null;
  source: "referrer_payout" | "daily_closing";
  referrerPaymentId?: number | null;
  referrerName?: string | null;
  paymentMode: string;
  referenceNumber?: string | null;
  allocations: Array<{
    id: number;
    candidateName: string;
    candidateNo: string;
    candidateType: "student" | "applicant";
    amount: string;
    notes?: string | null;
  }>;
}

interface ExpenseResponse {
  data: ExpenseVoucher[];
  pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
  summary: { totalAmount: number; voucherCount: number };
}

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full min-w-[220px] justify-start gap-2 whitespace-nowrap font-normal">
          <CalendarIcon size={15} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">{label}</span>
          <span>{value ? format(parseISO(value), "dd MMM yyyy") : "Select date"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ? parseISO(value) : undefined}
          onSelect={(date) => date && onChange(format(date, "yyyy-MM-dd"))}
        />
      </PopoverContent>
    </Popover>
  );
}

function CollegeExpenseVouchersPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useUserPermissions();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const [startDate, setStartDate] = React.useState(monthStart);
  const [endDate, setEndDate] = React.useState(today);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [editing, setEditing] = React.useState<ExpenseVoucher | null>(null);
  const [deleting, setDeleting] = React.useState<ExpenseVoucher | null>(null);
  const [viewing, setViewing] = React.useState<ExpenseVoucher | null>(null);
  const [payee, setPayee] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [narration, setNarration] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching } = useQuery<ExpenseResponse>({
    queryKey: ["nursing", "college-expenses", startDate, endDate, debouncedSearch, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate,
        endDate,
        page: String(page),
        pageSize: String(pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const response = await fetch(`/api/nursing/college-expenses?${params}`);
      if (!response.ok) throw new Error("Failed to load college expense vouchers");
      return response.json();
    },
  });

  const refreshRelatedQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["nursing", "college-expenses"] });
    queryClient.invalidateQueries({ queryKey: ["nursing", "reports", "daily-income-expenses"] });
    queryClient.invalidateQueries({ queryKey: ["daily-closing"] });
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const response = await fetch(`/api/nursing/college-expenses/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payee: payee.trim(), amount: Number(amount), narration: narration.trim() || null }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update expense voucher");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Expense voucher updated successfully");
      setEditing(null);
      refreshRelatedQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/nursing/college-expenses/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete expense voucher");
      }
      return response.json();
    },
    onSuccess: () => {
      toast.success("Expense voucher deleted successfully");
      setDeleting(null);
      refreshRelatedQueries();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const openEdit = (voucher: ExpenseVoucher) => {
    setEditing(voucher);
    setPayee(voucher.payee);
    setAmount(String(voucher.amount));
    setNarration(voucher.narration || "");
  };

  const rows = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BanknoteArrowDown className="h-6 w-6 text-rose-600" /> College Expense Vouchers
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ACON expense payouts recorded through the shared Daily Closing ledger.
          </p>
        </div>
        <div className="rounded-lg border bg-muted/30 px-4 py-2 text-right">
          <p className="text-[11px] text-muted-foreground">Filtered expenditure</p>
          <p className="font-mono text-xl font-bold text-rose-600">₹{Number(data?.summary.totalAmount || 0).toLocaleString()}</p>
        </div>
      </div>

      {!isAdmin && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <ShieldCheck size={16} /> You have read-only access. Only administrators can modify or delete vouchers.
        </div>
      )}

      <Card>
        <CardContent className="grid gap-3 p-4 lg:grid-cols-[minmax(240px,1fr)_220px_220px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search voucher, payee, or notes..." className="pl-9" />
          </div>
          <DateFilter label="From" value={startDate} onChange={(value) => { setStartDate(value); setPage(1); }} />
          <DateFilter label="To" value={endDate} onChange={(value) => { setEndDate(value); setPage(1); }} />
          <Button variant="outline" onClick={() => { setSearch(""); setStartDate(monthStart); setEndDate(today); setPage(1); }}>Reset</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b p-4">
          <CardTitle className="text-base">Expense Voucher Register</CardTitle>
          <CardDescription>
            {isFetching ? "Refreshing..." : `${data?.summary.voucherCount || 0} voucher entries in the selected period`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Voucher #</th>
                  <th className="p-3">Payee / Details</th>
                  <th className="p-3">Notes</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Voucher Status</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading expense vouchers...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No college expense vouchers found.</td></tr>
                ) : rows.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-muted/30">
                    <td className="p-3 font-mono text-muted-foreground">{voucher.reportDate}</td>
                    <td className="p-3">
                      <button type="button" onClick={() => setViewing(voucher)} className="font-mono font-bold text-rose-700 hover:underline dark:text-rose-300">
                        {voucher.voucherNo}
                      </button>
                    </td>
                    <td className="p-3 font-semibold">
                      {voucher.payee}
                      {voucher.source === "referrer_payout" && (
                        <span className="mt-1 block text-[10px] font-medium text-teal-700 dark:text-teal-300">
                          {voucher.allocations.length} referral allocation{voucher.allocations.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </td>
                    <td className="max-w-[260px] truncate p-3 text-muted-foreground" title={voucher.narration || ""}>{voucher.narration || "—"}</td>
                    <td className="p-3 text-right font-mono font-bold">₹{Number(voucher.amount).toLocaleString()}</td>
                    <td className="p-3 text-center">
                      <span className={voucher.status === "submitted"
                        ? "rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "rounded-full border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground"}
                      >
                        {voucher.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setViewing(voucher)} title="View payout details">
                          <Eye size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" disabled={!isAdmin} onClick={() => openEdit(voucher)} title={isAdmin ? "Edit voucher" : "Admin only"}>
                          <Edit size={14} />
                        </Button>
                        <Button variant="ghost" size="sm" disabled={!isAdmin} onClick={() => setDeleting(voucher)} className="text-rose-600" title={isAdmin ? "Delete voucher" : "Admin only"}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalRecords > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 border-t p-4 text-xs sm:flex-row">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{pagination.totalRecords} vouchers</span>
                <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded border bg-background px-2 py-1">
                  <option value={10}>10 / page</option><option value={20}>20 / page</option><option value={50}>50 / page</option><option value={100}>100 / page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</Button>
                <span>Page {pagination.page} of {pagination.totalPages}</span>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage((value) => Math.min(pagination.totalPages, value + 1))}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BanknoteArrowDown size={19} className="text-rose-600" /> Expense Voucher Details</DialogTitle>
            <DialogDescription>{viewing?.voucherNo} · {viewing?.reportDate}</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-4 text-sm sm:grid-cols-4">
                <div><span className="block text-[11px] text-muted-foreground">Payee</span><strong>{viewing.referrerName || viewing.payee}</strong></div>
                <div><span className="block text-[11px] text-muted-foreground">Type</span><strong>{viewing.source === "referrer_payout" ? "Referral payout" : "College expense"}</strong></div>
                <div><span className="block text-[11px] text-muted-foreground">Reference</span><strong>{viewing.referenceNumber || "—"}</strong></div>
                <div><span className="block text-[11px] text-muted-foreground">Total amount</span><strong className="font-mono text-rose-600">₹{Number(viewing.amount).toLocaleString()}</strong></div>
              </div>

              {viewing.source === "referrer_payout" && (
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold"><Users size={16} className="text-teal-600" /> Payout allocations</h3>
                  {viewing.allocations.length === 0 ? (
                    <p className="rounded-lg border p-4 text-center text-sm text-muted-foreground">No candidate allocations were recorded for this payout.</p>
                  ) : (
                    <div className="overflow-hidden rounded-lg border">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b bg-muted/50 text-muted-foreground"><tr><th className="p-3">Candidate / Student</th><th className="p-3">Identifier</th><th className="p-3">Type</th><th className="p-3 text-right">Paid Amount</th></tr></thead>
                        <tbody className="divide-y">
                          {viewing.allocations.map((allocation) => (
                            <tr key={allocation.id}>
                              <td className="p-3"><strong>{allocation.candidateName}</strong>{allocation.notes && <span className="mt-0.5 block text-[10px] text-muted-foreground">{allocation.notes}</span>}</td>
                              <td className="p-3 font-mono">{allocation.candidateNo}</td>
                              <td className="p-3 capitalize">{allocation.candidateType}</td>
                              <td className="p-3 text-right font-mono font-bold text-teal-700 dark:text-teal-300">₹{Number(allocation.amount).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {viewing.narration && <div className="rounded-lg border p-3 text-sm"><span className="block text-[11px] text-muted-foreground">Notes</span>{viewing.narration}</div>}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewing(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Expense Voucher</DialogTitle><DialogDescription>{editing?.voucherNo} · {editing?.reportDate}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <label className="block space-y-1"><span className="text-xs font-medium">Payee / Details</span><Input value={payee} onChange={(event) => setPayee(event.target.value)} /></label>
            <label className="block space-y-1"><span className="text-xs font-medium">Amount</span><Input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
            <label className="block space-y-1"><span className="text-xs font-medium">Notes</span><textarea value={narration} onChange={(event) => setNarration(event.target.value)} className="min-h-24 w-full rounded-md border bg-background p-2 text-sm" /></label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={updateMutation.isPending || !payee.trim() || !(Number(amount) > 0)} onClick={() => updateMutation.mutate()}>{updateMutation.isPending ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-rose-600">Delete Expense Voucher?</DialogTitle><DialogDescription>This permanently removes {deleting?.voucherNo} from the College and Daily Closing ledgers.</DialogDescription></DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-semibold">{deleting?.payee}</p>
            <p className="font-mono text-rose-600">₹{Number(deleting?.amount || 0).toLocaleString()}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleting && deleteMutation.mutate(deleting.id)}>{deleteMutation.isPending ? "Deleting..." : "Delete Voucher"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
