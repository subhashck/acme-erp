import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Printer, Edit2, Lock, FileText, CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";
import * as React from "react";
import { useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../ui/card";
import { Badge } from "../../../ui/badge";
import { cn } from "../../../utils/cn";

export const Route = createFileRoute("/_authenticated/reports/$id")({
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

  const report = reportQuery.data;

  if (reportQuery.isLoading) {
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
        <Button onClick={() => router.navigate({ to: "/reports" })} variant="outline" size="default">
          Go Back
        </Button>
      </div>
    );
  }

  // Categories of service lines
  const opdLines = report.serviceLines?.filter((l: any) => l.department === "OPD_GYNAE") ?? [];
  const dentalLines = report.serviceLines?.filter((l: any) => l.department === "DENTAL") ?? [];

  const opdTotal = opdLines.reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0);
  const dentalTotal = dentalLines.reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0);

  // Pharmacy Total
  const otWard = parseFloat(report.pharmacyIncome?.otWardTotal) || 0;
  const acmeNew = parseFloat(report.pharmacyIncome?.acmeNewTotal) || 0;
  const parking = parseFloat(report.pharmacyIncome?.parking) || 0;
  const coffeeShop = parseFloat(report.pharmacyIncome?.coffeeShop) || 0;
  const canteen = parseFloat(report.pharmacyIncome?.canteenIncome) || 0;
  const ccNight = parseFloat(report.pharmacyIncome?.creditCardChargesNight) || 0;
  const training = parseFloat(report.pharmacyIncome?.trainingFee) || 0;
  const humankind = parseFloat(report.pharmacyIncome?.humankindSales) || 0;

  const miscIncomeList = JSON.parse(report.pharmacyIncome?.miscIncome || "[]");
  const miscIncomeTotal = miscIncomeList.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0);

  const pharmacyTotal = otWard + acmeNew + parking + coffeeShop + canteen + ccNight + training + humankind + miscIncomeTotal;

  // Expenditures & Advances
  const expendituresTotal = report.expenditures?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;
  const staffAdvancesTotal = report.staffAdvances?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // IPD Admissions & Discharges
  const ipdAdmissionsTotal = report.ipdAdmissions?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;
  const ipdDischargesTotal = report.ipdDischarges?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // Additional Incomes
  const additionalIncomeTotal = report.additionalIncome?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // Recomputed Grand Totals
  const openingBalance = parseFloat(report.openingBalance) || 0;
  const totalIncome = openingBalance + opdTotal + dentalTotal + pharmacyTotal + ipdAdmissionsTotal + ipdDischargesTotal + additionalIncomeTotal;
  const totalExpenditure = expendituresTotal + staffAdvancesTotal;
  const netBalance = totalIncome - totalExpenditure;

  const bankDeposit = parseFloat(report.bankDeposit) || 0;
  const handoverSir = parseFloat(report.fundHandoverSir) || 0;
  const handoverMadam = parseFloat(report.fundHandoverMadam) || 0;
  const closingBalance = netBalance - bankDeposit - handoverSir - handoverMadam;

  // Reconciled Payment Channels
  const paymentChannelsTotal = report.paymentChannels?.reduce((sum: number, item: any) => sum + parseFloat(item.amount), 0) ?? 0;

  // Cross check: Payment Channels total vs (Total Income - Opening Balance)
  const isReconciled = Math.abs(paymentChannelsTotal - (totalIncome - openingBalance)) < 1;

  const fmt = (num: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print styles override */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; max-width: 100% !important; margin: 0 !important; border: 0 !important; box-shadow: none !important; }
          .print-grid { display: grid !important; grid-template-cols: 1fr 1fr 1fr !important; gap: 15px !important; }
          .card { border: 1px solid #94a3b8 !important; page-break-inside: avoid !important; box-shadow: none !important; background: transparent !important; }
          header { display: none !important; }
          aside { display: none !important; }
          main { padding: 0 !important; }
        }
      `}</style>

      {/* Detail view header actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild className="cursor-pointer">
            <Link to="/reports">
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
              <Link to="/reports/edit/$id" params={{ id: String(report.id) }}>
                <Edit2 size={15} className="mr-1.5" /> Edit Draft
              </Link>
            </Button>
          )}

          <Button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-900 text-white font-semibold cursor-pointer gap-1.5">
            <Printer size={15} /> Print Statement
          </Button>
        </div>
      </div>

      {/* Discrepancy Alert Banner */}
      {!isReconciled && (
        <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450 p-4 rounded-lg border border-rose-200 text-sm font-semibold flex items-center gap-2.5 no-print animate-in fade-in duration-300">
          <AlertTriangle size={18} className="shrink-0" />
          <div>
            <span>Payment channels reconciliation mismatch detected!</span>
            <p className="text-xs font-normal text-muted-foreground mt-0.5">
              Total channel transactions sum to <strong className="text-rose-700 dark:text-rose-400">{fmt(paymentChannelsTotal)}</strong>, but net daily revenues sum to <strong className="text-rose-700 dark:text-rose-400">{fmt(totalIncome - openingBalance)}</strong>. Mismatch: <strong className="text-rose-700 dark:text-rose-400">{fmt(Math.abs(paymentChannelsTotal - (totalIncome - openingBalance)))}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Print Page Header */}
      <div className="hidden print:block text-center border-b-2 border-teal-700 pb-4 mb-6">
        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">ACME Fertility & Healthcare Centre</h1>
        <p className="text-xs text-slate-500 font-medium uppercase mt-1">Daily Close Statement & Financial Reconciliation Report</p>
        <div className="flex justify-between text-[11px] mt-4 font-semibold text-slate-600">
          <span>REPORT DATE: {new Date(report.reportDate).toLocaleDateString([], { dateStyle: "long" })}</span>
          <span>CREATED BY: {report.creatorName}</span>
          <span>STATUS: {report.status.toUpperCase()}</span>
        </div>
      </div>

      {/* 3-Column Reconciliation Sheet */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 print-grid print-full-width">
        
        {/* Column 1: Income Streams */}
        <div className="space-y-5">
          <h4 className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider flex items-center gap-1.5 border-b pb-2">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            1. Income streams
          </h4>

          {/* Opening Balance */}
          <Card className="card border bg-card">
            <CardHeader className="py-3 bg-muted/20 border-b">
              <CardTitle className="text-xs font-extrabold flex justify-between items-center text-muted-foreground uppercase tracking-wider">
                <span>To Balance B/f</span>
                <span className="text-foreground text-sm font-black">{fmt(openingBalance)}</span>
              </CardTitle>
            </CardHeader>
          </Card>

          {/* OPD / Gynae Services */}
          {opdLines.length > 0 && (
            <Card className="card border bg-card">
              <CardHeader className="py-3 bg-muted/20 border-b">
                <CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">
                  <span>OPD & Gynae Services</span>
                  <span className="text-teal-650 dark:text-teal-400 text-sm font-black">{fmt(opdTotal)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <table className="w-full text-xs text-left">
                  <tbody>
                    {opdLines.map((line: any) => (
                      <tr key={line.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="py-2 pr-2 font-medium text-foreground">{line.serviceName}</td>
                        <td className="py-2 text-right text-muted-foreground">
                          {line.quantity} × {fmt(line.rate)}
                        </td>
                        <td className="py-2 text-right font-semibold text-foreground">{fmt(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Dental Services */}
          {dentalLines.length > 0 && (
            <Card className="card border bg-card">
              <CardHeader className="py-3 bg-muted/20 border-b">
                <CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">
                  <span>Dental Services</span>
                  <span className="text-teal-650 dark:text-teal-400 text-sm font-black">{fmt(dentalTotal)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <table className="w-full text-xs text-left">
                  <tbody>
                    {dentalLines.map((line: any) => (
                      <tr key={line.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="py-2 pr-2 font-medium text-foreground">{line.serviceName}</td>
                        <td className="py-2 text-right text-muted-foreground">
                          {line.quantity} × {fmt(line.rate)}
                        </td>
                        <td className="py-2 text-right font-semibold text-foreground">{fmt(line.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Pharmacy & General Incomes */}
          <Card className="card border bg-card">
            <CardHeader className="py-3 bg-muted/20 border-b">
              <CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">
                <span>Pharmacy & General Sales</span>
                <span className="text-teal-650 dark:text-teal-400 text-sm font-black">{fmt(pharmacyTotal)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2 text-xs">
              <div className="flex justify-between border-b pb-1.5 hover:bg-muted/10">
                <span className="text-muted-foreground font-medium">OT / Ward Medicines</span>
                <span className="font-semibold">{fmt(otWard)}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 hover:bg-muted/10">
                <span className="text-muted-foreground font-medium">Acme New Medicines</span>
                <span className="font-semibold">{fmt(acmeNew)}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 hover:bg-muted/10">
                <span className="text-muted-foreground font-medium">Parking Receipts</span>
                <span className="font-semibold">{fmt(parking)}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 hover:bg-muted/10">
                <span className="text-muted-foreground font-medium">Coffee Shop Sales</span>
                <span className="font-semibold">{fmt(coffeeShop)}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 hover:bg-muted/10">
                <span className="text-muted-foreground font-medium">Canteen Sales</span>
                <span className="font-semibold">{fmt(canteen)}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 hover:bg-muted/10">
                <span className="text-muted-foreground font-medium">Night Credit Card Fees</span>
                <span className="font-semibold">{fmt(ccNight)}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 hover:bg-muted/10">
                <span className="text-muted-foreground font-medium">Training Program Fees</span>
                <span className="font-semibold">{fmt(training)}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5 hover:bg-muted/10">
                <span className="text-muted-foreground font-medium">Humankind Brand Sales</span>
                <span className="font-semibold">{fmt(humankind)}</span>
              </div>
              {miscIncomeList.map((item: any, i: number) => (
                <div key={i} className="flex justify-between border-b pb-1.5 last:border-0 last:pb-0 hover:bg-muted/10 font-semibold text-foreground">
                  <span className="truncate pr-2 font-medium">{item.label}</span>
                  <span>{fmt(parseFloat(item.amount) || 0)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* IPD Admissions */}
          {report.ipdAdmissions?.length > 0 && (
            <Card className="card border bg-card">
              <CardHeader className="py-3 bg-muted/20 border-b">
                <CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">
                  <span>IPD Admissions / Advances</span>
                  <span className="text-teal-650 dark:text-teal-400 text-sm font-black">{fmt(ipdAdmissionsTotal)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <table className="w-full text-xs text-left">
                  <tbody>
                    {report.ipdAdmissions.map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="py-2 pr-2 font-semibold text-foreground">{item.patientName}</td>
                        <td className="py-2 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded-sm bg-slate-100 text-[10px] font-bold text-slate-650">
                            {item.type}
                          </span>
                        </td>
                        <td className="py-2 text-right font-bold text-foreground">{fmt(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* IPD Discharges */}
          {report.ipdDischarges?.length > 0 && (
            <Card className="card border bg-card">
              <CardHeader className="py-3 bg-muted/20 border-b">
                <CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">
                  <span>IPD Discharges</span>
                  <span className="text-teal-650 dark:text-teal-400 text-sm font-black">{fmt(ipdDischargesTotal)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
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
              </CardContent>
            </Card>
          )}

          {/* Additional Income */}
          {report.additionalIncome?.length > 0 && (
            <Card className="card border bg-card">
              <CardHeader className="py-3 bg-muted/20 border-b">
                <CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">
                  <span>Additional Incomes (Add)</span>
                  <span className="text-teal-650 dark:text-teal-400 text-sm font-black">{fmt(additionalIncomeTotal)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2 text-xs">
                {report.additionalIncome.map((item: any) => (
                  <div key={item.id} className="flex justify-between border-b pb-1.5 last:border-0 last:pb-0 hover:bg-muted/10">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className="font-bold text-foreground">{fmt(item.amount)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Column 2: Expenditures & Advances */}
        <div className="space-y-5">
          <h4 className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider flex items-center gap-1.5 border-b pb-2">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            2. Expenditures & Advances
          </h4>

          {/* Expenditures */}
          <Card className="card border bg-card">
            <CardHeader className="py-3 bg-muted/20 border-b">
              <CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">
                <span>Expenditures (Out)</span>
                <span className="text-rose-600 dark:text-rose-400 text-sm font-black">{fmt(expendituresTotal)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {report.expenditures?.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">No logged expenses.</p>
              ) : (
                <table className="w-full text-xs text-left">
                  <tbody>
                    {report.expenditures.map((item: any) => (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="py-2 pr-2">
                          <span className="font-bold text-foreground block">{item.details}</span>
                          <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wide">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-2 text-right font-bold text-foreground">{fmt(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Staff Advances */}
          {report.staffAdvances?.length > 0 && (
            <Card className="card border bg-card">
              <CardHeader className="py-3 bg-muted/20 border-b">
                <CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">
                  <span>Staff Advances</span>
                  <span className="text-rose-600 dark:text-rose-400 text-sm font-black">{fmt(staffAdvancesTotal)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
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
              </CardContent>
            </Card>
          )}
        </div>

        {/* Column 3: Payment Channel Reconciliation */}
        <div className="space-y-5">
          <h4 className="text-xs font-black uppercase text-teal-600 dark:text-teal-400 tracking-wider flex items-center gap-1.5 border-b pb-2">
            <span className="h-2 w-2 rounded-full bg-teal-500" />
            3. Channel Reconciliation
          </h4>

          {/* Payment channels breakdown */}
          <Card className="card border bg-card">
            <CardHeader className="py-3 bg-muted/20 border-b">
              <CardTitle className="text-xs font-extrabold flex justify-between items-center uppercase tracking-wider">
                <span>Payment Channel Collections</span>
                <span className="text-slate-800 dark:text-slate-200 text-sm font-black">{fmt(paymentChannelsTotal)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
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
            </CardContent>
          </Card>

          {/* Bank deposit & Handover */}
          <Card className="card border bg-card bg-slate-50/50 dark:bg-slate-900/10">
            <CardHeader className="py-3 bg-muted/20 border-b">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                Bank Deposits & Handovers
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5 text-xs">
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground font-medium">Less Bank Deposit</span>
                <span className="font-semibold text-rose-600 dark:text-rose-455">{fmt(bankDeposit)}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground font-medium">Fund Handover Sir</span>
                <span className="font-semibold text-rose-600 dark:text-rose-455">{fmt(handoverSir)}</span>
              </div>
              <div className="flex justify-between border-b pb-1.5">
                <span className="text-muted-foreground font-medium">Fund Handover Madam</span>
                <span className="font-semibold text-rose-600 dark:text-rose-455">{fmt(handoverMadam)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reconciled Summary Block */}
      <div className="mt-8 border-t-2 pt-6 max-w-lg ml-auto text-sm print-full-width">
        <div className="space-y-2 border border-teal-600/30 rounded-xl bg-teal-500/5 p-5 shadow-xs">
          <h4 className="font-extrabold text-base border-b pb-2 mb-3 text-slate-800 dark:text-slate-100 uppercase tracking-wide">
            Closing Statement Summary
          </h4>
          
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-medium">Gross Daily Revenues (Income):</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-450">{fmt(totalIncome)}</span>
          </div>

          <div className="flex justify-between text-xs border-b pb-2">
            <span className="text-muted-foreground font-medium">Gross Daily Expenditures (Outgoings):</span>
            <span className="font-bold text-rose-600 dark:text-rose-455">{fmt(totalExpenditure)}</span>
          </div>

          <div className="flex justify-between text-xs pt-1">
            <span className="text-muted-foreground font-medium">Balance B/f:</span>
            <span className="font-semibold">{fmt(netBalance)}</span>
          </div>

          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-medium">Total Deductions (Deposits + Handovers):</span>
            <span className="font-semibold text-rose-600 dark:text-rose-455">{fmt(bankDeposit + handoverSir + handoverMadam)}</span>
          </div>

          <div className="flex justify-between items-center text-base font-black text-teal-700 dark:text-teal-400 border-t pt-3 mt-3">
            <span>Net Reconciled Cash In Hand:</span>
            <span className="text-xl font-black">{fmt(closingBalance)}</span>
          </div>
        </div>
      </div>

      {/* Signature block for prints */}
      <div className="hidden print:flex justify-between mt-20 pt-4 text-xs font-semibold text-slate-500">
        <div className="border-t border-slate-300 w-48 text-center pt-1.5">Prepared By (Staff)</div>
        <div className="border-t border-slate-300 w-48 text-center pt-1.5">Checked By (Accounts)</div>
        <div className="border-t border-slate-300 w-48 text-center pt-1.5">Approved By (Director)</div>
      </div>
    </div>
  );
}
