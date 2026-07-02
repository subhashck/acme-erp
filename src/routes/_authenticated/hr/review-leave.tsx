import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { z } from "zod";
import { Check, X, ArrowRight, ArrowLeft, AlertCircle, AlertTriangle } from "lucide-react";
import { Field } from "../../../components/Field";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { queryClient, useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { authClient } from "../../../services/auth";
import type { StaffRow, LeaveDetailRow } from "../../../types";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { cn } from "../../../utils/cn";

export const Route = createFileRoute("/_authenticated/hr/review-leave")({
  validateSearch: z.object({ leaveId: z.number() }),
  component: ReviewLeave
});

function ReviewLeave() {
  const navigate = useNavigate();
  const { leaveId } = Route.useSearch();
  const session = authClient.useSession();
  const [reviewerNote, setReviewerNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [forwardToStaffId, setForwardToStaffId] = React.useState<number | "">("");

  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () => client.hr.staff.$get());
  const leaveQuery = useRpcQuery<LeaveDetailRow>(
    ["leave", leaveId],
    () => client.hr.leaves[":id"].$get({ param: { id: String(leaveId) } })
  );

  const leave = leaveQuery.data;
  const currentStaff = staffQuery.data?.find(
    (s) => s.email === session.data?.user?.email || (s.userId && s.userId === session.data?.user?.id)
  );

  const forwardableStaff = React.useMemo(() => {
    if (!staffQuery.data) return [];
    return staffQuery.data.filter(s => {
      const role = (s.role || "").toLowerCase();
      return role.includes("supervisor") || role.includes("hr") || role.includes("executive") || role.includes("manager");
    });
  }, [staffQuery.data]);

  const balanceQuery = useRpcQuery<{ leaveType: string; maxDays: number; takenDays: number; remainingDays: number }[]>(
    ["staff-leave-balance", leave?.staffId],
    () => client.hr.staff[":id"]["leave-balance"].$get({ param: { id: String(leave?.staffId) } }),
    { enabled: !!leave?.staffId }
  );

  const selectedTypeBalance = (balanceQuery.data ?? []).find(
    (b) => b.leaveType === leave?.leaveType
  );

  const requestedDays = React.useMemo(() => {
    if (!leave) return 0;
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  }, [leave]);

  if (leaveQuery.isLoading || staffQuery.isLoading) {
    return (
      <ModuleLayout title="Review Leave" description="Loading leave request...">
        <div className="text-center py-10 text-slate-500">Loading details...</div>
      </ModuleLayout>
    );
  }

  if (!leave) {
    return (
      <ModuleLayout title="Review Leave" description="Error loading leave request.">
        <div className="text-center py-10 text-red-500 font-semibold">Leave request not found.</div>
      </ModuleLayout>
    );
  }

  const isAdmin = session.data?.user?.role === "admin";

  // Is the leave requester the dept head or sub-head of their department?
  const empIsHead = leave.headStaffId != null && leave.staffId === leave.headStaffId;
  const empIsSubhead = leave.subheadStaffId != null && leave.staffId === leave.subheadStaffId;

  // Current user's role in the employee's department
  const isHead = currentStaff != null && leave.headStaffId != null && currentStaff.staffId === leave.headStaffId;
  const isSubhead = currentStaff != null && leave.subheadStaffId != null && currentStaff.staffId === leave.subheadStaffId;
  const isDirectSupervisor = currentStaff != null && (currentStaff.staffId === leave.supervisorLevel1Id || currentStaff.staffId === leave.supervisorLevel2Id);

  // Decision panel visibility — mirrors the backend canAct logic
  const canAction = (() => {
    if (!["Pending", "Forwarded"].includes(leave.status)) return false;
    if (isAdmin) return true;
    if (empIsHead) return isDirectSupervisor;           // Admin or direct supervisor can act on dept head's leave
    if (empIsSubhead) return isHead || isDirectSupervisor; // Sub-head's leave → dept head or supervisor
    // Regular staff: head OR sub-head OR supervisor on Pending
    if (leave.status === "Pending") return isHead || isSubhead || isDirectSupervisor;
    if (leave.status === "Forwarded") return isHead || isDirectSupervisor;
    return false;
  })();

  // Forward button: Any supervisor who can act on the leave can forward it to another supervisor
  const canForward = canAction;


  const formatDateForInput = (dateStr: string) => {
    try {
      return new Date(dateStr).toISOString().split("T")[0];
    } catch {
      return dateStr;
    }
  };

  const handleAction = async (action: "approve" | "reject" | "forward") => {
    if (!reviewerNote.trim()) {
      alert("Please provide a reviewer note / reason for your decision.");
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (action === "approve") {
        res = await (client.hr.leaves[":id"].approve as any).$post({
          param: { id: String(leaveId) },
          json: { reviewerNote }
        });
      } else if (action === "reject") {
        res = await (client.hr.leaves[":id"].reject as any).$post({
          param: { id: String(leaveId) },
          json: { reviewerNote }
        });
      } else {
        if (!forwardToStaffId) {
          alert("Please select a supervisor to forward to.");
          setSubmitting(false);
          return;
        }
        res = await (client.hr.leaves as any)[":id"].forward.$post({
          param: { id: String(leaveId) },
          json: { reviewerNote, forwardToStaffId }
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `HTTP error ${res.status}`);
      }

      queryClient.invalidateQueries({ queryKey: ["leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave", leaveId] });
      navigate({ to: "/hr/leaves" });
    } catch (err) {
      alert(`Failed to ${action} leave request: ` + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-emerald-900 text-white border-emerald-200 dark:bg-emerald-900 dark:text-emerald-200 dark:border-lime-900";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-450 dark:border-rose-900/30";
      case "Forwarded":
        return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-455 dark:border-sky-900/30";
      default:
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-450 dark:border-amber-900/30";
    }
  };

  return (
    <ModuleLayout
      title="Review Leave Request"
      description={`Review request details for ${leave.staffName} (${leave.requestNo})`}
    >
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Leave Details</CardTitle>
            <span className={`px-3 py-1 rounded-full border text-xs font-bold ${getStatusBadgeClass(leave.status)}`}>
              {leave.status.toUpperCase()}
            </span>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2">
              <Field label="Employee" value={leave.staffName} disabled />
              <Field label="Department" value={leave.departmentName || "—"} disabled />
              <Field label="Leave Type" value={leave.leaveType} disabled />
              <Field label="Start Date" type="date" value={formatDateForInput(leave.startDate)} disabled />
              <Field label="End Date" type="date" value={formatDateForInput(leave.endDate)} disabled />
              <Field label="Reason" className="md:col-span-2" value={leave.reason} disabled />
            </form>
          </CardContent>
        </Card>

        {selectedTypeBalance && (
          <Card className={cn(
            "border-l-4",
            requestedDays > selectedTypeBalance.remainingDays
              ? "border-l-destructive bg-rose-50/10"
              : "border-l-emerald-500 bg-emerald-50/5"
          )}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Leave Balance Summary: {leave.leaveType}
              </CardTitle>
              {requestedDays > selectedTypeBalance.remainingDays && (
                <span className="text-xs text-rose-600 font-extrabold flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                  <AlertTriangle size={14} className="animate-pulse" /> EXCEEDS BALANCE
                </span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground font-medium">Allocated</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedTypeBalance.maxDays} days</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground font-medium">Taken (YTD)</p>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedTypeBalance.takenDays} days</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground font-medium">Remaining</p>
                  <p className={cn(
                    "text-lg font-bold mt-0.5",
                    selectedTypeBalance.remainingDays > 0 ? "text-emerald-650 dark:text-emerald-400" : "text-destructive"
                  )}>{selectedTypeBalance.remainingDays} days</p>
                </div>
              </div>

              {/* Status banner */}
              <div className={cn(
                "p-3 rounded-lg border text-xs flex gap-2 items-start",
                requestedDays > selectedTypeBalance.remainingDays
                  ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/35 text-red-800 dark:text-red-300"
                  : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/35 text-emerald-800 dark:text-emerald-300"
              )}>
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">
                    Requested Duration: {requestedDays} {requestedDays === 1 ? "day" : "days"}
                  </p>
                  {requestedDays > selectedTypeBalance.remainingDays ? (
                    <p className="mt-0.5">
                      Warning: This leave request exceeds the employee's remaining leave balance by {requestedDays - selectedTypeBalance.remainingDays} {requestedDays - selectedTypeBalance.remainingDays === 1 ? "day" : "days"}.
                    </p>
                  ) : (
                    <p className="mt-0.5">
                      This request is within the employee's remaining balance. New remaining balance will be {selectedTypeBalance.remainingDays - requestedDays} days.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {leave.reviewerNote && (
          <Card className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300">Previous Reviewer Note</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-300 italic">
              "{leave.reviewerNote}"
              {leave.reviewedAt && (
                <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  Reviewed at: {new Date(leave.reviewedAt).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {canAction ? (
          <Card className="border-2 border-[hsl(174_88%_26%)/20%] bg-[hsl(174_88%_26%)/2%]">
            <CardHeader>
              <CardTitle className="text-md">Decision Panel</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-semibold text-slate-750 dark:text-slate-350 block mb-1.5">
                  Reviewer Note / Decision Reason (Required)
                </label>
                <textarea
                  className="w-full min-h-[90px] p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(174_88%_26%)] bg-white dark:bg-slate-950 text-foreground"
                  placeholder="Provide approval/rejection reason, or forwarding note..."
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-wrap gap-2 justify-end mt-2">
                <Button variant="outline" onClick={() => navigate({ to: "/hr/leaves" })} disabled={submitting}>
                  Cancel
                </Button>

                {canForward && (
                  <div className="flex items-center gap-2">
                    <select
                      className="h-9 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-800 text-sm bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                      value={forwardToStaffId}
                      onChange={(e) => setForwardToStaffId(e.target.value === "" ? "" : Number(e.target.value))}
                      disabled={submitting}
                    >
                      <option value="">Select Target...</option>
                      {forwardableStaff.map(s => (
                        <option key={s.staffId} value={s.staffId}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-sky-300 text-sky-700 hover:bg-sky-50"
                      onClick={() => handleAction("forward")}
                      disabled={submitting}
                    >
                      Forward <ArrowRight size={16} className="ml-1.5" />
                    </Button>
                  </div>
                )}

                <Button
                  type="button"
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={() => handleAction("reject")}
                  disabled={submitting}
                >
                  <X size={16} className="mr-1.5" /> Reject
                </Button>

                <Button
                  type="button"
                  className="bg-[hsl(174_88%_26%)] hover:bg-[hsl(174_88%_26%)/90%] text-white"
                  onClick={() => handleAction("approve")}
                  disabled={submitting}
                >
                  <Check size={16} className="mr-1.5" /> Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => navigate({ to: "/hr/leaves" })}>
              <ArrowLeft size={16} className="mr-1.5" /> Back to Leaves
            </Button>
          </div>
        )}
      </div>
    </ModuleLayout>
  );
}
