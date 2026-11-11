import React, { useMemo } from "react";
import QRCode from "qrcode";
import type { CbtCertificate } from "../../lib/cbt-certificate";

/** Full, versioned offline payload; do not replace employee details with a URL. */
export function certificateBarcodePayload(certificate: CbtCertificate) {
  return JSON.stringify({ schema: "acme.cbt-certificate.v1", ...certificate });
}

export function CbtCertificateBarcode({ certificate }: { certificate: CbtCertificate }) {
  const symbol = useMemo(() => {
    try {
      return QRCode.create(certificateBarcodePayload(certificate), { errorCorrectionLevel: "M" });
    } catch { return null; }
  }, [certificate]);
  if (!symbol) return <p role="alert">The certificate details could not be encoded in a QR barcode. Please contact HR.</p>;
  const { size, data } = symbol.modules;
  const quietZone = 4;
  const dimension = size + quietZone * 2;
  // Vector modules remain sharp when the browser prints or exports to PDF.
  const path = Array.from(data).flatMap((dark, index) => dark
    ? [`M${index % size + quietZone} ${Math.floor(index / size) + quietZone}h1v1h-1z`] : []).join("");
  return <div className="cbt-certificate-barcode">
    <svg role="img" aria-label="QR barcode containing all certificate details" viewBox={`0 0 ${dimension} ${dimension}`} shapeRendering="crispEdges">
      <rect width={dimension} height={dimension} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
    <p>Scan for full certificate details · No internet required</p>
  </div>;
}
