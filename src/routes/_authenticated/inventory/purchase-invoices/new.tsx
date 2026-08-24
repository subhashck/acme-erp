import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Field } from "@/components/Field";
import { Select } from "@/ui/select";
import { Badge } from "@/ui/badge";
import { toast } from "sonner";
import {
  FileText,
  Plus,
  Trash2,
  Save,
  ShieldCheck,
  Package,
  Download,
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const lineItemSchema = z.object({
  grnItemId: z.coerce.number().optional().nullable(),
  poItemId: z.coerce.number().optional().nullable(),
  itemId: z.coerce.number().positive("Item is required"),
  itemName: z.string().min(1, "Item name is required"),
  batchId: z.coerce.number().optional().nullable(),
  unitId: z.coerce.number().positive("Unit is required"),
  unit: z.string().optional(),
  poOrderedQty: z.coerce.number().min(0).default(0),
  grnReceivedQty: z.coerce.number().min(0).default(0),
  billedQty: z.coerce.number().positive("Billed quantity must be > 0"),
  unitRate: z.coerce.number().min(0, "Unit rate must be >= 0"),
  poRate: z.coerce.number().min(0).default(0),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  discountAmount: z.coerce.number().min(0).default(0),
  taxableAmount: z.coerce.number().min(0).default(0),
  gstPercent: z.coerce.number().min(0).default(0),
  cgstAmount: z.coerce.number().min(0).default(0),
  sgstAmount: z.coerce.number().min(0).default(0),
  igstAmount: z.coerce.number().min(0).default(0),
  totalAmount: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
});

const invoiceFormSchema = z.object({
  vendorId: z.coerce.number().positive("Vendor is required"),
  vendorInvoiceNo: z.string().min(1, "Vendor Invoice No is required"),
  invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid invoice date is required"),
  dueDate: z.string().optional().nullable(),
  grnId: z.coerce.number().optional().nullable(),
  poId: z.coerce.number().optional().nullable(),
  isInterState: z.boolean().default(false),
  paymentTermsDays: z.coerce.number().min(0).default(30),
  tdsPercent: z.coerce.number().min(0).max(100).default(0),
  remarks: z.string().optional().nullable(),
  items: z.array(lineItemSchema).min(1, "At least one line item is required"),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export const Route = createFileRoute("/_authenticated/inventory/purchase-invoices/new")({
  component: NewPurchaseInvoice,
});

function NewPurchaseInvoice() {
  const navigate = useNavigate();
  const [grnPickerOpen, setGrnPickerOpen] = React.useState(false);

  const { data: vendorsList = [] } = useRpcQuery<any[]>(
    ["vendors"],
    () => client.vendors.$get()
  );

  const { data: itemsCatalog = [] } = useRpcQuery<any[]>(
    ["items-all"],
    () => (client as any).items.$get()
  );

  const { data: unitTypes = [] } = useRpcQuery<any[]>(
    ["unit-types"],
    () => client["unit-types"].$get()
  );

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues: {
      vendorId: 0,
      vendorInvoiceNo: "",
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      isInterState: false,
      paymentTermsDays: 30,
      tdsPercent: 0,
      remarks: "",
      items: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchVendorId = Number(form.watch("vendorId") || 0);
  const watchIsInterState = form.watch("isInterState");
  const watchTdsPercent = Number(form.watch("tdsPercent") || 0);
  const watchedItems = form.watch("items") || [];

  // Query unbilled / pending GRNs for selected vendor
  const { data: pendingGrns = [], isLoading: loadingGrns } = useRpcQuery<any[]>(
    ["pending-grns", watchVendorId],
    () =>
      (client as any)["inventory"]["purchase-invoices"]["pending"].$get({
        query: { vendorId: String(watchVendorId) },
      }),
    { enabled: watchVendorId > 0 }
  );

  // Recalculate line totals and summary whenever item rows change
  const summary = React.useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let taxableAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    watchedItems.forEach((item) => {
      const gross = (Number(item.billedQty) || 0) * (Number(item.unitRate) || 0);
      const discount = gross * ((Number(item.discountPercent) || 0) / 100);
      const taxable = Math.max(0, gross - discount);
      const gst = Number(item.gstPercent) || 0;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (watchIsInterState) {
        igst = taxable * (gst / 100);
      } else {
        cgst = taxable * (gst / 200);
        sgst = taxable * (gst / 200);
      }

      subtotal += gross;
      totalDiscount += discount;
      taxableAmount += taxable;
      cgstAmount += cgst;
      sgstAmount += sgst;
      igstAmount += igst;
    });

    const totalTax = cgstAmount + sgstAmount + igstAmount;
    const rawTotal = taxableAmount + totalTax;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = Number((roundedTotal - rawTotal).toFixed(2));
    const tdsAmount = Number((taxableAmount * (watchTdsPercent / 100)).toFixed(2));
    const netAmount = Math.max(0, roundedTotal - tdsAmount);

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      taxableAmount: Number(taxableAmount.toFixed(2)),
      cgstAmount: Number(cgstAmount.toFixed(2)),
      sgstAmount: Number(sgstAmount.toFixed(2)),
      igstAmount: Number(igstAmount.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      roundOff,
      tdsAmount,
      netAmount,
    };
  }, [watchedItems, watchIsInterState, watchTdsPercent]);

  // Update line calculations in form state
  const updateLineCalculations = (index: number) => {
    const item = form.getValues(`items.${index}`);
    if (!item) return;

    const billedQty = Number(item.billedQty) || 0;
    const unitRate = Number(item.unitRate) || 0;
    const discPct = Number(item.discountPercent) || 0;
    const gstPct = Number(item.gstPercent) || 0;

    const gross = billedQty * unitRate;
    const discAmt = gross * (discPct / 100);
    const taxable = Math.max(0, gross - discAmt);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (watchIsInterState) {
      igst = Number((taxable * (gstPct / 100)).toFixed(2));
    } else {
      cgst = Number((taxable * (gstPct / 200)).toFixed(2));
      sgst = Number((taxable * (gstPct / 200)).toFixed(2));
    }

    const total = Number((taxable + cgst + sgst + igst).toFixed(2));

    form.setValue(`items.${index}.discountAmount`, Number(discAmt.toFixed(2)));
    form.setValue(`items.${index}.taxableAmount`, Number(taxable.toFixed(2)));
    form.setValue(`items.${index}.cgstAmount`, cgst);
    form.setValue(`items.${index}.sgstAmount`, sgst);
    form.setValue(`items.${index}.igstAmount`, igst);
    form.setValue(`items.${index}.totalAmount`, total);
  };

  // Import GRN line items
  const handleImportGrn = (grn: any) => {
    form.setValue("grnId", grn.id);
    if (grn.poId) form.setValue("poId", grn.poId);

    const importedLines = (grn.items || []).map((gi: any) => {
      const orderedQty = Number(gi.poOrderedQty || gi.receivedQty || 0);
      const receivedQty = Number(gi.receivedQty || 0);
      const rate = Number(gi.unitRate || 0);
      const gstPct = Number(gi.gstPercent || 0);
      const taxable = Number((receivedQty * rate).toFixed(2));
      const cgst = watchIsInterState ? 0 : Number((taxable * (gstPct / 200)).toFixed(2));
      const sgst = watchIsInterState ? 0 : Number((taxable * (gstPct / 200)).toFixed(2));
      const igst = watchIsInterState ? Number((taxable * (gstPct / 100)).toFixed(2)) : 0;
      const total = Number((taxable + cgst + sgst + igst).toFixed(2));

      return {
        grnItemId: gi.id,
        poItemId: gi.poItemId || null,
        itemId: gi.itemId || 1,
        itemName: gi.itemName || "Item",
        batchId: gi.batchId || null,
        unitId: gi.unitId || 1,
        unit: gi.unit || gi.unitSymbol || "unit",
        poOrderedQty: orderedQty,
        grnReceivedQty: receivedQty,
        billedQty: receivedQty,
        unitRate: rate,
        poRate: rate,
        discountPercent: 0,
        discountAmount: 0,
        taxableAmount: taxable,
        gstPercent: gstPct,
        cgstAmount: cgst,
        sgstAmount: sgst,
        igstAmount: igst,
        totalAmount: total,
        notes: gi.notes || null,
      };
    });

    replace(importedLines);
    setGrnPickerOpen(false);
    toast.success(`Imported ${importedLines.length} item(s) from GRN ${grn.grnNo || "#" + grn.id}`);
  };

  const handleAddNewManualItem = () => {
    append({
      grnItemId: null,
      poItemId: null,
      itemId: 0,
      itemName: "",
      batchId: null,
      unitId: 1,
      unit: "pcs",
      poOrderedQty: 0,
      grnReceivedQty: 0,
      billedQty: 1,
      unitRate: 0,
      poRate: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxableAmount: 0,
      gstPercent: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: 0,
      notes: "",
    });
  };

  const createMutation = useMutation({
    mutationFn: async ({ values, verifyNow }: { values: InvoiceFormValues; verifyNow: boolean }) => {
      const payload = {
        ...values,
        subtotal: summary.subtotal,
        discountAmount: summary.totalDiscount,
        taxableAmount: summary.taxableAmount,
        cgstAmount: summary.cgstAmount,
        sgstAmount: summary.sgstAmount,
        igstAmount: summary.igstAmount,
        roundOff: summary.roundOff,
        tdsAmount: summary.tdsAmount,
        netAmount: summary.netAmount,
      };

      const res = await (client as any)["inventory"]["purchase-invoices"].$post({
        json: payload,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error || "Failed to save purchase invoice");
      }

      const created = await res.json();

      if (verifyNow && created.id) {
        await (client as any)["inventory"]["purchase-invoices"][":id"]["verify"].$patch({
          param: { id: String(created.id) },
        });
      }

      return created;
    },
    onSuccess: (data: any, vars) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-invoices"] });
      toast.success(
        vars.verifyNow
          ? "Purchase invoice created and verified (3-Way matched) successfully!"
          : "Purchase invoice draft saved successfully!"
      );
      navigate({
        to: "/inventory/purchase-invoices/$id" as any,
        params: { id: String(data.id) },
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create invoice");
    },
  });

  const onSubmit = (values: InvoiceFormValues, verifyNow: boolean) => {
    createMutation.mutate({ values, verifyNow });
  };

  const vendorOptions: [string, string][] = [
    ["", "Select Supplier / Vendor *"],
    ...vendorsList.map((v: any) => [String(v.id), `${v.name} (${v.gstNumber || "Unregistered"})`] as [string, string]),
  ];

  return (
    <ModuleLayout
      title="New Purchase Invoice"
      description="Record vendor delivery invoice, perform 3-way matching against GRN, and book liability."
      action={
        <Button variant="outline" size="sm" onClick={() => navigate({ to: "/inventory/purchase-invoices" as any })}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Invoices
        </Button>
      }
    >
      <form className="space-y-6">
        {/* Top Header Card: Vendor & Invoice Metadata */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b bg-muted/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Vendor Invoice Header
                </CardTitle>
                <CardDescription className="text-xs">
                  Fill in the vendor's billing metadata and link to Goods Receipt Note.
                </CardDescription>
              </div>
              {watchVendorId > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setGrnPickerOpen(true)}
                  className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200"
                >
                  <Download className="h-3.5 w-3.5 mr-1" /> Import from GRN ({pendingGrns.length} Available)
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Select
                  label="Vendor / Supplier *"
                  options={vendorOptions}
                  {...form.register("vendorId")}
                  error={form.formState.errors.vendorId?.message}
                />
              </div>

              <div>
                <Field
                  label="Vendor Invoice No *"
                  placeholder="e.g. INV-98421"
                  {...form.register("vendorInvoiceNo")}
                  error={form.formState.errors.vendorInvoiceNo?.message}
                />
              </div>

              <div>
                <Field
                  label="Invoice Date *"
                  type="date"
                  {...form.register("invoiceDate")}
                  error={form.formState.errors.invoiceDate?.message}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Field
                  label="Payment Terms (Days)"
                  type="number"
                  placeholder="30"
                  {...form.register("paymentTermsDays")}
                />
              </div>

              <div>
                <Field
                  label="Payment Due Date"
                  type="date"
                  {...form.register("dueDate")}
                />
              </div>

              <div>
                <Field
                  label="TDS Rate (%)"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("tdsPercent")}
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    {...form.register("isInterState")}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span>Inter-State Supply (IGST Applicable)</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items Table */}
        <Card className="shadow-xs overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted/20 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-emerald-600" /> Billed Items & 3-Way Match Verification
              </CardTitle>
              <CardDescription className="text-xs">
                Compare PO Ordered vs GRN Delivered vs Vendor Invoiced quantities.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddNewManualItem}
              className="h-8 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Custom Item
            </Button>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="px-3 py-2.5">Item Name</th>
                  <th className="px-3 py-2.5">Unit</th>
                  <th className="px-3 py-2.5 text-right">PO Qty</th>
                  <th className="px-3 py-2.5 text-right">GRN Qty</th>
                  <th className="px-3 py-2.5 text-right">Billed Qty *</th>
                  <th className="px-3 py-2.5 text-right">Unit Rate (₹) *</th>
                  <th className="px-3 py-2.5 text-right">Disc %</th>
                  <th className="px-3 py-2.5 text-right">Taxable</th>
                  <th className="px-3 py-2.5 text-right">GST %</th>
                  <th className="px-3 py-2.5 text-right">Total (₹)</th>
                  <th className="px-3 py-2.5 text-center">3-Way Check</th>
                  <th className="px-3 py-2.5 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fields.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">
                      No line items added yet. Click <strong>"Import from GRN"</strong> or <strong>"Add Custom Item"</strong>.
                    </td>
                  </tr>
                ) : (
                  fields.map((field, index) => {
                    const rowItem = watchedItems[index] || {};
                    const poQty = Number(rowItem.poOrderedQty || 0);
                    const grnQty = Number(rowItem.grnReceivedQty || 0);
                    const billedQty = Number(rowItem.billedQty || 0);
                    const isQtyMismatch = grnQty > 0 && billedQty > grnQty;
                    const isRateMismatch = Number(rowItem.poRate || 0) > 0 && Number(rowItem.unitRate || 0) > Number(rowItem.poRate || 0);

                    return (
                      <tr key={field.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-3 py-2 min-w-[180px]">
                          {rowItem.grnItemId ? (
                            <div className="font-semibold text-foreground">{rowItem.itemName}</div>
                          ) : (
                            <select
                              {...form.register(`items.${index}.itemId` as const, {
                                onChange: (e) => {
                                  const sel = itemsCatalog.find((it: any) => it.id === Number(e.target.value));
                                  if (sel) {
                                    form.setValue(`items.${index}.itemName`, sel.name);
                                    form.setValue(`items.${index}.unitId`, sel.purchaseUnitId || sel.baseUnitId || 1);
                                    form.setValue(`items.${index}.unit`, sel.unit || "unit");
                                    form.setValue(`items.${index}.unitRate`, Number(sel.rate || 0));
                                    form.setValue(`items.${index}.gstPercent`, Number(sel.gstPercent || 0));
                                    updateLineCalculations(index);
                                  }
                                },
                              })}
                              className="w-full h-8 px-2 rounded border bg-background text-xs"
                            >
                              <option value="">Select Item</option>
                              {itemsCatalog.map((it: any) => (
                                <option key={it.id} value={it.id}>
                                  {it.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>

                        <td className="px-3 py-2 w-24">
                          <span className="font-mono text-muted-foreground">{rowItem.unit || "unit"}</span>
                        </td>

                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                          {poQty > 0 ? poQty : "—"}
                        </td>

                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">
                          {grnQty > 0 ? grnQty : "—"}
                        </td>

                        <td className="px-3 py-2 text-right w-24">
                          <input
                            type="number"
                            step="0.01"
                            {...form.register(`items.${index}.billedQty` as const, {
                              onChange: () => updateLineCalculations(index),
                            })}
                            className={`w-full h-8 px-2 text-right rounded border bg-background text-xs font-mono font-bold ${
                              isQtyMismatch ? "border-rose-500 text-rose-600 bg-rose-50/20" : ""
                            }`}
                          />
                        </td>

                        <td className="px-3 py-2 text-right w-28">
                          <input
                            type="number"
                            step="0.01"
                            {...form.register(`items.${index}.unitRate` as const, {
                              onChange: () => updateLineCalculations(index),
                            })}
                            className="w-full h-8 px-2 text-right rounded border bg-background text-xs font-mono"
                          />
                        </td>

                        <td className="px-3 py-2 text-right w-20">
                          <input
                            type="number"
                            step="0.1"
                            {...form.register(`items.${index}.discountPercent` as const, {
                              onChange: () => updateLineCalculations(index),
                            })}
                            className="w-full h-8 px-2 text-right rounded border bg-background text-xs font-mono"
                          />
                        </td>

                        <td className="px-3 py-2 text-right font-mono font-medium">
                          ₹{Number(rowItem.taxableAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-3 py-2 text-right w-20">
                          <input
                            type="number"
                            step="0.1"
                            {...form.register(`items.${index}.gstPercent` as const, {
                              onChange: () => updateLineCalculations(index),
                            })}
                            className="w-full h-8 px-2 text-right rounded border bg-background text-xs font-mono"
                          />
                        </td>

                        <td className="px-3 py-2 text-right font-mono font-bold text-foreground">
                          ₹{Number(rowItem.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-3 py-2 text-center">
                          {isQtyMismatch || isRateMismatch ? (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] gap-1">
                              <AlertTriangle className="h-3 w-3" /> Variance
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1">
                              <ShieldCheck className="h-3 w-3" /> Match OK
                            </Badge>
                          )}
                        </td>

                        <td className="px-3 py-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bottom Section: Notes and Financial Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Notes & Payment Terms
            </label>
            <textarea
              rows={4}
              placeholder="Add terms, remarks, bank instructions, or vendor remarks..."
              {...form.register("remarks")}
              className="w-full p-3 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="md:col-span-5">
            <Card className="shadow-xs bg-muted/10 border-primary/20">
              <CardHeader className="py-3 px-4 border-b bg-muted/20">
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Gross Subtotal</span>
                  <span className="font-mono">₹{summary.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {summary.totalDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Discount</span>
                    <span className="font-mono">-₹{summary.totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>Taxable Amount</span>
                  <span className="font-mono">₹{summary.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {watchIsInterState ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>IGST</span>
                    <span className="font-mono">₹{summary.igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>CGST</span>
                      <span className="font-mono">₹{summary.cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>SGST</span>
                      <span className="font-mono">₹{summary.sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </>
                )}
                {summary.roundOff !== 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Round Off</span>
                    <span className="font-mono">₹{summary.roundOff.toFixed(2)}</span>
                  </div>
                )}
                {summary.tdsAmount > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>TDS Deducted ({watchTdsPercent}%)</span>
                    <span className="font-mono">-₹{summary.tdsAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold pt-2 border-t text-primary">
                  <span>Net Payable Amount</span>
                  <span className="font-mono">₹{summary.netAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/inventory/purchase-invoices" as any })}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={createMutation.isPending}
            onClick={form.handleSubmit((values) => onSubmit(values, false))}
          >
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save as Draft
          </Button>

          <Button
            type="button"
            disabled={createMutation.isPending}
            onClick={form.handleSubmit((values) => onSubmit(values, true))}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <ShieldCheck className="h-4 w-4 mr-1" />
            )}
            Save & Verify (3-Way Match)
          </Button>
        </div>
      </form>

      {/* GRN Picker Dialog */}
      <Dialog open={grnPickerOpen} onOpenChange={setGrnPickerOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-600" /> Select Unbilled Goods Receipt Note (GRN)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select an approved delivery to prefill line items, quantities, and rates for 3-way matching.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto py-2">
            {loadingGrns ? (
              <div className="py-8 text-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                Loading unbilled GRNs...
              </div>
            ) : pendingGrns.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                No unbilled or pending GRNs found for this vendor.
              </div>
            ) : (
              pendingGrns.map((grn: any) => (
                <div
                  key={grn.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <div className="font-bold text-sm text-foreground flex items-center gap-2">
                      <span>GRN: {grn.grnNo || "#" + grn.id}</span>
                      {grn.poNo && <Badge variant="outline" className="text-[10px]">PO: {grn.poNo}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Received: {grn.receivedDate || "—"} | Items: {grn.items?.length || 0}
                    </div>
                  </div>

                  <Button size="sm" onClick={() => handleImportGrn(grn)} className="text-xs">
                    Import Items
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
