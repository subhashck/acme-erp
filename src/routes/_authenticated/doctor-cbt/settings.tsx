import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Badge } from "@/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  Building,
  Mail,
  CheckCircle2,
  Trash2,
  Save,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor-cbt/settings")({
  component: DoctorCbtSettingsPage,
});

function DoctorCbtSettingsPage() {
  const queryClient = useQueryClient();
  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);

  // Settings State
  const [passPercentage, setPassPercentage] = useState("75");
  const [googleWhitelistEnabled, setGoogleWhitelistEnabled] = useState(true);
  const [negativeMarkingEnabled, setNegativeMarkingEnabled] = useState(false);
  const [negativePenalty, setNegativePenalty] = useState("0.25");
  const [assignedAdminIds, setAssignedAdminIds] = useState<string[]>([]);

  // Add User Form State
  const [userFormData, setUserFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    roleInModule: "module_admin" as "module_admin" | "faculty_author" | "assessor",
    isExternal: false,
    institution: "ACME Hospital",
    designationTitle: "",
    notes: "",
    staffId: "",
  });

  // Query Settings
  const settingsQuery = useQuery({
    queryKey: ["doctor-cbt-settings"],
    queryFn: async () => {
      const res = await fetch("/api/doctor-cbt/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json();
    },
  });

  // Query Module Users
  const moduleUsersQuery = useQuery({
    queryKey: ["doctor-cbt-module-users"],
    queryFn: async () => {
      const res = await fetch("/api/doctor-cbt/module-users");
      if (!res.ok) throw new Error("Failed to load module users");
      return res.json();
    },
  });

  // Query ACME Staff for internal selection
  const staffQuery = useQuery({
    queryKey: ["all-staff-dropdown"],
    queryFn: async () => {
      const res = await fetch("/api/staff");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json.data || [];
    },
  });

  // Initialize settings once loaded
  useEffect(() => {
    if (settingsQuery.data) {
      const s = settingsQuery.data;
      setPassPercentage(String(s.default_pass_percentage || 75));
      setGoogleWhitelistEnabled(s.enable_google_whitelist !== false);
      setAssignedAdminIds((s.assigned_module_admins || []).map(String));
      if (s.default_negative_marking) {
        setNegativeMarkingEnabled(Boolean(s.default_negative_marking.enabled));
        setNegativePenalty(String(s.default_negative_marking.penalty || "0.25"));
      }
    }
  }, [settingsQuery.data]);

  // Update Settings Mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/doctor-cbt/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update settings");
      return data;
    },
    onSuccess: () => {
      toast.success("Doctor CBT module settings saved successfully.");
      queryClient.invalidateQueries({ queryKey: ["doctor-cbt-settings"] });
      queryClient.invalidateQueries({ queryKey: ["doctor-cbt-me"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Add Module User Mutation
  const addModuleUserMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/doctor-cbt/module-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add module user");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Added ${data.fullName} to Module Users.`);
      setAddStaffModalOpen(false);
      setUserFormData({
        fullName: "",
        email: "",
        mobile: "",
        roleInModule: "module_admin",
        isExternal: false,
        institution: "ACME Hospital",
        designationTitle: "",
        notes: "",
        staffId: "",
      });
      queryClient.invalidateQueries({ queryKey: ["doctor-cbt-module-users"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Deactivate User Mutation
  const deactivateUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/doctor-cbt/module-users/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to deactivate");
      return data;
    },
    onSuccess: () => {
      toast.success("User deactivated from module.");
      queryClient.invalidateQueries({ queryKey: ["doctor-cbt-module-users"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      default_pass_percentage: parseFloat(passPercentage) || 75.0,
      enable_google_whitelist: googleWhitelistEnabled,
      assigned_module_admins: assignedAdminIds,
      default_negative_marking: {
        enabled: negativeMarkingEnabled,
        penalty: parseFloat(negativePenalty) || 0.25,
      },
    });
  };

  const handleSelectStaff = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sId = e.target.value;
    if (!sId) return;
    const staffList = staffQuery.data || [];
    const found = staffList.find((s: any) => String(s.staffId) === sId);
    if (found) {
      setUserFormData((prev) => ({
        ...prev,
        staffId: sId,
        fullName: found.name || "",
        email: found.email || "",
        mobile: found.phone || "",
        designationTitle: found.designation || "",
        isExternal: false,
        institution: "ACME Hospital",
      }));
    }
  };

  const moduleUsers = moduleUsersQuery.data || [];
  const staffList = staffQuery.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Doctor CBT Module Settings & Governance
          </h2>
          <p className="text-xs text-muted-foreground">
            Designate module administrators, manage qualified faculty, and configure continuous CBT rules
          </p>
        </div>

        <Button onClick={handleSaveSettings} disabled={updateSettingsMutation.isPending} className="gap-2">
          <Save className="size-4" />
          <span>{updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}</span>
        </Button>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Left Column: Admin Delegation & Rules */}
        <div className="space-y-6 lg:col-span-1">
          {/* Module Admin Assignment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <span>Assigned Module Administrators</span>
              </CardTitle>
              <CardDescription className="text-xs">
                In addition to global ERP Admins, these designated users have full administrative
                control over this module.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Designate from Module Users Master</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2.5">
                  {moduleUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      No module users defined yet. Add users below first.
                    </p>
                  ) : (
                    moduleUsers.map((u: any) => {
                      const isChecked = assignedAdminIds.includes(String(u.userId || u.id));
                      return (
                        <label
                          key={u.id}
                          className="flex items-start gap-2.5 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const targetId = String(u.userId || u.id);
                              if (e.target.checked) {
                                setAssignedAdminIds([...assignedAdminIds, targetId]);
                              } else {
                                setAssignedAdminIds(
                                  assignedAdminIds.filter((id) => id !== targetId)
                                );
                              }
                            }}
                            className="mt-0.5 rounded border-muted-foreground"
                          />
                          <div>
                            <span className="font-semibold text-foreground">{u.fullName}</span>
                            <span className="text-[11px] text-muted-foreground block">
                              {u.email} {u.isExternal ? "• External" : "• ACME Staff"}
                            </span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assessment & Whitelist Rules */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Settings className="size-4 text-primary" />
                <span>Assessment & Security Rules</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="passMark" className="text-xs font-semibold">
                  Default Passing Benchmark (%)
                </Label>
                <Input
                  id="passMark"
                  type="number"
                  min="50"
                  max="100"
                  value={passPercentage}
                  onChange={(e) => setPassPercentage(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Score required to achieve competency and modular certificate
                </p>
              </div>

              <div className="pt-2 border-t space-y-2">
                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={googleWhitelistEnabled}
                    onChange={(e) => setGoogleWhitelistEnabled(e.target.checked)}
                    className="rounded border-muted-foreground"
                  />
                  <span>Enforce Google OAuth Pre-Enrollment Whitelist</span>
                </label>
                <p className="text-[11px] text-muted-foreground pl-6">
                  Only doctor accounts approved in the enrollment list can sign in via Google.
                </p>
              </div>

              <div className="pt-2 border-t space-y-2">
                <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={negativeMarkingEnabled}
                    onChange={(e) => setNegativeMarkingEnabled(e.target.checked)}
                    className="rounded border-muted-foreground"
                  />
                  <span>Default Negative Marking for New Tests</span>
                </label>

                {negativeMarkingEnabled && (
                  <div className="pl-6 pt-1 space-y-1.5">
                    <Label htmlFor="penalty" className="text-xs">
                      Penalty per incorrect response
                    </Label>
                    <Input
                      id="penalty"
                      type="number"
                      step="0.05"
                      min="0"
                      max="2"
                      value={negativePenalty}
                      onChange={(e) => setNegativePenalty(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Master Table of Module Users */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  <span>Master Table of Module Users</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Designated ACME staff and external faculty qualified to author questions, review,
                  or administer this module
                </CardDescription>
              </div>

              <Button size="sm" onClick={() => setAddStaffModalOpen(true)} className="gap-1.5 w-full sm:w-auto">
                <UserPlus className="size-3.5" />
                <span>Add Module User</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="sm:hidden text-[11px] text-muted-foreground flex items-center gap-1 p-2.5 pb-1">
                <span>👉 Swipe table horizontally to view user details & actions</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[620px]">
                  <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px] tracking-wider whitespace-nowrap">
                    <tr>
                      <th className="px-4 py-3">User & Affiliation</th>
                      <th className="px-4 py-3">Role in Module</th>
                      <th className="px-4 py-3">Origin</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {moduleUsersQuery.isLoading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                          Loading module users...
                        </td>
                      </tr>
                    ) : moduleUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                          No module users defined yet. Click "Add Module User" above to add staff or
                          external faculty.
                        </td>
                      </tr>
                    ) : (
                      moduleUsers.map((user: any) => (
                        <tr key={user.id} className="hover:bg-muted/30 transition">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">{user.fullName}</div>
                            <div className="text-muted-foreground text-[11px] flex items-center gap-1.5 mt-0.5">
                              <Mail className="size-3" />
                              <span>{user.email}</span>
                              {user.institution && (
                                <>
                                  <span>•</span>
                                  <span>{user.institution}</span>
                                </>
                              )}
                            </div>
                            {user.designationTitle && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {user.designationTitle}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="capitalize text-[11px] font-mono">
                              {user.roleInModule.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] capitalize ${
                                user.isExternal
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                  : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                              }`}
                            >
                              {user.isExternal ? "External Faculty" : "ACME Staff"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {user.active ? (
                              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px]">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">
                                Inactive
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {user.active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-rose-600 hover:text-rose-700"
                                onClick={() => deactivateUserMutation.mutate(user.id)}
                              >
                                Deactivate
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Module User Dialog */}
      <Dialog open={addStaffModalOpen} onOpenChange={setAddStaffModalOpen}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="w-[95vw] max-w-lg p-4 sm:p-6"
        >
          <DialogHeader>
            <DialogTitle>Add User to Module Master</DialogTitle>
            <DialogDescription className="text-xs">
              Define a designated ACME staff member or external faculty qualified for this module
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!userFormData.fullName || !userFormData.email) {
                toast.error("Name and Email are required.");
                return;
              }
              addModuleUserMutation.mutate({
                ...userFormData,
                staffId: userFormData.staffId ? Number(userFormData.staffId) : null,
              });
            }}
            className="space-y-4"
          >
            {/* Origin Toggle */}
            <div className="p-3 bg-muted/40 rounded-xl space-y-2">
              <Label className="text-xs font-semibold">User Type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="originType"
                    checked={!userFormData.isExternal}
                    onChange={() =>
                      setUserFormData((prev) => ({
                        ...prev,
                        isExternal: false,
                        institution: "ACME Hospital",
                      }))
                    }
                  />
                  <span>ACME Hospital Staff</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="radio"
                    name="originType"
                    checked={userFormData.isExternal}
                    onChange={() =>
                      setUserFormData((prev) => ({
                        ...prev,
                        isExternal: true,
                        staffId: "",
                        institution: "",
                      }))
                    }
                  />
                  <span>External Faculty / Assessor</span>
                </label>
              </div>

              {!userFormData.isExternal && (
                <div className="pt-2">
                  <Label className="text-[11px] text-muted-foreground">Select from ACME Staff</Label>
                  <select
                    value={userFormData.staffId}
                    onChange={handleSelectStaff}
                    className="w-full h-9 px-3 text-xs rounded-md border bg-background mt-1"
                  >
                    <option value="">-- Choose Staff Member --</option>
                    {staffList.map((s: any) => (
                      <option key={s.staffId} value={s.staffId}>
                        {s.name} ({s.departmentName || "Staff"} • {s.designation || "Role"})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mFullName" className="text-xs font-semibold">
                  Full Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="mFullName"
                  value={userFormData.fullName}
                  onChange={(e) =>
                    setUserFormData({ ...userFormData, fullName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mEmail" className="text-xs font-semibold">
                  Email <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="mEmail"
                  type="email"
                  value={userFormData.email}
                  onChange={(e) =>
                    setUserFormData({ ...userFormData, email: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="mRole" className="text-xs font-semibold">
                  Role in Module
                </Label>
                <select
                  id="mRole"
                  value={userFormData.roleInModule}
                  onChange={(e: any) =>
                    setUserFormData({ ...userFormData, roleInModule: e.target.value })
                  }
                  className="w-full h-9 px-3 text-xs rounded-md border bg-background"
                >
                  <option value="module_admin">Module Administrator</option>
                  <option value="faculty_author">Faculty Question Author</option>
                  <option value="assessor">Clinical Assessor</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mInstitution" className="text-xs font-semibold">
                  Institution Affiliation
                </Label>
                <Input
                  id="mInstitution"
                  value={userFormData.institution}
                  onChange={(e) =>
                    setUserFormData({ ...userFormData, institution: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mDesignation" className="text-xs font-semibold">
                Designation / Job Title
              </Label>
              <Input
                id="mDesignation"
                placeholder="e.g. Senior Consultant & HOD, Emergency Medicine"
                value={userFormData.designationTitle}
                onChange={(e) =>
                  setUserFormData({ ...userFormData, designationTitle: e.target.value })
                }
              />
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddStaffModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addModuleUserMutation.isPending} className="w-full sm:w-auto">
                {addModuleUserMutation.isPending ? "Adding..." : "Add to Master"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
