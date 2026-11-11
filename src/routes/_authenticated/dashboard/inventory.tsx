import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Boxes,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CloudUpload,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Key,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Store,
  Table as TableIcon,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Card, CardContent } from "@/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import * as XLSX from "xlsx-js-style";


export const Route = createFileRoute("/_authenticated/dashboard/inventory")({
  component: InventoryDashboardPage,
});

export interface StockRow {
  n: string; // Item Name
  g: string; // Group
  s: string; // Subgroup
  sl?: string; // Salt Name
  c: string; // Company
  pk?: string; // Packing
  b: string; // Batch
  e: string | null; // Expiry YYYY-MM
  m: number | null; // Months to expiry
  q: number; // Qty
  r: number; // Rate
  a: number; // Cost Amount
  p: number; // MRP
  t: number; // Total MRP
  st?: string; // Store Name
  stId?: string; // Store ID
  preferredUnit?: string;
  conversionRatio?: number;
  baseUnit?: string;
  preferredQuantity?: number;
  bk?: string; // Expiry bucket code ('x' | 'a' | 'b' | 'c' | 'd' | 'n')
}

interface BucketDef {
  k: string;
  l: string;
  bg: string;
  text: string;
  test: (m: number | null) => boolean;
}

const BUCKETS: BucketDef[] = [
  { k: "x", l: "Expired", bg: "bg-[#c8412f] dark:bg-[#ec6a56]", text: "text-white", test: (m) => m !== null && m < 0 },
  { k: "a", l: "Expires in 0-3 months", bg: "bg-[#e08a1e] dark:bg-[#f0a23d]", text: "text-white", test: (m) => m !== null && m >= 0 && m < 3 },
  { k: "b", l: "3-6 months", bg: "bg-[#c9a227] dark:bg-[#d9b84a]", text: "text-[#2b2100]", test: (m) => m !== null && m >= 3 && m < 6 },
  { k: "c", l: "6-12 months", bg: "bg-[#2f8e67] dark:bg-[#48b888]", text: "text-white", test: (m) => m !== null && m >= 6 && m < 12 },
  { k: "d", l: "Over 12 months", bg: "bg-[#2b7f94] dark:bg-[#4fa5bd]", text: "text-white", test: (m) => m !== null && m >= 12 },
  { k: "n", l: "No expiry", bg: "bg-[#7a8c91] dark:bg-[#93a7ad]", text: "text-white", test: (m) => m === null },
];

const DEFAULT_STORE_IDS = ["18", "1"]; // ACME DISPENSARY & CENTRAL STORE

function getRowAlertClasses(isExpired: boolean, isNearExp: boolean, isLowStock: boolean) {
  if (isExpired && isLowStock) {
    return {
      tr: "bg-[#feebe8] hover:bg-[#fedfd9] dark:bg-[rgba(236,106,86,0.22)] dark:hover:bg-[rgba(236,106,86,0.30)]",
      firstTd: "border-l-[3px] border-l-[#c8412f] dark:border-l-[#ec6a56]",
    };
  }
  if (isExpired) {
    return {
      tr: "bg-[#fff1f0] hover:bg-[#fee5e2] dark:bg-[rgba(236,106,86,0.15)] dark:hover:bg-[rgba(236,106,86,0.24)]",
      firstTd: "border-l-[3px] border-l-[#c8412f] dark:border-l-[#ec6a56]",
    };
  }
  if (isNearExp && isLowStock) {
    return {
      tr: "bg-[#fff2dd] hover:bg-[#fee6c4] dark:bg-[rgba(240,162,61,0.22)] dark:hover:bg-[rgba(240,162,61,0.30)]",
      firstTd: "border-l-[3px] border-l-[#e08a1e] dark:border-l-[#f0a23d]",
    };
  }
  if (isNearExp) {
    return {
      tr: "bg-[#fff8ec] hover:bg-[#fef0d5] dark:bg-[rgba(240,162,61,0.15)] dark:hover:bg-[rgba(240,162,61,0.24)]",
      firstTd: "border-l-[3px] border-l-[#e08a1e] dark:border-l-[#f0a23d]",
    };
  }
  if (isLowStock) {
    return {
      tr: "bg-[#fefde8] hover:bg-[#fef9c3] dark:bg-[rgba(234,179,8,0.13)] dark:hover:bg-[rgba(234,179,8,0.22)]",
      firstTd: "border-l-[3px] border-l-yellow-500",
    };
  }
  return {
    tr: "hover:bg-[#e6f4f5] dark:hover:bg-[#13383e] transition-colors",
    firstTd: "",
  };
}

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inrDec = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatIndianAmount(v: number, withSymbol: boolean = true): string {
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  const sym = withSymbol ? "₹" : "";

  if (a >= 1e7) {
    const formatted = (a / 1e7).toFixed(2).replace(/\.?0+$/, "");
    return `${sign}${sym}${formatted} Cr`;
  }
  if (a >= 1e5) {
    const formatted = (a / 1e5).toFixed(2).replace(/\.?0+$/, "");
    return `${sign}${sym}${formatted} L`;
  }
  if (a >= 1e3) {
    const formatted = (a / 1e3).toFixed(a >= 1e4 ? 1 : 2).replace(/\.?0+$/, "");
    return `${sign}${sym}${formatted} K`;
  }
  return `${sign}${sym}${inr.format(Math.round(a))}`;
}

function money(v: number): string {
  return formatIndianAmount(v, true);
}

function full(v: number): string {
  return "₹" + inrDec.format(v);
}

type LedgerMode = "batch" | "item" | "salt" | "group" | "subgroup";

interface AggregatedGroup {
  key: string;
  itemCount: number;
  batchCount: number;
  totalQty: number;
  totalCost: number;
  totalMrp: number;
  expiredQty: number;
  expiredCost: number;
  expiredMrp: number;
  group?: string;
  subgroup?: string;
  salt?: string;
  packing?: string;
  batches: StockRow[];
}

