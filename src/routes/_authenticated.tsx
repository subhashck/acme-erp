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
    // Force password change if the flag is set
    if (session.data.user.mustChangePassword && location.pathname !== "/change-password") {
      throw redirect({ to: "/change-password" });
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
