import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery } from "@/lib/query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Plus,
  ArrowLeft,
  Calendar,
  ExternalLink,
  Trash2,
  CheckCircle,
  Archive,
  Copy,
  Image as ImageIcon,
  Loader2,
  ChevronUp,
  ChevronDown,
  Save,
  Eye,
  Settings,
  Sparkles,
  User,
  Layout,
  Clock,
  Download,
} from "lucide-react";
import * as React from "react";
import { TiptapEditor } from "@/components/TiptapEditor";
import { MediaLibraryDialog } from "@/components/magazine/MediaLibraryDialog";
import { useUserPermissions } from "@/lib/permissions";
import { exportMagazineToPDF } from "@/lib/magazine-export";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

export const Route = createFileRoute("/_authenticated/magazine/$id")({
  component: MagazineIssueEditor,
});

interface SectionItem {
  id: number;
  issueId: number;
  title: string;
  subtitle: string | null;
  authorName: string | null;
  authorRole: string | null;
  contentJson: any;
  contentHtml: string;
  sortOrder: number;
}

interface IssueData {
  id: number;
  issueNo: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  description: string | null;
  editorialTitle: string | null;
  editorialHtml: string | null;
  issueMonth: number;
  issueYear: number;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  createdAt: string;
  creatorName: string | null;
  sections: SectionItem[];
}

const SECTION_TEMPLATES = [
  {
    title: "Director's Address & Strategic Vision",
    subtitle: "A message from executive leadership on our mission and key milestones",
    authorRole: "Medical Director",
  },
  {
    title: "Clinical Spotlight & Breakthroughs",
    subtitle: "Advanced surgeries, diagnostic innovations, and complex case studies",
    authorRole: "Chief of Surgery",
  },
  {
    title: "Health & Wellness Guide",
    subtitle: "Preventive medicine, seasonal wellness, and nutritional advice",
    authorRole: "Consultant Physician",
  },
  {
    title: "Staff Spotlight & Excellence Awards",
    subtitle: "Recognizing outstanding caregivers and employee milestones",
    authorRole: "HR & Communications",
  },
  {
    title: "Community Outreach & College Updates",
    subtitle: "ACON Nursing College activities and healthcare camps",
    authorRole: "Dean of Nursing",
  },
];

