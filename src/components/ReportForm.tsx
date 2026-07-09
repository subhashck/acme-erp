import * as React from "react";
import { Plus, Trash2, Save, AlertTriangle, CheckCircle } from "lucide-react";
import { useRpcQuery } from "../lib/query";
import { client } from "../services/rpc";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Input } from "../ui/input";
import { Select } from "../ui/select";
import { Label } from "../ui/label";
import { cn } from "../utils/cn";
import { Autocomplete } from "../ui/autocomplete";

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

// ─────────────────────────── constants ───────────────────────────

const EXP_CATEGORIES = ["SALARY", "VENDOR", "MISC"];
const IPD_TYPES = ["ADMISSION", "ADVANCE", "OBSERVATION"];
const BANKS = ["ICICI", "HDFC", "BOI", "CASH", "OTHER"];
const CHANNELS = ["CARD", "UPI", "QR", "RTGS", "CASH"];

const DEFAULT_PAYMENT_CHANNELS = [
  { bank: "ICICI", channel: "CARD", sourceLabel: "Front OPD Card", amount: 0 },
  { bank: "HDFC", channel: "UPI", sourceLabel: "Front OPD UPI", amount: 0 },
  { bank: "HDFC", channel: "CARD", sourceLabel: "Pharmacy Card", amount: 0 },
  { bank: "BOI", channel: "UPI", sourceLabel: "Pharmacy UPI", amount: 0 },
];

// ─────────────────────────── types ───────────────────────────────

