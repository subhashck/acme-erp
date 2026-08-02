import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Plus, Edit2, ChevronDown, ChevronUp, Users, CalendarDays, Download, Clock, Trash2, Calendar as CalendarIcon, Palmtree } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { format, addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Field } from "../../../components/Field";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { queryClient, useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { authClient } from "../../../services/auth";
import { exportRosterToExcel } from "../../../lib/roster-export";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Select } from "../../../ui/select";
import { Autocomplete } from "../../../ui/autocomplete";
import { MonthPicker } from "../../../components/ui/month-picker";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Calendar } from "../../../components/ui/calendar";
import { cn } from "../../../lib/utils";
import type { RosterRow, StaffRow, DepartmentRow, ShiftRow } from "../../../types";
import {
  today,
  currentYearMonth,
  isoDate,
  rollingWeek,
  isActiveToday,
  SHIFT_CONFIG,
  getShiftConfig,
  isStaffOffDay,
  type WeeklyOffDayRule,
  type ApprovedOffDayRequest,
} from "../../../lib/roster-utils";
import {
  ShiftBadge,
  OnDutyCard,
  DayColumn,
  MonthlyTableView
} from "../../../components/RosterComponents";

export const Route = createFileRoute("/_authenticated/hr/roster")({
  validateSearch: z.object({ departmentId: z.number().optional() }),
  component: Roster
});

// ── Zod schema ───────────────────────────────────────────────────────────────

