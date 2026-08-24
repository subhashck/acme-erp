import { createFileRoute } from "@tanstack/react-router";
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
  PackageCheck
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
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Badge } from "@/ui/badge";
import { cn } from "@/utils/cn";

const transferItemSchema = z.object({
  itemId: z.coerce.number().positive("Item is required"),
  batchId: z.coerce.number().positive("Batch is required"),
  quantity: z.coerce.number().positive("Quantity must be > 0"),
  unit: z.string().min(1, "Unit is required"),
  unitRate: z.coerce.number().min(0).default(0),
});

const transferFormSchema = z.object({
  fromStoreId: z.coerce.number().positive("Source store is required"),
  toStoreId: z.coerce.number().positive("Destination store is required"),
  remarks: z.string().optional().nullable(),
  items: z.array(transferItemSchema).min(1, "At least one item is required"),
});

type TransferFormValues = z.infer<typeof transferFormSchema>;

export const Route = createFileRoute("/_authenticated/inventory/transfers/")({
  component: TransfersList,
});

function TransfersList() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedTransfer, setSelectedTransfer] = React.useState<any | null>(null);

  const { data: transfersResponse, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["inventory-transfers"],
    () => client.inventory.transfers.$get()
  );

  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  const transfersData = transfersResponse?.data || [];

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema) as any,
    defaultValues: {
      fromStoreId: storesList.find((s: any) => s.isDefault)?.id || storesList[0]?.id || 0,
      toStoreId: storesList[1]?.id || 0,
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

  const columns: ColumnDef<Record<string, unknown>>[] = [
    {
      id: "transferNo",
      label: "Transfer No",
      render: (row) => (
        <span className="font-mono font-bold">
          {String(row.transferNo || "")}
        </span>
      ),
    },
    {
      id: "fromStore",
      label: "Source Store",
      render: (row: any) => (
        <div className="flex items-center gap-1.5 font-medium">
          <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
          {row.fromStore?.name || "N/A"}
        </div>
      ),
    },
    {
      id: "toStore",
      label: "Destination Store",
      render: (row: any) => (
        <div className="flex items-center gap-1.5">
          <Warehouse className="w-3.5 h-3.5 text-muted-foreground" />
          {row.toStore?.name || "N/A"}
        </div>
      ),
    },
    {
      id: "status",
      label: "Status",
      render: (row) => getStatusBadge(String(row.status || "")),
    },
    {
      id: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedTransfer(row)}
          >
            View / Process
          </Button>
        </div>
      ),
    },
  ];

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
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Stock Transfer
          </Button>
        </div>
      }
    >
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            </div>
          ) : (
            <DataTable columns={columns} rows={transfersData as Record<string, unknown>[]} />
          )}
        </CardContent>
      </Card>

      {/* New Transfer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-175">
          <DialogHeader>
            <DialogTitle>Create Stock Transfer</DialogTitle>
            <DialogDescription>
              Select source store, target store, and batches to dispatch.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 pt-4">
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
                <span className="text-sm font-semibold">Transfer Items & Batches</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ itemId: 0, batchId: 0, quantity: 1, unit: "Box", unitRate: 0 })}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Batch Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2 p-2.5 rounded-md border">
                  <div className="flex-1">
                    <Controller
                      control={form.control}
                      name={`items.${index}.batchId`}
                      render={({ field: batchField }) => (
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
                            {sourceStockList.map((stock: any) => (
                              <SelectItem key={stock.id} value={String(stock.batchId)}>
                                {stock.itemName} | Batch: {stock.batchNumber} | Exp: {stock.expiryDate} (Avail: {stock.availableQty} {stock.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="w-20">
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="Qty"
                      {...form.register(`items.${index}.quantity`)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
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
        <Dialog open={!!selectedTransfer} onOpenChange={() => setSelectedTransfer(null)}>
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
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="border rounded-md divide-y">
                <div className=" px-4 py-2 font-medium text-xs  grid grid-cols-4">
                  <span className="col-span-2">Item Name</span>
                  <span>Batch No.</span>
                  <span className="text-right">Quantity</span>
                </div>
                {selectedTransfer.items?.map((item: any) => (
                  <div key={item.id} className="px-4 py-2.5 text-xs grid grid-cols-4 items-center">
                    <span className="col-span-2 font-medium">{item.item?.name || `Item #${item.itemId}`}</span>
                    <span className="font-mono">{item.batch?.batchNumber || `#${item.batchId}`}</span>
                    <span className="font-mono font-bold text-right">{item.quantity} {item.unit}</span>
                  </div>
                ))}
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
