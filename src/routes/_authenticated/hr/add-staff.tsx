import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { ArrowLeft, BriefcaseBusiness, Check, ChevronLeft, ChevronRight, IdCard, Plus, Save, UserRound, Trash2 } from "lucide-react";
import { useForm, useFieldArray, type FieldPath } from "react-hook-form";
import { z } from "zod";
import { Field } from "../../../components/Field";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { queryClient, useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Select } from "../../../ui/select";
import type { RoleTypeRow, DepartmentRow, StaffRow } from "../../../types";
import { cn } from "../../../utils/cn";

export const Route = createFileRoute("/_authenticated/hr/add-staff")({
  validateSearch: z.object({ staffId: z.number().optional() }),
  component: AddStaff
});

const staffSchema = z.object({
  name: z.string().min(2, "Enter the employee name"),
  role: z.string().min(2, "Select a role"),
  departmentId: z.coerce.number().positive("Select a department"),
  phone: z.string().min(7, "Enter a valid phone number"),
  email: z.string().email("Enter a valid email"),
  status: z.enum(["Active", "Terminated", "Long Leave", "Resigned"]),
  aadhar: z.string().regex(/^[2-9]\d{11}$/, "Aadhar must be a valid 12-digit number and cannot start with 0 or 1"),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, "Invalid PAN format").transform((val) => val.toUpperCase()),
  fatherName: z.string().optional(),
  motherName: z.string().optional(),
  epfNumber: z.string().optional(),
  esiNumber: z.string().optional(),
  educationHistory: z.array(z.object({
    qualification: z.string().optional(),
    institution: z.string().optional(),
    year: z.string().optional(),
    grade: z.string().optional()
  })).default([]),
  professionalHistory: z.array(z.object({
    employer: z.string().optional(),
    designation: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    responsibilities: z.string().optional()
  })).default([]),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  dateOfJoining: z.string().optional(),
  lastWorkingDate: z.string().optional()
});

type StaffFormInput = z.input<typeof staffSchema>;
type StaffFormValues = z.output<typeof staffSchema>;

const steps: {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  fields: FieldPath<StaffFormInput>[];
}[] = [
  {
    title: "Personal",
    description: "Name, contact, family and history",
    icon: UserRound,
    fields: ["name", "phone", "email", "fatherName", "motherName", "educationHistory", "professionalHistory"]
  },
  {
    title: "Employment",
    description: "Role, department and dates",
    icon: BriefcaseBusiness,
    fields: ["role", "departmentId", "status", "dateOfJoining", "lastWorkingDate"]
  },
  {
    title: "Compliance & Bank",
    description: "Statutory IDs and Bank Details",
    icon: IdCard,
    fields: ["aadhar", "pan", "epfNumber", "esiNumber", "bankName", "accountNumber", "ifscCode"]
  }
];

const defaultValues: Partial<StaffFormInput> = {
  status: "Active",
  aadhar: "",
  pan: "",
  fatherName: "",
  motherName: "",
  epfNumber: "",
  esiNumber: "",
  educationHistory: [],
  professionalHistory: [],
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  dateOfJoining: "",
  lastWorkingDate: ""
};

