import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FlaskConical,
  Search,
  User,
  Check,
  Plus,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Stethoscope,
  Layers,
  Sparkles,
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
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/lab/orders/new")({
  component: NewLabOrderPage,
});

function NewLabOrderPage() {
  const navigate = useNavigate();

  // Patient Search State
  const [patientSearch, setPatientSearch] = React.useState("");
  const [selectedPatient, setSelectedPatient] = React.useState<any>(null);
  const [isSearchingPatient, setIsSearchingPatient] = React.useState(false);

  // Order Details State
  const [priority, setPriority] = React.useState<string>("Routine");
  const [clinicalNotes, setClinicalNotes] = React.useState<string>("");
  const [orderedByStaffId, setOrderedByStaffId] = React.useState<string>("");

  // Selected Basket State
  const [selectedItems, setSelectedItems] = React.useState<
    Array<{
      id: string; // unique key in basket
      testId?: number;
      panelId?: number;
      code: string;
      name: string;
      category?: string;
      specimenType?: string;
      price: number;
      isPanel: boolean;
    }>
  >([]);

  // Catalog Filters State
  const [testSearch, setTestSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("ALL");

  // Query: Patient Search (reuses immunization endpoint)
  const { data: patientResults = [], isFetching: isSearchingPatients } = useQuery({
    queryKey: ["patient-search", patientSearch],
    queryFn: async () => {
      if (!patientSearch.trim()) return [];
      const res = await fetch(`/api/immunization/patients?search=${encodeURIComponent(patientSearch.trim())}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: patientSearch.trim().length >= 2 && !selectedPatient,
  });

  // Query: Lab Categories
  const { data: categories = [] } = useQuery({
    queryKey: ["lab-categories"],
    queryFn: async () => {
      const res = await fetch("/api/lab/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      return res.json();
    },
  });

  // Query: Lab Tests
  const { data: tests = [] } = useQuery({
    queryKey: ["lab-tests"],
    queryFn: async () => {
      const res = await fetch("/api/lab/tests");
      if (!res.ok) throw new Error("Failed to load tests");
      return res.json();
    },
  });

  // Query: Lab Panels
  const { data: panels = [] } = useQuery({
    queryKey: ["lab-panels"],
    queryFn: async () => {
      const res = await fetch("/api/lab/panels");
      if (!res.ok) throw new Error("Failed to load panels");
      return res.json();
    },
  });

  // Query: Active Doctors / Staff
  const { data: staffList = [] } = useQuery({
    queryKey: ["active-doctors-staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff?pageSize=100");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data.data || [];
    },
  });

  const categoryList: any[] = Array.isArray(categories) ? categories : [];
  const testList: any[] = Array.isArray(tests) ? tests : [];
  const panelList: any[] = Array.isArray(panels) ? panels : [];

  // Add Panel to Basket
  const addPanel = (panel: any) => {
    if (selectedItems.some((i) => i.panelId === panel.id)) {
      toast.info(`${panel.name} is already in the order.`);
      return;
    }
    setSelectedItems((prev) => [
      ...prev,
      {
        id: `panel-${panel.id}`,
        panelId: panel.id,
        code: panel.code,
        name: panel.name,
        category: "Comprehensive Profile",
        specimenType: "Multiple",
        price: Number(panel.price || 0),
        isPanel: true,
      },
    ]);
  };

  // Add Test to Basket
  const addTest = (test: any) => {
    if (selectedItems.some((i) => i.testId === test.id)) {
      toast.info(`${test.name} is already in the order.`);
      return;
    }
    setSelectedItems((prev) => [
      ...prev,
      {
        id: `test-${test.id}`,
        testId: test.id,
        code: test.code,
        name: test.name,
        category: test.categoryName || "General",
        specimenType: test.specimenType,
        price: Number(test.price || 0),
        isPanel: false,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setSelectedItems((prev) => prev.filter((i) => i.id !== id));
  };

  const totalAmount = selectedItems.reduce((sum, item) => sum + item.price, 0);

  // Filter available tests
  const filteredTests = testList.filter((t: any) => {
    const matchesSearch =
      !testSearch ||
      t.name.toLowerCase().includes(testSearch.toLowerCase()) ||
      t.code.toLowerCase().includes(testSearch.toLowerCase());
    const matchesCat =
      selectedCategory === "ALL" || String(t.categoryId) === selectedCategory;
    return matchesSearch && matchesCat && t.active !== false;
  });

  // Filter available panels
  const filteredPanels = panelList.filter((p: any) => {
    return (
      !testSearch ||
      p.name.toLowerCase().includes(testSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(testSearch.toLowerCase())
    );
  });

  // Order Submission Mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPatient) throw new Error("Please select a patient.");
      if (selectedItems.length === 0) throw new Error("Please select at least one test or profile.");

      const payload = {
        patientId: selectedPatient.id,
        priority,
        orderedByStaffId: orderedByStaffId ? Number(orderedByStaffId) : null,
        clinicalNotes,
        items: selectedItems.map((i) => ({
          testId: i.testId || null,
          panelId: i.panelId || null,
          price: i.price.toFixed(2),
        })),
      };

      const res = await fetch("/api/lab/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create lab order");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Lab order ${data.orderNo} created successfully.`);
      navigate({ to: `/lab/orders/${data.id}` as any });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create lab order");
    },
  });

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
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
            New Diagnostic Lab Order
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Select patient, assign ordering physician, and pick investigations or profiles
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Patient & Investigation Selector */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Selection Card */}
          <Card className="shadow-xs border-teal-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4 text-teal-600" />
                Patient Demographics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedPatient ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search patient by name, MRN, or phone number..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="pl-9 text-sm"
                    />
                  </div>

                  {/* Search dropdown results */}
                  {patientSearch.trim().length >= 2 && (
                    <div className="border border-border rounded-lg max-h-48 overflow-y-auto divide-y divide-border bg-background shadow-md">
                      {isSearchingPatients ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          Searching patients...
                        </div>
                      ) : patientResults.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          No patient matching "{patientSearch}" found.
                        </div>
                      ) : (
                        patientResults.map((p: any) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setSelectedPatient(p);
                              setPatientSearch("");
                            }}
                            className="p-3 hover:bg-muted/60 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div>
                              <p className="font-semibold text-sm text-foreground">{p.name}</p>
                              <p className="text-xs text-muted-foreground">
                                MRN: <span className="font-mono">{p.mrn}</span> • {p.gender}, {p.age} yrs • Phone: {p.phone}
                              </p>
                            </div>
                            <Button size="xs" variant="outline" className="text-xs">
                              Select
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-foreground">{selectedPatient.name}</span>
                      <Badge variant="outline" className="font-mono text-xs border-teal-600 text-teal-700 dark:text-teal-400">
                        {selectedPatient.mrn}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedPatient.gender}, {selectedPatient.age} years • Phone: {selectedPatient.phone}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPatient(null)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Change Patient
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test & Profile Catalog Selector */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-teal-600" />
                Select Tests & Diagnostic Profiles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search investigation or profile..."
                    value={testSearch}
                    onChange={(e) => setTestSearch(e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48 h-9 text-xs">
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

              {/* Comprehensive Profiles / Panels */}
              {filteredPanels.length > 0 && selectedCategory === "ALL" && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Diagnostic Profiles & Bundles
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {filteredPanels.map((panel: any) => {
                      const isSelected = selectedItems.some((i) => i.panelId === panel.id);
                      return (
                        <div
                          key={panel.id}
                          className={`p-3 rounded-lg border transition-all flex items-center justify-between ${
                            isSelected
                              ? "bg-teal-50 dark:bg-teal-950/40 border-teal-500"
                              : "border-border hover:border-teal-500/50 hover:bg-muted/40"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-foreground">{panel.name}</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                              {panel.description || "Bundled diagnostic battery"}
                            </p>
                            <p className="font-mono font-bold text-xs text-teal-700 dark:text-teal-400 mt-1">
                              ₹{Number(panel.price).toFixed(2)}
                            </p>
                          </div>
                          <Button
                            size="xs"
                            variant={isSelected ? "secondary" : "outline"}
                            onClick={() => (isSelected ? removeItem(`panel-${panel.id}`) : addPanel(panel))}
                            className="text-xs shrink-0"
                          >
                            {isSelected ? "Added" : "+ Add"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Individual Tests */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Individual Investigations ({filteredTests.length})
                </p>
                <div className="max-h-80 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                  {filteredTests.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No investigations found matching filters.
                    </div>
                  ) : (
                    filteredTests.map((test: any) => {
                      const isSelected = selectedItems.some((i) => i.testId === test.id);
                      return (
                        <div
                          key={test.id}
                          className="p-3 hover:bg-muted/40 flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>{test.name}</span>
                              <span className="text-[10px] font-mono bg-muted px-1.5 py-0.2 rounded text-muted-foreground">
                                {test.code}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                              <span>{test.categoryName || "General"}</span>
                              <span>•</span>
                              <span>Specimen: {test.specimenType}</span>
                              {test.unit && <span>• Unit: {test.unit}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-semibold text-foreground">
                              ₹{Number(test.price).toFixed(2)}
                            </span>
                            <Button
                              size="xs"
                              variant={isSelected ? "secondary" : "outline"}
                              onClick={() => (isSelected ? removeItem(`test-${test.id}`) : addTest(test))}
                              className="text-xs h-7"
                            >
                              {isSelected ? "Added" : "+ Add"}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Order Summary & Clinical Indication */}
        <div className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Order Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Priority */}
              <div>
                <label className="font-semibold text-muted-foreground mb-1 block">
                  Priority Level
                </label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Routine">Routine (Standard)</SelectItem>
                    <SelectItem value="Urgent">Urgent (Expedited)</SelectItem>
                    <SelectItem value="STAT">STAT (Immediate Emergency)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ordering Doctor */}
              <div>
                <label className="font-semibold text-muted-foreground mb-1 block">
                  Ordering Physician / Clinician
                </label>
                <Select value={orderedByStaffId} onValueChange={setOrderedByStaffId}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Select Physician" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffList.map((s: any) => (
                      <SelectItem key={s.staffId} value={String(s.staffId)}>
                        {s.name} ({s.role || "Staff"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Clinical Indication */}
              <div>
                <label className="font-semibold text-muted-foreground mb-1 block">
                  Clinical History & Indication
                </label>
                <Textarea
                  placeholder="e.g. Fever x 3 days, pre-op clearance, follow-up..."
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Basket Summary Card */}
          <Card className="shadow-xs border-teal-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Selected Tests</span>
                <Badge variant="secondary" className="font-mono">
                  {selectedItems.length} items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                  No tests or profiles added yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 divide-y divide-border">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-foreground line-clamp-1">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.category}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-semibold">₹{item.price.toFixed(2)}</span>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => removeItem(item.id)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-border flex items-center justify-between font-bold text-sm">
                <span>Estimated Total:</span>
                <span className="text-teal-700 dark:text-teal-400 font-mono text-base">
                  ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              <Button
                onClick={() => createOrderMutation.mutate()}
                disabled={!selectedPatient || selectedItems.length === 0 || createOrderMutation.isPending}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm"
              >
                {createOrderMutation.isPending ? "Submitting Order..." : "Confirm & Create Order"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
