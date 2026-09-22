import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/ui/button";
import { GRNForm } from "@/components/GRNForm";

export const Route = createFileRoute("/_authenticated/purchases/grns/new")({
  component: NewDirectGRNRoute,
});

function NewDirectGRNRoute() {
  return (
    <ModuleLayout
      title="Create Direct Goods Receipt Note (GRN)"
      description="Record goods received directly without an existing Purchase Order."
      action={
        <Link to="/purchases/grns">
          <Button variant="outline" size="sm" className="gap-1.5 shadow-xs">
            <ChevronLeft className="mr-1 h-4 w-4" /> Back to List
          </Button>
        </Link>
      }
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        <GRNForm mode="new" />
      </div>
    </ModuleLayout>
  );
}
