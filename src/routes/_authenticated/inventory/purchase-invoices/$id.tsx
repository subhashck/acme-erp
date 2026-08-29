import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { Field } from "@/components/Field";
import { Select } from "@/ui/select";
import { Label } from "@/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  CreditCard,
  Plus,
  Loader2,
  Calendar as CalendarIcon,
  Building,
  Hash,
  Clock,
  Layers,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/inventory/purchase-invoices/$id")({
  component: PurchaseInvoiceDetail,
});

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300">Draft</Badge>;
    case "verified":
      return <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 font-semibold">Verified (3-Way)</Badge>;
    case "approved":
      return <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-semibold">Approved for Pay</Badge>;
    case "partially_paid":
      return <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 font-semibold">Partially Paid</Badge>;
    case "paid":
      return <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 font-semibold">Fully Paid</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function PurchaseInvoiceDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);

  // Payment form state
  const [paymentDate, setPaymentDate] = React.useState(new Date().toISOString().split("T")[0]);
  const [paymentAmount, setPaymentAmount] = React.useState<number | "">("");
  const [paymentMode, setPaymentMode] = React.useState("rtgs");
  const [paymentRef, setPaymentRef] = React.useState("");
  const [paymentNotes, setPaymentNotes] = React.useState("");

  const { data: invoice, isLoading, refetch } = useRpcQuery<any>(
    ["purchase-invoice", id],
    () =>
      (client as any)["inventory"]["purchase-invoices"][":id"].$get({
        param: { id },
      })
  );

  const netAmount = Number(invoice?.netAmount || 0);
  const paidAmount = Number(invoice?.paidAmount || 0);
  const balanceDue = Math.max(0, netAmount - paidAmount);

  // Initialize payment amount when dialog opens
  React.useEffect(() => {
    if (paymentDialogOpen && balanceDue > 0) {
      setPaymentAmount(balanceDue);
    }
  }, [paymentDialogOpen, balanceDue]);

  // 1. Verify Action
  const verifyMutation = useMutation({
    mutationFn: async () => {
      const res = await (client as any)["inventory"]["purchase-invoices"][":id"]["verify"].$patch({
        param: { id },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error || "Failed to verify invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Purchase invoice 3-way match verified!");
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // 2. Approve Action
  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await (client as any)["inventory"]["purchase-invoices"][":id"]["approve"].$patch({
        param: { id },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error || "Failed to approve invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Purchase invoice approved for payment!");
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // 3. Record Payment Action
  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentAmount || Number(paymentAmount) <= 0) {
        throw new Error("Payment amount must be greater than 0");
      }
      const payload = {
        paymentDate,
        amount: Number(paymentAmount),
        paymentMode,
        referenceNo: paymentRef || null,
        remarks: paymentNotes || null,
      };

      const res = await (client as any)["inventory"]["purchase-invoices"][":id"]["payments"].$post({
        param: { id },
        json: payload,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error || "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Vendor payment recorded successfully!");
      setPaymentDialogOpen(false);
      setPaymentRef("");
      setPaymentNotes("");
      queryClient.invalidateQueries({ queryKey: ["purchase-invoice", id] });
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // 4. Delete Action
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await (client as any)["inventory"]["purchase-invoices"][":id"].$delete({
        param: { id },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error || "Failed to delete invoice");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Invoice deleted");
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      navigate({ to: "/inventory/purchase-invoices" as any });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <ModuleLayout title="Purchase Invoice" description="Loading invoice details...">
        <div className="py-24 text-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          Loading purchase invoice...
        </div>
      </ModuleLayout>
    );
  }

  if (!invoice) {
    return (
      <ModuleLayout title="Invoice Not Found" description="The requested invoice does not exist.">
        <div className="py-12 text-center">
          <p className="text-muted-foreground mb-4">Invoice #{id} was not found.</p>
          <Link to={"/inventory/purchase-invoices" as any}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to Invoices
            </Button>
          </Link>
        </div>
      </ModuleLayout>
    );
  }

  const items = invoice.items || [];
  const payments = invoice.payments || [];

  return (
    <ModuleLayout
      title={`Purchase Invoice ${invoice.invoiceNo}`}
      description="3-Way Match Verification, Delivery Audit & Supplier Payment Tracking."
      action={
        <div className="flex items-center gap-2">
          <Link to={"/inventory/purchase-invoices" as any}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" /> All Invoices
            </Button>
          </Link>

          {invoice.status === "draft" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm("Are you sure you want to delete this draft invoice?")) {
                    deleteMutation.mutate();
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>

              <Button
                size="sm"
                disabled={verifyMutation.isPending}
                onClick={() => verifyMutation.mutate()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {verifyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <ShieldCheck className="h-4 w-4 mr-1" />}
                Verify 3-Way Match
              </Button>
            </>
          )}

          {invoice.status === "verified" && (
            <Button
              size="sm"
              disabled={approveMutation.isPending}
              onClick={() => approveMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Approve for Payment
            </Button>
          )}

          {["approved", "partially_paid", "verified"].includes(invoice.status) && balanceDue > 0 && (
            <Button
              size="sm"
              onClick={() => setPaymentDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            >
              <CreditCard className="h-4 w-4 mr-1" /> Record Payment
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b bg-muted/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-mono font-bold">{invoice.invoiceNo}</CardTitle>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <CardDescription className="text-xs">
                    Recorded on {new Date(invoice.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>

              {/* 3-Way Match Indicators */}
              <div className="flex items-center gap-2">
                {invoice.purchaseOrder && (
                  <Badge variant="outline" className="bg-background text-xs font-mono">
                    PO: {invoice.purchaseOrder.poNo}
                  </Badge>
                )}
                {invoice.grn && (
                  <Badge variant="outline" className="bg-background text-xs font-mono">
                    GRN: {invoice.grn.grnNo || "#" + invoice.grn.id}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Supplier / Vendor:</span>
                <strong className="text-sm text-foreground block mt-0.5">
                  {invoice.vendor?.name || "Unknown"}
                </strong>
                <span className="text-[11px] text-muted-foreground">
                  GSTIN: {invoice.vendor?.gstNumber || "Unregistered"}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block">Vendor Invoice No & Date:</span>
                <strong className="text-sm text-foreground block mt-0.5 font-mono">
                  {invoice.vendorInvoiceNo}
                </strong>
                <span className="text-[11px] text-muted-foreground">Dated: {invoice.invoiceDate}</span>
              </div>

              <div>
                <span className="text-muted-foreground block">Credit Terms & Due Date:</span>
                <strong className="text-sm text-foreground block mt-0.5">
                  {invoice.paymentTermsDays ? `${invoice.paymentTermsDays} Days` : "Immediate"}
                </strong>
                <span className="text-[11px] text-muted-foreground">Due on: {invoice.dueDate || "—"}</span>
              </div>

              <div>
                <span className="text-muted-foreground block">Payment Status:</span>
                <strong className="text-sm block mt-0.5 font-mono text-emerald-600 dark:text-emerald-400">
                  Paid: ₹{paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </strong>
                {balanceDue > 0 && (
                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
                    Balance: ₹{balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items Table */}
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted/20 border-b">
            <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600" /> Billed Items Breakdown
            </CardTitle>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="px-3 py-2.5">Item Name</th>
                  <th className="px-3 py-2.5">Unit</th>
                  <th className="px-3 py-2.5 text-right">PO Ordered</th>
                  <th className="px-3 py-2.5 text-right">GRN Received</th>
                  <th className="px-3 py-2.5 text-right">Billed Qty</th>
                  <th className="px-3 py-2.5 text-right">Unit Rate (₹)</th>
                  <th className="px-3 py-2.5 text-right">Taxable</th>
                  <th className="px-3 py-2.5 text-right">GST %</th>
                  <th className="px-3 py-2.5 text-right">Total (₹)</th>
                  <th className="px-3 py-2.5 text-center">3-Way Check</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item: any) => {
                  const poQty = Number(item.poOrderedQty || 0);
                  const grnQty = Number(item.grnReceivedQty || 0);
                  const billedQty = Number(item.quantity ?? item.billedQty ?? 0);
                  const isQtyMismatch = grnQty > 0 && billedQty > grnQty;

                  return (
                    <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-foreground">
                        {item.item?.name || item.itemName || "Item"}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-muted-foreground">
                        {item.unitSymbol || item.unitName || item.unitType?.symbol || item.unit || "unit"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                        {poQty > 0 ? poQty : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-muted-foreground">
                        {grnQty > 0 ? grnQty : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">
                        {billedQty}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        ₹{Number(item.unitRate || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-medium">
                        ₹{Number(item.taxableAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {Number(item.gstPercent || 0)}%
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-foreground">
                        ₹{Number(item.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {isQtyMismatch ? (
                          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px]">
                            Qty Variance
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            Match OK
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Financial Summary and Payment History Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Payment History Card */}
          <div className="md:col-span-7">
            <Card className="shadow-xs">
              <CardHeader className="py-3 px-4 bg-muted/20 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" /> Vendor Payment Ledger
                </CardTitle>
                {balanceDue > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setPaymentDialogOpen(true)} className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add Payment
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {payments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    No disbursements logged yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/30 text-muted-foreground font-semibold">
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2">Mode</th>
                          <th className="px-3 py-2">Ref / Cheque</th>
                          <th className="px-3 py-2 text-right">Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {payments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-muted/10">
                            <td className="px-3 py-2">{p.paymentDate}</td>
                            <td className="px-3 py-2 font-medium uppercase text-[11px]">
                              {p.paymentMode === "rtgs" ? "NEFT / RTGS" : p.paymentMode}
                            </td>
                            <td className="px-3 py-2 font-mono text-muted-foreground">{p.referenceNo || "—"}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              ₹{Number(p.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Financial Calculation Summary Card */}
          <div className="md:col-span-5">
            <Card className="shadow-xs bg-muted/10 border-primary/20">
              <CardHeader className="py-3 px-4 border-b bg-muted/20">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Financial Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Subtotal</span>
                  <span className="font-mono">
                    ₹{Number(invoice.subtotal || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {Number(invoice.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span className="font-mono">
                      -₹{Number(invoice.discountAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>Taxable Value</span>
                  <span className="font-mono">
                    ₹{Number(invoice.taxableAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>CGST</span>
                  <span className="font-mono">
                    ₹{Number(invoice.cgstAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>SGST</span>
                  <span className="font-mono">
                    ₹{Number(invoice.sgstAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {Number(invoice.igstAmount || 0) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>IGST</span>
                    <span className="font-mono">
                      ₹{Number(invoice.igstAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {Number(invoice.roundOff || 0) !== 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Round Off</span>
                    <span className="font-mono">{Number(invoice.roundOff || 0).toFixed(2)}</span>
                  </div>
                )}
                {Number(invoice.tdsAmount || 0) > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>TDS Deducted</span>
                    <span className="font-mono">
                      -₹{Number(invoice.tdsAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t text-primary">
                  <span>Net Payable</span>
                  <span className="font-mono">
                    ₹{netAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>Paid Amount</span>
                  <span className="font-mono">
                    ₹{paidAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {balanceDue > 0 && (
                  <div className="flex justify-between font-bold text-amber-600 dark:text-amber-400 pt-1 border-t">
                    <span>Outstanding Due</span>
                    <span className="font-mono">
                      ₹{balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-600" /> Record Supplier Payment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Disburse fund against Vendor Invoice {invoice.invoiceNo}.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              recordPaymentMutation.mutate();
            }}
            className="space-y-4 pt-2"
          >
            <div className="flex flex-col space-y-1.5">
              <Label>Payment Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background px-3 h-10",
                      !paymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    {paymentDate && !isNaN(new Date(paymentDate).getTime()) ? (
                      format(new Date(paymentDate), "dd MMM yyyy")
                    ) : (
                      <span>Pick payment date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate ? new Date(paymentDate) : undefined}
                    onSelect={(date) => setPaymentDate(date ? format(date, "yyyy-MM-dd") : "")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Field
              label={`Payment Amount (Max ₹${balanceDue.toFixed(2)}) *`}
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || "")}
            />

            <div className="flex flex-col space-y-1.5">
              <label className="text-xs font-medium">Payment Mode *</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
              >
                <option value="rtgs">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI / Online</option>
                <option value="card">Debit / Credit Card</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>

            <Field
              label="Reference / Cheque / UTR No"
              placeholder="e.g. UTR-98234812"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
            />

            <Field
              label="Notes"
              placeholder="Optional remarks..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={recordPaymentMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {recordPaymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Confirm Payment
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
