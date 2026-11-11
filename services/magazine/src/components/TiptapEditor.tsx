import * as React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CharacterCount from "@tiptap/extension-character-count";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Typography from "@tiptap/extension-typography";
import Youtube from "@tiptap/extension-youtube";
import FontFamily from "@tiptap/extension-font-family";

import { Callout, CalloutType } from "@/components/tiptap/callout-extension";
import { FontSize } from "@/components/tiptap/font-size-extension";
import { PageBreak } from "@/components/tiptap/page-break-extension";
import { MediaLibraryDialog } from "@/components/magazine/MediaLibraryDialog";

import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Code as CodeIcon,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Unlink,
  Image as ImageIcon,
  Table as TableIcon,
  Highlighter,
  Palette,
  Undo,
  Redo,
  Loader2,
  Maximize2,
  Minimize2,
  Code2,
  Eye,
  Edit3,
  Search,
  Replace,
  X,
  ChevronDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  FileText,
  Video,
  Copy,
  HelpCircle,
  Columns,
  Rows,
  Trash2,
  Plus,
  Type,
  RemoveFormatting,
  SeparatorHorizontal,
  BookOpen,
  ScrollText,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

interface TiptapEditorProps {
  content?: string | object;
  onChange?: (val: { html: string; json: any }) => void;
  placeholder?: string;
  issueId?: number | string;
  className?: string;
  minHeight?: string;
  defaultLayout?: "a4" | "stream";
}

const COLOR_PALETTE = [
  { label: "Default", color: "inherit" },
  { label: "Dark Slate", color: "#1e293b" },
  { label: "Gray", color: "#64748b" },
  { label: "Red", color: "#ef4444" },
  { label: "Rose", color: "#f43f5e" },
  { label: "Orange", color: "#f97316" },
  { label: "Amber", color: "#f59e0b" },
  { label: "Emerald", color: "#10b981" },
  { label: "Teal", color: "#14b8a6" },
  { label: "Cyan", color: "#06b6d4" },
  { label: "Blue", color: "#3b82f6" },
  { label: "Indigo", color: "#6366f1" },
  { label: "Purple", color: "#8b5cf6" },
  { label: "Fuchsia", color: "#d946ef" },
];

const HIGHLIGHT_PALETTE = [
  { label: "Yellow", color: "#fef08a" },
  { label: "Green", color: "#bbf7d0" },
  { label: "Blue", color: "#bfdbfe" },
  { label: "Pink", color: "#fbcfe8" },
  { label: "Orange", color: "#fed7aa" },
  { label: "Purple", color: "#e9d5ff" },
];

export interface FontCategory {
  category: string;
  fonts: { label: string; value: string; sample?: string }[];
}

