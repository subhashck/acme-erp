import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  MonitorSmartphone,
  RefreshCw,
  Copy,
  Check,
  ShieldAlert,
  Clock,
  Laptop,
  LogOut,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface DesktopPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ActiveSessionItem {
  pinId: number;
  desktopSessionId: string;
  createdAt: string;
  clientIp: string | null;
  deviceName: string | null;
  expiresAt: string;
}

export function DesktopPinDialog({ open, onOpenChange }: DesktopPinDialogProps) {
  const [pin, setPin] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(90);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSessionItem[]>([]);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);

  // Fetch active sessions
  const fetchActiveSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/mobile-pin-auth/active-sessions");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.sessions)) {
          setActiveSessions(data.sessions);
        }
      }
    } catch (err) {
      console.error("Failed to load active desktop sessions:", err);
    }
  }, []);

  // Generate PIN
  const generateNewPin = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/mobile-pin-auth/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Failed to generate PIN");
        return;
      }
      setPin(data.pin);
      const expTime = new Date(data.expiresAt).getTime();
      setExpiresAt(expTime);
      setSecondsRemaining(Math.max(0, Math.round((expTime - Date.now()) / 1000)));
      fetchActiveSessions();
    } catch (err) {
      toast.error("Network error generating desktop PIN");
    } finally {
      setIsLoading(false);
    }
  }, [fetchActiveSessions]);

  // Initial load when dialog opens
  useEffect(() => {
    if (open) {
      generateNewPin();
      fetchActiveSessions();
    } else {
      setPin(null);
      setExpiresAt(null);
      setSecondsRemaining(90);
    }
  }, [open, generateNewPin, fetchActiveSessions]);

  // Countdown timer
  useEffect(() => {
    if (!open || !expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [open, expiresAt]);

  const copyPin = () => {
    if (!pin) return;
    navigator.clipboard.writeText(pin);
    setCopied(true);
    toast.success("PIN copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevokeSession = async (sessionId: string) => {
    setIsRevoking(sessionId);
    try {
      const res = await fetch("/api/mobile-pin-auth/revoke-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Desktop workstation logged out successfully.");
        setActiveSessions((prev) => prev.filter((s) => s.desktopSessionId !== sessionId));
      } else {
        toast.error(data.error || "Could not revoke session");
      }
    } catch (err) {
      toast.error("Failed to revoke session");
    } finally {
      setIsRevoking(null);
    }
  };

  const isExpired = secondsRemaining <= 0;
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 90) * 100));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="text-center sm:text-left">
          <div className="flex items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <MonitorSmartphone size={22} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Desktop Login PIN</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Authenticate on shared hospital computers without typing your password.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* PIN Display Card */}
        <div className="my-2 rounded-2xl border bg-gradient-to-b from-muted/50 to-muted/20 p-5 text-center shadow-sm">
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <span className="text-xs">Generating secure PIN...</span>
            </div>
          ) : isExpired ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2">
              <div className="size-11 rounded-full bg-rose-500/10 text-rose-500 grid place-items-center">
                <ShieldAlert size={24} />
              </div>
              <p className="text-sm font-semibold text-foreground">PIN Expired</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                PINs expire after 90 seconds for your safety. Tap below to generate a fresh PIN.
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={generateNewPin}
                className="mt-3 gap-1.5"
              >
                <RefreshCw size={14} /> Generate New PIN
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <span className="text-[11px] font-medium tracking-wide uppercase text-muted-foreground flex items-center justify-center gap-1.5">
                <Sparkles size={12} className="text-amber-500" />
                Single-Use Workstation Code
              </span>

              {/* Monospace 6-Digit PIN Display */}
              <div className="flex items-center justify-center gap-2 font-mono text-4xl sm:text-5xl font-black tracking-wider text-primary">
                {pin ? (
                  <>
                    <span>{pin.slice(0, 3)}</span>
                    <span className="text-muted-foreground/40 font-light">•</span>
                    <span>{pin.slice(3, 6)}</span>
                  </>
                ) : (
                  "------"
                )}
              </div>

              {/* Progress bar countdown */}
              <div className="space-y-1.5 px-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full transition-all duration-1000 ${
                      secondsRemaining > 30
                        ? "bg-emerald-500"
                        : secondsRemaining > 15
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> Valid on any station
                  </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    Expires in {secondsRemaining}s
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPin}
                  className="gap-1.5 text-xs h-8"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={generateNewPin}
                  className="gap-1.5 text-xs h-8"
                  title="Refresh code"
                >
                  <RefreshCw size={14} /> Refresh
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* How it works note */}
        <div className="rounded-lg bg-blue-500/5 border border-blue-500/15 p-3 text-xs text-muted-foreground flex gap-2.5 items-start">
          <Laptop size={16} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">How to use on shared computers:</p>
            <p className="mt-0.5 leading-relaxed">
              1. On the PC login screen, select your name from <strong>Recent Station Users</strong>.
              <br />
              2. Enter this 6-digit PIN. You will be signed in instantly without typing your password.
            </p>
          </div>
        </div>

        {/* Active Desktop Logins Section (Remote Kill-Switch) */}
        {activeSessions.length > 0 && (
          <div className="mt-2 space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Active Logins at Shared Terminals ({activeSessions.length})
              </span>
              <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                Online
              </Badge>
            </div>

            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {activeSessions.map((s) => (
                <div
                  key={s.desktopSessionId}
                  className="flex items-center justify-between rounded-lg border bg-card p-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Laptop size={14} className="text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">
                        {s.deviceName || "Hospital Workstation"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.clientIp ? `IP: ${s.clientIp} • ` : ""}
                        Logged in {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1 px-2"
                    onClick={() => handleRevokeSession(s.desktopSessionId)}
                    disabled={isRevoking === s.desktopSessionId}
                  >
                    <LogOut size={12} />
                    {isRevoking === s.desktopSessionId ? "Ending..." : "Sign Out"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
