import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Edit2, Lock, FileText, FileSpreadsheet, CheckCircle, AlertTriangle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import * as React from "react";
import { exportClosingToExcel, exportClosingToPDF } from "../../../../lib/closing-export";
import { useRpcQuery } from "../../../../lib/query";
import { client } from "../../../../services/rpc";
import { Button } from "../../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../../ui/card";
import { Badge } from "../../../../ui/badge";
import { cn } from "../../../../utils/cn";


const Panel = ({ title, amount, children, defaultExpanded = false, titleClass = "" }: any) => {
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
        <CardContent className="p-3">
          {children}
        </CardContent>
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
          <span className="uppercase tracking-wider text-slate-700 dark:text-slate-300">{title}</span>
        </div>
        <span className="text-rose-600 dark:text-rose-455">{amount}</span>
      </div>
      <div className={cn(!expanded && "hidden")}>
        {children}
      </div>
    </div>
  );
};

type ServiceCategory = { id: number; code: string; label: string; sortOrder: number; active: boolean };

export const Route = createFileRoute("/_authenticated/accounts/reports/$id")({
  component: ReportDetail,
});

function ReportDetail() {
  const { id } = Route.useParams();
  const router = useRouter();

  // Query single report details
  const reportQuery = useRpcQuery<any>(
    ["daily-closing-report", id],
    () => client["daily-closing"].reports[":id"].$get({ param: { id } })
  );

  // Query all categories
  const categoriesQuery = useRpcQuery<ServiceCategory[]>(
    ["service-categories"],
    () => (client["daily-closing"] as any).categories.$get()
  );

  const expCategoriesQuery = useRpcQuery<any[]>(
    ["expense-categories"],
    () => (client["daily-closing"] as any)["expense-categories"].$get()
  );

  const report = reportQuery.data;

  if (reportQuery.isLoading || categoriesQuery.isLoading || expCategoriesQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading detailed statement...
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-6 rounded-lg border border-rose-200 text-center space-y-3">
        <AlertTriangle className="size-8 mx-auto" />
        <h4 className="font-bold">Closing statement not found.</h4>
        <p className="text-xs">The record you are trying to view does not exist or has been deleted.</p>
        <Button onClick={() => router.navigate({ to: "/accounts/reports" })} variant="outline" size="default">
          Go Back
        </Button>
      </div>
    );
  }

  const categoriesList = categoriesQuery.data ?? [];
  const expCategoriesList = expCategoriesQuery.data ?? [];

  // Group service lines by department code dynamically
  const activeCategoryCodes = new Set(categoriesList.filter((c) => c.active).map((c) => c.code));
  const reportCategoryCodes = new Set(report.serviceLines?.map((l: any) => l.department).filter(Boolean) as string[]);

  const allCategoryCodes = Array.from(new Set([
    ...categoriesList.map((c) => c.code),
    ...reportCategoryCodes
  ]));

  // console.log(allCategoryCodes)

  const displayedCategories = allCategoryCodes
    .map((code) => {
      const catObj = categoriesList.find((c) => c.code === code);
      const isCategoryActive = catObj ? catObj.active : false;
      const lines = report.serviceLines?.filter((l: any) => l.department === code && !l.isNightEntry) ?? [];
      const sortedLines = [...lines].sort((a: any, b: any) => {
        const orderA = a.sortOrder !== undefined && a.sortOrder !== null ? Number(a.sortOrder) : 999999;
        const orderB = b.sortOrder !== undefined && b.sortOrder !== null ? Number(b.sortOrder) : 999999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.serviceName || "").localeCompare(b.serviceName || "");
      });
      const total = sortedLines.reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0);
      const label = catObj ? catObj.label : code;
      const sortOrder = catObj ? catObj.sortOrder : 999999;

      return {
        code,
        label,
        active: isCategoryActive,
        lines: sortedLines,
        total,
        sortOrder,
      };
    })
    .filter((cat) => cat.lines.length > 0)


  // console.log(displayedCategories)

  const categoryIncomeTotal = displayedCategories.reduce((sum, cat) => sum + cat.total, 0);
  const nightServicesTotal = report.serviceLines?.filter((l: any) => l.isNightEntry).reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0) ?? 0;
  const nightLines = report.serviceLines?.filter((l: any) => l.isNightEntry) ?? [];
  const sortedNightLines = [...nightLines].sort((a: any, b: any) => {
    const orderA = a.sortOrder !== undefined && a.sortOrder !== null ? Number(a.sortOrder) : 999999;
    const orderB = b.sortOrder !== undefined && b.sortOrder !== null ? Number(b.sortOrder) : 999999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.serviceName || "").localeCompare(b.serviceName || "");
  });

  // Expenditures & Advances
  const expendituresTotal = report.expenditures?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  const expendituresByCategory = (report.expenditures || []).reduce((acc: any, item: any) => {
    if (!acc[item.category]) acc[item.category] = { category: item.category, total: 0, items: [] };
    acc[item.category].total += parseFloat(item.amount);
    acc[item.category].items.push(item);
    return acc;
  }, {});
  const groupedExpenditures = Object.values(expendituresByCategory).sort((a: any, b: any) => a.category.localeCompare(b.category));

  const staffAdvancesTotal = report.staffAdvances?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // IPD Admissions & Discharges
  const ipdAdmissionsTotal = report.ipdAdmissions?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;
  const ipdDischargesTotal = report.ipdDischarges?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // Additional Incomes
  const additionalIncomeTotal = report.additionalIncome?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // Discounts & Returns
  const discountsReturnsList = report.discountsReturns ?? [];
  const discountsTotal = discountsReturnsList.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // Recomputed Grand Totals
  const openingBalance = parseFloat(report.openingBalance) || 0;
  const totalIncome = categoryIncomeTotal + nightServicesTotal + ipdAdmissionsTotal + ipdDischargesTotal + additionalIncomeTotal - discountsTotal;
  const totalExpenditure = expendituresTotal + staffAdvancesTotal;
  const netBalance = totalIncome - totalExpenditure;

  const bankDeposit = parseFloat(report.bankDeposit) || 0;
  const handoverSir = parseFloat(report.fundHandoverSir) || 0;

  const bankDepositsList = (() => {
    if (report.bankDeposits) {
      try {
        const parsed = JSON.parse(report.bankDeposits);
        if (Array.isArray(parsed)) {
          return parsed.filter((item: any) => (parseFloat(item.amount) || 0) > 0);
        }
      } catch (e) {
        // ignore
      }
    }
    // Fallback for legacy statements
    const total = parseFloat(report.bankDeposit) || 0;
    if (total > 0) {
      return [{ bankName: "Sir (ICICI)", amount: total }];
    }
    return [];
  })();
  const handoverMadam = parseFloat(report.fundHandoverMadam) || 0;

  // Reconciled Payment Channels
  const cashSir = parseFloat(report.cashReceiptSir) || 0;
  const cashMam = parseFloat(report.cashReceiptMam) || 0;
  const cashAcon = parseFloat(report.cashReceiptAcon) || 0;
  const bankReceiptSir = parseFloat(report.bankReceiptSir) || 0;
  const bankReceiptSirBank = report.bankReceiptSirBank || "";
  const cashReceipts = parseFloat(report.cashReceipts) || 0;
  const cashReceiptsTotal = parseFloat(report.cashReceiptsTotal) || 0;
  const bankReceiptsTotal = parseFloat(report.bankReceiptsTotal) || 0;
  const closingBalance = parseFloat(report.closingBalance) || 0;

  const paymentChannelsTotal = bankReceiptsTotal + cashReceipts;
  const paymentChannelsListTotal = report.paymentChannels?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;
  const isReconciled = Math.abs(paymentChannelsTotal - totalIncome) < 1;

  const fmt = (num: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num);

  const handleExportPDF = () => {
    exportClosingToPDF(report, categoriesList, expCategoriesList);
  };

  const handleExportExcel = () => {
    exportClosingToExcel(report, categoriesList, expCategoriesList);
  };


  return (
    <div className="space-y-6">
      {/* Print styles override */}


      {/* Detail view header actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild className="cursor-pointer">
            <Link to="/accounts/reports">
              <ArrowLeft size={16} />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-extrabold tracking-tight">Closing Statement</h3>
              <Badge className={cn(
                "font-bold text-[10px]",
                report.status === "draft" && "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400",
                report.status === "submitted" && "bg-emerald-100 text-emerald-800 border-emerald-250 dark:bg-emerald-950/20 dark:text-emerald-400",
                report.status === "locked" && "bg-slate-100 text-slate-700 border-slate-250 dark:bg-slate-950/30 dark:text-slate-400"
              )}>
                {report.status.toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Statement details for {new Date(report.reportDate).toLocaleDateString([], { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {report.status === "draft" && (
            <Button asChild variant="outline" className="font-semibold cursor-pointer">
              <Link to="/accounts/reports/edit/$id" params={{ id: String(report.id) }}>
                <Edit2 size={15} className="mr-1.5" /> Edit Draft
              </Link>
            </Button>
          )}
          <Button onClick={handleExportPDF} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer gap-1.5">
            <FileText size={15} /> Export PDF
          </Button>
          <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold cursor-pointer gap-1.5">
            <FileSpreadsheet size={15} /> Export to Excel
          </Button>
        </div>
      </div>

      {/* Discrepancy Alert Banner */}
      {!isReconciled && (
        <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-455 p-4 rounded-lg border border-rose-200 text-sm font-semibold flex items-center gap-2.5 animate-in fade-in duration-300">
          <AlertTriangle size={18} className="shrink-0" />
          <div>
            <span>Payment channels reconciliation mismatch detected!</span>
            <p className="text-xs font-normal text-muted-foreground mt-0.5">
              Total channel transactions sum to <strong className="text-rose-700 dark:text-rose-400">{fmt(paymentChannelsTotal)}</strong>, but net daily revenues sum to <strong className="text-rose-700 dark:text-rose-400">{fmt(totalIncome)}</strong>. Mismatch: <strong className="text-rose-700 dark:text-rose-400">{fmt(Math.abs(paymentChannelsTotal - totalIncome))}</strong>.
            </p>
          </div>
        </div>
      )}


      {/* Reconciled Summary Block */}
      <div className="mt-8 border-t-2 pt-6 w-full max-w-none mb-8 text-sm">
        <div className="space-y-2 border border-teal-600/30 rounded-xl bg-teal-500/5 p-5 shadow-xs">
          <h4 className="font-extrabold text-base border-b pb-2 mb-3 text-slate-800 dark:text-slate-100 uppercase tracking-wide">
            Closing Statement Summary
          </h4>

          <div className="space-y-2 text-xs p-2">
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
                {displayedCategories.map((cat) => (
                  <div key={cat.code} className="flex justify-between">
                    <span className="font-semibold">{cat.label}</span>
                    <span className="font-bold">{fmt(cat.total)}</span>
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
              <div className="flex justify-between pl-4 font-semibold text-teal-600/80 dark:text-teal-450/80">
                <span>Cash Receipts</span>
                <span>{fmt(cashReceipts)}</span>
              </div>
              <div className="flex justify-between pl-4 font-semibold text-teal-600/80 dark:text-teal-450/80 pb-2">
                <span>Bank Receipts</span>
                <span>{fmt(bankReceiptsTotal)}</span>
              </div>

              <div className="flex justify-between border-b pb-2 pt-1 text-rose-400 dark:text-rose-355">
                <span className="font-semibold">Total Expenditures:</span>
                <span className="font-bold">{fmt(totalExpenditure)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Gross Balance:</span>
                <span>{fmt(netBalance)}</span>
              </div>
            </div>

            <div className="gap-y-2 mt-4 bg-amber-200/10 p-4">
              <span className="font-semibold text-lg">Cash Management</span>
              <hr className="border-b-2 border-fuchsia-800/30 mb-2" />
              <div className="flex justify-between text-emerald-300 mb-2">
                <span className="font-semibold">Opening Balance:</span>
                <span className="font-bold">{fmt(openingBalance)}</span>
              </div>

              <div>
                <div className="flex justify-between text-emerald-300">
                  <span className="font-semibold">Cash Receipt (Sir):</span>
                  <span className="font-bold">{fmt(cashSir)}</span>
                </div>
                <div className="flex justify-between text-emerald-300">
                  <span className="font-semibold">Cash Receipt (Mam):</span>
                  <span className="font-bold">{fmt(cashMam)}</span>
                </div>
                <div className="flex justify-between text-emerald-300">
                  <span className="font-semibold">Cash Receipt (Acon):</span>
                  <span className="font-bold">{fmt(cashAcon)}</span>
                </div>
                {bankReceiptSir > 0 && (
                  <div className="flex justify-between text-emerald-300">
                    <span className="font-semibold">Bank Receipt (Sir) [{bankReceiptSirBank}]:</span>
                    <span className="font-bold">{fmt(bankReceiptSir)}</span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-300 mb-2">
                  <span className="font-semibold">Add Cash Income Receipts:</span>
                  <span className="font-bold">{fmt(cashReceipts)}</span>
                </div>
                <div className="flex justify-between text-rose-300">
                  <span className="font-semibold">Less Cash Expenditure:</span>
                  <span className="font-bold">{fmt(expendituresTotal)}</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-rose-300">
                    <span className="font-semibold">Less Bank Deposit:</span>
                    <span className="font-bold">{fmt(bankDeposit)}</span>
                  </div>
                  {bankDepositsList.map((item, idx) => (
                    <div key={idx} className="flex justify-between pl-4 text-[10px] text-rose-200/80">
                      <span>{item.bankName}:</span>
                      <span>{fmt(item.amount)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-rose-300">
                  <span className="font-semibold">Handover (Sir):</span>
                  <span className="font-bold">{fmt(handoverSir)}</span>
                </div>
                <div className="flex justify-between  text-rose-300">
                  <span className="font-semibold">Handover (Madam):</span>
                  <span className="font-bold">{fmt(handoverMadam)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 border-t pt-3 mt-3 p-4">
              <div className="flex justify-between items-center text-sm font-bold text-lime-400">
                <span>Calculated Closing:</span>
                <span>{fmt(closingBalance)}</span>
              </div>
            </div>

            <div className={cn(
              "border p-3 rounded-lg mt-4 text-center text-[11px] font-bold transition-all",
              isReconciled
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
            )}>
              <div className="flex items-center justify-center gap-1">
                {isReconciled ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                <span>RECONCILIATION CHECK</span>
              </div>
              <div className="mt-1 font-semibold text-muted-foreground">
                Channel sum: {fmt(paymentChannelsTotal)}<br />
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

      {/* 3-Column Reconciliation Sheet */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Column 1: Income Streams */}
        <div className="space-y-5">
          <h4 className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider flex items-center gap-1.5 border-b pb-2">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            1. Income streams
          </h4>

          {/* Opening Balance */}
          <Panel title="To Balance B/f" amount={fmt(openingBalance)} />

          {/* Night Services Panel */}
          {nightServicesTotal > 0 && (
            <Panel title="Night / After-EOD Services" amount={fmt(nightServicesTotal)} titleClass="text-indigo-650 dark:text-indigo-400">
              <table className="w-full text-xs text-left">
                <tbody>
                  {sortedNightLines.map((line: any) => (
                    <tr key={line.id} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="py-2 pr-2 font-medium text-foreground">{line.serviceName}</td>
                      <td className="py-2 text-right text-muted-foreground">
                        {parseFloat(line.rate) > 0 ? `${line.quantity} × ${fmt(line.rate)}` : `${line.quantity} qty`}
                      </td>
                      <td className="py-2 text-right font-semibold text-foreground">{fmt(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}

          {/* Dynamic Categories Services */}
          {displayedCategories.map((cat) => (
            <Panel key={cat.code} title={cat.label} amount={fmt(cat.total)} titleClass="text-teal-650 dark:text-teal-400">

              <table className="w-full text-xs text-left">
                <tbody>
                  {cat.lines.map((line: any) => (
                    <tr key={line.id} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="py-2 pr-2 font-medium text-foreground">{line.serviceName}</td>
                      <td className="py-2 text-right text-muted-foreground">
                        {parseFloat(line.rate) > 0 ? `${line.quantity} × ${fmt(line.rate)}` : `${line.quantity} qty`}
                      </td>
                      <td className="py-2 text-right font-semibold text-foreground">{fmt(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

            </Panel>
          ))}





          {/* IPD Admissions */}
          {report.ipdAdmissions?.length > 0 && (
            <Panel title="IPD Admissions / Advances" amount={fmt(ipdAdmissionsTotal)} titleClass="text-teal-650 dark:text-teal-400">

              <table className="w-full text-xs text-left">
                <tbody>
                  {report.ipdAdmissions.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="py-2 pr-2 font-semibold text-foreground">{item.patientName}</td>
                      <td className="py-2 text-center">
                        <span className="inline-block px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-650 dark:text-slate-300">
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2 text-right font-bold text-foreground">{fmt(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

            </Panel>
          )}

          {/* IPD Discharges */}
          {report.ipdDischarges?.length > 0 && (
            <Panel title="IPD Discharges" amount={fmt(ipdDischargesTotal)} titleClass="text-teal-650 dark:text-teal-400">

              <table className="w-full text-xs text-left">
                <tbody>
                  {report.ipdDischarges.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="py-2 pr-2 font-semibold text-foreground">{item.patientName}</td>
                      <td className="py-2 text-right font-bold text-foreground">{fmt(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

            </Panel>
          )}

          {/* Additional Income */}
          {report.additionalIncome?.length > 0 && (
            <Panel title="Additional Incomes (Add)" amount={fmt(additionalIncomeTotal)} titleClass="text-teal-650 dark:text-teal-400">
              <div className="space-y-2 text-xs">

                {report.additionalIncome.map((item: any) => (
                  <div key={item.id} className="flex justify-between border-b pb-1.5 last:border-0 last:pb-0 hover:bg-muted/10">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className="font-bold text-foreground">{fmt(item.amount)}</span>
                  </div>
                ))}

              </div>
            </Panel>
          )}

          {/* Discounts & Returns */}
          {discountsReturnsList.length > 0 && (
            <Panel title="Discounts & Returns" amount={"-" + fmt(discountsTotal)} titleClass="text-rose-600 dark:text-rose-455">
              <div className="space-y-2 text-xs">

                {discountsReturnsList.map((item: any) => (
                  <div key={item.id} className="flex justify-between border-b pb-1.5 last:border-0 last:pb-0 hover:bg-muted/10">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className="font-bold text-rose-600 dark:text-rose-455">-{fmt(item.amount)}</span>
                  </div>
                ))}

              </div>
            </Panel>
          )}
        </div>

        {/* Column 2: Expenditures & Advances */}
        <div className="space-y-5">
          <h4 className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider flex items-center gap-1.5 border-b pb-2">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            2. Expenditures & Advances
          </h4>

          {/* Expenditures */}
          <Panel title="Expenditures (Out)" amount={fmt(expendituresTotal)} titleClass="text-rose-600 dark:text-rose-400" defaultExpanded={true}>

            {groupedExpenditures.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">No logged expenses.</p>
            ) : (
              <div className="space-y-3">
                {(groupedExpenditures as any[]).map((group: any) => {
                  const catLabel = expCategoriesList.find((c: any) => c.code === group.category)?.label || group.category;
                  return (
                    <SubPanel key={group.category} title={catLabel} amount={fmt(group.total)} defaultExpanded={false}>
                      <table className="w-full text-xs text-left">
                        <tbody>
                          {group.items.map((item: any) => (
                            <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                              <td className="py-1.5 pr-2 pl-2 text-foreground font-medium">{item.details}</td>
                              <td className="py-1.5 text-right font-bold text-foreground pr-2">{fmt(item.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </SubPanel>
                  );
                })}
              </div>
            )}

          </Panel>

          {/* Staff Advances */}
          {report.staffAdvances?.length > 0 && (
            <Panel title="Staff Advances" amount={fmt(staffAdvancesTotal)} titleClass="text-rose-600 dark:text-rose-400">

              <table className="w-full text-xs text-left">
                <tbody>
                  {report.staffAdvances.map((item: any) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                      <td className="py-2 pr-2 font-medium text-foreground">{item.staffName}</td>
                      <td className="py-2 text-right font-bold text-foreground">{fmt(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

            </Panel>
          )}
        </div>

        {/* Column 3: Payment Channel Reconciliation */}
        <div className="space-y-5">
          <h4 className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider flex items-center gap-1.5 border-b pb-2">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            3. Channel Reconciliation
          </h4>

          {/* Payment channels breakdown */}
          <Panel title="Payment Channel Collections" amount={fmt(paymentChannelsListTotal)} titleClass="text-slate-800 dark:text-slate-200">

            {report.paymentChannels?.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">No logged payment channels.</p>
            ) : (
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
                      <td className="py-2 text-right font-bold text-foreground">{fmt(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

          </Panel>

          {/* Bank deposit & Handover */}
          <Panel title="Bank Deposits & Handovers" amount="" defaultExpanded={true}>
            <div className="space-y-2.5 text-xs">

              {(cashSir > 0 || cashMam > 0 || cashAcon > 0 || bankReceiptSir > 0) && (
                <div className="pt-2 mt-2 border-t border-dashed space-y-2">
                  <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider pb-1">Receipts / Inflows</h5>
                  {bankReceiptSir > 0 && (
                    <div className="flex justify-between border-b pb-1.5 last:border-0 last:pb-0">
                      <span className="text-muted-foreground font-medium">Bank Receipt (Sir) [{bankReceiptSirBank || "N/A"}]</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-450">{fmt(bankReceiptSir)}</span>
                    </div>
                  )}
                  {cashSir > 0 && (
                    <div className="flex justify-between border-b pb-1.5 last:border-0 last:pb-0">
                      <span className="text-muted-foreground font-medium">Cash Receipt (Sir)</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-450">{fmt(cashSir)}</span>
                    </div>
                  )}
                  {cashMam > 0 && (
                    <div className="flex justify-between border-b pb-1.5 last:border-0 last:pb-0">
                      <span className="text-muted-foreground font-medium">Cash Receipt (Mam)</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-450">{fmt(cashMam)}</span>
                    </div>
                  )}
                  {cashAcon > 0 && (
                    <div className="flex justify-between border-b pb-1.5 last:border-0 last:pb-0">
                      <span className="text-muted-foreground font-medium">Cash Receipt (Acon)</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-450">{fmt(cashAcon)}</span>
                    </div>
                  )}

                </div>
              )}

              <div className="border-b pb-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Less Bank Deposit</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-455">{fmt(bankDeposit)}</span>
                </div>
                {bankDepositsList.map((item, idx) => (
                  <div key={idx} className="flex justify-between pl-4 text-[11px] text-muted-foreground/80 mt-0.5">
                    <span>{item.bankName}</span>
                    <span>{fmt(item.amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground font-medium">Fund Handover Sir</span>
                <span className="font-semibold text-rose-600 dark:text-rose-455">{fmt(handoverSir)}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground font-medium">Fund Handover Madam</span>
                <span className="font-semibold text-rose-600 dark:text-rose-455">{fmt(handoverMadam)}</span>
              </div>



            </div>
          </Panel>
        </div>
      </div>

    </div>
  );
}
