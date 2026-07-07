import { createFileRoute } from "@tanstack/react-router";
import { Coins, Plus, Edit2, Trash2, Search, Filter, RefreshCw, Layers, DollarSign, ListOrdered, AlertTriangle } from "lucide-react";
import * as React from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../ui/card";
import { Input } from "../../../ui/input";
import { Label } from "../../../ui/label";
import { Badge } from "../../../ui/badge";
import { cn } from "../../../utils/cn";

export const Route = createFileRoute("/_authenticated/accounts/service-charges")({
  component: ServiceCharges,
});

function ServiceCharges() {
  const queryClient = useQueryClient();

  // Filter states
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedDept, setSelectedDept] = React.useState("ALL");

  // Modal states
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<any | null>(null);
  const [deletingItem, setDeletingItem] = React.useState<any | null>(null);

  // Form states
  const [formData, setFormData] = React.useState({
    category: "OPD_GYNAE",
    serviceName: "",
    defaultRate: "",
    sortOrder: "0",
    defaultShow: true,
  });
  const [formError, setFormError] = React.useState("");

  // Fetch catalog charges
  const catalogQuery = useRpcQuery<any[]>(
    ["service-catalog"],
    () => client["daily-closing"].catalog.$get()
  );

  const catalogData = catalogQuery.data ?? [];

  // Mutations
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
    onError: (err: any) => {
      setFormError(err.message || "Failed to add service charge");
    },
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
    onError: (err: any) => {
      setFormError(err.message || "Failed to edit service charge");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await client["daily-closing"].catalog[":id"].$delete({
        param: { id },
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-catalog"] });
      setDeletingItem(null);
    },
    onError: (err: any) => {
      alert(err.message || "Failed to delete service charge");
    },
  });

  const resetForm = () => {
    setFormData({
      category: "OPD_GYNAE",
      serviceName: "",
      defaultRate: "",
      sortOrder: "0",
      defaultShow: true,
    });
    setFormError("");
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
      defaultShow: item.defaultShow ?? true,
    });
    setFormError("");
    setEditingItem(item);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const rate = parseFloat(formData.defaultRate);
    const order = parseInt(formData.sortOrder, 10);
    const category = formData.category.trim().toUpperCase().replace(/\s+/g, "_");

    if (!category) {
      return setFormError("Category is required");
    }
    if (!formData.serviceName.trim()) {
      return setFormError("Service name is required");
    }
    if (isNaN(rate) || rate < 0) {
      return setFormError("Default rate must be a non-negative number");
    }
    if (isNaN(order)) {
      return setFormError("Sort order must be an integer");
    }

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

  // Filtered catalog data
  const filteredData = React.useMemo(() => {
    return catalogData
      .filter((item) => {
        const matchesSearch = item.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = selectedDept === "ALL" || item.department === selectedDept;
        return matchesSearch && matchesDept;
      })
      .sort((a, b) => {
        // Group by category first, then by sort order
        if (a.department !== b.department) {
          return a.department.localeCompare(b.department);
        }
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
  }, [catalogData, searchQuery, selectedDept]);

  // Derive unique categories from catalog data
  const uniqueCategories = React.useMemo(() => {
    const seen = new Set<string>();
    catalogData.forEach((item) => seen.add(item.department));
    return Array.from(seen).sort();
  }, [catalogData]);

  // Statistics calculation
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

  const fmt = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between font-sans">
        <div>
          <h3 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Coins className="text-teal-600 dark:text-teal-400 size-6" /> Service Charges & Rates
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
              {uniqueCategories.length === 0 ? (
                <span className="text-muted-foreground text-[10px]">No categories yet</span>
              ) : uniqueCategories.map((cat) => (
                <Badge
                  key={cat}
                  className="border-teal-200 dark:border-teal-900 bg-teal-50/20 dark:bg-teal-950/20 text-teal-800 dark:text-teal-400 cursor-pointer"
                  onClick={() => setSelectedDept(cat)}
                >
                  {cat.replace(/_/g, " ")}: {categoryCounts[cat] ?? 0}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">Click a category to filter</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Content Area */}
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
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, " ")}
                    </option>
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
                  {filteredData.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors"
                    >
                      <td className="p-4 font-mono font-bold text-center text-muted-foreground">
                        {item.sortOrder ?? 0}
                      </td>
                      <td className="p-4 font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">
                        {item.serviceName}
                      </td>
                      <td className="p-4">
                        <Badge
                          className={cn(
                            "font-bold text-[10px] uppercase border",
                            item.department === "OPD_GYNAE" && "bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900 text-teal-800 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30",
                            item.department === "DENTAL" && "bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900 text-indigo-800 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30",
                            item.department === "PHARMACY" && "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
                            item.department !== "OPD_GYNAE" && item.department !== "DENTAL" && item.department !== "PHARMACY" && "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                          )}
                        >
                          {item.department.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="p-4 text-right font-black text-slate-800 dark:text-slate-200 text-sm">
                        {fmt(item.defaultRate)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border",
                          item.defaultShow 
                            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-250 dark:border-emerald-900 text-emerald-800 dark:text-teal-400" 
                            : "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500"
                        )}>
                          {item.defaultShow ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(item)}
                            className="size-8 text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 cursor-pointer"
                            title="Edit Rate"
                          >
                            <Edit2 size={13} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingItem(item)}
                            className="size-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/20 cursor-pointer"
                            title="Delete Service"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog Overlay */}
      {(isAddOpen || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
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
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-white rounded-lg p-1 transition-colors cursor-pointer text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs font-bold text-slate-700 dark:text-slate-350">
                  Category
                </Label>
                <input
                  id="category"
                  list="category-list"
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g. OPD_GYNAE, PHARMACY, DENTAL..."
                  className="w-full h-10 border rounded-md px-3 py-2 bg-background dark:bg-slate-900 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring border-slate-200 dark:border-slate-800 cursor-text text-slate-800 dark:text-slate-100 uppercase font-semibold"
                  autoComplete="off"
                />
                <datalist id="category-list">
                  {uniqueCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
                <p className="text-[10px] text-muted-foreground">Type a new category or pick an existing one. Saved as uppercase with underscores.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="serviceName" className="text-xs font-bold text-slate-700 dark:text-slate-350">
                  Service Name
                </Label>
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
                  <Label htmlFor="defaultRate" className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    Default Rate (INR)
                  </Label>
                  <Input
                    id="defaultRate"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.defaultRate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, defaultRate: e.target.value }))}
                    className="w-full border-slate-200 dark:border-slate-800 focus:border-teal-500 focus:ring-teal-500 font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sortOrder" className="text-xs font-bold text-slate-700 dark:text-slate-350">
                    Sort Order Index
                  </Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    placeholder="0"
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
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingItem(null);
                  }}
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

      {/* Delete Confirmation Dialog Overlay */}
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
    </div>
  );
}
