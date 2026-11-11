import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileBarChart, 
  Search, 
  RefreshCw, 
  Loader2, 
  Printer, 
  Warehouse,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  AlertCircle,
  ShoppingCart,
  Download,
  Clock,
  Layers,
  ArrowDownRight
} from "lucide-react";
import * as React from "react";
import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/utils/cn";
import { useHospitalSettings } from "@/lib/settings";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const reportSearchSchema = z.object({
  tab: z.enum(["valuation", "expiry", "reorder"]).optional().catch("valuation"),
  storeId: z.string().optional().catch("all"),
  days: z.string().optional().catch("90"),
});

export const Route = createFileRoute("/_authenticated/inventory/reports/")({
  validateSearch: (search) => reportSearchSchema.parse(search),
  component: InventoryReports,
});

function InventoryReports() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const activeTab = searchParams.tab || "valuation";
  const storeIdFilter = searchParams.storeId || "all";
  const daysFilter = searchParams.days || "90";

  const hospitalSettings = useHospitalSettings();

  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  const selectedStoreName = React.useMemo(() => {
    if (storeIdFilter === "all") return "All Stores";
    const found = storesList.find((s: any) => String(s.id) === storeIdFilter);
    return found ? found.name : "All Stores";
  }, [storesList, storeIdFilter]);

  // Valuation Report Query
  const { data: valuationResponse, isLoading: isValuationLoading, refetch: refetchValuation, isRefetching: isValuationRefetching } = useRpcQuery<any>(
    ["inventory-reports-valuation", storeIdFilter],
    () =>
      client.inventory.reports["stock-valuation"].$get({
        query: {
          storeId: storeIdFilter !== "all" ? storeIdFilter : undefined,
        },
      }),
    { enabled: activeTab === "valuation" }
  );

  // Expiry Alert Query
  const { data: expiryList = [], isLoading: isExpiryLoading, refetch: refetchExpiry, isRefetching: isExpiryRefetching } = useRpcQuery<any[]>(
    ["inventory-reports-expiry", storeIdFilter, daysFilter],
    () =>
      client.inventory.reports["expiry-alert"].$get({
        query: {
          storeId: storeIdFilter !== "all" ? storeIdFilter : undefined,
          days: daysFilter,
        },
      }),
    { enabled: activeTab === "expiry" }
  );

  // Reorder Alerts Query
  const { data: reorderList = [], isLoading: isReorderLoading, refetch: refetchReorder, isRefetching: isReorderRefetching } = useRpcQuery<any[]>(
    ["inventory-reports-reorder"],
    () => client.inventory.reports["reorder-alerts"].$get(),
    { enabled: activeTab === "reorder" }
  );

  const valuationSummary = valuationResponse?.summary || { totalItems: 0, totalCostValuation: 0, totalMrpValuation: 0 };
  const valuationRows = valuationResponse?.data || [];

  const isCurrentLoading = activeTab === "valuation" ? isValuationLoading : activeTab === "expiry" ? isExpiryLoading : isReorderLoading;
  const isCurrentRefetching = activeTab === "valuation" ? isValuationRefetching : activeTab === "expiry" ? isExpiryRefetching : isReorderRefetching;

  const handleTabChange = (tab: "valuation" | "expiry" | "reorder") => {
    navigate({ search: (prev) => ({ ...prev, tab }) });
  };

  const handleStoreChange = (storeId: string) => {
    navigate({ search: (prev) => ({ ...prev, storeId }) });
  };

  const handleDaysChange = (days: string) => {
    navigate({ search: (prev) => ({ ...prev, days }) });
  };

  // Build jsPDF Document for the current report
  const buildReportPDFDoc = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const margin = 10;
    let currentY = 12;

    // Header
    const orgName = hospitalSettings?.name || "ACME HOSPITAL PHARMACY";
    const orgAddress = hospitalSettings?.address || "Medical District, Healthcare Ave";
    const orgPhone = hospitalSettings?.phone || "+91 98765 43210";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(orgName.toUpperCase(), pageWidth / 2, currentY, { align: "center" });
    currentY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`${orgAddress} • Phone: ${orgPhone}`, pageWidth / 2, currentY, { align: "center" });
    currentY += 6;

    // Title banner
    let title = "STOCK VALUATION REPORT";
    if (activeTab === "expiry") title = `BATCH EXPIRATION RISK REPORT (${daysFilter === "0" ? "EXPIRED" : `WITHIN ${daysFilter} DAYS`})`;
    if (activeTab === "reorder") title = "LOW STOCK & REORDER TRIGGER REPORT";

    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, 7, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageWidth / 2, currentY + 4.8, { align: "center" });
    currentY += 10;

    // Meta box
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy hh:mm a")}`, margin, currentY);
    if (activeTab !== "reorder") {
      doc.text(`Filter Store: ${selectedStoreName}`, pageWidth - margin, currentY, { align: "right" });
    }
    currentY += 4;

    // Table Content
    if (activeTab === "valuation") {
      const head = [["#", "Store", "Item Description", "Batch", "Expiry", "Qty", "Cost (Rs)", "Total Cost (Rs)"]];
      const body = valuationRows.map((r: any, idx: number) => [
        String(idx + 1),
        r.storeName || "-",
        r.itemName || "-",
        r.batchNumber || "-",
        r.expiryDate || "-",
        `${r.quantityOnHand} ${r.unit || ""}`,
        Number(r.purchaseRate || 0).toFixed(2),
        Number(r.totalCostValue || 0).toFixed(2),
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head,
        body: body.length > 0 ? body : [["-", "No valuation records found", "-", "-", "-", "-", "-", "-"]],
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
        styles: { fontSize: 7.2, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 32 },
          2: { cellWidth: 50, fontStyle: "bold" },
          3: { cellWidth: 24, halign: "center" },
          4: { cellWidth: 20, halign: "center" },
          5: { cellWidth: 16, halign: "center" },
          6: { cellWidth: 18, halign: "right" },
          7: { cellWidth: 22, halign: "right", fontStyle: "bold" },
        },
      });
    } else if (activeTab === "expiry") {
      const head = [["#", "Item Description", "Store", "Batch", "Expiry Date", "Days Left", "Qty at Risk", "Value (Rs)"]];
      const body = expiryList.map((r: any, idx: number) => {
        const expStr = String(r.expiryDate || "");
        const expiry = new Date(expStr);
        const today = new Date();
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));
        const daysLabel = diffDays <= 0 ? "Expired" : `${diffDays} days`;

        return [
          String(idx + 1),
          r.itemName || "-",
          r.storeName || "-",
          r.batchNumber || "-",
          expStr,
          daysLabel,
          `${r.quantityOnHand} ${r.unit || ""}`,
          Number(r.totalValue || 0).toFixed(2),
        ];
      });

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head,
        body: body.length > 0 ? body : [["-", "No expiring records found", "-", "-", "-", "-", "-", "-"]],
        theme: "striped",
        headStyles: { fillColor: [190, 24, 93], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
        styles: { fontSize: 7.2, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 50, fontStyle: "bold" },
          2: { cellWidth: 32 },
          3: { cellWidth: 24, halign: "center" },
          4: { cellWidth: 22, halign: "center" },
          5: { cellWidth: 18, halign: "center" },
          6: { cellWidth: 16, halign: "center" },
          7: { cellWidth: 20, halign: "right", fontStyle: "bold" },
        },
      });
    } else {
      const head = [["#", "Item Name", "Current Stock", "Reorder Level", "Recommended PO Qty", "Est. Unit Rate (Rs)"]];
      const body = reorderList.map((r: any, idx: number) => [
        String(idx + 1),
        r.itemName || "-",
        `${r.currentStock || 0} ${r.unit || ""}`,
        `${r.reorderLevel || 0} ${r.unit || ""}`,
        `${r.reorderQty || 0} ${r.unit || ""}`,
        Number(r.rate || 0).toFixed(2),
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head,
        body: body.length > 0 ? body : [["-", "No items below reorder level", "-", "-", "-", "-"]],
        theme: "striped",
        headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5 },
        styles: { fontSize: 7.2, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 8, halign: "center" },
          1: { cellWidth: 70, fontStyle: "bold" },
          2: { cellWidth: 28, halign: "center" },
          3: { cellWidth: 28, halign: "center" },
          4: { cellWidth: 30, halign: "center", fontStyle: "bold" },
          5: { cellWidth: 26, halign: "right" },
        },
      });
    }

    return doc;
  };

  const handlePrint = () => {
    const doc = buildReportPDFDoc();
    const pdfBlob = doc.output("blob");
    const blobUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(blobUrl, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    }
  };

  const handleDownload = () => {
    const doc = buildReportPDFDoc();
    doc.save(`Inventory-${activeTab}-report.pdf`);
  };

  const valuationColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      id: "storeName",
      label: "Store Location",
      render: (row) => (
        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
          <span>{String(row.storeName || "")}</span>
        </div>
      ),
    },
    {
      id: "itemName",
      label: "Item Description & Batch",
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{String(row.itemName || "")}</span>
          <span className="text-[11px] text-muted-foreground font-mono block">Batch: {String(row.batchNumber || "")}</span>
        </div>
      ),
    },
    {
      id: "expiryDate",
      label: "Expiry Date",
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{String(row.expiryDate || "")}</span>
      ),
    },
    {
      id: "quantityOnHand",
      label: "On Hand Qty",
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
          {Number(row.quantityOnHand || 0)} {String(row.unit || "")}
        </span>
      ),
    },
    {
      id: "purchaseRate",
      label: "Cost Rate",
      render: (row) => (
        <span className="font-mono text-muted-foreground">Rs. {Number(row.purchaseRate || 0).toFixed(2)}</span>
      ),
    },
    {
      id: "totalCostValue",
      label: "Total Cost Value",
      render: (row) => (
        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
          Rs. {Number(row.totalCostValue || 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "totalMrpValue",
      label: "Total MRP Value",
      render: (row) => (
        <span className="font-mono text-muted-foreground">
          Rs. {Number(row.totalMrpValue || 0).toFixed(2)}
        </span>
      ),
    },
  ];

  const expiryColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      id: "itemName",
      label: "Item Description & Batch",
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{String(row.itemName || "")}</span>
          <span className="text-[11px] text-muted-foreground font-mono block">Batch: {String(row.batchNumber || "")}</span>
        </div>
      ),
    },
    {
      id: "storeName",
      label: "Store Location",
      render: (row) => (
        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
          <span>{String(row.storeName || "")}</span>
        </div>
      ),
    },
    {
      id: "expiryDate",
      label: "Expiry Date & Days Left",
      render: (row) => {
        const expStr = String(row.expiryDate || "");
        const expiry = new Date(expStr);
        const today = new Date();
        const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));

        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold">{expStr}</span>
            {diffDays <= 0 ? (
              <Badge className="bg-rose-600 text-white text-[10px]">Expired</Badge>
            ) : diffDays <= 30 ? (
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">{diffDays} days left</Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">{diffDays} days left</Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "quantityOnHand",
      label: "At-Risk Qty",
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
          {Number(row.quantityOnHand || 0)} {String(row.unit || "")}
        </span>
      ),
    },
    {
      id: "totalValue",
      label: "Value at Risk",
      render: (row) => (
        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
          Rs. {Number(row.totalValue || 0).toFixed(2)}
        </span>
      ),
    },
  ];

  const reorderColumns: ColumnDef<Record<string, unknown>>[] = [
    {
      id: "itemName",
      label: "Item Name",
      render: (row) => (
        <span className="font-semibold text-slate-900 dark:text-slate-100">{String(row.itemName || "")}</span>
      ),
    },
    {
      id: "currentStock",
      label: "Available Stock",
      render: (row) => (
        <span className="font-mono font-bold text-rose-600">
          {Number(row.currentStock || 0)} {String(row.unit || "")}
        </span>
      ),
    },
    {
      id: "reorderLevel",
      label: "Reorder Trigger Level",
      render: (row) => (
        <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
          {Number(row.reorderLevel || 0)} {String(row.unit || "")}
        </span>
      ),
    },
    {
      id: "reorderQty",
      label: "Recommended PO Qty",
      render: (row) => (
        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 font-mono font-bold">
          {Number(row.reorderQty || 0)} {String(row.unit || "")}
        </Badge>
      ),
    },
    {
      id: "rate",
      label: "Est. Unit Rate",
      render: (row) => (
        <span className="font-mono text-muted-foreground">Rs. {Number(row.rate || 0).toFixed(2)}</span>
      ),
    },
  ];

  return (
    <ModuleLayout
      title="Inventory Reports & Analytics"
      description="Stock valuation, batch expiration risk tracking, reorder planning, and store analytics"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (activeTab === "valuation") refetchValuation();
              else if (activeTab === "expiry") refetchExpiry();
              else refetchReorder();
            }}
            disabled={isCurrentRefetching}
            className="h-9 text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isCurrentRefetching && "animate-spin")} />
            Refresh
          </Button>
          <Button 
            variant="outline"
            size="sm" 
            onClick={handleDownload}
            className="h-9 text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export PDF
          </Button>
          <Button 
            size="sm" 
            onClick={handlePrint}
            className="h-9 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Report
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs & Store Filter with shadcn Components */}
        <Card className="shadow-sm border-slate-200/80">
          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === "valuation" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTabChange("valuation")}
                className={cn(
                  "h-9 text-xs font-semibold",
                  activeTab === "valuation" && "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                <Package className="w-3.5 h-3.5 mr-1.5" />
                Stock Valuation
              </Button>
              <Button
                variant={activeTab === "expiry" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTabChange("expiry")}
                className={cn(
                  "h-9 text-xs font-semibold",
                  activeTab === "expiry" && "bg-rose-600 hover:bg-rose-700 text-white"
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                Batch Expiry Alert
              </Button>
              <Button
                variant={activeTab === "reorder" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTabChange("reorder")}
                className={cn(
                  "h-9 text-xs font-semibold",
                  activeTab === "reorder" && "bg-amber-600 hover:bg-amber-700 text-white"
                )}
              >
                <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                Reorder & Low Stock
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {activeTab !== "reorder" && (
                <div className="w-[180px]">
                  <Select value={storeIdFilter} onValueChange={handleStoreChange}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Stores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stores</SelectItem>
                      {storesList.map((store: any) => (
                        <SelectItem key={store.id} value={String(store.id)}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeTab === "expiry" && (
                <div className="w-[160px]">
                  <Select value={daysFilter} onValueChange={handleDaysChange}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Expiry Window" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">Within 30 Days</SelectItem>
                      <SelectItem value="60">Within 60 Days</SelectItem>
                      <SelectItem value="90">Within 90 Days</SelectItem>
                      <SelectItem value="0">Expired Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tab 1: Valuation Report */}
        {activeTab === "valuation" && (
          <div className="space-y-6">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 grid place-items-center">
                    <Package className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Distinct Batches in Stock</p>
                    <p className="text-2xl font-bold font-mono mt-0.5">{valuationSummary.totalItems}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 grid place-items-center">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total Cost Valuation (FIFO)</p>
                    <p className="text-2xl font-bold font-mono text-emerald-600 mt-0.5">
                      Rs. {valuationSummary.totalCostValuation.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 grid place-items-center">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total MRP / Retail Value</p>
                    <p className="text-2xl font-bold font-mono text-purple-700 dark:text-purple-400 mt-0.5">
                      Rs. {valuationSummary.totalMrpValuation.toLocaleString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Valuation Data Table */}
            <Card className="shadow-sm">
              <CardContent className="p-6">
                {isValuationLoading ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground text-xs">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mr-2" />
                    <span>Loading valuation report...</span>
                  </div>
                ) : valuationRows.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground text-xs">
                    No stock batches found for this store location.
                  </div>
                ) : (
                  <DataTable columns={valuationColumns} rows={valuationRows as Record<string, unknown>[]} />
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 2: Expiry Alerts */}
        {activeTab === "expiry" && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-base">
                <AlertTriangle className="w-5 h-5" /> Batches Approaching Expiration
              </CardTitle>
              <CardDescription>
                Batches expiring within the selected window requiring immediate dispensing prioritization or vendor return.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              {isExpiryLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-600 mr-2" />
                  <span>Scanning batch expiration dates...</span>
                </div>
              ) : expiryList.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-sm font-semibold text-emerald-600">No expiring batches found in this time window</p>
                  <p className="text-xs text-muted-foreground mt-1">All store batches have healthy shelf life.</p>
                </div>
              ) : (
                <DataTable columns={expiryColumns} rows={expiryList as Record<string, unknown>[]} />
              )}
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Reorder & Low Stock Alerts */}
        {activeTab === "reorder" && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-base">
                <AlertCircle className="w-5 h-5" /> Reorder Level & Low Stock Alerts
              </CardTitle>
              <CardDescription>
                Items where total warehouse inventory is below the configured minimum reorder threshold.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-4">
              {isReorderLoading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-600 mr-2" />
                  <span>Checking item stock levels...</span>
                </div>
              ) : reorderList.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-sm font-semibold text-emerald-600">All item inventory levels are healthy</p>
                  <p className="text-xs text-muted-foreground mt-1">No items currently below minimum reorder thresholds.</p>
                </div>
              ) : (
                <DataTable columns={reorderColumns} rows={reorderList as Record<string, unknown>[]} />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ModuleLayout>
  );
}

