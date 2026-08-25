import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { Card, CardContent } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { 
  History, 
  RefreshCw, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search,
  X, 
  Warehouse, 
  FileText,
  FileSpreadsheet,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  ExternalLink
} from "lucide-react";
import * as React from "react";
import { z } from "zod";
import { format } from "date-fns";
import XLSX from "xlsx-js-style";
import { cn } from "@/utils/cn";

const ledgerSearchSchema = z.object({
  page: z.coerce.number().optional().catch(1),
  limit: z.coerce.number().optional().catch(20),
  storeId: z.string().optional().catch("all"),
  movementType: z.string().optional().catch("all"),
  search: z.string().optional().catch(""),
  dateFrom: z.string().optional().catch(""),
  dateTo: z.string().optional().catch(""),
});

export const Route = createFileRoute("/_authenticated/inventory/ledger")({
  validateSearch: (search) => ledgerSearchSchema.parse(search),
  component: StockLedger,
});

function StockLedger() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const page = searchParams.page ?? 1;
  const limit = searchParams.limit ?? 20;
  const storeIdFilter = searchParams.storeId || "all";
  const movementTypeFilter = searchParams.movementType || "all";
  const searchFilter = searchParams.search || "";
  const dateFromFilter = searchParams.dateFrom || "";
  const dateToFilter = searchParams.dateTo || "";

  const [localSearch, setLocalSearch] = React.useState(searchFilter);

  // Sync local search when URL changes
  React.useEffect(() => {
    setLocalSearch(searchFilter);
  }, [searchFilter]);

  // Debounced search sync to URL
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchFilter) {
        navigate({
          search: (prev) => ({
            ...prev,
            page: 1,
            search: localSearch || "",
          }),
        });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [localSearch, searchFilter, navigate]);

  // Fetch stores list
  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  // Fetch paginated ledger data
  const { data: ledgerResponse, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["inventory-ledger", searchParams],
    () =>
      client.inventory.ledger.$get({
        query: {
          page: String(page),
          limit: String(limit),
          storeId: storeIdFilter !== "all" ? storeIdFilter : undefined,
          movementType: movementTypeFilter !== "all" ? movementTypeFilter : undefined,
          search: searchFilter || undefined,
          dateFrom: dateFromFilter || undefined,
          dateTo: dateToFilter || undefined,
        },
      })
  );

  const ledgerData: any[] = ledgerResponse?.data || [];
  const pagination = ledgerResponse?.pagination || {
    page: 1,
    pageSize: limit,
    totalRecords: ledgerData.length,
    totalPages: 1,
  };

  const hasActiveFilters = Boolean(
    searchFilter ||
    (storeIdFilter && storeIdFilter !== "all") ||
    (movementTypeFilter && movementTypeFilter !== "all") ||
    dateFromFilter ||
    dateToFilter
  );

  const handleClearFilters = () => {
    setLocalSearch("");
    navigate({
      search: () => ({
        page: 1,
        limit: 20,
        storeId: "all",
        movementType: "all",
        search: "",
        dateFrom: "",
        dateTo: "",
      }),
    });
  };

  const handlePageChange = (newPage: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: Math.max(1, Math.min(newPage, pagination.totalPages || 1)),
      }),
    });
  };

  const handlePageSizeChange = (newLimit: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        limit: newLimit,
      }),
    });
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case "GRN":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300">GRN Inward</Badge>;
      case "SALE":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300">POS Sale</Badge>;
      case "POS_RETURN":
        return <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-300">POS Return</Badge>;
      case "TRANSFER_IN":
        return <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300">Transfer In</Badge>;
      case "TRANSFER_OUT":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300">Transfer Out</Badge>;
      case "ADJUSTMENT_ADD":
        return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300">Adjustment (+)</Badge>;
      case "ADJUSTMENT_SUB":
        return <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300">Adjustment (-)</Badge>;
      case "DAMAGE":
        return <Badge variant="destructive">Damage</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const renderReference = (row: any) => {
    const refType = String(row.referenceType || row.movementType || "").toUpperCase();
    const refId = row.referenceId;
    const label = `${row.referenceType || "REF"} #${refId ?? "—"}`;

    if (!refId && refId !== 0 && refId !== "0") {
      return (
        <div className="flex items-center gap-1 font-mono text-xs ">
          <FileText className="w-3.5 h-3.5  shrink-0" />
          <span>{label}</span>
        </div>
      );
    }

    // 1. Goods Receipt Note (GRN)
    if (refType === "GRN") {
      return (
        <Link
          to="/purchases/grns/$grnId"
          params={{ grnId: String(refId) }}
          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline hover:text-primary/80 font-medium group transition-colors"
          title="Open GRN Details"
        >
          <FileText className="w-3.5 h-3.5 group-hover:text-primary shrink-0" />
          <span>{label}</span>
          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
        </Link>
      );
    }

    // 2. POS Sales Invoice & POS Returns
    if (refType === "POS_INVOICE" || refType === "SALE" || refType === "POS_RETURN") {
      return (
        <Link
          to="/inventory/invoices"
          search={{ search: String(refId) }}
          className="inline-flex items-center gap-1 font-mono text-xs  hover:underline hover:text-primary/80 font-medium group transition-colors"
          title="Search Invoice Records"
        >
          <FileText className="w-3.5 h-3.5 group-hover:text-primary shrink-0" />
          <span>{label}</span>
          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
        </Link>
      );
    }

    // 3. Stock Transfers
    if (refType === "TRANSFER" || refType === "TRANSFER_IN" || refType === "TRANSFER_OUT") {
      const numId = Number(refId);
      const isNumeric = !isNaN(numId) && numId > 0;
      return (
        <Link
          to="/inventory/transfers"
          search={isNumeric ? { transferId: numId } : { search: String(refId) }}
          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline hover:text-primary/80 font-medium group transition-colors"
          title="Open Stock Transfer Details"
        >
          <FileText className="w-3.5 h-3.5 group-hover:text-primary shrink-0" />
          <span>{label}</span>
          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
        </Link>
      );
    }

    // 4. Stock Adjustments & Damage
    if (
      refType === "STOCK_ADJUSTMENT" ||
      refType === "ADJUSTMENT_ADD" ||
      refType === "ADJUSTMENT_SUB" ||
      refType === "DAMAGE"
    ) {
      const numId = Number(refId);
      const isNumeric = !isNaN(numId) && numId > 0;
      return (
        <Link
          to="/inventory/adjustments"
          search={isNumeric ? { adjustmentId: numId } : { search: String(refId) }}
          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline hover:text-primary/80 font-medium group transition-colors"
          title="Open Stock Adjustment Details"
        >
          <FileText className="w-3.5 h-3.5 group-hover:text-primary shrink-0" />
          <span>{label}</span>
          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
        </Link>
      );
    }

    // 5. Purchase Invoices
    if (refType === "PURCHASE_INVOICE") {
      return (
        <Link
          to="/inventory/purchase-invoices/$id"
          params={{ id: String(refId) }}
          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline hover:text-primary/80 font-medium group transition-colors"
          title="Open Purchase Invoice"
        >
          <FileText className="w-3.5 h-3.5  group-hover:text-primary shrink-0" />
          <span>{label}</span>
          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
        </Link>
      );
    }

    // 6. Requisitions
    if (refType === "REQUISITION") {
      return (
        <Link
          to="/inventory/requisitions"
          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline hover:text-primary/80 font-medium group transition-colors"
          title="Open Stock Requisitions"
        >
          <FileText className="w-3.5 h-3.5 group-hover:text-primary shrink-0" />
          <span>{label}</span>
          <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 shrink-0" />
        </Link>
      );
    }

    return (
      <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
        <FileText className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
        <span>{label}</span>
      </div>
    );
  };

  const exportToExcel = () => {
    if (!ledgerData.length) return;
    const wb = XLSX.utils.book_new();

    const listRows: any[] = [];

    // Title & Metadata
    listRows.push(["Immutable Stock Ledger Report"]);
    listRows.push([`Generated on: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`]);
    const storeLabel = storeIdFilter === "all" ? "All Stores" : (storesList.find((s: any) => String(s.id) === storeIdFilter)?.name || storeIdFilter);
    const mTypeLabel = movementTypeFilter === "all" ? "All Movement Types" : movementTypeFilter;
    const dateRangeLabel = dateFromFilter || dateToFilter ? `${dateFromFilter || "Beginning"} to ${dateToFilter || "Present"}` : "All Time";
    listRows.push([`Filters: Store [${storeLabel}] | Movement [${mTypeLabel}] | Period [${dateRangeLabel}]`]);
    listRows.push([]); // blank spacer

    // Headers
    const headers = [
      "Date & Time",
      "Store Location",
      "Item Name",
      "Batch Number",
      "Movement Type",
      "Reference",
      "Quantity Change",
      "Base Unit",
      "Balance After",
      "Cost Rate (₹)",
      "Purchase Unit",
      "Sale Rate (₹)",
      "Sale Unit",
      "Recorded By",
    ];
    listRows.push(headers);

    // Data rows
    let totalQtyChange = 0;

    ledgerData.forEach((row: any) => {
      const qtyChange = Number(row.quantityChange || 0);
      const balanceAfter = Number(row.balanceAfter || 0);
      const costRate = Number(row.costPrice || 0);
      const saleRate = Number(row.salePrice || 0);
      totalQtyChange += qtyChange;

      const dateStr = row.transactionDate
        ? format(new Date(row.transactionDate), "dd MMM yyyy, HH:mm:ss")
        : "—";

      listRows.push([
        dateStr,
        row.storeName || "Central Warehouse",
        row.itemName || "",
        row.batchNumber || "—",
        row.movementType || "",
        `${row.referenceType || ""} #${row.referenceId || ""}`,
        qtyChange,
        row.baseUnit || row.unit || "",
        balanceAfter,
        costRate,
        row.purchaseUnit || row.unit || "unit",
        saleRate,
        row.saleUnit || row.unit || "unit",
        row.createdByName || "System",
      ]);
    });

    // Summary / Totals Row
    listRows.push([
      "Total / Net Movement",
      "",
      "",
      "",
      "",
      "",
      totalQtyChange,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]);

    const wsList = XLSX.utils.aoa_to_sheet(listRows);

    // Title styling
    wsList["A1"].s = {
      font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "059669" } }, // emerald-600
      alignment: { horizontal: "center", vertical: "center" },
    };
    wsList["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];

    // Header styling (Row 5 is index 4)
    const headerStyle = {
      font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "1F2937" } }, // gray-800
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "D1D5DB" } },
        bottom: { style: "thin", color: { rgb: "D1D5DB" } },
      },
    };

    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 4, c });
      if (wsList[cellRef]) {
        wsList[cellRef].s = headerStyle;
      }
    }

    // Set Column Widths
    wsList["!cols"] = [
      { wch: 22 }, // Date & Time
      { wch: 22 }, // Store Location
      { wch: 28 }, // Item Name
      { wch: 14 }, // Batch Number
      { wch: 16 }, // Movement Type
      { wch: 20 }, // Reference
      { wch: 16 }, // Quantity Change
      { wch: 12 }, // Base Unit
      { wch: 15 }, // Balance After
      { wch: 15 }, // Cost Rate
      { wch: 15 }, // Purchase Unit
      { wch: 15 }, // Sale Rate
      { wch: 15 }, // Sale Unit
      { wch: 18 }, // Recorded By
    ];

    XLSX.utils.book_append_sheet(wb, wsList, "Stock Ledger");
    XLSX.writeFile(wb, `Stock_Ledger_Report_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
  };

  const startRecord = pagination.totalRecords === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endRecord = Math.min(pagination.page * pagination.pageSize, pagination.totalRecords);

  return (
    <ModuleLayout
      title="Immutable Stock Ledger"
      description="Complete audit trail of every stock transaction, receipt, sale, transfer, and adjustment"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={isLoading || ledgerData.length === 0}
            className="text-xs shadow-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-300"
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="text-xs shadow-xs"
          >
            <RefreshCw className={cn("w-4 h-4 mr-1.5", isRefetching && "animate-spin text-emerald-600")} />
            Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Filter Toolbar */}
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
              {/* Search input */}
              <div className="lg:col-span-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Search item, batch, ref #..."
                    className="pl-9 h-9 text-xs"
                  />
                  {localSearch && (
                    <button
                      type="button"
                      onClick={() => setLocalSearch("")}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Store Filter */}
              <div className="lg:col-span-2">
                <Select
                  value={storeIdFilter}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev) => ({
                        ...prev,
                        page: 1,
                        storeId: val,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 w-full bg-background text-xs">
                    <SelectValue placeholder="All Stores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {storesList.map((store: any) => (
                      <SelectItem key={store.id} value={String(store.id)}>
                        {store.name} ({store.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Movement Type Filter */}
              <div className="lg:col-span-2">
                <Select
                  value={movementTypeFilter}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev) => ({
                        ...prev,
                        page: 1,
                        movementType: val,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 w-full bg-background text-xs">
                    <SelectValue placeholder="All Movements" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Movements</SelectItem>
                    <SelectItem value="GRN">GRN Inward</SelectItem>
                    <SelectItem value="SALE">POS Sale</SelectItem>
                    <SelectItem value="POS_RETURN">POS Return</SelectItem>
                    <SelectItem value="TRANSFER_IN">Transfer In</SelectItem>
                    <SelectItem value="TRANSFER_OUT">Transfer Out</SelectItem>
                    <SelectItem value="ADJUSTMENT_ADD">Adjustment (+)</SelectItem>
                    <SelectItem value="ADJUSTMENT_SUB">Adjustment (-)</SelectItem>
                    <SelectItem value="DAMAGE">Damage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From (Calendar Popover) */}
              <div className="lg:col-span-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 px-2 text-xs bg-background",
                        !dateFromFilter && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {dateFromFilter
                          ? format(new Date(dateFromFilter), "dd MMM yyyy")
                          : "Date From"}
                      </span>
                      {dateFromFilter && (
                        <X
                          className="ml-auto h-3.5 w-3.5 shrink-0 opacity-60 hover:opacity-100 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({
                              search: (prev) => ({ ...prev, page: 1, dateFrom: "" }),
                            });
                          }}
                        />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      startMonth={new Date(new Date().getFullYear() - 5, 0)}
                      endMonth={new Date(new Date().getFullYear() + 2, 11)}
                      selected={dateFromFilter ? new Date(dateFromFilter) : undefined}
                      onSelect={(date) =>
                        navigate({
                          search: (prev) => ({
                            ...prev,
                            page: 1,
                            dateFrom: date ? format(date, "yyyy-MM-dd") : "",
                          }),
                        })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To (Calendar Popover) */}
              <div className="lg:col-span-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 px-2 text-xs bg-background",
                        !dateToFilter && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">
                        {dateToFilter
                          ? format(new Date(dateToFilter), "dd MMM yyyy")
                          : "Date To"}
                      </span>
                      {dateToFilter && (
                        <X
                          className="ml-auto h-3.5 w-3.5 shrink-0 opacity-60 hover:opacity-100 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({
                              search: (prev) => ({ ...prev, page: 1, dateTo: "" }),
                            });
                          }}
                        />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown"
                      startMonth={new Date(new Date().getFullYear() - 5, 0)}
                      endMonth={new Date(new Date().getFullYear() + 2, 11)}
                      selected={dateToFilter ? new Date(dateToFilter) : undefined}
                      onSelect={(date) =>
                        navigate({
                          search: (prev) => ({
                            ...prev,
                            page: 1,
                            dateTo: date ? format(date, "yyyy-MM-dd") : "",
                          }),
                        })
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Clear Action */}
              <div className="lg:col-span-1 flex justify-end">
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleClearFilters}
                    className="h-9 w-9 text-muted-foreground hover:text-foreground"
                    title="Clear All Filters"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table Card */}
        <Card className="shadow-xs border-border overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="text-sm font-medium text-muted-foreground animate-pulse">
                  Loading stock ledger records...
                </span>
              </div>
            ) : ledgerData.length === 0 ? (
              <div className="text-center py-16 px-4">
                <History className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-base font-semibold text-foreground">No ledger transactions found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {hasActiveFilters
                    ? "Try adjusting or clearing your filters to view more transactions."
                    : "Stock movements will be logged automatically when GRNs, sales, transfers, or adjustments are performed."}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="mt-4 text-xs"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Reset All Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-3.5">Date & Time</th>
                      <th className="px-4 py-3.5">Store Location</th>
                      <th className="px-4 py-3.5">Item & Batch</th>
                      <th className="px-4 py-3.5">Movement</th>
                      <th className="px-4 py-3.5">Reference</th>
                      <th className="px-4 py-3.5 text-right">Quantity Change</th>
                      <th className="px-4 py-3.5 text-right">Balance After</th>
                      <th className="px-4 py-3.5 text-right">Cost (₹/Pur. Unit)</th>
                      <th className="px-4 py-3.5 text-right">MRP (₹/Sale Unit)</th>
                      <th className="px-4 py-3.5">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ledgerData.map((row: any) => {
                      const qty = Number(row.quantityChange || 0);
                      const isPositive = qty > 0;
                      const dateObj = row.transactionDate ? new Date(row.transactionDate) : null;

                      return (
                        <tr key={row.id} className="hover:bg-muted/30 transition-colors duration-150">
                          {/* Date & Time */}
                          <td className="px-4 py-3 align-middle whitespace-nowrap font-mono text-xs text-muted-foreground">
                            {dateObj && !isNaN(dateObj.getTime())
                              ? format(dateObj, "dd MMM yyyy, HH:mm:ss")
                              : String(row.transactionDate || "—")}
                          </td>

                          {/* Store */}
                          <td className="px-4 py-3 align-middle">
                            <Link
                              to="/inventory/stock"
                              search={{ storeId: String(row.storeId) }}
                              className="flex items-center gap-1.5 font-medium text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors"
                              title={`View stock in ${row.storeName || "Store"}`}
                            >
                              <Warehouse className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-35">
                                {row.storeName || "Central Warehouse"}
                              </span>
                            </Link>
                          </td>

                          {/* Item & Batch */}
                          <td className="px-4 py-3 align-middle">
                            <div>
                              <Link
                                to="/inventory/stock"
                                search={{ search: row.itemName }}
                                className="font-semibold text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors inline-block"
                                title={`View stock balances for ${row.itemName}`}
                              >
                                {row.itemName}
                              </Link>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[11px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.2 rounded border border-border">
                                  Batch: {row.batchNumber || "—"}
                                </span>
                                {row.expiryDate && (
                                  <span className="text-[10px] text-muted-foreground">
                                    Exp: {row.expiryDate}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Movement Badge */}
                          <td className="px-4 py-3 align-middle">
                            {getMovementBadge(String(row.movementType || ""))}
                          </td>

                          {/* Reference */}
                          <td className="px-4 py-3 align-middle">
                            {renderReference(row)}
                          </td>

                          {/* Quantity Change */}
                          <td className="px-4 py-3 align-middle text-right font-mono font-bold text-sm whitespace-nowrap">
                            {isPositive ? (
                              <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center">
                                <ArrowDownLeft className="w-4 h-4 mr-0.5" />+{qty} <span className="text-xs font-normal text-muted-foreground ml-1">{row.baseUnit || row.unit || ""}</span>
                              </span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 inline-flex items-center">
                                <ArrowUpRight className="w-4 h-4 mr-0.5" />{qty} <span className="text-xs font-normal text-muted-foreground ml-1">{row.baseUnit || row.unit || ""}</span>
                              </span>
                            )}
                          </td>

                          {/* Balance After */}
                          <td className="px-4 py-3 align-middle text-right font-mono font-bold text-sm text-foreground whitespace-nowrap">
                            {Number(row.balanceAfter || 0)} <span className="text-xs font-normal text-muted-foreground">{row.baseUnit || row.unit || ""}</span>
                          </td>

                          {/* Cost Rate */}
                          <td className="px-4 py-3 align-middle text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                            ₹{Number(row.costPrice || 0).toFixed(2)}
                            <span className="text-[10px] text-muted-foreground/70 font-sans ml-0.5">/{row.purchaseUnit || row.unit || "unit"}</span>
                          </td>

                          {/* Sale Price */}
                          <td className="px-4 py-3 align-middle text-right font-mono text-xs font-medium text-foreground whitespace-nowrap">
                            ₹{Number(row.salePrice || 0).toFixed(2)}
                            <span className="text-[10px] text-muted-foreground/70 font-sans ml-0.5">/{row.saleUnit || row.unit || "unit"}</span>
                          </td>

                          {/* Recorded By */}
                          <td className="px-4 py-3 align-middle text-xs text-muted-foreground whitespace-nowrap">
                            {row.createdByName || "System"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Server-Side Pagination Footer */}
            {!isLoading && pagination.totalRecords > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3.5 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span>
                    Showing <strong className="text-foreground font-semibold">{startRecord}</strong> to{" "}
                    <strong className="text-foreground font-semibold">{endRecord}</strong> of{" "}
                    <strong className="text-foreground font-semibold">{pagination.totalRecords}</strong> entries
                  </span>

                  <div className="flex items-center gap-1.5 pl-3 border-l border-border">
                    <span>Per page:</span>
                    <select
                      className="h-7 border border-input rounded px-1.5 text-xs bg-background text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
                      value={limit}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.page <= 1}
                    title="First Page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    title="Previous Page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="px-3 font-medium text-foreground text-xs">
                    Page {pagination.page} of {pagination.totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    title="Next Page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.page >= pagination.totalPages}
                    title="Last Page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
