import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { BookOpen, Plus, Layers, CheckCircle2, XCircle, Edit, Trash2 } from "lucide-react";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

export const Route = createFileRoute("/_authenticated/college/courses")({
  component: CoursesAndBatchesPage,
});

interface Course {
  id: number;
  code: string;
  name: string;
  durationYears: number;
  totalSeats: number;
  regulatoryBody: string;
  active: boolean;
}

interface Batch {
  id: number;
  courseId: number;
  courseName: string;
  courseCode: string;
  academicYear: string;
  section: string;
  maxSeats: number;
  startDate?: string;
  endDate?: string;
  active: boolean;
}

function CoursesAndBatchesPage() {
  const queryClient = useQueryClient();
  const [courseDialogOpen, setCourseDialogOpen] = React.useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = React.useState(false);

  // Edit Batch State
  const [editBatchDialogOpen, setEditBatchDialogOpen] = React.useState(false);
  const [editingBatch, setEditingBatch] = React.useState<Batch | null>(null);

  // Delete Batch Confirmation State
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = React.useState(false);
  const [deletingBatch, setDeletingBatch] = React.useState<Batch | null>(null);

  // Edit Course State
  const [editCourseDialogOpen, setEditCourseDialogOpen] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<Course | null>(null);

  // Delete Course Confirmation State
  const [deleteCourseConfirmDialogOpen, setDeleteCourseConfirmDialogOpen] = React.useState(false);
  const [deletingCourse, setDeletingCourse] = React.useState<Course | null>(null);

  const { data: courses = [], isLoading: isLoadingCourses } = useQuery<Course[]>({
    queryKey: ["nursing", "courses"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/courses");
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
  });

  const { data: batches = [], isLoading: isLoadingBatches } = useQuery<Batch[]>({
    queryKey: ["nursing", "batches"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/batches");
      if (!res.ok) throw new Error("Failed to fetch batches");
      return res.json();
    },
  });

  const courseForm = useForm({
    defaultValues: {
      code: "",
      name: "",
      durationYears: 4,
      totalSeats: 30,
      regulatoryBody: "Manipur Nursing Council",
    },
  });

  const editCourseForm = useForm({
    defaultValues: {
      code: "",
      name: "",
      durationYears: 4,
      totalSeats: 30,
      regulatoryBody: "Manipur Nursing Council",
      active: true,
    },
  });

  const currentYear = new Date().getFullYear();

  const batchForm = useForm({
    defaultValues: {
      courseId: 0,
      startYear: currentYear,
      endYear: currentYear + 4,
      section: "A",
      maxSeats: 30,
    },
  });

  const editBatchForm = useForm({
    defaultValues: {
      courseId: 0,
      startYear: currentYear,
      endYear: currentYear + 4,
      section: "A",
      maxSeats: 30,
      active: true,
    },
  });

  const watchCreateStartYear = Number(batchForm.watch("startYear") || currentYear);
  const watchCreateEndYear = Number(batchForm.watch("endYear") || currentYear + 4);
  const derivedCreateBatchName = `${watchCreateStartYear}-${watchCreateEndYear}`;

  const watchEditStartYear = Number(editBatchForm.watch("startYear") || currentYear);
  const watchEditEndYear = Number(editBatchForm.watch("endYear") || currentYear + 4);
  const derivedEditBatchName = `${watchEditStartYear}-${watchEditEndYear}`;

  const createCourseMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/nursing/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create course");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Nursing course created successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "courses"] });
      setCourseDialogOpen(false);
      courseForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create course");
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: any }) => {
      const res = await fetch(`/api/nursing/courses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || "Failed to update course");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Nursing course updated successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "batches"] });
      setEditCourseDialogOpen(false);
      setEditingCourse(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update course");
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/nursing/courses/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || "Failed to delete course");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Nursing course deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "courses"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "batches"] });
      setDeleteCourseConfirmDialogOpen(false);
      setDeletingCourse(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete course");
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/nursing/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to create batch");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Academic batch created successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "batches"] });
      setBatchDialogOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create batch");
    },
  });

  const updateBatchMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: any }) => {
      const res = await fetch(`/api/nursing/batches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to update batch");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Academic batch updated successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "batches"] });
      setEditBatchDialogOpen(false);
      setEditingBatch(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update batch");
    },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/nursing/batches/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete batch");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Academic batch deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "batches"] });
      setDeleteConfirmDialogOpen(false);
      setDeletingBatch(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete batch");
    },
  });

  const onCourseSubmit = (data: any) => {
    createCourseMutation.mutate({
      ...data,
      durationYears: Number(data.durationYears),
      totalSeats: Number(data.totalSeats),
    });
  };

  const onBatchSubmit = (data: any) => {
    const startYr = Number(data.startYear || currentYear);
    const endYr = Number(data.endYear || currentYear + 4);
    const batchName = `${startYr}-${endYr}`;

    const targetCourseId = Number(data.courseId || (courses.length > 0 ? courses[0].id : 0));
    if (!targetCourseId) {
      toast.error("Please select a valid course program");
      return;
    }

    createBatchMutation.mutate({
      courseId: targetCourseId,
      academicYear: batchName,
      section: data.section || "A",
      maxSeats: Number(data.maxSeats || 30),
      startDate: `${startYr}-08-01`,
      endDate: `${endYr}-06-30`,
    });
  };

  const onEditBatchSubmit = (data: any) => {
    if (!editingBatch) return;
    const startYr = Number(data.startYear || currentYear);
    const endYr = Number(data.endYear || currentYear + 4);
    const batchName = `${startYr}-${endYr}`;

    updateBatchMutation.mutate({
      id: editingBatch.id,
      values: {
        courseId: Number(data.courseId || editingBatch.courseId),
        academicYear: batchName,
        section: data.section || "A",
        maxSeats: Number(data.maxSeats || 30),
        startDate: `${startYr}-08-01`,
        endDate: `${endYr}-06-30`,
        active: Boolean(data.active),
      },
    });
  };

  const handleOpenEditBatch = (batch: Batch) => {
    setEditingBatch(batch);

    let startY = currentYear;
    let endY = currentYear + 4;
    if (batch.academicYear && batch.academicYear.includes("-")) {
      const parts = batch.academicYear.split("-");
      startY = Number(parts[0]) || currentYear;
      endY = Number(parts[1]) || currentYear + 4;
    }

    editBatchForm.reset({
      courseId: batch.courseId,
      startYear: startY,
      endYear: endY,
      section: batch.section,
      maxSeats: batch.maxSeats,
      active: batch.active !== false,
    });
    setEditBatchDialogOpen(true);
  };

  const handleOpenDeleteBatch = (batch: Batch) => {
    setDeletingBatch(batch);
    setDeleteConfirmDialogOpen(true);
  };

  const onEditCourseSubmit = (data: any) => {
    if (!editingCourse) return;
    updateCourseMutation.mutate({
      id: editingCourse.id,
      values: {
        ...data,
        durationYears: Number(data.durationYears),
        totalSeats: Number(data.totalSeats),
        active: Boolean(data.active),
      },
    });
  };

  const handleOpenEditCourse = (course: Course) => {
    setEditingCourse(course);
    editCourseForm.reset({
      code: course.code,
      name: course.name,
      durationYears: course.durationYears,
      totalSeats: course.totalSeats,
      regulatoryBody: course.regulatoryBody,
      active: course.active,
    });
    setEditCourseDialogOpen(true);
  };

  const handleOpenDeleteCourse = (course: Course) => {
    setDeletingCourse(course);
    setDeleteCourseConfirmDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-teal-600" />
            Courses & Academic Batches
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure nursing degree/diploma programs and active student academic batches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Course Dialog */}
          <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2">
                <Plus size={16} /> Add Program Course
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-106"
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Add Nursing Course</DialogTitle>
              </DialogHeader>
              <form onSubmit={courseForm.handleSubmit(onCourseSubmit)} className="space-y-4 py-2">
                <Controller
                  control={courseForm.control}
                  name="code"
                  render={({ field, fieldState }) => (
                    <Field label="Course Code *" placeholder="e.g. BSC_NURSING" {...field} error={fieldState.error?.message} />
                  )}
                />

                <Controller
                  control={courseForm.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field label="Course Full Name *" placeholder="e.g. B.Sc. Nursing" {...field} error={fieldState.error?.message} />
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    control={courseForm.control}
                    name="durationYears"
                    render={({ field, fieldState }) => (
                      <Field label="Duration (Years) *" type="number" {...field} error={fieldState.error?.message} />
                    )}
                  />
                  <Controller
                    control={courseForm.control}
                    name="totalSeats"
                    render={({ field, fieldState }) => (
                      <Field label="Total Seats *" type="number" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>

                <Controller
                  control={courseForm.control}
                  name="regulatoryBody"
                  render={({ field, fieldState }) => (
                    <Field label="Regulatory Council *" placeholder="e.g. Manipur Nursing Council" {...field} error={fieldState.error?.message} />
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCourseDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={createCourseMutation.isPending}>
                    {createCourseMutation.isPending ? "Saving..." : "Save Course"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Batch Dialog */}
          <Dialog
            open={batchDialogOpen}
            onOpenChange={(open) => {
              setBatchDialogOpen(open);
              if (open) {
                batchForm.reset({
                  courseId: courses.length > 0 ? courses[0].id : 0,
                  startYear: currentYear,
                  endYear: currentYear + 4,
                  section: "A",
                  maxSeats: 30,
                });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2">
                <Layers size={16} /> Create Academic Batch
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-[440px]"
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Create Academic Batch</DialogTitle>
              </DialogHeader>
              <form onSubmit={batchForm.handleSubmit(onBatchSubmit)} className="space-y-4 py-2">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Select Course *</label>
                  <Controller
                    control={batchForm.control}
                    name="courseId"
                    render={({ field }) => (
                      <select
                        className="w-full border rounded-md p-2 bg-background text-sm font-medium"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      >
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                {/* Start Year & End Year Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    control={batchForm.control}
                    name="startYear"
                    render={({ field, fieldState }) => (
                      <Field label="Start Year *" type="number" placeholder={String(currentYear)} {...field} error={fieldState.error?.message} />
                    )}
                  />
                  <Controller
                    control={batchForm.control}
                    name="endYear"
                    render={({ field, fieldState }) => (
                      <Field label="End Year *" type="number" placeholder={String(currentYear + 4)} {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>

                {/* Derived Batch Name Display */}
                <div className="p-2.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 rounded-md text-xs flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Derived Batch Name:</span>
                  <span className="font-bold text-teal-700 dark:text-teal-300 text-sm">{derivedCreateBatchName}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    control={batchForm.control}
                    name="section"
                    render={({ field, fieldState }) => (
                      <Field label="Section *" placeholder="A" {...field} error={fieldState.error?.message} />
                    )}
                  />
                  <Controller
                    control={batchForm.control}
                    name="maxSeats"
                    render={({ field, fieldState }) => (
                      <Field label="Batch Max Seats *" type="number" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setBatchDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={createBatchMutation.isPending}>
                    {createBatchMutation.isPending ? "Creating..." : "Create Batch"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Courses List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Active Program Courses</CardTitle>
          <CardDescription>Nursing degree and diploma programs configured in the college</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCourses ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading courses...</div>
          ) : courses.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No nursing courses found. Create one above.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <div key={course.id} className="p-4 border rounded-lg bg-card shadow-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-teal-600 dark:text-teal-400 text-sm bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">
                      {course.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {course.active ? (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-teal-600 hover:bg-teal-50"
                        title="Edit Course"
                        onClick={() => handleOpenEditCourse(course)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50"
                        title="Delete Course"
                        onClick={() => handleOpenDeleteCourse(course)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-base">{course.name}</h3>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Duration: <span className="font-medium text-foreground">{course.durationYears} Years</span></div>
                    <div>Total Seats: <span className="font-medium text-foreground">{course.totalSeats} Seats</span></div>
                    <div>Council: <span className="font-medium text-foreground">{course.regulatoryBody}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batches List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Configured Academic Batches</CardTitle>
          <CardDescription>Section-wise batches derived from start and end year</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBatches ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading batches...</div>
          ) : batches.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No academic batches configured yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                    <th className="p-3">Course</th>
                    <th className="p-3">Batch Name</th>
                    <th className="p-3">Section</th>
                    <th className="p-3">Max Seat Capacity</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/30">
                      <td className="p-3 font-medium">{b.courseName || b.courseCode}</td>
                      <td className="p-3 font-bold text-teal-600">{b.academicYear}</td>
                      <td className="p-3 font-semibold">{b.section}</td>
                      <td className="p-3">{b.maxSeats} Seats</td>
                      <td className="p-3">
                        {b.active !== false ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 size={12} /> Active Batch
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <XCircle size={12} /> Inactive Batch
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50"
                          title="Edit Batch"
                          onClick={() => handleOpenEditBatch(b)}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                          title="Delete Batch"
                          onClick={() => handleOpenDeleteBatch(b)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Batch Dialog */}
      <Dialog open={editBatchDialogOpen} onOpenChange={setEditBatchDialogOpen}>
        <DialogContent
          className="sm:max-w-110"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Edit Academic Batch</DialogTitle>
          </DialogHeader>
          <form onSubmit={editBatchForm.handleSubmit(onEditBatchSubmit)} className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Select Course *</label>
              <Controller
                control={editBatchForm.control}
                name="courseId"
                render={({ field }) => (
                  <select
                    className="w-full border rounded-md p-2 bg-background text-sm font-medium"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            {/* Start Year & End Year Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <Controller
                control={editBatchForm.control}
                name="startYear"
                render={({ field, fieldState }) => (
                  <Field label="Start Year *" type="number" placeholder={String(currentYear)} {...field} error={fieldState.error?.message} />
                )}
              />
              <Controller
                control={editBatchForm.control}
                name="endYear"
                render={({ field, fieldState }) => (
                  <Field label="End Year *" type="number" placeholder={String(currentYear + 4)} {...field} error={fieldState.error?.message} />
                )}
              />
            </div>

            {/* Derived Batch Name Display */}
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900 rounded-md text-xs flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Derived Batch Name:</span>
              <span className="font-bold text-teal-700 dark:text-teal-300 text-sm">{derivedEditBatchName}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Controller
                control={editBatchForm.control}
                name="section"
                render={({ field, fieldState }) => (
                  <Field label="Section *" placeholder="A" {...field} error={fieldState.error?.message} />
                )}
              />
              <Controller
                control={editBatchForm.control}
                name="maxSeats"
                render={({ field, fieldState }) => (
                  <Field label="Batch Max Seats *" type="number" {...field} error={fieldState.error?.message} />
                )}
              />
            </div>

            <Controller
              control={editBatchForm.control}
              name="active"
              render={({ field }) => (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-foreground cursor-pointer" onClick={() => field.onChange(!field.value)}>
                      Batch Status
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {field.value ? "Active academic batch in session" : "Inactive / Archived batch"}
                    </p>
                  </div>
                  <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                </div>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditBatchDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={updateBatchMutation.isPending}>
                {updateBatchMutation.isPending ? "Updating..." : "Update Batch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Batch Confirmation Dialog */}
      <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
        <DialogContent
          className="sm:max-w-100"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-rose-600">Confirm Delete Batch</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground space-y-2">
            <p>
              Are you sure you want to delete academic batch{" "}
              <strong className="text-foreground">{deletingBatch?.academicYear} (Section {deletingBatch?.section})</strong>?
            </p>
            <p className="text-xs text-rose-500 font-medium">
              Warning: This action is permanent. Enrolled students assigned to this batch must be reassigned.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={deleteBatchMutation.isPending}
              onClick={() => deletingBatch && deleteBatchMutation.mutate(deletingBatch.id)}
            >
              {deleteBatchMutation.isPending ? "Deleting..." : "Delete Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      <Dialog open={editCourseDialogOpen} onOpenChange={setEditCourseDialogOpen}>
        <DialogContent
          className="sm:max-w-106"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Edit Nursing Course</DialogTitle>
          </DialogHeader>
          <form onSubmit={editCourseForm.handleSubmit(onEditCourseSubmit)} className="space-y-4 py-2">
            <Controller
              control={editCourseForm.control}
              name="code"
              render={({ field, fieldState }) => (
                <Field label="Course Code *" placeholder="e.g. BSC_NURSING" {...field} error={fieldState.error?.message} />
              )}
            />

            <Controller
              control={editCourseForm.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field label="Course Full Name *" placeholder="e.g. B.Sc. Nursing" {...field} error={fieldState.error?.message} />
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <Controller
                control={editCourseForm.control}
                name="durationYears"
                render={({ field, fieldState }) => (
                  <Field label="Duration (Years) *" type="number" {...field} error={fieldState.error?.message} />
                )}
              />
              <Controller
                control={editCourseForm.control}
                name="totalSeats"
                render={({ field, fieldState }) => (
                  <Field label="Total Seats *" type="number" {...field} error={fieldState.error?.message} />
                )}
              />
            </div>

            <Controller
              control={editCourseForm.control}
              name="regulatoryBody"
              render={({ field, fieldState }) => (
                <Field label="Regulatory Council *" placeholder="e.g. Manipur Nursing Council" {...field} error={fieldState.error?.message} />
              )}
            />

            <Controller
              control={editCourseForm.control}
              name="active"
              render={({ field }) => (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="space-y-0.5">
                    <label className="text-sm font-semibold text-foreground cursor-pointer" onClick={() => field.onChange(!field.value)}>
                      Course Status
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {field.value ? "Active and available for admissions" : "Inactive / Suspended course"}
                    </p>
                  </div>
                  <Switch checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                </div>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditCourseDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={updateCourseMutation.isPending}>
                {updateCourseMutation.isPending ? "Updating..." : "Update Course"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Course Confirmation Dialog */}
      <Dialog open={deleteCourseConfirmDialogOpen} onOpenChange={setDeleteCourseConfirmDialogOpen}>
        <DialogContent
          className="sm:max-w-100"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-rose-600">Confirm Delete Course</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-muted-foreground space-y-2">
            <p>
              Are you sure you want to delete course{" "}
              <strong className="text-foreground">{deletingCourse?.name} ({deletingCourse?.code})</strong>?
            </p>
            <p className="text-xs text-rose-500 font-medium">
              Warning: This action is permanent. Make sure no academic batches or active students are associated with this course.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteCourseConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={deleteCourseMutation.isPending}
              onClick={() => deletingCourse && deleteCourseMutation.mutate(deletingCourse.id)}
            >
              {deleteCourseMutation.isPending ? "Deleting..." : "Delete Course"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
