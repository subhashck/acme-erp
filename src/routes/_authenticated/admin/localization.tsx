import * as React from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/services/auth";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Select } from "@/ui/select";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Coins, Save, CheckCircle2 } from "lucide-react";
import {
  useSystemSettings,
  saveSystemSettings,
  getSystemSettings,
  type SystemSettings
} from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/admin/localization")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data?.user.role !== "admin") {
      throw redirect({
        to: "/"
      });
    }
  },
  component: LocalizationSettingsPage
});

function LocalizationSettingsPage() {
  const systemSettings = useSystemSettings();

  const [sysCurrency, setSysCurrency] = React.useState("");
  const [sysLanguage, setSysLanguage] = React.useState("");
  const [systemMessage, setSystemMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSysCurrency(systemSettings.currencySymbol);
    setSysLanguage(systemSettings.language);
  }, [systemSettings]);

  const handleSaveSystemSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const current = getSystemSettings();
    const settings: SystemSettings = {
      ...current,
      currencySymbol: sysCurrency,
      language: sysLanguage
    };
    saveSystemSettings(settings);
    setSystemMessage("Localization preferences saved successfully.");
    setTimeout(() => setSystemMessage(null), 3000);
  };

  return (
    <ModuleLayout
      title="Currency & Localization"
      description="Adjust base localization and financial symbols for accounting records."
    >
      <div className="max-w-4xl mt-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-4 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <Coins className="text-emerald-600" size={18} />
              Currency & Localization Preferences
            </CardTitle>
            <CardDescription>Configure currency and language settings. (Admin access required)</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSaveSystemSettings} className="space-y-4 max-w-md">
              <Select
                label="Financial Base Currency"
                value={sysCurrency}
                onChange={(e) => setSysCurrency(e.target.value)}
                options={[
                  ["₹", "Indian Rupee (₹)"],
                  ["$", "US Dollar ($)"],
                  ["€", "Euro (€)"],
                  ["£", "British Pound (£)"],
                  ["¥", "Japanese Yen (¥)"]
                ]}
              />

              <Select
                label="Workspace Language"
                value={sysLanguage}
                onChange={(e) => setSysLanguage(e.target.value)}
                options={[
                  ["en", "English (United States)"],
                  ["es", "Spanish (Español)"],
                  ["hi", "Hindi (हिन्दी)"],
                  ["fr", "French (Français)"]
                ]}
              />

              {systemMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-300 rounded-lg text-xs flex gap-2 items-center">
                  <CheckCircle2 size={15} />
                  <span>{systemMessage}</span>
                </div>
              )}

              <Button type="submit" className="font-bold bg-slate-900 hover:bg-slate-800 text-white gap-2 h-10 px-4">
                <Save size={14} />
                Save localization preferences
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
