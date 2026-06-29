import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { ArrowLeft, Edit2, User, ShieldCheck, AlertTriangle, History, ChevronRight } from "lucide-react";
import { useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { ModuleLayout } from "../../../components/ModuleLayout";
import type { StaffRow } from "../../../types";
import { z } from "zod";
import { cn } from "../../../lib/utils";

export const Route = createFileRoute("/_authenticated/hr/view-staff")({
  validateSearch: z.object({ staffId: z.number() }),
  component: ViewStaff
});

function ViewStaff() {
  const { staffId } = Route.useSearch();
  const navigate = useNavigate();

  const employeeQuery = useRpcQuery<StaffRow>(["staff", staffId], () =>
    client.hr.staff[":id"].$get({ param: { id: String(staffId) } })
  );
  const employee = employeeQuery.data;

  const versionsQuery = useRpcQuery<StaffRow[]>(["staff", staffId, "versions"], () =>
    client.hr.staff[":id"].versions.$get({ param: { id: String(staffId) } })
  );

  const activeVersion = versionsQuery.data?.find((v) => v.active);

  const isLoading = employeeQuery.isLoading || versionsQuery.isLoading;

  if (isLoading) {
    return (
      <ModuleLayout title="Staff Details" description="Loading employee information...">
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ModuleLayout>
    );
  }

  if (!employee) {
    return (
      <ModuleLayout title="Staff Details" description="Employee not found.">
        <Card className="max-w-2xl mx-auto mt-8">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">The requested staff record could not be found.</p>
            <Button onClick={() => navigate({ to: "/hr/staff-list" })}>
              <ArrowLeft size={16} className="mr-2" /> Back to HR Management
            </Button>
          </CardContent>
        </Card>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Staff Details"
      description={`View information for ${employee.name} (${employee.employeeCode})`}
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/hr/staff-list" })}>
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
          {employee.active && (
            <Button asChild>
              <Link to="/hr/add-staff" search={{ staffId: employee.id }}>
                <Edit2 size={16} className="mr-2" /> Edit Details
              </Link>
            </Button>
          )}
        </div>
      }
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Warning Banner for Historical Version */}
        {!employee.active && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={20} />
              <div>
                <p className="font-semibold text-sm">Historical Version (v{employee.version})</p>
                <p className="text-xs text-amber-700/85 dark:text-amber-400/85 mt-0.5">
                  You are viewing a past version of this employee's details. Some information might have changed.
                </p>
              </div>
            </div>
            {activeVersion && (
              <Button variant="outline"  asChild className="border-amber-500/30 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 self-start sm:self-auto">
                <Link to="/hr/view-staff" search={{ staffId: activeVersion.id }}>
                  View Active Version (v{activeVersion.version})
                </Link>
              </Button>
            )}
          </div>
        )}

        {/* Profile Summary Header */}
        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <User size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight">{employee.name}</h2>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-semibold",
                  employee.active
                    ? cn(
                        employee.status === "Active" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                        employee.status === "Long Leave" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                        employee.status === "Terminated" && "bg-destructive/10 text-destructive dark:bg-red-950/30 dark:text-red-300",
                        employee.status === "Resigned" && "bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-300"
                      )
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                )}>
                  {employee.active ? employee.status : `Inactive (v${employee.version})`}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{employee.role} &middot; {employee.departmentName || "No Department assigned"}</p>
              <p className="text-xs font-mono text-muted-foreground mt-1">{employee.employeeCode} &middot; Version {employee.version}</p>
            </div>
          </div>
        </div>

        {/* Grid layout for Details and Version History */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Personal & Contact Info */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <ShieldCheck className="text-muted-foreground" size={18} />
                <CardTitle className="text-base">Personal & Contact Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                  <span className="text-muted-foreground font-medium">Email</span>
                  <span className="font-semibold text-foreground break-all">{employee.email || "N/A"}</span>
                  
                  <span className="text-muted-foreground font-medium">Phone</span>
                  <span className="font-semibold text-foreground">{employee.phone || "N/A"}</span>
                  
                  <span className="text-muted-foreground font-medium">Aadhar Number</span>
                  <span className="font-semibold text-foreground font-mono">{employee.aadhar || "N/A"}</span>
                  
                  <span className="text-muted-foreground font-medium">PAN Number</span>
                  <span className="font-semibold text-foreground font-mono uppercase">{employee.pan || "N/A"}</span>


                  <span className="text-muted-foreground font-medium">Last Updated</span>
                  <span className="font-semibold text-foreground">
                    {employee.createdAt ? new Date(employee.createdAt).toLocaleString() : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Version History Sidebar */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <History className="text-muted-foreground" size={18} />
                <CardTitle className="text-base">Version History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {versionsQuery.data?.map((v) => (
                  <Link
                    key={v.id}
                    to="/hr/view-staff"
                    search={{ staffId: v.id }}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border text-sm transition-colors",
                      v.id === staffId
                        ? "bg-primary/5 border-primary/20 text-primary font-medium pointer-events-none"
                        : "bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">Version {v.version}</span>
                        {v.active && (
                          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-semibold rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {v.role} &middot; {new Date(v.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
