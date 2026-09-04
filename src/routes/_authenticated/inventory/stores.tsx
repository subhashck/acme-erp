import { createFileRoute } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery, queryClient } from "@/lib/query";
import { client } from "@/services/rpc";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Field } from "@/components/Field";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  RefreshCw,
  Warehouse,
  Building2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Badge } from "@/ui/badge";
import { cn } from "@/utils/cn";

const storeFormSchema = z.object({
  name: z.string().min(2, "Store name must be at least 2 characters"),
  code: z.string().min(2, "Code must be at least 2 characters").toUpperCase(),
  type: z.enum(["central", "retail_pharmacy", "ward", "college", "lab"]),
  departmentId: z.coerce.number().positive().optional().nullable(),
  location: z.string().optional().nullable().or(z.literal("")),
  isDefault: z.boolean().default(false),
  active: z.boolean().default(true),
});

type StoreFormValues = z.infer<typeof storeFormSchema>;

export const Route = createFileRoute("/_authenticated/inventory/stores")({
  component: Stores
});

function Stores() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingStore, setEditingStore] = React.useState<any | null>(null);

  const { data: storesList = [], isLoading, refetch, isRefetching } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  const { data: departmentsResponse = [] } = useRpcQuery<any>(
    ["masters-departments-all"],
    () => client.masters.departments.$get()
  );

  const departmentsList: any[] = Array.isArray(departmentsResponse)
    ? departmentsResponse
    : (departmentsResponse as any)?.data || [];

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema) as any,
    defaultValues: {
      name: "",
      code: "",
      type: "retail_pharmacy",
      departmentId: null,
      location: "",
      isDefault: false,
      active: true,
    },
  });

  React.useEffect(() => {
    if (editingStore) {
      form.reset({
        name: editingStore.name || "",
        code: editingStore.code || "",
        type: editingStore.type || "retail_pharmacy",
        departmentId: editingStore.departmentId ? Number(editingStore.departmentId) : null,
        location: editingStore.location || "",
        isDefault: !!editingStore.isDefault,
        active: editingStore.active !== false,
      });
    } else {
      form.reset({
        name: "",
        code: "",
        type: "retail_pharmacy",
        departmentId: null,
        location: "",
        isDefault: false,
        active: true,
      });
    }
  }, [editingStore, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: StoreFormValues) => {
      if (editingStore) {
        const res = await (client.inventory.stores as any)[":id"].$patch({
          param: { id: String(editingStore.id) },
          json: values,
        });
        if (!res.ok) {
          const err: any = await res.json();
          throw new Error(err.error || "Failed to update store");
        }
        return res.json();
      } else {
        const res = await client.inventory.stores.$post({
          json: values,
        });
        if (!res.ok) {
          const err: any = await res.json();
          throw new Error(err.error || "Failed to create store");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      toast.success(editingStore ? "Store updated successfully" : "Store created successfully");
      queryClient.invalidateQueries({ queryKey: ["inventory-stores"] });
      setDialogOpen(false);
      setEditingStore(null);
      form.reset();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await (client.inventory.stores as any)[":id"].$delete({
        param: { id: String(id) },
      });
      if (!res.ok) {
        const err: any = await res.json();
        throw new Error(err.error || "Failed to deactivate store");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Store deactivated successfully");
      queryClient.invalidateQueries({ queryKey: ["inventory-stores"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const columns: ColumnDef<Record<string, unknown>>[] = [
    {
      id: "code",
      label: "Code",
      render: (row) => (
        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
          {String(row.code || "")}
        </span>
      ),
    },
    {
      id: "name",
      label: "Store Name",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Warehouse className="w-4 h-4 text-emerald-600" />
          <span className="font-medium text-slate-900 dark:text-slate-100">{String(row.name || "")}</span>
          {Boolean(row.isDefault) && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              Default Main Store
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: "type",
      label: "Type",
      render: (row) => {
        const typeMap: Record<string, string> = {
          central: "Central Warehouse",
          retail_pharmacy: "Retail Pharmacy",
          ward: "Ward Sub-Store",
          college: "College Dispensary",
          lab: "Laboratory Store",
        };
        const typeVal = String(row.type || "");
        return (
          <Badge className="capitalize bg-slate-100 text-slate-700 border-slate-200">
            {typeMap[typeVal] || typeVal}
          </Badge>
        );
      },
    },
    {
      id: "department",
      label: "Department",
      render: (row) => (
        row.departmentName ? (
          <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
            <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{String(row.departmentName)}</span>
          </div>
        ) : (
          <span className="text-slate-400 italic text-xs">Unlinked</span>
        )
      ),
    },
    {
      id: "location",
      label: "Location",
      render: (row) => (row.location ? String(row.location) : <span className="text-slate-400 italic">Not set</span>),
    },
    {
      id: "active",
      label: "Status",
      render: (row) => (
        <Badge
          className={cn(
            row.active
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          )}
        >
          {row.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingStore(row);
              setDialogOpen(true);
            }}
          >
            <Edit2 className="w-4 h-4 text-slate-600" />
          </Button>
          {Boolean(row.active) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(`Are you sure you want to deactivate store "${row.name}"?`)) {
                  deleteMutation.mutate(Number(row.id));
                }
              }}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ModuleLayout
      title="Stores & Warehouses"
      description="Manage multi-store locations, central warehouses, and hospital dispensing units"
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
            onClick={() => {
              setEditingStore(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Store
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
            <DataTable columns={columns} rows={storesList as Record<string, unknown>[]} />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-125">
          <DialogHeader>
            <DialogTitle>{editingStore ? "Edit Store" : "Create Store"}</DialogTitle>
            <DialogDescription>
              Enter the warehouse or store location details below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))} className="space-y-4 pt-4">
            <Field label="Store Code *" error={form.formState.errors.code?.message}>
              <Input
                {...form.register("code")}
                placeholder="e.g. MAIN-WH, PHARM-01"
                className="font-mono uppercase"
              />
            </Field>

            <Field label="Store Name *" error={form.formState.errors.name?.message}>
              <Input
                {...form.register("name")}
                placeholder="e.g. Central Warehouse / OPD Pharmacy"
              />
            </Field>

            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Field label="Store Type *" error={form.formState.errors.type?.message}>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select store type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="central">Central Warehouse</SelectItem>
                      <SelectItem value="retail_pharmacy">Retail / OPD Pharmacy</SelectItem>
                      <SelectItem value="ward">Ward Sub-Store</SelectItem>
                      <SelectItem value="college">College Dispensary</SelectItem>
                      <SelectItem value="lab">Laboratory Store</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <Field label="Linked Department (Cost Center)" error={form.formState.errors.departmentId?.message}>
                  <Select
                    value={field.value ? String(field.value) : "none"}
                    onValueChange={(val) => field.onChange(val === "none" ? null : Number(val))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select linked department..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No Department (Central / General) —</SelectItem>
                      {departmentsList.map((d: any) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name} {d.headName ? `(Head: ${d.headName})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Linking a department enables internal consumable vouchers and approval workflow by the department head/subhead.
                  </p>
                </Field>
              )}
            />

            <Field label="Location / Physical Address" error={form.formState.errors.location?.message}>
              <Input
                {...form.register("location")}
                placeholder="e.g. Ground Floor, Block B"
              />
            </Field>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isDefault"
                {...form.register("isDefault")}
                className="h-4 w-4 rounded  text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="isDefault" className="text-sm font-medium ">
                Set as Default Main Receiving Store
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                {...form.register("active")}
                className="h-4 w-4 rounded  text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="active" className="text-sm font-medium ">
                Active
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingStore ? "Update Store" : "Create Store"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
