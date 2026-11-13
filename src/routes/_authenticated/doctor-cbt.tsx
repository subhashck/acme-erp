import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useUserPermissions } from "../../lib/permissions";
import { Stethoscope, Users, BookOpen, Settings, LayoutDashboard, FileCheck, User, UserPen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/doctor-cbt")({
  component: DoctorCbtLayout,
});

function DoctorCbtLayout() {
  const permissions = useUserPermissions();

  const meQuery = useQuery({
    queryKey: ["doctor-cbt-me"],
    queryFn: async () => {
      const res = await fetch("/api/doctor-cbt/me");
      if (!res.ok) throw new Error("Failed to load doctor profile");
      return res.json();
    },
    staleTime: 60 * 1000,
  });

  const canManage = permissions.isAdmin || meQuery.data?.canManage;
  const linkClass =
    "flex items-center gap-1.5 sm:gap-2 rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition hover:bg-muted text-muted-foreground hover:text-foreground shrink-0";
  const activeClass = "bg-muted text-primary font-semibold shadow-xs";

  if (meQuery.isSuccess && !permissions.canViewDoctorCbt) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border bg-card shadow-xs my-8">
        <div className="p-3 rounded-full bg-muted text-muted-foreground mb-3">
          <Stethoscope className="size-8" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Doctor CBT Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-md mt-1 mb-4">
          This module is reserved for administrators and enrolled doctor candidates.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="border-b pb-3 sm:pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
            <Stethoscope className="size-5 sm:size-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground leading-snug">
              Doctor Skill Upgradation (CBT)
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground">
              Academic competency evaluation, continuous topic CBTs, and verifiable credentialing
            </p>
          </div>
        </div>

        {meQuery.data?.doctorProfile && (
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-lg bg-muted/60 border text-[11px] sm:text-xs text-muted-foreground self-start sm:self-auto">
            <span className="font-semibold text-foreground">
              {meQuery.data.doctorProfile.fullName}
            </span>
            {meQuery.data.doctorProfile.nmcSmcNumber && (
              <span className="text-primary font-mono">
                [NMC: {meQuery.data.doctorProfile.nmcSmcNumber}]
              </span>
            )}
            <span className="capitalize px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium">
              {meQuery.data.doctorProfile.status}
            </span>
            <Link
              to="/doctor-cbt/profile"
              className="inline-flex items-center gap-1 ml-1 text-primary hover:text-primary/80 font-semibold hover:underline"
            >
              <UserPen className="size-3" />
              <span>Edit</span>
            </Link>
          </div>
        )}
      </div>

      {/* Module Navigation Tabs */}
      <nav
        aria-label="Doctor CBT Navigation"
        className="flex items-center gap-1.5 sm:gap-2 border-b pb-2 sm:pb-3 overflow-x-auto no-scrollbar sm:flex-wrap"
      >
        <Link
          to="/doctor-cbt"
          activeOptions={{ exact: true }}
          className={linkClass}
          activeProps={{ className: activeClass }}
        >
          <LayoutDashboard className="size-3.5 sm:size-4" />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/doctor-cbt/cbt"
          className={linkClass}
          activeProps={{ className: activeClass }}
        >
          <FileCheck className="size-3.5 sm:size-4" />
          <span>CBT Assessments</span>
        </Link>

        <Link
          to="/doctor-cbt/programs"
          className={linkClass}
          activeProps={{ className: activeClass }}
        >
          <BookOpen className="size-3.5 sm:size-4" />
          <span>Programs & Topics</span>
        </Link>

        <Link
          to="/doctor-cbt/profile"
          className={linkClass}
          activeProps={{ className: activeClass }}
        >
          <User className="size-3.5 sm:size-4" />
          <span>My Profile</span>
        </Link>

        {canManage && (
          <>
            <Link
              to="/doctor-cbt/candidates"
              className={linkClass}
              activeProps={{ className: activeClass }}
            >
              <Users className="size-3.5 sm:size-4" />
              <span>Candidates & Whitelist</span>
            </Link>

            <Link
              to="/doctor-cbt/settings"
              className={linkClass}
              activeProps={{ className: activeClass }}
            >
              <Settings className="size-3.5 sm:size-4" />
              <span>Module Settings</span>
            </Link>
          </>
        )}
      </nav>

      {/* Child Route Content */}
      <Outlet />
    </div>
  );
}
