import { createFileRoute } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Scale } from "lucide-react";

export const Route = createFileRoute("/_authenticated/purchases/unit-types")({
  component: UnitTypes
});

function UnitTypes() {
  return (
    <ModuleLayout
      title="Unit Types Master"
      description="Manage units of measurement (e.g. Kg, Pcs, Boxes, Litres)."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader className="flex flex-row items-center gap-2">
            <Scale className="text-primary size-5" />
            <CardTitle>Unit Types Listing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No unit types registered. Click "Add Unit Type" to define a new unit.
            </p>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
