import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery, queryClient } from "@/lib/query";
import { client } from "@/services/rpc";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Badge } from "@/ui/badge";
import { Field } from "@/components/Field";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  SlidersHorizontal, 
  Plus, 
  Trash2, 
  Loader2,
  RefreshCw,
  CheckCircle2,
  Warehouse,
  FileText,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X
} from "lucide-react";
import * as React from "react";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/utils/cn";
import { ColumnDef } from "@/components/DataTable";
import { findUnit, getUnitConversionFactor } from "@/lib/unit-conversion";

const adjItemSchema = z.object({
  itemId: z.coerce.number().positive("Item is required"),
  batchId: z.coerce.number().positive("Batch is required"),
  systemQty: z.coerce.number().min(0),
  physicalQty: z.coerce.number().min(0, "Physical quantity is required"),
  unit: z.string().optional(),
  unitId: z.coerce.number().optional().nullable(),
  type: z.enum(["gain", "loss", "expired", "damaged"]).default("gain"),
});

const adjFormSchema = z.object({
  storeId: z.coerce.number().positive("Store is required"),
  reason: z.string().min(2, "Reason / Audit purpose is required"),
  items: z.array(adjItemSchema).min(1, "At least one item is required"),
});

type AdjFormValues = z.infer<typeof adjFormSchema>;

const adjustmentsSearchSchema = z.object({
  page: z.coerce.number().optional().catch(1),
  limit: z.coerce.number().optional().catch(20),
  search: z.string().optional().catch(""),
  status: z.string().optional().catch("all"),
  storeId: z.string().optional().catch("all"),
  adjustmentId: z.coerce.number().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/inventory/adjustments/")({
  validateSearch: (search) => adjustmentsSearchSchema.parse(search),
  component: AdjustmentsList,
});

