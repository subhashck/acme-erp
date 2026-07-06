import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarRange, ClipboardCheck, Clock, UserCheck, UserMinus, UserX, RefreshCw, Sparkles, Fingerprint, Upload, Link, Plus, Trash2, Edit } from "lucide-react";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { DataTable } from "../../../components/DataTable";
import { useRpcQuery, queryClient } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../ui/card";
import { Select } from "../../../ui/select";
import { Autocomplete } from "../../../ui/autocomplete";
import { Field } from "../../../components/Field";
import { cn } from "../../../utils/cn";
import XLSX from "xlsx-js-style";
import type { StaffRow } from "../../../types";

export const Route = createFileRoute("/_authenticated/hr/attendance")({
  component: AttendancePage,
});

type AttendanceLog = {
  staffId: number;
  name: string;
  employeeCode: string;
  date: string;
  attendanceId: number | null;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  notes: string | null;
  rosteredShift: {
    name: string;
    startTime: string;
    endTime: string;
    isOffDay: boolean;
  } | null;
};

function AttendancePage() {
  const [currentTab, setCurrentTab] = React.useState<"logs" | "import" | "mappings">("logs");
  const [date, setDate] = React.useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [departmentId, setDepartmentId] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("All");

  // Simulating ranges state
  const [simStart, setSimStart] = React.useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  });
  const [simEnd, setSimEnd] = React.useState(() => new Date().toISOString().split("T")[0]);
  const [simulating, setSimulating] = React.useState(false);

  // Manual log state
  const [selectedLogEmpId, setSelectedLogEmpId] = React.useState("");
  const [manualCheckIn, setManualCheckIn] = React.useState("");
  const [manualCheckOut, setManualCheckOut] = React.useState("");
  const [manualStatus, setManualStatus] = React.useState("Present");
  const [manualNotes, setManualNotes] = React.useState("");
  const [submittingManual, setSubmittingManual] = React.useState(false);

  // Mappings State
  const [mappingEmpId, setMappingEmpId] = React.useState("");
  const [mappingBioCode, setMappingBioCode] = React.useState("");
  const [submittingMapping, setSubmittingMapping] = React.useState(false);
  const [mappingSearch, setMappingSearch] = React.useState("");
  const [editingMappingId, setEditingMappingId] = React.useState<number | null>(null);

  // File Import State
  const [fileLogs, setFileLogs] = React.useState<any[]>([]);
  const [importingLogs, setImportingLogs] = React.useState(false);
  const [quickMapCode, setQuickMapCode] = React.useState<string | null>(null);
  const [quickMapEmpId, setQuickMapEmpId] = React.useState("");

  const departmentsQuery = useRpcQuery<{ id: number; name: string }[]>(["departments"], () =>
    client.departments.$get()
  );

  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () =>
    client.hr.staff.$get()
  );

  const attendanceQuery = useRpcQuery<AttendanceLog[]>(
    ["attendance", date, departmentId, statusFilter],
    () =>
      client.hr.attendance.$get({
        query: {
          date,
          departmentId: departmentId === "All" ? "" : departmentId,
          status: statusFilter,
        },
      })
  );

  const mappingsQuery = useRpcQuery<any[]>(["biometric-mappings"], () =>
    client.hr["biometric-mappings"].$get()
  );

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappingEmpId || !mappingBioCode) {
      alert("Select an employee and enter a biometric code.");
      return;
    }
    setSubmittingMapping(true);
    try {
      const res = await client.hr["biometric-mappings"].$post({
        json: {
          id: editingMappingId || undefined,
          staffId: Number(mappingEmpId),
          biometricCode: mappingBioCode.trim(),
        },
      } as any);
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["biometric-mappings"] });
        setMappingEmpId("");
        setMappingBioCode("");
        setEditingMappingId(null);
      } else {
        const err = (await res.json()) as any;
        alert(err.error || "Failed to save mapping.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving mapping.");
    } finally {
      setSubmittingMapping(false);
    }
  };

  const handleEditMapping = (row: any) => {
    setEditingMappingId(row.id);
    setMappingEmpId(String(row.staffId));
    setMappingBioCode(row.biometricCode);
  };

  const handleDeleteMapping = async (id: number) => {
    if (!window.confirm("Delete this mapping?")) return;
    try {
      const res = await client.hr["biometric-mappings"][":id"].$delete({
        param: { id: String(id) },
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["biometric-mappings"] });
      } else {
        alert("Failed to delete mapping.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting mapping.");
    }
  };

  const handleQuickMapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMapCode || !quickMapEmpId) return;
    try {
      const res = await client.hr["biometric-mappings"].$post({
        json: {
          staffId: Number(quickMapEmpId),
          biometricCode: quickMapCode,
        },
      } as any);
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["biometric-mappings"] });
        setQuickMapCode(null);
        setQuickMapEmpId("");
      } else {
        const err = (await res.json()) as any;
        alert(err.error || "Failed to save mapping.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving mapping.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        if (json.length === 0) {
          alert("The file seems to be empty.");
          return;
        }

        const firstRow = json[0];
        const keys = Object.keys(firstRow);
        const codeKey = keys.find(k => /code|id|biometric|card|emp/i.test(k)) || keys[0];
        const dateKey = keys.find(k => /date|day|log/i.test(k)) || keys[1];
        const checkInKey = keys.find(k => /in|start/i.test(k)) || keys[2];
        const checkOutKey = keys.find(k => /out|end/i.test(k)) || keys[3];

        const parseDateVal = (val: any) => {
          if (!val) return "";
          if (typeof val === "number") {
            const date = new Date((val - 25569) * 86400 * 1000);
            return date.toISOString().split("T")[0];
          }
          const str = String(val).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
          const dm = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (dm) return `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`;
          const d = new Date(str);
          if (!isNaN(d.getTime())) {
            return d.toISOString().split("T")[0];
          }
          return str;
        };

        const parseTimeVal = (val: any) => {
          if (!val) return null;
          if (typeof val === "number") {
            const totalSeconds = Math.round(val * 24 * 3600);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          }
          const str = String(val).trim();
          const tm = str.match(/^(\d{1,2}):(\d{2})/);
          if (tm) return `${tm[1].padStart(2, '0')}:${tm[2]}`;
          return str;
        };

        const parsedRows = json.map((row) => {
          const rawCode = String(row[codeKey] ?? "").trim();
          const rawDate = row[dateKey];
          const rawIn = row[checkInKey];
          const rawOut = row[checkOutKey];

          return {
            biometricCode: rawCode,
            date: parseDateVal(rawDate),
            checkIn: parseTimeVal(rawIn),
            checkOut: parseTimeVal(rawOut)
          };
        });

        setFileLogs(parsedRows);
      } catch (err) {
        console.error(err);
        alert("Error parsing file. Please check if the layout is valid.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const mappedPreviewLogs = React.useMemo(() => {
    const codeMap = new Map(
      (mappingsQuery.data ?? []).map(m => [String(m.biometricCode).trim().toLowerCase(), m])
    );

    return fileLogs.map((log) => {
      const mapping = codeMap.get(log.biometricCode.toLowerCase());
      return {
        ...log,
        staffId: mapping?.staffId || null,
        staffName: mapping?.staffName || "Unknown",
        employeeCode: mapping?.employeeCode || "—",
        isMapped: !!mapping
      };
    });
  }, [fileLogs, mappingsQuery.data]);

  const importSummary = React.useMemo(() => {
    const total = mappedPreviewLogs.length;
    const mapped = mappedPreviewLogs.filter((l) => l.isMapped).length;
    const unmapped = total - mapped;
    
    const uniqueUnmapped = Array.from(new Set(
      mappedPreviewLogs.filter((l) => !l.isMapped).map((l) => l.biometricCode)
    ));

    return { total, mapped, unmapped, uniqueUnmapped };
  }, [mappedPreviewLogs]);

  const filteredMappings = React.useMemo(() => {
    const data = mappingsQuery.data ?? [];
    if (!mappingSearch) return data;
    const query = mappingSearch.toLowerCase();
    return data.filter(r => 
      r.staffName.toLowerCase().includes(query) ||
      r.employeeCode.toLowerCase().includes(query) ||
      r.biometricCode.toLowerCase().includes(query)
    );
  }, [mappingsQuery.data, mappingSearch]);

  const handleImportSubmit = async () => {
    const matched = mappedPreviewLogs.filter((l) => l.isMapped);
    if (matched.length === 0) {
      alert("No matched biometric logs to import.");
      return;
    }
    
    setImportingLogs(true);
    try {
      const payload = matched.map((log) => ({
        staffId: log.staffId!,
        date: log.date,
        checkIn: log.checkIn,
        checkOut: log.checkOut,
        notes: "Biometric System Import"
      }));

      const res = await client.hr.attendance.bulk.$post({
        json: payload
      } as any);

      if (res.ok) {
        alert(`Successfully imported ${payload.length} attendance logs!`);
        setFileLogs([]);
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
        setCurrentTab("logs");
      } else {
        const err = (await res.json()) as any;
        alert(err.error || "Failed to bulk import logs.");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting biometric logs.");
    } finally {
      setImportingLogs(false);
    }
  };

  const kpis = React.useMemo(() => {
    const data = attendanceQuery.data ?? [];
    return {
      total: data.length,
      present: data.filter((d) => d.status === "Present" || d.status === "Late").length,
      absent: data.filter((d) => d.status === "Absent").length,
      halfDay: data.filter((d) => d.status === "Half-day").length,
      leave: data.filter((d) => d.status === "Approved Leave").length,
      offDuty: data.filter((d) => d.status === "Off Duty").length,
    };
  }, [attendanceQuery.data]);

  const handleSimulate = async () => {
    if (!confirm(`Are you sure you want to simulate attendance logs from ${simStart} to ${simEnd}? This will delete existing logs in this range.`)) {
      return;
    }
    setSimulating(true);
    try {
      const res = await client.hr.attendance.simulate.$post({
        json: { startDate: simStart, endDate: simEnd },
      });
      if (res.ok) {
        const data = (await res.json()) as any;
        alert(`Successfully simulated ${data.simulatedCount} logs.`);
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
      } else {
        alert("Failed to simulate logs.");
      }
    } catch (err) {
      console.error(err);
      alert("Error simulating attendance logs.");
    } finally {
      setSimulating(false);
    }
  };

  const handleQuickCheckIn = async (staffId: number, time: string) => {
    try {
      const res = await client.hr.attendance.$post({
        json: { staffId, date, checkIn: time, status: "Present" },
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
      } else {
        const err = (await res.json()) as any;
        alert(err.error || "Failed to check in.");
      }
    } catch (err) {
      console.error(err);
      alert("Error logging check-in.");
    }
  };

  const handleQuickCheckOut = async (attendanceId: number, time: string) => {
    try {
      const res = await client.hr.attendance[":id"].$put({
        param: { id: String(attendanceId) },
        json: { checkOut: time },
      } as any);
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
      } else {
        alert("Failed to check out.");
      }
    } catch (err) {
      console.error(err);
      alert("Error logging check-out.");
    }
  };

  const handleAddManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLogEmpId) {
      alert("Select an employee first.");
      return;
    }
    setSubmittingManual(true);
    try {
      const res = await client.hr.attendance.$post({
        json: {
          staffId: Number(selectedLogEmpId),
          date,
          checkIn: manualCheckIn || null,
          checkOut: manualCheckOut || null,
          status: manualStatus,
          notes: manualNotes || null,
        },
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
        setSelectedLogEmpId("");
        setManualNotes("");
      } else {
        const err = (await res.json()) as any;
        alert(err.error || "Failed to add manual log.");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding manual log.");
    } finally {
      setSubmittingManual(false);
    }
  };

  const columns = [
    {
      id: "employeeCode",
      label: "Code",
      render: (row: AttendanceLog) => <span>{row.employeeCode}</span>,
    },
    {
      id: "name",
      label: "Name",
      render: (row: AttendanceLog) => <span className="font-semibold">{row.name}</span>,
    },
    {
      id: "roster",
      label: "Rostered Shift",
      render: (row: AttendanceLog) => (
        <span>
          {row.rosteredShift ? (
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md px-2 py-0.5 border border-border">
              {row.rosteredShift.name} ({row.rosteredShift.startTime} - {row.rosteredShift.endTime})
            </span>
          ) : (
            <span className="text-xs text-muted-foreground italic">—</span>
          )}
        </span>
      ),
    },
    {
      id: "checkIn",
      label: "In Time",
      render: (row: AttendanceLog) => (
        <span className="font-mono text-xs">{row.checkIn || "—"}</span>
      ),
    },
    {
      id: "checkOut",
      label: "Out Time",
      render: (row: AttendanceLog) => (
        <span className="font-mono text-xs">{row.checkOut || "—"}</span>
      ),
    },
    {
      id: "status",
      label: "Status",
      render: (row: AttendanceLog) => {
        let badgeStyle = "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-350 dark:border-slate-700";
        if (row.status === "Present") badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30";
        if (row.status === "Late") badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-inset ring-amber-600/10 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30";
        if (row.status === "Half-day") badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-inset ring-indigo-600/10 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/30";
        if (row.status === "Absent") badgeStyle = "bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-inset ring-rose-600/10 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30";
        if (row.status === "Approved Leave") badgeStyle = "bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-inset ring-sky-600/10 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/30";
        return (
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border", badgeStyle)}>
            {row.status}
          </span>
        );
      },
    },
    {
      id: "notes",
      label: "Notes",
      render: (row: AttendanceLog) => (
        <span className="text-xs text-muted-foreground truncate max-w-[120px] inline-block">{row.notes || "—"}</span>
      ),
    },
    {
      id: "actions",
      label: "Quick Actions",
      render: (row: AttendanceLog) => (
        <div className="flex gap-1">
          {row.status === "Absent" && (
            <Button
              variant="outline"
              size="default"
              className="h-8 text-xs px-2"
              onClick={() => handleQuickCheckIn(row.staffId, "09:00")}
            >
              <UserCheck size={12} className="mr-1" /> Log In
            </Button>
          )}
          {(row.status === "Present" || row.status === "Late") && !row.checkOut && row.attendanceId && (
            <Button
              variant="outline"
              size="default"
              className="h-8 text-xs px-2"
              onClick={() => handleQuickCheckOut(row.attendanceId!, "17:00")}
            >
              <UserMinus size={12} className="mr-1" /> Log Out
            </Button>
          )}
          {row.status !== "Absent" && !(row.status === "Present" && !row.checkOut) && (
            <span className="text-xs text-muted-foreground italic px-2">—</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <ModuleLayout
      title="Attendance Management"
      description="Manage daily check-ins, record manual attendance logs, and track staff roster compliance."
    >
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border pb-3 mb-6 flex-wrap">
        <Button
          variant={currentTab === "logs" ? "default" : "outline"}
          onClick={() => setCurrentTab("logs")}
          className="h-9 text-xs px-3"
        >
          <Clock size={14} />
          Daily Logs
        </Button>
        <Button
          variant={currentTab === "import" ? "default" : "outline"}
          onClick={() => setCurrentTab("import")}
          className="h-9 text-xs px-3"
        >
          <Upload size={14} />
          Import Biometric Logs
        </Button>
        <Button
          variant={currentTab === "mappings" ? "default" : "outline"}
          onClick={() => setCurrentTab("mappings")}
          className="h-9 text-xs px-3"
        >
          <Fingerprint size={14} />
          Biometric Mappings
        </Button>
      </div>

      {currentTab === "logs" && (
        <>
          {/* Visual KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-muted/40 border-border">
              <CardHeader className="pb-1.5 pt-3.5 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Staff</CardTitle>
                <ClipboardCheck size={16} className="text-muted-foreground/70" />
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-black text-foreground">{kpis.total}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10 border-border">
              <CardHeader className="pb-1.5 pt-3.5 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-emerald-850 dark:text-emerald-400 uppercase tracking-wider">Present / Late</CardTitle>
                <Clock size={16} className="text-emerald-500" />
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-black text-emerald-900 dark:text-emerald-300">{kpis.present}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-rose-500 bg-rose-50/10 dark:bg-rose-950/10 border-border">
              <CardHeader className="pb-1.5 pt-3.5 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-rose-850 dark:text-rose-400 uppercase tracking-wider">Absences</CardTitle>
                <UserX size={16} className="text-rose-500" />
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-black text-rose-900 dark:text-rose-300">{kpis.absent}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10 border-border">
              <CardHeader className="pb-1.5 pt-3.5 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-indigo-850 dark:text-indigo-400 uppercase tracking-wider">Half-Days</CardTitle>
                <UserMinus size={16} className="text-indigo-500" />
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-black text-indigo-900 dark:text-indigo-300">{kpis.halfDay}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-sky-500 bg-sky-50/10 dark:bg-sky-950/10 border-border">
              <CardHeader className="pb-1.5 pt-3.5 px-4 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-xs font-semibold text-sky-850 dark:text-sky-400 uppercase tracking-wider">On Leaves</CardTitle>
                <CalendarRange size={16} className="text-sky-500" />
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-black text-sky-900 dark:text-sky-300">{kpis.leave}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-4 mt-6">
            {/* Left column (Form & Simulations) */}
            <div className="xl:col-span-1 space-y-6">
              {/* Daily Manual Log Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Record Attendance</CardTitle>
                  <CardDescription>Log checking data manually for an employee.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddManualLog} className="space-y-4">
                    <Autocomplete
                      label="Employee"
                      value={selectedLogEmpId}
                      onChange={(val) => setSelectedLogEmpId(val)}
                      options={(staffQuery.data ?? []).map((s) => [String(s.staffId), `${s.name} (${s.employeeCode})`])}
                    />
                    <Field
                      label="Check In Time"
                      type="text"
                      placeholder="HH:MM (e.g. 09:00)"
                      value={manualCheckIn}
                      onChange={(e) => setManualCheckIn(e.target.value)}
                    />
                    <Field
                      label="Check Out Time"
                      type="text"
                      placeholder="HH:MM (e.g. 17:00)"
                      value={manualCheckOut}
                      onChange={(e) => setManualCheckOut(e.target.value)}
                    />
                    <Select
                      label="Status Override"
                      value={manualStatus}
                      onChange={(e) => setManualStatus(e.target.value)}
                      options={["Present", "Late", "Half-day", "Absent"]}
                    />
                    <Field
                      label="Reviewer Notes"
                      type="text"
                      placeholder="Reason / Notes"
                      value={manualNotes}
                      onChange={(e) => setManualNotes(e.target.value)}
                    />
                    <Button type="submit" className="w-full" disabled={submittingManual}>
                      {submittingManual ? "Submitting..." : "Log Attendance"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Bulk Simulator Panel */}
              <Card className="border-indigo-100 dark:border-indigo-950/40 bg-indigo-50/5 dark:bg-indigo-950/5">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-1.5 text-indigo-950 dark:text-indigo-200">
                    <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" />
                    Bulk Logs Simulator
                  </CardTitle>
                  <CardDescription className="text-indigo-900/60 dark:text-indigo-300/60">
                    Automatically generate check-ins/absences based on shift rosters to validate payroll deductions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field
                    label="Simulate Start"
                    type="date"
                    value={simStart}
                    onChange={(e) => setSimStart(e.target.value)}
                  />
                  <Field
                    label="Simulate End"
                    type="date"
                    value={simEnd}
                    onChange={(e) => setSimEnd(e.target.value)}
                  />
                  <Button
                    onClick={handleSimulate}
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={simulating}
                  >
                    {simulating ? "Generating..." : "Simulate Roster Logs"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Logs list (Right column) */}
            <div className="xl:col-span-3">
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border flex-wrap gap-4">
                  <div>
                    <CardTitle className="text-base">Attendance logs</CardTitle>
                    <CardDescription>Daily check-ins showing punches and computed compliance status.</CardDescription>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <Field
                      label=""
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full sm:w-auto"
                    />
                    <select
                      className="h-9 rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={departmentId}
                      onChange={(e) => setDepartmentId(e.target.value)}
                    >
                      <option value="All" className="bg-background text-foreground">All Departments</option>
                      {(departmentsQuery.data ?? []).map((d) => (
                        <option key={d.id} value={String(d.id)} className="bg-background text-foreground">
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="h-9 rounded-md border border-input bg-background text-foreground px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="All" className="bg-background text-foreground">All Statuses</option>
                      <option value="Present" className="bg-background text-foreground">Present</option>
                      <option value="Late" className="bg-background text-foreground">Late</option>
                      <option value="Half-day" className="bg-background text-foreground">Half-day</option>
                      <option value="Absent" className="bg-background text-foreground">Absent</option>
                      <option value="Approved Leave" className="bg-background text-foreground">Approved Leave</option>
                      <option value="Off Duty" className="bg-background text-foreground">Off Duty</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable
                    rows={attendanceQuery.data ?? []}
                    columns={columns as any}
                    enablePagination
                    enableSorting
                    enableFiltering
                    filterPlaceholder="Search logs..."
                    isLoading={attendanceQuery.isLoading}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {currentTab === "import" && (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-4">
            {/* Upload File Box */}
            <div className="xl:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload size={18} className="text-primary" />
                    Upload File
                  </CardTitle>
                  <CardDescription>Upload CSV or Excel sheet export from your biometric terminal.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer relative">
                    <input
                      type="file"
                      accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Click to select files</p>
                    <p className="text-[10px] text-slate-500 mt-1">Supports CSV, XLSX</p>
                  </div>

                  {fileLogs.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total Entries:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{importSummary.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Matched to Staff:</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-450">{importSummary.mapped}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Unmapped Codes:</span>
                          <span className={cn("font-semibold", importSummary.unmapped > 0 ? "text-rose-600" : "text-slate-800 dark:text-slate-200")}>
                            {importSummary.unmapped}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={handleImportSubmit}
                        className="w-full"
                        disabled={importingLogs || importSummary.mapped === 0}
                      >
                        {importingLogs ? "Importing..." : `Import ${importSummary.mapped} Matched Logs`}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Inline Quick Mapper Panel */}
              {importSummary.unmapped > 0 && (
                <Card className="border-rose-100 dark:border-rose-900/40 bg-rose-50/5 dark:bg-rose-950/5">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-1.5 text-rose-950 dark:text-rose-200">
                      <Link size={18} className="text-rose-600 dark:text-rose-455" />
                      Resolve Unmapped Codes
                    </CardTitle>
                    <CardDescription className="text-rose-900/60 dark:text-rose-300/60">
                      These biometric codes are in the file but have no staff mapped. Map them here to automatically resolve them in the preview below.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {quickMapCode ? (
                      <form onSubmit={handleQuickMapSubmit} className="space-y-3 p-3 border border-rose-200 dark:border-rose-900/40 rounded-lg bg-rose-50/20 dark:bg-rose-950/10">
                        <p className="text-xs font-semibold text-rose-900 dark:text-rose-300">
                          Mapping Code: <span className="font-mono bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-rose-300 dark:border-rose-900/50 text-rose-955 dark:text-rose-300">{quickMapCode}</span>
                        </p>
                        <Autocomplete
                          label="Select Employee"
                          value={quickMapEmpId}
                          onChange={(val) => setQuickMapEmpId(val)}
                          options={(staffQuery.data ?? []).map((s) => [String(s.staffId), `${s.name} (${s.employeeCode})`])}
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="default" className="flex-1 h-9 text-xs">
                            Apply Mapping
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="default"
                            onClick={() => { setQuickMapCode(null); setQuickMapEmpId(""); }}
                            className="h-9 text-xs border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-950/30 text-rose-800 dark:text-rose-300"
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="divide-y divide-rose-100 dark:divide-rose-900/30 max-h-60 overflow-y-auto pr-1">
                        {importSummary.uniqueUnmapped.map((code) => (
                          <div key={code} className="flex items-center justify-between py-2 text-xs">
                            <span className="font-mono bg-slate-100 dark:bg-slate-900 border border-border px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-350">{code}</span>
                            <Button
                              variant="outline"
                              size="default"
                              onClick={() => setQuickMapCode(code)}
                              className="h-7 text-[10px] px-2 border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                            >
                              Map Staff
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Preview Sheet Data */}
            <div className="xl:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Spreadsheet Preview</CardTitle>
                  <CardDescription>Preview of parsed attendance logs before final upload.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable
                    rows={mappedPreviewLogs}
                    columns={[
                      {
                        id: "biometricCode",
                        label: "Bio Code",
                        render: (row: any) => <span className="font-mono text-xs">{row.biometricCode}</span>
                      },
                      {
                        id: "staff",
                        label: "Matched Staff",
                        render: (row: any) => (
                          row.isMapped ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{row.staffName}</span>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400">{row.employeeCode}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-rose-50 dark:bg-rose-950/30 px-2 py-1 text-xs font-semibold text-rose-700 dark:text-rose-455 ring-1 ring-inset ring-rose-600/10 dark:ring-rose-900/30">
                              Unmapped Code
                            </span>
                          )
                        )
                      },
                      {
                        id: "date",
                        label: "Date",
                        render: (row: any) => <span>{row.date}</span>
                      },
                      {
                        id: "checkIn",
                        label: "Check In",
                        render: (row: any) => <span>{row.checkIn || "—"}</span>
                      },
                      {
                        id: "checkOut",
                        label: "Check Out",
                        render: (row: any) => <span>{row.checkOut || "—"}</span>
                      }
                    ] as any}
                    enablePagination
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {currentTab === "mappings" && (
        <div className="grid gap-6 xl:grid-cols-4">
          {/* Add Mapping Form */}
          <div className="xl:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Link size={18} className="text-primary" />
                  {editingMappingId ? "Edit Mapping" : "Create Mapping"}
                </CardTitle>
                <CardDescription>
                  {editingMappingId ? "Update mapping details for the selected employee." : "Link a biometric system code to a staff member."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddMapping} className="space-y-4">
                  <Autocomplete
                    label="Employee"
                    value={mappingEmpId}
                    onChange={(val) => setMappingEmpId(val)}
                    options={(staffQuery.data ?? []).map((s) => [String(s.staffId), `${s.name} (${s.employeeCode})`])}
                  />
                  <Field
                    label="Biometric System Code"
                    placeholder="e.g. 1004 or BIO-88"
                    value={mappingBioCode}
                    onChange={(e) => setMappingBioCode(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={submittingMapping}>
                      {submittingMapping ? "Saving..." : editingMappingId ? "Update Mapping" : "Save Mapping"}
                    </Button>
                    {editingMappingId && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setEditingMappingId(null);
                          setMappingEmpId("");
                          setMappingBioCode("");
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Mappings List */}
          <div className="xl:col-span-3">
            <Card>
              <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="text-base">Active Mappings</CardTitle>
                  <CardDescription>Mapped biometric codes are used to identify employees in uploaded logs.</CardDescription>
                </div>
                <div className="w-full sm:w-[240px]">
                  <input
                    type="text"
                    placeholder="Search mappings..."
                    value={mappingSearch}
                    onChange={(e) => setMappingSearch(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 outline-none bg-slate-50 dark:bg-slate-900/50 text-foreground focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  rows={filteredMappings}
                  isLoading={mappingsQuery.isLoading}
                  columns={[
                    {
                      id: "employeeCode",
                      label: "Staff Code",
                      render: (row: any) => <span>{row.employeeCode}</span>
                    },
                    {
                      id: "staffName",
                      label: "Staff Name",
                      render: (row: any) => <span className="font-semibold">{row.staffName}</span>
                    },
                    {
                      id: "biometricCode",
                      label: "Biometric Code",
                      render: (row: any) => <span className="font-mono bg-slate-100 dark:bg-slate-800 border border-border px-1.5 py-0.5 rounded text-xs text-foreground">{row.biometricCode}</span>
                    },
                    {
                      id: "actions",
                      label: "",
                      render: (row: any) => (
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-muted"
                            onClick={() => handleEditMapping(row)}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDeleteMapping(row.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      )
                    }
                  ] as any}
                  enablePagination
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
