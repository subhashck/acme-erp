import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { ArrowLeft, CheckCircle2, Database, Download, FileSpreadsheet, IndianRupee, Loader2, Search, Upload, Users, AlertTriangle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { FrontOfficeAccessGuard } from "@/components/FrontOfficeAccessGuard";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { cn } from "@/utils/cn";
import { reconcileRazorpayRows, type RazorpayReconciliationRow, type ReconciliationPatient } from "@/lib/razorpay-reconciliation";

export const Route = createFileRoute("/_authenticated/front-office/razorpay-reconciliation")({
  component: () => <FrontOfficeAccessGuard><RazorpayReconciliationPage /></FrontOfficeAccessGuard>,
});

const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);

function RazorpayReconciliationPage() {
  const queryClient = useQueryClient();
  const [fileName, setFileName] = React.useState("");
  const [rawRows, setRawRows] = React.useState<Record<string, unknown>[]>([]);
  const [savedReconciliationId, setSavedReconciliationId] = React.useState<number | null>(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | RazorpayReconciliationRow["reconciliationStatus"]>("all");
  const patientsQuery = useQuery<{ data: ReconciliationPatient[] }>({
    queryKey: ["front-office", "patients", "reconciliation"],
    queryFn: async () => {
      const response = await fetch("/api/front-office/patients?all=true");
      if (!response.ok) throw new Error("Could not load patient data");
      return response.json();
    },
  });

  const rows = React.useMemo(() => reconcileRazorpayRows(rawRows, patientsQuery.data?.data || []), [rawRows, patientsQuery.data]);
  const visibleRows = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && row.reconciliationStatus !== filter) return false;
      if (!term) return true;
      return [row.paymentId, row.orderId, row.appointmentId, row.contact, row.sourcePatientName, row.doctorName, row.patient?.name, row.patient?.uid]
        .some((value) => String(value || "").toLowerCase().includes(term));
    });
  }, [rows, search, filter]);

  const summary = React.useMemo(() => ({
    total: rows.reduce((sum, row) => sum + (row.reconciliationStatus === "ignored" ? 0 : row.amount), 0),
    matched: rows.filter((row) => row.reconciliationStatus === "matched"),
    review: rows.filter((row) => row.reconciliationStatus === "review"),
    unmatched: rows.filter((row) => row.reconciliationStatus === "unmatched"),
    ignored: rows.filter((row) => row.reconciliationStatus === "ignored"),
  }), [rows]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/front-office/razorpay-reconciliations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, rows }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not save reconciliation");
      return data as { id: number };
    },
    onSuccess: (data) => {
      setSavedReconciliationId(data.id);
      queryClient.invalidateQueries({ queryKey: ["front-office", "razorpay-reconciliations"] });
      toast.success(`Reconciliation #${data.id} saved to PostgreSQL.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleFile = (file?: File) => {
    if (!file) return;
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (result) => {
        if (!result.data.length) return toast.error("The selected CSV has no payment rows.");
        setSavedReconciliationId(null);
        setFileName(file.name);
        setRawRows(result.data);
        toast.success(`${result.data.length} Razorpay rows loaded.`);
      },
      error: (error) => toast.error(error.message || "Could not read CSV file."),
    });
  };

  const handleExportExcel = async () => {
    if (!visibleRows.length) {
      toast.error("There are no reconciliation rows to export.");
      return;
    }

    const XLSX = (await import("xlsx-js-style")).default;
    const reportRows = visibleRows.map((row) => ({
      "Transfer ID": row.paymentId,
      "Settlement Status": row.status,
      "Created At": row.createdAt,
      "Appointment ID": row.appointmentId,
      "Appointment Date": row.appointmentDate,
      "Payment Date": row.paymentDate,
      Doctor: row.doctorName,
      "Razorpay Patient": row.sourcePatientName,
      "Gross Amount": row.grossAmount,
      "Reversed Amount": row.reversedAmount,
      "Net Amount": row.amount,
      Currency: row.currency,
      "Matched Patient": row.patient?.name || "",
      "Patient UID": row.patient?.uid || "",
      "Docterz ID": row.patient?.docterz_id || "",
      "Reconciliation Status": row.reconciliationStatus,
      Confidence: row.confidence,
      "Match Reason": row.matchReason,
      "Duplicate Transfer": row.duplicate ? "Yes" : "No",
      "Source Row": row.rowNumber,
    }));

    const reportSheet = XLSX.utils.json_to_sheet(reportRows);
    const range = XLSX.utils.decode_range(reportSheet["!ref"] || "A1");
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const cell = reportSheet[XLSX.utils.encode_cell({ r: 0, c: column })];
      if (cell) {
        cell.s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "312E81" } },
          alignment: { vertical: "center", wrapText: true },
        };
      }
    }
    for (let row = 1; row <= range.e.r; row += 1) {
      for (const column of [8, 9, 10]) {
        const cell = reportSheet[XLSX.utils.encode_cell({ r: row, c: column })];
        if (cell) cell.z = "₹#,##0.00";
      }
    }
    reportSheet["!cols"] = [
      { wch: 22 }, { wch: 18 }, { wch: 20 }, { wch: 16 }, { wch: 18 },
      { wch: 22 }, { wch: 24 }, { wch: 26 }, { wch: 16 }, { wch: 18 },
      { wch: 16 }, { wch: 10 }, { wch: 26 }, { wch: 16 }, { wch: 14 },
      { wch: 22 }, { wch: 14 }, { wch: 48 }, { wch: 18 }, { wch: 12 },
    ];
    reportSheet["!autofilter"] = { ref: reportSheet["!ref"] || "A1" };
    reportSheet["!freeze"] = { xSplit: 0, ySplit: 1 };

    const filteredTotal = visibleRows.reduce(
      (total, row) => total + (row.reconciliationStatus === "ignored" ? 0 : row.amount),
      0,
    );
    const summarySheet = XLSX.utils.aoa_to_sheet([
      ["Razorpay Reconciliation Summary"],
      ["Source file", fileName],
      ["Exported at", new Date().toLocaleString("en-IN")],
      ["Applied status filter", filter === "all" ? "All results" : filter],
      ["Applied search", search || "None"],
      ["Exported rows", visibleRows.length],
      ["Net transfer value", filteredTotal],
      ["Matched", visibleRows.filter((row) => row.reconciliationStatus === "matched").length],
      ["Needs review", visibleRows.filter((row) => row.reconciliationStatus === "review").length],
      ["Unmatched", visibleRows.filter((row) => row.reconciliationStatus === "unmatched").length],
      ["Ignored", visibleRows.filter((row) => row.reconciliationStatus === "ignored").length],
    ]);
    summarySheet["A1"].s = { font: { bold: true, sz: 16, color: { rgb: "312E81" } } };
    summarySheet["!cols"] = [{ wch: 24 }, { wch: 42 }];
    if (summarySheet["B7"]) summarySheet["B7"].z = "₹#,##0.00";

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, reportSheet, "Reconciliation");
    const sourceName = fileName.replace(/\.csv$/i, "").replace(/[^a-z0-9-_]+/gi, "-") || "razorpay";
    XLSX.writeFile(workbook, `${sourceName}-reconciliation-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${visibleRows.length} reconciliation rows exported to Excel.`);
  };

  const statusBadge = (status: RazorpayReconciliationRow["reconciliationStatus"]) => {
    const styles = { matched: "bg-emerald-100 text-emerald-800 border-emerald-200", review: "bg-amber-100 text-amber-800 border-amber-200", unmatched: "bg-rose-100 text-rose-800 border-rose-200", ignored: "bg-slate-100 text-slate-700 border-slate-200" };
    return <Badge variant="outline" className={cn("capitalize", styles[status])}>{status}</Badge>;
  };

  return <div className="space-y-6">
    <div className="rounded-2xl bg-linear-to-r from-slate-950 via-indigo-950 to-violet-900 p-6 text-white shadow-xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-white/80 hover:bg-white/10 hover:text-white"><Link to="/front-office"><ArrowLeft className="size-4" />Front Office</Link></Button>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Payment controls</p><h1 className="mt-1 text-2xl font-extrabold">Razorpay Reconciliation</h1><p className="mt-2 max-w-2xl text-sm text-white/70">Match Razorpay Transfers exports with locally synced patient records using the appointment and patient metadata embedded in transfer notes.</p></div>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-white px-4 text-sm font-bold text-indigo-950 hover:bg-violet-50">
          <Upload className="size-4" />Choose Razorpay CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
        </label>
      </div>
    </div>

    {patientsQuery.isError && <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">Patient records could not be loaded. The CSV can be viewed, but matching is unavailable.</div>}

    {!rows.length ? <Card className="border-dashed"><CardContent className="flex min-h-72 flex-col items-center justify-center text-center"><FileSpreadsheet className="mb-4 size-12 text-violet-500" /><h2 className="text-lg font-bold">Upload the Razorpay Transfers export</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">The importer reads transfer ID, amount, settlement status, reversals, and the appointment/patient metadata inside <code>payments_notes</code> and <code>transfers_notes</code>. No data is saved by this screen.</p><p className="mt-4 text-xs text-muted-foreground">{patientsQuery.isLoading ? "Loading patient directory…" : `${patientsQuery.data?.data.length || 0} patient records ready for matching`}</p></CardContent></Card> : <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Summary icon={IndianRupee} label="Net transfer value" value={money(summary.total)} tone="text-indigo-600" />
        <Summary icon={CheckCircle2} label="Matched" value={String(summary.matched.length)} tone="text-emerald-600" />
        <Summary icon={AlertTriangle} label="Needs review" value={String(summary.review.length)} tone="text-amber-600" />
        <Summary icon={XCircle} label="Unmatched" value={String(summary.unmatched.length)} tone="text-rose-600" />
        <Summary icon={Users} label="Patient records" value={String(patientsQuery.data?.data.length || 0)} tone="text-cyan-600" />
      </div>

      <Card><CardHeader className="pb-3"><CardTitle className="text-base">Payment matches</CardTitle><CardDescription>{fileName} · {rows.length} rows · {summary.ignored.length} failed/refunded/cancelled excluded from value</CardDescription></CardHeader><CardContent>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search transfer, appointment, doctor, UID or patient…" className="pl-9" /></div><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="all">All results</option><option value="matched">Matched</option><option value="review">Needs review</option><option value="unmatched">Unmatched</option><option value="ignored">Ignored</option></select><Button type="button" variant="outline" onClick={() => saveMutation.mutate()} disabled={!rows.length || patientsQuery.isLoading || saveMutation.isPending || savedReconciliationId !== null} className="gap-2">{saveMutation.isPending || patientsQuery.isLoading ? <Loader2 className="size-4 animate-spin" /> : savedReconciliationId ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Database className="size-4" />}{savedReconciliationId ? `Saved #${savedReconciliationId}` : saveMutation.isPending ? "Saving…" : patientsQuery.isLoading ? "Matching…" : "Save to Database"}</Button><Button type="button" onClick={handleExportExcel} disabled={!visibleRows.length} className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800"><Download className="size-4" />Export Excel</Button></div>
        <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-240 text-left text-sm"><thead className="bg-muted/60 text-xs uppercase text-muted-foreground"><tr><th className="p-3">Transfer</th><th className="p-3">Appointment / payment</th><th className="p-3 text-right">Net amount</th><th className="p-3">Razorpay patient</th><th className="p-3">Matched patient</th><th className="p-3">Result</th></tr></thead><tbody className="divide-y">{visibleRows.map((row) => <tr key={`${row.rowNumber}-${row.paymentId}`} className="align-top hover:bg-muted/30"><td className="p-3"><div className="font-mono text-xs font-semibold">{row.paymentId || `Row ${row.rowNumber}`}</div><div className="mt-1 capitalize text-xs text-muted-foreground">{row.status}</div></td><td className="p-3"><div>{row.appointmentId ? `Appointment #${row.appointmentId}` : "No appointment ID"}</div><div className="mt-1 text-xs text-muted-foreground">{row.paymentDate || row.appointmentDate || row.createdAt || "—"}{row.doctorName ? ` · ${row.doctorName}` : ""}</div></td><td className="p-3 text-right"><div className="font-bold">{money(row.amount)}</div>{row.reversedAmount > 0 && <div className="mt-1 text-xs text-rose-600">Reversed {money(row.reversedAmount)}</div>}</td><td className="p-3"><div className="font-medium">{row.sourcePatientName || "Patient name missing"}</div><div className="mt-1 text-xs text-muted-foreground">{row.appointmentDate || "No appointment date"}</div></td><td className="p-3">{row.patient ? <><div className="font-semibold">{row.patient.name || "Unnamed patient"}</div><div className="mt-1 text-xs text-muted-foreground">{row.patient.uid || `Docterz #${row.patient.docterz_id}`}</div></> : <span className="text-muted-foreground">Not identified</span>}</td><td className="p-3">{statusBadge(row.reconciliationStatus)}<div className="mt-1.5 max-w-56 text-xs text-muted-foreground">{row.matchReason}</div></td></tr>)}</tbody></table>{!visibleRows.length && <div className="p-8 text-center text-sm text-muted-foreground">No transfers match the current filter.</div>}</div>
      </CardContent></Card>
    </>}
  </div>;
}

function Summary({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: string }) {
  return <Card><CardContent className="flex items-center gap-3 p-4"><div className="rounded-lg bg-muted p-2"><Icon className={cn("size-5", tone)} /></div><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-extrabold">{value}</p></div></CardContent></Card>;
}
