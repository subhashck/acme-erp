import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  FlaskConical,
  Plus,
  Search,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  Activity,
  Calendar,
  AlertCircle,
  Stethoscope,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/lab/")({
  component: LabWorklistPage,
});

function LabWorklistPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [priorityFilter, setPriorityFilter] = React.useState("ALL");

  // Fetch Lab Stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["lab-stats"],
    queryFn: async () => {
      const res = await fetch("/api/lab/stats");
      if (!res.ok) throw new Error("Failed to load lab stats");
      return res.json();
    },
    refetchInterval: 15000,
  });

  // Fetch Orders Worklist
  const { data: orders = [], isLoading, refetch: refetchOrders } = useQuery({
    queryKey: ["lab-orders", searchTerm, statusFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.set("search", searchTerm);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter);

      const res = await fetch(`/api/lab/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load orders");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const orderList: any[] = Array.isArray(orders) ? orders : [];

  const handleRefresh = () => {
    refetchStats();
    refetchOrders();
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "STAT":
        return (
          <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold animate-pulse px-2 py-0.5 text-xs shadow-sm">
            STAT
          </Badge>
        );
      case "Urgent":
        return (
          <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-2 py-0.5 text-xs shadow-sm">
            Urgent
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="px-2 py-0.5 text-xs font-normal">
            Routine
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Ordered":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40">
            Pending Sample
          </Badge>
        );
      case "Collected":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40">
            Sample Collected
          </Badge>
        );
      case "InProgress":
        return (
          <Badge variant="outline" className="border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40">
            In Testing
          </Badge>
        );
      case "Completed":
        return (
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
            Report Released
          </Badge>
        );
      case "Cancelled":
        return (
          <Badge variant="destructive">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
            <FlaskConical className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Clinical Diagnostics & Laboratory
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Diagnostic order tracking, sample collection counter, result entry, and pathologist release
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-1.5"
            title="Refresh list"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/lab/masters" as any })}
            className="flex items-center gap-1.5"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Test Catalog
          </Button>
          <Button
            size="sm"
            onClick={() => navigate({ to: "/lab/orders/new" as any })}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Lab Order
          </Button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border-l-4 border-l-teal-500 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Today's Orders</span>
              <Calendar className="h-4 w-4 text-teal-600" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">
              {stats?.todayOrders ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Samples</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">
              {stats?.pendingSamples ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">In Testing</span>
              <Activity className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">
              {stats?.inProgress ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider">Awaiting Verification</span>
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-foreground mt-2">
              {stats?.pendingVerification ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${stats?.criticalCount ? "border-l-rose-600 bg-rose-50/50 dark:bg-rose-950/20" : "border-l-gray-300"} shadow-xs`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">Critical Flags</span>
              <AlertTriangle className={`h-4 w-4 ${stats?.criticalCount ? "text-rose-600 animate-pulse" : "text-gray-400"}`} />
            </div>
            <div className={`text-2xl font-bold mt-2 ${stats?.criticalCount ? "text-rose-700 dark:text-rose-400 font-extrabold" : "text-foreground"}`}>
              {stats?.criticalCount ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Status pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/50">
              {[
                { id: "ALL", label: "All Orders" },
                { id: "Ordered", label: "Pending Collection" },
                { id: "Collected", label: "Collected" },
                { id: "InProgress", label: "Testing" },
                { id: "Completed", label: "Released" },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={statusFilter === tab.id ? "default" : "ghost"}
                  size="xs"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`text-xs h-7 px-2.5 ${
                    statusFilter === tab.id
                      ? "bg-teal-600 hover:bg-teal-700 text-white shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Search & Priority */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search order, patient, MRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-sm h-9"
                />
              </div>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32 h-9 text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priorities</SelectItem>
                  <SelectItem value="Routine">Routine</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="STAT">STAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase font-semibold text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3">Order Number</th>
                <th className="px-4 py-3">Ordered Date</th>
                <th className="px-4 py-3">Patient Details</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total (₹)</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Loading orders worklist...
                  </td>
                </tr>
              ) : orderList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                    <p className="font-semibold">No lab orders found matching filters</p>
                    <p className="text-xs mt-1">Create a new lab order to begin investigation.</p>
                  </td>
                </tr>
              ) : (
                orderList.map((order: any) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate({ to: `/lab/orders/${order.id}` as any })}
                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-foreground">
                      <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded-sm border border-border">
                        {order.orderNo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(order.orderedAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{order.patientName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>MRN: {order.patientMrn}</span>
                        <span>•</span>
                        <span>{order.patientGender}, {order.patientAge}y</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getPriorityBadge(order.priority)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                      ₹{Number(order.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {order.status === "Completed" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/50"
                            onClick={() => navigate({ to: `/lab/reports/${order.id}` as any })}
                            title="View Diagnostic Report"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            Report
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs flex items-center gap-1"
                          onClick={() => navigate({ to: `/lab/orders/${order.id}` as any })}
                        >
                          Workspace
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
