import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { BookOpen, Plus, Sparkles, Filter, Search, Award, CheckCircle2, Edit, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/Field";
import { toast } from "sonner";
import { authClient } from "@/services/auth";

import { CollegeAccessGuard } from "@/components/CollegeAccessGuard";

export const Route = createFileRoute("/_authenticated/college/subjects")({
  component: () => (
    <CollegeAccessGuard>
      <SubjectsMasterPage />
    </CollegeAccessGuard>
  ),
});

interface Subject {
  id: number;
  courseId: number;
  courseName: string;
  code: string;
  name: string;
  year: number;
  semester: number;
  theoryMaxMarks: number;
  practicalMaxMarks: number;
  credits: number;
  active: boolean;
}

function SubjectsMasterPage() {
  const queryClient = useQueryClient();
  const session = authClient.useSession();
  const isAdmin = session.data?.user?.role === "admin";

  const [selectedSemester, setSelectedSemester] = React.useState<number>(0);
  const [selectedCourseId, setSelectedCourseId] = React.useState<number>(0);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);

  // Edit Subject State
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingSubject, setEditingSubject] = React.useState<Subject | null>(null);

  // Delete Subject Confirmation State
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = React.useState(false);
  const [deletingSubject, setDeletingSubject] = React.useState<Subject | null>(null);

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ["nursing", "courses"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/courses");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: subjects = [], isLoading } = useQuery<Subject[]>({
    queryKey: ["nursing", "subjects", selectedCourseId, selectedSemester, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCourseId) params.append("courseId", String(selectedCourseId));
      if (selectedSemester) params.append("semester", String(selectedSemester));
      if (searchQuery) params.append("search", searchQuery);
      const res = await fetch(`/api/nursing/subjects?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch subjects");
      return res.json();
    },
  });

  const addForm = useForm({
    defaultValues: {
      courseId: 0,
      code: "",
      name: "",
      year: 1,
      semester: 1,
      theoryMaxMarks: 75,
      practicalMaxMarks: 25,
      credits: 4,
    },
  });

  const editForm = useForm({
    defaultValues: {
      courseId: 0,
      code: "",
      name: "",
      year: 1,
      semester: 1,
      theoryMaxMarks: 75,
      practicalMaxMarks: 25,
      credits: 4,
    },
  });

  const createSubjectMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/nursing/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to create subject");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Subject added to curriculum");
      queryClient.invalidateQueries({ queryKey: ["nursing", "subjects"] });
      setAddDialogOpen(false);
      addForm.reset();
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const updateSubjectMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number; values: any }) => {
      const res = await fetch(`/api/nursing/subjects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update subject");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Subject details updated successfully");
      queryClient.invalidateQueries({ queryKey: ["nursing", "subjects"] });
      setEditDialogOpen(false);
      setEditingSubject(null);
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/nursing/subjects/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete subject");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Subject deleted successfully from curriculum");
      queryClient.invalidateQueries({ queryKey: ["nursing", "subjects"] });
      setDeleteConfirmDialogOpen(false);
      setDeletingSubject(null);
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const seedSyllabusMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/nursing/subjects/seed-bsc", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to seed syllabus");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || "Manipur Nursing Council B.Sc syllabus seeded!");
      queryClient.invalidateQueries({ queryKey: ["nursing", "subjects"] });
      queryClient.invalidateQueries({ queryKey: ["nursing", "courses"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const onAddSubmit = (data: any) => {
    createSubjectMutation.mutate({
      ...data,
      courseId: Number(data.courseId),
      year: Number(data.year),
      semester: Number(data.semester),
      theoryMaxMarks: Number(data.theoryMaxMarks),
      practicalMaxMarks: Number(data.practicalMaxMarks),
      credits: Number(data.credits),
    });
  };

  const onEditSubmit = (data: any) => {
    if (!editingSubject) return;
    updateSubjectMutation.mutate({
      id: editingSubject.id,
      values: {
        ...data,
        courseId: Number(data.courseId),
        year: Number(data.year),
        semester: Number(data.semester),
        theoryMaxMarks: Number(data.theoryMaxMarks),
        practicalMaxMarks: Number(data.practicalMaxMarks),
        credits: Number(data.credits),
      },
    });
  };

  const handleOpenEdit = (sub: Subject) => {
    setEditingSubject(sub);
    editForm.reset({
      courseId: sub.courseId,
      code: sub.code,
      name: sub.name,
      year: sub.year,
      semester: sub.semester,
      theoryMaxMarks: sub.theoryMaxMarks,
      practicalMaxMarks: sub.practicalMaxMarks,
      credits: sub.credits,
    });
    setEditDialogOpen(true);
  };

  const handleOpenDelete = (sub: Subject) => {
    setDeletingSubject(sub);
    setDeleteConfirmDialogOpen(true);
  };

  const semestersList = [1, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-teal-600" />
            Subject Master (Manipur Nursing Council Guidelines)
          </h1>
          <p className="text-sm text-muted-foreground">
            Semester-wise curriculum subjects, credit points, and theory/practical mark distribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seed Manipur Nursing Council Syllabus Button (Admin Only) */}
          {isAdmin && (
            <Button
              variant="outline"
              className="border-teal-600 text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950 flex items-center gap-2"
              onClick={() => seedSyllabusMutation.mutate()}
              disabled={seedSyllabusMutation.isPending}
            >
              <Sparkles size={16} className="text-amber-500" />
              {seedSyllabusMutation.isPending ? "Seeding INC Curriculum..." : "Seed Manipur Council B.Sc Syllabus"}
            </Button>
          )}

          {/* Add Subject Modal */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-2">
                <Plus size={16} /> Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent
              className="sm:max-w-[500px]"
              onInteractOutside={(e) => e.preventDefault()}
              onEscapeKeyDown={(e) => e.preventDefault()}
            >
              <DialogHeader>
                <DialogTitle>Add Subject to Curriculum</DialogTitle>
              </DialogHeader>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-3 py-2">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">Target Course *</label>
                  <Controller
                    control={addForm.control}
                    name="courseId"
                    render={({ field }) => (
                      <select
                        className="w-full border rounded-md p-2 bg-background text-sm"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      >
                        <option value={0}>-- Select Course --</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} - {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    control={addForm.control}
                    name="code"
                    render={({ field, fieldState }) => (
                      <Field label="Subject Code *" placeholder="e.g. NURS-101" {...field} error={fieldState.error?.message} />
                    )}
                  />
                  <Controller
                    control={addForm.control}
                    name="credits"
                    render={({ field, fieldState }) => (
                      <Field label="Credits" type="number" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>

                <Controller
                  control={addForm.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field label="Subject Title *" placeholder="e.g. Applied Anatomy & Physiology" {...field} error={fieldState.error?.message} />
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Academic Year</label>
                    <Controller
                      control={addForm.control}
                      name="year"
                      render={({ field }) => (
                        <select className="w-full border rounded-md p-2 bg-background text-sm" {...field}>
                          <option value={1}>1st Year</option>
                          <option value={2}>2nd Year</option>
                          <option value={3}>3rd Year</option>
                          <option value={4}>4th Year</option>
                        </select>
                      )}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1">Semester</label>
                    <Controller
                      control={addForm.control}
                      name="semester"
                      render={({ field }) => (
                        <select className="w-full border rounded-md p-2 bg-background text-sm" {...field}>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                            <option key={s} value={s}>Semester {s}</option>
                          ))}
                        </select>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Controller
                    control={addForm.control}
                    name="theoryMaxMarks"
                    render={({ field, fieldState }) => (
                      <Field label="Theory Max Marks" type="number" {...field} error={fieldState.error?.message} />
                    )}
                  />
                  <Controller
                    control={addForm.control}
                    name="practicalMaxMarks"
                    render={({ field, fieldState }) => (
                      <Field label="Practical Max Marks" type="number" {...field} error={fieldState.error?.message} />
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-teal-600 text-white" disabled={createSubjectMutation.isPending}>
                    Save Subject
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Semester Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Button
          size="sm"
          variant={selectedSemester === 0 ? "default" : "outline"}
          className={selectedSemester === 0 ? "bg-teal-600 text-white" : ""}
          onClick={() => setSelectedSemester(0)}
        >
          All Semesters (I - VIII)
        </Button>
        {semestersList.map((sem) => (
          <Button
            key={sem}
            size="sm"
            variant={selectedSemester === sem ? "default" : "outline"}
            className={selectedSemester === sem ? "bg-teal-600 text-white" : ""}
            onClick={() => setSelectedSemester(sem)}
          >
            Sem {sem}
          </Button>
        ))}
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search subjects by title or code (e.g. NURS-102)..."
              className="w-full pl-9 pr-3 py-2 border rounded-md text-sm bg-background"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="border rounded-md px-3 py-2 text-sm bg-background"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(Number(e.target.value))}
          >
            <option value={0}>All Program Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Subjects Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center justify-between">
            <span>Syllabus Subjects ({subjects.length})</span>
            <span className="text-xs font-normal text-muted-foreground flex items-center gap-1">
              <Award size={14} className="text-teal-600" /> Compliant with Manipur Nursing Council & INC Norms
            </span>
          </CardTitle>
          <CardDescription>Semester-wise subjects with evaluation mark breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading subject syllabus...</div>
          ) : subjects.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground space-y-3">
              <div>No subjects found for this selection.</div>
              <Button
                variant="outline"
                className="text-xs border-teal-600 text-teal-600"
                onClick={() => seedSyllabusMutation.mutate()}
              >
                Click to seed standard Manipur Nursing Council B.Sc Syllabus
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground">
                    <th className="p-3">Semester</th>
                    <th className="p-3">Subject Code</th>
                    <th className="p-3">Subject Title</th>
                    <th className="p-3">Course</th>
                    <th className="p-3">Credits</th>
                    <th className="p-3">Theory Max</th>
                    <th className="p-3">Practical Max</th>
                    <th className="p-3">Total Marks</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-muted/30">
                      <td className="p-3 font-semibold text-teal-700 dark:text-teal-400">
                        Semester {sub.semester} <span className="text-xs font-normal text-muted-foreground">(Yr {sub.year})</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-xs bg-slate-50 dark:bg-slate-900 rounded inline-block my-2 px-2 py-0.5">
                        {sub.code}
                      </td>
                      <td className="p-3 font-medium">{sub.name}</td>
                      <td className="p-3 text-xs">{sub.courseName || "B.Sc Nursing"}</td>
                      <td className="p-3 font-semibold">{sub.credits} Credits</td>
                      <td className="p-3">{sub.theoryMaxMarks} Marks</td>
                      <td className="p-3">{sub.practicalMaxMarks} Marks</td>
                      <td className="p-3 font-bold text-emerald-600">
                        {sub.theoryMaxMarks + sub.practicalMaxMarks} Marks
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-teal-600 hover:bg-teal-50"
                          title="Edit Subject"
                          onClick={() => handleOpenEdit(sub)}
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                          title="Delete Subject"
                          onClick={() => handleOpenDelete(sub)}
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

      {/* Edit Subject Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent
          className="sm:max-w-[500px]"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Edit Syllabus Subject</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Target Course *</label>
              <Controller
                control={editForm.control}
                name="courseId"
                render={({ field }) => (
                  <select
                    className="w-full border rounded-md p-2 bg-background text-sm"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    <option value={0}>-- Select Course --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Controller
                control={editForm.control}
                name="code"
                render={({ field, fieldState }) => (
                  <Field label="Subject Code *" placeholder="e.g. NURS-101" {...field} error={fieldState.error?.message} />
                )}
              />
              <Controller
                control={editForm.control}
                name="credits"
                render={({ field, fieldState }) => (
                  <Field label="Credits" type="number" {...field} error={fieldState.error?.message} />
                )}
              />
            </div>

            <Controller
              control={editForm.control}
              name="name"
              render={({ field, fieldState }) => (
                <Field label="Subject Title *" placeholder="e.g. Applied Anatomy & Physiology" {...field} error={fieldState.error?.message} />
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Academic Year</label>
                <Controller
                  control={editForm.control}
                  name="year"
                  render={({ field }) => (
                    <select className="w-full border rounded-md p-2 bg-background text-sm" {...field}>
                      <option value={1}>1st Year</option>
                      <option value={2}>2nd Year</option>
                      <option value={3}>3rd Year</option>
                      <option value={4}>4th Year</option>
                    </select>
                  )}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Semester</label>
                <Controller
                  control={editForm.control}
                  name="semester"
                  render={({ field }) => (
                    <select className="w-full border rounded-md p-2 bg-background text-sm" {...field}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Controller
                control={editForm.control}
                name="theoryMaxMarks"
                render={({ field, fieldState }) => (
                  <Field label="Theory Max Marks" type="number" {...field} error={fieldState.error?.message} />
                )}
              />
              <Controller
                control={editForm.control}
                name="practicalMaxMarks"
                render={({ field, fieldState }) => (
                  <Field label="Practical Max Marks" type="number" {...field} error={fieldState.error?.message} />
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-teal-600 text-white" disabled={updateSubjectMutation.isPending}>
                {updateSubjectMutation.isPending ? "Updating..." : "Update Subject"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Absolute Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmDialogOpen} onOpenChange={setDeleteConfirmDialogOpen}>
        <DialogContent
          className="sm:max-w-[425px]"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle size={20} /> Absolute Delete Confirmation
            </DialogTitle>
          </DialogHeader>

          <div className="py-3 text-sm space-y-3">
            <p>
              Are you absolutely sure you want to delete the curriculum subject:
            </p>
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-md border border-rose-200 dark:border-rose-900 font-semibold text-rose-800 dark:text-rose-200">
              [{deletingSubject?.code}] {deletingSubject?.name} (Semester {deletingSubject?.semester})
            </div>
            <p className="text-xs text-muted-foreground">
              This action <strong className="text-rose-600 uppercase">cannot be undone</strong> and will remove the subject from the syllabus master.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1"
              disabled={deleteSubjectMutation.isPending}
              onClick={() => deletingSubject && deleteSubjectMutation.mutate(deletingSubject.id)}
            >
              <Trash2 size={14} />
              {deleteSubjectMutation.isPending ? "Deleting..." : "Confirm & Delete Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

