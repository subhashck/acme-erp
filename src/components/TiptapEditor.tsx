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
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
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
  Undo,
  Redo,
  Loader2,
} from "lucide-react";
import { Button } from "@/ui/button";
import { cn } from "@/utils/cn";
import { toast } from "sonner";

interface TiptapEditorProps {
  content?: string | object;
  onChange?: (val: { html: string; json: any }) => void;
  placeholder?: string;
  issueId?: number | string;
  className?: string;
}

export function TiptapEditor({
  content,
  onChange,
  placeholder = "Write your magazine article or story here...",
  issueId = "general",
  className,
}: TiptapEditorProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3, 4],
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Image.configure({
        allowBase64: true,
        inline: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline font-medium hover:opacity-80",
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
    ],
    content: content || "",
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange({
          html: editor.getHTML(),
          json: editor.getJSON(),
        });
      }
    },
    editorProps: {
      attributes: {
        class:
          "prose dark:prose-invert max-w-none focus:outline-none min-h-[280px] p-4 font-serif text-[1.05rem] leading-relaxed text-foreground",
      },
    },
  });

  // Keep editor content in sync if content changes externally
  React.useEffect(() => {
    if (!editor) return;
    if (typeof content === "string" && content !== editor.getHTML()) {
      editor.commands.setContent(content || "");
    } else if (typeof content === "object" && content !== null) {
      const currentJson = JSON.stringify(editor.getJSON());
      const newJson = JSON.stringify(content);
      if (currentJson !== newJson) {
        editor.commands.setContent(content as any);
      }
    }
  }, [content, editor]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("issueId", String(issueId));

    try {
      const res = await fetch("/api/magazine/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to upload image");
      }

      const data = await res.json();
      editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
      toast.success("Image uploaded and inserted into article");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter URL:", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  if (!editor) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-border bg-muted/40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card shadow-sm overflow-hidden", className)}>
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-2">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 pr-1 border-r border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-8 w-8 p-0"
            title="Undo"
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
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {/* Headings */}
        <div className="flex items-center gap-0.5 px-1 border-r border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn("h-8 w-8 p-0", editor.isActive("heading", { level: 2 }) && "bg-accent text-accent-foreground font-bold")}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn("h-8 w-8 p-0", editor.isActive("heading", { level: 3 }) && "bg-accent text-accent-foreground font-bold")}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
            className={cn("h-8 w-8 p-0", editor.isActive("heading", { level: 4 }) && "bg-accent text-accent-foreground font-bold")}
            title="Heading 4"
          >
            <Heading4 className="h-4 w-4" />
          </Button>
        </div>

        {/* Text formatting */}
        <div className="flex items-center gap-0.5 px-1 border-r border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("h-8 w-8 p-0", editor.isActive("bold") && "bg-accent text-accent-foreground font-bold")}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("h-8 w-8 p-0", editor.isActive("italic") && "bg-accent text-accent-foreground font-bold")}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn("h-8 w-8 p-0", editor.isActive("underline") && "bg-accent text-accent-foreground font-bold")}
            title="Underline"
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
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={cn("h-8 w-8 p-0", editor.isActive("highlight") && "bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold")}
            title="Highlight"
          >
            <Highlighter className="h-4 w-4" />
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

        {/* Lists & Quotes */}
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
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn("h-8 w-8 p-0", editor.isActive("blockquote") && "bg-accent text-accent-foreground font-bold")}
            title="Blockquote / Pull Quote"
          >
            <Quote className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="h-8 w-8 p-0"
            title="Horizontal Divider"
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>

        {/* Links, Images, Tables */}
        <div className="flex items-center gap-0.5 pl-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={setLink}
            className={cn("h-8 w-8 p-0", editor.isActive("link") && "bg-accent text-accent-foreground font-bold")}
            title="Insert Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          {editor.isActive("link") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().unsetLink().run()}
              className="h-8 w-8 p-0"
              title="Remove Link"
            >
              <Unlink className="h-4 w-4" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="h-8 px-2 flex items-center gap-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-accent border border-border"
            title="Upload and Insert Image"
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <ImageIcon className="h-4 w-4 text-primary" />
            )}
            <span>Add Image</span>
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
            className="hidden"
          />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            className="h-8 w-8 p-0"
            title="Insert Table"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor Main Content Area */}
      <div className="bg-card">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
