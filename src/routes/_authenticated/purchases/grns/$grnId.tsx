import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery, queryClient } from "@/lib/query";
import { client } from "@/services/rpc";
import { useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ChevronLeft, Loader2, Save, Send, Plus, Trash2, Calendar as CalendarIcon
} from "lucide-react";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Field } from "@/components/Field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/utils/cn";
import { Autocomplete } from "@/ui/autocomplete";
import { AddItemDialog } from "@/components/AddItemForm";
import { toNum } from "@/utils/math";

const grnItemFormSchema = z.object({
  id: z.number().optional(),
  itemId: z.number().int().positive().optional().nullable(),
  poItemId: z.number().int().positive().optional().nullable(),
  itemName: z.string().min(1, "Item name is required"),
  receivedQty: z.coerce.number().min(0.01, "Must be > 0"),
  freeQty: z.coerce.number().min(0, "Must be >= 0").default(0),
  unitRate: z.coerce.number().min(0, "Must be >= 0"),
  gstPercent: z.coerce.number().min(0, "Must be >= 0"),
  batch: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const directGrnFormSchema = z.object({
  grnNo: z.string().optional().nullable(),
  grnDate: z.string().min(1, "GRN Date is required"),
  vendorId: z.coerce.number().positive("Vendor is required"),
  noPoReason: z.string().optional().nullable(),
  dateOfDelivery: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  items: z.array(grnItemFormSchema).min(1, "At least one item is required"),
});

type DirectGRNFormValues = z.infer<typeof directGrnFormSchema>;

export const Route = createFileRoute("/_authenticated/purchases/grns/$grnId")({
  component: EditDirectGRNRoute,
});

function EditDirectGRNRoute() {
  const { grnId } = Route.useParams();
  const navigate = useNavigate();

  const { data: grn, isLoading, error } = useRpcQuery<any>(
    ["grns", grnId],
    () => (client.grns as any)[":grnId"].$get({ param: { grnId } })
  );

  if (isLoading) {
    return (
      <ModuleLayout title="GRN Details" description="Loading...">
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (error || !grn) {
    return (
      <ModuleLayout title="GRN Details" description="Error loading GRN.">
        <div className="text-center text-destructive p-12">
          Failed to load GRN details. Make sure it exists.
          <div className="mt-4">
            <Link to="/purchases/grns">
              <Button variant="outline">Back to List</Button>
            </Link>
          </div>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title={`GRN Details: ${grn.grnNo}`}
      description="View or edit Goods Receipt Note."
      action={
        <Link to="/purchases/grns">
          <Button variant="outline">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to List
          </Button>
        </Link>
      }
    >
      <div className="max-w-6xl mx-auto py-6">
        <EditGRNForm grn={grn} grnId={parseInt(grnId as string, 10)} />
      </div>
    </ModuleLayout>
  );
}

export function EditGRNForm({ grn, grnId }: { grn: any; grnId: number }) {
  const navigate = useNavigate();
  const isDraft = grn.status === 'draft';
  const isDirect = !grn.poId;

  const { data: vendors = [] } = useRpcQuery(["vendors"], () => client.vendors.$get());
  const vendorOptions = React.useMemo(() => {
    return (vendors as any[]).map((v: any) => [String(v.id), v.name] as [string, string]);
  }, [vendors]);

  const { data: itemsCatalog = [] } = useRpcQuery<any[]>(["items"], () => client.items.$get());
  const itemOptions = React.useMemo(() => {
    return (itemsCatalog as any[]).map((it: any) => [it.name, it.name] as [string, string]);
  }, [itemsCatalog]);

  const [addItemDialogOpen, setAddItemDialogOpen] = React.useState(false);
  const [newItemInitialName, setNewItemInitialName] = React.useState("");

  const form = useForm<DirectGRNFormValues>({
    // @ts-ignore
    resolver: zodResolver(directGrnFormSchema),
    defaultValues: {
      grnNo: grn.grnNo || "",
      grnDate: grn.grnDate,
      vendorId: grn.vendorId || (grn.purchaseOrder ? grn.purchaseOrder.vendorId : 0),
      noPoReason: grn.noPoReason || "",
      dateOfDelivery: grn.dateOfDelivery || "",
      remarks: grn.remarks || "",
      items: grn.items?.map((item: any) => ({
        id: item.id,
        itemId: item.itemId || null,
        poItemId: item.poItemId || null,
        itemName: item.itemName || item.item?.name || item.poItem?.itemName || "Unknown",
        receivedQty: toNum(item.receivedQty),
        freeQty: toNum(item.freeQty),
        unitRate: toNum(item.unitRate) || (item.poItem ? toNum(item.poItem.unitRate) : 0),
        gstPercent: toNum(item.gstPercent) || (item.poItem ? toNum(item.poItem.gstPercent) : 0),
        batch: item.batch || "",
        expiryDate: item.expiryDate || "",
        notes: item.notes || "",
      })) || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const handleItemAdded = (newItem: any) => {
    const currentItems = form.getValues("items") || [];
    const lastIndex = currentItems.length - 1;
    const lastItemName = currentItems[lastIndex]?.itemName;

    if (lastIndex >= 0 && (!lastItemName || lastItemName.trim() === "")) {
      form.setValue(`items.${lastIndex}.itemId`, newItem.id);
      form.setValue(`items.${lastIndex}.itemName`, newItem.name);
      form.setValue(`items.${lastIndex}.unitRate`, Number(newItem.rate || 0));
      form.setValue(`items.${lastIndex}.gstPercent`, Number(newItem.gstPercent || 0));
    } else {
      append({
        itemId: newItem.id,
        itemName: newItem.name,
        receivedQty: 1,
        freeQty: 0,
        unitRate: Number(newItem.rate || 0),
        gstPercent: Number(newItem.gstPercent || 0),
      });
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/grns/${grnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update GRN");
      }
      return res.json();
    },
    onSuccess: async () => {
      toast.success("GRN updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["grns"] });
      navigate({ to: "/purchases/grns" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update GRN");
    },
  });

  const onSubmit = (values: DirectGRNFormValues, targetStatus: string = "draft") => {
    if (targetStatus === 'posted') {
      const confirmedPost = window.confirm("Are you sure you want to POST this GRN? This action will update inventory and cannot be undone directly.");
      if (!confirmedPost) return;
    }

    if (!grn.poId && !values.noPoReason?.trim()) {
      toast.error("Reason for no PO is required for direct GRNs.");
      return;
    }

    const payload = {
      ...values,
      status: targetStatus,
      grnNo: values.grnNo || null,
      noPoReason: values.noPoReason || null,
      dateOfDelivery: values.dateOfDelivery || null,
      remarks: values.remarks || null,
      items: values.items.map(item => ({
        id: item.id,
        itemId: item.itemId || null,
        poItemId: item.poItemId || null,
        itemName: item.itemName,
        receivedQty: item.receivedQty,
        freeQty: item.freeQty,
        unitRate: item.unitRate,
        gstPercent: item.gstPercent,
        batch: item.batch || null,
        expiryDate: item.expiryDate || null,
        notes: item.notes || null,
      })),
    };

    mutation.mutate(payload);
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <fieldset disabled={!isDraft} className="space-y-6">
        {/* Header Fields */}
        <Card>
          <CardHeader>
            <CardTitle>GRN Header Details</CardTitle>
            <CardDescription>
              {isDraft ? "Enter receipt details below." : `This GRN is ${grn.status} and cannot be edited.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            <Field 
              label="GRN Number" 
              disabled={true}
              {...form.register("grnNo")}
            />
            <Field 
              label="GRN Date" 
              type="date"
              {...form.register("grnDate")}
              error={form.formState.errors.grnDate?.message}
            />
            <Field 
              label="Date of Delivery" 
              type="date"
              {...form.register("dateOfDelivery")}
              error={form.formState.errors.dateOfDelivery?.message}
            />

            <div className="space-y-2 relative flex flex-col justify-end" style={{ zIndex: 100 }}>
              <span className="text-sm font-medium leading-none">
                Vendor <span className="text-destructive">*</span>
              </span>
              <Autocomplete
                label=""
                options={vendorOptions}
                value={String(form.watch("vendorId") || "")}
                onChange={(val) => {
                  form.setValue("vendorId", parseInt(val, 10), { shouldValidate: true });
                }}
                placeholder="Select Vendor..."
                disabled={!isDraft || !isDirect}
              />
              {form.formState.errors.vendorId && (
                <p className="text-sm text-destructive">{form.formState.errors.vendorId.message}</p>
              )}
            </div>

            {isDirect && (
              <Field 
                label="Reason for no PO" 
                placeholder="Mandatory explanation..."
                {...form.register("noPoReason")}
                error={form.formState.errors.noPoReason?.message}
                className="md:col-span-2"
              />
            )}
            {!isDirect && (
              <Field 
                label="Purchase Order No" 
                disabled={true}
                value={grn.purchaseOrder?.poNo || ""}
              />
            )}
          </CardContent>
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle>Received Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase rounded-md items-center">
              <div className="col-span-3">Item Name *</div>
              <div className="col-span-1 text-right">Recv Qty</div>
              <div className="col-span-1 text-right">Free Qty</div>
              <div className="col-span-1 text-right">Rate (₹)</div>
              <div className="col-span-1 text-right">GST %</div>
              <div className="col-span-2">Batch No</div>
              <div className="col-span-2">Expiry Date</div>
              {isDraft && isDirect && <div className="col-span-1"></div>}
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => {
                const currentItemName = form.watch(`items.${index}.itemName`);
                const isPoLinkedItem = form.watch(`items.${index}.poItemId`);
                
                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-12 gap-3 items-center p-3.5 rounded-lg border bg-card hover:bg-muted/5 transition-colors shadow-xs group"
                  >
                    <div className="col-span-12 lg:col-span-3 relative" style={{ zIndex: 50 - index }}>
                      <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Item Name *</label>
                      {isPoLinkedItem || !isDirect ? (
                        <span className="font-medium px-2 py-1 bg-muted/30 rounded">{currentItemName}</span>
                      ) : (
                        <Autocomplete
                          label=""
                          options={itemOptions}
                          value={currentItemName}
                          onChange={(val) => {
                            const selected = itemsCatalog.find(i => i.name === val);
                            if (selected) {
                              form.setValue(`items.${index}.itemId`, selected.id);
                              form.setValue(`items.${index}.itemName`, selected.name);
                              form.setValue(`items.${index}.unitRate`, Number(selected.rate || 0));
                              form.setValue(`items.${index}.gstPercent`, Number(selected.gstPercent || 0));
                            } else {
                              form.setValue(`items.${index}.itemName`, val);
                            }
                          }}
                          placeholder="Select item..."
                          disabled={!isDraft}
                          allowCustomValue={true}
                        />
                      )}
                      {form.formState.errors.items?.[index]?.itemName && (
                        <p className="text-xs text-destructive mt-1">
                          {form.formState.errors.items[index]?.itemName?.message}
                        </p>
                      )}
                    </div>
                    <div className="col-span-6 lg:col-span-1">
                      <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Recv Qty</label>
                      <Field
                        type="number"
                        min="0"
                        step="0.01"
                        {...form.register(`items.${index}.receivedQty`)}
                        error={form.formState.errors.items?.[index]?.receivedQty?.message}
                      />
                    </div>
                    <div className="col-span-6 lg:col-span-1">
                      <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Free Qty</label>
                      <Field
                        type="number"
                        min="0"
                        step="0.01"
                        {...form.register(`items.${index}.freeQty`)}
                      />
                    </div>
                    <div className="col-span-6 lg:col-span-1">
                      <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Rate</label>
                      <Field
                        type="number"
                        min="0"
                        step="0.01"
                        {...form.register(`items.${index}.unitRate`)}
                        disabled={!isDirect && !!isPoLinkedItem}
                      />
                    </div>
                    <div className="col-span-6 lg:col-span-1">
                      <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">GST %</label>
                      <Field
                        type="number"
                        min="0"
                        step="0.1"
                        {...form.register(`items.${index}.gstPercent`)}
                        disabled={!isDirect && !!isPoLinkedItem}
                      />
                    </div>
                    <div className="col-span-6 lg:col-span-2">
                      <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Batch No</label>
                      <Field
                        type="text"
                        placeholder="Batch No"
                        {...form.register(`items.${index}.batch`)}
                      />
                    </div>
                    <div className="col-span-6 lg:col-span-2">
                      <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Expiry</label>
                      <Controller
                        control={form.control}
                        name={`items.${index}.expiryDate` as const}
                        render={({ field, fieldState }) => (
                          <div className="flex flex-col space-y-1">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal bg-background px-3 h-9 text-xs",
                                    !field.value && "text-muted-foreground",
                                    fieldState.error && "border-destructive"
                                  )}
                                  disabled={!isDraft}
                                >
                                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  {field.value ? format(new Date(field.value), "yyyy-MM-dd") : <span>Pick date</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  captionLayout="dropdown"
                                  startMonth={new Date(new Date().getFullYear() - 2, 0)}
                                  endMonth={new Date(new Date().getFullYear() + 10, 11)}
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)}
                                />
                              </PopoverContent>
                            </Popover>
                            {fieldState.error && <span className="text-xs text-destructive">{fieldState.error.message}</span>}
                          </div>
                        )}
                      />
                    </div>
                    {isDraft && isDirect && (
                      <div className="col-span-12 lg:col-span-1 flex justify-end">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => remove(index)}
                          className="h-8 w-8 p-0 text-destructive "
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {isDraft && isDirect && (
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ itemName: "", receivedQty: 1, freeQty: 0, unitRate: 0, gstPercent: 0 })}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            )}
          </CardContent>
        </Card>
      </fieldset>

      {/* Form Submission Actions */}
      <div className="flex justify-end gap-4">
        <Link to="/purchases/grns">
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </Link>
        {isDraft && (
          <>
            <Button 
              type="button" 
              variant="outline"
              disabled={mutation.isPending}
              onClick={form.handleSubmit((values) => onSubmit(values as unknown as DirectGRNFormValues, "draft"))}
            >
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </Button>
            <Button 
              type="button" 
              disabled={mutation.isPending}
              onClick={form.handleSubmit((values) => onSubmit(values as unknown as DirectGRNFormValues, "posted"))}
            >
              <Send className="h-4 w-4 mr-2" /> Post GRN
            </Button>
          </>
        )}
      </div>
      
      {isDraft && isDirect && (
        <AddItemDialog 
          open={addItemDialogOpen}
          onOpenChange={setAddItemDialogOpen}
          initialName={newItemInitialName}
          onItemAdded={handleItemAdded}
        />
      )}
    </form>
  );
}
