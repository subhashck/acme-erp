import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit2 } from "lucide-react";
import { queryClient, useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { LeaveTypeRow } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Field } from "@/components/Field";
import { Button } from "@/ui/button";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";

export const Route = createFileRoute("/_authenticated/masters/leave-types")({
  component: LeaveTypes
});

const schema = z.object({
  name: z.string().min(2),
  maxDays: z.coerce.number().int().min(0),
  active: z.boolean().default(true),
  payable: z.boolean().default(true),
  paymentRate: z.coerce.number().min(0).max(100).default(100.0)
});

type LeaveTypeInput = z.output<typeof schema>;

function LeaveTypes() {
  const query = useRpcQuery<LeaveTypeRow[]>(["masters-leave-types"], () => client.masters["leave-types"].$get());
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<z.input<typeof schema>, unknown, LeaveTypeInput>({
    resolver: zodResolver(schema),
    defaultValues: { maxDays: 0, active: true, payable: true, paymentRate: 100.0 }
  });

  const payable = form.watch("payable");

  const submit = form.handleSubmit(async (values) => {
    // If not payable, force payment rate to 0
    const payload = {
      ...values,
      paymentRate: values.payable ? values.paymentRate : 0
    };

    if (editingId) {
      await (client.masters["leave-types"] as any)[":id"].$put({
        param: { id: editingId.toString() },
        json: payload
      });
    } else {
      await client.masters["leave-types"].$post({ json: payload });
    }

    form.reset({ name: "", maxDays: 0, active: true, payable: true, paymentRate: 100.0 });
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["masters-leave-types"] });
  });

  const handleEdit = (row: LeaveTypeRow) => {
    setEditingId(row.id);
    form.reset({
      name: row.name,
      maxDays: row.maxDays,
      active: row.active,
      payable: row.payable,
      paymentRate: row.paymentRate ?? 100
    });
  };

  const columns: ColumnDef<LeaveTypeRow>[] = [
    ["name", "Name"],
    ["maxDays", "Max Days"],
    {
      id: "payable",
      label: "Payable",
      render: (row) => row.payable ? `Yes (${row.paymentRate ?? 100}%)` : "No"
    },
    ["active", "Active"],
    {
      id: "actions",
      label: "Actions",
      render: (row) => (
        <Button variant="ghost" onClick={() => handleEdit(row)}>
          <Edit2 size={16} />
        </Button>
      )
    }
  ];

  return (
    <ModuleLayout
      title="Leave Types"
      description="Configure leave categories, specify annual limits, and set payment rates for paid or unpaid leaves."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader><CardTitle>{editingId ? "Edit Leave Type" : "Add Leave Type"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4">
              <Field label="Name" {...form.register("name")} />
              <Field label="Max Days" type="number" {...form.register("maxDays")} />
              
              <div className="flex items-center gap-2">
                <input type="checkbox" id="payable" {...form.register("payable")} />
                <label htmlFor="payable" className="text-sm">Payable</label>
              </div>

              {payable && (
                <Field 
                  label="Payment Rate (% of Gross Pay)" 
                  type="number" 
                  {...form.register("paymentRate")} 
                  placeholder="e.g. 100" 
                />
              )}

              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" {...form.register("active")} />
                <label htmlFor="active" className="text-sm">Active</label>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit"><Plus size={16} className="mr-2" /> {editingId ? "Update" : "Add"}</Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={() => {
                    setEditingId(null);
                    form.reset({ name: "", maxDays: 0, active: true, payable: true, paymentRate: 100.0 });
                  }}>Cancel</Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardContent className="p-0">
            <DataTable rows={query.data ?? []} columns={columns} />
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
