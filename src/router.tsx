import { createRouter, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { routeTree } from "./routeTree.gen";
import { prefersReducedMotion, supportsPageViewTransitions } from "./lib/page-transitions";

function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const message = error instanceof Error ? error.message : String(error ?? "");
  const networkFailure = error instanceof TypeError || /failed to fetch|networkerror|network request failed|load failed/i.test(message);

  const retry = async () => {
    reset();
    await router.invalidate();
  };

  return (
    <main className="grid min-h-[60vh] place-items-center bg-background px-4 py-10 text-foreground" role="alert">
      <section className="w-full max-w-lg rounded-xl border bg-card p-6 text-center shadow-sm">
        <AlertTriangle className="mx-auto mb-3 size-8 text-amber-600" aria-hidden="true" />
        <h1 className="text-xl font-semibold">{networkFailure ? "Can’t connect to the server" : "This page couldn’t be loaded"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {networkFailure
            ? "Check your internet connection and make sure the ERP server is running, then try again. Your unsaved changes may not have been saved."
            : "Please try again. If the problem continues, return to the previous page and contact support."}
        </p>
        <Button className="mt-5 min-h-11" onClick={() => void retry()}>
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </Button>
      </section>
    </main>
  );
}

export const router = createRouter({
  routeTree,
  defaultErrorComponent: RouteError,
  defaultViewTransition: supportsPageViewTransitions() ? {
    types: ({ fromLocation, pathChanged }) =>
      fromLocation && pathChanged && !prefersReducedMotion() ? ["page"] : false
  } : false
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
