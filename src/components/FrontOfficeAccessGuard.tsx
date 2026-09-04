import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft, Loader2 } from "lucide-react";
import { useUserPermissions } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";

export function FrontOfficeAccessGuard({ children }: { children: React.ReactNode }) {
  const { canViewFrontOffice, isLoading } = useUserPermissions();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 dark:text-teal-400" />
        <p className="text-sm font-medium">Verifying access permissions...</p>
      </div>
    );
  }

  if (!canViewFrontOffice) {
    return (
      <div className="p-6 max-w-2xl mx-auto mt-12">
        <Card className="border-destructive/30 bg-destructive/5 shadow-lg">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <CardTitle className="text-xl font-bold text-destructive">
              Access Restricted
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              You do not have permission to access the Front Office Module.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              This module is strictly restricted to authorized administrators and members of the <strong>Front Office</strong> department.
            </p>
            <div className="pt-2 flex justify-center">
              <Button asChild variant="outline" className="gap-2">
                <Link to="/">
                  <ArrowLeft className="w-4 h-4" /> Return to Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
