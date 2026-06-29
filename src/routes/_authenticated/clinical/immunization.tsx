import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Syringe, CalendarClock, ClipboardList, Plus, RefreshCw } from "lucide-react";
import { ModuleLayout } from "@/components/ModuleLayout";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import { useRpcQuery, queryClient } from "@/lib/query";
import { client } from "@/services/rpc";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";

export const Route = createFileRoute("/_authenticated/clinical/immunization")({
  component: ImmunizationPage,
});

type PatientOption = {
  id: number;
  mrn: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
};

type ScheduleRow = {
  id: number;
  vaccineCode: string;
  vaccineName: string;
  doseLabel: string;
  beneficiaryType: string;
  dueAgeLabel: string;
  doseAmount: string;
  route: string;
  site: string;
  appliesIn: string;
  notes: string | null;
};

type ImmunizationRecord = {
  id: number;
  scheduleId: number | null;
  vaccineCode: string;
  vaccineName: string;
  doseLabel: string;
  administeredAt: string;
  batchNo: string | null;
  manufacturer: string | null;
  site: string | null;
  route: string | null;
  adverseEvent: string | null;
  notes: string | null;
  status: string;
  staffName: string | null;
};

type PatientImmunization = {
  patient: PatientOption & { address: string; bloodGroup: string | null; allergies: string | null };
  records: ImmunizationRecord[];
  due: (ScheduleRow & { dueDate: string; status: "Due" | "Overdue" })[];
};

type StaffOption = { id: number; name: string; employeeCode: string };

