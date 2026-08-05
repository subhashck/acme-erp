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
  unit: z.string().optional().nullable(),
  receivedQty: z.coerce.number().min(0.01, "Must be > 0"),
  freeQty: z.coerce.number().min(0, "Must be >= 0").default(0),
  unitRate: z.coerce.number().min(0, "Must be >= 0"),
  salePrice: z.coerce.number().min(0, "Must be >= 0").default(0),
  gstPercent: z.coerce.number().min(0, "Must be >= 0").default(0),
  batch: z.string().min(1, "Batch No is required"),
  expiryDate: z.string().min(1, "Expiry Date is required"),
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

  const { data: unitTypes = [] } = useRpcQuery<any[]>(
    ["unit-types"],
    () => client["unit-types"].$get()
  );

  const { data: unitConversions = [] } = useRpcQuery<any[]>(
    ["unit-conversions"],
    () => client["unit-conversions"].$get()
  );

  const getConversionFactor = React.useCallback(
    (fromSymbol: string, toSymbol: string) => {
      if (!fromSymbol || !toSymbol) return 0;
      if (fromSymbol === toSymbol) return 1;
      const fromU = (unitTypes as any[]).find((u) => u.symbol === fromSymbol || u.name === fromSymbol);
      const toU = (unitTypes as any[]).find((u) => u.symbol === toSymbol || u.name === toSymbol);
      if (!fromU || !toU || !(unitConversions as any[]) || (unitConversions as any[]).length === 0) return 0;

      const fId = Number(fromU.id);
      const tId = Number(toU.id);

      const direct = (unitConversions as any[]).find(
        (c: any) => Number(c.fromUnitId) === fId && Number(c.toUnitId) === tId
      );
      if (direct && Number(direct.multiplier) > 0) return Number(direct.multiplier);

      const inverse = (unitConversions as any[]).find(
        (c: any) => Number(c.fromUnitId) === tId && Number(c.toUnitId) === fId
      );
      if (inverse && Number(inverse.multiplier) > 0) return 1 / Number(inverse.multiplier);

      return 0;
    },
    [unitTypes, unitConversions]
  );

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
        unit: item.unit || item.item?.purchaseUnit || item.item?.unit || "",
        receivedQty: toNum(item.receivedQty),
        freeQty: toNum(item.freeQty),
        unitRate: toNum(item.unitRate) || (item.poItem ? toNum(item.poItem.unitRate) : 0),
        salePrice: toNum(item.salePrice) || (item.item ? toNum(item.item.salePrice) : 0),
        gstPercent: toNum(item.gstPercent) || (item.poItem ? toNum(item.poItem.gstPercent) : 0),
        batch: item.batch || "",
        expiryDate: item.expiryDate || "",
        notes: item.notes || "",
      })) || [],
    },
  });

  const { fields, append, insert, remove } = useFieldArray({
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
      form.setValue(`items.${lastIndex}.unit`, newItem.purchaseUnit || newItem.unit || "");
      form.setValue(`items.${lastIndex}.unitRate`, Number(newItem.rate || 0));
      form.setValue(`items.${lastIndex}.salePrice`, Number(newItem.salePrice || 0));
      form.setValue(`items.${lastIndex}.gstPercent`, Number(newItem.gstPercent || 0));
    } else {
      append({
        itemId: newItem.id,
        itemName: newItem.name,
        unit: newItem.purchaseUnit || newItem.unit || "",
        receivedQty: 1,
        freeQty: 0,
        unitRate: Number(newItem.rate || 0),
        salePrice: Number(newItem.salePrice || 0),
        gstPercent: Number(newItem.gstPercent || 0),
        batch: "",
        expiryDate: "",
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
        unit: item.unit || null,
        receivedQty: toNum(item.receivedQty),
        freeQty: toNum(item.freeQty),
        unitRate: toNum(item.unitRate),
        salePrice: toNum(item.salePrice),
        gstPercent: toNum(item.gstPercent),
        batch: item.batch || null,
        expiryDate: item.expiryDate || null,
        notes: item.notes || null,
      })),
    };

    mutation.mutate(payload);
  };

  const onFormError = (errors: any) => {
    console.error("GRN edit validation errors:", errors);
    const messages: string[] = [];

    if (errors.grnDate?.message) messages.push(`GRN Date: ${errors.grnDate.message}`);
    if (errors.vendorId?.message) messages.push(`Vendor: ${errors.vendorId.message}`);
    if (errors.noPoReason?.message) messages.push(`Reason: ${errors.noPoReason.message}`);
    if (errors.remarks?.message) messages.push(`Remarks: ${errors.remarks.message}`);
    if (errors.items?.message || errors.items?.root?.message) {
      messages.push(`Items: ${errors.items?.message || errors.items?.root?.message}`);
    }

    if (Array.isArray(errors.items)) {
      errors.items.forEach((itemErr: any, idx: number) => {
        if (!itemErr) return;
        Object.keys(itemErr).forEach((key) => {
          if (itemErr[key]?.message) {
            messages.push(`Item #${idx + 1} (${key}): ${itemErr[key].message}`);
          }
        });
      });
    }

    if (messages.length > 0) {
      toast.error(
        <div>
          <div className="font-semibold mb-1">Please fix validation errors:</div>
          <ul className="list-disc pl-4 text-xs space-y-0.5">
            {messages.slice(0, 5).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>,
        { duration: 5000 }
      );
    } else {
      toast.error("Form contains validation errors. Please check highlighted fields.");
    }
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {/* Validation Error Banner */}
      {Object.keys(form.formState.errors).length > 0 && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs space-y-1">
          <div className="font-semibold text-sm mb-1">Form Validation Errors</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {form.formState.errors.vendorId && <li>Vendor: {String(form.formState.errors.vendorId.message)}</li>}
            {form.formState.errors.noPoReason && <li>Reason: {String(form.formState.errors.noPoReason.message)}</li>}
            {form.formState.errors.grnDate && <li>GRN Date: {String(form.formState.errors.grnDate.message)}</li>}
            {form.formState.errors.items?.message && <li>Items: {String(form.formState.errors.items.message)}</li>}
            {Array.isArray(form.formState.errors.items) &&
              form.formState.errors.items.map((itemErr: any, idx: number) => {
                if (!itemErr) return null;
                return Object.keys(itemErr).map((key) => (
                  <li key={`${idx}-${key}`}>
                    Item #{idx + 1} ({key}): {String(itemErr[key]?.message)}
                  </li>
                ));
              })}
          </ul>
        </div>
      )}
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
            <CardTitle>Received Items & Batches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="hidden lg:grid grid-cols-12 gap-2 px-3 py-2 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase rounded-md items-center">
              <div className="col-span-2">Item Name *</div>
              <div className="col-span-1">Unit</div>
              <div className="col-span-1 text-right">Recv Qty</div>
              <div className="col-span-1 text-right">Free Qty</div>
              <div className="col-span-1 text-right">Cost Rate (₹)</div>
              <div className="col-span-1 text-right">Sale Price (₹)</div>
              <div className="col-span-1 text-right">GST %</div>
              <div className="col-span-2">Batch No *</div>
              <div className="col-span-2">Expiry Date *</div>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => {
                const currentItemName = form.watch(`items.${index}.itemName`);
                const isPoLinkedItem = form.watch(`items.${index}.poItemId`);
                
                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border bg-card hover:bg-muted/5 transition-colors shadow-xs group"
                  >
                    <div className="col-span-12 lg:col-span-2 relative" style={{ zIndex: 50 - index }}>
                      <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Item Name *</label>
                      {isPoLinkedItem || !isDirect ? (
                        <span className="font-medium px-2 py-1 bg-muted/30 rounded text-sm">{currentItemName}</span>
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
                              form.setValue(`items.${index}.unit`, selected.purchaseUnit || selected.unit || "");
                              form.setValue(`items.${index}.unitRate`, Number(selected.rate || 0));
                              form.setValue(`items.${index}.salePrice`, Number(selected.salePrice || 0));
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
                      <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Unit</label>
                      <select
                        className="flex h-10 w-full rounded-md border bg-background px-2 py-1 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                        disabled={!isDraft}
                        value={form.watch(`items.${index}.unit`) || ""}
                        onChange={(e) => {
                          const newUnit = e.target.value;
                          form.setValue(`items.${index}.unit`, newUnit);
                          const itemName = form.watch(`items.${index}.itemName`);
                          const selectedItem = itemsCatalog.find((it: any) => it.name === itemName);
                          if (selectedItem) {
                            const baseUnit = selectedItem.purchaseUnit || selectedItem.unit || "";
                            const tier = selectedItem.unitPrices?.find((up: any) => up.unit === newUnit);
                            if (tier && (Number(tier.costPrice) > 0 || Number(tier.salePrice) > 0)) {
                              form.setValue(`items.${index}.unitRate`, Number(tier.costPrice || 0));
                              form.setValue(`items.${index}.salePrice`, Number(tier.salePrice || 0));
                            } else if (newUnit && baseUnit && newUnit === baseUnit) {
                              form.setValue(`items.${index}.unitRate`, Number(selectedItem.rate || 0));
                              form.setValue(`items.${index}.salePrice`, Number(selectedItem.salePrice || 0));
                            } else {
                              const factor = getConversionFactor(newUnit, baseUnit);
                              if (factor > 0) {
                                form.setValue(`items.${index}.unitRate`, Number((Number(selectedItem.rate || 0) * factor).toFixed(2)));
                                form.setValue(`items.${index}.salePrice`, Number((Number(selectedItem.salePrice || 0) * factor).toFixed(2)));
                              } else {
                                form.setValue(`items.${index}.unitRate`, 0);
                                form.setValue(`items.${index}.salePrice`, 0);
                              }
                            }
                          }
                        }}
                      >
                        {(() => {
                          const currentItemName = form.watch(`items.${index}.itemName`);
                          const item = itemsCatalog.find((it: any) => it.name === currentItemName);
                          const currentUnit = form.watch(`items.${index}.unit`);
                          const unitsSet = new Set<string>();
                          if (currentUnit) unitsSet.add(currentUnit);
                          if (item?.unit) unitsSet.add(item.unit);
                          if (item?.purchaseUnit) unitsSet.add(item.purchaseUnit);
                          if (item?.saleUnit) unitsSet.add(item.saleUnit);
                          if (item?.unitPrices && Array.isArray(item.unitPrices)) {
                            item.unitPrices.forEach((up: any) => { if (up.unit) unitsSet.add(up.unit); });
                          }
                          (unitTypes as any[]).forEach((ut: any) => {
                            const u = ut.symbol || ut.name;
                            if (u) unitsSet.add(u);
                          });
                          const opts = Array.from(unitsSet);
                          if (opts.length === 0) return <option value="">Unit</option>;
                          return opts.map((u) => <option key={u} value={u}>{u}</option>);
                        })()}
                      </select>
                    </div>
                    <div className="col-span-6 lg:col-span-1">
                      <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Recv Qty</label>
                      <Field
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right text-xs"
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
                        className="text-right text-xs"
                        {...form.register(`items.${index}.freeQty`)}
                      />
                    </div>
                    <div className="col-span-6 lg:col-span-1">
                      <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Cost Rate</label>
                      <Field
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right text-xs"
                        {...form.register(`items.${index}.unitRate`)}
                      />
                    </div>
                    <div className="col-span-6 lg:col-span-1">
                      <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Sale Price</label>
                      <Field
                        type="number"
                        min="0"
                        step="0.01"
                        className="text-right text-xs"
                        {...form.register(`items.${index}.salePrice`)}
                      />
                    </div>
                    <div className="col-span-6 lg:col-span-1">
                      <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">GST %</label>
                      <Field
                        type="number"
                        min="0"
                        step="0.1"
                        className="text-right text-xs"
                        {...form.register(`items.${index}.gstPercent`)}
                      />
                    </div>
                    <div className="col-span-6 lg:col-span-2">
                      <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Batch No</label>
                      <Field
                        type="text"
                        placeholder="Batch No"
                        className="text-xs"
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
                                    "w-full justify-start text-left font-normal bg-background px-2 h-9 text-xs",
                                    !field.value && "text-muted-foreground",
                                    fieldState.error && "border-destructive"
                                  )}
                                  disabled={!isDraft}
                                >
                                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  {field.value ? format(new Date(field.value), "yyyy-MM-dd") : <span>Date</span>}
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
                    <div className="col-span-12 flex flex-wrap items-center justify-between gap-2 text-xs border-t pt-2 mt-1 bg-muted/20 px-3 py-1.5 rounded-md">
                      {(() => {
                        const rcv = toNum(form.watch(`items.${index}.receivedQty`));
                        const free = toNum(form.watch(`items.${index}.freeQty`));
                        const rate = toNum(form.watch(`items.${index}.unitRate`));
                        const gst = toNum(form.watch(`items.${index}.gstPercent`));
                        const totalPhysical = rcv + free;
                        const lineSubtotal = rcv * rate;
                        const lineNet = lineSubtotal * (1 + gst / 100);
                        const effectiveCost = totalPhysical > 0 ? lineSubtotal / totalPhysical : 0;
                        const unitStr = form.watch(`items.${index}.unit`) || "units";

                        return (
                          <>
                            <div className="flex flex-wrap items-center gap-3 text-muted-foreground">
                              <span>
                                Total Recv: <strong className="text-foreground font-semibold">{totalPhysical}</strong> {unitStr} ({rcv} paid + {free} free)
                              </span>
                              {free > 0 && (
                                <span className="text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-100/60 dark:bg-emerald-950/60 px-2 py-0.5 rounded text-[11px]">
                                  Effective Cost: ₹{effectiveCost.toFixed(2)} / {unitStr}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">
                                Line Total: <strong className="text-foreground font-semibold">₹{lineNet.toFixed(2)}</strong>
                              </span>
                              {isDraft && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-7 text-xs text-primary px-2"
                                    onClick={() => {
                                      const cur = form.getValues(`items.${index}`);
                                      insert(index + 1, {
                                        poItemId: cur.poItemId || null,
                                        itemId: cur.itemId || null,
                                        itemName: cur.itemName,
                                        unit: cur.unit,
                                        receivedQty: 1,
                                        freeQty: 0,
                                        unitRate: cur.unitRate,
                                        salePrice: cur.salePrice,
                                        gstPercent: cur.gstPercent,
                                        batch: "",
                                        expiryDate: "",
                                      });
                                    }}
                                  >
                                    <Plus className="h-3 w-3 mr-1" /> Add Extra Batch
                                  </Button>
                                  {fields.length > 1 && (
                                    <Button 
                                      type="button" 
                                      variant="ghost" 
                                      onClick={() => remove(index)}
                                      className="h-7 text-xs text-destructive px-2"
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" /> Remove
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
            {isDraft && isDirect && (
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ itemName: "", unit: "", receivedQty: 1, freeQty: 0, unitRate: 0, salePrice: 0, gstPercent: 0, batch: "", expiryDate: "" })}
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
              onClick={form.handleSubmit(
                (values) => onSubmit(values as unknown as DirectGRNFormValues, "draft"),
                onFormError
              )}
            >
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </Button>
            <Button 
              type="button" 
              disabled={mutation.isPending}
              onClick={form.handleSubmit(
                (values) => onSubmit(values as unknown as DirectGRNFormValues, "posted"),
                onFormError
              )}
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
