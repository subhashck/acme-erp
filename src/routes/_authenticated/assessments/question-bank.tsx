import React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  ShieldAlert,
  ArrowLeft,
  Award,
  Lock,
} from "lucide-react";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { useUserPermissions } from "../../../lib/permissions";
import { QuestionBankTab } from "../../../components/assessments/QuestionBankTab";
import { Button } from "../../../ui/button";
import { Badge } from "../../../ui/badge";

export const Route = createFileRoute("/_authenticated/assessments/question-bank")({
  component: QuestionBankPage,
});

function QuestionBankPage() {
  const { isAdmin, isHr } = useUserPermissions();
  const canAccess = Boolean(isAdmin || isHr);

  if (!canAccess) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="p-8 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 text-center space-y-4 shadow-sm">
          <div className="size-14 mx-auto rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Lock size={26} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-foreground">Access Restricted</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              The NABH Theoretical Question Bank contains active examination questions, answer keys, and passing thresholds.
              Access is strictly restricted to <span className="font-semibold text-foreground">Human Resources (HR)</span> and <span className="font-semibold text-foreground">System Administrators</span>.
            </p>
          </div>
          <div className="pt-2">
            <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
              <Link to="/assessments">
                <ArrowLeft size={13} />
                Return to Assessments
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ModuleLayout
      title="NABH Theoretical Question Bank"
      description="Manage examination questions, clinical rationales and department tags for staff competency assessments. CBT configuration is available in Assessment Settings."
      action={
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="text-xs gap-1.5">
            <Link to="/assessments">
              <ArrowLeft size={14} />
              Assessments Home
            </Link>
          </Button>
        </div>
      }
    >
      <QuestionBankTab />
    </ModuleLayout>
  );
}
