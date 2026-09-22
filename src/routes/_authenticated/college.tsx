import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { queryClient } from "@/lib/query";

export const Route = createFileRoute("/_authenticated/college")({
  beforeLoad: async ({ context }) => {
    const session = (context as any)?.session;
    const role = (session?.user?.role || "").trim().toLowerCase();
    if (role === "admin" || role === "accounts" || role === "acon") {
      return;
    }

    // Check current staff's department
    const staff = await queryClient.ensureQueryData({
      queryKey: ["current-staff"],
      queryFn: async () => {
        const res = await fetch("/api/staff/me");
        if (!res.ok) return null;
        return res.json();
      },
      staleTime: 10 * 60 * 1000,
    });

    const staffDept = (staff?.departmentName || "").trim().toUpperCase();
    const isAccounts = staffDept === "ACCOUNTS";
    const isAcon = staffDept === "ACON";

    if (!isAccounts && !isAcon) {
      throw redirect({
        to: "/",
      });
    }
  },
  component: () => <Outlet />,
});
