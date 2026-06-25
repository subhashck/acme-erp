import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@/services/auth";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Field } from "@/components/Field";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Badge } from "@/ui/badge";
import {
  User,
  Lock,
  Sliders,
  UserCheck,
  KeyRound,
  Save,
  CheckCircle2,
  Moon,
  Sun,
  Palette
} from "lucide-react";
import {
  useSystemSettings,
  saveSystemSettings,
  getSystemSettings,
  type SystemSettings
} from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage
});

function SettingsPage() {
  const session = authClient.useSession();
  const isAdmin = session.data?.user.role === "admin";

  const systemSettings = useSystemSettings();

  const [activeTab, setActiveTab] = React.useState<"profile" | "system">("profile");

  // Profile forms state
  const [profileName, setProfileName] = React.useState("");
  const [profileMessage, setProfileMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submittingProfile, setSubmittingProfile] = React.useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordMessage, setPasswordMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submittingPassword, setSubmittingPassword] = React.useState(false);

  // System settings form state
  const [sysTheme, setSysTheme] = React.useState<"light" | "dark">("light");

  // Sync state values on initial load
  React.useEffect(() => {
    if (session.data?.user?.name) {
      setProfileName(session.data.user.name);
    }
  }, [session.data?.user?.name]);

  React.useEffect(() => {
    setSysTheme(systemSettings.theme);
  }, [systemSettings]);

  // Submit profile details change
  const handleUpdateProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      setProfileMessage({ type: "error", text: "Name cannot be empty" });
      return;
    }
    setSubmittingProfile(true);
    setProfileMessage(null);
    try {
      const res = await authClient.updateUser({
        name: profileName
      });
      if (res.error) {
        setProfileMessage({ type: "error", text: res.error.message || "Failed to update profile name" });
      } else {
        setProfileMessage({ type: "success", text: "Profile name updated successfully!" });
      }
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err.message || "An unexpected error occurred" });
    } finally {
      setSubmittingProfile(false);
    }
  };

  // Submit password update change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ type: "error", text: "All fields are required" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters long" });
      return;
    }
    setSubmittingPassword(true);
    setPasswordMessage(null);
    try {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true
      });
      if (res.error) {
        setPasswordMessage({ type: "error", text: res.error.message || "Failed to update password" });
      } else {
        setPasswordMessage({ type: "success", text: "Password changed successfully! Other sessions revoked." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setPasswordMessage({ type: "error", text: err.message || "An unexpected error occurred" });
    } finally {
      setSubmittingPassword(false);
    }
  };


  return (
    <ModuleLayout
      title="Settings & Workspace Preferences"
      description="Manage your account profile, configure system-wide display preferences, and adjust hospital configurations."
    >
      <div className="grid gap-6 lg:grid-cols-[240px_1fr] mt-2">
        {/* Navigation Sidebar panel for tabs */}
        <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1 pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-border pr-0 lg:pr-4 shrink-0 scrollbar-none">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeTab === "profile"
                ? "bg-slate-900 dark:bg-slate-800 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <User size={16} />
            Profile & Security
          </button>

          <button
            onClick={() => setActiveTab("system")}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
              activeTab === "system"
                ? "bg-slate-900 dark:bg-slate-800 text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Sliders size={16} />
            System Preferences
          </button>
        </div>

        {/* Configurations content panels */}
        <div className="space-y-6">
          
          {/* TAB 1: Profile & Security */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {/* Account details info card */}
              <Card className="bg-card/50 backdrop-blur shadow-sm">
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="text-teal-600" size={18} />
                    Account details
                  </CardTitle>
                  <CardDescription>View your registered user information and access level.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/35">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-950 dark:bg-slate-800 text-white font-extrabold text-lg shadow-inner">
                        {session.data?.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-extrabold text-foreground text-base">{session.data?.user.name}</span>
                        <span className="text-xs text-muted-foreground font-mono mt-0.5">{session.data?.user.email}</span>
                      </div>
                    </div>
                    <Badge variant="default" className={isAdmin ? "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-900 py-1 px-3 text-xs font-bold" : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 py-1 px-3 text-xs font-bold"}>
                      {isAdmin ? "Administrator Access" : "Staff Access"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Name update form */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="text-base">Personal Details</CardTitle>
                  <CardDescription>Update your display name across the ERP application.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleUpdateProfileName} className="space-y-4 max-w-md">
                    <Field
                      label="Your Display Name"
                      type="text"
                      placeholder="e.g. John Doe"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                    />
                    {profileMessage && (
                      <div className={`p-3 rounded-lg border text-xs flex gap-2 items-center ${
                        profileMessage.type === "success"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-red-50 border-red-200 text-red-800"
                      }`}>
                        <CheckCircle2 size={15} className="shrink-0" />
                        <span>{profileMessage.text}</span>
                      </div>
                    )}
                    <Button type="submit" disabled={submittingProfile} className="font-bold bg-slate-900 hover:bg-slate-800 text-white gap-2 h-10 px-4">
                      <Save size={14} />
                      {submittingProfile ? "Saving changes..." : "Save details"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Password update form */}
              <Card className="shadow-sm">
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <KeyRound className="text-indigo-500" size={18} />
                    Credentials & Password
                  </CardTitle>
                  <CardDescription>Update your security password regularly to protect your login access.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                    <Field
                      label="Current Password"
                      type="password"
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <Field
                      label="New Password"
                      type="password"
                      placeholder="Min 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Field
                      label="Confirm Password"
                      type="password"
                      placeholder="Verify new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {passwordMessage && (
                      <div className={`p-3 rounded-lg border text-xs flex gap-2 items-center ${
                        passwordMessage.type === "success"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-red-50 border-red-200 text-red-800"
                      }`}>
                        <CheckCircle2 size={15} className="shrink-0" />
                        <span>{passwordMessage.text}</span>
                      </div>
                    )}
                    <Button type="submit" disabled={submittingPassword} className="font-bold bg-slate-900 hover:bg-slate-800 text-white gap-2 h-10 px-4">
                      <Lock size={14} />
                      {submittingPassword ? "Updating password..." : "Update password"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 3: System Preferences */}
          {activeTab === "system" && (
            <div className="space-y-6">
              <Card className="shadow-sm">
                <CardHeader className="pb-4 border-b">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="text-teal-600" size={18} />
                    Display Themes & Appearance
                  </CardTitle>
                  <CardDescription>Choose how you want Acme ERP Hospital Suite to look on your screen.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Theme selector option cards */}
                    <button
                      type="button"
                      onClick={() => {
                        setSysTheme("light");
                        const current = getSystemSettings();
                        saveSystemSettings({
                          ...current,
                          theme: "light"
                        });
                      }}
                      className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-300 ${
                        sysTheme === "light"
                          ? "bg-teal-500/10 border-teal-500 dark:border-teal-500 dark:bg-teal-950/20 shadow-sm ring-1 ring-teal-500 text-teal-950 dark:text-teal-400"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2 font-bold text-foreground text-sm">
                        <Sun className="text-amber-500" size={18} />
                        Light Theme Mode
                      </div>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Default clean workspace representation. Highly visible under bright office environments.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSysTheme("dark");
                        const current = getSystemSettings();
                        saveSystemSettings({
                          ...current,
                          theme: "dark"
                        });
                      }}
                      className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-300 ${
                        sysTheme === "dark"
                          ? "bg-teal-500/10 border-teal-500 dark:border-teal-500 dark:bg-teal-950/20 shadow-sm ring-1 ring-teal-500 text-teal-950 dark:text-teal-400"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2 font-bold text-foreground text-sm">
                        <Moon className="text-indigo-400" size={18} />
                        Dark Theme Mode
                      </div>
                      <p className="text-xs text-muted-foreground leading-normal">
                        Glowmorphic components and reduced eye fatigue. Excellent for nighttime work and low lighting conditions.
                      </p>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </div>
      </div>
    </ModuleLayout>
  );
}
