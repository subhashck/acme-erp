import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";
import { prefersReducedMotion, supportsPageViewTransitions } from "../lib/page-transitions";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: location => location.pathname });
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || supportsPageViewTransitions() || prefersReducedMotion()) return;
    // Animate the existing container instead of remounting its forms and dialogs.
    const animation = element.animate([
      { opacity: 0, transform: "translateY(8px)" },
      { opacity: 1, transform: "translateY(0)" }
    ], { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    return () => animation.cancel();
  }, [pathname]);

  return <div ref={ref} className="erp-page-transition">{children}</div>;
}
