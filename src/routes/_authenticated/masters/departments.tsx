import { createFileRoute } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { queryClient, useRpcQuery } from "@/lib/query";
import { useQuery } from "@tanstack/react-query";
import { client } from "@/services/rpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Field } from "@/components/Field";
import { Button } from "@/ui/button";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import {
  Plus,
  Edit2,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Search,
  Building2,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import type { StaffRow } from "@/types";
import { Badge } from "@/ui/badge";
import { ModuleLayout } from "@/components/ModuleLayout";

export const Route = createFileRoute("/_authenticated/masters/departments")({
  component: Departments,
});

const schema = z.object({
  name: z.string().min(2, "Department name must be at least 2 characters"),
  floor: z.string().min(1, "Floor is required"),
  headStaffId: z.number().int().positive().nullable().optional(),
  subheadStaffId: z.number().int().positive().nullable().optional(),
  active: z.boolean().default(true),
  isClinical: z.boolean().default(false),
});

type DepartmentRow = {
  id: number;
  name: string;
  floor: string;
  head: string;
  active: boolean;
  isClinical?: boolean;
  headStaffId?: number | null;
  headName?: string | null;
  subheadStaffId?: number | null;
  subheadName?: string | null;
};

type DepartmentInput = z.output<typeof schema>;

type PaginatedDepartments = {
  data: DepartmentRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

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

  useEffect(() => {
    const selected = options.find((opt) => opt.id === value);
    setQuery(selected ? `${selected.name} (${selected.code})` : "");
  }, [value, options]);

  const filtered = query
    ? options.filter(
        (opt) =>
          opt.name.toLowerCase().includes(query.toLowerCase()) ||
          opt.code.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
  // Pagination & Filter States
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filter drawer input states
  const [filterName, setFilterName] = useState("");
  const [filterFloor, setFilterFloor] = useState("");
  const [filterClinical, setFilterClinical] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");

  // Applied filter state (drives API calls)
  const [appliedFilters, setAppliedFilters] = useState({
    name: "",
    floor: "",
    isClinical: "all",
    active: "all",
  });

  // Drawer visibility states
  const [isFormDrawerOpen, setIsFormDrawerOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  // Calculate active filters count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (appliedFilters.name) count++;
    if (appliedFilters.floor) count++;
    if (appliedFilters.isClinical !== "all") count++;
    if (appliedFilters.active !== "all") count++;
    return count;
  }, [appliedFilters]);

  // Query paginated departments
  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));
  if (appliedFilters.name) queryParams.set("name", appliedFilters.name);
  if (appliedFilters.floor) queryParams.set("floor", appliedFilters.floor);
  if (appliedFilters.isClinical !== "all") queryParams.set("isClinical", appliedFilters.isClinical);
  if (appliedFilters.active !== "all") queryParams.set("active", appliedFilters.active);

  const deptQuery = useQuery<PaginatedDepartments, Error>({
    queryKey: ["masters-departments-paginated", page, limit, appliedFilters],
    queryFn: async () => {
      const res = await fetch(`/api/masters/departments?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch departments");
      return res.json();
    },
  });

  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () => client.hr.staff.$get());

  const departmentsData = deptQuery.data?.data ?? [];
  const totalRecords = deptQuery.data?.total ?? 0;
  const totalPages = deptQuery.data?.totalPages ?? 1;

  // Filter staff options for department head/sub-head assignment
  const editingDept = editingId ? departmentsData.find((d) => d.id === editingId) : null;
  const staffOptions = (staffQuery.data ?? [])
    .filter((s) => !editingDept || s.departmentName === editingDept.name)
    .map((s) => ({
      id: s.staffId,
      name: s.name,
      code: s.employeeCode,
    }));

  const form = useForm<z.input<typeof schema>, unknown, DepartmentInput>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", floor: "", active: true, isClinical: false, headStaffId: null, subheadStaffId: null },
  });

  const handleOpenCreateForm = () => {
    setEditingId(null);
    form.reset({ name: "", floor: "", headStaffId: null, subheadStaffId: null, active: true, isClinical: false });
    setIsFormDrawerOpen(true);
  };

  const handleEdit = (row: DepartmentRow) => {
    setEditingId(row.id);
    form.reset({
      name: row.name,
      floor: row.floor,
      headStaffId: row.headStaffId ?? null,
      subheadStaffId: row.subheadStaffId ?? null,
      active: row.active,
      isClinical: row.isClinical ?? false,
    });
    setIsFormDrawerOpen(true);
  };

  const handleFormSubmit = form.handleSubmit(async (values) => {
    if (editingId) {
      await (client.masters.departments as any)[":id"].$put({
        param: { id: editingId.toString() },
        json: values,
      });
    } else {
      await client.masters.departments.$post({ json: values });
    }
    form.reset({ name: "", floor: "", headStaffId: null, subheadStaffId: null, active: true, isClinical: false });
    setEditingId(null);
    setIsFormDrawerOpen(false);
    queryClient.invalidateQueries({ queryKey: ["masters-departments-paginated"] });
    queryClient.invalidateQueries({ queryKey: ["masters-departments"] });
    queryClient.invalidateQueries({ queryKey: ["departments"] });
  });

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters({
      name: filterName.trim(),
      floor: filterFloor.trim(),
      isClinical: filterClinical,
      active: filterActive,
    });
    setPage(1);
    setIsFilterDrawerOpen(false);
  };

  const handleClearFilters = () => {
    setFilterName("");
    setFilterFloor("");
    setFilterClinical("all");
    setFilterActive("all");
    setAppliedFilters({
      name: "",
      floor: "",
      isClinical: "all",
      active: "all",
    });
    setPage(1);
    setIsFilterDrawerOpen(false);
  };

  const columns: ColumnDef<DepartmentRow>[] = [
    ["name", "Name"],
    ["floor", "Floor"],
    {
      id: "head",
      label: "Department Head",
      render: (row) => row.headName || "—",
    },
    {
      id: "subhead",
      label: "Sub-Head",
      render: (row) => row.subheadName || "—",
    },
    {
      id: "isClinical",
      label: "Clinical",
      render: (row) => (
        <Badge
          variant="default"
          className={
            row.isClinical
              ? "bg-teal-600 dark:bg-teal-700 text-white"
              : "bg-muted/70 text-muted-foreground border"
          }
        >
          {row.isClinical ? "Clinical" : "Non-Clinical"}
        </Badge>
      ),
    },
    {
      id: "active",
      label: "Status",
      render: (row) => (
        <Badge variant={row.active ? "default" : "destructive"}>
          {row.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      render: (row) => (
        <Button variant="ghost" size="icon" onClick={() => handleEdit(row)} title="Edit Department">
          <Edit2 size={16} />
        </Button>
      ),
    },
  ];

  // Calculate range text
  const startItem = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalRecords);

  return (
    <ModuleLayout
      title="Departments Master"
      description="Manage hospital departments, physical locations (floors), and assign department heads and sub-heads."
    >
      <div className="space-y-4">
        {/* Top Header Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-xs">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-primary" />
            <span className="font-semibold text-sm">
              Total Departments: <span className="text-primary font-bold">{totalRecords}</span>
            </span>
            {activeFilterCount > 0 && (
              <Badge variant="default" className="bg-amber-500 text-white text-xs ml-2">
                {activeFilterCount} active filter{activeFilterCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Toggle Button */}
            <Button
              variant="outline"
              className="gap-2 text-xs relative"
              onClick={() => setIsFilterDrawerOpen(true)}
            >
              <Filter size={15} />
              Filter Search
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            {/* Add Department Button */}
            <Button className="gap-2 text-xs" onClick={handleOpenCreateForm}>
              <Plus size={16} />
              Add Department
            </Button>
          </div>
        </div>

        {/* Department List Table */}
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Department Directory</span>
              <span className="text-xs text-muted-foreground font-normal">
                Page {page} of {totalPages}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <DataTable
                rows={departmentsData}
                columns={columns}
                isLoading={deptQuery.isLoading}
              />
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-border">
              {deptQuery.isLoading ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Loading departments...</div>
              ) : departmentsData.length > 0 ? (
                departmentsData.map((row) => (
                  <div key={row.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">{row.name}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="default"
                          className={
                            row.isClinical
                              ? "bg-teal-600 dark:bg-teal-700 text-white text-[10px]"
                              : "bg-muted/70 text-muted-foreground border text-[10px]"
                          }
                        >
                          {row.isClinical ? "Clinical" : "Non-Clinical"}
                        </Badge>
                        <Badge variant={row.active ? "default" : "destructive"} className="text-[10px]">
                          {row.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
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
                        className="w-full flex items-center justify-center gap-1.5 text-xs h-8"
                        onClick={() => handleEdit(row)}
                      >
                        <Edit2 size={14} /> Edit Department
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm">No departments found</div>
              )}
            </div>

            {/* Pagination Controls Footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-t bg-muted/10 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Show</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-muted-foreground font-medium">entries per page</span>
              </div>

              <div className="text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{startItem}</span> to{" "}
                <span className="font-semibold text-foreground">{endItem}</span> of{" "}
                <span className="font-semibold text-foreground">{totalRecords}</span> entries
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                  title="First Page"
                >
                  <ChevronsLeft size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </Button>
                <span className="px-2 font-semibold">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                  title="Last Page"
                >
                  <ChevronsRight size={14} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Create / Edit Department Slide-Over Drawer                        */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isFormDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Slide-over panel */}
          <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10">
            <div className="w-screen max-w-md bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
                <div>
                  <h3 className="font-semibold text-base text-foreground">
                    {editingId ? "Edit Department" : "Create New Department"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editingId
                      ? "Update department details and leadership assignments."
                      : "Add a new hospital department and physical location."}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setIsFormDrawerOpen(false)}
                >
                  <X size={18} />
                </Button>
              </div>

              {/* Drawer Form Body */}
              <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {form.formState.isSubmitting && (
                    <div className="p-3 rounded-md bg-primary/10 text-primary text-xs font-medium animate-pulse">
                      Saving department...
                    </div>
                  )}

                  <fieldset disabled={form.formState.isSubmitting} className="space-y-4">
                    <Field
                      label="Department Name *"
                      placeholder="e.g. Cardiology, Intensive Care Unit"
                      {...form.register("name")}
                      error={form.formState.errors.name?.message}
                    />

                    <Field
                      label="Floor / Location *"
                      placeholder="e.g. Ground Floor, 2nd Floor Block B"
                      {...form.register("floor")}
                      error={form.formState.errors.floor?.message}
                    />

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
                              placeholder="Search staff by name or employee code..."
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
                              placeholder="Search staff by name or employee code..."
                            />
                          )}
                        />
                      </>
                    )}

                    <div className="pt-2 border-t space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                        <input
                          type="checkbox"
                          id="isClinical"
                          {...form.register("isClinical")}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                        <div>
                          <label htmlFor="isClinical" className="text-sm font-semibold text-foreground block cursor-pointer">
                            Clinical Department
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Check if this department involves patient care and nursing rosters.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                        <input
                          type="checkbox"
                          id="active"
                          {...form.register("active")}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                        />
                        <div>
                          <label htmlFor="active" className="text-sm font-semibold text-foreground block cursor-pointer">
                            Active Status
                          </label>
                          <p className="text-xs text-muted-foreground">
                            Active departments are available across staff assignments and shifts.
                          </p>
                        </div>
                      </div>
                    </div>
                  </fieldset>
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-4 border-t bg-muted/20 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsFormDrawerOpen(false)}
                    disabled={form.formState.isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting} className="gap-2">
                    <Plus size={16} />
                    {editingId ? "Update Department" : "Create Department"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* Search & Filter Slide-Over Drawer                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Slide-over panel */}
          <div className="fixed inset-y-0 right-0 z-50 flex max-w-full pl-10">
            <div className="w-screen max-w-sm bg-background border-l shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
                <div className="flex items-center gap-2">
                  <Filter size={18} className="text-primary" />
                  <h3 className="font-semibold text-base text-foreground">Filter Departments</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => setIsFilterDrawerOpen(false)}
                >
                  <X size={18} />
                </Button>
              </div>

              {/* Drawer Body */}
              <form onSubmit={handleApplyFilters} className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Department Name
                    </label>
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        placeholder="Search by department name..."
                        className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Floor / Location
                    </label>
                    <input
                      type="text"
                      value={filterFloor}
                      onChange={(e) => setFilterFloor(e.target.value)}
                      placeholder="e.g. Ground Floor, Block A..."
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Clinical Category
                    </label>
                    <select
                      value={filterClinical}
                      onChange={(e) => setFilterClinical(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="all">All Departments</option>
                      <option value="true">Clinical Departments Only</option>
                      <option value="false">Non-Clinical Departments Only</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Status
                    </label>
                    <select
                      value={filterActive}
                      onChange={(e) => setFilterActive(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="all">All Statuses</option>
                      <option value="true">Active Only</option>
                      <option value="false">Inactive Only</option>
                    </select>
                  </div>
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-4 border-t bg-muted/20 flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearFilters}
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw size={14} /> Clear
                  </Button>
                  <Button type="submit" className="gap-2 text-xs">
                    <Filter size={14} /> Apply Filters
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
