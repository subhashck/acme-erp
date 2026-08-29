import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { ChevronLeft, Loader2, Edit } from "lucide-react";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { GRNForm } from "@/components/GRNForm";

export const Route = createFileRoute("/_authenticated/purchases/grns/$grnId")({
  component: GRNDetailRoute,
});

function GRNDetailRoute() {
  const { grnId } = Route.useParams();

  const { data: grn, isLoading, error } = useRpcQuery<any>(
    ["grns", grnId],
    () => (client.grns as any)[":grnId"].$get({ param: { grnId } })
  );

  if (isLoading) {
    return (
      <ModuleLayout title="GRN Details" description="Loading...">
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </ModuleLayout>
    );
  }

  if (error || !grn) {
    return (
      <ModuleLayout title="GRN Details" description="Error loading GRN.">
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

  const isDraft = grn.status === "draft";
  const grnNumericId = parseInt(grnId as string, 10);

  return (
    <ModuleLayout
      title={`GRN Details: ${grn.grnNo || `#${grnId}`}`}
      description={`View Goods Receipt Note details ${grn.purchaseOrder ? `against PO #${grn.purchaseOrder.poNo || grn.poId}` : "(Direct GRN)"}`}
      action={
        <div className="flex items-center gap-2">
          {isDraft && (
            <Link to="/purchases/grns/$grnId/edit" params={{ grnId }}>
              <Button size="sm" className="gap-1.5 shadow-xs">
                <Edit className="h-4 w-4" /> Edit Draft
              </Button>
            </Link>
          )}
          <Link to="/purchases/grns">
            <Button variant="outline" size="sm" className="gap-1.5 shadow-xs">
              <ChevronLeft className="mr-1 h-4 w-4" /> Back to List
            </Button>
          </Link>
        </div>
      }
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Status:</span>
            <Badge
              variant={isDraft ? "secondary" : "default"}
              className={`capitalize text-xs font-mono ${!isDraft ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
            >
              {grn.status || "draft"}
            </Badge>
          </div>
        </div>

        <GRNForm
          mode={isDraft ? "edit" : "view"}
          grnId={grnNumericId}
          initialData={grn}
          po={grn.purchaseOrder}
          poId={grn.poId || undefined}
        />
      </div>
    </ModuleLayout>
  );
}
