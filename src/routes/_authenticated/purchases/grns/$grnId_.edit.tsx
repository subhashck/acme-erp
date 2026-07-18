import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "../../../../components/ModuleLayout";
import { useRpcQuery, queryClient } from "../../../../lib/query";
import { client } from "../../../../services/rpc";
import { EditGRNForm as DirectGRNForm } from "./$grnId";
import { useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  ChevronLeft, 
  Loader2, 
  Save, 
  Calendar as CalendarIcon, 
  Send
} from "lucide-react";
import { Button } from "../../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../../ui/card";
import { Label } from "../../../../ui/label";
import { Field } from "../../../../components/Field";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../components/ui/popover";
import { Calendar } from "../../../../components/ui/calendar";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "../../../../utils/cn";
import { toNum } from "../../../../utils/math";

// Schema for GRN creation validation in frontend
const grnItemFormSchema = z.object({
  poItemId: z.number().int().positive(),
  itemName: z.string(),
  orderedQty: z.number(),
  alreadyReceivedQty: z.number(),
  receivedQty: z.coerce.number().min(0, "Must be >= 0"),
  freeQty: z.coerce.number().min(0, "Must be >= 0").default(0),
  batch: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const grnFormSchema = z.object({
  grnNo: z.string().optional().nullable(),
  grnDate: z.string().min(1, "GRN Date is required"),
  dateOfDelivery: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: z.string().optional(),
  items: z.array(grnItemFormSchema).min(1, "At least one item is required"),
});

type GRNFormValues = z.infer<typeof grnFormSchema>;

export const Route = createFileRoute("/_authenticated/purchases/grns/$grnId_/edit")({
  component: EditGRNRoute,
});

function EditGRNRoute() {
  const { grnId } = Route.useParams();
  const navigate = useNavigate();

  // 1. Fetch GRN first to get the poId
  const { data: grn, isLoading: isLoadingGrn, error: errorGrn } = useRpcQuery<any>(
    ["grns", grnId],
    () => (client.grns as any)[":grnId"].$get({ param: { grnId } })
  );

  // 2. Fetch PO details using the poId from the GRN
  const poId = grn?.poId ? String(grn.poId) : "";
  const { data: po, isLoading: isLoadingPo, error: errorPo } = useRpcQuery<any>(
    ["purchase-orders", poId],
    () => client["purchase-orders"][":id"].$get({ param: { id: poId } }),
    { enabled: !!poId }
  );

  if (isLoadingGrn || isLoadingPo) {
    return (
      <ModuleLayout title="Receive Goods" description="Loading purchase order details...">
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (errorGrn || errorPo || !grn || (!!poId && !po)) {
    return (
      <ModuleLayout title="Edit GRN" description="Error loading GRN.">
        <div className="text-center text-destructive p-12">
          Failed to load GRN details. Make sure it exists.
          <div className="mt-4">
            <Link to="/purchases/grns">
              <Button variant="outline">Back to List</Button>
            </Link>
          </div>
        </div>
      </ModuleLayout>
    );
  }

  // Pre-generate GRN date (today)
  const defaultGrnDate = format(new Date(), "yyyy-MM-dd");
  const grnNumericId = parseInt(grnId as string, 10);
  const title = po ? `GRN Details: ${po.poNo}` : `GRN Details: ${grn.grnNo || "Direct GRN"}`;

  return (
    <ModuleLayout
      title={title}
      description="View or edit Goods Receipt Note (GRN) details."
      action={
        <Link to="/purchases/grns/$grnId" params={{ grnId }}>
          <Button variant="outline">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to Detail
          </Button>
        </Link>
      }
    >
      <div className="max-w-6xl mx-auto py-6">
        {po ? (
          <GRNForm po={po} grnId={grnNumericId} poId={parseInt(poId, 10)} />
        ) : (
          <DirectGRNForm grn={grn} grnId={grnNumericId} />
        )}
      </div>
    </ModuleLayout>
  );
}

interface GRNFormProps {
  po: any;
  grnId: number;
  poId: number;
}

function GRNForm({ po, grnId, poId }: GRNFormProps) {
  const navigate = useNavigate();

  const grn = po.grns?.find((g: any) => g.id === grnId);
  if (!grn) {
    return <div className="text-destructive p-4">GRN not found in PO data.</div>;
  }

  const isDraft = grn.status === 'draft';

  // Setup form values
  const form = useForm<GRNFormValues>({
    // @ts-ignore
    resolver: zodResolver(grnFormSchema),
    defaultValues: {
      grnNo: grn.grnNo || "",
      grnDate: grn.grnDate,
      dateOfDelivery: grn.dateOfDelivery || "",
      remarks: grn.remarks || "",
      status: grn.status,
      items: grn.items?.map((item: any) => {
        const poItem = po.items.find((pi: any) => pi.id === item.poItemId);
        const ordered = toNum(poItem?.orderedQty);
        // Exclude current GRN's receivedQty from alreadyReceived to show what's pending excluding this draft
        const alreadyReceived = Math.max(0, toNum(poItem?.receivedQty) - (isDraft ? 0 : toNum(item.receivedQty)));
        
        return {
          poItemId: item.poItemId,
          itemName: poItem?.itemName || "Unknown",
          orderedQty: ordered,
          alreadyReceivedQty: alreadyReceived,
          receivedQty: toNum(item.receivedQty),
          freeQty: toNum(item.freeQty),
          batch: item.batch || "",
          expiryDate: item.expiryDate || "",
          notes: item.notes || "",
        };
      }) || [],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/purchase-orders/${poId}/grns/${grnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
      navigate({ to: "/purchases/grns" });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update GRN");
    },
  });

  const onSubmit = (values: GRNFormValues, targetStatus: string = "draft") => {
    // 1. Validate tolerance (max 10% over ordered qty)
    // 2. Check if total received pushes over ordered qty (for confirmation)
    let needsConfirmation = false;
    let overToleranceItem = "";

    for (const item of values.items) {
      const total = item.alreadyReceivedQty + item.receivedQty;
      const limit = item.orderedQty * 1.10; // 10% tolerance
      
      if (total > limit) {
        overToleranceItem = item.itemName;
        break;
      }
      
      if (total > item.orderedQty) {
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

    if (targetStatus === 'posted') {
      const confirmedPost = window.confirm("Are you sure you want to POST this GRN? This action will update inventory and cannot be undone directly.");
      if (!confirmedPost) return;
    }

    // Prepare payload matching server's Zod schema (grnInput)
    const payload = {
      grnNo: values.grnNo || null,
      grnDate: values.grnDate,
      dateOfDelivery: values.dateOfDelivery || null,
      remarks: values.remarks || null,
      status: targetStatus,
      items: values.items.map(item => ({
        poItemId: item.poItemId,
        receivedQty: item.receivedQty,
        freeQty: item.freeQty,
        batch: item.batch || null,
        expiryDate: item.expiryDate || null,
        notes: item.notes || null,
      })),
    };

    mutation.mutate(payload);
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
      <fieldset disabled={!isDraft} className="space-y-6">
        {/* Header Fields */}
        <Card>
          <CardHeader>
            <CardTitle>GRN Header Details</CardTitle>
            <CardDescription>
              {isDraft ? "Enter receipt details below." : `This GRN is ${grn.status} and cannot be edited.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-3">
            {/* Vendor (Read-Only from PO) */}
            <Field 
              label="Vendor" 
              value={po.vendorName || po.vendor?.name || grn?.vendor?.name || "Unknown"}
              disabled={true}
            />

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
          <CardTitle>PO Items Receipt</CardTitle>
          <CardDescription>Record the quantities delivered and any free quantities received.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/40">
                <tr>
                  <th className="px-4 py-3 min-w-[200px]">Item Name</th>
                  <th className="px-4 py-3 text-right">Pending Qty</th>
                  <th className="px-4 py-3 min-w-[120px] text-right">Receiving *</th>
                  <th className="px-4 py-3 min-w-[100px] text-right">Free Qty</th>
                  <th className="px-4 py-3 min-w-[120px]">Batch No</th>
                  <th className="px-4 py-3 min-w-[150px]">Expiry Date</th>
                  <th className="px-4 py-3 min-w-[150px]">Notes</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => {
                  const ordered = toNum(field.orderedQty);
                  const alreadyReceived = toNum(field.alreadyReceivedQty);
                  const pending = Math.max(0, ordered - alreadyReceived);

                  return (
                    <tr key={field.id} className="border-b last:border-0 hover:bg-muted/10">
                      {/* Name */}
                      <td className="px-4 py-3 font-medium">
                        {field.itemName}
                        <div className="text-xs text-muted-foreground font-normal">
                          Ordered: {ordered} | Rcvd: {alreadyReceived}
                        </div>
                      </td>

                      {/* Pending */}
                      <td className="px-4 py-3 text-right text-amber-650 font-semibold">
                        {pending}
                      </td>

                      {/* Receiving Now */}
                      <td className="px-4 py-3">
                        <Field
                          type="number"
                          step="0.01"
                          className="w-full text-right"
                          {...form.register(`items.${index}.receivedQty` as const)}
                          error={form.formState.errors.items?.[index]?.receivedQty?.message}
                        />
                      </td>

                      {/* Free Qty */}
                      <td className="px-4 py-3">
                        <Field
                          type="number"
                          step="0.01"
                          className="w-full text-right font-medium"
                          {...form.register(`items.${index}.freeQty` as const)}
                          error={form.formState.errors.items?.[index]?.freeQty?.message}
                        />
                      </td>

                      {/* Batch */}
                      <td className="px-4 py-3">
                        <Field
                          placeholder="Batch no"
                          className="w-full"
                          {...form.register(`items.${index}.batch` as const)}
                          error={form.formState.errors.items?.[index]?.batch?.message}
                        />
                      </td>

                      {/* Expiry Date */}
                      <td className="px-4 py-3">
                        <Controller
                          control={form.control}
                          name={`items.${index}.expiryDate` as const}
                          render={({ field, fieldState }) => (
                            <div className="flex flex-col space-y-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full justify-start text-left font-normal bg-background px-3 h-9",
                                      !field.value && "text-muted-foreground",
                                      fieldState.error && "border-destructive"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                    {field.value ? format(new Date(field.value), "yyyy-MM-dd") : <span>Pick date</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    captionLayout="dropdown"
                                    startMonth={new Date(new Date().getFullYear() - 2, 0)}
                                    endMonth={new Date(new Date().getFullYear() + 10, 11)}
                                    selected={field.value ? new Date(field.value) : undefined}
                                    onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : null)}
                                  />
                                </PopoverContent>
                              </Popover>
                              {fieldState.error && <span className="text-xs text-destructive">{fieldState.error.message}</span>}
                            </div>
                          )}
                        />
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3">
                        <Field
                          placeholder="Notes..."
                          className="w-full"
                          {...form.register(`items.${index}.notes` as const)}
                          error={form.formState.errors.items?.[index]?.notes?.message}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      </fieldset>

      {/* Form Submission Actions */}
      <div className="flex justify-end gap-4">
        <Link to="/purchases/purchase-orders/$id" params={{ id: String(poId) }}>
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </Link>
        {isDraft && (
          <>
            <Button 
              type="button" 
              variant="outline"
              disabled={mutation.isPending}
              onClick={form.handleSubmit((values) => onSubmit(values as unknown as GRNFormValues, "draft"))}
            >
              <Save className="h-4 w-4 mr-2" /> Save Draft
            </Button>
            <Button 
              type="button" 
              disabled={mutation.isPending}
              onClick={form.handleSubmit((values) => onSubmit(values as unknown as GRNFormValues, "posted"))}
            >
              <Send className="h-4 w-4 mr-2" /> Post GRN
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
