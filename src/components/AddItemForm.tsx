import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Plus, Loader2, Package, Save, Trash2, Tag, ShoppingCart, DollarSign } from "lucide-react";
import { toast } from "sonner";

import { queryClient, useRpcQuery } from "../lib/query";
import { client } from "../services/rpc";
import { Field } from "./Field";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

const itemFormSchema = z.object({
  name: z.string().min(2, "Item name must be at least 2 characters"),
  itemTypeId: z.coerce.number().positive("Category is required"),
  purchaseUnitId: z.coerce.number().positive("Purchase unit is required"),
  saleUnitId: z.coerce.number().positive("Sale unit is required"),
  baseUnitId: z.coerce.number().positive().optional(),
  rate: z.coerce.number().min(0, "Cost price must be >= 0"),
  salePrice: z.coerce.number().min(0, "Sale price must be >= 0"),
  gstPercent: z.coerce.number().min(0).optional().default(0),
  hsnCode: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  reorderLevel: z.coerce.number().min(0).optional().default(0),
  reorderQty: z.coerce.number().min(0).optional().default(0),
  drugSchedule: z.string().optional().nullable(),
  storageCondition: z.string().optional().nullable(),
  taxCategory: z.string().optional().default("taxable"),
  isNarcotic: z.boolean().optional().default(false),
  allowFractional: z.boolean().optional().default(false),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;

export interface UnitPriceTier {
  unitId: number;
  unit: string;
  costPrice: number;
  salePrice: number;
  conversionFactor: number;
}

export interface AddItemFormProps {
  initialName?: string;
  editingItem?: any | null;
  onSuccess?: (item: any) => void;
  onCancel?: () => void;
}

export function AddItemForm({ initialName = "", editingItem = null, onSuccess, onCancel }: AddItemFormProps) {
  // Fetch item types for category selection
  const { data: itemTypes = [], isLoading: loadingTypes } = useRpcQuery<any[]>(
    ["item-types"],
    () => client["item-types"].$get()
  );

  // Fetch registered master unit types
  const { data: unitTypes = [], isLoading: loadingUnits } = useRpcQuery<any[]>(
    ["unit-types"],
    () => client["unit-types"].$get()
  );

  // Fetch master unit conversions
  const { data: unitConversions = [] } = useRpcQuery<any[]>(
    ["unit-conversions"],
    () => client["unit-conversions"].$get()
  );

  const isEditing = Boolean(editingItem);

  // Unit pricing tiers state
  const [unitPriceTiers, setUnitPriceTiers] = React.useState<UnitPriceTier[]>([]);
  const [tierUnitId, setTierUnitId] = React.useState<number | "">("");
  const [tierCost, setTierCost] = React.useState<number | "">("");
  const [tierSale, setTierSale] = React.useState<number | "">("");
  const [tierFactor, setTierFactor] = React.useState<number>(1);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema) as any,
    defaultValues: {
      name: editingItem?.name || initialName,
      itemTypeId: editingItem?.itemTypeId || 0,
      purchaseUnitId: editingItem?.purchaseUnitId || editingItem?.baseUnitId || 0,
      saleUnitId: editingItem?.saleUnitId || editingItem?.baseUnitId || 0,
      baseUnitId: editingItem?.baseUnitId || 0,
      rate: Number(editingItem?.rate || 0),
      salePrice: Number(editingItem?.salePrice || 0),
      gstPercent: Number(editingItem?.gstPercent || 0),
      hsnCode: editingItem?.hsnCode || "",
      barcode: editingItem?.barcode || "",
      reorderLevel: Number(editingItem?.reorderLevel || 0),
      reorderQty: Number(editingItem?.reorderQty || 0),
      drugSchedule: editingItem?.drugSchedule || "OTC",
      storageCondition: editingItem?.storageCondition || "Room Temperature",
      taxCategory: editingItem?.taxCategory || "taxable",
      isNarcotic: !!editingItem?.isNarcotic,
      allowFractional: !!editingItem?.allowFractional,
    },
  });

  const watchPurchaseUnitId = Number(form.watch("purchaseUnitId") || 0);
  const watchSaleUnitId = Number(form.watch("saleUnitId") || 0);
  const watchRate = form.watch("rate") || 0;
  const watchSale = form.watch("salePrice") || 0;

  const selectedPurchaseUnit = unitTypes.find((u) => Number(u.id) === watchPurchaseUnitId);
  const selectedSaleUnit = unitTypes.find((u) => Number(u.id) === watchSaleUnitId);

  // Calculate conversion factor from purchaseUnit to saleUnit
  const purToSaleFactor = React.useMemo(() => {
    if (!watchPurchaseUnitId || !watchSaleUnitId || watchPurchaseUnitId === watchSaleUnitId) return 1;
    if (!unitConversions || unitConversions.length === 0) return 1;

    const direct = unitConversions.find(
      (c) => Number(c.fromUnitId) === watchPurchaseUnitId && Number(c.toUnitId) === watchSaleUnitId
    );
    if (direct && Number(direct.multiplier) > 0) return Number(direct.multiplier);

    const inverse = unitConversions.find(
      (c) => Number(c.fromUnitId) === watchSaleUnitId && Number(c.toUnitId) === watchPurchaseUnitId
    );
    if (inverse && Number(inverse.multiplier) > 0) return 1 / Number(inverse.multiplier);

    return 1;
  }, [watchPurchaseUnitId, watchSaleUnitId, unitConversions]);

  // Normalized cost price per sale unit
  const normalizedCostPerSaleUnit = purToSaleFactor > 0 ? watchRate / purToSaleFactor : watchRate;
  const marginPercent =
    normalizedCostPerSaleUnit > 0
      ? (((watchSale - normalizedCostPerSaleUnit) / normalizedCostPerSaleUnit) * 100).toFixed(1)
      : "0";

  React.useEffect(() => {
    if (editingItem) {
      form.reset({
        name: editingItem.name || "",
        itemTypeId: Number(editingItem.itemTypeId || 0),
        purchaseUnitId: Number(editingItem.purchaseUnitId || editingItem.baseUnitId || 0),
        saleUnitId: Number(editingItem.saleUnitId || editingItem.baseUnitId || 0),
        baseUnitId: Number(editingItem.baseUnitId || 0),
        rate: Number(editingItem.rate || 0),
        salePrice: Number(editingItem.salePrice || 0),
        gstPercent: Number(editingItem.gstPercent || 0),
        hsnCode: editingItem.hsnCode || "",
        barcode: editingItem.barcode || "",
        reorderLevel: Number(editingItem.reorderLevel || 0),
        reorderQty: Number(editingItem.reorderQty || 0),
        drugSchedule: editingItem.drugSchedule || "OTC",
        storageCondition: editingItem.storageCondition || "Room Temperature",
        taxCategory: editingItem.taxCategory || "taxable",
        isNarcotic: !!editingItem.isNarcotic,
        allowFractional: !!editingItem.allowFractional,
      });

      if (editingItem.unitPrices && Array.isArray(editingItem.unitPrices)) {
        setUnitPriceTiers(
          editingItem.unitPrices.map((up: any) => ({
            unitId: Number(up.unitId || 0),
            unit: up.unit || up.unitName || String(up.unitId),
            costPrice: Number(up.costPrice || 0),
            salePrice: Number(up.salePrice || 0),
            conversionFactor: Number(up.conversionFactor || 1),
          }))
        );
      }
    } else if (initialName) {
      form.setValue("name", initialName);
    }
  }, [editingItem, initialName, form]);

  // Default itemTypeId to first category if available and empty
  React.useEffect(() => {
    if (itemTypes.length > 0 && !form.getValues("itemTypeId")) {
      form.setValue("itemTypeId", itemTypes[0].id);
    }
  }, [itemTypes, form]);

  // Default purchase and sale units if empty
  React.useEffect(() => {
    if (unitTypes.length > 0) {
      if (!form.getValues("purchaseUnitId")) {
        const defaultPur = unitTypes.find((u) => u.symbol === "box" || u.name === "Box") || unitTypes[0];
        form.setValue("purchaseUnitId", defaultPur.id);
        form.setValue("baseUnitId", defaultPur.id);
      }
      if (!form.getValues("saleUnitId")) {
        const defaultSale =
          unitTypes.find((u) => u.symbol === "pcs" || u.name === "Piece") || unitTypes[1] || unitTypes[0];
        form.setValue("saleUnitId", defaultSale.id);
      }
    }
  }, [unitTypes, form]);

  // Auto calculate suggested tier prices when selecting a tier unit
  const handleTierUnitChange = (selectedIdStr: string) => {
    const sId = Number(selectedIdStr);
    setTierUnitId(sId || "");
    if (!sId || !watchPurchaseUnitId || sId === watchPurchaseUnitId) {
      setTierCost("");
      setTierSale("");
      setTierFactor(1);
      return;
    }

    let factor = 1;
    if (unitConversions.length > 0) {
      const directConv = unitConversions.find(
        (c) => Number(c.fromUnitId) === sId && Number(c.toUnitId) === watchPurchaseUnitId
      );
      if (directConv) {
        factor = Number(directConv.multiplier);
      } else {
        const invConv = unitConversions.find(
          (c) => Number(c.toUnitId) === sId && Number(c.fromUnitId) === watchPurchaseUnitId
        );
        if (invConv && Number(invConv.multiplier) > 0) {
          factor = 1 / Number(invConv.multiplier);
        }
      }
    }

    setTierFactor(factor);
    if (watchRate > 0) setTierCost(Number((watchRate * factor).toFixed(2)));
    if (watchSale > 0) setTierSale(Number((watchSale * factor).toFixed(2)));
  };

  const handleAddTier = () => {
    if (!tierUnitId) {
      toast.error("Please select a unit for the pricing tier");
      return;
    }
    if (tierUnitId === watchPurchaseUnitId && tierUnitId === watchSaleUnitId) {
      toast.error("Tier unit is already defined as default purchase/sale unit");
      return;
    }

    const matchedUnit = unitTypes.find((u) => Number(u.id) === Number(tierUnitId));
    const unitLabel = matchedUnit ? `${matchedUnit.name} (${matchedUnit.symbol})` : String(tierUnitId);

    const costVal = Number(tierCost || 0);
    const saleVal = Number(tierSale || 0);

    const filtered = unitPriceTiers.filter((t) => t.unitId !== Number(tierUnitId));
    setUnitPriceTiers([
      ...filtered,
      {
        unitId: Number(tierUnitId),
        unit: unitLabel,
        costPrice: costVal,
        salePrice: saleVal,
        conversionFactor: tierFactor,
      },
    ]);

    setTierUnitId("");
    setTierCost("");
    setTierSale("");
    setTierFactor(1);
    toast.success(`Pricing tier for "${unitLabel}" added`);
  };

  const handleRemoveTier = (unitIdToRemove: number) => {
    setUnitPriceTiers(unitPriceTiers.filter((t) => t.unitId !== unitIdToRemove));
  };

  const mutation = useMutation({
    mutationFn: async (data: ItemFormValues) => {
      const payload = {
        name: data.name,
        itemTypeId: Number(data.itemTypeId),
        baseUnitId: Number(data.baseUnitId || data.purchaseUnitId),
        purchaseUnitId: Number(data.purchaseUnitId),
        saleUnitId: Number(data.saleUnitId),
        rate: Number(data.rate),
        salePrice: Number(data.salePrice || 0),
        gstPercent: Number(data.gstPercent || 0),
        hsnCode: data.hsnCode || null,
        barcode: data.barcode || null,
        reorderLevel: Number(data.reorderLevel || 0),
        reorderQty: Number(data.reorderQty || 0),
        drugSchedule: data.drugSchedule || null,
        storageCondition: data.storageCondition || null,
        taxCategory: data.taxCategory || "taxable",
        isNarcotic: !!data.isNarcotic,
        allowFractional: !!data.allowFractional,
        unitPrices: unitPriceTiers.map((t) => ({
          unitId: t.unitId,
          costPrice: t.costPrice,
          salePrice: t.salePrice,
          conversionFactor: t.conversionFactor,
          isDefault: false,
        })),
      };

      if (isEditing && editingItem?.id) {
        const res = await client.items[":id"].$patch({
          param: { id: String(editingItem.id) },
          json: payload,
        } as any);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any)?.error || "Failed to update item");
        }
        return res.json();
      } else {
        const res = await client.items.$post({
          json: payload,
        } as any);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any)?.error || "Failed to create item");
        }
        return res.json();
      }
    },
    onSuccess: async (savedItem: any) => {
      toast.success(isEditing ? "Item updated successfully" : "Item created successfully");
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      const selectedType = itemTypes.find((t: any) => t.id === Number(savedItem.itemTypeId));
      const fullItem = {
        ...savedItem,
        itemTypeName: selectedType?.name || "",
        category: selectedType?.name || "",
        gstPercent: Number(savedItem.gstPercent ?? form.getValues("gstPercent") ?? 0),
      };
      onSuccess?.(fullItem);
    },
    onError: (err: any) => {
      toast.error(err.message || (isEditing ? "Failed to update item" : "Failed to create item"));
    },
  });

  const onSubmit = (values: any) => {
    mutation.mutate(values);
  };

  const itemTypeSelectOptions: [string, string][] = itemTypes.map((t: any) => [
    String(t.id),
    t.name,
  ]);

  const unitOptions: [string, string][] = unitTypes.map((u: any) => [
    String(u.id),
    `${u.name} (${u.symbol})`,
  ]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="flex flex-col flex-1 overflow-hidden">
      {/* Scrollable Form Body */}
      <div className="px-6 py-5 overflow-y-auto max-h-[calc(92vh-135px)] space-y-5">
        {/* Section 1: Item Identification & Category */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <Field
              label="Item Name *"
              placeholder="Enter item name (e.g. Paracetamol 500mg, Nitrile Gloves)"
              {...form.register("name")}
              error={form.formState.errors.name?.message}
            />
          </div>

          <div className="md:col-span-4">
            <Select
              label="Category / Item Type *"
              options={
                itemTypeSelectOptions.length > 0
                  ? itemTypeSelectOptions
                  : [["", loadingTypes ? "Loading categories..." : "No categories found"]]
              }
              {...form.register("itemTypeId")}
              error={form.formState.errors.itemTypeId?.message}
            />
          </div>

          <div className="md:col-span-2">
            <Field
              label="GST (%)"
              type="number"
              step="0.01"
              placeholder="0"
              {...form.register("gstPercent")}
              error={form.formState.errors.gstPercent?.message}
            />
          </div>
        </div>

        {/* Section 2: Procurement & Selling Units Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Default Purchase Unit & Cost Price Section */}
          <div className="bg-blue-50/60 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-200/70 dark:border-blue-900/50 space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
              <ShoppingCart className="h-4 w-4 text-blue-600" /> Default Procurement
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Purchase Unit *"
                options={
                  unitOptions.length > 0
                    ? unitOptions
                    : [["", loadingUnits ? "Loading units..." : "Select unit"]]
                }
                {...form.register("purchaseUnitId")}
                error={form.formState.errors.purchaseUnitId?.message}
              />

              <Field
                label={`Cost Price (per ${selectedPurchaseUnit?.symbol || "unit"}) *`}
                type="number"
                step="0.01"
                placeholder="0.00"
                {...form.register("rate")}
                error={form.formState.errors.rate?.message}
              />
            </div>
          </div>

          {/* Default Sale Unit & Selling Price Section */}
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 space-y-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
                  <DollarSign className="h-4 w-4 text-emerald-600" /> Default Dispensing
                </div>
                {Number(marginPercent) !== 0 && (
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-mono font-bold ${
                      Number(marginPercent) >= 0
                        ? "bg-emerald-100/80 text-emerald-800 border-emerald-300"
                        : "bg-destructive/10 text-destructive border-destructive/30"
                    }`}
                  >
                    {Number(marginPercent) >= 0 ? "+" : ""}
                    {marginPercent}% Margin
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Sale Unit *"
                  options={
                    unitOptions.length > 0
                      ? unitOptions
                      : [["", loadingUnits ? "Loading units..." : "Select unit"]]
                  }
                  {...form.register("saleUnitId")}
                  error={form.formState.errors.saleUnitId?.message}
                />

                <Field
                  label={`Selling Price (per ${selectedSaleUnit?.symbol || "unit"}) *`}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("salePrice")}
                  error={form.formState.errors.salePrice?.message}
                />
              </div>
            </div>

            {watchPurchaseUnitId !== watchSaleUnitId && purToSaleFactor !== 1 && watchRate > 0 && (
              <div className="text-[11px] text-muted-foreground bg-background/80 px-2.5 py-1.5 rounded-md border font-mono flex items-center justify-between mt-1">
                <span>
                  1 {selectedPurchaseUnit?.symbol || "pur unit"} = {purToSaleFactor}{" "}
                  {selectedSaleUnit?.symbol || "sale unit"}
                </span>
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Eff. Cost: Rs. {normalizedCostPerSaleUnit.toFixed(2)} / {selectedSaleUnit?.symbol || "unit"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Additional Unit Pricing Tiers */}
        <div className="border rounded-xl p-4 space-y-3.5 bg-background shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold block text-foreground uppercase tracking-wider">
                Additional Unit Pricing Tiers
              </span>
              <span className="text-[11px] text-muted-foreground">
                Define custom pricing for secondary packaging units (e.g. Carton, Strip, Ampoule, Box).
              </span>
            </div>
            <Badge variant="outline" className="text-xs font-mono font-semibold">
              {unitPriceTiers.length} Tier{unitPriceTiers.length === 1 ? "" : "s"}
            </Badge>
          </div>

          {/* Existing Tiers List */}
          {unitPriceTiers.length > 0 && (
            <div className="space-y-1.5 border-t pt-3">
              {unitPriceTiers.map((tier) => {
                const tierMargin =
                  tier.costPrice > 0
                    ? (((tier.salePrice - tier.costPrice) / tier.costPrice) * 100).toFixed(1)
                    : "0";
                return (
                  <div
                    key={tier.unitId}
                    className="flex items-center justify-between bg-muted/40 px-3.5 py-2 rounded-lg text-xs border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary text-sm">{tier.unit}</span>
                      <span className="text-muted-foreground">
                        Cost: <strong className="text-foreground">Rs. {tier.costPrice}</strong> | Sale:{" "}
                        <strong className="text-foreground">Rs. {tier.salePrice}</strong>
                      </span>
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-background font-mono font-semibold">
                        {tierMargin}% Margin
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveTier(tier.unitId)}
                      title="Remove Tier"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Tier Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t items-end">
            <div className="sm:col-span-4">
              <Select
                label="Tier Unit"
                value={tierUnitId ? String(tierUnitId) : ""}
                onChange={(e) => handleTierUnitChange(e.target.value)}
                options={unitOptions.filter(
                  ([val]) => Number(val) !== watchPurchaseUnitId && Number(val) !== watchSaleUnitId
                )}
              />
            </div>
            <div className="sm:col-span-3">
              <Field
                label="Cost Price (Rs.)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={tierCost}
                onChange={(e) => setTierCost(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="sm:col-span-3">
              <Field
                label="Sale Price (Rs.)"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={tierSale}
                onChange={(e) => setTierSale(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTier}
                className="h-10 text-xs font-semibold w-full"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Tier
              </Button>
            </div>
          </div>
        </div>

        {/* Section 4: Pharmaceutical, Barcode & Stock Planning */}
        <div className="border rounded-xl p-4 space-y-4 bg-muted/20">
          <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
            <Tag className="h-4 w-4 text-emerald-600" /> Compliance & Inventory Controls
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            <Field label="HSN Code" placeholder="e.g. 300490" {...form.register("hsnCode")} />

            <Field label="Barcode / GTIN" placeholder="e.g. 8901234567890" {...form.register("barcode")} />

            <Field
              label="Min Reorder Level"
              type="number"
              step="1"
              placeholder="10"
              {...form.register("reorderLevel")}
            />

            <Field
              label="Standard Reorder Qty"
              type="number"
              step="1"
              placeholder="50"
              {...form.register("reorderQty")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="flex flex-col space-y-1.5">
              <Label className="text-xs">Drug Schedule</Label>
              <select
                {...form.register("drugSchedule")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="OTC">OTC (Over the Counter)</option>
                <option value="Schedule H">Schedule H (Prescription)</option>
                <option value="Schedule H1">Schedule H1 (Controlled)</option>
                <option value="Schedule X">Schedule X (Strict Narcotic)</option>
                <option value="Schedule G">Schedule G</option>
                <option value="General">General / Non-Drug</option>
              </select>
            </div>

            <div className="flex flex-col space-y-1.5">
              <Label className="text-xs">Storage Condition</Label>
              <select
                {...form.register("storageCondition")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Room Temperature">Room Temp (15-25°C)</option>
                <option value="Cold Chain (2-8°C)">Cold Chain / Refrigerator (2-8°C)</option>
                <option value="Cool & Dry">Cool & Dry Place</option>
                <option value="Deep Freeze (-20°C)">Deep Freeze (-20°C)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-1">
            <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer bg-background px-3 py-2 rounded-lg border">
              <input
                type="checkbox"
                {...form.register("isNarcotic")}
                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <span>Narcotic / High-Risk Controlled Drug</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs font-medium text-foreground cursor-pointer bg-background px-3 py-2 rounded-lg border">
              <input
                type="checkbox"
                {...form.register("allowFractional")}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Allow Fractional Units (e.g. 0.5, 1.25)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Sticky Modal Action Footer */}
      <div className="px-6 py-3 border-t bg-muted/10 flex justify-end gap-2.5">
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel} className="h-9 text-xs">
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {mutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isEditing ? (
            <Save className="mr-2 h-4 w-4" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {isEditing ? "Save Changes" : "Create Item"}
        </Button>
      </div>
    </form>
  );
}

export interface AddItemDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialName?: string;
  editingItem?: any | null;
  onItemAdded?: (newItem: any) => void;
  onItemUpdated?: (updatedItem: any) => void;
  trigger?: React.ReactNode;
}

export function AddItemDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  initialName = "",
  editingItem = null,
  onItemAdded,
  onItemUpdated,
  trigger,
}: AddItemDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (newOpen: boolean) => {
    if (controlledOnOpenChange) controlledOnOpenChange(newOpen);
    if (!isControlled) setInternalOpen(newOpen);
  };

  const isEditing = Boolean(editingItem);

  const handleSuccess = (item: any) => {
    if (isEditing) {
      onItemUpdated?.(item);
    } else {
      onItemAdded?.(item);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-muted/10">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-emerald-600" />
            <span>{isEditing ? "Edit Catalog Item" : "Add New Catalog Item"}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? "Update standard purchase unit, sale unit, prices, packaging tiers, and compliance controls."
              : "Create a new catalog item with procurement unit & cost, dispensing unit & selling price, and stock levels."}
          </DialogDescription>
        </DialogHeader>
        <AddItemForm
          initialName={initialName}
          editingItem={editingItem}
          onSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
