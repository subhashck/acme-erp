import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Shield, UserCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/ModuleLayout";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { queryClient } from "@/lib/query";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Autocomplete } from "@/ui/autocomplete";
import type { StaffRow } from "@/types";

export const Route = createFileRoute("/_authenticated/masters/nursing-supers")({
  component: NursingSupers,
});

type NursingSuperRow = {
  id: number;
  staffId: number;
  active: boolean;
  createdAt: string;
  name: string;
  employeeCode: string;
  role: string;
};

function NursingSupers() {
  const { session } = useRouteContext({ from: "/_authenticated" }) as { session?: any };
  const isAdmin = session.data?.user?.role === "admin";

  const [selectedStaffId, setSelectedStaffId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Queries
  const nursingSupersQuery = useQuery<NursingSuperRow[], Error>({
    queryKey: ["masters-nursing-supers"],
    queryFn: async () => {
      const res = await fetch("/api/masters/nursing-supers");
      if (!res.ok) throw new Error("Failed to fetch Nursing Supers");
      return res.json();
    },
  });

  const staffQuery = useQuery<StaffRow[], Error>({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await fetch("/api/hr/staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
    enabled: isAdmin,
  });

  const supers = nursingSupersQuery.data ?? [];
  const staffList = staffQuery.data ?? [];

  // Filter out staff members who are already active Nursing Supers
  const existingStaffIds = new Set(supers.filter((a) => a.active).map((a) => a.staffId));
  const staffOptions: [string, string][] = staffList
    .filter((s) => !existingStaffIds.has(s.staffId))
    .map((s) => [String(s.staffId), `${s.name} (${s.employeeCode}) — ${s.role}`]);

  const handleAddSuper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      toast.error("Select an employee to add as Nursing Super");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/masters/nursing-supers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: Number(selectedStaffId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add Nursing Super");

      toast.success("Nursing Super added successfully");
      setSelectedStaffId("");
      queryClient.invalidateQueries({ queryKey: ["masters-nursing-supers"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to add Nursing Super");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: NursingSuperRow) => {
    try {
      const res = await fetch(`/api/masters/nursing-supers/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Nursing Super ${!item.active ? "activated" : "deactivated"}`);
      queryClient.invalidateQueries({ queryKey: ["masters-nursing-supers"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleDeleteSuper = async (id: number) => {
    if (!window.confirm("Are you sure you want to remove this staff member from Nursing Supers?")) {
      return;
    }
    try {
      const res = await fetch(`/api/masters/nursing-supers/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete Nursing Super");
      toast.success("Nursing Super removed");
      queryClient.invalidateQueries({ queryKey: ["masters-nursing-supers"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to remove Nursing Super");
    }
  };

  const columns: ColumnDef<Record<string, unknown>>[] = [
    {
      id: "employeeCode",
      label: "Employee Code",
      render: (row: any) => <span className="font-mono text-sm font-semibold">{row.employeeCode}</span>,
      sortKey: "employeeCode" as any,
    },
    {
      id: "name",
      label: "Staff Name",
      render: (row: any) => <span className="font-medium text-sm">{row.name}</span>,
      sortKey: "name" as any,
    },
    {
      id: "role",
      label: "Designation / Role",
      render: (row: any) => <span className="text-xs text-muted-foreground">{row.role}</span>,
      sortKey: "role" as any,
    },
    {
      id: "active",
      label: "Status",
      render: (row: any) => (
        <span
          className={`px-2 py-0.5 rounded text-xs font-semibold ${
            row.active
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          {row.active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: any) => {
        const item = row as NursingSuperRow;
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="default"
              className="h-7 px-2 text-xs"
              onClick={() => handleToggleStatus(item)}
            >
              {item.active ? "Deactivate" : "Activate"}
            </Button>
            <Button
              variant="ghost"
              size="default"
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
              onClick={() => handleDeleteSuper(item.id)}
              title="Remove Super"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        );
      },
    },
  ];

  if (session.isPending) {
    return (
      <ModuleLayout title="Nursing Supers" description="Loading...">
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </ModuleLayout>
    );
  }

  if (!isAdmin) {
    return (
      <ModuleLayout
        title="Nursing Supers"
        description="Configure staff members designated as Nursing Supers for clinical department oversight."
      >
        <Card className="border-destructive/30 bg-destructive/5 max-w-lg mx-auto mt-8">
          <CardContent className="pt-6 pb-6 text-center space-y-3">
            <AlertCircle size={40} className="mx-auto text-destructive" />
            <h3 className="font-semibold text-lg text-foreground">Access Restricted</h3>
            <p className="text-sm text-muted-foreground">
              Only Administrators have permission to view and configure Nursing Supers.
            </p>
          </CardContent>
        </Card>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Nursing Supers"
      description="Designate staff members who oversee clinical departments (rosters, leaves, and off-day requests)."
    >
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Form Panel */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck size={18} className="text-primary" /> Add Nursing Super
            </CardTitle>
            <CardDescription className="text-xs">
              Select an active staff member to assign them as a Nursing Super.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddSuper} className="space-y-4">
              <Autocomplete
                label="Select Staff Member *"
                value={selectedStaffId}
                onChange={setSelectedStaffId}
                options={staffOptions}
                placeholder="Search staff by name or code..."
              />
              <Button type="submit" className="w-full gap-2" disabled={submitting || !selectedStaffId}>
                <Plus size={16} /> Add as Nursing Super
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Supers Table */}
        <Card className="xl:col-span-2">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield size={18} className="text-primary" /> Configured Nursing Supers ({supers.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Staff listed below can view/manage rosters and approve leaves & off-day requests for all Clinical Departments.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              rows={supers as any}
              columns={columns}
              isLoading={nursingSupersQuery.isLoading}
              enablePagination
              enableSorting
              enableFiltering
              filterPlaceholder="Search nursing supers..."
            />
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
