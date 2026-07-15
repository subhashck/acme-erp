import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { ArrowLeft, Edit2, User, ShieldCheck, AlertTriangle, History, ChevronRight, BriefcaseBusiness, IdCard, UserRound, GraduationCap, Building2, Users } from "lucide-react";
import { useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { ModuleLayout } from "../../../components/ModuleLayout";
import type { StaffRow } from "../../../types";
import { z } from "zod";
import { cn } from "../../../lib/utils";
import { authClient } from "../../../services/auth";

export const Route = createFileRoute("/_authenticated/hr/view-staff")({
  validateSearch: z.object({
    staffId: z.number(),
    /** Optional version number — if omitted, the active version is shown. */
    version: z.number().optional(),
  }),
  component: ViewStaff
});

function ViewStaff() {
  const { staffId, version } = Route.useSearch();
  const navigate = useNavigate();

  const session = authClient.useSession();
  const isAdminOrHr = session.data?.user?.role === "admin" || session.data?.user?.role === "hr";
  
  const currentUserId = session.data?.user?.id;
  const currentUserEmail = session.data?.user?.email;

  // If a version is specified, fetch that specific historical version
  const specificVersionQuery = useRpcQuery<StaffRow>(
    ["staff", staffId, "version", version],
    () => (client.hr.staff[":id"] as any)["version"][":ver"].$get({
      param: { id: String(staffId), ver: String(version) }
    }),
    { enabled: version !== undefined }
  );

  // Otherwise fetch the active version
  const activeVersionQuery = useRpcQuery<StaffRow>(
    ["staff", staffId],
    () => client.hr.staff[":id"].$get({ param: { id: String(staffId) } }),
    { enabled: version === undefined }
  );

  const employeeQuery = version !== undefined ? specificVersionQuery : activeVersionQuery;
  const employee = employeeQuery.data;

  const versionsQuery = useRpcQuery<StaffRow[]>(["staff", staffId, "versions"], () =>
    client.hr.staff[":id"].versions.$get({ param: { id: String(staffId) } })
  );

  const activeVersion = versionsQuery.data?.find((v) => v.active);
  const isViewingHistorical = version !== undefined && !employee?.active;

  const isSelf = employee?.userId === currentUserId || employee?.email === currentUserEmail;
  const canViewSensitive = isAdminOrHr || isSelf;

  const maskString = (str: string | undefined | null) => str ? "••••••••" + str.slice(-4) : "N/A";

  // For HR profile and supervisors, always use the staffId + the version being viewed
  const viewedVersion = employee?.version;

  const hrProfileQuery = useRpcQuery<any>(
    ["staff-hr-profile", staffId, viewedVersion],
    () => client.hr.staff[":id"].profile.$get({ param: { id: String(staffId) } }),
    { enabled: viewedVersion !== undefined && !version }
  );
  const profile = hrProfileQuery.data;

  const supervisorsQuery = useRpcQuery<any>(
    ["staff-supervisors", staffId, viewedVersion],
    () => (client.hr.staff[":id"].supervisors as any).$get({ 
      param: { id: String(staffId) },
      query: { version: viewedVersion ? String(viewedVersion) : undefined }
    }),
    { enabled: viewedVersion !== undefined }
  );
  const supervisorsData = supervisorsQuery.data;

  const isLoading = employeeQuery.isLoading || versionsQuery.isLoading || hrProfileQuery.isLoading || supervisorsQuery.isLoading;

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
          {employee.active && isAdminOrHr && (
            <Button asChild>
              <Link to="/hr/add-staff" search={{ staffId: employee.staffId }}>
                <Edit2 size={16} className="mr-2" /> Edit Details
              </Link>
            </Button>
          )}
        </div>
      }
    >
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Warning Banner for Historical Version */}
        {isViewingHistorical && (
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
              <Button variant="outline" asChild className="border-amber-500/30 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 self-start sm:self-auto">
                <Link to="/hr/view-staff" search={{ staffId: activeVersion.staffId }}>
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
                <CardTitle className="text-base">Personal &amp; Contact Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                  <span className="text-muted-foreground font-medium">Email</span>
                  <span className="font-semibold text-foreground break-all">{employee.email || "N/A"}</span>
                  
                  <span className="text-muted-foreground font-medium">Phone</span>
                  <span className="font-semibold text-foreground">{employee.phone || "N/A"}</span>
                  
                  <span className="text-muted-foreground font-medium">Aadhar Number</span>
                  <span className="font-semibold text-foreground font-mono">
                    {canViewSensitive ? (employee.aadhar || "N/A") : maskString(employee.aadhar)}
                  </span>
                  
                  <span className="text-muted-foreground font-medium">PAN Number</span>
                  <span className="font-semibold text-foreground font-mono uppercase">
                    {canViewSensitive ? (employee.pan || "N/A") : maskString(employee.pan)}
                  </span>

                  <span className="text-muted-foreground font-medium">Last Updated</span>
                  <span className="font-semibold text-foreground">
                    {employee.createdAt ? new Date(employee.createdAt).toLocaleString() : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            {/* Employment & Compliance */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <BriefcaseBusiness className="text-muted-foreground" size={18} />
                <CardTitle className="text-base">Employment &amp; Compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                  <span className="text-muted-foreground font-medium">Date of Joining</span>
                  <span className="font-semibold text-foreground">{profile?.dateOfJoining || "N/A"}</span>
                  
                  <span className="text-muted-foreground font-medium">Last Working Date</span>
                  <span className="font-semibold text-foreground">{profile?.lastWorkingDate || "N/A"}</span>

                  {canViewSensitive && (
                    <>
                      <span className="text-muted-foreground font-medium">EPF Number</span>
                      <span className="font-semibold text-foreground font-mono">{profile?.epfNumber || "N/A"}</span>
                      
                      <span className="text-muted-foreground font-medium">ESI Number</span>
                      <span className="font-semibold text-foreground font-mono">{profile?.esiNumber || "N/A"}</span>

                      <span className="text-muted-foreground font-medium">MNC Registration No</span>
                      <span className="font-semibold text-foreground font-mono">{profile?.mncRegistrationNo || "N/A"}</span>

                      <span className="text-muted-foreground font-medium">MNC Validity Upto</span>
                      <span className="font-semibold text-foreground">{profile?.mncValidityUpto || "N/A"}</span>

                      <span className="text-muted-foreground font-medium">MMC Registration No</span>
                      <span className="font-semibold text-foreground font-mono">{profile?.mmcRegistrationNo || "N/A"}</span>

                      <span className="text-muted-foreground font-medium">MMC Validity Upto</span>
                      <span className="font-semibold text-foreground">{profile?.mmcValidityUpto || "N/A"}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bank Details */}
            {canViewSensitive && (
              <Card>
                <CardHeader className="flex flex-row items-center gap-2">
                  <IdCard className="text-muted-foreground" size={18} />
                  <CardTitle className="text-base">Bank Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                    <span className="text-muted-foreground font-medium">Bank Name</span>
                    <span className="font-semibold text-foreground">{(employee as any).bankName || "N/A"}</span>
                    
                    <span className="text-muted-foreground font-medium">Account Number</span>
                    <span className="font-semibold text-foreground font-mono">{(employee as any).accountNumber || "N/A"}</span>

                    <span className="text-muted-foreground font-medium">IFSC Code</span>
                    <span className="font-semibold text-foreground font-mono">{(employee as any).ifscCode || "N/A"}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Demographics & Family Details */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <UserRound className="text-muted-foreground" size={18} />
                <CardTitle className="text-base">Demographics &amp; Family Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                  <span className="text-muted-foreground font-medium">Sex</span>
                  <span className="font-semibold text-foreground">{profile?.gender || "N/A"}</span>

                  <span className="text-muted-foreground font-medium">Date of Birth</span>
                  <span className="font-semibold text-foreground">
                    {profile?.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "N/A"}
                  </span>

                  <span className="text-muted-foreground font-medium">Religion</span>
                  <span className="font-semibold text-foreground">{profile?.religion || "N/A"}</span>

                  <span className="text-muted-foreground font-medium">Marital Status</span>
                  <span className="font-semibold text-foreground">{profile?.maritalStatus || "N/A"}</span>

                  {profile?.maritalStatus === "Married" && (
                    <>
                      <span className="text-muted-foreground font-medium">Spouse's Name</span>
                      <span className="font-semibold text-foreground">{profile?.spouseName || "N/A"}</span>
                    </>
                  )}

                  <span className="text-muted-foreground font-medium">Current Address</span>
                  <span className="font-semibold text-foreground break-words">{profile?.currentAddress || "N/A"}</span>

                  <span className="text-muted-foreground font-medium">Permanent Address</span>
                  <span className="font-semibold text-foreground break-words">{profile?.permanentAddress || "N/A"}</span>

                  <span className="text-muted-foreground font-medium">Father's Name</span>
                  <span className="font-semibold text-foreground">{profile?.fatherName || "N/A"}</span>
                  
                  <span className="text-muted-foreground font-medium">Mother's Name</span>
                  <span className="font-semibold text-foreground">{profile?.motherName || "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Nominee Details */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Users className="text-muted-foreground" size={18} />
                <CardTitle className="text-base">Nominee Details</CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(profile?.nominees) && profile.nominees.length > 0 ? (
                  <div className="space-y-4">
                    {profile.nominees.map((nom: any, i: number) => (
                      <div key={i} className="border-l-2 border-primary/20 pl-4 py-1">
                        <p className="font-semibold text-sm">{nom.name}</p>
                        <p className="text-xs text-muted-foreground">Relationship: {nom.relationship}</p>
                        <p className="text-xs text-muted-foreground">Share Percentage: {nom.percentage}%</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No nominee details recorded.</p>
                )}
              </CardContent>
            </Card>

            {/* Education History */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <GraduationCap className="text-muted-foreground" size={18} />
                <CardTitle className="text-base">Education History</CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(profile?.educationHistory) && profile.educationHistory.length > 0 ? (
                  <div className="space-y-4">
                    {profile.educationHistory.map((edu: any, i: number) => (
                      <div key={i} className="border-l-2 border-primary/20 pl-4 py-1">
                        <p className="font-semibold text-sm">{edu.qualification}</p>
                        <p className="text-xs text-muted-foreground">{edu.institution}</p>
                        <p className="text-xs text-muted-foreground">Year: {edu.year} | Grade: {edu.grade}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No education history recorded.</p>
                )}
              </CardContent>
            </Card>

            {/* Professional History */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Building2 className="text-muted-foreground" size={18} />
                <CardTitle className="text-base">Professional History</CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(profile?.professionalHistory) && profile.professionalHistory.length > 0 ? (
                  <div className="space-y-4">
                    {profile.professionalHistory.map((job: any, i: number) => (
                      <div key={i} className="border-l-2 border-primary/20 pl-4 py-1">
                        <p className="font-semibold text-sm">{job.designation}</p>
                        <p className="text-xs text-muted-foreground">{job.employer}</p>
                        <p className="text-xs text-muted-foreground">{job.from} - {job.to}</p>
                        {job.responsibilities && <p className="text-xs text-muted-foreground mt-1">{job.responsibilities}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No professional history recorded.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Supervisory Hierarchy Sidebar */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <div className="flex items-center gap-2">
                  <Users className="text-muted-foreground" size={18} />
                  <CardTitle className="text-base">Supervisors</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="space-y-3">
                  {supervisorsData?.hasExplicitEntry ? (
                    <>
                      <div className="text-sm">
                        <span className="text-muted-foreground font-medium block">Supervisor 1</span>
                        <span className="font-semibold">{supervisorsData.explicitSupervisors?.supervisor1?.name || "Not assigned"}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground font-medium block">Supervisor 2</span>
                        <span className="font-semibold">{supervisorsData.explicitSupervisors?.supervisor2?.name || "Not assigned"}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm">
                        <span className="text-muted-foreground font-medium block">Department Head</span>
                        <span className="font-semibold">{supervisorsData?.defaultSupervisors?.supervisor1?.name || "None"}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground font-medium block">Subhead</span>
                        <span className="font-semibold">{supervisorsData?.defaultSupervisors?.supervisor2?.name || "None"}</span>
                      </div>
                      <p className="text-xs text-muted-foreground pt-1">
                        Assigned automatically via department.
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Version History Sidebar */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <History className="text-muted-foreground" size={18} />
                <CardTitle className="text-base">Version History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {versionsQuery.data?.map((v) => {
                  const isCurrentlyViewed =
                    version !== undefined
                      ? v.version === version
                      : v.active;
                  return (
                    <Link
                      key={v.version}
                      to="/hr/view-staff"
                      search={v.active
                        ? { staffId: v.staffId }
                        : { staffId: v.staffId, version: v.version }
                      }
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border text-sm transition-colors",
                        isCurrentlyViewed
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
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ModuleLayout>
  );
}
