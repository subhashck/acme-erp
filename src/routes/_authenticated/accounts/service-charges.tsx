import { createFileRoute } from "@tanstack/react-router";
import {
  Coins, Plus, Edit2, Trash2, Search, Filter, RefreshCw,
  Layers, DollarSign, ListOrdered, AlertTriangle, Tag, ChevronDown, ChevronUp,
} from "lucide-react";
import * as React from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Badge } from "../../../ui/badge";
import { cn } from "../../../utils/cn";

export const Route = createFileRoute("/_authenticated/accounts/service-charges")({
  component: ServiceCharges,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type Category = {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
  active: boolean;
};

// ─── Main Component ───────────────────────────────────────────────────────────

function ServiceCharges() {
  const queryClient = useQueryClient();

  // ── Filter states ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDept, setSelectedDept] = React.useState("ALL");

  // ── Modal states ──────────────────────────────────────────────────────────
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [deletingItem, setDeletingItem] = React.useState<any | null>(null);

  // ── Manage Categories panel ───────────────────────────────────────────────
  const [catPanelOpen, setCatPanelOpen] = React.useState(false);
  const [catForm, setCatForm] = React.useState({ code: "", label: "", sortOrder: "0" });
  const [catFormError, setCatFormError] = React.useState("");
  const [editingCat, setEditingCat] = React.useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = React.useState<Category | null>(null);

  // ── Form states ───────────────────────────────────────────────────────────
  const [formData, setFormData] = React.useState({
    category: "",
    serviceName: "",
    defaultRate: "",
    sortOrder: "0",
    defaultShow: false,
  });
  const [formError, setFormError] = React.useState("");

  // ── Queries ───────────────────────────────────────────────────────────────
  const categoriesQuery = useRpcQuery<Category[]>(
    ["service-categories"],
    () => (client["daily-closing"] as any).categories.$get()
  );

  const catalogQuery = useRpcQuery<any[]>(
    ["service-catalog"],
    () => client["daily-closing"].catalog.$get()
  );

  const categories = categoriesQuery.data ?? [];
  const activeCategories = categories.filter((c) => c.active);
  const catalogData = catalogQuery.data ?? [];

  // ── Set default category once categories load ─────────────────────────────
  React.useEffect(() => {
    if (activeCategories.length > 0 && !formData.category) {
      setFormData((prev) => ({ ...prev, category: activeCategories[0].code }));
    }
  }, [activeCategories.length]);

  // ── Catalog mutations ─────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await client["daily-closing"].catalog.$post({ json: payload });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-catalog"] });
      setIsAddOpen(false);
      resetForm();
    },
    onError: (err: any) => setFormError(err.message || "Failed to add service charge"),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const response = await (client["daily-closing"].catalog as any)[":id"].$put({
        param: { id },
        json: payload,
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-catalog"] });
      setEditingItem(null);
      resetForm();
    },
    onError: (err: any) => setFormError(err.message || "Failed to edit service charge"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await client["daily-closing"].catalog[":id"].$delete({ param: { id } });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-catalog"] });
      setDeletingItem(null);
    },
    onError: (err: any) => alert(err.message || "Failed to delete service charge"),
  });

  // ── Category mutations ────────────────────────────────────────────────────
  const addCatMutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await (client["daily-closing"] as any).categories.$post({ json: payload });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
      resetCatForm();
    },
    onError: (err: any) => setCatFormError(err.message || "Failed to add category"),
  });

  const editCatMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: any }) => {
      const response = await (client["daily-closing"] as any).categories[":id"].$put({
        param: { id: String(id) },
        json: payload,
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
      setEditingCat(null);
      resetCatForm();
    },
    onError: (err: any) => setCatFormError(err.message || "Failed to update category"),
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await (client["daily-closing"] as any).categories[":id"].$delete({
        param: { id: String(id) },
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-categories"] });
      setDeletingCat(null);
    },
    onError: (err: any) => alert(err.message || "Failed to deactivate category"),
  });

  // ── Form helpers ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      category: activeCategories[0]?.code ?? "",
      serviceName: "",
      defaultRate: "",
      sortOrder: "0",
      defaultShow: false,
    });
    setFormError("");
  };

  const resetCatForm = () => {
    setCatForm({ code: "", label: "", sortOrder: "0" });
    setCatFormError("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setFormData({
      category: item.department,
      serviceName: item.serviceName,
      defaultRate: String(item.defaultRate),
      sortOrder: String(item.sortOrder),
      defaultShow: item.defaultShow ?? false,
    });
    setFormError("");
    setEditingItem(item);
  };

  const handleOpenEditCat = (cat: Category) => {
    setEditingCat(cat);
    setCatForm({
      code: cat.code,
      label: cat.label,
      sortOrder: String(cat.sortOrder),
    });
    setCatFormError("");
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const rate = parseFloat(formData.defaultRate);
    const order = parseInt(formData.sortOrder, 10);
    const category = formData.category.trim().toUpperCase().replace(/\s+/g, "_");

    if (!category) return setFormError("Category is required");
    if (!formData.serviceName.trim()) return setFormError("Service name is required");
    if (isNaN(rate) || rate < 0) return setFormError("Default rate must be a non-negative number");
    if (isNaN(order)) return setFormError("Sort order must be an integer");

    const payload = {
      department: category,
      serviceName: formData.serviceName.toUpperCase(),
      defaultRate: rate,
      sortOrder: order,
      defaultShow: formData.defaultShow,
    };

    if (editingItem) {
      editMutation.mutate({ id: String(editingItem.id), payload });
    } else {
      addMutation.mutate(payload);
    }
  };

  const handleCatFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCatFormError("");

    const code = catForm.code.trim().toUpperCase().replace(/\s+/g, "_");
    const label = catForm.label.trim();
    const order = parseInt(catForm.sortOrder, 10);

    if (!code) return setCatFormError("Code is required");
    if (!label) return setCatFormError("Label is required");
    if (isNaN(order)) return setCatFormError("Sort order must be an integer");

    const payload = { code, label, sortOrder: order };

    if (editingCat) {
      editCatMutation.mutate({ id: editingCat.id, payload });
    } else {
      addCatMutation.mutate(payload);
    }
  };

  // ── Filtered catalog data ─────────────────────────────────────────────────
  const filteredData = React.useMemo(() => {
    return catalogData
      .filter((item) => {
        const matchesSearch = item.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDept === "ALL" || item.department === selectedDept;
        return matchesSearch && matchesDept;
      })
      .sort((a, b) => {
        if (a.department !== b.department) return a.department.localeCompare(b.department);
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
  }, [catalogData, searchQuery, selectedDept]);

  // ── Statistics ────────────────────────────────────────────────────────────
  const totalCount = catalogData.length;
  const avgRate = totalCount > 0
    ? catalogData.reduce((acc, curr) => acc + curr.defaultRate, 0) / totalCount
    : 0;

  const categoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    catalogData.forEach((item) => {
      counts[item.department] = (counts[item.department] ?? 0) + 1;
    });
    return counts;
  }, [catalogData]);

  // Only show categories that have at least one catalog item in the filter
  const usedCategories = React.useMemo(
    () => activeCategories.filter((c) => (categoryCounts[c.code] ?? 0) > 0),
    [activeCategories, categoryCounts]
  );

  const fmt = (val: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);

  // ── Badge color per category ──────────────────────────────────────────────
  const DEPT_COLORS: Record<string, string> = {
    OPD_GYNAE: "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900 text-teal-800 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30",
    DENTAL: "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30",
    PHARMACY: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
    OTHER: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30",
  };

  const deptBadgeClass = (dept: string) =>
    DEPT_COLORS[dept] ?? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between font-sans">
        <div>
          <h3 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Coins className="text-teal-600 dark:text-teal-400 size-6" /> Service Charges &amp; Rates
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            View and manage base service charges and department grouping configurations.
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer shrink-0">
          <Plus size={16} className="mr-1.5" /> Add Service Charge
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Services</CardTitle>
            <Layers className="size-4 text-slate-400 animate-pulse" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {catalogQuery.isLoading ? "..." : totalCount}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Configured items in database catalog</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Average Charge Rate</CardTitle>
            <DollarSign className="size-4 text-slate-400" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-black text-teal-700 dark:text-teal-400">
              {catalogQuery.isLoading ? "..." : fmt(avgRate)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Mean charge rate across all services</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categories Breakdown</CardTitle>
            <ListOrdered className="size-4 text-slate-400" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-xs flex gap-2 font-bold flex-wrap mt-1">
              {usedCategories.length === 0 ? (
                <span className="text-muted-foreground text-[10px]">No categories yet</span>
              ) : usedCategories.map((cat) => (
                <Badge
                  key={cat.code}
                  className={cn("border cursor-pointer", deptBadgeClass(cat.code))}
                  onClick={() => setSelectedDept(cat.code)}
                >
                  {cat.label}: {categoryCounts[cat.code] ?? 0}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Click a category to filter</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Catalog Table */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search service name..."
                  className="pl-9 bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="text-xs font-semibold h-9 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-lg cursor-pointer outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {activeCategories.map((cat) => (
                    <option key={cat.code} value={cat.code}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => catalogQuery.refetch()}
              disabled={catalogQuery.isRefetching}
              className="size-9 cursor-pointer self-end md:self-auto"
              title="Refresh Catalog Data"
            >
              <RefreshCw className={cn("size-4 text-slate-600", catalogQuery.isRefetching && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {catalogQuery.isLoading ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Loading service charges catalog...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-sm text-muted-foreground border-t p-6 space-y-2">
              <Coins className="size-8 text-slate-300" />
              <p className="font-semibold">No service charges match your criteria.</p>
              <p className="text-xs text-slate-400">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border-t">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b bg-slate-50 dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800">
                    <th className="p-4 w-12 text-center">Sort</th>
                    <th className="p-4">Service Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Default Charge Rate</th>
                    <th className="p-4 text-center w-32">Show on Closing?</th>
                    <th className="p-4 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {filteredData.map((item) => {
                    const catMeta = activeCategories.find((c) => c.code === item.department);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                        <td className="p-4 font-mono font-bold text-center text-muted-foreground">{item.sortOrder ?? 0}</td>
                        <td className="p-4 font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">{item.serviceName}</td>
                        <td className="p-4">
                          <Badge className={cn("font-bold text-[10px] uppercase border", deptBadgeClass(item.department))}>
                            {catMeta ? catMeta.label : item.department.replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="p-4 text-right font-black text-slate-800 dark:text-slate-200 text-sm">{fmt(item.defaultRate)}</td>
                        <td className="p-4 text-center">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                            item.defaultShow
                              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-teal-400"
                              : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                          )}>
                            {item.defaultShow ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => handleOpenEdit(item)}
                              className="size-8 text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 cursor-pointer"
                              title="Edit Rate"
                            >
                              <Edit2 size={13} />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => setDeletingItem(item)}
                              className="size-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20 cursor-pointer"
                              title="Delete Service"
                            >
                              <Trash2 size={13} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Manage Categories Panel ─────────────────────────────────────────── */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setCatPanelOpen((v) => !v)}
          className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 cursor-pointer focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <Tag className="size-4 text-teal-600 dark:text-teal-400" />
            <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Manage Categories</span>
            <Badge className="bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900 text-teal-800 dark:text-teal-400 border text-[10px] font-bold">
              {activeCategories.length} active
            </Badge>
          </div>
          {catPanelOpen
            ? <ChevronUp className="size-4 text-slate-400" />
            : <ChevronDown className="size-4 text-slate-400" />}
        </button>

        {catPanelOpen && (
          <CardContent className="pt-0 pb-5 px-5 space-y-5">
            {/* Category table */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-3 w-10 text-center">Sort</th>
                    <th className="p-3">Code</th>
                    <th className="p-3">Display Label</th>
                    <th className="p-3 text-center w-20">Active</th>
                    <th className="p-3 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {categoriesQuery.isLoading ? (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading categories...</td></tr>
                  ) : categories.length === 0 ? (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No categories yet. Add one below.</td></tr>
                  ) : categories.map((cat) => (
                    <tr key={cat.id} className={cn("hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors", !cat.active && "opacity-50")}>
                      <td className="p-3 font-mono text-center text-muted-foreground">{cat.sortOrder}</td>
                      <td className="p-3 font-bold tracking-tight text-slate-800 dark:text-slate-200">
                        <Badge className={cn("font-bold text-[10px] uppercase border", deptBadgeClass(cat.code))}>
                          {cat.code}
                        </Badge>
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300">{cat.label}</td>
                      <td className="p-3 text-center">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border",
                          cat.active
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-400"
                            : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-900 dark:border-slate-800"
                        )}>
                          {cat.active ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleOpenEditCat(cat)}
                            className="size-8 text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 cursor-pointer"
                            title="Edit Category"
                          >
                            <Edit2 size={13} />
                          </Button>
                          {cat.active && (
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => setDeletingCat(cat)}
                              className="size-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20 cursor-pointer"
                              title="Deactivate Category"
                            >
                              <Trash2 size={13} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add / Edit Category inline form */}
            <form onSubmit={handleCatFormSubmit} className="border rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
              <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {editingCat ? "Edit Category" : "Add New Category"}
              </h5>

              {catFormError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" /> {catFormError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cat-code" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Code <span className="text-muted-foreground font-normal">(e.g. OPD_GYNAE)</span>
                  </Label>
                  <Input
                    id="cat-code"
                    placeholder="OPD_GYNAE"
                    value={catForm.code}
                    onChange={(e) => setCatForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="uppercase font-semibold border-slate-200 dark:border-slate-800"
                    disabled={!!editingCat}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cat-label" className="text-xs font-bold text-slate-700 dark:text-slate-300">Display Label</Label>
                  <Input
                    id="cat-label"
                    placeholder="OPD & Gynae"
                    value={catForm.label}
                    onChange={(e) => setCatForm((p) => ({ ...p, label: e.target.value }))}
                    className="border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cat-sort" className="text-xs font-bold text-slate-700 dark:text-slate-300">Sort Order</Label>
                  <Input
                    id="cat-sort"
                    type="number"
                    placeholder="0"
                    value={catForm.sortOrder}
                    onChange={(e) => setCatForm((p) => ({ ...p, sortOrder: e.target.value }))}
                    className="border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer text-xs h-9"
                  disabled={addCatMutation.isPending || editCatMutation.isPending}
                >
                  <Plus size={13} className="mr-1" />
                  {editingCat
                    ? (editCatMutation.isPending ? "Saving..." : "Save Changes")
                    : (addCatMutation.isPending ? "Adding..." : "Add Category")}
                </Button>
                {editingCat && (
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer font-semibold text-xs h-9 border-slate-200 dark:border-slate-800"
                    onClick={() => { setEditingCat(null); resetCatForm(); }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* ── Add / Edit Service Dialog ───────────────────────────────────────── */}
      {(isAddOpen || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base tracking-tight">
                  {editingItem ? "Edit Service Charge" : "Add Service Charge"}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingItem ? "Modify rates or groupings of service" : "Configure pricing for a new clinic service"}
                </p>
              </div>
              <button
                onClick={() => { setIsAddOpen(false); setEditingItem(null); }}
                className="text-slate-400 hover:text-white rounded-lg p-1 transition-colors cursor-pointer text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-bold text-slate-700 dark:text-slate-350">Category</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full h-10 border rounded-md px-3 py-2 bg-background dark:bg-slate-900 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring border-slate-200 dark:border-slate-800 cursor-pointer text-slate-800 dark:text-slate-100 font-semibold"
                >
                  {activeCategories.map((cat) => (
                    <option key={cat.code} value={cat.code}>{cat.label} ({cat.code})</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Manage categories in the "Manage Categories" panel below.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="serviceName" className="text-xs font-bold text-slate-700 dark:text-slate-350">Service Name</Label>
                <Input
                  id="serviceName"
                  placeholder="E.g., HYSTEROSCOPY DIAGNOSTIC"
                  value={formData.serviceName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, serviceName: e.target.value }))}
                  className="w-full border-slate-200 dark:border-slate-800 focus:border-teal-500 focus:ring-teal-500 uppercase font-semibold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="defaultRate" className="text-xs font-bold text-slate-700 dark:text-slate-350">Default Rate (INR)</Label>
                  <Input
                    id="defaultRate"
                    type="number" min="0" placeholder="0"
                    value={formData.defaultRate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultRate: e.target.value }))}
                    className="w-full border-slate-200 dark:border-slate-800 focus:border-teal-500 focus:ring-teal-500 font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sortOrder" className="text-xs font-bold text-slate-700 dark:text-slate-350">Sort Order Index</Label>
                  <Input
                    id="sortOrder"
                    type="number" placeholder="0"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sortOrder: e.target.value }))}
                    className="w-full border-slate-200 dark:border-slate-800 focus:border-teal-500 focus:ring-teal-500 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <input
                  id="defaultShow"
                  type="checkbox"
                  checked={formData.defaultShow}
                  onChange={(e) => setFormData((prev) => ({ ...prev, defaultShow: e.target.checked }))}
                  className="h-4.5 w-4.5 rounded border-slate-300 dark:border-slate-850 dark:bg-slate-900 text-teal-650 focus:ring-teal-500 cursor-pointer"
                />
                <Label htmlFor="defaultShow" className="text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer select-none">
                  Show by default on Daily Closing report
                </Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button" variant="outline"
                  onClick={() => { setIsAddOpen(false); setEditingItem(null); }}
                  className="flex-1 cursor-pointer font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                  disabled={addMutation.isPending || editMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer"
                  disabled={addMutation.isPending || editMutation.isPending}
                >
                  {addMutation.isPending || editMutation.isPending ? "Saving..." : "Save Service"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Service Confirmation ─────────────────────────────────────── */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-rose-100 text-rose-700 rounded-full p-3 size-12 mx-auto flex items-center justify-center">
              <AlertTriangle className="size-6 shrink-0" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Delete Service?</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">{deletingItem.serviceName}</strong>?
                This action is permanent and new daily reports will not list this default service anymore.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeletingItem(null)}
                className="flex-1 cursor-pointer font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => deleteMutation.mutate(String(deletingItem.id))}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deactivate Category Confirmation ───────────────────────────────── */}
      {deletingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-amber-100 text-amber-700 rounded-full p-3 size-12 mx-auto flex items-center justify-center">
              <AlertTriangle className="size-6 shrink-0" />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Deactivate Category?</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Deactivating <strong className="text-slate-800 dark:text-slate-200">{deletingCat.label}</strong> will hide it from
                all dropdowns. Existing catalog items in this category are <em>not</em> deleted.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setDeletingCat(null)}
                className="flex-1 cursor-pointer font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                disabled={deleteCatMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={() => deleteCatMutation.mutate(deletingCat.id)}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer"
                disabled={deleteCatMutation.isPending}
              >
                {deleteCatMutation.isPending ? "Deactivating..." : "Confirm Deactivate"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
