import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Plus, Loader2, Package, Save } from "lucide-react";
import { toast } from "sonner";

import { queryClient, useRpcQuery } from "../lib/query";
import { client } from "../services/rpc";
import { Field } from "./Field";
import { Button } from "../ui/button";
import { Select } from "../ui/select";
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
  unit: z.string().min(1, "Unit is required (e.g. Nos, Box, Kg)"),
  rate: z.coerce.number().min(0, "Rate must be >= 0"),
  gstPercent: z.coerce.number().min(0).optional().default(0),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;

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

  const isEditing = Boolean(editingItem);

  const form = useForm<ItemFormValues>({
    // @ts-ignore
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: editingItem?.name || initialName,
      itemTypeId: editingItem?.itemTypeId || 0,
      unit: editingItem?.unit || "Nos",
      rate: Number(editingItem?.rate || 0),
      gstPercent: Number(editingItem?.gstPercent || 0),
    },
  });

  React.useEffect(() => {
    if (editingItem) {
      form.reset({
        name: editingItem.name || "",
        itemTypeId: Number(editingItem.itemTypeId || 0),
        unit: editingItem.unit || "Nos",
        rate: Number(editingItem.rate || 0),
        gstPercent: Number(editingItem.gstPercent || 0),
      });
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

  const mutation = useMutation({
    mutationFn: async (data: ItemFormValues) => {
      if (isEditing && editingItem?.id) {
        const res = await client.items[":id"].$patch({
          param: { id: String(editingItem.id) },
          json: {
            name: data.name,
            itemTypeId: Number(data.itemTypeId),
            unit: data.unit,
            rate: Number(data.rate),
            gstPercent: Number(data.gstPercent || 0),
          },
        } as any);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any)?.error || "Failed to update item");
        }
        return res.json();
      } else {
        const res = await client.items.$post({
          json: {
            name: data.name,
            itemTypeId: Number(data.itemTypeId),
            unit: data.unit,
            rate: Number(data.rate),
            gstPercent: Number(data.gstPercent || 0),
          },
        } as any);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any)?.error || "Failed to create item");
        }
        return res.json();
      }
    },
    onSuccess: async (savedItem) => {
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
          label="Unit of Measurement *"
          placeholder="e.g. Nos, Box, Kg, Pack"
          {...form.register("unit")}
          error={form.formState.errors.unit?.message}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Unit Rate (₹) *"
          type="number"
          step="0.01"
          placeholder="0.00"
          {...form.register("rate")}
          error={form.formState.errors.rate?.message}
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Catalog Item" : "Add New Item"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update standard item details, category, rates, and GST."
              : "Create a new product item in master catalog."}
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
