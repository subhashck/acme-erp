import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import * as React from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { Button } from "../../../ui/button";
import { ReportForm, ReportPayload } from "../../../components/ReportForm";

export const Route = createFileRoute("/_authenticated/reports/edit/$id")({
  component: EditReportForm,
});

function EditReportForm() {
  const { id } = Route.useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMsg, setErrorMsg] = React.useState("");

  // Load existing report
  const reportQuery = useRpcQuery<any>(
    ["daily-closing-report", id],
    () => client["daily-closing"].reports[":id"].$get({ param: { id } })
  );
  const report = reportQuery.data;

  const editMutation = useMutation({
    mutationFn: async (payload: ReportPayload) => {
      const response = await (client["daily-closing"].reports as any)[":id"].$put({
        param: { id },
        json: payload,
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-closing-reports"] });
      queryClient.invalidateQueries({ queryKey: ["daily-closing-report", id] });
      router.navigate({ to: "/reports/$id", params: { id } });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || "Failed to save closing report changes");
    },
  });

  // Guard: loading
  if (reportQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading statement properties...
      </div>
    );
  }

  // Guard: not found
  if (!report) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-6 rounded-lg border border-rose-200 text-center">
        Report not found.
      </div>
    );
  }

  // Guard: non-draft
  if (report.status !== "draft") {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 p-6 rounded-lg border border-amber-200 text-center space-y-4">
        <AlertTriangle className="size-8 mx-auto" />
        <h4 className="font-extrabold text-base">Editing Not Allowed</h4>
        <p className="text-xs max-w-md mx-auto">
          This report is currently in <strong>{report.status.toUpperCase()}</strong> status. Only draft logs can be edited or deleted.
        </p>
        <Button
          onClick={() => router.navigate({ to: "/reports/$id", params: { id } })}
          variant="outline"
          size="default"
          className="cursor-pointer font-semibold"
        >
          Return to statement
        </Button>
      </div>
    );
  }

  const header = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" asChild className="cursor-pointer">
        <Link to="/reports/$id" params={{ id }}>
          <ArrowLeft size={16} />
        </Link>
      </Button>
      <div>
        <h3 className="text-2xl font-extrabold tracking-tight">Edit Closing Statement</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Editing logged draft statement for date {report.reportDate}</p>
      </div>
    </div>
  );

  return (
    <ReportForm
      mode="edit"
      lockedReportDate={report.reportDate}
      initialData={report}
      header={header}
      onSubmit={(payload) => {
        setErrorMsg("");
        editMutation.mutate(payload);
      }}
      isPending={editMutation.isPending}
      errorMsg={errorMsg}
    />
  );
}
