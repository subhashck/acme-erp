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
import { findUnit, getUnitConversionFactor } from "@/lib/unit-conversion";
import {
  Package,
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
  ChevronsLeft,
  ChevronsRight,
  X,
  ArrowRight,
  Building2,
  RotateCcw,
  ShieldCheck,
  Calendar,
  Layers,
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

const consumptionItemSchema = z.object({
  itemId: z.coerce.number().positive("Item is required"),
  batchId: z.coerce.number().positive("Batch is required"),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  unitId: z.coerce.number().optional().nullable(),
  unit: z.string().optional(),
  unitRate: z.coerce.number().min(0).default(0),
  totalCost: z.coerce.number().min(0).default(0),
  availableQty: z.coerce.number().optional().default(0),
});

const consumptionFormSchema = z.object({
  storeId: z.coerce.number().positive("Store is required"),
  purpose: z.string().min(2, "Purpose / reason is required"),
  remarks: z.string().optional(),
  voucherDate: z.string().optional(),
  items: z.array(consumptionItemSchema).min(1, "At least one item is required"),
});

type ConsumptionFormValues = z.infer<typeof consumptionFormSchema>;

const consumptionsSearchSchema = z.object({
  page: z.coerce.number().optional().catch(1),
  limit: z.coerce.number().optional().catch(20),
  search: z.string().optional().catch(""),
  status: z.string().optional().catch("all"),
  storeId: z.string().optional().catch("all"),
  voucherId: z.coerce.number().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/inventory/consumptions/")({
  validateSearch: (search) => consumptionsSearchSchema.parse(search),
  component: ConsumptionsList,
});

function ConsumptionsList() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [localSearch, setLocalSearch] = React.useState(searchParams.search || "");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = React.useState<number | null>(
    searchParams.voucherId || null
  );
  const [onlyConsumables, setOnlyConsumables] = React.useState(false);

  // Synchronize URL search params with local state
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
    setSelectedVoucherId(searchParams.voucherId || null);
  }, [searchParams.voucherId]);

  // Stores query
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

  // Consumptions query with server pagination
  const {
    data: consumptionsData,
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
    ["inventory-consumptions", searchParams],
    () =>
      client.inventory.consumptions.$get({
        query: {
          page: String(searchParams.page || 1),
          limit: String(searchParams.limit || 20),
          search: searchParams.search || undefined,
          status: searchParams.status !== "all" ? searchParams.status : undefined,
          storeId: searchParams.storeId !== "all" ? searchParams.storeId : undefined,
        },
      } as any)
  );

  const vouchers = consumptionsData?.data || [];
  const pagination = consumptionsData?.pagination || {
    page: 1,
    pageSize: 20,
    totalRecords: 0,
    totalPages: 1,
  };

  // Fetch single voucher details when selected
  const { data: selectedVoucher, isFetching: isLoadingDetail } = useRpcQuery<any>(
    ["inventory-consumption-detail", selectedVoucherId],
    () =>
      client.inventory.consumptions[":id"].$get({
        param: { id: String(selectedVoucherId) },
      }),
    {
      enabled: !!selectedVoucherId,
    }
  );

  // Check if current user can post this voucher
  const { data: canPostData } = useRpcQuery<{ canPost: boolean }>(
    ["inventory-consumption-can-post", selectedVoucher?.storeId],
    () =>
      client.inventory.consumptions["can-post"].$get({
        query: { storeId: String(selectedVoucher?.storeId || 0) },
      } as any),
    {
      enabled: !!selectedVoucher?.storeId && selectedVoucher?.status === "draft",
    }
  );

  const canPost = canPostData?.canPost ?? false;

  // React Hook Form for new voucher
  const form = useForm<ConsumptionFormValues>({
    resolver: zodResolver(consumptionFormSchema) as any,
    defaultValues: {
      storeId: 0,
      purpose: "",
      remarks: "",
      voucherDate: new Date().toISOString().slice(0, 10),
      items: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const selectedStoreId = form.watch("storeId");
  const selectedStore = storesList.find((s) => s.id === Number(selectedStoreId));

  // Available stock in selected store
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

  // Filter batches based on onlyConsumables toggle if desired
  const availableBatches = React.useMemo(() => {
    if (!onlyConsumables) return rawAvailableBatches;
    // Internal consumables have isSaleable === false
    return rawAvailableBatches.filter((b) => b.isSaleable === false || b.itemIsSaleable === false);
  }, [rawAvailableBatches, onlyConsumables]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (values: ConsumptionFormValues) => {
      const res = await client.inventory.consumptions.$post({
        json: values,
      } as any);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error((errorData as any).error || "Failed to create consumption voucher");
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      toast.success(`Draft Voucher ${data.voucherNo} created successfully`);
      queryClient.invalidateQueries({ queryKey: ["inventory-consumptions"] });
      setDialogOpen(false);
      form.reset({
        storeId: 0,
        purpose: "",
        remarks: "",
        voucherDate: new Date().toISOString().slice(0, 10),
        items: [],
      });
      navigate({ search: (prev: any) => ({ ...prev, voucherId: data.id }) });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const postMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await client.inventory.consumptions[":id"].post.$post({
        param: { id: String(id) },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error((errorData as any).error || "Failed to post consumption voucher");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Voucher posted and stock ledger updated!");
      queryClient.invalidateQueries({ queryKey: ["inventory-consumptions"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-consumption-detail", selectedVoucherId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["stock-ledger"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await client.inventory.consumptions[":id"].$delete({
        param: { id: String(id) },
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error((errorData as any).error || "Failed to delete voucher");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Draft voucher deleted");
      queryClient.invalidateQueries({ queryKey: ["inventory-consumptions"] });
      navigate({ search: (prev: any) => ({ ...prev, voucherId: undefined }) });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Calculate live total for form items
  const formItems = form.watch("items");
  const formTotalCost = (formItems || []).reduce(
    (sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitRate || 0)),
    0
  );

  const handleCloseSidebar = () => {
    if (fields.length > 0) {
      if (!window.confirm("You have unsaved consumable items in this draft. Are you sure you want to close?")) {
        return;
      }
    }
    setDialogOpen(false);
  };

  const handleItemUnitChange = (index: number, newUnit: string) => {
    const oldUnit = form.getValues(`items.${index}.unit`) || "unit";
    const targetUnit = findUnit(newUnit, unitTypes);
    const targetUnitId = targetUnit?.id || null;
    const bId = form.getValues(`items.${index}.batchId`);
    const stockMatch = rawAvailableBatches.find((s: any) => Number(s.batchId) === Number(bId));

    form.setValue(`items.${index}.unit`, newUnit);
    form.setValue(`items.${index}.unitId`, targetUnitId);

    if (stockMatch) {
      const baseUnit = stockMatch.unit || stockMatch.baseUnit || oldUnit;
      const baseStockQty = Number(stockMatch.availableQty ?? stockMatch.quantityOnHand ?? 0);
      const baseRate = Number(stockMatch.purchaseRate || 0);

      const conv = getUnitConversionFactor(baseUnit, newUnit, unitTypes, unitConversions);
      if (conv.convertible && conv.factor > 0) {
        // Stock available in new unit:
        const convertedAvail = Number((baseStockQty * conv.factor).toFixed(3));
        form.setValue(`items.${index}.availableQty`, convertedAvail);

        // Cost rate in new unit:
        const convertedRate = Number((baseRate / conv.factor).toFixed(2));
        form.setValue(`items.${index}.unitRate`, convertedRate);

        const curQty = Number(form.getValues(`items.${index}.quantity`) || 0);
        form.setValue(`items.${index}.totalCost`, Number((curQty * convertedRate).toFixed(2)));
      }
    }
  };

  return (
    <ModuleLayout
      title="Internal Consumables"
      description="Record and audit non-saleable internal consumables used across hospital departments."
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
              const defaultStore = storesList.find((s: any) => s.isDefault) || storesList[0];
              form.reset({
                storeId: defaultStore?.id || 0,
                purpose: "",
                remarks: "",
                voucherDate: new Date().toISOString().slice(0, 10),
                items: [
                  {
                    itemId: 0,
                    batchId: 0,
                    quantity: 1,
                    unitRate: 0,
                    totalCost: 0,
                    availableQty: 0,
                  },
                ],
              });
              setDialogOpen(true);
            }}
            className="h-9 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            New Consumption Voucher
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Total Vouchers
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
                  Drafts Pending Post
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-0.5">
                  {vouchers.filter((v) => v.status === "draft").length}
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
                  Posted Vouchers
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-0.5">
                  {vouchers.filter((v) => v.status === "posted").length}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-xs bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Active Stores
                </p>
                <h3 className="text-2xl font-bold text-foreground mt-0.5">
                  {storesList.length}
                </h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Toolbar */}
        <Card className="border-border shadow-xs">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-3 w-full">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search voucher #, purpose, remarks..."
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
            </div>
          </CardContent>
        </Card>

        {/* Vouchers Table */}
        <Card className="border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Voucher No</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Store & Department</th>
                  <th className="py-3 px-4">Purpose</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading consumption vouchers...
                    </td>
                  </tr>
                ) : vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      No consumption vouchers found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  vouchers.map((v: any) => (
                    <tr
                      key={v.id}
                      onClick={() =>
                        navigate({
                          search: (prev: any) => ({ ...prev, voucherId: v.id }),
                        })
                      }
                      className={cn(
                        "hover:bg-muted/40 transition-colors cursor-pointer",
                        selectedVoucherId === v.id && "bg-primary/5 font-medium"
                      )}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-primary">
                        {v.voucherNo}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                        {v.voucherDate ? format(new Date(v.voucherDate), "dd MMM yyyy") : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{v.storeName}</div>
                        {v.departmentName && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300">
                              <Building2 className="h-2.5 w-2.5 mr-0.5" />
                              {v.departmentName}
                            </Badge>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-[240px] truncate text-foreground font-medium">
                        {v.purpose}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {v.itemCount || 0}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        ₹{Number(v.totalCost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "capitalize font-semibold text-[10px] px-2 py-0.5",
                            v.status === "posted"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400"
                          )}
                        >
                          {v.status}
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
                              search: (prev: any) => ({ ...prev, voucherId: v.id }),
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground">
              <div>
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{" "}
                {Math.min(pagination.page * pagination.pageSize, pagination.totalRecords)} of{" "}
                {pagination.totalRecords} entries
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    navigate({
                      search: (prev: any) => ({ ...prev, page: pagination.page - 1 }),
                    })
                  }
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-medium">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    navigate({
                      search: (prev: any) => ({ ...prev, page: pagination.page + 1 }),
                    })
                  }
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* New Consumption Voucher Slide-over Sidebar Drawer */}
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
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Create Consumption Voucher</h3>
                    <p className="text-xs text-muted-foreground">
                      Record internal hospital consumables issued for departmental usage. Saved as Draft; requires Department Head/Subhead approval to post.
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
                      {selectedStore?.departmentId && (
                        <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1 font-medium">
                          <Building2 className="h-3 w-3" />
                          Department: {selectedStore.department?.name || `Dept #${selectedStore.departmentId}`}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Voucher Date</Label>
                      <Input
                        type="date"
                        {...form.register("voucherDate")}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold">Purpose / Cost Center *</Label>
                      <Input
                        placeholder="e.g. OT emergency surgeries, Floor hygiene"
                        {...form.register("purpose")}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Remarks (Optional)</Label>
                    <Input
                      placeholder="Additional audit notes or indent reference..."
                      {...form.register("remarks")}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>

                  {/* Line Items Header */}
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Consumable Line Items
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                          Add items and batches to consume from this store.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                          <input
                            type="checkbox"
                            checked={onlyConsumables}
                            onChange={(e) => setOnlyConsumables(e.target.checked)}
                            className="rounded h-3.5 w-3.5 text-primary"
                          />
                          <span>Only Non-Saleable Items</span>
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (!selectedStoreId) {
                              toast.error("Please select a store location first");
                              return;
                            }
                            append({
                              itemId: 0,
                              batchId: 0,
                              quantity: 1,
                              unitRate: 0,
                              totalCost: 0,
                              availableQty: 0,
                            });
                          }}
                          className="h-8 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add Item
                        </Button>
                      </div>
                    </div>

                    {/* Line Items Grid Layout */}
                    {fields.length === 0 ? (
                      <div className="py-8 text-center border rounded-lg bg-muted/10 border-dashed text-xs text-muted-foreground">
                        No items added. Click "Add Item" to add consumables.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {/* Column Header Grid */}
                        <div className="hidden sm:grid grid-cols-12 gap-3 px-3.5 py-2 bg-muted/40 rounded-lg border border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground items-center">
                          <div className="col-span-4">Item & Batch Selection</div>
                          <div className="col-span-2">Unit</div>
                          <div className="col-span-1 text-center">Avail</div>
                          <div className="col-span-2">Qty to Consume</div>
                          <div className="col-span-2 text-right">Cost Rate & Total</div>
                          <div className="col-span-1 text-center">Action</div>
                        </div>

                        {/* Line Items Grid Rows */}
                        <div className="space-y-2">
                          {fields.map((field, idx) => {
                            const currentBatchId = form.watch(`items.${idx}.batchId`);
                            const currentQty = form.watch(`items.${idx}.quantity`) || 0;
                            const currentRate = form.watch(`items.${idx}.unitRate`) || 0;
                            const currentAvail = form.watch(`items.${idx}.availableQty`) || 0;
                            const currentUnit = form.watch(`items.${idx}.unit`) || "";
                            const lineTotal = currentQty * currentRate;

                            const matchedBatch = rawAvailableBatches.find(
                              (b: any) => Number(b.batchId) === Number(currentBatchId)
                            );

                            // Collect available units for this item
                            const unitsSet = new Set<string>();
                            if (currentUnit) unitsSet.add(currentUnit);
                            if (matchedBatch) {
                              if (matchedBatch.unit) unitsSet.add(matchedBatch.unit);
                              if (matchedBatch.baseUnit) unitsSet.add(matchedBatch.baseUnit);
                              if (matchedBatch.purchaseUnit) unitsSet.add(matchedBatch.purchaseUnit);
                              if (matchedBatch.saleUnit) unitsSet.add(matchedBatch.saleUnit);
                            }
                            (unitTypes as any[]).forEach((u: any) => {
                              const sym = u.symbol || u.name;
                              if (sym) {
                                if (matchedBatch) {
                                  const baseU = matchedBatch.unit || matchedBatch.baseUnit;
                                  const conv = getUnitConversionFactor(baseU, sym, unitTypes, unitConversions);
                                  if (conv.convertible) unitsSet.add(sym);
                                } else {
                                  unitsSet.add(sym);
                                }
                              }
                            });
                            if (unitsSet.size <= 1) {
                              (unitTypes as any[]).forEach((u: any) => {
                                const sym = u.symbol || u.name;
                                if (sym) unitsSet.add(sym);
                              });
                            }
                            const unitOptions = Array.from(unitsSet);

                            return (
                              <div
                                key={field.id}
                                className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/10 transition-colors items-center text-xs"
                              >
                                {/* Item & Batch Selection */}
                                <div className="sm:col-span-4">
                                  <span className="sm:hidden text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                                    Item & Batch:
                                  </span>
                                  <Controller
                                    control={form.control}
                                    name={`items.${idx}.batchId`}
                                    render={({ field: batchField }) => (
                                      <Select
                                        value={batchField.value ? String(batchField.value) : ""}
                                        onValueChange={(val) => {
                                          const bId = Number(val);
                                          batchField.onChange(bId);
                                          const matched = rawAvailableBatches.find((b) => Number(b.batchId) === bId);
                                          if (matched) {
                                            const defUnit = matched.unit || matched.baseUnit || matched.saleUnit || matched.purchaseUnit || "unit";
                                            const defUnitId = findUnit(defUnit, unitTypes)?.id || null;
                                            form.setValue(`items.${idx}.itemId`, Number(matched.itemId));
                                            form.setValue(`items.${idx}.batchId`, bId);
                                            form.setValue(`items.${idx}.unitId`, defUnitId);
                                            form.setValue(`items.${idx}.unit`, defUnit);
                                            const pRate = Number(matched.purchaseRate || 0);
                                            form.setValue(`items.${idx}.unitRate`, pRate);
                                            const curQty = Number(form.getValues(`items.${idx}.quantity`) || 1);
                                            form.setValue(`items.${idx}.totalCost`, pRate * curQty);
                                            form.setValue(`items.${idx}.availableQty`, Number(matched.availableQty ?? matched.quantityOnHand ?? 0));
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="h-8 text-xs w-full">
                                          <SelectValue placeholder={isLoadingStock ? "Loading store stock..." : "Select Item & Batch..."} />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-64">
                                          {availableBatches.length === 0 ? (
                                            <div className="p-3 text-center text-xs text-muted-foreground">
                                              {isLoadingStock
                                                ? "Loading store stock..."
                                                : rawAvailableBatches.length === 0
                                                ? "No stock found in this store."
                                                : "No non-saleable items found in this store. Uncheck 'Only Non-Saleable Items' above to view all items."}
                                            </div>
                                          ) : (
                                            availableBatches.map((b: any) => (
                                              <SelectItem key={`${b.id || b.batchId}-${b.batchNumber}`} value={String(b.batchId)}>
                                                <div className="flex items-center gap-2">
                                                  <span className="font-semibold">{b.itemName}</span>
                                                  <span className="text-muted-foreground font-mono text-[11px]">
                                                    [Batch: {b.batchNumber}, Exp: {b.expiryDate ? b.expiryDate.slice(0, 10) : "N/A"}]
                                                  </span>
                                                  <span className="text-emerald-600 text-[11px] font-bold">
                                                    (Avail: {b.availableQty ?? b.quantityOnHand})
                                                  </span>
                                                  {b.isSaleable === false && (
                                                    <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-800 border-amber-300">
                                                      Consumable
                                                    </Badge>
                                                  )}
                                                </div>
                                              </SelectItem>
                                            ))
                                          )}
                                        </SelectContent>
                                      </Select>
                                    )}
                                  />
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

                                {/* Available Stock */}
                                <div className="sm:col-span-1 flex flex-col items-start sm:items-center justify-center">
                                  <span className="sm:hidden text-[10px] font-bold uppercase text-muted-foreground mb-0.5">
                                    Avail:
                                  </span>
                                  <Badge variant="outline" className="font-mono text-[11px] px-1.5 py-0.5 bg-muted/40 whitespace-nowrap">
                                    {currentAvail}
                                  </Badge>
                                </div>

                                {/* Quantity Input */}
                                <div className="sm:col-span-2">
                                  <span className="sm:hidden text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                                    Qty to Consume:
                                  </span>
                                  <Input
                                    type="number"
                                    min="0.001"
                                    step="any"
                                    value={currentQty}
                                    onChange={(e) => {
                                      const q = parseFloat(e.target.value) || 0;
                                      form.setValue(`items.${idx}.quantity`, q);
                                      form.setValue(`items.${idx}.totalCost`, q * currentRate);
                                    }}
                                    className={cn(
                                      "h-8 text-xs font-mono w-full",
                                      currentQty > currentAvail && "border-rose-500 text-rose-600 bg-rose-50/50"
                                    )}
                                  />
                                  {currentQty > currentAvail && (
                                    <span className="text-[10px] text-rose-500 block mt-0.5 font-medium">
                                      Exceeds stock
                                    </span>
                                  )}
                                </div>

                                {/* Rate & Line Total */}
                                <div className="sm:col-span-2 text-left sm:text-right">
                                  <span className="sm:hidden text-[10px] font-bold uppercase text-muted-foreground block mb-0.5">
                                    Line Cost:
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
                    <span className="text-muted-foreground">Total Estimated Value:</span>{" "}
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
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      )}
                      Save as Draft
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Detail View Dialog */}
      <Dialog
        open={!!selectedVoucherId}
        onOpenChange={(open) => {
          if (!open) {
            navigate({ search: (prev: any) => ({ ...prev, voucherId: undefined }) });
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          {isLoadingDetail ? (
            <div className="p-12 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
              Loading voucher details...
            </div>
          ) : !selectedVoucher ? (
            <div className="p-12 text-center text-muted-foreground">
              Voucher not found.
            </div>
          ) : (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Package className="h-6 w-6 text-primary" />
                    <div>
                      <DialogTitle className="text-lg font-bold font-mono">
                        {selectedVoucher.voucherNo}
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        Issued from {selectedVoucher.storeName} ({selectedVoucher.storeCode})
                      </DialogDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize font-bold text-xs px-2.5 py-1",
                      selectedVoucher.status === "posted"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400"
                    )}
                  >
                    {selectedVoucher.status}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Header Information Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/20 border text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Voucher Date</span>
                    <span className="font-semibold text-foreground">
                      {selectedVoucher.voucherDate
                        ? format(new Date(selectedVoucher.voucherDate), "dd MMM yyyy")
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Department (Cost Center)</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {selectedVoucher.departmentName || "General Store"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Created By</span>
                    <span className="font-semibold text-foreground">
                      {selectedVoucher.createdByName || "Staff"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Posted By</span>
                    <span className="font-semibold text-foreground">
                      {selectedVoucher.postedByName || "—"}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-4 pt-2 border-t">
                    <span className="text-muted-foreground block text-[11px]">Purpose / Reason</span>
                    <span className="font-medium text-foreground text-sm">
                      {selectedVoucher.purpose}
                    </span>
                    {selectedVoucher.remarks && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Remarks: {selectedVoucher.remarks}
                      </p>
                    )}
                  </div>
                </div>

                {/* Approval Notice Banner for Drafts */}
                {selectedVoucher.status === "draft" && (
                  <div className={cn(
                    "p-3 rounded-lg border flex items-start gap-2.5 text-xs",
                    canPost
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-900 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-200"
                      : "bg-amber-50/70 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-200"
                  )}>
                    <ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <div>
                      <p className="font-semibold">
                        {canPost
                          ? "You have authorization to post this voucher."
                          : "Requires Department In-charge or Subhead authorization to post."}
                      </p>
                      <p className="text-[11px] opacity-80 mt-0.5">
                        Posting will permanently decrement store inventory and record a CONSUMPTION entry in the immutable stock ledger.
                      </p>
                    </div>
                  </div>
                )}

                {/* Lines Table */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Items Consumed ({selectedVoucher.items?.length || 0})
                  </h4>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 font-semibold border-b text-muted-foreground">
                        <tr>
                          <th className="py-2.5 px-3">Item Name</th>
                          <th className="py-2.5 px-3 font-mono">Batch #</th>
                          <th className="py-2.5 px-3">Expiry</th>
                          <th className="py-2.5 px-3 text-right">Quantity</th>
                          <th className="py-2.5 px-3 text-right">Unit Rate</th>
                          <th className="py-2.5 px-3 text-right">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(selectedVoucher.items || []).map((item: any) => (
                          <tr key={item.id} className="hover:bg-muted/20">
                            <td className="py-2.5 px-3 font-medium text-foreground">
                              {item.itemName}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-muted-foreground">
                              {item.batchNumber}
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground">
                              {item.expiryDate ? item.expiryDate.slice(0, 10) : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                              ₹{Number(item.unitRate || 0).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                              ₹{Number(item.totalCost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-muted/20 border-t font-bold">
                        <tr>
                          <td colSpan={5} className="py-2.5 px-3 text-right">
                            Grand Total:
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-primary text-sm">
                            ₹{Number(selectedVoucher.totalCost || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="px-6 py-4 border-t bg-muted/20 flex items-center justify-between">
                <div>
                  {selectedVoucher.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this draft voucher?")) {
                          deleteMutation.mutate(selectedVoucher.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Delete Draft
                    </Button>
                  )}
                  {selectedVoucher.status === "posted" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => {
                        navigate({
                          to: "/inventory/consumption-returns" as any,
                          search: { originalVoucherId: selectedVoucher.id } as any,
                        });
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Raise Consumption Return
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      navigate({ search: (prev: any) => ({ ...prev, voucherId: undefined }) })
                    }
                  >
                    Close
                  </Button>

                  {selectedVoucher.status === "draft" && (
                    <Button
                      size="sm"
                      disabled={!canPost || postMutation.isPending}
                      onClick={() => {
                        if (window.confirm("Approve and post this consumption voucher to the stock ledger?")) {
                          postMutation.mutate(selectedVoucher.id);
                        }
                      }}
                      className={cn(
                        "shadow-sm",
                        canPost ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                      )}
                    >
                      {postMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      )}
                      Approve & Post
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
