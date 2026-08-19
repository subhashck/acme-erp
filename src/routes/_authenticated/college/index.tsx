import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { 
  GraduationCap, 
  Users, 
  Receipt, 
  CheckCircle, 
  TrendingUp, 
  BookOpen, 
  Calendar,
  UserCheck,
  Layers
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar 
} from "recharts";
import { toNum } from "@/utils/math";
import { CollegeAccessGuard } from "@/components/CollegeAccessGuard";

export const Route = createFileRoute("/_authenticated/college/")({
  component: () => (
    <CollegeAccessGuard>
      <CollegeDashboard />
    </CollegeAccessGuard>
  ),
});

function CollegeDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["nursing", "dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/dashboard/stats");
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return res.json();
    },
  });

  const { data: batches } = useQuery({
    queryKey: ["nursing", "batches"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/batches");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const feeTrendData = stats?.feeTrend || [
    { month: "Jan", amount: 45000 },
    { month: "Feb", amount: 62000 },
    { month: "Mar", amount: 78000 },
    { month: "Apr", amount: 50000 },
    { month: "May", amount: 95000 },
  ];

  const statusData = [
    { name: "Pending", count: stats?.applicantStatusMap?.pending || 0 },
    { name: "Approved", count: stats?.applicantStatusMap?.approved || 0 },
    { name: "Converted", count: stats?.applicantStatusMap?.converted || 0 },
    { name: "Rejected", count: stats?.applicantStatusMap?.rejected || 0 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-teal-600 dark:text-teal-400" />
            Nursing College Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of admissions, student enrollment, fee collections, and attendance performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to={"/college/academic-schedules" as any}>
            <Button variant="outline" className="border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 flex items-center gap-2">
              <Calendar size={16} /> Academic Schedules & Dues
            </Button>
          </Link>
          <Link to={"/college/admissions" as any}>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2">
              <UserCheck size={16} /> New Admission Intake
            </Button>
          </Link>
          <Link to={"/college/attendance" as any}>
            <Button variant="outline" className="flex items-center gap-2">
              <Calendar size={16} /> Mark Attendance
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-teal-500 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Applicants
            </CardTitle>
            <Users className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats?.totalApplicants ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Intake applications registered</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Students
            </CardTitle>
            <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats?.totalStudents ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently enrolled across batches</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fee Collected
            </CardTitle>
            <Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(toNum(stats?.totalFeeCollected))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cumulative payments received</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Avg Attendance Rate
            </CardTitle>
            <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : `${stats?.avgAttendancePercent ?? 0}%`}</div>
            <p className="text-xs text-muted-foreground mt-1">Theory & Practical combined</p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Grid (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fee Collection Trend */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Fee Collection Trend
            </CardTitle>
            <CardDescription>Monthly collection amounts in INR</CardDescription>
          </CardHeader>
          <CardContent className="h-70">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={feeTrendData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(val: any) => `₹${Number(val ?? 0).toLocaleString("en-IN")}`} />
                <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Application Pipeline Status Breakdown */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-teal-600" />
              Application Pipeline Breakdown
            </CardTitle>
            <CardDescription>Applications by admission pipeline status</CardDescription>
          </CardHeader>
          <CardContent className="h-70">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation: Operations & Workflows */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <UserCheck size={16} className="text-teal-600 dark:text-teal-400" />
          Operations & Daily Management
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to={"/college/admissions" as any} className="block">
            <Card className="hover:border-teal-500 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
                  <Users size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Admissions Pipeline</div>
                  <div className="text-xs text-muted-foreground">Prospects, approvals & intake</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={"/college/fees" as any} className="block">
            <Card className="hover:border-teal-500 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg text-emerald-600">
                  <Receipt size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Fee Collection</div>
                  <div className="text-xs text-muted-foreground">Receipts, payments & ledgers</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={"/college/fee-dues" as any} className="block">
            <Card className="hover:border-teal-500 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-lg text-rose-600">
                  <Receipt size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Fee Due Tracking</div>
                  <div className="text-xs text-muted-foreground">Overdue terms & schedules</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={"/college/attendance" as any} className="block">
            <Card className="hover:border-teal-500 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-purple-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Attendance Marking</div>
                  <div className="text-xs text-muted-foreground">Theory & practical sessions</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Quick Navigation: College Masters */}
      <div className="space-y-3 pt-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Layers size={16} className="text-teal-600 dark:text-teal-400" />
          College Masters & Academic Configuration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link to={"/college/courses" as any} className="block">
            <Card className="hover:border-teal-500 transition-colors cursor-pointer h-full bg-card/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-lg text-teal-600">
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Courses & Batches</div>
                  <div className="text-xs text-muted-foreground">Degree programs & seats</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={"/college/academic-schedules" as any} className="block">
            <Card className="hover:border-teal-500 transition-colors cursor-pointer h-full bg-card/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-lg text-amber-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Academic Schedules</div>
                  <div className="text-xs text-muted-foreground">Term timeline & due dates</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={"/college/subjects" as any} className="block">
            <Card className="hover:border-teal-500 transition-colors cursor-pointer h-full bg-card/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-600">
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Subject Master</div>
                  <div className="text-xs text-muted-foreground">Curriculum & syllabus</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={"/college/students" as any} className="block">
            <Card className="hover:border-teal-500 transition-colors cursor-pointer h-full bg-card/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Student Master List</div>
                  <div className="text-xs text-muted-foreground">Student master directory</div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={"/college/fee-structures" as any} className="block">
            <Card className="hover:border-teal-500 transition-colors cursor-pointer h-full bg-card/60">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 rounded-lg text-cyan-600">
                  <Layers size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm">Fee Structures</div>
                  <div className="text-xs text-muted-foreground">Course & component fees</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
