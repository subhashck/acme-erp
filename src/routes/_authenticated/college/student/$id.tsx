import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { 
  GraduationCap, 
  FileText, 
  Receipt, 
  Calendar, 
  User, 
  CheckCircle2, 
  XCircle, 
  Upload, 
  ArrowLeft,
  ShieldCheck,
  Pencil,
  Tag
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { EditStudentModal } from "@/components/EditStudentModal";
import { Field } from "@/components/Field";
import { toast } from "sonner";
import { toNum } from "@/utils/math";
import { cn } from "@/utils/cn";

import { CollegeAccessGuard } from "@/components/CollegeAccessGuard";

export const Route = createFileRoute("/_authenticated/college/student/$id")({
  component: () => (
    <CollegeAccessGuard>
      <StudentProfilePage />
    </CollegeAccessGuard>
  ),
});

function StudentProfilePage() {
  const params: any = Route.useParams();
  const studentId = Number(params?.id || 0);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = React.useState<"info" | "docs" | "fees" | "attendance">("info");
  const [docModalOpen, setDocModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);

  const { data: student, isLoading, isError } = useQuery<any>({
    queryKey: ["nursing", "student", studentId],
    queryFn: async () => {
      if (!studentId || isNaN(studentId) || studentId <= 0) return null;
      const res = await fetch(`/api/nursing/students/${studentId}`);
      if (!res.ok) throw new Error("Failed to fetch student details");
      return res.json();
    },
    enabled: Boolean(studentId && !isNaN(studentId) && studentId > 0),
  });

  const docForm = useForm({
    defaultValues: {
      documentType: "certificate",
      title: "",
      fileUrl: "",
    },
  });

  const addDocMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch(`/api/nursing/students/${studentId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to attach document");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Document attached successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "student", studentId] });
      setDocModalOpen(false);
      docForm.reset();
    },
  });

  const verifyDocMutation = useMutation({
    mutationFn: async ({ docId, verificationStatus }: { docId: number; verificationStatus: string }) => {
      const res = await fetch(`/api/nursing/documents/${docId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationStatus }),
      });
      if (!res.ok) throw new Error("Failed to update verification status");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Document verification updated");
      queryClient.invalidateQueries({ queryKey: ["nursing", "student", studentId] });
    },
  });

  if (isLoading) {
    return <div className="p-6 text-center text-sm text-muted-foreground">Loading student profile...</div>;
  }

  if (!student) {
    return <div className="p-6 text-center text-sm text-red-500">Student record not found.</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to={"/college/students" as any}>
            <Button variant="outline" size="sm" className="h-9 px-3">
              <ArrowLeft size={16} className="mr-1" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-teal-600" />
              {student.name}
            </h1>
            <p className="text-xs text-muted-foreground">
              Enrollment No: <span className="font-semibold text-teal-600">{student.enrollmentNo}</span> • Course: {student.courseName} ({student.batchYear})
            </p>
          </div>
        </div>

        <Button
          onClick={() => setEditModalOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2 shadow-sm"
        >
          <Pencil size={15} /> Edit Profile
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b space-x-4">
        <button
          className={`pb-2 text-sm font-semibold border-b-2 flex items-center gap-2 ${activeTab === "info" ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("info")}
        >
          <User size={16} /> Personal Info
        </button>
        <button
          className={`pb-2 text-sm font-semibold border-b-2 flex items-center gap-2 ${activeTab === "docs" ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("docs")}
        >
          <FileText size={16} /> Document Verification ({student.documents?.length || 0})
        </button>
        <button
          className={`pb-2 text-sm font-semibold border-b-2 flex items-center gap-2 ${activeTab === "fees" ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("fees")}
        >
          <Receipt size={16} /> Fee Ledger
        </button>
        <button
          className={`pb-2 text-sm font-semibold border-b-2 flex items-center gap-2 ${activeTab === "attendance" ? "border-teal-600 text-teal-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("attendance")}
        >
          <Calendar size={16} /> Attendance History ({student.attendanceStats?.attendancePercent}%)
        </button>
      </div>

      {/* Tab 1: Personal Info */}
      {activeTab === "info" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Student Personal Information</CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs text-teal-600 hover:text-teal-700 flex items-center gap-1"
                onClick={() => setEditModalOpen(true)}
              >
                <Pencil size={12} /> Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Full Name:</span>
                <span className="font-semibold">{student.name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Email Address:</span>
                <span className="font-semibold">{student.email}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-semibold">{student.phone}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Gender:</span>
                <span className="font-semibold">{student.gender}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Date of Birth:</span>
                <span className="font-semibold">{student.dob || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Admission Date:</span>
                <span className="font-semibold">{student.admissionDate || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Residential Address:</span>
                <span className="font-semibold">{student.address || "N/A"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Guardian & Academic Batch Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Guardian Name:</span>
                <span className="font-semibold">{student.guardianName || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Guardian Phone:</span>
                <span className="font-semibold">{student.guardianPhone || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Guardian Relation:</span>
                <span className="font-semibold">{student.guardianRelation || "N/A"}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Program Course:</span>
                <span className="font-semibold">{student.courseName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Academic Batch:</span>
                <span className="font-semibold">{student.batchYear} (Section {student.batchSection})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Enrollment Status:</span>
                <span className="font-bold text-emerald-600 uppercase">{student.status}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Documents */}
      {activeTab === "docs" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Student Document Repository</CardTitle>
              <CardDescription>Upload and verify certificates, ID proof, and medical fitness records</CardDescription>
            </div>
            <Dialog open={docModalOpen} onOpenChange={setDocModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-teal-600 text-white flex items-center gap-1">
                  <Upload size={14} /> Attach Document
                </Button>
              </DialogTrigger>
              <DialogContent
                className="sm:max-w-[400px]"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
              >
                <DialogHeader>
                  <DialogTitle>Attach Document</DialogTitle>
                </DialogHeader>
                <form onSubmit={docForm.handleSubmit((data) => addDocMutation.mutate(data))} className="space-y-3 py-2">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Document Type</label>
                    <Controller
                      control={docForm.control}
                      name="documentType"
                      render={({ field }) => (
                        <select className="w-full border rounded-md p-2 bg-background text-sm" {...field}>
                          <option value="certificate">Secondary Certificate</option>
                          <option value="medical_fitness">Medical Fitness Certificate</option>
                          <option value="id_proof">Aadhar / National ID</option>
                          <option value="mark_sheet">Mark Sheet</option>
                        </select>
                      )}
                    />
                  </div>
                  <Controller
                    control={docForm.control}
                    name="title"
                    render={({ field, fieldState }) => (
                      <Field label="Document Title *" placeholder="e.g. 10+2 Mark Sheet" {...field} error={fieldState.error?.message} />
                    )}
                  />
                  <Controller
                    control={docForm.control}
                    name="fileUrl"
                    render={({ field, fieldState }) => (
                      <Field label="File Reference / URL *" placeholder="https://..." {...field} error={fieldState.error?.message} />
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDocModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-teal-600 text-white" disabled={addDocMutation.isPending}>
                      Save Document
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {student.documents?.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No documents attached yet.</div>
            ) : (
              <div className="divide-y border rounded-md">
                {student.documents?.map((doc: any) => (
                  <div key={doc.id} className="p-3 flex items-center justify-between hover:bg-muted/30">
                    <div>
                      <div className="font-semibold text-sm">{doc.title}</div>
                      <div className="text-xs text-muted-foreground uppercase">{doc.documentType}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      {doc.verificationStatus === "verified" && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      )}
                      {doc.verificationStatus === "rejected" && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                          <XCircle size={12} /> Rejected
                        </span>
                      )}
                      {doc.verificationStatus === "pending" && (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          Pending Verification
                        </span>
                      )}

                      {doc.verificationStatus !== "verified" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs text-emerald-600"
                          onClick={() => verifyDocMutation.mutate({ docId: doc.id, verificationStatus: "verified" })}
                        >
                          Verify
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Fee Ledger */}
      {activeTab === "fees" && (
        <div className="space-y-4">
          {Number(student.seatBookingAmount || 0) > 0 && (
            <div className="p-4 rounded-xl border bg-cyan-50/50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="font-bold text-cyan-950 dark:text-cyan-200 text-sm flex items-center gap-1.5">
                  <Tag size={15} className="text-cyan-600" />
                  Pre-Admission Seat Reservation Advance
                </div>
                <div className="text-cyan-800 dark:text-cyan-300">
                  Advance Paid: <strong className="font-mono text-sm">₹{Number(student.seatBookingAmount).toLocaleString()}</strong>
                  {student.seatBookingReceiptNo && ` • Receipt: ${student.seatBookingReceiptNo}`}
                  {student.seatBookingDate && ` • Date: ${student.seatBookingDate}`}
                </div>
              </div>
              <div>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-semibold uppercase border inline-flex items-center gap-1",
                  student.seatBookingStatus === "adjusted"
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                    : "bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800"
                )}>
                  {student.seatBookingStatus === "adjusted" ? "● Adjusted in Admission" : "● Unadjusted Balance"}
                </span>
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Student Fee Ledger & Transactions</CardTitle>
              <CardDescription>Payment receipts logged for this student</CardDescription>
            </CardHeader>
            <CardContent>
            {student.feeTransactions?.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No fee payment receipts recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <th className="p-3">Receipt No</th>
                      <th className="p-3">Invoice No</th>
                      <th className="p-3">Payment Date</th>
                      <th className="p-3">Payment Mode</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {student.feeTransactions?.map((tx: any) => (
                      <tr key={tx.id}>
                        <td className="p-3 font-semibold text-teal-600">{tx.receiptNumber}</td>
                        <td className="p-3 text-xs">{tx.invoiceNo}</td>
                        <td className="p-3">{tx.paymentDate}</td>
                        <td className="p-3 uppercase text-xs">{tx.paymentMode}</td>
                        <td className="p-3 font-bold text-emerald-600">
                          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(toNum(tx.amount))}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-emerald-100 text-emerald-800">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )}

      {/* Tab 4: Attendance History */}
      {activeTab === "attendance" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Attendance History & Eligibility Status</CardTitle>
              <CardDescription>Overall session attendance percentage check</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-teal-600">
                {student.attendanceStats?.attendancePercent}%
              </div>
              <div className="text-xs text-muted-foreground">
                {student.attendanceStats?.attendancePercent >= 75 ? (
                  <span className="text-emerald-600 font-semibold flex items-center justify-end gap-1">
                    <ShieldCheck size={14} /> Eligible for Examinations
                  </span>
                ) : (
                  <span className="text-rose-600 font-semibold">Deficient (&lt;75%)</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {student.attendanceRecords?.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No attendance records logged for this student yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <th className="p-3">Session Date</th>
                      <th className="p-3">Subject / Session</th>
                      <th className="p-3">Session Type</th>
                      <th className="p-3">Attendance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {student.attendanceRecords?.map((rec: any) => (
                      <tr key={rec.id}>
                        <td className="p-3 font-medium">{rec.sessionDate}</td>
                        <td className="p-3">{rec.subjectName || "General Session"}</td>
                        <td className="p-3 uppercase text-xs">{rec.sessionType}</td>
                        <td className="p-3">
                          {rec.status === "present" && <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold">Present</span>}
                          {rec.status === "absent" && <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-xs font-semibold">Absent</span>}
                          {rec.status === "late" && <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-xs font-semibold">Late</span>}
                          {rec.status === "leave" && <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs font-semibold">Leave</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit Student Profile Modal */}
      <EditStudentModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        student={student}
      />
    </div>
  );
}
