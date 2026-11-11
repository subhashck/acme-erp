import { createFileRoute } from "@tanstack/react-router";
import { FrontOfficeAccessGuard } from "@/components/FrontOfficeAccessGuard";
import { PatientDirectory } from "@/components/PatientDirectory";

export const Route = createFileRoute("/_authenticated/front-office/patients")({
  component: () => (
    <FrontOfficeAccessGuard>
      <PatientDirectory />
    </FrontOfficeAccessGuard>
  ),
});
