import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, ChevronLeft, ChevronRight, History, Plus, Search, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { FrontOfficeAccessGuard } from "@/components/FrontOfficeAccessGuard";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";

export const Route = createFileRoute("/_authenticated/front-office/")({
  component: () => <FrontOfficeAccessGuard><SavedHandoversPage /></FrontOfficeAccessGuard>,
});

const money = (value: unknown) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(Number(value || 0));

function SavedHandoversPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [showAllVersions, setShowAllVersions] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const reportsQuery = useQuery({
    queryKey: ["front-office", "reports", showAllVersions, page, pageSize, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (showAllVersions) params.set("all", "true");
      if (debouncedSearch) params.set("search", debouncedSearch);
      const response = await fetch(`/api/front-office/reports?${params}`);
      if (!response.ok) throw new Error("Failed to load saved handovers");
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/front-office/reports/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete handover");
    },
    onSuccess: () => {
      toast.success("Saved handover deleted");
      queryClient.invalidateQueries({ queryKey: ["front-office", "reports"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reports = reportsQuery.data?.data || [];
  const pagination = reportsQuery.data?.pagination || { page: 1, pageSize, totalRecords: 0, totalPages: 1 };

  return (
    <ModuleLayout
      title="Front Office Handovers"
      description="Review saved daily and shift handovers, including previous versions."
      action={<Button asChild className="gap-2"><Link to={"/front-office/new" as any}><Plus className="size-4" />New Handover</Link></Button>}
    >
      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><History className="size-5 text-teal-600" />Saved Handovers</CardTitle>
              <CardDescription>The latest version for each date and shift is active by default.</CardDescription>
            </div>
            <Button variant={showAllVersions ? "default" : "outline"} size="sm" onClick={() => { setShowAllVersions((value) => !value); setPage(1); }}>
              {showAllVersions ? "Showing all versions" : "Active handovers only"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t pt-4">
            <div className="relative min-w-60 flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search date, shift, file, or staff…" className="h-9 pl-9" />
            </div>
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value={10}>10 per page</option><option value={20}>20 per page</option><option value={50}>50 per page</option><option value={100}>100 per page</option>
            </select>
            <span className="text-sm text-muted-foreground">{pagination.totalRecords} saved</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {reportsQuery.isLoading ? <div className="p-12 text-center text-muted-foreground">Loading saved handovers…</div>
            : reportsQuery.isError ? <div className="p-12 text-center text-destructive">Could not load saved handovers.</div>
            : reports.length === 0 ? <div className="p-12 text-center text-muted-foreground">No saved handovers found.</div>
            : <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-y bg-muted/50 text-left"><th className="p-3">Date</th><th className="p-3">Shift / Version</th><th className="p-3">Prepared By</th><th className="p-3 text-right">Billed</th><th className="p-3 text-right">Collected</th><th className="p-3 text-right">Outflows</th><th className="p-3 text-right">Net Handover</th><th className="p-3 text-right">Pending</th><th className="p-3 text-right">Actions</th></tr></thead>
              <tbody>{reports.map((report: any) => <tr key={report.id} className="border-b hover:bg-muted/30">
                <td className="p-3 font-medium"><span className="flex items-center gap-2"><Calendar className="size-4 text-muted-foreground" />{String(report.reportDate).split("T")[0]}</span></td>
                <td className="p-3"><div className="flex flex-wrap gap-1.5"><Badge variant="outline">{report.shiftLabel || "Full Day"}</Badge><Badge variant="secondary">v{report.version || 1}</Badge>{report.isActive && <Badge className="bg-emerald-600">Active</Badge>}</div></td>
                <td className="p-3"><span className="flex items-center gap-1.5"><UserCheck className="size-4 text-muted-foreground" />{report.createdByName || "Staff"}</span></td>
                <td className="p-3 text-right">{money(report.totalBill)}</td><td className="p-3 text-right text-emerald-700">{money(report.totalCollected)}</td><td className="p-3 text-right text-orange-600">{money(report.totalExpenses)}</td><td className="p-3 text-right font-semibold">{money(report.netCollections ?? Number(report.totalCollected || 0) - Number(report.totalExpenses || 0))}</td><td className="p-3 text-right text-rose-600">{money(report.totalPending)}</td>
                <td className="p-3 text-right"><div className="flex justify-end gap-2"><Button asChild size="sm" variant="outline"><Link to={"/front-office/new" as any} search={{ reportId: report.id } as any}>Open</Link></Button><Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => confirm("Delete this saved handover?") && deleteMutation.mutate(report.id)}><Trash2 className="size-4" /></Button></div></td>
              </tr>)}</tbody>
            </table></div>}
          <div className="flex items-center justify-between border-t p-4 text-sm text-muted-foreground"><span>Page {pagination.page} of {pagination.totalPages}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="size-4" />Previous</Button><Button size="sm" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight className="size-4" /></Button></div></div>
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
