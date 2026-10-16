import React from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Award, Printer } from "lucide-react";
import { Button } from "../../ui/button";
import type { CbtCertificate } from "../../lib/cbt-certificate";
import { authClient } from "../../services/auth";
import { CbtCertificateBarcode } from "./CbtCertificateBarcode";

function certificateDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "long", year: "numeric" });
}

export function CbtCertificateDocument({ certificate }: { certificate: CbtCertificate }) {
  const { hospital, employee, exam } = certificate;
  return <article id="printable-cbt-certificate" className="cbt-certificate" data-outcome={exam.passed ? "passed" : "below-benchmark"} aria-label="CBT result certificate">
    <div className="cbt-certificate-header">
      <div className="cbt-certificate-emblem"><Award size={32} strokeWidth={1.2} aria-hidden="true" /></div>
      <div>
      <p className="cbt-certificate-hospital">{hospital.name}</p>
      {hospital.address && <p className="cbt-certificate-address">{hospital.address}</p>}
      </div>
    </div>
    <div className="cbt-certificate-rule" />
    <p className="cbt-certificate-eyebrow">Staff assessments · Computer-based examination</p>
    <h1>{exam.passed ? "Certificate of CBT Achievement" : "CBT Result Certificate"}</h1>
    <p className="cbt-certificate-intro">This certifies that</p>
    <p className="cbt-certificate-name">{employee.name}</p>
    <p className="cbt-certificate-identity">Employee ID: {employee.code}{employee.department ? ` · ${employee.department}` : ""}</p>
    <p className="cbt-certificate-statement">{exam.passed
      ? "has achieved the required benchmark in the theoretical computer-based assessment"
      : "has undertaken the theoretical computer-based assessment"}<br />on <strong>{certificateDate(exam.completedAt)}</strong>.</p>
    <div className="cbt-certificate-result">
      <div><span>Recorded score</span><strong>{exam.score.toFixed(2)}%</strong></div>
      <div><span>Passing benchmark</span><strong>{exam.passPercentage.toFixed(2)}%</strong></div>
      <div><span>Result</span><strong>{exam.passed ? "PASS" : "BENCHMARK NOT MET"}</strong></div>
    </div>
    <p className="cbt-certificate-detail">{exam.correctCount} of {exam.totalQuestions} questions correct · Theoretical rating {exam.theoreticalRating.toFixed(1)} / 5</p>
    <p className="cbt-certificate-status">Exam status: {exam.status === "timed_out" ? "Time expired — saved answers graded" : "Completed"}</p>
    <div className="cbt-certificate-footer">
      <div>
      <div className="cbt-certificate-record">
      <div><span>Examination reference</span><strong>{exam.attemptNo}</strong></div>
      <div><span>Result recorded</span><strong>{certificateDate(exam.completedAt)}</strong></div>
      </div>
      <p className="cbt-certificate-footnote">System-generated theoretical CBT result certificate<br /><span>Certificate reference</span><br /><strong>{certificate.reference}</strong></p>
      </div>
      <CbtCertificateBarcode certificate={certificate} />
    </div>
  </article>;
}

export function CbtCertificatePage({ attemptId }: { attemptId: string }) {
  const session = authClient.useSession();
  const userId = session.data?.user?.id;
  const result = useQuery<CbtCertificate>({
    queryKey: ["cbt-result-certificate", userId, attemptId],
    queryFn: async () => {
      const response = await fetch(`/api/skill-assessment/exam/attempts/${encodeURIComponent(attemptId)}/certificate`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Could not load this certificate.");
      return body;
    },
    retry: false,
    enabled: Boolean(userId),
  });
  return <div className="cbt-certificate-page min-w-0 space-y-5">
    <div className="print:hidden flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Button variant="outline" className="min-h-11 w-full sm:w-auto" asChild><Link to="/assessments">Back to Assessments</Link></Button>
      {result.data && !result.isError && <Button className="min-h-11 w-full sm:w-auto" onClick={() => window.print()}><Printer size={16} className="mr-2" aria-hidden="true" />Print / Save as PDF</Button>}
    </div>
    {!userId || result.isLoading ? <p role="status">Loading your result certificate...</p>
      : result.isError ? <div role="alert" className="rounded-xl border p-4 sm:p-6 space-y-3"><p className="break-words">{result.error.message}</p><Button className="min-h-11 w-full sm:w-auto" variant="outline" onClick={() => result.refetch()}>Retry</Button></div>
      : result.data ? <CbtCertificateDocument certificate={result.data} /> : null}
  </div>;
}
