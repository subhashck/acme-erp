import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Edit2 } from "lucide-react";
import { queryClient, useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Field } from "@/components/Field";
import { Button } from "@/ui/button";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { useState } from "react";
import { ModuleLayout } from "@/components/ModuleLayout";

export const Route = createFileRoute("/_authenticated/masters/banks")({
  component: Banks
});

const schema = z.object({
  name: z.string().min(2),
  active: z.boolean().default(true)
});

type BankInput = z.output<typeof schema>;
type BankRow = { id: number; name: string; active: boolean };

function Banks() {
  const query = useRpcQuery<BankRow[]>(["masters-banks"], () => client.masters.banks.$get());
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<z.input<typeof schema>, unknown, BankInput>({
    resolver: zodResolver(schema),
    defaultValues: { active: true }
  });

  const submit = form.handleSubmit(async (values) => {
    if (editingId) {
      await (client.masters.banks as any)[":id"].$put({
        param: { id: editingId.toString() },
        json: values
      });
    } else {
      await client.masters.banks.$post({ json: values });
    }

    form.reset({ name: "", active: true });
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["masters-banks"] });
  });

  const handleEdit = (row: BankRow) => {
    setEditingId(row.id);
    form.reset({
      name: row.name,
      active: row.active
    });
  };

  const columns: ColumnDef<BankRow>[] = [
    ["name", "Name"],
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
      title="Banks"
      description="Manage the list of banks for staff salary processing."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader><CardTitle>{editingId ? "Edit Bank" : "Add Bank"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="relative">
              {form.formState.isSubmitting && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                    <p className="text-sm font-medium">Submitting...</p>
                  </div>
                </div>
              )}
              <fieldset disabled={form.formState.isSubmitting} className="grid gap-4">
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
              </fieldset>
            </form>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardContent className="p-0">
            <DataTable rows={query.data ?? []} columns={columns} isLoading={query.isLoading} />
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
