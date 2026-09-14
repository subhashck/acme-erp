import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Calendar as CalendarIcon,
  CreditCard,
  Edit2,
  ExternalLink,
  Filter,
  Landmark,
  Plus,
  Receipt,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Wallet,
  CheckCircle,
  AlertTriangle,
  Clock,
  Coins,
  ChevronRight,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import CurrencyFormat from "react-currency-format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Badge } from "@/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { calculateCurrentInstallmentDue } from "@/lib/capital-calculator";

export const Route = createFileRoute("/_authenticated/capital/facilities")({
  component: FacilitiesMasterPage,
});

function formatINR(val: number | string | null | undefined): string {
  const num = typeof val === "number" ? val : parseFloat(String(val || 0)) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

const CATEGORIES = [
  "All",
  "Bank Loan",
  "NBFC",
  "Chit Fund",
  "Private Lending",
  "Daily Collection Financing",
  "Credit Card",
  "Other",
];

interface FormDatePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  quickAction?: React.ReactNode;
}

function FormDatePicker({
  id,
  label,
  value,
  onChange,
  placeholder = "Select date",
  quickAction,
}: FormDatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const parsedDate = React.useMemo(() => {
    if (!value) return undefined;
    const parts = value.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? undefined : d;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }, [value]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-semibold">
          {label}
        </Label>
        <div className="flex items-center gap-2">
          {quickAction}
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="text-[10px] text-muted-foreground hover:text-rose-500 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-8 text-xs border-input bg-background cursor-pointer",
              !parsedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-primary shrink-0" />
            {parsedDate ? (
              <span className="font-medium text-foreground">{format(parsedDate, "dd MMM yyyy")}</span>
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[99999]" align="start">
          <Calendar
            mode="single"
            selected={parsedDate}
            onSelect={(selected) => {
              if (selected) {
                const yyyy = selected.getFullYear();
                const mm = String(selected.getMonth() + 1).padStart(2, "0");
                const dd = String(selected.getDate()).padStart(2, "0");
                onChange(`${yyyy}-${mm}-${dd}`);
              } else {
                onChange("");
              }
              setOpen(false);
            }}
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function FacilitiesMasterPage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = React.useState("All");
  const [statusFilter, setStatusFilter] = React.useState("active");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<"cards" | "table">("cards");

  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [editingFacility, setEditingFacility] = React.useState<any | null>(null);

  // Fetch Facilities List
  const { data: facilities = [], isLoading, refetch } = useQuery({
    queryKey: ["capital-facilities", selectedCategory, statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "All") params.set("category", selectedCategory);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/capital/facilities?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch facilities");
      return res.json();
    },
  });

  // Fetch Bank Accounts for dropdown
  const { data: bankAccountsList = [] } = useQuery({
    queryKey: ["bank-accounts-for-capital"],
    queryFn: async () => {
      const res = await fetch("/api/accounts/bank-accounts");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const cashAccount = React.useMemo(() => {
    return bankAccountsList.find(
      (acc: any) =>
        acc.bankName?.toUpperCase() === "CASH" ||
        acc.accountType?.toLowerCase() === "cash" ||
        acc.accountName?.toLowerCase().includes("cash")
    );
  }, [bankAccountsList]);

  // Form State for Facility (New & Edit)
  const initialFormData = {
    facilityCode: "",
    name: "",
    lenderName: "",
    category: "Daily Collection Financing",
    facilityType: "Daily Advance",
    sanctionedAmount: "",
    disbursedAmount: "",
    outstandingBalance: "",
    interestRate: "15",
    interestType: "reducing",
    tenor: "100", // entered in days for Daily Collection Financing
    repaymentFrequency: "daily",
    installmentAmount: "20000",
    sanctionDate: new Date().toISOString().slice(0, 10),
    disbursementDate: new Date().toISOString().slice(0, 10),
    maturityDate: "",
    moratoriumMonths: "0",
    moratoriumType: "none",
    repaymentStartDate: "",
    bankAccountId: "",
    collateralSecurity: "",
    status: "active",
    notes: "",
    postToCashFlow: false,
  };

  const [formData, setFormData] = React.useState(initialFormData);

  // When cash account loads, if user is on Daily Collection without a bank account set, default to CASH
  React.useEffect(() => {
    if (!editingFacility && isSheetOpen && formData.category === "Daily Collection Financing" && !formData.bankAccountId && cashAccount) {
      setFormData((prev) => ({ ...prev, bankAccountId: String(cashAccount.id) }));
    }
  }, [cashAccount, isSheetOpen, editingFacility, formData.category, formData.bankAccountId]);

  const handleOpenAdd = () => {
    setEditingFacility(null);
    const defaultBankId = cashAccount ? String(cashAccount.id) : "";
    setFormData({
      ...initialFormData,
      sanctionDate: new Date().toISOString().slice(0, 10),
      disbursementDate: new Date().toISOString().slice(0, 10),
      moratoriumMonths: "0",
      moratoriumType: "none",
      repaymentStartDate: "",
      bankAccountId: defaultBankId,
    });
    setIsSheetOpen(true);
  };

  const handleCategoryChange = (newCategory: string) => {
    const isDaily = newCategory === "Daily Collection Financing";
    setFormData((prev) => {
      let nextTenor = prev.tenor;
      if (isDaily && prev.category !== "Daily Collection Financing") {
        // Switching to Daily Collection: convert months to days (e.g. 3.33 -> 100) or default to 100
        const currentMonths = parseFloat(prev.tenor) || 0;
        nextTenor = currentMonths > 0 && currentMonths <= 12 ? String(Math.round(currentMonths * 30)) : "100";
      } else if (!isDaily && prev.category === "Daily Collection Financing") {
        // Switching away from Daily Collection: convert days to months (e.g. 100 -> 3.33)
        const currentDays = parseFloat(prev.tenor) || 0;
        nextTenor = currentDays > 0 ? (currentDays / 30).toFixed(2) : "12";
      }

      const nextBankAccountId = isDaily && cashAccount ? String(cashAccount.id) : prev.bankAccountId;

      return {
        ...prev,
        category: newCategory,
        repaymentFrequency: isDaily ? "daily" : (prev.repaymentFrequency === "daily" ? "monthly" : prev.repaymentFrequency),
        facilityType: isDaily ? (prev.facilityType || "Daily Advance") : prev.facilityType,
        bankAccountId: nextBankAccountId,
        tenor: nextTenor,
      };
    });
  };

  const handleOpenEdit = (fac: any) => {
    setEditingFacility(fac);
    const isDaily = fac.category === "Daily Collection Financing";

    // For Daily Collection Financing, tenor is entered in DAYS; otherwise in months
    let displayTenor = "";
    if (fac.tenorMonths !== null && fac.tenorMonths !== undefined) {
      const numMonths = parseFloat(fac.tenorMonths) || 0;
      if (isDaily) {
        displayTenor = String(Math.round(numMonths * 30));
      } else {
        displayTenor = String(numMonths);
      }
    }

    // For Daily Collection, default to cash account if no bank account is currently linked
    let linkedAcc = fac.bankAccountId ? String(fac.bankAccountId) : "";
    if (isDaily && !linkedAcc && cashAccount) {
      linkedAcc = String(cashAccount.id);
    }

    setFormData({
      facilityCode: fac.facilityCode || "",
      name: fac.name || "",
      lenderName: fac.lenderName || "",
      category: fac.category || "Daily Collection Financing",
      facilityType: fac.facilityType || "Daily Advance",
      sanctionedAmount: fac.sanctionedAmount !== null && fac.sanctionedAmount !== undefined ? String(fac.sanctionedAmount) : "",
      disbursedAmount: fac.disbursedAmount !== null && fac.disbursedAmount !== undefined ? String(fac.disbursedAmount) : "",
      outstandingBalance: fac.outstandingBalance !== null && fac.outstandingBalance !== undefined ? String(fac.outstandingBalance) : "",
      interestRate: fac.interestRate !== null && fac.interestRate !== undefined ? String(fac.interestRate) : "0",
      interestType: fac.interestType || "reducing",
      tenor: displayTenor,
      repaymentFrequency: fac.repaymentFrequency || (isDaily ? "daily" : "monthly"),
      installmentAmount: fac.installmentAmount !== null && fac.installmentAmount !== undefined ? String(fac.installmentAmount) : "",
      sanctionDate: fac.sanctionDate ? fac.sanctionDate.slice(0, 10) : "",
      disbursementDate: fac.disbursementDate ? fac.disbursementDate.slice(0, 10) : "",
      maturityDate: fac.maturityDate ? fac.maturityDate.slice(0, 10) : "",
      moratoriumMonths: fac.moratoriumMonths !== null && fac.moratoriumMonths !== undefined ? String(fac.moratoriumMonths) : "0",
      moratoriumType: fac.moratoriumType || "none",
      repaymentStartDate: fac.repaymentStartDate ? fac.repaymentStartDate.slice(0, 10) : "",
      bankAccountId: linkedAcc,
      collateralSecurity: fac.collateralSecurity || "",
      status: fac.status || "active",
      notes: fac.notes || "",
      postToCashFlow: false,
    });
    setIsSheetOpen(true);
  };

  // Calculator Helper
  const calculateInstallment = () => {
    const P = parseFloat(formData.sanctionedAmount) || 0;
    const annualRate = parseFloat(formData.interestRate) || 0;
    const morMonths = parseFloat(formData.moratoriumMonths) || 0;
    const hasMoratorium = formData.moratoriumType !== "none" && morMonths > 0;

    if (P <= 0) {
      toast.error("Please enter a valid sanctioned amount first");
      return;
    }

    if (formData.category === "Daily Collection Financing" || formData.repaymentFrequency === "daily") {
      // If Daily Collection Financing, tenor is entered in DAYS
      const days = formData.category === "Daily Collection Financing"
        ? (parseFloat(formData.tenor) || 100)
        : (Math.round((parseFloat(formData.tenor) || 3.33) * 30) || 100);

      const tenorMonths = days / 30;
      const totalInterest = P * (annualRate / 100) * (tenorMonths / 12);
      const dailyDue = (P + totalInterest) / days;
      setFormData((prev) => ({
        ...prev,
        installmentAmount: Math.round(dailyDue).toString(),
      }));
      toast.info(`Calculated Daily Due: ₹${Math.round(dailyDue).toLocaleString()}/day over ${days} days`);
      return;
    }

    if (formData.interestType === "interest_only") {
      // Periodic interest only (e.g. monthly or quarterly) on open-ended or bullet principal
      const periodsPerYear = formData.repaymentFrequency === "quarterly" ? 4 : formData.repaymentFrequency === "daily" ? 365 : 12;
      const periodInt = (P * (annualRate / 100)) / periodsPerYear;
      setFormData((prev) => ({
        ...prev,
        installmentAmount: Math.round(periodInt).toString(),
      }));
      toast.info(`Calculated Interest-Only Due: ₹${Math.round(periodInt).toLocaleString()}/${formData.repaymentFrequency === "quarterly" ? "quarter" : "month"}`);
      return;
    }

    const tenorM = parseFloat(formData.tenor) || 0;
    if (tenorM <= 0) {
      toast.error("Please enter a tenor in months to calculate amortizing EMI, or select 'Interest Only' calculation type");
      return;
    }

    // Remaining amortizing period after moratorium
    const effectiveAmortizingMonths = hasMoratorium && tenorM > morMonths ? tenorM - morMonths : tenorM;

    if (hasMoratorium && formData.moratoriumType === "pre_emi_interest") {
      const preEmiInterest = Math.round((P * (annualRate / 100)) / 12);
      const r = annualRate / 12 / 100;
      let emi = 0;
      if (formData.interestType === "reducing" && r > 0) {
        emi = (P * r * Math.pow(1 + r, effectiveAmortizingMonths)) / (Math.pow(1 + r, effectiveAmortizingMonths) - 1);
      } else {
        const totalInt = P * (annualRate / 100) * (effectiveAmortizingMonths / 12);
        emi = (P + totalInt) / effectiveAmortizingMonths;
      }
      setFormData((prev) => ({
        ...prev,
        installmentAmount: Math.round(emi).toString(),
      }));
      toast.info(
        `Moratorium Active: Pre-EMI ₹${preEmiInterest.toLocaleString()}/mo for ${morMonths} mos, then Full EMI ₹${Math.round(emi).toLocaleString()}/mo for ${effectiveAmortizingMonths} mos`
      );
      return;
    }

    if (hasMoratorium && formData.moratoriumType === "capitalized") {
      const accruedInt = P * (annualRate / 100) * (morMonths / 12);
      const augmentedP = P + accruedInt;
      const r = annualRate / 12 / 100;
      let emi = 0;
      if (formData.interestType === "reducing" && r > 0) {
        emi = (augmentedP * r * Math.pow(1 + r, effectiveAmortizingMonths)) / (Math.pow(1 + r, effectiveAmortizingMonths) - 1);
      } else {
        const totalInt = augmentedP * (annualRate / 100) * (effectiveAmortizingMonths / 12);
        emi = (augmentedP + totalInt) / effectiveAmortizingMonths;
      }
      setFormData((prev) => ({
        ...prev,
        installmentAmount: Math.round(emi).toString(),
      }));
      toast.info(
        `Capitalized Moratorium: Zero payment for ${morMonths} mos. Then Full EMI ₹${Math.round(emi).toLocaleString()}/mo on ₹${Math.round(augmentedP).toLocaleString()} accrued principal`
      );
      return;
    }

    if (formData.interestType === "flat") {
      const totalInt = P * (annualRate / 100) * (tenorM / 12);
      const emi = (P + totalInt) / tenorM;
      setFormData((prev) => ({
        ...prev,
        installmentAmount: Math.round(emi).toString(),
      }));
      toast.info(`Calculated Flat EMI: ₹${Math.round(emi).toLocaleString()}/month`);
    } else {
      // Reducing balance standard EMI
      const r = annualRate / 12 / 100;
      if (r === 0) {
        setFormData((prev) => ({ ...prev, installmentAmount: Math.round(P / tenorM).toString() }));
      } else {
        const emi = (P * r * Math.pow(1 + r, tenorM)) / (Math.pow(1 + r, tenorM) - 1);
        setFormData((prev) => ({
          ...prev,
          installmentAmount: Math.round(emi).toString(),
        }));
        toast.info(`Calculated Reducing EMI: ₹${Math.round(emi).toLocaleString()}/month`);
      }
    }
  };

  const handleQuickRepaymentStart = () => {
    if (!formData.disbursementDate) {
      toast.error("Please select a disbursement date first");
      return;
    }
    const parts = formData.disbursementDate.split("-");
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const morMonths = parseFloat(formData.moratoriumMonths) || 6;
    d.setMonth(d.getMonth() + Math.round(morMonths));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setFormData((prev) => ({ ...prev, repaymentStartDate: `${yyyy}-${mm}-${dd}` }));
    toast.info(`First Full EMI Date set to ${format(d, "dd MMM yyyy")}`);
  };

  const handleQuickMaturity = () => {
    if (!formData.disbursementDate) {
      toast.error("Please select a disbursement date first");
      return;
    }
    const parts = formData.disbursementDate.split("-");
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (formData.category === "Daily Collection Financing") {
      const days = parseInt(formData.tenor, 10) || 100;
      d.setDate(d.getDate() + days);
    } else {
      const months = parseFloat(formData.tenor) || 0;
      if (months <= 0) {
        toast.info("Open-ended / revolving facility has no fixed maturity date");
        setFormData((prev) => ({ ...prev, maturityDate: "" }));
        return;
      }
      const morMonths = formData.moratoriumType !== "none" ? (parseFloat(formData.moratoriumMonths) || 0) : 0;
      d.setMonth(d.getMonth() + Math.round(months + morMonths));
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setFormData((prev) => ({ ...prev, maturityDate: `${yyyy}-${mm}-${dd}` }));
    toast.info(`Maturity Date set to ${format(d, "dd MMM yyyy")}`);
  };

  // Add Facility Mutation
  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/capital/facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create facility");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Borrowing facility registered successfully");
      setIsSheetOpen(false);
      setEditingFacility(null);
      queryClient.invalidateQueries({ queryKey: ["capital-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["capital-dashboard"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create facility");
    },
  });

  // Edit Facility Mutation
  const editMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const res = await fetch(`/api/capital/facilities/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update facility");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Borrowing facility updated successfully");
      setIsSheetOpen(false);
      setEditingFacility(null);
      queryClient.invalidateQueries({ queryKey: ["capital-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["capital-facility"] });
      queryClient.invalidateQueries({ queryKey: ["capital-dashboard"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update facility");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.lenderName.trim()) {
      toast.error("Please enter facility name and lender name");
      return;
    }
    const sanctioned = parseFloat(formData.sanctionedAmount);
    if (!sanctioned || sanctioned <= 0) {
      toast.error("Please enter a valid sanctioned amount");
      return;
    }

    const isDaily = formData.category === "Daily Collection Financing";
    const tenorInput = parseFloat(formData.tenor) || 0;
    // When Daily Collection Financing, tenor is entered in days, convert to months for DB schema
    const calculatedTenorMonths = isDaily
      ? (tenorInput > 0 ? parseFloat((tenorInput / 30).toFixed(2)) : 0)
      : tenorInput;

    if (editingFacility) {
      editMutation.mutate({
        id: editingFacility.id,
        payload: {
          facilityCode: formData.facilityCode.trim() || undefined,
          name: formData.name.trim(),
          lenderName: formData.lenderName.trim(),
          category: formData.category,
          facilityType: formData.facilityType,
          sanctionedAmount: sanctioned,
          disbursedAmount: parseFloat(formData.disbursedAmount) || sanctioned,
          outstandingBalance: formData.outstandingBalance !== "" ? (parseFloat(formData.outstandingBalance) || 0) : undefined,
          interestRate: parseFloat(formData.interestRate) || 0,
          interestType: formData.interestType,
          tenorMonths: calculatedTenorMonths,
          repaymentFrequency: formData.repaymentFrequency,
          installmentAmount: parseFloat(formData.installmentAmount) || 0,
          sanctionDate: formData.sanctionDate || null,
          disbursementDate: formData.disbursementDate || null,
          maturityDate: formData.maturityDate || null,
          moratoriumMonths: parseFloat(formData.moratoriumMonths) || 0,
          moratoriumType: formData.moratoriumType || "none",
          repaymentStartDate: formData.repaymentStartDate || null,
          bankAccountId: formData.bankAccountId ? parseInt(formData.bankAccountId, 10) : null,
          collateralSecurity: formData.collateralSecurity || null,
          status: formData.status,
          notes: formData.notes || null,
        },
      });
    } else {
      addMutation.mutate({
        facilityCode: formData.facilityCode.trim() || undefined,
        name: formData.name.trim(),
        lenderName: formData.lenderName.trim(),
        category: formData.category,
        facilityType: formData.facilityType,
        sanctionedAmount: sanctioned,
        disbursedAmount: parseFloat(formData.disbursedAmount) || sanctioned,
        interestRate: parseFloat(formData.interestRate) || 0,
        interestType: formData.interestType,
        tenorMonths: calculatedTenorMonths,
        repaymentFrequency: formData.repaymentFrequency,
        installmentAmount: parseFloat(formData.installmentAmount) || 0,
        sanctionDate: formData.sanctionDate || null,
        disbursementDate: formData.disbursementDate || null,
        maturityDate: formData.maturityDate || null,
        moratoriumMonths: parseFloat(formData.moratoriumMonths) || 0,
        moratoriumType: formData.moratoriumType || "none",
        repaymentStartDate: formData.repaymentStartDate || null,
        bankAccountId: formData.bankAccountId ? parseInt(formData.bankAccountId, 10) : null,
        collateralSecurity: formData.collateralSecurity || null,
        notes: formData.notes || null,
        postToCashFlow: formData.postToCashFlow,
        status: formData.status || "active",
      });
    }
  };

  // Aggregates for filter bar
  const totalSanctioned = facilities.reduce((sum: number, f: any) => sum + parseFloat(f.sanctionedAmount || 0), 0);
  const totalOutstanding = facilities.reduce((sum: number, f: any) => sum + parseFloat(f.outstandingBalance || 0), 0);
  const totalPrincipalRepaid = facilities.reduce((sum: number, f: any) => sum + parseFloat(f.totalPrincipalPaid || 0), 0);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary font-medium text-sm mb-1">
            <Link to="/capital" className="hover:underline flex items-center gap-1 text-muted-foreground">
              <Landmark className="h-3.5 w-3.5" />
              <span>Capital Finances</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <span>Liabilities Master</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Borrowing Facilities & Advances
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Master register of advances, term loans, chit groups, private lending, and credit cards
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenAdd}
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Facility / Advance</span>
          </Button>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 shadow-xs">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Total Sanctioned Limit</p>
          <p className="text-xl font-bold text-foreground mt-1">{formatINR(totalSanctioned)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{facilities.length} recorded credit lines</p>
        </Card>

        <Card className="p-4 shadow-xs border-l-4 border-l-rose-500">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Current Outstanding Debt</p>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1">{formatINR(totalOutstanding)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total un-repaid principal balance</p>
        </Card>

        <Card className="p-4 shadow-xs border-l-4 border-l-emerald-500">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Principal Repaid to Date</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(totalPrincipalRepaid)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Debt reduction amortized</p>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search, Status & View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border border-border">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search facility name, lender, or facility code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="closed">Closed / Settled</option>
                <option value="restructured">Restructured</option>
              </select>
            </div>

            <div className="border-l pl-3 border-border flex items-center gap-1">
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setViewMode("cards")}
              >
                Cards
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setViewMode("table")}
              >
                Table
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Facilities View: Cards or Table */}
      {facilities.length === 0 ? (
        <Card className="p-12 text-center shadow-xs">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-60" />
          <h3 className="text-base font-semibold text-foreground">No borrowing facilities found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            No facilities match your active search or category filter criteria.
          </p>
          <Button
            onClick={() => {
              setSelectedCategory("All");
              setStatusFilter("all");
              setSearchQuery("");
            }}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            Reset Filters
          </Button>
        </Card>
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilities.map((fac: any) => {
            const sanctioned = parseFloat(fac.sanctionedAmount || 0);
            const outstanding = parseFloat(fac.outstandingBalance || 0);
            const principalPaid = parseFloat(fac.totalPrincipalPaid || 0);
            const percentPaid = sanctioned > 0 ? Math.min(100, Math.round((principalPaid / sanctioned) * 100)) : 0;
            const isDaily = fac.repaymentFrequency === "daily";

            return (
              <Card
                key={fac.id}
                className="shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden border-border/80"
              >
                <div>
                  {/* Top Bar with Category Badge & Status */}
                  <div className="p-4 pb-2 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[11px] font-medium bg-background">
                        {fac.category}
                      </Badge>
                      {fac.isInMoratorium && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40 font-semibold flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span>Moratorium ({fac.moratoriumType === "pre_emi_interest" ? "Pre-EMI" : "Capitalized"})</span>
                        </Badge>
                      )}
                    </div>
                    <Badge
                      className={`text-[10px] font-semibold uppercase ${
                        fac.status === "active"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {fac.status}
                    </Badge>
                  </div>

                  {/* Facility Title & Lender */}
                  <div className="p-4 pb-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-bold text-base text-foreground truncate" title={fac.name}>
                        {fac.name}
                      </h3>
                      {fac.facilityCode && (
                        <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                          #{fac.facilityCode}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" />
                      <span>{fac.lenderName}</span>
                    </p>

                    {/* Financial Figures */}
                    <div className="mt-4 grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/40">
                      <div>
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground">Outstanding</p>
                        <p className="text-base font-bold text-rose-600 dark:text-rose-400">
                          {formatINR(fac.outstandingBalance)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-semibold text-muted-foreground">Sanctioned</p>
                        <p className="text-xs font-semibold text-foreground">
                          {formatINR(fac.sanctionedAmount)}
                        </p>
                      </div>
                    </div>

                    {/* Terms Breakdown */}
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Rate: <strong className="text-foreground">{fac.interestRate}% p.a.</strong></span>
                      <span>
                        Due: <strong className="text-foreground">{formatINR(calculateCurrentInstallmentDue(fac).dueAmount)}</strong>/{fac.repaymentFrequency}
                      </span>
                    </div>

                    {/* Repayment Progress */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Principal Repaid: {formatINR(fac.totalPrincipalPaid)}</span>
                        <span>{percentPaid}%</span>
                      </div>
                      <Progress value={percentPaid} className="h-1.5" />
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-3 border-t border-border/60 bg-muted/10 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {fac.facilityType || "Credit Line"}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isDaily && (
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs px-2 text-blue-600 dark:text-blue-400">
                        <Link to="/capital/daily-collections">
                          <Receipt className="h-3 w-3 mr-1" />
                          <span>Daily Hub</span>
                        </Link>
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-2 gap-1 text-foreground hover:bg-muted cursor-pointer"
                      onClick={() => handleOpenEdit(fac)}
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit</span>
                    </Button>

                    <Button asChild size="sm" variant="default" className="h-7 text-xs px-2.5">
                      <Link to="/capital/facility/$id" params={{ id: fac.id.toString() }}>
                        <span>360° Profile</span>
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                    <th className="py-3 px-4 text-left">Code</th>
                    <th className="py-3 px-4 text-left">Facility Name</th>
                    <th className="py-3 px-4 text-left">Lender</th>
                    <th className="py-3 px-4 text-left">Category</th>
                    <th className="py-3 px-4 text-right">Sanctioned</th>
                    <th className="py-3 px-4 text-right">Outstanding</th>
                    <th className="py-3 px-4 text-right">Rate</th>
                    <th className="py-3 px-4 text-right">Due / Installment</th>
                    <th className="py-3 px-4 text-right">Principal Paid</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {facilities.map((fac: any) => (
                    <tr key={fac.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
                        {fac.facilityCode || fac.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-foreground">
                        <Link
                          to="/capital/facility/$id"
                          params={{ id: fac.id.toString() }}
                          className="hover:underline text-primary"
                        >
                          {fac.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">{fac.lenderName}</td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant="outline" className="text-[11px]">
                            {fac.category}
                          </Badge>
                          {fac.isInMoratorium && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              <Clock className="h-2.5 w-2.5" />
                              <span>In Moratorium</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground">{formatINR(fac.sanctionedAmount)}</td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatINR(fac.outstandingBalance)}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-muted-foreground">{fac.interestRate}%</td>
                      <td className="py-3 px-4 text-right text-xs font-medium">
                        {formatINR(calculateCurrentInstallmentDue(fac).dueAmount)}
                        <span className="text-[10px] text-muted-foreground block capitalize">{fac.repaymentFrequency}</span>
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                        {formatINR(fac.totalPrincipalPaid)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-semibold ${
                            fac.status === "active" ? "text-emerald-600 border-emerald-500/30" : "text-muted-foreground"
                          }`}
                        >
                          {fac.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2 gap-1 text-foreground hover:bg-muted cursor-pointer"
                            onClick={() => handleOpenEdit(fac)}
                          >
                            <Edit2 className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>
                          <Button asChild size="sm" variant="outline" className="h-7 text-xs px-2">
                            <Link to="/capital/facility/$id" params={{ id: fac.id.toString() }}>
                              View
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Facility Sidebar */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl flex flex-col p-0 gap-0 h-full overflow-hidden">
          <SheetHeader className="p-6 border-b bg-muted/20 shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg ${
                  editingFacility
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {editingFacility ? <Edit2 className="h-5 w-5" /> : <Landmark className="h-5 w-5" />}
              </div>
              <div>
                <SheetTitle className="text-lg font-bold">
                  {editingFacility ? `Edit Facility: ${editingFacility.name}` : "Register New Borrowing Facility"}
                </SheetTitle>
                <SheetDescription className="text-xs mt-0.5">
                  {editingFacility
                    ? "Update terms, interest rate, status, repayment dues, and collateral security"
                    : "Record institutional loans, NBFC advances, chit funds, or private hand lending"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {/* Section 1: Facility Identity */}
              <div className="space-y-3">
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider text-[11px] border-b pb-1">
                  1. Identification & Parties
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="facilityName" className="text-xs font-semibold">Facility Name *</Label>
                    <Input
                      id="facilityName"
                      placeholder="e.g. KEISHAMTHONG/GOLDEN 20K"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="lenderName" className="text-xs font-semibold">Lender / Counterparty Name *</Label>
                    <Input
                      id="lenderName"
                      placeholder="e.g. M/S Golden, Shriram Chits, Ramesh"
                      value={formData.lenderName}
                      onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
                      required
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="category" className="text-xs font-semibold">Debt Category *</Label>
                    <select
                      id="category"
                      value={formData.category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-medium"
                    >
                      <option value="Daily Collection Financing">Daily Collection Financing</option>
                      <option value="Private Lending">Private Lending</option>
                      <option value="Chit Fund">Chit Fund</option>
                      <option value="Bank Loan">Bank Loan</option>
                      <option value="NBFC">NBFC</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Other">Other Advance</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="facilityType" className="text-xs font-semibold">Facility Sub-Type</Label>
                    <Input
                      id="facilityType"
                      placeholder="e.g. Daily Advance, Equipment Loan, Chit Group"
                      value={formData.facilityType}
                      onChange={(e) => setFormData({ ...formData, facilityType: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="facilityCode" className="text-xs font-semibold">External Code / Ref ID</Label>
                    <Input
                      id="facilityCode"
                      placeholder="e.g. 2745 (Leave empty to auto-generate)"
                      value={formData.facilityCode}
                      onChange={(e) => setFormData({ ...formData, facilityCode: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="status" className="text-xs font-semibold">Facility Status</Label>
                    <select
                      id="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="active">Active (Ongoing servicing)</option>
                      <option value="closed">Closed / Fully Settled</option>
                      <option value="restructured">Restructured</option>
                      <option value="defaulted">Defaulted</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Financial Terms & Servicing */}
              <div className="space-y-3 pt-2">
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider text-[11px] border-b pb-1">
                  2. Financial Principal & Pricing Terms
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="sanctionedAmount" className="text-xs font-semibold">Sanctioned Amount (₹) *</Label>
                    <CurrencyFormat
                      id="sanctionedAmount"
                      customInput={Input}
                      thousandSeparator={true}
                      thousandSpacing="2s"
                      prefix="₹"
                      placeholder="₹20,00,000"
                      allowNegative={false}
                      value={formData.sanctionedAmount}
                      onValueChange={(values: CurrencyFormat.Values) => {
                        const val = values.value;
                        setFormData((prev) => ({
                          ...prev,
                          sanctionedAmount: val,
                          disbursedAmount: (!prev.disbursedAmount || prev.disbursedAmount === prev.sanctionedAmount) ? val : prev.disbursedAmount,
                        }));
                      }}
                      required
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="disbursedAmount" className="text-xs font-semibold">Disbursed / Received Amount (₹)</Label>
                    <CurrencyFormat
                      id="disbursedAmount"
                      customInput={Input}
                      thousandSeparator={true}
                      thousandSpacing="2s"
                      prefix="₹"
                      placeholder="Defaults to sanctioned"
                      allowNegative={false}
                      value={formData.disbursedAmount}
                      onValueChange={(values: CurrencyFormat.Values) => {
                        setFormData((prev) => ({ ...prev, disbursedAmount: values.value }));
                      }}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  {editingFacility && (
                    <div className="space-y-1.5">
                      <Label htmlFor="outstandingBalance" className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                        Current Outstanding Balance (₹)
                      </Label>
                      <CurrencyFormat
                        id="outstandingBalance"
                        customInput={Input}
                        thousandSeparator={true}
                        thousandSpacing="2s"
                        prefix="₹"
                        placeholder="Current unpaid principal balance"
                        allowNegative={false}
                        value={formData.outstandingBalance}
                        onValueChange={(values: CurrencyFormat.Values) => {
                          setFormData((prev) => ({ ...prev, outstandingBalance: values.value }));
                        }}
                        className="h-8 text-xs font-mono font-bold text-rose-600 dark:text-rose-400"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="interestRate" className="text-xs font-semibold">Interest Rate (% p.a.)</Label>
                    <Input
                      id="interestRate"
                      type="number"
                      step="0.01"
                      placeholder="15.00"
                      value={formData.interestRate}
                      onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="interestType" className="text-xs font-semibold">Interest Calculation Type</Label>
                    <select
                      id="interestType"
                      value={formData.interestType}
                      onChange={(e) => setFormData({ ...formData, interestType: e.target.value })}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value="reducing">Reducing / Diminishing Balance</option>
                      <option value="flat">Flat Interest Rate</option>
                      <option value="interest_only">Interest Only (Bullet Principal)</option>
                      <option value="chit_dividend">Chit Dividend / Auction Adjusted</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="tenor" className="text-xs font-semibold">
                        {formData.category === "Daily Collection Financing" ? "Tenor (Days) *" : "Tenor (Months / Term)"}
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {formData.category === "Daily Collection Financing"
                          ? "Entered in Days (e.g. 100)"
                          : "Leave empty or 0 for Open-Ended"}
                      </span>
                    </div>
                    <Input
                      id="tenor"
                      type="number"
                      step={formData.category === "Daily Collection Financing" ? "1" : "0.01"}
                      placeholder={
                        formData.category === "Daily Collection Financing"
                          ? "e.g. 100"
                          : "e.g. 12, 24 (or leave blank for open-ended)"
                      }
                      value={formData.tenor}
                      onChange={(e) => setFormData({ ...formData, tenor: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="repaymentFrequency" className="text-xs font-semibold">Repayment Frequency *</Label>
                    <select
                      id="repaymentFrequency"
                      value={formData.repaymentFrequency}
                      onChange={(e) => setFormData({ ...formData, repaymentFrequency: e.target.value })}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold"
                    >
                      <option value="daily">Daily Collection / Daily EMI</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly EMI / Due</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="bullet">Bullet at Maturity</option>
                      <option value="revolving">Revolving Line</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="installmentAmount" className="text-xs font-semibold">
                        Installment / Due Amount (₹)
                      </Label>
                      <button
                        type="button"
                        onClick={calculateInstallment}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Calculator className="h-3 w-3" />
                        <span>Auto-Calculate</span>
                      </button>
                    </div>
                    <CurrencyFormat
                      id="installmentAmount"
                      customInput={Input}
                      thousandSeparator={true}
                      thousandSpacing="2s"
                      prefix="₹"
                      placeholder="e.g. ₹20,000"
                      allowNegative={false}
                      value={formData.installmentAmount}
                      onValueChange={(values: CurrencyFormat.Values) => {
                        setFormData((prev) => ({ ...prev, installmentAmount: values.value }));
                      }}
                      className="h-8 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Schedule & Linked Bank Account */}
              <div className="space-y-3 pt-2">
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider text-[11px] border-b pb-1">
                  3. Key Dates & Banking Linkage
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <FormDatePicker
                    id="sanctionDate"
                    label="Sanction Date"
                    value={formData.sanctionDate}
                    onChange={(val) => setFormData({ ...formData, sanctionDate: val })}
                    placeholder="Select sanction date"
                  />

                  <FormDatePicker
                    id="disbursementDate"
                    label="Disbursement Date"
                    value={formData.disbursementDate}
                    onChange={(val) => setFormData({ ...formData, disbursementDate: val })}
                    placeholder="Select disbursement date"
                  />

                  <FormDatePicker
                    id="maturityDate"
                    label="Maturity / Expiry Date"
                    value={formData.maturityDate}
                    onChange={(val) => setFormData({ ...formData, maturityDate: val })}
                    placeholder="Select maturity date"
                    quickAction={
                      formData.disbursementDate && formData.tenor ? (
                        <button
                          type="button"
                          onClick={handleQuickMaturity}
                          className="text-[10px] text-primary hover:underline cursor-pointer"
                          title="Auto-calculate maturity from disbursement date + tenor"
                        >
                          +{formData.category === "Daily Collection Financing" ? `${formData.tenor}d` : `${formData.tenor}m`}
                        </button>
                      ) : undefined
                    }
                  />

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="bankAccountId" className="text-xs font-semibold">Linked ACME Account</Label>
                      {formData.category === "Daily Collection Financing" && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <span>💵 Cash Default</span>
                        </span>
                      )}
                    </div>
                    <select
                      id="bankAccountId"
                      value={formData.bankAccountId}
                      onChange={(e) => setFormData({ ...formData, bankAccountId: e.target.value })}
                      className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-medium"
                    >
                      <option value="">No linked account</option>
                      {bankAccountsList.map((acc: any) => {
                        const isCash = acc.bankName?.toUpperCase() === "CASH" || acc.accountType?.toLowerCase() === "cash";
                        return (
                          <option key={acc.id} value={acc.id}>
                            {isCash ? `💵 ${acc.accountName} (${acc.bankName})` : `🏦 ${acc.accountName} (${acc.bankName} - ${acc.accountNumber?.slice(-4)})`}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Moratorium & Grace Period (NBFC / Bank Loans) */}
                  <div className="col-span-1 sm:col-span-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-semibold text-foreground">
                          Moratorium & Grace Period (Principal Repayment Holiday)
                        </span>
                      </div>
                      {formData.moratoriumType !== "none" && (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 font-medium">
                          {formData.moratoriumType === "pre_emi_interest" ? "Pre-EMI Serviced" : "Capitalized"}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1.5">
                        <Label htmlFor="moratoriumType" className="text-xs font-semibold">Moratorium Type</Label>
                        <select
                          id="moratoriumType"
                          value={formData.moratoriumType}
                          onChange={(e) => {
                            const newType = e.target.value;
                            setFormData((prev) => ({
                              ...prev,
                              moratoriumType: newType,
                              moratoriumMonths: newType === "none" ? "0" : (prev.moratoriumMonths === "0" ? "6" : prev.moratoriumMonths),
                            }));
                          }}
                          className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="none">None (Standard EMI from Day 1)</option>
                          <option value="pre_emi_interest">Pre-EMI Interest Only (Principal Deferred)</option>
                          <option value="capitalized">Capitalized (Zero Payment, Interest Accrued)</option>
                        </select>
                      </div>

                      {formData.moratoriumType !== "none" && (
                        <>
                          <div className="space-y-1.5">
                            <Label htmlFor="moratoriumMonths" className="text-xs font-semibold">Moratorium Term (Months)</Label>
                            <Input
                              id="moratoriumMonths"
                              type="number"
                              step="0.5"
                              placeholder="e.g. 6"
                              value={formData.moratoriumMonths}
                              onChange={(e) => setFormData({ ...formData, moratoriumMonths: e.target.value })}
                              className="h-8 text-xs font-mono"
                            />
                          </div>

                          <FormDatePicker
                            id="repaymentStartDate"
                            label="First Full EMI Start Date"
                            value={formData.repaymentStartDate}
                            onChange={(val) => setFormData({ ...formData, repaymentStartDate: val })}
                            placeholder="Select first EMI date"
                            quickAction={
                              formData.disbursementDate && parseFloat(formData.moratoriumMonths) > 0 ? (
                                <button
                                  type="button"
                                  onClick={handleQuickRepaymentStart}
                                  className="text-[10px] text-primary hover:underline cursor-pointer"
                                  title="Auto-calculate first EMI date = disbursement + moratorium months"
                                >
                                  +{formData.moratoriumMonths}m
                                </button>
                              ) : undefined
                            }
                          />
                        </>
                      )}
                    </div>
                    {formData.moratoriumType !== "none" && (
                      <p className="text-[11px] text-muted-foreground pt-0.5">
                        {formData.moratoriumType === "pre_emi_interest"
                          ? "💡 Principal repayments deferred during moratorium. Only simple Pre-EMI interest is serviced monthly until repayment start date."
                          : "💡 Zero payments due during moratorium. Accrued interest is compounded into principal balance when full EMIs commence."}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Security & Remarks */}
              <div className="space-y-3 pt-2">
                <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider text-[11px] border-b pb-1">
                  4. Security, Collateral & Remarks
                </h4>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="collateralSecurity" className="text-xs font-semibold">Collateral & Guarantee Notes</Label>
                    <Input
                      id="collateralSecurity"
                      placeholder="e.g. Promissory note, PDCs, Personal guarantee, Property hypothecation"
                      value={formData.collateralSecurity}
                      onChange={(e) => setFormData({ ...formData, collateralSecurity: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-xs font-semibold">Operational Remarks</Label>
                    <Input
                      id="notes"
                      placeholder="Internal references, branch details, collector name"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>

                  {!editingFacility && (
                    <div className="pt-2 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="postToCashFlow"
                        checked={formData.postToCashFlow}
                        onChange={(e) => setFormData({ ...formData, postToCashFlow: e.target.checked })}
                        className="rounded border-input text-primary cursor-pointer"
                      />
                      <label htmlFor="postToCashFlow" className="text-xs text-foreground cursor-pointer">
                        Automatically post loan disbursement receipt as Inflow in Cash Flow Treasury
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <SheetFooter className="p-4 border-t bg-muted/10 flex flex-row items-center justify-end gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSheetOpen(false)}
                disabled={addMutation.isPending || editMutation.isPending}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={addMutation.isPending || editMutation.isPending}
                className={`cursor-pointer ${
                  editingFacility
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {editingFacility
                  ? editMutation.isPending
                    ? "Saving Changes..."
                    : "Save Facility Changes"
                  : addMutation.isPending
                  ? "Registering..."
                  : "Register Facility"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
