import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { format } from "date-fns";
import XLSX from "xlsx-js-style";
import { 
  Package, 
  Search, 
  RefreshCw, 
  Loader2, 
  X, 
  Warehouse, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  Filter, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  Layers, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown 
} from "lucide-react";
import * as React from "react";
import { z } from "zod";
import { cn } from "@/utils/cn";

import { 
  findUnit, 
  getUnitConversionFactor, 
  formatQtyNumber 
} from "@/lib/unit-conversion";

const stockSearchSchema = z.object({
  page: z.coerce.number().optional().catch(1),
  limit: z.coerce.number().optional().catch(20),
  storeId: z.string().optional().catch("all"),
  itemTypeId: z.string().optional().catch("all"),
  stockStatus: z.string().optional().catch("all"),
  unitFilter: z.string().optional().catch("all"),
  search: z.string().optional().catch(""),
  expiringBefore: z.string().optional().catch(""),
  sortBy: z.string().optional().catch("itemName"),
  sortOrder: z.enum(["asc", "desc"]).optional().catch("asc"),
});

export const Route = createFileRoute("/_authenticated/inventory/stock")({
  validateSearch: (search) => stockSearchSchema.parse(search),
  component: LiveStock,
});

function LiveStock() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const page = searchParams.page ?? 1;
  const limit = searchParams.limit ?? 20;
  const storeIdFilter = searchParams.storeId || "all";
  const itemTypeIdFilter = searchParams.itemTypeId || "all";
  const stockStatusFilter = searchParams.stockStatus || "all";
  const unitFilter = searchParams.unitFilter || "all";
  const searchFilter = searchParams.search || "";
  const expiringBeforeFilter = searchParams.expiringBefore || "";
  const sortBy = searchParams.sortBy || "itemName";
  const sortOrder = searchParams.sortOrder || "asc";

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

  // Fetch item types / categories
  const { data: itemTypesList = [] } = useRpcQuery<any[]>(
    ["item-types"],
    () => client["item-types"].$get()
  );

  // Fetch available unit types
  const { data: unitTypesList = [] } = useRpcQuery<any[]>(
    ["unit-types"],
    () => client["unit-types"].$get()
  );

  // Fetch unit conversions
  const { data: unitConversionsList = [] } = useRpcQuery<any[]>(
    ["unit-conversions"],
    () => client["unit-conversions"].$get()
  );

  // Fetch paginated stock data
  const { data: stockResponse, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["inventory-stock", searchParams],
    () =>
      client.inventory.stock.$get({
        query: {
          page: String(page),
          limit: String(limit),
          storeId: storeIdFilter !== "all" ? storeIdFilter : undefined,
          itemTypeId: itemTypeIdFilter !== "all" ? itemTypeIdFilter : undefined,
          stockStatus: stockStatusFilter !== "all" ? stockStatusFilter : undefined,
          search: searchFilter || undefined,
          expiringBefore: expiringBeforeFilter || undefined,
          sortBy: sortBy || undefined,
          sortOrder: sortOrder || undefined,
        },
      })
  );

  const stockData: any[] = stockResponse?.data || [];
  const pagination = stockResponse?.pagination || {
    page: 1,
    pageSize: limit,
    totalRecords: stockData.length,
    totalPages: 1,
  };

  const hasActiveFilters = Boolean(
    searchFilter ||
    (storeIdFilter && storeIdFilter !== "all") ||
    (itemTypeIdFilter && itemTypeIdFilter !== "all") ||
    (stockStatusFilter && stockStatusFilter !== "all") ||
    (unitFilter && unitFilter !== "all") ||
    expiringBeforeFilter ||
    sortBy !== "itemName" ||
    sortOrder !== "asc"
  );

  const handleClearFilters = () => {
    setLocalSearch("");
    navigate({
      search: () => ({
        page: 1,
        limit: 20,
        storeId: "all",
        itemTypeId: "all",
        stockStatus: "all",
        unitFilter: "all",
        search: "",
        expiringBefore: "",
        sortBy: "itemName",
        sortOrder: "asc",
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

  const handleSortChange = (columnKey: string) => {
    navigate({
      search: (prev) => {
        if (prev.sortBy === columnKey) {
          return {
            ...prev,
            page: 1,
            sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
          };
        }
        return {
          ...prev,
          page: 1,
          sortBy: columnKey,
          sortOrder: "asc",
        };
      },
    });
  };

  const getExpiryBadge = (expiryDateStr: string) => {
    if (!expiryDateStr) return <span className="text-muted-foreground text-xs">—</span>;
    const expiry = new Date(expiryDateStr);
    if (isNaN(expiry.getTime())) return <span className="text-xs">{expiryDateStr}</span>;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 0) {
      return (
        <Badge variant="destructive" className="font-semibold text-xs whitespace-nowrap shadow-xs">
          Expired ({expiryDateStr})
        </Badge>
      );
    }
    if (diffDays <= 30) {
      return (
        <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 font-semibold text-xs whitespace-nowrap">
          Expiring in {diffDays}d ({expiryDateStr})
        </Badge>
      );
    }
    if (diffDays <= 90) {
      return (
        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 font-medium text-xs whitespace-nowrap">
          Expiring in {diffDays}d ({expiryDateStr})
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-200 text-xs whitespace-nowrap">
        {format(expiry, "MMM-yyyy")}
      </Badge>
    );
  };

  const exportToExcel = () => {
    if (!stockData.length) return;
    const wb = XLSX.utils.book_new();

    const listRows: any[] = [];

    // Title & Metadata
    listRows.push(["Live Stock Inventory Balance Report"]);
    listRows.push([`Generated on: ${format(new Date(), "dd MMM yyyy, hh:mm a")}`]);
    const storeLabel = storeIdFilter === "all" ? "All Stores" : (storesList.find((s: any) => String(s.id) === storeIdFilter)?.name || storeIdFilter);
    const categoryLabel = itemTypeIdFilter === "all" ? "All Categories" : (itemTypesList.find((t: any) => String(t.id) === itemTypeIdFilter)?.name || itemTypeIdFilter);
    const statusLabel = stockStatusFilter === "all" ? "All Inventory" : stockStatusFilter.replace(/_/g, " ");
    const unitLabel = unitFilter === "all" ? "Original / Default Units" : unitFilter;
    listRows.push([`Filters: Store [${storeLabel}] | Category [${categoryLabel}] | Unit [${unitLabel}] | Status [${statusLabel}]`]);
    listRows.push([]); // blank spacer

    // Headers
    const headers = [
      "Store Location",
      "Store Code",
      "Item Name",
      "Category",
      "Barcode / HSN",
      "Batch Number",
      "Expiry Date",
      "Cost Rate (₹)",
      "Cost Unit (Purchase)",
      "MRP / Sale (₹)",
      "Sale Unit",
      "Quantity On Hand",
      "Available Qty",
      "Stock Unit",
      "Stock Status",
    ];
    listRows.push(headers);

    // Data rows
    let totalOnHand = 0;
    let totalAvailable = 0;

    stockData.forEach((row: any) => {
      const qOnHand = Number(row.quantityOnHand || 0);
      const qAvail = Number(row.availableQty || 0);
      const costRate = Number(row.purchaseRate || 0);
      const mrpRate = Number(row.mrp || row.saleRate || 0);
      const reorderLvl = Number(row.reorderLevel || 0);
      const baseUnit = row.purchaseUnit || row.baseUnit || row.unit || "unit";

      const conv = unitFilter && unitFilter !== "all"
        ? getUnitConversionFactor(baseUnit, unitFilter, unitTypesList, unitConversionsList)
        : { convertible: false, factor: 1 };

      const outOnHand = conv.convertible ? Number((qOnHand * conv.factor).toFixed(3)) : qOnHand;
      const outAvail = conv.convertible ? Number((qAvail * conv.factor).toFixed(3)) : qAvail;
      const outUnit = conv.convertible ? (conv.toUnit?.symbol || unitFilter) : baseUnit;

      let status = "In Stock";
      if (qOnHand <= 0) {
        status = "Out of Stock";
      } else if (reorderLvl > 0 && qOnHand <= reorderLvl) {
        status = "Low Stock";
      }

      totalOnHand += outOnHand;
      totalAvailable += outAvail;

      listRows.push([
        row.storeName || "Central Warehouse",
        row.storeCode || "",
        row.itemName || "",
        row.itemTypeName || "General",
        row.itemBarcode || row.hsnCode || "",
        row.batchNumber || "—",
        row.expiryDate ? format(new Date(row.expiryDate), "dd MMM yyyy") : "—",
        costRate,
        row.purchaseUnit || row.unit || "unit",
        mrpRate,
        row.saleUnit || row.unit || "unit",
        outOnHand,
        outAvail,
        outUnit,
        status,
      ]);
    });

    // Summary / Totals Row
    listRows.push([
      "Total / Summary",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      totalOnHand,
      totalAvailable,
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
      { wch: 22 }, // Store Location
      { wch: 12 }, // Store Code
      { wch: 28 }, // Item Name
      { wch: 16 }, // Category
      { wch: 16 }, // Barcode / HSN
      { wch: 14 }, // Batch Number
      { wch: 14 }, // Expiry Date
      { wch: 15 }, // Cost Rate
      { wch: 20 }, // Cost Unit (Purchase)
      { wch: 15 }, // MRP / Sale
      { wch: 15 }, // Sale Unit
      { wch: 18 }, // Quantity On Hand
      { wch: 16 }, // Available Qty
      { wch: 16 }, // Stock Base Unit
      { wch: 14 }, // Stock Status
    ];

    XLSX.utils.book_append_sheet(wb, wsList, "Live Stock");
    XLSX.writeFile(wb, `Live_Stock_Report_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`);
  };

  const startRecord = pagination.totalRecords === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endRecord = Math.min(pagination.page * pagination.pageSize, pagination.totalRecords);

  const getSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) {
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-muted-foreground/60 group-hover:text-foreground" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1 text-emerald-600 dark:text-emerald-400 font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1 text-emerald-600 dark:text-emerald-400 font-bold" />
    );
  };

  return (
    <ModuleLayout
      title="Live Stock Inquiry"
      description="Live batch-level inventory balances, expiry monitoring, and stock tracking across all warehouses and pharmacy locations"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={isLoading || stockData.length === 0}
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
        {/* KPI / Insight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-xs border-border bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Batches</p>
                <div className="text-2xl font-bold font-mono text-foreground mt-1">
                  {pagination.totalRecords.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                <Package className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Store</p>
                <div className="text-base font-semibold text-foreground mt-1 truncate max-w-[170px]" title={storeIdFilter === "all" ? "All Warehouses" : storesList.find((s: any) => String(s.id) === storeIdFilter)?.name || storeIdFilter}>
                  {storeIdFilter === "all"
                    ? "All Warehouses"
                    : storesList.find((s: any) => String(s.id) === storeIdFilter)?.name || "Selected Store"}
                </div>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                <Warehouse className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Category Scope</p>
                <div className="text-base font-semibold text-foreground mt-1 truncate max-w-[170px]" title={itemTypeIdFilter === "all" ? "All Categories" : itemTypesList.find((t: any) => String(t.id) === itemTypeIdFilter)?.name || itemTypeIdFilter}>
                  {itemTypeIdFilter === "all"
                    ? "All Item Types"
                    : itemTypesList.find((t: any) => String(t.id) === itemTypeIdFilter)?.name || "Selected Category"}
                </div>
              </div>
              <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl">
                <Layers className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-xs border-border bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stock Status Filter</p>
                <div className="text-base font-semibold text-foreground mt-1 capitalize">
                  {stockStatusFilter === "all"
                    ? "All Inventory"
                    : stockStatusFilter.replace(/_/g, " ")}
                </div>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                <Filter className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Toolbar */}
        <Card className="shadow-xs border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-12 gap-3 items-center">
              {/* Search input */}
              <div className="sm:col-span-2 md:col-span-3 lg:col-span-2 xl:col-span-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Search item name, batch #, barcode, HSN..."
                    className="pl-9 h-9 text-sm"
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
              <div className="xl:col-span-2">
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

              {/* Category / Item Type Filter */}
              <div className="xl:col-span-2">
                <Select
                  value={itemTypeIdFilter}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev) => ({
                        ...prev,
                        page: 1,
                        itemTypeId: val,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 w-full bg-background text-xs">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {itemTypesList.map((type: any) => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unit Conversion Filter */}
              <div className="xl:col-span-2">
                <Select
                  value={unitFilter}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev) => ({
                        ...prev,
                        unitFilter: val,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 w-full bg-background text-xs">
                    <SelectValue placeholder="Display Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Original Units</SelectItem>
                    {unitTypesList.map((u: any) => (
                      <SelectItem key={u.id} value={u.symbol || u.name}>
                        {u.name} ({u.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stock Status Filter */}
              <div className="xl:col-span-2">
                <Select
                  value={stockStatusFilter}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev) => ({
                        ...prev,
                        page: 1,
                        stockStatus: val,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 w-full bg-background text-xs">
                    <SelectValue placeholder="Stock Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock Statuses</SelectItem>
                    <SelectItem value="in_stock">In Stock (&gt; 0)</SelectItem>
                    <SelectItem value="low_stock">Low Stock (≤ Reorder Level)</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock (= 0)</SelectItem>
                    <SelectItem value="expired">Expired Batches</SelectItem>
                    <SelectItem value="expiring_soon_30">Expiring in 30 Days</SelectItem>
                    <SelectItem value="expiring_soon_90">Expiring in 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Expiring Before Date (Shadcn Popover + Calendar) & Clear */}
              <div className="xl:col-span-1 flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-9 px-2 text-xs bg-background",
                          !expiringBeforeFilter && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {expiringBeforeFilter
                            ? format(new Date(expiringBeforeFilter), "dd MMM")
                            : "Expiry"}
                        </span>
                        {expiringBeforeFilter && (
                          <X
                            className="ml-auto h-3.5 w-3.5 shrink-0 opacity-60 hover:opacity-100 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate({
                                search: (prev) => ({
                                  ...prev,
                                  page: 1,
                                  expiringBefore: "",
                                }),
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
                        startMonth={new Date(new Date().getFullYear() - 2, 0)}
                        endMonth={new Date(new Date().getFullYear() + 10, 11)}
                        selected={expiringBeforeFilter ? new Date(expiringBeforeFilter) : undefined}
                        onSelect={(date) =>
                          navigate({
                            search: (prev) => ({
                              ...prev,
                              page: 1,
                              expiringBefore: date ? format(date, "yyyy-MM-dd") : "",
                            }),
                          })
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleClearFilters}
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                    title="Clear All Filters"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="shadow-xs border-border overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="text-sm font-medium text-muted-foreground animate-pulse">
                  Loading live stock balances...
                </span>
              </div>
            ) : stockData.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-base font-semibold text-foreground">No stock records found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                  {hasActiveFilters
                    ? "Try adjusting or clearing your filters to view more stock entries."
                    : "Post a Goods Receipt Note (GRN) or stock adjustment to populate inventory balances."}
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
                      <th
                        onClick={() => handleSortChange("storeName")}
                        className="px-4 py-3.5 cursor-pointer hover:bg-muted/70 transition-colors select-none group"
                      >
                        <div className="flex items-center">
                          <span>Store Location</span>
                          {getSortIcon("storeName")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortChange("itemName")}
                        className="px-4 py-3.5 cursor-pointer hover:bg-muted/70 transition-colors select-none group"
                      >
                        <div className="flex items-center">
                          <span>Item Details</span>
                          {getSortIcon("itemName")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortChange("batchNumber")}
                        className="px-4 py-3.5 cursor-pointer hover:bg-muted/70 transition-colors select-none group"
                      >
                        <div className="flex items-center">
                          <span>Batch No.</span>
                          {getSortIcon("batchNumber")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortChange("expiryDate")}
                        className="px-4 py-3.5 cursor-pointer hover:bg-muted/70 transition-colors select-none group"
                      >
                        <div className="flex items-center">
                          <span>Expiry Date</span>
                          {getSortIcon("expiryDate")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortChange("purchaseRate")}
                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-muted/70 transition-colors select-none group"
                      >
                        <div className="flex items-center justify-end">
                          <span>Cost Rate (₹ / Pur. Unit)</span>
                          {getSortIcon("purchaseRate")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortChange("mrp")}
                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-muted/70 transition-colors select-none group"
                      >
                        <div className="flex items-center justify-end">
                          <span>MRP / Sale (₹ / Sale Unit)</span>
                          {getSortIcon("mrp")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortChange("quantityOnHand")}
                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-muted/70 transition-colors select-none group"
                      >
                        <div className="flex items-center justify-end">
                          <span>On Hand</span>
                          {getSortIcon("quantityOnHand")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortChange("availableQty")}
                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-muted/70 transition-colors select-none group"
                      >
                        <div className="flex items-center justify-end">
                          <span>Available</span>
                          {getSortIcon("availableQty")}
                        </div>
                      </th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stockData.map((row: any) => {
                      const qtyOnHand = Number(row.quantityOnHand || 0);
                      const availQty = Number(row.availableQty || 0);
                      const reorderLvl = Number(row.reorderLevel || 0);
                      const isOutOfStock = qtyOnHand <= 0;
                      const isLowStock = !isOutOfStock && reorderLvl > 0 && qtyOnHand <= reorderLvl;
                      const baseUnitSymbol = row.purchaseUnit || row.baseUnit || row.unit || "unit";

                      const conv = unitFilter && unitFilter !== "all"
                        ? getUnitConversionFactor(baseUnitSymbol, unitFilter, unitTypesList, unitConversionsList)
                        : { convertible: false, factor: 1 };

                      const displayOnHand = conv.convertible ? Number((qtyOnHand * conv.factor).toFixed(3)) : qtyOnHand;
                      const displayAvail = conv.convertible ? Number((availQty * conv.factor).toFixed(3)) : availQty;
                      const displayUnit = conv.convertible ? (conv.toUnit?.symbol || unitFilter) : baseUnitSymbol;
                      const isConverted = conv.convertible && displayUnit.toLowerCase() !== baseUnitSymbol.toLowerCase();

                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-muted/30 transition-colors duration-150"
                        >
                          {/* Store */}
                          <td className="px-4 py-3 align-middle">
                            <div className="flex items-center gap-2">
                              <Warehouse className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div>
                                <div className="font-semibold text-foreground">
                                  {row.storeName || "Central Warehouse"}
                                </div>
                                {row.storeCode && (
                                  <div className="text-[11px] font-mono text-muted-foreground">
                                    {row.storeCode}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Item Details */}
                          <td className="px-4 py-3 align-middle">
                            <div>
                              <div className="font-semibold text-foreground">
                                {row.itemName}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-muted/50">
                                  {row.itemTypeName || "General"}
                                </Badge>
                                {row.itemBarcode && (
                                  <span className="text-[11px] font-mono text-muted-foreground">
                                    Barcode: {row.itemBarcode}
                                  </span>
                                )}
                                {row.hsnCode && (
                                  <span className="text-[11px] font-mono text-muted-foreground">
                                    HSN: {row.hsnCode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Batch No */}
                          <td className="px-4 py-3 align-middle">
                            <span className="font-mono text-xs font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border">
                              {row.batchNumber || "—"}
                            </span>
                          </td>

                          {/* Expiry Date */}
                          <td className="px-4 py-3 align-middle">
                            {getExpiryBadge(row.expiryDate)}
                          </td>

                          {/* Cost Rate */}
                          <td className="px-4 py-3 align-middle text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                            ₹{Number(row.purchaseRate || 0).toFixed(2)}
                            <span className="text-[10px] text-muted-foreground/70 font-sans ml-0.5">/{row.purchaseUnit || row.unit || "unit"}</span>
                          </td>

                          {/* MRP / Sale */}
                          <td className="px-4 py-3 align-middle text-right font-mono text-xs font-medium text-foreground whitespace-nowrap">
                            ₹{Number(row.mrp || row.saleRate || 0).toFixed(2)}
                            <span className="text-[10px] text-muted-foreground/70 font-sans ml-0.5">/{row.saleUnit || row.unit || "unit"}</span>
                          </td>

                          {/* On Hand Qty */}
                          <td className="px-4 py-3 align-middle text-right font-mono font-bold text-sm text-foreground">
                            <div>
                              <span>{formatQtyNumber(displayOnHand)}</span>{" "}
                              <span className={cn("text-xs font-normal", isConverted ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                                {displayUnit}
                              </span>
                            </div>
                            {isConverted && (
                              <div className="text-[10px] text-muted-foreground font-normal">
                                (Orig: {formatQtyNumber(qtyOnHand)} {baseUnitSymbol})
                              </div>
                            )}
                          </td>

                          {/* Available Qty */}
                          <td className="px-4 py-3 align-middle text-right font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            <div>
                              <span>{formatQtyNumber(displayAvail)}</span>{" "}
                              <span className={cn("text-xs font-normal", isConverted ? "font-semibold text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                                {displayUnit}
                              </span>
                            </div>
                            {isConverted && (
                              <div className="text-[10px] text-muted-foreground font-normal">
                                (Orig: {formatQtyNumber(availQty)} {baseUnitSymbol})
                              </div>
                            )}
                          </td>

                          {/* Stock Health Status */}
                          <td className="px-4 py-3 align-middle text-center">
                            {isOutOfStock ? (
                              <Badge variant="destructive" className="text-[10px] uppercase font-semibold">
                                Out of Stock
                              </Badge>
                            ) : isLowStock ? (
                              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 text-[10px] uppercase font-semibold">
                                Low Stock
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 text-[10px] uppercase font-semibold">
                                In Stock
                              </Badge>
                            )}
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
