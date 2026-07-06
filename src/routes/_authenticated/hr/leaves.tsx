import { useState, useMemo, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarClock, AlertCircle, Calendar as CalendarIcon, X, Plus, Paperclip } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { Field } from "../../../components/Field";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { DataTable } from "../../../components/DataTable";
import { queryClient, useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { authClient } from "../../../services/auth";
import type { StaffRow, LeaveTypeRow, LeaveRow } from "../../../types";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Select } from "../../../ui/select";
import { Autocomplete } from "../../../ui/autocomplete";
import { formatDate } from "../../../utils/format";
import { cn } from "../../../utils/cn";
import { Badge } from "../../../ui/badge";
import { Label } from "../../../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Calendar } from "../../../components/ui/calendar";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/hr/leaves")({
  component: LeaveManagement
});

const leaveSchema = z.object({
  staffId: z.coerce.number().int().positive("Select an employee"),
  leaveType: z.string().min(2, "Select leave type"),
  startDate: z.string().min(1, "Select start date"),
  endDate: z.string().optional(),
  isHalfDay: z.boolean().default(false),
  reason: z.string().min(3, "Reason must be at least 3 characters")
}).refine((value) => {
  if (!value.isHalfDay && !value.endDate) return false;
  return true;
}, {
  path: ["endDate"],
  message: "Select end date"
}).refine((value) => {
  if (!value.startDate) return true;
  if (value.isHalfDay) return true;
  if (!value.endDate) return true;
  
  const start = new Date(value.startDate);
  const end = new Date(value.endDate);
  return end >= start;
}, {
  path: ["endDate"],
  message: "End date must be on or after start date."
});

