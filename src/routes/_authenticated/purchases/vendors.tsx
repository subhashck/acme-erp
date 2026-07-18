import { createFileRoute } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery, queryClient } from "@/lib/query";
import { client } from "@/services/rpc";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/ui/card";
import { Button } from "@/ui/button";
import { Field } from "@/components/Field";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { 
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
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Badge } from "@/ui/badge";
import { cn } from "@/utils/cn";

const vendorFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  gstNumber: z.string().optional().nullable().or(z.literal("")),
  contactPerson: z.string().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable().or(z.literal("")),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

export const Route = createFileRoute("/_authenticated/purchases/vendors")({
  component: Vendors
});

function Vendors() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingVendor, setEditingVendor] = React.useState<any | null>(null);

  const { data: vendorsList = [], isLoading, refetch, isRefetching } = useRpcQuery<any[]>(
    ["vendors"],
    () => client.vendors.$get()
  );

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      name: "",
      gstNumber: "",
      contactPerson: "",
      phone: "",
      address: "",
    },
  });

  React.useEffect(() => {
    if (editingVendor) {
      form.reset({
        name: editingVendor.name,
        gstNumber: editingVendor.gstNumber || "",
        contactPerson: editingVendor.contactPerson || "",
        phone: editingVendor.phone || "",
        address: editingVendor.address || "",
      });
    } else {
      form.reset({
        name: "",
        gstNumber: "",
        contactPerson: "",
        phone: "",
        address: "",
      });
    }
  }, [editingVendor, dialogOpen]);

  const mutation = useMutation({
    mutationFn: async (data: VendorFormValues) => {
      const payload = {
        name: data.name,
        gstNumber: data.gstNumber || null,
        contactPerson: data.contactPerson || null,
        phone: data.phone || null,
        address: data.address || null,
      };

      if (editingVendor) {
        const res = await (client.vendors as any)[":id"].$patch({
          param: { id: String(editingVendor.id) },
          json: payload,
        } as any);
        if (!res.ok) throw new Error("Failed to update vendor");
        return res.json();
      } else {
        const res = await client.vendors.$post({
          json: payload,
        } as any);
        if (!res.ok) throw new Error("Failed to create vendor");
        return res.json();
      }
    },
    onSuccess: () => {
      toast.success(editingVendor ? "Vendor updated successfully" : "Vendor created successfully");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setDialogOpen(false);
      setEditingVendor(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Something went wrong");
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const res = await (client.vendors as any)[":id"].$patch({
        param: { id: String(id) },
        json: { active },
      } as any);
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Vendor status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update vendor status");
    }
  });

  const handleToggleActive = (vendor: any) => {
    const action = vendor.active ? "deactivate" : "activate";
    if (window.confirm(`Are you sure you want to ${action} the vendor "${vendor.name}"?`)) {
      toggleActiveMutation.mutate({
        id: vendor.id,
        active: !vendor.active
      });
    }
  };

  const onSubmit = (values: VendorFormValues) => {
    mutation.mutate(values);
  };

  const columns: ColumnDef<any>[] = [
    {
      id: "name",
      label: "Vendor Name",
      render: (row) => <span className="font-semibold text-primary">{row.name}</span>,
      sortKey: "name"
    },
    {
      id: "contactPerson",
      label: "Contact Person",
      render: (row) => row.contactPerson || "—"
    },
    {
      id: "phone",
      label: "Phone",
      render: (row) => row.phone || "—"
    },
    {
      id: "gstNumber",
      label: "GST Number",
      render: (row) => <span className="font-mono text-xs">{row.gstNumber || "—"}</span>
    },
    {
      id: "address",
      label: "Address",
      render: (row) => row.address || "—"
    },
    {
      id: "active",
      label: "Status",
      render: (row) => (
        <Badge
          className={cn(
            row.active 
              ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/30 font-bold" 
              : "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-950/30 dark:text-slate-355 dark:border-slate-900/30 font-bold"
          )}
        >
          {row.active ? "Active" : "Inactive"}
        </Badge>
      ),
      sortKey: "active"
    },
    {
      id: "actions",
      label: "Actions",
      className: "text-right",
      headerClassName: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => { setEditingVendor(row); setDialogOpen(true); }}
            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => handleToggleActive(row)}
            className={cn(
              "h-8 w-8",
              row.active 
                ? "text-rose-600 hover:text-rose-700 hover:bg-rose-50" 
                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            )}
            title={row.active ? "Deactivate Vendor" : "Activate Vendor"}
          >
            {row.active ? <Trash2 className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      )
    }
  ];

  return (
    <ModuleLayout
      title="Suppliers & Vendors"
      description="Manage details, contact information, and terms for external vendors and suppliers."
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading || isRefetching}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={() => { setEditingVendor(null); setDialogOpen(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Add Vendor
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Card className="border border-border shadow-xs bg-white/70 dark:bg-slate-900/40 backdrop-blur p-0">
          <CardContent className="p-0">
            <DataTable
              rows={vendorsList}
              columns={columns}
              enablePagination
              enableSorting
              enableFiltering
              filterPlaceholder="Search vendors..."
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVendor ? "Edit Vendor Details" : "Add Vendor/Supplier"}</DialogTitle>
            <DialogDescription>Define contacts, address, and GST terms for external vendors.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <Field 
              label="Vendor Name *" 
              placeholder="e.g. Acme Healthcare Products Ltd." 
              {...form.register("name")} 
              error={form.formState.errors.name?.message} 
            />
            <Field 
              label="GST Number" 
              placeholder="e.g. 27AAAAA1111A1Z1" 
              {...form.register("gstNumber")} 
              error={form.formState.errors.gstNumber?.message} 
            />
            <Field 
              label="Contact Person" 
              placeholder="e.g. John Doe (Sales Manager)" 
              {...form.register("contactPerson")} 
              error={form.formState.errors.contactPerson?.message} 
            />
            <Field 
              label="Phone Number" 
              placeholder="e.g. +91 98765 43210" 
              {...form.register("phone")} 
              error={form.formState.errors.phone?.message} 
            />
            <div className="flex flex-col space-y-1.5">
              <label className="text-sm font-medium leading-none">Address</label>
              <textarea 
                placeholder="Vendor corporate or warehouse address..." 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...form.register("address")} 
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Vendor
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
