import * as React from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/services/auth";
import { client } from "../../../services/rpc";
import { useRpcQuery } from "../../../lib/query";
import { DataTable } from "@/components/DataTable";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Field } from "@/components/Field";
import { Select } from "@/ui/select";
import { Autocomplete } from "@/ui/autocomplete";
// import { Badge } from "@/ui/badge";
import type { StaffRow } from "@/types";
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Ban,
  Unlock,
  X,
  Users,
  Search,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Mail,
  Calendar,
  User,
  Link2,
  Link2Off,
  KeyRound,
  AtSign,
  Trash2
} from "lucide-react";
import { cn } from "@/utils/cn";

export const Route = createFileRoute("/_authenticated/admin/users")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    const role = session.data?.user.role;
    if (role !== "admin" && role !== "hr") {
      throw redirect({
        to: "/"
      });
    }
  },
  component: UserManagementPage
});

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function UserManagementPage() {
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = React.useState<UserRecord | null>(null);
  const { session: currentSession } = Route.useRouteContext() as { session?: any };
  const isAdmin = currentSession?.user.role === "admin";

  // Create User state
  const [createSelectedStaffId, setCreateSelectedStaffId] = React.useState("");
  const [createRole, setCreateRole] = React.useState<"admin" | "hr" | "staff">("staff");
  const [createError, setCreateError] = React.useState("");
  const [submittingCreate, setSubmittingCreate] = React.useState(false);
  const [isFormExpanded, setIsFormExpanded] = React.useState(false);

  // Manage Role State
  const [newRole, setNewRole] = React.useState<"admin" | "hr" | "staff">("staff");
  const [submittingRole, setSubmittingRole] = React.useState(false);

  // Manage Ban State
  const [banReason, setBanReason] = React.useState("");
  const [submittingBan, setSubmittingBan] = React.useState(false);
  const [submittingUnban, setSubmittingUnban] = React.useState(false);

  // Link to Staff state
  const [selectedStaffId, setSelectedStaffId] = React.useState<string>("");
  const [submittingLink, setSubmittingLink] = React.useState(false);

  // Reset password state
  const [submittingResetPassword, setSubmittingResetPassword] = React.useState(false);

  // Change email state
  const [newEmail, setNewEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState("");
  const [submittingEmail, setSubmittingEmail] = React.useState(false);

  // Delete user state
  const [submittingDelete, setSubmittingDelete] = React.useState(false);

  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () => client.hr.staff.$get());
  const staffList = staffQuery.data ?? [];

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as any).error || "Failed to fetch users");
      }
      return (await res.json()) as UserRecord[];
    }
  });

  const users = usersQuery.data ?? [];

  // Reset state when a different user is selected
  React.useEffect(() => {
    if (selectedUser) {
      // Pre-select any currently linked staff
      const linked = staffList.find((s) => (s as any).userId === selectedUser.id);
      setSelectedStaffId(linked ? String(linked.staffId) : "");
      const validRole = ["admin", "hr", "staff"].includes(selectedUser.role || "") ? selectedUser.role : "staff";
      setNewRole(validRole as "admin" | "hr" | "staff");
      setBanReason("");
      setNewEmail("");
      setEmailError("");
    }
  }, [selectedUser]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createSelectedStaffId || !createRole) {
      setCreateError("Please select a staff member and role");
      return;
    }
    
    const selectedStaff = staffList.find(s => String(s.staffId) === createSelectedStaffId);
    if (!selectedStaff || !selectedStaff.email) {
      setCreateError("Selected staff does not have an email address configured");
      return;
    }

    setSubmittingCreate(true);
    setCreateError("");
    try {
      const res = await authClient.admin.createUser({
        email: selectedStaff.email,
        password: "Welcome@123", // Default password
        name: selectedStaff.name,
        role: createRole
      });
      if (res.error) {
        setCreateError(res.error.message || "Failed to create user");
      } else {
        // Attempt to link the user to the staff profile
        if (res.data?.user?.id) {
          try {
            await fetch(`/api/hr/staff/${selectedStaff.staffId}/link-user`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: res.data.user.id }),
            });
            
            // Set mustChangePassword flag
            await fetch(`/api/admin/users/${res.data.user.id}/must-change-password`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" }
            });

            queryClient.invalidateQueries({ queryKey: ["staff"] });
          } catch (e) {
            console.error("Failed to link user or set mustChangePassword flag", e);
          }
        }
        
        setCreateSelectedStaffId("");
        setCreateRole("staff");
        usersQuery.refetch();
        alert("User created successfully! Default password is Welcome@123");
      }
    } catch (err: any) {
      setCreateError(err.message || "Error creating user");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;
    setSubmittingRole(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Failed to update role");
      } else {
        alert(`Role successfully changed to ${newRole}`);
        usersQuery.refetch();
        setSelectedUser((prev) => prev ? { ...prev, role: newRole } : null);
      }
    } catch (err: any) {
      alert(err.message || "Error changing role");
    } finally {
      setSubmittingRole(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser) return;
    setSubmittingBan(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banReason: banReason || undefined })
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Failed to ban user");
      } else {
        alert("User has been banned successfully.");
        usersQuery.refetch();
        setSelectedUser((prev) => prev ? { ...prev, banned: true, banReason } : null);
      }
    } catch (err: any) {
      alert(err.message || "Error banning user");
    } finally {
      setSubmittingBan(false);
    }
  };

  const handleUnbanUser = async () => {
    if (!selectedUser) return;
    setSubmittingUnban(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/unban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Failed to unban user");
      } else {
        alert("User has been unbanned successfully.");
        usersQuery.refetch();
        setSelectedUser((prev) => prev ? { ...prev, banned: false, banReason: null } : null);
      }
    } catch (err: any) {
      alert(err.message || "Error unbanning user");
    } finally {
      setSubmittingUnban(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    const confirmReset = window.confirm(
      `Are you sure you want to reset the password for ${selectedUser.name} to the default password ("Welcome@123")?`
    );
    if (!confirmReset) return;

    setSubmittingResetPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: "Welcome@123" })
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || "Failed to reset password");
      } else {
        alert("Password has been reset successfully to 'Welcome@123'.");
      }
    } catch (err: any) {
      alert(err.message || "Error resetting password");
    } finally {
      setSubmittingResetPassword(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!selectedUser) return;
    setEmailError("");
    if (!newEmail.trim()) {
      setEmailError("Please enter a new email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (newEmail.trim().toLowerCase() === selectedUser.email.toLowerCase()) {
      setEmailError("New email is the same as the current email.");
      return;
    }
    const confirmed = window.confirm(
      `Change email for ${selectedUser.name} from "${selectedUser.email}" to "${newEmail.trim()}"?\n\nThe user must use the new email to log in. This will also update their linked staff record if any.`
    );
    if (!confirmed) return;

    setSubmittingEmail(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/email`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim() })
      });
      const json = await res.json();
      if (!res.ok) {
        setEmailError(json.error || "Failed to update email.");
      } else {
        alert(`Email updated successfully to "${newEmail.trim()}".`);
        setSelectedUser((prev) => prev ? { ...prev, email: newEmail.trim() } : null);
        setNewEmail("");
        usersQuery.refetch();
        queryClient.invalidateQueries({ queryKey: ["staff"] });
      }
    } catch (err: any) {
      setEmailError(err.message || "Error updating email.");
    } finally {
      setSubmittingEmail(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    const confirmed = window.confirm(
      `PERMANENTLY DELETE the account for ${selectedUser.name} (${selectedUser.email})?\n\nThis will remove their login access and unlink their staff record. This action cannot be undone.`
    );
    if (!confirmed) return;
    // Double-confirm for destructive action
    const reconfirmed = window.confirm(
      `Are you absolutely sure? Type OK to confirm deletion of "${selectedUser.name}".`
    );
    if (!reconfirmed) return;

    setSubmittingDelete(true);
    try {
      const res = await authClient.admin.removeUser({ userId: selectedUser.id });
      if (res.error) {
        alert(res.error.message || "Failed to delete user.");
      } else {
        alert(`User "${selectedUser.name}" has been permanently deleted.`);
        setSelectedUser(null);
        usersQuery.refetch();
        queryClient.invalidateQueries({ queryKey: ["staff"] });
      }
    } catch (err: any) {
      alert(err.message || "Error deleting user.");
    } finally {
      setSubmittingDelete(false);
    }
  };

  // KPIs
  const kpis = React.useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      staff: users.filter((u) => u.role !== "admin" && !u.banned).length,
      banned: users.filter((u) => u.banned).length
    };
  }, [users]);

  const columns = [
    {
      id: "name",
      label: "Name / Email",
      render: (row: UserRecord) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm border border-border shadow-sm">
            {row.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{row.name}</span>
            <span className="text-xs text-muted-foreground font-mono">{row.email}</span>
          </div>
        </div>
      )
    },
    {
      id: "role",
      label: "System Role",
      render: (row: UserRecord) => {
        const isAdmin = row.role === "admin";
        const isHR = row.role === "hr";
        return (
          <span className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border transition-all",
            isAdmin
              ? "bg-teal-50 text-teal-700 border-teal-200 ring-1 ring-inset ring-teal-600/10 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900/30"
              : isHR
                ? "bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-inset ring-indigo-600/10 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/30"
                : "bg-slate-50 text-slate-700 border-slate-200 ring-1 ring-inset ring-slate-600/10 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700"
          )}>
            {row.role || "staff"}
          </span>
        );
      }
    },
    {
      id: "status",
      label: "Status",
      render: (row: UserRecord) => {
        return row.banned ? (
          <span className="inline-flex items-center rounded-full bg-rose-50 dark:bg-rose-950/30 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200 dark:border-rose-900/30 ring-1 ring-inset ring-rose-600/10 dark:ring-rose-900/10">
            Banned
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:border-emerald-900/30 ring-1 ring-inset ring-emerald-600/10 dark:ring-emerald-900/10">
            Active
          </span>
        );
      }
    },
    {
      id: "createdAt",
      label: "Date Registered",
      render: (row: UserRecord) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {new Date(row.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
          })}
        </span>
      )
    },
    {
      id: "actions",
      label: "",
      render: (row: UserRecord) => (
        <div className="flex justify-end pr-2">
          <Button
            variant="outline"
            size="default"
            className="h-8 text-xs font-semibold px-3"
            onClick={() => setSelectedUser(row)}
          >
            Manage User
          </Button>
        </div>
      )
    }
  ];

  return (
    <ModuleLayout
      title="User Access & Roles"
      description="Manage application login credentials, system roles (admin/staff), and ban/restrict users."
    >
      {/* Visual KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-muted/45 border-border hover:shadow-sm transition-all duration-300">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Accounts</p>
              <p className="text-2xl font-black text-foreground mt-1">{usersQuery.isLoading ? "..." : kpis.total}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <Users size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500 bg-teal-50/10 dark:bg-teal-950/10 border-border hover:shadow-sm transition-all duration-300">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">Administrators</p>
              <p className="text-2xl font-black text-teal-900 dark:text-teal-300 mt-1">{usersQuery.isLoading ? "..." : kpis.admins}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30">
              <ShieldCheck size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-400 bg-slate-50/10 dark:bg-slate-800/10 border-border hover:shadow-sm transition-all duration-300">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Staff Members</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">{usersQuery.isLoading ? "..." : kpis.staff}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-slate-50/80 dark:bg-slate-800/80 flex items-center justify-center text-slate-600 dark:text-slate-350 border border-slate-100 dark:border-slate-800">
              <User size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 bg-rose-50/10 dark:bg-rose-950/10 border-border hover:shadow-sm transition-all duration-300">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Banned Users</p>
              <p className="text-2xl font-black text-rose-900 dark:text-rose-300 mt-1">{usersQuery.isLoading ? "..." : kpis.banned}</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-600 dark:text-rose-455 border border-rose-100 dark:border-rose-900/30">
              <ShieldAlert size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid xl:gap-6 xl:grid-cols-4 grid-cols-1">
        {/* Left Side: Create User Form */}
        <div className="xl:col-span-1">
          <Card className="shadow-sm border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 backdrop-blur max-w-md xl:max-w-none w-full">
            <CardHeader className="pb-4 flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <UserPlus size={18} className="text-teal-600" />
                  Add User Account
                </CardTitle>
                <CardDescription className="hidden sm:block">Register a new system login with standard permissions.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="default"
                onClick={() => setIsFormExpanded(!isFormExpanded)}
                className="xl:hidden h-8 text-xs font-semibold px-3"
              >
                {isFormExpanded ? "Collapse" : "Expand"}
              </Button>
            </CardHeader>
            <CardContent className={cn("xl:block", !isFormExpanded && "hidden")}>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <Autocomplete
                  label="Staff Member"
                  placeholder="— Select staff record —"
                  value={createSelectedStaffId}
                  onChange={setCreateSelectedStaffId}
                  options={staffList
                    .filter((s) => !s.userId)
                    .map((s) => [String(s.staffId), `${s.name} (${s.email || "No Email"})`])}
                />
                <Select
                  label="System Role"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as "admin" | "hr" | "staff")}
                  options={[
                    ["staff", "Staff Access"],
                    ["hr", "HR Access"],
                    ["admin", "Admin Access"]
                  ]}
                />
                {createError && (
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-455 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/35 rounded-md p-2">
                    {createError}
                  </p>
                )}
                <Button type="submit" className="w-full h-10 font-bold bg-teal-600 hover:bg-teal-700" disabled={submittingCreate}>
                  {submittingCreate ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Users DataTable */}
        <div className="xl:col-span-3 col-span-1">
          <Card className="shadow-sm border border-slate-100 dark:border-slate-800">
            <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-border flex-wrap gap-4">
              <div>
                <CardTitle className="text-base font-bold">User Registrations</CardTitle>
                <CardDescription>Overview of all employee accounts and login privileges.</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => usersQuery.refetch()}
                className="h-8 w-8 text-slate-500 dark:text-slate-400 hover:bg-muted"
                title="Refresh user list"
              >
                <RefreshCw size={14} className={cn(usersQuery.isFetching && "animate-spin")} />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                rows={users as any}
                columns={columns as any}
                enablePagination
                enableSorting
                enableFiltering
                filterPlaceholder="Search by name or email..."
                isLoading={usersQuery.isLoading}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Slide-over/Modal detail dialog card for selected user */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-bold text-base border border-white/20">
                  {selectedUser.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">{selectedUser.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[calc(100vh-14rem)] overflow-y-auto custom-scrollbar">
              {/* Account Meta Section */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                    <Mail size={13} /> Email Account
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block truncate">{selectedUser.email}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                    <Calendar size={13} /> Created Date
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 block">
                    {new Date(selectedUser.createdAt).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}
                  </span>
                </div>
              </div>

              {/* Link to Staff Record */}
              {(() => {
                const linkedStaff = staffList.find((s) => s.userId === selectedUser.id);
                return (
                  <div className="space-y-2.5 pb-5 border-b border-border">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Link2 size={13} /> Link to Staff Record
                    </h4>
                    {linkedStaff ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/30 rounded-lg px-4 py-3 gap-3">
                        <div className="text-xs">
                          <p className="font-bold text-teal-800 dark:text-teal-300">{linkedStaff.name}</p>
                          <p className="text-teal-600 dark:text-teal-400 font-mono">{linkedStaff.employeeCode} · {linkedStaff.role}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="default"
                          className="h-8 text-xs font-semibold text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/20 w-full sm:w-auto"
                          disabled={submittingLink}
                          onClick={async () => {
                            setSubmittingLink(true);
                            try {
                              const res = await fetch(`/api/hr/staff/${linkedStaff.staffId}/link-user`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId: null }),
                              });
                              if (!res.ok) {
                                const err = await res.json();
                                alert(err.error || "Failed to unlink");
                              } else {
                                setSelectedStaffId("");
                                queryClient.invalidateQueries({ queryKey: ["staff"] });
                              }
                            } catch (e: any) {
                              alert(e.message || "Error unlinking");
                            } finally {
                              setSubmittingLink(false);
                            }
                          }}
                        >
                          <Link2Off size={13} className="mr-1" />
                          {submittingLink ? "Unlinking..." : "Unlink"}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="flex-1 w-full">
                          <Autocomplete
                            label="Staff Member"
                            placeholder="— Select staff record —"
                            value={selectedStaffId}
                            onChange={setSelectedStaffId}
                            options={staffList
                              .filter((s) => !s.userId)
                              .map((s) => [String(s.staffId), `${s.name} (${s.employeeCode})`])}
                          />
                        </div>
                        <Button
                          className="h-10 font-bold bg-teal-600 hover:bg-teal-700 text-white w-full sm:w-auto"
                          disabled={!selectedStaffId || submittingLink}
                          onClick={async () => {
                            setSubmittingLink(true);
                            try {
                              const res = await fetch(`/api/hr/staff/${selectedStaffId}/link-user`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId: selectedUser.id }),
                              });
                              if (!res.ok) {
                                const err = await res.json();
                                alert(err.error || "Failed to link");
                              } else {
                                queryClient.invalidateQueries({ queryKey: ["staff"] });
                              }
                            } catch (e: any) {
                              alert(e.message || "Error linking");
                            } finally {
                              setSubmittingLink(false);
                            }
                          }}
                        >
                          <Link2 size={13} className="mr-1" />
                          {submittingLink ? "Linking..." : "Link"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Action 1: Role Configuration */}
              <div className="space-y-2.5 pb-5 border-b border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Configure System Role</h4>
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <Select
                    label=""
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as "admin" | "hr" | "staff")}
                    options={[
                      ["staff", "Staff Role"],
                      ["hr", "HR Role"],
                      ["admin", "Administrator Role"]
                    ]}
                    className="flex-1 w-full"
                  />
                  <Button
                    onClick={handleChangeRole}
                    disabled={submittingRole || selectedUser.role === newRole}
                    className="h-10 font-bold bg-slate-850 dark:bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700 border border-slate-700 text-white w-full sm:w-auto"
                  >
                    {submittingRole ? "Updating..." : "Update Role"}
                  </Button>
                </div>
              </div>

              {/* Action 2: Ban / Unban Account */}
              <div className="space-y-2.5 pb-5 border-b border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Ban / Restrict Login Access</h4>
                {selectedUser.banned ? (
                  <div className="space-y-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/35 rounded-lg p-4">
                    <div className="flex gap-2">
                      <AlertOctagon size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-rose-800 dark:text-rose-300">
                        <p className="font-bold">This account is currently banned.</p>
                        {selectedUser.banReason && (
                          <p className="mt-1 font-mono bg-white/70 dark:bg-slate-900/60 px-2 py-1 rounded border border-rose-200 dark:border-rose-900/40">
                            Reason: {selectedUser.banReason}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      onClick={handleUnbanUser}
                      disabled={submittingUnban}
                      className="w-full font-bold bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-455 hover:bg-rose-100 dark:hover:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 h-9"
                    >
                      {submittingUnban ? "Unbanning..." : "Remove Login Ban"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Field
                      label="Ban Reason"
                      placeholder="Specify infraction or security reason"
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                    />
                    <Button
                      onClick={handleBanUser}
                      disabled={submittingBan}
                      className="w-full font-bold bg-rose-600 hover:bg-rose-700 text-white h-10 flex items-center justify-center gap-1.5"
                    >
                      <Ban size={15} /> {submittingBan ? "Applying Ban..." : "Ban Login Access"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Action: Change Email */}
              <div className="space-y-2.5 pb-5 border-b border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <AtSign size={13} /> Change Login Email
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Current: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{selectedUser.email}</span>
                </p>
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <Field
                    label="New Email Address"
                    placeholder="Enter new email address"
                    value={newEmail}
                    onChange={(e) => { setNewEmail(e.target.value); setEmailError(""); }}
                    className="flex-1 w-full"
                  />
                  <Button
                    onClick={handleChangeEmail}
                    disabled={submittingEmail || !newEmail.trim()}
                    className="h-10 font-bold bg-indigo-600 hover:bg-indigo-700 text-white w-full sm:w-auto flex items-center gap-1.5"
                  >
                    <AtSign size={14} /> {submittingEmail ? "Saving..." : "Update Email"}
                  </Button>
                </div>
                {emailError && (
                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-md p-2">
                    {emailError}
                  </p>
                )}
              </div>

              {/* Action 3: Admin Actions (admin-only: Impersonate, Reset Password, Delete) */}
              <div className="space-y-2.5 pt-5 border-t border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Admin Actions</h4>
                <div className="flex flex-col gap-2">
                  {isAdmin && (
                    <Button
                      onClick={async () => {
                        try {
                          const res = await authClient.admin.impersonateUser({
                            userId: selectedUser.id,
                          });
                          if (res.error) {
                            alert(res.error.message || "Failed to impersonate user");
                          } else {
                            window.location.href = "/";
                          }
                        } catch (e: any) {
                          alert(e.message || "Failed to impersonate user");
                        }
                      }}
                      className="w-full font-bold bg-amber-600 hover:bg-amber-700 text-white h-10 flex items-center justify-center gap-1.5"
                    >
                      <User size={15} /> Impersonate {selectedUser.name}
                    </Button>
                  )}

                  <Button
                    onClick={handleResetPassword}
                    disabled={submittingResetPassword}
                    className="w-full font-bold bg-rose-600 hover:bg-rose-700 text-white h-10 flex items-center justify-center gap-1.5"
                  >
                    <KeyRound size={15} /> {submittingResetPassword ? "Resetting Password..." : "Reset Password to Default"}
                  </Button>

                  {isAdmin && (() => {
                    const isLinkedToStaff = staffList.some((s) => (s as any).userId === selectedUser.id);
                    return (
                      <div className="pt-2 border-t border-border">
                        <Button
                          onClick={handleDeleteUser}
                          disabled={submittingDelete || isLinkedToStaff}
                          className="w-full font-bold bg-slate-900 dark:bg-red-950 hover:bg-red-900 dark:hover:bg-red-900 text-white border border-red-800/50 h-10 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 size={15} /> {submittingDelete ? "Deleting User..." : "Delete User Account"}
                        </Button>
                        <p className={cn("text-xs mt-1.5 text-center", isLinkedToStaff ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-slate-400 dark:text-slate-500")}>
                          {isLinkedToStaff
                            ? "⚠ Unlink this user from their staff record above before deleting."
                            : "Permanently removes login access. Cannot be undone."}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 dark:bg-slate-900 px-6 py-4 flex justify-end border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setSelectedUser(null)} className="h-9 text-xs">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
