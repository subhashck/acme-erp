import { createFileRoute } from "@tanstack/react-router";
import { CbtCertificatePage } from "../../../components/assessments/CbtCertificate";

export const Route = createFileRoute("/_authenticated/assessments/certificates/$attemptId")({ component: CertificateRoute });
function CertificateRoute() {
  const { attemptId } = Route.useParams();
  return <CbtCertificatePage attemptId={attemptId} />;
}
