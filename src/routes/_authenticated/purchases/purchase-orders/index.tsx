import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery, queryClient } from "@/lib/query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { client } from "@/services/rpc";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Label } from "@/ui/label";
import { Field } from "@/components/Field";
import { Select } from "@/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Loader2,
  RefreshCw,
  X,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Trash2,
  Truck,
  CreditCard,
  Calendar as CalendarIcon,
  ChevronsLeft,
  ChevronLeft,
  ChevronsRight,
  FileSpreadsheet
} from "lucide-react";
import * as React from "react";
import { format } from "date-fns";
import { cn } from "@/utils/cn";
import { toNum } from "@/utils/math";
import { z } from "zod";
import XLSX from "xlsx-js-style";

// Define TanStack Router search validation schema
const poSearchSchema = z.object({
  page: z.number().optional().catch(1),
  limit: z.number().optional().catch(10),
  search: z.string().optional().catch(""),
  poStatus: z.string().optional().catch("all"),
  paymentStatus: z.string().optional().catch("all"),
  vendorId: z.string().optional().catch("all"),
  startDate: z.string().optional().catch(""),
  endDate: z.string().optional().catch(""),
});

type POSearchParams = z.infer<typeof poSearchSchema>;

// Schema for payment creation validation in frontend
const paymentFormSchema = z.object({
  paymentDate: z.string().min(1, "Date is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMode: z.enum(["cash", "upi", "card", "rtgs", "cheque", "other"]),
  referenceNo: z.string().optional(),
  remarks: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export const Route = createFileRoute("/_authenticated/purchases/purchase-orders/")({
  validateSearch: (search) => poSearchSchema.parse(search),
  component: PurchaseOrders,
});

function PurchaseOrders() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [localSearch, setLocalSearch] = React.useState(searchParams.search || "");
  const [activeMenuId, setActiveMenuId] = React.useState<number | null>(null);
  const [expandedPoId, setExpandedPoId] = React.useState<number | null>(null);
  const [selectedPaymentPo, setSelectedPaymentPo] = React.useState<any | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Fetch all vendors to support filtering
  const { data: vendors = [] } = useRpcQuery<any[]>(["vendors"], () => client.vendors.$get());

  // Fetch PO Summary metrics
  const { data: summaryData, isLoading: isSummaryLoading } = useRpcQuery<any>(
    ["purchase-orders-summary", searchParams],
    () => (client["purchase-orders"].summary as any).$get({
      query: {
        search: searchParams.search || undefined,
        poStatus: searchParams.poStatus || undefined,
        paymentStatus: searchParams.paymentStatus || undefined,
        vendorId: searchParams.vendorId || undefined,
        startDate: searchParams.startDate || undefined,
        endDate: searchParams.endDate || undefined,
      }
    })
  );

  // Fetch POs with filters
  const { data: poResponse, isLoading, error, refetch, isRefetching } = useRpcQuery<any>(
    ["purchase-orders", searchParams],
    () => client["purchase-orders"].$get({
      query: {
        search: searchParams.search || undefined,
        poStatus: searchParams.poStatus || undefined,
        paymentStatus: searchParams.paymentStatus || undefined,
        vendorId: searchParams.vendorId || undefined,
        startDate: searchParams.startDate || undefined,
        endDate: searchParams.endDate || undefined,
      }
    })
  );

  const pos = poResponse?.data || [];
  const totalItems = pos.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPOs = React.useMemo(() => {
    return pos.slice(startIndex, startIndex + pageSize);
  }, [pos, startIndex, pageSize]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchParams]);

  // Sync debounced search box
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if ((localSearch || "") !== (searchParams.search || "")) {
        navigate({
          search: (prev: any) => ({
            ...prev,
            search: localSearch || undefined,
          }),
        });
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [localSearch]);

  // Sync local search state with URL if URL changes
  React.useEffect(() => {
    setLocalSearch(searchParams.search || "");
  }, [searchParams.search]);

  // Handle outside click to close dropdown menus
  React.useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  const handleClearFilters = () => {
    setLocalSearch("");
    navigate({
      search: () => ({
        search: undefined,
        poStatus: "all",
        paymentStatus: "all",
        vendorId: "all",
        startDate: "",
        endDate: "",
      }),
    });
  };

  const handleExportExcel = () => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // 1. Build List Sheet Data
    const listRows: any[] = [];
    
    // Title & Metadata
    listRows.push(["Purchase Orders Register"]);
    listRows.push([`Generated on: ${new Date().toLocaleString()}`]);
    listRows.push([]); // blank spacer
    
    // Headers
    const headers = ["PO No", "PO Date", "Vendor Name", "Items Count", "PO Value", "PO Status", "Payment Status", "Remarks"];
    listRows.push(headers);

    // Data rows
    let sumItems = 0;
    let sumValue = 0;
    
    pos.forEach((po: any) => {
      const pValue = Number(po.totalValue || 0);
      const pItems = Number(po.itemCount || 0);
      sumItems += pItems;
      sumValue += pValue;
      
      listRows.push([
        po.poNo || "",
        po.poDate ? format(new Date(po.poDate), "dd MMM yyyy") : "",
        po.vendorName || "",
        pItems,
        pValue,
        po.poStatus ? po.poStatus.toUpperCase() : "",
        po.paymentStatus ? po.paymentStatus.toUpperCase() : "",
        po.remarks || ""
      ]);
    });

    // Footer/Total row
    listRows.push([
      "Total",
      "",
      "",
      sumItems,
      sumValue,
      "",
      "",
      ""
    ]);

    // Convert AOA to sheet
    const wsList = XLSX.utils.aoa_to_sheet(listRows);

    // Apply Styles to List Sheet
    // Title style
    wsList["A1"].s = {
      font: { name: "Calibri", sz: 16, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F766E" } }, // teal-700
      alignment: { horizontal: "center", vertical: "center" }
    };
    // Merge Title cell across header columns (A1 to H1)
    wsList["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }
    ];

    // Header styles (Row 4 is index 3)
    const headerStyle = {
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "111827" } }, // gray-900
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "374151" } },
        bottom: { style: "thin", color: { rgb: "374151" } },
        left: { style: "thin", color: { rgb: "374151" } },
        right: { style: "thin", color: { rgb: "374151" } }
      }
    };

    const borderStyle = {
      top: { style: "thin", color: { rgb: "D1D5DB" } },
      bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      left: { style: "thin", color: { rgb: "D1D5DB" } },
      right: { style: "thin", color: { rgb: "D1D5DB" } }
    };

    for (let c = 0; c < 8; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 3, c });
      if (wsList[cellRef]) wsList[cellRef].s = headerStyle;
    }

    // Row heights & column widths
    wsList["!cols"] = [
      { wch: 15 }, // PO No
      { wch: 15 }, // Date
      { wch: 25 }, // Vendor Name
      { wch: 12 }, // Items Count
      { wch: 18 }, // PO Value
      { wch: 15 }, // PO Status
      { wch: 15 }, // Payment Status
      { wch: 30 }  // Remarks
    ];

    // Apply cell styling to data rows and totals
    const numRows = listRows.length;
    for (let r = 4; r < numRows; r++) {
      const isTotalRow = (r === numRows - 1);
      for (let c = 0; c < 8; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!wsList[cellRef]) {
          // Create empty cell if not existing but we need border/total styling
          wsList[cellRef] = { t: "s", v: "" };
        }
        const cell = wsList[cellRef];
        
        // Default cell font & border
        cell.s = {
          font: { name: "Calibri", sz: 10, bold: isTotalRow },
          border: borderStyle,
          alignment: {}
        };

        if (isTotalRow) {
          cell.s.fill = { fgColor: { rgb: "F3F4F6" } }; // gray-100
        }

        // Alignments & formats
        if (c === 0 || c === 5 || c === 6) {
          // PO No, Status, Payment Status
          cell.s.alignment.horizontal = "center";
        } else if (c === 1) {
          // Date
          cell.s.alignment.horizontal = "center";
        } else if (c === 3) {
          // Items Count
          cell.s.alignment.horizontal = "right";
          if (cell.v !== "") {
            cell.t = "n";
            cell.z = "#,##0";
          }
        } else if (c === 4) {
          // PO Value
          cell.s.alignment.horizontal = "right";
          if (cell.v !== "") {
            cell.t = "n";
            cell.z = "₹#,##,##0.00";
          }
        } else {
          cell.s.alignment.horizontal = "left";
        }
      }
    }

    // 2. Build Summary Sheet Data
    const summaryRows: any[] = [];
    summaryRows.push(["Register Summary Indicators"]);
    summaryRows.push([`Generated on: ${new Date().toLocaleString()}`]);
    summaryRows.push([]); // spacer

    summaryRows.push(["Indicator Metric", "Value"]);
    summaryRows.push(["Total PO Count", totalPOs]);
    summaryRows.push(["Total PO Value", totalValue]);
    summaryRows.push(["Open POs Count", openPOs]);
    summaryRows.push(["Partially Received POs Count", partialPOs]);
    summaryRows.push(["Closed POs Count", closedPOs]);
    summaryRows.push(["Cancelled POs Count", cancelledPOs]);
    summaryRows.push(["Total Ordered Qty", totalOrderedQty]);
    summaryRows.push(["Total Received Qty", totalReceivedQty]);
    summaryRows.push(["Pending Receipt Qty", pendingQty]);

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);

    // Apply Styles to Summary Sheet
    wsSummary["A1"].s = {
      font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "0F766E" } }, // teal-700
      alignment: { horizontal: "center", vertical: "center" }
    };
    wsSummary["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }
    ];

    // Header metric (Row 4 is index 3)
    wsSummary["A4"].s = headerStyle;
    wsSummary["B4"].s = headerStyle;

    wsSummary["!cols"] = [
      { wch: 30 }, // Metric Name
      { wch: 20 }  // Value
    ];

    const numSummaryRows = summaryRows.length;
    for (let r = 4; r < numSummaryRows; r++) {
      for (let c = 0; c < 2; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        const cell = wsSummary[cellRef];
        if (cell) {
          cell.s = {
            font: { name: "Calibri", sz: 11, bold: (c === 1 || r === 4) },
            border: borderStyle,
            alignment: { horizontal: (c === 0 ? "left" : "right") }
          };

          // Formats
          if (c === 1) {
            if (r === 5) {
              // Total Value
              cell.t = "n";
              cell.z = "₹#,##,##0.00";
            } else if (r === 4 || r > 5) {
              // Counts or quantities
              cell.t = "n";
              cell.z = "#,##0.00";
            }
          }
        }
      }
    }

    // Append Sheets to Workbook
    XLSX.utils.book_append_sheet(wb, wsList, "Purchase Orders List");
    XLSX.utils.book_append_sheet(wb, wsSummary, "Register Summary");

    // Save File
    XLSX.writeFile(wb, `PO_Register_Report_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
    toast.success("Excel report downloaded successfully!");
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await client["purchase-orders"][":id"].$delete({ param: { id: String(id) } });
      if (!res.ok) {
        const errorData = await (res.json() as Promise<any>).catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete purchase order");
      }
      return res.json();
    },
    onSuccess: async () => {
      toast.success("Purchase order deleted successfully");
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete purchase order");
    }
  });

  const getPoStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900";
      case "partial":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900";
      case "closed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900";
      case "cancelled":
        return "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "unpaid":
        return "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900";
      case "partial":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900";
      case "paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const totalPOs = summaryData?.totalPOs ?? 0;
  const totalValue = summaryData?.totalValue ?? 0;
  const openPOs = summaryData?.openPOs ?? 0;
  const partialPOs = summaryData?.partialPOs ?? 0;
  const closedPOs = summaryData?.closedPOs ?? 0;
  const cancelledPOs = summaryData?.cancelledPOs ?? 0;
  const totalOrderedQty = summaryData?.totalOrderedQty ?? 0;
  const totalReceivedQty = summaryData?.totalReceivedQty ?? 0;
  const pendingQty = summaryData?.pendingQty ?? 0;

  const totalStatus = openPOs + partialPOs + closedPOs + cancelledPOs || 1;
  const openPct = (openPOs / totalStatus) * 100;
  const partialPct = (partialPOs / totalStatus) * 100;
  const closedPct = (closedPOs / totalStatus) * 100;
  const cancelledPct = (cancelledPOs / totalStatus) * 100;

  const hasActiveFilters = !!(
    searchParams.search ||
    (searchParams.poStatus && searchParams.poStatus !== "all") ||
    (searchParams.paymentStatus && searchParams.paymentStatus !== "all") ||
    (searchParams.vendorId && searchParams.vendorId !== "all") ||
    searchParams.startDate ||
    searchParams.endDate
  );

  return (
    <ModuleLayout
      title="Purchase Orders Register"
      description="Hospital Excel-style directory of all purchase orders, line items, and delivery statuses."
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} disabled={isLoading || pos.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-1 text-emerald-600 dark:text-emerald-400" /> Export Excel
          </Button>
          <Button variant="outline" onClick={() => setShowFilters(true)}>
            <Filter className={cn("h-4 w-4 mr-1", hasActiveFilters && "text-primary fill-primary/10")} /> Filters {hasActiveFilters && <Badge variant="default" className="ml-1 px-1 h-4 bg-primary/10 text-primary border-primary/20">Active</Badge>}
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isRefetching}>
            <RefreshCw className={cn("h-4 w-4 mr-1", isRefetching && "animate-spin")} /> Refresh
          </Button>
          <Link to="/purchases/purchase-orders/new">
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Add Purchase Order
            </Button>
          </Link>
        </div>
      }
    >
      <div className="max-w-6xl mx-auto space-y-6 py-6">
        {/* Summary Dashboard Panel */}
        <div className="grid gap-4 md:grid-cols-4">
          {/* Card 1: Total PO Count */}
          <Card>
            <CardContent className="p-6 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Total PO Count</span>
                <span className="px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900">POs</span>
              </div>
              <div>
                <span className="text-3xl font-extrabold tracking-tight">
                  {isSummaryLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground inline" /> : totalPOs}
                </span>
                <p className="text-[10px] text-muted-foreground mt-1">Filtered purchase orders</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Total PO Value */}
          <Card>
            <CardContent className="p-6 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Total PO Value</span>
                <span className="px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900 text-[10px] font-bold uppercase tracking-wider">INR</span>
              </div>
              <div>
                <span className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {isSummaryLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground inline" />
                  ) : (
                    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(totalValue)
                  )}
                </span>
                <p className="text-[10px] text-muted-foreground mt-1">Aggregate value of match set</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Ordered / Received Qty */}
          <Card>
            <CardContent className="p-6 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Receipt Pending Qty</span>
                <span className="px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900 text-[10px] font-bold uppercase tracking-wider">Items</span>
              </div>
              <div>
                <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                  {isSummaryLoading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground inline" /> : pendingQty}
                </span>
                <div className="text-[10px] text-muted-foreground mt-1 flex justify-between">
                  <span>Ordered: <strong>{totalOrderedQty}</strong></span>
                  <span>Received: <strong>{totalReceivedQty}</strong></span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: PO Status Split */}
          <Card>
            <CardContent className="p-6 flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold uppercase text-muted-foreground">PO Status Ratios</span>
                <span className="px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900">Status</span>
              </div>
              <div>
                {/* Horizontal status bar */}
                <div className="h-2 w-full rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800">
                  <div style={{ width: `${openPct}%` }} className="bg-blue-500 h-full" title={`Open: ${openPOs}`} />
                  <div style={{ width: `${partialPct}%` }} className="bg-amber-500 h-full" title={`Partial: ${partialPOs}`} />
                  <div style={{ width: `${closedPct}%` }} className="bg-emerald-500 h-full" title={`Closed: ${closedPOs}`} />
                  <div style={{ width: `${cancelledPct}%` }} className="bg-slate-400 h-full" title={`Cancelled: ${cancelledPOs}`} />
                </div>
                <div className="grid grid-cols-4 gap-1 mt-2 text-[9px] text-center text-muted-foreground font-semibold">
                  <div>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1" />
                    O:{openPOs}
                  </div>
                  <div>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 mr-1" />
                    P:{partialPOs}
                  </div>
                  <div>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                    C:{closedPOs}
                  </div>
                  <div>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400 mr-1" />
                    X:{cancelledPOs}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {/* PO Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="text-center text-destructive py-20">
                  Failed to load PO Register. Please try again.
                </div>
              ) : pos.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground text-sm">
                  No purchase orders match the selected parameters.
                </div>
              ) : (
                <div className="overflow-visible">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="text-xs text-muted-foreground uppercase bg-slate-50 dark:bg-slate-900 border-b">
                      <tr>
                        <th className="w-8 px-2 py-3 text-center"></th>
                        <th className="px-4 py-3">PO No</th>
                        <th className="px-4 py-3">PO Date</th>
                        <th className="px-4 py-3">Vendor</th>
                        <th className="px-4 py-3 text-right">Items</th>
                        <th className="px-4 py-3 text-right">PO Value</th>
                        <th className="px-4 py-3 text-center">PO Status</th>
                        <th className="px-4 py-3 text-center">Payment Status</th>
                        <th className="px-4 py-3 max-w-[150px] truncate">Remarks</th>
                        <th className="px-4 py-3 text-right w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPOs.map((po: any) => {
                        const isExpanded = expandedPoId === po.id;
                        const hasGrns = toNum(po.grnCount) > 0;
                        const hasPayments = toNum(po.paymentCount) > 0;

                        return (
                          <React.Fragment key={po.id}>
                            <tr className={cn(
                              "border-b hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors",
                              isExpanded && "bg-slate-55/20 dark:bg-slate-900/20"
                            )}>
                              {/* Expand Row Button */}
                              <td className="px-2 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setExpandedPoId(isExpanded ? null : po.id)}
                                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              </td>

                              {/* PO No */}
                              <td className="px-4 py-3 font-semibold text-primary">
                                <Link to="/purchases/purchase-orders/$id" params={{ id: String(po.id) }} className="hover:underline">
                                  {po.poNo}
                                </Link>
                              </td>

                              {/* Date */}
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                {format(new Date(po.poDate), "dd MMM yyyy")}
                              </td>

                              {/* Vendor */}
                              <td className="px-4 py-3 font-medium">
                                {po.vendorName}
                              </td>

                              {/* Item Count */}
                              <td className="px-4 py-3 text-right font-medium text-muted-foreground">
                                {po.itemCount}
                              </td>

                              {/* Value */}
                              <td className="px-4 py-3 text-right font-bold">
                                {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(toNum(po.totalValue))}
                              </td>

                              {/* PO Status */}
                              <td className="px-4 py-3 text-center">
                                <Badge variant="default" className={cn("border px-2.5 py-0.5 uppercase text-[10px] font-bold", getPoStatusColor(po.poStatus))}>
                                  {po.poStatus}
                                </Badge>
                              </td>

                              {/* Payment Status */}
                              <td className="px-4 py-3 text-center">
                                <Badge variant="default" className={cn("border px-2.5 py-0.5 uppercase text-[10px] font-bold", getPaymentStatusColor(po.paymentStatus))}>
                                  {po.paymentStatus}
                                </Badge>
                              </td>

                              {/* Remarks */}
                              <td className="px-4 py-3 max-w-[150px] truncate text-muted-foreground text-xs">
                                {po.remarks || "—"}
                              </td>

                              {/* Dropdown Actions */}
                              <td className="px-4 py-3 text-right relative">
                                <div className="flex justify-end items-center">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(activeMenuId === po.id ? null : po.id);
                                    }}
                                    className="text-muted-foreground hover:text-foreground hover:bg-muted p-1.5 rounded-md"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>

                                  {activeMenuId === po.id && (
                                    <div className="absolute right-4 top-10 mt-1 w-44 rounded-md shadow-lg bg-background border ring-1 ring-black ring-opacity-5 z-55 py-1 text-left">
                                      {/* View */}
                                      <Link to="/purchases/purchase-orders/$id" params={{ id: String(po.id) }}>
                                        <button className="flex items-center w-full px-4 py-2 text-xs hover:bg-muted font-medium">
                                          <Eye className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> View Detail
                                        </button>
                                      </Link>

                                      {/* Edit */}
                                      <Link
                                        to="/purchases/purchase-orders/$id/edit"
                                        params={{ id: String(po.id) }}
                                        disabled={hasGrns}
                                      >
                                        <button
                                          disabled={hasGrns}
                                          className={cn(
                                            "flex items-center w-full px-4 py-2 text-xs hover:bg-muted font-medium text-left",
                                            hasGrns && "opacity-50 cursor-not-allowed hover:bg-transparent text-muted-foreground"
                                          )}
                                          title={hasGrns ? "Cannot edit PO with registered GRNs" : ""}
                                        >
                                          <Edit className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Edit PO
                                        </button>
                                      </Link>

                                      {/* Receive Goods */}
                                      {po.poStatus !== "closed" && po.poStatus !== "cancelled" ? (
                                        <Link to="/purchases/purchase-orders/$id/grn/new" params={{ id: String(po.id) }}>
                                          <button className="flex items-center w-full px-4 py-2 text-xs hover:bg-muted font-medium text-left">
                                            <Truck className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Receive Goods
                                          </button>
                                        </Link>
                                      ) : null}

                                      {/* Record Payment */}
                                      {po.poStatus !== "cancelled" && po.paymentStatus !== "paid" ? (
                                        <button
                                          onClick={() => {
                                            setSelectedPaymentPo(po);
                                            setActiveMenuId(null);
                                          }}
                                          className="flex items-center w-full px-4 py-2 text-xs hover:bg-muted font-medium text-left text-indigo-650"
                                        >
                                          <CreditCard className="h-3.5 w-3.5 mr-2 text-indigo-650" /> Record Payment
                                        </button>
                                      ) : null}

                                      {/* Delete */}
                                      <button
                                        disabled={hasGrns || hasPayments}
                                        onClick={() => {
                                          if (window.confirm("Are you sure you want to delete this purchase order?")) {
                                            deleteMutation.mutate(po.id);
                                          }
                                        }}
                                        className={cn(
                                          "flex items-center w-full px-4 py-2 text-xs hover:bg-rose-50 text-rose-600 font-medium text-left",
                                          (hasGrns || hasPayments) && "opacity-50 cursor-not-allowed hover:bg-transparent text-muted-foreground"
                                        )}
                                        title={hasGrns || hasPayments ? "Cannot delete PO with GRNs or payments" : ""}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-2 text-rose-600" /> Delete PO
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>

                            {/* Expandable Line Items subrow */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={10} className="bg-slate-50/30 dark:bg-slate-900/10 px-6 py-4 border-b">
                                  <POItemsSubRow poId={po.id} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client Side Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-4 bg-background border rounded-md text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {[5, 10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span>entries</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <span>
                Showing {totalItems === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + pageSize, totalItems)} of {totalItems} entries
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-xs font-medium">
                  Page {currentPage} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Filters Left-side Panel */}
      {showFilters && (
        <>
          <div
            onClick={() => setShowFilters(false)}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />
          <div
            className="fixed inset-y-0 left-0 z-50 w-full sm:w-96 bg-background border-r border-border shadow-2xl flex flex-col animate-in slide-in-from-left duration-300"
          >
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="text-primary" size={18} />
                <h3 className="font-semibold text-lg text-foreground">Filters</h3>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer animate-in duration-100"
                type="button"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="PO No / Item..."
                    className="pl-8 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Vendor</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={searchParams.vendorId}
                  onChange={(e) => navigate({ search: (prev: any) => ({ ...prev, vendorId: e.target.value || "all" }) })}
                >
                  <option value="all">All Vendors</option>
                  {(vendors as any[]).map((v: any) => (
                    <option key={v.id} value={String(v.id)}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">PO Status</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none"
                  value={searchParams.poStatus}
                  onChange={(e) => navigate({ search: (prev: any) => ({ ...prev, poStatus: e.target.value || "all" }) })}
                >
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="partial">Partial</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Payment Status</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none"
                  value={searchParams.paymentStatus}
                  onChange={(e) => navigate({ search: (prev: any) => ({ ...prev, paymentStatus: e.target.value || "all" }) })}
                >
                  <option value="all">All Payments</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">PO Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 px-3", !searchParams.startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {searchParams.startDate ? format(new Date(searchParams.startDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      captionLayout="dropdown"
                      startMonth={new Date(new Date().getFullYear() - 10, 0)}
                      endMonth={new Date(new Date().getFullYear() + 10, 11)}
                      mode="single"
                      selected={searchParams.startDate ? new Date(searchParams.startDate) : undefined}
                      onSelect={(date) => navigate({ search: (prev: any) => ({ ...prev, startDate: date ? format(date, "yyyy-MM-dd") : undefined }) })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">PO End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 px-3", !searchParams.endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {searchParams.endDate ? format(new Date(searchParams.endDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      startMonth={new Date(new Date().getFullYear() - 10, 0)}
                      endMonth={new Date(new Date().getFullYear() + 10, 11)}
                      selected={searchParams.endDate ? new Date(searchParams.endDate) : undefined}
                      onSelect={(date) => navigate({ search: (prev: any) => ({ ...prev, endDate: date ? format(date, "yyyy-MM-dd") : undefined }) })}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {hasActiveFilters && (
                <Button variant="outline" className="w-full text-xs h-9 mt-4" onClick={handleClearFilters}>
                  <X className="h-4 w-4 mr-1" /> Clear Filters
                </Button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Record Payment Dialog */}
      {selectedPaymentPo && (
        <RecordPaymentDialog
          po={selectedPaymentPo}
          onClose={() => setSelectedPaymentPo(null)}
          onSuccess={() => {
            setSelectedPaymentPo(null);
            refetch();
          }}
        />
      )}
    </ModuleLayout>
  );
}

// Subrow component that fetches PO details dynamically to list line items
function POItemsSubRow({ poId }: { poId: number }) {
  const { data: poDetails, isLoading, error } = useRpcQuery<any>(
    ["purchase-orders", String(poId)],
    () => client["purchase-orders"][":id"].$get({ param: { id: String(poId) } })
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading line items...
      </div>
    );
  }

  if (error || !poDetails) {
    return (
      <div className="text-xs text-destructive p-2">
        Failed to load line items.
      </div>
    );
  }

  const items = poDetails.items || [];

  return (
    <div className="rounded border bg-background overflow-hidden p-3 max-w-4xl">
      <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">PO Line Items Register</h4>
      <table className="w-full text-xs text-left border-collapse">
        <thead className="bg-muted/40 border-b">
          <tr>
            <th className="px-3 py-2">Item Name</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2 text-right">Qty Ordered</th>
            <th className="px-3 py-2 text-right">Qty Received</th>
            <th className="px-3 py-2 text-right font-semibold">Qty Pending</th>
            <th className="px-3 py-2 text-right">Unit Rate</th>
            <th className="px-3 py-2 text-right">GST %</th>
            <th className="px-3 py-2 text-right">Line Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any) => {
            const formatQty = (v: number) => Math.round(v * 10000) / 10000;
            const ordered = formatQty(toNum(item.orderedQty));
            const received = formatQty(toNum(item.receivedQty));
            const pending = formatQty(Math.max(0, ordered - received));
            const rate = toNum(item.unitRate);
            const gst = toNum(item.gstPercent);
            const lineVal = toNum(item.lineValue);

            return (
              <tr key={item.id} className="border-b last:border-0 hover:bg-muted/5">
                <td className="px-3 py-2 font-medium">{item.itemName}</td>
                <td className="px-3 py-2 text-muted-foreground">{item.category || "—"}</td>
                <td className="px-3 py-2 text-right">{ordered} {item.unit || ""}</td>
                <td className="px-3 py-2 text-right text-emerald-650 font-semibold">{received}</td>
                <td className="px-3 py-2 text-right text-amber-650 font-semibold">{pending}</td>
                <td className="px-3 py-2 text-right">
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(rate)}
                </td>
                <td className="px-3 py-2 text-right">{gst}%</td>
                <td className="px-3 py-2 text-right font-bold">
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(lineVal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Record Payment Dialog Wrapper for register page row actions
function RecordPaymentDialog({ po, onClose, onSuccess }: { po: any; onClose: () => void; onSuccess: () => void }) {
  const paymentForm = useForm<PaymentFormValues>({
    // @ts-ignore
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      amount: Math.max(0, toNum(po.totalValue) - toNum(po.totalPaid)),
      paymentMode: "upi",
      referenceNo: "",
      remarks: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      const res = await (client["purchase-orders"][":id"].payments as any).$post({
        param: { id: String(po.id) },
        json: data,
      });
      if (!res.ok) {
        const errorData = await (res.json() as Promise<any>).catch(() => ({}));
        throw new Error(errorData.error || "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Payment recorded successfully against " + po.poNo);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record payment");
    }
  });

  const onSubmit = (values: PaymentFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment for PO: {po.poNo}</DialogTitle>
          <CardDescription>
            Outstanding Balance: {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Math.max(0, toNum(po.totalValue) - toNum(po.totalPaid)))}
          </CardDescription>
        </DialogHeader>
        <form onSubmit={paymentForm.handleSubmit(onSubmit as any)} className="space-y-4 pt-4">
          {/* Payment Date */}
          <div className="flex flex-col space-y-1.5">
            <Label>Payment Date *</Label>
            <Controller
              control={paymentForm.control}
              name="paymentDate"
              render={({ field, fieldState }: any) => (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background px-3",
                          !field.value && "text-muted-foreground",
                          fieldState.error && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick payment date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                      />
                    </PopoverContent>
                  </Popover>
                  {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                </>
              )}
            />
          </div>

          {/* Amount */}
          <Field
            label="Amount *"
            type="number"
            step="0.01"
            placeholder="Enter payment amount"
            {...paymentForm.register("amount")}
            error={paymentForm.formState.errors.amount?.message}
          />

          {/* Payment Mode */}
          <Select
            label="Payment Mode *"
            options={[
              ["cash", "Cash"],
              ["upi", "UPI"],
              ["card", "Card"],
              ["rtgs", "RTGS/NEFT"],
              ["cheque", "Cheque"],
              ["other", "Other"]
            ]}
            {...paymentForm.register("paymentMode")}
            error={paymentForm.formState.errors.paymentMode?.message}
          />

          {/* Reference No */}
          <Field
            label="Reference Number / Txn ID"
            placeholder="e.g. UPI transaction ref, cheque no..."
            {...paymentForm.register("referenceNo")}
            error={paymentForm.formState.errors.referenceNo?.message}
          />

          {/* Remarks */}
          <Field
            label="Remarks"
            placeholder="Optional notes..."
            {...paymentForm.register("remarks")}
            error={paymentForm.formState.errors.remarks?.message}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Payment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
