import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CbtCertificateDocument } from "../../src/components/assessments/CbtCertificate";
import { canPrintCbtCertificate, type CbtCertificate } from "../../src/lib/cbt-certificate";
import { CbtCertificateBarcode } from "../../src/components/assessments/CbtCertificateBarcode";
import sharp from "sharp";
import jsQR from "jsqr";

const certificate: CbtCertificate = {
  reference: "CBT-EXAM-2026-0100",
  hospital: { name: "ACME Hospital", address: "Imphal" },
  employee: { name: "Test Employee", code: "EMP-10", department: "Ward" },
  exam: { attemptNo: "EXAM-2026-0100", completedAt: "2026-10-14T19:00:00Z", status: "completed", score: 90,
    passPercentage: 80, passed: true, totalQuestions: 20, correctCount: 18, theoreticalRating: 4.5 },
};

describe("CBT certificate", () => {
  it("shows employee identity, recorded result, unique reference and the India examination date", () => {
    const html = renderToStaticMarkup(<CbtCertificateDocument certificate={certificate} />);
    for (const text of ["Test Employee", "EMP-10", "Ward", "90.00%", "80.00%", "CBT-EXAM-2026-0100", "15 October 2026", "Certificate of CBT Achievement"]) expect(html).toContain(text);
    expect(html).toContain('id="printable-cbt-certificate"');
  });

  it("does not describe a failed result as an achievement or pass", () => {
    const html = renderToStaticMarkup(<CbtCertificateDocument certificate={{ ...certificate, exam: { ...certificate.exam, score: 0, passed: false, status: "timed_out" } }} />);
    expect(html).toContain("CBT Result Certificate");
    expect(html).toContain("BENCHMARK NOT MET");
    expect(html).toContain("Time expired");
    expect(html).toContain("0.00%");
    expect(html).not.toContain("Certificate of CBT Achievement");
    expect(html).not.toContain("has achieved the required benchmark");
  });

  it("makes only finalized results eligible for certificate links", () => {
    expect(canPrintCbtCertificate("completed")).toBe(true);
    expect(canPrintCbtCertificate("timed_out")).toBe(true);
    expect(canPrintCbtCertificate("in_progress")).toBe(false);
    expect(canPrintCbtCertificate("abandoned")).toBe(false);
  });

  it.each(["Test Employee", "மீனா Devi"])("decodes every embedded field from the rendered QR barcode for %s", async name => {
    const details = { ...certificate, employee: { ...certificate.employee, name } };
    const markup = renderToStaticMarkup(<CbtCertificateBarcode certificate={details} />);
    const svg = markup.match(/<svg[\s\S]*?<\/svg>/)?.[0];
    expect(svg).toBeDefined();
    const raster = await sharp(Buffer.from(svg!)).resize(600, 600).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const decoded = jsQR(new Uint8ClampedArray(raster.data), raster.info.width, raster.info.height);
    expect(decoded).not.toBeNull();
    expect(JSON.parse(decoded!.data)).toEqual({ schema: "acme.cbt-certificate.v1", ...details });
  });
});
