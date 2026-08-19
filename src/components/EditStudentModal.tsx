import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/ui/button";
import { Field } from "@/components/Field";
import { Label } from "@/ui/label";
import { toast } from "sonner";
import { User, Shield, GraduationCap, Loader2 } from "lucide-react";

export interface StudentProfileData {
  id: number;
  enrollmentNo: string;
  name: string;
  email: string;
  phone: string;
  gender?: string;
  dob?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  status: string;
  batchId: number;
  admissionDate?: string;
}

interface EditStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentProfileData | null;
  onSuccess?: () => void;
}

export function EditStudentModal({ open, onOpenChange, student, onSuccess }: EditStudentModalProps) {
  const queryClient = useQueryClient();

  const { data: batches = [] } = useQuery<any[]>({
    queryKey: ["nursing", "batches"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/batches");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      enrollmentNo: "",
      email: "",
      phone: "",
      gender: "Female",
      dob: "",
      admissionDate: "",
      address: "",
      guardianName: "",
      guardianPhone: "",
      guardianRelation: "",
      batchId: 0,
      status: "active",
    },
  });

  React.useEffect(() => {
    if (student) {
      reset({
        name: student.name || "",
        enrollmentNo: student.enrollmentNo || "",
        email: student.email || "",
        phone: student.phone || "",
        gender: student.gender || "Female",
        dob: student.dob || "",
        admissionDate: student.admissionDate || "",
        address: student.address || "",
        guardianName: student.guardianName || "",
        guardianPhone: student.guardianPhone || "",
        guardianRelation: student.guardianRelation || "Parent",
        batchId: Number(student.batchId || 0),
        status: student.status || "active",
      });
    }
  }, [student, reset, open]);

  const updateMutation = useMutation({
    mutationFn: async (values: any) => {
      if (!student?.id) throw new Error("Student ID missing");
      const res = await fetch(`/api/nursing/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          batchId: Number(values.batchId),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update student profile");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Student profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "student", student?.id] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "students"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "dashboard"] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <User className="h-5 w-5 text-teal-600" />
            Modify Student Profile
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Update personal information, guardian contacts, and academic batch assignment for{" "}
            <span className="font-semibold text-foreground">{student?.name}</span> ({student?.enrollmentNo})
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-2">
          {/* 1. Personal Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-400 border-b pb-1">
              <User size={16} /> Personal Information
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Full Name *"
                placeholder="e.g. Ananya Sharma"
                {...register("name", { required: "Name is required" })}
                error={errors.name?.message}
              />
              <Field
                label="Enrollment No *"
                placeholder="e.g. NUR2026-001"
                {...register("enrollmentNo", { required: "Enrollment number is required" })}
                error={errors.enrollmentNo?.message}
              />
              <Field
                label="Email Address *"
                type="email"
                placeholder="student@example.com"
                {...register("email", { required: "Email is required" })}
                error={errors.email?.message}
              />
              <Field
                label="Phone Number *"
                placeholder="+91 9876543210"
                {...register("phone", { required: "Phone number is required" })}
                error={errors.phone?.message}
              />
              <div>
                <Label>Gender</Label>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <select className="w-full border rounded-md p-2 bg-background text-sm mt-1" {...field}>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  )}
                />
              </div>
              <Field
                label="Date of Birth"
                type="date"
                {...register("dob")}
              />
              <Field
                label="Admission Date"
                type="date"
                {...register("admissionDate")}
              />
              <Field
                label="Residential Address"
                placeholder="Full address, city, pin code"
                {...register("address")}
              />
            </div>
          </div>

          {/* 2. Guardian Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-400 border-b pb-1">
              <Shield size={16} /> Guardian & Emergency Contact
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field
                label="Guardian Name"
                placeholder="e.g. Ramesh Sharma"
                {...register("guardianName")}
              />
              <Field
                label="Guardian Phone"
                placeholder="+91 9876500000"
                {...register("guardianPhone")}
              />
              <Field
                label="Relationship"
                placeholder="e.g. Father / Mother"
                {...register("guardianRelation")}
              />
            </div>
          </div>

          {/* 3. Academic & Status */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-700 dark:text-teal-400 border-b pb-1">
              <GraduationCap size={16} /> Academic Program & Status
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Academic Batch *</Label>
                <Controller
                  control={control}
                  name="batchId"
                  rules={{ required: "Batch selection is required" }}
                  render={({ field }) => (
                    <select className="w-full border rounded-md p-2 bg-background text-sm mt-1" {...field}>
                      <option value="">Select Academic Batch</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.courseName} - {b.academicYear} (Sec {b.section})
                        </option>
                      ))}
                    </select>
                  )}
                />
                {errors.batchId && <p className="text-xs text-red-500 mt-1">Please select an academic batch</p>}
              </div>

              <div>
                <Label>Enrollment Status</Label>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <select className="w-full border rounded-md p-2 bg-background text-sm mt-1" {...field}>
                      <option value="active">Active</option>
                      <option value="promoted">Promoted</option>
                      <option value="graduated">Graduated</option>
                      <option value="dropped">Dropped</option>
                      <option value="transferred">Transferred</option>
                    </select>
                  )}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 size={16} className="animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