export function MagazineIssueEditor() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { canManageMagazine } = useUserPermissions();

  const [activeTab, setActiveTab] = React.useState<"editor" | "preview" | "settings">("editor");
  const [activeSectionId, setActiveSectionId] = React.useState<number | null>(null);

  // Issue metadata form state
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [editorialTitle, setEditorialTitle] = React.useState("From the Editorial Desk");
  const [editorialHtml, setEditorialHtml] = React.useState("");
  const [month, setMonth] = React.useState(1);
  const [year, setYear] = React.useState(2026);
  const [coverImageUrl, setCoverImageUrl] = React.useState("");
  const [isSavingMeta, setIsSavingMeta] = React.useState(false);
  const [isUploadingCover, setIsUploadingCover] = React.useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = React.useState(false);

  // Sections local draft state
  const [sections, setSections] = React.useState<SectionItem[]>([]);
  const [isAddingSection, setIsAddingSection] = React.useState(false);
  const [isSavingSection, setIsSavingSection] = React.useState<number | null>(null);

  // Fetch issue details
  const issueQuery = useRpcQuery<IssueData>(
    ["magazine-issue-detail", id],
    () => fetch(`/api/magazine/issues/${id}`)
  );

  // Initialize form state when query resolves
  React.useEffect(() => {
    if (issueQuery.data) {
      const d = issueQuery.data;
      setTitle(d.title);
      setSlug(d.slug);
      setDescription(d.description || "");
      setEditorialTitle(d.editorialTitle || "From the Editorial Desk");
      setEditorialHtml(d.editorialHtml || "");
      setMonth(d.issueMonth);
      setYear(d.issueYear);
      setCoverImageUrl(d.coverImageUrl || "");
      setSections(d.sections || []);

      if (d.sections && d.sections.length > 0 && activeSectionId === null) {
        setActiveSectionId(d.sections[0].id);
      }
    }
  }, [issueQuery.data]);

  const handleSaveMetadata = async () => {
    setIsSavingMeta(true);
    try {
      const res = await fetch(`/api/magazine/issues/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim().toLowerCase(),
          description: description.trim() || null,
          editorialTitle: editorialTitle.trim() || "From the Editorial Desk",
          editorialHtml: editorialHtml.trim() || null,
          coverImageUrl: coverImageUrl || null,
          issueMonth: month,
          issueYear: year,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update issue metadata");
      }

      toast.success("Issue details updated!");
      issueQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update metadata");
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("issueId", slug || id);

    try {
      const res = await fetch("/api/magazine/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to upload cover image");
      }

      const data = await res.json();
      setCoverImageUrl(data.url);
      toast.success("Cover image uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload cover image");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleAddSection = async (template?: typeof SECTION_TEMPLATES[0]) => {
    setIsAddingSection(true);
    try {
      const res = await fetch(`/api/magazine/issues/${id}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: template?.title || "New Article Section",
          subtitle: template?.subtitle || "Subheading or story summary...",
          authorName: "ACME Editorial Team",
          authorRole: template?.authorRole || "Contributor",
          contentJson: {},
          contentHtml: "<p>Start drafting your article content here...</p>",
          sortOrder: sections.length + 1,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add section");
      }

      const created = await res.json();
      toast.success("New article section added!");
      await issueQuery.refetch();
      setActiveSectionId(created.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to add section");
    } finally {
      setIsAddingSection(false);
    }
  };

  const handleSaveSection = async (sec: SectionItem) => {
    setIsSavingSection(sec.id);
    try {
      const res = await fetch(`/api/magazine/sections/${sec.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sec.title,
          subtitle: sec.subtitle || null,
          authorName: sec.authorName || null,
          authorRole: sec.authorRole || null,
          contentJson: sec.contentJson,
          contentHtml: sec.contentHtml,
          sortOrder: sec.sortOrder,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save section");
      }

      toast.success(`Saved "${sec.title}"!`);
      issueQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to save section");
    } finally {
      setIsSavingSection(null);
    }
  };

  const handleDeleteSection = async (sectionId: number, secTitle: string) => {
    if (!window.confirm(`Delete article section "${secTitle}"?`)) return;

    try {
      const res = await fetch(`/api/magazine/sections/${sectionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete section");
      }

      toast.success("Section deleted");
      const updated = sections.filter((s) => s.id !== sectionId);
      setSections(updated);
      if (activeSectionId === sectionId && updated.length > 0) {
        setActiveSectionId(updated[0].id);
      }
      issueQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete section");
    }
  };

  const handleMoveSection = async (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;

    const newSections = [...sections];
    const temp = newSections[idx];
    newSections[idx] = newSections[targetIdx];
    newSections[targetIdx] = temp;

    setSections(newSections);

    // Save reorder to backend
    try {
      const res = await fetch(`/api/magazine/issues/${id}/sections/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionIds: newSections.map((s) => s.id),
        }),
      });

      if (!res.ok) throw new Error("Failed to reorder sections");
      toast.success("Sections reordered");
    } catch (err: any) {
      toast.error(err.message || "Failed to reorder sections");
      issueQuery.refetch();
    }
  };

  const handlePublish = async () => {
    try {
      const res = await fetch(`/api/magazine/issues/${id}/publish`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to publish issue");
      }
      toast.success("Issue published! It is now live on the public reader.");
      issueQuery.refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleArchive = async () => {
    try {
      const res = await fetch(`/api/magazine/issues/${id}/archive`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to archive issue");
      }
      toast.success("Issue archived");
      issueQuery.refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRevertDraft = async () => {
    try {
      const res = await fetch(`/api/magazine/issues/${id}/draft`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to revert to draft");
      }
      toast.success("Issue reverted to draft");
      issueQuery.refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const [isExportingPdf, setIsExportingPdf] = React.useState(false);

  const handleExportPDF = async () => {
    if (!issue) return;
    setIsExportingPdf(true);
    try {
      toast.info("Generating magazine PDF document...");
      await exportMagazineToPDF({
        id: issue.id,
        issueNo: issue.issueNo,
        title: title || issue.title,
        slug: slug || issue.slug,
        description: description || issue.description,
        coverImageUrl: coverImageUrl || issue.coverImageUrl,
        issueMonth: month || issue.issueMonth,
        issueYear: year || issue.issueYear,
        sections: sections || issue.sections,
      });
      toast.success("Magazine PDF downloaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (issueQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  const issue = issueQuery.data;
  if (!issue) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold">Issue not found</h2>
        <Link to="/magazine" className="mt-4 inline-block text-sky-600">
          Return to Magazine Issues
        </Link>
      </div>
    );
  }

  const activeSection = sections.find((s) => s.id === activeSectionId) || sections[0];

  return (
    <ModuleLayout
      title={issue.title}
      description={`Issue Ref: ${issue.issueNo} • Slug: /magazine/${issue.slug}`}
      action={
        <div className="flex items-center gap-2">
          <Link to="/magazine">
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            className="gap-1.5 text-xs font-semibold"
            title="Download full PDF document using jsPDF"
          >
            {isExportingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <Download className="h-4 w-4 text-primary" />
            )}
            <span>Download PDF</span>
          </Button>

          {issue.status === "published" && (
            <Button asChild variant="outline" size="sm">
              <a
                href={`/magazine/view/${issue.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-1.5 text-xs font-semibold"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open Reader & Flipbook</span>
              </a>
            </Button>
          )}

          {canManageMagazine && issue.status === "draft" && (
            <Button
              onClick={handlePublish}
              size="sm"
              className="gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Publish Edition</span>
            </Button>
          )}

          {canManageMagazine && issue.status === "published" && (
            <Button
              onClick={handleArchive}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <Archive className="h-4 w-4" />
              <span>Archive</span>
            </Button>
          )}

          {canManageMagazine && issue.status === "archived" && (
            <Button
              onClick={handleRevertDraft}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              <Clock className="h-4 w-4" />
              <span>Revert to Draft</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs & Status Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "editor" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("editor")}
              className="gap-1.5 font-semibold"
            >
              <Layout className="h-4 w-4" />
              <span>Articles & Sections ({sections.length})</span>
            </Button>

            <Button
              variant={activeTab === "preview" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("preview")}
              className="gap-1.5 font-semibold"
            >
              <Eye className="h-4 w-4" />
              <span>Live Reader Preview</span>
            </Button>

            <Button
              variant={activeTab === "settings" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("settings")}
              className="gap-1.5 font-semibold"
            >
              <Settings className="h-4 w-4" />
              <span>Cover & Metadata</span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={
                issue.status === "published"
                  ? "default"
                  : issue.status === "draft"
                  ? "secondary"
                  : "outline"
              }
              className="px-2.5 py-1 text-xs font-bold uppercase"
            >
              {issue.status}
            </Badge>

            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
              {issue.issueNo}
            </span>
          </div>
        </div>

        {/* TAB 1: Editor & Sections Management */}
        {activeTab === "editor" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Sections List */}
            <div className="lg:col-span-4 space-y-4">
              <Card>
                <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold">Article Sections</CardTitle>
                    <CardDescription className="text-xs">Ordered table of contents</CardDescription>
                  </div>

                  {canManageMagazine && (
                    <Button
                      size="sm"
                      onClick={() => handleAddSection()}
                      disabled={isAddingSection}
                      className="h-8 gap-1 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="p-3 space-y-2">
                  {sections.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-xs border border-dashed rounded-xl">
                      No sections yet. Click "Add" or choose a template below.
                    </div>
                  ) : (
                    sections.map((sec, idx) => {
                      const isSelected = sec.id === activeSection?.id;
                      return (
                        <div
                          key={sec.id}
                          onClick={() => setActiveSectionId(sec.id)}
                          className={cn(
                            "group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer",
                            isSelected
                              ? "bg-muted border-primary/50 shadow-xs"
                              : "bg-card border-border hover:bg-muted/50"
                          )}
                        >
                          <div className="flex items-start gap-2.5 min-w-0 pr-2">
                            <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-md bg-muted text-muted-foreground font-bold text-xs font-mono">
                              {idx + 1}
                            </span>
                            <div className="truncate">
                              <h4 className={cn("text-xs font-bold truncate", isSelected ? "text-primary" : "text-foreground")}>
                                {sec.title}
                              </h4>
                              {sec.authorRole && (
                                <p className="text-[11px] text-muted-foreground truncate">{sec.authorRole}</p>
                              )}
                            </div>
                          </div>

                          {canManageMagazine && (
                            <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={idx === 0}
                                onClick={() => handleMoveSection(idx, "up")}
                                className="h-6 w-6 p-0 text-muted-foreground"
                                title="Move up"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={idx === sections.length - 1}
                                onClick={() => handleMoveSection(idx, "down")}
                                className="h-6 w-6 p-0 text-muted-foreground"
                                title="Move down"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {/* Section Templates Dropdown */}
                  {canManageMagazine && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        Preset Section Templates
                      </p>
                      <div className="grid grid-cols-1 gap-1.5">
                        {SECTION_TEMPLATES.map((tmpl, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleAddSection(tmpl)}
                            className="flex items-center justify-between text-left p-2 rounded-lg text-xs font-medium text-foreground bg-muted/40 hover:bg-muted border border-border transition-colors cursor-pointer"
                          >
                            <span className="truncate pr-1">{tmpl.title}</span>
                            <Plus className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Active Section Editor */}
            <div className="lg:col-span-8 space-y-4">
              {activeSection ? (
                <Card>
                  <CardHeader className="p-5 pb-3 border-b border-border flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">
                        Edit Article: {activeSection.title}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Rich text content, author details, and formatting.
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      {canManageMagazine && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSection(activeSection.id, activeSection.title)}
                          className="h-8 gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </Button>
                      )}

                      {canManageMagazine && (
                        <Button
                          size="sm"
                          onClick={() => handleSaveSection(activeSection)}
                          disabled={isSavingSection === activeSection.id}
                          className="h-8 gap-1.5 text-xs font-semibold"
                        >
                          {isSavingSection === activeSection.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          <span>Save Section</span>
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4">
                    {/* Title and Subtitle */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Section Title</label>
                        <Input
                          value={activeSection.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSections((prev) =>
                              prev.map((s) => (s.id === activeSection.id ? { ...s, title: val } : s))
                            );
                          }}
                          placeholder="Article title..."
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Subtitle / Tagline</label>
                        <Input
                          value={activeSection.subtitle || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSections((prev) =>
                              prev.map((s) => (s.id === activeSection.id ? { ...s, subtitle: val } : s))
                            );
                          }}
                          placeholder="Brief subtitle or summary..."
                        />
                      </div>
                    </div>

                    {/* Author info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Author Name</label>
                        <Input
                          value={activeSection.authorName || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSections((prev) =>
                              prev.map((s) => (s.id === activeSection.id ? { ...s, authorName: val } : s))
                            );
                          }}
                          placeholder="e.g. Dr. John Doe, MD"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Author Role / Designation</label>
                        <Input
                          value={activeSection.authorRole || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSections((prev) =>
                              prev.map((s) => (s.id === activeSection.id ? { ...s, authorRole: val } : s))
                            );
                          }}
                          placeholder="e.g. Head of Cardiology"
                        />
                      </div>
                    </div>

                    {/* Tiptap Rich-Text Editor */}
                    <div className="space-y-1 pt-2">
                      <label className="text-xs font-semibold text-foreground">Article Content</label>
                      <TiptapEditor
                        key={activeSection.id}
                        content={activeSection.contentJson && Object.keys(activeSection.contentJson).length > 0 ? activeSection.contentJson : activeSection.contentHtml}
                        issueId={issue.slug || issue.id}
                        onChange={({ html, json }) => {
                          setSections((prev) =>
                            prev.map((s) =>
                              s.id === activeSection.id
                                ? { ...s, contentHtml: html, contentJson: json }
                                : s
                            )
                          );
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-card text-muted-foreground">
                  Select a section from the left or create one to begin writing.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Live Reader Preview */}
        {activeTab === "preview" && (
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border p-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Reader & Flipbook Preview</CardTitle>
                <CardDescription className="text-xs">
                  This matches how readers see this edition at{" "}
                  <span className="font-mono text-primary">/magazine/view/{issue.slug}</span>
                </CardDescription>
              </div>

              {issue.status === "published" && (
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`/magazine/view/${issue.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Open Standalone Tab</span>
                  </a>
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
              {/* Preview Hero */}
              <div className="rounded-xl overflow-hidden border border-border bg-card">
                <div className="bg-muted p-8 relative border-b border-border">
                  <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
                    ACME Hospital & Healthcare
                  </div>
                  <h1 className="font-serif text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-2">
                    {issue.title}
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-xl mb-6">
                    {issue.description || "Monthly Electronic Magazine Issue"}
                  </p>

                  <div className="flex flex-wrap gap-4 pt-4 border-t border-border text-xs">
                    <div>
                      <span className="text-muted-foreground block uppercase font-mono text-[10px]">Reference</span>
                      <span className="font-bold text-foreground">{issue.issueNo}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block uppercase font-mono text-[10px]">Articles</span>
                      <span className="font-bold text-foreground">{sections.length} Stories</span>
                    </div>
                  </div>
                </div>

                {issue.coverImageUrl && (
                  <div className="max-h-80 w-full overflow-hidden bg-muted">
                    <img src={issue.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Preview Editorial Foreword */}
              <Card className="p-6 space-y-3 bg-card border-border">
                <div className="border-b border-border pb-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Editorial Foreword
                  </span>
                  <h3 className="font-serif text-xl font-bold text-foreground mt-2">
                    {editorialTitle || "From the Editorial Desk"}
                  </h3>
                </div>
                <div
                  className="prose dark:prose-invert max-w-none font-serif text-sm leading-relaxed text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html:
                      editorialHtml && editorialHtml.trim()
                        ? (editorialHtml.includes("<") ? editorialHtml : `<p>${editorialHtml}</p>`)
                        : `<p>Welcome to the <strong>Month ${month} ${year}</strong> edition of <em>${title}</em>. Our clinical teams and departments continue to bring groundbreaking updates, healthcare insights, and medical excellence to our community.</p>`,
                  }}
                />
              </Card>

              {/* Preview TOC */}
              {sections.length > 0 && (
                <Card className="p-6 space-y-4">
                  <h3 className="font-serif text-xl font-bold flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Table of Contents
                  </h3>
                  <div className="space-y-3">
                    {sections.map((sec, idx) => (
                      <div key={sec.id} className="flex items-start gap-3 border-b border-border pb-2.5">
                        <span className="font-serif font-bold text-primary text-sm min-w-[24px]">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-foreground">{sec.title}</h4>
                          {sec.subtitle && <p className="text-xs text-muted-foreground">{sec.subtitle}</p>}
                          {sec.authorName && (
                            <p className="text-[11px] text-primary mt-0.5">By {sec.authorName} • {sec.authorRole}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Preview Sections */}
              <div className="space-y-6">
                {sections.map((sec, idx) => (
                  <Card key={sec.id} className="p-8 space-y-4">
                    <div className="border-b border-border pb-4">
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        Section {String(idx + 1).padStart(2, "0")}
                      </span>
                      <h2 className="font-serif text-2xl font-bold text-foreground mt-2">{sec.title}</h2>
                      {sec.subtitle && <p className="text-sm text-muted-foreground mt-1">{sec.subtitle}</p>}
                      {sec.authorName && (
                        <div className="flex items-center gap-2 mt-3 text-xs text-foreground font-medium">
                          <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center font-bold text-foreground">
                            {sec.authorName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold">{sec.authorName}</span>
                            {sec.authorRole && <span className="text-muted-foreground"> — {sec.authorRole}</span>}
                          </div>
                        </div>
                      )}
                    </div>

                    <div
                      className="prose dark:prose-invert max-w-none font-serif text-[1.05rem] leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: sec.contentHtml || "<p>No content</p>" }}
                    />
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: Issue Settings & Metadata */}
        {activeTab === "settings" && (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base font-bold">Issue Settings & Cover</CardTitle>
              <CardDescription className="text-xs">
                Update the issue title, unique URL slug, edition date, cover artwork, and editorial foreword.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Issue Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Public URL Slug <span className="text-muted-foreground font-normal">(/magazine/&lt;slug&gt;)</span>
                </label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Description / Subtitle</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Issue Month</label>
                  <Select value={String(month)} onValueChange={(val) => setMonth(parseInt(val, 10))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          Month {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Issue Year</label>
                  <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} />
                </div>
              </div>

              {/* Editorial Desk Foreword Section */}
              <div className="border-t border-border pt-4 space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-foreground">Editorial Desk Foreword</h4>
                  <p className="text-xs text-muted-foreground">
                    Customize the opening message displayed on the Inside Cover &amp; Editorial section.
                    <span className="font-semibold text-primary block mt-0.5">
                      Note: The Table of Contents ("In This Issue") is automatically compiled from your article sections.
                    </span>
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Editorial Title</label>
                  <Input
                    value={editorialTitle}
                    onChange={(e) => setEditorialTitle(e.target.value)}
                    placeholder="From the Editorial Desk"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Editorial Message</label>
                  <textarea
                    value={editorialHtml}
                    onChange={(e) => setEditorialHtml(e.target.value)}
                    placeholder="Welcome message, highlights of this edition, leadership remarks..."
                    className="w-full min-h-[120px] p-3 text-sm rounded-md border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary font-sans leading-relaxed text-foreground"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Plain text or HTML formatted paragraphs. Leave empty to use the dynamic default welcome foreword.
                  </p>
                </div>
              </div>

              {/* Cover Image Upload */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-semibold text-foreground block">Cover Image Artwork</label>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMediaLibraryOpen(true)}
                    className="text-xs gap-1.5 font-semibold bg-muted/40"
                  >
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <span>Choose from WebP Media Library</span>
                  </Button>
                  <span className="text-xs text-muted-foreground">or upload new file:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      disabled={isUploadingCover}
                      className="text-xs h-8 max-w-[220px]"
                    />
                    {isUploadingCover && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </div>
                </div>

                {coverImageUrl && (
                  <div className="mt-3 relative h-48 w-full rounded-xl overflow-hidden border border-border bg-muted/20">
                    <img src={coverImageUrl} alt="Cover Artwork" className="h-full w-full object-cover" />
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setCoverImageUrl("")}
                      className="absolute top-2 right-2 h-7 text-xs shadow-md"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              {canManageMagazine && (
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={handleSaveMetadata}
                    disabled={isSavingMeta}
                    className="font-semibold"
                  >
                    {isSavingMeta ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Metadata"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Media Library Dialog for Cover Image */}
      <MediaLibraryDialog
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelectImage={(media) => {
          setCoverImageUrl(media.url);
          toast.success("Cover image selected from library!");
        }}
        issueId={id}
        title="Select Magazine Cover Artwork"
      />
    </ModuleLayout>
  );
}
