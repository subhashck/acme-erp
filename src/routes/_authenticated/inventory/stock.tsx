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
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { 
  Package, 
  Search, 
  RefreshCw, 
  Loader2, 
  X,
  Warehouse
} from "lucide-react";
import * as React from "react";
import { z } from "zod";
import { cn } from "@/utils/cn";

const stockSearchSchema = z.object({
  page: z.number().optional().catch(1),
  limit: z.number().optional().catch(20),
  storeId: z.string().optional().catch("all"),
  search: z.string().optional().catch(""),
  expiringBefore: z.string().optional().catch(""),
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
  const searchFilter = searchParams.search || "";
  const expiringBeforeFilter = searchParams.expiringBefore || "";

  const [localSearch, setLocalSearch] = React.useState(searchFilter);

  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  const { data: stockResponse, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["inventory-stock", searchParams],
    () =>
      client.inventory.stock.$get({
        query: {
          page: String(page),
          limit: String(limit),
          storeId: storeIdFilter !== "all" ? storeIdFilter : undefined,
          search: searchFilter || undefined,
          expiringBefore: expiringBeforeFilter || undefined,
        },
      })
  );

  const stockData = stockResponse?.data || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      search: (prev) => ({
        ...prev,
        page: 1,
        search: localSearch,
      }),
    });
  };

  const getExpiryBadge = (expiryDateStr: string) => {
    if (!expiryDateStr) return null;
    const expiry = new Date(expiryDateStr);
    const today = new Date();
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (diffDays <= 0) {
      return (
        <Badge className="bg-red-600 text-white font-medium">
          Expired ({expiryDateStr})
        </Badge>
      );
    }
    if (diffDays <= 30) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 font-medium">
          Expiring in {diffDays} days
        </Badge>
      );
    }
    if (diffDays <= 90) {
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-medium">
          Expiring in {diffDays} days
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
        {expiryDateStr}
      </Badge>
    );
  };

  const columns: ColumnDef<Record<string, unknown>>[] = [
    {
      id: "storeName",
      label: "Store / Location",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-slate-500" />
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {String(row.storeName || "Central Warehouse")}
          </span>
        </div>
      ),
    },
    {
      id: "itemName",
      label: "Item Name",
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{String(row.itemName || "")}</div>
          <div className="text-xs text-slate-500">{String(row.itemTypeName || "General")}</div>
        </div>
      ),
    },
    {
      id: "batchNumber",
      label: "Batch No.",
      render: (row) => (
        <span className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
          {String(row.batchNumber || "")}
        </span>
      ),
    },
    {
      id: "expiryDate",
      label: "Expiry Date",
      render: (row) => getExpiryBadge(String(row.expiryDate || "")),
    },
    {
      id: "purchaseRate",
      label: "Cost Rate",
      render: (row) => (
        <span className="font-mono text-slate-700 dark:text-slate-300">
          ₹{Number(row.purchaseRate || 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "mrp",
      label: "MRP / Sale Price",
      render: (row) => (
        <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
          ₹{Number(row.mrp || row.saleRate || 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "quantityOnHand",
      label: "On Hand Qty",
      render: (row) => (
        <span className="font-mono font-bold text-base text-slate-900 dark:text-slate-100">
          {Number(row.quantityOnHand || 0)} {String(row.unit || "")}
        </span>
      ),
    },
    {
      id: "availableQty",
      label: "Available Qty",
      render: (row) => (
        <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
          {Number(row.availableQty || 0)} {String(row.unit || "")}
        </span>
      ),
    },
  ];

  return (
    <ModuleLayout
      title="Live Stock Inquiry"
      description="View live batch-level inventory balance across all warehouses and hospital stores"
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Search & Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-60">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Search by item name or code..."
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="w-55">
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
                  <SelectTrigger className="w-full bg-background">
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

              <Button type="submit" size="sm">
                Search
              </Button>

              {(searchFilter || storeIdFilter !== "all" || expiringBeforeFilter) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLocalSearch("");
                    navigate({
                      search: () => ({ page: 1, limit: 20, storeId: "all", search: "", expiringBefore: "" }),
                    });
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : stockData.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-base font-medium">No stock records found</p>
                <p className="text-xs text-slate-400 mt-1">Post a Goods Receipt Note (GRN) to populate store inventory.</p>
              </div>
            ) : (
              <DataTable columns={columns} rows={stockData as Record<string, unknown>[]} />
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
