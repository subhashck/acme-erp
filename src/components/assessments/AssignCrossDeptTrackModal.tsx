import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Building2,
  UserPlus,
  X,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { assessmentJson } from "./AssessmentsHome";
import { fmtDate } from "./SkillAssessmentsPage";

interface AssignCrossDeptTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AssignCrossDeptTrackModal({
  isOpen,
  onClose,
}: AssignCrossDeptTrackModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"assign" | "list">("assign");

  // Form State
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("rotation");
  const [notes, setNotes] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");
  const [searchStaff, setSearchStaff] = useState<string>("");

  // 1. Fetch Staff Directory
  const staffQuery = useQuery({
    queryKey: ["staff-active-list"],
    queryFn: async () => {
      const res = await fetch("/api/staff");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json.data || [];
    },
    enabled: isOpen,
  });

  // 2. Fetch Departments Master
  const departmentsQuery = useQuery({
    queryKey: ["masters-departments-list"],
    queryFn: async () => {
      const res = await fetch("/api/masters/departments");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen,
  });

  // 3. Fetch Active Enrollments
  const enrollmentsQuery = useQuery({
    queryKey: ["cross-dept-enrollments"],
    queryFn: () => assessmentJson("/api/skill-assessment/cross-dept-enrollments"),
    enabled: isOpen,
  });

  // Mutation: Create Enrollment
  const createMutation = useMutation({
    mutationFn: async (payload: {
      staffId: number;
      targetDepartmentId: number;
      purpose: string;
      notes?: string;
      validUntil?: string;
    }) => {
      const res = await fetch("/api/skill-assessment/cross-dept-enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create enrollment");
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Cross-department exam track assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["cross-dept-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["assessment-exam-attempts"] });
      setSelectedStaffId("");
      setSelectedDeptId("");
      setNotes("");
      setValidUntil("");
      setActiveTab("list");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to assign cross-department track");
    },
  });

  // Mutation: Revoke Enrollment
  const revokeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/skill-assessment/cross-dept-enrollments/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke enrollment");
      return data;
    },
    onSuccess: () => {
      toast.success("Cross-department exam track revoked.");
      queryClient.invalidateQueries({ queryKey: ["cross-dept-enrollments"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to revoke enrollment");
    },
  });

  if (!isOpen) return null;

  const staffList = (staffQuery.data || []) as any[];
  const deptList = (departmentsQuery.data || []) as any[];
  const enrollments = (enrollmentsQuery.data || []) as any[];

  const filteredStaff = staffList.filter((s: any) => {
    if (!searchStaff.trim()) return true;
    const term = searchStaff.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.employeeCode?.toLowerCase().includes(term) ||
      s.departmentName?.toLowerCase().includes(term)
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sId = Number(selectedStaffId);
    const dId = Number(selectedDeptId);
    if (!sId || !dId) {
      toast.error("Please select both a staff member and target department.");
      return;
    }
    createMutation.mutate({
      staffId: sId,
      targetDepartmentId: dId,
      purpose,
      notes: notes.trim() || undefined,
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
    });
  };

  const getPurposeBadge = (p: string) => {
    switch (p) {
      case "rotation":
        return <Badge className="bg-sky-600 text-white text-[10px]">Clinical Rotation</Badge>;
      case "transfer_vetting":
        return <Badge className="bg-purple-600 text-white text-[10px]">Transfer Vetting</Badge>;
      case "hospital_wide_certification":
        return <Badge className="bg-emerald-600 text-white text-[10px]">Hospital Certification</Badge>;
      case "voluntary":
        return <Badge className="bg-amber-600 text-white text-[10px]">Elective Upskilling</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{p}</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-2xl rounded-2xl border shadow-xl flex flex-col max-h-[90vh] overflow-hidden my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b flex items-center justify-between shrink-0 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Cross-Department Exam Tracks (Model C)
              </h2>
              <p className="text-xs text-muted-foreground">
                Authorize staff to take clinical CBT examinations from another department (rotations, transfers, certifications).
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X size={18} />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b flex items-center gap-4 bg-muted/10 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("assign")}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "assign"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserPlus size={14} /> Assign New Track
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "list"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText size={14} /> Active Enrollments ({enrollments.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === "assign" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Staff Member Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Candidate Staff Member <span className="text-rose-500">*</span></span>
                  {selectedStaffId && (
                    <button
                      type="button"
                      onClick={() => setSelectedStaffId("")}
                      className="text-[11px] text-muted-foreground hover:text-primary"
                    >
                      Change
                    </button>
                  )}
                </label>
                {!selectedStaffId ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Search staff by name or employee code..."
                      value={searchStaff}
                      onChange={(e) => setSearchStaff(e.target.value)}
                      className="w-full text-xs rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="max-h-40 overflow-y-auto border rounded-lg divide-y bg-background text-xs">
                      {staffQuery.isLoading ? (
                        <p className="p-3 text-center text-muted-foreground">Loading staff directory...</p>
                      ) : filteredStaff.length === 0 ? (
                        <p className="p-3 text-center text-muted-foreground">No matching staff found</p>
                      ) : (
                        filteredStaff.slice(0, 10).map((s: any) => (
                          <button
                            key={s.staffId}
                            type="button"
                            onClick={() => {
                              setSelectedStaffId(String(s.staffId));
                              setSearchStaff("");
                            }}
                            className="w-full text-left p-2.5 hover:bg-muted/50 flex items-center justify-between transition-colors"
                          >
                            <div>
                              <div className="font-semibold text-foreground">{s.name}</div>
                              <div className="text-[10px] text-muted-foreground">
                                {s.employeeCode || `ID #${s.staffId}`} • {s.departmentName || s.department || "No Department"}
                              </div>
                            </div>
                            <span className="text-[10px] text-primary font-medium">Select</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border bg-muted/40 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-foreground">
                        {staffList.find((s) => String(s.staffId) === selectedStaffId)?.name}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        ({staffList.find((s) => String(s.staffId) === selectedStaffId)?.employeeCode || `#${selectedStaffId}`})
                      </span>
                      <div className="text-[11px] text-muted-foreground">
                        Home Department: {staffList.find((s) => String(s.staffId) === selectedStaffId)?.departmentName || "Assigned"}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                      Selected
                    </Badge>
                  </div>
                )}
              </div>

              {/* Target Department Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Target Exam Department (Competency Domain) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full text-xs rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  <option value="">-- Choose Target Department to Test In --</option>
                  {deptList.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.isClinical ? "(Clinical)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Questions will be drawn from this department's monthly question bank and specialty questions.
                </p>
              </div>

              {/* Track Purpose */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Track Purpose / Clinical Reason <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: "rotation", label: "Clinical Rotation", desc: "Temporary unit posting (e.g. ICU/ER)" },
                    { id: "transfer_vetting", label: "Pre-Transfer Vetting", desc: "Internal transfer evaluation" },
                    { id: "hospital_wide_certification", label: "Hospital Certification", desc: "BMW, Fire, Infection Control" },
                    { id: "voluntary", label: "Elective Upskilling", desc: "Continuing Medical Education" },
                  ].map((p) => (
                    <label
                      key={p.id}
                      className={`p-2.5 rounded-lg border cursor-pointer flex flex-col justify-between transition-colors ${
                        purpose === p.id
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="purpose"
                          value={p.id}
                          checked={purpose === p.id}
                          onChange={() => setPurpose(p.id)}
                          className="size-3 text-primary"
                        />
                        <span className="font-semibold text-xs text-foreground">{p.label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">{p.desc}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Validity Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Valid Until (Optional Expiration)
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full text-xs rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave blank for perpetual / standard calendar month track assignment.
                </p>
              </div>

              {/* Clinical Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Clinical Remarks / Roster Note
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 3-month rotation to MICU starting next Monday under Sister Incharge..."
                  rows={2}
                  className="w-full text-xs rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Quota Isolation Notice */}
              <div className="p-3 rounded-lg border border-sky-300 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/30 text-[11px] text-sky-900 dark:text-sky-200 flex items-start gap-2">
                <Sparkles size={14} className="text-sky-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Quota Isolation:</strong> Candidate will receive a separate monthly attempt quota (1 Attempt + 1 Retest) specifically for this department track. Their home department assessment quota remains independent and unaffected.
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!selectedStaffId || !selectedDeptId || createMutation.isPending}
                  className="gap-2 bg-primary text-primary-foreground font-semibold"
                >
                  <CheckCircle2 size={14} />
                  {createMutation.isPending ? "Assigning Track..." : "Assign Track"}
                </Button>
              </div>
            </form>
          ) : (
            /* Active Enrollments Tab */
            <div className="space-y-3">
              {enrollmentsQuery.isLoading ? (
                <p className="p-6 text-center text-xs text-muted-foreground">Loading active enrollments...</p>
              ) : enrollments.length === 0 ? (
                <div className="p-8 text-center space-y-2 border rounded-xl bg-muted/20">
                  <Building2 size={32} className="mx-auto text-muted-foreground/60" />
                  <p className="text-sm font-semibold text-foreground">No Active Cross-Department Tracks</p>
                  <p className="text-xs text-muted-foreground">
                    All candidates are currently sitting for tests within their primary home department only.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab("assign")}
                    className="mt-2 text-xs"
                  >
                    Assign First Track
                  </Button>
                </div>
              ) : (
                <div className="divide-y border rounded-xl overflow-hidden bg-card">
                  {enrollments.map((en: any) => (
                    <div
                      key={en.id}
                      className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-foreground">
                            {en.staffName}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            ({en.employeeCode || `#${en.staffId}`})
                          </span>
                          {getPurposeBadge(en.purpose)}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <span>Target Domain: <strong className="text-foreground">{en.targetDepartmentName}</strong></span>
                          <span>•</span>
                          <span>Assigned by: {en.assignedByName || "Admin"}</span>
                          {en.validUntil && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock size={11} /> Valid until {fmtDate(en.validUntil)}
                              </span>
                            </>
                          )}
                        </div>
                        {en.notes && (
                          <p className="text-[11px] text-muted-foreground/90 italic">
                            "{en.notes}"
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (window.confirm(`Revoke cross-department track for ${en.staffName}?`)) {
                              revokeMutation.mutate(en.id);
                            }
                          }}
                          disabled={revokeMutation.isPending}
                          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 dark:border-rose-900 gap-1.5 py-1 px-2.5 h-auto"
                        >
                          <Trash2 size={12} />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
