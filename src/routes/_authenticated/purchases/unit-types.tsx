import { createFileRoute } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery, queryClient } from "@/lib/query";
import { client } from "@/services/rpc";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Label } from "@/ui/label";
import { Field } from "@/components/Field";
import { Select } from "@/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Scale,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  ArrowRightLeft,
  Search,
  Calculator,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Info
} from "lucide-react";
import * as React from "react";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const CATEGORIES = [
  "Count/Quantity",
  "Mass/Weight",
  "Volume",
  "Packaging",
  "Length",
  "Custom/Other",
] as const;

const unitTypeFormSchema = z.object({
  name: z.string().min(1, "Unit name is required"),
  symbol: z.string().min(1, "Symbol/Abbreviation is required"),
  category: z.string().min(1, "Category is required"),
  isBaseUnit: z.boolean().default(false),
  description: z.string().optional().nullable(),
});

type UnitTypeFormValues = z.infer<typeof unitTypeFormSchema>;

const unitConversionFormSchema = z.object({
  fromUnitId: z.coerce.number().positive("From Unit is required"),
  toUnitId: z.coerce.number().positive("To Unit is required"),
  multiplier: z.coerce.number().positive("Multiplier must be greater than 0"),
  notes: z.string().optional().nullable(),
});

type UnitConversionFormValues = z.infer<typeof unitConversionFormSchema>;

// Default presets if DB is empty initially
const DEFAULT_UNIT_TYPES = [
  { id: 1, name: "Kilogram", symbol: "kg", category: "Mass/Weight", isBaseUnit: true, description: "Standard metric unit of mass" },
  { id: 2, name: "Gram", symbol: "g", category: "Mass/Weight", isBaseUnit: false, description: "Metric mass unit equal to 1/1000th kg" },
  { id: 3, name: "Liter", symbol: "L", category: "Volume", isBaseUnit: true, description: "Standard volume metric unit" },
  { id: 4, name: "Milliliter", symbol: "ml", category: "Volume", isBaseUnit: false, description: "Volume unit equal to 1/1000th liter" },
  { id: 5, name: "Piece", symbol: "pcs", category: "Count/Quantity", isBaseUnit: true, description: "Individual unit item count" },
  { id: 6, name: "Box", symbol: "box", category: "Packaging", isBaseUnit: false, description: "Standard packaging box" },
  { id: 7, name: "Carton", symbol: "ctn", category: "Packaging", isBaseUnit: false, description: "Bulk master outer carton" },
  { id: 8, name: "Meter", symbol: "m", category: "Length", isBaseUnit: true, description: "Standard linear length measure" },
];

const DEFAULT_CONVERSIONS = [
  { id: 1, fromUnitId: 1, fromUnitName: "Kilogram", fromUnitSymbol: "kg", toUnitId: 2, toUnitName: "Gram", toUnitSymbol: "g", multiplier: 1000, notes: "1 kg = 1000 g" },
  { id: 2, fromUnitId: 3, fromUnitName: "Liter", fromUnitSymbol: "L", toUnitId: 4, toUnitName: "Milliliter", toUnitSymbol: "ml", multiplier: 1000, notes: "1 L = 1000 ml" },
  { id: 3, fromUnitId: 6, fromUnitName: "Box", fromUnitSymbol: "box", toUnitId: 5, toUnitName: "Piece", toUnitSymbol: "pcs", multiplier: 24, notes: "1 box = 24 pcs" },
  { id: 4, fromUnitId: 7, fromUnitName: "Carton", fromUnitSymbol: "ctn", toUnitId: 6, toUnitName: "Box", toUnitSymbol: "box", multiplier: 10, notes: "1 ctn = 10 boxes" },
];

export const Route = createFileRoute("/_authenticated/purchases/unit-types")({
  component: UnitTypesMaster,
});

