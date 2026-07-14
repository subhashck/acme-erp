import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../ui/card";
import { Badge } from "../../../ui/badge";
import { cn } from "../../../utils/cn";

export const Route = createFileRoute("/shared/report/$token")({
  component: SharedReportPage,
});

// ---------------------------------------------------------------------------
// Shared helpers (collapsed / expanded panels — same style as $id.tsx)
// ---------------------------------------------------------------------------

const Panel = ({
  title,
  amount,
  children,
  defaultExpanded = false,
  titleClass = "",
}: any) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  return (
    <Card className="card border bg-card">
      <CardHeader
        className="py-3 bg-muted/20 border-b cursor-pointer hover:bg-muted/30 transition-colors select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="opacity-50">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            <span>{title}</span>
          </div>
          <span className={cn("text-sm font-black", titleClass)}>{amount}</span>
        </CardTitle>
      </CardHeader>
      <div className={cn(!expanded && "hidden")}>
        <CardContent className="p-3">{children}</CardContent>
      </div>
    </Card>
  );
};

const SubPanel = ({ title, amount, children, defaultExpanded = false }: any) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  return (
    <div className="space-y-1">
      <div
        className="flex justify-between items-center text-[11px] font-bold bg-muted/40 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-muted/60 transition-colors select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-1.5">
          <div className="opacity-50">
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </div>
          <span className="uppercase tracking-wider text-slate-700 dark:text-slate-300">
            {title}
          </span>
        </div>
        <span className="text-rose-600 dark:text-rose-400">{amount}</span>
      </div>
      <div className={cn(!expanded && "hidden")}>{children}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function SharedReportPage() {
  const { token } = Route.useParams();

  const [state, setState] = React.useState<
    | { status: "loading" }
    | { status: "expired" }
    | { status: "invalid" }
    | { status: "error"; message: string }
    | { status: "ok"; data: any }
  >({ status: "loading" });

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/public/reports/shared/${token}`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) {
          if (json.expired) setState({ status: "expired" });
          else setState({ status: "invalid" });
          return;
        }
        setState({ status: "ok", data: json });
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setState({ status: "error", message: String(err) });
        }
      });
    return () => controller.abort();
  }, [token]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 dark:from-slate-950 dark:to-teal-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <div className="h-10 w-10 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold">Loading shared report…</p>
        </div>
      </div>
    );
  }

  if (state.status === "expired") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-amber-50 dark:from-slate-950 dark:to-amber-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-xl p-10">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-amber-700 dark:text-amber-400">
            Link Expired
          </h1>
          <p className="text-sm text-muted-foreground">
            This shared report link is no longer valid. Shared links are active for
            2 days from the time of publishing. Please ask the report owner to
            generate a new link.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "invalid" || state.status === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-rose-50 dark:from-slate-950 dark:to-rose-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-800 shadow-xl p-10">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-rose-100 dark:bg-rose-950 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-rose-700 dark:text-rose-400">
            Invalid Link
          </h1>
          <p className="text-sm text-muted-foreground">
            This link is invalid or has been tampered with. Please request a fresh
            link from the report owner.
          </p>
          {state.status === "error" && (
            <p className="text-xs text-rose-400">{state.message}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Render full report ──────────────────────────────────────────────────────
  const report = state.data;
  const linkExpiresAt: number = report._linkExpiresAt;

  const fmt = (num: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num);

  const openingBalance = parseFloat(report.openingBalance) || 0;
  const expendituresTotal =
    report.expenditures?.reduce((s: number, i: any) => s + parseFloat(i.amount), 0) ?? 0;
  const staffAdvancesTotal =
    report.staffAdvances?.reduce((s: number, i: any) => s + parseFloat(i.amount), 0) ?? 0;
  const totalExpenditure = expendituresTotal + staffAdvancesTotal;

  const nightLines = report.serviceLines?.filter((l: any) => l.isNightEntry) ?? [];
  const dayLines = report.serviceLines?.filter((l: any) => !l.isNightEntry) ?? [];
  const nightServicesTotal = nightLines.reduce(
    (s: number, l: any) => s + parseFloat(l.amount),
    0
  );

  // Group day lines by department
  const deptMap: Record<string, { label: string; lines: any[]; total: number }> = {};
  for (const line of dayLines) {
    const dept = line.department ?? "OTHER";
    if (!deptMap[dept]) deptMap[dept] = { label: dept, lines: [], total: 0 };
    deptMap[dept].lines.push(line);
    deptMap[dept].total += parseFloat(line.amount);
  }
  const deptGroups = Object.values(deptMap);

  const ipdAdmissionsTotal =
    report.ipdAdmissions?.reduce((s: number, i: any) => s + parseFloat(i.amount), 0) ?? 0;
  const ipdDischargesTotal =
    report.ipdDischarges?.reduce((s: number, i: any) => s + parseFloat(i.amount), 0) ?? 0;
  const additionalIncomeTotal =
    report.additionalIncome?.reduce((s: number, i: any) => s + parseFloat(i.amount), 0) ?? 0;
  const discountsTotal =
    report.discountsReturns?.reduce((s: number, i: any) => s + parseFloat(i.amount), 0) ?? 0;

  const categoryIncomeTotal = deptGroups.reduce((s, d) => s + d.total, 0);
  const totalIncome =
    categoryIncomeTotal +
    nightServicesTotal +
    ipdAdmissionsTotal +
    ipdDischargesTotal +
    additionalIncomeTotal -
    discountsTotal;

  const cashReceipts = parseFloat(report.cashReceipts) || 0;
  const bankReceiptsTotal = parseFloat(report.bankReceiptsTotal) || 0;
  const paymentChannelsTotal = bankReceiptsTotal + cashReceipts;
  const isReconciled = Math.abs(paymentChannelsTotal - totalIncome) < 1;

  const bankDeposit = parseFloat(report.bankDeposit) || 0;
  const handoverSir = parseFloat(report.fundHandoverSir) || 0;
  const handoverMadam = parseFloat(report.fundHandoverMadam) || 0;
  const closingBalance = parseFloat(report.closingBalance) || 0;

  const expiryDate = new Date(linkExpiresAt);
  const nowMs = Date.now();
  const hoursLeft = Math.max(0, Math.round((linkExpiresAt - nowMs) / 3_600_000));

  const expendituresByCategory = (report.expenditures || []).reduce(
    (acc: any, item: any) => {
      if (!acc[item.category]) acc[item.category] = { category: item.category, total: 0, items: [] };
      acc[item.category].total += parseFloat(item.amount);
      acc[item.category].items.push(item);
      return acc;
    },
    {}
  );
  const groupedExpenditures = Object.values(expendituresByCategory).sort((a: any, b: any) =>
    a.category.localeCompare(b.category)
  );

  const bankDepositsList = (() => {
    if (report.bankDeposits) {
      try {
        const parsed = JSON.parse(report.bankDeposits);
        if (Array.isArray(parsed)) return parsed.filter((i: any) => (parseFloat(i.amount) || 0) > 0);
      } catch { /* ignore */ }
    }
    if (bankDeposit > 0) return [{ bankName: "Bank", amount: bankDeposit }];
    return [];
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/40">
      {/* Top banner */}
      <header className="sticky top-0 z-30 border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-sm">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                Shared Report
              </p>
              <p className="text-[11px] text-muted-foreground">
                Closing Statement ·{" "}
                {new Date(report.reportDate).toLocaleDateString([], {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              className={cn(
                "font-bold text-[10px] gap-1",
                report.status === "draft" &&
                  "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400",
                report.status === "submitted" &&
                  "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400",
                report.status === "locked" &&
                  "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-400"
              )}
            >
              {report.status.toUpperCase()}
            </Badge>
            <div
              className={cn(
                "flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border",
                hoursLeft < 6
                  ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400"
                  : "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
              )}
            >
              <Clock size={11} />
              <span>
                Link expires{" "}
                {expiryDate.toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            {isReconciled ? (
              <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400">
                <ShieldCheck size={11} />
                Reconciled
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full border bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
                <AlertTriangle size={11} />
                Mismatch
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Reconciliation alert */}
        {!isReconciled && (
          <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-4 rounded-lg border border-rose-200 text-sm font-semibold flex items-center gap-2.5">
            <AlertTriangle size={18} className="shrink-0" />
            <div>
              <span>Payment channels reconciliation mismatch detected!</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                Channel total <strong>{fmt(paymentChannelsTotal)}</strong> vs net income{" "}
                <strong>{fmt(totalIncome)}</strong>. Δ{" "}
                <strong>{fmt(Math.abs(paymentChannelsTotal - totalIncome))}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Summary block */}
        <div className="border-t-2 pt-6 w-full text-sm">
          <div className="space-y-2 border border-teal-600/30 rounded-xl bg-teal-500/5 p-5 shadow-xs">
            <h4 className="font-extrabold text-base border-b pb-2 mb-3 text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Closing Statement Summary
            </h4>
            <div className="space-y-2 text-xs p-2">
              {/* Income & Expenditure */}
              <div className="gap-y-2 mt-4 bg-teal-500/10 p-4">
                <p className="font-semibold text-lg">Income and Expenditure</p>
                <hr className="border-b-2 border-fuchsia-800/30" />
                <div className="text-emerald-400">
                  {nightServicesTotal > 0 && (
                    <div className="flex justify-between text-indigo-400 dark:text-indigo-300">
                      <span className="font-semibold">Night / After-EOD Services</span>
                      <span className="font-bold">{fmt(nightServicesTotal)}</span>
                    </div>
                  )}
                  {deptGroups.map((d) => (
                    <div key={d.label} className="flex justify-between">
                      <span className="font-semibold">{d.label}</span>
                      <span className="font-bold">{fmt(d.total)}</span>
                    </div>
                  ))}
                  {discountsTotal > 0 && (
                    <div className="flex justify-between text-rose-400 dark:text-rose-300">
                      <span className="font-semibold">Less: Discounts/Returns:</span>
                      <span className="font-bold">-{fmt(discountsTotal)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-teal-700 dark:text-teal-400">
                  <span>Total Income:</span>
                  <span>{fmt(totalIncome)}</span>
                </div>
                <div className="flex justify-between border-b pb-2 pt-1 text-rose-400 dark:text-rose-300">
                  <span className="font-semibold">Total Expenditures:</span>
                  <span className="font-bold">{fmt(totalExpenditure)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Gross Balance:</span>
                  <span>{fmt(totalIncome - totalExpenditure)}</span>
                </div>
              </div>

              {/* Cash Management */}
              <div className="gap-y-2 mt-4 bg-amber-200/10 p-4">
                <span className="font-semibold text-lg">Cash Management</span>
                <hr className="border-b-2 border-fuchsia-800/30 mb-2" />
                <div className="flex justify-between text-emerald-300 mb-2">
                  <span className="font-semibold">Opening Balance:</span>
                  <span className="font-bold">{fmt(openingBalance)}</span>
                </div>
                <div className="flex justify-between text-rose-300">
                  <span className="font-semibold">Less Bank Deposit:</span>
                  <span className="font-bold">{fmt(bankDeposit)}</span>
                </div>
                <div className="flex justify-between text-rose-300">
                  <span className="font-semibold">Handover (Sir):</span>
                  <span className="font-bold">{fmt(handoverSir)}</span>
                </div>
                <div className="flex justify-between text-rose-300">
                  <span className="font-semibold">Handover (Madam):</span>
                  <span className="font-bold">{fmt(handoverMadam)}</span>
                </div>
              </div>

              <div className="space-y-1.5 border-t pt-3 mt-3 p-4">
                <div className="flex justify-between items-center text-sm font-bold text-lime-400">
                  <span>Calculated Closing:</span>
                  <span>{fmt(closingBalance)}</span>
                </div>
              </div>

              {/* Reconciliation check */}
              <div
                className={cn(
                  "border p-3 rounded-lg mt-4 text-center text-[11px] font-bold transition-all",
                  isReconciled
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                )}
              >
                <div className="flex items-center justify-center gap-1">
                  {isReconciled ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                  <span>RECONCILIATION CHECK</span>
                </div>
                <div className="mt-1 font-semibold text-muted-foreground">
                  Channel sum: {fmt(paymentChannelsTotal)}
                  <br />
                  Net revenue: {fmt(totalIncome)}
                </div>
                {!isReconciled && (
                  <p className="mt-1.5 text-[9px] font-bold uppercase text-rose-700 dark:text-rose-400">
                    Mismatch: {fmt(Math.abs(paymentChannelsTotal - totalIncome))}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3-column detail sheet */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Income Streams */}
          <div className="space-y-5">
            <h4 className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider flex items-center gap-1.5 border-b pb-2">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              1. Income Streams
            </h4>
            <Panel title="Opening Balance B/f" amount={fmt(openingBalance)} />
            {nightServicesTotal > 0 && (
              <Panel
                title="Night / After-EOD Services"
                amount={fmt(nightServicesTotal)}
                titleClass="text-indigo-600 dark:text-indigo-400"
              >
                <table className="w-full text-xs text-left">
                  <tbody>
                    {nightLines.map((line: any) => (
                      <tr key={line.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="py-2 pr-2 font-medium text-foreground">{line.serviceName}</td>
                        <td className="py-2 text-right text-muted-foreground">
                          {line.quantity} × {fmt(line.rate)}
                        </td>
                        <td className="py-2 text-right font-semibold text-foreground">
                          {fmt(line.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}
            {deptGroups.map((d) => (
              <Panel
                key={d.label}
                title={d.label}
                amount={fmt(d.total)}
                titleClass="text-teal-600 dark:text-teal-400"
              >
                <table className="w-full text-xs text-left">
                  <tbody>
                    {d.lines.map((line: any) => (
                      <tr key={line.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="py-2 pr-2 font-medium text-foreground">{line.serviceName}</td>
                        <td className="py-2 text-right text-muted-foreground">
                          {line.quantity} × {fmt(line.rate)}
                        </td>
                        <td className="py-2 text-right font-semibold text-foreground">
                          {fmt(line.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            ))}
            {report.ipdAdmissions?.length > 0 && (
              <Panel
                title="IPD Admissions / Advances"
                amount={fmt(ipdAdmissionsTotal)}
                titleClass="text-teal-600 dark:text-teal-400"
              >
                <table className="w-full text-xs text-left">
                  <tbody>
                    {report.ipdAdmissions.map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="py-2 pr-2 font-semibold text-foreground">{item.patientName}</td>
                        <td className="py-2 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                            {item.type}
                          </span>
                        </td>
                        <td className="py-2 text-right font-bold text-foreground">
                          {fmt(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}
            {report.ipdDischarges?.length > 0 && (
              <Panel
                title="IPD Discharges"
                amount={fmt(ipdDischargesTotal)}
                titleClass="text-teal-600 dark:text-teal-400"
              >
                <table className="w-full text-xs text-left">
                  <tbody>
                    {report.ipdDischarges.map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="py-2 pr-2 font-semibold text-foreground">{item.patientName}</td>
                        <td className="py-2 text-right font-bold text-foreground">
                          {fmt(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}
            {report.additionalIncome?.length > 0 && (
              <Panel
                title="Additional Incomes"
                amount={fmt(additionalIncomeTotal)}
                titleClass="text-teal-600 dark:text-teal-400"
              >
                <div className="space-y-2 text-xs">
                  {report.additionalIncome.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between border-b pb-1.5 last:border-0 last:pb-0"
                    >
                      <span className="text-muted-foreground font-medium">{item.label}</span>
                      <span className="font-bold text-foreground">{fmt(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
            {report.discountsReturns?.length > 0 && (
              <Panel
                title="Discounts & Returns"
                amount={`-${fmt(discountsTotal)}`}
                titleClass="text-rose-600 dark:text-rose-400"
              >
                <div className="space-y-2 text-xs">
                  {report.discountsReturns.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between border-b pb-1.5 last:border-0 last:pb-0"
                    >
                      <span className="text-muted-foreground font-medium">{item.label}</span>
                      <span className="font-bold text-rose-600">-{fmt(item.amount)}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>

          {/* Expenditures */}
          <div className="space-y-5">
            <h4 className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider flex items-center gap-1.5 border-b pb-2">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              2. Expenditures & Advances
            </h4>
            <Panel
              title="Expenditures (Out)"
              amount={fmt(expendituresTotal)}
              titleClass="text-rose-600 dark:text-rose-400"
              defaultExpanded={true}
            >
              {groupedExpenditures.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">No logged expenses.</p>
              ) : (
                <div className="space-y-3">
                  {(groupedExpenditures as any[]).map((group: any) => (
                    <SubPanel
                      key={group.category}
                      title={group.category}
                      amount={fmt(group.total)}
                    >
                      <table className="w-full text-xs text-left">
                        <tbody>
                          {group.items.map((item: any) => (
                            <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                              <td className="py-1.5 pl-2 font-medium text-foreground">
                                {item.details}
                              </td>
                              <td className="py-1.5 text-right font-bold text-foreground pr-2">
                                {fmt(item.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </SubPanel>
                  ))}
                </div>
              )}
            </Panel>
            {report.staffAdvances?.length > 0 && (
              <Panel
                title="Staff Advances"
                amount={fmt(staffAdvancesTotal)}
                titleClass="text-rose-600 dark:text-rose-400"
              >
                <table className="w-full text-xs text-left">
                  <tbody>
                    {report.staffAdvances.map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="py-2 pr-2 font-medium text-foreground">{item.staffName}</td>
                        <td className="py-2 text-right font-bold text-foreground">
                          {fmt(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}
          </div>

          {/* Channel Reconciliation */}
          <div className="space-y-5">
            <h4 className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider flex items-center gap-1.5 border-b pb-2">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              3. Channel Reconciliation
            </h4>
            {report.paymentChannels?.length > 0 && (
              <Panel
                title="Payment Channel Collections"
                amount={fmt(paymentChannelsTotal)}
                titleClass="text-slate-800 dark:text-slate-200"
              >
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b text-muted-foreground text-[10px] uppercase font-bold pb-1">
                      <th className="pb-2">Channel / Bank</th>
                      <th className="pb-2">Source</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.paymentChannels.map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="py-2 pr-2">
                          <span className="font-bold text-foreground block">{item.channel}</span>
                          <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wide">
                            {item.bank}
                          </span>
                        </td>
                        <td className="py-2 text-muted-foreground">{item.sourceLabel}</td>
                        <td className="py-2 text-right font-bold text-foreground">
                          {fmt(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}
            <Panel title="Bank Deposits & Handovers" amount="" defaultExpanded={true}>
              <div className="space-y-2.5 text-xs">
                <div className="border-b pb-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Less Bank Deposit</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {fmt(bankDeposit)}
                    </span>
                  </div>
                  {bankDepositsList.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between pl-4 text-[11px] text-muted-foreground/80 mt-0.5"
                    >
                      <span>{item.bankName}</span>
                      <span>{fmt(item.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground font-medium">Fund Handover Sir</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {fmt(handoverSir)}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-1.5">
                  <span className="text-muted-foreground font-medium">Fund Handover Madam</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">
                    {fmt(handoverMadam)}
                  </span>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-[11px] text-muted-foreground/60 pt-6 border-t">
          <p>
            Prepared by <strong>{report.creatorName}</strong> · This is a read-only shared view.
          </p>
          <p className="mt-0.5">
            Link expires on{" "}
            {expiryDate.toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}{" "}
            · Powered by ACME ERP
          </p>
        </footer>
      </main>
    </div>
  );
}
