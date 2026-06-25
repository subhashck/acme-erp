import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import type { RoleTypeRow } from "@/types";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Button } from "@/ui/button";
import { Field } from "@/components/Field";
import { Plus, Edit2 } from "lucide-react";
import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";

export const Route = createFileRoute("/_authenticated/masters/roles")({
  component: Roles
});

const schema = z.object({
  name: z.string().min(2),
  active: z.boolean().default(true)
});

type RoleInput = z.output<typeof schema>;

function Roles() {
  const query = useRpcQuery<RoleTypeRow[]>(["masters-roles"], () => client.masters.roles.$get());
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<z.input<typeof schema>, unknown, RoleInput>({
    resolver: zodResolver(schema),
    defaultValues: { active: true }
  });

  const submit = form.handleSubmit(async (values) => {
    if (editingId) {
      await (client.masters.roles as any)[":id"].$put({
        param: { id: editingId.toString() },
        json: values
      });
    } else {
      await client.masters.roles.$post({ json: values });
    }
    form.reset({ name: "", active: true });
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["masters-roles"] });
  });

  const handleEdit = (row: RoleTypeRow) => {
    setEditingId(row.id);
    form.reset({
      name: row.name,
      active: row.active
    });
  };

  const columns: ColumnDef<RoleTypeRow>[] = [
    ["name", "Role Name"],
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
      title="Roles"
      description="Manage organizational roles and designation titles for hospital staff members."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader><CardTitle>{editingId ? "Edit Role" : "Add Role"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4">
              <Field label="Name" {...form.register("name")} />
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" {...form.register("active")} />
                <label htmlFor="active" className="text-sm">Active</label>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit"><Plus size={16} className="mr-2" /> {editingId ? "Update" : "Add"}</Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={() => {
                    setEditingId(null);
                    form.reset({ name: "", active: true });
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
