import * as React from "react";
import { useCallback, useMemo, useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRpcQuery, queryClient } from "@/lib/query";
import { client } from "@/services/rpc";
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
  Minus,
  Trash2,
  PackageCheck,
  Layers,
  Sparkles,
  Info,
  CalendarCheck,
  Building2,
  Edit,
  PackagePlus,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Label } from "@/ui/label";
import { Input } from "@/ui/input";
import { Autocomplete } from "@/ui/autocomplete";
import { Field } from "@/components/Field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/ui/badge";
import { AddItemDialog } from "@/components/AddItemForm";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/utils/cn";
import { toNum } from "@/utils/math";

const EMPTY_ARRAY: any[] = [];

// Schema for GRN creation/editing validation
const grnItemFormSchema = z.object({
  id: z.number().optional(),
  poItemId: z.number().int().positive().optional().nullable(),
  itemId: z.number().int().positive().optional().nullable(),
  itemName: z.string().min(1, "Item name is required"),
  unit: z.string().optional().nullable(),
  saleUnit: z.string().optional().nullable(),
  orderedQty: z.number().default(0),
  alreadyReceivedQty: z.number().default(0),
  receivedQty: z.coerce.number().min(0, "Must be >= 0"),
  freeQty: z.coerce.number().min(0, "Must be >= 0").default(0),
  unitRate: z.coerce.number().min(0, "Must be >= 0"),
  discountPercent: z.coerce.number().min(0, "Must be >= 0").max(100, "Max 100%").default(0),
  discountAmount: z.coerce.number().min(0).default(0).optional(),
  taxableAmount: z.coerce.number().min(0).optional(),
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
  noPoReason: z.string().optional().nullable(),
  grnNo: z.string().optional().nullable(),
  grnDate: z.string().min(1, "GRN Date is required"),
  dateOfDelivery: z.string().optional().nullable(),
  billDiscountAmount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
  remarks: z.string().optional().nullable(),
  items: z.array(grnItemFormSchema).min(1, "At least one item is required"),
});

export type GRNFormValues = z.infer<typeof grnFormSchema>;

export interface GRNFormProps {
  mode: "new" | "edit" | "view";
  poId?: number;
  po?: any;
  grnId?: number;
  initialData?: any;
  defaultGrnDate?: string;
  onSuccess?: () => void;
}

