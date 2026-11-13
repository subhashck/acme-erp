import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
  Users,
  UserPlus,
  Pencil,
  AlertCircle,
  Save,
  Search,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  RefreshCw,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  MapPin,
  CreditCard,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor-cbt/candidates")({
  component: CandidatesPage,
});

function CandidatesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [resetPwdModalOpen, setResetPwdModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");

  // Edit Candidate Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: 0,
    candidateId: "",
    fullName: "",
    email: "",
    originalEmail: "",
    mobile: "",
    address: "",
    universityInstitute: "",
    yearOfPassing: "",
    experience: "",
    nmcSmcNumber: "",
    qualifications: "",
    primarySpecialty: "",
    institutionName: "",
    candidateType: "external_trainee" as "external_trainee" | "internal_staff",
    status: "active" as "enrolled" | "active" | "alumni" | "suspended",
    programId: "",
    batchCode: "ACME-BRM-2601",
    notes: "",
  });

  const openEditDialog = (cand: any) => {
    setSelectedCandidate(cand);
    setEditFormData({
      id: cand.id,
      candidateId: cand.candidateId || "",
      fullName: cand.fullName || "",
      email: cand.email || "",
      originalEmail: cand.email || "",
      mobile: cand.mobile || "",
      address: cand.address || "",
      universityInstitute: cand.universityInstitute || "",
      yearOfPassing: cand.yearOfPassing || "",
      experience: cand.experience || "",
      nmcSmcNumber: cand.nmcSmcNumber || "",
      qualifications: cand.qualifications || "",
      primarySpecialty: cand.primarySpecialty || "",
      institutionName: cand.institutionName || "",
      candidateType: cand.candidateType || "external_trainee",
      status: cand.status || "active",
      programId: cand.programId ? String(cand.programId) : (cand.enrollment?.programId ? String(cand.enrollment.programId) : ""),
      batchCode: cand.batchCode || (cand.enrollment?.batchCode || "ACME-BRM-2601"),
      notes: cand.notes || "",
    });
    setEditModalOpen(true);
  };

  // Form State
  const [formData, setFormData] = useState({
    candidateId: "",
    fullName: "",
    email: "",
    mobile: "",
    address: "",
    universityInstitute: "",
    yearOfPassing: "",
    experience: "",
    nmcSmcNumber: "",
    qualifications: "",
    primarySpecialty: "",
    institutionName: "",
    candidateType: "external_trainee" as "external_trainee" | "internal_staff",
    programId: "",
    batchCode: "ACME-BRM-2601",
    initialPassword: "",
    notes: "",
  });

  // Query Candidates
  const candidatesQuery = useQuery({
    queryKey: ["doctor-cbt-candidates", page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "15",
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      const res = await fetch(`/api/doctor-cbt/candidates?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load candidates");
      return res.json();
    },
  });

  // Query Programs for Dropdown
  const programsQuery = useQuery({
    queryKey: ["doctor-cbt-programs"],
    queryFn: async () => {
      const res = await fetch("/api/doctor-cbt/programs");
      if (!res.ok) throw new Error("Failed to load programs");
      return res.json();
    },
  });

  // Pre-enroll Mutation
  const preEnrollMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/doctor-cbt/candidates/pre-enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pre-enrollment failed");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully pre-enrolled Dr. ${data.fullName}`);
      setEnrollModalOpen(false);
      setFormData({
        candidateId: "",
        fullName: "",
        email: "",
        mobile: "",
        address: "",
        universityInstitute: "",
        yearOfPassing: "",
        experience: "",
        nmcSmcNumber: "",
        qualifications: "",
        primarySpecialty: "",
        institutionName: "",
        candidateType: "external_trainee",
        programId: "",
        batchCode: "ACME-BRM-2601",
        initialPassword: "",
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ["doctor-cbt-candidates"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to pre-enroll doctor candidate");
    },
  });

  // Status Change Mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/doctor-cbt/candidates/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      return data;
    },
    onSuccess: () => {
      toast.success("Candidate status updated.");
      queryClient.invalidateQueries({ queryKey: ["doctor-cbt-candidates"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Password Reset Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ id, newPassword }: { id: number; newPassword: string }) => {
      const res = await fetch(`/api/doctor-cbt/candidates/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      return data;
    },
    onSuccess: () => {
      toast.success("Password reset successfully. Candidate must change on first login.");
      setResetPwdModalOpen(false);
      setNewPassword("");
      setSelectedCandidate(null);
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Full Edit Candidate Mutation
  const updateCandidateMutation = useMutation({
    mutationFn: async (payload: typeof editFormData) => {
      const res = await fetch(`/api/doctor-cbt/candidates/${payload.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          programId: payload.programId ? Number(payload.programId) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update candidate");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Candidate updated successfully.");
      setEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["doctor-cbt-candidates"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update candidate");
    },
  });

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.fullName || !editFormData.email) {
      toast.error("Full name and email are required.");
      return;
    }
    updateCandidateMutation.mutate(editFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.programId) {
      toast.error("Please fill in full name, email, and select a program.");
      return;
    }
    preEnrollMutation.mutate({
      ...formData,
      programId: Number(formData.programId),
    });
  };

  const candidates = candidatesQuery.data?.data || [];
  const pagination = candidatesQuery.data?.pagination || { page: 1, totalPages: 1, totalRecords: 0 };
  const programs = programsQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Doctor Candidates & Whitelist Registry
          </h2>
          <p className="text-xs text-muted-foreground">
            Enrolled doctors authorized to sign in with Google or Email/Password for CBT assessments
          </p>
        </div>

        <Button onClick={() => setEnrollModalOpen(true)} className="gap-2 w-full sm:w-auto">
          <UserPlus className="size-4" />
          <span>Pre-Enroll Doctor</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by doctor name, email, or NMC registration..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs rounded-md border bg-background text-foreground w-full sm:w-44"
            >
              <option value="">All Statuses</option>
              <option value="enrolled">Enrolled</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended (Blocked)</option>
              <option value="alumni">Alumni</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Candidates List Table */}
      <Card>
        <CardContent className="p-0">
          <div className="sm:hidden text-[11px] text-muted-foreground flex items-center gap-1 p-2.5 pb-1">
            <span>👉 Swipe table horizontally to view candidate profiles & actions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-muted/50 border-b text-muted-foreground uppercase text-[10px] tracking-wider whitespace-nowrap">
                <tr>
                  <th className="px-4 py-3">Candidate / Doctor</th>
                  <th className="px-4 py-3">Address & Origin</th>
                  <th className="px-4 py-3">Qualifications & College</th>
                  <th className="px-4 py-3">Fee Payment Status</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {candidatesQuery.isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading candidates directory...
                    </td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No doctor candidates found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  candidates.map((cand: any) => (
                    <tr key={cand.id} className="hover:bg-muted/30 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-sm">
                            {cand.fullName.startsWith("Dr.") || cand.fullName.startsWith("DR.") ? cand.fullName : `Dr. ${cand.fullName}`}
                          </span>
                          {cand.candidateId && (
                            <Badge variant="outline" className="font-mono text-[10px] bg-primary/5 text-primary border-primary/20">
                              {cand.candidateId}
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Mail className="size-3" />
                          <span>{cand.email}</span>
                          {cand.mobile && (
                            <>
                              <span>•</span>
                              <Phone className="size-3" />
                              <span>{cand.mobile}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground flex items-center gap-1.5">
                          <MapPin className="size-3 text-muted-foreground shrink-0" />
                          <span>{cand.address || "—"}</span>
                        </div>
                        <div className="text-muted-foreground text-[11px] flex items-center gap-1.5 mt-0.5">
                          <Building className="size-3 text-muted-foreground shrink-0" />
                          <span>{cand.institutionName || (cand.candidateType === "internal_staff" ? "ACME Hospital" : "External Trainee")}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground flex items-center gap-1.5">
                          <GraduationCap className="size-3 text-muted-foreground shrink-0" />
                          <span>{cand.qualifications || "MBBS"}</span>
                        </div>
                        <div className="text-muted-foreground text-[11px] mt-0.5">
                          {cand.universityInstitute ? `${cand.universityInstitute}` : ""}
                          {cand.yearOfPassing ? ` (${cand.yearOfPassing})` : ""}
                          {cand.experience ? ` • ${cand.experience}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {cand.totalPaid > 0 ? (
                          <div>
                            <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CreditCard className="size-3" />
                              <span>₹{Number(cand.totalPaid).toLocaleString("en-IN")}</span>
                              {cand.latestPayment?.paymentTerm && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal">
                                  {cand.latestPayment.paymentTerm}
                                </Badge>
                              )}
                            </div>
                            <div className="text-muted-foreground text-[10px] mt-0.5">
                              {cand.latestPayment?.paymentMode}
                              {cand.latestPayment?.transactionId && ` • UTR: ${cand.latestPayment.transactionId}`}
                              {cand.latestPayment?.paymentDate && ` (${cand.latestPayment.paymentDate})`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Unpaid</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {cand.status === "suspended" ? (
                          <Badge variant="destructive" className="capitalize text-[11px] gap-1">
                            <ShieldAlert className="size-3" />
                            Suspended
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="capitalize text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-1"
                          >
                            <ShieldCheck className="size-3" />
                            {cand.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                          onClick={() => openEditDialog(cand)}
                        >
                          <Pencil className="size-3 mr-1" />
                          Edit
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedCandidate(cand);
                            setResetPwdModalOpen(true);
                          }}
                        >
                          <KeyRound className="size-3 mr-1" />
                          Password
                        </Button>

                        {cand.status === "suspended" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                            onClick={() => statusMutation.mutate({ id: cand.id, status: "active" })}
                          >
                            Activate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() =>
                              statusMutation.mutate({ id: cand.id, status: "suspended" })
                            }
                          >
                            Suspend
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.totalRecords} total
                candidates)
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pre-Enroll Doctor Dialog */}
      <Dialog open={enrollModalOpen} onOpenChange={setEnrollModalOpen}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="w-[95vw] max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Pre-Enroll Doctor Candidate
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add doctor to the whitelist for pre-checked Google OAuth or Email & Password login
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Personal & Professional Profile */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Doctor Professional Profile
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="candidateId" className="text-xs font-semibold">
                    Candidate ID / Roll No.
                  </Label>
                  <Input
                    id="candidateId"
                    placeholder="e.g. ACME-BRM-260107"
                    value={formData.candidateId}
                    onChange={(e) => setFormData({ ...formData, candidateId: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs font-semibold">
                    Full Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Email (Google Account / Login) <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="dr.rajesh@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mobile" className="text-xs font-semibold">
                    Mobile Number
                  </Label>
                  <Input
                    id="mobile"
                    placeholder="+91 9876543210"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nmcSmcNumber" className="text-xs font-semibold">
                    NMC / State Council No.
                  </Label>
                  <Input
                    id="nmcSmcNumber"
                    placeholder="e.g. MCI-2018-098765"
                    value={formData.nmcSmcNumber}
                    onChange={(e) => setFormData({ ...formData, nmcSmcNumber: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="primarySpecialty" className="text-xs font-semibold">
                    Primary Specialty
                  </Label>
                  <Input
                    id="primarySpecialty"
                    placeholder="e.g. Reproductive Medicine, OBGY"
                    value={formData.primarySpecialty}
                    onChange={(e) => setFormData({ ...formData, primarySpecialty: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="qualifications" className="text-xs font-semibold">
                    Qualifications
                  </Label>
                  <Input
                    id="qualifications"
                    placeholder="e.g. MBBS, MS OBGY"
                    value={formData.qualifications}
                    onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="universityInstitute" className="text-xs font-semibold">
                    Medical College / Institute
                  </Label>
                  <Input
                    id="universityInstitute"
                    placeholder="e.g. JNIMS / RIMS / JIPMER"
                    value={formData.universityInstitute}
                    onChange={(e) => setFormData({ ...formData, universityInstitute: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="yearOfPassing" className="text-xs font-semibold">
                    Year of Passing
                  </Label>
                  <Input
                    id="yearOfPassing"
                    placeholder="e.g. 2023"
                    value={formData.yearOfPassing}
                    onChange={(e) => setFormData({ ...formData, yearOfPassing: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="address" className="text-xs font-semibold">
                    Address / Location
                  </Label>
                  <Input
                    id="address"
                    placeholder="e.g. Singjamei, Imphal"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="institutionName" className="text-xs font-semibold">
                    Hospital / Institution Affiliation
                  </Label>
                  <Input
                    id="institutionName"
                    placeholder="Current hospital, medical college, or clinic"
                    value={formData.institutionName}
                    onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="candidateType" className="text-xs font-semibold">
                    Candidate Origin
                  </Label>
                  <select
                    id="candidateType"
                    value={formData.candidateType}
                    onChange={(e: any) => setFormData({ ...formData, candidateType: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded-md border bg-background"
                  >
                    <option value="external_trainee">External Trainee Doctor</option>
                    <option value="internal_staff">Internal Hospital Staff Doctor</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="experience" className="text-xs font-semibold">
                    Clinical / Professional Experience
                  </Label>
                  <Input
                    id="experience"
                    placeholder="e.g. ENT Dept. JNIMS, 8 Months / MO at PHC"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Program & Batch Selection */}
            <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-xs font-bold text-foreground">Program Enrollment & Cohort</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="programId" className="text-xs font-semibold">
                    Skill Upgradation Program <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="programId"
                    value={formData.programId}
                    onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded-md border bg-background"
                    required
                  >
                    <option value="">Select a Program</option>
                    {programs.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1 space-y-1.5">
                  <Label htmlFor="batchCode" className="text-xs font-semibold">
                    Batch Code
                  </Label>
                  <Input
                    id="batchCode"
                    value={formData.batchCode}
                    onChange={(e) => setFormData({ ...formData, batchCode: e.target.value })}
                    placeholder="2026-Q1"
                  />
                </div>
              </div>
            </div>

            {/* Optional Initial Password */}
            <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <Label htmlFor="initialPassword" className="text-xs font-bold text-foreground">
                    Initial Password (Optional for Email/Password Sign-In)
                  </Label>
                </div>
                <Badge variant="outline" className="text-[10px]">Optional</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <Input
                  id="initialPassword"
                  type="password"
                  placeholder="Min 6 chars (leave blank for Google OAuth only)"
                  value={formData.initialPassword}
                  onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Leave blank to restrict the candidate exclusively to whitelisted Google OAuth. If a password is set, the candidate can sign in using email & password and will be prompted to update it on initial access.
                </p>
              </div>
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEnrollModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={preEnrollMutation.isPending} className="w-full sm:w-auto">
                {preEnrollMutation.isPending ? "Pre-Enrolling..." : "Complete Pre-Enrollment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={resetPwdModalOpen} onOpenChange={setResetPwdModalOpen}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="w-[95vw] max-w-md p-4 sm:p-6"
        >
          <DialogHeader>
            <DialogTitle>Reset Candidate Password</DialogTitle>
            <DialogDescription className="text-xs">
              Set a temporary password for Dr. {selectedCandidate?.fullName}. The candidate will be
              required to update it upon sign in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="resetNewPwd" className="text-xs font-semibold">
              New Temporary Password
            </Label>
            <Input
              id="resetNewPwd"
              type="password"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setResetPwdModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              disabled={newPassword.length < 6 || resetPasswordMutation.isPending}
              className="w-full sm:w-auto"
              onClick={() => {
                if (selectedCandidate) {
                  resetPasswordMutation.mutate({
                    id: selectedCandidate.id,
                    newPassword,
                  });
                }
              }}
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Save Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Doctor Candidate Dialog */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="w-[95vw] max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Doctor Candidate Profile
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update candidate demographics, clinical credentials, program enrollment, and sign-in email identity.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-5">
            {/* Personal & Professional Profile */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Professional Credentials & Demographics
                </h4>
                <Badge variant="outline" className="text-[10px] font-mono">
                  DB ID: #{editFormData.id}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="editCandidateId" className="text-xs font-semibold">
                    Candidate ID / Roll No.
                  </Label>
                  <Input
                    id="editCandidateId"
                    placeholder="e.g. ACME-BRM-260107"
                    value={editFormData.candidateId}
                    onChange={(e) => setEditFormData({ ...editFormData, candidateId: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editFullName" className="text-xs font-semibold">
                    Full Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="editFullName"
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={editFormData.fullName}
                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editStatus" className="text-xs font-semibold">
                    Enrollment Status
                  </Label>
                  <select
                    id="editStatus"
                    value={editFormData.status}
                    onChange={(e: any) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded-md border bg-background"
                  >
                    <option value="enrolled">Enrolled</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended (Blocked from Login/Exams)</option>
                    <option value="alumni">Alumni</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editMobile" className="text-xs font-semibold">
                    Mobile Number
                  </Label>
                  <Input
                    id="editMobile"
                    placeholder="+91 9876543210"
                    value={editFormData.mobile}
                    onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editNmcSmcNumber" className="text-xs font-semibold">
                    NMC / State Council Reg No.
                  </Label>
                  <Input
                    id="editNmcSmcNumber"
                    placeholder="e.g. 52144 (MCI / SMC)"
                    value={editFormData.nmcSmcNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, nmcSmcNumber: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editQualifications" className="text-xs font-semibold">
                    Medical Qualifications
                  </Label>
                  <Input
                    id="editQualifications"
                    placeholder="e.g. MBBS, DGO, MS (OBG)"
                    value={editFormData.qualifications}
                    onChange={(e) => setEditFormData({ ...editFormData, qualifications: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editPrimarySpecialty" className="text-xs font-semibold">
                    Specialty / Department
                  </Label>
                  <Input
                    id="editPrimarySpecialty"
                    placeholder="e.g. Reproductive Medicine / Gynaecology"
                    value={editFormData.primarySpecialty}
                    onChange={(e) => setEditFormData({ ...editFormData, primarySpecialty: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editUniversityInstitute" className="text-xs font-semibold">
                    Medical College / Institute
                  </Label>
                  <Input
                    id="editUniversityInstitute"
                    placeholder="e.g. RIMS, Imphal"
                    value={editFormData.universityInstitute}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, universityInstitute: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editYearOfPassing" className="text-xs font-semibold">
                    Year of Passing
                  </Label>
                  <Input
                    id="editYearOfPassing"
                    placeholder="e.g. 2023"
                    value={editFormData.yearOfPassing}
                    onChange={(e) => setEditFormData({ ...editFormData, yearOfPassing: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="editAddress" className="text-xs font-semibold">
                    Address / Location
                  </Label>
                  <Input
                    id="editAddress"
                    placeholder="e.g. Singjamei, Imphal"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="editInstitutionName" className="text-xs font-semibold">
                    Hospital / Institution Affiliation
                  </Label>
                  <Input
                    id="editInstitutionName"
                    placeholder="Current hospital or clinic"
                    value={editFormData.institutionName}
                    onChange={(e) => setEditFormData({ ...editFormData, institutionName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="editCandidateType" className="text-xs font-semibold">
                    Candidate Origin
                  </Label>
                  <select
                    id="editCandidateType"
                    value={editFormData.candidateType}
                    onChange={(e: any) => setEditFormData({ ...editFormData, candidateType: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded-md border bg-background"
                  >
                    <option value="external_trainee">External Trainee Doctor</option>
                    <option value="internal_staff">Internal Hospital Staff Doctor</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                  <Label htmlFor="editExperience" className="text-xs font-semibold">
                    Clinical / Professional Experience
                  </Label>
                  <Input
                    id="editExperience"
                    placeholder="e.g. ENT Dept. JNIMS, 8 Months / MO at PHC"
                    value={editFormData.experience}
                    onChange={(e) => setEditFormData({ ...editFormData, experience: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Login Email Synchronization Section */}
            <div className="p-4 rounded-xl border bg-primary/5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <Label htmlFor="editEmail" className="text-xs font-bold text-foreground">
                    Sign-In Email & Whitelist Identity <span className="text-rose-500">*</span>
                  </Label>
                </div>
                {editFormData.email.trim().toLowerCase() !== editFormData.originalEmail.trim().toLowerCase() && (
                  <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-300 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                    ⚠️ Email changed: will update auth account from {editFormData.originalEmail}
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <Input
                  id="editEmail"
                  type="email"
                  placeholder="doctor.name@gmail.com"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  required
                />
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  <strong>Email tied to login:</strong> Candidate signs in using Google OAuth or Email/Password with this address. Updating it automatically synchronizes their login identity while preserving all exam scores, attempts, and certificate records.
                </div>
              </div>
            </div>

            {/* Program & Cohort Selection */}
            <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-xs font-bold text-foreground">Program Enrollment & Cohort</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="editProgramId" className="text-xs font-semibold">
                    Skill Upgradation Program
                  </Label>
                  <select
                    id="editProgramId"
                    value={editFormData.programId}
                    onChange={(e) => setEditFormData({ ...editFormData, programId: e.target.value })}
                    className="w-full h-9 px-3 text-xs rounded-md border bg-background"
                  >
                    <option value="">Select a Program</option>
                    {programs.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1 space-y-1.5">
                  <Label htmlFor="editBatchCode" className="text-xs font-semibold">
                    Batch Code
                  </Label>
                  <Input
                    id="editBatchCode"
                    value={editFormData.batchCode}
                    onChange={(e) => setEditFormData({ ...editFormData, batchCode: e.target.value })}
                    placeholder="ACME-BRM-2601"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="editNotes" className="text-xs font-semibold">
                Internal Administrative Notes
              </Label>
              <textarea
                id="editNotes"
                rows={2}
                placeholder="Optional administrative observations or sponsorship notes..."
                value={editFormData.notes}
                onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                className="w-full text-xs p-2.5 rounded-md border bg-background"
              />
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateCandidateMutation.isPending} className="w-full sm:w-auto gap-1.5">
                <Save className="size-4" />
                {updateCandidateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
