import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ModuleLayout } from "@/components/ModuleLayout";
import { useRpcQuery } from "@/lib/query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/card";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Plus,
  Search,
  Calendar,
  ExternalLink,
  Edit,
  Trash2,
  CheckCircle,
  Archive,
  Copy,
  Users,
  Image as ImageIcon,
  Loader2,
  FileText,
  Clock,
  Sparkles,
  Settings,
  Download,
  Images,
  Building2,
} from "lucide-react";
import * as React from "react";
import { MediaLibraryDialog } from "@/components/magazine/MediaLibraryDialog";
import { useUserPermissions } from "@/lib/permissions";
import { exportMagazineToPDF } from "@/lib/magazine-export";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

export const Route = createFileRoute("/_authenticated/magazine/")({
  component: MagazineDashboard,
});

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function generateSlug(title: string, month: number, year: number) {
  const monthName = MONTHS.find((m) => m.value === month)?.label.toLowerCase() || `m${month}`;
  return `${monthName}-${year}`;
}

export function MagazineDashboard() {
  const navigate = useNavigate();
  const { isAdmin, canManageMagazine } = useUserPermissions();

  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedYear, setSelectedYear] = React.useState<string>("all");

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form states for new issue
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [newTitle, setNewTitle] = React.useState(`ACME Health Digest — ${MONTHS[currentMonth - 1]?.label} ${currentYear}`);
  const [newMonth, setNewMonth] = React.useState(currentMonth);
  const [newYear, setNewYear] = React.useState(currentYear);
  const [newSlug, setNewSlug] = React.useState(generateSlug("", currentMonth, currentYear));
  const [newDescription, setNewDescription] = React.useState("Monthly medical insights, clinical highlights, hospital achievements, and health tips.");
  const [newEditorialTitle, setNewEditorialTitle] = React.useState("From the Editorial Desk");
  const [newEditorialHtml, setNewEditorialHtml] = React.useState("");
  const [newCoverUrl, setNewCoverUrl] = React.useState("");
  const [isUploadingCover, setIsUploadingCover] = React.useState(false);

  // Form states for editing issue
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [editingIssueNo, setEditingIssueNo] = React.useState("");
  const [editTitle, setEditTitle] = React.useState("");
  const [editMonth, setEditMonth] = React.useState(currentMonth);
  const [editYear, setEditYear] = React.useState(currentYear);
  const [editSlug, setEditSlug] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editEditorialTitle, setEditEditorialTitle] = React.useState("From the Editorial Desk");
  const [editEditorialHtml, setEditEditorialHtml] = React.useState("");
  const [editCoverUrl, setEditCoverUrl] = React.useState("");
  const [isUploadingEditCover, setIsUploadingEditCover] = React.useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = React.useState<number | null>(null);

  // Media Library state
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = React.useState(false);
  const [mediaLibraryPurpose, setMediaLibraryPurpose] = React.useState<"general" | "createCover" | "editCover">("general");

  const handleDownloadIssuePDF = async (issueItem: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDownloadingPdfId(issueItem.id);
    try {
      toast.info(`Preparing PDF for "${issueItem.title}"...`);
      const res = await fetch(`/api/magazine/issues/${issueItem.id}`);
      if (!res.ok) throw new Error("Failed to fetch full issue details");
      const fullIssue = await res.json();
      await exportMagazineToPDF(fullIssue);
      toast.success("Magazine PDF downloaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate PDF");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Query issues
  const issuesQuery = useRpcQuery<{
    data: Array<{
      id: number;
      issueNo: string;
      title: string;
      slug: string;
      coverImageUrl: string | null;
      description: string | null;
      issueMonth: number;
      issueYear: number;
      status: "draft" | "published" | "archived";
      publishedAt: string | null;
      createdAt: string;
      creatorName: string | null;
      sectionCount: number;
    }>;
    pagination: {
      page: number;
      pageSize: number;
      totalRecords: number;
      totalPages: number;
    };
  }>(
    ["magazine-issues", statusFilter, searchQuery, selectedYear],
    () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      if (selectedYear !== "all") params.set("year", selectedYear);
      params.set("pageSize", "50");

      return fetch(`/api/magazine/issues?${params.toString()}`);
    }
  );

  const handleMonthYearChange = (m: number, y: number) => {
    setNewMonth(m);
    setNewYear(y);
    const mName = MONTHS.find((item) => item.value === m)?.label || "";
    setNewTitle(`ACME Health Digest — ${mName} ${y}`);
    setNewSlug(generateSlug("", m, y));
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("issueId", newSlug || "cover");

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
      setNewCoverUrl(data.url);
      toast.success("Cover image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload cover image");
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSlug.trim()) {
      toast.error("Please enter a title and slug");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/magazine/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          slug: newSlug.trim().toLowerCase(),
          description: newDescription.trim() || null,
          editorialTitle: newEditorialTitle.trim() || "From the Editorial Desk",
          editorialHtml: newEditorialHtml.trim() || null,
          coverImageUrl: newCoverUrl || null,
          issueMonth: newMonth,
          issueYear: newYear,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create issue");
      }

      const created = await res.json();
      toast.success(`Created issue ${created.issueNo}!`);
      setIsCreateOpen(false);
      issuesQuery.refetch();
      navigate({ to: "/magazine/$id", params: { id: String(created.id) } });
    } catch (err: any) {
      toast.error(err.message || "Failed to create issue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (issue: {
    id: number;
    issueNo: string;
    title: string;
    slug: string;
    coverImageUrl: string | null;
    description: string | null;
    editorialTitle?: string | null;
    editorialHtml?: string | null;
    issueMonth: number;
    issueYear: number;
  }, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(issue.id);
    setEditingIssueNo(issue.issueNo);
    setEditTitle(issue.title);
    setEditMonth(issue.issueMonth);
    setEditYear(issue.issueYear);
    setEditSlug(issue.slug);
    setEditDescription(issue.description || "");
    setEditEditorialTitle(issue.editorialTitle || "From the Editorial Desk");
    setEditEditorialHtml(issue.editorialHtml || "");
    setEditCoverUrl(issue.coverImageUrl || "");
    setIsEditOpen(true);
  };

  const handleEditMonthYearChange = (m: number, y: number) => {
    setEditMonth(m);
    setEditYear(y);
  };

  const handleEditCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingEditCover(true);
    const formData = new FormData();
    formData.append("file", file);
    if (editingId) {
      formData.append("issueId", String(editingId));
    }

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
      setEditCoverUrl(data.url);
      toast.success("Cover image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload cover image");
    } finally {
      setIsUploadingEditCover(false);
    }
  };

  const handleUpdateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editTitle.trim() || !editSlug.trim()) {
      toast.error("Please enter a title and slug");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/magazine/issues/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          slug: editSlug.trim().toLowerCase(),
          description: editDescription.trim() || null,
          editorialTitle: editEditorialTitle.trim() || "From the Editorial Desk",
          editorialHtml: editEditorialHtml.trim() || null,
          coverImageUrl: editCoverUrl || null,
          issueMonth: editMonth,
          issueYear: editYear,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update issue");
      }

      toast.success("Issue details updated successfully!");
      setIsEditOpen(false);
      issuesQuery.refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update issue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/magazine/issues/${id}/publish`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to publish issue");
      }
      toast.success("Issue published successfully!");
      issuesQuery.refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleArchive = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/magazine/issues/${id}/archive`, { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to archive issue");
      }
      toast.success("Issue archived");
      issuesQuery.refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: number, issueNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete issue ${issueNo}? All articles inside will be permanently removed.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/magazine/issues/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete issue");
      }
      toast.success(`Issue ${issueNo} deleted`);
      issuesQuery.refetch();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const copyPublicLink = (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/magazine/view/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Public magazine reader link copied to clipboard!");
  };

  const issues = issuesQuery.data?.data || [];

  return (
    <ModuleLayout
      title="Electronic Magazine"
      description="Manage and publish hospital monthly electronic magazine editions with rich-text stories and SSR distribution."
      action={
        <div className="flex items-center gap-2">
          {canManageMagazine && (
            <Link to="/magazine/settings">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>Hospital Info</span>
              </Button>
            </Link>
          )}

          {isAdmin && (
            <Link to="/magazine/editors">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Manage Editors</span>
              </Button>
            </Link>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMediaLibraryPurpose("general");
              setIsMediaLibraryOpen(true);
            }}
            className="gap-1.5 bg-muted/40 hover:bg-muted font-semibold"
          >
            <Images className="h-4 w-4 text-primary" />
            <span>Media Assets</span>
          </Button>

          {canManageMagazine && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Create Monthly Issue</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Filter & Search Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="flex flex-1 items-center gap-3 w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by title, edition number, or slug..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-35">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Drafts</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-30">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-muted-foreground font-medium">
                Showing {issues.length} {issues.length === 1 ? "issue" : "issues"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Issues List Grid */}
        {issuesQuery.isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-border">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : issuesQuery.isError ? (
          <Card className="border-destructive/30 py-12 text-center">
            <CardContent className="flex flex-col items-center justify-center space-y-3">
              <div className="text-destructive font-semibold text-base">Failed to load magazine issues</div>
              <p className="text-sm text-muted-foreground max-w-md">
                {(issuesQuery.error as any)?.message || "An unexpected error occurred while fetching issues."}
              </p>
              <Button variant="outline" size="sm" onClick={() => issuesQuery.refetch()} className="mt-2">
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : issues.length === 0 ? (
          <Card className="border-dashed py-16 text-center">
            <CardContent className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-full p-4 text-primary bg-muted">
                <BookOpen className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold">No Magazine Issues Found</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md">
                  {searchQuery || statusFilter !== "all"
                    ? "No issues matched your current search filters."
                    : "Get started by creating your first monthly magazine issue."}
                </p>
              </div>
              {canManageMagazine && (
                <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  <span>Create First Issue</span>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {issues.map((issue) => {
              const monthName = MONTHS.find((m) => m.value === issue.issueMonth)?.label || `M${issue.issueMonth}`;
              const isPublished = issue.status === "published";
              const isDraft = issue.status === "draft";
              const isArchived = issue.status === "archived";

              return (
                <Card
                  key={issue.id}
                  onClick={() => navigate({ to: "/magazine/$id", params: { id: String(issue.id) } })}
                  className="group relative flex flex-col overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/40 cursor-pointer"
                >
                  {/* Cover Header Banner */}
                  <div className="relative h-44 w-full overflow-hidden bg-muted border-b border-border">
                    {issue.coverImageUrl ? (
                      <img
                        src={issue.coverImageUrl}
                        alt={issue.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-muted-foreground">
                        <Sparkles className="h-8 w-8 text-primary/70 mb-2" />
                        <span className="text-lg font-bold tracking-tight text-foreground">
                          {monthName} {issue.issueYear} Edition
                        </span>
                        <span className="text-xs text-muted-foreground mt-1 font-mono">{issue.issueNo}</span>
                      </div>
                    )}

                    {/* Status Badge Over Image */}
                    <div className="absolute top-3 right-3">
                      {isPublished && (
                        <Badge variant="default" className="gap-1 shadow-xs">
                          <CheckCircle className="h-3 w-3" />
                          Published
                        </Badge>
                      )}
                      {isDraft && (
                        <Badge variant="secondary" className="gap-1 shadow-xs">
                          <Clock className="h-3 w-3" />
                          Draft
                        </Badge>
                      )}
                      {isArchived && (
                        <Badge variant="outline" className="gap-1 bg-background/80 shadow-xs">
                          <Archive className="h-3 w-3" />
                          Archived
                        </Badge>
                      )}
                    </div>

                    {/* Month Year Pill */}
                    <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-md rounded-md px-2.5 py-1 text-xs font-semibold text-foreground flex items-center gap-1.5 shadow-xs border border-border/60">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{monthName} {issue.issueYear}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <CardHeader className="p-5 pb-3">
                    <div className="text-xs font-mono font-medium text-muted-foreground mb-1">
                      {issue.issueNo}
                    </div>
                    <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">
                      {issue.title}
                    </CardTitle>
                    <CardDescription className="text-xs line-clamp-2 mt-1">
                      {issue.description || "No description provided."}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 mt-auto">
                    {/* Meta stats */}
                    <div className="flex items-center justify-between py-3 border-t border-border text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 font-medium">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{issue.sectionCount} {issue.sectionCount === 1 ? "Article" : "Articles"}</span>
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Slug: <span className="font-mono text-foreground">/magazine/view/{issue.slug}</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-border" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => navigate({ to: "/magazine/$id", params: { id: String(issue.id) } })}
                          className="h-8 gap-1.5 text-xs shadow-xs"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          <span>Edit Articles</span>
                        </Button>

                        {canManageMagazine && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => openEditModal(issue, e)}
                            className="h-8 gap-1 text-xs"
                            title="Edit Issue Details & Cover"
                          >
                            <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Details</span>
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => handleDownloadIssuePDF(issue, e)}
                          disabled={downloadingPdfId === issue.id}
                          className="h-8 gap-1 text-xs"
                          title="Download PDF document"
                        >
                          {downloadingPdfId === issue.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          ) : (
                            <Download className="h-3.5 w-3.5 text-primary" />
                          )}
                          <span className="hidden sm:inline">PDF</span>
                        </Button>

                        {isPublished && (
                          <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs">
                            <a
                              href={`/magazine/view/${issue.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open public flipbook & reader"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>Read</span>
                            </a>
                          </Button>
                        )}

                        {isPublished && (
                          <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs text-sky-500 hover:text-sky-400">
                            <a
                              href={`/magazine/view/${issue.slug}/gallery`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open public photo gallery"
                            >
                              <ImageIcon className="h-3.5 w-3.5" />
                              <span className="hidden md:inline">Gallery</span>
                            </a>
                          </Button>
                        )}

                        {isPublished && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => copyPublicLink(issue.slug, e)}
                            className="h-8 w-8 p-0 text-muted-foreground"
                            title="Copy Public Reader Link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {isDraft && canManageMagazine && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handlePublish(issue.id, e)}
                            className="h-8 text-xs font-semibold"
                          >
                            Publish
                          </Button>
                        )}

                        {isPublished && canManageMagazine && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleArchive(issue.id, e)}
                            className="h-8 text-xs text-muted-foreground"
                            title="Archive this issue"
                          >
                            Archive
                          </Button>
                        )}

                        {canManageMagazine && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDelete(issue.id, issue.issueNo, e)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete Issue"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Issue Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <form onSubmit={handleCreateIssue}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <BookOpen className="h-5 w-5 text-primary" />
                Create Monthly Issue
              </DialogTitle>
              <DialogDescription>
                Set up a new electronic magazine issue. An auto-incrementing sequential document number will be assigned.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Month and Year Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Issue Month</label>
                  <Select
                    value={String(newMonth)}
                    onValueChange={(val) => handleMonthYearChange(parseInt(val, 10), newYear)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Issue Year</label>
                  <Select
                    value={String(newYear)}
                    onValueChange={(val) => handleMonthYearChange(newMonth, parseInt(val, 10))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                      <SelectItem value="2028">2028</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Issue Title</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. ACME Health Digest — August 2026"
                  required
                />
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Public URL Slug <span className="text-muted-foreground font-normal">(/magazine/&lt;slug&gt;)</span>
                </label>
                <Input
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  placeholder="e.g. august-2026"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description / Subtitle</label>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Summary of this issue edition..."
                />
              </div>

              {/* Editorial Foreword */}
              <div className="border-t border-border pt-3 space-y-2">
                <div>
                  <label className="text-xs font-bold text-foreground">Editorial Desk Foreword</label>
                  <p className="text-[11px] text-muted-foreground">
                    Custom message on Inside Cover (contents list is generated automatically).
                  </p>
                </div>
                <Input
                  value={newEditorialTitle}
                  onChange={(e) => setNewEditorialTitle(e.target.value)}
                  placeholder="From the Editorial Desk"
                  className="text-xs"
                />
                <textarea
                  value={newEditorialHtml}
                  onChange={(e) => setNewEditorialHtml(e.target.value)}
                  placeholder="Editorial welcome message (optional)..."
                  className="w-full min-h-[70px] p-2 text-xs rounded-md border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary font-sans leading-relaxed text-foreground"
                />
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">Cover Image Artwork</label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMediaLibraryPurpose("createCover");
                      setIsMediaLibraryOpen(true);
                    }}
                    className="text-xs gap-1.5 font-semibold bg-muted/40"
                  >
                    <Images className="h-3.5 w-3.5 text-primary" />
                    <span>Choose from WebP Library</span>
                  </Button>
                  <span className="text-xs text-muted-foreground">or upload:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverUpload}
                      disabled={isUploadingCover}
                      className="cursor-pointer text-xs h-8 max-w-[200px]"
                    />
                    {isUploadingCover && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </div>
                </div>
                {newCoverUrl && (
                  <div className="mt-2 relative h-32 w-full rounded-lg overflow-hidden border border-border bg-muted/20">
                    <img src={newCoverUrl} alt="Cover preview" className="h-full w-full object-cover" />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setNewCoverUrl("")}
                      className="absolute top-1.5 right-1.5 h-6 text-[10px] px-2"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Issue Edition"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Issue Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Issue Details</DialogTitle>
            <DialogDescription>
              Update edition metadata, publication schedule, or cover artwork for {editingIssueNo}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateIssue} className="space-y-4">
            <div className="space-y-3">
              {/* Month and Year Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Issue Month</label>
                  <Select
                    value={String(editMonth)}
                    onValueChange={(val) => handleEditMonthYearChange(parseInt(val, 10), editYear)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m) => (
                        <SelectItem key={m.value} value={String(m.value)}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Issue Year</label>
                  <Select
                    value={String(editYear)}
                    onValueChange={(val) => handleEditMonthYearChange(editMonth, parseInt(val, 10))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                      <SelectItem value="2028">2028</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Issue Title</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Public URL Slug <span className="text-muted-foreground font-normal">(/magazine/&lt;slug&gt;)</span>
                </label>
                <Input
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description / Subtitle</label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Summary of this issue edition..."
                />
              </div>

              {/* Editorial Foreword */}
              <div className="border-t border-border pt-3 space-y-2">
                <div>
                  <label className="text-xs font-bold text-foreground">Editorial Desk Foreword</label>
                  <p className="text-[11px] text-muted-foreground">
                    Custom message on Inside Cover (contents list is generated automatically).
                  </p>
                </div>
                <Input
                  value={editEditorialTitle}
                  onChange={(e) => setEditEditorialTitle(e.target.value)}
                  placeholder="From the Editorial Desk"
                  className="text-xs"
                />
                <textarea
                  value={editEditorialHtml}
                  onChange={(e) => setEditEditorialHtml(e.target.value)}
                  placeholder="Editorial welcome message (optional)..."
                  className="w-full min-h-[70px] p-2 text-xs rounded-md border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary font-sans leading-relaxed text-foreground"
                />
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">Cover Image Artwork</label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMediaLibraryPurpose("editCover");
                      setIsMediaLibraryOpen(true);
                    }}
                    className="text-xs gap-1.5 font-semibold bg-muted/40"
                  >
                    <Images className="h-3.5 w-3.5 text-primary" />
                    <span>Choose from WebP Library</span>
                  </Button>
                  <span className="text-xs text-muted-foreground">or upload:</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleEditCoverUpload}
                      disabled={isUploadingEditCover}
                      className="cursor-pointer text-xs h-8 max-w-[200px]"
                    />
                    {isUploadingEditCover && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </div>
                </div>
                {editCoverUrl && (
                  <div className="mt-2 relative h-32 w-full rounded-lg overflow-hidden border border-border bg-muted/20">
                    <img src={editCoverUrl} alt="Cover preview" className="h-full w-full object-cover" />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => setEditCoverUrl("")}
                      className="absolute top-1.5 right-1.5 h-6 text-[10px] px-2"
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reusable WebP Media Library Modal */}
      <MediaLibraryDialog
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelectImage={(media) => {
          if (mediaLibraryPurpose === "createCover") {
            setNewCoverUrl(media.url);
            toast.success("Cover image selected from library!");
          } else if (mediaLibraryPurpose === "editCover") {
            setEditCoverUrl(media.url);
            toast.success("Cover image selected from library!");
          } else {
            toast.info(`Selected ${media.alt || "image"}`);
          }
        }}
        title={
          mediaLibraryPurpose === "general"
            ? "Magazine Media Assets Library"
            : "Select Issue Cover Image"
        }
        issueId={mediaLibraryPurpose === "editCover" && editingId ? editingId : undefined}
      />
    </ModuleLayout>
  );
}
