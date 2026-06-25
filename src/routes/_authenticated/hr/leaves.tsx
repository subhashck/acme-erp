import { useState, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarClock, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "../../../components/Field";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { DataTable } from "../../../components/DataTable";
import { queryClient, useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import type { StaffRow, LeaveTypeRow, LeaveRow } from "../../../types";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Select } from "../../../ui/select";
import { formatDate } from "../../../utils/format";
import { cn } from "../../../utils/cn";
import { Badge } from "../../../ui/badge";

export const Route = createFileRoute("/_authenticated/hr/leaves")({
  component: LeaveManagement
});

const leaveSchema = z.object({
  staffId: z.coerce.number().int().positive("Select an employee"),
  leaveType: z.string().min(2, "Select leave type"),
  startDate: z.string().min(1, "Select start date"),
  endDate: z.string().min(1, "Select end date"),
  reason: z.string().min(3, "Reason must be at least 3 characters")
}).refine((value) => new Date(value.endDate) >= new Date(value.startDate), {
  path: ["endDate"],
  message: "End date must be on or after start date"
});

function LeaveManagement() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const limit = 10;

  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () => client.hr.staff.$get());
  const leaveTypesQuery = useRpcQuery<LeaveTypeRow[]>(["masters-leave-types"], () => client.masters["leave-types"].$get());
  const leavesQuery = useRpcQuery<{ data: LeaveRow[]; total: number; page: number; limit: number }>(
    ["leaves", page, search, statusFilter, typeFilter, sortBy, sortOrder],
    () => client.hr.leaves.$get({
      query: {
        page: String(page),
        limit: String(limit),
        search,
        status: statusFilter,
        leaveType: typeFilter,
        sortBy,
        sortOrder
      }
    })
  );

  const activeLeaveTypes = (leaveTypesQuery.data ?? []).filter((r) => r.active).map((r) => r.name);
  const staffList = (staffQuery.data ?? []).map((staff) => [String(staff.id), `${staff.employeeCode} - ${staff.name}`] as [string, string]);

  const leaves = (leavesQuery.data?.data ?? []).map((leave) => ({
    ...leave,
    dateRange: `${formatDate(leave.startDate)} to ${formatDate(leave.endDate)}`
  }));
  // const pendingLeaves = leaves.filter((leave) => leave.status === "Pending");

  const leaveForm = useForm<z.input<typeof leaveSchema>, unknown, z.output<typeof leaveSchema>>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { leaveType: activeLeaveTypes[0] || "Casual Leave" }
  });

  const selectedStaffId = leaveForm.watch("staffId");
  const selectedLeaveType = leaveForm.watch("leaveType");

  const balanceQuery = useRpcQuery<{ leaveType: string; maxDays: number; takenDays: number; remainingDays: number }[]>(
    ["staff-leave-balance", selectedStaffId],
    () => client.hr.staff[":id"]["leave-balance"].$get({ param: { id: String(selectedStaffId) } }),
    { enabled: !!selectedStaffId }
  );

  const selectedTypeBalance = (balanceQuery.data ?? []).find(
    (b) => b.leaveType === selectedLeaveType
  );

  const startDateVal = leaveForm.watch("startDate");
  const endDateVal = leaveForm.watch("endDate");

  const requestedDays = useMemo(() => {
    if (!startDateVal || !endDateVal) return 0;
    const start = new Date(startDateVal);
    const end = new Date(endDateVal);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  }, [startDateVal, endDateVal]);

  const submitLeave = leaveForm.handleSubmit(async (values) => {
    const start = new Date(values.startDate);
    const end = new Date(values.endDate);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

    const balance = (balanceQuery.data ?? []).find(b => b.leaveType === values.leaveType);
    if (balance && days > balance.remainingDays) {
      if (!confirm(`Warning: The requested leave duration (${days} days) exceeds the remaining leave balance (${balance.remainingDays} days) for ${values.leaveType}. Do you want to submit anyway?`)) {
        return;
      }
    }

    try {
      const res = await client.hr.leaves.$post({
        json: {
          ...values,
          startDate: new Date(values.startDate).toISOString(),
          endDate: new Date(values.endDate).toISOString()
        }
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => null)) as any;
        throw new Error(errData?.error || `HTTP error ${res.status}`);
      }
      leaveForm.reset({ leaveType: activeLeaveTypes[0] || "Casual Leave" });
      setPage(1);
      setSearch("");
      setStatusFilter("All");
      setTypeFilter("All");
      setSortBy("createdAt");
      setSortOrder("desc");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      if (values.staffId) {
        queryClient.invalidateQueries({ queryKey: ["staff-leave-balance", String(values.staffId)] });
      }
    } catch (err) {
      alert("Failed to submit leave request: " + (err instanceof Error ? err.message : String(err)));
    }
  });

  return (
    <ModuleLayout
      title="Leave Management"
      description="Request time off and manage employee leave approvals."
      action={
        !showForm ? (
          <Button onClick={() => setShowForm(true)}>
            <CalendarClock size={16} className="mr-2" /> Request Leave
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setShowForm(false)}>
            Hide Form
          </Button>
        )
      }
    >
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left: Request Form */}
        {showForm && (
          <div className="xl:col-span-1 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarClock className="text-primary" size={18} />
                  New Leave Request
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowForm(false)}>
                  ✕
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitLeave} className="grid gap-4">
                  <Select 
                    label="Employee" 
                    {...leaveForm.register("staffId")} 
                    options={staffList} 
                    error={leaveForm.formState.errors.staffId?.message}
                  />

                  {!!selectedStaffId && selectedTypeBalance && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                      <p className="font-semibold text-slate-700 flex justify-between">
                        <span>{selectedLeaveType} Balance:</span>
                        <span className={cn(
                          selectedTypeBalance.remainingDays > 0 ? "text-emerald-600 font-bold" : "text-destructive font-bold"
                        )}>
                          {selectedTypeBalance.remainingDays} days remaining
                        </span>
                      </p>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Allocated: {selectedTypeBalance.maxDays} days</span>
                        <span>Taken: {selectedTypeBalance.takenDays} days</span>
                      </div>
                    </div>
                  )}

                  <Select 
                    label="Type" 
                    {...leaveForm.register("leaveType")} 
                    options={activeLeaveTypes} 
                    error={leaveForm.formState.errors.leaveType?.message}
                  />
                  <Field 
                    label="Start Date" 
                    type="date" 
                    {...leaveForm.register("startDate")} 
                    error={leaveForm.formState.errors.startDate?.message}
                  />
                  <Field 
                    label="End Date" 
                    type="date" 
                    {...leaveForm.register("endDate")} 
                    error={leaveForm.formState.errors.endDate?.message}
                  />

                  {requestedDays > 0 && selectedTypeBalance && (
                    <div className={cn(
                      "p-3 rounded-lg border text-xs flex gap-2 items-start",
                      requestedDays > selectedTypeBalance.remainingDays
                        ? "bg-red-50 border-red-200 text-red-800"
                        : "bg-emerald-50 border-emerald-200 text-emerald-800"
                    )}>
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold">
                          Requested duration: {requestedDays} {requestedDays === 1 ? "day" : "days"}
                        </p>
                        {requestedDays > selectedTypeBalance.remainingDays ? (
                          <p className="mt-0.5">
                            Warning: Exceeds remaining balance by {requestedDays - selectedTypeBalance.remainingDays} {requestedDays - selectedTypeBalance.remainingDays === 1 ? "day" : "days"}.
                          </p>
                        ) : (
                          <p className="mt-0.5">
                            Within remaining balance. New remaining: {selectedTypeBalance.remainingDays - requestedDays} days.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <Field 
                    label="Reason" 
                    {...leaveForm.register("reason")} 
                    error={leaveForm.formState.errors.reason?.message}
                  />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      Submit
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Right: Lists */}
        <div className={showForm ? "xl:col-span-2 space-y-6" : "xl:col-span-3 space-y-6"}>
        { /* {pendingLeaves.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/10">
              <CardHeader>
                <CardTitle className="text-base text-amber-800">Pending Leave Approvals</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <LeaveApprovalTable rows={pendingLeaves} />
              </CardContent>
            </Card>
          )} */}

          <Card>
            <CardHeader className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-4 border-b">
              <CardTitle className="text-base">Leave Request History</CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2 w-full xl:w-auto">
                <input
                  type="text"
                  placeholder="Search..."
                  className="h-9 w-full lg:w-48 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
                <select
                  className="h-9 w-full lg:w-auto rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Forwarded">Forwarded</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <select
                  className="h-9 w-full lg:w-auto rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="All">All Leave Types</option>
                  {activeLeaveTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <select
                  className="h-9 w-full lg:w-auto rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split("-");
                    setSortBy(field);
                    setSortOrder(order);
                    setPage(1);
                  }}
                >
                  <option value="createdAt-desc">Newest First</option>
                  <option value="createdAt-asc">Oldest First</option>
                  <option value="startDate-asc">Start Date (Asc)</option>
                  <option value="startDate-desc">Start Date (Desc)</option>
                  <option value="staffName-asc">Employee (A-Z)</option>
                  <option value="staffName-desc">Employee (Z-A)</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <DataTable
                  rows={leaves}
                  columns={[
                    ["requestNo", "Request"],
                    ["staffName", "Employee"],
                    ["leaveType", "Type"],
                    ["dateRange", "Dates"],
                    {
                      id: "status",
                      label: "Status",
                      render: (row) => (
                        <Badge
                          className={cn(
                            row.status === "Approved" && "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30",
                            row.status === "Pending" && "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30",
                            row.status === "Rejected" && "bg-destructive/10 text-destructive border-destructive/20 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/30",
                            row.status === "Forwarded" && "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/30"
                          )}
                        >
                          {row.status}
                        </Badge>
                      )
                    },
                    {
                      id: "action",
                      label: "Action",
                      render: (row) => (
                        <Button
                          variant="outline"
                          size="default"
                          onClick={() => navigate({ to: "/hr/review-leave", search: { leaveId: row.id } })}
                        >
                          View
                        </Button>
                      )
                    }
                  ]}
                />
              </div>

              {/* Mobile Card List View */}
              <div className="block md:hidden divide-y divide-border">
                {leaves.length > 0 ? (
                  leaves.map((leave) => (
                    <div key={leave.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-foreground">
                          {leave.requestNo}
                        </span>
                        <Badge
                          className={cn(
                            leave.status === "Approved" && "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30",
                            leave.status === "Pending" && "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30",
                            leave.status === "Rejected" && "bg-destructive/10 text-destructive border-destructive/20 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/30",
                            leave.status === "Forwarded" && "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/30"
                          )}
                        >
                          {leave.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                        <div>
                          <p className="text-muted-foreground font-medium">Employee</p>
                          <p className="text-foreground font-semibold mt-0.5">{leave.staffName}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium">Leave Type</p>
                          <p className="text-foreground font-semibold mt-0.5">{leave.leaveType}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-muted-foreground font-medium">Dates</p>
                          <p className="text-foreground font-semibold mt-0.5">{leave.dateRange}</p>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => navigate({ to: "/hr/review-leave", search: { leaveId: leave.id } })}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No records yet
                  </div>
                )}
              </div>

              {leavesQuery.data && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t gap-4 text-sm text-muted-foreground">
                  <div className="text-center sm:text-left">
                    Showing {leaves.length > 0 ? (page - 1) * limit + 1 : 0} to{" "}
                    {Math.min(leavesQuery.data.total, page * limit)} of {leavesQuery.data.total} requests
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="flex-1 sm:flex-none"
                    >
                      Previous
                    </Button>
                    <div className="font-medium min-w-[70px] text-center text-xs">
                      Page {page} of {Math.max(1, Math.ceil(leavesQuery.data.total / limit))}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(leavesQuery.data.total / limit)), p + 1))}
                      disabled={page >= Math.ceil(leavesQuery.data.total / limit)}
                      className="flex-1 sm:flex-none"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
