import { createFileRoute, redirect } from "@tanstack/react-router";
import { Shell } from "../components/Shell";
import { authClient } from "../services/auth";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href
        }
      });
    }
    const role = (session.data.user.role || "").trim().toLowerCase();
    // Force password change if the flag is set (only for standard credential accounts, never for doctor candidates)
    if (session.data.user.mustChangePassword && role !== "doctor_candidate" && location.pathname !== "/change-password") {
      throw redirect({ to: "/change-password" });
    }

    // External doctor candidates are strictly confined to the Doctor CBT module
    if (role === "doctor_candidate") {
      const isAllowed =
        location.pathname === "/doctor-cbt" ||
        (location.pathname.startsWith("/doctor-cbt/") &&
          !location.pathname.startsWith("/doctor-cbt/candidates") &&
          !location.pathname.startsWith("/doctor-cbt/settings")) ||
        location.pathname === "/settings" ||
        location.pathname === "/change-password";

      if (!isAllowed) {
        throw redirect({ to: "/doctor-cbt" });
      }
    }
    return {
      session: {
        ...session.data,
        data: session.data
      }
    };
  },
  component: Shell
});