function AddStaff() {
  const navigate = useNavigate();
  const { staffId } = Route.useSearch();
  const isEditing = !!staffId;
  const [stepIndex, setStepIndex] = React.useState(0);

  const rolesQuery = useRpcQuery<RoleTypeRow[]>(["masters-roles"], () => client.masters.roles.$get());
  const activeRoles = (rolesQuery.data ?? []).filter((r) => r.active).map((r) => r.name);

  const deptsQuery = useRpcQuery<DepartmentRow[]>(["departments"], () => client.departments.$get());
  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () => client.hr.staff.$get());
  const banksQuery = useRpcQuery<any[]>(["masters-banks"], () => client.masters.banks.$get());

  const deptOptions = (deptsQuery.data ?? []).map((d) => [String(d.id), d.name] as [string, string]);
  const activeBanks = (banksQuery.data ?? []).filter((b) => b.active).map((b) => b.name);

  const existingStaff = staffId ? staffQuery.data?.find((s) => s.id === staffId) : undefined;
  
  // Need to fetch hr profile for editing
  const hrProfileQuery = useRpcQuery<any>(["staff-hr-profile", staffId], () => client.hr.staff[":id"].profile.$get({ param: { id: String(staffId) } }), { enabled: isEditing });

  const form = useForm<StaffFormInput, unknown, StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues
  });

  const { fields: edFields, append: appendEd, remove: removeEd } = useFieldArray({
    control: form.control,
    name: "educationHistory"
  });

  const { fields: proFields, append: appendPro, remove: removePro } = useFieldArray({
    control: form.control,
    name: "professionalHistory"
  });

  const currentStep = steps[stepIndex];
  const isLastStep = stepIndex === steps.length - 1;
  const isLoading = rolesQuery.isLoading || deptsQuery.isLoading || banksQuery.isLoading || (isEditing && (staffQuery.isLoading || hrProfileQuery.isLoading));

  React.useEffect(() => {
    if (existingStaff) {
      const profile = hrProfileQuery.data;
      form.reset({
        name: existingStaff.name,
        role: existingStaff.role,
        departmentId: existingStaff.departmentId ?? undefined,
        phone: existingStaff.phone ?? "",
        email: existingStaff.email ?? "",
        status: existingStaff.status as StaffFormInput["status"],
        aadhar: existingStaff.aadhar ?? "",
        pan: existingStaff.pan ?? "",
        fatherName: profile?.fatherName ?? "",
        motherName: profile?.motherName ?? "",
        epfNumber: profile?.epfNumber ?? "",
        esiNumber: profile?.esiNumber ?? "",
        educationHistory: Array.isArray(profile?.educationHistory) ? profile.educationHistory : [],
        professionalHistory: Array.isArray(profile?.professionalHistory) ? profile.professionalHistory : [],
        bankName: (existingStaff as any).bankName ?? "",
        accountNumber: (existingStaff as any).accountNumber ?? "",
        ifscCode: (existingStaff as any).ifscCode ?? "",
        dateOfJoining: profile?.dateOfJoining ?? "",
        lastWorkingDate: profile?.lastWorkingDate ?? ""
      });
    }
  }, [existingStaff, hrProfileQuery.data, form]);

  const goNext = async () => {
    const valid = await form.trigger(currentStep.fields);
    if (valid) setStepIndex((value) => Math.min(value + 1, steps.length - 1));
  };

  const goBack = () => setStepIndex((value) => Math.max(value - 1, 0));

  const submit = form.handleSubmit(async (values) => {
    try {
      const payload = {
        name: values.name,
        role: values.role,
        departmentId: values.departmentId,
        phone: values.phone,
        email: values.email,
        status: values.status,
        aadhar: values.aadhar,
        pan: values.pan,
        bankName: values.bankName,
        accountNumber: values.accountNumber,
        ifscCode: values.ifscCode,
        hrProfile: {
          fatherName: values.fatherName,
          motherName: values.motherName,
          epfNumber: values.epfNumber,
          esiNumber: values.esiNumber,
          dateOfJoining: values.dateOfJoining,
          lastWorkingDate: values.lastWorkingDate,
          educationHistory: values.educationHistory,
          professionalHistory: values.professionalHistory
        }
      };
      
      const res = isEditing
        ? await client.hr.staff[":id"].$put({ param: { id: String(staffId) }, json: payload } as any)
        : await client.hr.staff.$post({ json: payload } as any);

      if (!res.ok) {
        const errData = (await res.json().catch(() => null)) as any;
        throw new Error(errData?.error || `HTTP error ${res.status}`);
      }

      form.reset(defaultValues);
      setStepIndex(0);
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate({ to: "/hr/staff-list" });
    } catch (err) {
      alert("Failed to save staff details: " + (err instanceof Error ? err.message : String(err)));
    }
  });

  if (isLoading) {
    return (
      <ModuleLayout title={isEditing ? "Edit Staff" : "Add Staff"} description="Loading form data...">
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </ModuleLayout>
    );
  }

  if (isEditing && !existingStaff) {
    return (
      <ModuleLayout title="Edit Staff" description="Employee not found.">
        <Card className="mx-auto mt-8 max-w-2xl">
          <CardContent className="pt-6 text-center">
            <p className="mb-4 text-muted-foreground">The requested staff record could not be found.</p>
            <Button onClick={() => navigate({ to: "/hr/staff-list" })}>
              <ArrowLeft size={16} className="mr-2" /> Back to HR Management
            </Button>
          </CardContent>
        </Card>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title={isEditing ? "Edit Staff" : "Add Staff"}
      description={isEditing ? "Update the employee profile, reporting line, and statutory IDs." : "Create a complete HR staff record."}
    >
      <form id="staff-form" onSubmit={submit} className="mx-auto max-w-6xl space-y-5">
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const active = index === stepIndex;
            const complete = index < stepIndex;
            return (
              <button
                key={step.title}
                type="button"
                onClick={async () => {
                  if (index <= stepIndex) {
                    setStepIndex(index);
                    return;
                  }
                  const valid = await form.trigger(steps.slice(0, index).flatMap((item) => item.fields));
                  if (valid) setStepIndex(index);
                }}
                className={cn(
                  "flex min-h-20 items-center gap-3 rounded-lg border bg-card p-3 text-left transition",
                  active && "border-primary bg-primary/5",
                  complete && "border-emerald-500/40 bg-emerald-500/5"
                )}
              >
                <span className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-md border",
                  active ? "border-primary bg-primary text-primary-foreground" : complete ? "border-emerald-500 bg-emerald-500 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {complete ? <Check size={18} /> : <Icon size={18} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{step.title}</span>
                  <span className="block text-xs leading-5 text-muted-foreground">{step.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <currentStep.icon size={18} />
              {currentStep.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {stepIndex === 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full Name" {...form.register("name")} error={form.formState.errors.name?.message} />
                <Field label="Phone" {...form.register("phone")} error={form.formState.errors.phone?.message} />
                <Field label="Email" type="email" className="md:col-span-2" {...form.register("email")} error={form.formState.errors.email?.message} />
                <Field label="Father's Name" {...form.register("fatherName")} error={form.formState.errors.fatherName?.message} />
                <Field label="Mother's Name" {...form.register("motherName")} error={form.formState.errors.motherName?.message} />
                
                <div className="md:col-span-2 mt-4">
                  <div className="flex items-center justify-between border-b pb-2 mb-4">
                    <h3 className="font-semibold">Education History</h3>
                    <Button type="button" variant="outline" onClick={() => appendEd({ qualification: "", institution: "", year: "", grade: "" })}>
                      <Plus size={16} className="mr-2" /> Add Education
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {edFields.map((field, i) => (
                      <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-start">
                        <Field placeholder="Qualification (e.g. B.Tech)" {...form.register(`educationHistory.${i}.qualification`)} />
                        <Field placeholder="Institution" {...form.register(`educationHistory.${i}.institution`)} />
                        <Field placeholder="Year" {...form.register(`educationHistory.${i}.year`)} />
                        <Field placeholder="Grade/Score" {...form.register(`educationHistory.${i}.grade`)} />
                        <Button type="button" variant="ghost" size="icon" className="text-destructive mt-1 md:mt-0" onClick={() => removeEd(i)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    ))}
                    {edFields.length === 0 && <p className="text-sm text-muted-foreground">No education history added.</p>}
                  </div>
                </div>

                <div className="md:col-span-2 mt-4">
                  <div className="flex items-center justify-between border-b pb-2 mb-4">
                    <h3 className="font-semibold">Professional History</h3>
                    <Button type="button" variant="outline" onClick={() => appendPro({ employer: "", designation: "", from: "", to: "", responsibilities: "" })}>
                      <Plus size={16} className="mr-2" /> Add Experience
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {proFields.map((field, i) => (
                      <div key={field.id} className="flex flex-col gap-2 p-4 border rounded-lg relative bg-muted/10">
                        <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-destructive" onClick={() => removePro(i)}>
                          <Trash2 size={16} />
                        </Button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mr-8">
                           <Field label="Employer" {...form.register(`professionalHistory.${i}.employer`)} />
                           <Field label="Designation" {...form.register(`professionalHistory.${i}.designation`)} />
                           <Field label="From (Year/Month)" {...form.register(`professionalHistory.${i}.from`)} />
                           <Field label="To (Year/Month)" {...form.register(`professionalHistory.${i}.to`)} />
                           <div className="md:col-span-2">
                             <Field label="Responsibilities" {...form.register(`professionalHistory.${i}.responsibilities`)} />
                           </div>
                        </div>
                      </div>
                    ))}
                    {proFields.length === 0 && <p className="text-sm text-muted-foreground">No professional history added.</p>}
                  </div>
                </div>

              </div>
            )}

            {stepIndex === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <Select label="Role" {...form.register("role")} options={activeRoles} error={form.formState.errors.role?.message} />
                <Select label="Department" {...form.register("departmentId")} options={deptOptions} error={form.formState.errors.departmentId?.message} />
                <Select label="Employment Status" {...form.register("status")} options={["Active", "Terminated", "Long Leave", "Resigned"]} error={form.formState.errors.status?.message} />
                <Field label="Date of Joining" type="date" {...form.register("dateOfJoining")} error={form.formState.errors.dateOfJoining?.message} />
                <Field label="Last Working Date" type="date" {...form.register("lastWorkingDate")} error={form.formState.errors.lastWorkingDate?.message} />
              </div>
            )}

            {stepIndex === 2 && (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Aadhar Number" className="uppercase" {...form.register("aadhar")} error={form.formState.errors.aadhar?.message} />
                <Field label="PAN Number" className="uppercase" {...form.register("pan")} error={form.formState.errors.pan?.message} />
                <Field label="EPF Number" {...form.register("epfNumber")} error={form.formState.errors.epfNumber?.message} />
                <Field label="ESI Number" {...form.register("esiNumber")} error={form.formState.errors.esiNumber?.message} />
                <div className="md:col-span-2 mt-4 pt-4 border-t grid gap-4 md:grid-cols-2">
                  <h3 className="font-semibold md:col-span-2">Bank Details</h3>
                  <Select label="Bank Name" {...form.register("bankName")} options={activeBanks} error={form.formState.errors.bankName?.message} />
                  <Field label="Account Number" {...form.register("accountNumber")} error={form.formState.errors.accountNumber?.message} />
                  <Field label="IFSC Code" className="uppercase" {...form.register("ifscCode")} error={form.formState.errors.ifscCode?.message} />
                </div>
                <div className="md:col-span-2 rounded-lg border bg-muted/35 p-4 text-sm text-muted-foreground mt-4">
                  Aadhar, PAN, EPF, and ESI are stored against the active employee version and carried forward when HR edits create a new staff version.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/hr/staff-list" })}>
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={goBack} disabled={stepIndex === 0}>
              <ChevronLeft size={16} className="mr-2" /> Back
            </Button>
            {isLastStep ? (
              <Button type="submit">
                {isEditing ? <Save size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
                {isEditing ? "Save Changes" : "Add Staff"}
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
                Continue <ChevronRight size={16} className="ml-2" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </ModuleLayout>
  );
}