const FONT_CATEGORIES: FontCategory[] = [
  {
    category: "Modern Sans-Serif",
    fonts: [
      { label: "Inter", value: "Inter, system-ui, -apple-system, sans-serif" },
      { label: "Plus Jakarta Sans", value: "'Plus Jakarta Sans', sans-serif" },
      { label: "Poppins", value: "'Poppins', sans-serif" },
      { label: "Outfit", value: "'Outfit', sans-serif" },
      { label: "Montserrat", value: "'Montserrat', sans-serif" },
      { label: "Geist Sans", value: "'Geist', system-ui, sans-serif" },
    ],
  },
  {
    category: "Editorial & Magazine Serifs",
    fonts: [
      { label: "Playfair Display", value: "'Playfair Display', Georgia, serif" },
      { label: "Lora", value: "'Lora', Georgia, serif" },
      { label: "Cinzel (Masthead)", value: "'Cinzel', Georgia, serif" },
      { label: "Merriweather", value: "'Merriweather', Georgia, serif" },
      { label: "EB Garamond", value: "'EB Garamond', Garamond, Georgia, serif" },
      { label: "Classic Georgia", value: "Georgia, Cambria, 'Times New Roman', serif" },
    ],
  },
  {
    category: "Monospace & Code",
    fonts: [
      { label: "JetBrains Mono", value: "'JetBrains Mono', monospace" },
      { label: "Fira Code", value: "'Fira Code', ui-monospace, monospace" },
      { label: "Courier New", value: "'Courier New', Courier, monospace" },
    ],
  },
  {
    category: "Display & Headlines",
    fonts: [
      { label: "Oswald", value: "'Oswald', sans-serif" },
      { label: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
    ],
  },
  {
    category: "Handwriting & Signatures",
    fonts: [
      { label: "Caveat", value: "'Caveat', cursive" },
      { label: "Dancing Script", value: "'Dancing Script', cursive" },
    ],
  },
];

const FONT_SIZES = [
  { label: "12px - Small", value: "12px" },
  { label: "14px - Regular", value: "14px" },
  { label: "16px - Base", value: "16px" },
  { label: "18px - Medium", value: "18px" },
  { label: "20px - Large", value: "20px" },
  { label: "24px - XL Title", value: "24px" },
  { label: "32px - Display", value: "32px" },
];

export function TiptapEditor({
  content,
  onChange,
  placeholder = "Write your content, article, or notes here...",
  issueId = "general",
  className,
  minHeight = "320px",
  defaultLayout = "a4",
}: TiptapEditorProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [editorMode, setEditorMode] = React.useState<"visual" | "html" | "preview">("visual");
  const [layoutMode, setLayoutMode] = React.useState<"a4" | "stream">(defaultLayout);
  const [htmlSource, setHtmlSource] = React.useState("");
  const [, setIsCopied] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [replaceTerm, setReplaceTerm] = React.useState("");
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const [isLinkOpen, setIsLinkOpen] = React.useState(false);
  const [linkUrl, setLinkUrl] = React.useState("");
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState("");
  const [imageAlt, setImageAlt] = React.useState("");
  const [isYoutubeOpen, setIsYoutubeOpen] = React.useState(false);
  const [youtubeUrl, setYoutubeUrl] = React.useState("");
  const [customColor, setCustomColor] = React.useState("#000000");
  const [bubbleMenuPos, setBubbleMenuPos] = React.useState<{ top: number; left: number } | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Underline,
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      Typography,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Callout,
      PageBreak,
      Image.configure({
        allowBase64: true,
        inline: false,
      }),
      Youtube.configure({
        inline: false,
        allowFullscreen: true,
        width: 640,
        height: 360,
        HTMLAttributes: {
          allowfullscreen: "true",
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline font-medium hover:opacity-80 cursor-pointer",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse table-auto w-full my-4 border border-border",
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: "border border-border bg-muted p-2 font-bold text-left text-foreground",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-border p-2 text-left text-foreground",
        },
      }),
      CharacterCount,
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const json = editor.getJSON();
      setHtmlSource(html);
      if (onChange) {
        onChange({ html, json });
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert max-w-none focus:outline-none p-5 font-serif text-[1.05rem] leading-relaxed text-foreground min-h-[inherit]",
      },
    },
  });

  // Keep editor content in sync if content changes externally
  React.useEffect(() => {
    if (!editor) return;
    if (typeof content === "string" && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
      setHtmlSource(content || "");
    } else if (typeof content === "object" && content !== null) {
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson = JSON.stringify(content);
      if (currentJson !== newJson) {
        editor.commands.setContent(content as any);
        setHtmlSource(editor.getHTML());
      }
    }
  }, [content, editor]);

  // Handle Floating Bubble Menu positioning on selection
  React.useEffect(() => {
    if (!editor) return;

    const updateBubbleMenu = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || from === to || editorMode !== "visual") {
        setBubbleMenuPos(null);
        return;
      }

      const { view } = editor;
      const { from: selFrom, to: selTo } = view.state.selection;
      const start = view.coordsAtPos(selFrom);
      const end = view.coordsAtPos(selTo);

      const left = (start.left + end.right) / 2;
      const top = Math.max(10, start.top - 48);

      setBubbleMenuPos({ top, left });
    };

    editor.on("selectionUpdate", updateBubbleMenu);
    editor.on("blur", () => {
      setTimeout(() => {
        if (!editor.isFocused) setBubbleMenuPos(null);
      }, 200);
    });

    return () => {
      editor.off("selectionUpdate", updateBubbleMenu);
    };
  }, [editor, editorMode]);

  // Handle Fullscreen Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && !showSearch) {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, showSearch]);

  const handleSelectMediaImage = (media: {
    url: string;
    alt?: string;
    title?: string;
    width?: number | null;
    height?: number | null;
  }) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setImage({
        src: media.url,
        alt: media.alt || media.title || undefined,
        title: media.title || undefined,
      })
      .run();
    toast.success("Image inserted into article");
  };

  const handleInsertYoutube = () => {
    if (!editor || !youtubeUrl.trim()) return;
    (editor.chain().focus() as any).setYoutubeVideo({ src: youtubeUrl.trim() }).run();
    setYoutubeUrl("");
    setIsYoutubeOpen(false);
    toast.success("YouTube video embedded");
  };

  const handleOpenLinkModal = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href || "";
    setLinkUrl(previousUrl);
    setIsLinkOpen(true);
  };

  const handleSaveLink = () => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setIsLinkOpen(false);
      return;
    }
    const formattedUrl = /^https?:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: formattedUrl }).run();
    setIsLinkOpen(false);
  };

  const handleApplyHtmlSource = () => {
    if (!editor) return;
    editor.commands.setContent(htmlSource);
    setEditorMode("visual");
    toast.success("Visual editor updated with HTML source");
  };

  const handleCopy = (type: "html" | "text") => {
    if (!editor) return;
    const textToCopy = type === "html" ? editor.getHTML() : editor.getText();
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    toast.success(type === "html" ? "HTML copied to clipboard" : "Plain text copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSearchReplace = (replaceAll = false) => {
    if (!editor || !searchTerm) return;
    const html = editor.getHTML();
    if (replaceAll) {
      const regex = new RegExp(searchTerm, "gi");
      const updated = html.replace(regex, replaceTerm);
      editor.commands.setContent(updated);
      toast.success("All matches replaced");
    } else {
      const regex = new RegExp(searchTerm, "i");
      const updated = html.replace(regex, replaceTerm);
      editor.commands.setContent(updated);
      toast.success("Match replaced");
    }
  };

  const toggleCalloutType = (type: CalloutType) => {
    if (!editor) return;
    (editor.chain().focus() as any).toggleCallout({ type }).run();
  };

  if (!editor) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const wordCount = editor.storage.characterCount?.words() ?? 0;
  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));
  const isTableActive = editor.isActive("table");

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card shadow-sm transition-all duration-200 flex flex-col",
        isFullscreen ? "fixed inset-0 z-50 rounded-none border-0 h-screen w-screen overflow-hidden" : "",
        className
      )}
    >
      {/* Top Header Controls: Status, Mode, Stats, Utilities */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
        {/* Editor Mode Tabs */}
        <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => {
              if (editorMode === "html") handleApplyHtmlSource();
              setEditorMode("visual");
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors",
              editorMode === "visual" ? "bg-primary text-primary-foreground shadow-xs" : "hover:text-foreground"
            )}
          >
            <Edit3 className="h-3.5 w-3.5" />
            <span>Visual</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setHtmlSource(editor.getHTML());
              setEditorMode("html");
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors",
              editorMode === "html" ? "bg-primary text-primary-foreground shadow-xs" : "hover:text-foreground"
            )}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Source HTML</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (editorMode === "html") handleApplyHtmlSource();
              setEditorMode("preview");
            }}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors",
              editorMode === "preview" ? "bg-primary text-primary-foreground shadow-xs" : "hover:text-foreground"
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview</span>
          </button>
        </div>

        {/* A4 Sheet vs Continuous Stream Switcher (Active in Visual Mode) */}
        {editorMode === "visual" && (
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border text-xs">
            <button
              type="button"
              onClick={() => setLayoutMode("a4")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all",
                layoutMode === "a4"
                  ? "bg-background text-primary shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="A4 Magazine Sheet WYSIWYG (Matches Flipbook Page Ratio)"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>A4 Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode("stream")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all",
                layoutMode === "stream"
                  ? "bg-background text-primary shadow-xs border border-border/80"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Continuous Stream Mode"
            >
              <ScrollText className="h-3.5 w-3.5" />
              <span>Stream</span>
            </button>
          </div>
        )}

        {/* Live Word Count & Metrics */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-medium text-muted-foreground">
            <span className="bg-background/80 px-2 py-0.5 rounded border border-border">
              <strong className="text-foreground">{wordCount}</strong> words
            </span>
            <span className="bg-background/80 px-2 py-0.5 rounded border border-border">
              <strong className="text-foreground">{charCount}</strong> chars
            </span>
            <span className="bg-background/80 px-2 py-0.5 rounded border border-border">
              ~<strong className="text-foreground">{readingTimeMin}</strong> min read
            </span>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
              className={cn("h-7 px-2 text-xs gap-1", showSearch && "bg-accent text-accent-foreground")}
              title="Find & Replace (Ctrl+F)"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Find</span>
            </Button>

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                  <Copy className="h-3.5 w-3.5" />
                  <span className="hidden md:inline">Export</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[150px] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md text-xs animate-in fade-in-80"
                  sideOffset={4}
                >
                  <DropdownMenu.Item
                    onClick={() => handleCopy("html")}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded hover:bg-accent hover:text-accent-foreground outline-none"
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    <span>Copy HTML</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => handleCopy("text")}
                    className="flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded hover:bg-accent hover:text-accent-foreground outline-none"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Copy Clean Text</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsHelpOpen(true)}
              className="h-7 w-7 p-0"
              title="Editor Shortcuts & Guide"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-7 w-7 p-0"
              title={isFullscreen ? "Exit Zen Fullscreen (Esc)" : "Zen Fullscreen Mode"}
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Find & Replace Bar (Collapsible) */}
      {showSearch && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-3 py-2 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Find in document..."
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <Replace className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={replaceTerm}
              onChange={(e) => setReplaceTerm(e.target.value)}
              placeholder="Replace with..."
              className="h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSearchReplace(false)}
              className="h-7 px-2 text-xs"
              disabled={!searchTerm}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleSearchReplace(true)}
              className="h-7 px-2 text-xs"
              disabled={!searchTerm}
            >
              Replace All
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSearch(false)}
              className="h-7 w-7 p-0 ml-1"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Primary Rich Formatting Ribbon (Active in Visual Mode) */}
      {editorMode === "visual" && (
        <div className="flex flex-wrap items-center gap-1 border-b border-border bg-card p-1.5 select-none">
          {/* History: Undo / Redo */}
          <div className="flex items-center gap-0.5 pr-1 border-r border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="h-8 w-8 p-0"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="h-8 w-8 p-0"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          {/* Heading & Block Type Dropdown */}
          <div className="px-1 border-r border-border">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs font-semibold gap-1 text-foreground"
                >
                  <span>
                    {editor.isActive("heading", { level: 1 })
                      ? "Heading 1"
                      : editor.isActive("heading", { level: 2 })
                      ? "Heading 2"
                      : editor.isActive("heading", { level: 3 })
                      ? "Heading 3"
                      : editor.isActive("heading", { level: 4 })
                      ? "Heading 4"
                      : editor.isActive("blockquote")
                      ? "Quote"
                      : editor.isActive("codeBlock")
                      ? "Code Block"
                      : editor.isActive("callout")
                      ? "Callout Box"
                      : "Paragraph"}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[180px] rounded-lg border border-border bg-popover p-1 shadow-lg text-popover-foreground text-xs"
                  sideOffset={4}
                >
                  <DropdownMenu.Item
                    onClick={() => editor.chain().focus().setParagraph().run()}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none",
                      editor.isActive("paragraph") && "font-bold bg-accent/50"
                    )}
                  >
                    <Pilcrow className="h-4 w-4" />
                    <span>Normal Text</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none",
                      editor.isActive("heading", { level: 1 }) && "font-bold bg-accent/50"
                    )}
                  >
                    <Heading1 className="h-4 w-4" />
                    <span className="text-base font-extrabold">Heading 1</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none",
                      editor.isActive("heading", { level: 2 }) && "font-bold bg-accent/50"
                    )}
                  >
                    <Heading2 className="h-4 w-4" />
                    <span className="text-sm font-bold">Heading 2</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none",
                      editor.isActive("heading", { level: 3 }) && "font-bold bg-accent/50"
                    )}
                  >
                    <Heading3 className="h-4 w-4" />
                    <span className="font-semibold">Heading 3</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none",
                      editor.isActive("heading", { level: 4 }) && "font-bold bg-accent/50"
                    )}
                  >
                    <Heading4 className="h-4 w-4" />
                    <span>Heading 4</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-border my-1" />
                  <DropdownMenu.Item
                    onClick={() => editor.chain().focus().toggleBlockquote().run()}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none"
                  >
                    <Quote className="h-4 w-4" />
                    <span>Blockquote / Pull Quote</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none"
                  >
                    <CodeIcon className="h-4 w-4" />
                    <span>Code Block</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>

          {/* Font Family Dropdown */}
          <div className="px-1 border-r border-border">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs font-medium gap-1 text-foreground"
                  title="Font Family"
                >
                  <Type className="h-3.5 w-3.5 opacity-70" />
                  <span className="hidden sm:inline">Font</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[210px] max-h-[360px] overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg text-popover-foreground text-xs custom-scrollbar"
                  sideOffset={4}
                >
                  <DropdownMenu.Item
                    onClick={() => (editor.chain().focus() as any).unsetFontFamily().run()}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent text-muted-foreground outline-none mb-1"
                  >
                    <span className="font-sans">Default Editor Font</span>
                    <span className="text-[10px] text-muted-foreground">Reset</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="h-px bg-border my-1" />

                  {FONT_CATEGORIES.map((cat, cIdx) => (
                    <div key={cat.category}>
                      {cIdx > 0 && <DropdownMenu.Separator className="h-px bg-border my-1" />}
                      <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                        {cat.category}
                      </div>
                      {cat.fonts.map((font) => (
                        <DropdownMenu.Item
                          key={font.label}
                          onClick={() => (editor.chain().focus() as any).setFontFamily(font.value).run()}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none"
                          style={{ fontFamily: font.value }}
                        >
                          <span className="text-[13px]">{font.label}</span>
                          <span className="text-[10px] opacity-60 font-mono">Aa</span>
                        </DropdownMenu.Item>
                      ))}
                    </div>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>

          {/* Font Size Dropdown */}
          <div className="px-1 border-r border-border">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs font-medium gap-1 text-foreground"
                  title="Font Size"
                >
                  <span className="hidden sm:inline">Size</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[130px] rounded-lg border border-border bg-popover p-1 shadow-lg text-popover-foreground text-xs"
                  sideOffset={4}
                >
                  {FONT_SIZES.map((size) => (
                    <DropdownMenu.Item
                      key={size.value}
                      onClick={() => (editor.chain().focus() as any).setFontSize(size.value).run()}
                      className="flex items-center px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none"
                    >
                      <span>{size.label}</span>
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Separator className="h-px bg-border my-1" />
                  <DropdownMenu.Item
                    onClick={() => (editor.chain().focus() as any).unsetFontSize().run()}
                    className="flex items-center px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent text-muted-foreground outline-none"
                  >
                    <span>Default Size</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>

          {/* Inline Text Formatting: Bold, Italic, Underline, Strike, Sub, Super, Code */}
          <div className="flex items-center gap-0.5 px-1 border-r border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("bold") && "bg-accent text-accent-foreground font-bold")}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("italic") && "bg-accent text-accent-foreground font-bold")}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("underline") && "bg-accent text-accent-foreground font-bold")}
              title="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("strike") && "bg-accent text-accent-foreground font-bold")}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleSubscript().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("subscript") && "bg-accent text-accent-foreground font-bold")}
              title="Subscript (X₂)"
            >
              <SubscriptIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleSuperscript().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("superscript") && "bg-accent text-accent-foreground font-bold")}
              title="Superscript (X²)"
            >
              <SuperscriptIcon className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("code") && "bg-accent text-accent-foreground font-bold")}
              title="Inline Code"
            >
              <CodeIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Color & Highlighter Popovers */}
          <div className="flex items-center gap-0.5 px-1 border-r border-border">
            {/* Text Color Picker */}
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Text Color">
                  <Palette className="h-4 w-4 text-primary" />
                </Button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="z-50 w-64 rounded-xl border border-border bg-popover p-3 shadow-xl text-popover-foreground animate-in fade-in-50"
                  sideOffset={6}
                >
                  <p className="text-xs font-semibold mb-2 text-foreground">Text Color</p>
                  <div className="grid grid-cols-7 gap-1.5 mb-3">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => editor.chain().focus().setColor(c.color).run()}
                        className="h-6 w-6 rounded-md border border-border/80 flex items-center justify-center hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.color === "inherit" ? "#ffffff" : c.color }}
                        title={c.label}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        editor.chain().focus().setColor(e.target.value).run();
                      }}
                      className="h-7 w-8 cursor-pointer rounded border border-border bg-transparent p-0"
                    />
                    <Input
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        editor.chain().focus().setColor(e.target.value).run();
                      }}
                      placeholder="#hex"
                      className="h-7 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editor.chain().focus().unsetColor().run()}
                      className="h-7 text-xs px-2"
                    >
                      Reset
                    </Button>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            {/* Highlighter Picker */}
            <Popover.Root>
              <Popover.Trigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 w-8 p-0",
                    editor.isActive("highlight") && "bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold"
                  )}
                  title="Highlight Color"
                >
                  <Highlighter className="h-4 w-4" />
                </Button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="z-50 w-52 rounded-xl border border-border bg-popover p-3 shadow-xl text-popover-foreground animate-in fade-in-50"
                  sideOffset={6}
                >
                  <p className="text-xs font-semibold mb-2 text-foreground">Highlight Marker</p>
                  <div className="grid grid-cols-6 gap-1.5 mb-2">
                    {HIGHLIGHT_PALETTE.map((h) => (
                      <button
                        key={h.label}
                        type="button"
                        onClick={() => editor.chain().focus().toggleHighlight({ color: h.color }).run()}
                        className="h-6 w-6 rounded-md border border-border/80 hover:scale-110 transition-transform"
                        style={{ backgroundColor: h.color }}
                        title={h.label}
                      />
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editor.chain().focus().unsetHighlight().run()}
                    className="w-full h-7 text-xs mt-1"
                  >
                    Clear Highlight
                  </Button>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              title="Clear All Formatting"
            >
              <RemoveFormatting className="h-4 w-4" />
            </Button>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-0.5 px-1 border-r border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("left").run()}
              className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: "left" }) && "bg-accent text-accent-foreground font-bold")}
              title="Align Left"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("center").run()}
              className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: "center" }) && "bg-accent text-accent-foreground font-bold")}
              title="Align Center"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("right").run()}
              className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: "right" }) && "bg-accent text-accent-foreground font-bold")}
              title="Align Right"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setTextAlign("justify").run()}
              className={cn("h-8 w-8 p-0", editor.isActive({ textAlign: "justify" }) && "bg-accent text-accent-foreground font-bold")}
              title="Justify"
            >
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>

          {/* Lists: Bullet, Ordered, Task List */}
          <div className="flex items-center gap-0.5 px-1 border-r border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("bulletList") && "bg-accent text-accent-foreground font-bold")}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("orderedList") && "bg-accent text-accent-foreground font-bold")}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              className={cn("h-8 w-8 p-0", editor.isActive("taskList") && "bg-accent text-accent-foreground font-bold")}
              title="Interactive Task List"
            >
              <ListTodo className="h-4 w-4" />
            </Button>
          </div>

          {/* Callout Notice Boxes Dropdown */}
          <div className="px-1 border-r border-border">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 px-2 text-xs gap-1 font-medium", editor.isActive("callout") && "bg-accent text-accent-foreground")}
                  title="Insert Callout Banner"
                >
                  <Info className="h-3.5 w-3.5 text-blue-500" />
                  <span className="hidden lg:inline">Callout</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-lg text-popover-foreground text-xs"
                  sideOffset={4}
                >
                  <DropdownMenu.Item
                    onClick={() => toggleCalloutType("info")}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 outline-none font-medium"
                  >
                    <Info className="h-4 w-4" />
                    <span>Info Box</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => toggleCalloutType("success")}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 outline-none font-medium"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Success / Tip Box</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => toggleCalloutType("warning")}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400 outline-none font-medium"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <span>Warning Box</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => toggleCalloutType("danger")}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 outline-none font-medium"
                  >
                    <AlertOctagon className="h-4 w-4" />
                    <span>Danger Box</span>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    onClick={() => toggleCalloutType("note")}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 text-slate-600 dark:text-slate-400 outline-none font-medium"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Note Box</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>

          {/* Inserts: Links, Media, Tables, Video, Divider */}
          <div className="flex items-center gap-0.5 pl-1">
            {/* Link */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenLinkModal}
              className={cn("h-8 w-8 p-0", editor.isActive("link") && "bg-accent text-accent-foreground font-bold")}
              title="Insert / Edit Link (Ctrl+K)"
            >
              <LinkIcon className="h-4 w-4" />
            </Button>
            {editor.isActive("link") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => editor.chain().focus().unsetLink().run()}
                className="h-8 w-8 p-0 text-destructive"
                title="Remove Link"
              >
                <Unlink className="h-4 w-4" />
              </Button>
            )}

            {/* Image Button -> Opens Media Library */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsImageModalOpen(true)}
              className="h-8 px-2 flex items-center gap-1.5 text-xs font-semibold text-foreground hover:bg-accent"
              title="Insert Image (Browse WebP Media Library)"
            >
              <ImageIcon className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Media</span>
            </Button>

            {/* Video / YouTube Embed */}
            <Popover.Root open={isYoutubeOpen} onOpenChange={setIsYoutubeOpen}>
              <Popover.Trigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Embed YouTube Video">
                  <Video className="h-4 w-4 text-red-500" />
                </Button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="z-50 w-80 rounded-xl border border-border bg-popover p-4 shadow-xl text-popover-foreground animate-in fade-in-50"
                  sideOffset={6}
                >
                  <p className="text-sm font-semibold mb-2">Embed YouTube Video</p>
                  <div className="space-y-2">
                    <Input
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleInsertYoutube}
                      disabled={!youtubeUrl.trim()}
                      className="w-full h-8 text-xs font-semibold"
                    >
                      Embed Video
                    </Button>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            {/* Table Menu & Grid Inserter */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 w-8 p-0", isTableActive && "bg-accent text-accent-foreground font-bold")}
                  title="Table Tools"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[200px] rounded-lg border border-border bg-popover p-1 shadow-lg text-popover-foreground text-xs"
                  sideOffset={4}
                >
                  {!isTableActive ? (
                    <>
                      <DropdownMenu.Item
                        onClick={() =>
                          editor
                            .chain()
                            .focus()
                            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                            .run()
                        }
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent outline-none font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Insert 3x3 Table</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() =>
                          editor
                            .chain()
                            .focus()
                            .insertTable({ rows: 4, cols: 4, withHeaderRow: true })
                            .run()
                        }
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent outline-none font-medium"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Insert 4x4 Table</span>
                      </DropdownMenu.Item>
                    </>
                  ) : (
                    <>
                      <DropdownMenu.Label className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Columns
                      </DropdownMenu.Label>
                      <DropdownMenu.Item
                        onClick={() => editor.chain().focus().addColumnBefore().run()}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent outline-none"
                      >
                        <Columns className="h-3.5 w-3.5" />
                        <span>Add Column Left</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => editor.chain().focus().addColumnAfter().run()}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent outline-none"
                      >
                        <Columns className="h-3.5 w-3.5" />
                        <span>Add Column Right</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => editor.chain().focus().deleteColumn().run()}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-destructive/10 text-destructive outline-none"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Column</span>
                      </DropdownMenu.Item>

                      <DropdownMenu.Separator className="h-px bg-border my-1" />
                      <DropdownMenu.Label className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Rows
                      </DropdownMenu.Label>
                      <DropdownMenu.Item
                        onClick={() => editor.chain().focus().addRowBefore().run()}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent outline-none"
                      >
                        <Rows className="h-3.5 w-3.5" />
                        <span>Add Row Above</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => editor.chain().focus().addRowAfter().run()}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent outline-none"
                      >
                        <Rows className="h-3.5 w-3.5" />
                        <span>Add Row Below</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => editor.chain().focus().deleteRow().run()}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-destructive/10 text-destructive outline-none"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Row</span>
                      </DropdownMenu.Item>

                      <DropdownMenu.Separator className="h-px bg-border my-1" />
                      <DropdownMenu.Item
                        onClick={() => editor.chain().focus().mergeOrSplit().run()}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent outline-none"
                      >
                        <span>Merge / Split Cells</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => editor.chain().focus().toggleHeaderRow().run()}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-accent outline-none"
                      >
                        <span>Toggle Header Row</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => editor.chain().focus().deleteTable().run()}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer hover:bg-destructive/10 text-destructive outline-none font-semibold"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete Entire Table</span>
                      </DropdownMenu.Item>
                    </>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Horizontal Divider */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              className="h-8 w-8 p-0"
              title="Horizontal Rule Line"
            >
              <Minus className="h-4 w-4" />
            </Button>

            {/* Page Break Inserter */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => (editor.chain().focus() as any).setPageBreak().run()}
              className="h-8 px-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
              title="Insert Page Break (Ctrl+Enter / Mod+Enter)"
            >
              <SeparatorHorizontal className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Page Break</span>
            </Button>
          </div>
        </div>
      )}

      {/* Contextual Table Bar (Displays automatically whenever table is focused) */}
      {editorMode === "visual" && isTableActive && (
        <div className="flex flex-wrap items-center gap-1 bg-primary/5 px-3 py-1.5 border-b border-primary/20 text-xs animate-in fade-in">
          <span className="font-semibold text-primary flex items-center gap-1 mr-2">
            <TableIcon className="h-3.5 w-3.5" /> Table Controls:
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().addColumnBefore().run()}
            className="h-6 px-2 text-[11px]"
          >
            + Col Left
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="h-6 px-2 text-[11px]"
          >
            + Col Right
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10"
          >
            Del Col
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().addRowBefore().run()}
            className="h-6 px-2 text-[11px]"
          >
            + Row Above
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="h-6 px-2 text-[11px]"
          >
            + Row Below
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10"
          >
            Del Row
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().mergeOrSplit().run()}
            className="h-6 px-2 text-[11px]"
          >
            Merge/Split
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeaderRow().run()}
            className="h-6 px-2 text-[11px]"
          >
            Header Row
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="h-6 px-2 text-[11px] text-destructive hover:bg-destructive/10 ml-auto"
          >
            Delete Table
          </Button>
        </div>
      )}

      {/* Floating Selection Bubble Menu (Pops up directly over selected text) */}
      {bubbleMenuPos && editor && editorMode === "visual" && (
        <div
          className="fixed z-50 -translate-x-1/2 flex items-center gap-0.5 rounded-lg border border-border bg-popover/95 backdrop-blur-md p-1 shadow-2xl text-popover-foreground animate-in fade-in zoom-in-95"
          style={{ top: `${bubbleMenuPos.top}px`, left: `${bubbleMenuPos.left}px` }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("h-7 w-7 p-0", editor.isActive("bold") && "bg-accent text-accent-foreground font-bold")}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("h-7 w-7 p-0", editor.isActive("italic") && "bg-accent text-accent-foreground font-bold")}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn("h-7 w-7 p-0", editor.isActive("underline") && "bg-accent text-accent-foreground font-bold")}
            title="Underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn("h-7 w-7 p-0", editor.isActive("strike") && "bg-accent text-accent-foreground font-bold")}
            title="Strike"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={cn(
              "h-7 w-7 p-0",
              editor.isActive("highlight") && "bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold"
            )}
            title="Highlight"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleOpenLinkModal}
            className={cn("h-7 w-7 p-0", editor.isActive("link") && "bg-accent text-accent-foreground font-bold")}
            title="Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              "h-7 w-7 p-0 font-bold text-xs",
              editor.isActive("heading", { level: 2 }) && "bg-accent text-accent-foreground"
            )}
            title="H2"
          >
            H2
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsImageModalOpen(true)}
            className="h-7 w-7 p-0"
            title="Insert Media Image"
          >
            <ImageIcon className="h-3.5 w-3.5 text-primary" />
          </Button>
        </div>
      )}

      {/* Editor Content Area */}
      <div
        className={cn(
          "relative flex-1 overflow-y-auto bg-card custom-scrollbar",
          isFullscreen ? "max-h-[calc(100vh-80px)]" : ""
        )}
        style={{ minHeight: isFullscreen ? "calc(100vh - 90px)" : minHeight }}
      >
        {editorMode === "visual" && (
          layoutMode === "a4" ? (
            <div className="tiptap-a4-canvas">
              <div className="tiptap-a4-page-frame">
                <div className="tiptap-a4-header-guide">
                  <span>A4 Magazine Page Sheet &bull; WYSIWYG</span>
                  <span>210mm &times; 297mm &bull; 1.414 ratio</span>
                </div>
                <div className="flex-1">
                  <EditorContent editor={editor} />
                </div>
                <div className="tiptap-a4-footer-guide">
                  <span>Use "Page Break" button or Ctrl+Enter for explicit page turns</span>
                  <span>A4 Flipbook Layout</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <EditorContent editor={editor} />
            </div>
          )
        )}

        {editorMode === "html" && (
          <div className="p-4 h-full flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground">Raw HTML Source Code</p>
              <Button type="button" size="sm" onClick={handleApplyHtmlSource} className="h-7 text-xs font-semibold">
                Apply HTML to Visual Editor
              </Button>
            </div>
            <textarea
              value={htmlSource}
              onChange={(e) => setHtmlSource(e.target.value)}
              className="w-full flex-1 min-h-[350px] p-4 font-mono text-xs bg-muted/40 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              placeholder="<p>Write raw HTML here...</p>"
              spellCheck={false}
            />
          </div>
        )}

        {editorMode === "preview" && (
          <div className="p-8 prose dark:prose-invert max-w-none font-serif leading-relaxed text-foreground">
            <div dangerouslySetInnerHTML={{ __html: editor.getHTML() }} />
          </div>
        )}
      </div>

      {/* Link Insertion Modal Dialog */}
      <Dialog.Root open={isLinkOpen} onOpenChange={setIsLinkOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs animate-in fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-base font-bold text-foreground flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-primary" />
                <span>Insert or Edit Link</span>
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Web Address (URL)</label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveLink();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {editor.isActive("link") && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      editor.chain().focus().unsetLink().run();
                      setIsLinkOpen(false);
                    }}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    Remove Link
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setIsLinkOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveLink} className="font-semibold">
                  Save Link
                </Button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Keyboard Shortcuts & Help Modal */}
      <Dialog.Root open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs animate-in fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-base font-bold text-foreground flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                <span>Editor Keyboard Shortcuts</span>
              </Dialog.Title>
              <Dialog.Close asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </Dialog.Close>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                <span>Bold</span>
                <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px]">Ctrl+B</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                <span>Italic</span>
                <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px]">Ctrl+I</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                <span>Underline</span>
                <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px]">Ctrl+U</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                <span>Strikethrough</span>
                <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px]">Ctrl+Shift+X</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                <span>Heading 1 / 2 / 3</span>
                <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px]">Ctrl+Alt+1/2/3</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                <span>Bullet List</span>
                <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px]">Ctrl+Shift+8</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                <span>Numbered List</span>
                <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px]">Ctrl+Shift+7</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                <span>Quote</span>
                <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px]">Ctrl+Shift+B</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                <span>Insert Link</span>
                <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px]">Ctrl+K</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                <span>Find & Replace</span>
                <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px]">Ctrl+F</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                <span>Undo / Redo</span>
                <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px]">Ctrl+Z / Ctrl+Y</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10 border border-primary/30 text-primary font-semibold">
                <span>Insert Page Break</span>
                <kbd className="px-2 py-0.5 rounded bg-background border border-primary/40 font-mono text-[11px]">Ctrl+Enter</kbd>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border">
                <span>Exit Fullscreen</span>
                <kbd className="px-2 py-0.5 rounded bg-background border border-border font-mono text-[11px]">Escape</kbd>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Magazine Media Library Dialog */}
      <MediaLibraryDialog
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSelectImage={handleSelectMediaImage}
        issueId={issueId}
        title="Insert Article Media"
      />
    </div>
  );
}
