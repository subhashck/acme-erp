import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Search,
  DollarSign,
  Users,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ArrowRight,
  BookOpen,
  ShieldAlert,
  CalendarDays,
  Sparkles,
  Pencil,
  Layers,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { toast } from "sonner";
import { cn } from "@/utils/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfDay } from "date-fns";

export const Route = createFileRoute("/_authenticated/college/academic-schedules")({
  component: AcademicSchedulesPage,
});

interface BatchSummary {
  batchId: number;
  batchName: string;
  courseName: string;
  academicYear: string;
  section: string;
  totalStudents: number;
  termStartDate: string | null;
  termEndDate: string | null;
  feeDueDate: string | null;
  totalExpected: number;
  totalCollected: number;
  totalBalanceDue: number;
  overdueCount: number;
  status: "on_track" | "due_soon" | "overdue";
}

function AcademicSchedulesPage() {
  const queryClient = useQueryClient();
  const [editingSchedule, setEditingSchedule] = React.useState<any | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false);
  const [selectedBatchFilter, setSelectedBatchFilter] = React.useState<number>(0);

  const today = React.useMemo(() => startOfDay(new Date()), []);

  const { data: batches = [] } = useQuery<any[]>({
    queryKey: ["nursing", "batches"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/batches");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: schedules = [], isLoading: isLoadingSchedules } = useQuery<any[]>({
    queryKey: ["nursing", "academic-schedules", selectedBatchFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBatchFilter > 0) params.append("batchId", String(selectedBatchFilter));
      const res = await fetch(`/api/nursing/academic-schedules?${params.toString()}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: dueDashboard, isLoading: isLoadingDashboard } = useQuery<{
    batchSummaries: BatchSummary[];
  }>({
    queryKey: ["nursing", "fees", "due-dashboard", selectedBatchFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedBatchFilter > 0) params.append("batchId", String(selectedBatchFilter));
      const res = await fetch(`/api/nursing/fees/due-dashboard?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch fee due dashboard");
      return res.json();
    },
  });

  const defaultStartDate = React.useMemo(() => new Date().toISOString().split("T")[0], []);
  const defaultEndDate = React.useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 5);
    return d.toISOString().split("T")[0];
  }, []);

  const scheduleForm = useForm({
    defaultValues: {
      batchId: 0,
      academicYear: "",
      semester: 1,
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      feeDueOffsetDays: 15,
      feeDueDate: "",
      remarks: "",
    },
  });

  const watchedBatchId = scheduleForm.watch("batchId");
  const watchedStartDate = scheduleForm.watch("startDate");
  const watchedEndDate = scheduleForm.watch("endDate");

  const derivedAcademicYear = React.useMemo(() => {
    if (!watchedStartDate) return "";
    const startD = new Date(watchedStartDate + "T00:00:00");
    if (isNaN(startD.getTime())) return "";
    const startYear = startD.getFullYear();

    if (watchedEndDate) {
      const endD = new Date(watchedEndDate + "T00:00:00");
      if (!isNaN(endD.getTime())) {
        const endYear = endD.getFullYear();
        if (endYear > startYear) {
          return `${startYear}-${endYear}`;
        }
      }
    }
    return `${startYear}-${startYear + 1}`;
  }, [watchedStartDate, watchedEndDate]);

  const derivedSemester = React.useMemo(() => {
    const batchId = Number(watchedBatchId);
    const startDateStr = watchedStartDate;

    // 1. Check existing configured schedules for this batch to suggest next sequential semester
    if (batchId > 0 && schedules.length > 0) {
      const batchSchedules = schedules.filter((s) => s.batchId === batchId);
      if (batchSchedules.length > 0) {
        const maxSem = Math.max(...batchSchedules.map((s) => Number(s.semester) || 0));
        if (maxSem > 0 && maxSem < 8) {
          return maxSem + 1;
        }
      }
    }

    // 2. Derive semester from batch start year & term start date
    if (batchId > 0 && startDateStr) {
      const selectedB = batches.find((b) => b.id === batchId);
      if (selectedB) {
        let batchStartYear: number | null = null;
        if (selectedB.startDate) {
          const bd = new Date(selectedB.startDate + "T00:00:00");
          if (!isNaN(bd.getTime())) batchStartYear = bd.getFullYear();
        }
        if (!batchStartYear && selectedB.academicYear) {
          const match = selectedB.academicYear.match(/^(\d{4})/);
          if (match) batchStartYear = Number(match[1]);
        }

        const termD = new Date(startDateStr + "T00:00:00");
        if (batchStartYear && !isNaN(termD.getTime())) {
          const termYear = termD.getFullYear();
          const termMonth = termD.getMonth() + 1;

          let yearDiff = termYear - batchStartYear;
          if (yearDiff < 0) yearDiff = 0;

          let sem = 1;
          if (termMonth >= 7) {
            sem = yearDiff * 2 + 1;
          } else {
            sem = Math.max(1, (yearDiff - 1) * 2 + 2);
          }
          return Math.min(8, Math.max(1, sem));
        }
      }
    }

    return 1;
  }, [watchedBatchId, watchedStartDate, batches, schedules]);

  React.useEffect(() => {
    scheduleForm.setValue("academicYear", derivedAcademicYear, { shouldValidate: true });
  }, [derivedAcademicYear, scheduleForm]);

  React.useEffect(() => {
    if (!editingSchedule) {
      scheduleForm.setValue("semester", derivedSemester, { shouldValidate: true });
    }
  }, [derivedSemester, scheduleForm, editingSchedule]);

  const createScheduleMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/nursing/academic-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create academic schedule");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Academic schedule & fee due dates configured successfully!");
      queryClient.invalidateQueries({ queryKey: ["nursing", "academic-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "fees", "due-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "batches"] });
      setScheduleModalOpen(false);
      setEditingSchedule(null);
      scheduleForm.reset({
        batchId: 0,
        academicYear: derivedAcademicYear,
        semester: 1,
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        feeDueOffsetDays: 15,
        feeDueDate: "",
        remarks: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: any }) => {
      const res = await fetch(`/api/nursing/academic-schedules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error || "Failed to update academic schedule");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Academic schedule updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["nursing", "academic-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "fees", "due-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "batches"] });
      setScheduleModalOpen(false);
      setEditingSchedule(null);
      scheduleForm.reset({
        batchId: 0,
        academicYear: derivedAcademicYear,
        semester: 1,
        startDate: defaultStartDate,
        endDate: defaultEndDate,
        feeDueOffsetDays: 15,
        feeDueDate: "",
        remarks: "",
      });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/nursing/academic-schedules/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete schedule");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Academic schedule deleted");
      queryClient.invalidateQueries({ queryKey: ["nursing", "academic-schedules"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "fees", "due-dashboard"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const handleNewSchedule = () => {
    setEditingSchedule(null);
    scheduleForm.reset({
      batchId: 0,
      academicYear: derivedAcademicYear,
      semester: 1,
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      feeDueOffsetDays: 15,
      feeDueDate: "",
      remarks: "",
    });
    setScheduleModalOpen(true);
  };

  const handleEditSchedule = (sch: any) => {
    setEditingSchedule(sch);
    scheduleForm.reset({
      batchId: sch.batchId,
      academicYear: sch.academicYear,
      semester: sch.semester,
      startDate: sch.startDate,
      endDate: sch.endDate,
      feeDueOffsetDays: sch.feeDueOffsetDays,
      feeDueDate: sch.feeDueDate || "",
      remarks: sch.remarks || "",
    });
    setScheduleModalOpen(true);
  };

  const onScheduleSubmit = (data: any) => {
    const batchId = Number(data.batchId);
    if (!batchId || batchId <= 0) {
      scheduleForm.setError("batchId", { type: "manual", message: "Please select an academic batch" });
      toast.error("Please select an academic batch");
      return;
    }

    const payload = {
      ...data,
      academicYear: derivedAcademicYear || data.academicYear,
      batchId,
      semester: Number(data.semester),
      feeDueOffsetDays: Number(data.feeDueOffsetDays),
    };

    if (editingSchedule) {
      updateScheduleMutation.mutate({ id: editingSchedule.id, values: payload });
    } else {
      createScheduleMutation.mutate(payload);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-teal-600" />
            Academic Schedules & Term Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Define start/end dates for academic years and semesters to automatically calculate term schedules and fee due offsets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild size="sm">
            <Link to="/college/fee-structures" className="flex items-center gap-1.5 text-xs">
              <Layers size={14} /> Fee Structures
            </Link>
          </Button>

          <Button variant="outline" asChild size="sm">
            <Link to="/college/fee-dues" className="flex items-center gap-1.5 text-xs text-teal-600 border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950">
              <DollarSign size={14} /> Fee Due Tracking
            </Link>
          </Button>

          <Dialog
            open={scheduleModalOpen}
            onOpenChange={(open) => {
              setScheduleModalOpen(open);
              if (!open) setEditingSchedule(null);
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={handleNewSchedule} className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2">
                <Plus size={16} /> Configure Term Schedule
              </Button>
            </DialogTrigger>
          <DialogContent
            className="sm:max-w-md"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>{editingSchedule ? "Edit Academic Term Schedule" : "Academic Year & Semester Schedule"}</DialogTitle>
            </DialogHeader>

            <form onSubmit={scheduleForm.handleSubmit(onScheduleSubmit)} className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Target Academic Batch *</label>
                <Controller
                  control={scheduleForm.control}
                  name="batchId"
                  render={({ field, fieldState }) => (
                    <div>
                      <Select
                        value={field.value ? String(field.value) : ""}
                        onValueChange={(val) => {
                          const num = Number(val);
                          field.onChange(num);
                          if (num > 0) scheduleForm.clearErrors("batchId");
                        }}
                      >
                        <SelectTrigger className={cn("w-full", fieldState.error && "border-red-500 bg-red-50/20")}>
                          <SelectValue placeholder="-- Select Academic Batch --" />
                        </SelectTrigger>
                        <SelectContent className="z-99999">
                          {batches.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                              {b.courseName} - {b.academicYear} (Section {b.section})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && (
                        <p className="text-xs text-red-500 font-medium mt-1">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Controller
                  control={scheduleForm.control}
                  name="academicYear"
                  render={({ field, fieldState }) => (
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1">
                        Academic Year <span className="text-xs text-muted-foreground font-normal">(Auto-derived)</span>
                      </label>
                      <input
                        type="text"
                        readOnly
                        {...field}
                        value={derivedAcademicYear}
                        placeholder="e.g. 2026-2027"
                        className="w-full h-9 border rounded-md px-3 py-1 bg-muted/60 text-muted-foreground text-sm font-medium cursor-not-allowed border-input focus:outline-none"
                      />
                      {fieldState.error && (
                        <p className="text-xs text-red-500 font-medium mt-1">{fieldState.error.message}</p>
                      )}
                    </div>
                  )}
                />

                <Controller
                  control={scheduleForm.control}
                  name="semester"
                  render={({ field }) => (
                    <div>
                      <label className="text-sm font-medium text-foreground block mb-1">
                        Semester <span className="text-xs text-teal-600 dark:text-teal-400 font-normal">(Auto-suggested)</span>
                      </label>
                      <select
                        className="w-full border rounded-md p-2 bg-background text-sm"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      >
                        <option value={1}>Semester 1 / Year 1</option>
                        <option value={2}>Semester 2</option>
                        <option value={3}>Semester 3 / Year 2</option>
                        <option value={4}>Semester 4</option>
                        <option value={5}>Semester 5 / Year 3</option>
                        <option value={6}>Semester 6</option>
                        <option value={7}>Semester 7 / Year 4</option>
                        <option value={8}>Semester 8</option>
                      </select>
                    </div>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Controller
                  control={scheduleForm.control}
                  name="startDate"
                  render={({ field, fieldState }) => {
                    let parsedDate: Date | undefined = undefined;
                    if (field.value) {
                      const d = new Date(field.value + "T00:00:00");
                      if (!isNaN(d.getTime())) parsedDate = d;
                    }
                    return (
                      <div>
                        <label className="text-sm font-medium text-foreground block mb-1">Term Start Date *</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-9 border-input bg-background text-sm",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-teal-600 shrink-0" />
                              {parsedDate ? format(parsedDate, "PPP") : <span>Pick start date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-99999" align="start">
                            <Calendar
                              mode="single"
                              selected={parsedDate}
                              onSelect={(date) => {
                                if (date) {
                                  const yyyy = date.getFullYear();
                                  const mm = String(date.getMonth() + 1).padStart(2, "0");
                                  const dd = String(date.getDate()).padStart(2, "0");
                                  field.onChange(`${yyyy}-${mm}-${dd}`);
                                }
                              }}
                              captionLayout="dropdown"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  }}
                />

                <Controller
                  control={scheduleForm.control}
                  name="endDate"
                  render={({ field, fieldState }) => {
                    let parsedDate: Date | undefined = undefined;
                    if (field.value) {
                      const d = new Date(field.value + "T00:00:00");
                      if (!isNaN(d.getTime())) parsedDate = d;
                    }
                    return (
                      <div>
                        <label className="text-sm font-medium text-foreground block mb-1">Term End Date *</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-9 border-input bg-background text-sm",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-teal-600 shrink-0" />
                              {parsedDate ? format(parsedDate, "PPP") : <span>Pick end date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-99999" align="start">
                            <Calendar
                              mode="single"
                              selected={parsedDate}
                              onSelect={(date) => {
                                if (date) {
                                  const yyyy = date.getFullYear();
                                  const mm = String(date.getMonth() + 1).padStart(2, "0");
                                  const dd = String(date.getDate()).padStart(2, "0");
                                  field.onChange(`${yyyy}-${mm}-${dd}`);
                                }
                              }}
                              captionLayout="dropdown"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Controller
                  control={scheduleForm.control}
                  name="feeDueOffsetDays"
                  render={({ field, fieldState }) => (
                    <Field
                      label="Fee Due Offset (Days after Start)"
                      type="number"
                      placeholder="15"
                      {...field}
                      error={fieldState.error?.message}
                    />
                  )}
                />

                <Controller
                  control={scheduleForm.control}
                  name="remarks"
                  render={({ field, fieldState }) => (
                    <Field label="Schedule Remarks / Notes" placeholder="e.g. Session 1 Due" {...field} error={fieldState.error?.message} />
                  )}
                />
              </div>

              <DialogFooter className="pt-2 border-t">
                <Button type="button" variant="outline" onClick={() => setScheduleModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-teal-600 hover:bg-teal-700 text-white"
                  disabled={createScheduleMutation.isPending || updateScheduleMutation.isPending}
                >
                  {editingSchedule
                    ? updateScheduleMutation.isPending
                      ? "Updating..."
                      : "Update Academic Schedule"
                    : createScheduleMutation.isPending
                    ? "Saving..."
                    : "Save Academic Schedule"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {/* Batch-wise Summary Overview Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-teal-600" />
            Batch-wise Fee Due Summaries
          </h2>
          <span className="text-xs text-muted-foreground">
            Calculated from term start dates & configured fee structures
          </span>
        </div>

        {isLoadingDashboard ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading batch due summaries...</div>
        ) : (dueDashboard?.batchSummaries || []).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No academic batches configured yet. Click "+ Configure Term Schedule" above to add term dates.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(dueDashboard?.batchSummaries || []).map((b) => (
              <Card key={b.batchId} className="relative overflow-hidden border">
                <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">{b.batchName}</CardTitle>
                    <CardDescription className="text-xs">
                      {b.courseName} • Section {b.section} ({b.totalStudents} Students)
                    </CardDescription>
                  </div>
                  {b.status === "overdue" ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1">
                      <ShieldAlert size={12} /> Overdue
                    </span>
                  ) : b.status === "due_soon" ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1">
                      <Clock size={12} /> Due Soon
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 size={12} /> On Track
                    </span>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                    <div>
                      <span className="text-muted-foreground block">Term Start Date</span>
                      <span className="font-semibold text-foreground">
                        {b.termStartDate ? format(new Date(b.termStartDate + "T00:00:00"), "PPP") : "Not Configured"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Fee Due Date</span>
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        {b.feeDueDate ? format(new Date(b.feeDueDate + "T00:00:00"), "PPP") : "Not Configured"}
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/40 p-2.5 rounded-md space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Expected:</span>
                      <span className="font-bold text-foreground">₹{b.totalExpected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Total Collected:</span>
                      <span className="font-bold">₹{b.totalCollected.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold border-t pt-1">
                      <span>Net Outstanding Balance:</span>
                      <span>₹{b.totalBalanceDue.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Configured Term Schedules List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Configured Academic Term Schedules</CardTitle>
          <CardDescription>Academic year & semester start/end dates and fee due offsets</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingSchedules ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Loading term schedules...</div>
          ) : schedules.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">No term schedules configured yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                    <th className="p-3">Batch & Course</th>
                    <th className="p-3">Semester / Term</th>
                    <th className="p-3">Start Date</th>
                    <th className="p-3">End Date</th>
                    <th className="p-3">Calculated Fee Due Date</th>
                    <th className="p-3">Due Offset</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {schedules.map((sch) => (
                    <tr key={sch.id} className="hover:bg-muted/30">
                      <td className="p-3 font-semibold text-foreground">
                        {sch.courseName} ({sch.batchAcademicYear})
                      </td>
                      <td className="p-3 font-medium">Semester {sch.semester}</td>
                      <td className="p-3">{format(new Date(sch.startDate + "T00:00:00"), "PPP")}</td>
                      <td className="p-3">{format(new Date(sch.endDate + "T00:00:00"), "PPP")}</td>
                      <td className="p-3 font-semibold text-teal-600 dark:text-teal-400">
                        {sch.feeDueDate ? format(new Date(sch.feeDueDate + "T00:00:00"), "PPP") : "N/A"}
                      </td>
                      <td className="p-3 text-xs">{sch.feeDueOffsetDays} Days</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                            title="Edit Schedule"
                            onClick={() => handleEditSchedule(sch)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete Schedule"
                            disabled={deleteScheduleMutation.isPending}
                            onClick={() => deleteScheduleMutation.mutate(sch.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
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
  );
}
