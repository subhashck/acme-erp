import { createFileRoute, Link } from "@tanstack/react-router";
import { Edit2, Plus, Eye, Landmark, User } from "lucide-react";
import * as React from "react";
import { DataTable, type ColumnDef } from "../../../components/DataTable";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import type { StaffRow } from "../../../types";
import { Button } from "../../../ui/button";
import { Card, CardContent } from "../../../ui/card";
import { cn } from "@/utils/cn";
import { Badge } from "@/ui/badge";
import { authClient } from "../../../services/auth";

export const Route = createFileRoute("/_authenticated/hr/staff-list")({
  component: StaffList
});

function StaffList() {
  const session = authClient.useSession();
  const isAdminOrHr = session.data?.user?.role === "admin" || session.data?.user?.role === "hr";

  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () => client.hr.staff.$get());
  const deptsQuery = useRpcQuery<any[]>(["masters-departments"], () => client.masters.departments.$get());

  const staffData = staffQuery.data ?? [];
  const deptsData = deptsQuery.data ?? [];

  const currentStaff = staffData.find(s => s.email === session.data?.user?.email || s.userId === session.data?.user?.id);
  const headOfDeptIds = deptsData
    .filter(d => currentStaff && (d.headStaffId === currentStaff.staffId || d.subheadStaffId === currentStaff.staffId))
    .map(d => d.id);

  const filteredStaff = isAdminOrHr 
    ? staffData 
    : staffData.filter(s => {
        if (s.email === session.data?.user?.email || s.userId === session.data?.user?.id) return true;
        if (s.departmentId && headOfDeptIds.includes(s.departmentId)) return true;
        return false;
      });

  const staffColumns: ColumnDef<StaffRow>[] = [
    ["employeeCode", "Code"],
    ["name", "Name"],
    ["role", "Role"],
    ["departmentName", "Department"],
    {
      id: "aadhar",
      label: "Aadhar",
      render: (row) => row.aadhar ? `********${row.aadhar.slice(-4)}` : "-"
    },
    {
      id: "pan",
      label: "PAN",
      render: (row) => row.pan ? `${row.pan.slice(0, 2)}******${row.pan.slice(-2)}` : "-"
    },
    {
      id: "status",
      label: "Status",
      render: (row) => (
        <Badge
          className={cn(
            row.status === "Active" && "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30 font-bold",
            row.status === "Long Leave" && "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-emerald-305 dark:border-emerald-900/30 font-bold",
            row.status === "Terminated" && "bg-destructive/10 text-destructive border-destructive/20 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/30 font-bold",
            row.status === "Resigned" && "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-950/30 dark:text-slate-300 dark:border-slate-900/30 font-bold"
          )}
        >
          {row.status}
        </Badge>
      )
    },
    {
      id: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild title="View Details">
            <Link to="/hr/view-staff" search={{ staffId: row.staffId }}>
              <Eye size={16} />
            </Link>
          </Button>
          {isAdminOrHr && (
            <Button variant="ghost" size="icon" asChild title="Edit Staff">
              <Link to="/hr/add-staff" search={{ staffId: row.staffId }}>
                <Edit2 size={16} />
              </Link>
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <ModuleLayout
      title="Employee Details"
      description="Staffing, compensation, and employee records."
      action={
        isAdminOrHr ? (
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/hr/add-staff"><Plus size={16} /> Add staff</Link>
            </Button>
          </div>
        ) : undefined
      }
    >
      <Card className="border-0 shadow-none md:border md:shadow-sm bg-transparent md:bg-white/70 dark:md:bg-slate-900/40 backdrop-blur">
        <CardContent className="p-0">
          <DataTable
            rows={filteredStaff}
            columns={staffColumns}
            enableFiltering
            enableSorting
            enablePagination
            filterPlaceholder="Search staff..."
            isLoading={staffQuery.isLoading}
            renderMobileCard={(row) => (
              <Card className="border border-border shadow-xs hover:shadow-sm transition-shadow">
                <CardContent className="p-4 space-y-3.5">
                  {/* Card Header */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold text-xs border shadow-inner">
                      {row.name.split(" ").map((n) => n[0] || "").join("").toUpperCase().slice(0, 2) || "S"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-foreground text-sm truncate">{row.name}</h4>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">{row.employeeCode}</p>
                    </div>
                    <Badge
                      className={cn(
                        row.status === "Active" && "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30 font-bold",
                        row.status === "Long Leave" && "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-emerald-300 dark:border-emerald-900/30 font-bold",
                        row.status === "Terminated" && "bg-destructive/10 text-destructive border-destructive/20 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/30 font-bold",
                        row.status === "Resigned" && "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-950/30 dark:text-slate-300 dark:border-slate-900/30 font-bold"
                      )}
                    >
                      {row.status}
                    </Badge>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-border/60">
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-semibold flex items-center gap-1">
                        <User size={13} /> Role
                      </span>
                      <span className="font-medium text-foreground block truncate">{row.role}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-semibold flex items-center gap-1">
                        <Landmark size={13} /> Department
                      </span>
                      <span className="font-medium text-foreground block truncate">{row.departmentName || "-"}</span>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex gap-2 pt-3 border-t border-border/60">
                    <Button variant="outline" size="default" asChild className="flex-1 font-semibold h-9" title="View Details">
                      <Link to="/hr/view-staff" search={{ staffId: row.staffId }}>
                        <Eye size={14} className="mr-1.5 text-muted-foreground" /> View
                      </Link>
                    </Button>
                    {isAdminOrHr && (
                      <Button variant="outline" size="default" asChild className="flex-1 font-semibold h-9" title="Edit Staff">
                        <Link to="/hr/add-staff" search={{ staffId: row.staffId }}>
                          <Edit2 size={14} className="mr-1.5 text-muted-foreground" /> Edit
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          />
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
