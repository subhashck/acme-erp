import { createFileRoute, Link } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery, queryClient } from "@/lib/query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Autocomplete } from "@/ui/autocomplete";
import {
  Users,
  Plus,
  ArrowLeft,
  Trash2,
  CheckCircle2,
  XCircle,
  Loader2,
  Shield,
  UserCheck,
} from "lucide-react";
import * as React from "react";
import { useUserPermissions } from "@/lib/permissions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/magazine/editors")({
  component: MagazineEditorsPage,
});

interface EditorItem {
  id: number;
  userId: string;
  userName: string | null;
  userEmail: string;
  userRole: string | null;
  addedBy: string | null;
  active: boolean;
  createdAt: string;
}

export function MagazineEditorsPage() {
  const { isAdmin } = useUserPermissions();
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [selectedUserId, setSelectedUserId] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch magazine editors
  const editorsQuery = useRpcQuery<EditorItem[]>(
    ["magazine-editors"],
    () => fetch("/api/magazine/editors")
  );

  // Fetch all users for the dropdown
  const usersQuery = useRpcQuery<Array<{ id: string; name: string; email: string; role: string }>>(
    ["admin-users-list"],
    () => fetch("/api/admin/users")
  );

  const editors = editorsQuery.data || [];
  const allUsers = usersQuery.data || [];
  const existingUserIds = React.useMemo(() => new Set(editors.map((e) => e.userId)), [editors]);
  const availableUsers = React.useMemo(() => allUsers.filter((u) => !existingUserIds.has(u.id)), [allUsers, existingUserIds]);
  const userOptions: [string, string][] = React.useMemo(
    () =>
      availableUsers.map((u) => [
        u.id,
        u.name ? `${u.name} (${u.email})` : u.email,
      ]),
    [availableUsers]
  );

  const handleAddEditor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/magazine/editors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add editor");
      }

      toast.success("Magazine editor added successfully!");
      setIsAddOpen(false);
      setSelectedUserId("");
      editorsQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["magazine-my-access"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to add editor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: number, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/magazine/editors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update editor status");
      }

      toast.success(`Editor ${!currentActive ? "activated" : "deactivated"}`);
      editorsQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["magazine-my-access"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteEditor = async (id: number, name: string) => {
    if (!window.confirm(`Remove "${name}" from magazine editors?`)) return;

    try {
      const res = await fetch(`/api/magazine/editors/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete editor");
      }

      toast.success("Editor removed");
      editorsQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["magazine-my-access"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-rose-600">Access Denied</h2>
        <p className="text-sm text-slate-500 mt-1">
          Only system administrators can manage magazine editors.
        </p>
        <Link to="/magazine" className="mt-4 inline-block text-sky-600 font-semibold">
          Return to Magazine Issues
        </Link>
      </div>
    );
  }

  return (
    <ModuleLayout
      title="Magazine Editorial Board & Access"
      description="Designate authorized staff members who have permission to draft, edit, and publish monthly electronic magazine issues."
      action={
        <div className="flex items-center gap-2">
          <Link to="/magazine">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Issues</span>
            </Button>
          </Link>

          <Button
            onClick={() => setIsAddOpen(true)}
            size="sm"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Editor User</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6 max-w-4xl">
        {/* Info card */}
        <Card className="border-border bg-muted/50">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-bold text-foreground">Access Policy Note:</span> System Administrators always have full authoring and publishing rights. Users added to this list receive editor privileges for creating stories, uploading imagery, and organizing monthly editions.
            </div>
          </CardContent>
        </Card>

        {/* Editors Table */}
        <Card>
          <CardHeader className="p-5 pb-3 border-b border-border">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-muted-foreground" />
              Authorized Editors ({editors.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Staff members with active magazine management privileges.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {editorsQuery.isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : editors.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No custom editors assigned yet. System administrators currently manage all editions.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {editors.map((ed) => (
                  <div key={ed.id} className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center font-bold text-foreground text-sm">
                        {(ed.userName || ed.userEmail).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">{ed.userName || "Unnamed User"}</span>
                          <Badge variant="outline" className="text-[10px] font-mono capitalize">
                            {ed.userRole || "User"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{ed.userEmail}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(ed.id, ed.active)}
                        className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                      >
                        {ed.active ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            Disabled
                          </Badge>
                        )}
                      </button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteEditor(ed.id, ed.userName || ed.userEmail)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Remove Editor"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Editor Dialog */}
      <Dialog
        open={isAddOpen}
        onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) setSelectedUserId("");
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleAddEditor}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Users className="h-5 w-5 text-primary" />
                Add Magazine Editor
              </DialogTitle>
              <DialogDescription>
                Select an existing user to grant magazine authoring and editing access.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Autocomplete
                label="Select User *"
                value={selectedUserId}
                onChange={setSelectedUserId}
                options={userOptions}
                placeholder="Search user by name or email..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !selectedUserId}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Editor"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
