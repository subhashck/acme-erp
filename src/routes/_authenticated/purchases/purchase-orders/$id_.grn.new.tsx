import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "../../../../components/ModuleLayout";
import { useRpcQuery, queryClient } from "../../../../lib/query";
import { client } from "../../../../services/rpc";
import { useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ChevronLeft,
  Loader2,
  Save,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Send,
} from "lucide-react";
import { Button } from "../../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../../ui/card";
import { Label } from "../../../../ui/label";
import { Input } from "../../../../ui/input";
import { Autocomplete } from "../../../../ui/autocomplete";
import { Field } from "../../../../components/Field";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";
import { Calendar } from "../../../../components/ui/calendar";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "../../../../utils/cn";
import { toNum } from "../../../../utils/math";
import React, { useCallback } from "react";

// Schema for GRN creation validation in frontend
const grnItemFormSchema = z.object({
  poItemId: z.number().int().positive().optional().nullable(),
  itemId: z.number().int().positive().optional().nullable(),
  itemName: z.string(),
  unit: z.string().optional().nullable(),
  orderedQty: z.number(),
  alreadyReceivedQty: z.number(),
  receivedQty: z.coerce.number().min(0, "Must be >= 0"),
  freeQty: z.coerce.number().min(0, "Must be >= 0").default(0),
  unitRate: z.coerce.number().min(0, "Must be >= 0"),
  salePrice: z.coerce.number().min(0, "Must be >= 0").default(0),
  gstPercent: z.coerce.number().min(0, "Must be >= 0").default(0),
  batch: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.receivedQty > 0) {
    if (!data.batch || data.batch.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Batch No is required",
        path: ["batch"],
      });
    }
    if (!data.expiryDate || data.expiryDate.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Expiry Date is required",
        path: ["expiryDate"],
      });
    }
  }
});

const grnFormSchema = z.object({
  vendorId: z.coerce.number().positive("Vendor is required").optional().nullable(),
  storeId: z.coerce.number().positive("Receiving store is required").optional().nullable(),
  grnNo: z.string().optional().nullable(),
  grnDate: z.string().min(1, "GRN Date is required"),
  dateOfDelivery: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  items: z.array(grnItemFormSchema).min(1, "At least one item is required"),
});

type GRNFormValues = z.infer<typeof grnFormSchema>;

export const Route = createFileRoute("/_authenticated/purchases/purchase-orders/$id_/grn/new")({
  component: NewGRNRoute,
});