function InventoryDashboardPage() {
  // Session Selection
  const [selectedSessionSyncId, setSelectedSessionSyncId] = useState<string>("");

  // Multi-Store Selection State
  const [selectedStores, setSelectedStores] = useState<string[]>(DEFAULT_STORE_IDS);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);

  // Filter Bar State
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [basis, setBasis] = useState<"cost" | "mrp">("cost");

  // Sorting & Priority Alerts State
  const [sortKey, setSortKey] = useState<string>("val");
  const [sortDir, setSortDir] = useState<number>(-1);
  const [stockThreshold, setStockThreshold] = useState<number>(10);
  const [prioritizeAlerts, setPrioritizeAlerts] = useState<boolean>(true);

  // View Mode & Pagination State
  const [mode, setMode] = useState<LedgerMode>("batch");
  const [page, setPage] = useState<number>(1);
  const pageSize = 50;
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // Push API Key modal & state
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Active Push API Key query
  const { data: activeKeyData, refetch: refetchKey } = useQuery({
    queryKey: ["closing-stock-active-api-key"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/closing-stock/api-key/active");
      if (!res.ok) return { active: false };
      return res.json();
    },
    refetchInterval: 30000,
  });

  const activeKey = activeKeyData?.active ? activeKeyData : null;
  const minutesLeft = activeKey?.secondsRemaining
    ? Math.max(1, Math.round(activeKey.secondsRemaining / 60))
    : null;

  // Generate Key mutation
  const generateKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/inventory/closing-stock/api-key/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationSeconds: 3600 }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate push API key");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("New 1-hour push API key generated");
      refetchKey();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to generate key");
    },
  });

  // Revoke Key mutation
  const revokeKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/inventory/closing-stock/api-key/revoke", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to revoke push API key");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Push API key revoked");
      refetchKey();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to revoke key");
    },
  });

  // Close store dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node)) {
        setStoreDropdownOpen(false);
      }
    }
    if (storeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [storeDropdownOpen]);

  // Fetch Dashboard Snapshot Data from API with multi-store parameter
  const storeIdsParam = selectedStores.length > 0 ? selectedStores.join(",") : "all";
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["inventory-dashboard-snapshot", selectedSessionSyncId, storeIdsParam],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSessionSyncId) params.append("sessionId", selectedSessionSyncId);
      if (storeIdsParam && storeIdsParam !== "all") params.append("storeIds", storeIdsParam);

      const res = await fetch(`/api/inventory/closing-stock/snapshot?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch closing stock snapshot");
      return res.json();
    },
  });

  const session = data?.session;
  const availableSessions = data?.availableSessions || [];
  const availableStores: { id: string; name: string; batchCount: number }[] = data?.availableStores || [];
  const rawRows: StockRow[] = data?.rows || [];

  // Set default session if unset
  useEffect(() => {
    if (session?.syncId && !selectedSessionSyncId) {
      setSelectedSessionSyncId(session.syncId);
    }
  }, [session, selectedSessionSyncId]);

  // If available stores are loaded and selectedStores default IDs don't match any, fallback to all available stores
  useEffect(() => {
    if (availableStores.length > 0 && selectedStores === DEFAULT_STORE_IDS) {
      const matched = availableStores.filter((st) => DEFAULT_STORE_IDS.includes(st.id));
      if (matched.length === 0) {
        setSelectedStores(availableStores.map((s) => s.id));
      }
    }
  }, [availableStores]);

  // Compute store display name label
  function getStoresDisplayName(storeIds: string[]): string {
    if (storeIds.length === 0) return "No Store Selected";
    if (availableStores.length > 0 && storeIds.length === availableStores.length) return "All Stores";
    const names = storeIds
      .map((id) => availableStores.find((s) => s.id === id)?.name)
      .filter(Boolean) as string[];
    if (names.length === 0) return `${storeIds.length} Stores`;
    if (names.length <= 2) return names.join(" + ");
    return `${names.length} Stores (${names.slice(0, 2).join(", ")} +${names.length - 2})`;
  }

  // Compute bucket keys for rows
  const rowsWithBuckets = useMemo(() => {
    return rawRows.map((r) => {
      let bk = "n";
      for (const b of BUCKETS) {
        if (b.test(r.m)) {
          bk = b.k;
          break;
        }
      }
      return { ...r, bk };
    });
  }, [rawRows]);

  // Unique groups for filter dropdown
  const distinctGroups = useMemo(() => {
    const set = new Set<string>();
    rowsWithBuckets.forEach((r) => {
      if (r.g) set.add(r.g);
    });
    return Array.from(set).sort();
  }, [rowsWithBuckets]);

  // Filter rows by group, status, and search query
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rowsWithBuckets.filter((r) => {
      const matchGroup = !selectedGroup || r.g === selectedGroup;
      const matchStatus = !selectedStatus || r.bk === selectedStatus;
      const matchQuery =
        !q ||
        (r.n + " " + (r.sl || "") + " " + r.c + " " + r.b + " " + (r.s || "") + " " + (r.pk || "") + " " + r.g)
          .toLowerCase()
          .includes(q);
      return matchGroup && matchStatus && matchQuery;
    });
  }, [rowsWithBuckets, selectedGroup, selectedStatus, searchQuery]);

  function valueOf(r: StockRow): number {
    return basis === "cost" ? r.a : r.t;
  }

  // Live Alert Statistics
  const alertStats = useMemo(() => {
    let lowStockCount = 0;
    let expiredCount = 0;
    let nearExpiryCount = 0;

    filteredRows.forEach((r) => {
      if (r.q <= stockThreshold) lowStockCount++;
      if (r.bk === "x") expiredCount++;
      if (r.bk === "a") nearExpiryCount++;
    });

    return {
      lowStockCount,
      expiredCount,
      nearExpiryCount,
      totalAlerts: lowStockCount + expiredCount + nearExpiryCount,
    };
  }, [filteredRows, stockThreshold]);

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalVal = filteredRows.reduce((s, r) => s + valueOf(r), 0);
    const totalUnits = filteredRows.reduce((s, r) => s + r.q, 0);
    const expiredRows = filteredRows.filter((r) => r.bk === "x");
    const expiredVal = expiredRows.reduce((s, r) => s + valueOf(r), 0);
    const soonRows = filteredRows.filter((r) => r.bk === "a");
    const soonVal = soonRows.reduce((s, r) => s + valueOf(r), 0);
    const distinctItems = new Set(filteredRows.map((r) => r.n)).size;

    return {
      totalVal,
      totalUnits,
      expiredVal,
      expiredCount: expiredRows.length,
      expiredPct: totalVal > 0 ? Math.round((expiredVal / totalVal) * 100) : 0,
      soonVal,
      soonCount: soonRows.length,
      distinctItems,
      batchCount: filteredRows.length,
    };
  }, [filteredRows, basis]);

  // Expiry Exposure Bar calculations
  const exposureData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = rowsWithBuckets.filter((r) => {
      const matchGroup = !selectedGroup || r.g === selectedGroup;
      const matchQuery =
        !q ||
        (r.n + " " + (r.sl || "") + " " + r.c + " " + r.b + " " + (r.s || "") + " " + (r.pk || "") + " " + r.g)
          .toLowerCase()
          .includes(q);
      return matchGroup && matchQuery;
    });

    const baseTotal = base.reduce((s, r) => s + valueOf(r), 0);

    const bucketsWithVals = BUCKETS.map((b) => {
      const matched = base.filter((r) => r.bk === b.k);
      const val = matched.reduce((s, r) => s + valueOf(r), 0);
      return {
        ...b,
        val,
        count: matched.length,
        pct: baseTotal > 0 ? ((val / baseTotal) * 100).toFixed(1) : "0",
      };
    });

    return { baseTotal, bucketsWithVals };
  }, [rowsWithBuckets, selectedGroup, searchQuery, basis]);

  // Hierarchical rollups
  function buildAggregatedList(groupByKey: "n" | "g" | "s" | "sl", rows: StockRow[]): AggregatedGroup[] {
    const map = new Map<string, AggregatedGroup>();

    rows.forEach((r) => {
      let rawKey = "";
      if (groupByKey === "n") rawKey = r.n || "(unnamed)";
      else if (groupByKey === "g") rawKey = r.g || "UNCLASSIFIED";
      else if (groupByKey === "s") rawKey = r.s || "(no subgroup)";
      else if (groupByKey === "sl") rawKey = r.sl || "(no salt recorded)";

      const key = rawKey.trim() || "(unspecified)";
      let entry = map.get(key);
      if (!entry) {
        entry = {
          key,
          itemCount: 0,
          batchCount: 0,
          totalQty: 0,
          totalCost: 0,
          totalMrp: 0,
          expiredQty: 0,
          expiredCost: 0,
          expiredMrp: 0,
          group: r.g,
          subgroup: r.s,
          salt: r.sl,
          packing: r.pk,
          batches: [],
        };
        map.set(key, entry);
      }

      entry.batchCount++;
      entry.totalQty += r.q;
      entry.totalCost += r.a;
      entry.totalMrp += r.t;
      if (r.bk === "x") {
        entry.expiredQty += r.q;
        entry.expiredCost += r.a;
        entry.expiredMrp += r.t;
      }
      entry.batches.push(r);
    });

    return Array.from(map.values());
  }

  // Precomputed aggregations
  const activeAggregatedList = useMemo(() => {
    if (mode === "batch") return [];
    if (mode === "item") return buildAggregatedList("n", filteredRows);
    if (mode === "salt") return buildAggregatedList("sl", filteredRows);
    if (mode === "group") return buildAggregatedList("g", filteredRows);
    if (mode === "subgroup") return buildAggregatedList("s", filteredRows);
    return [];
  }, [mode, filteredRows, basis]);

  // Handle Sort
  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => d * -1);
    } else {
      setSortKey(key);
      setSortDir(key === "val" || key === "q" || key === "r" || key === "p" || key === "b" || key === "totalCost" || key === "totalMrp" || key === "expiredCost" ? -1 : 1);
    }
  }

  // Reset Filters
  function handleReset() {
    setSelectedGroup("");
    setSelectedStatus("");
    setSearchQuery("");
    setPage(1);
    setExpandedKeys(new Set());
  }

  // Sort batches with Priority Alerts
  const sortedBatchRows = useMemo(() => {
    const getVal = (r: StockRow) => {
      if (sortKey === "val") return valueOf(r);
      if (sortKey === "exp" || sortKey === "bk") return r.m === null ? 9e9 : r.m;
      return (r as any)[sortKey];
    };

    const getAlertPriority = (r: StockRow) => {
      if (!prioritizeAlerts) return 0;
      const isExpired = r.bk === "x";
      const isNearExp = r.bk === "a";
      const isLow = r.q <= stockThreshold;
      if (isExpired && isLow) return 1;
      if (isExpired) return 2;
      if (isNearExp && isLow) return 3;
      if (isNearExp) return 4;
      if (isLow) return 5;
      return 10;
    };

    return [...filteredRows].sort((a, b) => {
      if (prioritizeAlerts) {
        const pa = getAlertPriority(a);
        const pb = getAlertPriority(b);
        if (pa !== pb) return pa - pb;
      }

      const va = getVal(a);
      const vb = getVal(b);
      if (typeof va === "string") return va.localeCompare(String(vb)) * sortDir;
      return (Number(va) - Number(vb)) * sortDir;
    });
  }, [filteredRows, sortKey, sortDir, basis, prioritizeAlerts, stockThreshold]);

  // Sort aggregated rows with Priority Alerts
  const sortedAggregatedRows = useMemo(() => {
    const getAggAlertPriority = (a: AggregatedGroup) => {
      if (!prioritizeAlerts) return 0;
      const hasExpired = a.expiredQty > 0;
      const hasNearExp = a.batches.some((b) => b.bk === "a");
      const hasLow = a.totalQty <= stockThreshold;
      if (hasExpired && hasLow) return 1;
      if (hasExpired) return 2;
      if (hasNearExp && hasLow) return 3;
      if (hasNearExp) return 4;
      if (hasLow) return 5;
      return 10;
    };

    return [...activeAggregatedList].sort((a, b) => {
      if (prioritizeAlerts) {
        const pa = getAggAlertPriority(a);
        const pb = getAggAlertPriority(b);
        if (pa !== pb) return pa - pb;
      }

      let va: any = a.key;
      let vb: any = b.key;

      if (sortKey === "val") {
        va = basis === "cost" ? a.totalCost : a.totalMrp;
        vb = basis === "cost" ? b.totalCost : b.totalMrp;
      } else if (sortKey === "q") {
        va = a.totalQty;
        vb = b.totalQty;
      } else if (sortKey === "b") {
        va = a.batchCount;
        vb = b.batchCount;
      } else if (sortKey === "exp") {
        va = basis === "cost" ? a.expiredCost : a.expiredMrp;
        vb = basis === "cost" ? b.expiredCost : b.expiredMrp;
      }

      if (typeof va === "string") return va.localeCompare(String(vb)) * sortDir;
      return (Number(va) - Number(vb)) * sortDir;
    });
  }, [activeAggregatedList, sortKey, sortDir, basis, prioritizeAlerts, stockThreshold]);

  // Pagination slice
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedBatchRows.slice(start, start + pageSize);
  }, [sortedBatchRows, page, pageSize]);

  const totalPages = Math.ceil(sortedBatchRows.length / pageSize) || 1;

  function toggleExpand(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Active Filter Chips
  const activeChips = [
    selectedGroup && { label: `Group: ${selectedGroup}`, clear: () => setSelectedGroup("") },
    selectedStatus && {
      label: BUCKETS.find((b) => b.k === selectedStatus)?.l || selectedStatus,
      clear: () => setSelectedStatus(""),
    },
    searchQuery && { label: `"${searchQuery}"`, clear: () => setSearchQuery("") },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  // Export to Excel (styled)
  function exportToExcel() {
    const rowsToExport = sortedBatchRows.map((r, i) => ({
      "S.No": i + 1,
      "Store": r.st || "—",
      "Medicine Name": r.n,
      "Salt / Composition": r.sl || "—",
      "Group": r.g,
      "Subgroup": r.s || "—",
      "Manufacturer": r.c,
      "Batch": r.b,
      "Expiry Date": r.e || "No Expiry",
      "Quantity": r.q,
      "Base Unit": r.baseUnit || "Units",
      "Cost Rate (₹)": r.r,
      "Cost Valuation (₹)": r.a,
      "MRP (₹)": r.p,
      "Total MRP (₹)": r.t,
    }));

    const ws = XLSX.utils.json_to_sheet(rowsToExport);

    // Apply styles to header row
    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:O1");
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = XLSX.utils.encode_col(C) + "1";
      if (!ws[address]) continue;
      ws[address].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0E6B72" } },
        alignment: { horizontal: "center", vertical: "center" },
      };
    }

    ws["!cols"] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 32 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 },
      { wch: 14 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Closing Stock");
    const dateStr = session?.reportDate || new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `ACME_Pharmacy_Closing_Stock_${dateStr}.xlsx`);
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">
      {/* Top Header & Store Selector Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Pharmacy Stock, {getStoresDisplayName(selectedStores)}
            </h1>
            <Badge variant="outline" className="text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300 border-teal-300 text-[11px]">
              Live HMS Feed
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>ACME Pharmacy • Hiyang Hiren Leirak, Palace Compound, Imphal East</span>
            {session && (
              <>
                <span>•</span>
                <span className="font-mono text-teal-700 dark:text-teal-300 font-semibold">
                  Report Date: {session.reportDate}
                </span>
                <span>•</span>
                <span className="text-slate-400">
                  Transmitted {session.totalRecords?.toLocaleString()} records ({session.chunkCount} chunks)
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Historical Session Selector */}
          {availableSessions.length > 1 && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs">
              <Calendar size={13} className="text-slate-400" />
              <select
                value={selectedSessionSyncId}
                onChange={(e) => {
                  setSelectedSessionSyncId(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                {availableSessions.map((s: any) => (
                  <option key={s.syncId} value={s.syncId} className="dark:bg-slate-900">
                    {s.reportDate} ({s.totalRecords} batches)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Multi-Store Picker Dropdown (Retained from acme-front) */}
          <div className="relative inline-block" ref={storeDropdownRef}>
            <button
              type="button"
              className={`inline-flex items-center gap-2 bg-white dark:bg-slate-900 border text-slate-800 dark:text-slate-200 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 h-8 hover:border-[#0e6b72] dark:hover:border-[#4cc1c9] ${
                storeDropdownOpen
                  ? "border-[#0e6b72] dark:border-[#4cc1c9] ring-1 ring-[#0e6b72] dark:ring-[#4cc1c9]"
                  : "border-slate-200 dark:border-slate-800"
              }`}
              onClick={() => setStoreDropdownOpen((v) => !v)}
              title="Select Pharmacy Stores"
              aria-expanded={storeDropdownOpen}
            >
              <Store size={14} className="text-[#0e6b72] dark:text-[#4cc1c9] shrink-0" />
              <span className="max-w-37 overflow-hidden text-ellipsis whitespace-nowrap">
                {selectedStores.length === 0
                  ? "Select Stores"
                  : availableStores.length > 0 && selectedStores.length === availableStores.length
                  ? "All Stores"
                  : selectedStores.length === 1
                  ? availableStores.find((s) => s.id === selectedStores[0])?.name || "1 Store"
                  : `${selectedStores.length} Stores Selected`}
              </span>
              <span className="inline-flex items-center justify-center bg-[#0e6b72] dark:bg-[#4cc1c9] text-white dark:text-[#0d1a1d] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-4">
                {selectedStores.length}
              </span>
              <ChevronDown
                size={13}
                className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                  storeDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {storeDropdownOpen && (
              <div className="absolute top-[calc(100%+6px)] right-0 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Select Pharmacy Stores
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      type="button"
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300"
                      onClick={() => {
                        setSelectedStores(DEFAULT_STORE_IDS);
                        setPage(1);
                      }}
                      title="Select ACME Dispensary & Central Store (Default)"
                    >
                      Dispensary + Central
                    </button>
                    <button
                      type="button"
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-teal-50 dark:hover:bg-teal-950/40 hover:text-teal-700 dark:hover:text-teal-300"
                      onClick={() => {
                        setSelectedStores(availableStores.map((s) => s.id));
                        setPage(1);
                      }}
                    >
                      All Stores
                    </button>
                    <button
                      type="button"
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => {
                        setSelectedStores([]);
                        setPage(1);
                      }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto py-1">
                  {availableStores.length === 0 ? (
                    <div className="p-4 text-xs text-center text-slate-400">Loading stores...</div>
                  ) : (
                    availableStores.map((s) => {
                      const isChecked = selectedStores.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center justify-between px-3.5 py-2 text-xs cursor-pointer transition-colors select-none hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                            isChecked ? "bg-teal-50/60 dark:bg-teal-950/30 font-semibold text-teal-900 dark:text-teal-200" : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              className="cursor-pointer accent-teal-600 rounded text-teal-600 w-3.5 h-3.5"
                              checked={isChecked}
                              onChange={() => {
                                setSelectedStores((prev) => {
                                  const next = isChecked ? prev.filter((id) => id !== s.id) : [...prev, s.id];
                                  setPage(1);
                                  return next;
                                });
                              }}
                            />
                            <span>{s.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {s.batchCount} batches
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Push API Key Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setApiKeyModalOpen(true)}
            className="text-xs h-8 gap-1.5 cursor-pointer border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40"
          >
            <Key size={13} />
            <span>Push API Key</span>
            {activeKey ? (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 font-medium">
                {minutesLeft}m left
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20">
                Inactive
              </Badge>
            )}
          </Button>

          {/* Export & Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={filteredRows.length === 0}
            className="text-xs h-8 gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={13} className="text-emerald-600" />
            Export Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="text-xs h-8 gap-1.5 cursor-pointer"
            title="Refresh Stock Snapshot"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-24 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 size={28} className="animate-spin text-teal-600" />
          <p className="text-sm">Loading pharmacy inventory snapshot...</p>
        </div>
      ) : rawRows.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xs">
          <CloudUpload size={36} className="text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No closing stock data has been pushed yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Open <code>acme-front</code> and use an on-demand 1-hour push key to transmit the latest validated HMS stock report to this dashboard.
          </p>
          <Button
            size="sm"
            onClick={() => setApiKeyModalOpen(true)}
            className="text-xs bg-teal-600 hover:bg-teal-700 text-white cursor-pointer gap-1.5"
          >
            <Key size={13} />
            Generate / View Push API Key
          </Button>
        </div>
      ) : (
        <>
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {basis === "cost" ? "Stock Value (at Cost)" : "Stock Value (at MRP)"}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {money(kpis.totalVal)}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5" title={full(kpis.totalVal)}>
                    {full(kpis.totalVal)}
                    {selectedGroup || selectedStatus || searchQuery ? " • filtered" : ""}
                  </p>
                </div>
                <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl text-teal-600 dark:text-teal-400">
                  <TrendingUp size={22} />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Units In Stock
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {inr.format(kpis.totalUnits)}
                  </h3>
                  <p className="text-[11px] text-teal-600 dark:text-teal-400 font-medium mt-0.5">
                    {inr.format(kpis.distinctItems)} distinct items • {inr.format(kpis.batchCount)} batches
                  </p>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
                  <Boxes size={22} />
                </div>
              </CardContent>
            </Card>

            <Card className={`border rounded-xl shadow-xs bg-white dark:bg-slate-900 ${
              kpis.expiredCount > 0 ? "border-[#c8412f] dark:border-[#ec6a56]" : "border-slate-200 dark:border-slate-800"
            }`}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    Expired Stock
                  </p>
                  <h3 className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-1">
                    {money(kpis.expiredVal)}
                  </h3>
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                    {kpis.expiredCount} batches ({kpis.expiredPct}% of valuation)
                  </p>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl text-rose-600 dark:text-rose-400">
                  <AlertCircle size={22} />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Expires in 0-3 Months
                  </p>
                  <h3 className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
                    {money(kpis.soonVal)}
                  </h3>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                    {kpis.soonCount} batches near expiration
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={22} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expiry Exposure Multi-Segment Progress Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Expiry Aging Exposure Analysis
              </span>
              <span className="font-mono text-slate-400">
                Total Base Valuation: {money(exposureData.baseTotal)}
              </span>
            </div>

            <div className="h-4 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
              {exposureData.bucketsWithVals.map((b) => {
                const widthPct = Number(b.pct);
                if (widthPct <= 0) return null;
                return (
                  <div
                    key={b.k}
                    style={{ width: `${widthPct}%` }}
                    className={`${b.bg} transition-all duration-300`}
                    title={`${b.l}: ${money(b.val)} (${b.count} batches, ${b.pct}%)`}
                  />
                );
              })}
            </div>

            {/* Interactive Bucket Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1">
              {exposureData.bucketsWithVals.map((b) => {
                const isSelected = selectedStatus === b.k;
                return (
                  <button
                    key={b.k}
                    type="button"
                    onClick={() => {
                      setSelectedStatus(isSelected ? "" : b.k);
                      setPage(1);
                    }}
                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#0e6b72] dark:border-[#4cc1c9] ring-2 ring-teal-500/20 bg-teal-50/60 dark:bg-teal-950/40"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`w-2 h-2 rounded-full ${b.bg}`} />
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {b.l}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                      {money(b.val)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {b.count} batches ({b.pct}%)
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FILTERS STICKY BAR (Retained completely from acme-front) */}
          <div
            className="flex flex-wrap gap-2.5 items-center sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs"
            role="group"
            aria-label="Inventory Filters"
          >
            {/* Category Group Filter Dropdown */}
            <select
              className="text-xs h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-[#0e6b72] dark:focus:border-[#4cc1c9] cursor-pointer"
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                setPage(1);
              }}
              aria-label="Group Filter"
            >
              <option value="">All groups ({distinctGroups.length})</option>
              {distinctGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            {/* Expiry Status Filter Dropdown */}
            <select
              className="text-xs h-8.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-[#0e6b72] dark:focus:border-[#4cc1c9] cursor-pointer"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              aria-label="Expiry Status Filter"
            >
              <option value="">All expiry status</option>
              {BUCKETS.map((b) => (
                <option key={b.k} value={b.k}>
                  {b.l}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative flex-1 min-w-50">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="search"
                className="w-full text-xs h-8.5 pl-8 pr-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-[#0e6b72] dark:focus:border-[#4cc1c9]"
                placeholder="Search item, salt, group, company or batch"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                aria-label="Search item, salt, company or batch"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Value Basis Toggle (Cost vs MRP) */}
            <div className="inline-flex border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden h-8.5" role="group" aria-label="Value basis">
              <button
                type="button"
                className={`px-3 py-1 text-xs cursor-pointer transition-all ${
                  basis === "cost"
                    ? "bg-[#0e6b72] dark:bg-[#4cc1c9] text-white dark:text-[#0d1a1d] font-semibold"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
                aria-pressed={basis === "cost"}
                onClick={() => setBasis("cost")}
              >
                Cost
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-xs cursor-pointer transition-all ${
                  basis === "mrp"
                    ? "bg-[#0e6b72] dark:bg-[#4cc1c9] text-white dark:text-[#0d1a1d] font-semibold"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
                aria-pressed={basis === "mrp"}
                onClick={() => setBasis("mrp")}
              >
                MRP
              </button>
            </div>

            {/* Reset Filter Button */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 h-8.5 rounded-lg text-xs font-medium cursor-pointer transition-all bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-[#0e6b72] dark:hover:border-[#4cc1c9]"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>

          {/* VIEW MODE TABS & TOOLBAR */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* View Mode Tabs (5 Ledger Modes) */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-slate-100 dark:bg-slate-800 w-full md:w-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setMode("batch")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  mode === "batch"
                    ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Batch View
              </button>
              <button
                type="button"
                onClick={() => setMode("item")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  mode === "item"
                    ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Item Master Rollup
              </button>
              <button
                type="button"
                onClick={() => setMode("salt")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  mode === "salt"
                    ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Salt Formulation
              </button>
              <button
                type="button"
                onClick={() => setMode("group")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  mode === "group"
                    ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Category Groups
              </button>
              <button
                type="button"
                onClick={() => setMode("subgroup")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                  mode === "subgroup"
                    ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Subgroups
              </button>
            </div>

            {/* Alerts First Toggle Button (Retained from acme-front) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150 cursor-pointer ${
                  prioritizeAlerts
                    ? "bg-amber-50 dark:bg-amber-950/40 border-amber-500 dark:border-amber-600 text-amber-700 dark:text-amber-400 shadow-xs"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-400"
                }`}
                onClick={() => {
                  setPrioritizeAlerts((p) => !p);
                  setPage(1);
                }}
                title={
                  prioritizeAlerts
                    ? `Prioritizing alerts first: Expired, Near Expiry (<= 3 mo), and Low Stock (<= ${stockThreshold}) appear at top.`
                    : "Click to surface low stock and nearby expiry items first"
                }
              >
                <Zap
                  size={13}
                  className={prioritizeAlerts ? "fill-amber-500 text-amber-500" : "text-slate-400"}
                />
                <span>Alerts First</span>
                {alertStats.totalAlerts > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      prioritizeAlerts
                        ? "bg-amber-500 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {inr.format(alertStats.totalAlerts)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active Chips Bar & Table Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {activeChips.length > 0 ? (
                <div className="flex gap-1.5 flex-wrap items-center">
                  <span className="text-[11px] font-semibold text-slate-400">Active filters:</span>
                  {activeChips.map((c) => (
                    <span
                      key={c.label}
                      className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200 border border-teal-300 dark:border-teal-700 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    >
                      {c.label}
                      <X size={11} className="cursor-pointer hover:text-teal-950 dark:hover:text-white" onClick={c.clear} />
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[11px] text-teal-600 hover:underline font-semibold ml-1 cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span>
                    {mode === "batch"
                      ? "Every batch with stock on hand. Click a column heading to sort."
                      : `Aggregated by ${mode}. Click any row to expand batches.`}
                  </span>
                  {prioritizeAlerts && (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold text-[11px] inline-flex items-center gap-1">
                      ⚡ Surfacing low stock (≤ {stockThreshold}) &amp; nearby expiry first
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-xs text-slate-400 font-mono">
              Showing {mode === "batch" ? `${inr.format(sortedBatchRows.length)} batches` : `${inr.format(sortedAggregatedRows.length)} groups`}
            </div>
          </div>

          {/* MAIN DATA TABLES */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
            {mode === "batch" ? (
              /* Flat Batch View with Sortable Column Headers */
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 select-none">
                    <tr>
                      <th
                        className="py-3 px-3.5 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("n")}
                        aria-sort={sortKey === "n" ? (sortDir > 0 ? "ascending" : "descending") : undefined}
                      >
                        <div className="flex items-center gap-1">
                          <span>Medicine Name / Composition</span>
                          <ArrowUpDown size={11} className={`text-slate-400 ${sortKey === "n" ? "text-teal-600" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("st")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Store</span>
                          <ArrowUpDown size={11} className={`text-slate-400 ${sortKey === "st" ? "text-teal-600" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("c")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Manufacturer</span>
                          <ArrowUpDown size={11} className={`text-slate-400 ${sortKey === "c" ? "text-teal-600" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("b")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Batch No</span>
                          <ArrowUpDown size={11} className={`text-slate-400 ${sortKey === "b" ? "text-teal-600" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("exp")}
                      >
                        <div className="flex items-center gap-1">
                          <span>Expiry Date</span>
                          <ArrowUpDown size={11} className={`text-slate-400 ${sortKey === "exp" ? "text-teal-600" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 font-semibold text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("q")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Quantity</span>
                          <ArrowUpDown size={11} className={`text-slate-400 ${sortKey === "q" ? "text-teal-600" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 font-semibold text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort(basis === "cost" ? "r" : "p")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>{basis === "cost" ? "Cost Rate" : "Unit MRP"}</span>
                          <ArrowUpDown size={11} className={`text-slate-400 ${sortKey === "r" || sortKey === "p" ? "text-teal-600" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="py-3 px-3 font-semibold text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("val")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>{basis === "cost" ? "Cost Amount" : "Total MRP"}</span>
                          <ArrowUpDown size={11} className={`text-slate-400 ${sortKey === "val" ? "text-teal-600" : ""}`} />
                        </div>
                      </th>
                      <th className="py-3 px-3 font-semibold text-right">
                        <span>{basis === "cost" ? "MRP" : "Cost Rate"}</span>
                      </th>
                      <th className="py-3 px-3 font-semibold text-right">
                        <span>{basis === "cost" ? "Total MRP" : "Cost Amount"}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-400">
                          No batches found matching filter criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((r, idx) => {
                        const isExpired = r.bk === "x";
                        const isNearExp = r.bk === "a";
                        const isLowStock = r.q <= stockThreshold;
                        const alertCls = getRowAlertClasses(isExpired, isNearExp, isLowStock);

                        return (
                          <tr key={`${r.stId}_${r.n}_${r.b}_${idx}`} className={alertCls.tr}>
                            <td className={`py-2.5 px-3.5 ${alertCls.firstTd}`}>
                              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                {r.n}
                                {r.pk && (
                                  <span className="text-[10px] text-slate-400 font-normal">({r.pk})</span>
                                )}
                              </div>
                              {r.sl && (
                                <div className="text-[11px] text-teal-600 dark:text-teal-400 font-mono mt-0.5">
                                  {r.sl}
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400">
                                {r.g} {r.s ? `• ${r.s}` : ""}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {r.st}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 max-w-32 truncate" title={r.c}>
                              {r.c}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {r.b}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                                {r.e || "—"}
                              </span>
                              {r.m !== null && (
                                <span
                                  className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                    isExpired
                                      ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                      : isNearExp
                                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                                  }`}
                                >
                                  {r.m < 0 ? "Exp" : `${r.m}m`}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {isLowStock && (
                                  <span
                                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                      r.q <= Math.max(1, Math.floor(stockThreshold / 3))
                                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                        : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                    }`}
                                    title={`Low stock: ${r.q} units on hand (threshold: ≤ ${stockThreshold})`}
                                  >
                                    <AlertTriangle size={10} />
                                    <span>LOW</span>
                                  </span>
                                )}
                                <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                  {inr.format(r.q)}
                                </span>{" "}
                                <span className="text-[10px] text-slate-400">{r.baseUnit || "tabs"}</span>
                              </div>
                              {r.conversionRatio && r.conversionRatio > 1 && (
                                <div className="text-[10px] text-slate-400">
                                  {r.preferredQuantity} {r.preferredUnit} (1:{r.conversionRatio})
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              ₹{(basis === "cost" ? r.r : r.p).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                              {money(basis === "cost" ? r.a : r.t)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              ₹{(basis === "cost" ? r.p : r.r).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {money(basis === "cost" ? r.t : r.a)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Showing {(page - 1) * pageSize + 1} to{" "}
                      {Math.min(page * pageSize, sortedBatchRows.length)} of {sortedBatchRows.length} batches
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="h-7 text-xs cursor-pointer"
                      >
                        Previous
                      </Button>
                      <span className="font-mono text-xs px-2 text-slate-600">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="h-7 text-xs cursor-pointer"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Aggregated Rollup View (Item, Salt, Group, Subgroup) with Sortable Headers */
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 select-none">
                    <tr>
                      <th
                        className="py-3 px-4 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("key")}
                      >
                        <div className="flex items-center gap-1">
                          <span>
                            {mode === "item"
                              ? "Medicine Name"
                              : mode === "salt"
                              ? "Salt / Generic Formulation"
                              : mode === "group"
                              ? "Category Group"
                              : "Subgroup"}
                          </span>
                          <ArrowUpDown size={11} className={`text-slate-400 ${sortKey === "key" ? "text-teal-600" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 font-semibold text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("b")}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>Batches</span>
                          <ArrowUpDown size={11} className={`text-slate-400 ${sortKey === "b" ? "text-teal-600" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 font-semibold text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("q")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Total Units</span>
                          <ArrowUpDown size={11} className={`text-slate-400 ${sortKey === "q" ? "text-teal-600" : ""}`} />
                        </div>
                      </th>
                      <th
                        className="py-3 px-4 font-semibold text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("val")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Cost Valuation</span>
                          <ArrowUpDown size={11} className={`text-slate-400 ${sortKey === "val" ? "text-teal-600" : ""}`} />
                        </div>
                      </th>
                      <th className="py-3 px-4 font-semibold text-right">
                        <span>MRP Valuation</span>
                      </th>
                      <th
                        className="py-3 px-4 font-semibold text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50"
                        onClick={() => handleSort("exp")}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>Expired Value</span>
                          <ArrowUpDown size={11} className={`text-slate-400 ${sortKey === "exp" ? "text-teal-600" : ""}`} />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedAggregatedRows.map((grp) => {
                      const isExpanded = expandedKeys.has(grp.key);
                      const isItemLow = grp.totalQty <= stockThreshold;
                      const hasExpired = grp.expiredQty > 0;
                      const hasNearExp = grp.batches.some((b) => b.bk === "a");
                      const rowAlert = getRowAlertClasses(hasExpired, hasNearExp, isItemLow);

                      return (
                        <tr key={grp.key} className={rowAlert.tr}>
                          <td className={`py-3 px-4 ${rowAlert.firstTd}`}>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleExpand(grp.key)}
                                className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white hover:text-teal-600 cursor-pointer text-left"
                              >
                                <ChevronDown
                                  size={14}
                                  className={`transition-transform text-slate-400 ${
                                    isExpanded ? "" : "-rotate-90"
                                  }`}
                                />
                                <span>{grp.key}</span>
                              </button>
                              {isItemLow && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  title={`Low stock: ${grp.totalQty} total units across batches (threshold: ≤ ${stockThreshold})`}
                                >
                                  <AlertTriangle size={10} />
                                  <span>LOW</span>
                                </span>
                              )}
                            </div>
                            {grp.salt && mode !== "salt" && (
                              <div className="text-[11px] text-teal-600 dark:text-teal-400 font-mono pl-5 mt-0.5">
                                {grp.salt}
                              </div>
                            )}

                            {/* Nested Batches Table when expanded */}
                            {isExpanded && (
                              <div className="mt-3 ml-5 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 p-2 shadow-xs">
                                <table className="w-full text-[11px]">
                                  <thead>
                                    <tr className="text-slate-500 border-b border-slate-200 dark:border-slate-800">
                                      <th className="py-1 px-2 text-left">Batch No</th>
                                      <th className="py-1 px-2 text-left">Expiry</th>
                                      <th className="py-1 px-2 text-left">Store</th>
                                      <th className="py-1 px-2 text-right">Quantity</th>
                                      <th className="py-1 px-2 text-right">Rate</th>
                                      <th className="py-1 px-2 text-right">Cost Total</th>
                                      <th className="py-1 px-2 text-right">MRP Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {[...grp.batches]
                                      .sort((b1, b2) => {
                                        if (prioritizeAlerts) {
                                          const p1 = b1.bk === "x" ? 1 : b1.bk === "a" ? 2 : b1.q <= stockThreshold ? 3 : 10;
                                          const p2 = b2.bk === "x" ? 1 : b2.bk === "a" ? 2 : b2.q <= stockThreshold ? 3 : 10;
                                          if (p1 !== p2) return p1 - p2;
                                        }
                                        return b2.q - b1.q;
                                      })
                                      .map((b, bIdx) => {
                                        const isSubLow = b.q <= stockThreshold;
                                        const isSubExp = b.bk === "x";
                                        const isSubNear = b.bk === "a";
                                        const subAlert = getRowAlertClasses(isSubExp, isSubNear, isSubLow);

                                        return (
                                          <tr key={bIdx} className={subAlert.tr}>
                                            <td className={`py-1.5 px-2 font-mono font-medium ${subAlert.firstTd}`}>
                                              {b.b}
                                            </td>
                                            <td className="py-1.5 px-2 font-mono">
                                              <span className={isSubExp ? "text-rose-600 font-bold" : isSubNear ? "text-amber-600 font-bold" : ""}>
                                                {b.e || "—"}
                                              </span>
                                            </td>
                                            <td className="py-1.5 px-2 text-slate-500">{b.st}</td>
                                            <td className="py-1.5 px-2 text-right font-mono font-bold">
                                              {inr.format(b.q)}
                                            </td>
                                            <td className="py-1.5 px-2 text-right font-mono">₹{b.r.toFixed(2)}</td>
                                            <td className="py-1.5 px-2 text-right font-mono font-medium text-emerald-600">
                                              {money(b.a)}
                                            </td>
                                            <td className="py-1.5 px-2 text-right font-mono text-slate-500">
                                              {money(b.t)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-mono text-slate-700 dark:text-slate-300">
                            {grp.batchCount}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                            {inr.format(grp.totalQty)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            {money(grp.totalCost)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600 dark:text-slate-300">
                            {money(grp.totalMrp)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">
                            {grp.expiredCost > 0 ? money(grp.expiredCost) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Push API Key Dialog */}
      <Dialog open={apiKeyModalOpen} onOpenChange={setApiKeyModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <Key size={18} />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Pharmacy Stock Push API Key</DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Temporary 1-hour authentication token for acme-front ingestion
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 dark:text-slate-300">Status</span>
                {activeKey ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 gap-1 text-[11px]">
                    <CheckCircle2 size={12} /> Active ({minutesLeft} min remaining)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-500 border-slate-300 dark:border-slate-700">
                    No Active Key (Expired / Not Generated)
                  </Badge>
                )}
              </div>

              {activeKey && (
                <>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Generated By</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{activeKey.generatedBy || "Operator"}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Expires At</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {new Date(activeKey.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(activeKey.expiresAt).toLocaleDateString()})
                    </span>
                  </div>
                </>
              )}
            </div>

            {activeKey ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Active Bearer Key
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      readOnly
                      type={showKey ? "text" : "password"}
                      value={activeKey.key}
                      className="font-mono text-xs pr-10 bg-slate-50 dark:bg-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(activeKey.key);
                      setCopiedKey(true);
                      toast.success("Push API Key copied to clipboard");
                      setTimeout(() => setCopiedKey(false), 2000);
                    }}
                    className="gap-1 cursor-pointer"
                  >
                    {copiedKey ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    {copiedKey ? "Copied" : "Copy"}
                  </Button>
                </div>

                <div className="p-2.5 rounded-lg bg-teal-500/5 border border-teal-500/20 text-[11px] text-teal-800 dark:text-teal-300 space-y-1">
                  <p className="font-medium">Ingestion Header Configuration:</p>
                  <p className="font-mono text-[10px] bg-white/70 dark:bg-black/30 p-1.5 rounded border border-teal-500/20 select-all">
                    Authorization: Bearer {activeKey.key}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Endpoint: <code className="text-slate-700 dark:text-slate-300">/api/v1/inventory/closing-stock/batch</code>
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
                <Clock className="mx-auto text-slate-400" size={24} />
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  A push key is required by acme-front to upload closing stock snapshots. Keys are created on-demand and auto-expire in 1 hour.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {activeKey && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => revokeKeyMutation.mutate()}
                disabled={revokeKeyMutation.isPending}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer mr-auto"
              >
                <Trash2 size={13} className="mr-1" />
                Revoke Key
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApiKeyModalOpen(false)}
              className="text-xs cursor-pointer"
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => generateKeyMutation.mutate()}
              disabled={generateKeyMutation.isPending}
              className="text-xs bg-teal-600 hover:bg-teal-700 text-white cursor-pointer gap-1.5"
            >
              <Key size={13} />
              {activeKey ? "Regenerate (1 Hr)" : "Generate 1-Hour Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

