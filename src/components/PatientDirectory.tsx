import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import { DocterzConfigDialog } from "@/components/DocterzConfigDialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { consolidatePatientHistory, formatPatientHistoryDate, type PatientHistoryRow } from "@/lib/patient-history";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  RefreshCw,
  FileDown,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Activity,
  ExternalLink,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Settings,
  Calendar,
  Phone,
  User,
  ShieldCheck,
  Filter,
  Edit2,
  History,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const formatMoney = (value: number) => new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const SYNC_INTERVAL_OPTIONS = [
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "6 hours", value: 360 },
  { label: "12 hours", value: 720 },
  { label: "24 hours", value: 1440 },
];

export function PatientDirectory() {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [genderFilter, setGenderFilter] = React.useState<string>("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [sortBy, setSortBy] = React.useState("name");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [docterzConfigOpen, setDocterzConfigOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [resolvingId, setResolvingId] = React.useState<number | null>(null);
  const [editingPatient, setEditingPatient] = React.useState<any | null>(null);
  const [historyPatient, setHistoryPatient] = React.useState<any | null>(null);
  const [aadhaarInput, setAadhaarInput] = React.useState("");

  const patientHistoryQuery = useQuery<{ data: PatientHistoryRow[]; total: number }>({
    queryKey: ["front-office", "patient-appointment-history", historyPatient?.uid, historyPatient?.name],
    enabled: Boolean(historyPatient),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (historyPatient?.uid) params.set("uid", historyPatient.uid);
      if (historyPatient?.name) params.set("name", historyPatient.name);
      if (historyPatient?.mobile) params.set("mobile", historyPatient.mobile);
      const response = await fetch(`/api/front-office/patients/appointment-history?${params}`);
      if (!response.ok) throw new Error("Could not load patient history");
      return response.json();
    },
  });

  React.useEffect(() => {
    if (patientHistoryQuery.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ["front-office", "patients", "list"] });
    }
  }, [patientHistoryQuery.dataUpdatedAt, patientHistoryQuery.isSuccess, queryClient]);

  // ── Update Patient Mutation (e.g. Aadhaar) ──────────────────────────────
  const updatePatientMutation = useMutation({
    mutationFn: async ({ id, aadhaarNo }: { id: number; aadhaarNo: string }) => {
      const res = await fetch(`/api/front-office/patients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aadhaarNo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update patient Aadhaar");
      return data;
    },
    onSuccess: () => {
      toast.success("Aadhaar number saved successfully");
      setEditingPatient(null);
      queryClient.invalidateQueries({ queryKey: ["front-office", "patients"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSaveAadhaar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient) return;
    updatePatientMutation.mutate({ id: editingPatient.id, aadhaarNo: aadhaarInput.trim() });
  };

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when gender filter changes
  React.useEffect(() => {
    setPage(1);
  }, [genderFilter, pageSize, sortBy, sortOrder]);

  const changeSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder(column === "lastVisited" || column === "lastSynced" ? "desc" : "asc");
    }
  };

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => {
    const active = sortBy === column;
    const Icon = !active ? ArrowUpDown : sortOrder === "asc" ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        onClick={() => changeSort(column)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {children}<Icon className={cn("size-3", !active && "opacity-40")} />
      </button>
    );
  };

  // ── Sync Status Query ─────────────────────────────────────────────────────
  const syncStatusQuery = useQuery({
    queryKey: ["front-office", "patients", "sync-status"],
    queryFn: async () => {
      const res = await fetch("/api/front-office/patients/sync-status");
      if (!res.ok) throw new Error("Failed to load sync status");
      return res.json();
    },
    refetchInterval: 8000,
  });

  const syncStatus = syncStatusQuery.data as {
    latestLog: {
      id: number;
      status: string;
      triggeredBy: string;
      newRecords: number;
      updatedRecords: number;
      totalFetched: number;
      pagesFetched: number;
      errorMessage: string | null;
      startedAt: string;
      finishedAt: string | null;
    } | null;
    totalPatients: number;
    syncEnabled: boolean;
    syncIntervalMinutes: number;
  } | undefined;

  const isSyncRunning = syncStatus?.latestLog?.status === "running";

  // ── Manual Sync Mutation ──────────────────────────────────────────────────
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/front-office/patients/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.errorMessage || `Sync failed (HTTP ${res.status})`);
      }
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success(
          `Sync completed: ${data.newRecords} new, ${data.updatedRecords} updated (${data.totalFetched} total fetched)`
        );
      } else if (data.errorMessage) {
        toast.error(`Sync failed: ${data.errorMessage}`);
      }
      queryClient.invalidateQueries({ queryKey: ["front-office", "patients"] });
    },
    onError: (err: any) => toast.error(err.message || "Sync request failed"),
  });

  // ── Clear Stuck Sync Mutation ─────────────────────────────────────────────
  const resetSyncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/front-office/patients/sync-reset", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Reset failed (HTTP ${res.status})`);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Stuck sync cleared — ready to sync again");
      queryClient.invalidateQueries({ queryKey: ["front-office", "patients"] });
    },
    onError: (err: any) => toast.error(err.message || "Reset failed"),
  });

  // ── Auto-Sync Configuration ───────────────────────────────────────────────
  const [localSyncEnabled, setLocalSyncEnabled] = React.useState(false);
  const [localInterval, setLocalInterval] = React.useState(60);

  React.useEffect(() => {
    if (syncStatus) {
      setLocalSyncEnabled(syncStatus.syncEnabled);
      setLocalInterval(syncStatus.syncIntervalMinutes);
    }
  }, [syncStatus?.syncEnabled, syncStatus?.syncIntervalMinutes]);

  const syncConfigMutation = useMutation({
    mutationFn: async (payload: { syncEnabled: boolean; syncIntervalMinutes: number }) => {
      const res = await fetch("/api/front-office/patients/sync-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update sync config");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Sync schedule updated");
      queryClient.invalidateQueries({ queryKey: ["front-office", "patients", "sync-status"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Patients List Query ───────────────────────────────────────────────────
  const patientsQuery = useQuery({
    queryKey: ["front-office", "patients", "list", debouncedSearch, genderFilter, page, pageSize, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortOrder,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (genderFilter && genderFilter !== "all") params.set("gender", genderFilter);

      const res = await fetch(`/api/front-office/patients?${params}`);
      if (!res.ok) throw new Error("Failed to load patients");
      return res.json();
    },
  });

  const patients: any[] = patientsQuery.data?.data ?? [];
  const pagination = patientsQuery.data?.pagination ?? {
    page: 1,
    pageSize,
    totalRecords: 0,
    totalPages: 1,
  };

  // ── Open-in-Docterz resolver ─────────────────────────────────────────────
  const handleOpenInDocterz = async (patient: any) => {
    setResolvingId(patient.id);
    try {
      const res = await fetch("/api/front-office/resolve-patient-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: patient.uid || "",
          mobile: patient.mobile || "",
          name: patient.name || "",
        }),
      });
      const data = await res.json();
      if (data.success && data.recordsUrl) {
        window.open(data.recordsUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.error(data.message || "Could not resolve patient URL");
      }
    } catch {
      toast.error("Failed to resolve patient link");
    } finally {
      setResolvingId(null);
    }
  };

  // ── Universal Export (All / Filtered / Page in Excel or CSV) ──────────────
  const handleExport = async (options: { scope: "all" | "filtered" | "page"; format: "xlsx" | "csv" }) => {
    setIsExporting(true);
    const toastId = toast.loading(
      options.scope === "all"
        ? "Fetching all patient records from database…"
        : options.scope === "filtered"
        ? "Fetching filtered patient records…"
        : "Preparing patient records…"
    );

    try {
      let recordsToExport: any[] = [];

      if (options.scope === "page") {
        recordsToExport = patients;
      } else {
        const params = new URLSearchParams({ export: "true" });
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);
        if (options.scope === "filtered") {
          if (debouncedSearch) params.set("search", debouncedSearch);
          if (genderFilter && genderFilter !== "all") params.set("gender", genderFilter);
        }
        const res = await fetch(`/api/front-office/patients?${params}`);
        if (!res.ok) throw new Error("Failed to fetch records for export");
        const json = await res.json();
        recordsToExport = json.data || [];
      }

      if (recordsToExport.length === 0) {
        toast.error("No records found to export", { id: toastId });
        setIsExporting(false);
        return;
      }

      // Format tabular export rows
      const exportRows = recordsToExport.map((p, idx) => ({
        "SL No": idx + 1,
        "Docterz ID": p.docterz_id,
        "UID / UHID": p.uid || "",
        Name: p.name || "",
        "Guardian / Parent": p.guardian_name || "",
        Mobile: p.mobile || "",
        DOB: p.dob || "",
        Gender: p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : "",
        Address: p.address || "",
        "Aadhaar No": p.aadhaar_no || "",
        "3rd Party UID": p.third_party_application_uid || "",
        "Clinic ID": p.clinic_id || "",
        "First Synced": p.first_seen_at ? new Date(p.first_seen_at).toLocaleString("en-IN") : "",
        "Last Synced": p.last_synced_at ? new Date(p.last_synced_at).toLocaleString("en-IN") : "",
        "Last Visited": p.last_visited_at ? formatPatientHistoryDate(p.last_visited_at) : "",
      }));

      // Dynamically load xlsx-js-style
      // @ts-ignore
      const XLSX = (await import("xlsx-js-style")).default;
      const ws = XLSX.utils.json_to_sheet(exportRows);

      // Apply Excel styling
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0F766E" } }, // Teal-700
        alignment: { horizontal: "center", vertical: "center" },
      };
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c: C });
        if (ws[addr]) ws[addr].s = headerStyle;
      }

      // Column widths
      ws["!cols"] = [
        { wch: 8 },
        { wch: 14 },
        { wch: 16 },
        { wch: 26 },
        { wch: 22 },
        { wch: 15 },
        { wch: 12 },
        { wch: 10 },
        { wch: 30 },
        { wch: 16 },
        { wch: 18 },
        { wch: 12 },
        { wch: 20 },
        { wch: 20 },
        { wch: 16 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Patients");

      const today = new Date().toISOString().slice(0, 10);
      const filenamePrefix =
        options.scope === "all"
          ? "Docterz_All_Patients"
          : options.scope === "filtered"
          ? "Docterz_Filtered_Patients"
          : "Docterz_Patients_Page";

      if (options.format === "xlsx") {
        XLSX.writeFile(wb, `${filenamePrefix}_${today}.xlsx`, { bookType: "xlsx" });
      } else {
        XLSX.writeFile(wb, `${filenamePrefix}_${today}.csv`, { bookType: "csv" });
      }

      toast.success(
        `Successfully exported ${exportRows.length.toLocaleString("en-IN")} patients (${options.format.toUpperCase()})`,
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(err.message || "Export failed", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const lastSync = syncStatus?.latestLog;
  const lastSyncTime = lastSync?.finishedAt
    ? new Date(lastSync.finishedAt).toLocaleString("en-IN")
    : lastSync?.startedAt
    ? new Date(lastSync.startedAt).toLocaleString("en-IN")
    : null;

  return (
    <ModuleLayout
      title="Patient Directory"
      description="Shared patient master synchronized from Front Office activity and Docterz EHR, with appointment history and multi-format exports."
      action={
        <div className="flex flex-wrap items-center gap-2">
          {/* Docterz API Settings */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDocterzConfigOpen(true)}
            className="gap-1.5 text-xs h-9 cursor-pointer"
          >
            <Settings className="size-3.5 text-muted-foreground" />
            API Settings
          </Button>

          {/* Sync Now */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || isSyncRunning}
            className="gap-1.5 text-xs h-9 cursor-pointer border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400"
            id="btn-admin-patient-sync"
          >
            <RefreshCw
              className={cn("size-3.5", (syncMutation.isPending || isSyncRunning) && "animate-spin text-amber-500")}
            />
            {syncMutation.isPending || isSyncRunning ? "Syncing…" : "Sync Now"}
          </Button>

          {/* Clear Stuck Sync (conditional) */}
          {isSyncRunning && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => resetSyncMutation.mutate()}
              disabled={resetSyncMutation.isPending}
              className="gap-1.5 text-xs h-9 cursor-pointer border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400"
              title="Click if sync is stuck and not making progress"
            >
              <X className="size-3.5" />
              {resetSyncMutation.isPending ? "Resetting…" : "Clear Stuck Sync"}
            </Button>
          )}

          {/* ── Export Dropdown ── */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button
                size="sm"
                className="gap-1.5 text-xs h-9 cursor-pointer bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
                disabled={isExporting}
                id="btn-admin-export-dropdown"
              >
                {isExporting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <FileDown className="size-3.5" />
                )}
                <span>{isExporting ? "Exporting…" : "Export Data"}</span>
                <ChevronDown className="size-3.5 opacity-75" />
              </Button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                className="z-50 min-w-[240px] rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg animate-in fade-in-80"
              >
                {/* Export All Section */}
                <DropdownMenu.Label className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Export Entire Database ({syncStatus?.totalPatients?.toLocaleString("en-IN") ?? "All"} records)
                </DropdownMenu.Label>

                <DropdownMenu.Item
                  onClick={() => handleExport({ scope: "all", format: "xlsx" })}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-md cursor-pointer hover:bg-muted focus:bg-muted outline-none font-medium"
                >
                  <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-semibold">Export All to Excel (.xlsx)</p>
                    <p className="text-[10px] text-muted-foreground">Full patient master formatted workbook</p>
                  </div>
                </DropdownMenu.Item>

                <DropdownMenu.Item
                  onClick={() => handleExport({ scope: "all", format: "csv" })}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-md cursor-pointer hover:bg-muted focus:bg-muted outline-none font-medium"
                >
                  <FileText className="size-4 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-semibold">Export All to CSV (.csv)</p>
                    <p className="text-[10px] text-muted-foreground">Standard comma-separated file</p>
                  </div>
                </DropdownMenu.Item>

                {/* Export Filtered View (if search or filter active) */}
                {(debouncedSearch || (genderFilter && genderFilter !== "all")) && (
                  <>
                    <DropdownMenu.Separator className="h-px bg-border my-1" />
                    <DropdownMenu.Label className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Export Filtered Matches ({pagination.totalRecords.toLocaleString("en-IN")} results)
                    </DropdownMenu.Label>

                    <DropdownMenu.Item
                      onClick={() => handleExport({ scope: "filtered", format: "xlsx" })}
                      className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-md cursor-pointer hover:bg-muted focus:bg-muted outline-none font-medium"
                    >
                      <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Export Filtered to Excel (.xlsx)</span>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                      onClick={() => handleExport({ scope: "filtered", format: "csv" })}
                      className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-md cursor-pointer hover:bg-muted focus:bg-muted outline-none font-medium"
                    >
                      <FileText className="size-4 text-blue-600 dark:text-blue-400" />
                      <span>Export Filtered to CSV (.csv)</span>
                    </DropdownMenu.Item>
                  </>
                )}

                {/* Export Current Page */}
                <DropdownMenu.Separator className="h-px bg-border my-1" />
                <DropdownMenu.Item
                  onClick={() => handleExport({ scope: "page", format: "xlsx" })}
                  className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-md cursor-pointer hover:bg-muted focus:bg-muted outline-none text-muted-foreground"
                >
                  <FileDown className="size-4" />
                  <span>Export Current Page ({patients.length} records)</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      }
    >
      {/* ── Visual KPI Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total Patients Synced
              </p>
              <p className="text-2xl font-black text-foreground mt-1">
                {syncStatus?.totalPatients?.toLocaleString("en-IN") ?? "—"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">In local hospital database</p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <Users size={22} />
            </div>
          </CardContent>
        </Card>

        {/* Sync Status */}
        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sync Engine Status
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "inline-block h-2.5 w-2.5 rounded-full",
                    lastSync?.status === "running"
                      ? "bg-amber-500 animate-ping"
                      : lastSync?.status === "success"
                      ? "bg-emerald-500"
                      : "bg-rose-500"
                  )}
                />
                <p className="text-base font-bold capitalize text-foreground">
                  {lastSync?.status === "running" ? "Running…" : lastSync?.status || "Idle"}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[180px]">
                {lastSyncTime ? `Last: ${lastSyncTime}` : "No sync recorded"}
              </p>
            </div>
            <div
              className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center",
                lastSync?.status === "running"
                  ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                  : lastSync?.status === "success"
                  ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                  : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
              )}
            >
              {lastSync?.status === "running" ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : lastSync?.status === "success" ? (
                <CheckCircle2 size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Last Run Statistics */}
        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Latest Batch Updates
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  +{lastSync?.newRecords ?? 0}{" "}
                  <span className="text-xs font-normal text-muted-foreground">new</span>
                </p>
                <span className="text-xs text-muted-foreground">·</span>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {lastSync?.updatedRecords ?? 0}{" "}
                  <span className="text-xs font-normal text-muted-foreground">updated</span>
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {lastSync?.pagesFetched ?? 0} pages fetched ({lastSync?.totalFetched ?? 0} items)
              </p>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-700 dark:text-blue-400">
              <Activity size={20} />
            </div>
          </CardContent>
        </Card>

        {/* Auto-Sync Schedule */}
        <Card className="shadow-sm border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Auto-Sync Schedule
              </p>
              <p className="text-base font-bold text-foreground mt-1">
                {localSyncEnabled
                  ? `Every ${
                      SYNC_INTERVAL_OPTIONS.find((o) => o.value === localInterval)?.label ??
                      `${localInterval} min`
                    }`
                  : "Disabled"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {localSyncEnabled ? "Continuous background sync active" : "Manual trigger only"}
              </p>
            </div>
            <div
              className={cn(
                "h-11 w-11 rounded-xl flex items-center justify-center",
                localSyncEnabled
                  ? "bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <Activity size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Auto-Sync Scheduler Settings Banner ──────────────────────────── */}
      <Card className="shadow-sm border bg-muted/30">
        <CardContent className="p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-foreground">Background Sync Scheduler:</span>

            {/* Switch Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !localSyncEnabled;
                setLocalSyncEnabled(next);
                syncConfigMutation.mutate({ syncEnabled: next, syncIntervalMinutes: localInterval });
              }}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                localSyncEnabled ? "bg-emerald-600" : "bg-muted-foreground/30"
              )}
              role="switch"
              aria-checked={localSyncEnabled}
              id="toggle-admin-auto-sync"
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                  localSyncEnabled ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
            <span className="text-xs font-medium text-muted-foreground">
              {localSyncEnabled ? "Enabled" : "Disabled"}
            </span>

            {/* Interval Selector */}
            <select
              value={localInterval}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setLocalInterval(val);
                if (localSyncEnabled) {
                  syncConfigMutation.mutate({ syncEnabled: localSyncEnabled, syncIntervalMinutes: val });
                }
              }}
              className="h-7 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              id="select-admin-sync-interval"
            >
              {SYNC_INTERVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Backend scheduler checks every 5 minutes and executes full sync if the interval has elapsed.
          </p>
        </CardContent>
      </Card>

      {/* ── Main Patient Directory Master Table ─────────────────────────── */}
      <Card className="shadow-sm border">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>Patient Records</span>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {pagination.totalRecords.toLocaleString("en-IN")} total
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Search by name, Docterz ID, UHID/UID, mobile number, Aadhaar, or guardian
              </CardDescription>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Gender Filter */}
              <div className="flex items-center gap-1">
                <Filter className="size-3.5 text-muted-foreground" />
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="h-8 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="all">All Genders</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Page size selector */}
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                className="h-8 px-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  id="input-admin-patient-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, UID, mobile, Aadhaar…"
                  className="pl-8 h-8 text-xs"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {patientsQuery.isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Loader2 className="size-6 animate-spin text-emerald-600" />
              <span className="text-xs">Loading patient directory records…</span>
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
              <Users className="size-10 opacity-25" />
              <div className="text-center">
                <p className="text-sm font-semibold">No patients found</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {debouncedSearch || genderFilter !== "all"
                    ? "Try adjusting your search query or gender filter"
                    : "No patients synced yet — click 'Sync Now' above to pull records from Docterz"}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground">
                    <th className="py-2.5 px-3 text-left font-semibold w-12">#</th>
                    <th className="py-2.5 px-3 text-left font-semibold"><SortableHeader column="name">Patient Name</SortableHeader></th>
                    <th className="py-2.5 px-3 text-left font-semibold"><SortableHeader column="guardian">Guardian / Parent</SortableHeader></th>
                    <th className="py-2.5 px-3 text-left font-semibold"><SortableHeader column="mobile">Contact</SortableHeader></th>
                    <th className="py-2.5 px-3 text-left font-semibold"><SortableHeader column="uid">UID / UHID</SortableHeader></th>
                    <th className="py-2.5 px-3 text-left font-semibold"><SortableHeader column="dob">DOB</SortableHeader></th>
                    <th className="py-2.5 px-3 text-left font-semibold"><SortableHeader column="gender">Gender</SortableHeader></th>
                    <th className="py-2.5 px-3 text-left font-semibold">Aadhaar</th>
                    <th className="py-2.5 px-3 text-left font-semibold">3rd Party UID</th>
                    <th className="py-2.5 px-3 text-left font-semibold"><SortableHeader column="lastVisited">Last Visited</SortableHeader></th>
                    <th className="py-2.5 px-3 text-left font-semibold"><SortableHeader column="lastSynced">Last Synced</SortableHeader></th>
                    <th className="py-2.5 px-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {patients.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                        {(page - 1) * pageSize + idx + 1}
                      </td>

                      {/* Name & ID */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-foreground max-w-[170px] truncate">
                          {p.name || <span className="text-muted-foreground italic">Unnamed Patient</span>}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          ID: {p.docterz_id || "Pending directory sync"}
                        </div>
                      </td>

                      {/* Guardian */}
                      <td className="py-2.5 px-3 text-muted-foreground max-w-[150px] truncate">
                        {p.guardian_name || "—"}
                      </td>

                      {/* Mobile & Address */}
                      <td className="py-2.5 px-3">
                        <div className="font-mono text-foreground">{p.mobile || "—"}</div>
                        {p.address && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-[140px]" title={p.address}>
                            {p.address}
                          </div>
                        )}
                      </td>

                      {/* UID */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                        {p.uid ? (
                          <span className="font-semibold text-foreground">{p.uid}</span>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* DOB */}
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                        {p.dob || "—"}
                      </td>

                      {/* Gender */}
                      <td className="py-2.5 px-3">
                        {p.gender ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] py-0 px-1.5 capitalize font-medium",
                              p.gender.toLowerCase() === "female"
                                ? "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800"
                                : p.gender.toLowerCase() === "male"
                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {p.gender}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Aadhaar */}
                      <td className="py-2.5 px-3">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPatient(p);
                            setAadhaarInput(p.aadhaar_no || "");
                          }}
                          className="inline-flex items-center gap-1 group/aadh hover:text-foreground cursor-pointer text-left py-0.5"
                          title="Click to enter or edit Aadhaar number"
                        >
                          {p.aadhaar_no ? (
                            <span className="font-mono text-[11px] text-foreground font-semibold">
                              {p.aadhaar_no}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50 italic text-[11px] group-hover/aadh:text-foreground group-hover/aadh:underline">
                              + Add Aadhaar
                            </span>
                          )}
                          <Edit2 className="size-2.5 opacity-0 group-hover/aadh:opacity-100 text-muted-foreground ml-0.5 transition-opacity" />
                        </button>
                      </td>

                      {/* 3rd Party UID */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground max-w-[130px] truncate">
                        {p.third_party_application_uid || "—"}
                      </td>

                      {/* Last Synced */}
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap text-[11px]">
                        {p.last_visited_at ? formatPatientHistoryDate(p.last_visited_at) : "—"}
                      </td>

                      {/* Last Synced */}
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap text-[11px]">
                        {p.last_synced_at ? new Date(p.last_synced_at).toLocaleDateString("en-IN") : "—"}
                      </td>

                      {/* Patient actions */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setHistoryPatient(p)}
                            className="inline-flex items-center gap-1 text-[11px] text-violet-700 dark:text-violet-400 hover:underline cursor-pointer font-medium"
                            title="View appointment and payment history"
                          >
                            <History className="size-3" /> History
                          </button>
                          <button
                            onClick={() => handleOpenInDocterz(p)}
                            disabled={resolvingId === p.id}
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-50 cursor-pointer font-medium"
                            title="Open in Docterz Web EHR"
                          >
                            {resolvingId === p.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <ExternalLink className="size-3" />
                            )}
                            Docterz
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination Footer ────────────────────────────────────────── */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t bg-muted/10">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {Math.min((page - 1) * pageSize + 1, pagination.totalRecords).toLocaleString("en-IN")}
                </span>
                –
                <span className="font-semibold text-foreground">
                  {Math.min(page * pageSize, pagination.totalRecords).toLocaleString("en-IN")}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {pagination.totalRecords.toLocaleString("en-IN")}
                </span>{" "}
                patients
              </p>

              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 cursor-pointer"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  title="First Page"
                >
                  <ChevronsLeft className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 cursor-pointer"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  title="Previous Page"
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <span className="text-xs px-2 font-medium">
                  Page {page} of {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 cursor-pointer"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  title="Next Page"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 w-7 p-0 cursor-pointer"
                  onClick={() => setPage(pagination.totalPages)}
                  disabled={page === pagination.totalPages}
                  title="Last Page"
                >
                  <ChevronsRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Docterz API Configuration Dialog */}
      <DocterzConfigDialog open={docterzConfigOpen} onOpenChange={setDocterzConfigOpen} />

      {/* Patient appointment and payment history */}
      <Dialog open={!!historyPatient} onOpenChange={(open) => !open && setHistoryPatient(null)}>
        <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="size-5 text-violet-600" />
              Patient History — {historyPatient?.name || "Patient"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Front Office appointments and linked Razorpay records{historyPatient?.uid ? ` for UID ${historyPatient.uid}` : " matched by name"}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[65vh] overflow-auto rounded-lg border">
            {patientHistoryQuery.isLoading ? (
              <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Loading history…</div>
            ) : patientHistoryQuery.isError ? (
              <div className="p-8 text-center text-sm text-destructive">Could not load patient history.</div>
            ) : !patientHistoryQuery.data?.data.length ? (
              <div className="p-8 text-center"><History className="mx-auto mb-3 size-9 text-muted-foreground/40" /><p className="font-semibold">No history recorded</p><p className="mt-1 text-xs text-muted-foreground">Process Front Office data to populate appointment history.</p></div>
            ) : (
              <table className="w-full min-w-200 text-left text-xs">
                <thead className="sticky top-0 bg-muted text-muted-foreground"><tr><th className="p-3">Appointment</th><th className="p-3">Doctor / service</th><th className="p-3">Source</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th></tr></thead>
                <tbody className="divide-y">
                  {consolidatePatientHistory(patientHistoryQuery.data.data).map((entry) => (
                    <tr key={entry.history_key} className="align-top hover:bg-muted/30">
                      <td className="p-3"><div className="font-semibold">{entry.appointment_id ? `#${entry.appointment_id}` : "No appointment ID"}</div><div className="mt-1 whitespace-nowrap text-muted-foreground" title={entry.appointment_date || entry.payment_date || undefined}>{formatPatientHistoryDate(entry.appointment_date || entry.payment_date)}</div>{entry.source_kind === "razorpay" && entry.invoice_url && <a href={entry.invoice_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-violet-700 hover:underline"><ExternalLink className="size-3" />Open invoice PDF</a>}</td>
                      <td className="p-3"><div>{entry.doctor_name || "—"}</div><div className="mt-1 text-muted-foreground">{entry.service_name || entry.source_type}{entry.schedule ? ` · ${entry.schedule}` : ""}</div></td>
                      <td className="p-3">{entry.source_kind === "consolidated" ? <><div className="font-semibold text-emerald-700">API + Razorpay</div><div className="mt-1 font-mono text-muted-foreground">{entry.invoice_no ? `Inv ${entry.invoice_no}` : "No invoice"} · {entry.transfer_id || "Transfer matched"}</div>{entry.invoice_url && <a href={entry.invoice_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-violet-700 hover:underline"><ExternalLink className="size-3" />Open invoice</a>}</> : entry.source_kind === "docterz_record" ? <><div className="font-semibold text-violet-700">Docterz Record</div>{entry.invoice_url && <a href={entry.invoice_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 hover:underline"><ExternalLink className="size-3" />Open invoice</a>}</> : entry.source_kind === "razorpay" ? <><div className="font-mono">{entry.transfer_id || "Razorpay"}</div><div className="mt-1 capitalize text-muted-foreground">{entry.settlement_status}</div></> : <><div>{entry.invoice_no ? `Invoice #${entry.invoice_no}` : "Front Office"}</div><div className="mt-1 capitalize text-muted-foreground">{entry.payment_mode || entry.source_type}</div>{entry.invoice_url && <a href={entry.invoice_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-violet-700 hover:underline"><ExternalLink className="size-3" />Open invoice</a>}</>}</td>
                      <td className="p-3 text-right">{entry.source_kind === "consolidated" ? <>{entry.front_office_record_count ? <div className="font-bold">API collected {formatMoney(entry.net_amount)}</div> : <div className="font-medium text-violet-700">Docterz record linked</div>}<div className="mt-1 text-[10px] font-semibold text-emerald-700">Razorpay {formatMoney(entry.razorpay_net_amount || 0)}</div>{entry.pending_amount > 0 && <div className="mt-1 text-[10px] text-amber-600">Pending {formatMoney(entry.pending_amount)}</div>}{entry.reversed_amount > 0 && <div className="mt-1 text-[10px] text-rose-600">Reversed {formatMoney(entry.reversed_amount)}</div>}</> : entry.source_kind === "docterz_record" ? <span className="text-muted-foreground">Clinical record</span> : <><div className="font-bold">{formatMoney(entry.net_amount)}</div>{entry.gross_amount !== entry.net_amount && <div className="mt-1 text-[10px] text-muted-foreground">Billed {formatMoney(entry.gross_amount)}</div>}{entry.pending_amount > 0 && <div className="mt-1 text-[10px] text-amber-600">Pending {formatMoney(entry.pending_amount)}</div>}{entry.reversed_amount > 0 && <div className="mt-1 text-[10px] text-rose-600">Reversed {formatMoney(entry.reversed_amount)}</div>}</>}</td>
                      <td className="p-3"><Badge variant="outline" className={entry.source_kind === "consolidated" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "capitalize"}>{entry.source_kind === "consolidated" ? "Matched · Consolidated" : entry.source_kind === "docterz_record" ? "Docterz" : entry.source_kind === "front_office" ? entry.source_type : entry.reconciliation_status}</Badge><div className="mt-1 max-w-44 truncate text-[10px] text-muted-foreground" title={entry.file_name}>{entry.file_name}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Aadhaar Number Dialog */}
      <Dialog open={!!editingPatient} onOpenChange={(open) => !open && setEditingPatient(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>Update Patient Aadhaar Number</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record or edit the 12-digit Aadhaar number for{" "}
              <strong className="text-foreground">{editingPatient?.name}</strong> (Docterz ID:{" "}
              {editingPatient?.docterz_id}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAadhaar} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Aadhaar Number (12 Digits)</label>
              <Input
                placeholder="e.g. 1234 5678 9012"
                maxLength={14}
                value={aadhaarInput}
                onChange={(e) => setAadhaarInput(e.target.value)}
                className="font-mono text-sm tracking-wider"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Saved in ACME ERP and automatically retained during future Docterz synchronizations.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingPatient(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5"
                disabled={updatePatientMutation.isPending}
              >
                {updatePatientMutation.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Aadhaar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
