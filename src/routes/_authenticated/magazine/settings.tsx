import { createFileRoute, Link } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Badge } from "@/ui/badge";
import {
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  ShieldAlert,
  CalendarCheck,
  Copyright,
  Sparkles,
  Save,
  RotateCcw,
  Eye,
  Image as ImageIcon,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sun,
  Moon,
  Trash2,
  Layers,
} from "lucide-react";
import * as React from "react";
import { useUserPermissions } from "@/lib/permissions";
import { MediaLibraryDialog } from "@/components/magazine/MediaLibraryDialog";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

export const Route = createFileRoute("/_authenticated/magazine/settings")({
  component: MagazineHospitalSettingsPage,
});

interface HospitalSettingsResponse {
  id?: number;
  name: string;
  tagline?: string | null;
  logoUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  emergencyPhone?: string | null;
  opdPhone?: string | null;
  editorialDivision?: string | null;
  copyrightText?: string | null;
}

const DEFAULT_SETTINGS = {
  name: "ACME Hospital & Healthcare",
  tagline: "Excellence in Medical Care, Research & Healthcare Innovation",
  address: "123 Healthcare Ave, Medical District, Healthcare Campus",
  phone: "+91 98765 43210",
  email: "editorial@acmehospital.com",
  website: "www.acmehospital.com",
  emergencyPhone: "+91 98765 43211",
  opdPhone: "+91 98765 43212",
  editorialDivision: "ACME Healthcare Communications & Editorial Division",
  copyrightText: "ACME Monthly Electronic Magazine. All rights reserved.",
  logoUrl: "",
};

