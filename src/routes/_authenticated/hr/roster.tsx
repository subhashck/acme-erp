import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Plus, Edit2, ChevronDown, ChevronUp, Users, CalendarDays, Download, Clock, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import type { RosterRow, StaffRow, DepartmentRow, ShiftRow } from "../../../types";
import {
  today,
  currentYearMonth,
  isoDate,
  rollingWeek,
  isActiveToday,
  SHIFT_CONFIG,
  getShiftConfig
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
  });

type RosterInput = z.output<typeof rosterSchema>;

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
  const deptsQuery = useRpcQuery<DepartmentRow[]>(["departments"], () => client.departments.$get());
  const shiftsQuery = useRpcQuery<ShiftRow[]>(["masters-shifts"], () => client.masters.shifts.$get());
  const rostersQuery = useRpcQuery<RosterRow[]>(
    ["rosters", departmentId],
    () => client.hr.roster.$get(departmentId ? { query: { departmentId: departmentId.toString() } } : {})
  );

  const handleDropStaff = async (staffId: number, date: string, shiftId: number) => {
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
      alert("Failed to assign staff: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const departments = deptsQuery.data ?? [];
  const rosters = rostersQuery.data ?? [];
  const shifts = shiftsQuery.data ?? [];
  const todayStr = today();
  const week = rollingWeek(weekOffset * 7 - 1, 8);

  // Auto-select first department when data arrives
  React.useEffect(() => {
    if (!departmentId && departments.length > 0) {
      navigate({ to: "/hr/roster", search: { departmentId: departments[0].id } });
    }
  }, [departments, departmentId, navigate]);

  const selectedDept = departments.find((d) => d.id === departmentId);

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
      startDate: r.startDate,
      endDate: r.endDate,
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
    rosters: rosters.filter((r) => r.startDate <= date && r.endDate >= date)
  }));

  const deptStaff = (staffQuery.data ?? []).filter((s) => s.departmentId === departmentId);
  const filteredDeptStaff = deptStaff.filter((s) => s.name.toLowerCase().includes(staffSearch.toLowerCase()));

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
            <Button onClick={() => {
              if (showForm) {
                setEditingId(null);
                form.reset({ departmentId: departmentId || 0, shiftId: 0, startDate: todayStr, endDate: isoDate(7), notes: "" });
              }
              setShowForm((v) => !v);
            }}>
              {showForm ? <><span className="text-lg leading-none">×</span> Cancel</> : <><Plus size={16} /> Add Assignment</>}
            </Button>

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
                    <Field label="From" type="date" {...form.register("startDate")} />
                    {form.formState.errors.startDate && (
                      <p className="text-xs text-red-500 mt-1">{form.formState.errors.startDate.message}</p>
                    )}
                  </div>

                  <div>
                    <Field label="To" type="date" {...form.register("endDate")} />
                    {form.formState.errors.endDate && (
                      <p className="text-xs text-red-500 mt-1">{form.formState.errors.endDate.message}</p>
                    )}
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
                <div className="flex gap-2.5 flex-wrap">
                  {onDutyNow.map((r) => <OnDutyCard key={r.id} roster={r} />)}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground/60">
                  <Clock size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="m-0 text-sm">No staff assigned for today in {selectedDept?.name}</p>
                  <p className="mt-1 mb-0 text-xs text-amber-500">⚠ Coverage gap — add an assignment</p>
                </div>
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
                    `Monthly View - ${exportMonth}`
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
                  const isDraggable = viewMode === "monthly";

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
                      <div className="w-full sm:w-[240px]">
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
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData("staffId", member.staffId.toString());
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              className="flex items-center gap-2 p-2 rounded-xl border border-border bg-card hover:bg-muted hover:border-border transition-all duration-150 cursor-grab active:cursor-grabbing shadow-xs hover:shadow-sm min-w-[190px] shrink-0 group"
                            >
                              {/* Visual indicator for drag handle */}
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

                              {/* Initial circle */}
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-foreground shrink-0">
                                {member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground truncate m-0">{member.name}</p>
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
                  <div className="flex gap-2 min-w-[700px]">
                    {weeklyData.map(({ date, rosters: dayRosters }) => (
                      <DayColumn
                        key={date}
                        date={date}
                        rosters={dayRosters}
                        shifts={shifts}
                        onDropStaff={handleDropStaff}
                        onDeleteRoster={deleteRoster}
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
                    onDropShift={handleDropStaff}
                    onDeleteRoster={deleteRoster}
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
                              {["Staff", "Shift", "From", "To", "Notes", ""].map((h) => (
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
                                  <td className="px-3.5 py-2.5 text-muted-foreground">{r.startDate}</td>
                                  <td className="px-3.5 py-2.5 text-muted-foreground">{r.endDate}</td>
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
