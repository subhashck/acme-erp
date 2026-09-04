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
  AlertCircle 
} from "lucide-react";
import { useStore } from "@tanstack/react-store";
import { useMutation } from "@tanstack/react-query";
import { useRpcQuery, queryClient } from "../../lib/query";
import { client } from "../../services/rpc";
import { authClient } from "../../services/auth";
import { notificationsStore, notificationsActions } from "../../lib/notifications-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { cn } from "../../utils/cn";
import { PublishedMagazineSection } from "../../components/PublishedMagazineSection";
import * as React from "react";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard
});

function Dashboard() {
  const session = authClient.useSession();
  const userName = session.data?.user.name || "Administrator";
  const userRole = session.data?.user.role || "staff";
  const isAdminOrHr = userRole === "admin" || userRole === "hr";

  const { notifications } = useStore(notificationsStore);

  React.useEffect(() => {
    notificationsActions.fetchNotifications();
  }, []);

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
    }
  }>(["dashboard"], () => client.dashboard.$get(), {
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
    <div className="space-y-6 max-w-7xl mx-auto">
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
          <div className="shrink-0 flex gap-2">
            {isAdminOrHr ? (
              <>
                <Link to="/hr/staff-list">
                  <Button className="font-bold bg-teal-600 hover:bg-teal-500 text-white border-0 h-10 px-4">
                    View Staff
                  </Button>
                </Link>
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
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Recent Notifications Card */}
        <Card className="xl:col-span-2 shadow-sm border border-border bg-card">
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

        {/* Quick Action Console */}
        <Card className="xl:col-span-1 border border-border bg-card">
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
      </div>
    </div>
  );
}
