import * as React from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/services/auth";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Field } from "@/components/Field";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Building, Save, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  useHospitalSettings,
  saveHospitalSettings,
  type HospitalSettings
} from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/admin/hospital")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data?.user.role !== "admin") {
      throw redirect({
        to: "/"
      });
    }
  },
  component: HospitalProfilePage
});

function MagazinePromotionSettings() {
  const queryClient = useQueryClient();
  const settings = useQuery<{ showPublishedMagazines: boolean }>({
    queryKey: ["erp-magazine-promotion"],
    queryFn: async () => {
      const response = await fetch("/api/admin/hospital-settings");
      if (!response.ok) throw new Error("Could not load publication settings");
      return response.json();
    },
  });
  const mutation = useMutation({
    mutationFn: async (showPublishedMagazines: boolean) => {
      const response = await fetch("/api/admin/hospital-settings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showPublishedMagazines }),
      });
      if (!response.ok) throw new Error("Could not save publication settings");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["erp-magazine-promotion"] });
      queryClient.invalidateQueries({ queryKey: ["public-magazine-issues"] });
      toast.success("Magazine promotion updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return <Card className="mt-5"><CardContent className="flex items-center justify-between gap-4 pt-6">
    <div><p className="font-semibold">Display published magazines</p>
      <p className="text-sm text-muted-foreground">Show publications from the Magazine service on the ERP login page and dashboard.</p>
      {settings.isError && <p className="text-sm text-destructive">Could not load publication settings.</p>}
    </div>
    <Switch aria-label="Display published magazines" checked={settings.data?.showPublishedMagazines ?? false}
      disabled={!settings.data || mutation.isPending} onCheckedChange={value => mutation.mutate(value)} />
  </CardContent></Card>;
}

function HospitalProfilePage() {
  const hospitalSettings = useHospitalSettings();

  const [hName, setHName] = React.useState("");
  const [hAddress, setHAddress] = React.useState("");
  const [hPhone, setHPhone] = React.useState("");
  const [hEmail, setHEmail] = React.useState("");
  const [hWebsite, setHWebsite] = React.useState("");
  const [hFloors, setHFloors] = React.useState(1);
  const [hIcu, setHIcu] = React.useState(0);
  const [hEmergency, setHEmergency] = React.useState(0);
  const [isSavingDb, setIsSavingDb] = React.useState(false);
  const [hospitalMessage, setHospitalMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setHName(hospitalSettings.name);
    setHAddress(hospitalSettings.address);
    setHPhone(hospitalSettings.phone);
    setHEmail(hospitalSettings.email);
    setHWebsite(hospitalSettings.website);
    setHFloors(hospitalSettings.floorCount);
    setHIcu(hospitalSettings.icuBeds);
    setHEmergency(hospitalSettings.emergencyCapacity);

  }, [hospitalSettings]);

  const handleSaveHospitalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDb(true);
    const settings: HospitalSettings = {
      name: hName,
      address: hAddress,
      phone: hPhone,
      email: hEmail,
      website: hWebsite,
      floorCount: Number(hFloors) || 1,
      icuBeds: Number(hIcu) || 0,
      emergencyCapacity: Number(hEmergency) || 0
    };
    saveHospitalSettings(settings);

    try {
      await fetch("/api/admin/hospital-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: hName,
          address: hAddress,
          phone: hPhone,
          email: hEmail,
          website: hWebsite,
        }),
      });
      setHospitalMessage("Hospital profile settings saved successfully.");
    } catch {
      setHospitalMessage("Hospital configurations saved locally, but database sync encountered an issue.");
    } finally {
      setIsSavingDb(false);
      setTimeout(() => setHospitalMessage(null), 3500);
    }
  };

  return (
    <ModuleLayout
      title="Hospital Profile Settings"
      description="Configure contact information, physical coordinates, and default institutional capacities."
    >
      <div className="max-w-4xl mt-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="text-primary" size={18} />
              Hospital Profile Configurations
            </CardTitle>
            <CardDescription>Configure contact coordinates and default capacities. (Admin access required)</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSaveHospitalSettings} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Hospital Legal Name"
                  type="text"
                  placeholder="e.g. Acme Health Clinic"
                  value={hName}
                  onChange={(e) => setHName(e.target.value)}
                />
                <Field
                  label="Official Website URL"
                  type="text"
                  placeholder="e.g. www.hospital.com"
                  value={hWebsite}
                  onChange={(e) => setHWebsite(e.target.value)}
                />
                <Field
                  label="Contact Telephone"
                  type="text"
                  placeholder="e.g. +91 99999 88888"
                  value={hPhone}
                  onChange={(e) => setHPhone(e.target.value)}
                />
                <Field
                  label="Support Email"
                  type="email"
                  placeholder="e.g. support@hospital.com"
                  value={hEmail}
                  onChange={(e) => setHEmail(e.target.value)}
                />
              </div>

              <Field
                label="Hospital Location Address"
                type="text"
                placeholder="Enter complete physical address"
                value={hAddress}
                onChange={(e) => setHAddress(e.target.value)}
              />

              {hospitalMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-300 rounded-lg text-xs flex gap-2 items-center">
                  <CheckCircle2 size={15} />
                  <span>{hospitalMessage}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSavingDb}
                className="font-bold bg-slate-900 hover:bg-slate-800 text-white gap-2 h-10 px-4"
              >
                <Save size={14} />
                {isSavingDb ? "Saving..." : "Save institutional profile"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <MagazinePromotionSettings />
      </div>
    </ModuleLayout>
  );
}
