import { createFileRoute, Link } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/ui/button";
import { GRNForm } from "@/components/GRNForm";
import * as React from "react";

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
        <div className="flex flex-col items-center justify-center p-16 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Fetching Purchase Order data & catalog items...</p>
        </div>
      </ModuleLayout>
    );
  }

  if (error || !po) {
    return (
      <ModuleLayout title="Receive Goods" description="Error loading purchase order.">
        <div className="text-center text-destructive p-12 bg-destructive/5 rounded-xl border border-destructive/20 max-w-lg mx-auto my-8">
          <p className="font-semibold text-base mb-2">Failed to load Purchase Order</p>
          <p className="text-sm text-muted-foreground mb-6">The requested PO may not exist or could not be loaded.</p>
          <Link to="/purchases/purchase-orders" search={{ page: 1, limit: 10 }}>
            <Button variant="outline" className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Back to Purchase Orders
            </Button>
          </Link>
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Create Goods Receipt Note (GRN)"
      description={`Receiving items against PO #${po.poNo || id}`}
      action={
        <Link to="/purchases/purchase-orders/$id" params={{ id }}>
          <Button variant="outline" size="sm" className="gap-1.5 shadow-xs">
            <ChevronLeft className="h-4 w-4" /> Back to PO Details
          </Button>
        </Link>
      }
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <GRNForm mode="new" po={po} poId={parseInt(id, 10)} />
      </div>
    </ModuleLayout>
  );
}
