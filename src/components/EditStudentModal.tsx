import * as React from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/ui/button";
import { Field } from "@/components/Field";
import { Label } from "@/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  User, 
  Shield, 
  GraduationCap, 
  MapPin, 
  BookOpen, 
  Award, 
  Loader2, 
  Users, 
  ChevronRight,
  ChevronLeft,
  Copy,
  Building2,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  HeartHandshake
} from "lucide-react";

export interface ExamDetail {
  exam: string;
  instituteName?: string;
  instituteAddress?: string;
  board: string;
  year: string;
  subjects: string;
  subjectScores?: string;
  percentage: number | string;
}

export interface StudentProfileData {
  id: number;
  applicantId?: number | null;
  enrollmentNo: string;
  name: string;
  email?: string | null;
  phone: string;
  aadharNo?: string | null;
  gender?: string;
  dob?: string | null;
  address?: string | null;
  // Parents
  fatherName?: string | null;
  fatherPhone?: string | null;
  fatherAadharNo?: string | null;
  fatherOccupation?: string | null;
  fatherOrganization?: string | null;
  fatherAnnualIncome?: string | number | null;
  motherName?: string | null;
  motherPhone?: string | null;
  motherAadharNo?: string | null;
  motherOccupation?: string | null;
  motherOrganization?: string | null;
  motherAnnualIncome?: string | number | null;
  // Addresses
  presentAddress?: string | null;
  presentDistrict?: string | null;
  presentPincode?: string | null;
  presentState?: string | null;
  permanentAddress?: string | null;
  permanentDistrict?: string | null;
  permanentPincode?: string | null;
  permanentState?: string | null;
  // Academic history
  academicHistory?: ExamDetail[] | string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  guardianRelation?: string | null;
  status: string;
  batchId: number;
  admissionDate?: string | null;
  quotaCategory?: "general" | "reserved" | "management" | null;
  entranceMeritScore?: string | number | null;
  applicantNotes?: string | null;
  notes?: string | null;
}

export interface StudentFormValues {
  name: string;
  enrollmentNo: string;
  email: string;
  phone: string;
  aadharNo: string;
  gender: string;
  dob: string;
  admissionDate: string;
  address: string;
  fatherName: string;
  fatherPhone: string;
  fatherAadharNo: string;
  fatherOccupation: string;
  fatherOrganization: string;
  fatherAnnualIncome: string;
  motherName: string;
  motherPhone: string;
  motherAadharNo: string;
  motherOccupation: string;
  motherOrganization: string;
  motherAnnualIncome: string;
  presentAddress: string;
  presentDistrict: string;
  presentPincode: string;
  presentState: string;
  permanentAddress: string;
  permanentDistrict: string;
  permanentPincode: string;
  permanentState: string;
  academicHistory: ExamDetail[];
  guardianName: string;
  guardianPhone: string;
  guardianRelation: string;
  batchId: number;
  status: string;
  quotaCategory: "general" | "reserved" | "management";
  entranceMeritScore: string;
  applicantNotes: string;
}

interface EditStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: StudentProfileData | null;
  onSuccess?: () => void;
}

const defaultAcademicHistory: ExamDetail[] = [
  { exam: "10th", instituteName: "", instituteAddress: "", board: "", year: "", subjects: "", subjectScores: "", percentage: "" },
  { exam: "11th", instituteName: "", instituteAddress: "", board: "", year: "", subjects: "", subjectScores: "", percentage: "" },
  { exam: "12th", instituteName: "", instituteAddress: "", board: "", year: "", subjects: "", subjectScores: "", percentage: "" },
];

const selectClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function EditStudentModal({ open, onOpenChange, student, onSuccess }: EditStudentModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"personal" | "family" | "address" | "academic" | "program">("personal");

  const { data: batches = [] } = useQuery<any[]>({
    queryKey: ["nursing", "batches"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/batches");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { register, handleSubmit, reset, control, getValues, setValue, formState: { errors } } = useForm<StudentFormValues>({
    defaultValues: {
      name: "",
      enrollmentNo: "",
      email: "",
      phone: "",
      aadharNo: "",
      gender: "Female",
      dob: "",
      admissionDate: "",
      address: "",
      fatherName: "",
      fatherPhone: "",
      fatherAadharNo: "",
      fatherOccupation: "",
      fatherOrganization: "",
      fatherAnnualIncome: "",
      motherName: "",
      motherPhone: "",
      motherAadharNo: "",
      motherOccupation: "",
      motherOrganization: "",
      motherAnnualIncome: "",
      presentAddress: "",
      presentDistrict: "",
      presentPincode: "",
      presentState: "",
      permanentAddress: "",
      permanentDistrict: "",
      permanentPincode: "",
      permanentState: "",
      academicHistory: defaultAcademicHistory,
      guardianName: "",
      guardianPhone: "",
      guardianRelation: "",
      batchId: 0,
      status: "active",
      quotaCategory: "general",
      entranceMeritScore: "",
      applicantNotes: "",
    },
  });

  const { fields: academicFields } = useFieldArray({
    control,
    name: "academicHistory",
  });

  React.useEffect(() => {
    if (student) {
      let parsedHistory = student.academicHistory;
      if (typeof parsedHistory === "string") {
        try {
          parsedHistory = JSON.parse(parsedHistory);
        } catch {
          parsedHistory = defaultAcademicHistory;
        }
      }
      if (!Array.isArray(parsedHistory) || parsedHistory.length === 0) {
        parsedHistory = defaultAcademicHistory;
      } else {
        const exams = ["10th", "11th", "12th"];
        parsedHistory = exams.map((ex) => {
          const found = (parsedHistory as ExamDetail[]).find((p) => p.exam === ex);
          return found || { exam: ex, instituteName: "", instituteAddress: "", board: "", year: "", subjects: "", subjectScores: "", percentage: "" };
        });
      }

      reset({
        name: student.name || "",
        enrollmentNo: student.enrollmentNo || "",
        email: student.email || "",
        phone: student.phone || "",
        aadharNo: student.aadharNo || "",
        gender: student.gender || "Female",
        dob: student.dob || "",
        admissionDate: student.admissionDate || "",
        address: student.address || "",
        fatherName: student.fatherName || "",
        fatherPhone: student.fatherPhone || "",
        fatherAadharNo: student.fatherAadharNo || "",
        fatherOccupation: student.fatherOccupation || "",
        fatherOrganization: student.fatherOrganization || "",
        fatherAnnualIncome: student.fatherAnnualIncome != null ? String(student.fatherAnnualIncome) : "",
        motherName: student.motherName || "",
        motherPhone: student.motherPhone || "",
        motherAadharNo: student.motherAadharNo || "",
        motherOccupation: student.motherOccupation || "",
        motherOrganization: student.motherOrganization || "",
        motherAnnualIncome: student.motherAnnualIncome != null ? String(student.motherAnnualIncome) : "",
        presentAddress: student.presentAddress || student.address || "",
        presentDistrict: student.presentDistrict || "",
        presentPincode: student.presentPincode || "",
        presentState: student.presentState || "",
        permanentAddress: student.permanentAddress || "",
        permanentDistrict: student.permanentDistrict || "",
        permanentPincode: student.permanentPincode || "",
        permanentState: student.permanentState || "",
        academicHistory: parsedHistory,
        guardianName: student.guardianName || "",
        guardianPhone: student.guardianPhone || "",
        guardianRelation: student.guardianRelation || "Parent",
        batchId: Number(student.batchId || 0),
        status: student.status || "active",
        quotaCategory: student.quotaCategory || "general",
        entranceMeritScore: student.entranceMeritScore != null ? String(student.entranceMeritScore) : "",
        applicantNotes: student.applicantNotes || student.notes || "",
      });
      setActiveTab("personal");
    }
  }, [student, reset, open]);

  const handleCopyPresentAddress = () => {
    const values = getValues();
    setValue("permanentAddress", values.presentAddress);
    setValue("permanentDistrict", values.presentDistrict);
    setValue("permanentState", values.presentState);
    setValue("permanentPincode", values.presentPincode);
    toast.success("Present address copied to permanent address");
  };

  const updateMutation = useMutation({
    mutationFn: async (values: StudentFormValues) => {
      if (!student?.id) throw new Error("Student ID missing");
      const res = await fetch(`/api/nursing/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          email: values.email?.trim() || null,
          batchId: Number(values.batchId),
          entranceMeritScore: values.entranceMeritScore !== "" ? Number(values.entranceMeritScore) : undefined,
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

  const onSubmit = (data: StudentFormValues) => {
    updateMutation.mutate(data);
  };

  const tabs = [
    { id: "personal", label: "Personal Info", icon: User },
    { id: "family", label: "Parents & Family", icon: Users },
    { id: "address", label: "Addresses", icon: MapPin },
    { id: "academic", label: "Academic History", icon: BookOpen },
    { id: "program", label: "Program & Quota", icon: GraduationCap },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[96vw] sm:max-w-4xl md:max-w-5xl lg:max-w-6xl h-[92vh] sm:h-[88vh] max-h-[880px] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl border bg-background"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Modal Header */}
        <DialogHeader className="p-4 sm:p-5 sm:pb-3 border-b bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-foreground">
                <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <User className="h-5 w-5" />
                </span>
                Modify Student Profile
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Editing record for <span className="font-semibold text-foreground">{student?.name}</span> • Enrollment: <span className="font-mono text-teal-600 dark:text-teal-400 font-semibold">{student?.enrollmentNo}</span>
              </p>
            </div>
          </div>

          {/* Responsive Segmented Tab Bar */}
          <div className="flex items-center gap-1.5 pt-3 -mb-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-muted">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  className={`py-2 px-3 sm:px-3.5 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={14} className={isActive ? "text-white" : "text-muted-foreground"} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-6">
          {/* TAB 1: Personal & Basic Details */}
          {activeTab === "personal" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                    <User size={18} className="text-teal-600 dark:text-teal-400" /> Basic Identity & Contact Information
                  </h3>
                  <p className="text-xs text-muted-foreground">Primary biographical and identification details</p>
                </div>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">* Required fields</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                <Field
                  className="sm:col-span-2 lg:col-span-1"
                  label="Student Full Name *"
                  placeholder="e.g. Ananya Sharma"
                  {...register("name", { required: "Name is required" })}
                  error={errors.name?.message}
                />
                <Field
                  label="Enrollment No *"
                  placeholder="e.g. NUR2026-0001"
                  {...register("enrollmentNo", { required: "Enrollment number is required" })}
                  error={errors.enrollmentNo?.message}
                />
                <Field
                  label="Student Aadhar No (12 digits)"
                  placeholder="1234 5678 9012"
                  maxLength={14}
                  {...register("aadharNo")}
                />
                <Field
                  label="Student Contact Phone *"
                  placeholder="+91 9876543210"
                  {...register("phone", { required: "Phone number is required" })}
                  error={errors.phone?.message}
                />
                <Field
                  label="Email Address (Optional)"
                  type="email"
                  placeholder="student@example.com"
                  {...register("email")}
                  error={errors.email?.message}
                />
                <div>
                  <Label>Gender</Label>
                  <Controller
                    control={control}
                    name="gender"
                    render={({ field }) => (
                      <select className={selectClasses} {...field}>
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
              </div>
            </div>
          )}

          {/* TAB 2: Parents & Guardian Background */}
          {activeTab === "family" && (
            <div className="space-y-6">
              {/* Father Details */}
              <div className="p-4 sm:p-5 rounded-xl border bg-card/60 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground pb-2 border-b">
                  <User size={16} className="text-teal-600 dark:text-teal-400" /> Father's Profile & Employment
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  <Field label="Father's Full Name" placeholder="Rajesh Sharma" {...register("fatherName")} />
                  <Field label="Father's Phone" placeholder="+91 9876543210" {...register("fatherPhone")} />
                  <Field label="Father's Aadhar No" placeholder="1234 5678 9012" {...register("fatherAadharNo")} />
                  <Field label="Father's Occupation" placeholder="e.g. Engineer, Business" {...register("fatherOccupation")} />
                  <Field label="Employer / Organization" placeholder="e.g. Acme Corp" {...register("fatherOrganization")} />
                  <Field label="Annual Income (INR ₹)" type="number" placeholder="500000" {...register("fatherAnnualIncome")} />
                </div>
              </div>

              {/* Mother Details */}
              <div className="p-4 sm:p-5 rounded-xl border bg-card/60 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground pb-2 border-b">
                  <HeartHandshake size={16} className="text-teal-600 dark:text-teal-400" /> Mother's Profile & Employment
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                  <Field label="Mother's Full Name" placeholder="Sunita Sharma" {...register("motherName")} />
                  <Field label="Mother's Phone" placeholder="+91 9876543210" {...register("motherPhone")} />
                  <Field label="Mother's Aadhar No" placeholder="1234 5678 9012" {...register("motherAadharNo")} />
                  <Field label="Mother's Occupation" placeholder="e.g. Teacher, Homemaker" {...register("motherOccupation")} />
                  <Field label="Employer / Organization" placeholder="e.g. Govt School" {...register("motherOrganization")} />
                  <Field label="Annual Income (INR ₹)" type="number" placeholder="300000" {...register("motherAnnualIncome")} />
                </div>
              </div>

              {/* Guardian Details */}
              <div className="p-4 sm:p-5 rounded-xl border bg-card/60 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground pb-2 border-b">
                  <Shield size={16} className="text-teal-600 dark:text-teal-400" /> Emergency Guardian Contact
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                  <Field label="Guardian Name" placeholder="Ramesh Sharma" {...register("guardianName")} />
                  <Field label="Guardian Phone" placeholder="+91 9876500000" {...register("guardianPhone")} />
                  <Field label="Relationship with Student" placeholder="e.g. Father / Mother / Uncle" {...register("guardianRelation")} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Addresses */}
          {activeTab === "address" && (
            <div className="space-y-6">
              {/* Present Address */}
              <div className="p-4 sm:p-5 rounded-xl border bg-card/60 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground pb-2 border-b">
                  <MapPin size={16} className="text-teal-600 dark:text-teal-400" /> Present / Residential Address
                </div>
                <div className="space-y-4">
                  <Field label="Street / House Address" placeholder="House No, Street, Locality, Area" {...register("presentAddress")} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                    <Field label="District / City" placeholder="e.g. Bangalore Urban" {...register("presentDistrict")} />
                    <Field label="State" placeholder="e.g. Karnataka" {...register("presentState")} />
                    <Field label="Pincode" placeholder="e.g. 560001" {...register("presentPincode")} />
                  </div>
                </div>
              </div>

              {/* Permanent Address */}
              <div className="p-4 sm:p-5 rounded-xl border bg-card/60 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Building2 size={16} className="text-teal-600 dark:text-teal-400" /> Permanent / Domicile Address
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex items-center gap-1.5 self-start sm:self-auto text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                    onClick={handleCopyPresentAddress}
                  >
                    <Copy size={12} /> Same as Present Address
                  </Button>
                </div>
                <div className="space-y-4">
                  <Field label="Street / House Address" placeholder="Permanent residence address" {...register("permanentAddress")} />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                    <Field label="District / City" placeholder="e.g. Bangalore Urban" {...register("permanentDistrict")} />
                    <Field label="State" placeholder="e.g. Karnataka" {...register("permanentState")} />
                    <Field label="Pincode" placeholder="e.g. 560001" {...register("permanentPincode")} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Academic History */}
          {activeTab === "academic" && (
            <div className="space-y-5">
              <div className="pb-2 border-b">
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <BookOpen size={18} className="text-teal-600 dark:text-teal-400" /> Qualifying Academic Records (10th, 11th, 12th)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">High school and secondary examination background</p>
              </div>
              <div className="space-y-5">
                {academicFields.map((field, index) => (
                  <div key={field.id} className="p-4 sm:p-5 border rounded-xl bg-card/60 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        <Award size={14} /> Level / Standard: {field.exam || `Exam ${index + 1}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                      <Field
                        className="sm:col-span-2 lg:col-span-2"
                        label="School / College Institute Name"
                        placeholder="e.g. St. Joseph Higher Secondary School"
                        {...register(`academicHistory.${index}.instituteName` as const)}
                      />
                      <Field
                        label="Board / University"
                        placeholder="e.g. CBSE / State Board"
                        {...register(`academicHistory.${index}.board` as const)}
                      />
                      <Field
                        label="Passing Year"
                        placeholder="e.g. 2024"
                        {...register(`academicHistory.${index}.year` as const)}
                      />
                      <Field
                        label="Aggregate Score / Percentage (%)"
                        placeholder="e.g. 88.5%"
                        {...register(`academicHistory.${index}.percentage` as const)}
                      />
                      <Field
                        className="sm:col-span-2 lg:col-span-1"
                        label="Subject Scores / Breakdown"
                        placeholder="e.g. PCB: 85%"
                        {...register(`academicHistory.${index}.subjectScores` as const)}
                      />
                      <Field
                        className="sm:col-span-2 lg:col-span-3"
                        label="Subjects Studied"
                        placeholder="e.g. Physics, Chemistry, Biology, English"
                        {...register(`academicHistory.${index}.subjects` as const)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: Program, Quota & Status */}
          {activeTab === "program" && (
            <div className="space-y-5">
              <div className="pb-2 border-b">
                <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
                  <GraduationCap size={18} className="text-teal-600 dark:text-teal-400" /> Academic Program Assignment & Quota Evaluation
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Batch enrollment, quota allocation and status metadata</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                <div>
                  <Label>Academic Batch Assignment *</Label>
                  <Controller
                    control={control}
                    name="batchId"
                    rules={{ required: "Batch selection is required" }}
                    render={({ field }) => (
                      <select className={selectClasses} {...field}>
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
                      <select className={selectClasses} {...field}>
                        <option value="active">Active</option>
                        <option value="promoted">Promoted</option>
                        <option value="graduated">Graduated</option>
                        <option value="dropped">Dropped</option>
                        <option value="transferred">Transferred</option>
                      </select>
                    )}
                  />
                </div>

                <div>
                  <Label>Admission Quota Category</Label>
                  <Controller
                    control={control}
                    name="quotaCategory"
                    render={({ field }) => (
                      <select className={selectClasses} {...field}>
                        <option value="general">General Merit</option>
                        <option value="reserved">Reserved Category</option>
                        <option value="management">Management Quota</option>
                      </select>
                    )}
                  />
                </div>

                <Field
                  label="Entrance / Merit Score (%)"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 85.50"
                  {...register("entranceMeritScore")}
                />

                <div className="sm:col-span-2 lg:col-span-3">
                  <Label>Admission Notes / Remarks</Label>
                  <Textarea
                    placeholder="Enter any admission remarks, background notes or special considerations..."
                    className="mt-1 min-h-[100px] resize-y"
                    rows={3}
                    {...register("applicantNotes")}
                  />
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Modal Footer */}
        <DialogFooter className="p-3.5 sm:p-4 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-between sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            {activeTab !== "personal" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-xs sm:text-sm px-3"
                onClick={() => {
                  if (activeTab === "family") setActiveTab("personal");
                  else if (activeTab === "address") setActiveTab("family");
                  else if (activeTab === "academic") setActiveTab("address");
                  else if (activeTab === "program") setActiveTab("academic");
                }}
              >
                <ChevronLeft size={14} className="mr-1" /> Previous
              </Button>
            )}
            {activeTab !== "program" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 text-xs sm:text-sm px-3"
                onClick={() => {
                  if (activeTab === "personal") setActiveTab("family");
                  else if (activeTab === "family") setActiveTab("address");
                  else if (activeTab === "address") setActiveTab("academic");
                  else if (activeTab === "academic") setActiveTab("program");
                }}
              >
                Next <ChevronRight size={14} className="ml-1" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="h-9 text-xs sm:text-sm px-3 sm:px-4" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 h-9 text-xs sm:text-sm px-4 shadow-sm"
              disabled={updateMutation.isPending}
              onClick={handleSubmit(onSubmit)}
            >
              {updateMutation.isPending && <Loader2 size={14} className="animate-spin" />}
              Save All Details
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
