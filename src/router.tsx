import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { prefersReducedMotion, supportsPageViewTransitions } from "./lib/page-transitions";

export const router = createRouter({
  routeTree,
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
