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
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { findUnit, getUnitConversionFactor } from "@/lib/unit-conversion";
import {
  RotateCcw,
  Plus,
  Trash2,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Warehouse,
  FileText,
  AlertTriangle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  ShieldCheck,
  Package,
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

const returnItemSchema = z.object({
  voucherItemId: z.coerce.number().optional().nullable(),
  itemId: z.coerce.number().positive("Item is required"),
  batchId: z.coerce.number().positive("Batch is required"),
  returnedQty: z.coerce.number().positive("Returned quantity must be > 0"),
  unitId: z.coerce.number().optional().nullable(),
  unit: z.string().optional(),
  unitRate: z.coerce.number().min(0).default(0),
  itemName: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional().nullable(),
  maxReturnQty: z.coerce.number().optional(),
});

const returnFormSchema = z.object({
  storeId: z.coerce.number().positive("Store is required"),
  originalVoucherId: z.coerce.number().optional().nullable(),
  reason: z.string().min(2, "Reason is required"),
  remarks: z.string().optional(),
  returnDate: z.string().optional(),
  items: z.array(returnItemSchema).min(1, "At least one item is required"),
});

type ReturnFormValues = z.infer<typeof returnFormSchema>;

const returnsSearchSchema = z.object({
  page: z.coerce.number().optional().catch(1),
  limit: z.coerce.number().optional().catch(20),
  search: z.string().optional().catch(""),
  status: z.string().optional().catch("all"),
  storeId: z.string().optional().catch("all"),
  originalVoucherId: z.coerce.number().optional().catch(undefined),
  returnId: z.coerce.number().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/inventory/consumption-returns/")({
  validateSearch: (search) => returnsSearchSchema.parse(search),
  component: ConsumptionReturnsList,
});

function ConsumptionReturnsList() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [localSearch, setLocalSearch] = React.useState(searchParams.search || "");
  const [dialogOpen, setDialogOpen] = React.useState(!!searchParams.originalVoucherId);
  const [selectedReturnId, setSelectedReturnId] = React.useState<number | null>(
    searchParams.returnId || null
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
  }, [localSearch]);

  React.useEffect(() => {
    setLocalSearch(searchParams.search || "");
  }, [searchParams.search]);

  React.useEffect(() => {
    setSelectedReturnId(searchParams.returnId || null);
  }, [searchParams.returnId]);

  // Stores
  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores-all"],
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

  // Vouchers for original voucher lookup
  const { data: postedVouchersData } = useRpcQuery<any>(
    ["inventory-consumptions-posted-all"],
    () =>
      client.inventory.consumptions.$get({
        query: {
          status: "posted",
          limit: "100",
        },
      } as any)
  );

  const postedVouchers: any[] = postedVouchersData?.data || [];

  // Returns list
  const {
    data: returnsData,
    isLoading,
    refetch,
    isRefetching,
  } = useRpcQuery<{
    data: any[];
    pagination: {
      page: number;
      pageSize: number;
      totalRecords: number;
      totalPages: number;
    };
  }>(
    ["inventory-consumption-returns", searchParams],
    () =>
      client.inventory["consumption-returns"].$get({
        query: {
          page: String(searchParams.page || 1),
          limit: String(searchParams.limit || 20),
          search: searchParams.search || undefined,
          status: searchParams.status !== "all" ? searchParams.status : undefined,
          storeId: searchParams.storeId !== "all" ? searchParams.storeId : undefined,
        },
      } as any)
  );

  const returnsList = returnsData?.data || [];
  const pagination = returnsData?.pagination || {
    page: 1,
    pageSize: 20,
    totalRecords: 0,
    totalPages: 1,
  };

  // Detail view
  const { data: selectedReturn, isFetching: isLoadingDetail } = useRpcQuery<any>(
    ["inventory-consumption-return-detail", selectedReturnId],
    () =>
      client.inventory["consumption-returns"][":id"].$get({
        param: { id: String(selectedReturnId) },
      }),
    {
      enabled: !!selectedReturnId,
    }
  );

  // Check authorization to post return
  const { data: canPostData } = useRpcQuery<{ canPost: boolean }>(
    ["inventory-consumption-return-can-post", selectedReturn?.storeId],
    () =>
      client.inventory.consumptions["can-post"].$get({
        query: { storeId: String(selectedReturn?.storeId || 0) },
      } as any),
    {
      enabled: !!selectedReturn?.storeId && selectedReturn?.status === "draft",
    }
  );

  const canPost = canPostData?.canPost ?? false;

  // React Hook Form
  const form = useForm<ReturnFormValues>({
    resolver: zodResolver(returnFormSchema) as any,
    defaultValues: {
      storeId: 0,
      originalVoucherId: searchParams.originalVoucherId || null,
      reason: "",
      remarks: "",
      returnDate: new Date().toISOString().slice(0, 10),
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const selectedStoreId = form.watch("storeId");
  const selectedStore = storesList.find((s) => s.id === Number(selectedStoreId));

  // Store stock batches query (for direct returns without voucher)
  const { data: storeStockData, isLoading: isLoadingStock } = useRpcQuery<any>(
    ["store-available-stock", selectedStoreId],
    () =>
      client.inventory.stock.$get({
        query: {
          storeId: String(selectedStoreId),
          limit: "500",
        },
      } as any),
    {
      enabled: !!selectedStoreId && selectedStoreId > 0,
    }
  );
  const rawAvailableBatches: any[] = storeStockData?.data || [];

  // When original voucher is selected, fetch its details to allow 1-click loading of lines
  const watchOrigVoucherId = form.watch("originalVoucherId");
  const { data: origVoucherDetail } = useRpcQuery<any>(
    ["inventory-orig-voucher-detail", watchOrigVoucherId],
    () =>
      client.inventory.consumptions[":id"].$get({
        param: { id: String(watchOrigVoucherId) },
      }),
    {
      enabled: !!watchOrigVoucherId && watchOrigVoucherId > 0,
    }
  );

  React.useEffect(() => {
    if (origVoucherDetail && origVoucherDetail.items) {
      form.setValue("storeId", origVoucherDetail.storeId);
      const prefill = origVoucherDetail.items.map((it: any) => ({
        voucherItemId: it.id,
        itemId: it.itemId,
        itemName: it.itemName,
        batchId: it.batchId,
        batchNumber: it.batchNumber,
        expiryDate: it.expiryDate,
        returnedQty: Number(it.quantity || 1),
        maxReturnQty: Number(it.quantity || 1),
        unitId: it.unitId || null,
        unit: it.unit || "unit",
        unitRate: Number(it.unitRate || 0),
      }));
      form.setValue("items", prefill);
    }
  }, [origVoucherDetail, form]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (values: ReturnFormValues) => {
      const res = await client.inventory["consumption-returns"].$post({
        json: values,
      } as any);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error((errorData as any).error || "Failed to create consumption return");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast.success(`Draft Return ${data.returnNo} created`);
      queryClient.invalidateQueries({ queryKey: ["inventory-consumption-returns"] });
      setDialogOpen(false);
      form.reset();
      navigate({ search: (prev: any) => ({ ...prev, returnId: data.id, originalVoucherId: undefined }) });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const postMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await client.inventory["consumption-returns"][":id"].post.$post({
        param: { id: String(id) },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error((errorData as any).error || "Failed to post consumption return");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Consumption return posted and stock restored!");
      queryClient.invalidateQueries({ queryKey: ["inventory-consumption-returns"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-consumption-return-detail", selectedReturnId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-ledger"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await client.inventory["consumption-returns"][":id"].$delete({
        param: { id: String(id) },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error((errorData as any).error || "Failed to delete return");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Draft return deleted");
      queryClient.invalidateQueries({ queryKey: ["inventory-consumption-returns"] });
      navigate({ search: (prev: any) => ({ ...prev, returnId: undefined }) });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Calculate live total for form items
  const formItems = form.watch("items");
  const formTotalCost = (formItems || []).reduce(
    (sum, item) => sum + (Number(item.returnedQty || 0) * Number(item.unitRate || 0)),
    0
  );

  const handleCloseSidebar = () => {
    if (fields.length > 0) {
      if (!window.confirm("You have unsaved returned items in this draft. Are you sure you want to close?")) {
        return;
      }
    }
    setDialogOpen(false);
    if (searchParams.originalVoucherId) {
      navigate({ search: (prev: any) => ({ ...prev, originalVoucherId: undefined }) });
    }
  };

  const handleItemUnitChange = (index: number, newUnit: string) => {
    const oldUnit = form.getValues(`items.${index}.unit`) || "unit";
    const targetUnit = findUnit(newUnit, unitTypes);
    const targetUnitId = targetUnit?.id || null;
    const bId = form.getValues(`items.${index}.batchId`);
    const stockMatch = rawAvailableBatches.find((s: any) => Number(s.batchId) === Number(bId));
    const origMatch = origVoucherDetail?.items?.find((s: any) => Number(s.batchId) === Number(bId));

    form.setValue(`items.${index}.unit`, newUnit);
    form.setValue(`items.${index}.unitId`, targetUnitId);

    const baseUnit = origMatch?.unit || stockMatch?.unit || stockMatch?.baseUnit || oldUnit;
    const baseRate = Number(origMatch?.unitRate || stockMatch?.purchaseRate || form.getValues(`items.${index}.unitRate`) || 0);

    const conv = getUnitConversionFactor(baseUnit, newUnit, unitTypes, unitConversions);
    if (conv.convertible && conv.factor > 0) {
      const convertedRate = Number((baseRate / conv.factor).toFixed(2));
      form.setValue(`items.${index}.unitRate`, convertedRate);
      if (origMatch?.quantity !== undefined) {
        form.setValue(`items.${index}.maxReturnQty`, Number((origMatch.quantity * conv.factor).toFixed(3)));
      }
    }
  };

  return (
    <ModuleLayout
      title="Consumption Returns"
      description="Manage surplus or unused internal consumables returned from hospital departments back to store inventory."
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-9"
          >
            <RefreshCw className={cn("h-4 w-4 mr-1.5", isRefetching && "animate-spin")} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              form.reset({
                storeId: storesList[0]?.id || 0,
                originalVoucherId: null,
                reason: "",
                remarks: "",
                returnDate: new Date().toISOString().slice(0, 10),
                items: [],
              });
              setDialogOpen(true);
            }}
            className="h-9 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Return
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
                <RotateCcw className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Total Returns
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-0.5">
                  {pagination.totalRecords}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Draft Returns
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-0.5">
                  {returnsList.filter((r) => r.status === "draft").length}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Posted / Stock Restored
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-0.5">
                  {returnsList.filter((r) => r.status === "posted").length}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search return #, reason, remarks..."
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
                {localSearch && (
                  <button
                    onClick={() => setLocalSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="w-[160px]">
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
                    <SelectItem value="posted">Posted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[200px]">
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
            </div>
          </CardContent>
        </Card>

        {/* Returns Table */}
        <Card className="border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Return No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Store & Department</th>
                  <th className="py-3 px-4">Original Voucher</th>
                  <th className="py-3 px-4">Return Reason</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading returns...
                    </td>
                  </tr>
                ) : returnsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No consumption returns found.
                    </td>
                  </tr>
                ) : (
                  returnsList.map((r: any) => (
                    <tr
                      key={r.id}
                      onClick={() =>
                        navigate({
                          search: (prev: any) => ({ ...prev, returnId: r.id }),
                        })
                      }
                      className={cn(
                        "hover:bg-muted/40 transition-colors cursor-pointer",
                        selectedReturnId === r.id && "bg-primary/5 font-medium"
                      )}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        {r.returnNo}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                        {r.returnDate ? format(new Date(r.returnDate), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{r.storeName}</div>
                        {r.departmentName && (
                          <span className="text-[10px] text-muted-foreground">
                            {r.departmentName}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {r.originalVoucherNo || "—"}
                      </td>
                      <td className="py-3 px-4 max-w-[200px] truncate text-foreground font-medium">
                        {r.reason}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {r.itemCount || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize font-semibold text-[10px] px-2 py-0.5",
                            r.status === "posted"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400"
                          )}
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate({
                              search: (prev: any) => ({ ...prev, returnId: r.id }),
                            });
                          }}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* New Consumption Return Slide-over Sidebar Drawer */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 overflow-hidden"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          {/* Non-dismissible Backdrop (clicks outside will NOT close sidebar) */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <div className="w-screen max-w-3xl sm:max-w-4xl bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Sidebar Header */}
              <div className="px-6 py-4 border-b border-border bg-muted/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Create Consumption Return</h3>
                    <p className="text-xs text-muted-foreground">
                      Return surplus or unused internal consumables back to store stock. Saved as Draft; requires posting to restore inventory.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseSidebar}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  title="Close sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={form.handleSubmit((v: any) => createMutation.mutate(v))}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Header Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">Store Location *</Label>
                      <Controller
                        control={form.control}
                        name="storeId"
                        render={({ field }) => (
                          <Select
                            value={field.value ? String(field.value) : ""}
                            onValueChange={(val) => {
                              field.onChange(Number(val));
                              form.setValue("items", []);
                            }}
                          >
                            <SelectTrigger className="mt-1 h-9 text-xs">
                              <SelectValue placeholder="Select Store..." />
                            </SelectTrigger>
                            <SelectContent>
                              {storesList.map((s: any) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  {s.name} ({s.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Original Voucher (Optional)</Label>
                      <Controller
                        control={form.control}
                        name="originalVoucherId"
                        render={({ field }) => (
                          <Select
                            value={field.value ? String(field.value) : "none"}
                            onValueChange={(val) => {
                              field.onChange(val === "none" ? null : Number(val));
                              if (val === "none") {
                                form.setValue("items", []);
                              }
                            }}
                          >
                            <SelectTrigger className="mt-1 h-9 text-xs">
                              <SelectValue placeholder="Pick Voucher to prefill..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Direct Return without Voucher —</SelectItem>
                              {postedVouchers.map((v: any) => (
                                <SelectItem key={v.id} value={String(v.id)}>
                                  {v.voucherNo} ({v.purpose})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Return Date</Label>
                      <Input
                        type="date"
                        {...form.register("returnDate")}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-semibold">Return Reason *</Label>
                      <Input
                        placeholder="e.g. Surplus items from procedure, departmental balance"
                        {...form.register("reason")}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Remarks (Optional)</Label>
                      <Input
                        placeholder="e.g. Sealed condition, audit reference..."
                        {...form.register("remarks")}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  </div>

                  {/* Line Items Section */}
                  <div className="space-y-3 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Returned Consumable Items ({fields.length})
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          {watchOrigVoucherId
                            ? "Items prefilled from original voucher. Adjust quantity as needed."
                            : "Specify internal consumables to return into store inventory."}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          append({
                            itemId: 0,
                            batchId: 0,
                            returnedQty: 1,
                            unitRate: 0,
                            unit: "unit",
                            unitId: null,
                          })
                        }
                        className="h-8 text-xs"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Item
                      </Button>
                    </div>

                    {/* Line Items Grid Layout */}
                    {fields.length === 0 ? (
                      <div className="py-8 text-center border rounded-lg bg-muted/10 border-dashed text-xs text-muted-foreground">
                        No items added. Pick an original voucher above or click "Add Item" to specify consumables to return.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {/* Column Header Grid */}
                        <div className="hidden sm:grid grid-cols-12 gap-3 px-3.5 py-2 bg-muted/40 rounded-lg border border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground items-center">
                          <div className="col-span-4">Item & Batch</div>
                          <div className="col-span-2">Unit</div>
                          <div className="col-span-1 text-center">Orig Qty</div>
                          <div className="col-span-2">Qty to Return</div>
                          <div className="col-span-2 text-right">Cost Rate & Total</div>
                          <div className="col-span-1 text-center">Action</div>
                        </div>

                        {/* Line Items Grid Rows */}
                        <div className="space-y-2">
                          {fields.map((field, idx) => {
                            const currentBatchId = form.watch(`items.${idx}.batchId`);
                            const currentItemId = form.watch(`items.${idx}.itemId`);
                            const currentQty = form.watch(`items.${idx}.returnedQty`) || 0;
                            const currentRate = form.watch(`items.${idx}.unitRate`) || 0;
                            const currentUnit = form.watch(`items.${idx}.unit`) || "";
                            const lineTotal = currentQty * currentRate;

                            // Look up display information
                            const origItem = origVoucherDetail?.items?.find(
                              (it: any) => it.id === form.watch(`items.${idx}.voucherItemId`) || (it.batchId === currentBatchId && it.itemId === currentItemId)
                            );
                            const stockItem = rawAvailableBatches.find(
                              (b: any) => Number(b.batchId) === Number(currentBatchId)
                            );
                            const displayName = origItem?.itemName || stockItem?.itemName || form.watch(`items.${idx}.itemName`) || `Item #${currentItemId}`;
                            const displayBatch = origItem?.batchNumber || stockItem?.batchNumber || form.watch(`items.${idx}.batchNumber`) || String(currentBatchId);
                            const maxQty = origItem?.quantity ?? form.watch(`items.${idx}.maxReturnQty`);

                            // Collect available units for this item
                            const unitsSet = new Set<string>();
                            if (currentUnit) unitsSet.add(currentUnit);
                            if (origItem) {
                              if (origItem.unit) unitsSet.add(origItem.unit);
                            }
                            if (stockItem) {
                              if (stockItem.unit) unitsSet.add(stockItem.unit);
                              if (stockItem.baseUnit) unitsSet.add(stockItem.baseUnit);
                              if (stockItem.purchaseUnit) unitsSet.add(stockItem.purchaseUnit);
                              if (stockItem.saleUnit) unitsSet.add(stockItem.saleUnit);
                            }
                            (unitTypes as any[]).forEach((u: any) => {
                              const sym = u.symbol || u.name;
                              if (sym) unitsSet.add(sym);
                            });
                            const unitOptions = Array.from(unitsSet);

                            // Options to pick if itemId is 0 or editable
                            const candidateOptions = origVoucherDetail?.items?.length
                              ? origVoucherDetail.items
                              : rawAvailableBatches;

                            return (
                              <div
                                key={field.id}
                                className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/10 transition-colors items-center text-xs"
                              >
                                {/* Item & Batch */}
                                <div className="sm:col-span-4">
                                  <span className="sm:hidden text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                                    Item & Batch:
                                  </span>
                                  {currentItemId && currentBatchId && !candidateOptions?.length ? (
                                    <div>
                                      <div className="font-semibold text-foreground">{displayName}</div>
                                      <div className="text-[11px] text-muted-foreground font-mono">
                                        Batch: {displayBatch}
                                      </div>
                                    </div>
                                  ) : (
                                    <Controller
                                      control={form.control}
                                      name={`items.${idx}.batchId`}
                                      render={({ field: batchField }) => (
                                        <Select
                                          value={batchField.value ? String(batchField.value) : ""}
                                          onValueChange={(val) => {
                                            const bId = Number(val);
                                            batchField.onChange(bId);
                                            const match = candidateOptions?.find(
                                              (c: any) => Number(c.batchId) === bId
                                            );
                                            if (match) {
                                              const defUnit = match.unit || match.baseUnit || "unit";
                                              const defUnitId = findUnit(defUnit, unitTypes)?.id || null;
                                              form.setValue(`items.${idx}.itemId`, Number(match.itemId));
                                              form.setValue(`items.${idx}.batchId`, bId);
                                              form.setValue(`items.${idx}.voucherItemId`, match.id || null);
                                              form.setValue(`items.${idx}.itemName`, match.itemName);
                                              form.setValue(`items.${idx}.batchNumber`, match.batchNumber);
                                              form.setValue(`items.${idx}.unitId`, defUnitId);
                                              form.setValue(`items.${idx}.unit`, defUnit);
                                              const pRate = Number(match.unitRate || match.purchaseRate || 0);
                                              form.setValue(`items.${idx}.unitRate`, pRate);
                                              const origQ = Number(match.quantity || 1);
                                              form.setValue(`items.${idx}.maxReturnQty`, origQ);
                                              form.setValue(`items.${idx}.returnedQty`, origQ);
                                            }
                                          }}
                                        >
                                          <SelectTrigger className="h-8 text-xs w-full">
                                            <SelectValue placeholder={isLoadingStock ? "Loading..." : "Select Item..."} />
                                          </SelectTrigger>
                                          <SelectContent className="max-h-64">
                                            {candidateOptions?.map((c: any) => (
                                              <SelectItem
                                                key={`${c.id || c.batchId}-${c.batchNumber}`}
                                                value={String(c.batchId)}
                                              >
                                                <div className="flex items-center gap-2">
                                                  <span className="font-semibold">{c.itemName}</span>
                                                  <span className="text-muted-foreground font-mono text-[11px]">
                                                    [Batch: {c.batchNumber}]
                                                  </span>
                                                  {c.quantity !== undefined && (
                                                    <span className="text-primary text-[11px] font-bold">
                                                      (Voucher Qty: {c.quantity})
                                                    </span>
                                                  )}
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}
                                    />
                                  )}
                                </div>

                                {/* Unit Selector */}
                                <div className="sm:col-span-2">
                                  <span className="sm:hidden text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                                    Unit:
                                  </span>
                                  <select
                                    value={currentUnit}
                                    onChange={(e) => handleItemUnitChange(idx, e.target.value)}
                                    className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs font-mono font-medium outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                                  >
                                    {unitOptions.map((u) => (
                                      <option key={u} value={u}>
                                        {u}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Orig Qty */}
                                <div className="sm:col-span-1 flex flex-col items-start sm:items-center justify-center">
                                  <span className="sm:hidden text-[10px] font-bold uppercase text-muted-foreground mb-0.5">
                                    Orig Qty:
                                  </span>
                                  <Badge variant="outline" className="font-mono text-[11px] px-1.5 py-0.5 bg-muted/40 whitespace-nowrap">
                                    {maxQty !== undefined ? maxQty : "—"}
                                  </Badge>
                                </div>

                                {/* Quantity Input */}
                                <div className="sm:col-span-2">
                                  <span className="sm:hidden text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                                    Qty to Return:
                                  </span>
                                  <Input
                                    type="number"
                                    min="0.001"
                                    step="any"
                                    value={currentQty}
                                    onChange={(e) => {
                                      const q = parseFloat(e.target.value) || 0;
                                      form.setValue(`items.${idx}.returnedQty`, q);
                                    }}
                                    className={cn(
                                      "h-8 text-xs font-mono w-full",
                                      maxQty !== undefined && currentQty > maxQty && "border-amber-500 text-amber-700 bg-amber-50/50"
                                    )}
                                  />
                                  {maxQty !== undefined && currentQty > maxQty && (
                                    <span className="text-[10px] text-amber-600 block mt-0.5 font-medium">
                                      Exceeds voucher
                                    </span>
                                  )}
                                </div>

                                {/* Rate & Line Total */}
                                <div className="sm:col-span-2 text-left sm:text-right">
                                  <span className="sm:hidden text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                                    Credit:
                                  </span>
                                  <div className="font-mono font-bold text-foreground">
                                    ₹{lineTotal.toFixed(2)}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    @ ₹{currentRate.toFixed(2)}/{currentUnit || "unit"}
                                  </div>
                                </div>

                                {/* Remove Action */}
                                <div className="sm:col-span-1 flex items-center justify-end sm:justify-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => remove(idx)}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                    title="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar Footer */}
                <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between shrink-0">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Total Return Value:</span>{" "}
                    <span className="font-mono font-bold text-sm text-foreground">
                      ₹{formTotalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCloseSidebar}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={createMutation.isPending || fields.length === 0}
                      className="shadow-sm"
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      ) : (
                        <RotateCcw className="h-4 w-4 mr-1.5" />
                      )}
                      Save Draft Return
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Return Detail Dialog */}
      <Dialog
        open={!!selectedReturnId}
        onOpenChange={(open) => {
          if (!open) {
            navigate({ search: (prev: any) => ({ ...prev, returnId: undefined }) });
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {isLoadingDetail ? (
            <div className="p-12 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
              Loading return details...
            </div>
          ) : !selectedReturn ? (
            <div className="p-12 text-center text-muted-foreground">Return not found.</div>
          ) : (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5 text-primary" />
                    <div>
                      <DialogTitle className="text-lg font-bold font-mono">
                        {selectedReturn.returnNo}
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        Store: {selectedReturn.storeName}
                      </DialogDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize font-bold text-xs px-2.5 py-1",
                      selectedReturn.status === "posted"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400"
                    )}
                  >
                    {selectedReturn.status}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/20 border text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Return Date</span>
                    <span className="font-semibold text-foreground">
                      {selectedReturn.returnDate ? format(new Date(selectedReturn.returnDate), "dd MMM yyyy") : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Original Voucher</span>
                    <span className="font-mono font-semibold text-primary">
                      {selectedReturn.originalVoucherNo || "Direct Return"}
                    </span>
                  </div>
                  <div className="col-span-2 pt-2 border-t">
                    <span className="text-muted-foreground block text-[11px]">Reason</span>
                    <span className="font-medium text-foreground">{selectedReturn.reason}</span>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Returned Items
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 font-semibold border-b text-muted-foreground">
                        <tr>
                          <th className="py-2.5 px-3">Item Name</th>
                          <th className="py-2.5 px-3 font-mono">Batch</th>
                          <th className="py-2.5 px-3 text-right">Returned Qty</th>
                          <th className="py-2.5 px-3 text-right">Cost Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(selectedReturn.items || []).map((it: any) => (
                          <tr key={it.id}>
                            <td className="py-2.5 px-3 font-medium text-foreground">
                              {it.itemName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-muted-foreground">
                              {it.batchNumber}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                              +{it.returnedQty} {it.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                              ₹{Number(it.unitRate || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between">
                {selectedReturn.status === "draft" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:bg-rose-50 text-xs"
                    onClick={() => {
                      if (window.confirm("Delete this draft return?")) {
                        deleteMutation.mutate(selectedReturn.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate({ search: (prev: any) => ({ ...prev, returnId: undefined }) })
                    }
                  >
                    Close
                  </Button>

                  {selectedReturn.status === "draft" && (
                    <Button
                      size="sm"
                      disabled={!canPost || postMutation.isPending}
                      onClick={() => {
                        if (window.confirm("Post this return and restore stock to the store?")) {
                          postMutation.mutate(selectedReturn.id);
                        }
                      }}
                      className={cn(
                        "shadow-sm",
                        canPost ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                      )}
                    >
                      {postMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
                      Approve & Restore Stock
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
