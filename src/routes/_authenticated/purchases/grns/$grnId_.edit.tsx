import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/ui/button";
import { GRNForm } from "@/components/GRNForm";

export const Route = createFileRoute("/_authenticated/purchases/grns/$grnId_/edit")({
  component: EditGRNRoute,
});

function EditGRNRoute() {
  const { grnId } = Route.useParams();

  // 1. Fetch GRN first to get the poId & existing data
  const { data: grn, isLoading: isLoadingGrn, error: errorGrn } = useRpcQuery<any>(
    ["grns", grnId],
    () => (client.grns as any)[":grnId"].$get({ param: { grnId } })
  );

  // 2. Fetch PO details using the poId from the GRN if present
  const poId = grn?.poId ? String(grn.poId) : "";
  const { data: po, isLoading: isLoadingPo, error: errorPo } = useRpcQuery<any>(
    ["purchase-orders", poId],
    () => client["purchase-orders"][":id"].$get({ param: { id: poId } }),
    { enabled: !!poId }
  );

  if (isLoadingGrn || (poId && isLoadingPo)) {
    return (
      <ModuleLayout title="Edit Goods Receipt Note" description="Loading GRN details...">
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (errorGrn || errorPo || !grn || (!!poId && !po)) {
    return (
      <ModuleLayout title="Edit GRN" description="Error loading GRN.">
        <div className="text-center text-destructive p-12 bg-destructive/5 rounded-xl border border-destructive/20 max-w-lg mx-auto my-8">
          <p className="font-semibold text-base mb-2">Failed to load GRN details</p>
          <p className="text-sm text-muted-foreground mb-6">Make sure the GRN exists or try again.</p>
          <Link to="/purchases/grns">
            <Button variant="outline" className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Back to List
            </Button>
          </Link>
        </div>
      </ModuleLayout>
    );
  }

  const isPosted = grn.status === "posted";
  const grnNumericId = parseInt(grnId as string, 10);
  const title = isPosted
    ? `GRN: ${grn.grnNo || `#${grnId}`} (Posted - Locked)`
    : po
      ? `Edit GRN: ${grn.grnNo || `#${grnId}`} (PO #${po.poNo || poId})`
      : `Edit GRN: ${grn.grnNo || `#${grnId}`}`;

  const description = isPosted
    ? "This Goods Receipt Note has already been posted to inventory and cannot be modified."
    : "Modify Goods Receipt Note (GRN) details.";

  return (
    <ModuleLayout
      title={title}
      description={description}
      action={
        <Link to="/purchases/grns/$grnId" params={{ grnId }}>
          <Button variant="outline" size="sm" className="gap-1.5 shadow-xs">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Details
          </Button>
        </Link>
      }
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <GRNForm
          mode={isPosted ? "view" : "edit"}
          grnId={grnNumericId}
          initialData={grn}
          po={po}
          poId={poId ? parseInt(poId, 10) : undefined}
        />
      </div>
    </ModuleLayout>
  );
}
