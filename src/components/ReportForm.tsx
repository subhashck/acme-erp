import * as React from "react";
import { Plus, Trash2, Save, AlertTriangle, CheckCircle, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useRpcQuery } from "../lib/query";
import { client } from "../services/rpc";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Label } from "../ui/label";
import { cn } from "../utils/cn";
import { Autocomplete } from "../ui/autocomplete";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import type { StaffRow } from "../types";

type ServiceCategory = { id: number; code: string; label: string; sortOrder: number; active: boolean; isVariableAmount: boolean };

type ExpenseCategory = {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
  active: boolean;
};

type ExpenseCatalogItem = {
  id: number;
  category: string;
  itemName: string;
  defaultAmount: number;
  sortOrder: number;
  active: boolean;
};

// ─────────────────────────── helpers ──────────────────────────────

/**
 * Normalizes a value that may arrive as a JS number OR as a numeric-string
 * (Postgres `numeric` columns come back from Drizzle as strings, e.g. "500.00").
 * Every amount that could have come from the API should be passed through this
 * before it's used in arithmetic — using `+` directly on a string silently
 * falls back to concatenation instead of addition.
 */
const toNum = (v: unknown): number => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

// ─────────────────────────── constants ───────────────────────────

// const EXP_CATEGORIES = ["SALARY", "VENDOR", "MISC"];
// const IPD_TYPES = ["ADMISSION", "ADVANCE", "OBSERVATION"];
const BANKS = ["ICICI", "HDFC", "BOI", "CASH", "OTHERS"];
const CHANNELS = ["CREDIT CARD", "UPI", "DEBIT CARD", "RTGS", "CASH"];

const DEFAULT_PAYMENT_CHANNELS = [
  { bank: "ICICI", channel: "CARD", sourceLabel: "Front OPD Card", amount: 0 },
  { bank: "HDFC", channel: "UPI", sourceLabel: "Front OPD UPI", amount: 0 },
  { bank: "HDFC", channel: "CARD", sourceLabel: "Pharmacy Card", amount: 0 },
  { bank: "BOI", channel: "UPI", sourceLabel: "Pharmacy UPI", amount: 0 },
];



// ─────────────────────────── types ───────────────────────────────

type ServiceQty = Record<number, { rate: number; quantity: number; amount: number }>;
type CustomLine = { serviceName: string; department: string; rate: number; quantity: number; amount: number };
// type MiscIncome = { label: string; amount: number };
type IpdAdmission = { patientName: string; type: "ADMISSION" | "ADVANCE" | "OBSERVATION"; amount: number };
type IpdDischarge = { patientName: string; amount: number };
type Expenditure = { category: string; details: string; amount: number };
type StaffAdvance = { staffId?: number | null; staffName: string; amount: number };
// type AdditionalIncome = { label: string; amount: number };
type DiscountReturn = { label: string; amount: number };
type PaymentChannel = { bank: string; channel: string; sourceLabel: string; amount: number };

export interface ReportPayload {
  reportDate?: string;
  openingBalance: number;
  bankDeposit: number;
  fundHandoverSir: number;
  fundHandoverMadam: number;
  cashReceiptSir: number;
  cashReceiptMam: number;
  cashReceiptAcon: number;
  bankReceiptSir: number;
  bankReceiptSirBank: string | null;
  bankDeposits?: string | null;
  cashReceipts: number;
  status: "draft" | "submitted";
  serviceLines: Array<{ serviceId: number | null; rate: number; quantity: number; amount: number; isNightEntry?: boolean }>;
  expenditures: Expenditure[];
  staffAdvances: StaffAdvance[];
  // ipdAdmissions: IpdAdmission[];
  // ipdDischarges: IpdDischarge[];
  // additionalIncome: AdditionalIncome[];
  discountsReturns: DiscountReturn[];
  paymentChannels: PaymentChannel[];
}

export interface ReportFormProps {
  /** "new" shows editable report date; "edit" shows locked date */
  mode: "new" | "edit";
  /** Locked date shown in edit mode */
  lockedReportDate?: string;
  /** Pre-populated data for edit mode */
  initialData?: any;
  /** Called with the assembled payload on submit */
  onSubmit: (payload: ReportPayload) => void;
  /** Whether the mutation is in-flight */
  isPending: boolean;
  /** Error message returned from the mutation */
  errorMsg: string;
  /** Page header content (title, back button, etc.) */
  header: React.ReactNode;
}

// ─────────────────────────── component ───────────────────────────

