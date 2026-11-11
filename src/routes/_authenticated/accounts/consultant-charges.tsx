import { createFileRoute } from "@tanstack/react-router";
import {  Percent, Calendar, Calculator, Printer, Eye, AlertCircle, Wand2, RefreshCw } from "lucide-react";
import * as React from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../ui/card";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { cn } from "../../../utils/cn";

export const Route = createFileRoute("/_authenticated/accounts/consultant-charges")({
  component: ConsultantCharges,
});

function ConsultantCharges() {
  const queryClient = useQueryClient();

  // Date range state
  const [startDate, setStartDate] = React.useState(() => {
    const d = new Date();
    // Start of current month
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = React.useState(() => new Date().toISOString().split("T")[0]);

  // Editing rates state
  const [editingDoc, setEditingDoc] = React.useState<any | null>(null);
  const [editBaseRate, setEditBaseRate] = React.useState("");
  const [editSharePercent, setEditSharePercent] = React.useState("");
  const [editError, setEditError] = React.useState("");

  // Viewing detailed doctor payout voucher state
  const [selectedReport, setSelectedReport] = React.useState<any | null>(null);

  // Active status messages
  const [infoMessage, setInfoMessage] = React.useState("");

  // Fetch rates
  const ratesQuery = useRpcQuery<any[]>(
    ["consultant-rates"],
    () => client.accounts["consultant-rates"].$get()
  );

  // Fetch payout calculations (based on range)
  const chargesQuery = useRpcQuery<any[]>(
    ["consultant-charges", startDate, endDate],
    () => client.accounts["consultant-charges"].$get({ query: { startDate, endDate } })
  );

  const ratesData = ratesQuery.data ?? [];
  const chargesData = chargesQuery.data ?? [];

  // Update rates mutation
  const updateRatesMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await client.accounts["consultant-rates"].$post({ json: payload });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consultant-rates"] });
      queryClient.invalidateQueries({ queryKey: ["consultant-charges"] });
      setEditingDoc(null);
    },
    onError: (err: any) => {
      setEditError(err.message || "Failed to update rates");
    },
  });

  // Mock appointments generation mutation
  const seedMockMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await client.accounts["mock-appointments"].$post({ json: payload });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["consultant-charges", startDate, endDate] });
      setInfoMessage(`Successfully generated ${res.count} mock visits for doctor!`);
      setTimeout(() => setInfoMessage(""), 4000);
    },
    onError: (err: any) => {
      alert(err.message || "Failed to generate mock visits");
    },
  });

  const handleEditOpen = (doc: any) => {
    setEditingDoc(doc);
    setEditBaseRate(String(doc.baseRate));
    setEditSharePercent(String(doc.doctorSharePercent));
    setEditError("");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");

    const base = parseFloat(editBaseRate);
    const share = parseFloat(editSharePercent);

    if (isNaN(base) || base < 0) return setEditError("Base Rate must be 0 or more");
    if (isNaN(share) || share < 0 || share > 100) return setEditError("Share Percent must be between 0 and 100");

    updateRatesMutation.mutate({
      doctorId: editingDoc.staffId,
      baseRate: base,
      doctorSharePercent: share,
    });
  };

  const handleGenerateMock = (doctorId: number) => {
    seedMockMutation.mutate({
      doctorId,
      startDate,
      endDate,
      count: 6,
    });
  };

  const handlePrint = () => {
    const printContent = document.getElementById("voucher-print-area");
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    const printHtml = `
      <html>
        <head>
          <title>Consultant Payout Slip</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #0f766e; font-size: 24px; }
            .header p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
            .details-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .details-item span { font-weight: bold; color: #475569; display: inline-block; width: 150px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th { background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 10px; text-align: left; font-weight: bold; }
            td { border-bottom: 1px solid #e2e8f0; padding: 10px; }
            .text-right { text-align: right; }
            .summary { margin-top: 40px; border-top: 2px solid #cbd5e1; padding-top: 20px; float: right; width: 300px; }
            .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .summary-total { font-weight: bold; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px; font-size: 16px; color: #0f766e; }
            .signature { margin-top: 100px; display: flex; justify-content: space-between; }
            .sig-box { border-top: 1px solid #94a3b8; width: 200px; text-align: center; padding-top: 5px; font-size: 12px; color: #64748b; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const fmt = (num: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent dark:from-teal-400 dark:to-emerald-400">
            Consultant Charges
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure consultation fees, calculate doctor earnings, and generate detailed payout vouchers.
          </p>
        </div>

        {/* Date Selector & Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 shadow-xs">
            <Calendar size={16} className="text-muted-foreground" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold focus:outline-none text-foreground cursor-pointer"
            />
            <span className="text-muted-foreground text-xs font-semibold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold focus:outline-none text-foreground cursor-pointer"
            />
          </div>

          <Button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["consultant-charges"] });
            }}
            variant="outline"
            className="font-semibold cursor-pointer gap-1.5"
            disabled={chargesQuery.isFetching}
          >
            <RefreshCw size={15} className={cn(chargesQuery.isFetching && "animate-spin")} />
            Recalculate
          </Button>
        </div>
      </div>

      {/* Seeder Confirmation Message Banner */}
      {infoMessage && (
        <div className="bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 p-4 rounded-lg border border-teal-200 text-sm font-semibold flex items-center gap-2.5 animate-in fade-in duration-300">
          <Wand2 size={18} />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Main Grid: Left is Calculator, Right is Config */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Consultant Rates Configuration Pane */}
        <Card className="lg:col-span-1 border border-border shadow-xs bg-white/70 dark:bg-slate-900/40 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold flex items-center gap-1.5">
              <Percent size={18} className="text-teal-600" />
              Doctor Charge Config
            </CardTitle>
            <CardDescription>Configure sharing ratios and base charges per consultation.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {ratesQuery.isLoading ? (
              <div className="flex h-36 items-center justify-center text-sm text-muted-foreground">
                Loading doctors...
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {ratesData.map((doc) => (
                  <div key={doc.staffId} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                    <div>
                      <h4 className="font-extrabold text-sm text-foreground">{doc.name}</h4>
                      <p className="text-xs text-muted-foreground font-semibold">{doc.departmentName}</p>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          Base: <strong className="text-foreground">{fmt(doc.baseRate)}</strong>
                        </span>
                        <span className="flex items-center gap-0.5">
                          Share: <strong className="text-foreground">{doc.doctorSharePercent}%</strong>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 items-end">
                      <Button
                        size="default"
                        variant="outline"
                        onClick={() => handleEditOpen(doc)}
                        className="cursor-pointer text-xs h-7 font-bold px-2.5"
                      >
                        Set Rates
                      </Button>
                      <button
                        onClick={() => handleGenerateMock(doc.staffId)}
                        className="text-[10px] text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-0.5 font-bold cursor-pointer bg-transparent border-0"
                        title="Generate mock visit history to calculate earnings"
                      >
                        <Wand2 size={10} /> +6 Visits
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payout Calculation Table */}
        <Card className="lg:col-span-2 border border-border shadow-xs bg-white/70 dark:bg-slate-900/40 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg font-extrabold flex items-center gap-1.5">
              <Calculator size={18} className="text-teal-600" />
              Calculated Payouts
            </CardTitle>
            <CardDescription>
              Earnings from completed patient appointments between {startDate} and {endDate}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {chargesQuery.isLoading ? (
              <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                Calculating consultant charges...
              </div>
            ) : chargesData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
                <AlertCircle className="size-8 mb-2 opacity-40 text-teal-650" />
                <p className="text-sm font-bold">No active doctors found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                      <th className="p-4">Doctor</th>
                      <th className="p-4 text-center">Visits</th>
                      <th className="p-4 text-right">Total Billing</th>
                      <th className="p-4 text-right">Doctor Payout</th>
                      <th className="p-4 text-right">Hospital Share</th>
                      <th className="p-4 text-center">Voucher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {chargesData.map((report) => (
                      <tr key={report.doctorId} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-extrabold text-foreground">{report.doctorName}</div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">{report.doctorCode}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ring-1 ring-inset",
                            report.totalVisits > 0 
                              ? "bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-950/20 dark:text-teal-400"
                              : "bg-slate-50 text-slate-650 ring-slate-600/10 dark:bg-slate-900 dark:text-slate-400"
                          )}>
                            {report.totalVisits}
                          </span>
                        </td>
                        <td className="p-4 text-right font-medium">{fmt(report.totalCharges)}</td>
                        <td className="p-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {fmt(report.totalConsultantEarnings)}
                        </td>
                        <td className="p-4 text-right font-medium text-slate-600 dark:text-slate-400">
                          {fmt(report.totalHospitalEarnings)}
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedReport(report)}
                            title="View Detailed Voucher"
                            disabled={report.totalVisits === 0}
                            className="cursor-pointer"
                          >
                            <Eye size={16} />
                          </Button>
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

      {/* Edit Doctor Rates Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-950 rounded-xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-teal-700 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base tracking-tight">Configure Rates</h3>
                <p className="text-xs text-teal-100">{editingDoc.name}</p>
              </div>
              <button
                onClick={() => setEditingDoc(null)}
                className="text-white/80 hover:text-white rounded-lg p-1 transition-colors cursor-pointer text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-3 rounded-lg border border-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{editError}</span>
                </div>
              )}

              {/* Base Rate */}
              <div className="space-y-1">
                <Label htmlFor="baseRate">Consultation Base Charge (INR)</Label>
                <Input
                  id="baseRate"
                  type="number"
                  placeholder="e.g. 500"
                  value={editBaseRate}
                  onChange={(e) => setEditBaseRate(e.target.value)}
                  required
                />
              </div>

              {/* Share Percent */}
              <div className="space-y-1">
                <Label htmlFor="sharePercent">Doctor's Earning Share (%)</Label>
                <Input
                  id="sharePercent"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 70"
                  value={editSharePercent}
                  onChange={(e) => setEditSharePercent(e.target.value)}
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 cursor-pointer font-semibold"
                  onClick={() => setEditingDoc(null)}
                  disabled={updateRatesMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer"
                  disabled={updateRatesMutation.isPending}
                >
                  {updateRatesMutation.isPending ? "Saving..." : "Save Config"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Payout Voucher Dialog */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div
            className="w-full max-w-2xl bg-white dark:bg-slate-950 rounded-xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base tracking-tight">Consultant Earning Statement</h3>
                <p className="text-xs text-slate-400">Statement for calculation range {startDate} to {endDate}</p>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-450 hover:text-white rounded-lg p-1 transition-colors cursor-pointer text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Print Area */}
            <div className="p-6 space-y-6 max-h-[calc(100vh-14rem)] overflow-y-auto custom-scrollbar">
              <div id="voucher-print-area" className="space-y-6">
                <div className="header hidden print:block">
                  <h1>ACME HOSPITAL & RESEARCH CENTER</h1>
                  <p>Consultant Fees Disbursement Invoice Statement</p>
                </div>

                {/* Doctor Meta */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-500 dark:text-slate-450 font-bold block">CONSULTANT DETAILS</span>
                    <strong className="text-sm font-extrabold text-foreground block">{selectedReport.doctorName}</strong>
                    <span className="font-mono text-muted-foreground block">{selectedReport.doctorCode}</span>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-slate-500 dark:text-slate-450 font-bold block">SUMMARY STATEMENTS</span>
                    <span className="text-foreground block">Date range: {startDate} to {endDate}</span>
                    <span className="text-foreground block">Rates: {fmt(selectedReport.baseRate)} ({selectedReport.sharePercent}% Share)</span>
                  </div>
                </div>

                {/* Table details */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                        <th className="p-3">Patient MRN</th>
                        <th className="p-3">Patient Name</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Department</th>
                        <th className="p-3 text-right">Earning ({selectedReport.sharePercent}%)</th>
                        <th className="p-3 text-right">Total Fee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedReport.visits.map((v: any, index: number) => (
                        <tr key={v.appointmentId || index}>
                          <td className="p-3 font-mono">{v.patientMrn}</td>
                          <td className="p-3 font-semibold text-foreground">{v.patientName}</td>
                          <td className="p-3">
                            {new Date(v.scheduledAt).toLocaleDateString([], { month: "short", day: "2-digit", year: "numeric" })}
                          </td>
                          <td className="p-3">{v.departmentName}</td>
                          <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">{fmt(v.doctorShare)}</td>
                          <td className="p-3 text-right">{fmt(v.baseRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex flex-col items-end gap-1.5 pt-3 border-t">
                  <div className="flex justify-between w-64 text-xs">
                    <span className="text-muted-foreground font-semibold">Total Consultations:</span>
                    <span className="font-bold">{selectedReport.totalVisits} visits</span>
                  </div>
                  <div className="flex justify-between w-64 text-xs">
                    <span className="text-muted-foreground font-semibold">Gross Consult Revenue:</span>
                    <span className="font-bold">{fmt(selectedReport.totalCharges)}</span>
                  </div>
                  <div className="flex justify-between w-64 text-xs border-b pb-1.5">
                    <span className="text-muted-foreground font-semibold">Hospital Share Remained:</span>
                    <span className="font-bold">{fmt(selectedReport.totalHospitalEarnings)}</span>
                  </div>
                  <div className="flex justify-between w-64 text-sm font-extrabold text-teal-700 dark:text-teal-400">
                    <span>Net Consultant Payout:</span>
                    <span>{fmt(selectedReport.totalConsultantEarnings)}</span>
                  </div>
                </div>

                <div className="signature hidden print:flex">
                  <div className="sig-box">Hospital Director Approval</div>
                  <div className="sig-box">Consultant Signature</div>
                </div>
              </div>
            </div>

            {/* Modal Footer actions */}
            <div className="bg-slate-50 dark:bg-slate-900 border-t p-4 flex gap-3 justify-end">
              <Button
                variant="outline"
                className="font-semibold cursor-pointer"
                onClick={() => setSelectedReport(null)}
              >
                Close
              </Button>
              <Button
                className="bg-slate-800 hover:bg-slate-900 text-white font-semibold cursor-pointer gap-1.5"
                onClick={handlePrint}
              >
                <Printer size={15} /> Print Statement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
