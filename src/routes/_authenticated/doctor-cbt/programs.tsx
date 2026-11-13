import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Badge } from "@/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Plus,
  Stethoscope,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor-cbt/programs")({
  component: ProgramsPage,
});

function ProgramsPage() {
  const queryClient = useQueryClient();
  const [createProgModalOpen, setCreateProgModalOpen] = useState(false);
  const [createTopicModalOpen, setCreateTopicModalOpen] = useState(false);
  const [selectedProgId, setSelectedProgId] = useState<number | null>(null);
  const [expandedProgIds, setExpandedProgIds] = useState<number[]>([]);

  // Program Form
  const [progForm, setProgForm] = useState({
    code: "",
    title: "",
    specialty: "",
    durationMonths: 6,
    totalCmeCredits: 0,
    description: "",
  });

  // Topic Form
  const [topicForm, setTopicForm] = useState({
    code: "",
    title: "",
    description: "",
    cmeCredits: 0,
    displayOrder: 0,
  });

  // Query Me Context
  const meQuery = useQuery({
    queryKey: ["doctor-cbt-me"],
    queryFn: async () => {
      const res = await fetch("/api/doctor-cbt/me");
      if (!res.ok) throw new Error("Failed to load user context");
      return res.json();
    },
  });

  const canManage = meQuery.data?.canManage;

  // Query Programs
  const programsQuery = useQuery({
    queryKey: ["doctor-cbt-programs"],
    queryFn: async () => {
      const res = await fetch("/api/doctor-cbt/programs");
      if (!res.ok) throw new Error("Failed to load programs");
      return res.json();
    },
  });

  // Create Program Mutation
  const createProgramMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/doctor-cbt/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create program");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Program "${data.title}" created successfully.`);
      setCreateProgModalOpen(false);
      setProgForm({
        code: "",
        title: "",
        specialty: "",
        durationMonths: 6,
        totalCmeCredits: 0,
        description: "",
      });
      queryClient.invalidateQueries({ queryKey: ["doctor-cbt-programs"] });
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // Create Topic Mutation
  const createTopicMutation = useMutation({
    mutationFn: async ({ programId, payload }: { programId: number; payload: any }) => {
      const res = await fetch(`/api/doctor-cbt/programs/${programId}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create topic");
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Clinical topic "${data.title}" added.`);
      setCreateTopicModalOpen(false);
      setTopicForm({
        code: "",
        title: "",
        description: "",
        cmeCredits: 0,
        displayOrder: 0,
      });
      if (selectedProgId) {
        queryClient.invalidateQueries({
          queryKey: ["doctor-cbt-program-topics", selectedProgId],
        });
      }
    },
    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  const toggleExpand = (id: number) => {
    if (expandedProgIds.includes(id)) {
      setExpandedProgIds(expandedProgIds.filter((pId) => pId !== id));
    } else {
      setExpandedProgIds([...expandedProgIds, id]);
    }
  };

  const programs = programsQuery.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Specialty Programs & Continuous Topics Catalog
          </h2>
          <p className="text-xs text-muted-foreground">
            Curriculum tracks, clinical competencies, and self-paced topic-based assessments
          </p>
        </div>

        {canManage && (
          <Button onClick={() => setCreateProgModalOpen(true)} className="gap-2 w-full sm:w-auto">
            <Plus className="size-4" />
            <span>Create Program</span>
          </Button>
        )}
      </div>

      {/* Program Cards */}
      <div className="space-y-4">
        {programsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading curricula...</p>
        ) : programs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground space-y-3">
              <Stethoscope className="size-8 mx-auto opacity-50" />
              <p className="text-sm">No specialty programs created yet.</p>
              {canManage && (
                <Button size="sm" onClick={() => setCreateProgModalOpen(true)}>
                  Create First Program
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          programs.map((prog: any) => {
            const isExpanded = expandedProgIds.includes(prog.id);
            return (
              <Card key={prog.id} className="overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-muted/30 transition pb-4"
                  onClick={() => toggleExpand(prog.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                        <BookOpen className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base font-semibold">{prog.title}</CardTitle>
                          <Badge variant="outline" className="font-mono text-xs">
                            {prog.code}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Specialty: {prog.specialty} • Duration: {prog.durationMonths} Months
                        </p>
                        {prog.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {prog.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canManage && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProgId(prog.id);
                            setCreateTopicModalOpen(true);
                          }}
                        >
                          <Plus className="size-3.5 mr-1" />
                          Add Topic
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="size-8">
                        {isExpanded ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Topics List */}
                {isExpanded && (
                  <CardContent className="border-t bg-muted/10 pt-4">
                    <ProgramTopicsList programId={prog.id} canManage={canManage} />
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Create Program Dialog */}
      <Dialog open={createProgModalOpen} onOpenChange={setCreateProgModalOpen}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="w-[95vw] max-w-lg p-4 sm:p-6"
        >
          <DialogHeader>
            <DialogTitle>Create Specialty Program</DialogTitle>
            <DialogDescription className="text-xs">
              Define a new skill upgradation track or clinical fellowship
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createProgramMutation.mutate(progForm);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pCode" className="text-xs font-semibold">
                  Program Code <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="pCode"
                  placeholder="e.g. DOC-EM-01"
                  value={progForm.code}
                  onChange={(e) => setProgForm({ ...progForm, code: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pSpecialty" className="text-xs font-semibold">
                  Clinical Specialty <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="pSpecialty"
                  placeholder="e.g. Emergency Medicine"
                  value={progForm.specialty}
                  onChange={(e) => setProgForm({ ...progForm, specialty: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pTitle" className="text-xs font-semibold">
                Program Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="pTitle"
                placeholder="e.g. Fellowship in Emergency & Critical Care"
                value={progForm.title}
                onChange={(e) => setProgForm({ ...progForm, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pDuration" className="text-xs font-semibold">
                Duration (Months)
              </Label>
              <Input
                id="pDuration"
                type="number"
                min="1"
                value={progForm.durationMonths}
                onChange={(e) =>
                  setProgForm({ ...progForm, durationMonths: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pDesc" className="text-xs font-semibold">
                Description / Overview
              </Label>
              <textarea
                id="pDesc"
                rows={3}
                className="w-full text-xs p-2.5 rounded-md border bg-background"
                placeholder="Curriculum objectives and clinical scope..."
                value={progForm.description}
                onChange={(e) => setProgForm({ ...progForm, description: e.target.value })}
              />
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateProgModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createProgramMutation.isPending} className="w-full sm:w-auto">
                {createProgramMutation.isPending ? "Creating..." : "Create Program"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Topic Dialog */}
      <Dialog open={createTopicModalOpen} onOpenChange={setCreateTopicModalOpen}>
        <DialogContent
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="w-[95vw] max-w-md p-4 sm:p-6"
        >
          <DialogHeader>
            <DialogTitle>Add Clinical Topic</DialogTitle>
            <DialogDescription className="text-xs">
              Add a curriculum module or syllabus unit to this program
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedProgId) {
                createTopicMutation.mutate({
                  programId: selectedProgId,
                  payload: topicForm,
                });
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="tCode" className="text-xs font-semibold">
                Topic Code <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="tCode"
                placeholder="e.g. TOPIC-AIRWAY-01"
                value={topicForm.code}
                onChange={(e) => setTopicForm({ ...topicForm, code: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tTitle" className="text-xs font-semibold">
                Topic Title <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="tTitle"
                placeholder="e.g. Difficult Airway & Rapid Sequence Intubation"
                value={topicForm.title}
                onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tOrder" className="text-xs font-semibold">
                Display Order
              </Label>
              <Input
                id="tOrder"
                type="number"
                value={topicForm.displayOrder}
                onChange={(e) =>
                  setTopicForm({ ...topicForm, displayOrder: Number(e.target.value) })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tDesc" className="text-xs font-semibold">
                Clinical Overview
              </Label>
              <textarea
                id="tDesc"
                rows={2}
                className="w-full text-xs p-2.5 rounded-md border bg-background"
                placeholder="Topics covered in this competency..."
                value={topicForm.description}
                onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
              />
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateTopicModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTopicMutation.isPending} className="w-full sm:w-auto">
                {createTopicMutation.isPending ? "Adding..." : "Add Topic"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProgramTopicsList({ programId, canManage }: { programId: number; canManage?: boolean }) {
  const topicsQuery = useQuery({
    queryKey: ["doctor-cbt-program-topics", programId],
    queryFn: async () => {
      const res = await fetch(`/api/doctor-cbt/programs/${programId}/topics`);
      if (!res.ok) throw new Error("Failed to load topics");
      return res.json();
    },
  });

  const topics = topicsQuery.data || [];

  if (topicsQuery.isLoading) {
    return <p className="text-xs text-muted-foreground py-3">Loading curriculum topics...</p>;
  }

  if (topics.length === 0) {
    return (
      <div className="text-xs text-muted-foreground py-3 text-center">
        No topics added to this program yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-foreground">Clinical Curriculum Topics</p>
      <div className="divide-y border rounded-xl bg-card">
        {topics.map((t: any) => (
          <div
            key={t.id}
            className="p-3 flex items-center justify-between gap-3 text-xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{t.title}</span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {t.code}
                </Badge>
              </div>
              {t.description && (
                <p className="text-muted-foreground mt-0.5">{t.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
