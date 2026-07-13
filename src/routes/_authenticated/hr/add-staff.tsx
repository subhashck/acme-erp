import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { ArrowLeft, BriefcaseBusiness, Check, ChevronLeft, ChevronRight, IdCard, Plus, Save, UserRound, Trash2, Calendar as CalendarIcon, Users } from "lucide-react";
import { useForm, useFieldArray, Controller, type FieldPath } from "react-hook-form";
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
import { Popover, PopoverContent, PopoverTrigger } from "../../../components/ui/popover";
import { Calendar } from "../../../components/ui/calendar";
import { Label } from "../../../ui/label";
import { format } from "date-fns";
import { authClient } from "../../../services/auth";

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
  lastWorkingDate: z.string().optional(),
  isExecutive: z.boolean().optional(),
  supervisor1Id: z.string().optional(),
  supervisor2Id: z.string().optional(),
  gender: z.enum(["Male", "Female", "Others"]).optional(),
  religion: z.string().optional(),
  maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]).optional(),
  spouseName: z.string().optional(),
  currentAddress: z.string().min(1, "Current address is required"),
  permanentAddress: z.string().min(1, "Permanent address is required"),
  nominees: z.array(z.object({
    name: z.string().min(1, "Nominee name is required"),
    relationship: z.string().min(1, "Relationship is required"),
    percentage: z.coerce.number().min(1, "Percentage must be at least 1").max(100, "Percentage cannot exceed 100")
  })).default([]),
  mncRegistrationNo: z.string().optional(),
  mncValidityUpto: z.string().optional(),
  mmcRegistrationNo: z.string().optional(),
  mmcValidityUpto: z.string().optional()
}).refine(
  (data) => {
    if (data.nominees && data.nominees.length > 0) {
      const sum = data.nominees.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
      return sum === 100;
    }
    return true;
  },
  {
    path: ["nominees"],
    message: "The sum of nominee percentages must equal 100%",
  }
);

type StaffFormInput = z.input<typeof staffSchema>;
type StaffFormValues = z.output<typeof staffSchema>;


const defaultValues: Partial<StaffFormInput> = {
  status: "Active",
  aadhar: "",
  pan: "",
  fatherName: "",
  motherName: "",
  currentAddress: "",
  permanentAddress: "",
  epfNumber: "",
  esiNumber: "",
  educationHistory: [],
  professionalHistory: [],
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  dateOfJoining: "",
  lastWorkingDate: "",
  isExecutive: false,
  supervisor1Id: "",
  supervisor2Id: "",
  gender: "Male",
  religion: "",
  maritalStatus: "Single",
  spouseName: "",
  nominees: [],
  mncRegistrationNo: "",
  mncValidityUpto: "",
  mmcRegistrationNo: "",
  mmcValidityUpto: ""
};

