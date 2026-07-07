import { createFileRoute, useRouter } from "@tanstack/react-router";
import * as React from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { client } from "../../../services/rpc";
import { ReportForm, ReportPayload } from "../../../components/ReportForm";

export const Route = createFileRoute("/_authenticated/reports/new")({
  component: NewReportForm,
});

function NewReportForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = React.useState("");

  const createMutation = useMutation({
    mutationFn: async (payload: ReportPayload) => {
      const response = await client["daily-closing"].reports.$post({ json: payload as any });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-closing-reports"] });
      router.navigate({ to: "/reports" });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to create closing report");
    },
  });

  const header = (
    <div>
      <h3 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent dark:from-teal-400 dark:to-emerald-400">
        New closing report
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter daily service metrics, pharmacy collections, and reconcile payment channels.
      </p>
    </div>
  );

  return (
    <ReportForm
      mode="new"
      header={header}
      onSubmit={(payload) => {
        setErrorMsg("");
        createMutation.mutate(payload);
      }}
      isPending={createMutation.isPending}
      errorMsg={errorMsg}
    />
  );
}
