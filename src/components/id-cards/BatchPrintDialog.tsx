import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Printer,
  Calendar,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  ImageDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Badge } from "@/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { IdCardPreview } from "./IdCardPreview";
import { CardSideView } from "./CardSideView";
import {
  generateSingleCardPdf,
  generateBatchImpositionPdf,
  type CardRenderData,
} from "../../lib/id-card-pdf";
import {
  captureElementToPng,
  captureElementToDataUrl,
  ensureElementImagesLoaded,
  downloadPngBlob,
  formatCardPngFilename,
} from "../../lib/id-card-png";
import type { IdCardTemplate } from "../../../server/db/schema-idcards";

interface BatchPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "staff" | "student";
  selectedCards: CardRenderData[];
  onSuccess?: () => void;
}

export function BatchPrintDialog({
  open,
  onOpenChange,
  entityType,
  selectedCards,
  onSuccess,
}: BatchPrintDialogProps) {
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [validUntil, setValidUntil] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [mobileTab, setMobileTab] = useState<"settings" | "preview">("settings");
  const [stagedCards, setStagedCards] = useState<CardRenderData[]>(selectedCards);

  useEffect(() => {
    setStagedCards(selectedCards);
  }, [selectedCards, open]);

  // Fetch templates for this entity type
  const { data: templates = [] } = useQuery<IdCardTemplate[]>({
    queryKey: ["id-card-templates", entityType],
    queryFn: async () => {
      const res = await fetch(`/api/id-cards/templates?targetType=${entityType}`);
      if (!res.ok) throw new Error("Failed to load templates");
      return res.json();
    },
    enabled: open,
  });

  const activeTemplate =
    templates.find((t) => t.id === selectedTemplateId) ||
    templates.find((t) => t.isDefault) ||
    templates[0];

  const currentPreviewCard = selectedCards[activePreviewIndex] || selectedCards[0];

  // Helper to quickly set validity date presets
  const handleSetPresetYear = (years: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    setValidUntil(d.toISOString().split("T")[0]);
  };

  // Issue & Print mutation
  const handlePrint = async (mode: "cr80" | "a4") => {
    if (!activeTemplate) {
      toast.error("Please select a template");
      return;
    }
    if (selectedCards.length === 0) {
      toast.error("No cards selected");
      return;
    }

    try {
      setIsGenerating(true);
      toast.loading("Generating print credentials and recording issuances...", { id: "print-gen" });

      // 1. Issue cards in backend to get serials and QR tokens
      const ids = selectedCards
        .map((c) => c.entityId || (c.code ? parseInt(c.code.replace(/\D/g, ""), 10) : 0))
        .filter((n) => n > 0);

      // We call issue-batch with the resolved cards
      const issueRes = await fetch("/api/id-cards/issue-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          templateId: activeTemplate.id,
          validUntil: validUntil || undefined,
          ids,
        }),
      });

      let verifiedCards: CardRenderData[] = [...selectedCards];

      if (issueRes.ok) {
        const result = await issueRes.json();
        if (result.data && Array.isArray(result.data)) {
          // Map backend serial numbers and QR tokens back onto render list
          verifiedCards = selectedCards.map((sc, idx) => {
            const issued = result.data[idx];
            if (issued) {
              return {
                ...sc,
                cardSerialNo: issued.cardSerialNo,
                qrVerifyToken: issued.qrVerifyToken,
                issueDate: issued.issueDate,
                validUntil: issued.validUntil || sc.validUntil,
              };
            }
            return sc;
          });
        }
      }

      // 2. Pre-render & rasterize each card to high-resolution PNG for embedding inside PDF
      toast.loading("Rasterizing cards at 300+ DPI for pixel-perfect PDF...", { id: "print-gen" });
      setStagedCards([...verifiedCards]);
      // Allow DOM repaint and QR code generation
      await new Promise((r) => setTimeout(r, 200));

      for (let idx = 0; idx < verifiedCards.length; idx++) {
        if (verifiedCards.length > 1) {
          toast.loading(`Rasterizing card ${idx + 1} of ${verifiedCards.length}...`, { id: "print-gen" });
        }
        const frontEl = document.getElementById(`print-stage-front-${idx}`);
        const backEl = document.getElementById(`print-stage-back-${idx}`);

        if (frontEl) {
          await ensureElementImagesLoaded(frontEl);
          verifiedCards[idx].frontPngData = await captureElementToDataUrl(frontEl, 4);
        }
        if (backEl) {
          await ensureElementImagesLoaded(backEl);
          verifiedCards[idx].backPngData = await captureElementToDataUrl(backEl, 4);
        }
      }

      toast.loading("Assembling print-ready PDF...", { id: "print-gen" });

      // 3. Generate PDF based on mode (jsPDF embeds the high-res PNGs directly)
      let pdfBlob: Blob;
      let filename = "";

      if (mode === "cr80") {
        if (verifiedCards.length === 1) {
          pdfBlob = await generateSingleCardPdf(verifiedCards[0], activeTemplate);
          filename = `ID_CARD_${verifiedCards[0].code}.pdf`;
        } else {
          // Multi CR80 pages
          pdfBlob = await generateBatchImpositionPdf(verifiedCards, activeTemplate);
          filename = `BATCH_ID_CARDS_${entityType}_${verifiedCards.length}.pdf`;
        }
      } else {
        // A4 Duplex Imposition
        pdfBlob = await generateBatchImpositionPdf(verifiedCards, activeTemplate);
        filename = `A4_DUPLEX_ID_SHEET_${entityType}_${verifiedCards.length}.pdf`;
      }

      // 4. Trigger Download
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        mode === "cr80"
          ? "CR80 PVC Card PDF downloaded!"
          : "A4 Duplex Imposition Sheet downloaded!",
        { id: "print-gen" }
      );

      queryClient.invalidateQueries({ queryKey: ["id-card-issuances"] });
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate print document", { id: "print-gen" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate as PNG option
  const handleGeneratePng = async () => {
    if (!activeTemplate) {
      toast.error("Please select a template");
      return;
    }
    if (selectedCards.length === 0) {
      toast.error("No cards selected");
      return;
    }

    try {
      setIsGenerating(true);
      toast.loading("Generating high-resolution ID card PNG...", { id: "print-gen" });

      // 1. Issue cards in backend to track issuance and update serials
      const ids = selectedCards
        .map((c) => c.entityId || (c.code ? parseInt(c.code.replace(/\D/g, ""), 10) : 0))
        .filter((n) => n > 0);

      await fetch("/api/id-cards/issue-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          templateId: activeTemplate.id,
          validUntil: validUntil || undefined,
          ids,
        }),
      });

      // 2. Locate the active card element in staging or preview
      const frontEl = document.getElementById(`print-stage-front-${activePreviewIndex}`);
      if (frontEl) {
        await ensureElementImagesLoaded(frontEl);
        const blob = await captureElementToPng(frontEl, 4);
        downloadPngBlob(blob, formatCardPngFilename(currentPreviewCard, "front"));
        toast.success("ID Card PNG generated and downloaded!", { id: "print-gen" });
      } else {
        const previewContainer = document.getElementById("batch-preview-card-container");
        const cardElem = previewContainer?.querySelector("[style*='width'][style*='height']") as HTMLElement;

        if (cardElem) {
          const blob = await captureElementToPng(cardElem, 4);
          downloadPngBlob(blob, formatCardPngFilename(currentPreviewCard, "card"));
          toast.success("ID Card PNG generated and downloaded!", { id: "print-gen" });
        } else {
          toast.info("Please use the 'Download PNG' button in the preview toolbar.", { id: "print-gen" });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["id-card-issuances"] });
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate PNG", { id: "print-gen" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[calc(100vw-1rem)] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-card text-card-foreground border border-border shadow-2xl rounded-2xl">
        {/* Fixed Header */}
        <DialogHeader className="p-4 sm:px-6 sm:py-3.5 border-b border-border shrink-0 flex flex-row items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm sm:text-base md:text-lg font-bold text-foreground truncate flex items-center gap-2">
                <span>Print & Issue ID Cards</span>
                <Badge variant="secondary" className="text-[11px] px-2 py-0.5 rounded-full font-semibold">
                  {selectedCards.length} {selectedCards.length === 1 ? "Card" : "Cards"}
                </Badge>
              </DialogTitle>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate hidden xs:block">
                Configure layout, validity, and export high-resolution CR80 or A4 duplex print sheets
              </p>
            </div>
          </div>

          {/* Quick Mobile Tab Switcher */}
          <div className="flex md:hidden items-center shrink-0">
            <div className="inline-flex rounded-lg border border-border bg-muted p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMobileTab("settings")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                  mobileTab === "settings"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" /> Settings
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("preview")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                  mobileTab === "preview"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="w-3 h-3" /> Preview
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 items-start">
            {/* Left Controls Column (Visible on Desktop OR when mobileTab === 'settings') */}
            <div
              className={`md:col-span-6 space-y-4 text-xs ${
                mobileTab === "settings" ? "block" : "hidden md:block"
              }`}
            >
              {/* Template Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">Choose Card Template</Label>
                  <span className="text-[11px] text-muted-foreground">
                    {templates.length} available
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templates.map((t) => {
                    const isSelected = activeTemplate?.id === t.id;
                    const primary = t.layoutConfig?.theme?.primaryColor || "#0284c7";
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTemplateId(t.id)}
                        className={`p-2.5 sm:p-3 rounded-lg border cursor-pointer transition flex items-center justify-between gap-2.5 text-left ${
                          isSelected
                            ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-xs ring-1 ring-primary/30"
                            : "border-border hover:border-muted-foreground/30 bg-card hover:bg-muted/30"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-xs text-foreground truncate">
                              {t.name}
                            </p>
                            {isSelected && (
                              <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-muted-foreground">
                            <span className="capitalize">{t.orientation}</span>
                            <span>·</span>
                            <span className="capitalize">{t.targetType}</span>
                            {t.isDefault && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto leading-none">
                                Default
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div
                          className="w-4 h-4 rounded-full border border-black/10 dark:border-white/20 shrink-0 shadow-2xs"
                          style={{ backgroundColor: primary }}
                          title={`Primary theme: ${primary}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Validity Date */}
              <div className="space-y-2 p-3 bg-muted/20 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" /> Validity / Expiry Date (Optional)
                  </Label>
                  {validUntil && (
                    <button
                      type="button"
                      onClick={() => setValidUntil("")}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="h-8 text-xs bg-background"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-muted-foreground mr-1">Presets:</span>
                  {[
                    { label: "+1 Year", years: 1 },
                    { label: "+2 Years", years: 2 },
                    { label: "+3 Years", years: 3 },
                    { label: "+4 Years", years: 4 },
                  ].map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPresetYear(preset.years)}
                      className="h-6 px-2 text-[10px] bg-background hover:bg-muted"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <p className="text-[10.5px] text-muted-foreground">
                  Valid until dates will be imprinted on the card reverse and checked upon QR code scan.
                </p>
              </div>

              {/* Card Batch & Security Summary */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Print Security & Specifications
                  </span>
                  <Badge variant="outline" className="text-[10px] border-border">
                    ISO 7810 CR80
                  </Badge>
                </div>
                <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                  <li>300 DPI high-precision vector rendering with standard 2mm safety bleeds.</li>
                  <li>Tamper-evident anti-counterfeit QR code with live web verification link.</li>
                  <li>Standard 1D Code128 barcode encoding employee / enrollment number.</li>
                  {selectedCards.length > 1 && (
                    <li className="text-primary font-medium">
                      Batch queue: {selectedCards.length} cards ready to process.
                    </li>
                  )}
                </ul>
              </div>

              {/* Mobile button to switch to preview */}
              <div className="block md:hidden pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMobileTab("preview")}
                  className="w-full text-xs flex items-center justify-center gap-1.5 h-9"
                >
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  View Interactive Card Preview
                  {selectedCards.length > 1 && ` (1 of ${selectedCards.length})`}
                </Button>
              </div>
            </div>

            {/* Right Live Preview Column (Visible on Desktop OR when mobileTab === 'preview') */}
            <div
              className={`md:col-span-6 flex flex-col items-center justify-center p-3 sm:p-5 bg-muted/20 dark:bg-muted/10 rounded-xl border border-dashed border-border min-h-[380px] sm:min-h-[420px] ${
                mobileTab === "preview" ? "block" : "hidden md:flex"
              }`}
            >
              {/* Batch Carousel Navigator (if > 1 card selected) */}
              {selectedCards.length > 1 && (
                <div className="w-full max-w-sm flex items-center justify-between mb-3 px-3 py-1.5 rounded-lg bg-card border border-border shadow-xs text-xs">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                    disabled={activePreviewIndex === 0}
                    onClick={() => setActivePreviewIndex((p) => Math.max(0, p - 1))}
                    title="Previous Card"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <div className="text-center min-w-0 px-2">
                    <p className="font-semibold text-xs text-foreground truncate">
                      {currentPreviewCard?.name || "Cardholder"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {currentPreviewCard?.code} · {activePreviewIndex + 1} of {selectedCards.length}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                    disabled={activePreviewIndex >= selectedCards.length - 1}
                    onClick={() =>
                      setActivePreviewIndex((p) => Math.min(selectedCards.length - 1, p + 1))
                    }
                    title="Next Card"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Vector Preview Canvas */}
              {activeTemplate && currentPreviewCard ? (
                <div id="batch-preview-card-container" className="w-full flex flex-col items-center">
                  <IdCardPreview
                    card={{
                      ...currentPreviewCard,
                      validUntil: validUntil || currentPreviewCard.validUntil,
                    }}
                    config={activeTemplate.layoutConfig}
                    orientation={activeTemplate.orientation as "portrait" | "landscape"}
                  />
                  <p className="text-[10.5px] text-muted-foreground text-center mt-3 max-w-xs">
                    Flip to verify front and back vector artwork. Click print or generate PNG below.
                  </p>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Select cards to preview
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="p-3 sm:px-6 sm:py-3.5 border-t border-border shrink-0 bg-muted/20 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
            className="w-full sm:w-auto text-xs h-9"
          >
            Cancel
          </Button>

          <div className="flex flex-col xs:flex-row items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleGeneratePng}
              disabled={isGenerating || selectedCards.length === 0}
              className="w-full xs:w-auto text-xs h-9 font-medium"
              title="Generate high-resolution 300+ DPI PNG"
            >
              {isGenerating ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-primary" />
              ) : (
                <ImageDown className="w-3.5 h-3.5 mr-1.5 text-primary" />
              )}
              Generate as PNG
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handlePrint("cr80")}
              disabled={isGenerating || selectedCards.length === 0}
              className="w-full xs:w-auto text-xs h-9 font-medium"
            >
              {isGenerating ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin text-primary" />
              ) : (
                <CreditCard className="w-3.5 h-3.5 mr-1.5 text-primary" />
              )}
              {selectedCards.length > 1
                ? `CR80 PVC (${selectedCards.length} Cards)`
                : "Direct CR80 PVC (Single)"}
            </Button>

            <Button
              type="button"
              onClick={() => handlePrint("a4")}
              disabled={isGenerating || selectedCards.length === 0}
              className="w-full xs:w-auto text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isGenerating ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5 mr-1.5" />
              )}
              {selectedCards.length > 1
                ? `A4 Duplex Sheet (${selectedCards.length} Cards)`
                : "A4 Duplex Sheet (Multi-Card)"}
            </Button>
          </div>
        </DialogFooter>

        {/* Offscreen rasterization staging container for pixel-perfect PDF export */}
        {activeTemplate && (
          <div
            aria-hidden="true"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              zIndex: -9999,
              pointerEvents: "none",
              overflow: "hidden",
              opacity: 1,
            }}
          >
            {stagedCards.map((card, idx) => (
              <div key={`stage-${card.id || card.code || idx}`}>
                <div id={`print-stage-front-${idx}`}>
                  <CardSideView
                    card={card}
                    config={activeTemplate.layoutConfig}
                    orientation={activeTemplate.orientation}
                    side="front"
                    forPrint={true}
                  />
                </div>
                <div id={`print-stage-back-${idx}`}>
                  <CardSideView
                    card={card}
                    config={activeTemplate.layoutConfig}
                    orientation={activeTemplate.orientation}
                    side="back"
                    forPrint={true}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}