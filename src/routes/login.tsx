import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  LogIn,
  KeyRound,
  Smartphone,
  User,
  Search,
  X,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Laptop,
} from "lucide-react";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { authClient } from "../services/auth";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { PublishedMagazineSection } from "../components/PublishedMagazineSection";
import { PwaInstallHelp } from "../components/PwaProvider";
import { googleAuthErrorMessage } from "../lib/google-auth-errors";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

const isMagazineReturnPath = (path: string) =>
  path === "/magazine/admin" || path.startsWith("/magazine/admin/");

const RECENT_USERS_STORAGE_KEY = "acme_recent_station_users";

export interface StationUserItem {
  userId: string;
  name: string;
  employeeCode: string;
  role: string;
  department: string;
  image?: string | null;
  lastUsedAt?: number;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): {
    redirect: string;
    error?: string;
    error_description?: string;
  } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/",
    error: typeof search.error === "string" ? search.error : undefined,
    error_description: typeof search.error_description === "string" ? search.error_description : undefined,
  }),
  beforeLoad: async ({ search }) => {
    const session = await authClient.getSession();
    if (session.data) {
      if (isMagazineReturnPath(search.redirect)) {
        window.location.replace(search.redirect);
        return;
      }
      throw redirect({ to: "/" });
    }
  },
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { redirect, error: oauthError, error_description: oauthErrorDescription } = Route.useSearch();

  // Mode: 'pin' (Fast Desktop PIN Login) or 'password' (Standard Password)
  const [loginMode, setLoginMode] = useState<"pin" | "password">("pin");

  // PIN Login State
  const [recentUsers, setRecentUsers] = useState<StationUserItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<StationUserItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StationUserItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [pinDigits, setPinDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleConfirmOpen, setGoogleConfirmOpen] = useState(false);

  // Load Recent Station Users from LocalStorage
  const loadRecentUsers = useCallback(() => {
    try {
      const raw = localStorage.getItem(RECENT_USERS_STORAGE_KEY);
      if (raw) {
        const parsed: StationUserItem[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentUsers(parsed);
          // If there is a most recent user, select them by default
          if (parsed.length > 0 && !selectedUser) {
            setSelectedUser(parsed[0]);
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load recent station users from localStorage", e);
    }
  }, [selectedUser]);

  useEffect(() => {
    loadRecentUsers();
  }, [loadRecentUsers]);

  // Persist selected user to Recent Station Users
  const saveRecentUser = (userItem: StationUserItem) => {
    try {
      const updated = [
        { ...userItem, lastUsedAt: Date.now() },
        ...recentUsers.filter((u) => u.userId !== userItem.userId),
      ].slice(0, 6);
      localStorage.setItem(RECENT_USERS_STORAGE_KEY, JSON.stringify(updated));
      setRecentUsers(updated);
    } catch (e) {
      console.warn("Failed to save recent station user", e);
    }
  };

  const removeRecentUser = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentUsers.filter((u) => u.userId !== userId);
    localStorage.setItem(RECENT_USERS_STORAGE_KEY, JSON.stringify(updated));
    setRecentUsers(updated);
    if (selectedUser?.userId === userId) {
      setSelectedUser(updated.length > 0 ? updated[0] : null);
      setPinDigits(["", "", "", "", "", ""]);
    }
  };

  // Search station staff directory
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/public/station-staff?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const body = await res.json();
          if (Array.isArray(body.data)) {
            setSearchResults(body.data);
          }
        }
      } catch (err) {
        console.error("Failed to query station staff directory:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (oauthError) setError(googleAuthErrorMessage(oauthError, oauthErrorDescription));
  }, [oauthError, oauthErrorDescription]);

  useEffect(() => {
    fetch("/api/public/auth-config")
      .then((response) => (response.ok ? response.json() : null))
      .then((config) => setGoogleEnabled(config?.googleEnabled === true))
      .catch(() => setGoogleEnabled(false));
  }, []);

  // Auto-focus first PIN box when selectedUser changes
  useEffect(() => {
    if (loginMode === "pin" && selectedUser) {
      pinRefs.current[0]?.focus();
    }
  }, [loginMode, selectedUser]);

  // Handle PIN digit input
  const handlePinChange = (index: number, val: string) => {
    setPinError(null);

    // Paste handling (e.g. user pasted 6 digits)
    if (val.length > 1) {
      const cleanDigits = val.replace(/\D/g, "").slice(0, 6).split("");
      if (cleanDigits.length > 0) {
        const next = [...pinDigits];
        cleanDigits.forEach((digit, i) => {
          if (i < 6) next[i] = digit;
        });
        setPinDigits(next);
        const nextFocus = Math.min(cleanDigits.length, 5);
        pinRefs.current[nextFocus]?.focus();

        if (cleanDigits.length === 6) {
          void submitPin(cleanDigits.join(""));
        }
      }
      return;
    }

    const digit = val.replace(/\D/g, "");
    const next = [...pinDigits];
    next[index] = digit;
    setPinDigits(next);

    if (digit && index < 5) {
      pinRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits entered
    if (digit && index === 5) {
      const fullPin = [...next.slice(0, 5), digit].join("");
      if (fullPin.length === 6) {
        void submitPin(fullPin);
      }
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  // Submit 6-digit PIN to authenticate workstation
  const submitPin = async (overridePin?: string) => {
    if (!selectedUser) {
      setPinError("Please select a staff member first.");
      return;
    }

    const pinToVerify = overridePin || pinDigits.join("");
    if (pinToVerify.length !== 6) {
      setPinError("Please enter all 6 digits.");
      return;
    }

    setPinError(null);
    setPinSubmitting(true);

    try {
      const res = await fetch("/api/public/station-login/verify-pin", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.userId,
          pin: pinToVerify,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setPinError(data.error || "Incorrect or expired PIN.");
        setPinDigits(["", "", "", "", "", ""]);
        pinRefs.current[0]?.focus();
        setPinSubmitting(false);
        return;
      }

      // Success! Update Recent Users memory
      saveRecentUser(selectedUser);

      if (isMagazineReturnPath(redirect)) {
        window.location.assign(redirect);
        return;
      }

      // Hard redirect or navigate so Better-Auth session cookie is active
      window.location.assign(redirect || "/");
    } catch (err) {
      setPinError("Network error. Please try again.");
      setPinSubmitting(false);
    }
  };

  // Traditional Password Submit
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const result = await authClient.signIn.email({ email, password });
    setIsSubmitting(false);
    if (result.error) {
      setError(result.error.message ?? "Unable to sign in");
      return;
    }
    if (isMagazineReturnPath(redirect)) {
      window.location.assign(redirect);
      return;
    }
    await navigate({ to: redirect || "/" });
  };

  const signInWithGoogle = async () => {
    setError(null);
    setIsGoogleSubmitting(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: isMagazineReturnPath(redirect) ? "/" : redirect || "/",
        errorCallbackURL: "/login",
      });
      if (result.error) setError(result.error.message || "Unable to sign in with Google");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in with Google");
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-lg animate-page-transition space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Acme ERP</p>
            <h1 className="text-xl font-bold tracking-tight">Hospital Suite</h1>
          </div>
        </div>

        <Card className="border-border/60 shadow-md">
          {/* Dual Login Mode Tabs */}
          <div className="grid grid-cols-2 p-1.5 bg-muted/60 border-b border-border/50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setLoginMode("pin");
                setPinError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${
                loginMode === "pin"
                  ? "bg-background text-primary shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone size={15} />
              <span>Mobile PIN (Shared PC)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode("password");
                setError(null);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all ${
                loginMode === "password"
                  ? "bg-background text-primary shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <KeyRound size={15} />
              <span>Password Login</span>
            </button>
          </div>

          <CardHeader className="pb-3 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {loginMode === "pin" ? "Fast Workstation Sign In" : "Sign In with Password"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {loginMode === "pin"
                    ? "Safe login for shared clinical computers using your phone"
                    : "Standard account credentials with password"}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] gap-1 px-2 py-0.5 border-primary/30 text-primary">
                {loginMode === "pin" ? <Sparkles size={11} className="text-amber-500" /> : <ShieldCheck size={11} />}
                {loginMode === "pin" ? "No Password Needed" : "Secure Auth"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-1">
            {/* ============================================================== */}
            {/* MODE 1: MOBILE 6-DIGIT PIN AUTHENTICATION                      */}
            {/* ============================================================== */}
            {loginMode === "pin" && (
              <div className="space-y-4">
                {/* 1. Recent Station Users Picker */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Laptop size={13} className="text-primary" />
                      Recent Station Users
                    </Label>
                    <span className="text-[11px] text-muted-foreground">Select your name</span>
                  </div>

                  {recentUsers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {recentUsers.map((u) => {
                        const isSelected = selectedUser?.userId === u.userId;
                        const initials = u.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase();

                        return (
                          <div
                            key={u.userId}
                            onClick={() => {
                              setSelectedUser(u);
                              setPinError(null);
                              setPinDigits(["", "", "", "", "", ""]);
                              pinRefs.current[0]?.focus();
                            }}
                            className={`group relative flex items-center gap-2.5 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                                : "border-border/70 hover:border-primary/50 hover:bg-muted/40"
                            }`}
                          >
                            {/* Avatar */}
                            <div
                              className={`size-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {initials || <User size={14} />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold truncate text-foreground leading-tight">{u.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {u.employeeCode} • {u.department || u.role}
                              </p>
                            </div>

                            {/* Remove from local workstation memory button */}
                            <button
                              type="button"
                              onClick={(e) => removeRecentUser(u.userId, e)}
                              className="size-5 rounded-md text-muted-foreground/60 hover:text-rose-500 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center"
                              title="Remove from this workstation's recent list"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-1">
                      No recent users at this workstation yet. Search below to select your profile.
                    </p>
                  )}
                </div>

                {/* 2. Staff Search / Not in List Dropdown */}
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      />
                      <Input
                        type="text"
                        placeholder="Not in list? Search staff name or ID..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSearchDropdown(true);
                        }}
                        onFocus={() => setShowSearchDropdown(true)}
                        className="pl-9 text-xs h-9"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setSearchResults([]);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Results */}
                  {showSearchDropdown && (searchQuery.trim().length > 0 || isSearching) && (
                    <div className="absolute z-50 left-0 right-0 top-full mt-1.5 rounded-xl border bg-popover text-popover-foreground shadow-lg max-h-56 overflow-y-auto p-1.5 space-y-1">
                      {isSearching ? (
                        <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                          <RefreshCw size={14} className="animate-spin text-primary" />
                          Searching staff directory...
                        </div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((staffItem) => (
                          <div
                            key={staffItem.userId}
                            onClick={() => {
                              setSelectedUser(staffItem);
                              saveRecentUser(staffItem);
                              setSearchQuery("");
                              setShowSearchDropdown(false);
                              setPinError(null);
                              setPinDigits(["", "", "", "", "", ""]);
                              pinRefs.current[0]?.focus();
                            }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="size-7 rounded-md bg-primary/10 text-primary font-bold text-[10px] grid place-items-center">
                                {staffItem.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{staffItem.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {staffItem.employeeCode} • {staffItem.department} ({staffItem.role})
                                </p>
                              </div>
                            </div>
                            <ArrowRight size={13} className="text-muted-foreground" />
                          </div>
                        ))
                      ) : (
                        <div className="py-3 text-center text-xs text-muted-foreground">
                          No active staff found matching &quot;{searchQuery}&quot;
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. 6-Digit PIN Box Input */}
                {selectedUser ? (
                  <div className="pt-2 space-y-3.5 border-t border-border/50">
                    <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-xl border border-border/60">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="size-8 rounded-lg bg-primary text-primary-foreground font-bold text-xs grid place-items-center shrink-0">
                          {selectedUser.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                            Signing in as
                          </span>
                          <p className="text-xs font-bold text-foreground truncate">
                            {selectedUser.name}{" "}
                            <span className="font-normal text-muted-foreground text-[11px]">
                              ({selectedUser.employeeCode})
                            </span>
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-background">
                        {selectedUser.department}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground">
                          Enter 6-Digit Mobile PIN:
                        </Label>
                        <span className="text-[11px] text-muted-foreground">Auto-submits on 6th digit</span>
                      </div>

                      {/* 6 Segmented Digit Boxes */}
                      <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                        {pinDigits.map((digit, idx) => (
                          <React.Fragment key={idx}>
                            {idx === 3 && (
                              <span className="text-muted-foreground font-bold text-lg select-none">•</span>
                            )}
                            <input
                              ref={(el) => {
                                pinRefs.current[idx] = el;
                              }}
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={idx === 0 ? 6 : 1}
                              value={digit}
                              onChange={(e) => handlePinChange(idx, e.target.value)}
                              onKeyDown={(e) => handlePinKeyDown(idx, e)}
                              disabled={pinSubmitting}
                              className="size-11 sm:size-12 rounded-xl border-2 border-border/80 bg-background text-center font-mono text-xl sm:text-2xl font-black text-foreground shadow-sm transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none disabled:opacity-50"
                            />
                          </React.Fragment>
                        ))}
                      </div>

                      {pinError && (
                        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive text-center">
                          {pinError}
                        </p>
                      )}

                      <Button
                        type="button"
                        onClick={() => void submitPin()}
                        disabled={pinSubmitting || pinDigits.join("").length !== 6}
                        className="w-full gap-2 mt-2 h-10 font-bold"
                      >
                        {pinSubmitting ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            Verifying Workstation PIN...
                          </>
                        ) : (
                          <>
                            <LogIn size={15} />
                            Sign In to Workstation
                          </>
                        )}
                      </Button>

                      {/* Mobile instructions hint */}
                      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
                        <Smartphone size={16} className="text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-foreground">Need a PIN?</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed">
                            Open ACME ERP on your personal phone and tap <strong>&quot;Desktop PIN&quot;</strong> in the header bar.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center border-2 border-dashed rounded-xl p-4 space-y-2">
                    <User size={28} className="mx-auto text-muted-foreground/60" />
                    <p className="text-xs font-semibold text-foreground">Select your profile above</p>
                    <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                      Choose your name from recent users or search for your account to enter your 6-digit mobile PIN.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* MODE 2: TRADITIONAL PASSWORD AUTHENTICATION                    */}
            {/* ============================================================== */}
            {loginMode === "password" && (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="name@hospital.com"
                  />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                {error && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button className="w-full" disabled={isSubmitting}>
                  <LogIn size={16} />
                  {isSubmitting ? "Signing in..." : "Sign in"}
                </Button>

                {googleEnabled && (
                  <>
                    <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="h-px flex-1 bg-border" />
                      <span>or</span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={isGoogleSubmitting}
                      onClick={() => setGoogleConfirmOpen(true)}
                    >
                      <span className="font-bold text-base" aria-hidden="true">
                        G
                      </span>
                      {isGoogleSubmitting ? "Connecting to Google..." : "Continue with Google"}
                    </Button>
                  </>
                )}
              </form>
            )}
          </CardContent>
        </Card>

        {/* Google Confirmation Dialog */}
        <Dialog open={googleConfirmOpen} onOpenChange={setGoogleConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Google sign-in approval</DialogTitle>
              <DialogDescription>
                Google sign-in is available only to staff approved by HR or an Administrator. Please confirm you have
                received approval before continuing.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGoogleConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setGoogleConfirmOpen(false);
                  void signInWithGoogle();
                }}
              >
                Yes, I have approval
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PwaInstallHelp />

        {/* Latest Published Magazine Issues */}
        <PublishedMagazineSection variant="login" limit={3} />

        {/* Public Legal & Compliance Links */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-4 pb-2">
          <a href="/policy" className="hover:underline hover:text-foreground transition-colors">
            Privacy Policy
          </a>
          <span aria-hidden="true">&bull;</span>
          <a href="/terms" className="hover:underline hover:text-foreground transition-colors">
            Terms of Service
          </a>
          <span aria-hidden="true">&bull;</span>
          <a href="/" className="hover:underline hover:text-foreground transition-colors">
            About System
          </a>
        </div>
      </div>
    </main>
  );
}