function AddStaff() {
  const navigate = useNavigate();
  const { staffId } = Route.useSearch();
  const isEditing = !!staffId;
  const rolesQuery = useRpcQuery<RoleTypeRow[]>(["masters-roles"], () => client.masters.roles.$get());
  const activeRoles = (rolesQuery.data ?? []).filter((r) => r.active).map((r) => r.name);

  const deptsQuery = useRpcQuery<DepartmentRow[]>(["departments"], () => client.departments.$get());
  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () => client.hr.staff.$get());
  const banksQuery = useRpcQuery<any[]>(["masters-banks"], () => client.masters.banks.$get());

  const deptOptions = (deptsQuery.data ?? []).map((d) => [String(d.id), d.name] as [string, string]);
  const activeBanks = (banksQuery.data ?? []).filter((b) => b.active).map((b) => b.name);

  const existingStaff = staffId ? staffQuery.data?.find((s) => s.staffId === staffId) : undefined;

  const hrProfileQuery = useRpcQuery<any>(["staff-hr-profile", staffId], () => client.hr.staff[":id"].profile.$get({ param: { id: String(staffId) } }), { enabled: isEditing });

  const supervisorsQuery = useRpcQuery<any>(
    ["staff-supervisors", staffId, existingStaff?.version],
    () => (client.hr.staff[":id"].supervisors as any).$get({ 
      param: { id: String(staffId) },
      query: { version: existingStaff?.version ? String(existingStaff.version) : undefined }
    }),
    { enabled: isEditing && !!existingStaff?.version }
  );

  const form = useForm<StaffFormInput, unknown, StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues
  });

  const isExecutiveVal = form.watch("isExecutive");
  const maritalStatusVal = form.watch("maritalStatus");

  const { fields: edFields, append: appendEd, remove: removeEd } = useFieldArray({
    control: form.control,
    name: "educationHistory"
  });

  const { fields: proFields, append: appendPro, remove: removePro } = useFieldArray({
    control: form.control,
    name: "professionalHistory"
  });

  const { fields: nomineeFields, append: appendNominee, remove: removeNominee } = useFieldArray({
    control: form.control,
    name: "nominees"
  });


  const session = authClient.useSession();
  const isAdminOrHr = session.data?.user?.role === "admin" || session.data?.user?.role === "hr";

  const isLoading = rolesQuery.isLoading || deptsQuery.isLoading || banksQuery.isLoading || (isEditing && (staffQuery.isLoading || hrProfileQuery.isLoading)) || session.isPending;

  const hasInitialized = React.useRef(false);

  React.useEffect(() => {
    if (existingStaff && !hasInitialized.current && (hrProfileQuery.isSuccess || !isEditing)) {
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
        currentAddress: profile?.currentAddress ?? "",
        permanentAddress: profile?.permanentAddress ?? "",
        epfNumber: profile?.epfNumber ?? "",
        esiNumber: profile?.esiNumber ?? "",
        educationHistory: Array.isArray(profile?.educationHistory) ? profile.educationHistory : [],
        professionalHistory: Array.isArray(profile?.professionalHistory) ? profile.professionalHistory : [],
        bankName: (existingStaff as any).bankName ?? "",
        accountNumber: (existingStaff as any).accountNumber ?? "",
        ifscCode: (existingStaff as any).ifscCode ?? "",
        dateOfJoining: profile?.dateOfJoining ?? "",
        lastWorkingDate: profile?.lastWorkingDate ?? "",
        isExecutive: existingStaff.isExecutive ?? false,
        supervisor1Id: supervisorsQuery.data?.explicitSupervisors?.supervisor1?.staffId?.toString() ?? "",
        supervisor2Id: supervisorsQuery.data?.explicitSupervisors?.supervisor2?.staffId?.toString() ?? "",
        gender: (profile?.gender as any) ?? "Male",
        religion: profile?.religion ?? "",
        maritalStatus: (profile?.maritalStatus as any) ?? "Single",
        spouseName: profile?.spouseName ?? "",
        nominees: Array.isArray(profile?.nominees) ? profile.nominees : [],
        mncRegistrationNo: profile?.mncRegistrationNo ?? "",
        mncValidityUpto: profile?.mncValidityUpto ?? "",
        mmcRegistrationNo: profile?.mmcRegistrationNo ?? "",
        mmcValidityUpto: profile?.mmcValidityUpto ?? ""
      });
      hasInitialized.current = true;
    }
  }, [existingStaff, hrProfileQuery.data, hrProfileQuery.isSuccess, supervisorsQuery.data, supervisorsQuery.isSuccess, isEditing, form]);


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
        isExecutive: !!values.isExecutive,
        hrProfile: {
          fatherName: values.fatherName,
          motherName: values.motherName,
          currentAddress: values.currentAddress,
          permanentAddress: values.permanentAddress,
          epfNumber: values.epfNumber,
          esiNumber: values.esiNumber,
          dateOfJoining: values.dateOfJoining,
          lastWorkingDate: values.lastWorkingDate,
          educationHistory: values.educationHistory,
          professionalHistory: values.professionalHistory,
          gender: values.gender,
          religion: values.religion,
          maritalStatus: values.maritalStatus,
          spouseName: values.maritalStatus === "Married" ? values.spouseName : "",
          nominees: values.nominees,
          mncRegistrationNo: values.mncRegistrationNo,
          mncValidityUpto: values.mncValidityUpto,
          mmcRegistrationNo: values.mmcRegistrationNo,
          mmcValidityUpto: values.mmcValidityUpto
        }
      };

      const res = isEditing
        ? await client.hr.staff[":id"].$put({ param: { id: String(staffId) }, json: payload } as any)
        : await client.hr.staff.$post({ json: payload } as any);

      if (!res.ok) {
        const errData = (await res.json().catch(() => null)) as any;
        throw new Error(errData?.error || `HTTP error ${res.status}`);
      }

      const savedStaff = await res.json() as any;
      const newStaffId = savedStaff?.staffId || staffId;
      const newStaffVersion = savedStaff?.version;

      if (newStaffId && (values.supervisor1Id || values.supervisor2Id || isEditing)) {
        await (client.hr.staff[":id"].supervisors as any).$put({
          param: { id: String(newStaffId) },
          query: { version: newStaffVersion ? String(newStaffVersion) : undefined },
          json: {
            supervisor1Id: values.isExecutive && values.supervisor1Id ? Number(values.supervisor1Id) : null,
            supervisor2Id: values.isExecutive && values.supervisor2Id ? Number(values.supervisor2Id) : null
          }
        });
      }

      form.reset(defaultValues);
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate({ to: "/hr/staff-list" });
    } catch (err) {
      alert("Failed to save staff details: " + (err instanceof Error ? err.message : String(err)));
    }
  });

  if (!isLoading && !isAdminOrHr) {
    return (
      <ModuleLayout title="Unauthorized" description="Access Denied">
        <Card className="mx-auto mt-8 max-w-2xl border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6 text-center">
            <p className="mb-4 text-muted-foreground text-destructive font-medium">
              You do not have permission to add or edit staff members. Only HR personnel or administrators can access this page.
            </p>
            <Button onClick={() => navigate({ to: "/hr/staff-list" })}>
              <ArrowLeft size={16} className="mr-2" /> Back to HR Management
            </Button>
          </CardContent>
        </Card>
      </ModuleLayout>
    );
  }

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
      <form
        id="staff-form"
        onSubmit={submit}
        className="mx-auto max-w-6xl relative"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
            e.preventDefault();
          }
        }}
      >
        {form.formState.isSubmitting && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              <p className="text-sm font-medium">{isEditing ? "Saving Changes..." : "Adding Staff..."}</p>
            </div>
          </div>
        )}
        <fieldset disabled={form.formState.isSubmitting} className="space-y-5">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound size={18} />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full Name" {...form.register("name")} error={form.formState.errors.name?.message} />
              <Field label="Phone" {...form.register("phone")} error={form.formState.errors.phone?.message} />
              <Field label="Email" type="email" className="md:col-span-2" {...form.register("email")} error={form.formState.errors.email?.message} />
              <Field label="Father's Name" {...form.register("fatherName")} error={form.formState.errors.fatherName?.message} />
              <Field label="Mother's Name" {...form.register("motherName")} error={form.formState.errors.motherName?.message} />
              <Select label="Sex" {...form.register("gender")} options={["Male", "Female", "Others"]} error={form.formState.errors.gender?.message} />
              <Select label="Religion" {...form.register("religion")} options={["Hinduism", "Sanamahism", "Islam", "Christianity", "Sikhism", "Buddhism", "Jainism", "Others"]} error={form.formState.errors.religion?.message} />
              <Select label="Marital Status" {...form.register("maritalStatus")} options={["Single", "Married", "Divorced", "Widowed"]} error={form.formState.errors.maritalStatus?.message} />
              {maritalStatusVal === "Married" && (
                <Field label="Spouse's Name" {...form.register("spouseName")} error={form.formState.errors.spouseName?.message} />
              )}

              <div className="md:col-span-2 grid gap-4 md:grid-cols-2 mt-2 bg-slate-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <Field label="Current Address" {...form.register("currentAddress")} error={form.formState.errors.currentAddress?.message} />
                <Field label="Permanent Address" {...form.register("permanentAddress")} error={form.formState.errors.permanentAddress?.message} />
                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="same-address"
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    onChange={(e) => {
                      if (e.target.checked) {
                        form.setValue("permanentAddress", form.getValues("currentAddress") || "", { shouldValidate: true });
                      }
                    }}
                  />
                  <label htmlFor="same-address" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    Permanent Address is same as Current Address
                  </label>
                </div>
              </div>

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
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Users size={18} />
                Nominee Details
              </span>
              <Button type="button" variant="outline" size="default" onClick={() => appendNominee({ name: "", relationship: "", percentage: 100 })}>
                <Plus size={16} className="mr-1" /> Add Nominee
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {nomineeFields.map((field, i) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_auto] gap-4 items-end p-4 border rounded-lg bg-muted/10 relative">
                  <Field label="Nominee Name" {...form.register(`nominees.${i}.name`)} error={form.formState.errors.nominees?.[i]?.name?.message} />
                  <Select label="Relationship" {...form.register(`nominees.${i}.relationship`)} options={["Father", "Mother", "Sister", "Brother", "Children", "Others"]} error={form.formState.errors.nominees?.[i]?.relationship?.message} />
                  <Field label="Percentage (%)" type="number" {...form.register(`nominees.${i}.percentage`)} error={form.formState.errors.nominees?.[i]?.percentage?.message} />
                  <Button type="button" variant="ghost" size="icon" className="text-destructive mb-1" onClick={() => removeNominee(i)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
              {nomineeFields.length === 0 && (
                <p className="text-sm text-muted-foreground">No nominees added. Add one or more nominees if applicable.</p>
              )}
              {form.formState.errors.nominees && (
                <p className="text-sm font-semibold text-destructive mt-2">{form.formState.errors.nominees.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <BriefcaseBusiness size={18} />
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Select label="Role" {...form.register("role")} options={activeRoles} error={form.formState.errors.role?.message} />
              <Select label="Department" {...form.register("departmentId")} options={deptOptions} error={form.formState.errors.departmentId?.message} />


              <div className="flex items-center gap-2 md:col-span-2 py-2">
                <input
                  type="checkbox"
                  id="isExecutive"
                  className="rounded border-input text-primary focus:ring-ring h-4 w-4"
                  {...form.register("isExecutive")}
                />
                <Label htmlFor="isExecutive" className="text-sm font-medium cursor-pointer select-none">
                  Executive Level Staff (has direct supervisors)
                </Label>
              </div>

              {isExecutiveVal && (
                <>
                  <Select
                    label="Supervisor 1"
                    {...form.register("supervisor1Id")}
                    options={(staffQuery.data?.filter(s => s.active && s.staffId !== staffId) || []).map(s => [s.staffId.toString(), `${s.name} (${s.employeeCode})`])}
                    error={form.formState.errors.supervisor1Id?.message}
                  />
                  <Select
                    label="Supervisor 2"
                    {...form.register("supervisor2Id")}
                    options={(staffQuery.data?.filter(s => s.active && s.staffId !== staffId) || []).map(s => [s.staffId.toString(), `${s.name} (${s.employeeCode})`])}
                    error={form.formState.errors.supervisor2Id?.message}
                  />
                </>
              )}

              <Select label="Employment Status" {...form.register("status")} options={["Active", "Terminated", "Long Leave", "Resigned"]} error={form.formState.errors.status?.message} />

              <div className="flex flex-col gap-1.5">
                <Label>Date of Joining</Label>
                <Controller
                  control={form.control}
                  name="dateOfJoining"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-background px-3",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                          {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {form.formState.errors.dateOfJoining && <p className="text-xs text-destructive">{form.formState.errors.dateOfJoining.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Last Working Date</Label>
                <Controller
                  control={form.control}
                  name="lastWorkingDate"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal bg-background px-3",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                          {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {form.formState.errors.lastWorkingDate && <p className="text-xs text-destructive">{form.formState.errors.lastWorkingDate.message}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <IdCard size={18} />
              Compliance & Bank Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Aadhar Number" className="uppercase" {...form.register("aadhar")} error={form.formState.errors.aadhar?.message} />
              <Field label="PAN Number" className="uppercase" {...form.register("pan")} error={form.formState.errors.pan?.message} />
              <Field label="EPF Number" {...form.register("epfNumber")} error={form.formState.errors.epfNumber?.message} />
              <Field label="ESI Number" {...form.register("esiNumber")} error={form.formState.errors.esiNumber?.message} />

              <div className="md:col-span-2 mt-4 pt-4 border-t grid gap-4 md:grid-cols-2">
                <h3 className="font-semibold md:col-span-2">Council Registrations</h3>
                <Field label="MNC Registration No" {...form.register("mncRegistrationNo")} error={form.formState.errors.mncRegistrationNo?.message} />
                <div className="flex flex-col gap-1.5">
                  <Label>MNC Validity Upto</Label>
                  <Controller
                    control={form.control}
                    name="mncValidityUpto"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-background px-3",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            captionLayout="dropdown"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {form.formState.errors.mncValidityUpto && <p className="text-xs text-destructive">{form.formState.errors.mncValidityUpto.message}</p>}
                </div>

                <Field label="MMC Registration No" {...form.register("mmcRegistrationNo")} error={form.formState.errors.mmcRegistrationNo?.message} />
                <div className="flex flex-col gap-1.5">
                  <Label>MMC Validity Upto</Label>
                  <Controller
                    control={form.control}
                    name="mmcValidityUpto"
                    render={({ field }) => (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-background px-3",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            captionLayout="dropdown"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  {form.formState.errors.mmcValidityUpto && <p className="text-xs text-destructive">{form.formState.errors.mmcValidityUpto.message}</p>}
                </div>
              </div>

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
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-end">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/hr/staff-list" })}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {isEditing ? <Save size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
            {isEditing ? "Save Changes" : "Add Staff"}
          </Button>
        </div>
        </fieldset>
      </form>
    </ModuleLayout>
  );
}
