import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Award,
  Building2,
  GraduationCap,
  Calendar,
  Briefcase,
  ShieldCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  Stethoscope,
  BookOpen,
  Info,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor-cbt/profile")({
  component: DoctorProfilePage,
});

function DoctorProfilePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const meQuery = useQuery({
    queryKey: ["doctor-cbt-me"],
    queryFn: async () => {
      const res = await fetch("/api/doctor-cbt/me");
      if (!res.ok) throw new Error("Failed to load profile details");
      return res.json();
    },
  });

  const profile = meQuery.data?.doctorProfile;
  const user = meQuery.data?.user;
  const enrollments = meQuery.data?.enrollments || [];

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    address: "",
    qualifications: "",
    nmcSmcNumber: "",
    primarySpecialty: "",
    institutionName: "",
    universityInstitute: "",
    yearOfPassing: "",
    experience: "",
  });

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || "",
        email: profile.email || "",
        mobile: profile.mobile || "",
        address: profile.address || "",
        qualifications: profile.qualifications || "",
        nmcSmcNumber: profile.nmcSmcNumber || "",
        primarySpecialty: profile.primarySpecialty || "",
        institutionName: profile.institutionName || "",
        universityInstitute: profile.universityInstitute || "",
        yearOfPassing: profile.yearOfPassing || "",
        experience: profile.experience || "",
      });
    } else if (user) {
      // If user has no doctor profile yet (e.g. admin or new user)
      setFormData((prev) => ({
        ...prev,
        fullName: user.name || "",
        email: user.email || "",
      }));
    }
  }, [profile, user]);

  const updateMutation = useMutation({
    mutationFn: async (updatedValues: typeof formData) => {
      const res = await fetch("/api/doctor-cbt/me/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedValues),
      });

      // Also try PATCH if method not allowed
      if (res.status === 405 || !res.ok) {
        const patchRes = await fetch("/api/doctor-cbt/me/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedValues),
        });
        if (!patchRes.ok) {
          const err = await patchRes.json().catch(() => ({}));
          throw new Error(err.error || "Failed to update profile");
        }
        return patchRes.json();
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["doctor-cbt-me"] });
      toast.success(data.message || "Your profile has been updated successfully.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Could not save profile changes.");
    },
  });

  const handleCancel = () => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || "",
        email: profile.email || "",
        mobile: profile.mobile || "",
        address: profile.address || "",
        qualifications: profile.qualifications || "",
        nmcSmcNumber: profile.nmcSmcNumber || "",
        primarySpecialty: profile.primarySpecialty || "",
        institutionName: profile.institutionName || "",
        universityInstitute: profile.universityInstitute || "",
        yearOfPassing: profile.yearOfPassing || "",
        experience: profile.experience || "",
      });
    }
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate({ to: "/doctor-cbt" });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      toast.error("Full Name cannot be empty.");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email Address cannot be empty.");
      return;
    }
    updateMutation.mutate(formData);
  };

  if (meQuery.isLoading) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
        <RotateCcw className="size-5 animate-spin text-primary" />
        <span>Loading your profile details...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Profile Summary */}
      <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-background p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Stethoscope className="size-6 sm:size-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
                  {formData.fullName || "Doctor Profile"}
                </h1>
                {profile?.status && (
                  <Badge
                    className={`text-[10px] sm:text-xs capitalize font-bold ${
                      profile.status === "active" || profile.status === "enrolled"
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {profile.status}
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {formData.qualifications ? `${formData.qualifications} • ` : ""}
                {formData.primarySpecialty || "Doctor Skill Upgradation Candidate"}
              </p>
            </div>
          </div>

          {/* Monospace Candidate ID and Stats */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {profile?.candidateId && (
              <div className="px-3 py-1.5 rounded-xl bg-background/80 border text-xs font-mono">
                <span className="text-muted-foreground mr-1 text-[10px] uppercase">ID:</span>
                <strong className="text-primary">{profile.candidateId}</strong>
              </div>
            )}
            {formData.nmcSmcNumber && (
              <div className="px-3 py-1.5 rounded-xl bg-background/80 border text-xs font-mono">
                <span className="text-muted-foreground mr-1 text-[10px] uppercase">NMC:</span>
                <strong className="text-foreground">{formData.nmcSmcNumber}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Program Enrollments Card (Read-only status) */}
      {enrollments.length > 0 && (
        <Card className="border rounded-2xl shadow-xs">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-foreground">
              <BookOpen className="size-4 text-primary" />
              <span>Academic Program & Batch Enrollment</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Your active training curriculum and examination track.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {enrollments.map((enr: any) => (
                <div key={enr.id} className="p-3 rounded-xl border bg-muted/30 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-foreground truncate">{enr.programTitle}</span>
                    <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                      {enr.batchCode}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>Specialty: {enr.programSpecialty}</span>
                    <span className="capitalize font-semibold text-primary">{enr.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Modification Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal & Contact Information */}
        <Card className="border rounded-2xl shadow-xs">
          <CardHeader className="p-4 sm:p-6 pb-3">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <User className="size-4 text-primary" />
              <span>Personal & Contact Information</span>
            </CardTitle>
            <CardDescription className="text-xs">
              These details are used for official certificates and examination notices.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 pt-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <User className="size-3 text-muted-foreground" />
                  <span>Full Name *</span>
                </label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Dr. Jane Doe"
                  className="text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Mail className="size-3 text-muted-foreground" />
                  <span>Email Address * (Login Account)</span>
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="doctor@hospital.org"
                  className="text-xs sm:text-sm"
                  required
                />
                <p className="text-[10px] text-muted-foreground">
                  Synchronized with Google OAuth & password sign-in.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Phone className="size-3 text-muted-foreground" />
                  <span>Mobile / WhatsApp Number</span>
                </label>
                <Input
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  placeholder="e.g. +91 9876543210"
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="size-3 text-muted-foreground" />
                  <span>Residential / Clinic Address</span>
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="City, State, Postal Code"
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Clinical & Medical Qualifications */}
        <Card className="border rounded-2xl shadow-xs">
          <CardHeader className="p-4 sm:p-6 pb-3">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Award className="size-4 text-primary" />
              <span>Medical Credentials & Qualifications</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Verified clinical registrations for NABH-compliant CME audit and scoring.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 pt-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-3 text-primary" />
                  <span>NMC / SMC Registration Number</span>
                </label>
                <Input
                  value={formData.nmcSmcNumber}
                  onChange={(e) => setFormData({ ...formData, nmcSmcNumber: e.target.value })}
                  placeholder="e.g. MCI-12345 or State Council No."
                  className="text-xs sm:text-sm font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <GraduationCap className="size-3 text-muted-foreground" />
                  <span>Medical Degrees / Qualifications</span>
                </label>
                <Input
                  value={formData.qualifications}
                  onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                  placeholder="e.g. MBBS, MD, MS (OBGY), DNB"
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Stethoscope className="size-3 text-muted-foreground" />
                  <span>Primary Specialty / Track</span>
                </label>
                <Input
                  value={formData.primarySpecialty}
                  onChange={(e) => setFormData({ ...formData, primarySpecialty: e.target.value })}
                  placeholder="e.g. Reproductive Medicine, Critical Care"
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Building2 className="size-3 text-muted-foreground" />
                  <span>Hospital / Practice Affiliation</span>
                </label>
                <Input
                  value={formData.institutionName}
                  onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                  placeholder="Current hospital or clinic name"
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <GraduationCap className="size-3 text-muted-foreground" />
                  <span>Medical College / University</span>
                </label>
                <Input
                  value={formData.universityInstitute}
                  onChange={(e) => setFormData({ ...formData, universityInstitute: e.target.value })}
                  placeholder="Institute of graduation / post-grad"
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="size-3 text-muted-foreground" />
                  <span>Year of Passing</span>
                </label>
                <Input
                  value={formData.yearOfPassing}
                  onChange={(e) => setFormData({ ...formData, yearOfPassing: e.target.value })}
                  placeholder="e.g. 2021"
                  className="text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Briefcase className="size-3 text-muted-foreground" />
                  <span>Clinical Experience & Residency</span>
                </label>
                <Input
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  placeholder="e.g. 3 years residency in Dept. of Obstetrics & Gynaecology"
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="p-4 sm:p-6 border-t bg-muted/20 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
              className="w-full sm:w-auto text-xs font-semibold"
            >
              <X className="size-3.5 mr-1.5" />
              <span>Cancel</span>
            </Button>

            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={updateMutation.isPending}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-6"
            >
              {updateMutation.isPending ? (
                <>
                  <RotateCcw className="size-3.5 mr-1.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5 mr-1.5" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