function AdjustmentsList() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [localSearch, setLocalSearch] = React.useState(searchParams.search || "");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedAdjId, setSelectedAdjId] = React.useState<number | null>(
    searchParams.adjustmentId || null
  );

  // Fetch full adjustment details including items and store metadata when an ID is selected
  const { data: selectedAdjDetail, isFetching: isLoadingDetail } = useRpcQuery<any>(
    ["inventory-adjustment-detail", selectedAdjId],
    () =>
      client.inventory.adjustments[":id"].$get({
        param: { id: String(selectedAdjId) },
      }),
    {
      enabled: !!selectedAdjId,
    }
  );

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== (searchParams.search || "")) {
        navigate({
          search: (prev: any) => ({
            ...prev,
            search: localSearch || undefined,
            page: 1,
          }),
        });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch, searchParams.search, navigate]);

  const { data: adjsResponse, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["inventory-adjustments", searchParams],
    () =>
      client.inventory.adjustments.$get({
        query: {
          page: String(searchParams.page || 1),
          limit: String(searchParams.limit || 20),
          search: searchParams.search || undefined,
          status: searchParams.status !== "all" ? searchParams.status : undefined,
          storeId: searchParams.storeId !== "all" ? searchParams.storeId : undefined,
        },
      })
  );

  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  const { data: unitTypes = [] } = useRpcQuery<any[]>(
    ["unit-types"],
    () => client["unit-types"].$get()
  );

  const { data: unitConversions = [] } = useRpcQuery<any[]>(
    ["unit-conversions"],
    () => client["unit-conversions"].$get()
  );

  const adjsData = adjsResponse?.data || [];
  const pagination = adjsResponse?.pagination || { page: 1, pageSize: 20, totalRecords: 0, totalPages: 1 };
  const startRecord = pagination.totalRecords === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endRecord = Math.min(pagination.page * pagination.pageSize, pagination.totalRecords);
  const hasActiveFilters = Boolean(
    searchParams.search ||
    (searchParams.status && searchParams.status !== "all") ||
    (searchParams.storeId && searchParams.storeId !== "all")
  );

  const form = useForm<AdjFormValues>({
    resolver: zodResolver(adjFormSchema) as any,
    defaultValues: {
      storeId: storesList[0]?.id || 0,
      reason: "Physical Stock Count / Variance Reconciliation",
      items: [{ itemId: 0, batchId: 0, systemQty: 0, physicalQty: 0, unit: "Unit", unitId: null, type: "gain" }],
    },
  });

  const selectedStoreId = form.watch("storeId");

  // Fetch available batches for selected store
  const { data: storeStockResponse, isFetching: isStockLoading } = useRpcQuery<any>(
    ["inventory-store-stock", selectedStoreId],
    () =>
      client.inventory.stock.$get({
        query: {
          storeId: selectedStoreId ? String(selectedStoreId) : undefined,
          limit: "500",
        },
      }),
    { enabled: !!selectedStoreId }
  );

  const storeStockList = storeStockResponse?.data || [];

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleUnitChange = (index: number, newUnit: string) => {
    const oldUnit = form.getValues(`items.${index}.unit`) || "Unit";
    const oldSysQty = Number(form.getValues(`items.${index}.systemQty`)) || 0;
    const oldPhysQty = Number(form.getValues(`items.${index}.physicalQty`)) || 0;
    const targetUnitId = findUnit(newUnit, unitTypes)?.id || null;

    if (oldUnit && newUnit && oldUnit !== newUnit) {
      const conv = getUnitConversionFactor(oldUnit, newUnit, unitTypes, unitConversions);
      if (conv.convertible && conv.factor > 0) {
        form.setValue(`items.${index}.systemQty`, Number((oldSysQty * conv.factor).toFixed(3)));
        form.setValue(`items.${index}.physicalQty`, Number((oldPhysQty * conv.factor).toFixed(3)));
      } else {
        // Check conversion from batch's source stock unit
        const bId = form.getValues(`items.${index}.batchId`);
        const stockMatch = storeStockList.find((s: any) => s.batchId === bId);
        if (stockMatch) {
          const baseUnit = stockMatch.unit || stockMatch.baseUnit;
          const convFromBase = getUnitConversionFactor(baseUnit, newUnit, unitTypes, unitConversions);
          if (convFromBase.convertible && convFromBase.factor > 0) {
            const newSys = Number((Number(stockMatch.availableQty) * convFromBase.factor).toFixed(3));
            form.setValue(`items.${index}.systemQty`, newSys);
            form.setValue(`items.${index}.physicalQty`, newSys);
          }
        }
      }
    }
    form.setValue(`items.${index}.unit`, newUnit);
    form.setValue(`items.${index}.unitId`, targetUnitId);
  };

  const createMutation = useMutation({
    mutationFn: async (values: AdjFormValues) => {
      const res = await client.inventory.adjustments.$post({
        json: values,
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || "Failed to create adjustment");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Stock adjustment draft created successfully");
      queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const postMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await (client.inventory.adjustments as any)[":id"].post.$patch({
        param: { id: String(id) },
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || "Failed to post adjustment");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Stock adjustment posted and inventory stock updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["inventory-adjustments"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-adjustment-detail"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-ledger"] });
      setSelectedAdjId(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Posted</Badge>;
      case "draft":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Draft</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns: ColumnDef<Record<string, unknown>>[] = [
    {
      id: "adjustmentNo",
      label: "Adjustment No",
      render: (row) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
          {String(row.adjustmentNo || "")}
        </span>
      ),
    },
    {
      id: "storeName",
      label: "Store Location",
      render: (row: any) => (
        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
          <span>{row.storeName || row.store?.name || "N/A"}</span>
          {(row.storeCode || row.store?.code) && (
            <span className="text-[10px] text-muted-foreground font-mono">({row.storeCode || row.store?.code})</span>
          )}
        </div>
      ),
    },
    {
      id: "reason",
      label: "Audit Purpose / Reason",
      render: (row) => (
        <span className="text-slate-700 dark:text-slate-300 text-xs">
          {String(row.reason || "")}
        </span>
      ),
    },
    {
      id: "status",
      label: "Status",
      render: (row) => getStatusBadge(String(row.status || "")),
    },
    {
      id: "createdAt",
      label: "Date Created",
      render: (row) => {
        let formattedDate = "";
        try {
          formattedDate = format(new Date(String(row.createdAt)), "dd/MM/yyyy");
        } catch {
          formattedDate = String(row.createdAt || "");
        }
        return (
          <span className="font-mono text-xs text-muted-foreground">
            {formattedDate}
          </span>
        );
      },
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedAdjId(row.id)}
            className="h-8 text-xs font-medium cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 mr-1 text-slate-500" />
            {row.status === "draft" ? "Review & Post" : "View Details"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ModuleLayout
      title="Stock Adjustments"
      description="Physical inventory stock taking, variance write-offs, and batch reconciliations"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="h-9 text-xs"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isRefetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (storesList.length > 0) {
                form.setValue("storeId", storesList[0].id);
              }
              setDialogOpen(true);
            }}
            className="h-9 text-xs font-semibold"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Stock Take / Adjustment
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Search & Filter Toolbar */}
        <Card className="shadow-xs border-slate-200/80">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px]">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    placeholder="Search by adjustment no or audit reason..."
                    className="pl-9 h-9 text-xs"
                  />
                  {localSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalSearch("");
                        navigate({
                          search: (prev: any) => ({ ...prev, search: undefined, page: 1 }),
                        });
                      }}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="w-[150px]">
                <Select
                  value={searchParams.status || "all"}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        status: val !== "all" ? val : undefined,
                        page: 1,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="approved">Posted</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[190px]">
                <Select
                  value={searchParams.storeId || "all"}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        storeId: val !== "all" ? val : undefined,
                        page: 1,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Store Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stores</SelectItem>
                    {storesList.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[110px]">
                <Select
                  value={String(searchParams.limit || 20)}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        limit: Number(val),
                        page: 1,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Page Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLocalSearch("");
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        page: 1,
                        limit: 20,
                        search: "",
                        status: "all",
                        storeId: "all",
                      }),
                    });
                  }}
                  className="h-9 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Reset Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground uppercase text-[11px] font-semibold tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3">Adjustment No</th>
                  <th className="px-4 py-3">Store Location</th>
                  <th className="px-4 py-3">Audit Reason</th>
                  <th className="px-4 py-3">Audited Date</th>
                  <th className="px-4 py-3">Logged By</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span>Loading stock adjustments...</span>
                      </div>
                    </td>
                  </tr>
                ) : adjsData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <SlidersHorizontal className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-foreground">No stock adjustments recorded</p>
                      <p className="text-[11px] mt-0.5">
                        {hasActiveFilters ? "Try clearing search or filters" : "Click 'New Stock Take / Adjustment' above to get started"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  adjsData.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {row.adjustmentNo}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
                          {row.storeName || "N/A"}
                          {row.storeCode && (
                            <span className="text-[10px] text-muted-foreground font-mono">({row.storeCode})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-medium">
                        {row.reason}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {row.createdAt ? format(new Date(row.createdAt), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.createdByName || "Admin"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(String(row.status || ""))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2.5 cursor-pointer"
                          onClick={() => setSelectedAdjId(row.id)}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                          {row.status === "draft" ? "Review & Post" : "View Details"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Server-Side Pagination Footer */}
          {!isLoading && pagination.totalRecords > 0 && (
            <div className="px-4 py-3 border-t flex flex-wrap items-center justify-between gap-3 bg-muted/10 text-xs">
              <div className="text-muted-foreground">
                Showing <strong className="text-foreground font-semibold">{startRecord}</strong> to{" "}
                <strong className="text-foreground font-semibold">{endRecord}</strong> of{" "}
                <strong className="text-foreground font-semibold">{pagination.totalRecords}</strong> adjustments
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    navigate({
                      search: (prev: any) => ({ ...prev, page: 1 }),
                    })
                  }
                  className="h-8 px-2"
                  title="First Page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    navigate({
                      search: (prev: any) => ({ ...prev, page: pagination.page - 1 }),
                    })
                  }
                  className="h-8 px-2"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="px-2 font-medium">
                  Page {pagination.page} of {pagination.totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    navigate({
                      search: (prev: any) => ({ ...prev, page: pagination.page + 1 }),
                    })
                  }
                  className="h-8 px-2"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    navigate({
                      search: (prev: any) => ({ ...prev, page: pagination.totalPages }),
                    })
                  }
                  className="h-8 px-2"
                  title="Last Page"
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Create Adjustment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
              <span>Physical Stock Count & Adjustment</span>
            </DialogTitle>
            <DialogDescription>
              Record variance between recorded system quantities and physical counts.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="storeId"
                render={({ field }) => (
                  <Field label="Store Location *" error={form.formState.errors.storeId?.message}>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(val ? Number(val) : 0)}
                    >
                      <SelectTrigger className="w-full h-9 text-xs">
                        <SelectValue placeholder="Select Store Location" />
                      </SelectTrigger>
                      <SelectContent>
                        {storesList.map((store: any) => (
                          <SelectItem key={store.id} value={String(store.id)}>
                            {store.name} ({store.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />

              <div>
                <Label className="text-xs">Reason / Audit Purpose *</Label>
                <div className="mt-1.5">
                  <Input
                    {...form.register("reason")}
                    placeholder="e.g. Monthly Physical Verification, Damaged Stock Write-off"
                    className="h-9 text-xs"
                  />
                  {form.formState.errors.reason && (
                    <p className="text-[11px] text-destructive mt-1">{form.formState.errors.reason.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Counted Items & Batches
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ itemId: 0, batchId: 0, systemQty: 0, physicalQty: 0, unit: "Unit", unitId: null, type: "gain" })}
                  className="h-8 text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Batch Item
                </Button>
              </div>

              {fields.map((field, index) => {
                const currentBatchId = form.watch(`items.${index}.batchId`);
                const currentItemId = form.watch(`items.${index}.itemId`);
                const currentUnit = form.watch(`items.${index}.unit`) || "Unit";
                const currentSysQty = Number(form.watch(`items.${index}.systemQty`)) || 0;
                const currentPhysQty = Number(form.watch(`items.${index}.physicalQty`)) || 0;
                const diff = currentPhysQty - currentSysQty;

                const currentStockItem = storeStockList.find((s: any) => s.batchId === currentBatchId);

                // Collect available units for this item
                const unitsSet = new Set<string>();
                if (currentUnit) unitsSet.add(currentUnit);
                if (currentStockItem) {
                  if (currentStockItem.unit) unitsSet.add(currentStockItem.unit);
                  if (currentStockItem.baseUnit) unitsSet.add(currentStockItem.baseUnit);
                  if (currentStockItem.purchaseUnit) unitsSet.add(currentStockItem.purchaseUnit);
                  if (currentStockItem.saleUnit) unitsSet.add(currentStockItem.saleUnit);
                }
                const relatedStock = storeStockList.filter((s: any) => s.itemId === currentItemId);
                relatedStock.forEach((s: any) => {
                  if (s.unit) unitsSet.add(s.unit);
                  if (s.baseUnit) unitsSet.add(s.baseUnit);
                  if (s.purchaseUnit) unitsSet.add(s.purchaseUnit);
                  if (s.saleUnit) unitsSet.add(s.saleUnit);
                });
                (unitTypes as any[]).forEach((u: any) => {
                  const sym = u.symbol || u.name;
                  if (sym) unitsSet.add(sym);
                });
                const unitOptions = Array.from(unitsSet);

                return (
                  <div key={field.id} className="p-3 rounded-lg border bg-muted/30 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex-1 min-w-[200px]">
                        <Label className="text-[10px] text-muted-foreground block mb-1">Select Batch *</Label>
                        <Controller
                          control={form.control}
                          name={`items.${index}.batchId`}
                          render={({ field: batchField }) => (
                            <Select
                              value={batchField.value ? String(batchField.value) : ""}
                              onValueChange={(val) => {
                                const bId = Number(val);
                                batchField.onChange(bId);
                                const match = storeStockList.find((s: any) => s.batchId === bId);
                                if (match) {
                                  const defUnit = match.unit || match.baseUnit || match.saleUnit || match.purchaseUnit || "Unit";
                                  const defUnitId = findUnit(defUnit, unitTypes)?.id || null;
                                  form.setValue(`items.${index}.itemId`, match.itemId);
                                  form.setValue(`items.${index}.unit`, defUnit);
                                  form.setValue(`items.${index}.unitId`, defUnitId);
                                  form.setValue(`items.${index}.systemQty`, Number(match.availableQty));
                                  form.setValue(`items.${index}.physicalQty`, Number(match.availableQty));
                                }
                              }}
                            >
                              <SelectTrigger className="w-full h-9 text-xs">
                                <SelectValue placeholder={isStockLoading ? "Loading stock..." : "Choose Batch"} />
                              </SelectTrigger>
                              <SelectContent className="max-h-60">
                                {storeStockList.map((st: any) => (
                                  <SelectItem key={st.id} value={String(st.batchId)}>
                                    {st.itemName} • Batch: {st.batchNumber} (System: {st.availableQty} {st.unit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      <div className="w-24">
                        <Label className="text-[10px] text-muted-foreground block mb-1">Physical Qty *</Label>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="0"
                          {...form.register(`items.${index}.physicalQty`, {
                            onChange: (e) => {
                              const val = Number(e.target.value) || 0;
                              const curSys = Number(form.getValues(`items.${index}.systemQty`)) || 0;
                              const curType = form.getValues(`items.${index}.type`);
                              if (val > curSys && curType === "loss") {
                                form.setValue(`items.${index}.type`, "gain");
                              } else if (val < curSys && curType === "gain") {
                                form.setValue(`items.${index}.type`, "loss");
                              }
                            },
                          })}
                          className="h-9 text-xs font-mono font-bold text-center"
                        />
                      </div>

                      <div className="w-28">
                        <Label className="text-[10px] text-muted-foreground block mb-1">Unit Type *</Label>
                        <select
                          value={currentUnit}
                          onChange={(e) => handleUnitChange(index, e.target.value)}
                          className="w-full h-9 px-2 rounded-md border bg-background text-xs font-mono font-medium outline-none focus-visible:ring-1 cursor-pointer"
                        >
                          {unitOptions.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-32">
                        <Label className="text-[10px] text-muted-foreground block mb-1">Adjustment Type</Label>
                        <Controller
                          control={form.control}
                          name={`items.${index}.type`}
                          render={({ field: typeField }) => (
                            <Select
                              value={typeField.value}
                              onValueChange={typeField.onChange}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="gain">Stock Gain (+)</SelectItem>
                                <SelectItem value="loss">Stock Loss (-)</SelectItem>
                                <SelectItem value="expired">Expired Loss</SelectItem>
                                <SelectItem value="damaged">Damaged Loss</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                      </div>

                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="h-9 w-9 mt-4 text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Remove Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Variance and Conversion Helper Display */}
                    {currentBatchId > 0 && (
                      <div className="flex items-center justify-between text-[11px] pt-1 px-1 border-t border-border/40 text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>
                            System Recorded: <strong className="font-mono text-foreground">{currentSysQty.toFixed(2)} {currentUnit}</strong>
                          </span>
                          {currentStockItem && currentStockItem.unit && currentStockItem.unit !== currentUnit && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              (Base: {Number(currentStockItem.availableQty).toFixed(2)} {currentStockItem.unit})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span>Calculated Variance:</span>
                          <span
                            className={cn(
                              "font-mono font-bold px-1.5 py-0.5 rounded text-[10px]",
                              diff > 0
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                : diff < 0
                                ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)} {currentUnit}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Draft Adjustment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail & Post Dialog with Complete Line Items Breakdown */}
      <Dialog
        open={!!selectedAdjId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAdjId(null);
            if (searchParams.adjustmentId) {
              navigate({
                search: (prev: any) => ({ ...prev, adjustmentId: undefined }),
              });
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {isLoadingDetail ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span>Loading adjustment details...</span>
            </div>
          ) : !selectedAdjDetail || "error" in selectedAdjDetail ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
              <p className="font-semibold text-foreground">Adjustment record not found</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-4">
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
                    <span>Adjustment #{selectedAdjDetail.adjustmentNo}</span>
                  </DialogTitle>
                  {getStatusBadge(selectedAdjDetail.status)}
                </div>
                <DialogDescription>
                  Store: {selectedAdjDetail.storeName || "Main Store"} • Purpose: {selectedAdjDetail.reason}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Summary Metadata Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="bg-muted/40 p-2.5 rounded-lg border text-xs">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Store Location</span>
                    <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                      <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
                      {selectedAdjDetail.storeName || "N/A"}
                      {selectedAdjDetail.storeCode && (
                        <span className="text-[10px] text-muted-foreground font-mono">({selectedAdjDetail.storeCode})</span>
                      )}
                    </span>
                  </div>

                  <div className="bg-muted/40 p-2.5 rounded-lg border text-xs">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Audit Date</span>
                    <span className="font-semibold font-mono text-foreground mt-0.5 block">
                      {selectedAdjDetail.createdAt ? format(new Date(selectedAdjDetail.createdAt), "dd MMM yyyy, hh:mm a") : "—"}
                    </span>
                  </div>

                  <div className="bg-muted/40 p-2.5 rounded-lg border text-xs">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Logged By</span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      {selectedAdjDetail.createdByName || "Admin"}
                    </span>
                  </div>

                  <div className="bg-muted/40 p-2.5 rounded-lg border text-xs">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Items Count</span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      {selectedAdjDetail.items?.length || 0} Batches Counted
                    </span>
                  </div>
                </div>

                {/* Items Breakdown Table */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                      <tr>
                        <th className="py-2.5 px-3 w-8 text-center">#</th>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3">Batch & Expiry</th>
                        <th className="py-2.5 px-3 text-center">Adj Type</th>
                        <th className="py-2.5 px-3 text-right">System Qty</th>
                        <th className="py-2.5 px-3 text-right">Physical Qty</th>
                        <th className="py-2.5 px-3 text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {!selectedAdjDetail.items || selectedAdjDetail.items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-muted-foreground text-xs">
                            No adjustment line items recorded.
                          </td>
                        </tr>
                      ) : (
                        selectedAdjDetail.items.map((item: any, idx: number) => {
                          const diff = Number(item.differenceQty || 0);
                          const unit = item.unit ? ` ${item.unit}` : "";

                          let formattedExp = item.expiryDate || "—";
                          if (item.expiryDate && item.expiryDate !== "—") {
                            try {
                              const expDate = new Date(item.expiryDate);
                              if (!isNaN(expDate.getTime())) {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                                formattedExp = diffDays <= 90 ? item.expiryDate : format(expDate, "MMM-yyyy");
                              }
                            } catch {}
                          }

                          const getTypeBadge = (type: string) => {
                            switch (type) {
                              case "gain":
                                return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Gain (+)</Badge>;
                              case "loss":
                                return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">Loss (-)</Badge>;
                              case "expired":
                                return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Expired</Badge>;
                              case "damaged":
                                return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">Damaged</Badge>;
                              default:
                                return <Badge variant="outline" className="text-[10px]">{type}</Badge>;
                            }
                          };

                          return (
                            <tr key={item.id || idx} className="hover:bg-muted/20">
                              <td className="py-2.5 px-3 text-center text-muted-foreground font-mono">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-foreground">{item.itemName || `Item #${item.itemId}`}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-mono font-medium text-foreground">{item.batchNumber || `#${item.batchId}`}</span>
                                {formattedExp && formattedExp !== "—" && (
                                  <span className="text-[10px] text-muted-foreground block">Exp: {formattedExp}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {getTypeBadge(item.type)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                                {Number(item.systemQty).toFixed(2)}{unit}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-medium text-foreground">
                                {Number(item.physicalQty).toFixed(2)}{unit}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold">
                                <span className={cn(
                                  "inline-flex items-center px-1.5 py-0.5 rounded text-[11px]",
                                  diff > 0 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : diff < 0 ? "bg-rose-50 text-rose-700 border border-rose-200" : "text-muted-foreground"
                                )}>
                                  {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}{unit}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button variant="outline" size="sm" onClick={() => setSelectedAdjId(null)}>
                    Close
                  </Button>
                  {selectedAdjDetail.status === "draft" && (
                    <Button
                      size="sm"
                      disabled={postMutation.isPending}
                      onClick={() => postMutation.mutate(selectedAdjDetail.id)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer"
                    >
                      {postMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      )}
                      Post Adjustment to Ledger
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}

