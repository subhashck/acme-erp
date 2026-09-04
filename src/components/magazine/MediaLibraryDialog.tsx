import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Badge } from "@/ui/badge";
import {
  Image as ImageIcon,
  Upload,
  Search,
  Check,
  Trash2,
  Copy,
  ExternalLink,
  Sparkles,
  Loader2,
  HardDrive,
  Filter,
  RefreshCw,
  FileCheck,
  Layers,
  Link as LinkIcon,
  X,
  Tag,
  Edit2,
  Plus,
  SlidersHorizontal,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/utils/cn";

export interface MediaAssetIssue {
  id: number;
  issueNo: string;
  title: string;
  slug?: string;
}

export interface MediaAsset {
  id: number;
  fileHash: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  originalSize: number | null;
  width: number | null;
  height: number | null;
  objectKey: string;
  thumbnailKey: string | null;
  url: string;
  thumbnailUrl: string | null;
  tags: string[];
  issueId: number | null;
  issueIds?: number[];
  issues?: MediaAssetIssue[];
  savingsPercentage?: number;
  createdAt: string;
}

interface MediaLibraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (media: {
    url: string;
    alt?: string;
    title?: string;
    width?: number | null;
    height?: number | null;
  }) => void;
  issueId?: number | string;
  title?: string;
}

