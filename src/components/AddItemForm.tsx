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
  purchaseUnit: z.string().min(1, "Purchase unit is required"),
  saleUnit: z.string().min(1, "Sale unit is required"),
  rate: z.coerce.number().min(0, "Cost price must be >= 0"),
  salePrice: z.coerce.number().min(0, "Sale price must be >= 0"),
  gstPercent: z.coerce.number().min(0).optional().default(0),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;

export interface UnitPriceTier {
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
  const [tierUnit, setTierUnit] = React.useState<string>("");
  const [tierCost, setTierCost] = React.useState<number | "">("");
  const [tierSale, setTierSale] = React.useState<number | "">("");
  const [tierFactor, setTierFactor] = React.useState<number>(1);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema) as any,
    defaultValues: {
      name: editingItem?.name || initialName,
      itemTypeId: editingItem?.itemTypeId || 0,
      purchaseUnit: editingItem?.purchaseUnit || editingItem?.unit || "box",
      saleUnit: editingItem?.saleUnit || editingItem?.unit || "pcs",
      rate: Number(editingItem?.rate || 0),
      salePrice: Number(editingItem?.salePrice || 0),
      gstPercent: Number(editingItem?.gstPercent || 0),
    },
  });

  const watchPurchaseUnit = form.watch("purchaseUnit");
  const watchSaleUnit = form.watch("saleUnit");
  const watchRate = form.watch("rate") || 0;
  const watchSale = form.watch("salePrice") || 0;

  // Calculate conversion factor from purchaseUnit to saleUnit (e.g., 1 Box = 24 pcs -> factor = 24)
  const purToSaleFactor = React.useMemo(() => {
    if (!watchPurchaseUnit || !watchSaleUnit || watchPurchaseUnit === watchSaleUnit) return 1;
    const fromU = unitTypes.find((u) => u.symbol === watchPurchaseUnit || u.name === watchPurchaseUnit);
    const toU = unitTypes.find((u) => u.symbol === watchSaleUnit || u.name === watchSaleUnit);
    if (!fromU || !toU || !unitConversions || unitConversions.length === 0) return 1;

    const fId = Number(fromU.id);
    const tId = Number(toU.id);

    const direct = unitConversions.find(
      (c) => Number(c.fromUnitId) === fId && Number(c.toUnitId) === tId
    );
    if (direct && Number(direct.multiplier) > 0) return Number(direct.multiplier);

    const inverse = unitConversions.find(
      (c) => Number(c.fromUnitId) === tId && Number(c.toUnitId) === fId
    );
    if (inverse && Number(inverse.multiplier) > 0) return 1 / Number(inverse.multiplier);

    return 1;
  }, [watchPurchaseUnit, watchSaleUnit, unitTypes, unitConversions]);

  // Normalized cost price per sale unit
  const normalizedCostPerSaleUnit = purToSaleFactor > 0 ? watchRate / purToSaleFactor : watchRate;
  const marginPercent = normalizedCostPerSaleUnit > 0
    ? (((watchSale - normalizedCostPerSaleUnit) / normalizedCostPerSaleUnit) * 100).toFixed(1)
    : "0";

  React.useEffect(() => {
    if (editingItem) {
      form.reset({
        name: editingItem.name || "",
        itemTypeId: Number(editingItem.itemTypeId || 0),
        purchaseUnit: editingItem.purchaseUnit || editingItem.unit || "box",
        saleUnit: editingItem.saleUnit || editingItem.unit || "pcs",
        rate: Number(editingItem.rate || 0),
        salePrice: Number(editingItem.salePrice || 0),
        gstPercent: Number(editingItem.gstPercent || 0),
      });

      if (editingItem.unitPrices && Array.isArray(editingItem.unitPrices)) {
        setUnitPriceTiers(
          editingItem.unitPrices.map((up: any) => ({
            unit: up.unit,
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
      if (!form.getValues("purchaseUnit")) {
        const defaultPur = unitTypes.find((u) => u.symbol === "box" || u.name === "Box") || unitTypes[0];
        form.setValue("purchaseUnit", defaultPur.symbol || defaultPur.name);
      }
      if (!form.getValues("saleUnit")) {
        const defaultSale = unitTypes.find((u) => u.symbol === "pcs" || u.name === "Piece") || unitTypes[1] || unitTypes[0];
        form.setValue("saleUnit", defaultSale.symbol || defaultSale.name);
      }
    }
  }, [unitTypes, form]);

  // Auto calculate suggested tier prices when selecting a tier unit
  const handleTierUnitChange = (selectedSymbol: string) => {
    setTierUnit(selectedSymbol);
    if (!selectedSymbol || !watchPurchaseUnit || selectedSymbol === watchPurchaseUnit) {
      setTierCost("");
      setTierSale("");
      setTierFactor(1);
      return;
    }

    // Look up conversion rule
    const fromU = unitTypes.find((u) => u.symbol === selectedSymbol || u.name === selectedSymbol);
    const toU = unitTypes.find((u) => u.symbol === watchPurchaseUnit || u.name === watchPurchaseUnit);

    let factor = 1;
    if (fromU && toU && unitConversions.length > 0) {
      const directConv = unitConversions.find(
        (c) => Number(c.fromUnitId) === Number(fromU.id) && Number(c.toUnitId) === Number(toU.id)
      );
      if (directConv) {
        factor = Number(directConv.multiplier);
      } else {
        const invConv = unitConversions.find(
          (c) => Number(c.toUnitId) === Number(fromU.id) && Number(c.fromUnitId) === Number(toU.id)
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
    if (!tierUnit) {
      toast.error("Please select a unit for the pricing tier");
      return;
    }
    if (tierUnit === watchPurchaseUnit && tierUnit === watchSaleUnit) {
      toast.error("Tier unit is already defined as default purchase/sale unit");
      return;
    }

    const costVal = Number(tierCost || 0);
    const saleVal = Number(tierSale || 0);

    // Remove existing if already present
    const filtered = unitPriceTiers.filter((t) => t.unit !== tierUnit);
    setUnitPriceTiers([
      ...filtered,
      {
        unit: tierUnit,
        costPrice: costVal,
        salePrice: saleVal,
        conversionFactor: tierFactor,
      },
    ]);

    setTierUnit("");
    setTierCost("");
    setTierSale("");
    setTierFactor(1);
    toast.success(`Pricing tier for "${tierUnit}" added`);
  };

  const handleRemoveTier = (unitToRemove: string) => {
    setUnitPriceTiers(unitPriceTiers.filter((t) => t.unit !== unitToRemove));
  };

  const mutation = useMutation({
    mutationFn: async (data: ItemFormValues) => {
      const payload = {
        name: data.name,
        itemTypeId: Number(data.itemTypeId),
        unit: data.purchaseUnit,
        purchaseUnit: data.purchaseUnit,
        saleUnit: data.saleUnit,
        rate: Number(data.rate),
        salePrice: Number(data.salePrice || 0),
        gstPercent: Number(data.gstPercent || 0),
        unitPrices: unitPriceTiers.map((t) => ({
          unit: t.unit,
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

  const defaultUnits: [string, string][] = [
    ["pcs", "Piece (pcs)"],
    ["kg", "Kilogram (kg)"],
    ["g", "Gram (g)"],
    ["L", "Liter (L)"],
    ["ml", "Milliliter (ml)"],
    ["box", "Box (box)"],
    ["ctn", "Carton (ctn)"],
    ["m", "Meter (m)"],
    ["Nos", "Nos"],
  ];

  const fetchedUnitOptions: [string, string][] = unitTypes.map((u: any) => [
    u.symbol || u.name,
    `${u.name} (${u.symbol})`,
  ]);

  const baseUnitOptions = fetchedUnitOptions.length > 0 ? fetchedUnitOptions : defaultUnits;
  const currentPurchaseUnitVal = form.watch("purchaseUnit") || editingItem?.purchaseUnit || editingItem?.unit;
  const currentSaleUnitVal = form.watch("saleUnit") || editingItem?.saleUnit || editingItem?.unit;

  const purchaseUnitOptions = React.useMemo(() => {
    const opts = [...baseUnitOptions];
    if (currentPurchaseUnitVal && !opts.some(([val]) => val === currentPurchaseUnitVal)) {
      opts.unshift([currentPurchaseUnitVal, currentPurchaseUnitVal]);
    }
    return opts;
  }, [baseUnitOptions, currentPurchaseUnitVal]);

  const saleUnitOptions = React.useMemo(() => {
    const opts = [...baseUnitOptions];
    if (currentSaleUnitVal && !opts.some(([val]) => val === currentSaleUnitVal)) {
      opts.unshift([currentSaleUnitVal, currentSaleUnitVal]);
    }
    return opts;
  }, [baseUnitOptions, currentSaleUnitVal]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 pt-2">
      <Field
        label="Item Name *"
        placeholder="Enter item name (e.g. Paracetamol 500mg, Gloves)"
        {...form.register("name")}
        error={form.formState.errors.name?.message}
      />

      <div className="grid grid-cols-2 gap-4">
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

        <Field
          label="GST (%)"
          type="number"
          step="0.01"
          placeholder="0"
          {...form.register("gstPercent")}
          error={form.formState.errors.gstPercent?.message}
        />
      </div>

      {/* Default Purchase Unit & Cost Price Section */}
      <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200/60 dark:border-blue-900/50 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900 dark:text-blue-300">
          <ShoppingCart className="h-4 w-4 text-blue-600" /> Default Purchase Unit & Procurement Cost
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Default Purchase Unit *"
            options={
              purchaseUnitOptions.length > 0
                ? purchaseUnitOptions
                : [["", loadingUnits ? "Loading units..." : "Select unit"]]
            }
            {...form.register("purchaseUnit")}
            error={form.formState.errors.purchaseUnit?.message}
          />

          <Field
            label={`Cost Price / Purchase Rate (per ${watchPurchaseUnit || "unit"}) *`}
            type="number"
            step="0.01"
            placeholder="0.00"
            {...form.register("rate")}
            error={form.formState.errors.rate?.message}
          />
        </div>
      </div>

      {/* Default Sale Unit & Selling Price Section */}
      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200/60 dark:border-emerald-900/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-900 dark:text-emerald-300">
            <DollarSign className="h-4 w-4 text-emerald-600" /> Default Sale Unit & Selling Price
          </div>
          {Number(marginPercent) !== 0 && (
            <Badge className={`text-[10px] ${Number(marginPercent) >= 0 ? "bg-emerald-500/15 text-emerald-700" : "bg-destructive/15 text-destructive"}`}>
              {Number(marginPercent) >= 0 ? "+" : ""}{marginPercent}% Margin
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Default Sale Unit *"
            options={
              saleUnitOptions.length > 0
                ? saleUnitOptions
                : [["", loadingUnits ? "Loading units..." : "Select unit"]]
            }
            {...form.register("saleUnit")}
            error={form.formState.errors.saleUnit?.message}
          />

          <Field
            label={`Selling Price (per ${watchSaleUnit || "unit"}) *`}
            type="number"
            step="0.01"
            placeholder="0.00"
            {...form.register("salePrice")}
            error={form.formState.errors.salePrice?.message}
          />
        </div>

        {watchPurchaseUnit !== watchSaleUnit && purToSaleFactor !== 1 && watchRate > 0 && (
          <div className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-1 rounded border font-mono flex items-center justify-between">
            <span>1 {watchPurchaseUnit} = {purToSaleFactor} {watchSaleUnit}</span>
            <span>Effective Cost: ₹{normalizedCostPerSaleUnit.toFixed(2)} / {watchSaleUnit}</span>
          </div>
        )}
      </div>

      {/* Additional Unit Pricing Tiers Section */}
      <div className="border rounded-lg p-3 space-y-3 bg-background">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold block text-foreground">Additional Unit Pricing Tiers</span>
            <span className="text-[11px] text-muted-foreground">Define prices for secondary units (e.g. Carton, Strip, Pack).</span>
          </div>
          <Badge variant="default" className="text-[10px] bg-muted/60 text-muted-foreground border">
            {unitPriceTiers.length} Tier{unitPriceTiers.length === 1 ? "" : "s"}
          </Badge>
        </div>

        {/* Existing Tiers List */}
        {unitPriceTiers.length > 0 && (
          <div className="space-y-1.5 border-t pt-2">
            {unitPriceTiers.map((tier) => {
              const tierMargin = tier.costPrice > 0 ? (((tier.salePrice - tier.costPrice) / tier.costPrice) * 100).toFixed(1) : "0";
              return (
                <div key={tier.unit} className="flex items-center justify-between bg-muted/40 px-3 py-1.5 rounded-md text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-primary">{tier.unit}</span>
                    <span className="text-muted-foreground">
                      Cost: <strong>₹{tier.costPrice}</strong> | Sale: <strong>₹{tier.salePrice}</strong>
                    </span>
                    <Badge className="text-[10px] px-1.5 py-0 border bg-background">
                      {tierMargin}% Margin
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveTier(tier.unit)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Tier Controls */}
        <div className="grid grid-cols-12 gap-2 pt-1 border-t items-end">
          <div className="col-span-4">
            <Select
              label="Tier Unit"
              value={tierUnit}
              onChange={(e) => handleTierUnitChange(e.target.value)}
              options={baseUnitOptions.filter(([val]) => val !== watchPurchaseUnit && val !== watchSaleUnit)}
            />
          </div>
          <div className="col-span-3">
            <Label className="text-xs mb-1 block">Cost (₹)</Label>
            <Field
              type="number"
              step="0.01"
              placeholder="0.00"
              value={tierCost}
              onChange={(e) => setTierCost(parseFloat(e.target.value) || 0)}
              className="h-9"
            />
          </div>
          <div className="col-span-3">
            <Label className="text-xs mb-1 block">Sale (₹)</Label>
            <Field
              type="number"
              step="0.01"
              placeholder="0.00"
              value={tierSale}
              onChange={(e) => setTierSale(parseFloat(e.target.value) || 0)}
              className="h-9"
            />
          </div>
          <div className="col-span-2 flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTier}
              className="h-9 text-xs px-2 w-full"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={mutation.isPending}>
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Catalog Item" : "Add New Item"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update standard purchase unit, sale unit, prices, and unit tiers."
              : "Create a new product item with default purchase unit & cost and default sale unit & selling price."}
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
