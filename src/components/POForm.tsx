import * as React from "react";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  CalendarIcon,
  Plus,
  Trash2,
  Save,
  UserPlus,
  Package
} from "lucide-react";
import { toast } from "sonner";

import { queryClient, useRpcQuery } from "../lib/query";
import { client } from "../services/rpc";
import { cn } from "../utils/cn";
import { toNum } from "../utils/math";

import { Field } from "./Field";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Label } from "../ui/label";
import { Autocomplete } from "../ui/autocomplete";
import { AddItemDialog } from "./AddItemForm";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

// Schemas matching the backend
const vendorSchema = z.object({
  name: z.string().min(2, "Name is required"),
  gstNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const poItemSchema = z.object({
  id: z.number().optional(),
  itemName: z.string().min(2, "Item name is required"),
  category: z.string().optional(),
  unit: z.string().optional(),
  orderedQty: z.coerce.number().min(0.01, "Qty must be > 0"),
  unitRate: z.coerce.number().min(0, "Rate must be >= 0"),
  gstPercent: z.coerce.number().min(0).default(0),
});

const poSchema = z.object({
  poNo: z.string().optional(),
  poDate: z.string().min(1, "Date is required"),
  vendorId: z.coerce.number().positive("Vendor is required"),
  remarks: z.string().optional(),
  items: z.array(poItemSchema).min(1, "At least one item is required"),
});

type POFormValues = z.infer<typeof poSchema>;
type VendorFormValues = z.infer<typeof vendorSchema>;

interface POFormProps {
  mode: "new" | "edit";
  poId?: number;
  initialData?: any;
}

export function POForm({ mode, poId, initialData }: POFormProps) {
  const navigate = useNavigate();
  const [vendorDialogOpen, setVendorDialogOpen] = React.useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = React.useState(false);
  const [newItemInitialName, setNewItemInitialName] = React.useState("");

  // Fetch vendors
  const { data: vendors = [] } = useRpcQuery(["vendors"], () => client.vendors.$get());

  const vendorOptions = React.useMemo(() => {
    return (vendors as any[])
      .filter((v: any) => v.active || String(v.id) === String(initialData?.vendorId))
      .map((v: any) => [String(v.id), v.name] as [string, string]);
  }, [vendors, initialData]);

  // Fetch items catalog
  const { data: itemsCatalog = [] } = useRpcQuery<any[]>(["items"], () => client.items.$get());

  // Fetch registered master unit types
  const { data: unitTypes = [] } = useRpcQuery<any[]>(
    ["unit-types"],
    () => client["unit-types"].$get()
  );

  // Fetch registered master unit conversions
  const { data: unitConversions = [] } = useRpcQuery<any[]>(
    ["unit-conversions"],
    () => client["unit-conversions"].$get()
  );

  const getConversionFactor = React.useCallback(
    (fromSymbol: string, toSymbol: string) => {
      if (!fromSymbol || !toSymbol || fromSymbol === toSymbol) return 1;
      const fromU = (unitTypes as any[]).find((u) => u.symbol === fromSymbol || u.name === fromSymbol);
      const toU = (unitTypes as any[]).find((u) => u.symbol === toSymbol || u.name === toSymbol);
      if (!fromU || !toU || !(unitConversions as any[]) || (unitConversions as any[]).length === 0) return 1;

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

      return 1;
    },
    [unitTypes, unitConversions]
  );

  const itemOptions = React.useMemo(() => {
    return (itemsCatalog as any[]).map((it: any) => [it.name, it.name] as [string, string]);
  }, [itemsCatalog]);

  const form = useForm<POFormValues>({
    // @ts-ignore
    resolver: zodResolver(poSchema),
    defaultValues: {
      poNo: "",
      poDate: format(new Date(), "yyyy-MM-dd"),
      vendorId: 0,
      remarks: "",
      items: [{ itemName: "", category: "", unit: "", orderedQty: 1, unitRate: 0, gstPercent: 0 }],
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
      form.setValue(`items.${lastIndex}.itemName` as const, newItem.name);
      form.setValue(`items.${lastIndex}.category` as const, newItem.category || newItem.itemTypeName || "");
      form.setValue(`items.${lastIndex}.unit` as const, newItem.unit || "");
      form.setValue(`items.${lastIndex}.unitRate` as const, Number(newItem.rate || 0));
      form.setValue(`items.${lastIndex}.gstPercent` as const, Number(newItem.gstPercent || 0));
    } else {
      append({
        itemName: newItem.name,
        category: newItem.category || newItem.itemTypeName || "",
        unit: newItem.unit || "",
        orderedQty: 1,
        unitRate: Number(newItem.rate || 0),
        gstPercent: Number(newItem.gstPercent || 0),
      });
    }
  };

  // Populate form with server data in edit mode.
  // Items from Postgres `numeric` columns come back as strings — coerce to numbers.
  const prevPoIdRef = React.useRef<number | undefined>(undefined);
  React.useEffect(() => {
    if (initialData && poId !== prevPoIdRef.current) {
      prevPoIdRef.current = poId;
      form.reset({
        poNo: initialData.poNo || "",
        poDate: initialData.poDate || format(new Date(), "yyyy-MM-dd"),
        vendorId: Number(initialData.vendorId) || 0,
        remarks: initialData.remarks || "",
        items: (initialData.items || []).map((item: any) => ({
          id: item.id,
          itemName: item.itemName || "",
          category: item.category || "",
          unit: item.unit || "",
          orderedQty: toNum(item.orderedQty) || 0,
          unitRate: toNum(item.unitRate) || 0,
          gstPercent: toNum(item.gstPercent) || 0,
        })),
      });
    }
  }, [initialData, poId, form]);

  const vendorForm = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: "", gstNumber: "", contactPerson: "", phone: "", address: ""
    }
  });

  // Real-time watch fields for calculations
  const watchedItems = useWatch({ control: form.control, name: "items" }) || [];

  const { subtotal, totalGst, computedTotal } = React.useMemo(() => {
    let sub = 0;
    let gstSum = 0;

    for (const item of watchedItems) {
      const qty = toNum(item?.orderedQty);
      const rate = toNum(item?.unitRate);
      const gst = toNum(item?.gstPercent);

      const lineBase = qty * rate;
      const lineGst = lineBase * (gst / 100);

      sub += lineBase;
      gstSum += lineGst;
    }

    return {
      subtotal: sub,
      totalGst: gstSum,
      computedTotal: sub + gstSum,
    };
  }, [watchedItems]);

  const mutation = useMutation({
    mutationFn: async (data: POFormValues) => {
      if (mode === "new") {
        return client["purchase-orders"].$post({ json: data });
      } else {
        return client["purchase-orders"][":id"].$patch({
          param: { id: String(poId) },
          json: data,
        } as any);
      }
    },
    onSuccess: async (res) => {
      if (res.ok) {
        toast.success(mode === "new" ? "Purchase order created" : "Purchase order updated");
        await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        if (poId) await queryClient.invalidateQueries({ queryKey: ["purchase-orders", String(poId)] });

        const data = await res.json();
        navigate({ to: "/purchases/purchase-orders", search: { page: 1, limit: 10 } });
      } else {
        const errorData = await (res.json() as Promise<any>).catch(() => ({}));
        toast.error(errorData.error || "Failed to save purchase order");
      }
    },
  });

  const vendorMutation = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      return client.vendors.$post({ json: data });
    },
    onSuccess: async (res) => {
      if (res.ok) {
        toast.success("Vendor created successfully");
        await queryClient.invalidateQueries({ queryKey: ["vendors"] });
        setVendorDialogOpen(false);
        const newVendor = await res.json();
        form.setValue("vendorId", newVendor.id, { shouldValidate: true });
        vendorForm.reset();
      } else {
        toast.error("Failed to create vendor");
      }
    }
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  const onFormError = (errors: any) => {
    console.error("PO Form validation errors:", errors);
    const messages: string[] = [];

    if (errors.poDate?.message) messages.push(`PO Date: ${errors.poDate.message}`);
    if (errors.vendorId?.message) messages.push(`Vendor: ${errors.vendorId.message}`);
    if ((errors as any).paymentTerms?.message) messages.push(`Payment Terms: ${(errors as any).paymentTerms.message}`);
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
    <form onSubmit={form.handleSubmit(onSubmit as any, onFormError)} className="space-y-6">
      {/* Validation Error Banner */}
      {Object.keys(form.formState.errors).length > 0 && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs space-y-1">
          <div className="font-semibold text-sm mb-1">Form Validation Errors</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {form.formState.errors.vendorId && <li>Vendor: {String(form.formState.errors.vendorId.message)}</li>}
            {form.formState.errors.poDate && <li>PO Date: {String(form.formState.errors.poDate.message)}</li>}
            {(form.formState.errors as any).paymentTerms && <li>Payment Terms: {String((form.formState.errors as any).paymentTerms.message)}</li>}
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
      <Card>
        <CardHeader>
          <CardTitle>{mode === "new" ? "Create Purchase Order" : "Edit Purchase Order"}</CardTitle>
          <CardDescription>Enter the PO header details</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3 items-end">
          {/* PO Number */}
          <div className="flex flex-col">
            <Field
              label="PO Number"
              placeholder={mode === "new" ? "Custom PO No (or leave empty to auto-generate)" : "PO Number"}
              {...form.register("poNo")}
              error={form.formState.errors.poNo?.message}
            />
          </div>

          {/* PO Date */}
          <div className="flex flex-col space-y-2">
            <Label>PO Date <span className="text-destructive">*</span></Label>
            <Controller
              control={form.control}
              name="poDate"
              render={({ field, fieldState }) => (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background px-3",
                          !field.value && "text-muted-foreground",
                          fieldState.error && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick PO date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                      />
                    </PopoverContent>
                  </Popover>
                  {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                </>
              )}
            />
          </div>

          {/* Vendor */}
          <div className="flex flex-col">
            <Label>Vendor <span className="text-destructive">*</span></Label>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <Controller
                  control={form.control}
                  name="vendorId"
                  render={({ field, fieldState }) => (
                    <Autocomplete
                      label=""
                      placeholder="Select a vendor..."
                      value={field.value ? String(field.value) : ""}
                      options={vendorOptions}
                      onChange={(val) => field.onChange(val ? parseInt(val, 10) : 0)}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </div>
              <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" type="button" size="icon" className="shrink-0 mt-px" title="Add Vendor">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Vendor</DialogTitle>
                    <DialogDescription>Create a new vendor profile quickly.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Field label="Vendor Name *" {...vendorForm.register("name")} error={vendorForm.formState.errors.name?.message} />
                    <Field label="Contact Person" {...vendorForm.register("contactPerson")} />
                    <Field label="Phone" {...vendorForm.register("phone")} />
                    <Field label="GST Number" {...vendorForm.register("gstNumber")} />
                    <Field label="Address" {...vendorForm.register("address")} />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => setVendorDialogOpen(false)}>Cancel</Button>
                    <Button type="button" onClick={vendorForm.handleSubmit((values) => vendorMutation.mutate(values))} disabled={vendorMutation.isPending}>
                      Save Vendor
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Remarks */}
          <div className="md:col-span-2">
            <Field
              label="Remarks"
              {...form.register("remarks")}
              placeholder="Any additional notes..."
              error={form.formState.errors.remarks?.message}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Item Details </CardTitle>
            <CardDescription>Add items to be ordered.</CardDescription>
          </div>
          <AddItemDialog
            open={addItemDialogOpen}
            onOpenChange={setAddItemDialogOpen}
            initialName={newItemInitialName}
            onItemAdded={handleItemAdded}
            trigger={
              <Button type="button" variant="outline" className="h-8 px-3 text-xs gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New Item
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Grid Header (visible on lg screens) */}
          <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-2 bg-muted/40 text-xs font-semibold text-muted-foreground uppercase rounded-md items-baseline">
            <div className="col-span-3">Item Name *</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1">Unit</div>
            <div className="col-span-1 text-right">Qty *</div>
            <div className="col-span-2 text-right">Rate (₹) *</div>
            <div className="col-span-1 text-right">GST %</div>
            <div className="col-span-2 text-right pr-2">Line Value</div>
          </div>

          {/* Grid Rows */}
          <div className="space-y-3">
            {fields.map((field, index) => {
              const qty = toNum(watchedItems[index]?.orderedQty);
              const rate = toNum(watchedItems[index]?.unitRate);
              const gst = toNum(watchedItems[index]?.gstPercent);
              const lineValue = qty * rate * (1 + gst / 100);

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-12 gap-3 items-baseline p-3.5 rounded-lg border bg-card hover:bg-muted/5 transition-colors shadow-xs"
                >
                  {/* Item Name */}
                  <div className="col-span-12 lg:col-span-3">
                    <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Item Name *</label>
                    <Controller
                      control={form.control}
                      name={`items.${index}.itemName` as const}
                      render={({ field, fieldState }) => (
                        <Autocomplete
                          label=""
                          placeholder="Type item name..."
                          value={field.value || ""}
                          options={itemOptions}
                          onChange={(val) => {
                            field.onChange(val);
                            const selectedItem = itemsCatalog.find((it: any) => it.name === val);
                            if (selectedItem) {
                              const purUnit = selectedItem.purchaseUnit || selectedItem.unit || "";
                              form.setValue(`items.${index}.unit` as const, purUnit);
                              form.setValue(`items.${index}.unitRate` as const, Number(selectedItem.rate || 0));
                              form.setValue(`items.${index}.category` as const, selectedItem.itemTypeName || "");
                              form.setValue(`items.${index}.gstPercent` as const, Number(selectedItem.gstPercent || 0));
                            }
                          }}
                          error={fieldState.error?.message}
                          className="w-full"
                        />
                      )}
                    />
                  </div>

                  {/* Category */}
                  <div className="col-span-6 sm:col-span-3 lg:col-span-2">
                    <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Category</label>
                    <Field
                      placeholder="Category"
                      readOnly
                      {...form.register(`items.${index}.category` as const)}
                      className="w-full text-sm"
                    />
                  </div>

                  {/* Unit */}
                  <div className="col-span-6 sm:col-span-3 lg:col-span-1">
                    <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Unit</label>
                    <select
                      className="flex h-10 w-full rounded-md border bg-background px-2 py-1 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      value={watchedItems[index]?.unit || ""}
                      onChange={(e) => {
                        const newUnit = e.target.value;
                        form.setValue(`items.${index}.unit` as const, newUnit);
                        const itemName = watchedItems[index]?.itemName;
                        const selectedItem = itemsCatalog.find((it: any) => it.name === itemName);
                        if (selectedItem) {
                          const baseUnit = selectedItem.purchaseUnit || selectedItem.unit || "unit";
                          const tier = selectedItem.unitPrices?.find((up: any) => up.unit === newUnit);
                          if (tier && Number(tier.costPrice) > 0) {
                            form.setValue(`items.${index}.unitRate` as const, Number(tier.costPrice));
                          } else if (newUnit === baseUnit) {
                            form.setValue(`items.${index}.unitRate` as const, Number(selectedItem.rate || 0));
                          } else {
                            const factor = getConversionFactor(newUnit, baseUnit);
                            if (factor > 0 && selectedItem.rate) {
                              form.setValue(`items.${index}.unitRate` as const, Number((Number(selectedItem.rate) * factor).toFixed(2)));
                            }
                          }
                        }
                      }}
                    >
                      {(() => {
                        const itemName = watchedItems[index]?.itemName;
                        const item = itemsCatalog.find((it: any) => it.name === itemName);
                        const currentUnit = watchedItems[index]?.unit;
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

                  {/* Qty */}
                  <div className="col-span-4 sm:col-span-2 lg:col-span-1">
                    <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Qty *</label>
                    <Field
                      type="number"
                      step="0.01"
                      placeholder="Qty"
                      {...form.register(`items.${index}.orderedQty` as const)}
                      error={form.formState.errors.items?.[index]?.orderedQty?.message}
                      className="w-full text-right"
                    />
                  </div>

                  {/* Cost Rate */}
                  <div className="col-span-4 sm:col-span-2 lg:col-span-2">
                    <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">Cost Rate (₹) *</label>
                    <Field
                      type="number"
                      step="0.01"
                      placeholder="Rate"
                      {...form.register(`items.${index}.unitRate` as const)}
                      error={form.formState.errors.items?.[index]?.unitRate?.message}
                      className="w-full text-right"
                    />
                    {(() => {
                      const itemName = watchedItems[index]?.itemName;
                      const currentUnit = watchedItems[index]?.unit;
                      const item = itemsCatalog.find((it: any) => it.name === itemName);
                      if (!item) return null;

                      let estSale = 0;

                      // 1. Check item unitPrices tiers first for matching unit
                      if (currentUnit && item.unitPrices && Array.isArray(item.unitPrices)) {
                        const tier = item.unitPrices.find((up: any) => up.unit === currentUnit);
                        if (tier) {
                          if (Number(tier.salePrice) > 0) {
                            estSale = Number(tier.salePrice);
                          } else if (Number(tier.conversionFactor) > 0 && Number(item.salePrice) > 0) {
                            estSale = Number((Number(item.salePrice) * Number(tier.conversionFactor)).toFixed(2));
                          }
                        }
                      }

                      // 2. Fallback to base sale price with unit conversion factor
                      if (estSale <= 0) {
                        const baseSalePrice = Number(item.salePrice || 0);
                        const baseUnit = item.saleUnit || item.unit || "unit";
                        if (baseSalePrice > 0) {
                          if (!currentUnit || currentUnit === baseUnit) {
                            estSale = baseSalePrice;
                          } else {
                            const factor = getConversionFactor(currentUnit, baseUnit);
                            estSale = Number((baseSalePrice * factor).toFixed(2));
                          }
                        }
                      }

                      if (estSale <= 0) return null;
                      const displayUnit = currentUnit || item.saleUnit || item.unit || "unit";

                      return (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold text-right mt-0.5">
                          Est. Sale: ₹{estSale}/{displayUnit}
                        </div>
                      );
                    })()}
                  </div>

                  {/* GST % */}
                  <div className="col-span-4 sm:col-span-2 lg:col-span-1">
                    <label className="text-xs text-muted-foreground font-medium mb-1 block lg:hidden">GST %</label>
                    <Field
                      type="number"
                      step="0.01"
                      placeholder="GST"
                      {...form.register(`items.${index}.gstPercent` as const)}
                      error={form.formState.errors.items?.[index]?.gstPercent?.message}
                      className="w-full text-right"
                    />
                  </div>


                  {/* Line Value & Delete Action */}
                  <div className="col-span-12 lg:col-span-2 flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/50">
                    <div className="flex flex-col lg:items-end">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold lg:hidden">Line Value</span>
                      <span className="font-semibold text-sm text-foreground">
                        {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(lineValue)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      title="Delete Row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Summary Row & Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-lg bg-muted/30 border mt-4 gap-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ itemName: "", category: "", unit: "", orderedQty: 1, unitRate: 0, gstPercent: 0 })}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Line Item Row
              </Button>
              {/* <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setNewItemInitialName("");
                  setAddItemDialogOpen(true);
                }}
              >
                <Package className="h-4 w-4 mr-2 text-primary" /> Create New Item Master
              </Button> */}
            </div>

            <div className="flex flex-col items-end gap-1 self-end sm:self-auto text-right">
              <div className="flex items-center justify-between gap-6 text-xs text-muted-foreground">
                <span>Subtotal (Excl. GST):</span>
                <span className="font-semibold text-foreground">
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-6 text-xs text-muted-foreground">
                <span>Total GST:</span>
                <span className="font-semibold text-foreground">
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalGst)}
                </span>
              </div>
              <div className="flex items-baseline gap-3 pt-1 border-t mt-1">
                <span className="font-bold uppercase text-xs text-muted-foreground">Total Order Value:</span>
                <span className="font-bold text-xl text-primary">
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(computedTotal)}
                </span>
              </div>
            </div>
          </div>
          {form.formState.errors.items?.root && (
            <p className="text-sm text-destructive mt-2">{form.formState.errors.items.root.message}</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" type="button" onClick={() => navigate({ to: "/purchases/purchase-orders", search: { page: 1, limit: 10 } })}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          <Save className="h-4 w-4 mr-2" /> {mode === "new" ? "Create PO" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
