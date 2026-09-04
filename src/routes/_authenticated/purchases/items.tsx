import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery, queryClient } from "@/lib/query";
import { client } from "@/services/rpc";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { toast } from "sonner";
import { 
  Package, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  RefreshCw,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Filter,
  X,
  Search
} from "lucide-react";
import { Badge } from "@/ui/badge";
import { cn } from "@/utils/cn";
import * as React from "react";
import { AddItemDialog } from "@/components/AddItemForm";
import { z } from "zod";

const itemsSearchSchema = z.object({
  page: z.number().optional().catch(1),
  limit: z.number().optional().catch(10),
  name: z.string().optional().catch(""),
  itemTypeId: z.string().optional().catch("all"),
  isSaleable: z.string().optional().catch("all"),
});

export const Route = createFileRoute("/_authenticated/purchases/items")({
  validateSearch: (search) => itemsSearchSchema.parse(search),
  component: Items
});

function Items() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [localSearch, setLocalSearch] = React.useState(searchParams.name || "");

  const page = searchParams.page ?? 1;
  const limit = searchParams.limit ?? 10;
  const nameFilter = searchParams.name || "";
  const itemTypeIdFilter = searchParams.itemTypeId || "all";
  const isSaleableFilter = searchParams.isSaleable || "all";

  // Fetch items list with server side pagination
  const { data: itemsResponse, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["items", searchParams],
    () => client.items.$get({
      query: {
        page: String(page),
        limit: String(limit),
        name: nameFilter || undefined,
        itemTypeId: itemTypeIdFilter !== "all" ? itemTypeIdFilter : undefined,
        isSaleable: isSaleableFilter !== "all" ? isSaleableFilter : undefined,
      } as any
    })
  );

  // Fetch item types to show in filter options
  const { data: itemTypes = [] } = useRpcQuery<any[]>(
    ["item-types"],
    () => client["item-types"].$get()
  );

  // Fetch unit types
  const { data: unitTypes = [] } = useRpcQuery<any[]>(
    ["unit-types"],
    () => client["unit-types"].$get()
  );

  // Fetch unit conversions
  const { data: unitConversions = [] } = useRpcQuery<any[]>(
    ["unit-conversions"],
    () => client["unit-conversions"].$get()
  );

  const getConversionFactor = React.useCallback(
    (fromSymbol: string, toSymbol: string) => {
      if (!fromSymbol || !toSymbol || fromSymbol === toSymbol) return 1;
      const fromU = unitTypes.find((u) => u.symbol === fromSymbol || u.name === fromSymbol);
      const toU = unitTypes.find((u) => u.symbol === toSymbol || u.name === toSymbol);
      if (!fromU || !toU || !unitConversions || unitConversions.length === 0) return 1;

      const fId = Number(fromU.id);
      const tId = Number(toU.id);

      const direct = unitConversions.find(
        (c: any) => Number(c.fromUnitId) === fId && Number(c.toUnitId) === tId
      );
      if (direct && Number(direct.multiplier) > 0) return Number(direct.multiplier);

      const inverse = unitConversions.find(
        (c: any) => Number(c.fromUnitId) === tId && Number(c.toUnitId) === fId
      );
      if (inverse && Number(inverse.multiplier) > 0) return 1 / Number(inverse.multiplier);

      return 1;
    },
    [unitTypes, unitConversions]
  );


  const itemsList = itemsResponse?.data || [];
  const totalItems = itemsResponse?.total || 0;
  const totalPages = itemsResponse?.totalPages || 1;

  const hasActiveFilters = !!(
    searchParams.name || 
    (searchParams.itemTypeId && searchParams.itemTypeId !== "all") ||
    (searchParams.isSaleable && searchParams.isSaleable !== "all")
  );

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if ((localSearch || "") !== (searchParams.name || "")) {
        navigate({
          search: (prev: any) => ({
            ...prev,
            name: localSearch || undefined,
            page: 1,
          }),
        });
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [localSearch]);

  React.useEffect(() => {
    setLocalSearch(searchParams.name || "");
  }, [searchParams.name]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await client.items[":id"].$delete({
        param: { id: String(id) },
      } as any);
      if (!res.ok) {
        const errorData = await (res.json() as Promise<any>).catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete item");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Item deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete item");
    }
  });

  const handleAddClick = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  return (
    <ModuleLayout
      title="Items Catalog Master"
      description="Manage hospital supplies, medicine lists, and unit pricing catalog."
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(true)}>
            <Filter className={cn("h-4 w-4 mr-1", hasActiveFilters && "text-primary fill-primary/10")} /> Filters {hasActiveFilters && <Badge variant="default" className="ml-1 px-1 h-4 bg-primary/10 text-primary border-primary/20">Active</Badge>}
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={handleAddClick}>
            <Plus className="mr-1 h-4 w-4" /> Add Item
          </Button>
        </div>
      }
    >
      <div className="max-w-5xl mx-auto py-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Package className="text-primary size-5" />
            <div>
              <CardTitle>Items Listing</CardTitle>
              <CardDescription>Comprehensive lookup list of items available for procurement orders.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : itemsList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No items cataloged. Click "Add Item" to add new catalog items.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-slate-50 dark:bg-slate-900 border-b">
                      <tr>
                        <th className="px-6 py-3">Item Name</th>
                        <th className="px-6 py-3">Type / Category</th>
                        <th className="px-6 py-3">Default Purchase Unit</th>
                        <th className="px-6 py-3">Default Sale Unit</th>
                        <th className="px-6 py-3 text-right">GST %</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsList.map((item: any) => {
                        const costPrice = Number(item.rate || 0);
                        const salePrice = Number(item.salePrice || 0);
                        const purchaseUnit = item.purchaseUnit || item.unit || "unit";
                        const saleUnit = item.saleUnit || item.unit || "unit";
                        const factor = getConversionFactor(purchaseUnit, saleUnit);
                        const effectiveCostPerSaleUnit = factor > 0 ? costPrice / factor : costPrice;
                        const marginPercent = effectiveCostPerSaleUnit > 0 ? (((salePrice - effectiveCostPerSaleUnit) / effectiveCostPerSaleUnit) * 100).toFixed(1) : "0";
                        const extraUnitPrices = item.unitPrices || [];

                        return (
                          <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-semibold">
                              <div className="flex items-center gap-2">
                                <span>{item.name}</span>
                                {item.isSaleable === false ? (
                                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[10px] px-1.5 py-0 font-normal">
                                    Consumable
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground border-slate-200">
                                    Saleable
                                  </Badge>
                                )}
                              </div>
                              {extraUnitPrices.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {extraUnitPrices.map((up: any) => (
                                    <Badge key={up.unit} variant="default" className="text-[10px] px-1 py-0 bg-muted/70 text-muted-foreground border">
                                      {up.unit}: ₹{up.costPrice}/₹{up.salePrice}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                              {item.itemTypeName || "—"}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900 dark:text-slate-100">
                                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(costPrice)}
                                </span>
                                <span className="text-xs text-muted-foreground">per {purchaseUnit}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(salePrice)}
                                  </span>
                                  {effectiveCostPerSaleUnit > 0 && (
                                    <Badge className={`text-[10px] px-1 py-0 ${Number(marginPercent) >= 0 ? "bg-emerald-500/15 text-emerald-700" : "bg-destructive/15 text-destructive"}`}>
                                      {Number(marginPercent) >= 0 ? "+" : ""}{marginPercent}% Margin
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground">per {saleUnit}</span>
                                {purchaseUnit !== saleUnit && factor !== 1 && (
                                  <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                    (1 {purchaseUnit} = {factor} {saleUnit} · Cost: ₹{effectiveCostPerSaleUnit.toFixed(2)}/{saleUnit})
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-400">
                              {Number(item.gstPercent || 0)}%
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEditClick(item)}
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Edit Item"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this catalog item?")) {
                                    deleteMutation.mutate(item.id);
                                  }
                                }}
                                className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                title="Delete Item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>

                  </table>
                </div>

                {/* Server Side Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-background border-t text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>Show</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        navigate({ search: (prev: any) => ({ ...prev, limit: Number(e.target.value), page: 1 }) });
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
                      Showing {totalItems === 0 ? 0 : (page - 1) * limit + 1} to {Math.min(page * limit, totalItems)} of {totalItems} entries
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate({ search: (prev: any) => ({ ...prev, page: 1 }) })}
                        disabled={page === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate({ search: (prev: any) => ({ ...prev, page: Math.max(page - 1, 1) }) })}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="px-2 text-xs font-medium">
                        Page {page} of {totalPages || 1}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate({ search: (prev: any) => ({ ...prev, page: Math.min(page + 1, totalPages) }) })}
                        disabled={page === totalPages || totalPages === 0}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate({ search: (prev: any) => ({ ...prev, page: totalPages }) })}
                        disabled={page === totalPages || totalPages === 0}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <AddItemDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingItem(null);
        }}
        editingItem={editingItem}
        onItemAdded={() => {
          refetch();
          setDialogOpen(false);
        }}
        onItemUpdated={() => {
          refetch();
          setDialogOpen(false);
        }}
      />

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
              <div className="flex items-center gap-2 font-semibold text-foreground">
                <Filter className="text-primary" size={18} />
                <h3 className="font-semibold text-lg text-foreground">Filters</h3>
              </div>
              <button
                onClick={() => setShowFilters(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer animate-in duration-100"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block">Item Name</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search name..."
                    className="pl-8 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block">Type / Category</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={itemTypeIdFilter}
                  onChange={(e) => navigate({ search: (prev: any) => ({ ...prev, itemTypeId: e.target.value || "all", page: 1 }) })}
                >
                  <option value="all">All Types</option>
                  {itemTypes.map((t: any) => (
                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block">Classification</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={isSaleableFilter}
                  onChange={(e) => navigate({ search: (prev: any) => ({ ...prev, isSaleable: e.target.value || "all", page: 1 }) })}
                >
                  <option value="all">All Items</option>
                  <option value="true">Saleable Only</option>
                  <option value="false">Internal Consumables Only</option>
                </select>
              </div>

              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => {
                  navigate({ search: { page: 1, limit: 10 } });
                  setLocalSearch("");
                  setShowFilters(false);
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </>
      )}
    </ModuleLayout>
  );
}
