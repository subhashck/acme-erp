import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  Printer,
  Palette,
  History,
  Users,
  GraduationCap,
  Search,
  Filter,
  CheckSquare,
  Square,
  Upload,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import { toast } from "sonner";
import { IdCardPreview } from "../../../components/id-cards/IdCardPreview";
import { TemplateEditor } from "../../../components/id-cards/TemplateEditor";
import { BatchPrintDialog } from "../../../components/id-cards/BatchPrintDialog";
import type {
  IdCardTemplate,
  IdCardLayoutConfig,
  IdCardPositionsConfig,
  IdCardElementPosition,
} from "../../../../server/db/schema-idcards";
import type { CardRenderData } from "../../../lib/id-card-pdf";
import { formatDateDdMonYyyy } from "../../../utils/format";
import { useUserPermissions } from "../../../lib/permissions";

export const Route = createFileRoute("/_authenticated/id-cards/")({
  component: IdCardStudioPage,
});

function IdCardStudioPage() {
  const queryClient = useQueryClient();
  const permissions = useUserPermissions();
  const [activeTab, setActiveTab] = useState<string>("issuance");

  // --- TAB 1: ISSUANCE HUB STATE ---
  const [entityType, setEntityType] = useState<"staff" | "student">("staff");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [batchFilter, setBatchFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchPrintOpen, setBatchPrintOpen] = useState(false);
  const [photoUploadTarget, setPhotoUploadTarget] = useState<{ id: number; name: string } | null>(null);

  // --- TAB 2: TEMPLATE DESIGNER STATE ---
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [designerConfig, setDesignerConfig] = useState<IdCardLayoutConfig | null>(null);

  // --- TAB 3: AUDIT HISTORY STATE ---
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");

  // 1. Fetch Templates
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<IdCardTemplate[]>({
    queryKey: ["id-card-templates"],
    queryFn: async () => {
      const res = await fetch("/api/id-cards/templates");
      if (!res.ok) throw new Error("Failed to load templates");
      return res.json();
    },
  });

  const activeTemplate =
    templates.find((t) => t.id === selectedTemplateId) ||
    templates.find((t) => t.targetType === entityType && t.isDefault) ||
    templates[0];

  useEffect(() => {
    if (activeTemplate) {
      setDesignerConfig(activeTemplate.layoutConfig);
    }
  }, [activeTemplate?.id]);

  const handlePositionChange = (
    elementKey: keyof IdCardPositionsConfig,
    pos: IdCardElementPosition
  ) => {
    setDesignerConfig((prev) => {
      const current = prev || activeTemplate?.layoutConfig || ({} as IdCardLayoutConfig);
      return {
        ...current,
        positions: {
          ...current.positions,
          [elementKey]: pos,
        },
      };
    });
  };

  const handleResetPositions = () => {
    setDesignerConfig((prev) => {
      if (!prev) return null;
      const updated = { ...prev };
      delete updated.positions;
      return updated;
    });
    toast.info("Element positions reset to canonical coordinates");
  };

  const handleDropBackground = async (file: File, side: "front" | "back") => {
    if (!activeTemplate) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("side", side);

      const res = await fetch(`/api/id-cards/templates/${activeTemplate.id}/upload-background`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload background template");

      setDesignerConfig((prev) => {
        const current = prev || activeTemplate.layoutConfig;
        return {
          ...current,
          background: {
            ...current.background,
            useCustomBackground: true,
            ...(side === "front" ? { frontImageUrl: data.imageUrl } : { backImageUrl: data.imageUrl }),
          },
        };
      });

      queryClient.invalidateQueries({ queryKey: ["id-card-templates"] });
      toast.success(`${side === "front" ? "Front" : "Back"} background template uploaded!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload dropped image");
    }
  };

  // 2. Fetch Entity List for Issuance Hub
  const { data: entities = [], isLoading: isLoadingEntities, refetch: refetchEntities } = useQuery<any[]>({
    queryKey: ["id-card-entities", entityType, departmentFilter, batchFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (entityType === "staff" && departmentFilter) params.append("departmentId", departmentFilter);
      if (entityType === "student" && batchFilter) params.append("batchId", batchFilter);

      const res = await fetch(`/api/id-cards/entities/${entityType === "staff" ? "staff" : "students"}?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load entities");
      return res.json();
    },
    enabled: activeTab === "issuance",
  });

  // 3. Fetch Departments / Batches for filter dropdowns
  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["departments-master"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      return res.ok ? res.json() : [];
    },
    enabled: entityType === "staff",
  });

  const { data: nursingBatches = [] } = useQuery<any[]>({
    queryKey: ["nursing-batches-master"],
    queryFn: async () => {
      const res = await fetch("/api/nursing/batches");
      return res.ok ? res.json() : [];
    },
    enabled: entityType === "student",
  });

  // 4. Fetch Issuance History
  const { data: historyData, isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery<{
    data: any[];
    pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
  }>({
    queryKey: ["id-card-issuances", historyPage, historySearch, historyStatus],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(historyPage),
        pageSize: "15",
      });
      if (historySearch) params.append("search", historySearch);
      if (historyStatus) params.append("status", historyStatus);

      const res = await fetch(`/api/id-cards/issuances?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load history");
      return res.json();
    },
    enabled: activeTab === "history",
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (updated: Partial<IdCardTemplate>) => {
      if (!activeTemplate) return;
      const res = await fetch(`/api/id-cards/templates/${activeTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to update template");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["id-card-templates"] });
    },
  });

  // Duplicate template mutation
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const res = await fetch(`/api/id-cards/templates/${templateId}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to duplicate template");
      return res.json();
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["id-card-templates"] });
      setSelectedTemplateId(newTemplate.id);
      toast.success("Template cloned");
    },
  });

  // Update issuance status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/id-cards/issuances/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update card status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["id-card-issuances"] });
      toast.success("Card status updated");
    },
  });

  // Handle Photo Upload directly
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, entityId: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", entityType);
    formData.append("id", String(entityId));

    try {
      toast.loading("Uploading and cropping photo...", { id: "photo-up" });
      const res = await fetch("/api/id-cards/upload-photo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload photo");
      toast.success("Profile photo updated!", { id: "photo-up" });
      refetchEntities();
    } catch (err: any) {
      toast.error(err.message || "Upload failed", { id: "photo-up" });
    }
  };

  // Toggle selection
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === entities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entities.map((e) => (entityType === "staff" ? e.staff_id : e.id))));
    }
  };

  // Prepare selected card render payload for BatchPrintDialog
  const selectedCardsData: CardRenderData[] = entities
    .filter((e) => selectedIds.has(entityType === "staff" ? e.staff_id : e.id))
    .map((e) => {
      if (entityType === "staff") {
        return {
          entityId: e.staff_id,
          cardSerialNo: e.active_card_serial_no || "IDC-PENDING",
          name: e.name,
          code: e.employee_code,
          department: e.department_name || e.role,
          role: e.role,
          bloodGroup: e.blood_group,
          emergencyContact: e.emergency_contact_phone,
          photoUrl: e.photo_url,
          entityType: "staff",
        };
      } else {
        const fatherDeceased = e.father_deceased;
        const fatherPrefix = fatherDeceased ? "(Late) " : "";
        const formattedFather = e.father_name ? `${fatherPrefix}${e.father_name}` : null;
        
        // Single phone number: Father's contact if available, else Mother's contact, else Guardian/Student
        const primaryContactPhone = (e.father_phone && e.father_phone.trim())
          ? e.father_phone.trim()
          : (e.mother_phone && e.mother_phone.trim())
          ? e.mother_phone.trim()
          : (e.guardian_phone && e.guardian_phone.trim())
          ? e.guardian_phone.trim()
          : (e.phone && e.phone.trim()) || "+91 9436 676 980";

        return {
          entityId: e.id,
          cardSerialNo: e.active_card_serial_no || "IDC-PENDING",
          name: e.name,
          code: e.enrollment_no,
          department: e.batch_name,
          role: e.course_name || "Degree College",
          emergencyContact: primaryContactPhone,
          secondaryContact: null,
          photoUrl: e.photo_url,
          entityType: "student",
          fatherName: formattedFather || e.father_name,
          fatherDeceased: e.father_deceased,
          motherName: e.mother_name,
          dob: e.dob,
          bloodGroup: e.blood_group || "A+ ve",
          address: e.address || e.present_address || e.permanent_address,
          academicYear: e.academic_year || "2024",
        };
      }
    });

  // Sample card preview for Template Designer
  const sampleCard: CardRenderData = activeTemplate?.targetType === "student"
    ? {
        cardSerialNo: "IDC-2024-00101",
        name: "Laikhuram Laxmi Devi",
        code: "2024-01-01",
        department: "Degree College Academic Year 2024",
        role: "B.Sc Nursing",
        bloodGroup: "A+ ve",
        dob: "11/03/2006",
        emergencyContact: "+91 8076 417 706",
        secondaryContact: null,
        fatherName: "(Late) L. Ibomacha Singh",
        fatherDeceased: true,
        motherName: "Laikhuram (O) Bimola Devi",
        address: "Kongba Kshetri Leikai, Imphal East.",
        academicYear: "2024",
        issueDate: "2024-08-01",
        validUntil: "2028-07-31",
        qrVerifyToken: "acon-sample-credential-verify",
        entityType: "student",
      }
    : {
        cardSerialNo: "IDC-2026-00042",
        name: "DR. RAJESH KUMAR",
        code: "EMP-00142",
        department: "Cardiology & Critical Care",
        role: "Senior Consultant",
        bloodGroup: "O+",
        emergencyContact: "+91 98765 43210",
        issueDate: new Date().toISOString().split("T")[0],
        validUntil: "2030-08-31",
        qrVerifyToken: "sample-verify-token-demo",
        entityType: "staff",
      };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary" /> ID Card Studio
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Design, batch-generate, and verify CR80 PVC identity credentials for hospital staff and nursing students.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              onClick={() => setBatchPrintOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print Selected Cards ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("issuance")}
          className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
            activeTab === "issuance"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Batch Issuance & Print Hub
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
            activeTab === "templates"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Palette className="w-3.5 h-3.5" /> Template Designer
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="w-3.5 h-3.5" /> Issuance History & Audit
        </button>
      </div>

      {/* ================= TAB 1: BATCH ISSUANCE HUB ================= */}
      {activeTab === "issuance" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="p-4 rounded-xl border border-border bg-card text-card-foreground shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Entity Toggle */}
              <div className="inline-flex rounded-lg border border-border p-1 bg-muted/60 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setEntityType("staff");
                    setSelectedIds(new Set());
                  }}
                  className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition ${
                    entityType === "staff"
                      ? "bg-card text-primary font-semibold shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> Hospital Staff
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEntityType("student");
                    setSelectedIds(new Set());
                  }}
                  className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition ${
                    entityType === "student"
                      ? "bg-card text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" /> ACON Nursing Students
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                {entityType === "staff" ? (
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="h-8 text-xs rounded-md border border-input px-2.5 bg-background text-foreground"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="h-8 text-xs rounded-md border border-input px-2.5 bg-background text-foreground"
                  >
                    <option value="">All Academic Batches</option>
                    {nursingBatches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.courseName ? `${b.courseName} - ` : ""}{b.academicYear} ({b.section})
                      </option>
                    ))}
                  </select>
                )}

                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, code..."
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchEntities()}
                  className="h-8 text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                </Button>
              </div>
            </div>

            {/* Selection actions bar */}
            <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="flex items-center gap-1.5 font-medium hover:text-foreground cursor-pointer"
                >
                  {selectedIds.size === entities.length && entities.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-primary" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground" />
                  )}
                  Select All ({entities.length})
                </button>
                <span>·</span>
                <span className="font-semibold text-foreground">{selectedIds.size} selected</span>
              </div>

              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => setBatchPrintOpen(true)}
                  className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Printer className="w-3 h-3 mr-1" /> Print Selected Cards
                </Button>
              )}
            </div>
          </div>

          {/* Entity Grid / Table */}
          {isLoadingEntities ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading directory...</div>
          ) : entities.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border">
              No matching records found.
            </div>
          ) : (
            <div className="bg-card text-card-foreground rounded-xl border border-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3 w-10 text-center">
                        <button type="button" onClick={selectAll} className="cursor-pointer">
                          {selectedIds.size === entities.length && entities.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                      </th>
                      <th className="p-3 w-16">Photo</th>
                      <th className="p-3">Full Name</th>
                      <th className="p-3">ID / Code</th>
                      <th className="p-3">Department / Batch</th>
                      <th className="p-3">Designation / Course</th>
                      <th className="p-3">Active Card</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {entities.map((item) => {
                      const id = entityType === "staff" ? item.staff_id : item.id;
                      const isSelected = selectedIds.has(id);
                      const code = entityType === "staff" ? item.employee_code : item.enrollment_no;
                      const dept = entityType === "staff" ? item.department_name : item.batch_name;
                      const role = entityType === "staff" ? item.role : item.course_name;

                      return (
                        <tr
                          key={id}
                          className={`hover:bg-muted/40 transition ${
                            isSelected ? "bg-primary/5 dark:bg-primary/10" : ""
                          }`}
                        >
                          <td className="p-3 text-center">
                            <button type="button" onClick={() => toggleSelect(id)} className="cursor-pointer">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-primary" />
                              ) : (
                                <Square className="w-4 h-4 text-muted-foreground/60" />
                              )}
                            </button>
                          </td>

                          {/* Avatar Thumbnail & Upload */}
                          <td className="p-3">
                            <label className="relative group cursor-pointer block w-9 h-11 rounded border border-border overflow-hidden bg-muted shadow-xs shrink-0">
                              {item.photo_url ? (
                                <img
                                  src={item.photo_url}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[9px] font-bold">
                                  N/A
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Upload className="w-3.5 h-3.5 text-white" />
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handlePhotoUpload(e, id)}
                              />
                            </label>
                          </td>

                          <td className="p-3 font-semibold text-foreground">
                            {item.name}
                          </td>
                          <td className="p-3 font-mono font-medium text-foreground">
                            {code}
                          </td>
                          <td className="p-3 text-muted-foreground">{dept || "—"}</td>
                          <td className="p-3 text-muted-foreground">{role || "—"}</td>

                          <td className="p-3">
                            {item.active_card_serial_no ? (
                              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                                <ShieldCheck className="w-2.5 h-2.5 mr-1" />
                                {item.active_card_serial_no}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                                Not Issued
                              </Badge>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-foreground hover:text-primary"
                              onClick={() => {
                                setSelectedIds(new Set([id]));
                                setBatchPrintOpen(true);
                              }}
                            >
                              <Printer className="w-3 h-3 mr-1" /> Print Card
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: TEMPLATE DESIGNER ================= */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Template Selector List (3 cols) */}
            <div className="lg:col-span-3 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h3 className="font-semibold text-xs text-foreground">
                  Active Templates ({templates.length})
                </h3>
              </div>

              <div className="space-y-2">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition ${
                      activeTemplate?.id === t.id
                        ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs"
                        : "border-border hover:border-muted-foreground/30 bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs text-foreground truncate">
                        {t.name}
                      </p>
                      <div
                        className="w-3 h-3 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: t.layoutConfig?.theme?.primaryColor || "#0284c7" }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                      <span className="capitalize">{t.targetType}</span>
                      <span>·</span>
                      <span className="capitalize">{t.orientation}</span>
                      {t.isDefault && (
                        <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto">
                          Default
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Template Editor (5 cols) */}
            <div className="lg:col-span-5 bg-card text-card-foreground rounded-xl border border-border p-5 shadow-xs">
              {activeTemplate ? (
                <TemplateEditor
                  template={activeTemplate}
                  config={designerConfig || activeTemplate.layoutConfig}
                  onConfigChange={(newCfg) => setDesignerConfig(newCfg)}
                  onResetPositions={handleResetPositions}
                  onSave={async (updated) => {
                    await saveTemplateMutation.mutateAsync({
                      ...updated,
                      layoutConfig: designerConfig || updated.layoutConfig || activeTemplate.layoutConfig,
                    });
                  }}
                  onClone={async (id) => {
                    await duplicateTemplateMutation.mutateAsync(id);
                  }}
                />
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">No template selected</div>
              )}
            </div>

            {/* Live Interactive Preview (4 cols) */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-muted/30 rounded-xl border border-dashed border-border min-h-[460px]">
              {activeTemplate ? (
                <div className="space-y-4 flex flex-col items-center w-full">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Live Vector Card Preview
                  </p>
                  <IdCardPreview
                    card={sampleCard}
                    config={designerConfig || activeTemplate.layoutConfig}
                    orientation={activeTemplate.orientation as "portrait" | "landscape"}
                    isDesignerMode={true}
                    onPositionChange={handlePositionChange}
                    onDropBackground={handleDropBackground}
                    onResetPositions={handleResetPositions}
                  />
                  <p className="text-[11px] text-muted-foreground text-center max-w-xs">
                    Standard ISO 7810 CR80 Form Factor (85.6 × 54.0 mm). High-resolution vector output.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: ISSUANCE HISTORY & AUDIT ================= */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-card text-card-foreground shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search serial, name, code..."
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <select
                value={historyStatus}
                onChange={(e) => setHistoryStatus(e.target.value)}
                className="h-8 text-xs rounded-md border border-input px-2.5 bg-background text-foreground"
              >
                <option value="">All Card Statuses</option>
                <option value="active">Active</option>
                <option value="lost">Lost / Damaged</option>
                <option value="revoked">Revoked</option>
                <option value="expired">Expired</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchHistory()}
                className="h-8 text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </Button>
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading issuance ledger...</div>
          ) : !historyData?.data || historyData.data.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-xl border border-border">
              No issuance records found.
            </div>
          ) : (
            <div className="bg-card text-card-foreground rounded-xl border border-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="p-3">Card Serial</th>
                      <th className="p-3">Cardholder Name</th>
                      <th className="p-3">ID / Code</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Department / Batch</th>
                      <th className="p-3">Issued On</th>
                      <th className="p-3">Prints</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Verification & Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyData.data.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/40 transition">
                        <td className="p-3 font-mono font-semibold text-foreground">
                          {row.cardSerialNo}
                        </td>
                        <td className="p-3 font-medium text-foreground">
                          {row.printedName}
                        </td>
                        <td className="p-3 font-mono text-muted-foreground">{row.printedCode}</td>
                        <td className="p-3 capitalize text-muted-foreground">{row.entityType}</td>
                        <td className="p-3 text-muted-foreground">{row.printedDepartment}</td>
                        <td className="p-3 text-muted-foreground">{formatDateDdMonYyyy(row.issueDate)}</td>
                        <td className="p-3 text-muted-foreground">{row.printCount}x</td>
                        <td className="p-3">
                          {row.status === "active" ? (
                            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                              Active
                            </Badge>
                          ) : row.status === "lost" ? (
                            <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10">
                              Lost / Replaced
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                              {row.status}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <a
                            href={`/verify/id/${row.qrVerifyToken}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-primary hover:underline font-medium"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" /> Verify
                          </a>

                          {row.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10.5px] text-destructive hover:bg-destructive/10"
                              onClick={() =>
                                updateStatusMutation.mutate({ id: row.id, status: "lost" })
                              }
                            >
                              Mark Lost
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10.5px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                              onClick={() =>
                                updateStatusMutation.mutate({ id: row.id, status: "active" })
                              }
                            >
                              Re-activate
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {historyData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-3 border-t border-border text-xs text-muted-foreground">
                  <span>
                    Page {historyData.pagination.page} of {historyData.pagination.totalPages} (
                    {historyData.pagination.totalRecords} total cards)
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={historyPage >= historyData.pagination.totalPages}
                      onClick={() => setHistoryPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Batch Print Dialog */}
      <BatchPrintDialog
        open={batchPrintOpen}
        onOpenChange={setBatchPrintOpen}
        entityType={entityType}
        selectedCards={selectedCardsData}
        onSuccess={() => {
          setSelectedIds(new Set());
          refetchEntities();
        }}
      />
    </div>
  );
}