function UnitTypesMaster() {
  const [activeTab, setActiveTab] = React.useState<"units" | "conversions">("units");
  
  // Dialog state
  const [unitDialogOpen, setUnitDialogOpen] = React.useState(false);
  const [editingUnit, setEditingUnit] = React.useState<any | null>(null);

  const [conversionDialogOpen, setConversionDialogOpen] = React.useState(false);
  const [editingConversion, setEditingConversion] = React.useState<any | null>(null);

  // Filters
  const [unitSearch, setUnitSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [conversionSearch, setConversionSearch] = React.useState("");

  // Sandbox calculator state
  const [calcQuantity, setCalcQuantity] = React.useState<number>(1);
  const [calcFromUnitId, setCalcFromUnitId] = React.useState<number | "">("");
  const [calcToUnitId, setCalcToUnitId] = React.useState<number | "">("");

  // Queries
  const {
    data: fetchedUnits = [],
    isLoading: loadingUnits,
    refetch: refetchUnits,
    isRefetching: refetchingUnits
  } = useRpcQuery<any[]>(
    ["unit-types"],
    () => client["unit-types"].$get()
  );

  const {
    data: fetchedConversions = [],
    isLoading: loadingConversions,
    refetch: refetchConversions,
    isRefetching: refetchingConversions
  } = useRpcQuery<any[]>(
    ["unit-conversions"],
    () => client["unit-conversions"].$get()
  );

  // Fallback to defaults if backend array is empty (for instant preview/usability)
  const unitList = (fetchedUnits && fetchedUnits.length > 0) ? fetchedUnits : DEFAULT_UNIT_TYPES;
  const conversionList = (fetchedConversions && fetchedConversions.length > 0) ? fetchedConversions : DEFAULT_CONVERSIONS;

  // Sync default calc units when list loads
  React.useEffect(() => {
    if (unitList.length >= 2 && !calcFromUnitId && !calcToUnitId) {
      const boxUnit = unitList.find((u) => u.symbol === "box" || u.name === "Box") || unitList[0];
      const pcsUnit = unitList.find((u) => u.symbol === "pcs" || u.name === "Piece") || unitList[1];
      setCalcFromUnitId(boxUnit.id);
      setCalcToUnitId(pcsUnit.id);
    }
  }, [unitList]);

  // Forms
  const unitForm = useForm<UnitTypeFormValues>({
    resolver: zodResolver(unitTypeFormSchema) as any,
    defaultValues: {
      name: "",
      symbol: "",
      category: "Count/Quantity",
      isBaseUnit: false,
      description: "",
    },
  });

  const conversionForm = useForm<UnitConversionFormValues>({
    resolver: zodResolver(unitConversionFormSchema) as any,
    defaultValues: {
      fromUnitId: 0,
      toUnitId: 0,
      multiplier: 1,
      notes: "",
    },
  });

  // Reset Unit Form
  React.useEffect(() => {
    if (editingUnit) {
      unitForm.reset({
        name: editingUnit.name,
        symbol: editingUnit.symbol,
        category: editingUnit.category || "Count/Quantity",
        isBaseUnit: Boolean(editingUnit.isBaseUnit),
        description: editingUnit.description || "",
      });
    } else {
      unitForm.reset({
        name: "",
        symbol: "",
        category: "Count/Quantity",
        isBaseUnit: false,
        description: "",
      });
    }
  }, [editingUnit, unitDialogOpen]);

  // Reset Conversion Form
  React.useEffect(() => {
    if (editingConversion) {
      conversionForm.reset({
        fromUnitId: Number(editingConversion.fromUnitId),
        toUnitId: Number(editingConversion.toUnitId),
        multiplier: Number(editingConversion.multiplier),
        notes: editingConversion.notes || "",
      });
    } else {
      conversionForm.reset({
        fromUnitId: unitList[0]?.id || 0,
        toUnitId: unitList[1]?.id || 0,
        multiplier: 1,
        notes: "",
      });
    }
  }, [editingConversion, conversionDialogOpen, unitList]);

  // Unit Type Mutations
  const unitMutation = useMutation({
    mutationFn: async (values: UnitTypeFormValues) => {
      if (editingUnit) {
        const res = await client["unit-types"][":id"].$patch({
          param: { id: String(editingUnit.id) },
          json: values,
        } as any);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any)?.error || "Failed to update unit type");
        }
        return res.json();
      } else {
        const res = await client["unit-types"].$post({
          json: values,
        } as any);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any)?.error || "Failed to create unit type");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      toast.success(editingUnit ? "Unit type updated" : "Unit type created successfully");
      queryClient.invalidateQueries({ queryKey: ["unit-types"] });
      setUnitDialogOpen(false);
      setEditingUnit(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save unit type");
    },
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await client["unit-types"][":id"].$delete({
        param: { id: String(id) },
      } as any);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error || "Failed to delete unit type");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Unit type deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["unit-types"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete unit type");
    },
  });

  // Conversion Mutations
  const conversionMutation = useMutation({
    mutationFn: async (values: UnitConversionFormValues) => {
      if (editingConversion) {
        const res = await client["unit-conversions"][":id"].$patch({
          param: { id: String(editingConversion.id) },
          json: values,
        } as any);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any)?.error || "Failed to update conversion rule");
        }
        return res.json();
      } else {
        const res = await client["unit-conversions"].$post({
          json: values,
        } as any);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any)?.error || "Failed to create conversion rule");
        }
        return res.json();
      }
    },
    onSuccess: () => {
      toast.success(editingConversion ? "Conversion rule updated" : "Conversion rule saved");
      queryClient.invalidateQueries({ queryKey: ["unit-conversions"] });
      setConversionDialogOpen(false);
      setEditingConversion(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save conversion rule");
    },
  });

  const deleteConversionMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await client["unit-conversions"][":id"].$delete({
        param: { id: String(id) },
      } as any);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error || "Failed to delete conversion rule");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Conversion rule deleted");
      queryClient.invalidateQueries({ queryKey: ["unit-conversions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete conversion rule");
    },
  });

  // Graph Search Conversion Solver (calculates direct, inverse, or multi-step conversions)
  const calculateConversion = React.useCallback(
    (qty: number, fromId: number | "", toId: number | "") => {
      if (!fromId || !toId || fromId === toId || qty <= 0) {
        return { result: qty, pathNote: "1 : 1 Direct match" };
      }

      // Build graph adjacency list
      const adj: Map<number, { to: number; factor: number; note: string }[]> = new Map();

      const addEdge = (u: number, v: number, factor: number, note: string) => {
        if (!adj.has(u)) adj.set(u, []);
        adj.get(u)!.push({ to: v, factor, note });
      };

      for (const conv of conversionList) {
        const fId = Number(conv.fromUnitId);
        const tId = Number(conv.toUnitId);
        const mult = Number(conv.multiplier);
        if (fId && tId && mult > 0) {
          addEdge(fId, tId, mult, `Direct rule (${conv.fromUnitSymbol || fId} → ${conv.toUnitSymbol || tId})`);
          addEdge(tId, fId, 1 / mult, `Inverse rule (${conv.toUnitSymbol || tId} → ${conv.fromUnitSymbol || fId})`);
        }
      }

      // BFS to find conversion factor chain
      const queue: { current: number; totalFactor: number; path: string[] }[] = [
        { current: Number(fromId), totalFactor: 1, path: [] },
      ];
      const visited = new Set<number>([Number(fromId)]);

      while (queue.length > 0) {
        const { current, totalFactor, path } = queue.shift()!;
        if (current === Number(toId)) {
          return {
            result: qty * totalFactor,
            pathNote: path.length > 0 ? path.join(" → ") : "Direct conversion",
          };
        }

        const neighbors = adj.get(current) || [];
        for (const edge of neighbors) {
          if (!visited.has(edge.to)) {
            visited.add(edge.to);
            queue.push({
              current: edge.to,
              totalFactor: totalFactor * edge.factor,
              path: [...path, edge.note],
            });
          }
        }
      }

      return { result: null, pathNote: "No conversion rule pathway found" };
    },
    [conversionList]
  );

  const fromUnitObj = unitList.find((u) => u.id === Number(calcFromUnitId));
  const toUnitObj = unitList.find((u) => u.id === Number(calcToUnitId));
  const calcResultInfo = calculateConversion(calcQuantity, calcFromUnitId, calcToUnitId);

  // Swap sandbox calculator direction
  const handleSwapCalcUnits = () => {
    const temp = calcFromUnitId;
    setCalcFromUnitId(calcToUnitId);
    setCalcToUnitId(temp);
  };

  // Filtered unit list
  const filteredUnits = unitList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(unitSearch.toLowerCase()) ||
      u.symbol.toLowerCase().includes(unitSearch.toLowerCase()) ||
      (u.description && u.description.toLowerCase().includes(unitSearch.toLowerCase()));
    const matchesCat = selectedCategory === "all" || u.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Filtered conversion list
  const filteredConversions = conversionList.filter((c) => {
    const fromName = c.fromUnitName || unitList.find((u) => u.id === c.fromUnitId)?.name || "";
    const toName = c.toUnitName || unitList.find((u) => u.id === c.toUnitId)?.name || "";
    const term = conversionSearch.toLowerCase();
    return (
      fromName.toLowerCase().includes(term) ||
      toName.toLowerCase().includes(term) ||
      (c.notes && c.notes.toLowerCase().includes(term))
    );
  });

  return (
    <ModuleLayout
      title="Unit Types & Conversion Master"
      description="Manage units of measurement (e.g. Kg, Box, Pcs, Litres) and conversion rules between them."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-8 text-xs px-3"
            onClick={() => {
              refetchUnits();
              refetchConversions();
            }}
            disabled={loadingUnits || loadingConversions || refetchingUnits || refetchingConversions}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1.5 ${
                refetchingUnits || refetchingConversions ? "animate-spin" : ""
              }`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            className="h-8 text-xs px-3"
            onClick={() => {
              setEditingConversion(null);
              setConversionDialogOpen(true);
            }}
          >
            <ArrowRightLeft className="mr-1.5 h-4 w-4 text-primary" />
            Add Conversion Rule
          </Button>
          <Button
            className="h-8 text-xs px-3"
            onClick={() => {
              setEditingUnit(null);
              setUnitDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Unit Type
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Interactive Live Conversion Sandbox Card */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-secondary/10 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Live Unit Converter Sandbox</CardTitle>
                  <CardDescription className="text-xs">
                    Test conversions in real time using active master conversion rules.
                  </CardDescription>
                </div>
              </div>
              <Badge className="gap-1 border border-primary/30 text-primary bg-primary/10">
                <Sparkles className="h-3 w-3" /> Real-time Calculation
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Quantity */}
              <div className="md:col-span-3">
                <Label className="text-xs font-medium text-muted-foreground mb-1 block">Quantity</Label>
                <Field
                  type="number"
                  min="0.0001"
                  step="any"
                  value={calcQuantity}
                  onChange={(e) => setCalcQuantity(parseFloat(e.target.value) || 0)}
                  placeholder="Enter quantity"
                  className="bg-background"
                />
              </div>

              {/* From Unit */}
              <div className="md:col-span-3">
                <Select
                  label="From Unit"
                  value={String(calcFromUnitId)}
                  onChange={(e) => setCalcFromUnitId(Number(e.target.value) || "")}
                  options={unitList.map((u) => [String(u.id), `${u.name} (${u.symbol})`])}
                />
              </div>

              {/* Swap Button */}
              <div className="md:col-span-1 flex justify-center pb-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleSwapCalcUnits}
                  title="Swap From and To units"
                  className="rounded-full hover:bg-primary/10 hover:text-primary"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>
              </div>

              {/* To Unit */}
              <div className="md:col-span-3">
                <Select
                  label="To Unit"
                  value={String(calcToUnitId)}
                  onChange={(e) => setCalcToUnitId(Number(e.target.value) || "")}
                  options={unitList.map((u) => [String(u.id), `${u.name} (${u.symbol})`])}
                />
              </div>

              {/* Output Display */}
              <div className="md:col-span-12 mt-2 pt-3 border-t flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Result:</span>
                  {calcResultInfo.result !== null ? (
                    <span className="text-lg font-bold text-primary">
                      {calcQuantity} {fromUnitObj?.symbol || ""} ={" "}
                      <span className="text-xl font-extrabold text-foreground">
                        {Number(calcResultInfo.result.toFixed(4))}
                      </span>{" "}
                      {toUnitObj?.symbol || ""}
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Info className="h-4 w-4" /> No valid conversion rule exists between these units
                    </span>
                  )}
                </div>
                {calcResultInfo.pathNote && (
                  <span className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md font-mono">
                    {calcResultInfo.pathNote}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "units" ? "default" : "outline"}
              className="h-8 text-xs px-3 gap-2"
              onClick={() => setActiveTab("units")}
            >
              <Scale className="h-4 w-4" />
              Unit Types Registry ({unitList.length})
            </Button>
            <Button
              variant={activeTab === "conversions" ? "default" : "outline"}
              className="h-8 text-xs px-3 gap-2"
              onClick={() => setActiveTab("conversions")}
            >
              <ArrowRightLeft className="h-4 w-4" />
              Conversion Rules ({conversionList.length})
            </Button>
          </div>

          <span className="text-xs text-muted-foreground hidden sm:inline">
            Active Master Units: <strong>{unitList.length}</strong> | Registered Conversions:{" "}
            <strong>{conversionList.length}</strong>
          </span>
        </div>

        {/* Tab 1: Unit Types Registry */}
        {activeTab === "units" && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search unit by name, symbol..."
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  className="w-full bg-background rounded-md border text-sm pl-9 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition ${
                    selectedCategory === "all"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-background border hover:bg-accent text-muted-foreground"
                  }`}
                >
                  All Categories
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-background border hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Units Grid */}
            {filteredUnits.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent className="space-y-3">
                  <Scale className="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground text-sm">No unit types found matching your filter criteria.</p>
                  <Button
                    variant="outline"
                    className="h-8 text-xs px-3"
                    onClick={() => {
                      setUnitSearch("");
                      setSelectedCategory("all");
                    }}
                  >
                    Reset Filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredUnits.map((unit) => {
                  const conversionsFromCount = conversionList.filter(
                    (c) => Number(c.fromUnitId) === Number(unit.id)
                  ).length;
                  const conversionsToCount = conversionList.filter(
                    (c) => Number(c.toUnitId) === Number(unit.id)
                  ).length;

                  return (
                    <Card key={unit.id} className="relative group hover:shadow-md transition border">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                              {unit.name}
                              <Badge className="font-mono text-xs border border-muted bg-muted/50 text-foreground">
                                {unit.symbol}
                              </Badge>
                            </CardTitle>
                            <span className="text-xs text-muted-foreground mt-0.5 block">{unit.category}</span>
                          </div>

                          {unit.isBaseUnit && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 text-[10px] gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Base Unit
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-1 text-xs text-muted-foreground">
                        <p className="line-clamp-2 min-h-[2rem]">
                          {unit.description || "No description provided."}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t text-[11px]">
                          <span>
                            Conversions: <strong>{conversionsFromCount + conversionsToCount}</strong>
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingUnit(unit);
                                setUnitDialogOpen(true);
                              }}
                              title="Edit Unit Type"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete unit "${unit.name}"?`)) {
                                  deleteUnitMutation.mutate(unit.id);
                                }
                              }}
                              title="Delete Unit Type"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Unit Conversion Matrix & Rules */}
        {activeTab === "conversions" && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center justify-between gap-4 bg-muted/40 p-3 rounded-lg border">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter conversions..."
                  value={conversionSearch}
                  onChange={(e) => setConversionSearch(e.target.value)}
                  className="w-full bg-background rounded-md border text-sm pl-9 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Showing {filteredConversions.length} of {conversionList.length} conversion rules
              </span>
            </div>

            {/* Conversions Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                      <tr>
                        <th className="px-4 py-3">From Unit</th>
                        <th className="px-4 py-3 text-center">Conversion Multiplier</th>
                        <th className="px-4 py-3">To Unit</th>
                        <th className="px-4 py-3 font-mono">Inverse Rate Preview</th>
                        <th className="px-4 py-3">Notes</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredConversions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-muted-foreground">
                            No unit conversion rules found. Click "Add Conversion Rule" to create one.
                          </td>
                        </tr>
                      ) : (
                        filteredConversions.map((conv) => {
                          const fromUnit = unitList.find((u) => u.id === Number(conv.fromUnitId));
                          const toUnit = unitList.find((u) => u.id === Number(conv.toUnitId));
                          const fromName = conv.fromUnitName || fromUnit?.name || `Unit #${conv.fromUnitId}`;
                          const fromSym = conv.fromUnitSymbol || fromUnit?.symbol || "";
                          const toName = conv.toUnitName || toUnit?.name || `Unit #${conv.toUnitId}`;
                          const toSym = conv.toUnitSymbol || toUnit?.symbol || "";
                          const mult = Number(conv.multiplier);
                          const inverseMult = mult > 0 ? (1 / mult).toFixed(6) : "0";

                          return (
                            <tr key={conv.id} className="hover:bg-muted/30 transition">
                              <td className="px-4 py-3 font-medium">
                                <div className="flex items-center gap-1.5">
                                  <span>{fromName}</span>
                                  {fromSym && (
                                    <Badge className="font-mono text-xs border border-muted bg-muted/50 text-foreground">
                                      {fromSym}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full font-semibold text-xs">
                                  <span>1 {fromSym || fromName}</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                  <span>
                                    {mult} {toSym || toName}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 font-medium">
                                <div className="flex items-center gap-1.5">
                                  <span>{toName}</span>
                                  {toSym && (
                                    <Badge className="font-mono text-xs border border-muted bg-muted/50 text-foreground">
                                      {toSym}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                1 {toSym || toName} = {inverseMult} {fromSym || fromName}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">
                                {conv.notes || "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setEditingConversion(conv);
                                      setConversionDialogOpen(true);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                      if (confirm("Are you sure you want to delete this conversion rule?")) {
                                        deleteConversionMutation.mutate(conv.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Unit Type Add/Edit Dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUnit ? "Edit Unit Type" : "Add New Unit Type"}</DialogTitle>
            <DialogDescription>
              Define unit of measurement properties, category grouping, and base status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={unitForm.handleSubmit((v: any) => unitMutation.mutate(v))} className="space-y-4 pt-2">
            <Field
              label="Unit Name"
              placeholder="e.g. Kilogram, Piece, Box, Carton"
              {...unitForm.register("name")}
              error={unitForm.formState.errors.name?.message}
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Symbol / Abbreviation"
                placeholder="e.g. kg, pcs, box, L"
                {...unitForm.register("symbol")}
                error={unitForm.formState.errors.symbol?.message}
              />

              <Select
                label="Category"
                options={CATEGORIES.map((c) => [c, c])}
                {...unitForm.register("category")}
                error={unitForm.formState.errors.category?.message}
              />
            </div>

            <div className="flex items-center gap-2 border p-3 rounded-md bg-muted/30">
              <input
                type="checkbox"
                id="isBaseUnit"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                {...unitForm.register("isBaseUnit")}
              />
              <label htmlFor="isBaseUnit" className="text-xs font-medium cursor-pointer">
                Is Base Unit in this Category? (e.g. Kg for Mass, Liter for Volume, Pcs for Count)
              </label>
            </div>

            <div>
              <Label className="text-xs font-medium mb-1 block">Description / Memo</Label>
              <textarea
                rows={2}
                placeholder="Optional description or metric specification..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                {...unitForm.register("description")}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setUnitDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={unitMutation.isPending}>
                {unitMutation.isPending ? "Saving..." : editingUnit ? "Update Unit" : "Create Unit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unit Conversion Add/Edit Dialog */}
      <Dialog open={conversionDialogOpen} onOpenChange={setConversionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingConversion ? "Edit Conversion Rule" : "Add Unit Conversion Rule"}
            </DialogTitle>
            <DialogDescription>
              Define the multiplier factor between source and target units (e.g. 1 Box = 24 Pieces).
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={conversionForm.handleSubmit((v: any) => conversionMutation.mutate(v))}
            className="space-y-4 pt-2"
          >
            <Select
              label="From Unit (Source Unit)"
              options={unitList.map((u) => [String(u.id), `${u.name} (${u.symbol}) - ${u.category}`])}
              {...conversionForm.register("fromUnitId")}
              error={conversionForm.formState.errors.fromUnitId?.message}
            />

            <Field
              label="Multiplier / Conversion Factor"
              type="number"
              step="any"
              min="0.000001"
              placeholder="e.g. 24 for 1 Box = 24 Pcs, or 1000 for 1 Kg = 1000 g"
              {...conversionForm.register("multiplier")}
              error={conversionForm.formState.errors.multiplier?.message}
            />

            <Select
              label="To Unit (Target Unit)"
              options={unitList.map((u) => [String(u.id), `${u.name} (${u.symbol}) - ${u.category}`])}
              {...conversionForm.register("toUnitId")}
              error={conversionForm.formState.errors.toUnitId?.message}
            />

            <div>
              <Label className="text-xs font-medium mb-1 block">Notes / Formula Description</Label>
              <textarea
                rows={2}
                placeholder="e.g. Standard packaging box containing 24 individual pieces"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                {...conversionForm.register("notes")}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setConversionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={conversionMutation.isPending}>
                {conversionMutation.isPending
                  ? "Saving..."
                  : editingConversion
                  ? "Update Rule"
                  : "Save Conversion Rule"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