export function MagazineHospitalSettingsPage() {
  const queryClient = useQueryClient();
  const { canManageMagazine, isAdmin } = useUserPermissions();

  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = React.useState(false);
  const [previewTheme, setPreviewTheme] = React.useState<"dark" | "light">("dark");
  const [previewTab, setPreviewTab] = React.useState<"back_cover" | "footer">("back_cover");

  // Form states
  const [name, setName] = React.useState("");
  const [tagline, setTagline] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [emergencyPhone, setEmergencyPhone] = React.useState("");
  const [opdPhone, setOpdPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [editorialDivision, setEditorialDivision] = React.useState("");
  const [copyrightText, setCopyrightText] = React.useState("");

  // Fetch settings from API
  const { data: initialData, isLoading, isError, refetch } = useQuery<HospitalSettingsResponse>({
    queryKey: ["magazine-hospital-settings"],
    queryFn: async () => {
      const res = await fetch("/api/magazine/settings");
      if (!res.ok) {
        throw new Error("Failed to load hospital settings");
      }
      return res.json();
    },
  });

  // Populate form once loaded
  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setTagline(initialData.tagline || "");
      setLogoUrl(initialData.logoUrl || "");
      setPhone(initialData.phone || "");
      setEmergencyPhone(initialData.emergencyPhone || "");
      setOpdPhone(initialData.opdPhone || "");
      setEmail(initialData.email || "");
      setWebsite(initialData.website || "");
      setAddress(initialData.address || "");
      setEditorialDivision(initialData.editorialDivision || "");
      setCopyrightText(initialData.copyrightText || "");
    }
  }, [initialData]);

  // Mutation to save settings
  const saveMutation = useMutation({
    mutationFn: async (payload: HospitalSettingsResponse) => {
      const res = await fetch("/api/magazine/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update hospital settings");
      }
      return res.json();
    },
    onSuccess: (saved) => {
      toast.success("Hospital branding & magazine info saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["magazine-hospital-settings"] });
      // Update form with saved response
      if (saved) {
        setName(saved.name || DEFAULT_SETTINGS.name);
        setTagline(saved.tagline || "");
        setLogoUrl(saved.logoUrl || "");
        setPhone(saved.phone || "");
        setEmergencyPhone(saved.emergencyPhone || "");
        setOpdPhone(saved.opdPhone || "");
        setEmail(saved.email || "");
        setWebsite(saved.website || "");
        setAddress(saved.address || "");
        setEditorialDivision(saved.editorialDivision || "");
        setCopyrightText(saved.copyrightText || "");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save hospital settings");
    },
  });

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      toast.error("Hospital or organization name is required.");
      return;
    }

    saveMutation.mutate({
      name: name.trim(),
      tagline: tagline.trim() || null,
      logoUrl: logoUrl.trim() || null,
      phone: phone.trim() || null,
      emergencyPhone: emergencyPhone.trim() || null,
      opdPhone: opdPhone.trim() || null,
      email: email.trim() || null,
      website: website.trim() || null,
      address: address.trim() || null,
      editorialDivision: editorialDivision.trim() || null,
      copyrightText: copyrightText.trim() || null,
    });
  };

  const handleResetToCurrent = () => {
    if (initialData) {
      setName(initialData.name || DEFAULT_SETTINGS.name);
      setTagline(initialData.tagline || "");
      setLogoUrl(initialData.logoUrl || "");
      setPhone(initialData.phone || "");
      setEmergencyPhone(initialData.emergencyPhone || "");
      setOpdPhone(initialData.opdPhone || "");
      setEmail(initialData.email || "");
      setWebsite(initialData.website || "");
      setAddress(initialData.address || "");
      setEditorialDivision(initialData.editorialDivision || "");
      setCopyrightText(initialData.copyrightText || "");
      toast.info("Form reset to currently saved values.");
    }
  };

  const handleRestoreDefaults = () => {
    if (window.confirm("Restore factory default hospital information for the magazine?")) {
      setName(DEFAULT_SETTINGS.name);
      setTagline(DEFAULT_SETTINGS.tagline);
      setLogoUrl(DEFAULT_SETTINGS.logoUrl);
      setPhone(DEFAULT_SETTINGS.phone);
      setEmergencyPhone(DEFAULT_SETTINGS.emergencyPhone);
      setOpdPhone(DEFAULT_SETTINGS.opdPhone);
      setEmail(DEFAULT_SETTINGS.email);
      setWebsite(DEFAULT_SETTINGS.website);
      setAddress(DEFAULT_SETTINGS.address);
      setEditorialDivision(DEFAULT_SETTINGS.editorialDivision);
      setCopyrightText(DEFAULT_SETTINGS.copyrightText);
      toast.info("Defaults populated into form. Click 'Save Changes' to commit.");
    }
  };

  if (!canManageMagazine && !isAdmin) {
    return (
      <ModuleLayout
        title="Magazine Hospital Settings"
        description="Configure institution branding and coordinates for the electronic magazine."
      >
        <Card className="border-destructive/30 bg-destructive/5 text-center p-8">
          <CardContent className="space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Access Restricted</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Only authorized magazine editors and system administrators can configure institutional branding for the electronic magazine.
            </p>
            <Link to="/magazine">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Magazine Editions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Magazine Hospital Info & Branding"
      description="Manage the institutional identity, emergency helplines, editorial contacts, and copyright details displayed across public magazine editions."
      action={
        <div className="flex items-center gap-2">
          <Link to="/magazine">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToCurrent}
            disabled={saveMutation.isPending || isLoading}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Reset</span>
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave()}
            disabled={saveMutation.isPending || isLoading}
            className="gap-1.5 shadow-sm"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>Save Changes</span>
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">
            Loading institutional configuration...
          </p>
        </div>
      ) : isError ? (
        <Card className="border-destructive/30 bg-destructive/5 text-center p-8">
          <CardContent className="space-y-4">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm text-destructive font-medium">
              Failed to load current settings.
            </p>
            <Button variant="outline" onClick={() => refetch()} size="sm">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT FORM COLUMN (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Form Section 1: Institution & Brand Identity */}
            <Card className="shadow-sm border-border/80">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Institutional Identity & Branding</CardTitle>
                    <CardDescription className="text-xs">
                      Primary brand name, motto, and crest logo shown on covers and publication badges.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <span>Hospital / Institution Name</span>
                    <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. ACME Hospital & Healthcare"
                    className="font-medium"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Featured prominently on the magazine front cover badge, flipbook back cover, and SSR reader titles.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Institutional Tagline / Motto
                  </label>
                  <Input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Excellence in Medical Care, Research & Healthcare Innovation"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Sub-header rendered directly below the institution name on the back cover and footer.
                  </p>
                </div>

                {/* Logo URL with Media Library Dialog integration */}
                <div className="space-y-2 pt-2 border-t">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Brand Logo Asset</span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      Recommended: Transparent PNG or SVG (max-height ~50px)
                    </span>
                  </label>

                  <div className="flex gap-2">
                    <Input
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://... or select from media library"
                      className="text-xs font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsMediaLibraryOpen(true)}
                      className="shrink-0 gap-1.5 text-xs"
                    >
                      <ImageIcon className="h-3.5 w-3.5 text-primary" />
                      <span>Choose Asset</span>
                    </Button>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setLogoUrl("")}
                        className="shrink-0 text-xs text-muted-foreground hover:text-destructive p-2"
                        title="Remove Logo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {logoUrl ? (
                    <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/30">
                      <div className="h-12 w-28 bg-background rounded border p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        <img
                          src={logoUrl}
                          alt="Hospital Logo Preview"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div className="text-xs space-y-0.5 min-w-0">
                        <p className="font-semibold text-foreground truncate">Active Brand Logo</p>
                        <p className="text-[11px] text-muted-foreground truncate">{logoUrl}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">
                      No custom logo set. The reader will display the classic typographic ACME crest badge.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Form Section 2: Clinical Contacts & Helplines */}
            <Card className="shadow-sm border-border/80">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-rose-500/10 text-rose-500">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Clinical Helplines & Emergency Contacts</CardTitle>
                    <CardDescription className="text-xs">
                      Critical contact numbers highlighted across the flipbook back cover and reader footer.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>24/7 Emergency Helpline</span>
                    </label>
                    <Input
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43211"
                      className="border-rose-200 dark:border-rose-900/50 focus-visible:ring-rose-500"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Highlighted in vivid crimson alert badges across all distribution channels.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                      <span>OPD & Appointments Desk</span>
                    </label>
                    <Input
                      value={opdPhone}
                      onChange={(e) => setOpdPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43212"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Direct line for doctor consultations and outpatient clinic scheduling.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>General Reception / Hospital Switchboard</span>
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Form Section 3: Coordinates & Digital Presence */}
            <Card className="shadow-sm border-border/80">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Campus Coordinates & Digital Channels</CardTitle>
                    <CardDescription className="text-xs">
                      Physical campus address, official portal, and editorial communication channels.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Campus Physical Address</span>
                  </label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 123 Healthcare Ave, Medical District, Healthcare Campus"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Editorial Desk Email</span>
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. editorial@acmehospital.com"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Inquiries regarding published articles or manuscript submissions.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Official Web Portal</span>
                    </label>
                    <Input
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="e.g. www.acmehospital.com"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Form Section 4: Publishing Governance & Legal Notice */}
            <Card className="shadow-sm border-border/80">
              <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                    <Copyright className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Publishing Division & Legal Notice</CardTitle>
                    <CardDescription className="text-xs">
                      Publishing body credits, statutory medical disclaimers, and copyright text.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Editorial Division / Publishing Department
                  </label>
                  <Input
                    value={editorialDivision}
                    onChange={(e) => setEditorialDivision(e.target.value)}
                    placeholder="e.g. ACME Healthcare Communications & Editorial Division"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Displayed in the footer editorial standards card as the governing editorial authority.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Copyright & Distribution Notice
                  </label>
                  <Textarea
                    rows={2}
                    value={copyrightText}
                    onChange={(e) => setCopyrightText(e.target.value)}
                    placeholder="e.g. ACME Monthly Electronic Magazine. All rights reserved."
                    className="resize-none text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Printed in the bottom legal bar alongside the current year and hospital name.
                  </p>
                </div>

                <div className="pt-3 border-t flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRestoreDefaults}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Restore Factory Defaults
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleSave()}
                    disabled={saveMutation.isPending}
                    className="gap-2"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>Save Settings</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT PREVIEW COLUMN (5 cols - Sticky Simulator) */}
          <div className="lg:col-span-5 sticky top-6 space-y-4">
            <Card className="shadow-md border-border/80 overflow-hidden">
              <CardHeader className="pb-3 border-b bg-muted/40 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-primary/10 text-primary">
                    <Eye className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">Live Magazine Simulator</CardTitle>
                    <CardDescription className="text-[11px]">
                      Real-time interactive rendering in the reader
                    </CardDescription>
                  </div>
                </div>

                {/* Light/Dark preview toggle */}
                <div className="flex items-center bg-background border rounded-lg p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setPreviewTheme("dark")}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition",
                      previewTheme === "dark"
                        ? "bg-slate-900 text-white dark:bg-slate-800"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Moon className="h-3 w-3" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTheme("light")}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition",
                      previewTheme === "light"
                        ? "bg-slate-200 text-slate-900 font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Sun className="h-3 w-3" />
                    <span>Light</span>
                  </button>
                </div>
              </CardHeader>

              {/* Preview tab switcher */}
              <div className="flex border-b bg-muted/20 text-xs px-3 pt-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewTab("back_cover")}
                  className={cn(
                    "pb-2 font-medium border-b-2 transition flex items-center gap-1.5",
                    previewTab === "back_cover"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Back Cover Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewTab("footer")}
                  className={cn(
                    "pb-2 font-medium border-b-2 transition flex items-center gap-1.5",
                    previewTab === "footer"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Luxury Footer</span>
                </button>
              </div>

              <CardContent className="p-4">
                {/* 1. BACK COVER SIMULATOR */}
                {previewTab === "back_cover" && (
                  <div
                    className={cn(
                      "rounded-xl p-6 transition-colors duration-300 shadow-inner flex flex-col justify-between min-h-[460px]",
                      previewTheme === "dark"
                        ? "bg-gradient-to-b from-[#090d16] via-[#0f172a] to-[#050811] text-slate-100 border border-slate-800"
                        : "bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 border border-slate-300 shadow-md"
                    )}
                  >
                    {/* Crest & Hospital Name */}
                    <div className="text-center space-y-2">
                      {logoUrl ? (
                        <div className="flex justify-center mb-2">
                          <img
                            src={logoUrl}
                            alt={name}
                            className="max-h-12 max-w-[150px] object-contain drop-shadow-sm"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-1",
                            previewTheme === "dark"
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-primary/10 text-primary border border-primary/20"
                          )}
                        >
                          ACME CREST
                        </div>
                      )}

                      <h3
                        className={cn(
                          "text-base font-bold font-serif leading-tight tracking-tight",
                          previewTheme === "dark" ? "text-white" : "text-slate-950"
                        )}
                      >
                        {name || "ACME Hospital & Healthcare"}
                      </h3>

                      {tagline.trim() && (
                        <p
                          className={cn(
                            "text-[11px] leading-relaxed max-w-[280px] mx-auto italic",
                            previewTheme === "dark" ? "text-slate-400" : "text-slate-600"
                          )}
                        >
                          {tagline.trim()}
                        </p>
                      )}
                    </div>

                    {/* Coordinates & Helplines Card */}
                    {(address.trim() || emergencyPhone.trim() || opdPhone.trim() || phone.trim() || email.trim() || website.trim()) && (
                      <div
                        className={cn(
                          "rounded-lg p-3.5 space-y-2 text-[11px] my-4 backdrop-blur-xs",
                          previewTheme === "dark"
                            ? "bg-slate-900/80 border border-slate-800/80 text-slate-300"
                            : "bg-white/95 border border-slate-200 text-slate-700 shadow-xs"
                        )}
                      >
                        {address.trim() && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                            <div>
                              <strong className="text-foreground">Campus: </strong>
                              <span>{address.trim()}</span>
                            </div>
                          </div>
                        )}

                        {emergencyPhone.trim() && (
                          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                            <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-red-500" />
                            <div>
                              <strong className="text-red-500">24/7 Emergency: </strong>
                              <span className="font-bold text-red-500">{emergencyPhone.trim()}</span>
                            </div>
                          </div>
                        )}

                        {opdPhone.trim() && (
                          <div className="flex items-center gap-2">
                            <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
                            <div>
                              <strong className="text-foreground">OPD Desk: </strong>
                              <span>{opdPhone.trim()}</span>
                            </div>
                          </div>
                        )}

                        {phone.trim() && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div>
                              <strong className="text-foreground">Hospital Line: </strong>
                              <span>{phone.trim()}</span>
                            </div>
                          </div>
                        )}

                        {email.trim() && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div>
                              <strong className="text-foreground">Editorial: </strong>
                              <span>{email.trim()}</span>
                            </div>
                          </div>
                        )}

                        {website.trim() && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div>
                              <strong className="text-foreground">Web: </strong>
                              <span className="text-primary font-medium">{website.trim()}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Disclaimer */}
                    <div className="text-center pt-2 border-t border-border/40 text-[10px] space-y-0.5">
                      {editorialDivision.trim() && (
                        <p className={previewTheme === "dark" ? "text-slate-400" : "text-slate-500"}>
                          Published by {editorialDivision.trim()}
                        </p>
                      )}
                      <p className={previewTheme === "dark" ? "text-slate-500" : "text-slate-400"}>
                        &copy; {new Date().getFullYear()} {name || "ACME Hospital"}{copyrightText.trim() ? `. ${copyrightText.trim()}` : "."}
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. FOOTER SIMULATOR */}
                {previewTab === "footer" && (
                  <div
                    className={cn(
                      "rounded-xl p-5 transition-colors duration-300 min-h-[460px] flex flex-col justify-between",
                      previewTheme === "dark"
                        ? "bg-[#080d19] text-slate-200 border border-slate-800"
                        : "bg-slate-100 text-slate-800 border border-slate-300"
                    )}
                  >
                    <div className="space-y-4 text-xs">
                      {/* Brand Col */}
                      <div className="space-y-1.5 pb-3 border-b border-border/40">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={name}
                            className="max-h-8 max-w-[120px] object-contain mb-1"
                          />
                        ) : (
                          <div className="inline-block px-2 py-0.5 rounded text-[9px] font-bold tracking-wider bg-primary/20 text-primary border border-primary/30 uppercase">
                            ACME HEALTHCARE
                          </div>
                        )}
                        <h4 className="font-bold text-sm leading-tight text-foreground">
                          {name || "ACME Hospital"}
                        </h4>
                        {tagline.trim() && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {tagline.trim()}
                          </p>
                        )}
                      </div>

                      {/* Emergency & Campus */}
                      {(emergencyPhone.trim() || opdPhone.trim() || phone.trim() || email.trim() || address.trim()) && (
                        <div className="space-y-2 py-1">
                          <div className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                            Campus & Emergency
                          </div>
                          {emergencyPhone.trim() && (
                            <div className="flex items-center gap-2 text-red-500 font-bold text-[11px]">
                              <ShieldAlert className="h-3 w-3" />
                              <span>Emergency 24/7: {emergencyPhone.trim()}</span>
                            </div>
                          )}
                          {opdPhone.trim() && (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <CalendarCheck className="h-3 w-3 text-primary" />
                              <span>OPD Desk: {opdPhone.trim()}</span>
                            </div>
                          )}
                          {phone.trim() && (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>Phone: {phone.trim()}</span>
                            </div>
                          )}
                          {email.trim() && (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{email.trim()}</span>
                            </div>
                          )}
                          {address.trim() && (
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{address.trim()}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Editorial Standards */}
                      <div className="space-y-1 pt-2 border-t border-border/40">
                        <div className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                          Editorial Standards
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          Articles are compiled by clinical staff and research faculty for medical education.
                        </p>
                        {editorialDivision.trim() && (
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {editorialDivision.trim()}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="pt-3 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
                      <span className="truncate">
                        &copy; {new Date().getFullYear()} {name || "ACME Hospital"}{copyrightText.trim() ? `. ${copyrightText.trim()}` : "."}
                      </span>
                      <span className="shrink-0 flex items-center gap-1 text-emerald-500 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Press Active
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-3 p-2.5 rounded-lg bg-muted/40 border text-[11px] text-muted-foreground flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p>
                    Edits made to these fields immediately reflect on all published editions in the electronic reader and generated PDF digests upon saving.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Media Library Dialog for picking hospital logo */}
      <MediaLibraryDialog
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelectImage={(asset) => {
          setLogoUrl(asset.url);
          setIsMediaLibraryOpen(false);
          toast.success("Logo asset selected from Media Library!");
        }}
        title="Select Hospital Logo Asset"
      />
    </ModuleLayout>
  );
}