export function ReportForm({
  mode,
  lockedReportDate,
  initialData,
  onSubmit,
  isPending,
  errorMsg,
  header,
}: ReportFormProps) {
  // ── header state ──────────────────────────────────────────────
  const [reportDate, setReportDate] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [openingBalance, setOpeningBalance] = React.useState("0");
  const [fundHandoverSir, setFundHandoverSir] = React.useState("0");
  const [fundHandoverMadam, setFundHandoverMadam] = React.useState("0");
  const [status, setStatus] = React.useState<"draft" | "submitted">("draft");
  const [cashReceiptSir, setCashReceiptSir] = React.useState("0");
  const [cashReceiptMam, setCashReceiptMam] = React.useState("0");
  const [cashReceiptAcon, setCashReceiptAcon] = React.useState("0");
  const [bankReceiptSir, setBankReceiptSir] = React.useState("0");
  const [bankReceiptSirBank, setBankReceiptSirBank] = React.useState("");
  const [bankDeposits, setBankDeposits] = React.useState<{ bankName: string; amount: number }[]>([]);

  // ── collapsible sections ──────────────────────────────────────
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    night: false,
    ipd: false,
    exp: false,
    add: false,
    discounts: false,
    reconcile: false,
  });
  const toggleSection = (s: string) => setOpenSections((prev) => ({ ...prev, [s]: !prev[s] }));

  // ── categories master query ───────────────────────────────────
  const categoriesQuery = useRpcQuery<ServiceCategory[]>(
    ["service-categories"],
    () => (client["daily-closing"] as any).categories.$get()
  );
  const activeCategories: ServiceCategory[] = (categoriesQuery.data ?? []).filter((c) => c.active);

  // ── catalog query ─────────────────────────────────────────────
  const catalogQuery = useRpcQuery<any[]>(
    ["service-catalog"],
    () => client["daily-closing"].catalog.$get()
  );

  // ── expense categories and catalog queries ─────────────────────
  const expCategoriesQuery = useRpcQuery<ExpenseCategory[]>(
    ["expense-categories"],
    () => (client["daily-closing"] as any)["expense-categories"].$get()
  );
  const activeExpCategories = (expCategoriesQuery.data ?? []).filter((c) => c.active);

  const expCatalogQuery = useRpcQuery<ExpenseCatalogItem[]>(
    ["expense-catalog"],
    () => (client["daily-closing"] as any)["expense-catalog"].$get()
  );
  const expCatalogList = expCatalogQuery.data ?? [];

  // ── staff list query ───────────────────────────
  const staffQuery = useRpcQuery<StaffRow[]>(
    ["staff"],
    () => client.hr.staff.$get()
  );
  const staffList = staffQuery.data ?? [];

  const staffOptions = React.useMemo(() => {
    return staffList.map((s) => [String(s.staffId), `${s.employeeCode} - ${s.name}`] as [string, string]);
  }, [staffList]);

  // ── auto-populate opening balance in new mode ─────────────────
  const pastReportsQuery = useRpcQuery<any[]>(
    ["daily-closing-reports-latest"],
    () => client["daily-closing"].reports.$get(),
    { enabled: mode === "new" }
  );

  React.useEffect(() => {
    if (mode === "new" && pastReportsQuery.data) {
      const priorReports = pastReportsQuery.data.filter((r) => r.reportDate < reportDate);
      if (priorReports.length > 0) {
        const sorted = [...priorReports].sort((a, b) => b.reportDate.localeCompare(a.reportDate));
        const latest = sorted[0];
        if (latest) {
          setOpeningBalance(String(latest.closingBalance || 0));
          return;
        }
      }
      setOpeningBalance("0");
    }
  }, [pastReportsQuery.data, reportDate, mode]);

  // ── service line state ────────────────────────────────────────
  const [serviceQuantities, setServiceQuantities] = React.useState<ServiceQty>({});
  const [customLines, setCustomLines] = React.useState<CustomLine[]>([]);

  const catalogList = catalogQuery.data ?? [];

  const expCategoriesOptions = activeExpCategories.length > 0 ? activeExpCategories.map((c) => c.code) : ["SALARY", "VENDOR", "MISC"];

  /** Returns catalog items visible for a given category code */
  const getCatalogForDept = (code: string) => {
    const items = catalogList.filter(
      (item) => item.department === code &&
        (item.defaultShow !== false || serviceQuantities[item.id] !== undefined)
    );
    return items.sort((a, b) => {
      const idxA = entryOrder.indexOf(a.id);
      const idxB = entryOrder.indexOf(b.id);
      const valA = idxA === -1 ? 999999 : idxA;
      const valB = idxB === -1 ? 999999 : idxB;
      return valA - valB;
    });
  };

  // ── other form state ──────────────────────────────────────────
  // const [ipdAdmissions, setIpdAdmissions] = React.useState<IpdAdmission[]>([]);
  // const [ipdDischarges, setIpdDischarges] = React.useState<IpdDischarge[]>([]);
  const [expenditures, setExpenditures] = React.useState<Expenditure[]>([]);
  const [staffAdvances, setStaffAdvances] = React.useState<StaffAdvance[]>([]);
  // const [additionalIncome, setAdditionalIncome] = React.useState<AdditionalIncome[]>([]);
  const [discountsReturns, setDiscountsReturns] = React.useState<DiscountReturn[]>([]);
  const [paymentChannels, setPaymentChannels] = React.useState<PaymentChannel[]>(
    mode === "new" ? DEFAULT_PAYMENT_CHANNELS : []
  );
  const [nightServices, setNightServices] = React.useState<Array<{ serviceId: number; rate: number; quantity: number; amount: number }>>([]);
  const [entryOrder, setEntryOrder] = React.useState<number[]>([]);

  // Initialize entryOrder reactively based on mode and catalogList / initialData
  React.useEffect(() => {
    if (catalogList.length === 0) return;

    if (mode === "new") {
      if (entryOrder.length === 0) {
        const defaultShowIds = catalogList
          .filter((item) => item.defaultShow !== false)
          .map((item) => item.id);
        setEntryOrder(defaultShowIds);
      }
    } else if (mode === "edit" && initialData) {
      if (entryOrder.length === 0) {
        const editEntryOrder: number[] = [];
        initialData.serviceLines?.forEach((l: any) => {
          if (!l.isNightEntry && l.serviceId) {
            editEntryOrder.push(l.serviceId);
          }
        });

        const defaultShowIds = catalogList
          .filter((item) => item.defaultShow !== false)
          .map((item) => item.id);

        const combined = [...editEntryOrder];
        defaultShowIds.forEach((id) => {
          if (!combined.includes(id)) {
            combined.push(id);
          }
        });
        setEntryOrder(combined);
      }
    }
  }, [catalogList, initialData, mode, entryOrder.length]);

  // ── populate state from initialData (edit mode) ───────────────
  React.useEffect(() => {
    if (!initialData) return;

    setOpeningBalance(String(toNum(initialData.openingBalance)));
    setFundHandoverSir(String(toNum(initialData.fundHandoverSir)));
    setFundHandoverMadam(String(toNum(initialData.fundHandoverMadam)));
    setStatus(initialData.status);

    // Service lines
    const quantities: ServiceQty = {};
    const custom: CustomLine[] = [];
    const night: Array<{ serviceId: number; rate: number; quantity: number; amount: number }> = [];
    initialData.serviceLines?.forEach((l: any) => {
      if (l.isNightEntry) {
        if (l.serviceId) {
          night.push({
            serviceId: l.serviceId,
            rate: toNum(l.rate),
            quantity: toNum(l.quantity),
            amount: toNum(l.amount),
          });
        }
      } else {
        if (l.serviceId) {
          quantities[l.serviceId] = {
            rate: toNum(l.rate),
            quantity: toNum(l.quantity),
            amount: toNum(l.amount),
          };
        } else {
          custom.push({
            serviceName: l.serviceName || "Custom service",
            department: l.department || "OPD",
            rate: toNum(l.rate),
            quantity: toNum(l.quantity),
            amount: toNum(l.amount),
          });
        }
      }
    });
    setServiceQuantities(quantities);
    setCustomLines(custom);
    setNightServices(night);

    // setIpdAdmissions(initialData.ipdAdmissions?.map((item: any) => ({
    //   patientName: item.patientName, type: item.type, amount: toNum(item.amount),
    // })) ?? []);
    // setIpdDischarges(initialData.ipdDischarges?.map((item: any) => ({
    //   patientName: item.patientName, amount: toNum(item.amount),
    // })) ?? []);
    setExpenditures(initialData.expenditures?.map((item: any) => ({
      category: item.category, details: item.details, amount: toNum(item.amount),
    })) ?? []);
    setStaffAdvances(initialData.staffAdvances?.map((item: any) => ({
      staffId: item.staffId ? toNum(item.staffId) : undefined,
      staffName: item.staffName,
      amount: toNum(item.amount),
    })) ?? []);
    // setAdditionalIncome(initialData.additionalIncome?.map((item: any) => ({
    //   label: item.label, amount: toNum(item.amount),
    // })) ?? []);
    setDiscountsReturns(initialData.discountsReturns?.map((item: any) => ({
      label: item.label, amount: toNum(item.amount),
    })) ?? []);
    setCashReceiptSir(String(toNum(initialData.cashReceiptSir)));
    setCashReceiptMam(String(toNum(initialData.cashReceiptMam)));
    setCashReceiptAcon(String(toNum(initialData.cashReceiptAcon)));
    setBankReceiptSir(String(toNum(initialData.bankReceiptSir)));
    setBankReceiptSirBank(initialData.bankReceiptSirBank || "");

    const pChannels = (initialData.paymentChannels ?? []).map((item: any) => ({
      bank: item.bank, channel: item.channel, sourceLabel: item.sourceLabel, amount: toNum(item.amount),
    }));
    setPaymentChannels(pChannels);

    if (initialData.bankDeposits) {
      try {
        const parsed = JSON.parse(initialData.bankDeposits);
        if (Array.isArray(parsed)) {
          setBankDeposits(parsed.map((item: any) => ({
            bankName: item.bankName || "",
            amount: toNum(item.amount),
          })));
        } else {
          setBankDeposits([]);
        }
      } catch (e) {
        setBankDeposits([]);
      }
    } else if (toNum(initialData.bankDeposit) > 0) {
      setBankDeposits([{ bankName: "Sir (ICICI)", amount: toNum(initialData.bankDeposit) }]);
    } else {
      setBankDeposits([]);
    }
  }, [initialData]);

  // ── Keyboard shortcut Ctrl+S to save as draft ────────────────
  const doSubmitRef = React.useRef<(forcedStatus?: "draft" | "submitted") => void>(undefined);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isPending) return;
        setStatus("draft");
        doSubmitRef.current?.("draft");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPending]);

  // ── derived calculations ──────────────────────────────────────
  const catalogServiceLines = Object.entries(serviceQuantities)
    .filter(([_, data]) => data.quantity > 0)
    .map(([serviceId, data]) => ({
      serviceId: parseInt(serviceId, 10),
      rate: data.rate,
      quantity: data.quantity,
      amount: data.amount,
      department: catalogList.find((c) => c.id === parseInt(serviceId, 10))?.department ?? "",
    }));

  /** Per-category totals driven by master list */
  const categoryTotals: Record<string, number> = React.useMemo(() => {
    const totals: Record<string, number> = {};
    for (const cat of activeCategories) {
      const catLines = [
        ...catalogServiceLines.filter((l) => l.department === cat.code),
        ...customLines.filter((l) => l.department === cat.code),
      ];
      totals[cat.code] = catLines.reduce((sum, l) => sum + toNum(l.amount), 0);
    }
    return totals;
  }, [catalogServiceLines, customLines, activeCategories]);

  const totalCategoryIncome = Object.values(categoryTotals).reduce((s, v) => s + toNum(v), 0);

  const expTotal = expenditures.reduce((sum, item) => sum + toNum(item.amount), 0);
  const advTotal = staffAdvances.reduce((sum, item) => sum + toNum(item.amount), 0);
  const totalExpenditures = expTotal + advTotal;

  // const ipdAdmissionsTotal = ipdAdmissions.reduce((sum, item) => sum + toNum(item.amount), 0);
  // const ipdDischargesTotal = ipdDischarges.reduce((sum, item) => sum + toNum(item.amount), 0);
  // const additionalTotal = additionalIncome.reduce((sum, item) => sum + toNum(item.amount), 0);
  const discountsTotal = discountsReturns.reduce((sum, item) => sum + toNum(item.amount), 0);

  const openBal = toNum(openingBalance);

  const nightServicesTotal = nightServices.reduce((sum, item) => sum + toNum(item.amount), 0);
  const totalIncome = totalCategoryIncome + nightServicesTotal - discountsTotal;
  const netBalance = totalIncome - totalExpenditures;

  const derivedBankDepositTotal = React.useMemo(() => {
    return bankDeposits.reduce((sum, item) => sum + item.amount, 0);
  }, [bankDeposits]);

  const depositVal = derivedBankDepositTotal;
  const handoverSirVal = toNum(fundHandoverSir);
  const handoverMadamVal = toNum(fundHandoverMadam);

  const cashSirVal = toNum(cashReceiptSir);
  const cashMamVal = toNum(cashReceiptMam);
  const cashAconVal = toNum(cashReceiptAcon);

  // NOTE: `paymentChannels` amounts may originate from the API (Postgres
  // `numeric` columns come back as strings via Drizzle), so every reduce
  // over this array must go through `toNum` — raw `item.amount` addition
  // silently degrades into string concatenation the moment a string slips in.
  const cashReceiptsSum = paymentChannels
    .filter((item) => item.bank === "CASH" && item.channel === "CASH")
    .reduce((sum, item) => sum + toNum(item.amount), 0);

  const bankReceiptsSum = paymentChannels
    .filter((item) => item.bank !== "CASH")
    .reduce((sum, item) => sum + toNum(item.amount), 0);

  // Reuses cashReceiptsSum/bankReceiptsSum above instead of re-filtering and
  // re-reducing the same array a second time — one source of truth per total.
  // const paymentChannelsSum = bankReceiptsSum + cashReceiptsSum + cashSirVal + cashMamVal + cashAconVal;
  const paymentChannelsSum = bankReceiptsSum + cashReceiptsSum;

  const closingBalance = openBal + cashReceiptsSum + cashSirVal + cashMamVal + cashAconVal - totalExpenditures - depositVal - handoverSirVal - handoverMadamVal;

  const revenueToReconcile = totalIncome;
  const isReconciled = Math.abs(paymentChannelsSum - revenueToReconcile) < 1;

  const fmt = (num: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(num);

  // ── event handlers ────────────────────────────────────────────
  const handleCashReceiptChange = (sourceLabel: "SIR" | "MAM" | "ACON", valStr: string) => {
    if (sourceLabel === "SIR") setCashReceiptSir(valStr);
    else if (sourceLabel === "MAM") setCashReceiptMam(valStr);
    else if (sourceLabel === "ACON") setCashReceiptAcon(valStr);
  };

  const handleQtyChange = (serviceId: number, rate: number, qtyStr: string) => {
    const qty = parseInt(qtyStr, 10);
    if (qty <= 0) {
      setServiceQuantities((prev) => {
        const copy = { ...prev };
        delete copy[serviceId];
        return copy;
      });
    } else {
      setServiceQuantities((prev) => ({
        ...prev,
        [serviceId]: { rate, quantity: qty, amount: Number((rate * qty).toFixed(2)) },
      }));
    }
  };

  const handleRateAmtChange = (serviceId: number, field: "rate" | "amount", valueStr: string) => {
    const val = parseFloat(valueStr);
    if (isNaN(val) || val < 0) return;
    setServiceQuantities((prev) => {
      const data = prev[serviceId];
      if (!data) return prev;
      if (field === "rate") {
        return { ...prev, [serviceId]: { ...data, rate: val, amount: Number((val * data.quantity).toFixed(2)) } };
      } else {
        return { ...prev, [serviceId]: { ...data, rate: 0, amount: val } };
      }
    });
  };

  const handleAddCustomLine = (dept: string) => {
    setCustomLines((prev) => [...prev, { serviceName: "", department: dept, rate: 0, quantity: 1, amount: 0 }]);
  };

  const handleCustomLineChange = (index: number, field: string, val: string, isVar: boolean = false) => {
    setCustomLines((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const copy = { ...item };
        if (field === "serviceName") {
          copy.serviceName = val;
        } else if (field === "rate") {
          const rateVal = parseFloat(val) || 0;
          copy.rate = rateVal;
          if (!isVar) copy.amount = Number((rateVal * copy.quantity).toFixed(2));
        } else if (field === "quantity") {
          const qtyVal = parseInt(val, 10) || 0;
          copy.quantity = qtyVal;
          if (!isVar) copy.amount = Number((copy.rate * qtyVal).toFixed(2));
        } else if (field === "amount") {
          copy.amount = parseFloat(val) || 0;
          if (!isVar) {
            copy.rate = 0;
          }
        }
        return copy;
      })
    );
  };

  const handleRemoveCustomLine = (index: number) => {
    setCustomLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddCatalogItem = (dept: string, val: string) => {
    const id = parseInt(val, 10);
    if (!id) return;
    const s = catalogList.find((x) => x.id === id);
    if (s) {
      setServiceQuantities((prev) => ({
        ...prev,
        [id]: { rate: toNum(s.defaultRate), quantity: 1, amount: toNum(s.defaultRate) },
      }));
      setEntryOrder((prev) => prev.includes(id) ? prev : [...prev, id]);
    }
  };

  const handleNightQtyChange = (index: number, qtyStr: string) => {
    const qty = parseInt(qtyStr, 10) || 0;
    setNightServices((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        return { ...item, quantity: qty, amount: Number((item.rate * qty).toFixed(2)) };
      })
    );
  };

  const handleNightRateAmtChange = (index: number, field: "rate" | "amount", valueStr: string) => {
    const val = parseFloat(valueStr);
    if (isNaN(val) || val < 0) return;
    setNightServices((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        if (field === "rate") {
          return { ...item, rate: val, amount: Number((val * item.quantity).toFixed(2)) };
        } else {
          return { ...item, rate: 0, amount: val };
        }
      })
    );
  };

  const handleRemoveNightService = (index: number) => {
    setNightServices((prev) => prev.filter((_, idx) => idx !== index));
  };

  const renderNightCatalogAutocomplete = () => {
    return (
      <div className="w-full max-w-xs text-left">
        <Autocomplete
          label="Add Night Service Item"
          placeholder="Search service name..."
          value=""
          options={catalogList
            .map((item) => [String(item.id), `${item.serviceName} (₹${item.defaultRate})`] as [string, string])}
          onChange={(val) => {
            const id = parseInt(val, 10);
            if (!id) return;
            const s = catalogList.find((x) => x.id === id);
            if (s) {
              setNightServices((prev) => [
                ...prev,
                { serviceId: id, rate: parseFloat(s.defaultRate), quantity: 1, amount: parseFloat(s.defaultRate) },
              ]);
            }
          }}
        />
      </div>
    );
  };

  // ── submit ────────────────────────────────────────────────────
  const doSubmit = (forcedStatus?: "draft" | "submitted") => {
    const finalStatus = forcedStatus ?? status;
    const parsedServiceLines = [
      ...entryOrder
        .filter((serviceId) => {
          const data = serviceQuantities[serviceId];
          return data && data.quantity > 0;
        })
        .map((serviceId) => {
          const data = serviceQuantities[serviceId];
          return {
            serviceId,
            rate: toNum(data.rate),
            quantity: toNum(data.quantity),
            amount: toNum(data.amount),
            isNightEntry: false,
          };
        }),
      ...customLines.map((line) => ({
        serviceId: null,
        rate: toNum(line.rate),
        quantity: toNum(line.quantity),
        amount: toNum(line.amount),
        isNightEntry: false,
      })),
      ...nightServices.map((line) => ({
        serviceId: line.serviceId,
        rate: toNum(line.rate),
        quantity: toNum(line.quantity),
        amount: toNum(line.amount),
        isNightEntry: true,
      })),
    ];

    const payload: ReportPayload = {
      ...(mode === "new" ? { reportDate } : {}),
      openingBalance: openBal,
      bankDeposit: depositVal,
      fundHandoverSir: handoverSirVal,
      fundHandoverMadam: handoverMadamVal,
      cashReceiptSir: cashSirVal,
      cashReceiptMam: cashMamVal,
      cashReceiptAcon: cashAconVal,
      bankReceiptSir: toNum(bankReceiptSir),
      bankReceiptSirBank: bankReceiptSirBank || null,
      bankDeposits: JSON.stringify(bankDeposits),
      cashReceipts: cashReceiptsSum,
      status: finalStatus,
      serviceLines: parsedServiceLines,
      expenditures: expenditures.map((e) => ({
        category: e.category,
        details: e.details,
        amount: toNum(e.amount),
      })),
      staffAdvances: staffAdvances.map((sa) => ({
        staffId: sa.staffId ?? null,
        staffName: sa.staffName,
        amount: toNum(sa.amount),
      })),
      discountsReturns: discountsReturns.map((dr) => ({
        label: dr.label,
        amount: toNum(dr.amount),
      })),
      paymentChannels: paymentChannels
        .filter((c) => toNum(c.amount) > 0)
        .map((pc) => ({
          bank: pc.bank,
          channel: pc.channel,
          sourceLabel: pc.sourceLabel,
          amount: toNum(pc.amount),
        })),
    };

    onSubmit(payload);
  };
  doSubmitRef.current = doSubmit;

  const handleSubmit = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    doSubmit();
  };

  // ── catalog autocomplete helper ───────────────────────────────
  const renderCatalogAutocomplete = (dept: string) => {
    const hasHidden = catalogList.some(
      (item) => item.department === dept && item.defaultShow === false && serviceQuantities[item.id] === undefined
    );
    if (!hasHidden) return null;
    return (
      <div className="w-full max-w-xs text-left">
        <Autocomplete
          label="Add Catalog Item"
          placeholder="Search service name..."
          value=""
          options={catalogList
            .filter((item) => item.department === dept && item.defaultShow === false && serviceQuantities[item.id] === undefined)
            .map((item) => [String(item.id), `${item.serviceName} (₹${item.defaultRate})`] as [string, string])}
          onChange={(val) => handleAddCatalogItem(dept, val)}
        />
      </div>
    );
  };

  // ── service table ─────────────────────────────────────────────
  const renderServiceTable = (catalog: any[], isVar: boolean) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b bg-muted/40 font-semibold text-muted-foreground text-[10px] uppercase">
            <th className="p-3">Service Name</th>
            <th className="p-3 text-center w-24">Quantity</th>
            {!isVar && <th className="p-3 text-right w-32">Rate (INR)</th>}
            <th className="p-3 text-right w-36">Total (INR)</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {catalog.map((item) => {
            const state = serviceQuantities[item.id] ?? { rate: item.defaultRate, quantity: 0, amount: 0 };
            return (
              <tr key={item.id} className="hover:bg-muted/10">
                <td className="p-3 font-semibold text-foreground">{item.serviceName}</td>
                <td className="p-3 text-center">
                  <input
                    type="number" min="0" placeholder="0"
                    value={state.quantity || ""}
                    onChange={(e) => {
                      const qtyStr = e.target.value;
                      if (isVar) {
                        const qty = parseInt(qtyStr, 10) || 0;
                        if (qty <= 0) {
                          setServiceQuantities((prev) => {
                            const copy = { ...prev };
                            delete copy[item.id];
                            return copy;
                          });
                        } else {
                          setServiceQuantities((prev) => ({
                            ...prev,
                            [item.id]: { rate: 0, quantity: qty, amount: prev[item.id]?.amount || 0 },
                          }));
                        }
                      } else {
                        const currentRate = state.quantity > 0 ? state.rate : toNum(item.defaultRate);
                        handleQtyChange(item.id, currentRate, qtyStr);
                      }
                    }}
                    className="w-20 rounded border bg-transparent text-center py-1 text-xs font-bold focus:outline-none"
                  />
                </td>
                {!isVar && (
                  <td className="p-3 text-right">
                    {state.rate > 0 ? (
                      <input
                        type="number" min="0" step="0.01"
                        value={state.rate}
                        onChange={(e) => handleRateAmtChange(item.id, "rate", e.target.value)}
                        disabled={state.quantity === 0}
                        className="w-24 text-right rounded border bg-transparent py-1 px-1.5 text-xs focus:outline-none disabled:opacity-50"
                      />
                    ) : state.quantity > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleRateAmtChange(item.id, "rate", String(item.defaultRate || 0))}
                        className="text-[10px] text-teal-650 hover:underline cursor-pointer font-bold"
                      >
                        Reset Rate
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">—</span>
                    )}
                  </td>
                )}
                <td className="p-3 text-right">
                  <input
                    type="number" min="0" step="0.01"
                    value={state.amount}
                    onChange={(e) => handleRateAmtChange(item.id, "amount", e.target.value)}
                    disabled={state.quantity === 0}
                    className="w-28 text-right font-bold text-foreground rounded border bg-transparent py-1 px-1.5 text-xs focus:outline-none disabled:opacity-50"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── custom line rows ──────────────────────────────────────────
  const renderCustomLines = (dept: string, isVar: boolean) =>
    customLines
      .filter((l) => l.department === dept)
      .map((line, cIdx) => {
        const actualIdx = customLines.indexOf(line);
        return (
          <div key={cIdx} className="grid grid-cols-1 gap-2.5 sm:grid-cols-4 items-end bg-muted/20 p-3 rounded-lg border">
            <div className="sm:col-span-1 space-y-1">
              <Label className="text-[10px]">Service Name</Label>
              <Input
                type="text" placeholder="Service name"
                value={line.serviceName}
                onChange={(e) => handleCustomLineChange(actualIdx, "serviceName", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Qty</Label>
              <Input
                type="number" placeholder="1"
                value={line.quantity}
                onChange={(e) => handleCustomLineChange(actualIdx, "quantity", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Rate</Label>
              {line.rate > 0 ? (
                <Input
                  type="number" placeholder="0"
                  value={line.rate}
                  onChange={(e) => handleCustomLineChange(actualIdx, "rate", e.target.value)}
                  required
                />
              ) : (
                <div className="h-10 flex items-center justify-between border rounded-md px-3 bg-muted/20 text-[10px] text-muted-foreground select-none">
                  <span>Hidden</span>
                  <button
                    type="button"
                    onClick={() => handleCustomLineChange(actualIdx, "rate", String(line.amount / (line.quantity || 1)))}
                    className="text-teal-650 hover:underline font-bold cursor-pointer"
                  >
                    Show
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <div className="space-y-1 flex-1">
                <Label className="text-[10px]">Total</Label>
                <Input
                  type="number"
                  value={line.amount}
                  onChange={(e) => handleCustomLineChange(actualIdx, "amount", e.target.value)}
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveCustomLine(actualIdx)}
                className="p-2 border rounded-md hover:bg-rose-500/10 text-rose-500 hover:border-rose-500/30 self-end mb-0.5 cursor-pointer"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        );
      });

  // ── render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-20">
      {/* Full-screen blocking overlay while the report is being saved.
          Sits above everything (including sticky headers/sidebars) so the
          user can't interact with anything mid-submit. */}
      {isPending && (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
          <Loader2 size={32} className="animate-spin text-teal-650" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {mode === "new" ? "Saving report..." : "Saving changes..."}
          </p>
        </div>
      )}

      {header}

      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-4 rounded-lg border border-rose-200 text-sm font-semibold flex items-center gap-2"
        >
          <AlertTriangle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* fieldset (display:contents) disables every input/select/button in both
          the form panel and the Live Summary sidebar while a save is in-flight,
          without touching the grid layout that lives on the div below it. */}
      <fieldset disabled={isPending} className="contents">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 items-start">
          {/* ── Form panel ─────────────────────────────────────── */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5">

            {/* 1. Header Details */}
            <Card className="border shadow-xs bg-white/70 dark:bg-slate-900/40 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-teal-650 dark:text-teal-400">
                  1. Header Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 items-baseline">
                <div className="space-y-1 flex flex-col justify-end">
                  <Label htmlFor="repDate" className="mb-1">Report Date</Label>
                  {mode === "new" ? (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="repDate"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-10 border rounded-md px-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-50",
                            !reportDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                          {reportDate ? (
                            format(new Date(reportDate), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={reportDate ? new Date(reportDate) : undefined}
                          disabled={{ after: new Date() }}
                          onSelect={(date) => {
                            if (date) {
                              const yyyy = date.getFullYear();
                              const mm = String(date.getMonth() + 1).padStart(2, '0');
                              const dd = String(date.getDate()).padStart(2, '0');
                              setReportDate(`${yyyy}-${mm}-${dd}`);
                            }
                          }}
                        // initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Input type="text" value={lockedReportDate ?? ""} disabled className="opacity-70 h-10" />
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="openBal">Opening Balance (B/f)</Label>
                  <Input
                    id="openBal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    required
                  />
                </div>
                {/* Separator and Night Services */}
                <div className="sm:col-span-2 border-t pt-4 mt-2 space-y-4">
                  <button
                    type="button"
                    onClick={() => toggleSection("night")}
                    className="w-full text-left flex justify-between items-center focus:outline-none cursor-pointer"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Night Time / After-EOD Services
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Services performed after previous day's end-of-day reporting, to be accounted in today's report
                      </p>
                    </div>
                    <span className="text-xs font-bold text-teal-600 shrink-0 ml-4">
                      {openSections.night ? "COLLAPSE ✕" : "EXPAND ▾"}
                    </span>
                  </button>

                  {openSections.night && (
                    <div className="space-y-4 pt-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          Add a service performed during the night:
                        </span>
                        {renderNightCatalogAutocomplete()}
                      </div>

                      {nightServices.length > 0 ? (
                        <div className="overflow-x-auto border rounded-lg">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b bg-muted/40 font-semibold text-muted-foreground text-[10px] uppercase">
                                <th className="p-3">Service Name</th>
                                <th className="p-3 text-center w-24">Quantity</th>
                                <th className="p-3 text-right w-32">Rate (INR)</th>
                                <th className="p-3 text-right w-36">Total (INR)</th>
                                <th className="p-3 text-center w-16">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y bg-slate-50/20 dark:bg-slate-900/10">
                              {nightServices.map((item, idx) => {
                                const s = catalogList.find((x) => x.id === item.serviceId);
                                return (
                                  <tr key={idx} className="hover:bg-muted/10">
                                    <td className="p-3 font-semibold text-teal-600 dark:text-teal-400">
                                      {s?.serviceName || "Unknown Service"}
                                    </td>
                                    <td className="p-3 text-center">
                                      <input
                                        type="number"
                                        min="1"
                                        value={item.quantity || ""}
                                        onChange={(e) => handleNightQtyChange(idx, e.target.value)}
                                        className="w-20 rounded border bg-transparent text-center py-1 text-xs font-bold focus:outline-none"
                                      />
                                    </td>
                                    <td className="p-3 text-right">
                                      {item.rate > 0 ? (
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={item.rate}
                                          onChange={(e) => handleNightRateAmtChange(idx, "rate", e.target.value)}
                                          className="w-24 text-right rounded border bg-transparent py-1 px-1.5 text-xs focus:outline-none"
                                        />
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleNightRateAmtChange(idx, "rate", String(s?.defaultRate || 0))}
                                          className="text-[10px] text-teal-650 hover:underline cursor-pointer font-bold"
                                        >
                                          Reset Rate
                                        </button>
                                      )}
                                    </td>
                                    <td className="p-3 text-right">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.amount}
                                        onChange={(e) => handleNightRateAmtChange(idx, "amount", e.target.value)}
                                        className="w-28 text-right font-bold text-foreground rounded border bg-transparent py-1 px-1.5 text-xs focus:outline-none"
                                      />
                                    </td>
                                    <td className="p-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveNightService(idx)}
                                        className="p-1.5 border rounded-md hover:bg-rose-500/10 text-rose-500 hover:border-rose-500/30 cursor-pointer"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                          No night time services added yet. Use the search box above to add one.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>


            {/* Dynamic service sections — one per master category */}
            {activeCategories.map((cat, catIdx) => {
              const sectionKey = `cat_${cat.code}`;
              const isOpen = openSections[sectionKey] ?? false;
              const deptCatalog = getCatalogForDept(cat.code);
              return (
                <Card key={cat.code} className="border shadow-xs bg-white/70 dark:bg-slate-900/40">
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionKey)}
                    className="w-full text-left p-5 border-b focus:outline-none flex justify-between items-center cursor-pointer"
                  >
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-wider text-teal-650 dark:text-teal-400">
                        {catIdx + 2}. {cat.label} Services
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Services &amp; receipts for the {cat.label} department
                      </CardDescription>
                    </div>
                    <span className="text-xs font-bold text-teal-600">{isOpen ? "COLLAPSE ✕" : "EXPAND ▾"}</span>
                  </button>
                  {isOpen && (
                    <CardContent className="p-5 space-y-4">
                      {deptCatalog.length === 0 ? (
                        <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                          No items found for <strong>{cat.label}</strong>. Add services under Accounts → Service Charges.
                        </div>
                      ) : renderServiceTable(deptCatalog, cat.isVariableAmount)}

                      <div className="space-y-3 pt-4 border-t">
                        <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">Custom {cat.label} Items</h5>
                        {renderCustomLines(cat.code, cat.isVariableAmount)}
                        <div className="flex flex-wrap gap-4 items-end mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div className="pb-0.5">
                            <Button type="button" variant="outline" size="default" onClick={() => handleAddCustomLine(cat.code)} className="font-semibold cursor-pointer text-xs h-10">
                              <Plus size={13} className="mr-1" /> Add Custom Line
                            </Button>
                          </div>
                          {renderCatalogAutocomplete(cat.code)}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}

            {/* IPD Admissions & Discharges — section number shifts after dynamic categories */}
            {/* N+2 = activeCategories.length + 2 */}
            {/* 6 (was hardcoded) → now dynamic number */}
            {/* 6. IPD Admissions & Discharges */}
            {/* <Card className="border shadow-xs bg-white/70 dark:bg-slate-900/40 backdrop-blur">
            <button
              type="button"
              onClick={() => toggleSection("ipd")}
              className="w-full text-left p-5 border-b focus:outline-none flex justify-between items-center cursor-pointer"
            >
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-teal-650 dark:text-teal-400">
                  6. IPD Admissions &amp; Discharges
                </CardTitle>
                <CardDescription className="text-xs">IPD Admission collections, advances, observations &amp; discharges</CardDescription>
              </div>
              <span className="text-xs font-bold text-teal-600">{openSections.ipd ? "COLLAPSE ✕" : "EXPAND ▾"}</span>
            </button>
            {openSections.ipd && (
              <CardContent className="p-5 space-y-5">
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">Admissions / Advances</h5>
                  {ipdAdmissions.map((item, idx) => (
                    <div key={idx} className="flex flex-wrap gap-3 items-end bg-muted/15 p-2.5 rounded border">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px]">Patient Name</Label>
                        <Input
                          type="text"
                          value={item.patientName}
                          onChange={(e) => setIpdAdmissions(ipdAdmissions.map((ad, i) => (i === idx ? { ...ad, patientName: e.target.value } : ad)))}
                          required
                        />
                      </div>
                      <Select
                        label="Type"
                        options={IPD_TYPES}
                        value={item.type}
                        className="w-48"
                        onChange={(e) => setIpdAdmissions(ipdAdmissions.map((ad, i) => (i === idx ? { ...ad, type: e.target.value as any } : ad)))}
                        required
                      />
                      <div className="w-36 space-y-1">
                        <Label className="text-[10px]">Amount (INR)</Label>
                        <Input
                          type="number"
                          value={item.amount || ""}
                          onChange={(e) => setIpdAdmissions(ipdAdmissions.map((ad, i) => (i === idx ? { ...ad, amount: parseFloat(e.target.value) || 0 } : ad)))}
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIpdAdmissions(ipdAdmissions.filter((_, i) => i !== idx))}
                        className="p-2 border rounded-md hover:bg-rose-500/10 text-rose-500 hover:border-rose-500/30 cursor-pointer mb-0.5"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => setIpdAdmissions([...ipdAdmissions, { patientName: "", type: "ADMISSION", amount: 0 }])} className="font-semibold cursor-pointer text-xs">
                    <Plus size={13} className="mr-1" /> Add Admission Record
                  </Button>
                </div>
                <div className="space-y-3 pt-4 border-t">
                  <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">Discharges</h5>
                  {ipdDischarges.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-end bg-muted/15 p-2.5 rounded border">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px]">Patient Name</Label>
                        <Input
                          type="text"
                          value={item.patientName}
                          onChange={(e) => setIpdDischarges(ipdDischarges.map((d, i) => (i === idx ? { ...d, patientName: e.target.value } : d)))}
                          required
                        />
                      </div>
                      <div className="w-48 space-y-1">
                        <Label className="text-[10px]">Amount (INR)</Label>
                        <Input
                          type="number"
                          value={item.amount || ""}
                          onChange={(e) => setIpdDischarges(ipdDischarges.map((d, i) => (i === idx ? { ...d, amount: parseFloat(e.target.value) || 0 } : d)))}
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setIpdDischarges(ipdDischarges.filter((_, i) => i !== idx))}
                        className="p-2 border rounded-md hover:bg-rose-500/10 text-rose-500 hover:border-rose-500/30 cursor-pointer mb-0.5"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => setIpdDischarges([...ipdDischarges, { patientName: "", amount: 0 }])} className="font-semibold cursor-pointer text-xs">
                    <Plus size={13} className="mr-1" /> Add Discharge Record
                  </Button>
                </div>
              </CardContent>
            )}
          </Card> */}

            <Card className="border shadow-xs bg-white/70 dark:bg-slate-900/40 backdrop-blur">
              <button
                type="button"
                onClick={() => toggleSection("discounts")}
                className="w-full text-left p-5 border-b focus:outline-none flex justify-between items-center cursor-pointer"
              >
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-wider text-teal-650 dark:text-teal-400">
                    {activeCategories.length + 5}. Discounts &amp; Returns
                  </CardTitle>
                  <CardDescription className="text-xs">Refunds and discounts given</CardDescription>
                </div>
                <span className="text-xs font-bold text-teal-600">{openSections.discounts ? "COLLAPSE ✕" : "EXPAND ▾"}</span>
              </button>
              {openSections.discounts && (
                <CardContent className="p-5 space-y-4">
                  {discountsReturns.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-end bg-muted/15 p-2.5 rounded border">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px]">Description</Label>
                        <Input
                          type="text"
                          placeholder="e.g. Discount for Patient X"
                          value={item.label}
                          onChange={(e) => setDiscountsReturns(discountsReturns.map((dr, i) => (i === idx ? { ...dr, label: e.target.value } : dr)))}
                          required
                        />
                      </div>
                      <div className="w-48 space-y-1">
                        <Label className="text-[10px]">Amount (INR)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={item.amount || ""}
                          onChange={(e) => setDiscountsReturns(discountsReturns.map((dr, i) => (i === idx ? { ...dr, amount: parseFloat(e.target.value) || 0 } : dr)))}
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setDiscountsReturns(discountsReturns.filter((_, i) => i !== idx))}
                        className="p-2 border rounded-md hover:bg-rose-500/10 text-rose-500 hover:border-rose-500/30 cursor-pointer mb-0.5"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => setDiscountsReturns([...discountsReturns, { label: "", amount: 0 }])} className="font-semibold cursor-pointer text-xs">
                    <Plus size={13} className="mr-1" /> Add Discount / Return
                  </Button>
                </CardContent>
              )}
            </Card>

            <Card className="border shadow-xs bg-white/70 dark:bg-slate-900/40 backdrop-blur">
              <button
                type="button"
                onClick={() => toggleSection("exp")}
                className="w-full text-left p-5 border-b focus:outline-none flex justify-between items-center cursor-pointer"
              >
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-wider text-teal-650 dark:text-teal-400">
                    {activeCategories.length + 3}. Expenditures &amp; Staff Advances
                  </CardTitle>
                  <CardDescription className="text-xs">Daily payouts, vendor settlements, and salaries</CardDescription>
                </div>
                <span className="text-xs font-bold text-teal-600">{openSections.exp ? "COLLAPSE ✕" : "EXPAND ▾"}</span>
              </button>
              {openSections.exp && (
                <CardContent className="p-5 space-y-5">
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">Outflow Payments</h5>
                    <datalist id="predefined-expenses">
                      {expCatalogList.map((item) => (
                        <option key={item.id} value={item.itemName}>
                          {item.itemName} ({activeExpCategories.find(c => c.code === item.category)?.label || item.category} - ₹{item.defaultAmount})
                        </option>
                      ))}
                    </datalist>

                    {expenditures.map((item, idx) => (
                      <div key={idx} className="flex flex-wrap gap-3 items-end bg-muted/15 p-2.5 rounded border">
                        <Select
                          label="Category"
                          options={expCategoriesOptions}
                          value={item.category}
                          className="w-48"
                          onChange={(e) => setExpenditures(expenditures.map((ex, i) => (i === idx ? { ...ex, category: e.target.value } : ex)))}
                          required
                        />
                        <div className="flex-1 space-y-1">
                          <Label className="text-[10px]">Details / Payee</Label>
                          <Input
                            type="text"
                            list="predefined-expenses"
                            placeholder="e.g. M/S SB Surgical, Bamboo purchase"
                            value={item.details}
                            onChange={(e) => {
                              const val = e.target.value;
                              const matched = expCatalogList.find((x) => x.itemName.toUpperCase() === val.toUpperCase());
                              if (matched) {
                                setExpenditures(
                                  expenditures.map((ex, i) =>
                                    i === idx
                                      ? { ...ex, details: val, category: matched.category, amount: toNum(matched.defaultAmount) }
                                      : ex
                                  )
                                );
                              } else {
                                setExpenditures(
                                  expenditures.map((ex, i) =>
                                    i === idx ? { ...ex, details: val } : ex
                                  )
                                );
                              }
                            }}
                            required
                          />
                        </div>
                        <div className="w-36 space-y-1">
                          <Label className="text-[10px]">Amount (INR)</Label>
                          <Input
                            type="number"
                            value={item.amount || ""}
                            onChange={(e) => setExpenditures(expenditures.map((ex, i) => (i === idx ? { ...ex, amount: parseFloat(e.target.value) || 0 } : ex)))}
                            required
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpenditures(expenditures.filter((_, i) => i !== idx))}
                          className="p-2 border rounded-md hover:bg-rose-500/10 text-rose-500 hover:border-rose-500/30 cursor-pointer mb-0.5"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => setExpenditures([...expenditures, { category: expCategoriesOptions[0] || "MISC", details: "", amount: 0 }])} className="font-semibold cursor-pointer text-xs">
                      <Plus size={13} className="mr-1" /> Add Outflow Record
                    </Button>
                  </div>
                  <div className="space-y-3 pt-4 border-t">
                    <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">Staff Advances</h5>
                    {staffAdvances.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-end bg-muted/15 p-2.5 rounded border">
                        <div className="flex-1 space-y-1">
                          <Autocomplete
                            label="Staff Member"
                            value={item.staffId ? String(item.staffId) : ""}
                            onChange={(val) => {
                              const selectedStaff = staffList.find((s) => String(s.staffId) === val);
                              setStaffAdvances(
                                staffAdvances.map((sa, i) =>
                                  i === idx
                                    ? {
                                        ...sa,
                                        staffId: val ? Number(val) : undefined,
                                        staffName: selectedStaff ? selectedStaff.name : "",
                                      }
                                    : sa
                                )
                              );
                            }}
                            options={staffOptions}
                            placeholder="Select staff..."
                          />
                        </div>
                        <div className="w-48 space-y-1">
                          <Label className="text-[10px]">Amount (INR)</Label>
                          <Input
                            type="number"
                            value={item.amount || ""}
                            onChange={(e) => setStaffAdvances(staffAdvances.map((sa, i) => (i === idx ? { ...sa, amount: parseFloat(e.target.value) || 0 } : sa)))}
                            required
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setStaffAdvances(staffAdvances.filter((_, i) => i !== idx))}
                          className="p-2 border rounded-md hover:bg-rose-500/10 text-rose-500 hover:border-rose-500/30 cursor-pointer mb-0.5"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={() => setStaffAdvances([...staffAdvances, { staffName: "", amount: 0 }])} className="font-semibold cursor-pointer text-xs">
                      <Plus size={13} className="mr-1" /> Add Staff Advance
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* <Card className="border shadow-xs bg-white/70 dark:bg-slate-900/40 ">
            <button
              type="button"
              onClick={() => toggleSection("add")}
              className="w-full text-left p-5 border-b focus:outline-none flex justify-between items-center cursor-pointer"
            >
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-teal-650 dark:text-teal-400">
                  {activeCategories.length + 4}. Additional Income
                </CardTitle>
                <CardDescription className="text-xs">IVF injections, Lifecell, outsourced diagnostic sales, and fund transfers</CardDescription>
              </div>
              <span className="text-xs font-bold text-teal-600">{openSections.add ? "COLLAPSE ✕" : "EXPAND ▾"}</span>
            </button>
            {openSections.add && (
              <CardContent className="p-5 space-y-4">
                {additionalIncome.map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-end bg-muted/15 p-2.5 rounded border">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px]">Income Label</Label>
                      <Input
                        type="text"
                        placeholder="e.g. IVF Injection, Lifecell"
                        value={item.label}
                        onChange={(e) => setAdditionalIncome(additionalIncome.map((add, i) => (i === idx ? { ...add, label: e.target.value } : add)))}
                        required
                      />
                    </div>
                    <div className="w-48 space-y-1">
                      <Label className="text-[10px]">Amount (INR)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={item.amount || ""}
                        onChange={(e) => setAdditionalIncome(additionalIncome.map((add, i) => (i === idx ? { ...add, amount: parseFloat(e.target.value) || 0 } : add)))}
                        required
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdditionalIncome(additionalIncome.filter((_, i) => i !== idx))}
                      className="p-2 border rounded-md hover:bg-rose-500/10 text-rose-500 hover:border-rose-500/30 cursor-pointer mb-0.5"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => setAdditionalIncome([...additionalIncome, { label: "", amount: 0 }])} className="font-semibold cursor-pointer text-xs">
                  <Plus size={13} className="mr-1" /> Add Additional Income
                </Button>
              </CardContent>
            )}
          </Card> */}



            <Card className="border shadow-xs bg-white/70 dark:bg-slate-900/40 ">
              <button
                type="button"
                onClick={() => toggleSection("deposits")}
                className="w-full text-left p-5 border-b focus:outline-none flex justify-between items-center cursor-pointer"
              >
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-wider text-teal-650 dark:text-teal-400">
                    {activeCategories.length + 6}. Bank Deposits
                  </CardTitle>
                  <CardDescription className="text-xs">Record cash deposits made to specific bank accounts</CardDescription>
                </div>
                <span className="text-xs font-bold text-teal-600">{openSections.deposits ? "COLLAPSE ✕" : "EXPAND ▾"}</span>
              </button>
              {openSections.deposits && (
                <CardContent className="p-5 space-y-4">
                  {bankDeposits.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-end bg-muted/15 p-2.5 rounded border">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[10px]">Bank Account / Name</Label>
                        <Input
                          type="text"
                          placeholder="e.g. Sir (ICICI)"
                          value={item.bankName}
                          onChange={(e) => setBankDeposits(bankDeposits.map((bd, i) => i === idx ? { ...bd, bankName: e.target.value } : bd))}
                          required
                        />
                      </div>
                      <div className="w-48 space-y-1">
                        <Label className="text-[10px]">Amount (INR)</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={item.amount || ""}
                          onChange={(e) => setBankDeposits(bankDeposits.map((bd, i) => i === idx ? { ...bd, amount: parseFloat(e.target.value) || 0 } : bd))}
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setBankDeposits(bankDeposits.filter((_, i) => i !== idx))}
                        className="p-2 border rounded-md hover:bg-rose-500/10 text-rose-500 hover:border-rose-500/30 cursor-pointer mb-0.5"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => setBankDeposits([...bankDeposits, { bankName: "", amount: 0 }])} className="font-semibold cursor-pointer text-xs">
                    <Plus size={13} className="mr-1" /> Add Bank Deposit
                  </Button>
                  {bankDeposits.length > 0 && (
                    <div className="pt-3 border-t flex justify-between items-center text-sm font-bold text-teal-600">
                      <span>Total Bank Deposits:</span>
                      <span>{fmt(derivedBankDepositTotal)}</span>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            <Card className="border shadow-xs bg-white/70 dark:bg-slate-900/40 backdrop-blur">
              <button
                type="button"
                onClick={() => toggleSection("reconcile")}
                className="w-full text-left p-5 border-b focus:outline-none flex justify-between items-center cursor-pointer"
              >
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-wider text-teal-650 dark:text-teal-400">
                    {activeCategories.length + 7}. Payment Channel Reconciliation
                  </CardTitle>
                  <CardDescription className="text-xs">Reconcile transaction collections by card, UPI, and cash per bank channel</CardDescription>
                </div>
                <span className="text-xs font-bold text-teal-600">{openSections.reconcile ? "COLLAPSE ✕" : "EXPAND ▾"}</span>
              </button>
              {openSections.reconcile && (
                <CardContent className="p-5 space-y-4">
                  {paymentChannels
                    .map((item, idx) => ({ item, idx }))
                    .map(({ item, idx }) => (
                      <div key={idx} className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end bg-muted/15 p-3 rounded border">
                        <Select
                          label="Bank"
                          options={BANKS}
                          value={item.bank}
                          onChange={(e) => setPaymentChannels(paymentChannels.map((pc, i) => (i === idx ? { ...pc, bank: e.target.value } : pc)))}
                          required
                        />
                        <Select
                          label="Channel"
                          options={CHANNELS}
                          value={item.channel}
                          onChange={(e) => setPaymentChannels(paymentChannels.map((pc, i) => (i === idx ? { ...pc, channel: e.target.value } : pc)))}
                          required
                        />
                        <div className="space-y-1">
                          <Label className="text-[10px]">Description / Source</Label>
                          <Input
                            type="text"
                            placeholder="e.g. Front OPD card reader"
                            value={item.sourceLabel}
                            onChange={(e) => setPaymentChannels(paymentChannels.map((pc, i) => (i === idx ? { ...pc, sourceLabel: e.target.value } : pc)))}
                            required
                          />
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="space-y-1 flex-1">
                            <Label className="text-[10px]">Amount (INR)</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={item.amount || ""}
                              onChange={(e) => setPaymentChannels(paymentChannels.map((pc, i) => (i === idx ? { ...pc, amount: parseFloat(e.target.value) || 0 } : pc)))}
                              required
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setPaymentChannels(paymentChannels.filter((_, i) => i !== idx))}
                            className="p-2 border rounded-md hover:bg-rose-500/10 text-rose-500 hover:border-rose-500/30 cursor-pointer mb-0.5"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  <Button type="button" variant="outline" onClick={() => setPaymentChannels([...paymentChannels, { bank: "CASH", channel: "CASH", sourceLabel: "", amount: 0 }])} className="font-semibold cursor-pointer text-xs">
                    <Plus size={13} className="mr-1" /> Add Payment Channel
                  </Button>
                </CardContent>
              )}
            </Card>
          </form>

          {/* ── Live Summary Sidebar ────────────────────────────── */}
          <div className="lg:col-span-1 space-y-5 lg:sticky lg:top-24">
            <Card className="border border-teal-600/30 bg-amber-200/10 dark:bg-teal-500/5  shadow-md rounded-xl p-5 space-y-4">
              <h4 className="font-extrabold text-base border-b pb-2 text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Live Summary
              </h4>

              <div className="text-xs ">
                {/* income and expenditure section */}
                <div className="space-y-2 border p-2 -mx-2 my-3 rounded-lg border-lime-800">
                  <p className="font-semibold text-lg">Income and Expenditure</p>
                  <hr className="border-b-2 border-fuchsia-800/30" />
                  <div className="text-emerald-400  px-2">
                    {activeCategories.map((cat) => (
                      <div key={cat.code} className="flex justify-between">
                        <span className="font-semibold">{cat.label}</span>
                        <span className="font-bold">{fmt(categoryTotals[cat.code] ?? 0)}</span>
                      </div>
                    ))}

                    {nightServicesTotal > 0 && (
                      <div className="flex justify-between text-indigo-400">
                        <span className="font-semibold">Night Income</span>
                        <span className="font-bold">{fmt(nightServicesTotal)}</span>
                      </div>
                    )}

                    {discountsTotal > 0 && (
                      <div className="flex justify-between text-rose-400 dark:text-rose-300">
                        <span className="font-semibold">Less: Discounts/Returns:</span>
                        <span className="font-bold">-{fmt(discountsTotal)}</span>
                      </div>
                    )}
                  </div>
                  <div className="bg-emerald-500/40 pb-2 px-2 rounded-xl">
                    <div className="grid grid-cols-2  pt-2 font-bold ">
                      <span>Total Income:</span>
                      <span className="text-right">{fmt(totalIncome)}</span>
                    </div>

                    <div className="grid grid-cols-4  pt-2 font-bold ">
                      <span>  </span>
                      <span>Cash </span>
                      <span className="text-right col-span-2">{fmt(cashReceiptsSum)}</span>
                    </div>

                    <div className="grid grid-cols-4  font-bold ">
                      <span>  </span>
                      <span>Bank </span>
                      <span className="text-right col-span-2">{fmt(bankReceiptsSum)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between border-b pb-2 pt-1 px-2 bg-rose-500/60 rounded-xl">
                    <span className="font-semibold text-slate-50">Total Expenditures:</span>
                    <span className="font-bold ">{fmt(totalExpenditures)}</span>
                  </div>
                  <div className="flex justify-between font-bold  px-2">
                    <span>Net Balance:</span>
                    <span>{fmt(netBalance)}</span>
                  </div>
                </div>
                {/* cash management section */}
                <div className=" space-y-2 border p-2 -mx-2 rounded-lg border-lime-800 bg-slate-700/60">
                  <span className="font-semibold text-lg">Cash Management</span>
                  <hr className="border-b-2 border-fuchsia-800/30" />
                  <div className="flex justify-between text-emerald-300 px-2">
                    <span className="font-semibold">Opening Balance:</span>
                    <span className="font-bold">{fmt(openBal)}</span>
                  </div>
                  <div className="px-2">
                    <div className="grid grid-cols-2 items-baseline mt-2 text-emerald-300">
                      <Label className="text-emerald-300">Cash Receipt (Sir)</Label>
                      <Input
                        type="number" step="0.01"
                        className="font-semibold text-right pr-0 bg-transparent"
                        value={cashReceiptSir}
                        onChange={(e) => handleCashReceiptChange("SIR", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 items-baseline mt-2 text-emerald-300">
                      <Label className="text-emerald-300">Cash Receipt (Mam)</Label>
                      <Input
                        type="number" step="0.01"
                        className="font-semibold text-right pr-0 bg-transparent"
                        value={cashReceiptMam}
                        onChange={(e) => handleCashReceiptChange("MAM", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 items-baseline mt-2 text-emerald-300">
                      <Label className="text-emerald-300">Cash Receipt (Acon)</Label>
                      <Input
                        type="number" step="0.01"
                        className="font-semibold text-right pr-0 bg-transparent"
                        value={cashReceiptAcon}
                        onChange={(e) => handleCashReceiptChange("ACON", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 items-baseline mt-2 text-emerald-300">
                      <Label className="text-emerald-300">Bank Receipt (Sir)</Label>
                      <Input
                        type="number" step="0.01"
                        className="font-semibold text-right pr-0 bg-transparent"
                        value={bankReceiptSir}
                        onChange={(e) => setBankReceiptSir(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 items-center mt-2 text-emerald-300 ">
                      <Label className="text-emerald-300">Receipt Bank</Label>
                      <select
                        className="font-semibold dark:bg-slate-900 text-emerald-300 border outline-none cursor-pointer h-8 rounded-lg w-full text-left pl-2 focus:ring-0 [&>option]:bg-slate-800 [&>option]:text-emerald-300"
                        value={bankReceiptSirBank}
                        onChange={(e) => setBankReceiptSirBank(e.target.value)}
                      >
                        <option value="" >Select Bank</option>
                        {BANKS.filter(b => b !== "CASH").map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-between text-emerald-300 mt-4">
                      <span className="font-semibold">Add Cash Receipts:</span>
                      <span className="font-bold">{fmt(cashReceiptsSum)}</span>
                    </div>
                    <div className="flex justify-between text-rose-300 mt-2 mb-4">
                      <span className="font-semibold">Less Expenditure:</span>
                      <span className="font-bold">{fmt(totalExpenditures)}</span>
                    </div>

                    <div className="flex justify-between items-baseline mt-2 text-rose-300">
                      <span className="font-semibold text-xs">Less Bank Deposit</span>
                      <span className="font-bold text-xs">{fmt(derivedBankDepositTotal)}</span>
                    </div>
                    <div className="grid grid-cols-2 items-baseline mt-2 text-rose-300">
                      <Label className=" text-rose-300"> Handover (Sir)</Label>
                      <Input
                        type="number" step="0.01"
                        className=" font-semibold text-right pr-0 bg-transparent"
                        value={fundHandoverSir}
                        onChange={(e) => setFundHandoverSir(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 items-baseline mt-2 text-rose-300">
                      <Label className=" text-rose-300">Handover (Madam)</Label>
                      <Input
                        type="number" step="0.01"
                        className=" font-semibold text-right pr-0 bg-transparent"
                        value={fundHandoverMadam}
                        onChange={(e) => setFundHandoverMadam(e.target.value)}
                      />
                    </div>
                  </div>
                </div>



                <div className="space-y-1.5 border-t pt-3 mt-3">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-600 dark:text-slate-400">
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
                    Channel sum: {fmt(paymentChannelsSum)}<br />
                    Net revenue: {fmt(revenueToReconcile)}
                  </div>
                  {!isReconciled && (
                    <p className="mt-1.5 text-[9px] font-bold uppercase text-rose-700 dark:text-rose-400">
                      Mismatch: {fmt(Math.abs(paymentChannelsSum - revenueToReconcile))}
                    </p>
                  )}
                </div>
              </div>

              {/* Submission Actions */}
              <div className="space-y-2 pt-2">
                <Select
                  label="Save Status"
                  options={[["draft", "Draft Log"], ["submitted", "Submit & Lock"]]}
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  required
                />
                <Button
                  onClick={handleSubmit}
                  className="w-full bg-teal-650 hover:bg-teal-700 text-white font-bold cursor-pointer gap-1.5 mt-2 h-10"
                  disabled={isPending}
                >
                  <Save size={16} />
                  {isPending
                    ? mode === "new" ? "Saving..." : "Saving changes..."
                    : "Save Daily Statement"}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </fieldset>
    </div>
  );
}