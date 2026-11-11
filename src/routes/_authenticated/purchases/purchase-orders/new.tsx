import { createFileRoute } from "@tanstack/react-router";
import { ModuleLayout } from "../../../../components/ModuleLayout";
import { POForm } from "../../../../components/POForm";
import { ChevronLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/purchases/purchase-orders/new")({
  component: NewPurchaseOrderRoute,
});

function NewPurchaseOrderRoute() {
  return (
    <ModuleLayout
      title="Create Purchase Order"
      description="Enter the details below to create a new purchase order."
      action={
        <Link to="/purchases/purchase-orders" search={{ page: 1, limit: 10 }} className="flex items-center text-sm font-medium hover:underline">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to List
        </Link>
      }
    >
      <div className="max-w-6xl mx-auto py-6">
        <POForm mode="new" />
      </div>
    </ModuleLayout>
  );
}
