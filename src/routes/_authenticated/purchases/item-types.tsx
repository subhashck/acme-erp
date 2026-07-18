import { createFileRoute } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery, queryClient } from "@/lib/query";
import { client } from "@/services/rpc";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Field } from "@/components/Field";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  Layers, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  RefreshCw
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

const itemTypeFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional().nullable(),
});

type ItemTypeFormValues = z.infer<typeof itemTypeFormSchema>;

export const Route = createFileRoute("/_authenticated/purchases/item-types")({
  component: ItemTypes
});

function ItemTypes() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingItemType, setEditingItemType] = React.useState<any | null>(null);

  const { data: itemTypes = [], isLoading, refetch, isRefetching } = useRpcQuery<any[]>(
    ["item-types"],
    () => client["item-types"].$get()
  );

  const form = useForm<ItemTypeFormValues>({
    resolver: zodResolver(itemTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  React.useEffect(() => {
    if (editingItemType) {
      form.reset({
        name: editingItemType.name,
        description: editingItemType.description || "",
      });
    } else {
      form.reset({
        name: "",
        description: "",
      });
    }
  }, [editingItemType, dialogOpen]);

  const mutation = useMutation({
    mutationFn: async (data: ItemTypeFormValues) => {
      if (editingItemType) {
        const res = await client["item-types"][":id"].$patch({
          param: { id: String(editingItemType.id) },
          json: data,
        } as any);
        if (!res.ok) throw new Error("Failed to update item type");
        return res.json();
      } else {
        const res = await client["item-types"].$post({
          json: data,
        } as any);
        if (!res.ok) throw new Error("Failed to create item type");
        return res.json();
      }
    },
    onSuccess: () => {
      toast.success(editingItemType ? "Item type updated successfully" : "Item type created successfully");
      queryClient.invalidateQueries({ queryKey: ["item-types"] });
      setDialogOpen(false);
      setEditingItemType(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Something went wrong");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await client["item-types"][":id"].$delete({
        param: { id: String(id) },
      } as any);
      if (!res.ok) {
        const errorData = await (res.json() as Promise<any>).catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete item type");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Item type deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["item-types"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete item type");
    }
  });

  const onSubmit = (values: ItemTypeFormValues) => {
    mutation.mutate(values);
  };

  return (
    <ModuleLayout
      title="Item Types Master"
      description="Manage categorization types for purchase items."
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={() => { setEditingItemType(null); setDialogOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Add Item Type
          </Button>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto py-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Layers className="text-primary size-5" />
            <div>
              <CardTitle>Item Types Registry</CardTitle>
              <CardDescription>All category groupings for standard catalog items.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : itemTypes.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No item types registered. Click "Add Item Type" to define a new type.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-slate-50 dark:bg-slate-900 border-b">
                    <tr>
                      <th className="px-6 py-3">Name</th>
                      <th className="px-6 py-3">Description</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemTypes.map((type: any) => (
                      <tr key={type.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-primary">{type.name}</td>
                        <td className="px-6 py-4 text-muted-foreground">{type.description || "—"}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => { setEditingItemType(type); setDialogOpen(true); }}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this item type?")) {
                                deleteMutation.mutate(type.id);
                              }
                            }}
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItemType ? "Edit Item Type" : "Add Item Type"}</DialogTitle>
            <DialogDescription>Define a category mapping for hospital inventory items.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 pt-4">
            <Field 
              label="Type Name *" 
              placeholder="e.g. Medical Supplies, Pharmacy, Office Assets..." 
              {...form.register("name")} 
              error={form.formState.errors.name?.message} 
            />
            <div className="flex flex-col space-y-1.5">
              <label className="text-sm font-medium leading-none">Description</label>
              <textarea 
                placeholder="Optional notes or details about this grouping..." 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...form.register("description")} 
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Item Type
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
