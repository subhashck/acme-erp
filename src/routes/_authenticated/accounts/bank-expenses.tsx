import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Coins,
  Copy,
  CreditCard,
  Edit2,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Check,
  X,
  ArrowRight,
  TrendingDown,
} from "lucide-react";
import * as React from "react";
import { format, subMonths, addMonths, parseISO } from "date-fns";
import { z } from "zod";
import { useRpcQuery, queryClient } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { Button } from "../../../ui/button";
import { Input } from "../../../ui/input";
import { Autocomplete } from "../../../ui/autocomplete";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../ui/card";
import { Badge } from "../../../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import { Calendar } from "../../../components/ui/calendar";
import { toast } from "sonner";
import { cn } from "../../../utils/cn";

const searchSchema = z.object({
  month: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/accounts/bank-expenses")({
  validateSearch: (search) => searchSchema.parse(search),
  component: BankExpensesPage,
});

function fmt(val: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
}

function BankExpensesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const today = new Date();
  const defaultMonth = format(today, "yyyy-MM");
  const selectedMonth = search.month || defaultMonth;

  // Month navigation
  const handlePrevMonth = () => {
    const d = parseISO(`${selectedMonth}-01`);
    const prev = subMonths(d, 1);
    navigate({ search: { month: format(prev, "yyyy-MM") }, replace: true });
  };

  const handleNextMonth = () => {
    const d = parseISO(`${selectedMonth}-01`);
    const next = addMonths(d, 1);
    navigate({ search: { month: format(next, "yyyy-MM") }, replace: true });
  };

  const handleThisMonth = () => {
    navigate({ search: { month: defaultMonth }, replace: true });
  };

  // Queries
  const expensesQuery = useRpcQuery<any[]>(
    ["bank-expenses", selectedMonth],
    () =>
      (client.accounts as any)["bank-expenses"].$get({
        query: { month: selectedMonth },
      })
  );

  const vendorsQuery = useRpcQuery<any[]>(
    ["vendors"],
    () => client.vendors.$get()
  );

  const bankAccountsQuery = useRpcQuery<any[]>(
    ["bank-accounts"],
    () => (client.accounts as any)["bank-accounts"].$get()
  );

  const expCategoriesQuery = useRpcQuery<any[]>(
    ["expense-categories"],
    () => (client["daily-closing"] as any)["expense-categories"].$get()
  );

  const expCatalogQuery = useRpcQuery<any[]>(
    ["expense-catalog"],
    () => (client["daily-closing"] as any)["expense-catalog"].$get()
  );

  const expenses = expensesQuery.data || [];
  const vendors = vendorsQuery.data || [];
  const bankAccounts = bankAccountsQuery.data || [];

  const allCategories = React.useMemo(() => {
    const map = new Map<string, { code: string; label: string }>();

    // 1. Daily Closing Expense Categories Master
    (expCategoriesQuery.data || []).forEach((c: any) => {
      if (c.active !== false && c.code) {
        map.set(c.code, { code: c.code, label: c.label || c.code });
      }
    });

    // 2. Daily Closing Expense Catalog List Items
    (expCatalogQuery.data || []).forEach((item: any) => {
      if (item.active !== false && item.category) {
        const code = item.category.toUpperCase().replace(/\s+/g, "_");
        if (!map.has(code)) {
          map.set(code, { code, label: item.category });
        }
      }
    });

    return Array.from(map.values());
  }, [expCategoriesQuery.data, expCatalogQuery.data]);

  const categoryOptions: [string, string][] = React.useMemo(() => {
    return allCategories.map((c) => [c.code, c.label]);
  }, [allCategories]);

  // Form State
  const [formCategory, setFormCategory] = React.useState("");
  const [formLabel, setFormLabel] = React.useState("");
  const [formVendorId, setFormVendorId] = React.useState<string>("none");
  const [formAmount, setFormAmount] = React.useState("");
  const [formPaymentMode, setFormPaymentMode] = React.useState("Bank Transfer");
  const [formPaymentDate, setFormPaymentDate] = React.useState("");
  const [formChequeIssueDate, setFormChequeIssueDate] = React.useState("");
  const [formReferenceNo, setFormReferenceNo] = React.useState("");
  const [formBankName, setFormBankName] = React.useState("");
  const [formNarration, setFormNarration] = React.useState("");
  const [formIsRecurring, setFormIsRecurring] = React.useState(false);
  const [formIsSalaryAuto, setFormIsSalaryAuto] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const catalogItemOptions: [string, string][] = React.useMemo(() => {
    const catalog = expCatalogQuery.data || [];
    const filtered = formCategory
      ? catalog.filter((item: any) => {
          if (!item.category) return true;
          const c1 = item.category.toUpperCase().replace(/[^A-Z0-9]/g, "");
          const c2 = formCategory.toUpperCase().replace(/[^A-Z0-9]/g, "");
          return item.category === formCategory || c1 === c2 || c1.includes(c2) || c2.includes(c1);
        })
      : catalog;

    return filtered.map((item: any) => [
      item.itemName,
      `${item.itemName}${item.defaultAmount ? ` - ₹${item.defaultAmount}` : ""}`,
    ]);
  }, [expCatalogQuery.data, formCategory]);

  // Filter state
  const [searchTerm, setSearchTerm] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((e) => {
      const matchSearch =
        !searchTerm ||
        e.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.vendorName && e.vendorName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.referenceNo && e.referenceNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (e.bankName && e.bankName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = categoryFilter === "all" || e.category === categoryFilter;

      return matchSearch && matchCat;
    });
  }, [expenses, searchTerm, categoryFilter]);

  // Statistics
  const totalAmount = React.useMemo(
    () => expenses.reduce((s, e) => s + parseFloat(e.amount || "0"), 0),
    [expenses]
  );

  const paidAmount = React.useMemo(
    () =>
      expenses
        .filter((e) => Boolean(e.paymentDate))
        .reduce((s, e) => s + parseFloat(e.amount || "0"), 0),
    [expenses]
  );

  const pendingAmount = totalAmount - paidAmount;

  // Dialog states
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<any>(null);
  const [isCopying, setIsCopying] = React.useState(false);

  // Salary auto-pull state
  const [salarySummary, setSalarySummary] = React.useState<{ totalNetSalary: number; paidCount: number } | null>(null);
  const [isLoadingSalary, setIsLoadingSalary] = React.useState(false);

  const fetchSalarySummary = async () => {
    try {
      setIsLoadingSalary(true);
      const res = await (client.accounts as any)["bank-expenses"]["salary-summary"].$get({
        query: { month: selectedMonth },
      });
      const data = await res.json();
      setSalarySummary(data);
    } catch (err) {
      console.error("Failed to fetch salary summary:", err);
    } finally {
      setIsLoadingSalary(false);
    }
  };

  React.useEffect(() => {
    if (formCategory === "SALARY_BANK" || formCategory === "SALARY") {
      fetchSalarySummary();
    }
  }, [formCategory, selectedMonth]);

  const handleLabelChange = (val: string) => {
    setFormLabel(val);
    const matched = (expCatalogQuery.data || []).find(
      (x: any) => x.itemName.toUpperCase() === val.toUpperCase()
    );
    if (matched) {
      if (matched.category) {
        setFormCategory(matched.category);
      }
      if (matched.defaultAmount && (!formAmount || formAmount === "" || formAmount === "0")) {
        setFormAmount(String(matched.defaultAmount));
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormCategory("");
    setFormLabel("");
    setFormVendorId("none");
    setFormAmount("");
    setFormPaymentMode("");
    setFormPaymentDate(format(today, "yyyy-MM-dd"));
    setFormChequeIssueDate("");
    setFormReferenceNo("");
    setFormBankName("");
    setFormNarration("");
    setFormIsRecurring(false);
    setFormIsSalaryAuto(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (exp: any) => {
    setEditingExpense(exp);
    setFormCategory(exp.category);
    setFormLabel(exp.label);
    setFormVendorId(exp.vendorId ? String(exp.vendorId) : "none");
    setFormAmount(String(exp.amount));
    setFormPaymentMode(exp.paymentMode || "");
    setFormPaymentDate(exp.paymentDate || "");
    setFormChequeIssueDate(exp.chequeIssueDate || "");
    setFormReferenceNo(exp.referenceNo || "");
    setFormBankName(exp.bankName || "");
    setFormNarration(exp.narration || "");
    setFormIsRecurring(Boolean(exp.isRecurring));
    setFormIsSalaryAuto(Boolean(exp.isSalaryAuto));
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCategory || !formLabel || !formAmount || isNaN(parseFloat(formAmount))) {
      toast.error("Please fill in required fields (Category, Description, Amount)");
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        month: selectedMonth,
        category: formCategory,
        label: formLabel,
        vendorId: formVendorId !== "none" ? parseInt(formVendorId, 10) : null,
        amount: parseFloat(formAmount),
        paymentMode: formPaymentMode,
        paymentDate: formPaymentDate || null,
        chequeIssueDate: formChequeIssueDate || null,
        referenceNo: formReferenceNo || null,
        bankName: formBankName || null,
        narration: formNarration || null,
        isRecurring: formIsRecurring,
        isSalaryAuto: formIsSalaryAuto,
      };

      if (editingExpense) {
        await (client.accounts as any)["bank-expenses"][":id"].$put({
          param: { id: String(editingExpense.id) },
          json: payload,
        });
        toast.success("Bank expense updated successfully");
      } else {
        await (client.accounts as any)["bank-expenses"].$post({
          json: payload,
        });
        toast.success("Bank expense added successfully");
      }

      setIsFormOpen(false);
      expensesQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save bank expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this bank expense entry?")) return;
    try {
      await (client.accounts as any)["bank-expenses"][":id"].$delete({
        param: { id: String(id) },
      });
      toast.success("Expense entry deleted");
      expensesQuery.refetch();
    } catch (err: any) {
      toast.error("Failed to delete entry");
    }
  };

  const handleCopyPrevious = async () => {
    try {
      setIsCopying(true);
      const res = await (client.accounts as any)["bank-expenses"]["copy-previous"].$post({
        json: { month: selectedMonth },
      });
      const data = await res.json();
      toast.success(data.message || "Copied recurring entries");
      expensesQuery.refetch();
    } catch (err: any) {
      toast.error("Failed to copy entries from previous month");
    } finally {
      setIsCopying(false);
    }
  };

  const monthLabel = React.useMemo(() => {
    try {
      return format(parseISO(`${selectedMonth}-01`), "MMMM yyyy");
    } catch {
      return selectedMonth;
    }
  }, [selectedMonth]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
              Monthly Bank Expenses & Payables
            </h3>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30">
              Accounts
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage fixed monthly outflows, bank vendor payables, utility bills, and salary disbursements for {monthLabel}.
          </p>
        </div>

        {/* Navigation & Action Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Quick Nav */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevMonth}
              className="h-8 px-2 text-xs font-semibold cursor-pointer"
            >
              <ChevronLeft size={13} />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleThisMonth}
              className="h-8 px-2.5 text-xs font-semibold cursor-pointer"
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              className="h-8 px-2 text-xs font-semibold cursor-pointer"
            >
              Next
              <ChevronRight size={13} />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPrevious}
            disabled={isCopying}
            className="h-9 text-xs font-semibold gap-1.5 cursor-pointer border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10"
            title="Copy recurring entries from previous month"
          >
            <Copy size={14} />
            {isCopying ? "Copying…" : "Copy Prev Month"}
          </Button>

          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="h-9 text-xs font-semibold gap-1.5 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
          >
            <Plus size={15} />
            Add Bank Expense
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Outflow */}
        <Card className="border border-border/60 bg-linear-to-br from-blue-500/5 to-indigo-500/5 shadow-xs">
          <CardHeader className="pb-1">
            <CardDescription className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
              <CreditCard size={13} /> Total Bank Outflow ({monthLabel})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-blue-700 dark:text-blue-350">
              {fmt(totalAmount)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {expenses.length} entry{expenses.length !== 1 ? "ies" : ""} recorded
            </p>
          </CardContent>
        </Card>

        {/* Paid Amount */}
        <Card className="border border-border/60 bg-linear-to-br from-emerald-500/5 to-teal-500/5 shadow-xs">
          <CardHeader className="pb-1">
            <CardDescription className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
              <Check size={13} /> Disbursed / Paid
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-350">
              {fmt(paidAmount)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Completed bank transfers & cheque clearing
            </p>
          </CardContent>
        </Card>

        {/* Pending Amount */}
        <Card className="border border-border/60 bg-linear-to-br from-amber-500/5 to-orange-500/5 shadow-xs">
          <CardHeader className="pb-1">
            <CardDescription className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
              <TrendingDown size={13} /> Scheduled / Pending Outflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-amber-700 dark:text-amber-350">
              {fmt(pendingAmount)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Awaiting payment date or reference clearance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search label, vendor, bank, reference no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48 h-9 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground font-semibold shrink-0">
            Showing {filteredExpenses.length} of {expenses.length} entries
          </div>
        </CardContent>
      </Card>

      {/* Main Expense Table */}
      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-0">
          {expensesQuery.isLoading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Loading bank expenses…
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <CreditCard className="size-10 opacity-30" />
              <p className="font-semibold text-sm">No bank expenses found for {monthLabel}</p>
              <p className="text-xs">Click "Add Bank Expense" or "Copy Prev Month" to populate.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Description / Label</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Ref #</th>
                    <th className="py-3 px-4">Bank</th>
                    <th className="py-3 px-4 text-center">Recurring</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredExpenses.map((e) => {
                    const catObj = allCategories.find((c) => c.code === e.category);
                    const isPaid = Boolean(e.paymentDate);

                    return (
                      <tr key={e.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30">
                            {catObj?.label || e.category}
                          </Badge>
                          {e.isSalaryAuto && (
                            <Badge className="ml-1 text-[9px] px-1 py-0 bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30">
                              Auto Payslip
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-foreground">
                          {e.label}
                          {e.narration && (
                            <div className="text-[10px] text-muted-foreground font-normal truncate max-w-xs">
                              {e.narration}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-medium">
                          {e.vendorName ? (
                            <span className="flex items-center gap-1">
                              <Building2 size={12} className="text-blue-500 shrink-0" />
                              {e.vendorName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-foreground text-sm">
                          {fmt(parseFloat(e.amount))}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {e.paymentMode || "Bank Transfer"}
                        </td>
                        <td className="py-3 px-4">
                          {isPaid ? (
                            <div>
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                                Cleared: {e.paymentDate}
                              </Badge>
                              {e.chequeIssueDate && (
                                <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                                  Issued: {e.chequeIssueDate}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/40">
                                Pending Clearance
                              </Badge>
                              {e.chequeIssueDate && (
                                <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                                  Issued: {e.chequeIssueDate}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                          {e.referenceNo || "—"}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {e.bankName || "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {e.isRecurring ? (
                            <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/30">
                              Yes
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(e)}
                              className="size-7 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 size={13} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(e.id)}
                              className="size-7 text-rose-500 hover:text-rose-700 hover:bg-rose-500/10"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Expense Sidebar Drawer */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Slide-over panel */}
          <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10">
            <div className="w-screen max-w-md bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
                <div>
                  <h3 className="font-semibold text-base text-foreground">
                    {editingExpense ? "Edit Bank Expense" : "Add Monthly Bank Expense"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Record a fixed monthly expense, vendor payable, or bank transfer for {monthLabel}.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setIsFormOpen(false)}
                >
                  <X size={18} />
                </Button>
              </div>

              {/* Drawer Form Body */}
              <form onSubmit={handleSubmitForm} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                  <div>
                    <Autocomplete
                      label="Category *"
                      value={formCategory}
                      onChange={setFormCategory}
                      options={categoryOptions}
                      placeholder="Search category or type custom category..."
                      allowCustomValue={true}
                    />
                  </div>

                  {/* Salary Auto-Pull Banner */}
                  {(formCategory === "SALARY_BANK" || formCategory === "SALARY") && (
                    <div className="p-2.5 rounded-lg border border-purple-500/30 bg-purple-500/10 space-y-1">
                      <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Sparkles size={13} /> Payslip Bank Salary Total ({selectedMonth})
                        </span>
                        {isLoadingSalary ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <span>{fmt(salarySummary?.totalNetSalary || 0)}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {salarySummary?.paidCount || 0} staff payslips marked 'Paid' via Bank Transfer for {selectedMonth}.
                      </p>
                      {salarySummary && salarySummary.totalNetSalary > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormAmount(String(salarySummary.totalNetSalary));
                            if (!formLabel) setFormLabel(`Staff Net Salary Disbursement (${selectedMonth})`);
                            setFormIsSalaryAuto(true);
                          }}
                          className="h-6 px-2 text-[10px] font-semibold text-purple-700 dark:text-purple-300 border-purple-500/40 hover:bg-purple-500/20 mt-1 cursor-pointer"
                        >
                          Use Payslip Amount ({fmt(salarySummary.totalNetSalary)})
                        </Button>
                      )}
                    </div>
                  )}

                  <div>
                    <Autocomplete
                      label="Description / Label *"
                      value={formLabel}
                      onChange={handleLabelChange}
                      options={catalogItemOptions}
                      placeholder="e.g. Monthly Hospital Rent, Electricity Bill..."
                      allowCustomValue={true}
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Vendor (Optional)</label>
                    <Select value={formVendorId} onValueChange={setFormVendorId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="None / External" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None / Direct Expense</SelectItem>
                        {vendors.map((v) => (
                          <SelectItem key={v.id} value={String(v.id)}>
                            {v.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Amount (₹) *</label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                        className="h-9 text-xs font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Payment Mode</label>
                      <Select value={formPaymentMode} onValueChange={setFormPaymentMode}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bank Transfer">Bank Transfer (NEFT/RTGS)</SelectItem>
                          <SelectItem value="UPI">UPI / Online</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                          <SelectItem value="Auto Debit">Auto Debit / NACH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold block mb-1">Cheque Issue Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-9 px-3 text-xs",
                              !formChequeIssueDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {formChequeIssueDate ? (
                              format(parseISO(formChequeIssueDate), "dd MMM yyyy")
                            ) : (
                              <span>Pick date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formChequeIssueDate ? parseISO(formChequeIssueDate) : undefined}
                            onSelect={(date) =>
                              setFormChequeIssueDate(date ? format(date, "yyyy-MM-dd") : "")
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Clearance Date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal h-9 px-3 text-xs",
                              !formPaymentDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            {formPaymentDate ? (
                              format(parseISO(formPaymentDate), "dd MMM yyyy")
                            ) : (
                              <span>Pick date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={formPaymentDate ? parseISO(formPaymentDate) : undefined}
                            onSelect={(date) =>
                              setFormPaymentDate(date ? format(date, "yyyy-MM-dd") : "")
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Reference / UTR / Cheque No</label>
                    <Input
                      placeholder="e.g. UTR123456789 or Cheque #000123"
                      value={formReferenceNo}
                      onChange={(e) => setFormReferenceNo(e.target.value)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Hospital Bank Account</label>
                    <Select value={formBankName} onValueChange={setFormBankName}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts
                          .filter((a: any) => a.active)
                          .map((a: any) => {
                            const label = `${a.accountName} (${a.bankName}${a.accountNumber ? ` - ${a.accountNumber.slice(-4)}` : ""})`;
                            return (
                              <SelectItem key={a.id} value={label}>
                                {label}
                              </SelectItem>
                            );
                          })}
                        {formBankName &&
                          !bankAccounts.some(
                            (a: any) =>
                              `${a.accountName} (${a.bankName}${a.accountNumber ? ` - ${a.accountNumber.slice(-4)}` : ""})` === formBankName
                          ) && <SelectItem value={formBankName}>{formBankName}</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Narration / Notes</label>
                    <Input
                      placeholder="Additional details, invoice reference..."
                      value={formNarration}
                      onChange={(e) => setFormNarration(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={formIsRecurring}
                      onChange={(e) => setFormIsRecurring(e.target.checked)}
                      className="rounded border-border size-4 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="isRecurring" className="font-semibold text-xs cursor-pointer select-none">
                      Recurring monthly expense (can be copied to future months)
                    </label>
                  </div>
                </div>

                {/* Drawer Footer */}
                <div className="p-4 border-t bg-muted/20 flex items-center justify-end gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFormOpen(false)}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-8 text-xs cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isSubmitting ? "Saving…" : editingExpense ? "Update Expense" : "Save Expense"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
