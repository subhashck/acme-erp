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
  FileCheck2, 
  Plus, 
  Trash2, 
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Warehouse
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

const reqItemSchema = z.object({
  itemId: z.coerce.number().positive("Item is required"),
  requestedQty: z.coerce.number().positive("Qty must be > 0"),
  unit: z.string().min(1, "Unit is required"),
});

const reqFormSchema = z.object({
  requestingStoreId: z.coerce.number().positive("Requesting store is required"),
  fulfillingStoreId: z.coerce.number().positive("Fulfilling store is required"),
  priority: z.enum(["normal", "urgent", "emergency"]).default("normal"),
  remarks: z.string().optional().nullable(),
  items: z.array(reqItemSchema).min(1, "At least one item is required"),
});

type ReqFormValues = z.infer<typeof reqFormSchema>;

export const Route = createFileRoute("/_authenticated/inventory/requisitions/")({
  component: RequisitionsList,
});

function RequisitionsList() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedReq, setSelectedReq] = React.useState<any | null>(null);

  const { data: reqsResponse, isLoading, refetch, isRefetching } = useRpcQuery<any>(
    ["inventory-requisitions"],
    () => client.inventory.requisitions.$get()
  );

  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  const { data: itemsList = [] } = useRpcQuery<any[]>(
    ["items"],
    () => client.items.$get()
  );

  const reqsData = reqsResponse?.data || [];

  const form = useForm<ReqFormValues>({
    resolver: zodResolver(reqFormSchema) as any,
    defaultValues: {
      requestingStoreId: storesList[0]?.id || 0,
      fulfillingStoreId: storesList.find((s: any) => s.isDefault)?.id || storesList[1]?.id || 0,
      priority: "normal",
      remarks: "",
      items: [{ itemId: 0, requestedQty: 1, unit: "Box" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const createMutation = useMutation({
    mutationFn: async (values: ReqFormValues) => {
      const res = await client.inventory.requisitions.$post({
        json: values,
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || "Failed to create requisition");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Store requisition submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["inventory-requisitions"] });
      setDialogOpen(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await (client.inventory.requisitions as any)[":id"].approve.$patch({
        param: { id: String(id) },
        json: {
          items: selectedReq?.items?.map((item: any) => ({
            id: item.id,
            approvedQty: Number(item.requestedQty),
          })) || [],
        },
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || "Failed to approve requisition");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Requisition approved successfully");
      queryClient.invalidateQueries({ queryKey: ["inventory-requisitions"] });
      setSelectedReq(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await (client.inventory.requisitions as any)[":id"].reject.$patch({
        param: { id: String(id) },
        json: { remarks: "Rejected by store manager" },
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || "Failed to reject requisition");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Requisition rejected");
      queryClient.invalidateQueries({ queryKey: ["inventory-requisitions"] });
      setSelectedReq(null);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Approved</Badge>;
      case "submitted":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Submitted</Badge>;
      case "partially_fulfilled":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Partially Fulfilled</Badge>;
      case "fulfilled":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-200">Fulfilled</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns: ColumnDef<Record<string, unknown>>[] = [
    {
      id: "requisitionNo",
      label: "Indent No",
      render: (row) => (
        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
          {String(row.requisitionNo || "")}
        </span>
      ),
    },
    {
      id: "requestingStore",
      label: "Requesting Store",
      render: (row: any) => (
        <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
          {row.requestingStore?.name || "N/A"}
        </div>
      ),
    },
    {
      id: "fulfillingStore",
      label: "Fulfilling Store",
      render: (row: any) => (
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <Warehouse className="w-3.5 h-3.5 text-slate-400" />
          {row.fulfillingStore?.name || "Central Warehouse"}
        </div>
      ),
    },
    {
      id: "priority",
      label: "Priority",
      render: (row) => {
        const prio = String(row.priority || "normal");
        return (
          <Badge
            className={cn(
              prio === "emergency"
                ? "bg-red-600 text-white"
                : prio === "urgent"
                ? "bg-amber-500 text-white"
                : "bg-slate-100 text-slate-700"
            )}
          >
            {prio.toUpperCase()}
          </Badge>
        );
      },
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
            onClick={() => setSelectedReq(row)}
          >
            View Detail
          </Button>
        </div>
      ),
    },
  ];

  return (
    <ModuleLayout
      title="Store Requisitions (Indents)"
      description="Internal stock requirement requests between wards, dispensaries, and central warehouse"
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
            New Indent Request
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
            <DataTable columns={columns} rows={reqsData as Record<string, unknown>[]} />
          )}
        </CardContent>
      </Card>

      {/* New Requisition Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>New Store Indent Requisition</DialogTitle>
            <DialogDescription>
              Submit an internal request for stock transfer from Central Warehouse.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={form.control}
                name="requestingStoreId"
                render={({ field }) => (
                  <Field label="Requesting Store *" error={form.formState.errors.requestingStoreId?.message}>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(val ? Number(val) : 0)}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select Store" />
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
                name="fulfillingStoreId"
                render={({ field }) => (
                  <Field label="Fulfilling Store *" error={form.formState.errors.fulfillingStoreId?.message}>
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(val) => field.onChange(val ? Number(val) : 0)}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select Store" />
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

            <Controller
              control={form.control}
              name="priority"
              render={({ field }) => (
                <Field label="Priority *" error={form.formState.errors.priority?.message}>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Select Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="emergency">Emergency / Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <div className="space-y-3 pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Requested Items</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ itemId: 0, requestedQty: 1, unit: "Box" })}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-md border border-slate-200 dark:border-slate-800">
                  <div className="flex-1">
                    <Controller
                      control={form.control}
                      name={`items.${index}.itemId`}
                      render={({ field: itemField }) => (
                        <Select
                          value={itemField.value ? String(itemField.value) : ""}
                          onValueChange={(val) => {
                            const selectedId = Number(val);
                            itemField.onChange(selectedId);
                            const found = itemsList.find((i: any) => i.id === selectedId);
                            if (found?.unit) {
                              form.setValue(`items.${index}.unit`, found.unit);
                            }
                          }}
                        >
                          <SelectTrigger className="w-full bg-background h-9 text-xs">
                            <SelectValue placeholder="Select Item" />
                          </SelectTrigger>
                          <SelectContent>
                            {itemsList.map((item: any) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {item.name} ({item.unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="Qty"
                      {...form.register(`items.${index}.requestedQty`)}
                      className="h-9 text-xs font-mono"
                    />
                  </div>

                  <div className="w-24">
                    <Input
                      type="text"
                      placeholder="Unit"
                      {...form.register(`items.${index}.unit`)}
                      className="h-9 text-xs"
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

            <Field label="Remarks / Purpose" error={form.formState.errors.remarks?.message}>
              <Textarea
                {...form.register("remarks")}
                rows={2}
                placeholder="Reason for requisition..."
              />
            </Field>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Requisition
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Detail & Approve Dialog */}
      {selectedReq && (
        <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
          <DialogContent className="sm:max-w-150">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Indent #{selectedReq.requisitionNo}</span>
                {getStatusBadge(selectedReq.status)}
              </DialogTitle>
              <DialogDescription>
                Requesting: <strong>{selectedReq.requestingStore?.name}</strong> $\rightarrow$ Fulfilling: <strong>{selectedReq.fulfillingStore?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="border rounded-md divide-y">
                <div className=" px-4 py-2 font-medium text-xs  grid grid-cols-4">
                  <span className="col-span-2">Item Name</span>
                  <span>Requested</span>
                  <span>Approved</span>
                </div>
                {selectedReq.items?.map((item: any) => (
                  <div key={item.id} className="px-4 py-2.5 text-xs grid grid-cols-4 items-center">
                    <span className="col-span-2 font-medium ">{item.item?.name || `Item #${item.itemId}`}</span>
                    <span className="font-mono">{item.requestedQty} {item.unit}</span>
                    <span className="font-mono font-bold text-emerald-700">{item.approvedQty ?? item.requestedQty} {item.unit}</span>
                  </div>
                ))}
              </div>

              {selectedReq.remarks && (
                <div className=" p-3 rounded-md text-xs ">
                  <strong>Remarks:</strong> {selectedReq.remarks}
                </div>
              )}

              {selectedReq.status === "submitted" && (
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    disabled={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate(selectedReq.id)}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    Reject Indent
                  </Button>
                  <Button
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(selectedReq.id)}
                  >
                    {approveMutation.isPending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
                    Approve Indent
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
