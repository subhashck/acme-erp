import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery, queryClient } from "@/lib/query";
import { client } from "@/services/rpc";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { Field } from "@/components/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  Truck, 
  Plus, 
  Trash2, 
  Loader2,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Warehouse,
  PackageCheck,
  FileCheck2,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/ui/badge";
import { cn } from "@/utils/cn";

const transferItemSchema = z.object({
  itemId: z.coerce.number().positive("Item is required"),
  batchId: z.coerce.number().positive("Batch is required"),
  quantity: z.coerce.number().positive("Quantity must be > 0"),
  unit: z.string().min(1, "Unit is required"),
  unitRate: z.coerce.number().min(0).default(0),
});

const transferFormSchema = z
  .object({
    fromStoreId: z.coerce.number().positive("Source store is required"),
    toStoreId: z.coerce.number().positive("Destination store is required"),
    requisitionId: z.coerce.number().optional().nullable(),
    remarks: z.string().optional().nullable(),
    items: z.array(transferItemSchema).min(1, "At least one item is required"),
  })
  .refine((data) => data.fromStoreId !== data.toStoreId, {
    message: "Source and destination stores cannot be identical",
    path: ["toStoreId"],
  });

type TransferFormValues = z.infer<typeof transferFormSchema>;

const transfersSearchSchema = z.object({
  page: z.coerce.number().optional().catch(1),
  limit: z.coerce.number().optional().catch(20),
  search: z.string().optional().catch(""),
  status: z.string().optional().catch("all"),
  fromStoreId: z.string().optional().catch("all"),
  toStoreId: z.string().optional().catch("all"),
  requisitionId: z.coerce.number().optional().catch(undefined),
  transferId: z.coerce.number().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/inventory/transfers/")({
  validateSearch: (search) => transfersSearchSchema.parse(search),
  component: TransfersList,
});