function NewGRNRoute() {
  const { id } = Route.useParams();

  // Fetch PO detail to populate fields
  const { data: po, isLoading, error } = useRpcQuery<any>(
    ["purchase-orders", id],
    () => client["purchase-orders"][":id"].$get({ param: { id } })
  );

  if (isLoading) {
    return (
      <ModuleLayout title="Receive Goods" description="Loading purchase order details...">
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (error || !po) {
    return (
      <ModuleLayout title="Receive Goods" description="Error loading purchase order.">
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

  // Pre-generate GRN date (today)
  const defaultGrnDate = format(new Date(), "yyyy-MM-dd");

  return (
    <ModuleLayout
      title={`Receive Goods against PO: ${po.poNo}`}
      description="Create a Goods Receipt Note (GRN) to record items received."
      action={
        <Link to="/purchases/purchase-orders/$id" params={{ id }}>
          <Button variant="outline">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Detail
          </Button>
        </Link>
      }
    >
      <div className="max-w-6xl mx-auto py-6">
        <GRNForm po={po} defaultGrnDate={defaultGrnDate} poId={parseInt(id, 10)} />
      </div>
    </ModuleLayout>
  );
}

interface GRNFormProps {
  po: any;
  defaultGrnDate: string;
  poId: number;
}

function GRNForm({ po, defaultGrnDate, poId }: GRNFormProps) {
  const navigate = useNavigate();

  // Fetch items catalog
  const { data: itemsCatalog = [] } = useRpcQuery<any[]>(
    ["items"],
    () => client.items.$get()
  );

  // Fetch registered vendors
  const { data: vendors = [] } = useRpcQuery<any[]>(
    ["vendors"],
    () => client.vendors.$get()
  );

  // Fetch inventory stores
  const { data: storesList = [] } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  const vendorOptions = React.useMemo(() => {
    return (vendors as any[])
      .filter((v: any) => v.active !== false)
      .map((v: any) => [String(v.id), `${v.name}${v.code ? ` (${v.code})` : ""}`] as [string, string]);
  }, [vendors]);

  const isVendorTbd =
    !po?.vendorId ||
    !po?.vendorName ||
    po.vendorName.trim().toUpperCase() === "TBD" ||
    po.vendorName.trim().toUpperCase() === "TO BE DECIDED";

  // Fetch registered unit types
  const { data: unitTypes = [] } = useRpcQuery<any[]>(
    ["unit-types"],
    () => client["unit-types"].$get()
  );

  // Fetch unit conversions
  const { data: unitConversions = [] } = useRpcQuery<any[]>(
    ["unit-conversions"],
    () => client["unit-conversions"].$get()
  );

  const getConversionFactor = useCallback(
    (fromSymbol: string, toSymbol: string) => {
      if (!fromSymbol || !toSymbol) return 0;
      if (fromSymbol === toSymbol) return 1;
      const fromU = (unitTypes as any[]).find((u) => u.symbol === fromSymbol || u.name === fromSymbol);
      const toU = (unitTypes as any[]).find((u) => u.symbol === toSymbol || u.name === toSymbol);
      if (!fromU || !toU || !(unitConversions as any[]) || (unitConversions as any[]).length === 0) return 0;

      const fId = Number(fromU.id);
      const tId = Number(toU.id);

      const direct = (unitConversions as any[]).find(
        (c: any) => Number(c.fromUnitId) === fId && Number(c.toUnitId) === tId
      );
      if (direct && Number(direct.multiplier) > 0) return Number(direct.multiplier);

      const inverse = (unitConversions as any[]).find(
        (c: any) => Number(c.fromUnitId) === tId && Number(c.toUnitId) === fId
      );
      if (inverse && Number(inverse.multiplier) > 0) return 1 / Number(inverse.multiplier);

      return 0;
    },
    [unitTypes, unitConversions]
  );

  // Setup form values
  const form = useForm<GRNFormValues>({
    // @ts-ignore
    resolver: zodResolver(grnFormSchema),
    defaultValues: {
      vendorId: po?.vendorId || null,
      storeId: storesList.find((s: any) => s.isDefault)?.id || storesList[0]?.id || null,
      grnNo: "",
      grnDate: defaultGrnDate,
      dateOfDelivery: defaultGrnDate,
      remarks: "",
      items: po.items.map((item: any) => {
        const ordered = toNum(item.orderedQty);
        const alreadyReceived = toNum(item.receivedQty);
        const pending = Math.max(0, ordered - alreadyReceived);
        const catItem = itemsCatalog.find((it: any) => it.name === item.itemName || it.id === item.itemId);

        return {
          poItemId: item.id,
          itemId: item.itemId || catItem?.id || null,
          itemName: item.itemName,
          unit: item.unit || catItem?.purchaseUnit || catItem?.unit || "",
          orderedQty: ordered,
          alreadyReceivedQty: alreadyReceived,
          receivedQty: pending,
          freeQty: 0,
          unitRate: toNum(item.unitRate) || (catItem ? toNum(catItem.rate) : 0),
          salePrice: catItem ? toNum(catItem.salePrice) : 0,
          gstPercent: toNum(item.gstPercent) || (catItem ? toNum(catItem.gstPercent) : 0),
          batch: "",
          expiryDate: "",
          notes: "",
        };
      }),
    },
  });

  React.useEffect(() => {
    if (storesList.length > 0 && !form.getValues("storeId")) {
      const def = storesList.find((s: any) => s.isDefault)?.id || storesList[0]?.id;
      if (def) {
        form.setValue("storeId", def);
      }
    }
  }, [storesList, form]);

  const { fields, append, insert, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = useWatch({ control: form.control, name: "items" }) || [];

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await (client["purchase-orders"][":id"].grns as any).$post({
        param: { id: String(poId) },
        json: data,
      });
      if (!res.ok) {
        const errorData = await (res.json() as Promise<any>).catch(() => ({}));
        throw new Error(errorData.error || "Failed to record GRN");
      }
      return res.json();
    },
    onSuccess: async () => {
      toast.success("Goods Receipt Note (GRN) recorded successfully");
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      navigate({ to: "/purchases/purchase-orders/$id", params: { id: String(poId) } });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record GRN");
    },
  });

  const onSubmit = (values: GRNFormValues, targetStatus: string = "draft") => {
    if (targetStatus === "posted") {
      if (!values.storeId) {
        toast.error("Please select a receiving store before posting GRN.");
        return;
      }
      const confirmedPost = window.confirm(
        "Are you sure you want to POST this GRN? This action will update inventory stock and cannot be undone directly."
      );
      if (!confirmedPost) return;
    }

    // Group received quantities by poItemId to check tolerance across multiple batches
    const receivedSumByPoItem: Record<number, number> = {};
    for (const item of values.items) {
      if (item.poItemId) {
        receivedSumByPoItem[item.poItemId] = (receivedSumByPoItem[item.poItemId] || 0) + toNum(item.receivedQty);
      }
    }

    let needsConfirmation = false;
    let overToleranceItem = "";

    for (const item of values.items) {
      if (!item.poItemId) continue;
      const totalRcvd = item.alreadyReceivedQty + (receivedSumByPoItem[item.poItemId] || 0);
      const limit = item.orderedQty * 1.10; // 10% tolerance

      if (totalRcvd > limit) {
        overToleranceItem = item.itemName;
        break;
      }

      if (totalRcvd > item.orderedQty) {
        needsConfirmation = true;
      }
    }

    if (overToleranceItem) {
      toast.error(`Cannot receive quantity exceeding ordered qty by more than 10% for item: "${overToleranceItem}"`);
      return;
    }

    if (needsConfirmation) {
      const confirmed = window.confirm(
        "Receiving quantity exceeds the ordered quantity for some items. Do you wish to override and proceed?"
      );
      if (!confirmed) {
        return;
      }
    }

    // Prepare payload matching server's Zod schema (grnInput)
    const payload = {
      vendorId: values.vendorId || po.vendorId || null,
      storeId: values.storeId || null,
      grnNo: values.grnNo || null,
      grnDate: values.grnDate,
      dateOfDelivery: values.dateOfDelivery || null,
      remarks: values.remarks || null,
      status: targetStatus,
      items: values.items.map(item => ({
        poItemId: item.poItemId || null,
        itemId: item.itemId || null,
        itemName: item.itemName,
        unit: item.unit || null,
        receivedQty: toNum(item.receivedQty),
        freeQty: toNum(item.freeQty),
        unitRate: toNum(item.unitRate),
        salePrice: toNum(item.salePrice),
        gstPercent: toNum(item.gstPercent),
        batch: item.batch || null,
        expiryDate: item.expiryDate || null,
        notes: item.notes || null,
      })),
    };

    mutation.mutate(payload);
  };

  const handleAddBatchRow = (targetItem: any, index: number) => {
    insert(index + 1, {
      poItemId: targetItem.poItemId,
      itemId: targetItem.itemId,
      itemName: targetItem.itemName,
      unit: targetItem.unit || "",
      orderedQty: targetItem.orderedQty,
      alreadyReceivedQty: targetItem.alreadyReceivedQty,
      receivedQty: 0,
      freeQty: 0,
      unitRate: targetItem.unitRate,
      salePrice: targetItem.salePrice,
      gstPercent: targetItem.gstPercent,
      batch: "",
      expiryDate: "",
      notes: "",
    });
    toast.info(`Added extra batch row for "${targetItem.itemName}"`);
  };

  const onFormError = (errors: any) => {
    console.error("PO GRN validation errors:", errors);
    const messages: string[] = [];

    if (errors.grnDate?.message) messages.push(`GRN Date: ${errors.grnDate.message}`);
    if (errors.remarks?.message) messages.push(`Remarks: ${errors.remarks.message}`);
    if (errors.items?.message || errors.items?.root?.message) {
      messages.push(`Items: ${errors.items?.message || errors.items?.root?.message}`);
    }

    if (Array.isArray(errors.items)) {
      errors.items.forEach((itemErr: any, idx: number) => {
        if (!itemErr) return;
        Object.keys(itemErr).forEach((key) => {
          if (itemErr[key]?.message) {
            messages.push(`Item #${idx + 1} (${key}): ${itemErr[key].message}`);
          }
        });
      });
    }

    if (messages.length > 0) {
      toast.error(
        <div>
          <div className="font-semibold mb-1">Please fix validation errors:</div>
          <ul className="list-disc pl-4 text-xs space-y-0.5">
            {messages.slice(0, 5).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>,
        { duration: 5000 }
      );
    } else {
      toast.error("Form contains validation errors. Please check highlighted fields.");
    }
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      {/* Validation Error Banner */}
      {Object.keys(form.formState.errors).length > 0 && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-xs space-y-1">
          <div className="font-semibold text-sm mb-1">Form Validation Errors</div>
          <ul className="list-disc pl-5 space-y-0.5">
            {form.formState.errors.vendorId && <li>Vendor: {String(form.formState.errors.vendorId.message)}</li>}
            {form.formState.errors.grnDate && <li>GRN Date: {String(form.formState.errors.grnDate.message)}</li>}
            {form.formState.errors.items?.message && <li>Items: {String(form.formState.errors.items.message)}</li>}
            {Array.isArray(form.formState.errors.items) &&
              form.formState.errors.items.map((itemErr: any, idx: number) => {
                if (!itemErr) return null;
                return Object.keys(itemErr).map((key) => (
                  <li key={`${idx}-${key}`}>
                    Item #{idx + 1} ({key}): {String(itemErr[key]?.message)}
                  </li>
                ));
              })}
          </ul>
        </div>
      )}

      {/* Header Fields */}
      <Card>
        <CardHeader>
          <CardTitle>GRN Header Details</CardTitle>
          <CardDescription>Enter receipt details below.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Vendor */}
          <div className="flex flex-col space-y-1.5">
            <Label>Vendor {isVendorTbd && <span className="text-destructive">*</span>}</Label>
            {isVendorTbd ? (
              <Controller
                control={form.control}
                name="vendorId"
                rules={{ required: "Vendor is required when PO vendor is TBD" }}
                render={({ field, fieldState }) => (
                  <Autocomplete
                    label=""
                    placeholder="Search & select vendor..."
                    options={vendorOptions}
                    value={field.value ? String(field.value) : ""}
                    onChange={(val) => field.onChange(val ? Number(val) : null)}
                    error={fieldState.error?.message}
                  />
                )}
              />
            ) : (
              <Input
                value={po.vendorName || (po.vendorId ? `Vendor #${po.vendorId}` : "N/A")}
                readOnly
                disabled
                className="bg-muted text-muted-foreground cursor-not-allowed h-9 text-xs"
              />
            )}
          </div>

          {/* Receiving Store */}
          <div className="flex flex-col space-y-1.5">
            <Label>Receiving Store <span className="text-destructive">*</span></Label>
            <Controller
              control={form.control}
              name="storeId"
              render={({ field, fieldState }) => (
                <select
                  value={field.value ? String(field.value) : ""}
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">-- Select Receiving Store --</option>
                  {storesList.filter((s: any) => s.active !== false).map((store: any) => (
                    <option key={store.id} value={String(store.id)}>
                      {store.name} ({store.code}) {store.isDefault ? "[Default]" : ""}
                    </option>
                  ))}
                </select>
              )}
            />
            {form.formState.errors.storeId && (
              <span className="text-[0.8rem] font-medium text-destructive">
                {form.formState.errors.storeId.message}
              </span>
            )}
          </div>

          {/* GRN No */}
          <Field
            label="GRN Number"
            placeholder="Leave blank to auto-generate"
            {...form.register("grnNo")}
            error={form.formState.errors.grnNo?.message}
          />

          {/* GRN Date */}
          <div className="flex flex-col space-y-1.5">
            <Label>GRN Date <span className="text-destructive">*</span></Label>
            <Controller
              control={form.control}
              name="grnDate"
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
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick GRN date</span>}
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

          {/* Date of Delivery */}
          <div className="flex flex-col space-y-1.5">
            <Label>Delivery Date</Label>
            <Controller
              control={form.control}
              name="dateOfDelivery"
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
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick delivery date</span>}
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

          {/* Remarks */}
          <div className="md:col-span-3">
            <Field
              label="Remarks / Delivery Notes"
              placeholder="e.g. received in good condition, missing item note, invoice references..."
              {...form.register("remarks")}
              error={form.formState.errors.remarks?.message}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items Grid */}
      <Card>
        <CardHeader>
          <CardTitle>PO Items & Batch Receipts</CardTitle>
          <CardDescription>
            Record quantities received per batch. Click &quot;+ Batch&quot; to add multiple batches with custom prices for the same item.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/40">
                <tr>
                  <th className="px-3 py-3 min-w-45">Item Name</th>
                  <th className="px-3 py-3 text-right">Pending</th>
                  <th className="px-3 py-3 min-w-24">Unit</th>
                  <th className="px-3 py-3 min-w-27.5">Batch No *</th>
                  <th className="px-3 py-3 min-w-32.5">Expiry Date *</th>
                  <th className="px-3 py-3 min-w-22.5 text-right">Recv Qty *</th>
                  <th className="px-3 py-3 min-w-20 text-right">Free Qty</th>
                  <th className="px-3 py-3 min-w-25 text-right">Cost Rate (₹)</th>
                  <th className="px-3 py-3 min-w-25 text-right">Sale Price (₹)</th>
                  <th className="px-3 py-3 min-w-20 text-right">GST %</th>
                  <th className="px-3 py-3 min-w-25 text-right">Net Value</th>
                  <th className="px-3 py-3 text-center min-w-20">Action</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field: any, index: number) => {
                  const ordered = toNum(field.orderedQty);
                  const alreadyReceived = toNum(field.alreadyReceivedQty);
                  const initialPending = Math.max(0, ordered - alreadyReceived);
                  const poItemId = watchedItems[index]?.poItemId || field.poItemId;
                  const currentReceivingForThisPoItem = poItemId
                    ? watchedItems
                        .filter((it: any) => it?.poItemId === poItemId)
                        .reduce((sum: number, it: any) => sum + toNum(it?.receivedQty) + toNum(it?.freeQty), 0)
                    : toNum(watchedItems[index]?.receivedQty) + toNum(watchedItems[index]?.freeQty);

                  const remainingPending = Math.max(0, initialPending - currentReceivingForThisPoItem);
                  const rcvQty = toNum(watchedItems[index]?.receivedQty);
                  const rate = toNum(watchedItems[index]?.unitRate);
                  const gst = toNum(watchedItems[index]?.gstPercent);
                  const lineNetVal = rcvQty * rate * (1 + gst / 100);

                  return (
                    <tr key={field.id} className="border-b last:border-0 hover:bg-muted/10">
                      {/* Name & Batch Action */}
                      <td className="px-3 py-3 font-medium align-top">
                        <div className="flex items-center justify-between gap-1">
                          <span>{field.itemName}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-6 px-1.5 text-[10px] text-primary hover:bg-primary/10 shrink-0"
                            onClick={() => handleAddBatchRow(watchedItems[index] || field, index)}
                            title="Add another batch for this item"
                          >
                            <Plus className="h-3 w-3 mr-0.5" /> Batch
                          </Button>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-normal mt-0.5">
                          Ordered: {ordered} | Rcvd: {alreadyReceived}
                        </div>
                      </td>

                      {/* Pending */}
                      <td className="px-3 py-3 text-right text-amber-600 font-semibold align-top pt-4">
                        {remainingPending}
                      </td>

                      {/* Unit */}
                      <td className="px-3 py-3 align-top">
                        <select
                          className="flex h-9 w-full rounded-md border bg-background px-2 py-1 text-xs outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                          value={watchedItems[index]?.unit || ""}
                          onChange={(e) => {
                            const newUnit = e.target.value;
                            form.setValue(`items.${index}.unit` as const, newUnit);
                            const poItemId = watchedItems[index]?.poItemId || field.poItemId;
                            const poItem = po.items?.find((pi: any) => pi.id === poItemId);
                            const itemName = watchedItems[index]?.itemName || poItem?.itemName;
                            const catItem = itemsCatalog.find((it: any) => it.name === itemName || it.id === poItem?.itemId);

                            const baseUnit = poItem?.unit || catItem?.purchaseUnit || catItem?.unit || "";
                            const baseRate = toNum(poItem?.unitRate) || toNum(catItem?.rate) || 0;
                            const baseSalePrice = catItem ? toNum(catItem.salePrice) : 0;

                            const tier = catItem?.unitPrices?.find((up: any) => up.unit === newUnit);
                            if (tier && (Number(tier.costPrice) > 0 || Number(tier.salePrice) > 0)) {
                              form.setValue(`items.${index}.unitRate` as const, Number(tier.costPrice || 0));
                              form.setValue(`items.${index}.salePrice` as const, Number(tier.salePrice || 0));
                            } else if (newUnit && baseUnit && newUnit === baseUnit) {
                              form.setValue(`items.${index}.unitRate` as const, baseRate);
                              form.setValue(`items.${index}.salePrice` as const, baseSalePrice);
                            } else {
                              const factor = getConversionFactor(newUnit, baseUnit);
                              if (factor > 0) {
                                form.setValue(`items.${index}.unitRate` as const, Number((baseRate * factor).toFixed(2)));
                                form.setValue(`items.${index}.salePrice` as const, Number((baseSalePrice * factor).toFixed(2)));
                              } else {
                                form.setValue(`items.${index}.unitRate` as const, 0);
                                form.setValue(`items.${index}.salePrice` as const, 0);
                              }
                            }
                          }}
                        >
                          {(() => {
                            const poItemId = watchedItems[index]?.poItemId || field.poItemId;
                            const poItem = po.items?.find((pi: any) => pi.id === poItemId);
                            const itemName = watchedItems[index]?.itemName || poItem?.itemName;
                            const catItem = itemsCatalog.find((it: any) => it.name === itemName || it.id === poItem?.itemId);

                            const currentUnit = watchedItems[index]?.unit;
                            const unitsSet = new Set<string>();
                            if (currentUnit) unitsSet.add(currentUnit);
                            if (poItem?.unit) unitsSet.add(poItem.unit);
                            if (catItem?.unit) unitsSet.add(catItem.unit);
                            if (catItem?.purchaseUnit) unitsSet.add(catItem.purchaseUnit);
                            if (catItem?.saleUnit) unitsSet.add(catItem.saleUnit);
                            if (catItem?.unitPrices && Array.isArray(catItem.unitPrices)) {
                              catItem.unitPrices.forEach((up: any) => { if (up.unit) unitsSet.add(up.unit); });
                            }
                            (unitTypes as any[]).forEach((ut: any) => {
                              const u = ut.symbol || ut.name;
                              if (u) unitsSet.add(u);
                            });
                            const opts = Array.from(unitsSet);
                            if (opts.length === 0) return <option value="">Unit</option>;
                            return opts.map((u) => <option key={u} value={u}>{u}</option>);
                          })()}
                        </select>
                      </td>

                      {/* Batch */}
                      <td className="px-3 py-3 align-top">
                        <Field
                          placeholder="Batch no"
                          className="w-full text-xs h-9"
                          {...form.register(`items.${index}.batch` as const)}
                          error={form.formState.errors.items?.[index]?.batch?.message}
                        />
                      </td>

                      {/* Expiry Date */}
                      <td className="px-3 py-3 align-top">
                        <Controller
                          control={form.control}
                          name={`items.${index}.expiryDate` as const}
                          render={({ field: expField, fieldState }) => (
                            <div className="flex flex-col space-y-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal bg-background px-2 h-9 text-xs",
                                      !expField.value && "text-muted-foreground",
                                      fieldState.error && "border-destructive"
                                    )}
                                  >
                                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    {expField.value ? format(new Date(expField.value), "yyyy-MM-dd") : <span>Date</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    captionLayout="dropdown"
                                    startMonth={new Date(new Date().getFullYear() - 2, 0)}
                                    endMonth={new Date(new Date().getFullYear() + 10, 11)}
                                    selected={expField.value ? new Date(expField.value) : undefined}
                                    onSelect={(date) => expField.onChange(date ? format(date, "yyyy-MM-dd") : null)}
                                  />
                                </PopoverContent>
                              </Popover>
                              {fieldState.error && <span className="text-xs text-destructive">{fieldState.error.message}</span>}
                            </div>
                          )}
                        />
                      </td>

                      {/* Receiving Now */}
                      <td className="px-3 py-3 align-top">
                        <Field
                          type="number"
                          step="0.01"
                          className="w-full text-right text-xs h-9"
                          {...form.register(`items.${index}.receivedQty` as const)}
                          error={form.formState.errors.items?.[index]?.receivedQty?.message}
                        />
                      </td>

                      {/* Free Qty */}
                      <td className="px-3 py-3 align-top">
                        <Field
                          type="number"
                          step="0.01"
                          className="w-full text-right text-xs h-9"
                          {...form.register(`items.${index}.freeQty` as const)}
                          error={form.formState.errors.items?.[index]?.freeQty?.message}
                        />
                      </td>

                      {/* Cost Rate */}
                      <td className="px-3 py-3 align-top">
                        <Field
                          type="number"
                          step="0.01"
                          className="w-full text-right text-xs h-9"
                          {...form.register(`items.${index}.unitRate` as const)}
                          error={form.formState.errors.items?.[index]?.unitRate?.message}
                        />
                      </td>

                      {/* Sale Price */}
                      <td className="px-3 py-3 align-top">
                        <Field
                          type="number"
                          step="0.01"
                          className="w-full text-right text-xs h-9"
                          {...form.register(`items.${index}.salePrice` as const)}
                          error={form.formState.errors.items?.[index]?.salePrice?.message}
                        />
                      </td>

                      {/* GST % */}
                      <td className="px-3 py-3 align-top">
                        <Field
                          type="number"
                          step="0.01"
                          className="w-full text-right text-xs h-9"
                          {...form.register(`items.${index}.gstPercent` as const)}
                          error={form.formState.errors.items?.[index]?.gstPercent?.message}
                        />
                      </td>

                      {/* Net Value */}
                      <td className="px-3 py-3 text-right font-medium align-top pt-4 text-xs">
                        ₹{lineNetVal.toFixed(2)}
                      </td>

                      {/* Action */}
                      <td className="px-3 py-3 text-center align-top pt-3">
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => remove(index)}
                            title="Remove row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Form Submission Actions */}
      <div className="flex justify-end gap-4">
        <Link to="/purchases/purchase-orders/$id" params={{ id: String(poId) }}>
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </Link>
        <Button
          type="button"
          variant="outline"
          disabled={mutation.isPending}
          onClick={form.handleSubmit(
            (values) => onSubmit(values as unknown as GRNFormValues, "draft"),
            onFormError
          )}
        >
          <Save className="h-4 w-4 mr-2" /> Save Draft
        </Button>
        <Button
          type="button"
          disabled={mutation.isPending}
          onClick={form.handleSubmit(
            (values) => onSubmit(values as unknown as GRNFormValues, "posted"),
            onFormError
          )}
        >
          <Send className="h-4 w-4 mr-2" /> Save &amp; Post GRN
        </Button>
      </div>
    </form>
  );
}
