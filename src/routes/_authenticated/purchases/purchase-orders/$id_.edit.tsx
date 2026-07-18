import { createFileRoute } from "@tanstack/react-router";
import { ModuleLayout } from "../../../../components/ModuleLayout";
import { POForm } from "../../../../components/POForm";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useRpcQuery } from "../../../../lib/query";
import { client } from "../../../../services/rpc";
import * as React from "react";

export const Route = createFileRoute("/_authenticated/purchases/purchase-orders/$id_/edit")({
  component: EditPurchaseOrderRoute,
});

function EditPurchaseOrderRoute() {
  const { id } = Route.useParams();
  
  const { data: po, isLoading, error } = useRpcQuery(
    ["purchase-orders", id], 
    () => client["purchase-orders"][":id"].$get({ param: { id } })
  );

  return (
    <ModuleLayout
      title={`Edit PO #${id}`}
      description="Modify the purchase order details below."
      action={
        <Link to="/purchases/purchase-orders" search={{ page: 1, limit: 10 }} className="flex items-center text-sm font-medium hover:underline">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to List
        </Link>
      }
    >
      <div className="max-w-6xl mx-auto py-6">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center text-destructive p-12">Failed to load PO</div>
        ) : po ? (
          <POForm mode="edit" poId={parseInt(id, 10)} initialData={po} />
        ) : null}
      </div>
    </ModuleLayout>
  );
}