const COMMON_TAG_SUGGESTIONS = [
  "covers",
  "doctors",
  "surgeries",
  "events",
  "nursing",
  "awards",
  "equipment",
  "facilities",
  "infographics",
  "team",
];

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function MediaLibraryDialog({
  isOpen,
  onClose,
  onSelectImage,
  issueId,
  title = "Magazine Media Library",
}: MediaLibraryDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<"library" | "upload" | "url">("library");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedTag, setSelectedTag] = React.useState<string>("all");
  const [filterIssueOnly, setFilterIssueOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [selectedMedia, setSelectedMedia] = React.useState<MediaAsset | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadTags, setUploadTags] = React.useState<string[]>([]);
  const [uploadTagInput, setUploadTagInput] = React.useState("");
  const [uploadIssueIds, setUploadIssueIds] = React.useState<number[]>([]);
  const [uploadFeedback, setUploadFeedback] = React.useState<{
    successCount: number;
    duplicateCount: number;
    savedBytes: number;
  } | null>(null);

  // Fetch Available Magazine Issues for Multi-Issue Assignment
  const issuesQuery = useQuery<{
    data: { id: number; issueNo: string; title: string; issueMonth: number; issueYear: number }[];
  }>({
    queryKey: ["magazine-issues-picker-list"],
    queryFn: async () => {
      const res = await fetch("/api/magazine/issues?pageSize=100");
      if (!res.ok) return { data: [] };
      return res.json();
    },
    enabled: isOpen,
  });
  const allIssues = issuesQuery.data?.data || [];

  const parsedIssueId = issueId && !isNaN(Number(issueId)) ? Number(issueId) : undefined;

  React.useEffect(() => {
    if (parsedIssueId && uploadIssueIds.length === 0) {
      setUploadIssueIds([parsedIssueId]);
    }
  }, [parsedIssueId]);

  // Rename and Tag Editing State for Selected Media
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameInput, setNameInput] = React.useState("");
  const [tagInput, setTagInput] = React.useState("");

  // Manual URL Insert State
  const [externalUrl, setExternalUrl] = React.useState("");
  const [externalAlt, setExternalAlt] = React.useState("");

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Sync edit name state when selectedMedia changes
  React.useEffect(() => {
    if (selectedMedia) {
      setNameInput(selectedMedia.originalName);
      setIsEditingName(false);
      setTagInput("");
    }
  }, [selectedMedia?.id]);

  // Debounce search input
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch Available Tags
  const tagsQuery = useQuery<{ tags: string[] }>({
    queryKey: ["magazine-media-tags"],
    queryFn: async () => {
      const res = await fetch("/api/magazine/media/tags");
      if (!res.ok) return { tags: [] };
      return res.json();
    },
    enabled: isOpen,
  });

  // Fetch Media Assets
  const queryParams = new URLSearchParams({
    page: String(page),
    pageSize: "24",
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(selectedTag && selectedTag !== "all" ? { tag: selectedTag } : {}),
    ...(filterIssueOnly && parsedIssueId ? { issueId: String(parsedIssueId) } : {}),
  });

  const { data, isLoading, isFetching, refetch } = useQuery<{
    data: MediaAsset[];
    pagination: { page: number; pageSize: number; totalRecords: number; totalPages: number };
  }>({
    queryKey: [
      "magazine-media",
      debouncedSearch,
      selectedTag,
      filterIssueOnly ? parsedIssueId : "all",
      page,
    ],
    queryFn: async () => {
      const res = await fetch(`/api/magazine/media?${queryParams.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch media assets");
      }
      return res.json();
    },
    enabled: isOpen,
  });

  // Update Media Asset Mutation (Rename / Tags)
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      originalName,
      tags,
      issueId,
    }: {
      id: number;
      originalName?: string;
      tags?: string[];
      issueId?: number | null;
    }) => {
      const res = await fetch(`/api/magazine/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalName, tags, issueId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update media asset");
      }
      return res.json();
    },
    onSuccess: (updatedAsset: MediaAsset) => {
      toast.success("Media asset updated");
      setSelectedMedia(updatedAsset);
      setIsEditingName(false);
      queryClient.invalidateQueries({ queryKey: ["magazine-media"] });
      queryClient.invalidateQueries({ queryKey: ["magazine-media-tags"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update asset");
    },
  });

  // Fast Single-Issue Assign/Unassign Mutation
  const toggleIssueAssignmentMutation = useMutation({
    mutationFn: async ({
      mediaId,
      targetIssueId,
      assigned,
    }: {
      mediaId: number;
      targetIssueId: number;
      assigned: boolean;
    }) => {
      const res = await fetch(`/api/magazine/media/${mediaId}/assign-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: targetIssueId, assigned }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update issue assignment");
      }
      return res.json();
    },
    onSuccess: (updatedAsset: MediaAsset) => {
      toast.success("Issue assignment updated");
      setSelectedMedia(updatedAsset);
      queryClient.invalidateQueries({ queryKey: ["magazine-media"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update issue assignment");
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/magazine/media/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete media asset");
      }
      return res.json();
    },
    onSuccess: (_, deletedId) => {
      toast.success("Media asset removed");
      if (selectedMedia?.id === deletedId) {
        setSelectedMedia(null);
      }
      queryClient.invalidateQueries({ queryKey: ["magazine-media"] });
      queryClient.invalidateQueries({ queryKey: ["magazine-media-tags"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete image");
    },
  });

  // Save Renamed File
  const handleSaveRename = () => {
    if (!selectedMedia) return;
    const trimmed = nameInput.trim();
    if (!trimmed) {
      toast.error("Filename cannot be empty");
      return;
    }
    if (trimmed === selectedMedia.originalName) {
      setIsEditingName(false);
      return;
    }
    updateMutation.mutate({ id: selectedMedia.id, originalName: trimmed });
  };

  // Add Tag to Selected Asset
  const handleAddTag = (tagToAdd: string) => {
    if (!selectedMedia) return;
    const clean = tagToAdd.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!clean) return;

    const currentTags = selectedMedia.tags || [];
    if (currentTags.includes(clean)) {
      toast.info(`Tag "${clean}" is already added`);
      setTagInput("");
      return;
    }

    const updatedTags = [...currentTags, clean];
    updateMutation.mutate({ id: selectedMedia.id, tags: updatedTags });
    setTagInput("");
  };

  // Remove Tag from Selected Asset
  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedMedia) return;
    const currentTags = selectedMedia.tags || [];
    const updatedTags = currentTags.filter((t) => t !== tagToRemove);
    updateMutation.mutate({ id: selectedMedia.id, tags: updatedTags });
  };

  // Upload handler
  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadFeedback(null);
    let successCount = 0;
    let duplicateCount = 0;
    let totalOriginal = 0;
    let totalFinal = 0;
    let lastUploaded: MediaAsset | null = null;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        if (uploadIssueIds.length > 0) {
          formData.append("issueIds", JSON.stringify(uploadIssueIds));
          formData.append("issueId", String(uploadIssueIds[0]));
        } else if (parsedIssueId) {
          formData.append("issueId", String(parsedIssueId));
          formData.append("issueIds", JSON.stringify([parsedIssueId]));
        }
        if (uploadTags.length > 0) {
          formData.append("tags", JSON.stringify(uploadTags));
        }

        const res = await fetch("/api/magazine/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Failed to upload ${file.name}`);
        }

        const result = await res.json();
        lastUploaded = result;
        if (result.isDuplicate) {
          duplicateCount++;
        } else {
          successCount++;
          totalOriginal += result.originalSize || file.size;
          totalFinal += result.fileSize;
        }
      }

      const savedBytes = Math.max(0, totalOriginal - totalFinal);
      setUploadFeedback({ successCount, duplicateCount, savedBytes });

      queryClient.invalidateQueries({ queryKey: ["magazine-media"] });
      queryClient.invalidateQueries({ queryKey: ["magazine-media-tags"] });

      if (lastUploaded) {
        setSelectedMedia(lastUploaded);
      }

      if (duplicateCount > 0 && successCount === 0) {
        toast.info("Image already exists in library (deduplicated without re-uploading)");
      } else if (successCount > 0) {
        toast.success(`Processed & converted ${successCount} image(s) to WebP`);
      }

      // Switch back to library view after upload
      setTimeout(() => {
        setActiveTab("library");
      }, 700);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleConfirmSelection = () => {
    if (!selectedMedia) return;
    onSelectImage({
      url: selectedMedia.url,
      alt: selectedMedia.originalName,
      title: selectedMedia.originalName,
      width: selectedMedia.width,
      height: selectedMedia.height,
    });
    onClose();
  };

  const handleInsertExternalUrl = () => {
    if (!externalUrl.trim()) {
      toast.error("Please enter a valid image URL");
      return;
    }
    onSelectImage({
      url: externalUrl.trim(),
      alt: externalAlt.trim() || undefined,
    });
    setExternalUrl("");
    setExternalAlt("");
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Image URL copied to clipboard");
  };

  const allTags = tagsQuery.data?.tags || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[96vw] max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] sm:max-w-[96vw] h-[92vh] max-h-[880px] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border shadow-2xl">
        {/* Header with Navigation Tabs */}
        <DialogHeader className="p-4 px-6 border-b border-border bg-muted/40 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <ImageIcon className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">{title}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Auto-compressed WebP format with SHA-256 deduplication & tag indexing
                </DialogDescription>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center bg-background border border-border p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className={cn(
                  "px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5",
                  activeTab === "library"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Library</span>
                {data?.pagination?.totalRecords !== undefined && (
                  <span className="opacity-75 text-[10px] font-mono">({data.pagination.totalRecords})</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={cn(
                  "px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5",
                  activeTab === "upload"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Upload WebP</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("url")}
                className={cn(
                  "px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5",
                  activeTab === "url"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                <span>Direct URL</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* TAB 1: Library Browser */}
        {activeTab === "library" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search & Filter Toolbar */}
            <div className="p-3 px-6 border-b border-border bg-background flex flex-col gap-2.5 flex-shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assets by file name or tag..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 text-xs bg-muted/30"
                  />
                  {search && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearch("")}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {parsedIssueId && (
                    <Button
                      type="button"
                      variant={filterIssueOnly ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setFilterIssueOnly(!filterIssueOnly);
                        setPage(1);
                      }}
                      className="h-8 text-xs gap-1.5 font-medium"
                    >
                      <Filter className="h-3.5 w-3.5" />
                      <span>This Issue Only</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="h-8 w-8 p-0"
                    title="Refresh gallery"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setActiveTab("upload")}
                    className="h-8 text-xs gap-1.5 font-semibold bg-accent text-accent-foreground hover:bg-accent/80"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload New</span>
                  </Button>
                </div>
              </div>

              {/* Tag Quick Filter Chips */}
              {allTags.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
                  <span className="text-[11px] text-muted-foreground font-semibold flex items-center gap-1 mr-1 flex-shrink-0">
                    <Tag className="h-3 w-3" />
                    Tags:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTag("all");
                      setPage(1);
                    }}
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors flex-shrink-0",
                      selectedTag === "all"
                        ? "bg-primary text-primary-foreground font-bold"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All ({data?.pagination?.totalRecords ?? 0})
                  </button>
                  {allTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setSelectedTag(selectedTag === t ? "all" : t);
                        setPage(1);
                      }}
                      className={cn(
                        "px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors flex-shrink-0 flex items-center gap-1",
                        selectedTag === t
                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                          : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <span>#{t}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Gallery Grid + Detail Sidebar */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Image Grid */}
              <div
                className="flex-1 overflow-y-auto p-6 custom-scrollbar"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-xs">Loading media assets...</span>
                  </div>
                ) : !data?.data || data.data.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <h3 className="font-bold text-sm text-foreground">No media assets found</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mt-1">
                      {search || selectedTag !== "all"
                        ? "No image matches your active filters. Try clearing your search or tag."
                        : "Upload your high-res photos, graphics, or logos to get started."}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setSearch("");
                        setSelectedTag("all");
                      }}
                      variant="outline"
                      className="mt-3 text-xs"
                    >
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3.5">
                    {data.data.map((asset) => {
                      const isSelected = selectedMedia?.id === asset.id;
                      return (
                        <div
                          key={asset.id}
                          onClick={() => setSelectedMedia(asset)}
                          onDoubleClick={() => {
                            setSelectedMedia(asset);
                            onSelectImage({
                              url: asset.url,
                              alt: asset.originalName,
                              title: asset.originalName,
                              width: asset.width,
                              height: asset.height,
                            });
                            onClose();
                          }}
                          className={cn(
                            "group relative rounded-xl border overflow-hidden bg-card cursor-pointer transition-all duration-150 flex flex-col",
                            isSelected
                              ? "ring-2 ring-primary border-primary shadow-md"
                              : "border-border hover:border-primary/50 hover:shadow-xs"
                          )}
                        >
                          {/* Thumbnail Box */}
                          <div className="aspect-4/3 w-full bg-muted/60 relative overflow-hidden flex items-center justify-center">
                            <img
                              src={asset.thumbnailUrl || asset.url}
                              alt={asset.originalName}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            {isSelected && (
                              <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </div>
                            )}

                            {/* Format & Savings Badge */}
                            {asset.savingsPercentage !== undefined && asset.savingsPercentage > 10 && (
                              <div className="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Sparkles className="h-2.5 w-2.5 text-amber-300" />
                                <span>-{asset.savingsPercentage}% WebP</span>
                              </div>
                            )}
                          </div>

                          {/* Info Footer */}
                          <div className="p-2 px-2.5 flex flex-col gap-1 bg-card flex-1 justify-between">
                            <div>
                              <span
                                className="text-xs font-semibold text-foreground truncate block"
                                title={asset.originalName}
                              >
                                {asset.originalName}
                              </span>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono mt-0.5">
                                <span>{formatBytes(asset.fileSize)}</span>
                                <div className="flex items-center gap-1">
                                  {asset.issueIds && asset.issueIds.length > 1 && (
                                    <span className="bg-primary/15 text-primary font-bold px-1.5 py-0.2 rounded text-[9px]">
                                      {asset.issueIds.length} Issues
                                    </span>
                                  )}
                                  {asset.width && asset.height && (
                                    <span>{asset.width}×{asset.height}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Tag Chips */}
                            {asset.tags && asset.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                                {asset.tags.slice(0, 2).map((t) => (
                                  <span
                                    key={t}
                                    className="bg-muted px-1.5 py-0.2 rounded text-[9px] text-muted-foreground font-mono"
                                  >
                                    #{t}
                                  </span>
                                ))}
                                {asset.tags.length > 2 && (
                                  <span className="text-[9px] text-muted-foreground font-mono">
                                    +{asset.tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Detail & Asset Editor Sidebar */}
              {selectedMedia && (
                <div className="w-72 lg:w-80 xl:w-88 border-l border-border bg-muted/20 p-4 flex flex-col justify-between overflow-y-auto custom-scrollbar flex-shrink-0 animate-in slide-in-from-right-4">
                  <div className="space-y-4">
                    {/* Preview Image */}
                    <div className="aspect-4/3 w-full rounded-lg overflow-hidden border border-border bg-muted relative">
                      <img
                        src={selectedMedia.url}
                        alt={selectedMedia.originalName}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Renaming Box */}
                    <div className="space-y-1.5 bg-background/80 p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Edit2 className="h-3 w-3 text-primary" />
                          Asset Display Name
                        </label>
                        {!isEditingName && (
                          <button
                            type="button"
                            onClick={() => setIsEditingName(true)}
                            className="text-[11px] text-primary hover:underline font-semibold"
                          >
                            Edit Name
                          </button>
                        )}
                      </div>

                      {isEditingName ? (
                        <div className="space-y-2 mt-1">
                          <Input
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveRename();
                              }
                            }}
                            className="h-8 text-xs font-semibold"
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setNameInput(selectedMedia.originalName);
                                setIsEditingName(false);
                              }}
                              className="h-6 px-2 text-xs"
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleSaveRename}
                              disabled={updateMutation.isPending}
                              className="h-6 px-2.5 text-xs font-bold"
                            >
                              Save Name
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <h4
                          className="font-bold text-xs text-foreground break-all cursor-pointer hover:text-primary transition-colors"
                          onClick={() => setIsEditingName(true)}
                          title="Click to rename"
                        >
                          {selectedMedia.originalName}
                        </h4>
                      )}
                      <p className="text-[10px] text-muted-foreground font-mono truncate">
                        Key: {selectedMedia.fileName}
                      </p>
                    </div>

                    {/* Tags Manager Section */}
                    <div className="space-y-2 bg-background/80 p-3 rounded-lg border border-border">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                        <Tag className="h-3 w-3 text-primary" />
                        Asset Tags
                      </label>

                      {/* Current Tags Chips */}
                      <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                        {selectedMedia.tags && selectedMedia.tags.length > 0 ? (
                          selectedMedia.tags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-xs font-medium"
                            >
                              <span>#{t}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(t)}
                                className="hover:text-destructive p-0.5 rounded-full"
                                title={`Remove tag #${t}`}
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            No tags added yet.
                          </span>
                        )}
                      </div>

                      {/* Add Tag Input */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <Input
                          placeholder="Add new tag (e.g. covers)..."
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddTag(tagInput);
                            }
                          }}
                          className="h-7 text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddTag(tagInput)}
                          disabled={!tagInput.trim() || updateMutation.isPending}
                          className="h-7 px-2 text-xs font-semibold flex-shrink-0"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add</span>
                        </Button>
                      </div>

                      {/* Suggested Quick Tags */}
                      <div className="pt-1">
                        <span className="text-[10px] text-muted-foreground block mb-1">
                          Quick Suggestions:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {COMMON_TAG_SUGGESTIONS.filter(
                            (s) => !selectedMedia.tags?.includes(s)
                          ).slice(0, 6).map((suggest) => (
                            <button
                              key={suggest}
                              type="button"
                              onClick={() => handleAddTag(suggest)}
                              className="text-[10px] bg-muted hover:bg-primary/20 hover:text-primary px-1.5 py-0.5 rounded text-muted-foreground transition-colors font-mono"
                            >
                              +{suggest}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Metadata Specs */}
                    <div className="space-y-1.5 text-xs bg-background/80 p-3 rounded-lg border border-border">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Format:</span>
                        <span className="font-semibold uppercase text-primary">
                          {selectedMedia.mimeType.split("/")[1] || "webp"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dimensions:</span>
                        <span className="font-semibold">
                          {selectedMedia.width ? `${selectedMedia.width} × ${selectedMedia.height} px` : "Vector / Dynamic"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Compressed Size:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatBytes(selectedMedia.fileSize)}
                        </span>
                      </div>
                      {selectedMedia.originalSize && (
                        <div className="flex justify-between text-muted-foreground text-[11px]">
                          <span>Original Size:</span>
                          <span className="line-through">{formatBytes(selectedMedia.originalSize)}</span>
                        </div>
                      )}
                      {selectedMedia.savingsPercentage !== undefined && selectedMedia.savingsPercentage > 0 && (
                        <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold text-[11px] pt-1 border-t border-border">
                          <span>Space Saved:</span>
                          <span>{selectedMedia.savingsPercentage}% Reduction</span>
                        </div>
                      )}
                    </div>

                    {/* Issue Assignment & Multi-Issue Management */}
                    <div className="space-y-2.5 text-xs bg-background/80 p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                          <Layers className="h-3 w-3 text-primary" />
                          Assigned Editions:
                        </label>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {selectedMedia.issueIds?.length || (selectedMedia.issueId ? 1 : 0)} Edition(s)
                        </span>
                      </div>

                      {/* Badges of currently assigned issues */}
                      <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                        {selectedMedia.issues && selectedMedia.issues.length > 0 ? (
                          selectedMedia.issues.map((iss) => (
                            <span
                              key={iss.id}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border",
                                iss.id === parsedIssueId
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold"
                                  : "bg-muted text-foreground border-border"
                              )}
                              title={iss.title}
                            >
                              <span>{iss.issueNo}</span>
                              <button
                                type="button"
                                disabled={toggleIssueAssignmentMutation.isPending}
                                onClick={() =>
                                  toggleIssueAssignmentMutation.mutate({
                                    mediaId: selectedMedia.id,
                                    targetIssueId: iss.id,
                                    assigned: false,
                                  })
                                }
                                className="hover:text-destructive p-0.5 rounded"
                                title={`Unassign from ${iss.issueNo}`}
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          ))
                        ) : selectedMedia.issueId ? (
                          <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
                            Issue #{selectedMedia.issueId}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Not assigned to any edition
                          </span>
                        )}
                      </div>

                      {/* 1-Click Action for current edition context */}
                      {parsedIssueId && (
                        <div className="pt-2 border-t border-border flex flex-col gap-1.5">
                          {selectedMedia.issueIds?.includes(parsedIssueId) || selectedMedia.issueId === parsedIssueId ? (
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <Check className="h-3 w-3" />
                                Included in This Edition
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={toggleIssueAssignmentMutation.isPending}
                                onClick={() =>
                                  toggleIssueAssignmentMutation.mutate({
                                    mediaId: selectedMedia.id,
                                    targetIssueId: parsedIssueId,
                                    assigned: false,
                                  })
                                }
                                className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                                title="Remove from this edition gallery"
                              >
                                Remove
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={toggleIssueAssignmentMutation.isPending}
                              onClick={() =>
                                toggleIssueAssignmentMutation.mutate({
                                  mediaId: selectedMedia.id,
                                  targetIssueId: parsedIssueId,
                                  assigned: true,
                                })
                              }
                              className="h-7 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 gap-1.5"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Assign to Current Issue (#{parsedIssueId})</span>
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Dropdown / selector to assign to any other issue */}
                      {allIssues.length > 0 && (
                        <div className="pt-2 border-t border-border/60">
                          <label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                            Assign to another edition:
                          </label>
                          <select
                            className="w-full h-7 px-2 text-[11px] rounded border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                            value=""
                            disabled={toggleIssueAssignmentMutation.isPending}
                            onChange={(e) => {
                              const targetId = Number(e.target.value);
                              if (targetId && !isNaN(targetId)) {
                                toggleIssueAssignmentMutation.mutate({
                                  mediaId: selectedMedia.id,
                                  targetIssueId: targetId,
                                  assigned: true,
                                });
                              }
                            }}
                          >
                            <option value="" disabled>
                              + Select edition to assign...
                            </option>
                            {allIssues
                              .filter((iss) => !(selectedMedia.issueIds?.includes(iss.id) || selectedMedia.issueId === iss.id))
                              .map((iss) => (
                                <option key={iss.id} value={iss.id}>
                                  {iss.issueNo} — {iss.title}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Quick Link & Action Buttons */}
                    <div className="flex flex-col gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(window.location.origin + selectedMedia.url)}
                        className="h-8 text-xs gap-1.5 justify-start"
                      >
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Copy Public Link</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(selectedMedia.url, "_blank")}
                        className="h-8 text-xs gap-1.5 justify-start"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Open Original</span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${selectedMedia.originalName}" permanently from storage?`)) {
                            deleteMutation.mutate(selectedMedia.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="h-8 text-xs gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive justify-start"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Asset</span>
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleConfirmSelection}
                    className="w-full text-xs gap-1.5 font-bold mt-4 shadow-sm"
                  >
                    <Check className="h-4 w-4" />
                    <span>Insert Selected</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {data?.pagination && data.pagination.totalPages > 1 && (
              <div className="p-3 px-6 border-t border-border bg-background flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
                <span>
                  Showing page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.totalRecords} total items)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="h-7 px-2.5 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                    disabled={page >= data.pagination.totalPages}
                    className="h-7 px-2.5 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Upload Dropzone */}
        {activeTab === "upload" && (
          <div className="flex-1 p-8 flex flex-col items-center justify-center overflow-y-auto">
            <div className="w-full max-w-xl flex flex-col gap-4">
              {/* Target Edition(s) Picker for Upload */}
              <div className="bg-primary/10 p-3.5 rounded-2xl border border-primary/25 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-foreground">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span>Assign to Edition(s) on Upload</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {uploadIssueIds.length} selected
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Uploaded images will be assigned to all selected editions and automatically appear in their Public Photo Galleries.
                </p>

                {allIssues.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {allIssues.map((iss) => {
                      const isSelected = uploadIssueIds.includes(iss.id);
                      return (
                        <button
                          key={iss.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setUploadIssueIds(uploadIssueIds.filter((id) => id !== iss.id));
                            } else {
                              setUploadIssueIds([...uploadIssueIds, iss.id]);
                            }
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-[11px] font-mono border transition-all flex items-center gap-1.5",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm"
                              : "bg-background/80 text-muted-foreground border-border hover:border-primary/50"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                          <span>{iss.issueNo}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Optional Pre-Upload Tags */}
              <div className="bg-muted/30 p-4 rounded-2xl border border-border">
                <label className="text-xs font-bold text-foreground flex items-center gap-1 mb-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  Apply Tags on Upload (Optional)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {uploadTags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 bg-primary/15 text-primary px-2 py-0.5 rounded-full text-xs font-semibold"
                    >
                      <span>#{t}</span>
                      <button
                        type="button"
                        onClick={() => setUploadTags(uploadTags.filter((x) => x !== t))}
                        className="hover:text-destructive"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Type tag (e.g. covers, surgery) and press Enter..."
                    value={uploadTagInput}
                    onChange={(e) => setUploadTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const clean = uploadTagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
                        if (clean && !uploadTags.includes(clean)) {
                          setUploadTags([...uploadTags, clean]);
                          setUploadTagInput("");
                        }
                      }
                    }}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const clean = uploadTagInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
                      if (clean && !uploadTags.includes(clean)) {
                        setUploadTags([...uploadTags, clean]);
                        setUploadTagInput("");
                      }
                    }}
                    className="h-8 text-xs"
                  >
                    Add Tag
                  </Button>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200",
                  isDragging
                    ? "border-primary bg-primary/5 scale-102"
                    : "border-border hover:border-primary/50 bg-muted/10 hover:bg-muted/20"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/tiff,image/avif"
                  onChange={(e) => {
                    if (e.target.files) handleUploadFiles(e.target.files);
                  }}
                  className="hidden"
                />

                {isUploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="font-bold text-sm text-foreground">
                      Converting to WebP & calculating SHA-256 hash...
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Optimizing image size for lightning-fast magazine loading
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1 shadow-xs">
                      <Upload className="h-7 w-7" />
                    </div>
                    <h3 className="font-bold text-base text-foreground">
                      Drag & Drop image files here, or <span className="text-primary underline">browse</span>
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-md leading-relaxed">
                      Supports JPEG, PNG, WebP, GIF, SVG, TIFF, AVIF (up to 15MB each).
                      Files are automatically compressed to modern WebP with deduplication.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        Auto WebP Conversion
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                        <FileCheck className="h-3 w-3 text-emerald-500" />
                        SHA-256 Deduplication
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                        <HardDrive className="h-3 w-3 text-blue-500" />
                        MinIO Storage
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {uploadFeedback && (
              <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in-50">
                <FileCheck className="h-5 w-5 flex-shrink-0" />
                <div>
                  <span className="font-bold block">
                    Upload Complete ({uploadFeedback.successCount} new, {uploadFeedback.duplicateCount} deduplicated)
                  </span>
                  {uploadFeedback.savedBytes > 0 && (
                    <span className="text-[11px] opacity-85">
                      Saved {formatBytes(uploadFeedback.savedBytes)} with WebP compression
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveTab("library")}
                  className="ml-auto text-xs h-7"
                >
                  View in Library &rarr;
                </Button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Direct Web URL */}
        {activeTab === "url" && (
          <div className="flex-1 p-8 flex flex-col items-center justify-center overflow-y-auto">
            <div className="w-full max-w-md space-y-4 bg-muted/20 p-6 rounded-2xl border border-border">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Direct Image URL</label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Alt Description (Optional)</label>
                <Input
                  placeholder="Brief description of the image"
                  value={externalAlt}
                  onChange={(e) => setExternalAlt(e.target.value)}
                  className="text-xs"
                />
              </div>

              {externalUrl && (
                <div className="aspect-16/9 w-full rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center">
                  <img
                    src={externalUrl}
                    alt={externalAlt || "Preview"}
                    onError={() => toast.error("Unable to load preview from URL")}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              <Button
                type="button"
                onClick={handleInsertExternalUrl}
                disabled={!externalUrl.trim()}
                className="w-full text-xs font-bold gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Insert from URL</span>
              </Button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 px-6 border-t border-border bg-muted/40 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-muted-foreground">
            {selectedMedia ? (
              <span className="flex items-center gap-1.5">
                Selected: <strong className="text-foreground">{selectedMedia.originalName}</strong> ({formatBytes(selectedMedia.fileSize)})
              </span>
            ) : (
              <span>Select an image or upload new media</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
            {activeTab === "library" && (
              <Button
                type="button"
                size="sm"
                disabled={!selectedMedia}
                onClick={handleConfirmSelection}
                className="h-8 text-xs font-bold gap-1.5"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Insert Selected</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
