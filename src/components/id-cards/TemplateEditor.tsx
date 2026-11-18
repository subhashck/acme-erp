import React, { useState, useEffect } from "react";
import {
  Save,
  Copy,
  Layout,
  Type,
  Shield,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Trash2,
  Check,
  Move,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type {
  IdCardTemplate,
  IdCardLayoutConfig,
  IdCardPositionsConfig,
} from "../../../server/db/schema-idcards";

interface TemplateEditorProps {
  template: IdCardTemplate;
  config?: IdCardLayoutConfig;
  onConfigChange?: (updated: IdCardLayoutConfig) => void;
  onSave: (updated: Partial<IdCardTemplate>) => Promise<void>;
  onClone?: (templateId: number) => Promise<void>;
  onResetPositions?: () => void;
}

export function TemplateEditor({
  template,
  config: propConfig,
  onConfigChange,
  onSave,
  onClone,
  onResetPositions,
}: TemplateEditorProps) {
  const [name, setName] = useState(template.name);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    (template.orientation as "portrait" | "landscape") || "portrait"
  );
  const [isDefault, setIsDefault] = useState(template.isDefault);
  const [config, setConfig] = useState<IdCardLayoutConfig>(propConfig || template.layoutConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState<"front" | "back" | null>(null);

  useEffect(() => {
    setName(template.name);
    setOrientation((template.orientation as "portrait" | "landscape") || "portrait");
    setIsDefault(template.isDefault);
  }, [template.id]);

  useEffect(() => {
    if (propConfig) {
      setConfig(propConfig);
    }
  }, [propConfig]);

  const updateConfig = (updater: (prev: IdCardLayoutConfig) => IdCardLayoutConfig) => {
    setConfig((prev) => {
      const next = updater(prev);
      onConfigChange?.(next);
      return next;
    });
  };

  const handleUploadBackground = async (side: "front" | "back", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingBg(side);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("side", side);

      const res = await fetch(`/api/id-cards/templates/${template.id}/upload-background`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload background template");

      updateConfig((prev) => ({
        ...prev,
        background: {
          ...prev.background,
          useCustomBackground: true,
          ...(side === "front" ? { frontImageUrl: data.imageUrl } : { backImageUrl: data.imageUrl }),
        },
      }));

      toast.success(`${side === "front" ? "Front" : "Back"} background template uploaded and saved!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload background");
    } finally {
      setIsUploadingBg(null);
    }
  };

  const handleUploadSignatureGraphic = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateConfig((prev) => ({
          ...prev,
          signature: {
            ...prev.signature,
            enabled: true,
            imageUrl: dataUrl,
          },
        }));
        toast.success("Signature graphic uploaded");
      }
    };
    reader.readAsDataURL(file);
  };

  const updateHeader = (updates: Partial<IdCardLayoutConfig["header"]>) => {
    updateConfig((prev) => ({
      ...prev,
      header: { ...prev.header, ...updates },
    }));
  };

  const updatePosition = (
    elementKey: keyof IdCardPositionsConfig,
    axis: "x" | "y",
    val: number
  ) => {
    updateConfig((prev) => ({
      ...prev,
      positions: {
        ...prev.positions,
        [elementKey]: {
          x: axis === "x" ? val : (prev.positions?.[elementKey]?.x ?? 50),
          y: axis === "y" ? val : (prev.positions?.[elementKey]?.y ?? 50),
        },
      },
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave({
        name,
        orientation,
        isDefault,
        layoutConfig: config,
      });
      toast.success("Template saved successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-sm">
      {/* Action Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Edit Template: {name}
          </h3>
          <p className="text-xs text-muted-foreground">
            Target: <span className="capitalize font-medium text-foreground">{template.targetType}</span> · ID: #{template.id}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onClone && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onClone(template.id)}
              className="text-xs"
            >
              <Copy className="w-3.5 h-3.5 mr-1" /> Duplicate
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Save className="w-3.5 h-3.5 mr-1" /> {isSaving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      {/* Basic Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Template Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Standard Nursing Student ID"
            className="h-8 text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Card Orientation</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={orientation === "portrait" ? "default" : "outline"}
              size="sm"
              className="h-8 flex-1 text-xs"
              onClick={() => setOrientation("portrait")}
            >
              Portrait (Lanyard Badge)
            </Button>
            <Button
              type="button"
              variant={orientation === "landscape" ? "default" : "outline"}
              size="sm"
              className="h-8 flex-1 text-xs"
              onClick={() => setOrientation("landscape")}
            >
              Landscape (Pocket Clip)
            </Button>
          </div>
        </div>
      </div>

      {/* Header Branding */}
      <div className="space-y-3 rounded-lg border border-border p-4 bg-card">
        <div className="flex items-center gap-2 font-medium text-xs text-foreground">
          <Type className="w-4 h-4 text-primary" /> Header Branding & Identity
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs">Institution Title</Label>
            <Input
              value={config.header.institutionTitle}
              onChange={(e) => updateHeader({ institutionTitle: e.target.value })}
              className="h-8 text-xs font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Subtitle / Department Tagline</Label>
              <Input
                value={config.header.institutionSubtitle || ""}
                onChange={(e) => updateHeader({ institutionSubtitle: e.target.value })}
                placeholder="e.g. Excellence in Healthcare"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Affiliation / Accreditation Note</Label>
              <Input
                value={config.header.affiliationText || ""}
                onChange={(e) => updateHeader({ affiliationText: e.target.value })}
                placeholder="e.g. NABH Accredited / INC Recognized"
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Drag & Drop Coordinates */}
      <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
            <Move className="w-4 h-4 text-primary" /> Canvas Drag & Drop Repositioning
          </div>
          {onResetPositions && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetPositions}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset Positions
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Click and drag elements directly on the live vector card preview to reposition them. Elements automatically snap to the vertical center line (<span className="font-mono text-primary font-bold">50%</span>). You can also fine-tune percentages below:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Photo Slot */}
          <div className="bg-card p-2.5 rounded-md border border-border space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>Photo Slot</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                ({config.positions?.photo?.x ?? 50}%, {config.positions?.photo?.y ?? 28}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[10px] text-muted-foreground">X (Left %)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.positions?.photo?.x ?? 50}
                  onChange={(e) => updatePosition("photo", "x", Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Y (Top %)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.positions?.photo?.y ?? 28}
                  onChange={(e) => updatePosition("photo", "y", Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div className="bg-card p-2.5 rounded-md border border-border space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>Full Name</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                ({config.positions?.name?.x ?? 50}%, {config.positions?.name?.y ?? 56}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[10px] text-muted-foreground">X (Left %)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.positions?.name?.x ?? 50}
                  onChange={(e) => updatePosition("name", "x", Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Y (Top %)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.positions?.name?.y ?? 56}
                  onChange={(e) => updatePosition("name", "y", Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Front Details Block */}
          <div className="bg-card p-2.5 rounded-md border border-border space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>Front Details Block</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                ({config.positions?.details?.x ?? 6}%, {config.positions?.details?.y ?? 63}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[10px] text-muted-foreground">X (Left %)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.positions?.details?.x ?? 6}
                  onChange={(e) => updatePosition("details", "x", Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Y (Top %)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.positions?.details?.y ?? 63}
                  onChange={(e) => updatePosition("details", "y", Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Back Family Info */}
          <div className="bg-card p-2.5 rounded-md border border-border space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>Back Family Info</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                ({config.positions?.backDetails?.x ?? 6}%, {config.positions?.backDetails?.y ?? 7.2}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[10px] text-muted-foreground">X (Left %)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.positions?.backDetails?.x ?? 6}
                  onChange={(e) => updatePosition("backDetails", "x", Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Y (Top %)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.positions?.backDetails?.y ?? 7.2}
                  onChange={(e) => updatePosition("backDetails", "y", Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Back QR Code */}
          <div className="bg-card p-2.5 rounded-md border border-border space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>Back QR Code</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                ({config.positions?.qrCode?.x ?? 50}%, {config.positions?.qrCode?.y ?? 36.7}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[10px] text-muted-foreground">X (Center %)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.positions?.qrCode?.x ?? 50}
                  onChange={(e) => updatePosition("qrCode", "x", Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Y (Top %)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.positions?.qrCode?.y ?? 36.7}
                  onChange={(e) => updatePosition("qrCode", "y", Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Authorized Signatory / Signature */}
          <div className="bg-card p-2.5 rounded-md border border-border space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between text-xs font-medium text-foreground">
              <span>Authorized Signatory Designation</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                ({config.positions?.signature?.x ?? 50}%, {config.positions?.signature?.y ?? 86}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-[10px] text-muted-foreground">X (Center %)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.positions?.signature?.x ?? 50}
                  onChange={(e) => updatePosition("signature", "x", Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">Y (Top %)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={config.positions?.signature?.y ?? 86}
                  onChange={(e) => updatePosition("signature", "y", Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Machine-Readable Codes & Signatures */}
      <div className="space-y-3 rounded-lg border border-border p-4 bg-card">
        <div className="flex items-center gap-2 font-medium text-xs text-foreground">
          <Shield className="w-4 h-4 text-primary" /> Barcodes, Signatures & Security
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.barcode.enabled}
                onChange={(e) =>
                  updateConfig((prev) => ({
                    ...prev,
                    barcode: { ...prev.barcode, enabled: e.target.checked },
                  }))
                }
                className="rounded border-input text-primary"
              />
              <span className="text-xs font-medium text-foreground">Show Code128 Barcode on Front</span>
            </label>
            <p className="text-[11px] text-muted-foreground pl-5">
              Allows physical barcode scanners to instantly clock-in staff or lookup records.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Authorized Signatory Designation</Label>
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={config.signature?.enabled !== false}
                  onChange={(e) =>
                    updateConfig((prev) => ({
                      ...prev,
                      signature: { ...prev.signature, enabled: e.target.checked },
                    }))
                  }
                  className="rounded border-input text-primary"
                />
                <span className="text-muted-foreground">Visible</span>
              </label>
            </div>
            <Input
              value={config.signature?.label || ""}
              onChange={(e) =>
                updateConfig((prev) => ({
                  ...prev,
                  signature: {
                    ...prev.signature,
                    enabled: true,
                    label: e.target.value,
                  },
                }))
              }
              placeholder="e.g. Principal Signature / Medical Director"
              className="h-8 text-xs font-medium"
            />
            <div className="flex items-center justify-between text-[11px] pt-1">
              <label className="text-primary hover:underline cursor-pointer inline-flex items-center gap-1">
                <Upload className="w-3 h-3" />
                <span>{config.signature?.imageUrl ? "Replace Signature Graphic" : "Upload Signature Graphic (PNG/JPG)"}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadSignatureGraphic}
                  className="hidden"
                />
              </label>
              {config.signature?.imageUrl && (
                <button
                  type="button"
                  onClick={() =>
                    updateConfig((prev) => ({
                      ...prev,
                      signature: { ...prev.signature, imageUrl: null },
                    }))
                  }
                  className="text-destructive hover:underline cursor-pointer"
                >
                  Remove Graphic
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Custom Background Templates */}
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-primary" />
              <Label className="text-xs font-semibold text-foreground">
                Card Background Artwork Templates
              </Label>
            </div>

            <label className="flex items-center gap-1.5 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={config.background?.useCustomBackground ?? false}
                onChange={(e) =>
                  updateConfig((prev) => ({
                    ...prev,
                    background: {
                      ...prev.background,
                      useCustomBackground: e.target.checked,
                    },
                  }))
                }
                className="rounded border-input text-primary"
              />
              <span className="text-[11px] font-medium text-foreground">Enable Saved Background</span>
            </label>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Save custom pre-designed front and back template artwork (PNG, JPEG, WebP). Dynamic details will be overlaid on top. You can also drag and drop images directly onto the card preview!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Front Background */}
            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground">Front Side Background</span>
                {config.background?.frontImageUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      updateConfig((prev) => ({
                        ...prev,
                        background: { ...prev.background, frontImageUrl: null },
                      }))
                    }
                    className="text-[10px] text-destructive hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-2.5 h-2.5" /> Remove
                  </button>
                )}
              </div>

              {config.background?.frontImageUrl ? (
                <div className="relative rounded border border-border overflow-hidden h-24 bg-muted flex items-center justify-center">
                  <img
                    src={config.background.frontImageUrl}
                    alt="Front template"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                    Saved
                  </div>
                </div>
              ) : (
                <div className="h-24 rounded border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-muted-foreground text-[11px] p-2 text-center">
                  <ImageIcon className="w-5 h-5 mb-1 text-muted-foreground/60" />
                  <span>No front artwork saved</span>
                </div>
              )}

              <label className="block">
                <span className="inline-flex items-center justify-center gap-1.5 w-full h-7 rounded border border-border bg-background hover:bg-muted text-xs font-medium cursor-pointer transition text-foreground">
                  <Upload className="w-3 h-3 text-primary" />
                  {isUploadingBg === "front" ? "Uploading..." : "Upload Front Template"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingBg !== null}
                  onChange={(e) => handleUploadBackground("front", e)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Back Background */}
            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground">Back Side Background</span>
                {config.background?.backImageUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      updateConfig((prev) => ({
                        ...prev,
                        background: { ...prev.background, backImageUrl: null },
                      }))
                    }
                    className="text-[10px] text-destructive hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Trash2 className="w-2.5 h-2.5" /> Remove
                  </button>
                )}
              </div>

              {config.background?.backImageUrl ? (
                <div className="relative rounded border border-border overflow-hidden h-24 bg-muted flex items-center justify-center">
                  <img
                    src={config.background.backImageUrl}
                    alt="Back template"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
                    Saved
                  </div>
                </div>
              ) : (
                <div className="h-24 rounded border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center text-muted-foreground text-[11px] p-2 text-center">
                  <ImageIcon className="w-5 h-5 mb-1 text-muted-foreground/60" />
                  <span>No back artwork saved</span>
                </div>
              )}

              <label className="block">
                <span className="inline-flex items-center justify-center gap-1.5 w-full h-7 rounded border border-border bg-background hover:bg-muted text-xs font-medium cursor-pointer transition text-foreground">
                  <Upload className="w-3 h-3 text-primary" />
                  {isUploadingBg === "back" ? "Uploading..." : "Upload Back Template"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingBg !== null}
                  onChange={(e) => handleUploadBackground("back", e)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-2">
          <Label className="text-xs">Cardholder Terms & Return Policy (Back of Card)</Label>
          <Textarea
            value={config.termsText || ""}
            onChange={(e) =>
              updateConfig((prev) => ({ ...prev, termsText: e.target.value }))
            }
            rows={2}
            className="text-xs"
          />
        </div>
      </div>

      {/* Set Default */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="rounded border-input text-primary"
          />
          <span className="text-xs font-semibold text-foreground">Make this the default template for {template.targetType}s</span>
        </label>

        <Button size="sm" onClick={handleSave} disabled={isSaving} className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
          <Save className="w-3.5 h-3.5 mr-1" /> {isSaving ? "Saving..." : "Save Template Changes"}
        </Button>
      </div>
    </div>
  );
}
