import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "../../../../components/ModuleLayout";
import { useRpcQuery } from "../../../../lib/query";
import { client } from "../../../../services/rpc";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "../../../../lib/query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ChevronLeft, 
  Loader2, 
  Edit, 
  Trash2, 
  Calendar as CalendarIcon, 
  CreditCard,
  Truck,
  Printer,
  Download,
} from "lucide-react";
import { Button } from "../../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../../ui/card";
import { Badge } from "../../../../ui/badge";
import { Label } from "../../../../ui/label";
import { Field } from "../../../../components/Field";
import { Select } from "../../../../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";
import { Calendar } from "../../../../components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../../components/ui/dialog";
import { toast } from "sonner";
import * as React from "react";
import { format } from "date-fns";
import { cn } from "../../../../utils/cn";
import { toNum } from "../../../../utils/math";
import { useHospitalSettings } from "@/lib/settings";
import { authClient } from "@/services/auth";
import { printPurchaseOrderPDF, downloadPurchaseOrderPDF } from "@/lib/po-export";

// Schema for payment creation validation in frontend
const paymentFormSchema = z.object({
  paymentDate: z.string().min(1, "Date is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMode: z.enum(["cash", "upi", "card", "rtgs", "cheque", "other"]),
  referenceNo: z.string().optional(),
  remarks: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export const Route = createFileRoute("/_authenticated/purchases/purchase-orders/$id")({
  component: PurchaseOrderDetailRoute,
});

function PurchaseOrderDetailRoute() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const hospitalSettings = useHospitalSettings();
  const session = authClient.useSession();
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);

  const { data: po, isLoading, error } = useRpcQuery<any>(
    ["purchase-orders", id],
    () => client["purchase-orders"][":id"].$get({ param: { id } })
  );

  const paymentForm = useForm<PaymentFormValues>({
    // @ts-ignore
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      amount: 0,
      paymentMode: "upi",
      referenceNo: "",
      remarks: "",
    },
  });

  // Calculate and reset default values for outstanding balance whenever PO details change or dialog opens
  React.useEffect(() => {
    if (paymentDialogOpen && po) {
      const paid = (po.payments || []).reduce((sum: number, p: any) => sum + toNum(p.amount), 0);
      const balance = Math.max(0, toNum(po.totalValue) - paid);
      paymentForm.reset({
        paymentDate: format(new Date(), "yyyy-MM-dd"),
        amount: balance,
        paymentMode: "upi",
        referenceNo: "",
        remarks: "",
      });
    }
  }, [paymentDialogOpen, po]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await client["purchase-orders"][":id"].$delete({ param: { id } });
      if (!res.ok) {
        const errorData = await (res.json() as Promise<any>).catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete purchase order");
      }
      return res.json();
    },
    onSuccess: async () => {
      toast.success("Purchase order deleted successfully");
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      navigate({ to: "/purchases/purchase-orders", search: { page: 1, limit: 10 } });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete purchase order");
    }
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      const res = await (client["purchase-orders"][":id"].payments as any).$post({
        param: { id },
        json: data,
      });
      if (!res.ok) {
        const errorData = await (res.json() as Promise<any>).catch(() => ({}));
        throw new Error(errorData.error || "Failed to record payment");
      }
      return res.json();
    },
    onSuccess: async () => {
      toast.success("Payment recorded successfully");
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders", id] });
      setPaymentDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record payment");
    }
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      const res = await (client.payments as any)[":paymentId"].$delete({
        param: { paymentId: String(paymentId) },
      });
      if (!res.ok) {
        const errorData = await (res.json() as Promise<any>).catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete payment");
      }
      return res.json();
    },
    onSuccess: async () => {
      toast.success("Payment deleted successfully");
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete payment");
    }
  });

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this purchase order?")) {
      deleteMutation.mutate();
    }
  };

  const onRecordPaymentSubmit = (values: PaymentFormValues) => {
    recordPaymentMutation.mutate(values);
  };

  const handlePrintPdf = () => {
    if (!po) return;
    try {
      printPurchaseOrderPDF(po, hospitalSettings, session.data?.user?.name);
    } catch (err: any) {
      console.error("Failed to print PO", err);
      toast.error("Failed to print Purchase Order: " + (err.message || "Unknown error"));
    }
  };

  const handleDownloadPdf = () => {
    if (!po) return;
    try {
      downloadPurchaseOrderPDF(po, hospitalSettings, session.data?.user?.name);
      toast.success(`Purchase Order PO-${po.poNo}.pdf downloaded`);
    } catch (err: any) {
      console.error("Failed to download PO PDF", err);
      toast.error("Failed to download Purchase Order PDF: " + (err.message || "Unknown error"));
    }
  };

  const getPoStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900";
      case "partial":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900";
      case "closed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "unpaid":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900";
      case "partial":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900";
      case "paid":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  if (isLoading) {
    return (
      <ModuleLayout title="PO Details" description="Loading purchase order details...">
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (error || !po) {
    return (
      <ModuleLayout title="PO Details" description="Error loading purchase order.">
        <div className="text-center text-destructive p-12">
          Failed to load PO details. Make sure it exists.
          <div className="mt-4">
            <Link to="/purchases/purchase-orders" search={{ page: 1, limit: 10 }}>
              <Button variant="outline">Back to List</Button>
            </Link>
          </div>
        </div>
      </ModuleLayout>
    );
  }

  const totalPaid = (po.payments || []).reduce((sum: number, p: any) => sum + toNum(p.amount), 0);
  const balanceDue = Math.max(0, toNum(po.totalValue) - totalPaid);

  return (
    <ModuleLayout
      title={`PO: ${po.poNo}`}
      description="Detailed view of purchase order, items, received GRNs, and payments."
      action={
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            onClick={handlePrintPdf}
            title="Print Purchase Order document"
          >
            <Printer className="mr-1 h-4 w-4" /> Print PO
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDownloadPdf}
            title="Download PDF document"
          >
            <Download className="mr-1 h-4 w-4" /> Download PDF
          </Button>
          <Link to="/purchases/purchase-orders" search={{ page: 1, limit: 10 }}>
            <Button variant="outline">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to List
            </Button>
          </Link>
          {po.poStatus === "open" && (
            <>
              <Link to="/purchases/purchase-orders/$id/edit" params={{ id }}>
                <Button variant="outline" className="text-indigo-650 hover:text-indigo-700">
                  <Edit className="mr-1 h-4 w-4" /> Edit PO
                </Button>
              </Link>
              <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={deleteMutation.isPending}>
                <Trash2 className="mr-1 h-4 w-4" /> Delete PO
              </Button>
            </>
          )}
          {po.poStatus !== "cancelled" && po.poStatus !== "closed" && (
            <Link to="/purchases/purchase-orders/$id/grn/new" params={{ id }}>
              <Button variant="outline">
                <Truck className="mr-1 h-4 w-4" /> Receive Goods
              </Button>
            </Link>
          )}
          {po.poStatus !== "cancelled" && (
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <CreditCard className="mr-1 h-4 w-4" /> Record Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Record Payment</DialogTitle>
                  <DialogDescription>
                    Record a payment transaction for this purchase order.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={paymentForm.handleSubmit(onRecordPaymentSubmit as any)} className="space-y-4 pt-4">
                  {/* Payment Date */}
                  <div className="flex flex-col space-y-1.5">
                    <Label>Payment Date *</Label>
                    <Controller
                      control={paymentForm.control}
                      name="paymentDate"
                      render={({ field, fieldState }) => (
                        <>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal bg-background px-3",
                                  !field.value && "text-muted-foreground",
                                  fieldState.error && "border-destructive"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                {field.value ? format(new Date(field.value), "PPP") : <span>Pick payment date</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value ? new Date(field.value) : undefined}
                                onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                              />
                            </PopoverContent>
                          </Popover>
                          {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                        </>
                      )}
                    />
                  </div>

                  {/* Amount */}
                  <Field 
                    label="Amount *" 
                    type="number"
                    step="0.01"
                    placeholder="Enter payment amount"
                    {...paymentForm.register("amount")}
                    error={paymentForm.formState.errors.amount?.message}
                  />

                  {/* Payment Mode */}
                  <Select 
                    label="Payment Mode *" 
                    options={[
                      ["cash", "Cash"],
                      ["upi", "UPI"],
                      ["card", "Card"],
                      ["rtgs", "RTGS/NEFT"],
                      ["cheque", "Cheque"],
                      ["other", "Other"]
                    ]}
                    {...paymentForm.register("paymentMode")}
                    error={paymentForm.formState.errors.paymentMode?.message}
                  />

                  {/* Reference No */}
                  <Field 
                    label="Reference Number / Txn ID" 
                    placeholder="e.g. UPI transaction ref, cheque no..."
                    {...paymentForm.register("referenceNo")}
                    error={paymentForm.formState.errors.referenceNo?.message}
                  />

                  {/* Remarks */}
                  <Field 
                    label="Remarks" 
                    placeholder="Optional notes..."
                    {...paymentForm.register("remarks")}
                    error={paymentForm.formState.errors.remarks?.message}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" type="button" onClick={() => setPaymentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={recordPaymentMutation.isPending}>
                      {recordPaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Payment
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      }
    >
      <div className="max-w-6xl mx-auto space-y-6 py-6 px-4 bg-background">
        {/* Header Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">PO Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">PO No:</span>
                <span className="text-sm font-semibold pr-16">{po.poNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">PO Date:</span>
                <span className="text-sm font-medium pr-16">{format(new Date(po.poDate), "dd MMM yyyy")}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">PO Status:</span>
                <Badge variant="default" className={cn("border px-2 py-0.5 uppercase text-[10px] font-bold", getPoStatusColor(po.poStatus))}>
                  {po.poStatus}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Payment Status:</span>
                <Badge variant="default" className={cn("border px-2 py-0.5 uppercase text-[10px] font-bold", getPaymentStatusColor(po.paymentStatus))}>
                  {po.paymentStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Vendor Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-sm font-semibold">{po.vendorName}</div>
              <div className="text-xs text-muted-foreground">ID: {po.vendorId}</div>
              {po.remarks && (
                <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
                  <strong>Remarks:</strong> {po.remarks}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Total PO Value:</span>
                <span className="text-lg font-bold text-primary">
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(toNum(po.totalValue))}
                </span>
              </div>
              <div className="text-xs text-muted-foreground border-t pt-2 mt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Total Payments Made:</span>
                  <span className="font-medium text-emerald-650">
                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalPaid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Balance Due:</span>
                  <span className="font-semibold text-rose-650">
                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(balanceDue)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PO Line Items */}
        <Card>
          <CardHeader>
            <CardTitle>PO Line Items</CardTitle>
            <CardDescription>Ordered inventory and products in this purchase order.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
                  <tr>
                    <th className="px-4 py-3">Item Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3 text-right">Ordered Qty</th>
                    <th className="px-4 py-3 text-right">Received Qty</th>
                    <th className="px-4 py-3 text-right">Pending Qty</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">GST %</th>
                    <th className="px-4 py-3 text-right">Line Value</th>
                  </tr>
                </thead>
                <tbody>
                  {(po.items || []).map((item: any) => {
                    const ordered = toNum(item.orderedQty);
                    const received = toNum(item.receivedQty);
                    const pending = Math.max(0, ordered - received);
                    const rate = toNum(item.unitRate);
                    const gst = toNum(item.gstPercent);
                    const val = toNum(item.lineValue);

                    return (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="px-4 py-3 font-medium">{item.itemName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.category || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{item.unit || "—"}</td>
                        <td className="px-4 py-3 text-right font-medium">{ordered}</td>
                        <td className="px-4 py-3 text-right text-emerald-650 font-semibold">{received}</td>
                        <td className="px-4 py-3 text-right text-amber-650 font-semibold">{pending}</td>
                        <td className="px-4 py-3 text-right">
                          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(rate)}
                        </td>
                        <td className="px-4 py-3 text-right">{gst}%</td>
                        <td className="px-4 py-3 text-right font-bold">
                          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(val)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* GRNs & Payments Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Prior GRNs */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Truck className="text-emerald-650 size-5" />
              <div>
                <CardTitle>Received Goods (GRNs)</CardTitle>
                <CardDescription>History of receipts registered against this PO.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {(!po.grns || po.grns.length === 0) ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No Goods Receipt Notes (GRNs) recorded yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {po.grns.map((grn: any) => (
                    <div key={grn.id} className="border p-4 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                      <div className="flex justify-between items-center">
                        <Link
                          to="/purchases/grns/$grnId"
                          params={{ grnId: String(grn.id) }}
                          className="font-semibold text-sm text-primary hover:underline"
                        >
                          {grn.grnNo}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(grn.grnDate), "dd MMM yyyy")}
                        </span>
                      </div>
                      {grn.dateOfDelivery && (
                        <div className="text-xs text-muted-foreground">
                          Delivery Date: {format(new Date(grn.dateOfDelivery), "dd MMM yyyy")}
                        </div>
                      )}
                      {grn.remarks && (
                        <div className="text-xs text-muted-foreground">
                          Remarks: {grn.remarks}
                        </div>
                      )}
                      
                      {/* Nested GRN Items Table */}
                      <div className="border-t pt-2 mt-2">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="text-muted-foreground uppercase border-b">
                              <th className="py-1">Item</th>
                              <th className="py-1 text-right">Received Qty</th>
                              <th className="py-1 text-right">Free Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grn.items?.map((gItem: any) => {
                              const matchingPoItem = po.items.find((pi: any) => pi.id === gItem.poItemId);
                              return (
                                <tr key={gItem.id} className="border-b last:border-0">
                                  <td className="py-1 font-medium">{matchingPoItem?.itemName || `PO Item #${gItem.poItemId}`}</td>
                                  <td className="py-1 text-right font-semibold text-emerald-650">{gItem.receivedQty}</td>
                                  <td className="py-1 text-right text-muted-foreground">{gItem.freeQty}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prior Payments History */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <CreditCard className="text-indigo-650 size-5" />
              <div>
                <CardTitle>PO Payments History</CardTitle>
                <CardDescription>Record of cash/cheque/UPI transactions for this order.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {(!po.payments || po.payments.length === 0) ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No payments logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-center">Mode</th>
                        <th className="px-4 py-3">Reference No</th>
                        <th className="px-4 py-3">Remarks</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {po.payments.map((p: any) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/10">
                          <td className="px-4 py-3 text-muted-foreground">
                            {format(new Date(p.paymentDate), "dd MMM yyyy")}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-650">
                            {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(toNum(p.amount))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="default" className="border px-2 py-0.5 uppercase text-[10px] font-bold bg-slate-50 text-slate-700 border-slate-200">
                              {p.paymentMode}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-medium">
                            {p.referenceNo || "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                            {p.remarks || "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:bg-destructive/10" 
                              title="Delete Payment"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this payment record?")) {
                                  deletePaymentMutation.mutate(p.id);
                                }
                              }}
                              disabled={deletePaymentMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
      </div>
    </ModuleLayout>
  );
}
