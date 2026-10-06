import { RefreshCw } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FrontOfficeAccessGuard } from "@/components/FrontOfficeAccessGuard";
import { ModuleLayout } from "@/components/ModuleLayout";
import { DataTable, type ColumnDef } from "@/components/DataTable";

type ReportRow = Record<string, unknown>;

function parseReport(html: string): { rows: ReportRow[]; columns: ColumnDef<ReportRow>[] } {
  const document = new DOMParser().parseFromString(html, "text/html");
  const table = [...document.querySelectorAll("table")].sort((a, b) => b.rows.length - a.rows.length)[0];
  if (!table || table.rows.length < 2) return { rows: [], columns: [] };
  const headers = [...table.rows[0].cells].map((cell, index) => cell.textContent?.trim() || `Column ${index + 1}`);
  const rows = [...table.rows].slice(1).map((row, rowIndex) => Object.fromEntries(headers.map((header, index) => [header, row.cells[index]?.textContent?.trim() || ""])));
  return { rows, columns: headers.map((header) => [header, header] as ColumnDef<ReportRow>) };
}

export const Route = createFileRoute("/_authenticated/front-office/opd-collection")({
  component: () => {
    const [reportHtml, setReportHtml] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState("Ready to generate");
    const generate = async () => {
      setIsGenerating(true);
      setStatus("Generating report…");
      try {
        const response = await fetch("/api/front-office/opd-collection/generate", { method: "POST" });
        const result = await response.json();
        if (!response.ok || !result.success) { setStatus(result.error || "Report generation failed"); return; }
        setReportHtml(result.html);
        setStatus(`Generated at ${new Date(result.generatedAt).toLocaleString()}`);
      } finally { setIsGenerating(false); }
    };
    const parsed = reportHtml ? parseReport(reportHtml) : { rows: [], columns: [] };
    return <FrontOfficeAccessGuard><ModuleLayout title="OPD Collection Detail" description="Automated HMS OPD collection report."><div className="overflow-hidden rounded-lg border bg-background shadow-sm"><div className="flex items-center justify-between border-b px-4 py-2 text-sm text-muted-foreground"><span>{status}</span><Button type="button" variant="outline" size="sm" className="gap-2" disabled={isGenerating} onClick={() => void generate()}>{isGenerating ? <Spinner className="size-4" /> : <RefreshCw className="size-4" />}{isGenerating ? "Generating…" : "Generate report"}</Button></div>{reportHtml ? <DataTable rows={parsed.rows} columns={parsed.columns} enableFiltering enableSorting enablePagination defaultPageSize={25} filterPlaceholder="Search report" /> : <div className="flex min-h-[300px] items-center justify-center p-8 text-sm text-muted-foreground">Click Generate report to run the HMS workflow.</div>}</div></ModuleLayout></FrontOfficeAccessGuard>;
  },
});
