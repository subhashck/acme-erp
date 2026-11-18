import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  User,
  CheckCircle2,
  Calendar,
  Building2,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/ui/badge";
import { formatDateDdMonYyyy } from "../../../utils/format";

export const Route = createFileRoute("/verify/id/$token")({
  component: IdVerificationPage,
});

function IdVerificationPage() {
  const { token } = Route.useParams();

  const { data, isLoading, isError, error } = useQuery<any>({
    queryKey: ["public-id-verify", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/id-verify/${encodeURIComponent(token)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Credential not found");
      return body;
    },
    retry: 1,
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card text-card-foreground rounded-2xl shadow-xl border border-border overflow-hidden">
        {/* Header Branding */}
        <div className="bg-primary text-primary-foreground p-6 text-center relative">
          <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xs flex items-center justify-center mx-auto mb-2 border border-white/20">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-base font-bold tracking-tight uppercase">
            {data?.institution?.name || "ACME Healthcare System"}
          </h1>
          <p className="text-xs text-primary-foreground/90 mt-0.5">
            Official Credential Verification Portal
          </p>
        </div>

        {/* Verification Body */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Verifying credential with central cryptographic registry...
            </div>
          ) : isError || !data ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
                <ShieldX className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-destructive">Unverified Credential</h2>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {(error as any)?.message ||
                  "This ID card could not be validated against ACME ERP records. It may be expired, revoked, or counterfeit."}
              </p>
            </div>
          ) : (
            <>
              {/* Status Banner */}
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                  data.valid
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}
              >
                {data.valid ? (
                  <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-7 h-7 text-destructive shrink-0" />
                )}
                <div>
                  <h3 className="text-sm font-bold">
                    {data.valid ? "Verified Authentic Credential" : `Credential ${data.status?.toUpperCase()}`}
                  </h3>
                  <p className="text-xs opacity-90">
                    {data.valid
                      ? "Officially issued & currently active."
                      : "This card is no longer valid for entry or identification."}
                  </p>
                </div>
              </div>

              {/* Cardholder Profile */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border">
                <div className="w-16 h-20 rounded-lg border-2 border-primary/30 overflow-hidden bg-muted flex items-center justify-center shrink-0 shadow-xs">
                  {data.photoUrl ? (
                    <img
                      src={data.photoUrl}
                      alt={data.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-extrabold text-foreground uppercase tracking-tight truncate">
                    {data.name}
                  </h2>
                  <p className="text-xs font-bold text-primary truncate">
                    {data.role || "Affiliated Member"}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    ID: <span className="font-bold text-foreground">{data.code}</span>
                  </p>
                  {data.department && (
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                      {data.department}
                    </p>
                  )}
                </div>
              </div>

              {/* Credential Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg border border-border bg-muted/20">
                  <span className="text-[10px] text-muted-foreground font-medium block">Card Serial</span>
                  <span className="font-mono font-bold text-foreground">
                    {data.cardSerialNo}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border border-border bg-muted/20">
                  <span className="text-[10px] text-muted-foreground font-medium block">Category</span>
                  <span className="capitalize font-semibold text-foreground">
                    {data.entityType} ID
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border border-border bg-muted/20">
                  <span className="text-[10px] text-muted-foreground font-medium block">Issued Date</span>
                  <span className="font-medium text-foreground">
                    {formatDateDdMonYyyy(data.issueDate)}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg border border-border bg-muted/20">
                  <span className="text-[10px] text-muted-foreground font-medium block">Valid Until</span>
                  <span className="font-medium text-foreground">
                    {formatDateDdMonYyyy(data.validUntil) || "Standard Validity"}
                  </span>
                </div>

                {data.bloodGroup && (
                  <div className="col-span-2 p-2.5 rounded-lg border border-border bg-muted/20 flex justify-between items-center">
                    <span className="text-[11px] text-muted-foreground font-medium">Blood Group:</span>
                    <span className="font-mono font-bold text-destructive">{data.bloodGroup}</span>
                  </div>
                )}
              </div>

              {/* Timestamp & Verification Seal */}
              <div className="text-center pt-2 border-t border-border text-[11px] text-muted-foreground space-y-1">
                <p className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Live Verified against ACME ERP Central Ledger
                </p>
                <p>Checked at: {new Date(data.verifiedAt).toLocaleString("en-IN")}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