function ImmunizationPage() {
  const [patientSearch, setPatientSearch] = React.useState("");
  const [selectedPatientId, setSelectedPatientId] = React.useState<number | null>(null);
  const [scheduleId, setScheduleId] = React.useState("");
  const [administeredAt, setAdministeredAt] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [administeredByStaffId, setAdministeredByStaffId] = React.useState("");
  const [batchNo, setBatchNo] = React.useState("");
  const [manufacturer, setManufacturer] = React.useState("");
  const [adverseEvent, setAdverseEvent] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const patientsQuery = useRpcQuery<PatientOption[]>(
    ["immunization-patients", patientSearch],
    () => client.immunization.patients.$get({ query: { search: patientSearch } })
  );

  const scheduleQuery = useRpcQuery<ScheduleRow[]>(["immunization-schedule"], () =>
    client.immunization.schedule.$get()
  );

  const staffQuery = useRpcQuery<StaffOption[]>(["staff"], () => client.hr.staff.$get());

  const patientQuery = useRpcQuery<PatientImmunization>(
    ["immunization-patient", selectedPatientId],
    () => client.immunization.patients[":id"].$get({ param: { id: String(selectedPatientId) } }),
    { enabled: Boolean(selectedPatientId) }
  );

  const selectedSchedule = (scheduleQuery.data ?? []).find((item) => String(item.id) === scheduleId);
  const selectedPatient = patientQuery.data?.patient;
  const dueCount = patientQuery.data?.due.filter((item) => item.status === "Due").length ?? 0;
  const overdueCount = patientQuery.data?.due.filter((item) => item.status === "Overdue").length ?? 0;

  const submitRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPatientId || !selectedSchedule) {
      alert("Select a patient and vaccine dose.");
      return;
    }

    setSaving(true);
    try {
      const response = await client.immunization.records.$post({
        json: {
          patientId: selectedPatientId,
          scheduleId: selectedSchedule.id,
          vaccineCode: selectedSchedule.vaccineCode,
          vaccineName: selectedSchedule.vaccineName,
          doseLabel: selectedSchedule.doseLabel,
          administeredAt,
          administeredByStaffId: administeredByStaffId ? Number(administeredByStaffId) : null,
          batchNo,
          manufacturer,
          site: selectedSchedule.site,
          route: selectedSchedule.route,
          adverseEvent,
          notes,
          status: "Administered",
        },
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        alert(error.error || "Unable to save immunization record.");
        return;
      }

      setScheduleId("");
      setBatchNo("");
      setManufacturer("");
      setAdverseEvent("");
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["immunization-patient", selectedPatientId] });
    } finally {
      setSaving(false);
    }
  };

  const recordColumns: ColumnDef<ImmunizationRecord>[] = [
    ["administeredAt", "Date"],
    {
      id: "vaccine",
      label: "Vaccine",
      sortKey: "vaccineName",
      render: (row) => (
        <div>
          <div className="font-semibold">{row.vaccineName}</div>
          <div className="text-xs text-muted-foreground">{row.doseLabel}</div>
        </div>
      ),
    },
    ["batchNo", "Batch"],
    ["manufacturer", "Manufacturer"],
    {
      id: "routeSite",
      label: "Route / Site",
      render: (row) => `${row.route ?? "-"} / ${row.site ?? "-"}`,
    },
    {
      id: "staffName",
      label: "Given by",
      render: (row) => row.staffName || "-",
    },
    {
      id: "status",
      label: "Status",
      render: (row) => <Badge>{row.status}</Badge>,
    },
  ];

  const scheduleColumns: ColumnDef<ScheduleRow>[] = [
    ["vaccineName", "Vaccine"],
    ["doseLabel", "Dose"],
    ["beneficiaryType", "Beneficiary"],
    ["dueAgeLabel", "When"],
    ["doseAmount", "Dose"],
    ["route", "Route"],
    ["site", "Site"],
    ["appliesIn", "Applies in"],
  ];

  return (
    <ModuleLayout
      title="Immunization History"
      description="Track patient vaccine doses against India's Universal Immunization Programme schedule, including route, site, batch, and adverse-event notes."
    >
      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList size={18} />
                Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={patientSearch}
                onChange={(event) => setPatientSearch(event.target.value)}
                placeholder="Search MRN, name, or phone"
              />
              <div className="max-h-72 overflow-auto rounded-md border">
                {(patientsQuery.data ?? []).map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`flex w-full flex-col items-start gap-1 border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted ${
                      selectedPatientId === patient.id ? "bg-muted" : ""
                    }`}
                  >
                    <span className="font-semibold">{patient.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {patient.mrn} · {patient.age} yrs · {patient.gender}
                    </span>
                  </button>
                ))}
                {!patientsQuery.data?.length && (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">No patients found</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Plus size={18} />
                Record Dose
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={submitRecord}>
                <label className="block text-sm font-medium">
                  Vaccine dose
                  <select
                    value={scheduleId}
                    onChange={(event) => setScheduleId(event.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select dose</option>
                    {(scheduleQuery.data ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.vaccineName} - {item.doseLabel} ({item.dueAgeLabel})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium">
                  Administered date
                  <Input type="date" value={administeredAt} onChange={(event) => setAdministeredAt(event.target.value)} className="mt-1" />
                </label>
                <label className="block text-sm font-medium">
                  Staff
                  <select
                    value={administeredByStaffId}
                    onChange={(event) => setAdministeredByStaffId(event.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Not selected</option>
                    {(staffQuery.data ?? []).map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} ({staff.employeeCode})
                      </option>
                    ))}
                  </select>
                </label>
                <Input value={batchNo} onChange={(event) => setBatchNo(event.target.value)} placeholder="Batch number" />
                <Input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} placeholder="Manufacturer" />
                <Input value={adverseEvent} onChange={(event) => setAdverseEvent(event.target.value)} placeholder="Adverse event, if any" />
                <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Clinical notes" />
                {selectedSchedule && (
                  <div className="rounded-md border bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
                    {selectedSchedule.doseAmount} · {selectedSchedule.route} · {selectedSchedule.site}
                  </div>
                )}
                <Button type="submit" disabled={saving || !selectedPatientId || !scheduleId} className="w-full">
                  {saving ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Syringe size={16} className="mr-2" />}
                  Save Dose
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Selected patient</div>
                <div className="mt-2 text-xl font-bold">{selectedPatient?.name ?? "None"}</div>
                <div className="mt-1 text-xs text-muted-foreground">{selectedPatient?.mrn ?? "Choose a patient to view history"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                  <CalendarClock size={14} />
                  Due
                </div>
                <div className="mt-2 text-2xl font-bold">{dueCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Overdue</div>
                <div className="mt-2 text-2xl font-bold text-destructive">{overdueCount}</div>
              </CardContent>
            </Card>
          </div>

          {patientQuery.data && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Due and Overdue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {patientQuery.data.due.map((item) => (
                  <div key={item.id} className="flex flex-col gap-2 rounded-md border px-3 py-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-semibold">{item.vaccineName} · {item.doseLabel}</div>
                      <div className="text-xs text-muted-foreground">
                        Due {item.dueDate} · {item.route} · {item.site}
                      </div>
                    </div>
                    <Badge variant={item.status === "Overdue" ? "destructive" : "default"}>{item.status}</Badge>
                  </div>
                ))}
                {!patientQuery.data.due.length && <div className="py-4 text-sm text-muted-foreground">No due doses for the current schedule.</div>}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dose History</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <DataTable rows={patientQuery.data?.records ?? []} columns={recordColumns} enableFiltering enableSorting filterPlaceholder="Search history" isLoading={patientQuery.isLoading} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">India UIP Schedule Reference</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <DataTable rows={scheduleQuery.data ?? []} columns={scheduleColumns} enableFiltering enableSorting filterPlaceholder="Search vaccine schedule" isLoading={scheduleQuery.isLoading} />
            </CardContent>
          </Card>
        </div>
      </div>
    </ModuleLayout>
  );
}