const rosterSchema = z
  .object({
    staffId: z.coerce.number().positive("Select a staff member"),
    departmentId: z.coerce.number().positive("Select a department"),
    shiftId: z.coerce.number().positive("Select a shift"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
    notes: z.string().optional()
  })
  .refine((v) => v.endDate >= v.startDate, {
    path: ["endDate"],
    message: "End date must be on or after start date"
  })
  .refine(
    (v) => {
      const start = parseISO(v.startDate);
      const end = parseISO(v.endDate);
      return differenceInCalendarDays(end, start) <= 6;
    },
    {
      path: ["endDate"],
      message: "Assignment date range cannot exceed 7 days (1 week)"
    }
  );

type RosterInput = z.output<typeof rosterSchema>;

// ── DatePickerField Component ────────────────────────────────────────────────

function DatePickerField({
  label,
  value,
  onChange,
  error,
  disabledDate,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabledDate?: (date: Date) => boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selectedDate = value ? parseISO(value) : undefined;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal bg-background px-3 h-10 border-input",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            {value ? format(parseISO(value), "PPP") : <span>Pick date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onChange(format(date, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            disabled={disabledDate}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

function Roster() {
  const navigate = useNavigate();
  const { departmentId } = Route.useSearch();
  const session = authClient.useSession();

  const [showForm, setShowForm] = React.useState(false);
  const [showTable, setShowTable] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"daily" | "monthly">("daily");
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [exportMonth, setExportMonth] = React.useState<string>(currentYearMonth());
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [filterStaff, setFilterStaff] = React.useState("");
  const [filterShift, setFilterShift] = React.useState("");
  const [filterActive, setFilterActive] = React.useState(false);
  const [staffSearch, setStaffSearch] = React.useState("");

  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () => client.hr.staff.$get());
  const deptsQuery = useRpcQuery<DepartmentRow[]>(["masters-departments"], () => client.masters.departments.$get());
  const shiftsQuery = useRpcQuery<ShiftRow[]>(["masters-shifts"], () => client.masters.shifts.$get());
  const rostersQuery = useRpcQuery<RosterRow[]>(
    ["rosters", departmentId],
    () => client.hr.roster.$get(departmentId ? { query: { departmentId: departmentId.toString() } } : {})
  );

  const weeklyOffDaysQuery = useQuery({
    queryKey: ["weeklyOffDays", departmentId],
    queryFn: async () => {
      const url = departmentId
        ? `/api/hr/weekly-off-days?departmentId=${departmentId}`
        : `/api/hr/weekly-off-days`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return (await res.json()) as WeeklyOffDayRule[];
    },
  });

  const offDayRequestsQuery = useQuery({
    queryKey: ["offDayRequests", "Approved", departmentId],
    queryFn: async () => {
      const url = departmentId
        ? `/api/hr/off-day-requests?status=Approved&departmentId=${departmentId}`
        : `/api/hr/off-day-requests?status=Approved`;
      const res = await fetch(url);
      if (!res.ok) return [];
      return (await res.json()) as ApprovedOffDayRequest[];
    },
  });

  const checkIsOffDay = React.useCallback(
    (staffId: number, dateStr: string) => {
      return isStaffOffDay(
        staffId,
        dateStr,
        weeklyOffDaysQuery.data ?? [],
        offDayRequestsQuery.data ?? []
      );
    },
    [weeklyOffDaysQuery.data, offDayRequestsQuery.data]
  );

  const pendingDrops = React.useRef(new Set<string>());
  const handleDropStaff = async (staffId: number, date: string, shiftId: number) => {
    if (checkIsOffDay(staffId, date)) {
      toast.error(`Cannot assign shift: ${date} is a scheduled off-day for this staff member.`);
      return;
    }
    const key = `${staffId}-${date}-${shiftId}`;
    if (pendingDrops.current.has(key)) return;
    pendingDrops.current.add(key);
    try {
      const res = await client.hr.roster.$post({
        json: {
          staffId,
          departmentId: departmentId!,
          shiftId,
          startDate: date,
          endDate: date,
          notes: ""
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `HTTP error ${res.status}`);
      }
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
    } catch (err) {
      toast.error("Failed to assign staff: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      pendingDrops.current.delete(key);
    }
  };

  const nursingSupersQuery = useQuery<any[]>({
    queryKey: ["masters-nursing-supers"],
    queryFn: async () => {
      const res = await fetch("/api/masters/nursing-supers");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const allDepartments = deptsQuery.data ?? [];
  const currentStaff = staffQuery.data?.find((s) => s.email === session.data?.user.email);
  const isAdmin = session.data?.user.role === "admin";
  const isHr = session.data?.user.role === "hr" || currentStaff?.role === "hr";
  const isHrOrAdmin = isAdmin || isHr;

  const isNursingSuper = (nursingSupersQuery.data ?? []).some(
    (ns: any) => currentStaff?.staffId && ns.staffId === currentStaff.staffId && ns.active
  );

  const departments = (isAdmin || isHr || isNursingSuper)
    ? allDepartments
    : allDepartments.filter((d: any) => currentStaff?.departmentId && d.id === currentStaff.departmentId);

  const selectedDept = departments.find((d: any) => d.id === departmentId);
  const isDeptHead = currentStaff && selectedDept && selectedDept.headStaffId === currentStaff.staffId;
  const isSubHead = currentStaff && selectedDept && selectedDept.subheadStaffId === currentStaff.staffId;
  const isClinicalDept = (selectedDept as any)?.isClinical === true;
  const canAssign = isAdmin || isDeptHead || isSubHead || (isClinicalDept && isNursingSuper) || (!isClinicalDept && isHr);

  const rosters = rostersQuery.data ?? [];
  const shifts = shiftsQuery.data ?? [];
  const todayStr = today();
  const week = rollingWeek(weekOffset * 7 - 1, 8);

  // Auto-select department when data arrives
  React.useEffect(() => {
    if (departments.length > 0) {
      if (!departmentId) {
        navigate({ to: "/hr/roster", search: { departmentId: departments[0].id } });
      } else if (!isHrOrAdmin && departments.every(d => d.id !== departmentId)) {
        // If a non-admin user tries to access a department they aren't allowed to, redirect them
        navigate({ to: "/hr/roster", search: { departmentId: departments[0].id }, replace: true });
      }
    }
  }, [departments, departmentId, navigate, isHrOrAdmin]);

  // ── Form ──────────────────────────────────────────────────────────────────

  const form = useForm<z.input<typeof rosterSchema>, unknown, RosterInput>({
    resolver: zodResolver(rosterSchema),
    defaultValues: {
      departmentId: departmentId || 0,
      shiftId: 0,
      startDate: todayStr,
      endDate: isoDate(7)
    }
  });

  // Keep departmentId in sync when URL param changes
  React.useEffect(() => {
    if (departmentId) form.setValue("departmentId", departmentId);
  }, [departmentId]);

  const submit = form.handleSubmit(async (values) => {
    try {
      let res;
      if (editingId) {
        res = await (client.hr.roster as any)[":id"].$put({ param: { id: editingId.toString() }, json: values });
      } else {
        res = await client.hr.roster.$post({ json: values });
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `HTTP error ${res.status}`);
      }
      form.reset({ departmentId: departmentId || 0, shiftId: 0, startDate: todayStr, endDate: isoDate(7), notes: "" });
      setShowForm(false);
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
    } catch (err) {
      alert("Failed to save assignment: " + (err instanceof Error ? err.message : String(err)));
    }
  });

  const handleExport = () => {
    exportRosterToExcel({
      exportMonth,
      rosters,
      shifts,
      departmentName: selectedDept?.name,
      preparerName: session.data?.user.name
    });
  };

  const handleEdit = (r: RosterRow) => {
    setEditingId(r.id);
    form.reset({
      departmentId: r.departmentId,
      staffId: r.staffId,
      shiftId: r.shiftId,
      startDate: r.date,
      endDate: r.date,
      notes: r.notes || ""
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRoster = async (id: number) => {
    if (!window.confirm("Remove this assignment? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await client.hr.roster[":id"].$delete({ param: { id: id.toString() } });
      queryClient.invalidateQueries({ queryKey: ["rosters"] });
    } catch (err) {
      alert("Failed to delete: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDeletingId(null);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const onDutyNow = rosters.filter((r) => isActiveToday(r, todayStr) && !r.isOffDay);

  const filteredRosters = rosters.filter((r) => {
    if (filterStaff && !r.staffName.toLowerCase().includes(filterStaff.toLowerCase())) return false;
    if (filterShift && r.shift !== filterShift) return false;
    if (filterActive && !isActiveToday(r, todayStr)) return false;
    return true;
  });

  const weeklyData = week.map((date) => ({
    date,
    rosters: rosters.filter((r) => r.date === date)
  }));

  const deptStaff = (staffQuery.data ?? []).filter((s) => s.departmentId === departmentId);
  const filteredDeptStaff = deptStaff.filter((s) => s.name.toLowerCase().includes(staffSearch.toLowerCase()));

  // Build a dept-scoped map: staffId → unique initials label.
  // If two staff share the same initials, disambiguate with -1, -2, ... suffix.
  const initialsMap = React.useMemo(() => {
    const getInitials = (name: string) =>
      name.split(" ").map((n) => n[0] ?? "").join("").slice(0, 2).toUpperCase();
    const groups = new Map<string, number[]>();
    for (const s of deptStaff) {
      const init = getInitials(s.name);
      if (!groups.has(init)) groups.set(init, []);
      groups.get(init)!.push(s.staffId);
    }
    const map = new Map<number, string>();
    for (const [init, ids] of groups) {
      ids.sort((a, b) => a - b); // stable ordering by staffId
      if (ids.length === 1) {
        map.set(ids[0], init);
      } else {
        ids.forEach((id, i) => map.set(id, `${init}-${i + 1}`));
      }
    }
    return map;
  }, [deptStaff]);

  const staffOptions: [string, string][] = deptStaff.map((s) => [s.staffId.toString(), `${s.name} (${s.role})`] as [string, string]);

  const shiftOptions: [string, string][] = [
    // ["", "Select shift…"],
    ...shifts.map((s) => [s.id.toString(), s.name] as [string, string])
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <ModuleLayout
      title="Roster"
      description="Who's on duty today, what's coming up this week, and shift assignments at a glance."
      action={
        departmentId ? (
          <div className="flex gap-2 items-center flex-wrap">
            {canAssign && (
              <Button onClick={() => {
                if (showForm) {
                  setEditingId(null);
                  form.reset({ departmentId: departmentId || 0, shiftId: 0, startDate: todayStr, endDate: isoDate(7), notes: "" });
                }
                setShowForm((v) => !v);
              }}>
                {showForm ? <><span className="text-lg leading-none">×</span> Cancel</> : <><Plus size={16} /> Add Assignment</>}
              </Button>
            )}

            <div className="flex gap-1.5 items-center ml-2">
              <MonthPicker
                value={exportMonth}
                onChange={setExportMonth}
                className="w-[180px] h-10"
                placeholder="Export Month"
              />
              <Button variant="outline" onClick={handleExport}>
                <Download size={16} /> Export Excel
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {/* ── Department Pills ── */}
      <div className="flex gap-2 flex-wrap">
        {departments.map((dept) => {
          const active = departmentId === dept.id;
          return (
            <button
              key={dept.id}
              onClick={() => { navigate({ to: "/hr/roster", search: { departmentId: dept.id } }); setShowForm(false); }}
              className={`px-4 py-1.5 rounded-full border transition-all duration-155 outline-none cursor-pointer text-sm font-medium ${active
                ? "bg-primary text-primary-foreground font-bold border-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
            >
              {dept.name}
            </button>
          );
        })}
      </div>

      {!departmentId && (
        <Card>
          <CardContent className="py-10 px-6 text-center text-slate-500">
            <CalendarDays size={32} className="mx-auto mb-3 opacity-40" />
            <p>Loading departments…</p>
          </CardContent>
        </Card>
      )}

      {departmentId && (
        <div className="flex flex-col gap-6 mt-6">
          {/* ── Add Assignment Panel ── */}
          {showForm && (
            <Card className="border-2 border-primary/20 bg-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-primary" />
                  {editingId ? "Edit Assignment" : "New Assignment"} — {selectedDept?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
                  <input type="hidden" {...form.register("departmentId")} value={departmentId} />

                  <div>
                    <Autocomplete
                      label="Staff Member"
                      value={form.watch("staffId")?.toString() ?? ""}
                      onChange={(val) => form.setValue("staffId", val ? Number(val) : 0, { shouldValidate: true })}
                      options={staffOptions}
                      placeholder="Search staff by name or role…"
                      error={form.formState.errors.staffId?.message}
                    />
                  </div>

                  <div>
                    <Select label="Shift" {...form.register("shiftId")} options={shiftOptions} />
                    {form.formState.errors.shiftId && (
                      <p className="text-xs text-red-500 mt-1">{form.formState.errors.shiftId.message}</p>
                    )}
                  </div>

                  <div>
                    <Controller
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <DatePickerField
                          label="From Date"
                          value={field.value}
                          onChange={(newStart) => {
                            field.onChange(newStart);
                            const currentEnd = form.getValues("endDate");
                            if (!currentEnd || currentEnd < newStart) {
                              form.setValue("endDate", newStart, { shouldValidate: true });
                            } else {
                              const startD = parseISO(newStart);
                              const endD = parseISO(currentEnd);
                              if (differenceInCalendarDays(endD, startD) > 6) {
                                form.setValue("endDate", format(addDays(startD, 6), "yyyy-MM-dd"), { shouldValidate: true });
                              }
                            }
                          }}
                          error={form.formState.errors.startDate?.message}
                        />
                      )}
                    />
                  </div>

                  <div>
                    <Controller
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <DatePickerField
                          label="To Date (Max 7 Days)"
                          value={field.value}
                          onChange={field.onChange}
                          disabledDate={(d) => {
                            const startVal = form.watch("startDate");
                            if (!startVal) return false;
                            const startD = parseISO(startVal);
                            const maxEnd = addDays(startD, 6);
                            const dayStr = format(d, "yyyy-MM-dd");
                            return dayStr < startVal || dayStr > format(maxEnd, "yyyy-MM-dd");
                          }}
                          error={form.formState.errors.endDate?.message}
                        />
                      )}
                    />
                  </div>

                  <div className="col-span-full">
                    <Field label="Notes (optional)" {...form.register("notes")} placeholder="Any special instructions…" />
                  </div>

                  <div className="col-span-full">
                    <Button type="submit" className="w-full">
                      {editingId ? <Edit2 size={16} /> : <Plus size={16} />} {editingId ? "Update Assignment" : "Save Assignment"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── On Duty Right Now ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users size={18} className="text-primary" />
                  Staff on duty
                </span>
                <span
                  className={`text-sm font-bold rounded-full px-3 py-1 border ${onDutyNow.length > 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    }`}
                >
                  {onDutyNow.length} on duty
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {onDutyNow.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                  {onDutyNow.map((r) => (
                    <OnDutyCard key={r.id} roster={r} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground/60 py-6 text-sm m-0">
                  No staff members currently on duty for this department.
                </p>
              )}
            </CardContent>
          </Card>



          {/* ── Calendar / Roster View ── */}
          <Card className="overflow-hidden">
            <div className="flex border-b border-border bg-muted/20">
              <button
                onClick={() => setViewMode("daily")}
                className={`flex-1 py-3.5 text-sm font-semibold border-b-2 transition-all ${
                  viewMode === "daily" 
                    ? "border-primary text-primary bg-background shadow-[0_1px_0_0_hsl(var(--background))]" 
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                Daily View
              </button>
              <button
                onClick={() => setViewMode("monthly")}
                className={`flex-1 py-3.5 text-sm font-semibold border-b-2 transition-all ${
                  viewMode === "monthly" 
                    ? "border-primary text-primary bg-background shadow-[0_1px_0_0_hsl(var(--background))]" 
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                Monthly View
              </button>
            </div>
            
            <CardHeader className="pt-5">
              <CardTitle className="flex items-center justify-between flex-wrap gap-3">
                <span className="flex items-center gap-2">
                  <CalendarDays size={18} className="text-primary" />
                  {viewMode === "daily" ? (
                    weekOffset === 0 ? "Next 7 Days" : `Week of ${new Date(week[0] + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  ) : (
                    new Date(exportMonth + "-01T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" })
                  )} — {selectedDept?.name}
                </span>
                {viewMode === "daily" && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      onClick={() => setWeekOffset((v) => v - 1)}
                      className="px-3 py-1.5 h-8 text-xs"
                    >
                      ← Prev Week
                    </Button>
                    {weekOffset !== 0 && (
                      <Button
                        variant="ghost"
                        onClick={() => setWeekOffset(0)}
                        className="px-3 py-1.5 h-8 text-xs text-primary"
                      >
                        Today
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setWeekOffset((v) => v + 1)}
                      className="px-3 py-1.5 h-8 text-xs"
                    >
                      Next Week →
                    </Button>
                  </div>
                )}
                {viewMode === "monthly" && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const [y, m] = exportMonth.split("-").map(Number);
                        const prev = new Date(Date.UTC(y, m - 2, 1));
                        setExportMonth(`${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`);
                      }}
                      className="px-3 py-1.5 h-8 text-xs"
                    >
                      ← Prev
                    </Button>
                    {exportMonth !== currentYearMonth() && (
                      <Button
                        variant="ghost"
                        onClick={() => setExportMonth(currentYearMonth())}
                        className="px-3 py-1.5 h-8 text-xs text-primary"
                      >
                        This Month
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => {
                        const [y, m] = exportMonth.split("-").map(Number);
                        const next = new Date(Date.UTC(y, m, 1));
                        setExportMonth(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`);
                      }}
                      className="px-3 py-1.5 h-8 text-xs"
                    >
                      Next →
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Shift legend */}
              <div className="flex gap-2 flex-wrap mb-3.5">
                {viewMode === "monthly" && <span className="text-xs text-muted-foreground mr-1 self-center">Drag shift to assign:</span>}
                {shifts.filter(s => s.active).map((shiftData) => {
                  const name = shiftData.name;
                  const cfg = getShiftConfig(name);
                  const Icon = cfg.Icon;
                  const isDraggable = viewMode === "monthly" && canAssign;

                  return (
                    <span
                      key={name}
                      draggable={isDraggable}
                      onDragStart={
                        isDraggable
                          ? (e) => {
                            e.dataTransfer.setData("shiftId", shiftData.id.toString());
                            e.dataTransfer.effectAllowed = "copy";
                          }
                          : undefined
                      }
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 border ${isDraggable ? "cursor-grab active:cursor-grabbing hover:opacity-80 transition-opacity" : ""
                        } ${cfg.textColorClass} ${cfg.bgClass} ${cfg.borderClass}`}
                    >
                      <Icon size={11} /> {name}
                    </span>
                  );
                })}
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 bg-amber-500/10 border border-dashed border-amber-500/30 rounded-full px-2.5 py-0.5 ml-auto">
                  ⚠ No cover
                </span>
              </div>

              {viewMode === "daily" ? (
                <>
                  {/* ── Staff Pool (Horizontal List) ── */}
                  <div className="border border-border rounded-xl mb-4 bg-muted/10">
                    <div className="p-3 border-b border-border flex flex-row items-center justify-between flex-wrap gap-4">
                      <div>
                        <h3 className="text-sm font-semibold flex items-center gap-2 m-0">
                          <Users size={16} className="text-primary" />
                          Staff Pool
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 mb-0">Drag staff from here to assign them to shifts on the calendar below</p>
                      </div>
                      <div className="w-full sm:w-60">
                        <input
                          type="text"
                          placeholder="Search staff..."
                          value={staffSearch}
                          onChange={(e) => setStaffSearch(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-border outline-none bg-background text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                        />
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                        {filteredDeptStaff.length > 0 ? (
                          filteredDeptStaff.map((member) => (
                            <div
                              key={member.staffId}
                              draggable={canAssign}
                              onDragStart={(e) => {
                                if (!canAssign) return;
                                e.dataTransfer.setData("staffId", member.staffId.toString());
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              className={`flex items-center gap-2 p-2 rounded-xl border border-border bg-card transition-all duration-150 min-w-[190px] shrink-0 group ${
                                canAssign ? "hover:bg-muted hover:border-border cursor-grab active:cursor-grabbing shadow-xs hover:shadow-sm" : "opacity-75"
                              }`}
                            >
                              {/* Visual indicator for drag handle */}
                              {canAssign && (
                                <div className="text-muted-foreground/60 group-hover:text-muted-foreground transition-colors shrink-0">
                                  <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="stroke-current">
                                    <circle cx="2" cy="2" r="1" fill="currentColor" />
                                    <circle cx="2" cy="6" r="1" fill="currentColor" />
                                    <circle cx="2" cy="10" r="1" fill="currentColor" />
                                    <circle cx="6" cy="2" r="1" fill="currentColor" />
                                    <circle cx="6" cy="6" r="1" fill="currentColor" />
                                    <circle cx="6" cy="10" r="1" fill="currentColor" />
                                  </svg>
                                </div>
                              )}

                              {/* Initial circle */}
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-foreground shrink-0">
                                {initialsMap?.get(member.staffId) ?? member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <p className="text-xs font-semibold text-foreground truncate m-0">{member.name}</p>
                                  {checkIsOffDay(member.staffId, todayStr) && (
                                    <span className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-md px-1 py-0.2 shrink-0">
                                      OFF
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground truncate m-0">{member.role}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-xs text-muted-foreground/60 py-2 w-full m-0">No staff found</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                  <div className="flex gap-2 min-w-175">
                    {weeklyData.map(({ date, rosters: dayRosters }) => (
                      <DayColumn
                        key={date}
                        date={date}
                        rosters={dayRosters}
                        shifts={shifts}
                        onDropStaff={handleDropStaff}
                        onDeleteRoster={deleteRoster}
                        canAssign={canAssign}
                        initialsMap={initialsMap}
                        offStaffList={deptStaff.filter((s) => checkIsOffDay(s.staffId, date))}
                      />
                    ))}
                  </div>
                  </div>
                </>
              ) : (
                <div className="mt-2">
                  <MonthlyTableView
                    exportMonth={exportMonth}
                    rosters={rosters}
                    shifts={shifts}
                    allStaff={deptStaff}
                    isOffDay={checkIsOffDay}
                    onDropShift={handleDropStaff}
                    onDeleteRoster={deleteRoster}
                    canAssign={canAssign}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── All Assignments (collapsible) ── */}
          <Card>
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setShowTable((v) => !v)}
            >
              <CardTitle className="flex items-center justify-between">
                <span>All Assignments {rosters.length > 0 && `(${filteredRosters.length === rosters.length ? rosters.length : `${filteredRosters.length}/${rosters.length}`})`}</span>
                {showTable ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </CardTitle>
            </CardHeader>

            {showTable && (
              <CardContent className="p-0">
                {rosters.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-sm">
                    No assignments yet for {selectedDept?.name}.
                  </p>
                ) : (
                  <>
                    {/* Filters Row */}
                    <div className="flex gap-3 p-3.5 bg-muted/30 border-b border-border flex-wrap items-center">
                      <input
                        type="text"
                        placeholder="Search staff..."
                        value={filterStaff}
                        onChange={(e) => setFilterStaff(e.target.value)}
                        className="px-3 py-1.5 rounded-md border border-border text-sm outline-none w-[200px] bg-background text-foreground"
                      />
                      <select
                        value={filterShift}
                        onChange={(e) => setFilterShift(e.target.value)}
                        className="px-3 py-1.5 rounded-md border border-border text-sm outline-none bg-background text-foreground min-w-[140px]"
                      >
                        <option value="">All Shifts</option>
                        {shifts.map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none text-muted-foreground font-medium">
                        <input
                          type="checkbox"
                          checked={filterActive}
                          onChange={(e) => setFilterActive(e.target.checked)}
                          className="cursor-pointer"
                        />
                        Active Today Only
                      </label>
                      {(filterStaff || filterShift || filterActive) && (
                        <button
                          onClick={() => {
                            setFilterStaff("");
                            setFilterShift("");
                            setFilterActive(false);
                          }}
                          className="bg-transparent border-0 text-primary text-xs font-semibold cursor-pointer p-0 hover:text-primary/80"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>

                    {filteredRosters.length === 0 ? (
                      <p className="text-center text-slate-400 py-8 text-sm">
                        No assignments matched your search filters.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-muted/50 text-left">
                              {["Staff", "Shift", "Date", "Notes", ""].map((h) => (
                                <th key={h} className="px-3.5 py-2.5 font-semibold text-muted-foreground text-xs">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRosters.map((r) => {
                              const isToday = isActiveToday(r, todayStr);
                              return (
                                <tr
                                  key={r.id}
                                  className={`border-b border-border transition-colors duration-100 ${isToday ? "bg-primary/5 text-foreground" : "bg-card text-foreground"
                                    }`}
                                >
                                  <td className="px-3.5 py-2.5 font-semibold">
                                    {r.staffName}
                                    {isToday && (
                                      <span className="ml-1.5 text-[10px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                                        ON DUTY
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3.5 py-2.5">
                                    <ShiftBadge shift={r.shift} />
                                  </td>
                                  <td className="px-3.5 py-2.5 text-muted-foreground">{r.date}</td>
                                  <td className="px-3.5 py-2.5 text-muted-foreground/60 italic">{r.notes || "—"}</td>
                                  <td className="px-3.5 py-2.5 flex gap-1.5">
                                    <button
                                      onClick={() => handleEdit(r)}
                                      title="Edit assignment"
                                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-card text-primary cursor-pointer hover:bg-muted transition-all duration-155"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => deleteRoster(r.id)}
                                      disabled={deletingId === r.id}
                                      title="Remove assignment"
                                      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive cursor-pointer hover:bg-destructive/20 transition-all duration-150 ${deletingId === r.id ? "opacity-50" : "opacity-100"
                                        }`}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </ModuleLayout>
  );
}
