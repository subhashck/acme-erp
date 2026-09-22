import * as React from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  FlaskConical,
  ShieldCheck,
  Calendar,
  User,
} from "lucide-react";
import { Card, CardContent } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { useHospitalSettings } from "@/lib/settings";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/lab/reports/$orderId")({
  component: LabDiagnosticReportPage,
});

function LabDiagnosticReportPage() {
  const { orderId } = useParams({ from: "/_authenticated/lab/reports/$orderId" });
  const navigate = useNavigate();
  const hospital = useHospitalSettings();

  const { data, isLoading } = useQuery({
    queryKey: ["lab-order-report", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/lab/orders/${orderId}/report`);
      if (!res.ok) throw new Error("Failed to load report data");
      return res.json();
    },
  });

  const exportPdf = () => {
    if (!data) return;
    const doc = new jsPDF();
    const order = data.order;
    const results = data.results || [];

    // Header - Hospital Branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(13, 148, 136); // Teal 600
    doc.text(hospital?.name || "ACME HOSPITAL", 14, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("DEPARTMENT OF LABORATORY MEDICINE & DIAGNOSTICS", 14, 24);
    doc.text(
      hospital?.address || "123 Healthcare Ave, Medical District",
      14,
      29
    );

    // Decorative line
    doc.setDrawColor(13, 148, 136);
    doc.setLineWidth(0.8);
    doc.line(14, 33, 196, 33);

    // Report Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("DIAGNOSTIC TEST REPORT", 14, 41);

    // Patient & Order Info Grid
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);

    // Col 1
    doc.text(`Patient Name: ${order.patientName}`, 14, 49);
    doc.text(`Age / Gender: ${order.patientAge} Yrs / ${order.patientGender}`, 14, 55);
    doc.text(`MRN: ${order.patientMrn}`, 14, 61);

    // Col 2
    doc.text(`Order No: ${order.orderNo}`, 120, 49);
    doc.text(`Referred By: ${data.doctorName || "OPD Consultant"}`, 120, 55);
    doc.text(
      `Reported Date: ${new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      120,
      61
    );

    // Table Content
    const tableBody = results.map((r: any) => {
      const isAbnormal = r.flag && r.flag !== "Normal";
      return [
        r.testName,
        r.value || "—",
        r.flag === "Normal" ? "" : r.flag || "",
        r.unit || "—",
        r.normalRangeStr || "—",
        r.method || "Standard",
      ];
    });

    autoTable(doc, {
      startY: 68,
      head: [
        [
          "INVESTIGATION",
          "OBSERVED VALUE",
          "FLAG",
          "UNIT",
          "REFERENCE INTERVAL",
          "METHOD",
        ],
      ],
      body: tableBody,
      theme: "striped",
      headStyles: {
        fillColor: [13, 148, 136],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 23, 42],
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 50 },
        1: { fontStyle: "bold", cellWidth: 32 },
        2: { fontStyle: "bold", cellWidth: 20 },
        3: { cellWidth: 20 },
        4: { cellWidth: 42 },
        5: { cellWidth: 28 },
      },
      didParseCell: (hookData) => {
        if (hookData.section === "body" && hookData.column.index === 2) {
          const val = String(hookData.cell.raw);
          if (val === "Critical") {
            hookData.cell.styles.textColor = [220, 38, 38];
          } else if (val === "High" || val === "Low") {
            hookData.cell.styles.textColor = [217, 119, 6];
          }
        }
      },
    });

    // Verification & Signatures Block
    const finalY = (doc as any).lastAutoTable?.finalY || 200;
    const sigY = Math.min(finalY + 30, 260);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Medical Laboratory Technologist", 25, sigY);
    doc.text("Consultant Pathologist / Lab Director", 130, sigY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(data.verifierName || "Dr. Pathologist (Verified)", 130, sigY + 5);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "*** This is an electronically verified diagnostic report. Generated by ACME ERP. ***",
      45,
      285
    );

    doc.save(`${order.orderNo}_Diagnostic_Report.pdf`);
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <FlaskConical className="h-8 w-8 animate-spin mx-auto mb-2 text-teal-600" />
        Generating diagnostic laboratory report...
      </div>
    );
  }

  if (!data || !data.order) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Report data not available.
      </div>
    );
  }

  const { order, doctorName, results = [], verifierName } = data;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Top action bar */}
      <div className="flex items-center justify-between no-print">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ to: `/lab/orders/${order.id}` as any })}
          className="flex items-center gap-1.5 text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Order Workspace
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-xs"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            size="sm"
            onClick={exportPdf}
            className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 text-xs shadow-sm"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Formal Diagnostic Report Document */}
      <Card className="shadow-lg border border-border bg-card print:border-none print:shadow-none p-6 sm:p-8 space-y-6">
        {/* Hospital Header Letterhead */}
        <div className="border-b-2 border-teal-600 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-teal-700 dark:text-teal-400 uppercase">
              {hospital?.name || "ACME HOSPITAL & HEALTHCARE"}
            </h1>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Department of Laboratory Medicine & Diagnostics
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {hospital?.address || "Medical District, Healthcare Campus"} • Contact: {hospital?.phone || "+91 98765 43210"}
            </p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="text-[10px] font-mono border-teal-600 text-teal-700 dark:text-teal-400">
              NABL Standard Verified
            </Badge>
            <p className="text-[10px] font-mono text-muted-foreground mt-1">
              Doc Seq: {order.orderNo}
            </p>
          </div>
        </div>

        {/* Patient & Order Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-lg bg-muted/40 text-xs border border-border">
          <div>
            <span className="text-muted-foreground block text-[11px]">Patient Name</span>
            <span className="font-bold text-foreground text-sm">{order.patientName}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">MRN</span>
            <span className="font-mono font-semibold text-foreground">{order.patientMrn}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Age / Gender</span>
            <span className="font-semibold text-foreground">{order.patientAge} Years / {order.patientGender}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Referred By</span>
            <span className="font-medium text-foreground">{doctorName || "OPD Consultant"}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Date of Collection</span>
            <span className="font-medium text-foreground">
              {new Date(order.orderedAt).toLocaleDateString("en-IN")}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Report Date & Time</span>
            <span className="font-medium text-foreground">
              {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>

        {/* Diagnostic Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-border text-muted-foreground font-semibold uppercase text-[11px]">
                <th className="py-2.5 px-2">Investigation</th>
                <th className="py-2.5 px-2">Observed Value</th>
                <th className="py-2.5 px-2">Flag</th>
                <th className="py-2.5 px-2">Unit</th>
                <th className="py-2.5 px-2">Biological Reference Interval</th>
                <th className="py-2.5 px-2">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((res: any) => {
                const isAbnormal = res.flag && res.flag !== "Normal";
                return (
                  <tr key={res.id} className="hover:bg-muted/20">
                    <td className="py-3 px-2 font-medium text-foreground">
                      {res.testName}
                      <span className="font-mono text-[10px] text-muted-foreground ml-1.5">({res.testCode})</span>
                    </td>
                    <td className="py-3 px-2 font-bold font-mono text-sm text-foreground">
                      {res.value || "—"}
                    </td>
                    <td className="py-3 px-2 font-bold">
                      {res.flag === "Normal" && (
                        <span className="text-emerald-600 dark:text-emerald-400">Normal</span>
                      )}
                      {res.flag === "Low" && (
                        <span className="text-blue-600 dark:text-blue-400">Low ↓</span>
                      )}
                      {res.flag === "High" && (
                        <span className="text-amber-600 dark:text-amber-400">High ↑</span>
                      )}
                      {res.flag === "Critical" && (
                        <span className="text-rose-600 font-extrabold animate-pulse">Critical ⚠</span>
                      )}
                    </td>
                    <td className="py-3 px-2 font-mono text-muted-foreground">
                      {res.unit || "—"}
                    </td>
                    <td className="py-3 px-2 font-mono text-muted-foreground">
                      {res.normalRangeStr || "—"}
                    </td>
                    <td className="py-3 px-2 text-muted-foreground text-[11px]">
                      {res.method || "Automated"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Verification Signatures Block */}
        <div className="pt-8 border-t border-border grid grid-cols-2 gap-8 text-xs">
          <div className="space-y-1">
            <p className="text-muted-foreground">Processed By:</p>
            <p className="font-semibold text-foreground">Medical Laboratory Technologist</p>
            <p className="text-[10px] text-muted-foreground">Clinical Diagnostic Section</p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-muted-foreground">Clinically Verified By:</p>
            <p className="font-bold text-foreground text-sm flex items-center justify-end gap-1 text-teal-700 dark:text-teal-400">
              <ShieldCheck className="h-4 w-4" />
              {verifierName || "Consultant Pathologist"}
            </p>
            <p className="text-[10px] text-muted-foreground">MD, Pathology • Reg No: MED-PATH-1029</p>
          </div>
        </div>

        {/* Footer advisory */}
        <div className="pt-4 border-t border-dashed border-border text-[10px] text-center text-muted-foreground">
          *** End of Diagnostic Laboratory Report • Please correlate clinically with patient history ***
        </div>
      </Card>
    </div>
  );
}
