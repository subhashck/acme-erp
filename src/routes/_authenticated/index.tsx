import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Users, 
  Landmark, 
  ClipboardCheck, 
  CalendarClock, 
  ArrowRight, 
  Plus, 
  Settings, 
  ShieldCheck, 
  Activity, 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Receipt,
  AlertCircle,
  Check,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useStore } from "@tanstack/react-store";
import { useMutation } from "@tanstack/react-query";
import { useRpcQuery, queryClient } from "../../lib/query";
import { client } from "../../services/rpc";
import { notificationsStore, notificationsActions } from "../../lib/notifications-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { Switch } from "../../components/ui/switch";
import { cn } from "../../utils/cn";
import { PublishedMagazineSection } from "../../components/PublishedMagazineSection";
import { getShiftConfig } from "../../lib/roster-utils";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import * as React from "react";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard
});

function Dashboard() {
  const { session } = Route.useRouteContext() as { session?: any };
  const userName = session.data?.user.name || "Administrator";
  const userRole = session.data?.user.role || "staff";
  const isAdminOrHr = userRole === "admin" || userRole === "hr";
  const preferenceKeyPrefix = `dashboard:${session.data?.user.id || userRole}`;
  const [showRecentNotifications, setShowRecentNotifications] = React.useState(() =>
    !isAdminOrHr || (typeof window !== "undefined" && window.localStorage.getItem(`${preferenceKeyPrefix}:notifications`) === "true")
  );
  const [showQuickActions, setShowQuickActions] = React.useState(() =>
    !isAdminOrHr || (typeof window !== "undefined" && window.localStorage.getItem(`${preferenceKeyPrefix}:quick-actions`) === "true")
  );
  const [scheduleDayOffset, setScheduleDayOffset] = React.useState(0);

  const addUtcDays = React.useCallback((date: string, amount: number) => {
    const value = new Date(`${date}T00:00:00Z`);
    value.setUTCDate(value.getUTCDate() + amount);
    return value.toISOString().slice(0, 10);
  }, []);
  const todayDate = new Date().toISOString().slice(0, 10);
  const scheduleAnchorDate = addUtcDays(todayDate, scheduleDayOffset);

  const { notifications } = useStore(notificationsStore);

  React.useEffect(() => {
    if (showRecentNotifications) {
      notificationsActions.fetchNotifications();
    }
  }, [showRecentNotifications]);

  const updateDashboardPreference = (
    preference: "notifications" | "quick-actions",
    visible: boolean
  ) => {
    window.localStorage.setItem(`${preferenceKeyPrefix}:${preference}`, String(visible));
    if (preference === "notifications") {
      setShowRecentNotifications(visible);
    } else {
      setShowQuickActions(visible);
    }
  };

  const { data, isLoading } = useRpcQuery<{
    metrics: {
      staff: number;
      departments: number;
      pendingLeaves: number;
      attendanceToday: number;
      shiftsCount: number;
      onLeaveOrOffToday: number;
      deptOnLeaveOrOffToday: number;
      userDepartmentName: string | null;
      userDepartmentStaffCount: number;
      isNursingSuper: boolean;
      clinicalStaffCount: number;
      clinicalDeptCount: number;
      clinicalOnLeaveOrOffToday: number;
    };
    workforceSchedule: Array<{
      departmentId: number | null;
      departmentName: string;
      days: Array<{
        date: string;
        entries: Array<{
          staffId: number;
          employeeCode: string;
          staffName: string;
          status: "leave" | "off" | "roster";
          label: string;
          startTime?: string;
          endTime?: string;
          isPreviousDayCarryOver?: boolean;
        }>;
      }>;
    }>;
  }>(["dashboard", scheduleAnchorDate], () => client.dashboard.$get({ query: { scheduleDate: scheduleAnchorDate } }), {
    enabled: !!session.data
  });

  const punchStatusQuery = useRpcQuery<{ status: string; checkInTime?: string; checkOutTime?: string }>(
    ["my-punch-status"],
    // @ts-ignore - this endpoint exists but might not be in the generated types yet
    () => client.hr.attendance["my-punch-status"].$get(),
    { enabled: !!session.data && !isAdminOrHr }
  );

  const punchMutation = useMutation({
    // @ts-ignore
    mutationFn: async () => {
      // @ts-ignore
      const res = await client.hr.attendance.punch.$post({});
      if (!res.ok) {
        const err = await res.json().catch(() => null) as any;
        throw new Error(err?.error || "Failed to punch attendance");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-punch-status"] });
    },
    onError: (err) => {
      alert(err.message);
    }
  });

  const deptName = data?.metrics.userDepartmentName;
  const isNursingSuper = Boolean(data?.metrics.isNursingSuper);
  const [workforceDepartments, setWorkforceDepartments] = React.useState<string[]>([]);
  const filteredWorkforceSchedule = React.useMemo(
    () => (data?.workforceSchedule || []).filter((department) =>
      workforceDepartments.length === 0 || workforceDepartments.includes(String(department.departmentId ?? "unassigned"))
    ),
    [data?.workforceSchedule, workforceDepartments]
  );
  const toggleWorkforceDepartment = (departmentId: string) => {
    setWorkforceDepartments((current) =>
      current.includes(departmentId)
        ? current.filter((id) => id !== departmentId)
        : [...current, departmentId]
    );
  };

  const metrics = isNursingSuper
    ? [
        {
          label: "Clinical Staff",
          value: data?.metrics.clinicalStaffCount ?? 0,
          description: "Active personnel across clinical departments",
          icon: Users,
          colorClass: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/30"
        },
        {
          label: "Clinical Departments",
          value: data?.metrics.clinicalDeptCount ?? 0,
          description: "Operational clinical hospital divisions",
          icon: Landmark,
          colorClass: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/30"
        },
        {
          label: "Employees on Leave / Off Today",
          value: data?.metrics.clinicalOnLeaveOrOffToday ?? 0,
          description: "Clinical personnel on leave or scheduled off today",
          icon: CalendarClock,
          colorClass: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30"
        }
      ]
    : isAdminOrHr
    ? [
        {
          label: "Total Employees",
          value: data?.metrics.staff ?? 0,
          description: "Registered medical & support staff",
          icon: Users,
          colorClass: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/30"
        },
        {
          label: "Active Departments",
          value: data?.metrics.departments ?? 0,
          description: "Operational hospital divisions",
          icon: Landmark,
          colorClass: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/30"
        },
        {
          label: "Employees on Leave / Off Today",
          value: data?.metrics.onLeaveOrOffToday ?? 0,
          description: "Hospital-wide approved leave or scheduled off",
          icon: CalendarClock,
          colorClass: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30"
        }
      ]
    : [
        ...(deptName
          ? [
              {
                label: `${deptName} Department`,
                value: data?.metrics.userDepartmentStaffCount ?? 0,
                description: `Total active personnel in ${deptName}`,
                icon: Users,
                colorClass: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/30"
              }
            ]
          : []),
        {
          label: "Employees on Leave / Off Today",
          value: data?.metrics.deptOnLeaveOrOffToday ?? 0,
          description: deptName
            ? `Colleagues on leave or scheduled off in ${deptName}`
            : "Department colleagues on leave or scheduled off today",
          icon: CalendarClock,
          colorClass: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30"
        }
      ];

  return (
    <div className="flex max-w-7xl flex-col gap-6 mx-auto">
      {/* Welcome Greeting Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 md:p-8 text-white shadow-md border border-slate-800 dark:border-slate-800/80">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-80 h-80 rounded-full bg-blue-500/5 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-350 border border-teal-500/30 uppercase tracking-wider">
              <Activity size={12} className="animate-pulse" /> Live Clinic Console
            </span>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight mt-1">
              Welcome back, {userName}!
            </h2>
            <p className="text-xs md:text-sm text-slate-350 leading-relaxed max-w-xl">
              You are logged in with <span className="font-bold text-teal-400 capitalize">{isNursingSuper ? "Nursing Superintendent" : userRole}</span> privilege levels. {isAdminOrHr ? "Monitor clinical staffing compliance, handle statutory payroll overrides, and evaluate roster schedules below." : isNursingSuper ? "Monitor clinical department staffing compliance, shift rosters, and personnel coverage below." : "View your latest notifications, check your personal payslips, and request time off."}
            </p>
          </div>
          <div className="shrink-0 flex flex-wrap items-center justify-end gap-2">
            {isAdminOrHr ? (
              <>
                <Link to="/hr/staff-list">
                  <Button className="font-bold bg-teal-600 hover:bg-teal-500 text-white border-0 h-10 px-4">
                    View Staff
                  </Button>
                </Link>
                <label className="inline-flex h-10 items-center gap-2 rounded-md border border-white/20 bg-white/5 px-3 text-xs font-semibold text-slate-200">
                  Notifications
                  <Switch
                    checked={showRecentNotifications}
                    onCheckedChange={(checked) => updateDashboardPreference("notifications", checked)}
                    aria-label="Show recent notifications"
                  />
                </label>
                <label className="inline-flex h-10 items-center gap-2 rounded-md border border-white/20 bg-white/5 px-3 text-xs font-semibold text-slate-200">
                  Quick Actions
                  <Switch
                    checked={showQuickActions}
                    onCheckedChange={(checked) => updateDashboardPreference("quick-actions", checked)}
                    aria-label="Show quick action console"
                  />
                </label>
                <Link to="/hr/roster">
                  <Button variant="outline" className="font-bold border-white/20 text-white bg-white/5 hover:bg-white/10 h-10 px-4">
                    Shift Roster
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {!punchStatusQuery.isLoading && (
                  <Button
                    onClick={() => punchMutation.mutate()}
                    disabled={punchMutation.isPending || punchStatusQuery.data?.status === "punched_out"}
                    className={cn(
                      "font-bold h-10 px-4",
                      punchStatusQuery.data?.status === "punched_in"
                        ? "bg-amber-600 hover:bg-amber-500 text-white border-0"
                        : punchStatusQuery.data?.status === "punched_out"
                        ? "bg-slate-600 text-slate-300 border-0 cursor-not-allowed"
                        : "bg-teal-600 hover:bg-teal-500 text-white border-0"
                    )}
                  >
                    {punchMutation.isPending
                      ? "Processing..."
                      : punchStatusQuery.data?.status === "punched_in"
                      ? "Punch Out"
                      : punchStatusQuery.data?.status === "punched_out"
                      ? "Shift Ended"
                      : "Punch In"}
                  </Button>
                )}
                <Link to="/hr/leaves">
                  <Button className="font-bold bg-teal-600 hover:bg-teal-500 text-white border-0 h-10 px-4">
                    Request Leave
                  </Button>
                </Link>
                <Link to="/hr/payroll">
                  <Button variant="outline" className="font-bold border-white/20 text-white bg-white/5 hover:bg-white/10 h-10 px-4">
                    My Payslips
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {isAdminOrHr && (
        <Card className="order-last overflow-hidden border border-border bg-card shadow-sm">
          <CardHeader className="flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="text-teal-600 dark:text-teal-400" size={18} />
                Three-Day Department Workforce Schedule
              </CardTitle>
              <CardDescription>
                Approved leave, scheduled off days, and assigned roster shifts for the displayed three-day period.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScheduleDayOffset((current) => current - 1)}
                  aria-label="View previous day"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  D-1
                </Button>
                {scheduleDayOffset !== 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setScheduleDayOffset(0)}>
                    Today
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScheduleDayOffset((current) => current + 1)}
                  aria-label="View next day"
                >
                  D+1
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between bg-background font-normal sm:w-72">
                  <span className="truncate">
                    {workforceDepartments.length === 0
                      ? "All Departments"
                      : `${workforceDepartments.length} department${workforceDepartments.length === 1 ? "" : "s"} selected`}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2">
                <button
                  type="button"
                  onClick={() => setWorkforceDepartments([])}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded border border-primary">
                    {workforceDepartments.length === 0 && <Check className="h-3 w-3" />}
                  </span>
                  <span className="font-medium">All Departments</span>
                </button>
                <div className="my-1 border-t" />
                <div className="max-h-64 overflow-y-auto">
                  {(data?.workforceSchedule || []).map((department) => {
                    const departmentId = String(department.departmentId ?? "unassigned");
                    const selected = workforceDepartments.includes(departmentId);
                    return (
                      <button
                        key={departmentId}
                        type="button"
                        onClick={() => toggleWorkforceDepartment(departmentId)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className={cn("flex h-4 w-4 items-center justify-center rounded border", selected ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                          {selected && <Check className="h-3 w-3" />}
                        </span>
                        <span className="truncate">{department.departmentName}</span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading workforce schedule...</div>
            ) : !filteredWorkforceSchedule.length ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No leave, off-day, or roster assignments found for this department.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs sm:min-w-[800px]">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="sticky left-0 z-20 hidden w-52 min-w-52 border-r bg-muted p-3 text-left font-bold sm:table-cell">Department</th>
                      {filteredWorkforceSchedule[0]?.days.map((day, dayIndex) => {
                        const isToday = day.date === todayDate;
                        const date = new Date(`${day.date}T00:00:00Z`);
                        return (
                          <th key={day.date} className={cn("min-w-44 border-r p-3 text-left", dayIndex !== 1 && "hidden sm:table-cell", isToday && "bg-teal-50 dark:bg-teal-950/30")}>
                            <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                              {date.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })}
                            </span>
                            <span className={cn("font-bold", isToday && "text-teal-700 dark:text-teal-300")}>
                              {date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}
                              {isToday && " · Today"}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredWorkforceSchedule.map((department) => (
                      <tr key={department.departmentId ?? "unassigned"} className="align-top">
                        <th className="sticky left-0 z-10 hidden border-r bg-card p-3 text-left font-bold shadow-[2px_0_4px_-3px_rgba(0,0,0,0.3)] sm:table-cell">
                          {department.departmentName}
                        </th>
                        {department.days.map((day, dayIndex) => {
                          const isToday = day.date === todayDate;
                          return (
                            <td key={day.date} className={cn("border-r p-2", dayIndex !== 1 && "hidden sm:table-cell", isToday && "bg-teal-50/40 dark:bg-teal-950/10")}>
                              <div className="mb-2 border-b pb-2 font-bold text-foreground sm:hidden">
                                {department.departmentName}
                              </div>
                              {day.entries.length === 0 ? (
                                <span className="block py-2 text-center text-muted-foreground/50">—</span>
                              ) : (
                                <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                                  {day.entries.map((entry) => {
                                    const shiftConfig = entry.status === "roster" ? getShiftConfig(entry.label) : null;
                                    const ShiftIcon = shiftConfig?.Icon;
                                    return (
                                      <div
                                        key={`${entry.staffId}-${entry.isPreviousDayCarryOver ? "carry" : "primary"}`}
                                        className={cn(
                                          "rounded-md border p-2 shadow-xs",
                                          entry.status !== "roster" && "bg-background",
                                          shiftConfig?.bgClass,
                                          shiftConfig?.borderClass,
                                          shiftConfig?.textColorClass
                                        )}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0">
                                            <p className={cn("truncate font-semibold", entry.status !== "roster" && "text-foreground")} title={entry.staffName}>{entry.staffName}</p>
                                            <p className={cn("font-mono text-[9px]", entry.status === "roster" ? "opacity-70" : "text-muted-foreground")}>{entry.employeeCode}</p>
                                          </div>
                                          <span className={cn(
                                            "shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase",
                                            entry.status === "leave" && "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
                                            entry.status === "off" && "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
                                            entry.status === "roster" && shiftConfig?.borderClass
                                          )}>
                                            {entry.isPreviousDayCarryOver ? "Previous night" : entry.status}
                                          </span>
                                        </div>
                                        <p className={cn("mt-1 flex items-center gap-1 truncate text-[10px] font-semibold", entry.status !== "roster" && "text-muted-foreground")} title={entry.label}>
                                          {ShiftIcon && <ShiftIcon size={11} className={cn("shrink-0", shiftConfig?.colorClass)} />}
                                          <span>{entry.label}</span>
                                          {entry.isPreviousDayCarryOver && entry.endTime
                                            ? <span className="font-normal opacity-75">· until {entry.endTime.slice(0, 5)}</span>
                                            : entry.startTime && entry.endTime
                                              ? <span className="font-normal opacity-75">· {entry.startTime.slice(0, 5)}-{entry.endTime.slice(0, 5)}</span>
                                              : null}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap gap-3 border-t bg-muted/20 px-4 py-3 text-[10px] text-muted-foreground">
              <span><strong className="text-rose-700 dark:text-rose-300">LEAVE</strong> approved leave</span>
              <span><strong className="text-amber-700 dark:text-amber-300">OFF</strong> weekly, approved, attendance, or rostered off</span>
              <span><strong className="text-slate-700 dark:text-slate-300">ROSTER</strong> assigned shift using roster shift colors</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latest Published Magazine Issues */}
      <PublishedMagazineSection variant="dashboard" limit={3} />

      {/* Primary KPIs Metrics Grid */}
      <div
        className={cn(
          "grid gap-4",
          metrics.length === 3
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : metrics.length === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1"
        )}
      >
          {metrics.map((metric) => (
            <Card key={metric.label} className="bg-card hover:shadow-md transition-all duration-300 border border-border">
              <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{metric.label}</p>
                    <p className="text-2xl font-black text-foreground mt-1">
                      {isLoading ? "..." : metric.value}
                    </p>
                  </div>
                  <div className={cn("grid size-11 place-items-center rounded-xl border shrink-0", metric.colorClass)}>
                    <metric.icon size={22} />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground font-medium border-t border-border/50 pt-2.5">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

      {/* Charts & Shortcuts Panel */}
      {(showRecentNotifications || showQuickActions) && (
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Recent Notifications Card */}
        {showRecentNotifications && (
        <Card className={cn("shadow-sm border border-border bg-card", showQuickActions ? "xl:col-span-2" : "xl:col-span-3")}>
            <CardHeader className="border-b border-border/50 pb-4 flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="text-teal-600 dark:text-teal-400 animate-bounce" size={18} />
                  Recent Notifications
                </CardTitle>
                <CardDescription>Stay updated with your latest hospital alerts and requests.</CardDescription>
              </div>
              {notifications.some(n => !n.read) && (
                <Button 
                  variant="ghost" 
                  size="default" 
                  className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => notificationsActions.clearAll()}
                >
                  Mark all read
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm font-semibold">No notifications yet</p>
                  <p className="text-xs">We'll alert you when something updates.</p>
                </div>
              ) : (
                <div className="divide-y divide-border max-h-[350px] overflow-y-auto">
                  {notifications.slice(0, 5).map((notif) => (
                    <div 
                      key={notif.id} 
                      className={cn(
                        "p-4 flex items-start gap-3 transition-colors",
                        !notif.read ? "bg-teal-500/5" : "hover:bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "grid size-8 place-items-center rounded-lg border shrink-0 mt-0.5",
                        notif.type === "success" && "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30",
                        notif.type === "warning" && "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30",
                        notif.type === "error" && "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30",
                        notif.type === "info" && "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30"
                      )}>
                        {notif.type === "success" && <CheckCircle size={15} />}
                        {notif.type === "warning" && <AlertTriangle size={15} />}
                        {notif.type === "error" && <AlertCircle size={15} />}
                        {notif.type === "info" && <Info size={15} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("text-xs font-semibold truncate", !notif.read ? "text-foreground" : "text-muted-foreground")}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(notif.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Action Console */}
        {showQuickActions && (
        <Card className={cn("border border-border bg-card", showRecentNotifications ? "xl:col-span-1" : "xl:col-span-3")}>
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="text-slate-600 dark:text-slate-400" size={18} />
              Quick Action Console
            </CardTitle>
            <CardDescription>Shortcuts to commonly used dashboard actions.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {isAdminOrHr ? (
                <>
                  <Link to="/hr/add-staff" className="block">
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/65 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-100 dark:border-teal-900/30">
                          <Plus size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Register Staff Member</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Enroll new personnel</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>

                  <Link to="/hr/attendance" className="block">
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/65 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30">
                          <ClipboardCheck size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Log Attendance punched</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Biometrics and daily registers</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>

                  {userRole === "admin" && (
                    <>
                      <Link to="/admin/localization" className="block">
                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/65 transition-colors cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/30">
                              <Settings size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">ERP Localization Preferences</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Currency & language settings</p>
                            </div>
                          </div>
                          <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Link>

                      <Link to="/admin/users" className="block">
                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/65 transition-colors cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
                              <ShieldCheck size={16} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">User Credentials Management</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">Role definitions & access locks</p>
                            </div>
                          </div>
                          <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Link>
                    </>
                  )}
                </>
              ) : isNursingSuper ? (
                <>
                  <Link to="/hr/roster" className="block">
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/65 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-100 dark:border-teal-900/30">
                          <CalendarClock size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Clinical Shift Rosters</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Manage nursing shifts & duties</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>

                  <Link to="/hr/attendance" className="block">
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/65 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30">
                          <ClipboardCheck size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Clinical Attendance Logs</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Track daily shift attendance</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>

                  <Link to="/hr/leaves" className="block">
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/65 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/30">
                          <CheckCircle size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Review Leave Requests</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Evaluate nursing leaves</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/hr/leaves" className="block">
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/65 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-950/20 text-teal-650 dark:text-teal-400 flex items-center justify-center border border-teal-100 dark:border-teal-900/30">
                          <CalendarClock size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">Request Time Off</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Submit leave application</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>

                  <Link to="/hr/payroll" className="block">
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/65 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/30">
                          <Receipt size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">View My Payslips</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">Check salary structures & history</p>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        )}
      </div>
      )}
    </div>
  );
}
