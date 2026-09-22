import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FlaskConical,
  Plus,
  ArrowLeft,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Edit2,
  Trash2,
  Check,
  Search,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/lab/masters/")({
  component: LabMastersPage,
});

function LabMastersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = React.useState("tests");
  const [testSearch, setTestSearch] = React.useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = React.useState("ALL");

  // Dialog States
  const [isAddTestOpen, setIsAddTestOpen] = React.useState(false);
  const [editingTest, setEditingTest] = React.useState<any>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = React.useState(false);
  const [isAddPanelOpen, setIsAddPanelOpen] = React.useState(false);
  const [isAddRangeOpen, setIsAddRangeOpen] = React.useState(false);
  const [selectedTestForRanges, setSelectedTestForRanges] = React.useState<number | null>(null);

  // Form states
  const [testForm, setTestForm] = React.useState({
    categoryId: "",
    code: "",
    name: "",
    specimenType: "Whole Blood EDTA",
    unit: "",
    price: "",
    turnaroundHours: "24",
    method: "",
  });

  const [categoryForm, setCategoryForm] = React.useState({
    name: "",
    code: "",
    sortOrder: "1",
  });

  const [panelForm, setPanelForm] = React.useState({
    code: "",
    name: "",
    description: "",
    price: "",
    testIds: [] as number[],
  });

  const [rangeForm, setRangeForm] = React.useState({
    gender: "Both",
    ageMin: "0",
    ageMax: "120",
    lowValue: "",
    highValue: "",
    criticalLow: "",
    criticalHigh: "",
    textRange: "",
    remarks: "",
  });

  // Queries
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["lab-categories"],
    queryFn: async () => {
      const res = await fetch("/api/lab/categories");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch categories (${res.status})`);
      }
      return res.json();
    },
  });

  const {
    data: tests = [],
    isLoading: isLoadingTests,
    error: testsError,
    refetch: refetchTests,
  } = useQuery({
    queryKey: ["lab-tests"],
    queryFn: async () => {
      const res = await fetch("/api/lab/tests");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch tests (${res.status})`);
      }
      return res.json();
    },
  });

  const {
    data: panels = [],
    isLoading: isLoadingPanels,
    error: panelsError,
    refetch: refetchPanels,
  } = useQuery({
    queryKey: ["lab-panels"],
    queryFn: async () => {
      const res = await fetch("/api/lab/panels");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch panels (${res.status})`);
      }
      return res.json();
    },
  });

  const {
    data: selectedTestRanges = [],
    isLoading: isLoadingRanges,
    refetch: refetchRanges,
  } = useQuery({
    queryKey: ["lab-test-ranges", selectedTestForRanges],
    queryFn: async () => {
      if (!selectedTestForRanges) return [];
      const res = await fetch(`/api/lab/tests/${selectedTestForRanges}/ranges`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to fetch ranges (${res.status})`);
      }
      return res.json();
    },
    enabled: !!selectedTestForRanges,
  });

  const categoryList: any[] = Array.isArray(categories) ? categories : [];
  const testList: any[] = Array.isArray(tests) ? tests : [];
  const panelList: any[] = Array.isArray(panels) ? panels : [];
  const rangeList: any[] = Array.isArray(selectedTestRanges) ? selectedTestRanges : [];

  // Set default selected test for ranges tab
  React.useEffect(() => {
    if (!selectedTestForRanges && testList.length > 0) {
      setSelectedTestForRanges(testList[0].id);
    }
  }, [testList, selectedTestForRanges]);

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/lab/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryForm),
      });
      if (!res.ok) throw new Error("Failed to create category");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Category created successfully");
      setIsAddCategoryOpen(false);
      setCategoryForm({ name: "", code: "", sortOrder: "1" });
      refetchCategories();
    },
  });

  const saveTestMutation = useMutation({
    mutationFn: async () => {
      const isEdit = !!editingTest;
      const url = isEdit ? `/api/lab/tests/${editingTest.id}` : "/api/lab/tests";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testForm),
      });
      if (!res.ok) throw new Error("Failed to save test");
      return res.json();
    },
    onSuccess: () => {
      toast.success(editingTest ? "Test updated" : "Test created");
      setIsAddTestOpen(false);
      setEditingTest(null);
      setTestForm({
        categoryId: "",
        code: "",
        name: "",
        specimenType: "Whole Blood EDTA",
        unit: "",
        price: "",
        turnaroundHours: "24",
        method: "",
      });
      refetchTests();
    },
  });

  const createPanelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/lab/panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(panelForm),
      });
      if (!res.ok) throw new Error("Failed to create panel");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Profile/Panel created successfully");
      setIsAddPanelOpen(false);
      setPanelForm({ code: "", name: "", description: "", price: "", testIds: [] });
      refetchPanels();
    },
  });

  const addRangeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTestForRanges) throw new Error("No test selected");
      const res = await fetch(`/api/lab/tests/${selectedTestForRanges}/ranges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rangeForm),
      });
      if (!res.ok) throw new Error("Failed to add reference range");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Reference range added");
      setIsAddRangeOpen(false);
      setRangeForm({
        gender: "Both",
        ageMin: "0",
        ageMax: "120",
        lowValue: "",
        highValue: "",
        criticalLow: "",
        criticalHigh: "",
        textRange: "",
        remarks: "",
      });
      refetchRanges();
    },
  });

  const deleteRangeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/lab/ranges/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete range");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Reference range removed");
      refetchRanges();
    },
  });

  const filteredTests = testList.filter((t: any) => {
    const matchesSearch =
      !testSearch ||
      t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
      t.code.toLowerCase().includes(testSearch.toLowerCase());
    const matchesCat =
      selectedCategoryFilter === "ALL" || String(t.categoryId) === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  const openEditTest = (test: any) => {
    setEditingTest(test);
    setTestForm({
      categoryId: String(test.categoryId || ""),
      code: test.code,
      name: test.name,
      specimenType: test.specimenType,
      unit: test.unit || "",
      price: String(test.price || "0"),
      turnaroundHours: String(test.turnaroundHours || "24"),
      method: test.method || "",
    });
    setIsAddTestOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/lab" as any })}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-teal-600" />
              Laboratory Master Data & Catalog
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage clinical investigations, demographic reference ranges, diagnostic panels, and categories
            </p>
          </div>
        </div>
      </div>

      {/* Error / Notice banner */}
      {(categoriesError || testsError || panelsError) && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 rounded-md text-xs flex items-center justify-between">
          <span>
            Notice: {(categoriesError as Error)?.message || (testsError as Error)?.message || (panelsError as Error)?.message || "Failed to load master catalog data."}
          </span>
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              refetchCategories();
              refetchTests();
              refetchPanels();
            }}
            className="text-xs h-6 px-2"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/50 max-w-fit">
        <Button
          variant={activeTab === "tests" ? "default" : "ghost"}
          size="xs"
          onClick={() => setActiveTab("tests")}
          className={`text-xs h-7 px-3 ${activeTab === "tests" ? "bg-teal-600 hover:bg-teal-700 text-white shadow-xs font-semibold" : "text-muted-foreground"}`}
        >
          Test Catalog ({testList.length})
        </Button>
        <Button
          variant={activeTab === "ranges" ? "default" : "ghost"}
          size="xs"
          onClick={() => setActiveTab("ranges")}
          className={`text-xs h-7 px-3 ${activeTab === "ranges" ? "bg-teal-600 hover:bg-teal-700 text-white shadow-xs font-semibold" : "text-muted-foreground"}`}
        >
          Reference Ranges & Thresholds
        </Button>
        <Button
          variant={activeTab === "panels" ? "default" : "ghost"}
          size="xs"
          onClick={() => setActiveTab("panels")}
          className={`text-xs h-7 px-3 ${activeTab === "panels" ? "bg-teal-600 hover:bg-teal-700 text-white shadow-xs font-semibold" : "text-muted-foreground"}`}
        >
          Profiles & Panels ({panelList.length})
        </Button>
        <Button
          variant={activeTab === "categories" ? "default" : "ghost"}
          size="xs"
          onClick={() => setActiveTab("categories")}
          className={`text-xs h-7 px-3 ${activeTab === "categories" ? "bg-teal-600 hover:bg-teal-700 text-white shadow-xs font-semibold" : "text-muted-foreground"}`}
        >
          Categories ({categoryList.length})
        </Button>
      </div>

      {/* Tab 1: Test Catalog */}
      {activeTab === "tests" && (
          <Card className="shadow-xs">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Search test name or code..."
                  value={testSearch}
                  onChange={(e) => setTestSearch(e.target.value)}
                  className="h-8 w-60 text-xs"
                />
                <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {categoryList.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setEditingTest(null);
                  setTestForm({
                    categoryId: categoryList[0]?.id ? String(categoryList[0].id) : "",
                    code: "",
                    name: "",
                    specimenType: "Whole Blood EDTA",
                    unit: "",
                    price: "100.00",
                    turnaroundHours: "24",
                    method: "",
                  });
                  setIsAddTestOpen(true);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add New Test
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 uppercase font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Investigation Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Specimen</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Price (₹)</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTests.map((t: any) => (
                    <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-semibold text-teal-700 dark:text-teal-400">
                        {t.code}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {t.name}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {t.categoryName || "General"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {t.specimenType}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {t.unit || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {t.method || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-foreground">
                        ₹{Number(t.price).toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => openEditTest(t)}
                          className="h-7 px-2 text-xs"
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
      )}

      {/* Tab 2: Reference Ranges */}
      {activeTab === "ranges" && (
          <Card className="shadow-xs">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase text-muted-foreground">Select Test:</span>
                <Select
                  value={selectedTestForRanges ? String(selectedTestForRanges) : ""}
                  onValueChange={(val) => setSelectedTestForRanges(Number(val))}
                >
                  <SelectTrigger className="h-8 w-64 text-xs font-medium">
                    <SelectValue placeholder="Select Investigation" />
                  </SelectTrigger>
                  <SelectContent>
                    {testList.map((t: any) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name} ({t.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                size="sm"
                onClick={() => setIsAddRangeOpen(true)}
                disabled={!selectedTestForRanges}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Range Bracket
              </Button>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/60 uppercase font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Gender</th>
                    <th className="px-4 py-3">Age Bracket</th>
                    <th className="px-4 py-3">Normal Low</th>
                    <th className="px-4 py-3">Normal High</th>
                    <th className="px-4 py-3">Critical Low</th>
                    <th className="px-4 py-3">Critical High</th>
                    <th className="px-4 py-3">Qualitative Range</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rangeList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-muted-foreground">
                        No reference ranges configured for this investigation. Click "+ Add Range Bracket" to set normal values.
                      </td>
                    </tr>
                  ) : (
                    rangeList.map((r: any) => (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{r.gender}</td>
                        <td className="px-4 py-2.5 font-mono">{r.ageMin} - {r.ageMax} yrs</td>
                        <td className="px-4 py-2.5 font-mono text-emerald-600 font-semibold">{r.lowValue ?? "—"}</td>
                        <td className="px-4 py-2.5 font-mono text-emerald-600 font-semibold">{r.highValue ?? "—"}</td>
                        <td className="px-4 py-2.5 font-mono text-rose-600 font-bold">{r.criticalLow ?? "—"}</td>
                        <td className="px-4 py-2.5 font-mono text-rose-600 font-bold">{r.criticalHigh ?? "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{r.textRange || "—"}</td>
                        <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate">{r.remarks || "—"}</td>
                        <td className="px-4 py-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => deleteRangeMutation.mutate(r.id)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
      )}

      {/* Tab 3: Panels / Profiles */}
      {activeTab === "panels" && (
          <Card className="shadow-xs">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Configured Diagnostic Profiles
              </span>
              <Button
                size="sm"
                onClick={() => setIsAddPanelOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Create New Profile
              </Button>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {panelList.map((p: any) => (
                <div key={p.id} className="p-4 rounded-lg border border-border bg-card shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-foreground">{p.name}</span>
                      <Badge variant="outline" className="ml-2 font-mono text-xs text-teal-700 dark:text-teal-400">
                        {p.code}
                      </Badge>
                    </div>
                    <span className="font-mono font-bold text-sm text-foreground">
                      ₹{Number(p.price).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.description || "No description provided."}</p>
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase block mb-1.5">
                      Included Investigations ({(p.tests || []).length}):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(p.tests || []).map((t: any) => (
                        <Badge key={t.testId} variant="secondary" className="text-[10px] px-2 py-0.5">
                          {t.testName} ({t.testCode})
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
      )}

      {/* Tab 4: Categories */}
      {activeTab === "categories" && (
          <Card className="shadow-xs max-w-2xl">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Diagnostic Categories
              </span>
              <Button
                size="sm"
                onClick={() => setIsAddCategoryOpen(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Category
              </Button>
            </CardHeader>
            <div className="divide-y divide-border">
              {categoryList.map((c: any) => (
                <div key={c.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {c.code}
                    </Badge>
                    <span className="font-semibold text-foreground text-sm">{c.name}</span>
                  </div>
                  <span className="text-muted-foreground text-xs font-mono">Sort: {c.sortOrder}</span>
                </div>
              ))}
            </div>
          </Card>
      )}

      {/* Dialog: Add/Edit Test */}
      <Dialog open={isAddTestOpen} onOpenChange={setIsAddTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingTest ? "Edit Investigation" : "Add New Investigation"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Category</label>
              <Select
                value={testForm.categoryId}
                onValueChange={(val) => setTestForm({ ...testForm, categoryId: val })}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryList.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Test Code</label>
                <Input
                  value={testForm.code}
                  onChange={(e) => setTestForm({ ...testForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. HB"
                  className="h-9 text-xs font-mono"
                  disabled={!!editingTest}
                />
              </div>
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Price (₹)</label>
                <Input
                  value={testForm.price}
                  onChange={(e) => setTestForm({ ...testForm, price: e.target.value })}
                  placeholder="150.00"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Investigation Name</label>
              <Input
                value={testForm.name}
                onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                placeholder="e.g. Hemoglobin"
                className="h-9 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Specimen Type</label>
                <Input
                  value={testForm.specimenType}
                  onChange={(e) => setTestForm({ ...testForm, specimenType: e.target.value })}
                  placeholder="Whole Blood EDTA"
                  className="h-9 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Unit of Measurement</label>
                <Input
                  value={testForm.unit}
                  onChange={(e) => setTestForm({ ...testForm, unit: e.target.value })}
                  placeholder="g/dL, mg/dL"
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Turnaround (Hours)</label>
                <Input
                  type="number"
                  value={testForm.turnaroundHours}
                  onChange={(e) => setTestForm({ ...testForm, turnaroundHours: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Method / Equipment</label>
                <Input
                  value={testForm.method}
                  onChange={(e) => setTestForm({ ...testForm, method: e.target.value })}
                  placeholder="Spectrophotometry"
                  className="h-9 text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddTestOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => saveTestMutation.mutate()}
              disabled={saveTestMutation.isPending || !testForm.name || !testForm.code}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Save Investigation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add Reference Range */}
      <Dialog open={isAddRangeOpen} onOpenChange={setIsAddRangeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Add Reference Range Bracket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Gender</label>
                <Select
                  value={rangeForm.gender}
                  onValueChange={(val) => setRangeForm({ ...rangeForm, gender: val })}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Both">Both</SelectItem>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Age Min (yrs)</label>
                <Input
                  type="number"
                  value={rangeForm.ageMin}
                  onChange={(e) => setRangeForm({ ...rangeForm, ageMin: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Age Max (yrs)</label>
                <Input
                  type="number"
                  value={rangeForm.ageMax}
                  onChange={(e) => setRangeForm({ ...rangeForm, ageMax: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Normal Low</label>
                <Input
                  value={rangeForm.lowValue}
                  onChange={(e) => setRangeForm({ ...rangeForm, lowValue: e.target.value })}
                  placeholder="e.g. 13.0"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Normal High</label>
                <Input
                  value={rangeForm.highValue}
                  onChange={(e) => setRangeForm({ ...rangeForm, highValue: e.target.value })}
                  placeholder="e.g. 17.0"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1 text-rose-600">Critical Low Threshold</label>
                <Input
                  value={rangeForm.criticalLow}
                  onChange={(e) => setRangeForm({ ...rangeForm, criticalLow: e.target.value })}
                  placeholder="e.g. 7.0"
                  className="h-9 text-xs font-mono border-rose-200"
                />
              </div>
              <div>
                <label className="font-semibold text-muted-foreground block mb-1 text-rose-600">Critical High Threshold</label>
                <Input
                  value={rangeForm.criticalHigh}
                  onChange={(e) => setRangeForm({ ...rangeForm, criticalHigh: e.target.value })}
                  placeholder="e.g. 20.0"
                  className="h-9 text-xs font-mono border-rose-200"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Qualitative Range (for non-numeric)</label>
              <Input
                value={rangeForm.textRange}
                onChange={(e) => setRangeForm({ ...rangeForm, textRange: e.target.value })}
                placeholder="e.g. Negative, Non-Reactive"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Clinical Remarks / Advisory</label>
              <Textarea
                value={rangeForm.remarks}
                onChange={(e) => setRangeForm({ ...rangeForm, remarks: e.target.value })}
                placeholder="e.g. Fasting sample required"
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddRangeOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => addRangeMutation.mutate()}
              disabled={addRangeMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Add Range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Create Panel */}
      <Dialog open={isAddPanelOpen} onOpenChange={setIsAddPanelOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Create Diagnostic Profile / Panel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Profile Code</label>
                <Input
                  value={panelForm.code}
                  onChange={(e) => setPanelForm({ ...panelForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. CBC"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-muted-foreground block mb-1">Bundle Price (₹)</label>
                <Input
                  value={panelForm.price}
                  onChange={(e) => setPanelForm({ ...panelForm, price: e.target.value })}
                  placeholder="350.00"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Profile Name</label>
              <Input
                value={panelForm.name}
                onChange={(e) => setPanelForm({ ...panelForm, name: e.target.value })}
                placeholder="e.g. Complete Blood Count (CBC)"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Description</label>
              <Textarea
                value={panelForm.description}
                onChange={(e) => setPanelForm({ ...panelForm, description: e.target.value })}
                placeholder="Included investigations summary"
                rows={2}
                className="text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">
                Select Included Investigations ({panelForm.testIds.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 divide-y divide-border">
                {testList.map((t: any) => {
                  const isChecked = panelForm.testIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setPanelForm((prev) => ({
                          ...prev,
                          testIds: isChecked
                            ? prev.testIds.filter((id) => id !== t.id)
                            : [...prev.testIds, t.id],
                        }));
                      }}
                      className="py-1.5 px-2 flex items-center justify-between hover:bg-muted/40 cursor-pointer rounded"
                    >
                      <span className="font-medium text-foreground">{t.name} ({t.code})</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="rounded border-border text-teal-600"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddPanelOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => createPanelMutation.mutate()}
              disabled={createPanelMutation.isPending || !panelForm.code || !panelForm.name || panelForm.testIds.length === 0}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Create Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Add Category */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Add Diagnostic Category
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Category Code</label>
              <Input
                value={categoryForm.code}
                onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. HEM"
                className="h-9 text-xs font-mono"
              />
            </div>
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Category Name</label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g. Hematology"
                className="h-9 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-muted-foreground block mb-1">Sort Order</label>
              <Input
                type="number"
                value={categoryForm.sortOrder}
                onChange={(e) => setCategoryForm({ ...categoryForm, sortOrder: e.target.value })}
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddCategoryOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => createCategoryMutation.mutate()}
              disabled={createCategoryMutation.isPending || !categoryForm.code || !categoryForm.name}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
