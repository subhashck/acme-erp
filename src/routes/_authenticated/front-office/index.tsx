import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { toast } from "sonner";
import {
  Upload,
  FileDown,
  Save,
  Search,
  Users,
  IndianRupee,
  Activity,
  History,
  AlertCircle,
  Clock,
  Trash2,
  Calendar,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  Plus,
  Receipt,
  Wallet,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Sliders,
  Edit2,
  Sun,
  Sunrise,
  Moon,
  Filter,
  CloudDownload,
  FileText,
  RefreshCw,
  Globe,
  Coins,
  CreditCard,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Key,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import { cn } from "@/utils/cn";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { FrontOfficeAccessGuard } from "@/components/FrontOfficeAccessGuard";
import { DocterzConfigDialog } from "@/components/DocterzConfigDialog";
import { authClient } from "@/services/auth";
import {
  type ConsultationRow,
  type ProcedureRow,
  type FrontOfficeRow,
  type CompiledPatient,
  type FrontOfficeSummaryKPIs,
  type RevenueCategorySummary,
  type ItemBilledSummary,
  type FrontOfficeExpense,
  type FrontOfficeShift,
  type FrontOfficeAdmissionRow,
  type FrontOfficeDischargeRow,
  type FrontOfficeDenominations,
  FRONT_OFFICE_DENOMINATIONS,
  calculateDenominationsTotal,
  formatMoney,
  formatNumber,
  parseDate,
  normalizeConsultationRows,
  normalizeProcedureRows,
  normalizeRadiologyRows,
  reconcileCompoundCollections,
  applyKnownConsultationOnlySplitRule,
  flagUnresolvedSplitPayments,
  hasBillOrCollection,
  compilePatients,
  calculateKPIs,
  calculateRevenueCategories,
  calculateItemBreakdown,
  sumCollectedByPaymentMode,
  calculateOnlinePayments,
  type OnlinePaymentsBreakdown,
  getHourLabel,
  visitTypeLabel,
  isTimeInShiftWindow,
  filterRowsByShift,
  comparePatientConsultationTiming,
} from "@/lib/front-office-processor";
import { generateFrontOfficePDF } from "@/lib/front-office-export";

export const Route = createFileRoute("/_authenticated/front-office/")({
  component: () => (
    <FrontOfficeAccessGuard>
      <FrontOfficePage />
    </FrontOfficeAccessGuard>
  ),
});

const PIE_COLORS = [
  "#2563eb",
  "#f59e0b",
  "#16a34a",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#9333ea",
  "#ea580c",
];

const FRONT_OFFICE_EXPENSE_CATEGORIES = [
  "Pantry & Refreshments",
  "Courier & Speed Post",
  "Stationery & Printing",
  "Travel & Conveyance",
  "Repairs & Maintenance",
  "Doctor Honorarium / Advance",
  "Patient Refund / Adjustment",
  "Sanitation & Cleaning",
  "Miscellaneous",
];

function FrontOfficePage() {
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const currentUserName = session?.data?.user?.name || "Front Office Staff";
  const currentUserRole = session?.data?.user?.role || "";
  const isAdmin = currentUserRole === "admin";

  const [activeTab, setActiveTab] = React.useState<"dashboard" | "handover" | "history" | "shifts">("dashboard");

  // Shifts Master Query
  const shiftsQuery = useQuery<FrontOfficeShift[]>({
    queryKey: ["front-office", "shifts"],
    queryFn: async () => {
      const res = await fetch("/api/front-office/shifts?all=true");
      if (!res.ok) throw new Error("Failed to load shift configurations");
      return res.json();
    },
  });

  const activeShifts = React.useMemo(() => {
    return (shiftsQuery.data || []).filter((s) => s.isActive);
  }, [shiftsQuery.data]);

  // Selected shift option: "auto", specific shift id (e.g. "1"), or "all"
  const [selectedShiftOption, setSelectedShiftOption] = React.useState<string>("auto");

  // Effective shift label and date for currently generated or loaded report
  const [activeShiftLabel, setActiveShiftLabel] = React.useState<string>("Morning Shift");
  const [activeReportDate, setActiveReportDate] = React.useState<string>(new Date().toISOString().slice(0, 10));
  const [reportPreparedBy, setReportPreparedBy] = React.useState<string>("");
  const [filterStats, setFilterStats] = React.useState<{ totalBefore: number; totalAfter: number } | null>(null);

  // Shift editing state for admin shift management
  const [editingShift, setEditingShift] = React.useState<Partial<FrontOfficeShift> | null>(null);
  const [isAddingShift, setIsAddingShift] = React.useState(false);

  // Shift mutations
  const createShiftMutation = useMutation({
    mutationFn: async (payload: { name: string; startTime: string; endTime: string; sortOrder?: number; isActive?: boolean }) => {
      const res = await fetch("/api/front-office/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create shift");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("New shift created successfully!");
      queryClient.invalidateQueries({ queryKey: ["front-office", "shifts"] });
      setIsAddingShift(false);
      setEditingShift(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to create shift"),
  });

  const updateShiftMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<FrontOfficeShift> & { id: number }) => {
      const res = await fetch(`/api/front-office/shifts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update shift");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Shift timing updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["front-office", "shifts"] });
      setEditingShift(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update shift"),
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/front-office/shifts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to deactivate shift");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Shift deactivated successfully!");
      queryClient.invalidateQueries({ queryKey: ["front-office", "shifts"] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to deactivate shift"),
  });

  // Source selection: "api" (Docterz direct) or "csv" (manual file upload)
  const [importSource, setImportSource] = React.useState<"api" | "csv">("api");
  const [apiFetchDate, setApiFetchDate] = React.useState<string>(new Date().toISOString().slice(0, 10));
  const [dataSourceSummary, setDataSourceSummary] = React.useState<string>("Docterz API");
  const [docterzConfigOpen, setDocterzConfigOpen] = React.useState(false);

  // Files
  const [consultationFile, setConsultationFile] = React.useState<File | null>(null);
  const [procedureFile, setProcedureFile] = React.useState<File | null>(null);
  const [radiologyFile, setRadiologyFile] = React.useState<File | null>(null);

  // Parsed data state
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<string>("Ready to import transactions.");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [allRows, setAllRows] = React.useState<FrontOfficeRow[]>([]);
  const [consultationRows, setConsultationRows] = React.useState<ConsultationRow[]>([]);
  const [serviceRows, setServiceRows] = React.useState<ProcedureRow[]>([]);
  const [compiledPatients, setCompiledPatients] = React.useState<CompiledPatient[]>([]);
  const [kpis, setKpis] = React.useState<FrontOfficeSummaryKPIs | null>(null);
  const [revenueCategories, setRevenueCategories] = React.useState<RevenueCategorySummary[]>([]);
  const [itemsBilled, setItemsBilled] = React.useState<ItemBilledSummary[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Front Office Outflow & Petty Cash Expenses State
  const [expenses, setExpenses] = React.useState<FrontOfficeExpense[]>([]);
  const [expenseCategory, setExpenseCategory] = React.useState("Pantry & Refreshments");
  const [expenseDescription, setExpenseDescription] = React.useState("");
  const [expenseAmount, setExpenseAmount] = React.useState("");
  const [expensePaymentMode, setExpensePaymentMode] = React.useState("Cash");
  const [expenseVoucher, setExpenseVoucher] = React.useState("");
  const [showExpenseForm, setShowExpenseForm] = React.useState(true);

  const totalExpenses = React.useMemo(() => {
    return expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [expenses]);

  const netCollections = React.useMemo(() => {
    return Number(kpis?.totalCollected || 0) - totalExpenses;
  }, [kpis, totalExpenses]);

  const handleAddExpense = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amt = parseFloat(expenseAmount);
    if (!amt || isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid expense amount greater than 0");
      return;
    }
    if (!expenseDescription.trim()) {
      toast.error("Please enter an expense description or detail");
      return;
    }

    const newExpense: FrontOfficeExpense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category: expenseCategory,
      description: expenseDescription.trim(),
      amount: amt,
      paymentMode: expensePaymentMode,
      voucherNumber: expenseVoucher.trim() || undefined,
    };

    setExpenses((prev) => [...prev, newExpense]);
    setExpenseDescription("");
    setExpenseAmount("");
    setExpenseVoucher("");
    toast.success(`Added expense: ${formatMoney(amt)} (${newExpense.category})`);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    toast.info("Expense removed");
  };

  // -------------------------------------------------------------------------
  // Shift Handover Sheet State & Handlers
  // -------------------------------------------------------------------------
  const createDefaultAdmissions = (): FrontOfficeAdmissionRow[] => [
    { id: "adm-1", patientName: "", amount: 0, remark: "" },
    { id: "adm-2", patientName: "", amount: 0, remark: "" },
    { id: "adm-3", patientName: "", amount: 0, remark: "" },
    { id: "adm-4", patientName: "", amount: 0, remark: "" },
    { id: "adm-5", patientName: "", amount: 0, remark: "" },
  ];

  const createDefaultDischarges = (): FrontOfficeDischargeRow[] => [
    { id: "dis-1", patientName: "", amount: 0, remark: "" },
    { id: "dis-2", patientName: "", amount: 0, remark: "" },
    { id: "dis-3", patientName: "", amount: 0, remark: "" },
    { id: "dis-4", patientName: "", amount: 0, remark: "" },
    { id: "dis-5", patientName: "", amount: 0, remark: "" },
  ];

  const [admissions, setAdmissions] = React.useState<FrontOfficeAdmissionRow[]>(createDefaultAdmissions);
  const [discharges, setDischarges] = React.useState<FrontOfficeDischargeRow[]>(createDefaultDischarges);
  const [cashDenominations, setCashDenominations] = React.useState<FrontOfficeDenominations>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
  });

  const [onlinePaymentsInput, setOnlinePaymentsInput] = React.useState<string>("");
  const [advanceHandoverInput, setAdvanceHandoverInput] = React.useState<string>("");
  const [handedOverBy, setHandedOverBy] = React.useState<string>("");
  const [receivedBy, setReceivedBy] = React.useState<string>("");
  const [handoverRemarks, setHandoverRemarks] = React.useState<string>("");

  const handleUpdateAdmission = (id: string, field: keyof FrontOfficeAdmissionRow, value: any) => {
    setAdmissions((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddAdmissionRow = () => {
    setAdmissions((prev) => [
      ...prev,
      {
        id: `adm-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        patientName: "",
        amount: 0,
        remark: "",
      },
    ]);
  };

  const handleRemoveAdmissionRow = (id: string) => {
    setAdmissions((prev) => {
      if (prev.length <= 1) {
        return [{ id: "adm-1", patientName: "", amount: 0, remark: "" }];
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleUpdateDischarge = (id: string, field: keyof FrontOfficeDischargeRow, value: any) => {
    setDischarges((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleAddDischargeRow = () => {
    setDischarges((prev) => [
      ...prev,
      {
        id: `dis-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        patientName: "",
        amount: 0,
        remark: "",
      },
    ]);
  };

  const handleRemoveDischargeRow = (id: string) => {
    setDischarges((prev) => {
      if (prev.length <= 1) {
        return [{ id: "dis-1", patientName: "", amount: 0, remark: "" }];
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleUpdateDenomination = (note: number, countStr: string) => {
    const count = Math.max(0, parseInt(countStr, 10) || 0);
    setCashDenominations((prev) => ({
      ...prev,
      [note]: count,
    }));
  };

  const handleClearDenominations = () => {
    setCashDenominations({
      500: 0,
      200: 0,
      100: 0,
      50: 0,
      20: 0,
      10: 0,
    });
  };

  const handleResetHandoverForm = () => {
    if (confirm("Reset the shift handover sheet to default blank rows?")) {
      setAdmissions(createDefaultAdmissions());
      setDischarges(createDefaultDischarges());
      handleClearDenominations();
      setOnlinePaymentsInput("");
      setAdvanceHandoverInput("");
      setHandoverRemarks("");
      toast.info("Shift handover form reset");
    }
  };

  const admissionTotal = React.useMemo(() => {
    return admissions.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  }, [admissions]);

  const dischargeTotal = React.useMemo(() => {
    return discharges.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  }, [discharges]);

  const opdOnlinePayments = React.useMemo(() => {
    if (allRows.length > 0) {
      return calculateOnlinePayments(allRows);
    }
    return { app: 0, card: 0, upi: 0, otherOnline: 0, total: 0 };
  }, [allRows]);

  const effectiveOnlinePayments = React.useMemo(() => {
    if (onlinePaymentsInput.trim() !== "") {
      return Math.max(0, parseFloat(onlinePaymentsInput) || 0);
    }
    return opdOnlinePayments.total;
  }, [onlinePaymentsInput, opdOnlinePayments.total]);

  const effectiveAdvHandover = Math.max(0, parseFloat(advanceHandoverInput) || 0);

  const opdGrossCollections = Number(kpis?.totalCollected || 0);

  const grandTotal = React.useMemo(() => {
    return opdGrossCollections + admissionTotal + dischargeTotal;
  }, [opdGrossCollections, admissionTotal, dischargeTotal]);

  const cashToHandover = React.useMemo(() => {
    return grandTotal - totalExpenses - effectiveOnlinePayments - effectiveAdvHandover;
  }, [grandTotal, totalExpenses, effectiveOnlinePayments, effectiveAdvHandover]);

  const denominationCalc = React.useMemo(() => {
    return calculateDenominationsTotal(cashDenominations);
  }, [cashDenominations]);

  const actualCashCounted = denominationCalc.totalAmount;
  const cashDifference = actualCashCounted - cashToHandover;

  // Saved reports query (supporting active only vs all versions, server-side pagination & search)
  const [showAllVersions, setShowAllVersions] = React.useState(false);
  const [archivePage, setArchivePage] = React.useState(1);
  const [archivePageSize, setArchivePageSize] = React.useState(10);
  const [archiveSearch, setArchiveSearch] = React.useState("");
  const [debouncedArchiveSearch, setDebouncedArchiveSearch] = React.useState("");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedArchiveSearch(archiveSearch);
      setArchivePage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [archiveSearch]);

  const savedReportsQuery = useQuery({
    queryKey: [
      "front-office",
      "reports",
      showAllVersions,
      archivePage,
      archivePageSize,
      debouncedArchiveSearch,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(archivePage));
      params.set("pageSize", String(archivePageSize));
      if (showAllVersions) params.set("all", "true");
      if (debouncedArchiveSearch.trim()) {
        params.set("search", debouncedArchiveSearch.trim());
      }
      const res = await fetch(`/api/front-office/reports?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load saved reports");
      return res.json();
    },
  });

  const reportsList = React.useMemo(() => {
    if (!savedReportsQuery.data) return [];
    if (Array.isArray(savedReportsQuery.data)) return savedReportsQuery.data;
    return savedReportsQuery.data.data || [];
  }, [savedReportsQuery.data]);

  const reportsPagination = React.useMemo(() => {
    if (savedReportsQuery.data && !Array.isArray(savedReportsQuery.data) && savedReportsQuery.data.pagination) {
      return savedReportsQuery.data.pagination;
    }
    return {
      page: archivePage,
      pageSize: archivePageSize,
      totalRecords: reportsList.length,
      totalPages: Math.max(1, Math.ceil(reportsList.length / archivePageSize)),
    };
  }, [savedReportsQuery.data, archivePage, archivePageSize, reportsList.length]);

  // Save report mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/front-office/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save report");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      const verText = data?.version ? ` (v${data.version} - Active)` : "";
      toast.success(`Shift report archived successfully${verText}!`);
      queryClient.invalidateQueries({ queryKey: ["front-office", "reports"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not save report");
    },
  });

  // Delete report mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/front-office/reports/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete report");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Report deleted from archive");
      queryClient.invalidateQueries({ queryKey: ["front-office", "reports"] });
    },
  });

  const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: "greedy",
        dynamicTyping: false,
        encoding: "UTF-8",
        complete: (results) => resolve(results.data || []),
        error: (err) => reject(err),
      });
    });
  };

  // Core transaction normalization, shift window filtering, reconciliation & KPI pipeline
  const processNormalizedSourceRows = (
    consultationRaw: Record<string, any>[],
    procedureRaw: Record<string, any>[],
    radiologyRaw: Record<string, any>[],
    reportDateStr: string,
    sourceLabel: string
  ) => {
    let consultations = normalizeConsultationRows(consultationRaw);
    let procedures = normalizeProcedureRows(procedureRaw);
    let radiology = normalizeRadiologyRows(radiologyRaw);

    if (!consultations.length && !procedures.length && !radiology.length) {
      throw new Error(`No valid transactions found from ${sourceLabel} for ${reportDateStr}.`);
    }

    const totalRawCount = consultations.length + procedures.length + radiology.length;

    // Determine shift filter to apply
    let shiftToApply: FrontOfficeShift | null = null;
    let effectiveShiftName = "Full Day";

    if (selectedShiftOption !== "all") {
      if (selectedShiftOption === "auto") {
        const now = new Date();
        shiftToApply =
          activeShifts.find((s) => isTimeInShiftWindow(now, s.startTime, s.endTime)) ||
          activeShifts[0] ||
          null;
      } else {
        shiftToApply = activeShifts.find((s) => String(s.id) === selectedShiftOption) || null;
      }
    }

    if (shiftToApply) {
      effectiveShiftName = `${shiftToApply.name} (${shiftToApply.startTime} – ${shiftToApply.endTime})`;
      consultations = filterRowsByShift(consultations, shiftToApply.startTime, shiftToApply.endTime);
      procedures = filterRowsByShift(procedures, shiftToApply.startTime, shiftToApply.endTime);
      radiology = filterRowsByShift(radiology, shiftToApply.startTime, shiftToApply.endTime);
    } else {
      effectiveShiftName = "Full Day (All Hours)";
    }

    const totalFilteredCount = consultations.length + procedures.length + radiology.length;
    setFilterStats({ totalBefore: totalRawCount, totalAfter: totalFilteredCount });
    setActiveShiftLabel(effectiveShiftName);
    setActiveReportDate(reportDateStr);
    setReportPreparedBy(currentUserName);
    setDataSourceSummary(sourceLabel);

    const allServices = [...procedures, ...radiology];
    reconcileCompoundCollections(consultations, allServices);
    applyKnownConsultationOnlySplitRule(consultations, allServices);
    flagUnresolvedSplitPayments([...consultations, ...allServices]);

    const filteredConsultations = consultations.filter(hasBillOrCollection);
    const filteredServices = allServices.filter(hasBillOrCollection);
    const combinedRows = [...filteredConsultations, ...filteredServices];

    const patients = compilePatients(filteredConsultations, filteredServices);
    const calculatedKpis = calculateKPIs(combinedRows);
    const revCats = calculateRevenueCategories(filteredConsultations, filteredServices);
    const items = calculateItemBreakdown(filteredServices);

    setAllRows(combinedRows);
    setConsultationRows(filteredConsultations);
    setServiceRows(filteredServices);
    setCompiledPatients(patients);
    setKpis(calculatedKpis);
    setRevenueCategories(revCats);
    setItemsBilled(items);
    setArchivedSummaryData(null);

    const uidCount = calculatedKpis.totalPatients;
    setStatusMessage(
      `[${sourceLabel}] ${effectiveShiftName}: ${uidCount} patients compiled. ` +
        `Included ${totalFilteredCount} of ${totalRawCount} transactions (${filteredConsultations.length} cons/follow-up, ${filteredServices.length} lab/rad).`
    );
    toast.success(`Successfully reconciled from ${sourceLabel} for ${effectiveShiftName}!`);
  };

  // Process manual CSV uploads
  const handleProcessFiles = async () => {
    if (!consultationFile || !procedureFile || !radiologyFile) {
      toast.error("Please select all three CSV files: Consultation, Laboratory, and Radiology.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(`Reading ${consultationFile.name}, ${procedureFile.name}, and ${radiologyFile.name}...`);

    try {
      const [consultationRaw, procedureRaw, radiologyRaw] = await Promise.all([
        parseCSV(consultationFile),
        parseCSV(procedureFile),
        parseCSV(radiologyFile),
      ]);

      if (!consultationRaw.length) throw new Error("Consultation CSV is empty.");
      if (!procedureRaw.length) throw new Error("Laboratory CSV is empty.");
      if (!radiologyRaw.length) throw new Error("Radiology CSV is empty.");

      processNormalizedSourceRows(
        consultationRaw,
        procedureRaw,
        radiologyRaw,
        new Date().toISOString().slice(0, 10),
        "CSV Files"
      );
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to process CSV files.");
      toast.error(err.message || "Failed to process CSV files.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Fetch directly from Docterz live API
  const handleFetchLive = async () => {
    if (!apiFetchDate) {
      toast.error("Please choose a date to fetch transactions from Docterz API.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(`Connecting to Docterz API for ${apiFetchDate}...`);

    try {
      const res = await fetch("/api/front-office/fetch-live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: apiFetchDate }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Docterz API returned status ${res.status}`);
      }

      const data = await res.json();
      const consultations = data.consultations || [];
      const laboratory = data.laboratory || [];
      const radiology = data.radiology || [];

      if (!consultations.length && !laboratory.length && !radiology.length) {
        throw new Error(`No records returned from Docterz API for date ${apiFetchDate}.`);
      }

      processNormalizedSourceRows(
        consultations,
        laboratory,
        radiology,
        apiFetchDate,
        `Docterz API (${consultations.length} Cons, ${laboratory.length} Lab, ${radiology.length} Rad)`
      );
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to fetch data from Docterz API.");
      toast.error(err.message || "Failed to fetch data from Docterz API.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Sorting state for patient visit summary (default: consultation timing ascending)
  const [patientSortColumn, setPatientSortColumn] = React.useState<
    "timing" | "patient" | "bill" | "discount" | "collected" | "pending"
  >("timing");
  const [patientSortDirection, setPatientSortDirection] = React.useState<"asc" | "desc">("asc");

  const handleToggleSort = (column: "timing" | "patient" | "bill" | "discount" | "collected" | "pending") => {
    if (patientSortColumn === column) {
      setPatientSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setPatientSortColumn(column);
      setPatientSortDirection(column === "timing" || column === "patient" ? "asc" : "desc");
    }
  };

  // Filtered patients based on search and sorted by consultation timing / selected column
  const filteredPatients = React.useMemo(() => {
    let list = compiledPatients;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = compiledPatients.filter((p) => {
        const searchStr = [
          p.patientName,
          p.patientUid,
          ...p.consultations.flatMap((c) => [c.doctor, c.purpose, c.schedule, c.paymentMode, c.dateText]),
          ...p.procedures.flatMap((pr) => [pr.procedure, pr.doctor, pr.paymentMode, pr.category, pr.dateText]),
        ]
          .join(" ")
          .toLowerCase();
        return searchStr.includes(q);
      });
    }

    return [...list].sort((a, b) => {
      if (patientSortColumn === "timing") {
        return comparePatientConsultationTiming(a, b, patientSortDirection);
      }
      if (patientSortColumn === "patient") {
        const cmp = a.patientName.localeCompare(b.patientName);
        return patientSortDirection === "asc" ? cmp : -cmp;
      }
      if (patientSortColumn === "bill") {
        return patientSortDirection === "asc" ? a.totalBill - b.totalBill : b.totalBill - a.totalBill;
      }
      if (patientSortColumn === "discount") {
        return patientSortDirection === "asc"
          ? (a.totalDiscount || 0) - (b.totalDiscount || 0)
          : (b.totalDiscount || 0) - (a.totalDiscount || 0);
      }
      if (patientSortColumn === "collected") {
        return patientSortDirection === "asc" ? a.totalCollected - b.totalCollected : b.totalCollected - a.totalCollected;
      }
      if (patientSortColumn === "pending") {
        return patientSortDirection === "asc" ? a.totalPending - b.totalPending : b.totalPending - a.totalPending;
      }
      return 0;
    });
  }, [compiledPatients, searchQuery, patientSortColumn, patientSortDirection]);

  interface ChartCountItem {
    name: string;
    value: number;
  }

  interface RevenueSummaryItem {
    name: string;
    amount: number;
    fill?: string;
  }

  const [archivedSummaryData, setArchivedSummaryData] = React.useState<any | null>(null);

  // Chart data calculations
  const visitsByPurposeData = React.useMemo<ChartCountItem[]>(() => {
    if (consultationRows.length > 0) {
      const counts: Record<string, number> = {};
      consultationRows.forEach((r) => {
        const label = r.purpose || "Unknown";
        counts[label] = (counts[label] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    }
    if (archivedSummaryData?.visitsByPurposeData?.length) {
      return archivedSummaryData.visitsByPurposeData;
    }
    return [];
  }, [consultationRows, archivedSummaryData]);

  const collectionsByPaymentModeData = React.useMemo<ChartCountItem[]>(() => {
    if (allRows.length > 0) {
      const sums = sumCollectedByPaymentMode(allRows);
      return Object.entries(sums)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    }
    if (archivedSummaryData?.collectionsByPaymentModeData?.length) {
      return archivedSummaryData.collectionsByPaymentModeData;
    }
    return [];
  }, [allRows, archivedSummaryData]);

  const collectionsByDoctorData = React.useMemo<ChartCountItem[]>(() => {
    if (allRows.length > 0) {
      const sums: Record<string, number> = {};
      allRows.forEach((r) => {
        const doc = r.doctor || "Unknown";
        sums[doc] = (sums[doc] || 0) + Number(r.collected || 0);
      });
      return Object.entries(sums)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    }
    if (archivedSummaryData?.collectionsByDoctorData?.length) {
      return archivedSummaryData.collectionsByDoctorData;
    }
    return [];
  }, [allRows, archivedSummaryData]);

  const visitsByScheduleData = React.useMemo<ChartCountItem[]>(() => {
    if (consultationRows.length > 0) {
      const counts: Record<string, number> = {};
      consultationRows.forEach((r) => {
        const sched = r.schedule || "Not Specified";
        counts[sched] = (counts[sched] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    }
    if (archivedSummaryData?.visitsByScheduleData?.length) {
      return archivedSummaryData.visitsByScheduleData;
    }
    return [];
  }, [consultationRows, archivedSummaryData]);

  const visitsByTimeSlotData = React.useMemo<ChartCountItem[]>(() => {
    if (consultationRows.length > 0) {
      const counts: Record<string, number> = {};
      consultationRows.forEach((r) => {
        const hour = getHourLabel(r.dateObj || r.dateText);
        counts[hour] = (counts[hour] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }
    if (archivedSummaryData?.visitsByTimeSlotData?.length) {
      return archivedSummaryData.visitsByTimeSlotData;
    }
    return [];
  }, [consultationRows, archivedSummaryData]);

  const revenueSummaryData = React.useMemo<RevenueSummaryItem[]>(() => {
    if (!kpis) return [];
    if (consultationRows.length > 0 || serviceRows.length > 0) {
      const isFollowUp = (r: ConsultationRow) => /follow[\s-]?up/i.test(r.purpose);
      const isConsultation = (r: ConsultationRow) => /consultation/i.test(r.purpose) && !isFollowUp(r);

      const consRev = consultationRows.filter(isConsultation).reduce((s, r) => s + r.collected, 0);
      const followRev = consultationRows.filter(isFollowUp).reduce((s, r) => s + r.collected, 0);
      const labBill = serviceRows.filter((r) => r.source === "laboratory").reduce((s, r) => s + r.billAmount, 0);
      const radBill = serviceRows.filter((r) => r.source === "radiology").reduce((s, r) => s + r.billAmount, 0);

      return [
        { name: "Total Billed", amount: kpis.totalBill, fill: "#2563eb" },
        { name: "Realized", amount: kpis.totalCollected, fill: "#16a34a" },
        { name: "Pending", amount: kpis.totalPending, fill: "#dc2626" },
        { name: "Consultation", amount: consRev, fill: "#7c3aed" },
        { name: "Follow-up", amount: followRev, fill: "#db2777" },
        { name: "Laboratory", amount: labBill, fill: "#f59e0b" },
        { name: "Radiology", amount: radBill, fill: "#0891b2" },
      ];
    }
    if (archivedSummaryData?.revenueSummaryData?.length) {
      return archivedSummaryData.revenueSummaryData;
    }
    return [
      { name: "Total Billed", amount: kpis.totalBill, fill: "#2563eb" },
      { name: "Realized", amount: kpis.totalCollected, fill: "#16a34a" },
      { name: "Pending", amount: kpis.totalPending, fill: "#dc2626" },
    ];
  }, [kpis, consultationRows, serviceRows, archivedSummaryData]);

  // Export handlers
  const handleDownloadPDF = () => {
    try {
      const activeAdmissions = admissions.filter((a) => a.patientName.trim() || Number(a.amount) > 0);
      const activeDischarges = discharges.filter((d) => d.patientName.trim() || Number(d.amount) > 0);

      const doc = generateFrontOfficePDF({
        reportDate: activeReportDate,
        shiftLabel: activeShiftLabel,
        preparedBy: handedOverBy || reportPreparedBy || currentUserName,
        consultationFileName: consultationFile?.name,
        procedureFileName: procedureFile?.name,
        radiologyFileName: radiologyFile?.name,
        kpis: kpis || {
          totalPatients: activeAdmissions.length + activeDischarges.length,
          totalBill: grandTotal,
          totalCollected: grandTotal,
          totalPending: 0,
          totalDiscount: 0,
          realizationRate: 100,
          patientMixText: "Shift Handover",
          consultationCount: 0,
          serviceCount: 0,
        },
        revenueCategories,
        itemsBilled,
        patients: compiledPatients,
        expenses,
        admissions: activeAdmissions,
        discharges: activeDischarges,
        cashDenominations,
        handoverSummary: {
          opdCollections: opdGrossCollections,
          admissionTotal,
          dischargeTotal,
          grandTotal,
          expenditure: totalExpenses,
          cardSale: effectiveOnlinePayments,
          onlinePayments: effectiveOnlinePayments,
          onlineBreakdown: {
            app: opdOnlinePayments.app,
            card: opdOnlinePayments.card,
            upi: opdOnlinePayments.upi,
            otherOnline: opdOnlinePayments.otherOnline,
          },
          advanceHandover: effectiveAdvHandover,
          cashToHandover,
          actualCashCounted,
          cashDifference,
        },
        signatures: {
          handedOverBy: handedOverBy || reportPreparedBy || currentUserName,
          receivedBy,
          remarks: handoverRemarks,
        },
      });
      const shiftSlug = (activeShiftLabel || "FullDay").replace(/[^a-zA-Z0-9]/g, "_");
      doc.save(`Acme_Front_Office_${shiftSlug}_${activeReportDate}.pdf`);
      toast.success("PDF generated and downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
  };

  const handleSaveToArchive = () => {
    const activeAdmissions = admissions.filter((a) => a.patientName.trim() || Number(a.amount) > 0);
    const activeDischarges = discharges.filter((d) => d.patientName.trim() || Number(d.amount) > 0);

    const totalPatientsCount = kpis?.totalPatients || (activeAdmissions.length + activeDischarges.length);
    const totalBillAmt = kpis ? kpis.totalBill : grandTotal;
    const totalCollAmt = kpis ? kpis.totalCollected : grandTotal;
    const totalPendAmt = kpis ? kpis.totalPending : 0;
    const realRate = kpis ? kpis.realizationRate : 100;
    const mixText = kpis ? kpis.patientMixText : "Shift Handover Only";

    saveMutation.mutate({
      reportDate: activeReportDate,
      shiftLabel: activeShiftLabel,
      consultationFileName: consultationFile?.name || `${dataSourceSummary || "Docterz API"} (Cons)`,
      procedureFileName: procedureFile?.name || `${dataSourceSummary || "Docterz API"} (Lab)`,
      radiologyFileName: radiologyFile?.name || `${dataSourceSummary || "Docterz API"} (Rad)`,
      totalPatients: totalPatientsCount,
      totalBill: totalBillAmt,
      totalCollected: totalCollAmt,
      totalPending: totalPendAmt,
      realizationRate: realRate,
      totalExpenses: totalExpenses,
      netCollections: netCollections,
      patientMix: mixText,
      summaryData: {
        revenueCategories,
        itemsBilled,
        visitsByPurposeData,
        collectionsByPaymentModeData,
        collectionsByDoctorData,
        visitsByScheduleData,
        visitsByTimeSlotData,
        revenueSummaryData,
        expenses,
        totalExpenses,
        netCollections,
        admissions: activeAdmissions,
        discharges: activeDischarges,
        cashDenominations,
        handoverSummary: {
          opdCollections: opdGrossCollections,
          admissionTotal,
          dischargeTotal,
          grandTotal,
          expenditure: totalExpenses,
          cardSale: effectiveOnlinePayments,
          onlinePayments: effectiveOnlinePayments,
          onlineBreakdown: {
            app: opdOnlinePayments.app,
            card: opdOnlinePayments.card,
            upi: opdOnlinePayments.upi,
            otherOnline: opdOnlinePayments.otherOnline,
          },
          advanceHandover: effectiveAdvHandover,
          cashToHandover,
          actualCashCounted,
          cashDifference,
        },
        signatures: {
          handedOverBy: handedOverBy || reportPreparedBy || currentUserName,
          receivedBy,
          remarks: handoverRemarks,
        },
        preparedBy: handedOverBy || reportPreparedBy || currentUserName,
        shiftLabel: activeShiftLabel,
      },
      patientData: compiledPatients,
    });
  };

  // ── Keyboard shortcut Ctrl+S to save report to archive ───────────────
  const handleSaveToArchiveRef = React.useRef<() => void>(undefined);
  handleSaveToArchiveRef.current = handleSaveToArchive;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (saveMutation.isPending) return;
        handleSaveToArchiveRef.current?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [saveMutation.isPending]);

  // Load a saved report from history
  const handleLoadSavedReport = async (reportId: number) => {
    try {
      const res = await fetch(`/api/front-office/reports/${reportId}`);
      if (!res.ok) throw new Error("Failed to load report");
      const data = await res.json();

      let parsedPatients = data.patientData;
      if (typeof parsedPatients === "string") {
        try { parsedPatients = JSON.parse(parsedPatients); } catch { parsedPatients = []; }
      }
      const rawPatients: CompiledPatient[] = Array.isArray(parsedPatients) ? parsedPatients : [];
      rawPatients.sort((a, b) => comparePatientConsultationTiming(a, b));
      setCompiledPatients(rawPatients);

      // Restore individual rows from patientData with dates converted to Date objects
      const restoredConsultations: ConsultationRow[] = rawPatients.flatMap((p) =>
        (p.consultations || []).map((c) => ({
          ...c,
          dateObj: c.dateObj ? new Date(c.dateObj) : parseDate(c.dateText),
        }))
      );

      const restoredServices: ProcedureRow[] = rawPatients.flatMap((p) =>
        (p.procedures || []).map((pr) => ({
          ...pr,
          dateObj: pr.dateObj ? new Date(pr.dateObj) : parseDate(pr.dateText),
        }))
      );

      const restoredAllRows: FrontOfficeRow[] = [...restoredConsultations, ...restoredServices];

      setConsultationRows(restoredConsultations);
      setServiceRows(restoredServices);
      setAllRows(restoredAllRows);

      let summaryObj = data.summaryData;
      if (typeof summaryObj === "string") {
        try { summaryObj = JSON.parse(summaryObj); } catch { summaryObj = null; }
      }

      let loadedExpenses: FrontOfficeExpense[] = [];
      if (summaryObj) {
        setArchivedSummaryData(summaryObj);

        if (summaryObj.revenueCategories && Array.isArray(summaryObj.revenueCategories) && summaryObj.revenueCategories.length > 0) {
          setRevenueCategories(summaryObj.revenueCategories);
        } else {
          setRevenueCategories(calculateRevenueCategories(restoredConsultations, restoredServices));
        }

        if (summaryObj.itemsBilled && Array.isArray(summaryObj.itemsBilled) && summaryObj.itemsBilled.length > 0) {
          setItemsBilled(summaryObj.itemsBilled);
        } else {
          setItemsBilled(calculateItemBreakdown(restoredServices));
        }

        if (summaryObj.expenses && Array.isArray(summaryObj.expenses)) {
          loadedExpenses = summaryObj.expenses.map((e: any) => ({
            id: e.id || `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            category: e.category || "Miscellaneous",
            description: e.description || "",
            amount: Number(e.amount || 0),
            paymentMode: e.paymentMode || "Cash",
            voucherNumber: e.voucherNumber || undefined,
          }));
        }

        if (summaryObj.admissions && Array.isArray(summaryObj.admissions) && summaryObj.admissions.length > 0) {
          setAdmissions(summaryObj.admissions);
        } else {
          setAdmissions(createDefaultAdmissions());
        }

        if (summaryObj.discharges && Array.isArray(summaryObj.discharges) && summaryObj.discharges.length > 0) {
          setDischarges(summaryObj.discharges);
        } else {
          setDischarges(createDefaultDischarges());
        }

        if (summaryObj.cashDenominations) {
          setCashDenominations(summaryObj.cashDenominations);
        } else {
          setCashDenominations({ 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 });
        }

        if (summaryObj.handoverSummary) {
          if (summaryObj.handoverSummary.onlinePayments !== undefined) {
            setOnlinePaymentsInput(String(summaryObj.handoverSummary.onlinePayments));
          } else if (summaryObj.handoverSummary.cardSale !== undefined) {
            setOnlinePaymentsInput(String(summaryObj.handoverSummary.cardSale));
          }
          if (summaryObj.handoverSummary.advanceHandover !== undefined) {
            setAdvanceHandoverInput(String(summaryObj.handoverSummary.advanceHandover));
          }
        }

        if (summaryObj.signatures) {
          setHandedOverBy(summaryObj.signatures.handedOverBy || "");
          setReceivedBy(summaryObj.signatures.receivedBy || "");
          setHandoverRemarks(summaryObj.signatures.remarks || "");
        }
      } else {
        setArchivedSummaryData(null);
        setRevenueCategories(calculateRevenueCategories(restoredConsultations, restoredServices));
        setItemsBilled(calculateItemBreakdown(restoredServices));
        setAdmissions(createDefaultAdmissions());
        setDischarges(createDefaultDischarges());
        setCashDenominations({ 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0 });
      }

      setExpenses(loadedExpenses);

      const computedKpis = calculateKPIs(restoredAllRows);
      setKpis({
        totalPatients: data.totalPatients || computedKpis.totalPatients,
        totalBill: Number(data.totalBill ?? computedKpis.totalBill),
        totalCollected: Number(data.totalCollected ?? computedKpis.totalCollected),
        totalPending: Number(data.totalPending ?? computedKpis.totalPending),
        totalDiscount: computedKpis.totalDiscount,
        realizationRate: Number(data.realizationRate ?? computedKpis.realizationRate),
        patientMixText: data.patientMix || computedKpis.patientMixText,
        consultationCount: computedKpis.consultationCount,
        serviceCount: computedKpis.serviceCount,
      });

      const loadedTotalExpenses = loadedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
      const loadedNetHandover = Number(data.netCollections ?? (Number(data.totalCollected ?? computedKpis.totalCollected) - loadedTotalExpenses));

      setActiveShiftLabel(data.shiftLabel || "Full Day");
      setReportPreparedBy(data.createdByName || "—");

      const dateOnly = String(data.reportDate || "").split("T")[0];
      const verBadge = `v${data.version || 1}${data.isActive ? " (Active)" : " (Superseded)"}`;
      setStatusMessage(
        `Loaded archived report from ${dateOnly} [${data.shiftLabel || "Full Day"} - ${verBadge}] by ${data.createdByName || "Staff"}: ` +
          `${data.totalPatients} patients, ${formatMoney(data.totalCollected)} collected` +
          (loadedTotalExpenses > 0 ? `, ${formatMoney(loadedTotalExpenses)} outflows, ${formatMoney(loadedNetHandover)} net handover.` : ".")
      );
      setActiveTab("dashboard");
      toast.success(
        loadedTotalExpenses > 0
          ? `Archived report loaded (${verBadge}) with ${loadedExpenses.length} expense item(s) (${formatMoney(loadedTotalExpenses)})!`
          : `Archived report loaded (${verBadge}) into dashboard!`
      );
    } catch (err: any) {
      console.error("Error loading archived report:", err);
      toast.error(err.message || "Could not load archived report");
    }
  };

  const hasData = compiledPatients.length > 0 && kpis !== null;

  return (
    <div className="space-y-6">
      {/* Header Banner with Acme Branding */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-800 to-green-800 text-white shadow-xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wider uppercase text-emerald-200">
                <Activity className="size-3.5" />
                Acme Fertility &amp; Healthcare Centre
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md text-xs font-semibold text-emerald-200 border border-emerald-400/30">
                <Clock className="size-3.5" />
                <span>Shift: {activeShiftLabel}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-emerald-100 border border-white/20">
                <UserCheck className="size-3.5" />
                <span>Prepared by: {reportPreparedBy || currentUserName}</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Front Office Shift Operations &amp; Revenue Dashboard
            </h1>
            <p className="text-emerald-100 text-sm max-w-2xl">
              Upload the daily Consultation, Laboratory, and Radiology reports. Transactions are auto-filtered by shift window (Morning, Afternoon, or Night) and reconciled by Patient UID.
            </p>
          </div>

          {/* Tab buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center bg-black/20 p-1.5 rounded-xl backdrop-blur-md border border-white/10">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "dashboard" ? "bg-white text-emerald-950 shadow-sm" : "text-white/80 hover:text-white"
              }`}
            >
              Live OPD Dashboard
            </button>
            <button
              onClick={() => setActiveTab("handover")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "handover" ? "bg-white text-emerald-950 shadow-sm" : "text-white/80 hover:text-white"
              }`}
            >
              <Coins className="size-3.5 text-amber-300" />
              Shift Handover Sheet
              {actualCashCounted > 0 && (
                <span
                  className={cn(
                    "px-1.5 py-0.5 text-[10px] font-extrabold rounded-md ml-0.5",
                    cashDifference === 0
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-400 text-amber-950"
                  )}
                >
                  {cashDifference === 0 ? "✓ Balanced" : `Diff: ${cashDifference > 0 ? "+" : ""}${cashDifference}`}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "history" ? "bg-white text-emerald-950 shadow-sm" : "text-white/80 hover:text-white"
              }`}
            >
              <History className="size-3.5" />
              Saved Archives ({reportsPagination.totalRecords || 0})
            </button>
            <button
              onClick={() => setActiveTab("shifts")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "shifts" ? "bg-white text-emerald-950 shadow-sm" : "text-white/80 hover:text-white"
              }`}
            >
              <Clock className="size-3.5" />
              Shift Timings ({activeShifts.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === "shifts" ? (
        /* Shift Management Tab */
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="size-5 text-emerald-600" />
                  Front Office Shift Configurations
                </CardTitle>
                <CardDescription>
                  Manage the 3 daily shift time boundaries. Front Office CSV transactions are filtered automatically based on these time windows.
                </CardDescription>
              </div>
              {isAdmin && !isAddingShift && (
                <Button
                  size="sm"
                  onClick={() => {
                    setIsAddingShift(true);
                    setEditingShift({ name: "", startTime: "08:00", endTime: "16:00", sortOrder: (activeShifts.length + 1), isActive: true });
                  }}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  Add Custom Shift
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add / Edit Form */}
              {(isAddingShift || editingShift) && (
                <Card className="border border-emerald-500/30 bg-emerald-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                      {editingShift?.id ? `Edit Shift: ${editingShift.name}` : "Create New Front Office Shift"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!editingShift?.name?.trim()) {
                          toast.error("Shift name is required");
                          return;
                        }
                        if (!editingShift?.startTime || !editingShift?.endTime) {
                          toast.error("Both start and end time are required in HH:mm format");
                          return;
                        }
                        if (editingShift.id) {
                          updateShiftMutation.mutate(editingShift as any);
                        } else {
                          createShiftMutation.mutate({
                            name: editingShift.name.trim(),
                            startTime: editingShift.startTime,
                            endTime: editingShift.endTime,
                            sortOrder: Number(editingShift.sortOrder || 1),
                            isActive: editingShift.isActive ?? true,
                          });
                        }
                      }}
                      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end"
                    >
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold">Shift Name *</label>
                        <Input
                          placeholder="e.g. Morning Shift"
                          value={editingShift?.name || ""}
                          onChange={(e) => setEditingShift((prev) => ({ ...prev, name: e.target.value }))}
                          className="h-8 text-xs bg-background"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold">Start Time (HH:mm) *</label>
                        <Input
                          type="time"
                          value={editingShift?.startTime || "00:00"}
                          onChange={(e) => setEditingShift((prev) => ({ ...prev, startTime: e.target.value }))}
                          className="h-8 text-xs bg-background"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold">End Time (HH:mm) *</label>
                        <Input
                          type="time"
                          value={editingShift?.endTime || "12:00"}
                          onChange={(e) => setEditingShift((prev) => ({ ...prev, endTime: e.target.value }))}
                          className="h-8 text-xs bg-background"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
                          className="h-8 bg-emerald-700 hover:bg-emerald-800 text-white text-xs cursor-pointer flex-1"
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingShift(null);
                            setIsAddingShift(false);
                          }}
                          className="h-8 text-xs cursor-pointer"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Shifts Table */}
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/60 text-left">
                      <th className="py-3 px-4 font-semibold w-12 text-center">#</th>
                      <th className="py-3 px-4 font-semibold">Shift Name</th>
                      <th className="py-3 px-4 font-semibold text-center">Start Time</th>
                      <th className="py-3 px-4 font-semibold text-center">End Time</th>
                      <th className="py-3 px-4 font-semibold">Shift Coverage</th>
                      <th className="py-3 px-4 font-semibold text-center">Status</th>
                      {isAdmin && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(shiftsQuery.data || []).map((s, idx) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-center text-muted-foreground">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold flex items-center gap-2">
                          {s.name.toLowerCase().includes("morning") ? (
                            <Sunrise className="size-4 text-amber-500" />
                          ) : s.name.toLowerCase().includes("afternoon") ? (
                            <Sun className="size-4 text-orange-500" />
                          ) : (
                            <Moon className="size-4 text-indigo-500" />
                          )}
                          {s.name}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold">{s.startTime}</td>
                        <td className="py-3 px-4 text-center font-mono font-semibold">{s.endTime}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {s.startTime} to {s.endTime}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {s.isActive ? (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Inactive
                            </Badge>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingShift(s);
                                setIsAddingShift(false);
                              }}
                              className="h-7 text-xs cursor-pointer"
                            >
                              <Edit2 className="size-3 mr-1" />
                              Edit
                            </Button>
                            {s.isActive && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  if (confirm(`Deactivate shift "${s.name}"?`)) {
                                    deleteShiftMutation.mutate(s.id);
                                  }
                                }}
                                className="h-7 text-xs text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                Deactivate
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : activeTab === "history" ? (
        /* Saved Archives View */
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col gap-3 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="size-5 text-teal-600" />
                  Archived Daily Front Office Reports
                </CardTitle>
                <CardDescription>
                  Saved shift reports with version tracking. The latest version per date &amp; shift is always active.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={showAllVersions ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setShowAllVersions(!showAllVersions);
                    setArchivePage(1);
                  }}
                  className="text-xs gap-1.5 cursor-pointer h-8"
                >
                  <Sliders className="size-3.5" />
                  {showAllVersions ? "Showing All Versions" : "Active Reports Only"}
                </Button>
              </div>
            </div>

            {/* Filter & Page Size Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
              <div className="relative flex-1 min-w-[220px] max-w-sm">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search date, shift, file, staff..."
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  className="h-8 pl-8 pr-8 text-xs"
                />
                {archiveSearch && (
                  <button
                    onClick={() => setArchiveSearch("")}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span>Rows:</span>
                  <select
                    value={archivePageSize}
                    onChange={(e) => {
                      setArchivePageSize(Number(e.target.value));
                      setArchivePage(1);
                    }}
                    className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </select>
                </div>
                <span className="text-muted-foreground/60">|</span>
                <span>
                  Total: <strong className="text-foreground">{reportsPagination.totalRecords}</strong> reports
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {savedReportsQuery.isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading saved reports...</div>
            ) : !reportsList.length ? (
              <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                {debouncedArchiveSearch ? (
                  <div>
                    <p className="font-medium text-foreground">No reports match "{debouncedArchiveSearch}"</p>
                    <p className="text-xs text-muted-foreground mt-1">Try refining your search term or clear the filter.</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setArchiveSearch("")}
                      className="mt-3 text-xs h-7"
                    >
                      Clear Filter
                    </Button>
                  </div>
                ) : (
                  <>
                    No archived reports found yet. Upload CSVs and press <kbd className="px-1.5 py-0.5 rounded bg-muted border font-mono text-[10px]">Ctrl+S</kbd> or click "Save to Archive" to store reports here.
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-left">
                        <th className="py-3 px-4 font-semibold">Report Date</th>
                        <th className="py-3 px-4 font-semibold">Shift Window &amp; Version</th>
                        <th className="py-3 px-4 font-semibold">Prepared By</th>
                        <th className="py-3 px-4 font-semibold">Patients</th>
                        <th className="py-3 px-4 font-semibold text-right">Total Billed</th>
                        <th className="py-3 px-4 font-semibold text-right">Collected</th>
                        <th className="py-3 px-4 font-semibold text-right">Outflows</th>
                        <th className="py-3 px-4 font-semibold text-right">Net Handover</th>
                        <th className="py-3 px-4 font-semibold text-right">Pending</th>
                        <th className="py-3 px-4 font-semibold text-right">Realization</th>
                        <th className="py-3 px-4 font-semibold">Files</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportsList.map((r: any) => (
                        <tr key={r.id} className="border-b hover:bg-muted/40 transition-colors">
                          <td className="py-3 px-4 font-medium flex items-center gap-2">
                            <Calendar className="size-4 text-muted-foreground" />
                            {r.reportDate}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30">
                                {r.shiftLabel || "Full Day"}
                              </Badge>
                              <Badge variant="secondary" className="font-mono text-[10px] font-bold px-1.5 py-0 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                v{r.version || 1}
                              </Badge>
                              {r.isActive ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] py-0">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground text-[10px] py-0 border-muted-foreground/30">
                                  Superseded
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-xs flex items-center gap-1.5">
                              <UserCheck className="size-3.5 text-muted-foreground" />
                              {r.createdByName || "Staff"}
                            </span>
                          </td>
                          <td className="py-3 px-4">{r.totalPatients}</td>
                          <td className="py-3 px-4 text-right font-medium">{formatMoney(r.totalBill)}</td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {formatMoney(r.totalCollected)}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-orange-600 dark:text-orange-400">
                            {Number(r.totalExpenses || 0) > 0 ? (
                              formatMoney(r.totalExpenses)
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700 dark:text-emerald-300">
                            {formatMoney(r.netCollections ?? (Number(r.totalCollected || 0) - Number(r.totalExpenses || 0)))}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-rose-600 dark:text-rose-400">
                            {formatMoney(r.totalPending)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge variant="outline">{Number(r.realizationRate || 0).toFixed(1)}%</Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground max-w-48 truncate">
                            {[r.consultationFileName, r.procedureFileName, r.radiologyFileName].filter(Boolean).join(", ")}
                          </td>
                          <td className="py-3 px-4 text-right space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => handleLoadSavedReport(r.id)}
                            >
                              Load View
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:bg-destructive/10 cursor-pointer"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this archived report?")) {
                                  deleteMutation.mutate(r.id);
                                }
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t text-xs text-muted-foreground">
                  <div>
                    Showing{" "}
                    <span className="font-semibold text-foreground">
                      {reportsPagination.totalRecords > 0
                        ? (reportsPagination.page - 1) * reportsPagination.pageSize + 1
                        : 0}
                    </span>{" "}
                    to{" "}
                    <span className="font-semibold text-foreground">
                      {Math.min(
                        reportsPagination.page * reportsPagination.pageSize,
                        reportsPagination.totalRecords
                      )}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-foreground">
                      {reportsPagination.totalRecords}
                    </span>{" "}
                    reports
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reportsPagination.page <= 1}
                      onClick={() => setArchivePage(1)}
                      className="h-8 w-8 p-0 cursor-pointer disabled:cursor-not-allowed"
                      title="First Page"
                    >
                      <ChevronsLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reportsPagination.page <= 1}
                      onClick={() => setArchivePage((p) => Math.max(1, p - 1))}
                      className="h-8 w-8 p-0 cursor-pointer disabled:cursor-not-allowed"
                      title="Previous Page"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>

                    <div className="px-2 font-medium text-foreground">
                      Page {reportsPagination.page} of {reportsPagination.totalPages}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reportsPagination.page >= reportsPagination.totalPages}
                      onClick={() => setArchivePage((p) => Math.min(reportsPagination.totalPages, p + 1))}
                      className="h-8 w-8 p-0 cursor-pointer disabled:cursor-not-allowed"
                      title="Next Page"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={reportsPagination.page >= reportsPagination.totalPages}
                      onClick={() => setArchivePage(reportsPagination.totalPages)}
                      className="h-8 w-8 p-0 cursor-pointer disabled:cursor-not-allowed"
                      title="Last Page"
                    >
                      <ChevronsRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : activeTab === "handover" ? (
        /* Shift Handover Sheet (Physical Form) View */
        <div className="space-y-6">
          {/* Action & Configuration Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-card border shadow-xs no-print">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Calendar className="size-4 text-emerald-600" />
                  Report Date:
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs font-semibold justify-start text-left px-2.5 gap-2 min-w-[130px] bg-background hover:bg-muted/50 cursor-pointer"
                    >
                      <span>
                        {activeReportDate
                          ? format(parseISO(activeReportDate), "dd MMM yyyy")
                          : "Pick a date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={activeReportDate ? parseISO(activeReportDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          const yyyy = date.getFullYear();
                          const mm = String(date.getMonth() + 1).padStart(2, "0");
                          const dd = String(date.getDate()).padStart(2, "0");
                          setActiveReportDate(`${yyyy}-${mm}-${dd}`);
                        }
                      }}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="size-4 text-emerald-600" />
                <label className="text-xs font-bold">Shift:</label>
                <select
                  value={selectedShiftOption}
                  onChange={(e) => {
                    setSelectedShiftOption(e.target.value);
                    const matched = activeShifts.find((s) => String(s.id) === e.target.value);
                    if (matched) {
                      setActiveShiftLabel(`${matched.name} (${matched.startTime} – ${matched.endTime})`);
                    } else if (e.target.value === "all") {
                      setActiveShiftLabel("Full Day (All Hours)");
                    }
                  }}
                  className="h-8 text-xs font-semibold rounded-md border bg-background px-2.5 py-1 text-foreground"
                >
                  <option value="auto">⚡ Auto Shift</option>
                  {activeShifts.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name} ({s.startTime} – {s.endTime})
                    </option>
                  ))}
                  <option value="all">🌐 Full Day</option>
                </select>
              </div>

              {opdGrossCollections > 0 && (
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30">
                  Linked OPD Realized: {formatMoney(opdGrossCollections)}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                className="gap-1.5 cursor-pointer text-xs h-8"
              >
                <FileDown className="size-3.5 text-rose-600" />
                Download PDF
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveToArchive}
                disabled={saveMutation.isPending}
                className="gap-1.5 cursor-pointer text-xs h-8 bg-slate-900 hover:bg-slate-800 text-white"
                title="Keyboard Shortcut: Ctrl+S"
              >
                <Save className="size-3.5" />
                {saveMutation.isPending ? "Saving..." : "Save to Archive"}
                <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[9px] font-mono font-medium rounded bg-white/20 text-white border border-white/30">Ctrl+S</kbd>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetHandoverForm}
                className="text-xs h-8 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Reset handover form"
              >
                <RotateCcw className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Printable Handover Sheet Container */}
          <div id="printableHandoverSheet" className="space-y-6 bg-card border rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Sheet Title & Header */}
            <div className="border-b pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground uppercase">
                  Acme Fertility &amp; Healthcare Centre
                </h2>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">
                  Daily Front Office Shift Handover &amp; Financial Closing Form
                </p>
              </div>
              <div className="flex flex-col sm:items-end gap-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-semibold">Date:</span>
                  <span className="font-bold text-foreground font-mono">{activeReportDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-semibold">Shift Window:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{activeShiftLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-semibold">Counter Executive:</span>
                  <span className="font-bold text-foreground">{handedOverBy || currentUserName}</span>
                </div>
              </div>
            </div>

            {/* SECTION 1: ADMISSION / ADVANCE / IVF / PRE BOOKING */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-600 inline-block no-print" />
                  1. Admission / Advance / IVF / Pre Booking
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground hidden sm:inline">Total:</span>
                  <Badge variant="secondary" className="font-bold text-xs bg-blue-500/10 text-blue-800 dark:text-blue-300">
                    {formatMoney(admissionTotal)}
                  </Badge>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/70 border-b text-slate-700 dark:text-slate-200 font-bold uppercase text-[11px]">
                      <th className="py-2 px-3 text-center w-12">SL.NO.</th>
                      <th className="py-2 px-3 text-left min-w-[200px]">PATIENT NAME</th>
                      <th className="py-2 px-3 text-right w-36">AMOUNT (₹)</th>
                      <th className="py-2 px-3 text-left min-w-[220px]">REMARK</th>
                      <th className="py-2 px-2 text-center w-10 no-print"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {admissions.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-muted/20">
                        <td className="py-1.5 px-3 text-center text-muted-foreground font-semibold font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3">
                          <Input
                            value={row.patientName}
                            onChange={(e) => handleUpdateAdmission(row.id, "patientName", e.target.value)}
                            placeholder="Patient full name"
                            className="h-8 text-xs border-transparent hover:border-input focus:border-input bg-transparent font-medium"
                          />
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={row.amount === 0 ? "" : row.amount}
                            onChange={(e) => handleUpdateAdmission(row.id, "amount", Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0"
                            className="h-8 text-xs text-right font-bold text-blue-700 dark:text-blue-400 border-transparent hover:border-input focus:border-input bg-transparent font-mono"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <Input
                            value={row.remark}
                            onChange={(e) => handleUpdateAdmission(row.id, "remark", e.target.value)}
                            placeholder="e.g. IVF Booking, IPD Advance room 102"
                            className="h-8 text-xs border-transparent hover:border-input focus:border-input bg-transparent text-muted-foreground"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center no-print">
                          <button
                            type="button"
                            onClick={() => handleRemoveAdmissionRow(row.id)}
                            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 border-t font-black">
                      <td colSpan={2} className="py-2 px-3 text-right text-xs">
                        TOTAL :
                      </td>
                      <td className="py-2 px-3 text-right text-xs font-black text-blue-700 dark:text-blue-400 font-mono">
                        {formatMoney(admissionTotal)}
                      </td>
                      <td colSpan={2} className="py-2 px-3 no-print">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleAddAdmissionRow}
                          className="text-xs h-7 gap-1 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 cursor-pointer font-bold"
                        >
                          <Plus className="size-3.5" />
                          Add Row
                        </Button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* SECTION 2: DISCHARGE */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-teal-600 inline-block no-print" />
                  2. Discharge
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground hidden sm:inline">Total:</span>
                  <Badge variant="secondary" className="font-bold text-xs bg-teal-500/10 text-teal-800 dark:text-teal-300">
                    {formatMoney(dischargeTotal)}
                  </Badge>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/70 border-b text-slate-700 dark:text-slate-200 font-bold uppercase text-[11px]">
                      <th className="py-2 px-3 text-center w-12">SL.NO.</th>
                      <th className="py-2 px-3 text-left min-w-[200px]">PATIENT NAME</th>
                      <th className="py-2 px-3 text-right w-36">AMOUNT (₹)</th>
                      <th className="py-2 px-3 text-left min-w-[220px]">REMARK</th>
                      <th className="py-2 px-2 text-center w-10 no-print"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {discharges.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-muted/20">
                        <td className="py-1.5 px-3 text-center text-muted-foreground font-semibold font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3">
                          <Input
                            value={row.patientName}
                            onChange={(e) => handleUpdateDischarge(row.id, "patientName", e.target.value)}
                            placeholder="Patient full name"
                            className="h-8 text-xs border-transparent hover:border-input focus:border-input bg-transparent font-medium"
                          />
                        </td>
                        <td className="py-1.5 px-3 text-right">
                          <Input
                            type="number"
                            min="0"
                            step="any"
                            value={row.amount === 0 ? "" : row.amount}
                            onChange={(e) => handleUpdateDischarge(row.id, "amount", Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="0"
                            className="h-8 text-xs text-right font-bold text-teal-700 dark:text-teal-400 border-transparent hover:border-input focus:border-input bg-transparent font-mono"
                          />
                        </td>
                        <td className="py-1.5 px-3">
                          <Input
                            value={row.remark}
                            onChange={(e) => handleUpdateDischarge(row.id, "remark", e.target.value)}
                            placeholder="e.g. Normal Delivery final clearance"
                            className="h-8 text-xs border-transparent hover:border-input focus:border-input bg-transparent text-muted-foreground"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center no-print">
                          <button
                            type="button"
                            onClick={() => handleRemoveDischargeRow(row.id)}
                            className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                            title="Remove row"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 border-t font-black">
                      <td colSpan={2} className="py-2 px-3 text-right text-xs">
                        TOTAL :
                      </td>
                      <td className="py-2 px-3 text-right text-xs font-black text-teal-700 dark:text-teal-400 font-mono">
                        {formatMoney(dischargeTotal)}
                      </td>
                      <td colSpan={2} className="py-2 px-3 no-print">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleAddDischargeRow}
                          className="text-xs h-7 gap-1 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 cursor-pointer font-bold"
                        >
                          <Plus className="size-3.5" />
                          Add Row
                        </Button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* SECTION 3: EXPENDITURE INCURRED */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-600 inline-block no-print" />
                  3. Expenditure Incurred
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground hidden sm:inline">Total:</span>
                  <Badge variant="secondary" className="font-bold text-xs bg-amber-500/10 text-amber-800 dark:text-amber-300">
                    {formatMoney(totalExpenses)}
                  </Badge>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/70 border-b text-slate-700 dark:text-slate-200 font-bold uppercase text-[11px]">
                      <th className="py-2 px-3 text-center w-12">SL.NO.</th>
                      <th className="py-2 px-3 text-left">DETAILS</th>
                      <th className="py-2 px-3 text-center w-28 no-print">CATEGORY</th>
                      <th className="py-2 px-3 text-right w-36">AMOUNT (₹)</th>
                      <th className="py-2 px-2 text-center w-10 no-print"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {expenses.length > 0 ? (
                      expenses.map((e, idx) => (
                        <tr key={e.id} className="hover:bg-muted/20">
                          <td className="py-2 px-3 text-center text-muted-foreground font-semibold font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-medium text-foreground">
                            {e.description || e.category}
                            {e.voucherNumber ? <span className="ml-2 text-[10px] text-muted-foreground font-mono">Ref: {e.voucherNumber}</span> : null}
                          </td>
                          <td className="py-2 px-3 text-center no-print">
                            <Badge variant="outline" className="text-[10px] py-0 font-normal">
                              {e.category}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-amber-700 dark:text-amber-400 font-mono">
                            {formatMoney(e.amount)}
                          </td>
                          <td className="py-2 px-2 text-center no-print">
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(e.id)}
                              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors cursor-pointer"
                              title="Delete expense"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-3 px-3 text-center text-muted-foreground italic">
                          No expenditures incurred yet this shift.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/50 border-t font-black">
                      <td colSpan={2} className="py-2 px-3 text-right text-xs">
                        TOTAL :
                      </td>
                      <td className="py-2 px-3 text-center no-print"></td>
                      <td className="py-2 px-3 text-right text-xs font-black text-amber-700 dark:text-amber-400 font-mono">
                        {formatMoney(totalExpenses)}
                      </td>
                      <td className="no-print"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Quick Expense Add Bar in Handover Form */}
              <form
                onSubmit={handleAddExpense}
                className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-muted/30 border text-xs no-print"
              >
                <span className="font-bold text-muted-foreground text-[11px] uppercase tracking-wide">
                  + Quick Add Outflow:
                </span>
                <Input
                  placeholder="Expense Details (e.g. Courier, Doctor tea, Patient refund)"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="h-8 text-xs flex-1 min-w-[180px]"
                />
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="h-8 text-xs rounded-md border bg-background px-2 py-1 text-foreground"
                >
                  {FRONT_OFFICE_EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <Input
                  type="number"
                  placeholder="Amount ₹"
                  min="1"
                  step="any"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="h-8 text-xs w-24 text-right font-bold"
                />
                <Button type="submit" size="sm" className="h-8 bg-amber-600 hover:bg-amber-700 text-white gap-1 cursor-pointer">
                  <Plus className="size-3.5" />
                  Add
                </Button>
              </form>
            </div>

            {/* SECTION 4: TWO-COLUMN BOTTOM LAYOUT (CASH DETAIL & HANDOVER SUMMARY BOX) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 items-start">
              {/* Left Column: CASH DETAIL (Denominations) */}
              <div className="lg:col-span-6 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Coins className="size-4 text-emerald-600" />
                    Cash Detail (Currency Denominations)
                  </h3>
                  <button
                    type="button"
                    onClick={handleClearDenominations}
                    className="text-[11px] text-muted-foreground hover:text-destructive underline cursor-pointer no-print"
                  >
                    Clear All
                  </button>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/70 border-b text-slate-700 dark:text-slate-200 font-bold uppercase text-[11px]">
                        <th className="py-2.5 px-3 text-center w-24">NOTE</th>
                        <th className="py-2.5 px-3 text-center w-32">NUMBER</th>
                        <th className="py-2.5 px-3 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {FRONT_OFFICE_DENOMINATIONS.map((note) => {
                        const count = cashDenominations[note] || 0;
                        const rowTotal = note * count;
                        return (
                          <tr key={note} className="hover:bg-muted/20">
                            <td className="py-2 px-3 text-center font-bold text-foreground font-mono text-sm">
                              {note}x
                            </td>
                            <td className="py-1 px-3 text-center">
                              <Input
                                type="number"
                                min="0"
                                value={count === 0 ? "" : count}
                                onChange={(e) => handleUpdateDenomination(note, e.target.value)}
                                placeholder="0"
                                className="h-8 text-xs text-center font-bold font-mono w-24 mx-auto"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-foreground font-mono text-sm">
                              {formatMoney(rowTotal)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/60 border-t-2 border-border font-black">
                        <td className="py-2.5 px-3 text-center text-xs uppercase">
                          TOTAL
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs font-mono text-muted-foreground">
                          {denominationCalc.totalCount} notes
                        </td>
                        <td className="py-2.5 px-3 text-right text-sm font-black text-emerald-700 dark:text-emerald-400 font-mono">
                          {formatMoney(actualCashCounted)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Right Column: HANDOVER SUMMARY BOX */}
              <div className="lg:col-span-6 space-y-2">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Receipt className="size-4 text-emerald-600" />
                  Shift Handover Reconciliation Summary
                </h3>

                {/* The Box */}
                <div className="rounded-xl border-2 border-slate-700 dark:border-slate-300 bg-card p-5 space-y-4 shadow-sm">
                  {/* GRAND TOTAL */}
                  <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider text-foreground">
                        GRAND TOTAL -
                      </span>
                      {opdGrossCollections > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          OPD ({formatMoney(opdGrossCollections)}) + Adm ({formatMoney(admissionTotal)}) + Dis ({formatMoney(dischargeTotal)})
                        </p>
                      )}
                    </div>
                    <span className="text-base sm:text-lg font-black font-mono text-foreground">
                      {formatMoney(grandTotal)}
                    </span>
                  </div>

                  {/* EXPENDITURE */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      EXPENDITURE -
                    </span>
                    <span className="text-sm font-bold font-mono text-amber-700 dark:text-amber-400">
                      - {formatMoney(totalExpenses)}
                    </span>
                  </div>

                  {/* ONLINE / DIGITAL PAYMENTS (APP, CARD, UPI) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          ONLINE / APP / CARD / UPI -
                        </span>
                        {opdOnlinePayments.total > 0 && (
                          <Badge variant="outline" className="text-[10px] font-mono py-0 h-4 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                            Fetched: {formatMoney(opdOnlinePayments.total)}
                          </Badge>
                        )}
                      </div>

                      {/* Detailed Mode Breakdown Pills */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded bg-muted/70">
                          App: <strong className="font-mono text-foreground">{formatMoney(opdOnlinePayments.app)}</strong>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-muted/70">
                          Card: <strong className="font-mono text-foreground">{formatMoney(opdOnlinePayments.card)}</strong>
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-muted/70">
                          UPI: <strong className="font-mono text-foreground">{formatMoney(opdOnlinePayments.upi)}</strong>
                        </span>
                        {opdOnlinePayments.otherOnline > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-muted/70">
                            Other: <strong className="font-mono text-foreground">{formatMoney(opdOnlinePayments.otherOnline)}</strong>
                          </span>
                        )}
                      </div>

                      {/* Quick Action buttons */}
                      {opdOnlinePayments.total > 0 && (
                        <div className="no-print pt-0.5 flex items-center gap-2">
                          {onlinePaymentsInput.trim() !== "" && parseFloat(onlinePaymentsInput) !== opdOnlinePayments.total ? (
                            <button
                              type="button"
                              onClick={() => setOnlinePaymentsInput(String(opdOnlinePayments.total))}
                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                            >
                              <RotateCcw className="size-2.5 inline" /> Reset to Fetched ({formatMoney(opdOnlinePayments.total)})
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setOnlinePaymentsInput(String(opdOnlinePayments.total))}
                              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              Use Calculated Online Collections ({formatMoney(opdOnlinePayments.total)})
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-mono">-</span>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={onlinePaymentsInput}
                        onChange={(e) => setOnlinePaymentsInput(e.target.value)}
                        placeholder={opdOnlinePayments.total > 0 ? String(opdOnlinePayments.total) : "0"}
                        className="h-8 text-xs text-right font-bold font-mono w-28 text-blue-700 dark:text-blue-400"
                      />
                    </div>
                  </div>

                  {/* ADV. HANDOVER */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        ADV. HANDOVER -
                      </span>
                      <p className="text-[10px] text-muted-foreground">Mid-shift handover to Sir / Madam / Accounts</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground font-mono">-</span>
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        value={advanceHandoverInput}
                        onChange={(e) => setAdvanceHandoverInput(e.target.value)}
                        placeholder="0"
                        className="h-8 text-xs text-right font-bold font-mono w-28 text-purple-700 dark:text-purple-400"
                      />
                    </div>
                  </div>

                  {/* CASH TO HANDOVER */}
                  <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1 pb-2">
                    <span className="text-sm font-black uppercase tracking-wider text-foreground">
                      CASH TO HANDOVER -
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                      {formatMoney(cashToHandover)}
                    </span>
                  </div>

                  {/* Cash Drawer Comparison / Balancing Alert */}
                  <div className="pt-2 border-t">
                    <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between mb-1.5">
                      <span>Drawer Cash Counted: <strong className="font-mono text-foreground">{formatMoney(actualCashCounted)}</strong></span>
                      <span>Expected: <strong className="font-mono text-foreground">{formatMoney(cashToHandover)}</strong></span>
                    </div>

                    {actualCashCounted === 0 && cashToHandover > 0 ? (
                      <div className="p-2.5 rounded-lg bg-muted/60 text-muted-foreground text-xs text-center">
                        Count currency notes in the <strong>Cash Detail</strong> table on the left to reconcile physical cash.
                      </div>
                    ) : cashDifference === 0 ? (
                      <div className="p-2.5 rounded-lg bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 border border-emerald-500/30 text-xs font-bold flex items-center gap-2">
                        <Check className="size-4 text-emerald-600 shrink-0" />
                        <span>✓ PERFECT MATCH: Physical cash in drawer equals expected handover (₹0 variance)!</span>
                      </div>
                    ) : cashDifference > 0 ? (
                      <div className="p-2.5 rounded-lg bg-blue-500/15 text-blue-900 dark:text-blue-200 border border-blue-500/30 text-xs font-bold flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Coins className="size-4 text-blue-600 shrink-0" />
                          <span>SURPLUS CASH IN DRAWER:</span>
                        </div>
                        <span className="font-mono text-sm font-black text-blue-700 dark:text-blue-300">
                          +{formatMoney(cashDifference)}
                        </span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-rose-500/15 text-rose-900 dark:text-rose-200 border border-rose-500/30 text-xs font-bold flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="size-4 text-rose-600 shrink-0" />
                          <span>CASH SHORTAGE IN DRAWER:</span>
                        </div>
                        <span className="font-mono text-sm font-black text-rose-700 dark:text-rose-300">
                          -{formatMoney(Math.abs(cashDifference))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 5: SIGNATURE & HANDOVER DETAILS */}
            <div className="pt-6 border-t space-y-4">
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserCheck className="size-4 text-emerald-600" />
                Signatures &amp; Handover Confirmation
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Handed Over By (Staff Name) *</label>
                  <Input
                    value={handedOverBy}
                    onChange={(e) => setHandedOverBy(e.target.value)}
                    placeholder={reportPreparedBy || currentUserName}
                    className="h-9 text-xs font-semibold"
                  />
                  <div className="h-10 border-b border-dashed border-muted-foreground/50 mt-3 flex items-end">
                    <span className="text-[10px] text-muted-foreground italic">Signature of Executive Handing Over</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Received By (Cashier / Next Shift)</label>
                  <Input
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="e.g. Jane Smith (Afternoon Shift)"
                    className="h-9 text-xs"
                  />
                  <div className="h-10 border-b border-dashed border-muted-foreground/50 mt-3 flex items-end">
                    <span className="text-[10px] text-muted-foreground italic">Signature of Executive Receiving Handover</span>
                  </div>
                </div>

                <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                  <label className="text-xs font-bold text-foreground">Handover Remarks &amp; Seal Notes</label>
                  <Input
                    value={handoverRemarks}
                    onChange={(e) => setHandoverRemarks(e.target.value)}
                    placeholder="e.g. Cash drawer verified, physical vouchers attached"
                    className="h-9 text-xs"
                  />
                  <div className="h-10 border-b border-dashed border-muted-foreground/50 mt-3 flex items-end">
                    <span className="text-[10px] text-muted-foreground italic">Verified by Accounts / Management</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Live CSV Dashboard */
        <div className="space-y-6">
          {/* Data Import Card: Direct Docterz API vs Manual CSV Upload */}
          <Card className="shadow-sm border-2 border-emerald-600/30 bg-card/70 backdrop-blur-xs overflow-hidden">
            <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  {importSource === "api" ? (
                    <CloudDownload className="size-5 text-emerald-600" />
                  ) : (
                    <Upload className="size-5 text-emerald-600" />
                  )}
                  {importSource === "api" ? "Direct Docterz API Import" : "Manual CSV File Upload"}
                </CardTitle>
                <CardDescription>
                  {importSource === "api"
                    ? "Directly import Consultation, Laboratory, and Radiology reports from Docterz clinic software without downloading CSVs."
                    : "Upload the 3 daily CSV export files from clinic software."}
                </CardDescription>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg shrink-0 border">
                <button
                  type="button"
                  onClick={() => setImportSource("api")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer",
                    importSource === "api"
                      ? "bg-background text-emerald-700 dark:text-emerald-400 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <CloudDownload className="size-3.5" />
                  Live API (Instant)
                </button>
                <button
                  type="button"
                  onClick={() => setImportSource("csv")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer",
                    importSource === "csv"
                      ? "bg-background text-emerald-700 dark:text-emerald-400 shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Upload className="size-3.5" />
                  Upload CSVs
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {importSource === "api" ? (
                /* Direct API Import View */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {/* Report Date */}
                    <div className="space-y-1.5 md:col-span-4">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-emerald-600" />
                        Report Date *
                      </label>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-9 flex-1 justify-start text-left text-xs font-semibold px-2.5 gap-2 bg-background hover:bg-muted/50 cursor-pointer"
                            >
                              <Calendar className="size-3.5 text-emerald-600 shrink-0" />
                              <span>
                                {apiFetchDate
                                  ? format(parseISO(apiFetchDate), "dd MMM yyyy")
                                  : "Pick a date"}
                              </span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarPicker
                              mode="single"
                              selected={apiFetchDate ? parseISO(apiFetchDate) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  const yyyy = date.getFullYear();
                                  const mm = String(date.getMonth() + 1).padStart(2, "0");
                                  const dd = String(date.getDate()).padStart(2, "0");
                                  setApiFetchDate(`${yyyy}-${mm}-${dd}`);
                                }
                              }}
                              autoFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const now = new Date();
                            const yyyy = now.getFullYear();
                            const mm = String(now.getMonth() + 1).padStart(2, "0");
                            const dd = String(now.getDate()).padStart(2, "0");
                            setApiFetchDate(`${yyyy}-${mm}-${dd}`);
                          }}
                          className="text-xs h-9 px-2.5 cursor-pointer shrink-0"
                          title="Set to today"
                        >
                          Today
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const y = new Date();
                            y.setDate(y.getDate() - 1);
                            const yyyy = y.getFullYear();
                            const mm = String(y.getMonth() + 1).padStart(2, "0");
                            const dd = String(y.getDate()).padStart(2, "0");
                            setApiFetchDate(`${yyyy}-${mm}-${dd}`);
                          }}
                          className="text-xs h-9 px-2.5 cursor-pointer shrink-0"
                          title="Set to yesterday"
                        >
                          Yesterday
                        </Button>
                      </div>
                    </div>

                    {/* Target Shift Window */}
                    <div className="space-y-1.5 md:col-span-5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Clock className="size-3.5 text-emerald-600" />
                          Target Shift Window:
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveTab("shifts")}
                          className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <Sliders className="size-3" />
                          Edit Timings
                        </button>
                      </div>
                      <select
                        value={selectedShiftOption}
                        onChange={(e) => setSelectedShiftOption(e.target.value)}
                        className="w-full h-9 text-xs font-semibold rounded-md border bg-background px-3 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-xs"
                      >
                        <option value="auto">⚡ Auto-detect Shift (based on current time)</option>
                        {activeShifts.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.name} ({s.startTime} – {s.endTime})
                          </option>
                        ))}
                        <option value="all">🌐 Full Day (All 24 Hours / No Filter)</option>
                      </select>
                    </div>

                    {/* Action Button */}
                    <div className="md:col-span-3">
                      <Button
                        onClick={handleFetchLive}
                        disabled={isProcessing || !apiFetchDate}
                        className="w-full gap-2 cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-9 px-4 shadow-sm"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="size-4 animate-spin" />
                            Importing API Data...
                          </>
                        ) : (
                          <>
                            <CloudDownload className="size-4" />
                            Fetch Live &amp; Reconcile
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* API Source Info Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200">
                    <div className="flex items-center gap-2">
                      <Globe className="size-3.5 text-emerald-600" />
                      <span>
                        Connected to <strong>Docterz Clinic API</strong> (Clinic ID: 5760 • OPD Module • 6 Doctors)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {filterStats && (
                        <Badge variant="outline" className="text-[11px] bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30">
                          {filterStats.totalAfter} of {filterStats.totalBefore} items in window
                        </Badge>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDocterzConfigOpen(true)}
                        className="h-7 text-xs px-2.5 gap-1.5 bg-background/80 hover:bg-background border-emerald-500/30 text-emerald-950 dark:text-emerald-100 cursor-pointer shadow-xs"
                        title="Manage Docterz authorization token, API keys, and endpoints"
                      >
                        <Key className="size-3.5 text-emerald-600" />
                        Manage API Headers
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Manual CSV Upload View */
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Consultation CSV */}
                    <div className="p-3.5 rounded-xl border bg-muted/30 flex flex-col gap-2">
                      <label className="text-xs font-bold text-foreground">1. Consultation CSV</label>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                        onChange={(e) => setConsultationFile(e.target.files?.[0] || null)}
                      />
                      {consultationFile && (
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                          ✓ {consultationFile.name}
                        </span>
                      )}
                    </div>

                    {/* Laboratory CSV */}
                    <div className="p-3.5 rounded-xl border bg-muted/30 flex flex-col gap-2">
                      <label className="text-xs font-bold text-foreground">2. Laboratory CSV</label>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                        onChange={(e) => setProcedureFile(e.target.files?.[0] || null)}
                      />
                      {procedureFile && (
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                          ✓ {procedureFile.name}
                        </span>
                      )}
                    </div>

                    {/* Radiology CSV */}
                    <div className="p-3.5 rounded-xl border bg-muted/30 flex flex-col gap-2">
                      <label className="text-xs font-bold text-foreground">3. Radiology CSV</label>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        className="text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
                        onChange={(e) => setRadiologyFile(e.target.files?.[0] || null)}
                      />
                      {radiologyFile && (
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate">
                          ✓ {radiologyFile.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Shift Selection & Reconcile Button */}
                  <div className="mt-4 pt-4 border-t flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-emerald-600 shrink-0" />
                        <label className="text-xs font-bold text-foreground">
                          Target Shift Window:
                        </label>
                      </div>
                      <select
                        value={selectedShiftOption}
                        onChange={(e) => setSelectedShiftOption(e.target.value)}
                        className="h-8 text-xs font-semibold rounded-md border bg-background px-3 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-xs"
                      >
                        <option value="auto">⚡ Auto-detect Shift (based on current time)</option>
                        {activeShifts.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.name} ({s.startTime} – {s.endTime})
                          </option>
                        ))}
                        <option value="all">🌐 Full Day (All 24 Hours / No Filter)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setActiveTab("shifts")}
                        className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Sliders className="size-3" />
                        Configure Timings
                      </button>

                      {filterStats && (
                        <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-normal">
                          Filtered: {filterStats.totalAfter} of {filterStats.totalBefore} items in window
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto">
                      <Button
                        onClick={handleProcessFiles}
                        disabled={isProcessing || !consultationFile || !procedureFile || !radiologyFile}
                        className="gap-2 cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs h-9 px-4 shadow-sm"
                      >
                        <CheckCircle2 className="size-4" />
                        {isProcessing ? "Filtering & Reconciling..." : "Reconcile Shift Dashboard"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="mt-3 p-3 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Bar (PDF, Save Archive) */}
          {hasData && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-card border shadow-xs">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Layers className="size-4 text-teal-600" />
                <span>Actions & Exports:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-1.5 cursor-pointer">
                  <FileDown className="size-3.5 text-rose-600" />
                  Download PDF
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSaveToArchive}
                  disabled={saveMutation.isPending}
                  className="gap-1.5 cursor-pointer bg-slate-900 hover:bg-slate-800 text-white"
                  title="Keyboard Shortcut: Ctrl+S"
                >
                  <Save className="size-3.5" />
                  {saveMutation.isPending ? "Saving..." : "Save to Archive"}
                  <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.2 text-[9px] font-mono font-medium rounded bg-white/20 text-white border border-white/30">Ctrl+S</kbd>
                </Button>
              </div>
            </div>
          )}

          {/* Main Dashboard Content */}
          {!hasData ? (
            <div className="py-20 text-center border border-dashed rounded-2xl bg-card text-muted-foreground space-y-3">
              <Upload className="size-10 mx-auto text-muted-foreground/60" />
              <div className="text-base font-medium">Ready to analyze daily billing</div>
              <p className="text-xs max-w-md mx-auto">
                Please upload the Consultation, Laboratory, and Radiology CSV files above and click "Reconcile & Generate Dashboard".
              </p>
            </div>
          ) : (
            <div id="frontOfficeReportContent" className="space-y-6">
              {/* Active Report Shift & Preparer Metadata Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-muted/40 border border-border">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-foreground">
                    <Clock className="size-4 text-emerald-600" />
                    <span>Shift: {activeShiftLabel}</span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <UserCheck className="size-4 text-primary" />
                    <span>Report Prepared by: <strong className="text-foreground">{reportPreparedBy || currentUserName}</strong></span>
                  </div>
                  <span className="text-muted-foreground">•</span>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="size-4 text-muted-foreground" />
                    <span>Date: <strong className="text-foreground">{activeReportDate}</strong></span>
                  </div>

                  {totalExpenses > 0 && (
                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20 font-semibold text-xs">
                      <Receipt className="size-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Outflows: {formatMoney(totalExpenses)}</span>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="text-emerald-700 dark:text-emerald-300 font-bold">Net Handover: {formatMoney(netCollections)}</span>
                    </div>
                  )}
                </div>

                {filterStats && (
                  <span className="text-[11px] text-muted-foreground italic">
                    {filterStats.totalAfter} of {filterStats.totalBefore} items in shift window
                  </span>
                )}
              </div>

              {/* KPI Grid */}
              <div className={cn("grid gap-3.5", totalExpenses > 0 ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-8" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-6")}>
                <Card className="shadow-xs border-l-4 border-l-blue-500">
                  <CardHeader className="p-3.5 pb-1">
                    <CardDescription className="text-[11px] font-bold uppercase tracking-wider">
                      Patient Visits
                    </CardDescription>
                    <CardTitle className="text-2xl font-black">
                      {formatNumber(kpis.totalPatients)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-0">
                    <p className="text-[11px] text-muted-foreground">Unique patients (UID)</p>
                  </CardContent>
                </Card>

                <Card className="shadow-xs border-l-4 border-l-indigo-500">
                  <CardHeader className="p-3.5 pb-1">
                    <CardDescription className="text-[11px] font-bold uppercase tracking-wider">
                      Revenue Billed
                    </CardDescription>
                    <CardTitle className="text-2xl font-black">
                      {formatMoney(kpis.totalBill)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-0">
                    <p className="text-[11px] text-muted-foreground">Total gross billed</p>
                  </CardContent>
                </Card>

                <Card className="shadow-xs border-l-4 border-l-emerald-500">
                  <CardHeader className="p-3.5 pb-1">
                    <CardDescription className="text-[11px] font-bold uppercase tracking-wider">
                      Realized
                    </CardDescription>
                    <CardTitle className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {formatMoney(kpis.totalCollected)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-0">
                    <p className="text-[11px] text-muted-foreground">Gross collections</p>
                  </CardContent>
                </Card>

                <Card className="shadow-xs border-l-4 border-l-rose-500">
                  <CardHeader className="p-3.5 pb-1">
                    <CardDescription className="text-[11px] font-bold uppercase tracking-wider">
                      Pending Dues
                    </CardDescription>
                    <CardTitle className="text-2xl font-black text-rose-600 dark:text-rose-400">
                      {formatMoney(kpis.totalPending)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-0">
                    <p className="text-[11px] text-muted-foreground">Outstanding balance</p>
                  </CardContent>
                </Card>

                {kpis.totalDiscount > 0 && (
                  <Card className="shadow-xs border-l-4 border-l-purple-500 bg-purple-500/5">
                    <CardHeader className="p-3.5 pb-1">
                      <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                        Total Discounts
                      </CardDescription>
                      <CardTitle className="text-2xl font-black text-purple-600 dark:text-purple-400">
                        {formatMoney(kpis.totalDiscount)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3.5 pt-0">
                      <p className="text-[11px] text-muted-foreground">Privilege cards & concessions</p>
                    </CardContent>
                  </Card>
                )}

                <Card className="shadow-xs border-l-4 border-l-amber-500">
                  <CardHeader className="p-3.5 pb-1">
                    <CardDescription className="text-[11px] font-bold uppercase tracking-wider">
                      Realization Rate
                    </CardDescription>
                    <CardTitle className="text-2xl font-black">
                      {kpis.realizationRate.toFixed(1)}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-0">
                    <p className="text-[11px] text-muted-foreground">Collections ÷ billed</p>
                  </CardContent>
                </Card>

                <Card className="shadow-xs border-l-4 border-l-teal-500">
                  <CardHeader className="p-3.5 pb-1">
                    <CardDescription className="text-[11px] font-bold uppercase tracking-wider">
                      Service Mix
                    </CardDescription>
                    <CardTitle className="text-2xl font-black">
                      {kpis.patientMixText}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3.5 pt-0">
                    <p className="text-[11px] text-muted-foreground">Cons / Follow-up + Lab</p>
                  </CardContent>
                </Card>

                {totalExpenses > 0 && (
                  <>
                    <Card className="shadow-xs border-l-4 border-l-orange-500 bg-amber-500/5">
                      <CardHeader className="p-3.5 pb-1">
                        <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">
                          Total Outflows
                        </CardDescription>
                        <CardTitle className="text-2xl font-black text-orange-600 dark:text-orange-400">
                          {formatMoney(totalExpenses)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3.5 pt-0">
                        <p className="text-[11px] text-muted-foreground">{expenses.length} expense items</p>
                      </CardContent>
                    </Card>

                    <Card className="shadow-xs border-l-4 border-l-emerald-600 bg-emerald-500/5">
                      <CardHeader className="p-3.5 pb-1">
                        <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          Net Handover
                        </CardDescription>
                        <CardTitle className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                          {formatMoney(netCollections)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3.5 pt-0">
                        <p className="text-[11px] text-muted-foreground">Realized − Outflows</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              {/* Front Office Outflows & Petty Cash Expenses Form */}
              <Card className="shadow-sm border-amber-500/30 bg-card overflow-hidden">
                <CardHeader className="p-4 pb-3 border-b bg-amber-500/5 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <Receipt className="size-4 text-amber-600 dark:text-amber-400" />
                      Front Office Expenses &amp; Petty Cash Outflows
                      {expenses.length > 0 && (
                        <Badge variant="secondary" className="text-xs bg-amber-500/15 text-amber-800 dark:text-amber-300">
                          {expenses.length} recorded • {formatMoney(totalExpenses)}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Enter daily counter expenses, refreshments, courier, stationery, or refunds deducted from daily cash collections
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    {totalExpenses > 0 && (
                      <div className="text-right text-xs hidden sm:block">
                        <span className="text-muted-foreground">Net Handover: </span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(netCollections)}</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowExpenseForm(!showExpenseForm)}
                      className="text-xs gap-1.5 cursor-pointer h-8"
                    >
                      {showExpenseForm ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      {showExpenseForm ? "Hide Form" : "Show Form"}
                    </Button>
                  </div>
                </CardHeader>
                {showExpenseForm && (
                  <CardContent className="p-4 space-y-4">
                    {/* Add Expense Form */}
                    <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end p-3.5 rounded-xl bg-muted/30 border">
                      {/* Category */}
                      <div className="space-y-1 sm:col-span-2 md:col-span-3">
                        <label className="text-[11px] font-bold text-foreground">Category *</label>
                        <select
                          value={expenseCategory}
                          onChange={(e) => setExpenseCategory(e.target.value)}
                          className="w-full h-8 text-xs rounded-md border bg-background px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {FRONT_OFFICE_EXPENSE_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Description */}
                      <div className="space-y-1 sm:col-span-2 md:col-span-4">
                        <label className="text-[11px] font-bold text-foreground">Description / Details *</label>
                        <Input
                          placeholder="e.g. Courier to Metropolis lab, Tea for doctors"
                          value={expenseDescription}
                          onChange={(e) => setExpenseDescription(e.target.value)}
                          className="h-8 text-xs"
                          required
                        />
                      </div>

                      {/* Amount */}
                      <div className="space-y-1 sm:col-span-1 md:col-span-2">
                        <label className="text-[11px] font-bold text-foreground">Amount (₹) *</label>
                        <Input
                          type="number"
                          placeholder="0"
                          min="1"
                          step="any"
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(e.target.value)}
                          className="h-8 text-xs font-semibold"
                          required
                        />
                      </div>

                      {/* Mode */}
                      <div className="space-y-1 sm:col-span-1 md:col-span-1">
                        <label className="text-[11px] font-bold text-foreground">Mode</label>
                        <select
                          value={expensePaymentMode}
                          onChange={(e) => setExpensePaymentMode(e.target.value)}
                          className="w-full h-8 text-xs rounded-md border bg-background px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Card">Card</option>
                        </select>
                      </div>

                      {/* Voucher & Submit */}
                      <div className="flex gap-2 items-end sm:col-span-2 md:col-span-2">
                        <div className="flex-1 space-y-1">
                          <label className="text-[11px] font-bold text-foreground">Voucher #</label>
                          <Input
                            placeholder="Ref #"
                            value={expenseVoucher}
                            onChange={(e) => setExpenseVoucher(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <Button type="submit" size="sm" className="h-8 bg-amber-600 hover:bg-amber-700 text-white gap-1 cursor-pointer shrink-0">
                          <Plus className="size-3.5" />
                          Add
                        </Button>
                      </div>
                    </form>

                    {/* Expenses Table */}
                    {expenses.length > 0 ? (
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/60 text-left font-semibold">
                              <th className="py-2 px-3 w-10 text-center">#</th>
                              <th className="py-2 px-3">Category</th>
                              <th className="py-2 px-3">Description</th>
                              <th className="py-2 px-3 text-center">Mode</th>
                              <th className="py-2 px-3 text-center">Voucher #</th>
                              <th className="py-2 px-3 text-right">Amount</th>
                              <th className="py-2 px-3 text-center w-12">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {expenses.map((item, idx) => (
                              <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                                <td className="py-2 px-3 text-center text-muted-foreground">{idx + 1}</td>
                                <td className="py-2 px-3 font-semibold">{item.category}</td>
                                <td className="py-2 px-3">{item.description}</td>
                                <td className="py-2 px-3 text-center">
                                  <Badge variant="outline" className="text-[10px] font-normal py-0">
                                    {item.paymentMode}
                                  </Badge>
                                </td>
                                <td className="py-2 px-3 text-center text-muted-foreground font-mono">
                                  {item.voucherNumber || "—"}
                                </td>
                                <td className="py-2 px-3 text-right font-bold text-amber-700 dark:text-amber-400">
                                  {formatMoney(item.amount)}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteExpense(item.id)}
                                    className="p-1 text-destructive hover:bg-destructive/10 rounded cursor-pointer transition-colors"
                                    title="Delete expense"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t bg-muted/70 font-bold">
                              <td colSpan={5} className="py-2.5 px-3 text-right text-xs">
                                Total Front Office Outflows / Expenses:
                              </td>
                              <td className="py-2.5 px-3 text-right text-xs text-amber-700 dark:text-amber-400">
                                {formatMoney(totalExpenses)}
                              </td>
                              <td></td>
                            </tr>
                            <tr className="border-t bg-emerald-500/10 font-bold text-emerald-800 dark:text-emerald-300">
                              <td colSpan={5} className="py-2.5 px-3 text-right text-xs">
                                Net Cash Handover (Gross Realized − Outflows):
                              </td>
                              <td className="py-2.5 px-3 text-right text-xs font-black">
                                {formatMoney(netCollections)}
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                        No expenses recorded yet. Fill out the form above to add a petty cash or outflow entry.
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>

              {/* Shift Handover & Cash Balancing Callout Card */}
              <Card className="shadow-sm border-blue-500/30 bg-gradient-to-r from-blue-500/5 via-teal-500/5 to-emerald-500/5 overflow-hidden">
                <CardHeader className="p-4 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                      <Coins className="size-4 text-emerald-600" />
                      Daily Shift Handover, Admissions, Discharges &amp; Cash Balancing
                      {actualCashCounted > 0 && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs",
                            cashDifference === 0
                              ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                              : "bg-amber-500/20 text-amber-800 dark:text-amber-300"
                          )}
                        >
                          {cashDifference === 0 ? "✓ Drawer Balanced" : `Diff: ${cashDifference > 0 ? "+" : ""}${formatMoney(cashDifference)}`}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Record IPD/IVF admissions, discharge billings, physical currency note counts, and generate the shift handover sheet.
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab("handover")}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 cursor-pointer shrink-0"
                  >
                    Open Handover Sheet
                    <ArrowUpDown className="size-3.5 rotate-90" />
                  </Button>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-background border">
                      <span className="text-[11px] text-muted-foreground block">Admissions / Advance</span>
                      <span className="font-bold text-sm text-blue-700 dark:text-blue-400 font-mono">
                        {formatMoney(admissionTotal)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">{admissions.filter(a => a.patientName.trim()).length} entries</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-background border">
                      <span className="text-[11px] text-muted-foreground block">Discharge Collections</span>
                      <span className="font-bold text-sm text-teal-700 dark:text-teal-400 font-mono">
                        {formatMoney(dischargeTotal)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">{discharges.filter(d => d.patientName.trim()).length} entries</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-background border">
                      <span className="text-[11px] text-muted-foreground block">Total Outflows</span>
                      <span className="font-bold text-sm text-amber-700 dark:text-amber-400 font-mono">
                        {formatMoney(totalExpenses)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">{expenses.length} entries</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-background border">
                      <span className="text-[11px] text-muted-foreground block">Grand Gross Total</span>
                      <span className="font-bold text-sm text-foreground font-mono">
                        {formatMoney(grandTotal)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">OPD + Adm + Dis</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-background border">
                      <span className="text-[11px] text-muted-foreground block">Cash to Handover</span>
                      <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400 font-mono">
                        {formatMoney(cashToHandover)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">Net expected cash</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-background border">
                      <span className="text-[11px] text-muted-foreground block">Drawer Notes Counted</span>
                      <span className="font-bold text-sm text-foreground font-mono">
                        {formatMoney(actualCashCounted)}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold block",
                        cashDifference === 0 ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {cashDifference === 0 ? "✓ Balanced" : `Variance: ${cashDifference > 0 ? "+" : ""}${formatMoney(cashDifference)}`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Charts & Summaries Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Collections by Payment Mode */}
                <Card className="shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold">Collections by Payment Mode</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64 flex flex-col justify-between">
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={collectionsByPaymentModeData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                          >
                            {collectionsByPaymentModeData.map((_: ChartCountItem, i: number) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(val: any) => formatMoney(val)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="overflow-y-auto max-h-16 text-xs divide-y border-t pt-1">
                      {collectionsByPaymentModeData.map((item: ChartCountItem, i: number) => (
                        <div key={i} className="flex items-center justify-between py-0.5">
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="size-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            {item.name}
                          </span>
                          <span className="font-semibold">{formatMoney(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Visits by Time Slot */}
                <Card className="shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold">Visits by Time Slot</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={visitsByTimeSlotData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Table 1: Revenue & Collection Details */}
                <Card className="shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold">Revenue & Collection Details</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto max-h-72">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50 text-left">
                          <th className="py-2 px-2.5 font-bold">Category</th>
                          <th className="py-2 px-2.5 font-bold text-right">Count</th>
                          <th className="py-2 px-2.5 font-bold text-right">Bill Amount</th>
                          <th className="py-2 px-2.5 font-bold text-right">Discount</th>
                          <th className="py-2 px-2.5 font-bold text-right">Collected</th>
                          <th className="py-2 px-2.5 font-bold text-right">Pending</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {revenueCategories.map((r, i) => (
                          <tr key={i} className="hover:bg-muted/40">
                            <td className="py-2 px-2.5 font-medium">{r.label}</td>
                            <td className="py-2 px-2.5 text-right">{r.count}</td>
                            <td className="py-2 px-2.5 text-right">{formatMoney(r.billAmount)}</td>
                            <td className="py-2 px-2.5 text-right font-medium text-purple-700 dark:text-purple-400">
                              {r.discount > 0 ? `-${formatMoney(r.discount)}` : "—"}
                            </td>
                            <td className="py-2 px-2.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                              {formatMoney(r.collected)}
                            </td>
                            <td className="py-2 px-2.5 text-right font-medium text-rose-600 dark:text-rose-400">
                              {formatMoney(r.pending)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-bold bg-muted/60">
                          <td className="py-2 px-2.5">Total</td>
                          <td className="py-2 px-2.5 text-right">
                            {revenueCategories.reduce((s, r) => s + r.count, 0)}
                          </td>
                          <td className="py-2 px-2.5 text-right">
                            {formatMoney(revenueCategories.reduce((s, r) => s + r.billAmount, 0))}
                          </td>
                          <td className="py-2 px-2.5 text-right text-purple-700 dark:text-purple-400">
                            {formatMoney(revenueCategories.reduce((s, r) => s + (r.discount || 0), 0))}
                          </td>
                          <td className="py-2 px-2.5 text-right text-emerald-600 dark:text-emerald-400">
                            {formatMoney(revenueCategories.reduce((s, r) => s + r.collected, 0))}
                          </td>
                          <td className="py-2 px-2.5 text-right text-rose-600 dark:text-rose-400">
                            {formatMoney(revenueCategories.reduce((s, r) => s + r.pending, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </CardContent>
                </Card>

                {/* Table 2: Items & Billed Amount */}
                <Card className="shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold">Items & Billed Amount</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto max-h-72">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50 text-left">
                          <th className="py-2 px-2.5 font-bold">Item Name</th>
                          <th className="py-2 px-2.5 font-bold text-right">Count</th>
                          <th className="py-2 px-2.5 font-bold text-right">Billed Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {itemsBilled.slice(0, 50).map((item, i) => (
                          <tr key={i} className="hover:bg-muted/40">
                            <td className="py-2 px-2.5 font-medium truncate max-w-56">{item.name}</td>
                            <td className="py-2 px-2.5 text-right">{item.count}</td>
                            <td className="py-2 px-2.5 text-right">{formatMoney(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-bold bg-muted/60">
                          <td className="py-2 px-2.5">Total</td>
                          <td className="py-2 px-2.5 text-right">
                            {itemsBilled.reduce((s, i) => s + i.count, 0)}
                          </td>
                          <td className="py-2 px-2.5 text-right">
                            {formatMoney(itemsBilled.reduce((s, i) => s + i.amount, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </CardContent>
                </Card>
              </div>

              {/* Patient Visit Summary Table */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base font-bold">Patient Visit Summary</CardTitle>
                      <Badge variant="outline" className="text-[11px] font-normal gap-1 bg-muted/40">
                        <Clock className="size-3 text-sky-600 dark:text-sky-400" />
                        {patientSortColumn === "timing"
                          ? `Sorted by Consultation Timing (${patientSortDirection === "asc" ? "Earliest first" : "Latest first"})`
                          : `Sorted by ${patientSortColumn === "patient" ? "Patient Name" : patientSortColumn.toUpperCase()} (${patientSortDirection === "asc" ? "Asc" : "Desc"})`}
                      </Badge>
                    </div>
                    <CardDescription>
                      Consolidated per-patient billing directory matching Consultation and Laboratory/Radiology records, sorted chronologically by consultation timing.
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      placeholder="Search patient, UID, doctor, test..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 text-xs h-9"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/50 text-left">
                          <th className="py-3 px-3 font-semibold w-12">#</th>
                          <th
                            className="py-3 px-3 font-semibold min-w-40 cursor-pointer select-none hover:text-foreground group"
                            onClick={() => handleToggleSort("patient")}
                            title="Click to sort by Patient Name"
                          >
                            <div className="flex items-center gap-1">
                              <span>Patient</span>
                              {patientSortColumn === "patient" ? (
                                patientSortDirection === "asc" ? (
                                  <ChevronUp className="size-3.5 text-primary" />
                                ) : (
                                  <ChevronDown className="size-3.5 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="size-3 text-muted-foreground/40 group-hover:text-foreground" />
                              )}
                            </div>
                          </th>
                          <th className="py-3 px-3 font-semibold min-w-28">UID</th>
                          <th
                            className="py-3 px-3 font-semibold min-w-48 cursor-pointer select-none hover:text-foreground group"
                            onClick={() => handleToggleSort("timing")}
                            title="Click to toggle Consultation Timing sort"
                          >
                            <div className="flex items-center gap-1">
                              <span>Consultation</span>
                              {patientSortColumn === "timing" ? (
                                patientSortDirection === "asc" ? (
                                  <ChevronUp className="size-3.5 text-primary" />
                                ) : (
                                  <ChevronDown className="size-3.5 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="size-3 text-muted-foreground/40 group-hover:text-foreground" />
                              )}
                            </div>
                          </th>
                          <th className="py-3 px-3 font-semibold min-w-56">Laboratory / Radiology</th>
                          <th
                            className="py-3 px-3 font-semibold text-right cursor-pointer select-none hover:text-foreground group"
                            onClick={() => handleToggleSort("bill")}
                            title="Click to sort by Total Bill"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>Total Bill</span>
                              {patientSortColumn === "bill" ? (
                                patientSortDirection === "asc" ? (
                                  <ChevronUp className="size-3.5 text-primary" />
                                ) : (
                                  <ChevronDown className="size-3.5 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="size-3 text-muted-foreground/40 group-hover:text-foreground" />
                              )}
                            </div>
                          </th>
                          <th
                            className="py-3 px-3 font-semibold text-right cursor-pointer select-none hover:text-foreground group"
                            onClick={() => handleToggleSort("discount")}
                            title="Click to sort by Discount"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>Discount</span>
                              {patientSortColumn === "discount" ? (
                                patientSortDirection === "asc" ? (
                                  <ChevronUp className="size-3.5 text-primary" />
                                ) : (
                                  <ChevronDown className="size-3.5 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="size-3 text-muted-foreground/40 group-hover:text-foreground" />
                              )}
                            </div>
                          </th>
                          <th
                            className="py-3 px-3 font-semibold text-right cursor-pointer select-none hover:text-foreground group"
                            onClick={() => handleToggleSort("collected")}
                            title="Click to sort by Collected"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>Collected</span>
                              {patientSortColumn === "collected" ? (
                                patientSortDirection === "asc" ? (
                                  <ChevronUp className="size-3.5 text-primary" />
                                ) : (
                                  <ChevronDown className="size-3.5 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="size-3 text-muted-foreground/40 group-hover:text-foreground" />
                              )}
                            </div>
                          </th>
                          <th
                            className="py-3 px-3 font-semibold text-right cursor-pointer select-none hover:text-foreground group"
                            onClick={() => handleToggleSort("pending")}
                            title="Click to sort by Pending"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>Pending</span>
                              {patientSortColumn === "pending" ? (
                                patientSortDirection === "asc" ? (
                                  <ChevronUp className="size-3.5 text-primary" />
                                ) : (
                                  <ChevronDown className="size-3.5 text-primary" />
                                )
                              ) : (
                                <ArrowUpDown className="size-3 text-muted-foreground/40 group-hover:text-foreground" />
                              )}
                            </div>
                          </th>
                          <th className="py-3 px-3 font-semibold min-w-32">Payment Mode</th>
                          <th className="py-3 px-3 font-semibold min-w-52">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredPatients.map((p, idx) => {
                          const paymentModes = [
                            ...new Set([...p.consultations, ...p.procedures].map((x) => x.paymentMode).filter(Boolean)),
                          ];
                          const remarks = [
                            ...new Set([...p.consultations, ...p.procedures].flatMap((x) => x.remarks || [])),
                          ];

                          return (
                            <tr key={p.patientUid || idx} className="hover:bg-muted/30 transition-colors">
                              <td className="py-3 px-3 text-muted-foreground">{idx + 1}</td>
                              <td className="py-3 px-3 font-bold text-foreground">
                                {p.patientName || "Unknown Patient"}
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] text-muted-foreground">
                                {p.patientUid || "No UID"}
                              </td>
                              <td className="py-3 px-3 space-y-1.5">
                                {p.consultations.length ? (
                                  p.consultations.map((c, i) => (
                                    <div key={i} className="text-[11px]">
                                      <Badge variant="secondary" className="mr-1.5 text-[10px] py-0 px-1.5">
                                        {visitTypeLabel(c.purpose)}
                                      </Badge>
                                      <span className="font-semibold">{c.dateText || "Date unavailable"}</span>
                                      <div className="text-muted-foreground text-[10px]">
                                        {c.doctor} · {c.schedule}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground italic text-[11px]">No consultation</span>
                                )}
                              </td>
                              <td className="py-3 px-3 space-y-1.5">
                                {p.procedures.length ? (
                                  p.procedures.map((pr, i) => (
                                    <div key={i} className="text-[11px]">
                                      <Badge
                                        variant="outline"
                                        className={`mr-1.5 text-[10px] py-0 px-1.5 ${
                                          pr.category === "Radiology"
                                            ? "border-sky-500 text-sky-700 dark:text-sky-400"
                                            : "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                                        }`}
                                      >
                                        {pr.category}
                                      </Badge>
                                      <span className="font-semibold">{pr.procedure}</span>
                                      <div className="text-muted-foreground text-[10px]">
                                        {pr.dateText || "Date unavailable"}{pr.doctor ? ` · ${pr.doctor}` : ""}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground italic text-[11px]">No lab/radiology</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-medium">{formatMoney(p.totalBill)}</td>
                              <td className="py-3 px-3 text-right">
                                {p.totalDiscount > 0 ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="font-semibold text-purple-700 dark:text-purple-400">
                                      -{formatMoney(p.totalDiscount)}
                                    </span>
                                    {p.discountNotes && p.discountNotes.length > 0 && (
                                      <span className="text-[9.5px] px-1 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-medium">
                                        {p.discountNotes.join(", ")}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatMoney(p.totalCollected)}
                              </td>
                              <td className="py-3 px-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                                {formatMoney(p.totalPending)}
                              </td>
                              <td className="py-3 px-3">
                                {paymentModes.length ? (
                                  <div className="flex flex-wrap gap-1">
                                    {paymentModes.map((m, i) => (
                                      <Badge key={i} variant="outline" className="text-[10px] py-0">
                                        {m}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-3 px-3 max-w-64">
                                {remarks.length ? (
                                  <ul className="list-disc pl-3 text-[10.5px] text-muted-foreground space-y-0.5">
                                    {remarks.map((rem, i) => (
                                      <li key={i} className={rem.includes("⚠") ? "text-amber-700 dark:text-amber-400 font-medium" : ""}>
                                        {rem}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-bold bg-muted/60">
                          <td colSpan={5} className="py-3 px-3 text-right">
                            Total ({filteredPatients.length} patients)
                          </td>
                          <td className="py-3 px-3 text-right">
                            {formatMoney(filteredPatients.reduce((s, p) => s + p.totalBill, 0))}
                          </td>
                          <td className="py-3 px-3 text-right text-purple-700 dark:text-purple-400">
                            {formatMoney(filteredPatients.reduce((s, p) => s + (p.totalDiscount || 0), 0))}
                          </td>
                          <td className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">
                            {formatMoney(filteredPatients.reduce((s, p) => s + p.totalCollected, 0))}
                          </td>
                          <td className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">
                            {formatMoney(filteredPatients.reduce((s, p) => s + p.totalPending, 0))}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Docterz API Configuration & Headers Management Dialog */}
      <DocterzConfigDialog open={docterzConfigOpen} onOpenChange={setDocterzConfigOpen} />
    </div>
  );
}
