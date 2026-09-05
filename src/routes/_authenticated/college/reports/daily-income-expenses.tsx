import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Search,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Download,
  Share2,
  Phone,
  MessageCircle,
  CheckCircle2,
  Receipt,
  CreditCard,
  Building,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/college/reports/daily-income-expenses")({
  component: DailyIncomeExpensesReportPage,
});

interface IncomeRow {
  id: number;
  invoiceNo: string;
  receiptNumber: string;
  feeType: string;
  paymentFrequency: string;
  amount: string;
  paymentMode: string;
  paymentDate: string;
  status: string;
  remarks: any;
  studentName: string;
  enrollmentNo: string;
}

interface ExpenseRow {
  id: string;
  voucherNo: string;
  category: string;
  payee: string;
  amount: string;
  paymentMode: string;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
}

interface ReportData {
  startDate: string;
  endDate: string;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netCashflow: number;
    cashIncome: number;
    bankIncome: number;
    cashExpenses: number;
    bankExpenses: number;
    incomeCount: number;
    expenseCount: number;
  };
  incomeRows: IncomeRow[];
  expenseRows: ExpenseRow[];
}

export default function DailyIncomeExpensesReportPage() {
  const { session } = Route.useRouteContext() as { session?: any };
  const userName = session?.data?.user?.name || session?.user?.name || "ACON Accounts";

  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = React.useState(todayStr);
  const [endDate, setEndDate] = React.useState(todayStr);
  const [paymentMode, setPaymentMode] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");

  // WhatsApp Share Modal
  const [whatsAppModalOpen, setWhatsAppModalOpen] = React.useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = React.useState("");

  const setQuickRange = (preset: "today" | "yesterday" | "this_month" | "last_30_days") => {
    const now = new Date();
    if (preset === "today") {
      const d = format(now, "yyyy-MM-dd");
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const d = format(y, "yyyy-MM-dd");
      setStartDate(d);
      setEndDate(d);
    } else if (preset === "this_month") {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(format(first, "yyyy-MM-dd"));
      setEndDate(format(last, "yyyy-MM-dd"));
    } else if (preset === "last_30_days") {
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setStartDate(format(start, "yyyy-MM-dd"));
      setEndDate(format(now, "yyyy-MM-dd"));
    }
  };

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data, isLoading, isFetching, refetch } = useQuery<ReportData>({
    queryKey: ["nursing", "reports", "daily-income-expenses", startDate, endDate, paymentMode, debouncedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("startDate", startDate);
      params.set("endDate", endDate);
      if (paymentMode !== "all") params.set("paymentMode", paymentMode);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/nursing/reports/daily-income-expenses?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch report data");
      return res.json();
    },
  });

  const summary = data?.summary || {
    totalIncome: 0,
    totalExpenses: 0,
    netCashflow: 0,
    cashIncome: 0,
    bankIncome: 0,
    cashExpenses: 0,
    bankExpenses: 0,
    incomeCount: 0,
    expenseCount: 0,
  };

  const incomeRows = data?.incomeRows || [];
  const expenseRows = data?.expenseRows || [];

  // Generate PDF Document
  const generatePDFDoc = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ACME COLLEGE OF NURSING", 14, 16);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Daily Income & Expenses Report (${startDate} to ${endDate})`, 14, 24);

    doc.setFontSize(9);
    doc.text(`Generated Date: ${new Date().toLocaleString()}`, 14, 30);

    // Summary Box
    doc.setFillColor(245, 247, 250);
    doc.rect(14, 34, 182, 22, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Income: Rs. ${summary.totalIncome.toLocaleString()}`, 18, 42);
    doc.text(`Total Expenses: Rs. ${summary.totalExpenses.toLocaleString()}`, 18, 50);
    doc.text(`Net Surplus / Cashflow: Rs. ${summary.netCashflow.toLocaleString()}`, 110, 42);
    doc.text(`Cash: Rs. ${summary.cashIncome.toLocaleString()} | Bank: Rs. ${summary.bankIncome.toLocaleString()}`, 110, 50);

    // Income Table
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Income Receipts", 14, 63);

    autoTable(doc, {
      startY: 66,
      head: [["Date", "Receipt #", "Student / Payee", "Fee Type", "Mode", "Amount (Rs.)"]],
      body: incomeRows.map((r) => [
        r.paymentDate,
        r.receiptNumber || r.invoiceNo,
        `${r.studentName} (${r.enrollmentNo})`,
        r.feeType || "Course Fee",
        (r.paymentMode || "").toUpperCase(),
        Number(r.amount).toLocaleString(),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 148, 136] }, // Teal header
    });

    // Expenses Table
    const finalY = (doc as any).lastAutoTable.finalY || 120;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Expense Payouts", 14, finalY + 12);

    autoTable(doc, {
      startY: finalY + 16,
      head: [["Date", "Voucher #", "Category / Payee", "Mode", "Ref #", "Amount (Rs.)"]],
      body: expenseRows.map((r) => [
        r.paymentDate,
        r.voucherNo,
        `${r.category} - ${r.payee}`,
        (r.paymentMode || "").toUpperCase(),
        r.referenceNumber || "-",
        Number(r.amount).toLocaleString(),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [225, 29, 72] }, // Rose header
    });

    // Add Footer with "Prepared By" and "This is a system generated report" on all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.height || 297;
      const pageWidth = doc.internal.pageSize.width || 210;

      // Footer divider line
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);

      // Prepared By, System Generated notice, and Page count
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(110, 110, 110);
      doc.text(`Prepared By: ${userName}`, 14, pageHeight - 9);
      doc.text("This is a system generated report", pageWidth / 2, pageHeight - 9, { align: "center" });
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 9, { align: "right" });
    }

    return doc;
  };

  const handleDownloadPDF = () => {
    try {
      const doc = generatePDFDoc();
      doc.save(`ACON-Daily-Income-Expenses-${startDate}.pdf`);
      toast.success("Daily Income & Expenses report downloaded successfully!");
    } catch (e: any) {
      toast.error("Failed to generate PDF: " + e.message);
    }
  };

  const handleShareWhatsApp = async () => {
    let cleanPhone = whatsAppPhone.replace(/\D/g, "");
    if (!cleanPhone) {
      toast.error("Please enter a recipient WhatsApp mobile number.");
      return;
    }
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    try {
      const doc = generatePDFDoc();
      const filename = `ACON-Daily-Report-${startDate}.pdf`;
      const pdfBlob = doc.output("blob");
      const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

      const msgText = `*ACME COLLEGE OF NURSING*\n*Daily Income & Expenses Summary*\nPeriod: ${startDate} to ${endDate}\nTotal Income: ₹${summary.totalIncome.toLocaleString()}\nTotal Expenses: ₹${summary.totalExpenses.toLocaleString()}\nNet Surplus: ₹${summary.netCashflow.toLocaleString()}\n\nDetailed PDF Report Attached.`;

      if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: filename,
          text: msgText,
        });
        toast.success("Report PDF shared via WhatsApp!");
        setWhatsAppModalOpen(false);
        return;
      }

      doc.save(filename);
      toast.info("Report PDF downloaded! Opening WhatsApp chat to send message...");
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msgText)}`;
      window.open(url, "_blank");
      setWhatsAppModalOpen(false);
    } catch (err: any) {
      toast.error("Error sharing report via WhatsApp: " + err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-teal-600 dark:text-teal-400" />
              Daily Income & Expenses Report
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              ACON Reports
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Comprehensive daily cashbook ledger of student fee income and operational payouts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            className="gap-1.5 text-xs h-9 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950"
          >
            <Download size={14} />
            Export PDF
          </Button>

          <Button
            size="sm"
            onClick={() => setWhatsAppModalOpen(true)}
            className="gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <MessageCircle size={14} />
            WhatsApp PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-card to-emerald-50/30 dark:to-emerald-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Income Receipts</p>
              <h3 className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                ₹{summary.totalIncome.toLocaleString()}
              </h3>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-400 mt-0.5 font-medium">
                {summary.incomeCount} collections recorded
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
              <TrendingUp size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="border-rose-200 dark:border-rose-900 bg-gradient-to-br from-card to-rose-50/30 dark:to-rose-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Expense Payouts</p>
              <h3 className="text-2xl font-bold text-rose-700 dark:text-rose-300 mt-1">
                ₹{summary.totalExpenses.toLocaleString()}
              </h3>
              <p className="text-[11px] text-rose-800 dark:text-rose-400 mt-0.5 font-medium">
                {summary.expenseCount} vouchers issued
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-700 dark:text-rose-300 shrink-0">
              <TrendingDown size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Net Cashflow Surplus */}
        <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-card to-blue-50/30 dark:to-blue-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Net Cashflow / Surplus</p>
              <h3 className={cn("text-2xl font-bold mt-1", summary.netCashflow >= 0 ? "text-blue-700 dark:text-blue-300" : "text-rose-600")}>
                ₹{summary.netCashflow.toLocaleString()}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                Net income after expenses
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-700 dark:text-blue-300 shrink-0">
              <Wallet size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Cash vs Bank Split */}
        <Card className="border-purple-200 dark:border-purple-900 bg-gradient-to-br from-card to-purple-50/30 dark:to-purple-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Cash vs Bank Split</p>
              <div className="mt-1 space-y-0.5">
                <div className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                  Cash In: ₹{summary.cashIncome.toLocaleString()}
                </div>
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                  Bank/UPI: ₹{summary.bankIncome.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0">
              <Building size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Filter Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-border/50">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <CalendarIcon size={13} className="text-teal-600 dark:text-teal-400" />
              <span>Quick Presets:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-6 px-2 text-[10px] rounded-md",
                  startDate === format(new Date(), "yyyy-MM-dd") && endDate === format(new Date(), "yyyy-MM-dd") && "bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-700 font-semibold"
                )}
                onClick={() => setQuickRange("today")}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px] rounded-md"
                onClick={() => setQuickRange("yesterday")}
              >
                Yesterday
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px] rounded-md"
                onClick={() => setQuickRange("this_month")}
              >
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px] rounded-md"
                onClick={() => setQuickRange("last_30_days")}
              >
                Last 30 Days
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9 px-3 text-xs bg-background border-input hover:bg-accent hover:text-accent-foreground",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {startDate ? format(parseISO(startDate), "dd MMM yyyy") : <span>Pick start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    startMonth={new Date(new Date().getFullYear() - 5, 0)}
                    endMonth={new Date(new Date().getFullYear() + 5, 11)}
                    selected={startDate ? parseISO(startDate) : undefined}
                    onSelect={(date) => {
                      if (date) setStartDate(format(date, "yyyy-MM-dd"));
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9 px-3 text-xs bg-background border-input hover:bg-accent hover:text-accent-foreground",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    {endDate ? format(parseISO(endDate), "dd MMM yyyy") : <span>Pick end date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    startMonth={new Date(new Date().getFullYear() - 5, 0)}
                    endMonth={new Date(new Date().getFullYear() + 5, 11)}
                    selected={endDate ? parseISO(endDate) : undefined}
                    onSelect={(date) => {
                      if (date) setEndDate(format(date, "yyyy-MM-dd"));
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Payment Mode</label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Modes</SelectItem>
                  <SelectItem value="cash" className="text-xs">Cash</SelectItem>
                  <SelectItem value="bank_transfer" className="text-xs">Bank Transfer</SelectItem>
                  <SelectItem value="upi" className="text-xs">UPI</SelectItem>
                  <SelectItem value="cheque" className="text-xs">Cheque</SelectItem>
                  <SelectItem value="card" className="text-xs">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search receipt, payee, details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income Table */}
      <Card>
        <CardHeader className="p-4 border-b bg-emerald-50/20 dark:bg-emerald-950/10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <TrendingUp size={18} />
                Income Receipts ({incomeRows.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Student course fees, seat booking advances, and general receipts
              </CardDescription>
            </div>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              Total: ₹{summary.totalIncome.toLocaleString()}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground border-b font-semibold">
                  <th className="p-3">Date</th>
                  <th className="p-3">Receipt #</th>
                  <th className="p-3">Student / Payee</th>
                  <th className="p-3">Fee Type</th>
                  <th className="p-3 text-center">Payment Mode</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Loading income transactions...
                    </td>
                  </tr>
                ) : incomeRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No income receipts recorded for the selected period.
                    </td>
                  </tr>
                ) : (
                  incomeRows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-muted-foreground">{r.paymentDate}</td>
                      <td className="p-3 font-bold text-foreground font-mono">{r.receiptNumber || r.invoiceNo}</td>
                      <td className="p-3 font-semibold text-foreground">
                        <div>
                          <span>{r.studentName}</span>
                          <span className="block text-[10px] text-muted-foreground font-mono">
                            {r.enrollmentNo}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-foreground">{r.feeType || "Course Fee"}</td>
                      <td className="p-3 text-center">
                        <span className="uppercase font-semibold px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-900 border text-slate-700 dark:text-slate-300">
                          {r.paymentMode}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{Number(r.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader className="p-4 border-b bg-rose-50/20 dark:bg-rose-950/10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2">
                <TrendingDown size={18} />
                Expense Payouts ({expenseRows.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Referral commission payouts and operational cash/bank expenditures
              </CardDescription>
            </div>
            <span className="text-sm font-bold text-rose-700 dark:text-rose-400">
              Total: ₹{summary.totalExpenses.toLocaleString()}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground border-b font-semibold">
                  <th className="p-3">Date</th>
                  <th className="p-3">Voucher #</th>
                  <th className="p-3">Category / Payee</th>
                  <th className="p-3 text-center">Payment Mode</th>
                  <th className="p-3">Reference / Notes</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Loading expense payouts...
                    </td>
                  </tr>
                ) : expenseRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      No expense payouts recorded for the selected period.
                    </td>
                  </tr>
                ) : (
                  expenseRows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-muted-foreground">{r.paymentDate}</td>
                      <td className="p-3 font-bold text-foreground font-mono">{r.voucherNo}</td>
                      <td className="p-3 font-semibold text-foreground">
                        <div>
                          <span>{r.payee}</span>
                          <span className="block text-[10px] text-muted-foreground">{r.category}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="uppercase font-semibold px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-900 border text-slate-700 dark:text-slate-300">
                          {r.paymentMode}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground truncate max-w-[200px]">
                        {r.referenceNumber || r.notes || "—"}
                      </td>
                      <td className="p-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        ₹{Number(r.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp Share Modal */}
      <Dialog open={whatsAppModalOpen} onOpenChange={setWhatsAppModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <MessageCircle size={20} />
              Share Report via WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send the Daily Income & Expenses Report PDF directly to WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Recipient WhatsApp Mobile Number</label>
              <Input
                placeholder="e.g. 9876543210"
                value={whatsAppPhone}
                onChange={(e) => setWhatsAppPhone(e.target.value)}
                className="text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                10-digit mobile number. Country code +91 will be added automatically.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setWhatsAppModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleShareWhatsApp} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              <Share2 size={14} />
              Send PDF via WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
