import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { Card, CardContent } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Label } from "@/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { 
  History, 
  RefreshCw, 
  Loader2, 
  ArrowUpRight, 
  ArrowDownLeft, 
  X,
  Warehouse,
  FileText
} from "lucide-react";

import { z } from "zod";
import { format } from "date-fns";
import { cn } from "@/utils/cn";

const ledgerSearchSchema = z.object({
  page: z.number().optional().catch(1),
  limit: z.number().optional().catch(20),
  storeId: z.string().optional().catch("all"),
  movementType: z.string().optional().catch("all"),
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
  const dateFromFilter = searchParams.dateFrom || "";
  const dateToFilter = searchParams.dateTo || "";

  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  const { data: ledgerResponse, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["inventory-ledger", searchParams],
    () =>
      client.inventory.ledger.$get({
        query: {
          page: String(page),
          limit: String(limit),
          storeId: storeIdFilter !== "all" ? storeIdFilter : undefined,
          movementType: movementTypeFilter !== "all" ? movementTypeFilter : undefined,
          dateFrom: dateFromFilter || undefined,
          dateTo: dateToFilter || undefined,
        },
      })
  );

  const ledgerData = ledgerResponse?.data || [];

  const getMovementBadge = (type: string) => {
    switch (type) {
      case "GRN":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">GRN Inward</Badge>;
      case "SALE":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">POS Sale</Badge>;
      case "POS_RETURN":
        return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200">POS Return</Badge>;
      case "TRANSFER_IN":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">Transfer In</Badge>;
      case "TRANSFER_OUT":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Transfer Out</Badge>;
      case "ADJUSTMENT_ADD":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Adjustment (+)</Badge>;
      case "ADJUSTMENT_SUB":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Adjustment (-)</Badge>;
      case "DAMAGE":
        return <Badge className="bg-red-600 text-white">Damage</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const columns: ColumnDef<Record<string, unknown>>[] = [
    {
      id: "transactionDate",
      label: "Date & Time",
      render: (row) => {
        const val = row.transactionDate;
        if (!val) return <span className="text-slate-400">-</span>;
        const d = new Date(String(val));
        return (
          <span className="font-mono text-xs text-slate-700 dark:text-slate-300">
            {isNaN(d.getTime()) ? String(val) : format(d, "yyyy-MM-dd HH:mm:ss")}
          </span>
        );
      },
    },
    {
      id: "storeName",
      label: "Store",
      render: (row) => (
        <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
          {String(row.storeName || "")}
        </div>
      ),
    },
    {
      id: "itemName",
      label: "Item Name",
      render: (row) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {String(row.itemName || "")}
        </span>
      ),
    },
    {
      id: "batchNumber",
      label: "Batch No.",
      render: (row) => (
        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
          {String(row.batchNumber || "")}
        </span>
      ),
    },
    {
      id: "movementType",
      label: "Movement",
      render: (row) => getMovementBadge(String(row.movementType || "")),
    },
    {
      id: "referenceType",
      label: "Reference",
      render: (row) => (
        <div className="flex items-center gap-1 font-mono text-xs text-slate-600 dark:text-slate-400">
          <FileText className="w-3 h-3 text-slate-400" />
          {String(row.referenceType)} #{String(row.referenceId)}
        </div>
      ),
    },
    {
      id: "quantityChange",
      label: "Quantity Change",
      render: (row) => {
        const qty = Number(row.quantityChange);
        const isPositive = qty > 0;
        return (
          <div className="flex items-center gap-1 font-mono font-bold text-sm">
            {isPositive ? (
              <span className="text-emerald-600 flex items-center">
                <ArrowDownLeft className="w-4 h-4 mr-0.5" />+{qty} {String(row.unit || "")}
              </span>
            ) : (
              <span className="text-rose-600 flex items-center">
                <ArrowUpRight className="w-4 h-4 mr-0.5" />{qty} {String(row.unit || "")}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "balanceAfter",
      label: "Balance After",
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
          {Number(row.balanceAfter)} {String(row.unit || "")}
        </span>
      ),
    },
    {
      id: "createdByName",
      label: "Recorded By",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {String(row.createdByName || "System")}
        </span>
      ),
    },
  ];

  return (
    <ModuleLayout
      title="Immutable Stock Ledger"
      description="Complete audit trail of every stock transaction, receipt, sale, transfer, and adjustment"
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
        {/* Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-[200px]">
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Store</Label>
                <Select
                  value={storeIdFilter}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev) => ({ ...prev, page: 1, storeId: val }),
                    })
                  }
                >
                  <SelectTrigger className="w-full bg-background text-xs h-9">
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

              <div className="w-[200px]">
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Movement Type</Label>
                <Select
                  value={movementTypeFilter}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev) => ({ ...prev, page: 1, movementType: val }),
                    })
                  }
                >
                  <SelectTrigger className="w-full bg-background text-xs h-9">
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

              {(storeIdFilter !== "all" || movementTypeFilter !== "all") && (
                <div className="pt-5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigate({
                        search: () => ({ page: 1, limit: 20, storeId: "all", movementType: "all", dateFrom: "", dateTo: "" }),
                      })
                    }
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reset
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              </div>
            ) : ledgerData.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-base font-medium">No ledger entries found</p>
                <p className="text-xs text-slate-400 mt-1">Transactions will appear here as stock movements occur.</p>
              </div>
            ) : (
              <DataTable columns={columns} rows={ledgerData as Record<string, unknown>[]} />
            )}
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
