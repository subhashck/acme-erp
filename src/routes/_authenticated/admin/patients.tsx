import { createFileRoute, redirect } from "@tanstack/react-router";
import { PatientDirectory } from "@/components/PatientDirectory";
import { authClient } from "@/services/auth";

export const Route = createFileRoute("/_authenticated/admin/patients")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data?.user.role !== "admin") throw redirect({ to: "/" });
  },
  component: PatientDirectory,
});
