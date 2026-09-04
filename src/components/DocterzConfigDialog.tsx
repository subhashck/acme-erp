import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Zap,
  ClipboardCheck,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Settings,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import { cn } from "@/utils/cn";

export interface DocterzConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function parseRawHeadersOrCurl(raw: string): {
  authorization?: string;
  apiKey?: string;
  appKey?: string;
  clinicId?: string;
  doctorIds?: string;
  baseUrl?: string;
  referer?: string;
} {
  const result: Record<string, string> = {};
  if (!raw || typeof raw !== "string") return result;

  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim().replace(/^['"]|['"]$/g, "").replace(/\\$/, "").trim();

    const headerMatch = trimmed.match(/^(?:-H\s+['"]?|--header\s+['"]?)?([^:\s]+):\s*(.+)$/i);
    if (headerMatch) {
      const key = headerMatch[1].toLowerCase();
      const value = headerMatch[2].trim().replace(/['"]$/, "").trim();

      if (key === "authorization") {
        result.authorization = value;
      } else if (key === "x-api-key") {
        result.apiKey = value;
      } else if (key === "x-app-key") {
        result.appKey = value;
      } else if (key === "referer") {
        result.referer = value;
      }
    }

    const urlMatch = trimmed.match(/https?:\/\/[^\s'"]+/);
    if (urlMatch) {
      try {
        const u = new URL(urlMatch[0]);
        if (u.searchParams.get("clinic_id")) {
          result.clinicId = u.searchParams.get("clinic_id")!;
        }
        if (u.searchParams.get("doctor_ids")) {
          result.doctorIds = u.searchParams.get("doctor_ids")!;
        }
        result.baseUrl = `${u.origin}${u.pathname}`;
      } catch {}
    }
  }

  return result;
}

export function DocterzConfigDialog({ open, onOpenChange }: DocterzConfigDialogProps) {
  const queryClient = useQueryClient();

  const [authorization, setAuthorization] = React.useState("");
  const [apiKey, setApiKey] = React.useState("");
  const [appKey, setAppKey] = React.useState("79ca90b3");
  const [clinicId, setClinicId] = React.useState("5760");
  const [doctorIds, setDoctorIds] = React.useState("[11299,11300,11301,11302,11600,11601]");
  const [baseUrl, setBaseUrl] = React.useState("https://api.docterz.in/admin/reports/clinic/consultation_report");
  const [referer, setReferer] = React.useState("https://web.docterz.in/");

  const [showTokens, setShowTokens] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [showQuickPaste, setShowQuickPaste] = React.useState(false);
  const [rawPasteText, setRawPasteText] = React.useState("");
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const [testResult, setTestResult] = React.useState<{
    success: boolean;
    status: number;
    message: string;
    latencyMs?: number;
    recordsCount?: number;
  } | null>(null);

  // Fetch current config
  const configQuery = useQuery({
    queryKey: ["front-office", "docterz-config"],
    queryFn: async () => {
      const res = await fetch("/api/front-office/docterz-config");
      if (!res.ok) throw new Error("Failed to load Docterz configuration");
      return res.json();
    },
    enabled: open,
  });

  // Populate form when config is fetched
  React.useEffect(() => {
    if (configQuery.data) {
      setAuthorization(configQuery.data.authorization || "");
      setApiKey(configQuery.data.apiKey || "");
      setAppKey(configQuery.data.appKey || "79ca90b3");
      setClinicId(configQuery.data.clinicId || "5760");
      setDoctorIds(configQuery.data.doctorIds || "[11299,11300,11301,11302,11600,11601]");
      setBaseUrl(configQuery.data.baseUrl || "https://api.docterz.in/admin/reports/clinic/consultation_report");
      setReferer(configQuery.data.referer || "https://web.docterz.in/");
      setTestResult(null);
    }
  }, [configQuery.data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!authorization.trim()) throw new Error("Authorization token is required");
      if (!apiKey.trim()) throw new Error("x-api-key token is required");

      const res = await fetch("/api/front-office/docterz-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorization: authorization.trim(),
          apiKey: apiKey.trim(),
          appKey: appKey.trim() || "79ca90b3",
          clinicId: clinicId.trim() || "5760",
          doctorIds: doctorIds.trim() || "[11299,11300,11301,11302,11600,11601]",
          baseUrl: baseUrl.trim() || "https://api.docterz.in/admin/reports/clinic/consultation_report",
          referer: referer.trim() || "https://web.docterz.in/",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update configuration");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Docterz API authorization headers updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["front-office", "docterz-config"] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save configuration");
    },
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/front-office/docterz-config/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorization: authorization.trim(),
          apiKey: apiKey.trim(),
          appKey: appKey.trim(),
          clinicId: clinicId.trim(),
          doctorIds: doctorIds.trim(),
          baseUrl: baseUrl.trim(),
          referer: referer.trim(),
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) {
        toast.success("Connection test passed!");
      } else {
        toast.error(`Connection failed: ${data.message}`);
      }
    },
    onError: (err: any) => {
      const failed = {
        success: false,
        status: 0,
        message: err.message || "Network error while attempting connection test",
      };
      setTestResult(failed);
      toast.error(failed.message);
    },
  });

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSmartPaste = () => {
    if (!rawPasteText.trim()) {
      toast.error("Please paste request headers or cURL command text first");
      return;
    }

    const parsed = parseRawHeadersOrCurl(rawPasteText);
    let matchedCount = 0;

    if (parsed.authorization) {
      setAuthorization(parsed.authorization);
      matchedCount++;
    }
    if (parsed.apiKey) {
      setApiKey(parsed.apiKey);
      matchedCount++;
    }
    if (parsed.appKey) {
      setAppKey(parsed.appKey);
      matchedCount++;
    }
    if (parsed.clinicId) {
      setClinicId(parsed.clinicId);
      matchedCount++;
    }
    if (parsed.doctorIds) {
      setDoctorIds(parsed.doctorIds);
      matchedCount++;
    }
    if (parsed.baseUrl) {
      setBaseUrl(parsed.baseUrl);
      matchedCount++;
    }
    if (parsed.referer) {
      setReferer(parsed.referer);
      matchedCount++;
    }

    if (matchedCount > 0) {
      toast.success(`Successfully extracted ${matchedCount} parameter(s) from pasted text!`);
      setShowQuickPaste(false);
      setRawPasteText("");
    } else {
      toast.warning("No recognized Docterz headers found. Check that the text contains 'authorization' or 'x-api-key'.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <Key className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Docterz Clinic API — Authorization &amp; Headers
              </DialogTitle>
              <DialogDescription className="text-xs">
                Manage authentication credentials used to fetch live consultation, lab, and radiology data from Docterz.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Quick Paste Assistant Banner */}
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-200">
                <Zap className="size-3.5 text-amber-500" />
                <span>DevTools Quick-Paste Assistant</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickPaste(!showQuickPaste)}
                className="h-7 text-xs px-2 gap-1 cursor-pointer"
              >
                {showQuickPaste ? "Hide Paste Tool" : "Paste cURL / Headers"}
                {showQuickPaste ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </Button>
            </div>

            {showQuickPaste ? (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-muted-foreground">
                  Copy the request as cURL or raw headers from your browser's Network tab on{" "}
                  <a
                    href="https://web.docterz.in/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5"
                  >
                    web.docterz.in <ExternalLink className="size-2.5" />
                  </a>{" "}
                  and paste here. Tokens will be extracted automatically.
                </p>
                <textarea
                  rows={4}
                  value={rawPasteText}
                  onChange={(e) => setRawPasteText(e.target.value)}
                  placeholder="Paste raw headers (e.g. authorization: ... \n x-api-key: ...) or curl command here..."
                  className="w-full p-2 text-[11px] font-mono rounded-md border bg-background border-input resize-y outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRawPasteText("");
                      setShowQuickPaste(false);
                    }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSmartPaste}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
                  >
                    <ClipboardCheck className="size-3.5" />
                    Extract &amp; Populate Fields
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                When sessions expire, copy the active request from DevTools and paste it directly or update the tokens below.
              </p>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            {/* Authorization Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground flex items-center gap-1">
                  <span>Authorization Header</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                    authorization
                  </Badge>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowTokens(!showTokens)}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    {showTokens ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    {showTokens ? "Hide" : "Show"}
                  </button>
                  {authorization && (
                    <button
                      type="button"
                      onClick={() => handleCopy(authorization, "auth")}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer ml-2"
                    >
                      {copiedKey === "auth" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                      Copy
                    </button>
                  )}
                </div>
              </div>
              <Input
                type={showTokens ? "text" : "password"}
                value={authorization}
                onChange={(e) => setAuthorization(e.target.value)}
                placeholder="e.g. 3ctPSDmEi6VL-N8KR1cDt7pd01teTEwq"
                className="font-mono text-xs h-9"
              />
            </div>

            {/* X-API-KEY */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground flex items-center gap-1">
                  <span>X-API-KEY Token (JWT Session)</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                    x-api-key
                  </Badge>
                </label>
                {apiKey && (
                  <button
                    type="button"
                    onClick={() => handleCopy(apiKey, "apiKey")}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === "apiKey" ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    Copy
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="e.g. eyJhbGciOiJIUzI1NiJ9..."
                className={cn(
                  "w-full p-2 text-xs font-mono rounded-md border bg-background border-input resize-y outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  !showTokens && "filter blur-[2.5px] hover:blur-none transition-all duration-200"
                )}
              />
            </div>

            {/* Clinic & App Keys Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-semibold text-foreground flex items-center gap-1">
                  <span>Clinic ID</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                    clinic_id
                  </Badge>
                </label>
                <Input
                  type="text"
                  value={clinicId}
                  onChange={(e) => setClinicId(e.target.value)}
                  placeholder="5760"
                  className="font-mono text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground flex items-center gap-1">
                  <span>X-App-Key</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                    x-app-key
                  </Badge>
                </label>
                <Input
                  type="text"
                  value={appKey}
                  onChange={(e) => setAppKey(e.target.value)}
                  placeholder="79ca90b3"
                  className="font-mono text-xs h-9"
                />
              </div>
            </div>

            {/* Doctor IDs Array */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground flex items-center gap-1">
                <span>Doctor IDs Array</span>
                <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">
                  doctor_ids
                </Badge>
              </label>
              <Input
                type="text"
                value={doctorIds}
                onChange={(e) => setDoctorIds(e.target.value)}
                placeholder="[11299,11300,11301,11302,11600,11601]"
                className="font-mono text-xs h-9"
              />
              <p className="text-[10px] text-muted-foreground">
                JSON array format or comma-separated Docterz doctor IDs to include in consultation reports.
              </p>
            </div>

            {/* Advanced Settings Collapsible */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <Settings className="size-3.5" />
                <span>Advanced Network &amp; Endpoint Settings</span>
                {showAdvanced ? <ChevronUp className="size-3.5 ml-1" /> : <ChevronDown className="size-3.5 ml-1" />}
              </button>

              {showAdvanced && (
                <div className="space-y-3 mt-2 p-3 rounded-lg border bg-muted/20">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Base API URL</label>
                    <Input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.docterz.in/admin/reports/clinic/consultation_report"
                      className="font-mono text-xs h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Referer Header</label>
                    <Input
                      type="text"
                      value={referer}
                      onChange={(e) => setReferer(e.target.value)}
                      placeholder="https://web.docterz.in/"
                      className="font-mono text-xs h-8"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Test Connection Probe Feedback Card */}
          {testResult && (
            <div
              className={cn(
                "p-3 rounded-lg border text-xs flex items-start gap-2.5",
                testResult.success
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                  : "bg-destructive/10 border-destructive/30 text-destructive dark:text-destructive-foreground"
              )}
            >
              {testResult.success ? (
                <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 flex-1">
                <div className="font-bold flex items-center gap-2">
                  <span>{testResult.success ? "Connection Verified" : "Connection Test Failed"}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] py-0 px-1.5",
                      testResult.success ? "border-emerald-500/40 text-emerald-700" : "border-destructive/40 text-destructive"
                    )}
                  >
                    HTTP {testResult.status}
                  </Badge>
                  {testResult.latencyMs !== undefined && (
                    <span className="text-[10px] text-muted-foreground font-mono">{testResult.latencyMs}ms</span>
                  )}
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">{testResult.message}</p>
              </div>
            </div>
          )}

          {/* Metadata info */}
          {configQuery.data?.updatedAt && (
            <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t">
              <span>
                Last configured: <strong>{new Date(configQuery.data.updatedAt).toLocaleString()}</strong>
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <ShieldCheck className="size-3.5" />
                Active in production
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => testMutation.mutate()}
              disabled={testMutation.isPending || !authorization || !apiKey}
              className="gap-1.5 text-xs h-9 cursor-pointer"
            >
              {testMutation.isPending ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Testing Probe...
                </>
              ) : (
                <>
                  <Zap className="size-3.5 text-amber-500" />
                  Test Connection
                </>
              )}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-9 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !authorization || !apiKey}
                className="text-xs h-9 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer gap-1.5"
              >
                {saveMutation.isPending ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    Save Headers
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