function TransfersList() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [localSearch, setLocalSearch] = React.useState(searchParams.search || "");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedTransfer, setSelectedTransfer] = React.useState<any | null>(null);

  // Auto-open transfer detail dialog if transferId is present in URL search
  const { data: directTransfer } = useRpcQuery<any>(
    ["inventory-transfer-direct", searchParams.transferId],
    () =>
      client.inventory.transfers[":id"].$get({
        param: { id: String(searchParams.transferId) },
      }),
    {
      enabled: !!searchParams.transferId,
    }
  );

  React.useEffect(() => {
    if (directTransfer && !("error" in directTransfer)) {
      setSelectedTransfer(directTransfer);
    }
  }, [directTransfer]);

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

  const { data: transfersResponse, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["inventory-transfers", searchParams],
    () =>
      client.inventory.transfers.$get({
        query: {
          page: String(searchParams.page || 1),
          limit: String(searchParams.limit || 20),
          search: searchParams.search || undefined,
          status: searchParams.status !== "all" ? searchParams.status : undefined,
          fromStoreId: searchParams.fromStoreId !== "all" ? searchParams.fromStoreId : undefined,
          toStoreId: searchParams.toStoreId !== "all" ? searchParams.toStoreId : undefined,
          requisitionId: searchParams.requisitionId ? String(searchParams.requisitionId) : undefined,
        },
      })
  );

  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  // Fetch requisitions to allow fulfilling approved indents
  const { data: requisitionsResponse } = useRpcQuery<any>(
    ["inventory-requisitions-all"],
    () => client.inventory.requisitions.$get({ query: { limit: "100" } })
  );

  const approvedReqs = React.useMemo(() => {
    return (requisitionsResponse?.data || []).filter(
      (r: any) => r.status === "approved" || r.status === "partially_fulfilled"
    );
  }, [requisitionsResponse]);

  const transfersData = transfersResponse?.data || [];
  const pagination = transfersResponse?.pagination || { page: 1, pageSize: 20, totalRecords: 0, totalPages: 1 };
  const startRecord = pagination.totalRecords === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endRecord = Math.min(pagination.page * pagination.pageSize, pagination.totalRecords);
  const hasActiveFilters = Boolean(
    searchParams.search ||
    (searchParams.status && searchParams.status !== "all") ||
    (searchParams.fromStoreId && searchParams.fromStoreId !== "all") ||
    (searchParams.toStoreId && searchParams.toStoreId !== "all") ||
    searchParams.requisitionId
  );

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema) as any,
    defaultValues: {
      fromStoreId: storesList.find((s: any) => s.isDefault)?.id || storesList[0]?.id || 0,
      toStoreId: storesList.find((s: any) => !s.isDefault)?.id || storesList[1]?.id || 0,
      requisitionId: null,
      remarks: "",
      items: [{ itemId: 0, batchId: 0, quantity: 1, unit: "Box", unitRate: 0 }],
    },
  });

  const selectedFromStoreId = form.watch("fromStoreId");

  // Fetch available stock in selected source store for batch selection
  const { data: sourceStockResponse } = useRpcQuery<any>(
    ["inventory-source-stock", selectedFromStoreId],
    () =>
      client.inventory.stock.$get({
        query: {
          storeId: selectedFromStoreId ? String(selectedFromStoreId) : undefined,
          limit: "500",
        },
      }),
    { enabled: !!selectedFromStoreId }
  );

  const sourceStockList = sourceStockResponse?.data || [];

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const applyRequisitionToForm = React.useCallback((req: any) => {
    form.setValue("fromStoreId", req.fulfillingStoreId);
    form.setValue("toStoreId", req.requestingStoreId);
    form.setValue("requisitionId", req.id);
    form.setValue("remarks", `Fulfillment for Indent #${req.requisitionNo}${req.remarks ? ` - ${req.remarks}` : ""}`);
    
    if (req.items && req.items.length > 0) {
      const newItems = req.items.map((it: any) => {
        const remainingQty = Math.max(0, Number(it.approvedQty ?? it.requestedQty) - Number(it.fulfilledQty || 0));
        return {
          itemId: it.itemId,
          batchId: 0,
          quantity: remainingQty > 0 ? remainingQty : Number(it.approvedQty ?? it.requestedQty),
          unit: it.unit?.symbol || it.unit?.name || (typeof it.unit === "string" ? it.unit : "") || it.item?.unit || "Box",
          unitRate: 0,
        };
      });
      form.setValue("items", newItems);
    }
  }, [form]);

  // Handle auto-opening when navigated with searchParams.requisitionId
  React.useEffect(() => {
    if (searchParams.requisitionId && approvedReqs.length > 0) {
      const targetReq = approvedReqs.find((r: any) => r.id === searchParams.requisitionId);
      if (targetReq) {
        applyRequisitionToForm(targetReq);
        setDialogOpen(true);
      }
    }
  }, [searchParams.requisitionId, approvedReqs, applyRequisitionToForm]);

  const createMutation = useMutation({
    mutationFn: async (values: TransferFormValues) => {
      const res = await client.inventory.transfers.$post({
        json: values,
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || "Failed to create transfer");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Stock transfer draft created successfully");
      queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await (client.inventory.transfers as any)[":id"].dispatch.$patch({
        param: { id: String(id) },
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || "Failed to dispatch transfer");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Transfer dispatched! Stock placed in transit.");
      queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      setSelectedTransfer(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await (client.inventory.transfers as any)[":id"].receive.$patch({
        param: { id: String(id) },
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || "Failed to receive transfer");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Stock received into destination store successfully!");
      queryClient.invalidateQueries({ queryKey: ["inventory-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      setSelectedTransfer(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Received</Badge>;
      case "in_transit":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1">
            <Truck className="w-3 h-3" /> In Transit
          </Badge>
        );
      case "draft":
        return <Badge variant="outline" className="bg-slate-100 text-slate-700">Draft</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };


  return (
    <ModuleLayout
      title="Stock Transfers"
      description="Two-phase inter-store stock movements (Dispatch from Source $\rightarrow$ In Transit $\rightarrow$ Receive at Destination)"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              form.reset({
                fromStoreId: storesList.find((s: any) => s.isDefault)?.id || storesList[0]?.id || 0,
                toStoreId: storesList.find((s: any) => !s.isDefault)?.id || storesList[1]?.id || 0,
                requisitionId: null,
                remarks: "",
                items: [{ itemId: 0, batchId: 0, quantity: 1, unit: "Box", unitRate: 0 }],
              });
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Stock Transfer
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
                    placeholder="Search by transfer no or remarks..."
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
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[180px]">
                <Select
                  value={searchParams.fromStoreId || "all"}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        fromStoreId: val !== "all" ? val : undefined,
                        page: 1,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Source Store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Source Stores</SelectItem>
                    {storesList.map((s: any) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[180px]">
                <Select
                  value={searchParams.toStoreId || "all"}
                  onValueChange={(val) =>
                    navigate({
                      search: (prev: any) => ({
                        ...prev,
                        toStoreId: val !== "all" ? val : undefined,
                        page: 1,
                      }),
                    })
                  }
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Destination Store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Destination Stores</SelectItem>
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
                        search: undefined,
                        status: "all",
                        fromStoreId: "all",
                        toStoreId: "all",
                        requisitionId: undefined,
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
                  <th className="px-4 py-3">Transfer No</th>
                  <th className="px-4 py-3">Source Store</th>
                  <th className="px-4 py-3">Destination Store</th>
                  <th className="px-4 py-3">Linked Indent</th>
                  <th className="px-4 py-3 text-center">Items</th>
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
                        <span>Loading stock transfers...</span>
                      </div>
                    </td>
                  </tr>
                ) : transfersData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <Truck className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-foreground">No stock transfers found</p>
                      <p className="text-[11px] mt-0.5">
                        {hasActiveFilters ? "Try clearing search or filters" : "Create a new stock transfer to dispatch items"}
                      </p>
                    </td>
                  </tr>
                ) : (
                  transfersData.map((row: any) => (
                    <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {row.transferNo}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
                          {row.fromStore?.name || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
                          {row.toStore?.name || "N/A"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.requisition ? (
                          <Badge variant="outline" className="font-mono text-[11px] bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                            #{row.requisition.requisitionNo}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {row.items?.length || 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(String(row.status || ""))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2.5"
                          onClick={() => setSelectedTransfer(row)}
                        >
                          View / Process
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
                <strong className="text-foreground font-semibold">{pagination.totalRecords}</strong> transfers
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

      {/* New Transfer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-180">
          <DialogHeader>
            <DialogTitle>Create Stock Transfer</DialogTitle>
            <DialogDescription>
              Select source store, target store, and batches to dispatch.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 pt-4">
            {/* Optional Indent Link */}
            {approvedReqs.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>Fulfill an Approved Indent (Optional)</span>
                </label>
                <Select
                  value={form.watch("requisitionId") ? String(form.watch("requisitionId")) : "none"}
                  onValueChange={(val) => {
                    if (val === "none") {
                      form.setValue("requisitionId", null);
                    } else {
                      const found = approvedReqs.find((r: any) => String(r.id) === val);
                      if (found) applyRequisitionToForm(found);
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-background text-xs">
                    <SelectValue placeholder="Select an approved indent to auto-fill transfer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Direct / Ad-hoc Transfer (No Indent) --</SelectItem>
                    {approvedReqs.map((req: any) => (
                      <SelectItem key={req.id} value={String(req.id)}>
                        Indent #{req.requisitionNo} ({req.fulfillingStore?.name} &rarr; {req.requestingStore?.name}) &bull; {req.items?.length || 0} items
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="fromStoreId"
                render={({ field }) => (
                  <Field label="Source Store (From) *" error={form.formState.errors.fromStoreId?.message}>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(val ? Number(val) : 0)}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select Source Store" />
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

              <Controller
                control={form.control}
                name="toStoreId"
                render={({ field }) => (
                  <Field label="Destination Store (To) *" error={form.formState.errors.toStoreId?.message}>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(val ? Number(val) : 0)}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select Destination Store" />
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
            </div>

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Transfer Items &amp; Batches</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ itemId: 0, batchId: 0, quantity: 1, unit: "Box", unitRate: 0 })}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Batch Item
                </Button>
              </div>

              {fields.map((field, index) => {
                const currentItemId = form.watch(`items.${index}.itemId`);
                // If item is specified (e.g. from indent), filter stock batches for that item
                const filteredStock = sourceStockList.filter(
                  (s: any) => !currentItemId || s.itemId === currentItemId
                );

                return (
                  <div key={field.id} className="flex items-center gap-2 p-2.5 rounded-md border bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex-1">
                      <Controller
                        control={form.control}
                        name={`items.${index}.batchId`}
                        render={({ field: batchField, fieldState }) => (
                          <div>
                            <Select
                              value={batchField.value ? String(batchField.value) : ""}
                              onValueChange={(val) => {
                                const bId = Number(val);
                                batchField.onChange(bId);
                                const match = sourceStockList.find((s: any) => s.batchId === bId);
                                if (match) {
                                  form.setValue(`items.${index}.itemId`, match.itemId);
                                  form.setValue(`items.${index}.unit`, match.unit || "Box");
                                  form.setValue(`items.${index}.unitRate`, match.purchaseRate || 0);
                                }
                              }}
                            >
                              <SelectTrigger className="w-full bg-background h-9 text-xs">
                                <SelectValue placeholder="Select Available Batch from Source Store" />
                              </SelectTrigger>
                              <SelectContent>
                                {filteredStock.length === 0 ? (
                                  <SelectItem value="none" disabled>
                                    No batches available in source store
                                  </SelectItem>
                                ) : (
                                  filteredStock.map((stock: any) => (
                                    <SelectItem key={stock.id} value={String(stock.batchId)}>
                                      {stock.itemName} &bull; Batch: {stock.batchNumber} &bull; Exp: {stock.expiryDate} (Avail: {stock.availableQty} {stock.unit})
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            {fieldState.error && (
                              <p className="text-[11px] text-red-500 mt-1">
                                {fieldState.error.message}
                              </p>
                            )}
                          </div>
                        )}
                      />
                    </div>

                    <div className="w-24">
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="Qty"
                        {...form.register(`items.${index}.quantity`)}
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    <div className="w-20 text-xs font-mono text-muted-foreground px-1 truncate">
                      {form.watch(`items.${index}.unit`) || "Unit"}
                    </div>

                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2 text-muted-foreground hover:text-red-500"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            <Field label="Remarks / Transport Notes" error={form.formState.errors.remarks?.message}>
              <Textarea
                {...form.register("remarks")}
                rows={2}
                placeholder="Driver / vehicle info or remarks..."
              />
            </Field>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Draft Transfer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Detail & Dispatch/Receive Dialog */}
      {selectedTransfer && (
        <Dialog
          open={!!selectedTransfer}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTransfer(null);
              if (searchParams.transferId) {
                navigate({
                  search: (prev: any) => ({ ...prev, transferId: undefined }),
                });
              }
            }
          }}
        >
          <DialogContent className="sm:max-w-162">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between mr-8">
                <span>Stock Transfer #{selectedTransfer.transferNo}</span>
                {getStatusBadge(selectedTransfer.status)}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 pt-1">
                <span>{selectedTransfer.fromStore?.name}</span>
                <ArrowRight className="w-4 h-4 text-emerald-600" />
                <span>{selectedTransfer.toStore?.name}</span>
                {selectedTransfer.requisition && (
                  <Badge variant="outline" className="ml-2 bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                    Indent #{selectedTransfer.requisition.requisitionNo}
                  </Badge>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="border rounded-md divide-y">
                <div className=" px-4 py-2 font-medium text-xs  grid grid-cols-4">
                  <span className="col-span-2">Item Name</span>
                  <span>Batch No.</span>
                  <span className="text-right">Quantity</span>
                </div>
                {selectedTransfer.items?.map((item: any) => {
                  const unitSymbol =
                    item.unit?.symbol ||
                    item.unit?.name ||
                    (typeof item.unit === "string" ? item.unit : "") ||
                    item.item?.unit ||
                    item.item?.purchaseUnit ||
                    "unit";

                  return (
                    <div key={item.id} className="px-4 py-2.5 text-xs grid grid-cols-4 items-center">
                      <span className="col-span-2 font-medium">{item.item?.name || `Item #${item.itemId}`}</span>
                      <span className="font-mono">{item.batch?.batchNumber || `#${item.batchId}`}</span>
                      <span className="font-mono font-bold text-right">
                        {item.quantity} <span className="text-muted-foreground text-[11px] font-normal">{unitSymbol}</span>
                      </span>
                    </div>
                  );
                })}
              </div>

              {selectedTransfer.status === "draft" && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    disabled={dispatchMutation.isPending}
                    onClick={() => dispatchMutation.mutate(selectedTransfer.id)}
                  >
                    {dispatchMutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Truck className="w-4 h-4 mr-1.5" />}
                    Dispatch Transfer (Stock Out)
                  </Button>
                </div>
              )}

              {selectedTransfer.status === "in_transit" && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={receiveMutation.isPending}
                    onClick={() => receiveMutation.mutate(selectedTransfer.id)}
                  >
                    {receiveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <PackageCheck className="w-4 h-4 mr-1.5" />}
                    Confirm Receive at Destination (Stock In)
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </ModuleLayout>
  );
}
