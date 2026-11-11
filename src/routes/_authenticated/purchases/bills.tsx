import { createFileRoute } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Receipt } from "lucide-react";

export const Route = createFileRoute("/_authenticated/purchases/bills")({
  component: Bills
});

function Bills() {
  return (
    <ModuleLayout
      title="Bills & Invoices"
      description="Track supplier invoices, payments, and billing schedules."
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader className="flex flex-row items-center gap-2">
            <Receipt className="text-primary size-5" />
            <CardTitle>Bills & Invoices Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No bills or invoices found. Click "Add Bill" to create a new entry.
            </p>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
