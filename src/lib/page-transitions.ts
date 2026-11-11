// Typed view transitions let the router skip filters and same-page navigation.
export function supportsPageViewTransitions() {
  return typeof document !== "undefined" &&
    typeof document.startViewTransition === "function" &&
    typeof CSS !== "undefined" &&
    CSS.supports("selector(:active-view-transition-type(page))");
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
