import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { Plus, Save, ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Field } from "../../../components/Field";
import { ModuleLayout } from "../../../components/ModuleLayout";
import { queryClient, useRpcQuery } from "../../../lib/query";
import { client } from "../../../services/rpc";
import { Button } from "../../../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card";
import { Select } from "../../../ui/select";
import type { RoleTypeRow, DepartmentRow, StaffRow } from "../../../types";

export const Route = createFileRoute("/_authenticated/hr/add-staff")({
  validateSearch: z.object({ staffId: z.number().optional() }),
  component: AddStaff
});

const staffSchema = z.object({
  name: z.string().min(2),
  role: z.string().min(2),
  departmentId: z.coerce.number().positive("Please select a department"),
  phone: z.string().min(7),
  email: z.string().email(),
  status: z.enum(["Active", "Terminated", "Long Leave", "Resigned"]),
  aadhar: z.string().regex(/^[2-9]\d{11}$/, "Aadhar must be a valid 12-digit number (cannot start with 0 or 1)"),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i, "Invalid PAN format").transform((val) => val.toUpperCase())
});

function AddStaff() {
  const navigate = useNavigate();
  const { staffId } = Route.useSearch();
  const isEditing = !!staffId;

  const rolesQuery = useRpcQuery<RoleTypeRow[]>(["masters-roles"], () => client.masters.roles.$get());
  const activeRoles = (rolesQuery.data ?? []).filter((r) => r.active).map((r) => r.name);

  const deptsQuery = useRpcQuery<DepartmentRow[]>(["departments"], () => client.departments.$get());
  const staffQuery = useRpcQuery<StaffRow[]>(["staff"], () => client.hr.staff.$get());

  const deptOptions = [["", "Select Department"] as [string, string], ...(deptsQuery.data ?? []).map((d) => [String(d.id), d.name] as [string, string])];

  const existingStaff = staffId ? staffQuery.data?.find((s) => s.id === staffId) : undefined;

  const form = useForm<z.input<typeof staffSchema>, unknown, z.output<typeof staffSchema>>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      status: "Active",
      aadhar: "",
      pan: ""
    }
  });

  const isLoading = rolesQuery.isLoading || deptsQuery.isLoading || (isEditing && staffQuery.isLoading);

  React.useEffect(() => {
    if (existingStaff) {
      form.reset({
        name: existingStaff.name,
        role: existingStaff.role,
        departmentId: existingStaff.departmentId ?? undefined,
        phone: existingStaff.phone ?? "",
        email: existingStaff.email ?? "",
        status: existingStaff.status as any,
        aadhar: existingStaff.aadhar ?? "",
        pan: existingStaff.pan ?? ""
      });
    }
  }, [existingStaff, form]);

  if (isLoading) {
    return (
      <ModuleLayout title={isEditing ? "Edit Staff" : "Add Staff"} description="Loading form data...">
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ModuleLayout>
    );
  }

  if (isEditing && !existingStaff) {
    return (
      <ModuleLayout title="Edit Staff" description="Employee not found.">
        <Card className="max-w-2xl mx-auto mt-8">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">The requested staff record could not be found.</p>
            <Button onClick={() => navigate({ to: "/hr/staff-list" })}>
              <ArrowLeft size={16} className="mr-2 inline" /> Back to HR Management
            </Button>
          </CardContent>
        </Card>
      </ModuleLayout>
    );
  }

  const submit = form.handleSubmit(async (values) => {
    try {
      let res;
      const salaryPayload = {
        basicSalary: existingStaff?.basicSalary ?? 0,
        hra: existingStaff?.hra ?? 0,
        conveyance: existingStaff?.conveyance ?? 0,
        medical: existingStaff?.medical ?? 0,
        special: existingStaff?.special ?? 0,
        epf: existingStaff?.epf ?? 0,
        esi: existingStaff?.esi ?? 0,
        professionalTax: existingStaff?.professionalTax ?? 0,
        otherDeductions: existingStaff?.otherDeductions ?? 0,
        salary: existingStaff?.salary ?? 1
      };
      const payload = {
        ...salaryPayload,
        ...values
      };
      if (isEditing) {
        const route = client.hr.staff[":id"];
        res = await route.$put({ param: { id: String(staffId) }, json: payload } as any);
      } else {
        res = await client.hr.staff.$post({ json: payload });
      }
      if (!res.ok) {
        const errData = (await res.json().catch(() => null)) as any;
        throw new Error(errData?.error || `HTTP error ${res.status}`);
      }
      form.reset({
        status: "Active",
        aadhar: "",
        pan: ""
      });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      navigate({ to: "/hr/staff-list" });
    } catch (err) {
      alert("Failed to save staff details: " + (err instanceof Error ? err.message : String(err)));
    }
  });

  return (
    <ModuleLayout
      title={isEditing ? "Edit Staff" : "Add Staff"}
      description={isEditing ? "Update existing staff member details." : "Create a new staff member."}
    >
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Staff Member" : "New Staff Member"}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form id="staff-form" onSubmit={submit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name" {...form.register("name")} />
              <Select label="Role" {...form.register("role")} options={activeRoles} />
              <div>
                <Select label="Department" {...form.register("departmentId")} options={deptOptions} />
                {form.formState.errors.departmentId && (
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.departmentId.message}</p>
                )}
              </div>
              <Field label="Phone" {...form.register("phone")} />
              <Field label="Email" type="email" {...form.register("email")} />
              <div>
                <Select label="Status" {...form.register("status")} options={["Active", "Terminated", "Long Leave", "Resigned"]} />
                {form.formState.errors.status && (
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.status.message}</p>
                )}
              </div>
              <div>
                <Field label="Aadhar Number" className="uppercase" {...form.register("aadhar")} />
                {form.formState.errors.aadhar && (
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.aadhar.message}</p>
                )}
              </div>
              <div>
                <Field label="PAN Number" className="uppercase" {...form.register("pan")} />
                {form.formState.errors.pan && (
                  <p className="text-xs text-red-500 mt-1">{form.formState.errors.pan.message}</p>
                )}
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => navigate({ to: "/hr/staff-list" })}>Cancel</Button>
                <Button type="submit">
                  {isEditing ? (
                    <><Save size={16} className="mr-2" /> Save Changes</>
                  ) : (
                    <><Plus size={16} className="mr-2" /> Add Staff</>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
