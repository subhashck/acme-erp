import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subYears, startOfDay } from "date-fns";
import { cn } from "@/utils/cn";

import { CollegeAccessGuard } from "@/components/CollegeAccessGuard";

export const Route = createFileRoute("/_authenticated/college/attendance")({
  component: () => (
    <CollegeAccessGuard>
      <AttendanceMarkingPage />
    </CollegeAccessGuard>
  ),
});

interface StudentAttendanceItem {
  studentId: number;
  studentName: string;
  enrollmentNo: string;
  status: "present" | "absent" | "late" | "leave";
}

function AttendanceMarkingPage() {
  const queryClient = useQueryClient();
  const [selectedBatchId, setSelectedBatchId] = React.useState<number>(0);
  const [sessionDate, setSessionDate] = React.useState<string>(new Date().toISOString().split("T")[0]);
  const [subjectName, setSubjectName] = React.useState<string>("Fundamentals of Nursing");
  const [sessionType, setSessionType] = React.useState<"theory" | "practical">("theory");

  const [studentStatusMap, setStudentStatusMap] = React.useState<Record<number, "present" | "absent" | "late" | "leave">>({});

  const today = React.useMemo(() => startOfDay(new Date()), []);
  const fiveYearsAgo = React.useMemo(() => subYears(today, 5), [today]);

  let parsedSessionDate: Date | undefined = undefined;
  if (sessionDate) {
    const d = new Date(sessionDate + "T00:00:00");
    if (!isNaN(d.getTime())) parsedSessionDate = d;
  }

  const { data: batches = [] } = useQuery<any[]>({
    queryKey: ["nursing", "batches"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/batches");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: students = [], isLoading: isLoadingStudents } = useQuery<any[]>({
    queryKey: ["nursing", "students", selectedBatchId],
    queryFn: async () => {
      if (!selectedBatchId) return [];
      const res = await fetch(`/api/nursing/students?batchId=${selectedBatchId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: selectedBatchId > 0,
  });

  const { data: attendanceSummary = [] } = useQuery<any[]>({
    queryKey: ["nursing", "attendance-summary", selectedBatchId],
    queryFn: async () => {
      if (!selectedBatchId) return [];
      const res = await fetch(`/api/nursing/attendance/summary?batchId=${selectedBatchId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: selectedBatchId > 0,
  });

  React.useEffect(() => {
    if (students.length > 0) {
      const initialMap: Record<number, "present" | "absent" | "late" | "leave"> = {};
      students.forEach((s) => {
        initialMap[s.id] = "present";
      });
      setStudentStatusMap(initialMap);
    }
  }, [students]);

  const markAttendanceMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/nursing/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to submit session attendance");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Batch session attendance marked successfully!");
      queryClient.invalidateQueries({ queryKey: ["nursing", "attendance-summary", selectedBatchId] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "dashboard-stats"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const setAllStatus = (status: "present" | "absent") => {
    const updated: Record<number, "present" | "absent" | "late" | "leave"> = {};
    students.forEach((s) => {
      updated[s.id] = status;
    });
    setStudentStatusMap(updated);
  };

  const onSubmitAttendance = () => {
    if (!selectedBatchId) {
      toast.error("Please select a batch first");
      return;
    }
    const records = students.map((s) => ({
      studentId: s.id,
      status: studentStatusMap[s.id] || "present",
    }));

    markAttendanceMutation.mutate({
      batchId: selectedBatchId,
      sessionDate,
      subjectName,
      sessionType,
      records,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-teal-600" />
            Session Attendance Marking
          </h1>
          <p className="text-sm text-muted-foreground">
            Session-wise theory and practical bulk attendance grid with exam eligibility checks (&ge;75%).
          </p>
        </div>
      </div>

      {/* Session Controls Header */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Select Batch *</label>
            <select
              className="w-full border rounded-md p-2 bg-background text-sm font-medium"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(Number(e.target.value))}
            >
              <option value={0}>-- Select Academic Batch --</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.courseName} - {b.academicYear} ({b.section})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Session Date *
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-9 border-input bg-background text-sm",
                    !parsedSessionDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-teal-600 shrink-0" />
                  {parsedSessionDate ? (
                    format(parsedSessionDate, "PPP")
                  ) : (
                    <span>Pick session date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[99999]" align="start">
                <Calendar
                  mode="single"
                  selected={parsedSessionDate}
                  onSelect={(date) => {
                    if (date) {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, "0");
                      const dd = String(date.getDate()).padStart(2, "0");
                      setSessionDate(`${yyyy}-${mm}-${dd}`);
                    }
                  }}
                  captionLayout="dropdown"
                  startMonth={fiveYearsAgo}
                  endMonth={today}
                  disabled={(date) => {
                    const target = startOfDay(date);
                    return target > today || target < fiveYearsAgo;
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Subject / Topic</label>
            <input
              type="text"
              className="w-full border rounded-md p-2 bg-background text-sm"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">Session Type</label>
            <select
              className="w-full border rounded-md p-2 bg-background text-sm"
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value as any)}
            >
              <option value="theory">Theory Lecture</option>
              <option value="practical">Practical / Clinical Lab</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Student Marking Grid */}
      {selectedBatchId > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Mark Attendance ({students.length} Students)</CardTitle>
              <CardDescription>Toggle attendance status per student for this session</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="text-xs text-emerald-600" onClick={() => setAllStatus("present")}>
                Mark All Present
              </Button>
              <Button size="sm" variant="outline" className="text-xs text-rose-600" onClick={() => setAllStatus("absent")}>
                Mark All Absent
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingStudents ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading batch students...</div>
            ) : students.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No students enrolled in this batch.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                      <th className="p-3">Enrollment No</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Cumulative Attendance %</th>
                      <th className="p-3 text-center">Status Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map((st) => {
                      const summary = attendanceSummary.find((s) => s.studentId === st.id);
                      const currentStatus = studentStatusMap[st.id] || "present";
                      const pct = summary?.attendancePercent ?? 100;

                      return (
                        <tr key={st.id} className="hover:bg-muted/30">
                          <td className="p-3 font-semibold text-teal-600">{st.enrollmentNo}</td>
                          <td className="p-3 font-medium">{st.name}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-xs ${pct >= 75 ? "text-emerald-600" : "text-rose-600"}`}>
                                {pct}%
                              </span>
                              {pct >= 75 ? (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                                  <ShieldCheck size={10} /> Eligible
                                </span>
                              ) : (
                                <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                                  <ShieldAlert size={10} /> Deficient
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="inline-flex rounded-md shadow-xs gap-1">
                              <Button
                                size="sm"
                                variant={currentStatus === "present" ? "default" : "outline"}
                                className={currentStatus === "present" ? "bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs" : "h-7 text-xs"}
                                onClick={() => setStudentStatusMap((prev) => ({ ...prev, [st.id]: "present" }))}
                              >
                                Present
                              </Button>
                              <Button
                                size="sm"
                                variant={currentStatus === "absent" ? "default" : "outline"}
                                className={currentStatus === "absent" ? "bg-rose-600 hover:bg-rose-700 text-white h-7 text-xs" : "h-7 text-xs"}
                                onClick={() => setStudentStatusMap((prev) => ({ ...prev, [st.id]: "absent" }))}
                              >
                                Absent
                              </Button>
                              <Button
                                size="sm"
                                variant={currentStatus === "late" ? "default" : "outline"}
                                className={currentStatus === "late" ? "bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs" : "h-7 text-xs"}
                                onClick={() => setStudentStatusMap((prev) => ({ ...prev, [st.id]: "late" }))}
                              >
                                Late
                              </Button>
                              <Button
                                size="sm"
                                variant={currentStatus === "leave" ? "default" : "outline"}
                                className={currentStatus === "leave" ? "bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs" : "h-7 text-xs"}
                                onClick={() => setStudentStatusMap((prev) => ({ ...prev, [st.id]: "leave" }))}
                              >
                                Leave
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2 px-6"
                onClick={onSubmitAttendance}
                disabled={markAttendanceMutation.isPending || students.length === 0}
              >
                <CheckCircle2 size={16} />
                {markAttendanceMutation.isPending ? "Submitting..." : "Save Session Attendance"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