function LeaveManagement() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);
    if (!file) {
      setFileBase64(null);
      setFileName(null);
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/zip",
      "application/x-zip-compressed",
      "application/octet-stream"
    ];

    const extension = file.name.split('.').pop()?.toLowerCase();
    const isAllowedExtension = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "zip"].includes(extension || "");

    if (!allowedTypes.includes(file.type) && !isAllowedExtension) {
      setFileError("Supported formats: Images, PDF, ZIP.");
      setFileBase64(null);
      setFileName(null);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFileError("File size exceeds 5MB limit.");
      setFileBase64(null);
      setFileName(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(reader.result as string);
      setFileName(file.name);
    };
    reader.onerror = () => {
      setFileError("Error reading file.");
    };
    reader.readAsDataURL(file);
  };

  const handleCloseForm = () => {
    leaveForm.reset({ leaveType: activeLeaveTypes[0] || "Casual Leave" });
    setFileBase64(null);
    setFileName(null);
    setFileError(null);
    setShowForm(false);
  };
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const limit = 10;

  const session = authClient.useSession();
  const isAdmin = session.data?.user?.role === "admin";

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
  const staffList = (staffQuery.data ?? []).map((staff) => [String(staff.staffId), `${staff.employeeCode} - ${staff.name}`] as [string, string]);

  const leaves = (leavesQuery.data?.data ?? []).map((leave) => ({
    ...leave,
    dateRange: `${formatDate(leave.startDate)} to ${formatDate(leave.endDate)}`
  }));
  
  const currentStaff = staffQuery.data?.find((s) => s.email === session.data?.user?.email);
  const canSelectStaff = isAdmin || session.data?.user?.role === "hr" || currentStaff?.isExecutive === true;
  // const pendingLeaves = leaves.filter((leave) => leave.status === "Pending");

  const leaveForm = useForm<z.input<typeof leaveSchema>, unknown, z.output<typeof leaveSchema>>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { leaveType: activeLeaveTypes[0] || "Casual Leave" }
  });

  useEffect(() => {
    if (!canSelectStaff && currentStaff && !leaveForm.getValues("staffId")) {
      leaveForm.setValue("staffId", currentStaff.staffId);
    }
  }, [canSelectStaff, currentStaff, leaveForm]);

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

  const isHalfDayVal = leaveForm.watch("isHalfDay");

  const requestedDays = useMemo(() => {
    if (!startDateVal) return 0;
    if (isHalfDayVal) return 0.5;
    if (!endDateVal) return 0;
    const start = new Date(startDateVal);
    const end = new Date(endDateVal);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  }, [startDateVal, endDateVal, isHalfDayVal]);

  const submitLeave = leaveForm.handleSubmit(async (values) => {
    // Force end date to be equal to start date for half day leaves
    const finalEndDate = values.isHalfDay ? values.startDate : values.endDate!;
    const start = new Date(values.startDate);
    const end = new Date(finalEndDate);
    const days = values.isHalfDay ? 0.5 : Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

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
          endDate: new Date(finalEndDate).toISOString(),
          supportingDocument: fileBase64 || null
        }
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => null)) as any;
        throw new Error(errData?.error || `HTTP error ${res.status}`);
      }
      leaveForm.reset({ leaveType: activeLeaveTypes[0] || "Casual Leave" });
      setFileBase64(null);
      setFileName(null);
      setFileError(null);
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
        <Button onClick={() => setShowForm(true)}>
          <CalendarClock size={16} className="mr-2" /> Request Leave
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Lists */}
        <div className="space-y-6">
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
                  <option value="Pending Payroll Approval">Pending Payroll Approval</option>
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
                    ["departmentName", "Department"],
                    {
                      id: "leaveType",
                      label: "Type",
                      render: (row) => (
                        <div className="flex items-center gap-2">
                          <span>{row.leaveType}</span>
                          {(row as any).isHalfDay && (
                            <Badge variant="default" className="text-[10px] py-0 px-1 border-primary/30 text-primary/80">Half Day</Badge>
                          )}
                        </div>
                      )
                    },
                    ["dateRange", "Dates"],
                    {
                      id: "status",
                      label: "Status",
                      render: (row) => (
                        <Badge
                          className={cn(
                            row.status === "Approved" && "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30",
                            row.status === "Pending" && "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/30",
                            row.status === "Pending Payroll Approval" && "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/30",
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
                  isLoading={leavesQuery.isLoading}
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
                            leave.status === "Pending Payroll Approval" && "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-900/30",
                            leave.status === "Rejected" && "bg-destructive/10 text-destructive border-destructive/20 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/30",
                            leave.status === "Forwarded" && "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900/30"
                          )}
                        >
                          {leave.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                        <div className="col-span-2">
                          <p className="text-muted-foreground font-medium">Employee</p>
                          <p className="text-foreground font-semibold mt-0.5">{leave.staffName} <span className="text-muted-foreground font-normal">({leave.departmentName || "No Dept"})</span></p>
                        </div>
                        <div>
                          <p className="text-muted-foreground font-medium">Leave Type</p>
                          <p className="text-foreground font-semibold mt-0.5">{leave.leaveType}</p>
                        </div>
                        <div>
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

      {/* Leave Request Left-side Panel */}
      {showForm && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={handleCloseForm}
          />
          <div 
            className="fixed inset-y-0 left-0 z-50 w-full sm:w-96 bg-background border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-300"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="text-primary" size={18} />
                <h3 className="font-semibold text-lg text-foreground">New Leave Request</h3>
              </div>
              <button 
                onClick={handleCloseForm}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer animate-in duration-100"
                type="button"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <form onSubmit={submitLeave} className="relative">
                {leaveForm.formState.isSubmitting && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                      <p className="text-sm font-medium">Submitting...</p>
                    </div>
                  </div>
                )}
                <fieldset disabled={leaveForm.formState.isSubmitting} className="space-y-4">
                  {canSelectStaff ? (
                    <Autocomplete 
                      label="Employee" 
                      value={leaveForm.watch("staffId")?.toString() ?? ""}
                      onChange={(val) => leaveForm.setValue("staffId", val ? Number(val) : 0, { shouldValidate: true })}
                      options={staffList} 
                      placeholder="Search employee by name or code..."
                      error={leaveForm.formState.errors.staffId?.message}
                    />
                  ) : (
                    <>
                      <input type="hidden" {...leaveForm.register("staffId")} />
                      <Field label="Employee" value={currentStaff ? `${currentStaff.employeeCode} - ${currentStaff.name}` : "Loading..."} disabled />
                    </>
                  )}

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

                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isHalfDay" {...leaveForm.register("isHalfDay")} />
                    <label htmlFor="isHalfDay" className="text-sm font-medium">Half Day Leave</label>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label>Start Date</Label>
                    <Controller
                      control={leaveForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal border border-input h-10 px-3 py-2 bg-background hover:bg-muted/30 text-sm rounded-lg cursor-pointer",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                              {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? date.toISOString() : "")}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {leaveForm.formState.errors.startDate?.message && (
                      <p className="text-xs text-red-500 mt-1">{leaveForm.formState.errors.startDate.message}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>End Date</Label>
                    <Controller
                      control={leaveForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              disabled={isHalfDayVal}
                              className={cn(
                                "w-full justify-start text-left font-normal border border-input h-10 px-3 py-2 bg-background hover:bg-muted/30 text-sm rounded-lg cursor-pointer",
                                !field.value && "text-muted-foreground",
                                isHalfDayVal && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                              {isHalfDayVal && startDateVal
                                ? format(new Date(startDateVal), "PPP")
                                : field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ? new Date(field.value) : undefined}
                              onSelect={(date) => field.onChange(date ? date.toISOString() : "")}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {leaveForm.formState.errors.endDate?.message && (
                      <p className="text-xs text-red-500 mt-1">{leaveForm.formState.errors.endDate.message}</p>
                    )}
                  </div>

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

                  {/* Supporting Document file upload input */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="supporting-doc" className="text-xs font-semibold text-slate-700 dark:text-slate-350">Supporting Document (Optional)</Label>
                    <input
                      id="supporting-doc"
                      type="file"
                      accept="image/*,application/pdf,application/zip,application/x-zip-compressed"
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer cursor-pointer border border-input rounded-lg p-1"
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Images, PDF, and ZIP formats up to 5MB are supported.</p>
                    {fileName && !fileError && (
                      <p className="text-xs text-emerald-650 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                        <Paperclip size={12} /> Selected: {fileName}
                      </p>
                    )}
                    {fileError && (
                      <p className="text-xs text-red-500 font-semibold mt-1">{fileError}</p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={handleCloseForm}>
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      Submit Request
                    </Button>
                  </div>
                </fieldset>
              </form>
            </div>
          </div>
        </>
      )}
    </ModuleLayout>
  );
}
