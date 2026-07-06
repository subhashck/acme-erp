import { createFileRoute } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Field } from "@/components/Field";
import { Button } from "@/ui/button";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { Plus, Edit2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { StaffRow } from "@/types";
import { Badge } from "@/ui/badge";
import { ModuleLayout } from "@/components/ModuleLayout";

export const Route = createFileRoute("/_authenticated/masters/departments")({
  component: Departments
});

const schema = z.object({
  name: z.string().min(2),
  floor: z.string().min(1),
  headStaffId: z.number().int().positive().nullable().optional(),
  subheadStaffId: z.number().int().positive().nullable().optional(),
  active: z.boolean().default(true)
});

type DepartmentRow = { 
  id: number; 
  name: string; 
  floor: string; 
  head: string; 
  active: boolean;
  headStaffId?: number | null;
  headName?: string | null;
  subheadStaffId?: number | null;
  subheadName?: string | null;
};
type DepartmentInput = z.output<typeof schema>;

interface AutocompleteProps {
  label: string;
  value: number | null;
  onChange: (id: number | null) => void;
  options: { id: number; name: string; code: string }[];
  placeholder?: string;
}

function Autocomplete({ label, value, onChange, options, placeholder }: AutocompleteProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize input text with the selected staff member name when value changes
  useEffect(() => {
    const selected = options.find((opt) => opt.id === value);
    setQuery(selected ? `${selected.name} (${selected.code})` : "");
  }, [value, options]);

  // Filter options based on query
  const filtered = query
    ? options.filter((opt) =>
        opt.name.toLowerCase().includes(query.toLowerCase()) ||
        opt.code.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset query to match selected value
        const selected = options.find((opt) => opt.id === value);
        setQuery(selected ? `${selected.name} (${selected.code})` : "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value, options]);

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          // If query is cleared, clear selected value
          if (!e.target.value) {
            onChange(null);
          }
        }}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
      />
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <div
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  setQuery(`${opt.name} (${opt.code})`);
                  setIsOpen(false);
                }}
                className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {opt.name} <span className="ml-2 text-xs text-muted-foreground font-mono">({opt.code})</span>
              </div>
            ))
          ) : (
            <div className="relative flex select-none items-center px-3 py-2 text-sm text-muted-foreground">
              No staff found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Departments() {
  const query = useRpcQuery<DepartmentRow[]>(["masters-departments"], () => client.masters.departments.$get());
  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () => client.hr.staff.$get());
  const [editingId, setEditingId] = useState<number | null>(null);

  // When editing, restrict options to staff assigned to that department.
  // When adding a new department, show all staff (no dept exists to filter against yet).
  const editingDept = editingId ? (query.data ?? []).find((d) => d.id === editingId) : null;

  const staffOptions = (staffQuery.data ?? [])
    .filter((s) => !editingDept || s.departmentName === editingDept.name)
    .map((s) => ({
      id: s.staffId,
      name: s.name,
      code: s.employeeCode
    }));

  const form = useForm<z.input<typeof schema>, unknown, DepartmentInput>({
    resolver: zodResolver(schema),
    defaultValues: { active: true, headStaffId: null, subheadStaffId: null }
  });

  const submit = form.handleSubmit(async (values) => {
    if (editingId) {
      await (client.masters.departments as any)[":id"].$put({
        param: { id: editingId.toString() },
        json: values
      });
    } else {
      await client.masters.departments.$post({ json: values });
    }
    form.reset({ name: "", floor: "", headStaffId: null, subheadStaffId: null, active: true });
    setEditingId(null);
    queryClient.invalidateQueries({ queryKey: ["masters-departments"] });
    queryClient.invalidateQueries({ queryKey: ["departments"] });
  });

  const handleEdit = (row: DepartmentRow) => {
    setEditingId(row.id);
    form.reset({
      name: row.name,
      floor: row.floor,
      headStaffId: row.headStaffId ?? null,
      subheadStaffId: row.subheadStaffId ?? null,
      active: row.active
    });
  };

  const columns: ColumnDef<DepartmentRow>[] = [
    ["name", "Name"],
    ["floor", "Floor"],
    {
      id: "head",
      label: "Department Head",
      render: (row) => row.headName || "—"
    },
    {
      id: "subhead",
      label: "Sub-Head",
      render: (row) => row.subheadName || "—"
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
      title="Departments"
      description="Manage hospital departments, physical locations (floors), and assign department heads and sub-heads."
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader><CardTitle>{editingId ? "Edit Department" : "Add Department"}</CardTitle></CardHeader>
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
              <Field label="Floor" {...form.register("floor")} />

              {editingId && (
                <>
                  <Controller
                    control={form.control}
                    name="headStaffId"
                    render={({ field }) => (
                      <Autocomplete
                        label="Department Head"
                        value={field.value ?? null}
                        onChange={field.onChange}
                        options={staffOptions}
                        placeholder="Type name or code to search..."
                      />
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="subheadStaffId"
                    render={({ field }) => (
                      <Autocomplete
                        label="Department Sub-Head"
                        value={field.value ?? null}
                        onChange={field.onChange}
                        options={staffOptions}
                        placeholder="Type name or code to search..."
                      />
                    )}
                  />
                </>
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
                    form.reset({ name: "", floor: "", headStaffId: null, subheadStaffId: null, active: true });
                  }}>Cancel</Button>
                )}
              </div>
              </fieldset>
            </form>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Departments</CardTitle></CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <DataTable rows={query.data ?? []} columns={columns} isLoading={query.isLoading} />
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-border ">
              {(query.data ?? []).length > 0 ? (
                (query.data ?? []).map((row) => (
                  <div key={row.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">
                        {row.name}
                      </span>
                      <Badge variant={row.active ? "default" : "destructive"}>
                        {row.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                      <div>
                        <p className="text-muted-foreground font-medium">Floor</p>
                        <p className="text-foreground font-semibold mt-0.5">{row.floor}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-medium">Department Head</p>
                        <p className="text-foreground font-semibold mt-0.5">{row.headName || "—"}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground font-medium">Sub-Head</p>
                        <p className="text-foreground font-semibold mt-0.5">{row.subheadName || "—"}</p>
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
                        <Edit2 size={14} /> Edit Department
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No departments found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
