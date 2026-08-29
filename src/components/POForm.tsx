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
  Minus,
  Trash2,
  Save,
  UserPlus,
  Package,
  Building2,
  ShoppingCart,
  Receipt,
  Sparkles,
  Info,
  Loader2,
  ChevronLeft,
  CalendarCheck,
  Tag,
  Boxes,
  Trash2Icon,
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
import { Input } from "../ui/input";
import { Autocomplete } from "../ui/autocomplete";
import { AddItemDialog } from "./AddItemForm";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Badge } from "../ui/badge";
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
      form.setValue(`items.${lastIndex}.unitRate` as const, mode === "new" ? 0 : Number(newItem.rate || 0));
      form.setValue(`items.${lastIndex}.gstPercent` as const, Number(newItem.gstPercent || 0));
    } else {
      append({
        itemName: newItem.name,
        category: newItem.category || newItem.itemTypeName || "",
        unit: newItem.unit || "",
        orderedQty: 1,
        unitRate: mode === "new" ? 0 : Number(newItem.rate || 0),
        gstPercent: Number(newItem.gstPercent || 0),
      });
    }
  };

  // Populate form with server data in edit mode.
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

  const { subtotal, totalGst, computedTotal, totalOrderedUnits, displayOrderedUnits } = React.useMemo(() => {
    let sub = 0;
    let gstSum = 0;
    let totalUnits = 0;
    const unitMap = new Map<string, number>();

    for (const item of watchedItems) {
      const qty = toNum(item?.orderedQty);
      const rate = toNum(item?.unitRate);
      const gst = toNum(item?.gstPercent);
      const unit = item?.unit?.trim() || "";

      const lineBase = qty * rate;
      const lineGst = lineBase * (gst / 100);

      sub += lineBase;
      gstSum += lineGst;
      totalUnits += qty;

      if (qty > 0) {
        const uLabel = unit || "Unit";
        unitMap.set(uLabel, (unitMap.get(uLabel) || 0) + qty);
      }
    }

    const unitParts: string[] = [];
    unitMap.forEach((qty, u) => {
      const formattedQty = qty % 1 === 0 ? qty : Number(qty.toFixed(2));
      unitParts.push(`${formattedQty} ${u}`);
    });

    let displayUnits = "0 Units";
    if (unitParts.length === 1) {
      displayUnits = unitParts[0];
    } else if (unitParts.length > 1) {
      const totalFormatted = totalUnits % 1 === 0 ? totalUnits : Number(totalUnits.toFixed(2));
      displayUnits = `${totalFormatted} Total (${unitParts.join(", ")})`;
    }

    return {
      subtotal: sub,
      totalGst: gstSum,
      computedTotal: sub + gstSum,
      totalOrderedUnits: totalUnits,
      displayOrderedUnits: displayUnits,
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
        toast.success(mode === "new" ? "Purchase order created successfully" : "Purchase order updated successfully");
        await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        if (poId) await queryClient.invalidateQueries({ queryKey: ["purchase-orders", String(poId)] });

        navigate({ to: "/purchases/purchase-orders", search: { page: 1, limit: 10 } });
      } else {
        const errorData = await (res.json() as Promise<any>).catch(() => ({}));
        toast.error(errorData.error || "Failed to save purchase order");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save purchase order");
    }
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val);
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit as any, onFormError)} className="space-y-6">
      {/* Validation Error Banner */}
      {Object.keys(form.formState.errors).length > 0 && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs space-y-1 shadow-xs animate-in fade-in duration-200">
          <div className="font-semibold text-sm mb-1 flex items-center gap-2">
            <Info className="h-4 w-4" /> Form Validation Errors
          </div>
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

      {/* PO Header Details Card */}
      <Card className="shadow-xs border">
        <CardHeader className="pb-4 border-b bg-muted/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {mode === "new" ? "New Purchase Order" : `Edit Purchase Order #${initialData?.poNo || poId}`}
                </CardTitle>
                <CardDescription className="text-xs">Specify PO number, order date, vendor, and terms</CardDescription>
              </div>
            </div>

            {mode === "edit" && initialData?.poNo && (
              <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">
                {initialData.poNo}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* PO Number */}
          <div className="flex flex-col space-y-1.5">
            <Label className="text-xs font-semibold">PO Number</Label>
            <Input
              placeholder={mode === "new" ? "Auto-generated (or custom)" : "PO Number"}
              {...form.register("poNo")}
              className="text-xs h-9 font-mono"
            />
            {form.formState.errors.poNo && (
              <p className="text-[11px] text-destructive">{form.formState.errors.poNo.message}</p>
            )}
          </div>

          {/* PO Date */}
          <div className="flex flex-col space-y-1.5">
            <Label className="text-xs font-semibold">PO Date <span className="text-destructive">*</span></Label>
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
                          "w-full justify-start text-left font-normal bg-background px-3 h-9 text-xs shadow-2xs font-mono",
                          !field.value && "text-muted-foreground",
                          fieldState.error && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
                  {fieldState.error && <p className="text-[11px] text-destructive">{fieldState.error.message}</p>}
                </>
              )}
            />
          </div>

          {/* Vendor */}
          <div className="flex flex-col space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold">Vendor <span className="text-destructive">*</span></Label>
            <div className="flex gap-2 items-start">
              <div className="flex-1">
                <Controller
                  control={form.control}
                  name="vendorId"
                  render={({ field, fieldState }) => (
                    <Autocomplete
                      label=""
                      placeholder="Search & select a vendor..."
                      value={field.value ? String(field.value) : ""}
                      options={vendorOptions}
                      onChange={(val) => field.onChange(val ? parseInt(val, 10) : 0)}
                      error={fieldState.error?.message}
                      className="w-full"
                    />
                  )}
                />
              </div>
              <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" type="button" size="icon" className="h-9 w-9 shrink-0 shadow-2xs" title="Create New Vendor">
                    <UserPlus className="h-4 w-4 text-primary" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" /> Add New Vendor
                    </DialogTitle>
                    <DialogDescription>Create a new vendor profile instantly.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3.5 py-3">
                    <Field label="Vendor Name *" {...vendorForm.register("name")} error={vendorForm.formState.errors.name?.message} />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Contact Person" {...vendorForm.register("contactPerson")} />
                      <Field label="Phone" {...vendorForm.register("phone")} />
                    </div>
                    <Field label="GST Number" {...vendorForm.register("gstNumber")} />
                    <Field label="Address" {...vendorForm.register("address")} />
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" type="button" onClick={() => setVendorDialogOpen(false)}>Cancel</Button>
                    <Button type="button" onClick={vendorForm.handleSubmit((values) => vendorMutation.mutate(values))} disabled={vendorMutation.isPending}>
                      {vendorMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Save Vendor
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Section */}
      <Card className="shadow-xs border">
        <CardHeader className="flex flex-wrap flex-row items-center justify-between space-y-0 pb-3.5 border-b bg-muted/20 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Boxes className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Line Items</CardTitle>
              <CardDescription className="text-xs">Select catalog products, ordered quantities, unit rate, and tax</CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AddItemDialog
              open={addItemDialogOpen}
              onOpenChange={setAddItemDialogOpen}
              initialName={newItemInitialName}
              onItemAdded={handleItemAdded}
              trigger={
                <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1.5 shadow-2xs">
                  <Plus className="h-3.5 w-3.5 text-primary" /> New Product Master
                </Button>
              }
            />
            <Badge variant="secondary" className="font-mono text-xs py-1 px-2.5">
              {fields.length} Item{fields.length > 1 ? "s" : ""}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* Grid Header (Desktop) */}
          <div className="hidden lg:grid grid-cols-[minmax(240px,5fr)_minmax(140px,2fr)_minmax(120px,1.5fr)_minmax(130px,1.6fr)_36px] gap-4 px-4 py-3 bg-muted/40 text-muted-foreground uppercase text-[10.5px] font-bold tracking-wider border-b">
            <div>Item Name *</div>
            <div>Category</div>
            <div>Unit</div>
            <div className="text-center">Qty *</div>
            <div></div>
          </div>

          {/* Line Items List (Unified Grid System) */}
          <div className="divide-y divide-border/60">
            {fields.map((field, index) => {
              const itemName = watchedItems[index]?.itemName;
              const currentUnit = watchedItems[index]?.unit;

              return (
                <div
                  key={field.id}
                  className={cn(
                    "p-3 sm:p-4 transition-colors relative focus-within:z-50",
                    index % 2 === 1 && "bg-muted/5",
                    "hover:bg-muted/10"
                  )}
                  style={{ zIndex: fields.length - index }}
                >
                  {/* Desktop Grid Layout */}
                  <div className="hidden lg:grid grid-cols-[minmax(240px,5fr)_minmax(140px,2fr)_minmax(120px,1.5fr)_minmax(130px,1.6fr)_36px] gap-4 items-start">
                    {/* Item Name Autocomplete */}
                    <div className="relative z-30 focus-within:z-50">
                      <Controller
                        control={form.control}
                        name={`items.${index}.itemName` as const}
                        render={({ field: itField, fieldState }) => (
                          <Autocomplete
                            label=""
                            placeholder="Type product name..."
                            value={itField.value || ""}
                            options={itemOptions}
                            onChange={(val) => {
                              itField.onChange(val);
                              const selectedItem = itemsCatalog.find((it: any) => it.name === val);
                              if (selectedItem) {
                                const purUnit = selectedItem.purchaseUnit || selectedItem.unit || "";
                                form.setValue(`items.${index}.unit` as const, purUnit);
                                form.setValue(`items.${index}.unitRate` as const, 0);
                                form.setValue(`items.${index}.category` as const, selectedItem.itemTypeName || "");
                                form.setValue(`items.${index}.gstPercent` as const, 0);
                              }
                            }}
                            error={fieldState.error?.message}
                            className="w-full relative z-50"
                          />
                        )}
                      />
                    </div>

                    {/* Category */}
                    <div className="min-w-0 mt-1">
                      <span
                        className="text-muted-foreground font-xs truncate w-full inline-block"
                        title={watchedItems[index]?.category || "—"}
                      >
                        {watchedItems[index]?.category || "—"}
                      </span>
                    </div>

                    {/* Unit */}
                    <div>
                      <select
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs outline-none transition focus-visible:ring-1 focus-visible:ring-ring font-medium"
                        value={watchedItems[index]?.unit || ""}
                        onChange={(e) => {
                          const newUnit = e.target.value;
                          form.setValue(`items.${index}.unit` as const, newUnit);
                        }}
                      >
                        {(() => {
                          const item = itemsCatalog.find((it: any) => it.name === itemName);
                          const unitsSet = new Set<string>();
                          if (currentUnit) unitsSet.add(currentUnit);
                          if (item?.unit) unitsSet.add(item.unit);
                          if (item?.purchaseUnit) unitsSet.add(item.purchaseUnit);
                          if (item?.saleUnit) unitsSet.add(item.saleUnit);
                          if (item?.unitPrices && Array.isArray(item.unitPrices)) {
                            item.unitPrices.forEach((up: any) => {
                              if (up.unit) unitsSet.add(up.unit);
                            });
                          }
                          (unitTypes as any[]).forEach((ut: any) => {
                            const u = ut.symbol || ut.name;
                            if (u) unitsSet.add(u);
                          });
                          const opts = Array.from(unitsSet);
                          if (opts.length === 0) return <option value="">Unit</option>;
                          return opts.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>

                    {/* Qty with Stepper */}
                    <div>
                      <Controller
                        control={form.control}
                        name={`items.${index}.orderedQty` as const}
                        render={({ field: qtyField, fieldState }) => {
                          const val = Number(qtyField.value) || 0;
                          return (
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() => qtyField.onChange(Math.max(1, Number((val - 1).toFixed(2))))}
                                disabled={val <= 1}
                                className="h-8 w-7 shrink-0 flex items-center justify-center rounded-l-md border border-r-0 border-input bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Decrease qty"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <Input
                                type="number"
                                step="any"
                                min="0.01"
                                value={qtyField.value === undefined || qtyField.value === null ? "" : qtyField.value}
                                onChange={(e) => {
                                  const text = e.target.value;
                                  qtyField.onChange(text === "" ? "" : Number(text));
                                }}
                                onBlur={qtyField.onBlur}
                                ref={qtyField.ref}
                                placeholder="1"
                                className={cn(
                                  "w-full text-center h-8 text-xs font-mono font-semibold rounded-none px-1 border-input focus-visible:ring-1",
                                  fieldState.error && "border-destructive ring-destructive"
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => qtyField.onChange(Number((val + 1).toFixed(2)))}
                                className="h-8 w-7 shrink-0 flex items-center justify-center rounded-r-md border border-l-0 border-input bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                title="Increase qty"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        }}
                      />
                    </div>

                    {/* Action */}
                    <div className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        title="Remove item"
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile & Tablet Card Grid Layout (< lg) */}
                  <div className="block lg:hidden space-y-3">
                    {/* Header: Product Autocomplete + Delete */}
                    <div className="flex items-start justify-between gap-2 border-b pb-2.5 relative z-30 focus-within:z-50">
                      <div className="flex-1 relative z-30 focus-within:z-50">
                        <Label className="text-[11px] text-muted-foreground mb-1 block">Product Name *</Label>
                        <Controller
                          control={form.control}
                          name={`items.${index}.itemName` as const}
                          render={({ field: itField, fieldState }) => (
                            <Autocomplete
                              label=""
                              placeholder="Type product name..."
                              value={itField.value || ""}
                              options={itemOptions}
                              onChange={(val) => {
                                itField.onChange(val);
                                const selectedItem = itemsCatalog.find((it: any) => it.name === val);
                                if (selectedItem) {
                                  const purUnit = selectedItem.purchaseUnit || selectedItem.unit || "";
                                  form.setValue(`items.${index}.unit` as const, purUnit);
                                  form.setValue(`items.${index}.unitRate` as const, 0);
                                  form.setValue(`items.${index}.category` as const, selectedItem.itemTypeName || "");
                                  form.setValue(`items.${index}.gstPercent` as const, 0);
                                }
                              }}
                              error={fieldState.error?.message}
                              className="w-full relative z-50"
                            />
                          )}
                        />
                      </div>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0 mt-5"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Mobile Form Inputs Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {/* Category */}
                      <div className="col-span-2 sm:col-span-1">
                        <Label className="text-[11px] text-muted-foreground mb-1 block">Category</Label>
                        <div className="h-9 flex items-center text-muted-foreground font-medium truncate">
                          {watchedItems[index]?.category || "—"}
                        </div>
                      </div>

                      {/* Unit */}
                      <div>
                        <Label className="text-[11px] text-muted-foreground mb-1 block">Unit</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={watchedItems[index]?.unit || ""}
                          onChange={(e) => {
                            const newUnit = e.target.value;
                            form.setValue(`items.${index}.unit` as const, newUnit);
                          }}
                        >
                          {(() => {
                            const item = itemsCatalog.find((it: any) => it.name === itemName);
                            const unitsSet = new Set<string>();
                            if (currentUnit) unitsSet.add(currentUnit);
                            if (item?.unit) unitsSet.add(item.unit);
                            if (item?.purchaseUnit) unitsSet.add(item.purchaseUnit);
                            if (item?.saleUnit) unitsSet.add(item.saleUnit);
                            if (item?.unitPrices && Array.isArray(item.unitPrices)) {
                              item.unitPrices.forEach((up: any) => {
                                if (up.unit) unitsSet.add(up.unit);
                              });
                            }
                            (unitTypes as any[]).forEach((ut: any) => {
                              const u = ut.symbol || ut.name;
                              if (u) unitsSet.add(u);
                            });
                            const opts = Array.from(unitsSet);
                            if (opts.length === 0) return <option value="">Unit</option>;
                            return opts.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>

                      {/* Qty with Stepper */}
                      <div>
                        <Label className="text-[11px] text-muted-foreground mb-1 block">Qty *</Label>
                        <Controller
                          control={form.control}
                          name={`items.${index}.orderedQty` as const}
                          render={({ field: qtyField, fieldState }) => {
                            const val = Number(qtyField.value) || 0;
                            return (
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  onClick={() => qtyField.onChange(Math.max(1, Number((val - 1).toFixed(2))))}
                                  disabled={val <= 1}
                                  className="h-9 w-8 shrink-0 flex items-center justify-center rounded-l-md border border-r-0 border-input bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Decrease qty"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <Input
                                  type="number"
                                  step="any"
                                  min="0.01"
                                  value={qtyField.value === undefined || qtyField.value === null ? "" : qtyField.value}
                                  onChange={(e) => {
                                    const text = e.target.value;
                                    qtyField.onChange(text === "" ? "" : Number(text));
                                  }}
                                  onBlur={qtyField.onBlur}
                                  ref={qtyField.ref}
                                  placeholder="1"
                                  className={cn(
                                    "w-full text-center h-9 text-xs font-mono font-semibold rounded-none px-1 border-input focus-visible:ring-1",
                                    fieldState.error && "border-destructive ring-destructive"
                                  )}
                                />
                                <button
                                  type="button"
                                  onClick={() => qtyField.onChange(Number((val + 1).toFixed(2)))}
                                  className="h-9 w-8 shrink-0 flex items-center justify-center rounded-r-md border border-l-0 border-input bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                  title="Increase qty"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            );
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Row Action */}
          <div className="p-4 border-t bg-muted/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 shadow-2xs font-medium"
              onClick={() => append({ itemName: "", category: "", unit: "", orderedQty: 1, unitRate: 0, gstPercent: 0 })}
            >
              <Plus className="h-4 w-4 text-primary" /> Add Line Item Row
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Section: Notes & Financial Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Remarks &amp; Delivery Instructions
          </Label>
          <textarea
            rows={5}
            placeholder="Add terms, remarks, delivery instructions, packaging requirements, or quotation reference..."
            {...form.register("remarks")}
            className="w-full p-3 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed resize-none"
          />
          {form.formState.errors.remarks && (
            <p className="text-[11px] text-destructive">{form.formState.errors.remarks.message}</p>
          )}
        </div>

        <div className="md:col-span-5">
          <Card className="shadow-xs bg-muted/10 border-primary/20">
            <CardHeader className="py-3 px-4 border-b bg-muted/20">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Purchase Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Items</span>
                <span className="font-mono font-medium text-foreground">{fields.length} Products</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Ordered Units</span>
                <span className="font-mono font-medium text-foreground">{displayOrderedUnits}</span>
              </div>
              <div className="flex justify-between text-muted-foreground pt-1.5 border-t">
                <span>Gross Subtotal</span>
                <span className="font-mono font-medium">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total GST</span>
                <span className="font-mono font-medium">₹{totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t text-primary">
                <span>Total PO Value</span>
                <span className="font-mono">₹{computedTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Form Submission Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Button
          variant="outline"
          type="button"
          className="shadow-xs"
          onClick={() => navigate({ to: "/purchases/purchase-orders", search: { page: 1, limit: 10 } })}
        >
          <ChevronLeft className="h-4 w-4 mr-1.5" /> Cancel
        </Button>

        <Button
          type="submit"
          disabled={mutation.isPending}
          className="shadow-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> {mode === "new" ? "Create Purchase Order" : "Save Changes"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
