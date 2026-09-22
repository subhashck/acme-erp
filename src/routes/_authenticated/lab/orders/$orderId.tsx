import * as React from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FlaskConical,
  ArrowLeft,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  ShieldCheck,
  Send,
  Save,
  User,
  AlertCircle,
  FileText,
  Calendar,
  Layers,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
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
import { useUserPermissions } from "@/lib/permissions";
import { evaluateResultFlag } from "../../../../../server/services/lab-engine.ts";

export const Route = createFileRoute("/_authenticated/lab/orders/$orderId")({
  component: LabOrderWorkspacePage,
});

function LabOrderWorkspacePage() {
  const { orderId } = useParams({ from: "/_authenticated/lab/orders/$orderId" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, isPathologist } = useUserPermissions();

  // Local state for results entry
  const [resultValues, setResultValues] = React.useState<Record<number, { value: string; notes?: string }>>({});
  const [collectionSpecimen, setCollectionSpecimen] = React.useState("Whole Blood EDTA & Serum");

  // Fetch Order Detail
  const { data: order, isLoading, refetch } = useQuery({
    queryKey: ["lab-order-detail", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/lab/orders/${orderId}`);
      if (!res.ok) throw new Error("Failed to load order");
      return res.json();
    },
    refetchInterval: 10000,
  });

  // Sync existing result values from DB
  React.useEffect(() => {
    if (order?.results) {
      const init: Record<number, { value: string; notes?: string }> = {};
      for (const r of order.results) {
        init[r.id] = {
          value: r.value ?? "",
          notes: r.notes ?? "",
        };
      }
      setResultValues(init);
    }
  }, [order?.results]);

  // Sample Collection Mutation
  const collectSampleMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/lab/orders/${orderId}/samples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specimenType: collectionSpecimen }),
      });
      if (!res.ok) throw new Error("Failed to record sample collection");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Sample collected. Accession No: ${data.accessionNo}`);
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Save Results Mutation
  const saveResultsMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        results: (order?.results || []).map((r: any) => ({
          resultId: r.id,
          testId: r.testId,
          value: resultValues[r.id]?.value ?? "",
          notes: resultValues[r.id]?.notes ?? "",
        })),
      };

      const res = await fetch(`/api/lab/orders/${orderId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save results");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Investigation results saved successfully.");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Pathologist Verification Mutation
  const verifyAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/lab/orders/${orderId}/verify-all`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to verify results");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("All investigation results clinically verified.");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Release Report Mutation
  const releaseReportMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/lab/orders/${orderId}/release`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to release report");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Diagnostic report released to clinician and patient file.");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Cancel Order Mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/lab/orders/${orderId}/cancel`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to cancel order");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Lab order cancelled.");
      refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <FlaskConical className="h-8 w-8 animate-spin mx-auto mb-2 text-teal-600" />
        Loading laboratory order workspace...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
        Order not found.
      </div>
    );
  }

  const isCompleted = order.status === "Completed";
  const isCancelled = order.status === "Cancelled";
  const allResultsFilled = (order.results || []).every(
    (r: any) => (resultValues[r.id]?.value ?? "").trim() !== ""
  );
  const allResultsVerified = (order.results || []).every(
    (r: any) => r.status === "Verified" || r.status === "Released"
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Navigation & Status Bar */}
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
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold bg-muted px-2.5 py-0.5 rounded border border-border">
                {order.orderNo}
              </span>
              <Badge variant={order.priority === "STAT" ? "destructive" : order.priority === "Urgent" ? "secondary" : "outline"} className="text-xs">
                {order.priority}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {order.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ordered on {new Date(order.orderedAt).toLocaleString("en-IN")} • Physician: {order.orderedByName || "Outpatient OPD"}
            </p>
          </div>
        </div>

        {/* Global Order Actions */}
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <Button
              onClick={() => navigate({ to: `/lab/reports/${order.id}` as any })}
              className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-sm text-xs"
            >
              <Printer className="h-4 w-4" />
              Print Diagnostic Report
            </Button>
          ) : (
            <>
              {!isCancelled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelOrderMutation.mutate()}
                  disabled={cancelOrderMutation.isPending}
                  className="text-xs text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Cancel Order
                </Button>
              )}
              {(isAdmin || isPathologist) && allResultsFilled && !allResultsVerified && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => verifyAllMutation.mutate()}
                  disabled={verifyAllMutation.isPending}
                  className="text-xs border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                >
                  <ShieldCheck className="h-4 w-4 mr-1 text-blue-600" />
                  Pathologist Verify All
                </Button>
              )}
              {allResultsVerified && !isCompleted && (
                <Button
                  size="sm"
                  onClick={() => releaseReportMutation.mutate()}
                  disabled={releaseReportMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="h-4 w-4" />
                  Release Report
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Patient Demographic Card */}
      <Card className="shadow-xs border-teal-500/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground block">Patient Name</span>
              <span className="font-bold text-sm text-foreground">{order.patientName}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">MRN</span>
              <span className="font-mono font-semibold text-foreground">{order.patientMrn}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Age / Gender</span>
              <span className="font-medium text-foreground">{order.patientAge}y / {order.patientGender}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Blood Group</span>
              <span className="font-semibold text-foreground">{order.patientBloodGroup || "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Phone</span>
              <span className="font-medium text-foreground">{order.patientPhone}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Clinical Indication</span>
              <span className="font-medium text-foreground line-clamp-1" title={order.clinicalNotes || "None"}>
                {order.clinicalNotes || "Routine check"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specimen / Sample Collection Section */}
      <Card className="shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Barcode className="h-4 w-4 text-teal-600" />
              Specimen Tracking & Accession
            </span>
            <Badge variant="outline" className="font-mono text-xs">
              {(order.samples || []).length} Specimens
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {(order.samples || []).length === 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Sample Collection Pending</p>
                  <p className="text-muted-foreground">Draw required specimens at phlebotomy counter to generate accession numbers.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  type="text"
                  value={collectionSpecimen}
                  onChange={(e) => setCollectionSpecimen(e.target.value)}
                  placeholder="Specimen Type"
                  className="text-xs h-8 sm:w-60"
                />
                <Button
                  size="sm"
                  onClick={() => collectSampleMutation.mutate()}
                  disabled={collectSampleMutation.isPending || isCancelled}
                  className="bg-teal-600 hover:bg-teal-700 text-white shrink-0 text-xs h-8"
                >
                  Record Collection
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {order.samples.map((sample: any) => (
                <div
                  key={sample.id}
                  className="p-3 rounded-lg border border-border bg-muted/30 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Barcode className="h-4 w-4 text-teal-600" />
                      <span className="font-mono font-bold text-foreground">{sample.accessionNo}</span>
                    </div>
                    <p className="text-muted-foreground">{sample.specimenType}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Collected: {new Date(sample.collectedAt || sample.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600">
                    Received
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investigation Results & Auto-Flagging Grid */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-teal-600" />
            Investigation Results & Automatic Flagging
          </CardTitle>
          {!isCompleted && !isCancelled && (
            <Button
              size="sm"
              onClick={() => saveResultsMutation.mutate()}
              disabled={saveResultsMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs flex items-center gap-1.5 h-8"
            >
              <Save className="h-3.5 w-3.5" />
              Save Draft Results
            </Button>
          )}
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/60 uppercase font-semibold text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-3">Investigation</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Specimen</th>
                <th className="px-4 py-3 w-44">Observed Value</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Biological Reference Interval</th>
                <th className="px-4 py-3 text-center">Flag</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(order.results || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    No investigation parameters registered for this order.
                  </td>
                </tr>
              ) : (
                order.results.map((res: any) => {
                  const currentValue = resultValues[res.id]?.value ?? "";
                  // Live computed flag as user types
                  const computedFlag = evaluateResultFlag(
                    currentValue,
                    res.allRanges || [],
                    order.patientAge,
                    order.patientGender
                  );

                  let normalRangeStr = res.referenceRange?.textRange || "";
                  if (!normalRangeStr && res.referenceRange?.lowValue != null && res.referenceRange?.highValue != null) {
                    normalRangeStr = `${Number(res.referenceRange.lowValue)} - ${Number(res.referenceRange.highValue)}`;
                  }

                  return (
                    <tr key={res.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">
                        <div>{res.testName}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{res.testCode}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {res.categoryName || "General"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {res.specimenType}
                      </td>
                      <td className="px-4 py-3">
                        {isCompleted || isCancelled ? (
                          <span className="font-bold text-foreground text-sm font-mono">
                            {res.value || "—"}
                          </span>
                        ) : (
                          <Input
                            type="text"
                            value={currentValue}
                            onChange={(e) =>
                              setResultValues((prev) => ({
                                ...prev,
                                [res.id]: {
                                  ...prev[res.id],
                                  value: e.target.value,
                                },
                              }))
                            }
                            placeholder="Enter value"
                            className="h-8 text-xs font-mono font-semibold"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {res.unit || "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {normalRangeStr || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {computedFlag === "Normal" && (
                          <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-[10px] px-2">
                            Normal
                          </Badge>
                        )}
                        {computedFlag === "Low" && (
                          <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 text-[10px] px-2 font-semibold">
                            Low ↓
                          </Badge>
                        )}
                        {computedFlag === "High" && (
                          <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 text-[10px] px-2 font-semibold">
                            High ↑
                          </Badge>
                        )}
                        {computedFlag === "Critical" && (
                          <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold animate-pulse text-[10px] px-2 shadow-xs">
                            Critical ⚠
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[10px]">
                          {res.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