type ServiceQty = Record<number, { rate: number; quantity: number; amount: number }>;
type CustomLine = { serviceName: string; department: string; rate: number; quantity: number; amount: number };
type MiscIncome = { label: string; amount: number };
type IpdAdmission = { patientName: string; type: "ADMISSION" | "ADVANCE" | "OBSERVATION"; amount: number };
type IpdDischarge = { patientName: string; amount: number };
type Expenditure = { category: string; details: string; amount: number };
type StaffAdvance = { staffName: string; amount: number };
type AdditionalIncome = { label: string; amount: number };
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
  cashReceipts: number;
  status: "draft" | "submitted";
  serviceLines: Array<{ serviceId: number | null; rate: number; quantity: number; amount: number }>;
  expenditures: Expenditure[];
  staffAdvances: StaffAdvance[];
  ipdAdmissions: IpdAdmission[];
  ipdDischarges: IpdDischarge[];
  additionalIncome: AdditionalIncome[];
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
  const [bankDeposit, setBankDeposit] = React.useState("0");
  const [fundHandoverSir, setFundHandoverSir] = React.useState("0");
  const [fundHandoverMadam, setFundHandoverMadam] = React.useState("0");
  const [status, setStatus] = React.useState<"draft" | "submitted">("draft");
  const [cashReceiptSir, setCashReceiptSir] = React.useState("0");
  const [cashReceiptMam, setCashReceiptMam] = React.useState("0");
  const [cashReceiptAcon, setCashReceiptAcon] = React.useState("0");

  // ── collapsible sections ──────────────────────────────────────
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
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

  // ── auto-populate opening balance in new mode ─────────────────
  const pastReportsQuery = useRpcQuery<any[]>(
    ["daily-closing-reports-latest"],
    () => client["daily-closing"].reports.$get(),
    { enabled: mode === "new" }
  );

  React.useEffect(() => {
    if (mode === "new" && pastReportsQuery.data && pastReportsQuery.data.length > 0) {
      const sorted = [...pastReportsQuery.data].sort((a, b) => b.reportDate.localeCompare(a.reportDate));
      const latest = sorted[0];
      if (latest && parseFloat(latest.closingBalance) > 0) {
        setOpeningBalance(String(latest.closingBalance));
      }
    }
  }, [pastReportsQuery.data, mode]);

  // ── service line state ────────────────────────────────────────
  const [serviceQuantities, setServiceQuantities] = React.useState<ServiceQty>({});
  const [customLines, setCustomLines] = React.useState<CustomLine[]>([]);

  const catalogList = catalogQuery.data ?? [];

  const expCategoriesOptions = activeExpCategories.length > 0 ? activeExpCategories.map((c) => c.code) : ["SALARY", "VENDOR", "MISC"];

  /** Returns catalog items visible for a given category code */
  const getCatalogForDept = (code: string) =>
    catalogList.filter(
      (item) => item.department === code &&
        (item.defaultShow !== false || serviceQuantities[item.id] !== undefined)
    );

  // ── other form state ──────────────────────────────────────────
  const [ipdAdmissions, setIpdAdmissions] = React.useState<IpdAdmission[]>([]);
  const [ipdDischarges, setIpdDischarges] = React.useState<IpdDischarge[]>([]);
  const [expenditures, setExpenditures] = React.useState<Expenditure[]>([]);
  const [staffAdvances, setStaffAdvances] = React.useState<StaffAdvance[]>([]);
  const [additionalIncome, setAdditionalIncome] = React.useState<AdditionalIncome[]>([]);
  const [discountsReturns, setDiscountsReturns] = React.useState<DiscountReturn[]>([]);
  const [paymentChannels, setPaymentChannels] = React.useState<PaymentChannel[]>(
    mode === "new" ? DEFAULT_PAYMENT_CHANNELS : []
  );

  // ── populate state from initialData (edit mode) ───────────────
  React.useEffect(() => {
    if (!initialData) return;

    setOpeningBalance(String(initialData.openingBalance));
    setBankDeposit(String(initialData.bankDeposit));
    setFundHandoverSir(String(initialData.fundHandoverSir));
    setFundHandoverMadam(String(initialData.fundHandoverMadam));
    setStatus(initialData.status);

    // Service lines
    const quantities: ServiceQty = {};
    const custom: CustomLine[] = [];
    initialData.serviceLines?.forEach((l: any) => {
      if (l.serviceId) {
        quantities[l.serviceId] = {
          rate: parseFloat(l.rate),
          quantity: l.quantity,
          amount: parseFloat(l.amount),
        };
      } else {
        custom.push({
          serviceName: l.serviceName || "Custom service",
          department: l.department || "OPD",
          rate: parseFloat(l.rate),
          quantity: l.quantity,
          amount: parseFloat(l.amount),
        });
      }
    });
    setServiceQuantities(quantities);
    setCustomLines(custom);

    setIpdAdmissions(initialData.ipdAdmissions?.map((item: any) => ({
      patientName: item.patientName, type: item.type, amount: parseFloat(item.amount),
    })) ?? []);
    setIpdDischarges(initialData.ipdDischarges?.map((item: any) => ({
      patientName: item.patientName, amount: parseFloat(item.amount),
    })) ?? []);
    setExpenditures(initialData.expenditures?.map((item: any) => ({
      category: item.category, details: item.details, amount: parseFloat(item.amount),
    })) ?? []);
    setStaffAdvances(initialData.staffAdvances?.map((item: any) => ({
      staffName: item.staffName, amount: parseFloat(item.amount),
    })) ?? []);
    setAdditionalIncome(initialData.additionalIncome?.map((item: any) => ({
      label: item.label, amount: parseFloat(item.amount),
    })) ?? []);
    setDiscountsReturns(initialData.discountsReturns?.map((item: any) => ({
      label: item.label, amount: parseFloat(item.amount),
    })) ?? []);
    setCashReceiptSir(String(initialData.cashReceiptSir || 0));
    setCashReceiptMam(String(initialData.cashReceiptMam || 0));
    setCashReceiptAcon(String(initialData.cashReceiptAcon || 0));

    const pChannels = (initialData.paymentChannels ?? []).map((item: any) => ({
      bank: item.bank, channel: item.channel, sourceLabel: item.sourceLabel, amount: parseFloat(item.amount),
    }));
    setPaymentChannels(pChannels);
  }, [initialData]);

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
      totals[cat.code] = catLines.reduce((sum, l) => sum + l.amount, 0);
    }
    return totals;
  }, [catalogServiceLines, customLines, activeCategories]);

  const totalCategoryIncome = Object.values(categoryTotals).reduce((s, v) => s + v, 0);

  const expTotal = expenditures.reduce((sum, item) => sum + item.amount, 0);
  const advTotal = staffAdvances.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenditures = expTotal + advTotal;

  const ipdAdmissionsTotal = ipdAdmissions.reduce((sum, item) => sum + item.amount, 0);
  const ipdDischargesTotal = ipdDischarges.reduce((sum, item) => sum + item.amount, 0);
  const additionalTotal = additionalIncome.reduce((sum, item) => sum + item.amount, 0);
  const discountsTotal = discountsReturns.reduce((sum, item) => sum + item.amount, 0);

  const openBal = parseFloat(openingBalance) || 0;

  const totalIncome = totalCategoryIncome + ipdAdmissionsTotal + ipdDischargesTotal + additionalTotal - discountsTotal;
  const netBalance = totalIncome - totalExpenditures;

  const depositVal = parseFloat(bankDeposit) || 0;
  const handoverSirVal = parseFloat(fundHandoverSir) || 0;
  const handoverMadamVal = parseFloat(fundHandoverMadam) || 0;


  const cashSirVal = parseFloat(cashReceiptSir) || 0;
  const cashMamVal = parseFloat(cashReceiptMam) || 0;
  const cashAconVal = parseFloat(cashReceiptAcon) || 0;

  const cashReceiptsSum = paymentChannels
    .filter((item) => item.bank === "CASH" && item.channel === "CASH")
    .reduce((sum, item) => sum + item.amount, 0);

  const bankReceiptsSum = paymentChannels
    .filter((item) => item.bank !== "CASH")
    .reduce((sum, item) => sum + item.amount, 0);

  const paymentChannelsSum = bankReceiptsSum + paymentChannels
    .filter((item) => item.bank === "CASH" && item.channel === "CASH")
    .reduce((sum, item) => sum + item.amount, 0) + cashSirVal + cashMamVal + cashAconVal;

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
        [serviceId]: { rate, quantity: qty, amount: rate * qty },
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
        return { ...prev, [serviceId]: { ...data, rate: val, amount: val * data.quantity } };
      } else {
        return { ...prev, [serviceId]: { ...data, amount: val } };
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
          if (!isVar) copy.amount = rateVal * copy.quantity;
        } else if (field === "quantity") {
          const qtyVal = parseInt(val, 10) || 0;
          copy.quantity = qtyVal;
          if (!isVar) copy.amount = copy.rate * qtyVal;
        } else if (field === "amount") {
          copy.amount = parseFloat(val) || 0;
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
        [id]: { rate: s.defaultRate, quantity: 1, amount: s.defaultRate },
      }));
    }
  };

  // ── submit ────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedServiceLines = [
      ...Object.entries(serviceQuantities).map(([serviceId, data]) => ({
        serviceId: parseInt(serviceId, 10),
        rate: data.rate,
        quantity: data.quantity,
        amount: data.amount,
      })),
      ...customLines.map((line) => ({
        serviceId: null,
        rate: line.rate,
        quantity: line.quantity,
        amount: line.amount,
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
      cashReceipts: cashReceiptsSum,
      status,
      serviceLines: parsedServiceLines,
      expenditures,
      staffAdvances,
      ipdAdmissions,
      ipdDischarges,
      additionalIncome,
      discountsReturns,
      paymentChannels: paymentChannels.filter((c) => c.amount > 0),
    };

    onSubmit(payload);
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
                        handleQtyChange(item.id, item.defaultRate, qtyStr);
                      }
                    }}
                    className="w-20 rounded border bg-transparent text-center py-1 text-xs font-bold focus:outline-none"
                  />
                </td>
                {!isVar && (
                  <td className="p-3 text-right">
                    <input
                      type="number" min="0" step="0.01"
                      value={state.rate}
                      onChange={(e) => handleRateAmtChange(item.id, "rate", e.target.value)}
                      disabled={state.quantity === 0}
                      className="w-24 text-right rounded border bg-transparent py-1 px-1.5 text-xs focus:outline-none disabled:opacity-50"
                    />
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
              <Input
                type="number" placeholder="0"
                value={line.rate}
                onChange={(e) => handleCustomLineChange(actualIdx, "rate", e.target.value)}
                required
              />
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
      {header}

      {errorMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-4 rounded-lg border border-rose-200 text-sm font-semibold flex items-center gap-2">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

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
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="repDate">Report Date</Label>
                {mode === "new" ? (
                  <Input
                    id="repDate"
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    required
                  />
                ) : (
                  <Input type="text" value={lockedReportDate ?? ""} disabled className="opacity-70" />
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
            </CardContent>
          </Card>


          {/* Dynamic service sections — one per master category */}
          {activeCategories.map((cat, catIdx) => {
            const sectionKey = `cat_${cat.code}`;
            const isOpen = openSections[sectionKey] ?? (catIdx === 0);
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
          <Card className="border shadow-xs bg-white/70 dark:bg-slate-900/40 backdrop-blur">
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
                                    ? { ...ex, details: val, category: matched.category, amount: matched.defaultAmount }
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
                        <Label className="text-[10px]">Staff Name</Label>
                        <Input
                          type="text"
                          value={item.staffName}
                          onChange={(e) => setStaffAdvances(staffAdvances.map((sa, i) => (i === idx ? { ...sa, staffName: e.target.value } : sa)))}
                          required
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

          <Card className="border shadow-xs bg-white/70 dark:bg-slate-900/40 ">
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
          </Card>

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
              onClick={() => toggleSection("reconcile")}
              className="w-full text-left p-5 border-b focus:outline-none flex justify-between items-center cursor-pointer"
            >
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-teal-650 dark:text-teal-400">
                  {activeCategories.length + 6}. Payment Channel Reconciliation
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
          <Card className="border border-teal-600/30 bg-teal-500/5 shadow-md rounded-xl p-5 space-y-4">
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
              <div className=" space-y-2 border p-2 -mx-2 rounded-lg border-lime-800">
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
                  <div className="flex justify-between text-emerald-300 mt-4">
                    <span className="font-semibold">Add Cash Receipts:</span>
                    <span className="font-bold">{fmt(cashReceiptsSum)}</span>
                  </div>
                  <div className="flex justify-between text-rose-300 mt-2 mb-4">
                    <span className="font-semibold">Less Expenditure:</span>
                    <span className="font-bold">{fmt(totalExpenditures)}</span>
                  </div>

                  <div className="grid grid-cols-2 items-baseline mt-2 text-rose-300">
                    <Label className=" text-rose-300">Less Bank Deposit</Label>
                    <Input
                      type="number" step="0.01"
                      className=" font-semibold text-right pr-0 bg-transparent"
                      value={bankDeposit}
                      onChange={(e) => setBankDeposit(e.target.value)}
                    />
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
    </div>
  );
}
