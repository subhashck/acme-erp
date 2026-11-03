import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Activity, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { authClient } from "../services/auth";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { PublishedMagazineSection } from "../components/PublishedMagazineSection";
import { PwaInstallHelp } from "../components/PwaProvider";
import { googleAuthErrorMessage } from "../lib/google-auth-errors";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";

const isMagazineReturnPath = (path: string) => path === "/magazine/admin" || path.startsWith("/magazine/admin/");

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
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
  component: Login
});

function Login() {
  const navigate = useNavigate();
  const { redirect, error: oauthError, error_description: oauthErrorDescription } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [googleConfirmOpen, setGoogleConfirmOpen] = useState(false);

  useEffect(() => {
    if (oauthError) setError(googleAuthErrorMessage(oauthError, oauthErrorDescription));
  }, [oauthError, oauthErrorDescription]);

  useEffect(() => {
    fetch("/api/public/auth-config").then((response) => response.ok ? response.json() : null)
      .then((config) => setGoogleEnabled(config?.googleEnabled === true))
      .catch(() => setGoogleEnabled(false));
  }, []);

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
      <div className="w-full max-w-md animate-page-transition space-y-6">
        <div className="flex items-center justify-center gap-3">
          <div className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Acme ERP</p>
            <h1 className="text-xl font-semibold">Hospital Suite</h1>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
              </div>
              {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
              <Button className="w-full" disabled={isSubmitting}>
                <LogIn size={16} />
                {isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            {googleEnabled && <>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button type="button" variant="outline" className="w-full" disabled={isGoogleSubmitting} onClick={() => setGoogleConfirmOpen(true)}>
                <span className="font-bold text-base" aria-hidden="true">G</span>
                {isGoogleSubmitting ? "Connecting to Google..." : "Continue with Google"}
              </Button>
            </>}
          </CardContent>
        </Card>
        <Dialog open={googleConfirmOpen} onOpenChange={setGoogleConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Google sign-in approval</DialogTitle>
              <DialogDescription>
                Google sign-in is available only to staff approved by HR or an Administrator. Please confirm you have received approval before continuing.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setGoogleConfirmOpen(false)}>Cancel</Button>
              <Button type="button" onClick={() => { setGoogleConfirmOpen(false); void signInWithGoogle(); }}>
                Yes, I have approval
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <PwaInstallHelp />

        {/* Latest Published Magazine Issues */}
        <PublishedMagazineSection variant="login" limit={3} />
      </div>
    </main>
  );
}
