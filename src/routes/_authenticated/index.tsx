import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, Landmark, ClipboardCheck, CalendarClock, ArrowRight, Plus, Settings, ShieldCheck, Activity } from "lucide-react";
import { useRpcQuery } from "../../lib/query";
import { client } from "../../services/rpc";
import { authClient } from "../../services/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../ui/card";
import { Button } from "../../ui/button";
import { cn } from "../../utils/cn";

export const Route = createFileRoute("/_authenticated/")({
  component: Dashboard
});

function Dashboard() {
  const session = authClient.useSession();
  const userName = session.data?.user.name || "Administrator";
  const userRole = session.data?.user.role || "staff";

  const { data, isLoading } = useRpcQuery<{
    metrics: {
      staff: number;
      departments: number;
      pendingLeaves: number;
      attendanceToday: number;
      shiftsCount: number;
    }
  }>(["dashboard"], () => client.dashboard.$get());

  const staffCount = data?.metrics.staff ?? 0;
  const attendanceToday = data?.metrics.attendanceToday ?? 0;
  const attendancePercent = staffCount > 0 ? Math.round((attendanceToday / staffCount) * 100) : 0;

  const metrics = [
    {
      label: "Total Employees",
      value: staffCount,
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
      label: "Attendance Today",
      value: `${attendanceToday} (${attendancePercent}%)`,
      description: "Punch compliance for today",
      icon: ClipboardCheck,
      colorClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30"
    },
    {
      label: "Pending Leaves",
      value: data?.metrics.pendingLeaves ?? 0,
      description: "Leave requests awaiting decision",
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
              You are logged in with <span className="font-bold text-teal-400 capitalize">{userRole}</span> privilege levels. Monitor clinical staffing compliance, handle statutory payroll overrides, and evaluate roster schedules below.
            </p>
          </div>
          <div className="shrink-0 flex gap-2">
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
          </div>
        </div>
      </div>

      {/* Primary KPIs Metrics Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
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
        {/* Weekly Attendance Flow Chart Card */}
        <Card className="xl:col-span-2 shadow-sm border border-border bg-card">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="text-teal-600 dark:text-teal-400 animate-pulse" size={18} />
              Clinical Attendance Ratios
            </CardTitle>
            <CardDescription>Monitored check-in ratios plotted across active hospital departments.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Custom SVG Line Chart */}
            <div className="w-full h-[220px] relative">
              <svg className="w-full h-full" viewBox="0 0 600 220" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Dotted Grid Lines */}
                <line x1="50" y1="20" x2="570" y2="20" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3,3" />
                <line x1="50" y1="70" x2="570" y2="70" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3,3" />
                <line x1="50" y1="120" x2="570" y2="120" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3,3" />
                <line x1="50" y1="170" x2="570" y2="170" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3,3" />
                
                {/* Chart Path Shadow Fill */}
                <path
                  d="M 50 180 Q 130 110, 210 130 T 370 60 T 530 80 T 570 50 L 570 170 L 50 170 Z"
                  fill="url(#chartGrad)"
                />
                {/* Curved Line Path */}
                <path
                  d="M 50 180 Q 130 110, 210 130 T 370 60 T 530 80 T 570 50"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                
                {/* Coordinate Dots */}
                <circle cx="50" cy="180" r="5" fill="#0f766e" stroke="#fff" strokeWidth="1.5" />
                <circle cx="170" cy="115" r="5" fill="#0f766e" stroke="#fff" strokeWidth="1.5" />
                <circle cx="290" cy="95" r="5" fill="#0f766e" stroke="#fff" strokeWidth="1.5" />
                <circle cx="410" cy="55" r="5" fill="#0f766e" stroke="#fff" strokeWidth="1.5" />
                <circle cx="530" cy="80" r="5" fill="#0f766e" stroke="#fff" strokeWidth="1.5" />
                <circle cx="570" cy="50" r="5" fill="#0f766e" stroke="#fff" strokeWidth="1.5" />
              </svg>
              
              {/* Chart Legend Labels */}
              <div className="absolute left-[50px] bottom-1 right-[20px] flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>Emergency</span>
                <span>ICU Ward</span>
                <span>General Clinic</span>
                <span>Pediatrics</span>
                <span>Outpatient</span>
                <span>Cardiology</span>
              </div>
              <div className="absolute left-[8px] top-0 h-[190px] flex flex-col justify-between text-[9px] text-muted-foreground font-mono">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Console Shortcuts */}
        <Card className="xl:col-span-1 border border-border bg-card">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="text-slate-600 dark:text-slate-400" size={18} />
              Quick Action Console
            </CardTitle>
            <CardDescription>Shortcuts to commonly used administrative processes.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
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
                        <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
