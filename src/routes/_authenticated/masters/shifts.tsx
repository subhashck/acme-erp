import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import type { ShiftRow } from "@/types";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Button } from "@/ui/button";
import { Field } from "@/components/Field";
import { Plus, Edit2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/ui/badge";
import { ModuleLayout } from "@/components/ModuleLayout";

export const Route = createFileRoute("/_authenticated/masters/shifts")({
  component: Shifts
});

const schema = z.object({
  name: z.string().min(2),
  code: z.string().min(1).max(10),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format: HH:MM"),
  active: z.boolean().default(true)
});

type ShiftInput = z.output<typeof schema>;

function Shifts() {
  const query = useRpcQuery<ShiftRow[]>(["masters-shifts"], () => client.masters.shifts.$get());
  const [editingId, setEditingId] = useState<number | null>(null);
  const form = useForm<z.input<typeof schema>, unknown, ShiftInput>({
    resolver: zodResolver(schema),
    defaultValues: { active: true, code: "" }
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      if (editingId) {
        await (client.masters.shifts as any)[":id"].$put({ 
          param: { id: editingId.toString() }, 
          json: values 
        });
      } else {
        await client.masters.shifts.$post({ json: values });
      }
      form.reset({ name: "", code: "", startTime: "", endTime: "", active: true });
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["masters-shifts"] });
    } catch (error) {
      console.error(error);
    }
  });

  const handleEdit = (row: ShiftRow) => {
    setEditingId(row.id);
    form.reset({
      name: row.name,
      code: row.code || "",
      startTime: row.startTime,
      endTime: row.endTime,
      active: row.active
    });
  };

  const columns: ColumnDef<ShiftRow>[] = [
    ["name", "Shift Name"],
    ["code", "Short Code"],
    ["startTime", "Start Time"],
    ["endTime", "End Time"],
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
      title="Shifts"
      description="Define standard and rotational working shift timings for staff members."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader><CardTitle>{editingId ? "Edit Shift" : "Add Shift"}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4">
              <Field label="Shift Name" {...form.register("name")} placeholder="e.g., Morning" />
              <Field label="Short Code" {...form.register("code")} placeholder="e.g., M" />
              <Field label="Start Time" {...form.register("startTime")} placeholder="HH:MM" />
              <Field label="End Time" {...form.register("endTime")} placeholder="HH:MM" />
              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" {...form.register("active")} />
                <label htmlFor="active" className="text-sm">Active</label>
              </div>
              <div className="flex gap-2">
                <Button type="submit"><Plus size={16} className="mr-2" /> {editingId ? "Update" : "Add"}</Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={() => {
                    setEditingId(null);
                    form.reset({ name: "", code: "", startTime: "", endTime: "", active: true });
                  }}>Cancel</Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Shifts</CardTitle></CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <DataTable rows={query.data ?? []} columns={columns} />
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-border">
              {(query.data ?? []).length > 0 ? (
                (query.data ?? []).map((row) => (
                  <div key={row.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">
                        {row.name} <span className="text-xs text-muted-foreground font-mono ml-1.5">({row.code})</span>
                      </span>
                      <Badge variant={row.active ? "default" : "destructive"}>
                        {row.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                      <div>
                        <p className="text-muted-foreground font-medium">Start Time</p>
                        <p className="text-foreground font-semibold mt-0.5">{row.startTime}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium">End Time</p>
                        <p className="text-foreground font-semibold mt-0.5">{row.endTime}</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        variant="outline"
                        className="w-full flex items-center justify-center gap-1.5"
                        onClick={() => {
                          handleEdit(row);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        <Edit2 size={14} /> Edit Shift
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No shifts found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
