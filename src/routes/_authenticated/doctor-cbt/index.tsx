import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useUserPermissions } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import {
  Stethoscope,
  BookOpen,
  Award,
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileCheck,
  User,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/doctor-cbt/")({
  component: DoctorCbtDashboard,
});

function DoctorCbtDashboard() {
  const permissions = useUserPermissions();
  const meQuery = useQuery({
    queryKey: ["doctor-cbt-me"],
    queryFn: async () => {
      const res = await fetch("/api/doctor-cbt/me");
      if (!res.ok) throw new Error("Failed to load doctor profile");
      return res.json();
    },
  });

  const programsQuery = useQuery({
    queryKey: ["doctor-cbt-programs"],
    queryFn: async () => {
      const res = await fetch("/api/doctor-cbt/programs");
      if (!res.ok) throw new Error("Failed to load programs");
      return res.json();
    },
  });

  const data = meQuery.data;
  const isCandidate = data?.isCandidate;
  const canManage = Boolean(permissions.isAdmin || data?.canManage);
  const enrollments = data?.enrollments || [];
  const programs = programsQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-background p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              Welcome{data?.doctorProfile ? `, Dr. ${data.doctorProfile.fullName}` : ""}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isCandidate
                ? "Access continuous clinical topic CBTs, review rationales, and earn verifiable CME credentials."
                : "Manage doctor training tracks, clinical question vignettes, candidate whitelist, and module settings."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isCandidate && (
              <>
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex-1 sm:flex-none">
                  <Link to="/doctor-cbt/cbt">
                    <FileCheck className="size-4 mr-2" />
                    Pre-Test & Exit-Test
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
                  <Link to="/doctor-cbt/profile">
                    <User className="size-4 mr-2" />
                    My Profile
                  </Link>
                </Button>
              </>
            )}
            {canManage && (
              <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Link to="/doctor-cbt/candidates">
                  <Users className="size-4 mr-2" />
                  Candidates
                </Link>
              </Button>
            )}
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
              <Link to="/doctor-cbt/programs">
                <BookOpen className="size-4 mr-2" />
                Explore Topics
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards - Admin / Management Only */}
      {canManage && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Enrolled Tracks</CardTitle>
              <BookOpen className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{enrollments.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active fellowship programs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Available Programs</CardTitle>
              <Stethoscope className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{programs.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Specialty curricula published</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Assessment Mode</CardTitle>
              <Clock className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">Continuous</div>
              <p className="text-xs text-muted-foreground mt-1">Self-paced topic CBTs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Account Security</CardTitle>
              <ShieldCheck className="size-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">Whitelisted</div>
              <p className="text-xs text-muted-foreground mt-1">Pre-checked Google & Password</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Candidate's Enrolled Programs */}
      {isCandidate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Your Enrolled Programs</CardTitle>
            <CardDescription className="text-xs">
              Programs in which you are registered for skill upgradation and CME credit evaluation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No active program enrollments found. Please contact the Academic Office.
              </p>
            ) : (
              <div className="divide-y border rounded-xl">
                {enrollments.map((enr: any) => (
                  <div
                    key={enr.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{enr.programTitle}</span>
                        <Badge variant="outline" className="text-xs font-mono">
                          {enr.batchCode}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="capitalize text-xs bg-primary/10 text-primary"
                        >
                          {enr.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Specialty: {enr.programSpecialty} • Enrolled:{" "}
                        {new Date(enr.enrolledAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                        <Link to="/doctor-cbt/cbt">
                          <FileCheck className="size-3.5 mr-1" />
                          <span>CBT Tests</span>
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/doctor-cbt/programs">
                          <span>View Topics</span>
                          <ArrowRight className="size-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin Fast Actions */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Administration & Management</CardTitle>
            <CardDescription className="text-xs">
              Quick actions for Academic Coordinators and Module Admins
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              to="/doctor-cbt/candidates"
              className="p-4 rounded-xl border hover:border-primary hover:bg-muted/40 transition flex items-start gap-3"
            >
              <Users className="size-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-foreground">Pre-Enroll Doctors</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add candidate doctors to the Google OAuth & Password whitelist
                </p>
              </div>
            </Link>

            <Link
              to="/doctor-cbt/settings"
              className="p-4 rounded-xl border hover:border-primary hover:bg-muted/40 transition flex items-start gap-3"
            >
              <ShieldCheck className="size-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-foreground">Module Admins & Settings</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Assign module admins from master staff/faculty list and set passing rules
                </p>
              </div>
            </Link>

            <Link
              to="/doctor-cbt/programs"
              className="p-4 rounded-xl border hover:border-primary hover:bg-muted/40 transition flex items-start gap-3"
            >
              <BookOpen className="size-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-foreground">Curriculum & Topics</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure specialty tracks, clinical topics, and assessment blueprints
                </p>
              </div>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
