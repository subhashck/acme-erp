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
  ChevronLeft, Loader2, Save, Send, Plus, Trash2, CalendarIcon
} from "lucide-react";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Field } from "@/components/Field";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/utils/cn";
import { Autocomplete } from "@/ui/autocomplete";
import { AddItemDialog } from "@/components/AddItemForm";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const grnItemFormSchema = z.object({
  itemId: z.number().int().positive().optional(),
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
  noPoReason: z.string().min(3, "Reason for no PO is required"),
  dateOfDelivery: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  items: z.array(grnItemFormSchema).min(1, "At least one item is required"),
});

type DirectGRNFormValues = z.infer<typeof directGrnFormSchema>;

export const Route = createFileRoute("/_authenticated/purchases/grns/new")({
  component: NewDirectGRNRoute,
});

function NewDirectGRNRoute() {
  const navigate = useNavigate();
  const defaultGrnDate = format(new Date(), "yyyy-MM-dd");

  const { data: vendors = [] } = useRpcQuery(["vendors"], () => client.vendors.$get());
  const vendorOptions = React.useMemo(() => {
    return (vendors as any[])
      .filter((v: any) => v.active)
      .map((v: any) => [String(v.id), v.name] as [string, string]);
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
      grnNo: "",
      grnDate: defaultGrnDate,
      vendorId: 0,
      noPoReason: "",
      dateOfDelivery: defaultGrnDate,
      remarks: "",
      items: [{ itemName: "", receivedQty: 1, freeQty: 0, unitRate: 0, gstPercent: 0 }],
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
      const res = await (client.grns as any).$post({ json: data });
      if (!res.ok) {
        const errorData = await (res.json() as Promise<any>).catch(() => ({}));
        throw new Error(errorData.error || "Failed to record GRN");
      }
      return res.json();
    },
    onSuccess: async () => {
      toast.success("Direct GRN recorded successfully");
      await queryClient.invalidateQueries({ queryKey: ["grns"] });
      navigate({ to: "/purchases/grns" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record GRN");
    },
  });

  const onSubmit = (values: DirectGRNFormValues, targetStatus: string = "draft") => {
    if (targetStatus === 'posted') {
      const confirmedPost = window.confirm("Are you sure you want to POST this GRN? This action will update inventory and cannot be undone directly.");
      if (!confirmedPost) return;
    }

    const payload = {
      ...values,
      status: targetStatus,
      grnNo: values.grnNo || null,
      noPoReason: values.noPoReason,
      dateOfDelivery: values.dateOfDelivery || null,
      remarks: values.remarks || null,
      items: values.items.map(item => ({
        itemId: item.itemId || null,
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
    <ModuleLayout
      title="Create Direct GRN"
      description="Create a Goods Receipt Note directly without a Purchase Order."
      action={
        <Link to="/purchases/grns">
          <Button variant="outline">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to List
          </Button>
        </Link>
      }
    >
      <div className="max-w-6xl mx-auto py-6">
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
          {/* Header Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Direct GRN Details</CardTitle>
              <CardDescription>Enter details and mandatory reason for direct GRN.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <Field
                label="GRN Number"
                placeholder="Leave blank to auto-generate (DIRECT-GRN...)"
                {...form.register("grnNo")}
                error={form.formState.errors.grnNo?.message}
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
                <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Vendor <span className="text-destructive">*</span>
                </span>
                <Controller
                  control={form.control}
                  name="vendorId"
                  render={({ field, fieldState }) => (
                    <Autocomplete
                      label=""
                      options={vendorOptions}
                      value={field.value ? String(field.value) : ""}
                      onChange={(val) => field.onChange(val ? parseInt(val, 10) : 0)}
                      placeholder="Select Vendor..."
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </div>

              <Field
                label="Reason for no PO"
                placeholder="Mandatory explanation..."
                {...form.register("noPoReason")}
                error={form.formState.errors.noPoReason?.message}
                className="md:col-span-2"
              />
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
                <div className="col-span-1"></div>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => {
                  const currentItemName = form.watch(`items.${index}.itemName`);
                  return (
                    <div
                      key={field.id}
                      className="grid grid-cols-12 gap-3 items-center p-3.5 rounded-lg border bg-card hover:bg-muted/5 transition-colors shadow-xs group"
                    >
                      <div className="col-span-12 lg:col-span-3 relative" style={{ zIndex: 50 - index }}>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Item Name *</label>
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
                          allowCustomValue={true}
                        />
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
                        />
                      </div>
                      <div className="col-span-6 lg:col-span-1">
                        <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">GST %</label>
                        <Field
                          type="number"
                          min="0"
                          step="0.1"
                          {...form.register(`items.${index}.gstPercent`)}
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
                                      "w-full justify-start text-left font-normal bg-background px-3 h-9",
                                      !field.value && "text-muted-foreground",
                                      fieldState.error && "border-destructive"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                    {field.value ? format(new Date(field.value), "yyyy-MM-dd") : <span>Pick date</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    captionLayout="dropdown"
                                    // Set the start and end boundaries (e.g., 1900 to 2050)
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
                      <div className="col-span-12 lg:col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="h-8 w-8 p-0 text-destructive lg:opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ itemName: "", receivedQty: 1, freeQty: 0, unitRate: 0, gstPercent: 0 })}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </CardContent>
          </Card>

          {/* Form Submission Actions */}
          <div className="flex justify-end gap-4">
            <Link to="/purchases/grns">
              <Button variant="outline" type="button">
                Cancel
              </Button>
            </Link>
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
          </div>
        </form>

        <AddItemDialog
          open={addItemDialogOpen}
          onOpenChange={setAddItemDialogOpen}
          initialName={newItemInitialName}
          onItemAdded={handleItemAdded}
        />
      </div>
    </ModuleLayout>
  );
}
