import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Activity, LogIn } from "lucide-react";
import { useState } from "react";
import { authClient } from "../services/auth";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/"
  }),
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data) throw redirect({ to: "/" });
  },
  component: Login
});

function Login() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    await navigate({ to: redirect || "/" });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8 text-foreground">
      <div className="w-full max-w-sm animate-page-transition">
        <div className="mb-6 flex items-center justify-center gap-3">
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
          </CardContent>
        </Card>
        {/* <p className="mt-4 text-center text-xs text-muted-foreground">Seed admin: admin@acmehospital.local / Admin@12345</p> */}
      </div>
    </main>
  );
}
