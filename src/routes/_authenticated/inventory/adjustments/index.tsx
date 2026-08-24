import { createFileRoute } from "@tanstack/react-router";
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
  Layers
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
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { format } from "date-fns";
import { cn } from "@/utils/cn";

const adjItemSchema = z.object({
  itemId: z.coerce.number().positive("Item is required"),
  batchId: z.coerce.number().positive("Batch is required"),
  systemQty: z.coerce.number().min(0),
  physicalQty: z.coerce.number().min(0, "Physical quantity is required"),
  type: z.enum(["gain", "loss", "expired", "damaged"]).default("gain"),
});

const adjFormSchema = z.object({
  storeId: z.coerce.number().positive("Store is required"),
  reason: z.string().min(2, "Reason / Audit purpose is required"),
  items: z.array(adjItemSchema).min(1, "At least one item is required"),
});

type AdjFormValues = z.infer<typeof adjFormSchema>;

export const Route = createFileRoute("/_authenticated/inventory/adjustments/")({
  component: AdjustmentsList,
});

function AdjustmentsList() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedAdj, setSelectedAdj] = React.useState<any | null>(null);

  const { data: adjsResponse, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["inventory-adjustments"],
    () => client.inventory.adjustments.$get()
  );

  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  const adjsData = adjsResponse?.data || [];

  const form = useForm<AdjFormValues>({
    resolver: zodResolver(adjFormSchema) as any,
    defaultValues: {
      storeId: storesList[0]?.id || 0,
      reason: "Physical Stock Count / Variance Reconciliation",
      items: [{ itemId: 0, batchId: 0, systemQty: 0, physicalQty: 0, type: "gain" }],
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
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-ledger"] });
      setSelectedAdj(null);
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
          <span>{row.store?.name || "N/A"}</span>
          {row.store?.code && (
            <span className="text-[10px] text-muted-foreground font-mono">({row.store.code})</span>
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
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedAdj(row)}
            className="h-8 text-xs font-medium"
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
      {/* List Card */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mr-2" />
              <span>Loading stock adjustments...</span>
            </div>
          ) : adjsData.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <SlidersHorizontal className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No stock adjustments recorded</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click &quot;New Stock Take / Adjustment&quot; above to log physical count reconciliations.
              </p>
            </div>
          ) : (
            <DataTable columns={columns} rows={adjsData as Record<string, unknown>[]} />
          )}
        </CardContent>
      </Card>

      {/* Create Adjustment Dialog with shadcn Components */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  onClick={() => append({ itemId: 0, batchId: 0, systemQty: 0, physicalQty: 0, type: "gain" })}
                  className="h-8 text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Batch Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-wrap items-center gap-2.5 p-3 rounded-lg border bg-muted/30">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-[10px] text-muted-foreground block mb-1">Select Batch</Label>
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
                              form.setValue(`items.${index}.itemId`, match.itemId);
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
                    <Label className="text-[10px] text-muted-foreground block mb-1">Physical Qty</Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0"
                      {...form.register(`items.${index}.physicalQty`)}
                      className="h-9 text-xs font-mono font-bold text-center"
                    />
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
                      className="h-9 w-9 mt-4 text-muted-foreground hover:text-destructive"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
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

      {/* Detail & Post Dialog with shadcn Dialog */}
      {selectedAdj && (
        <Dialog open={!!selectedAdj} onOpenChange={() => setSelectedAdj(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
                  <span>Adjustment #{selectedAdj.adjustmentNo}</span>
                </DialogTitle>
                {getStatusBadge(selectedAdj.status)}
              </div>
              <DialogDescription>
                Store: {selectedAdj.store?.name || "Main Store"} • Purpose: {selectedAdj.reason}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {/* Summary Metadata */}
              <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3 rounded-lg text-xs border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Store Location:</span>
                  <span className="font-semibold">{selectedAdj.store?.name || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Date Created:</span>
                  <span className="font-semibold font-mono">{new Date(selectedAdj.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 text-muted-foreground font-semibold border-b">
                    <tr>
                      <th className="py-2.5 px-3">Item Description</th>
                      <th className="py-2.5 px-3">Batch</th>
                      <th className="py-2.5 px-3 text-right">System</th>
                      <th className="py-2.5 px-3 text-right">Physical</th>
                      <th className="py-2.5 px-3 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedAdj.items?.map((item: any) => {
                      const diff = Number(item.differenceQty);
                      return (
                        <tr key={item.id} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3 font-semibold">{item.item?.name || `Item #${item.itemId}`}</td>
                          <td className="py-2.5 px-3 font-mono text-muted-foreground">{item.batch?.batchNumber || `#${item.batchId}`}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{item.systemQty}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-medium">{item.physicalQty}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold">
                            <span className={cn(
                              "inline-flex items-center px-1.5 py-0.5 rounded text-[11px]",
                              diff > 0 ? "bg-emerald-50 text-emerald-700" : diff < 0 ? "bg-rose-50 text-rose-700" : "text-muted-foreground"
                            )}>
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setSelectedAdj(null)}>
                  Close
                </Button>
                {selectedAdj.status === "draft" && (
                  <Button
                    size="sm"
                    disabled={postMutation.isPending}
                    onClick={() => postMutation.mutate(selectedAdj.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
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
          </DialogContent>
        </Dialog>
      )}
    </ModuleLayout>
  );
}

