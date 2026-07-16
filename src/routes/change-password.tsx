import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Activity, Lock, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { authClient } from "../services/auth";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export const Route = createFileRoute("/change-password")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        to: "/login",
        search: { redirect: "/change-password" }
      });
    }
    if (!session.data.user.mustChangePassword) {
      throw redirect({ to: "/" });
    }
  },
  component: ChangePassword
});

function ChangePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Password requirements
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError("Please meet all the password security requirements.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/change-password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ newPassword: password })
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(json.error || "Failed to update password");
        setIsSubmitting(false);
        return;
      }

      // Force session refetch so the client knows mustChangePassword is false
      await authClient.getSession({ query: { disableCookieCache: true } });

      setIsSubmitting(false);
      await navigate({ to: "/" });
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred.");
      setIsSubmitting(false);
    }
  };

  const Requirement = ({ met, text }: { met: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-xs transition-colors">
      {met ? (
        <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
      ) : (
        <XCircle className="size-4 text-muted-foreground/60 shrink-0" />
      )}
      <span className={met ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-muted-foreground"}>
        {text}
      </span>
    </div>
  );

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950 px-4 py-8 text-foreground">
      <div className="w-full max-w-md animate-page-transition">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Acme ERP</p>
            <h1 className="text-xl font-semibold">Hospital Suite</h1>
          </div>
        </div>

        <Card className="border border-slate-200/80 dark:border-slate-800/80 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Lock className="size-5 text-indigo-500" /> Secure Your Account
            </CardTitle>
            <CardDescription>
              For security, you must change your temporary default password before continuing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                  autoComplete="new-password"
                  placeholder="Your new password"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError(null);
                  }}
                  autoComplete="new-password"
                  placeholder="Your new password"
                  className="h-10"
                />
              </div>

              {/* Password strength checklist */}
              <div className="rounded-lg bg-slate-100/60 dark:bg-slate-900/50 p-4 border border-slate-200/30 dark:border-slate-800/30 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Password Requirements:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Requirement met={hasMinLength} text="At least 8 characters" />
                  <Requirement met={hasUppercase} text="One uppercase letter" />
                  <Requirement met={hasLowercase} text="One lowercase letter" />
                  <Requirement met={hasNumber} text="One number" />
                  <Requirement met={hasSpecial} text="One special character" />
                  <Requirement met={passwordsMatch} text="Passwords match" />
                </div>
              </div>

              {error && (
                <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive font-medium">
                  {error}
                </p>
              )}

              <Button
                className="w-full h-11 text-sm font-semibold flex items-center justify-center gap-2"
                disabled={isSubmitting || !isPasswordValid || !passwordsMatch}
              >
                {isSubmitting ? "Updating Password..." : "Change Password & Continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