export function GRNForm({
  mode,
  poId,
  po,
  grnId,
  initialData,
  defaultGrnDate = format(new Date(), "yyyy-MM-dd"),
  onSuccess,
}: GRNFormProps) {
  const navigate = useNavigate();
  const isPosted = initialData?.status === "posted";
  const isView = mode === "view" || isPosted;
  const isEdit = mode === "edit" && !isPosted;
  const isNew = mode === "new";
  const isDirect = !po && !poId && !initialData?.poId;

  // Add Item Dialog state for catalog insertion
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [newItemInitialName, setNewItemInitialName] = useState("");

  // Fetch items catalog
  const { data: itemsCatalog = EMPTY_ARRAY } = useRpcQuery<any[]>(
    ["items"],
    () => client.items.$get()
  );

  // Fetch registered vendors
  const { data: vendors = EMPTY_ARRAY } = useRpcQuery<any[]>(
    ["vendors"],
    () => client.vendors.$get()
  );

  // Fetch inventory stores
  const { data: storesList = EMPTY_ARRAY } = useRpcQuery<any[]>(
    ["inventory-stores"],
    () => client.inventory.stores.$get()
  );

  // Fetch registered unit types
  const { data: unitTypes = EMPTY_ARRAY } = useRpcQuery<any[]>(
    ["unit-types"],
    () => client["unit-types"].$get()
  );

  // Fetch unit conversions
  const { data: unitConversions = EMPTY_ARRAY } = useRpcQuery<any[]>(
    ["unit-conversions"],
    () => client["unit-conversions"].$get()
  );

  const vendorOptions = useMemo(() => {
    return (vendors as any[])
      .filter((v: any) => v.active !== false)
      .map((v: any) => [String(v.id), `${v.name}${v.code ? ` (${v.code})` : ""}`] as [string, string]);
  }, [vendors]);

  const itemOptions = useMemo(() => {
    return (itemsCatalog as any[]).map((it: any) => [it.name, it.name] as [string, string]);
  }, [itemsCatalog]);

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

  // Prepare initial items based on mode
  const initialItems = useMemo(() => {
    if (initialData?.items && initialData.items.length > 0) {
      return initialData.items.map((item: any) => {
        const catItem = itemsCatalog.find((it: any) => it.name === item.itemName || it.id === item.itemId);
        const poItem = po?.items?.find((pi: any) => pi.id === item.poItemId);
        return {
          id: item.id,
          poItemId: item.poItemId || null,
          itemId: item.itemId || catItem?.id || null,
          itemName: item.itemName || catItem?.name || "",
          unit: item.unit || catItem?.purchaseUnit || catItem?.unit || "",
          saleUnit: item.saleUnit || catItem?.saleUnit || item.unit || catItem?.purchaseUnit || catItem?.unit || "",
          orderedQty: toNum(poItem?.orderedQty ?? item.orderedQty ?? 0),
          alreadyReceivedQty: toNum(poItem?.receivedQty ?? item.alreadyReceivedQty ?? 0),
          receivedQty: toNum(item.receivedQty),
          freeQty: toNum(item.freeQty),
          unitRate: toNum(item.unitRate) || (catItem ? toNum(catItem.rate) : 0),
          discountPercent: toNum(item.discountPercent ?? 0),
          discountAmount: toNum(item.discountAmount ?? 0),
          taxableAmount: toNum(item.taxableAmount ?? 0),
          salePrice: toNum(item.salePrice) || (catItem ? toNum(catItem.salePrice) : 0),
          gstPercent: toNum(item.gstPercent) || (catItem ? toNum(catItem.gstPercent) : 0),
          batch: item.batch || "",
          expiryDate: item.expiryDate || "",
          notes: item.notes || "",
        };
      });
    }

    if (po?.items && po.items.length > 0) {
      return po.items.map((item: any) => {
        const ordered = toNum(item.orderedQty);
        const alreadyReceived = toNum(item.receivedQty);
        const pending = Math.max(0, ordered - alreadyReceived);
        const catItem = itemsCatalog.find((it: any) => it.name === item.itemName || it.id === item.itemId);

        return {
          poItemId: item.id,
          itemId: item.itemId || catItem?.id || null,
          itemName: item.itemName,
          unit: item.unit || catItem?.purchaseUnit || catItem?.unit || "",
          saleUnit: catItem?.saleUnit || item.unit || catItem?.purchaseUnit || catItem?.unit || "",
          orderedQty: ordered,
          alreadyReceivedQty: alreadyReceived,
          receivedQty: pending,
          freeQty: 0,
          unitRate: toNum(item.unitRate) || (catItem ? toNum(catItem.rate) : 0),
          discountPercent: 0,
          discountAmount: 0,
          taxableAmount: 0,
          salePrice: catItem ? toNum(catItem.salePrice) : 0,
          gstPercent: toNum(item.gstPercent) || (catItem ? toNum(catItem.gstPercent) : 0),
          batch: "",
          expiryDate: "",
          notes: "",
        };
      });
    }

    return [];
  }, [po, initialData, itemsCatalog]);

  const form = useForm<GRNFormValues>({
    // @ts-ignore
    resolver: zodResolver(grnFormSchema),
    defaultValues: {
      vendorId: initialData?.vendorId || po?.vendorId || null,
      storeId: initialData?.storeId || storesList.find((s: any) => s.isDefault)?.id || storesList[0]?.id || null,
      noPoReason: initialData?.noPoReason || "",
      grnNo: initialData?.grnNo || "",
      grnDate: initialData?.grnDate || defaultGrnDate,
      dateOfDelivery: initialData?.dateOfDelivery || defaultGrnDate,
      billDiscountAmount: toNum(initialData?.discountAmount || initialData?.billDiscountAmount || 0),
      remarks: initialData?.remarks || "",
      items: initialItems,
    },
  });

  // Track sync key to only reset form when underlying data identity changes (prevents infinite re-render loop)
  const prevSyncKeyRef = React.useRef<string | null>(null);

  useEffect(() => {
    const syncKey = initialData?.id
      ? `grn-${initialData.id}-${initialData.items?.length || 0}`
      : po?.id
        ? `po-${po.id}-${po.items?.length || 0}`
        : null;

    if (syncKey && syncKey !== prevSyncKeyRef.current && initialItems.length > 0) {
      prevSyncKeyRef.current = syncKey;
      form.reset({
        vendorId: initialData?.vendorId || po?.vendorId || null,
        storeId: initialData?.storeId || storesList.find((s: any) => s.isDefault)?.id || storesList[0]?.id || null,
        noPoReason: initialData?.noPoReason || "",
        grnNo: initialData?.grnNo || "",
        grnDate: initialData?.grnDate || defaultGrnDate,
        dateOfDelivery: initialData?.dateOfDelivery || defaultGrnDate,
        billDiscountAmount: toNum(initialData?.discountAmount || initialData?.billDiscountAmount || 0),
        remarks: initialData?.remarks || "",
        items: initialItems,
      });
    }
  }, [initialData, po, initialItems, storesList, defaultGrnDate, form]);

  useEffect(() => {
    if (storesList.length > 0 && !form.getValues("storeId")) {
      const def = storesList.find((s: any) => s.isDefault)?.id || storesList[0]?.id;
      if (def) {
        form.setValue("storeId", def, { shouldDirty: false });
      }
    }
  }, [storesList, form]);

  const [isInterState, setIsInterState] = useState(false);

  const { fields, insert, remove, append } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = useWatch({ control: form.control, name: "items" }) || [];
  const watchBillDiscount = Number(useWatch({ control: form.control, name: "billDiscountAmount" }) || 0);

  // Live financial & quantity calculations matching purchase invoices calculation engine
  const summary = useMemo(() => {
    let sub = 0;
    let lineDiscountsSum = 0;
    let rawTaxableSum = 0;
    let rawCgst = 0;
    let rawSgst = 0;
    let rawIgst = 0;
    let rcvUnits = 0;
    let freeUnits = 0;
    const rateMap = new Map<number, { taxable: number; gst: number }>();

    for (const item of watchedItems) {
      const q = toNum(item?.receivedQty);
      const f = toNum(item?.freeQty);
      const r = toNum(item?.unitRate);
      const d = toNum(item?.discountPercent);
      const g = toNum(item?.gstPercent);

      const gross = q * r;
      const discount = gross * (d / 100);
      const taxable = Math.max(0, gross - discount);
      const gst = taxable * (g / 100);

      sub += gross;
      lineDiscountsSum += discount;
      rawTaxableSum += taxable;
      rcvUnits += q;
      freeUnits += f;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      if (isInterState) {
        igst = gst;
      } else {
        cgst = gst / 2;
        sgst = gst / 2;
      }

      rawCgst += cgst;
      rawSgst += sgst;
      rawIgst += igst;

      if (g > 0 && taxable > 0) {
        const existing = rateMap.get(g) || { taxable: 0, gst: 0 };
        rateMap.set(g, {
          taxable: existing.taxable + taxable,
          gst: existing.gst + gst,
        });
      }
    }

    const billDiscount = Math.min(watchBillDiscount, rawTaxableSum);
    const totalDiscount = lineDiscountsSum + billDiscount;
    const taxableAmount = Math.max(0, rawTaxableSum - billDiscount);

    // Scale GST proportionally with bill discount if applied
    const taxScale = rawTaxableSum > 0 ? taxableAmount / rawTaxableSum : 1;
    const cgstAmount = Number((rawCgst * taxScale).toFixed(2));
    const sgstAmount = Number((rawSgst * taxScale).toFixed(2));
    const igstAmount = Number((rawIgst * taxScale).toFixed(2));
    const totalGst = cgstAmount + sgstAmount + igstAmount;

    const rawTotal = taxableAmount + totalGst;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = Number((roundedTotal - rawTotal).toFixed(2));

    return {
      subtotal: Number(sub.toFixed(2)),
      lineDiscounts: Number(lineDiscountsSum.toFixed(2)),
      billDiscount: Number(billDiscount.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      taxableAmount: Number(taxableAmount.toFixed(2)),
      totalGst: Number(totalGst.toFixed(2)),
      cgstAmount,
      sgstAmount,
      igstAmount,
      roundOff,
      grandTotal: roundedTotal,
      totalReceivedUnits: rcvUnits,
      totalFreeUnits: freeUnits,
      totalItemsCount: watchedItems.length,
      gstBreakdown: Array.from(rateMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([rate, val]) => ({
          rate,
          taxable: val.taxable * taxScale,
          gst: val.gst * taxScale,
          cgst: isInterState ? 0 : (val.gst * taxScale) / 2,
          sgst: isInterState ? 0 : (val.gst * taxScale) / 2,
          igst: isInterState ? val.gst * taxScale : 0,
        })),
    };
  }, [watchedItems, isInterState, watchBillDiscount]);

  const {
    subtotal,
    totalGst,
    cgstAmount,
    sgstAmount,
    igstAmount,
    grandTotal,
    totalReceivedUnits,
    totalFreeUnits,
    totalItemsCount,
    gstBreakdown,
  } = summary;

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      let res;
      if (poId) {
        res = await (client["purchase-orders"][":id"].grns as any).$post({
          param: { id: String(poId) },
          json: data,
        });
      } else {
        res = await client.grns.$post({
          json: data,
        });
      }

      if (!res.ok) {
        const errorData = await (res.json() as Promise<any>).catch(() => ({}));
        throw new Error(errorData.error || "Failed to record GRN");
      }
      return res.json();
    },
    onSuccess: async () => {
      toast.success("Goods Receipt Note (GRN) recorded successfully");
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["grns"] });
      if (onSuccess) {
        onSuccess();
      } else if (poId) {
        navigate({ to: "/purchases/purchase-orders/$id", params: { id: String(poId) } });
      } else {
        navigate({ to: "/purchases/grns" });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to record GRN");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await (client.grns as any)[":grnId"].$patch({
        param: { grnId: String(grnId) },
        json: data,
      });
      if (!res.ok) {
        const errorData = await (res.json() as Promise<any>).catch(() => ({}));
        throw new Error(errorData.error || "Failed to update GRN");
      }
      return res.json();
    },
    onSuccess: async () => {
      toast.success("Goods Receipt Note (GRN) updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      await queryClient.invalidateQueries({ queryKey: ["grns"] });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate({ to: "/purchases/grns" });
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update GRN");
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

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
        receivedSumByPoItem[item.poItemId] = (receivedSumByPoItem[item.poItemId] || 0) + toNum(item.receivedQty) + toNum(item.freeQty);
      }
    }

    let needsConfirmation = false;
    let overToleranceItem = "";

    for (const item of values.items) {
      if (!item.poItemId) continue;
      const totalRcvd = toNum(item.alreadyReceivedQty) + (receivedSumByPoItem[item.poItemId] || 0);
      const limit = toNum(item.orderedQty) * 1.10; // 10% tolerance

      if (totalRcvd > limit) {
        overToleranceItem = item.itemName;
        break;
      }

      if (totalRcvd > toNum(item.orderedQty)) {
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

    const payload = {
      poId: poId || initialData?.poId || null,
      vendorId: values.vendorId || po?.vendorId || initialData?.vendorId || null,
      storeId: values.storeId || null,
      noPoReason: values.noPoReason || null,
      grnNo: values.grnNo || null,
      grnDate: values.grnDate,
      dateOfDelivery: values.dateOfDelivery || null,
      remarks: values.remarks || null,
      status: targetStatus,
      subtotal: summary.subtotal,
      billDiscountAmount: summary.billDiscount,
      discountAmount: summary.billDiscount,
      taxableAmount: summary.taxableAmount,
      totalGst: summary.totalGst,
      roundOff: summary.roundOff,
      netAmount: summary.grandTotal,
      items: values.items.map((item) => {
        const q = toNum(item.receivedQty);
        const r = toNum(item.unitRate);
        const d = toNum(item.discountPercent);
        const g = toNum(item.gstPercent);
        const gross = q * r;
        const discAmt = gross * (d / 100);
        const taxable = Math.max(0, gross - discAmt);
        const lineVal = taxable + taxable * (g / 100);

        return {
          id: item.id,
          poItemId: item.poItemId || null,
          itemId: item.itemId || null,
          itemName: item.itemName,
          unit: item.unit || null,
          saleUnit: item.saleUnit || item.unit || null,
          receivedQty: q,
          freeQty: toNum(item.freeQty),
          unitRate: r,
          discountPercent: d,
          discountAmount: Number(discAmt.toFixed(2)),
          taxableAmount: Number(taxable.toFixed(2)),
          salePrice: toNum(item.salePrice),
          gstPercent: g,
          lineValue: Number(lineVal.toFixed(2)),
          batch: item.batch || null,
          expiryDate: item.expiryDate || null,
          notes: item.notes || null,
        };
      }),
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleAddBatchRow = (targetItem: any, index: number) => {
    insert(index + 1, {
      poItemId: targetItem.poItemId,
      itemId: targetItem.itemId,
      itemName: targetItem.itemName,
      unit: targetItem.unit || "",
      saleUnit: targetItem.saleUnit || targetItem.unit || "",
      orderedQty: targetItem.orderedQty,
      alreadyReceivedQty: targetItem.alreadyReceivedQty,
      receivedQty: 0,
      freeQty: 0,
      unitRate: targetItem.unitRate,
      discountPercent: targetItem.discountPercent || 0,
      discountAmount: 0,
      taxableAmount: 0,
      salePrice: targetItem.salePrice,
      gstPercent: targetItem.gstPercent,
      batch: "",
      expiryDate: "",
      notes: "",
    });
    toast.info(`Added extra batch row for "${targetItem.itemName}"`);
  };

  const handleAddNewItemRow = () => {
    append({
      poItemId: null,
      itemId: null,
      itemName: "",
      unit: "",
      saleUnit: "",
      orderedQty: 0,
      alreadyReceivedQty: 0,
      receivedQty: 1,
      freeQty: 0,
      unitRate: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxableAmount: 0,
      salePrice: 0,
      gstPercent: 0,
      batch: "",
      expiryDate: "",
      notes: "",
    });
  };

  const handleItemAddedFromDialog = (newItem: any) => {
    const currentItems = form.getValues("items") || [];
    const lastIndex = currentItems.length - 1;
    const lastItemName = currentItems[lastIndex]?.itemName;

    if (lastIndex >= 0 && (!lastItemName || lastItemName.trim() === "")) {
      form.setValue(`items.${lastIndex}.itemId`, newItem.id);
      form.setValue(`items.${lastIndex}.itemName`, newItem.name);
      form.setValue(`items.${lastIndex}.unit`, newItem.purchaseUnit || newItem.unit || "");
      form.setValue(`items.${lastIndex}.saleUnit`, newItem.saleUnit || newItem.unit || newItem.purchaseUnit || "");
      form.setValue(`items.${lastIndex}.unitRate`, Number(newItem.rate || 0));
      form.setValue(`items.${lastIndex}.discountPercent`, 0);
      form.setValue(`items.${lastIndex}.salePrice`, Number(newItem.salePrice || 0));
      form.setValue(`items.${lastIndex}.gstPercent`, Number(newItem.gstPercent || 0));
    } else {
      append({
        poItemId: null,
        itemId: newItem.id,
        itemName: newItem.name,
        unit: newItem.purchaseUnit || newItem.unit || "",
        saleUnit: newItem.saleUnit || newItem.unit || newItem.purchaseUnit || "",
        orderedQty: 0,
        alreadyReceivedQty: 0,
        receivedQty: 1,
        freeQty: 0,
        unitRate: Number(newItem.rate || 0),
        discountPercent: 0,
        discountAmount: 0,
        taxableAmount: 0,
        salePrice: Number(newItem.salePrice || 0),
        gstPercent: Number(newItem.gstPercent || 0),
        batch: "",
        expiryDate: "",
        notes: "",
      });
    }
  };

  const onFormError = (errors: any) => {
    console.error("GRN validation errors:", errors);
    const messages: string[] = [];
    if (errors.storeId?.message) messages.push(`Receiving Store: ${errors.storeId.message}`);
    if (errors.vendorId?.message) messages.push(`Vendor: ${errors.vendorId.message}`);
    if (errors.noPoReason?.message) messages.push(`No PO Reason: ${errors.noPoReason.message}`);
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
        <div className="space-y-1">
          <div className="font-semibold">Please correct the following errors:</div>
          <ul className="list-disc pl-4 text-xs">
            {messages.slice(0, 5).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
            {messages.length > 5 && <li>...and {messages.length - 5} more issues</li>}
          </ul>
        </div>
      );
    }
  };

  return (
    <form className="space-y-6">
      {/* PO Reference Banner */}
      {po && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">PO #{po.poNo || po.id}</span>
                <Badge variant="outline" className="text-xs capitalize font-mono">
                  {po.poStatus || "open"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vendor: <strong>{po.vendor?.name || po.vendorName || "Direct / TBD"}</strong> &bull; Order Date:{" "}
                {po.poDate ? format(new Date(po.poDate), "dd MMM yyyy") : "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-xs text-muted-foreground">PO Total Value</div>
              <div className="text-sm font-bold text-primary font-mono">{formatCurrency(toNum(po.totalAmount || po.totalValue) || 0)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Posted / Locked Banner */}
      {isPosted && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-950 dark:text-emerald-200 text-xs shadow-xs">
          <PackageCheck className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <div>
            <span className="font-bold text-sm block text-emerald-800 dark:text-emerald-300">
              Goods Receipt Note is POSTED (Locked)
            </span>
            This GRN has already been committed to inventory stock. Quantities, batches, and unit rates are locked and cannot be edited or re-saved.
          </div>
        </div>
      )}

      {/* Validation Error Banner */}
      {Object.keys(form.formState.errors).length > 0 && !isView && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-xs space-y-1 shadow-xs animate-in fade-in duration-200">
          <div className="font-semibold text-sm mb-1 flex items-center gap-2">
            <Info className="h-4 w-4" /> Form Validation Errors
          </div>
          <ul className="list-disc pl-5 space-y-0.5">
            {form.formState.errors.storeId && <li>Receiving Store: {String(form.formState.errors.storeId.message)}</li>}
            {form.formState.errors.vendorId && <li>Vendor: {String(form.formState.errors.vendorId.message)}</li>}
            {form.formState.errors.noPoReason && <li>Reason: {String(form.formState.errors.noPoReason.message)}</li>}
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

      {/* GRN Receipt Header Details */}
      <Card className="shadow-xs border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <PackageCheck className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">Receipt Header & Logistics</CardTitle>
              <CardDescription className="text-xs">Specify target inventory store, delivery dates, and vendor reference</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.7fr_1.1fr_1fr_0.85fr_0.85fr]">
          {/* Vendor selection */}
          <div className="flex flex-col space-y-1.5">
            <Label className="text-xs font-semibold">
              Vendor <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={form.control}
              name="vendorId"
              rules={{ required: "Vendor is required" }}
              render={({ field, fieldState }) => (
                <Autocomplete
                  label=""
                  placeholder="Search & select vendor..."
                  options={vendorOptions}
                  className="text-xs"
                  value={field.value ? String(field.value) : ""}
                  onChange={(val) => field.onChange(val ? Number(val) : null)}
                  disabled={isView}
                  error={fieldState.error?.message}
                />
              )}
            />
          </div>

          {/* Receiving Store */}
          <div className="flex flex-col space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              Receiving Store <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={form.control}
              name="storeId"
              render={({ field, fieldState }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                  disabled={isView}
                >
                  <SelectTrigger
                    className={cn(
                      "w-full h-9 text-sm bg-background shadow-2xs",
                      fieldState.error && "border-destructive focus-visible:ring-destructive"
                    )}
                  >
                    <SelectValue placeholder="Select receiving store..." />
                  </SelectTrigger>
                  <SelectContent>
                    {storesList.filter((s: any) => s.active !== false).map((store: any) => (
                      <SelectItem key={store.id} value={String(store.id)} className="text-sm">
                        {store.name} {store.isDefault ? "★ [Default]" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.storeId && (
              <span className="text-[11px] font-medium text-destructive">
                {form.formState.errors.storeId.message}
              </span>
            )}
          </div>

          {/* GRN No */}
          <div className="flex flex-col space-y-1.5">
            <Field
              label="GRN Number"
              placeholder="Auto-generated (or custom)"
              {...form.register("grnNo")}
              disabled={isView}
              error={form.formState.errors.grnNo?.message}
              className="text-xs h-9 font-mono"
            />
          </div>

          {/* GRN Date */}
          <div className="flex flex-col space-y-1.5">
            <Label className="text-xs font-semibold">GRN Date <span className="text-destructive">*</span></Label>
            <Controller
              control={form.control}
              name="grnDate"
              render={({ field, fieldState }) => (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isView}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background px-2.5 h-9 text-xs font-mono shadow-2xs",
                          !field.value && "text-muted-foreground",
                          fieldState.error && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {field.value ? format(new Date(field.value), "yyyy-MM-dd") : <span>YYYY-MM-DD</span>}
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
                  {fieldState.error && <p className="text-[11px] text-destructive">{fieldState.error.message}</p>}
                </>
              )}
            />
          </div>

          {/* Date of Delivery */}
          <div className="flex flex-col space-y-1.5">
            <Label className="text-xs font-semibold">Delivery Date</Label>
            <Controller
              control={form.control}
              name="dateOfDelivery"
              render={({ field, fieldState }) => (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isView}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-background px-2.5 h-9 text-xs font-mono shadow-2xs",
                          !field.value && "text-muted-foreground",
                          fieldState.error && "border-destructive"
                        )}
                      >
                        <CalendarCheck className="mr-1.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {field.value ? format(new Date(field.value), "yyyy-MM-dd") : <span>YYYY-MM-DD</span>}
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
                  {fieldState.error && <p className="text-[11px] text-destructive">{fieldState.error.message}</p>}
                </>
              )}
            />
          </div>

          {/* Reason for No PO (if direct GRN) */}
          {isDirect && (
            <div className="flex flex-col space-y-1.5 sm:col-span-2 lg:col-span-5">
              <Field
                label="Reason for Direct Delivery (No PO)"
                placeholder="e.g. Emergency hospital procurement, spot purchase, direct vendor delivery..."
                {...form.register("noPoReason")}
                disabled={isView}
                error={form.formState.errors.noPoReason?.message}
                className="text-xs h-9"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items & Batches Section (Responsive Grid Layout) */}
      <Card className="shadow-xs border overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">PO Items &amp; Batch Allocation</CardTitle>
                <CardDescription className="text-xs">
                  Enter batch numbers, expiry dates, and received quantities. Click <strong>+ Batch</strong> if received in multiple batches.
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-xs gap-1 py-1">
                <Sparkles className="h-3 w-3 text-primary" /> {fields.length} Line Row{fields.length > 1 ? "s" : ""}
              </Badge>
              {!isView && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-primary hover:bg-primary/10 font-semibold"
                  onClick={handleAddNewItemRow}
                >
                  <PackagePlus className="h-3.5 w-3.5" /> Add Item
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-4">
            {fields.map((field: any, index: number) => {
              const ordered = toNum(watchedItems[index]?.orderedQty ?? field.orderedQty);
              const priorReceived = toNum(watchedItems[index]?.alreadyReceivedQty ?? field.alreadyReceivedQty);
              const poItemId = watchedItems[index]?.poItemId || field.poItemId;
              const currentReceivingForThisPoItem = poItemId
                ? watchedItems
                    .filter((it: any) => it?.poItemId === poItemId)
                    .reduce((sum: number, it: any) => sum + toNum(it?.receivedQty) + toNum(it?.freeQty), 0)
                : toNum(watchedItems[index]?.receivedQty) + toNum(watchedItems[index]?.freeQty);

              const totalReceived = priorReceived + currentReceivingForThisPoItem;
              const remainingPending = Math.max(0, ordered - totalReceived);
              const rcvQty = toNum(watchedItems[index]?.receivedQty);
              const rate = toNum(watchedItems[index]?.unitRate);
              const discPct = toNum(watchedItems[index]?.discountPercent);
              const gst = toNum(watchedItems[index]?.gstPercent);
              const gross = rcvQty * rate;
              const discAmt = gross * (discPct / 100);
              const lineTaxable = Math.max(0, gross - discAmt);
              const lineNetVal = lineTaxable + lineTaxable * (gst / 100);

              const isOverTolerance = poItemId && (totalReceived > ordered * 1.10);
              const isOverOrdered = poItemId && (totalReceived > ordered);

              return (
                <div
                  key={field.id}
                  className={cn(
                    "rounded-xl border bg-card p-4 shadow-xs transition-all space-y-3.5",
                    index % 2 === 1 && "bg-muted/5",
                    isOverTolerance ? "border-destructive/40 bg-destructive/5" : "hover:border-primary/30"
                  )}
                >
                  {/* Top Bar: Item Name, Badges & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                    <div className="space-y-1 flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2">
                        {(!field.itemName || !poItemId) && !isView ? (
                          <div className="w-full max-w-sm">
                            <Controller
                              control={form.control}
                              name={`items.${index}.itemName` as const}
                              render={({ field: nameField }) => (
                                <Autocomplete
                                  label=""
                                  placeholder="Select or enter item name..."
                                  options={itemOptions}
                                  value={nameField.value || ""}
                                  allowCustomValue
                                  onChange={(val) => {
                                    nameField.onChange(val);
                                    const cat = itemsCatalog.find((it: any) => it.name === val);
                                    if (cat) {
                                      form.setValue(`items.${index}.itemId` as const, cat.id);
                                      form.setValue(`items.${index}.unit` as const, cat.purchaseUnit || cat.unit || "");
                                      form.setValue(`items.${index}.saleUnit` as const, cat.saleUnit || cat.unit || cat.purchaseUnit || "");
                                      form.setValue(`items.${index}.unitRate` as const, Number(cat.rate || 0));
                                      form.setValue(`items.${index}.discountPercent` as const, 0);
                                      form.setValue(`items.${index}.salePrice` as const, Number(cat.salePrice || 0));
                                      form.setValue(`items.${index}.gstPercent` as const, Number(cat.gstPercent || 0));
                                    }
                                  }}
                                  className="text-xs h-8"
                                />
                              )}
                            />
                          </div>
                        ) : (
                          <span className="font-bold text-sm text-foreground">
                            {field.itemName || watchedItems[index]?.itemName || "Unnamed Item"}
                          </span>
                        )}

                        {watchedItems.filter((it: any) => (it.poItemId || field.poItemId) && (it.poItemId || field.poItemId) === (field.poItemId || watchedItems[index]?.poItemId)).length > 1 && (
                          <Badge variant="outline" className="text-[10.5px] font-mono py-0 px-1.5 shrink-0">
                            Batch #{watchedItems.filter((it: any, i: number) => i <= index && (it.poItemId || field.poItemId) === (field.poItemId || watchedItems[index]?.poItemId)).length}
                          </Badge>
                        )}
                      </div>

                      {ordered > 0 && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-mono">
                          <span>Ordered: <strong className="text-foreground">{ordered}</strong></span>
                          <span>&bull;</span>
                          {priorReceived > 0 && (
                            <>
                              <span>Prior: <strong className="text-foreground">{priorReceived}</strong></span>
                              <span>&bull;</span>
                            </>
                          )}
                          <span>This GRN: <strong className="text-foreground">{currentReceivingForThisPoItem}</strong></span>
                          <span>&bull;</span>
                          <span>Total: <strong className={cn(totalReceived >= ordered ? "text-emerald-600 font-bold" : "text-foreground")}>{totalReceived}</strong></span>
                          {isOverOrdered && (
                            <span className="text-amber-600 font-semibold text-[11px]">
                              (+{((totalReceived - ordered) / ordered * 100).toFixed(0)}% Over-ordered)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {!isView && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-primary hover:bg-primary/10 font-medium shadow-2xs gap-1"
                          onClick={() => handleAddBatchRow(watchedItems[index] || field, index)}
                          title="Add another batch for this item"
                        >
                          <Plus className="h-3.5 w-3.5" /> Batch
                        </Button>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => remove(index)}
                            title="Remove this batch row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Responsive Grid of Inputs */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-[0.85fr_1fr_1.05fr_0.95fr_0.75fr_0.95fr_0.75fr_1.35fr_0.95fr] gap-2.5 items-start">
                    {/* 1. Pur. Unit */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground block">Pur. Unit</Label>
                      <select
                        disabled={isView}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium disabled:opacity-75"
                        value={watchedItems[index]?.unit || ""}
                        onChange={(e) => {
                          const newUnit = e.target.value;
                          form.setValue(`items.${index}.unit` as const, newUnit);
                          if (!form.getValues(`items.${index}.saleUnit` as const)) {
                            form.setValue(`items.${index}.saleUnit` as const, newUnit);
                          }
                          const poItemId = watchedItems[index]?.poItemId || field.poItemId;
                          const poItem = po?.items?.find((pi: any) => pi.id === poItemId);
                          const itemName = watchedItems[index]?.itemName || poItem?.itemName;
                          const catItem = itemsCatalog.find((it: any) => it.name === itemName || it.id === poItem?.itemId);

                          const baseUnit = poItem?.unit || catItem?.purchaseUnit || catItem?.unit || "";
                          const baseRate = toNum(poItem?.unitRate) || toNum(catItem?.rate) || 0;

                          const tier = catItem?.unitPrices?.find((up: any) => up.unit === newUnit);
                          if (tier && Number(tier.costPrice) > 0) {
                            form.setValue(`items.${index}.unitRate` as const, Number(tier.costPrice || 0));
                          } else if (newUnit && baseUnit && newUnit === baseUnit) {
                            form.setValue(`items.${index}.unitRate` as const, baseRate);
                          } else {
                            const factor = getConversionFactor(newUnit, baseUnit);
                            if (factor > 0) {
                              form.setValue(`items.${index}.unitRate` as const, Number((baseRate * factor).toFixed(2)));
                            } else {
                              form.setValue(`items.${index}.unitRate` as const, 0);
                            }
                          }
                        }}
                      >
                        {(() => {
                          const poItemId = watchedItems[index]?.poItemId || field.poItemId;
                          const poItem = po?.items?.find((pi: any) => pi.id === poItemId);
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
                    </div>

                    {/* 2. Batch Number */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground block">
                        Batch No <span className="text-destructive">*</span>
                      </Label>
                      <Controller
                        control={form.control}
                        name={`items.${index}.batch` as const}
                        render={({ field: batchField, fieldState }) => (
                          <div>
                            <Input
                              placeholder="e.g. BTH-882"
                              value={batchField.value || ""}
                              onChange={(e) => batchField.onChange(e.target.value)}
                              onBlur={batchField.onBlur}
                              ref={batchField.ref}
                              disabled={isView}
                              className={cn(
                                "h-9 text-xs font-mono px-2",
                                fieldState.error && "border-destructive focus-visible:ring-destructive"
                              )}
                            />
                            {fieldState.error && (
                              <p className="text-[10px] text-destructive mt-0.5">{fieldState.error.message}</p>
                            )}
                          </div>
                        )}
                      />
                    </div>

                    {/* 3. Expiry Date */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground block">
                        Expiry Date <span className="text-destructive">*</span>
                      </Label>
                      <Controller
                        control={form.control}
                        name={`items.${index}.expiryDate` as const}
                        render={({ field: expField, fieldState }) => (
                          <div>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  disabled={isView}
                                  className={cn(
                                    "w-full justify-start text-left font-normal bg-background px-2 h-9 text-xs font-mono",
                                    !expField.value && "text-muted-foreground",
                                    fieldState.error && "border-destructive"
                                  )}
                                >
                                  <CalendarIcon className="mr-1.5 h-3 w-3 shrink-0 text-muted-foreground" />
                                  {expField.value ? format(new Date(expField.value), "yyyy-MM-dd") : <span>YYYY-MM-DD</span>}
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
                            {fieldState.error && <span className="text-[10px] text-destructive block mt-0.5">{fieldState.error.message}</span>}
                          </div>
                        )}
                      />
                    </div>

                    {/* 4. Recv Qty */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground block text-right">
                        Recv Qty <span className="text-destructive">*</span>
                      </Label>
                      <Controller
                        control={form.control}
                        name={`items.${index}.receivedQty` as const}
                        render={({ field: qtyField, fieldState }) => {
                          const val = Number(qtyField.value) || 0;
                          return (
                            <div>
                              <div className="flex items-center">
                                {!isView && (
                                  <button
                                    type="button"
                                    onClick={() => qtyField.onChange(Math.max(0, Number((val - 1).toFixed(2))))}
                                    disabled={val <= 0}
                                    className="h-9 w-6 shrink-0 flex items-center justify-center rounded-l-md border border-r-0 border-input bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Decrease qty"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                )}
                                <Input
                                  type="number"
                                  step="any"
                                  min="0"
                                  disabled={isView}
                                  value={qtyField.value === undefined || qtyField.value === null ? "" : qtyField.value}
                                  onChange={(e) => {
                                    const text = e.target.value;
                                    qtyField.onChange(text === "" ? "" : Number(text));
                                  }}
                                  onBlur={qtyField.onBlur}
                                  ref={qtyField.ref}
                                  className={cn(
                                    "w-full text-center h-9 text-xs font-mono font-semibold px-1 border-input focus-visible:ring-1",
                                    !isView && "rounded-none",
                                    fieldState.error && "border-destructive ring-destructive"
                                  )}
                                />
                                {!isView && (
                                  <button
                                    type="button"
                                    onClick={() => qtyField.onChange(Number((val + 1).toFixed(2)))}
                                    className="h-9 w-6 shrink-0 flex items-center justify-center rounded-r-md border border-l-0 border-input bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                    title="Increase qty"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              {ordered > 0 && (
                                <div className="flex items-center justify-between text-[10.5px] font-mono mt-1 text-muted-foreground px-0.5">
                                  <span>Pending:</span>
                                  <span
                                    className={cn(
                                      "font-bold font-mono",
                                      remainingPending === 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-amber-600 dark:text-amber-400"
                                    )}
                                  >
                                    {remainingPending}
                                  </span>
                                </div>
                              )}
                              {fieldState.error && (
                                <p className="text-[10px] text-destructive text-right mt-0.5">{fieldState.error.message}</p>
                              )}
                            </div>
                          );
                        }}
                      />
                    </div>

                    {/* 5. Free Qty */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-muted-foreground block text-right">Free Qty</Label>
                      <Controller
                        control={form.control}
                        name={`items.${index}.freeQty` as const}
                        render={({ field: fField }) => (
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0"
                            disabled={isView}
                            value={fField.value === undefined || fField.value === null ? "" : fField.value}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Number(e.target.value);
                              fField.onChange(val);
                            }}
                            onBlur={fField.onBlur}
                            ref={fField.ref}
                            className="h-9 text-xs font-mono text-right px-2"
                          />
                        )}
                      />
                    </div>

                    {/* 6. Cost Rate */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold text-muted-foreground block text-right">Cost Rate (₹)</Label>
                        <span className="text-[10px] text-muted-foreground/70 font-mono truncate max-w-[50px]" title={watchedItems[index]?.unit || "unit"}>
                          /{watchedItems[index]?.unit || "unit"}
                        </span>
                      </div>
                      <Controller
                        control={form.control}
                        name={`items.${index}.unitRate` as const}
                        render={({ field: rField, fieldState }) => (
                          <div>
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.00"
                              disabled={isView}
                              value={rField.value === undefined || rField.value === null ? "" : rField.value}
                              onChange={(e) => {
                                const val = e.target.value === "" ? "" : Number(e.target.value);
                                rField.onChange(val);
                              }}
                              onBlur={rField.onBlur}
                              ref={rField.ref}
                              className={cn(
                                "h-9 text-xs font-mono text-right px-2",
                                fieldState.error && "border-destructive focus-visible:ring-destructive"
                              )}
                            />
                            {fieldState.error && (
                              <p className="text-[10px] text-destructive text-right mt-0.5">{fieldState.error.message}</p>
                            )}
                          </div>
                        )}
                      />
                    </div>

                    {/* 7. Disc % */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold text-muted-foreground block text-right">Disc %</Label>
                        {discAmt > 0 && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono truncate max-w-[55px]" title={`-₹${discAmt.toFixed(2)}`}>
                            -₹{discAmt >= 100 ? discAmt.toFixed(0) : discAmt.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <Controller
                        control={form.control}
                        name={`items.${index}.discountPercent` as const}
                        render={({ field: dField }) => (
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            max="100"
                            placeholder="0"
                            disabled={isView}
                            value={dField.value === undefined || dField.value === null ? "" : dField.value}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Number(e.target.value);
                              dField.onChange(val);
                            }}
                            onBlur={dField.onBlur}
                            ref={dField.ref}
                            className="h-9 text-xs font-mono text-right px-2"
                          />
                        )}
                      />
                    </div>

                    {/* 8. Sale Price & Sale Unit */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold text-muted-foreground block text-right">Sale Price (₹)</Label>
                        <span className="text-[10px] text-muted-foreground/70 font-mono truncate max-w-[50px]" title={watchedItems[index]?.saleUnit || watchedItems[index]?.unit || "unit"}>
                          /{watchedItems[index]?.saleUnit || watchedItems[index]?.unit || "unit"}
                        </span>
                      </div>
                      <Controller
                        control={form.control}
                        name={`items.${index}.salePrice` as const}
                        render={({ field: sField }) => (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="0.00"
                              disabled={isView}
                              value={sField.value === undefined || sField.value === null ? "" : sField.value}
                              onChange={(e) => {
                                const val = e.target.value === "" ? "" : Number(e.target.value);
                                sField.onChange(val);
                              }}
                              onBlur={sField.onBlur}
                              ref={sField.ref}
                              className="h-9 text-xs font-mono text-right px-2 flex-1 min-w-[60px]"
                            />
                            <select
                              disabled={isView}
                              className="h-9 w-16 rounded-md border border-input bg-background px-1 py-1 text-[11px] outline-none focus-visible:ring-1 focus-visible:ring-ring font-medium disabled:opacity-75 shrink-0"
                              value={watchedItems[index]?.saleUnit || watchedItems[index]?.unit || ""}
                              onChange={(e) => {
                                const newSaleUnit = e.target.value;
                                form.setValue(`items.${index}.saleUnit` as const, newSaleUnit);

                                const poItemId = watchedItems[index]?.poItemId || field.poItemId;
                                const poItem = po?.items?.find((pi: any) => pi.id === poItemId);
                                const itemName = watchedItems[index]?.itemName || poItem?.itemName;
                                const catItem = itemsCatalog.find((it: any) => it.name === itemName || it.id === poItem?.itemId);

                                const tier = catItem?.unitPrices?.find((up: any) => up.unit === newSaleUnit);
                                if (tier && Number(tier.salePrice) > 0) {
                                  form.setValue(`items.${index}.salePrice` as const, Number(tier.salePrice));
                                } else if (catItem && (newSaleUnit === catItem.saleUnit || newSaleUnit === catItem.unit)) {
                                  form.setValue(`items.${index}.salePrice` as const, Number(catItem.salePrice || 0));
                                } else {
                                  const baseSaleUnit = catItem?.saleUnit || catItem?.unit || "";
                                  const baseSalePrice = catItem ? toNum(catItem.salePrice) : 0;
                                  if (baseSalePrice > 0 && baseSaleUnit && newSaleUnit) {
                                    const factor = getConversionFactor(newSaleUnit, baseSaleUnit);
                                    if (factor > 0) {
                                      form.setValue(`items.${index}.salePrice` as const, Number((baseSalePrice * factor).toFixed(2)));
                                    }
                                  }
                                }
                              }}
                              title="Sale / Dispensing Unit"
                            >
                              {(() => {
                                const poItemId = watchedItems[index]?.poItemId || field.poItemId;
                                const poItem = po?.items?.find((pi: any) => pi.id === poItemId);
                                const itemName = watchedItems[index]?.itemName || poItem?.itemName;
                                const catItem = itemsCatalog.find((it: any) => it.name === itemName || it.id === poItem?.itemId);

                                const currentPurUnit = watchedItems[index]?.unit;
                                const currentSaleUnit = watchedItems[index]?.saleUnit;
                                const unitsSet = new Set<string>();
                                if (currentSaleUnit) unitsSet.add(currentSaleUnit);
                                if (currentPurUnit) unitsSet.add(currentPurUnit);
                                if (catItem?.saleUnit) unitsSet.add(catItem.saleUnit);
                                if (catItem?.purchaseUnit) unitsSet.add(catItem.purchaseUnit);
                                if (catItem?.unit) unitsSet.add(catItem.unit);
                                if (poItem?.unit) unitsSet.add(poItem.unit);
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
                          </div>
                        )}
                      />
                    </div>

                    {/* 9. GST % & Net Value */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold text-muted-foreground">GST %</Label>
                        <span className="text-[10.5px] font-bold font-mono text-foreground">
                          {formatCurrency(lineNetVal)}
                        </span>
                      </div>
                      <Controller
                        control={form.control}
                        name={`items.${index}.gstPercent` as const}
                        render={({ field: gField }) => (
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="0"
                            disabled={isView}
                            value={gField.value === undefined || gField.value === null ? "" : gField.value}
                            onChange={(e) => {
                              const val = e.target.value === "" ? "" : Number(e.target.value);
                              gField.onChange(val);
                            }}
                            onBlur={gField.onBlur}
                            ref={gField.ref}
                            className="h-9 text-xs font-mono text-right px-2"
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Section: Notes & Financial Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-7 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Remarks &amp; Delivery Reference Notes
          </Label>
          <textarea
            rows={5}
            disabled={isView}
            placeholder="Add terms, remarks, delivery notes, invoice number reference, packaging condition..."
            {...form.register("remarks")}
            className="w-full p-3 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed resize-none disabled:opacity-75"
          />
          {form.formState.errors.remarks && (
            <p className="text-[11px] text-destructive">{form.formState.errors.remarks.message}</p>
          )}
        </div>

        <div className="md:col-span-5">
          <Card className="shadow-xs bg-muted/10 border-primary/20">
            <CardHeader className="py-2.5 px-4 border-b bg-muted/20 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">GRN Receipt Summary</CardTitle>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  disabled={isView}
                  checked={isInterState}
                  onChange={(e) => setIsInterState(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span>Inter-State (IGST)</span>
              </label>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Line Rows</span>
                <span className="font-mono font-medium text-foreground">{totalItemsCount}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Received Units</span>
                <span className="font-mono font-medium text-foreground">{totalReceivedUnits.toFixed(2)}</span>
              </div>
              {totalFreeUnits > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Total Free Units</span>
                  <span className="font-mono font-medium">+{totalFreeUnits.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground pt-1.5 border-t">
                <span>Gross Subtotal</span>
                <span className="font-mono font-medium">₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>

              {summary.lineDiscounts > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Line Item Discounts</span>
                  <span className="font-mono">-₹{summary.lineDiscounts.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {/* Bill Level Discount Input */}
              <div className="flex items-center justify-between gap-3 pt-1 border-t">
                <span className="text-muted-foreground font-medium">Bill Level Discount</span>
                <div className="w-32">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono">₹</span>
                    <Controller
                      control={form.control}
                      name="billDiscountAmount"
                      render={({ field: bdField }) => (
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          disabled={isView}
                          value={bdField.value === undefined || bdField.value === null ? "" : bdField.value}
                          onChange={(e) => {
                            const val = e.target.value === "" ? "" : Number(e.target.value);
                            bdField.onChange(val);
                          }}
                          className="h-7 pl-5 pr-2 text-right text-xs font-mono font-bold"
                        />
                      )}
                    />
                  </div>
                </div>
              </div>

              {summary.totalDiscount > 0 && summary.lineDiscounts > 0 && summary.billDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold border-t border-emerald-500/20 pt-0.5">
                  <span>Total Discount</span>
                  <span className="font-mono">-₹{summary.totalDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="flex justify-between font-semibold pt-1 border-t">
                <span>Taxable Base Subtotal</span>
                <span className="font-mono">₹{summary.taxableAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Segregated GST breakdown */}
              {isInterState ? (
                <div className="flex justify-between text-muted-foreground">
                  <span>IGST (Integrated Tax)</span>
                  <span className="font-mono font-medium">₹{igstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>CGST (Central Tax)</span>
                    <span className="font-mono font-medium">₹{cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>SGST (State Tax)</span>
                    <span className="font-mono font-medium">₹{sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                </>
              )}

              {/* Rate-wise GST detail badges if multiple rates exist */}
              {gstBreakdown.length > 1 && totalGst > 0 && (
                <div className="pt-1 pb-1">
                  <div className="text-[10.5px] text-muted-foreground mb-1 font-medium">GST Rate Breakdown:</div>
                  <div className="space-y-1 pl-2 border-l-2 border-primary/30">
                    {gstBreakdown.map((item) => (
                      <div key={item.rate} className="flex justify-between text-[11px] text-muted-foreground font-mono">
                        <span>@{item.rate}% GST (on ₹{item.taxable.toFixed(2)}):</span>
                        <span>₹{item.gst.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground font-semibold">
                <span className="text-foreground">Total GST</span>
                <span className="font-mono text-foreground">₹{totalGst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              {summary.roundOff !== 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Round Off</span>
                  <span className="font-mono">{summary.roundOff > 0 ? `+₹${summary.roundOff.toFixed(2)}` : `-₹${Math.abs(summary.roundOff).toFixed(2)}`}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t text-primary">
                <span>Grand GRN Value</span>
                <span className="font-mono">₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Form Actions Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <Link
          to={poId ? "/purchases/purchase-orders/$id" : "/purchases/grns"}
          params={poId ? { id: String(poId) } : undefined}
        >
          <Button variant="outline" type="button" className="shadow-xs">
            <ChevronLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>
        </Link>

        {isView ? (
          initialData?.status === "draft" && (
            <Link to="/purchases/grns/$grnId/edit" params={{ grnId: String(grnId || initialData.id) }}>
              <Button type="button" className="gap-1.5 shadow-xs">
                <Edit className="h-4 w-4" /> Edit Draft GRN
              </Button>
            </Link>
          )
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              className="shadow-xs gap-1.5"
              onClick={form.handleSubmit(
                (values) => onSubmit(values as unknown as GRNFormValues, "draft"),
                onFormError
              )}
            >
              <Save className="h-4 w-4" /> Save as Draft
            </Button>

            <Button
              type="button"
              disabled={isPending}
              className="shadow-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={form.handleSubmit(
                (values) => onSubmit(values as unknown as GRNFormValues, "posted"),
                onFormError
              )}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PackageCheck className="h-4 w-4" />
              )}
              {isEdit ? "Update & Post GRN" : "Receive & Post GRN"}
            </Button>
          </div>
        )}
      </div>

      <AddItemDialog
        open={addItemDialogOpen}
        onOpenChange={setAddItemDialogOpen}
        initialName={newItemInitialName}
        onItemAdded={handleItemAddedFromDialog}
      />
    </form>
  );
}

function formatCurrency(amount: number) {
  return "₹" + amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
