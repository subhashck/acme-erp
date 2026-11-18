import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  QrCode as QrIcon,
  RotateCw,
  Move,
  Upload,
  RotateCcw,
  Sparkles,
  ImageDown,
  Camera,
  Files,
  Columns2,
  ChevronDown,
} from "lucide-react";
import { Button } from "../ui/button";
import type {
  IdCardLayoutConfig,
  IdCardPositionsConfig,
  IdCardElementPosition,
} from "../../../server/db/schema-idcards";
import type { CardRenderData } from "../../lib/id-card-pdf";
import { formatDateDdMonYyyy } from "../../utils/format";
import {
  captureElementToPng,
  downloadPngBlob,
  createCompositeSideBySidePng,
  formatCardPngFilename,
} from "../../lib/id-card-png";
import { toast } from "sonner";

interface IdCardPreviewProps {
  card: CardRenderData;
  config: IdCardLayoutConfig;
  orientation: "portrait" | "landscape";
  showFlipButton?: boolean;
  showPngDownload?: boolean;
  isDesignerMode?: boolean;
  onPositionChange?: (elementKey: keyof IdCardPositionsConfig, pos: IdCardElementPosition) => void;
  onDropBackground?: (file: File, side: "front" | "back") => void;
  onResetPositions?: () => void;
}

interface DraggableItemProps {
  id: keyof IdCardPositionsConfig;
  defaultPos: { x: number; y: number };
  currentPos?: { x: number; y: number };
  isDesignerMode: boolean;
  onPositionChange?: (id: keyof IdCardPositionsConfig, pos: IdCardElementPosition) => void;
  label: string;
  isCentered?: boolean;
  className?: string;
  children: React.ReactNode;
  cardRef: React.RefObject<HTMLDivElement | null>;
  onSnapChange?: (isSnapped: boolean) => void;
}

function DraggableItem({
  id,
  defaultPos,
  currentPos,
  isDesignerMode,
  onPositionChange,
  label,
  isCentered = false,
  className = "",
  children,
  cardRef,
  onSnapChange,
}: DraggableItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const pos = currentPos || defaultPos;
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  if (!isDesignerMode) {
    return (
      <div
        style={{
          position: "absolute",
          left: `${pos.x}%`,
          top: `${pos.y}%`,
          transform: isCentered ? "translate(-50%, 0)" : undefined,
        }}
        className={className}
      >
        {children}
      </div>
    );
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: pos.x,
      initY: pos.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const deltaXPercent = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
    const deltaYPercent = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;

    let newX = Math.round(dragStartRef.current.initX + deltaXPercent);
    let newY = Math.round(dragStartRef.current.initY + deltaYPercent);

    // Bounding limits within card canvas
    newX = Math.max(2, Math.min(95, newX));
    newY = Math.max(2, Math.min(94, newY));

    // Horizontal center snapping
    const isSnapped = isCentered && Math.abs(newX - 50) <= 2.5;
    if (isSnapped) {
      newX = 50;
    }
    onSnapChange?.(isSnapped);

    onPositionChange?.(id, { x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      onSnapChange?.(false);
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: "absolute",
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        transform: isCentered ? "translate(-50%, 0)" : undefined,
        touchAction: "none",
        cursor: isDragging ? "grabbing" : "grab",
      }}
      className={`group select-none transition-shadow ${
        isDragging
          ? "ring-2 ring-primary ring-offset-2 z-50 shadow-2xl scale-[1.02]"
          : "hover:ring-1.5 hover:ring-primary/80 hover:ring-dashed z-20"
      } ${className}`}
    >
      {/* Real-time coordinate tag pill on drag / hover */}
      <div
        className={`absolute -top-5 left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-150 bg-primary text-primary-foreground text-[8.5px] px-1.5 py-0.5 rounded font-mono shadow-md whitespace-nowrap z-50 flex items-center gap-1 leading-none ${
          isDragging ? "opacity-100 scale-105" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <Move className="w-2.5 h-2.5 opacity-80" />
        <span>{label}</span>
        <span className="opacity-90 font-bold">
          ({Math.round(pos.x)}%, {Math.round(pos.y)}%)
        </span>
      </div>
      {children}
    </div>
  );
}

export function IdCardPreview({
  card,
  config,
  orientation,
  showFlipButton = true,
  showPngDownload = true,
  isDesignerMode = false,
  onPositionChange,
  onDropBackground,
  onResetPositions,
}: IdCardPreviewProps) {
  const [side, setSide] = useState<"front" | "back">("front");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isDragOverCard, setIsDragOverCard] = useState(false);
  const [isCenterSnapped, setIsCenterSnapped] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [showPngMenu, setShowPngMenu] = useState(false);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  const isAconStudent =
    card.entityType === "student" || config.theme?.cardVariant === "acon-official-student";

  // Forced portrait if it's the ACON student template
  const isLandscape = isAconStudent ? false : orientation === "landscape";
  const primaryColor = config.theme.primaryColor || (isAconStudent ? "#2f3e83" : "#0284c7");
  const secondaryColor = config.theme.secondaryColor || (isAconStudent ? "#b8c8f5" : "#0f172a");

  // In the attached template, the QR code on the back says "College Location"
  const qrTargetUrl = isAconStudent
    ? "https://maps.google.com/?q=Acme+College+of+Nursing+Imphal"
    : typeof window !== "undefined"
    ? `${window.location.origin}/verify/id/${card.qrVerifyToken || "sample"}`
    : `https://acmehospital.com/verify/id/${card.cardSerialNo || "sample"}`;

  useEffect(() => {
    QRCode.toDataURL(qrTargetUrl, {
      margin: 1,
      width: 200,
      color: { dark: isAconStudent ? "#253468" : "#000000", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => {});
  }, [qrTargetUrl, isAconStudent]);

  // Card dimensions: 54mm x 85.6mm (aspect ratio approx 1 : 1.585)
  // Scaled for high DPI screen display:
  const cardStyle: React.CSSProperties = isLandscape
    ? { width: "360px", height: "228px" }
    : { width: "230px", height: "365px" };

  // Student batch / validity resolution (e.g. 2024-2028 or 2026-2030)
  const batchValidity = card.academicYear || card.validUntil || card.department || "2024-2028";

  // Canvas Drag & Drop File Handlers
  const handleDragOver = (e: React.DragEvent) => {
    if (!onDropBackground) return;
    e.preventDefault();
    setIsDragOverCard(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setIsDragOverCard(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!onDropBackground) return;
    e.preventDefault();
    setIsDragOverCard(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onDropBackground(file, side);
    }
  };

  // High-Resolution 300+ DPI PNG Exporter
  const handleExportPng = async (mode: "current" | "both" | "composite") => {
    if (!cardContainerRef.current) return;
    try {
      setIsExportingPng(true);
      setShowPngMenu(false);
      toast.loading("Generating high-resolution 300+ DPI PNG...", { id: "export-png" });

      const originalSide = side;

      if (mode === "current") {
        const blob = await captureElementToPng(cardContainerRef.current, 4);
        const filename = formatCardPngFilename(card, side);
        downloadPngBlob(blob, filename);
        toast.success(`Downloaded ${side === "front" ? "Front" : "Back"} PNG!`, { id: "export-png" });
      } else if (mode === "both") {
        // 1. Capture Front
        setSide("front");
        await new Promise((r) => setTimeout(r, 160));
        if (!cardContainerRef.current) throw new Error("Card element not found");
        const frontBlob = await captureElementToPng(cardContainerRef.current, 4);
        downloadPngBlob(frontBlob, formatCardPngFilename(card, "front"));

        // 2. Capture Back
        setSide("back");
        await new Promise((r) => setTimeout(r, 160));
        if (!cardContainerRef.current) throw new Error("Card element not found");
        const backBlob = await captureElementToPng(cardContainerRef.current, 4);
        downloadPngBlob(backBlob, formatCardPngFilename(card, "back"));

        // Restore original side
        setSide(originalSide);
        toast.success("Downloaded Front & Back PNGs!", { id: "export-png" });
      } else if (mode === "composite") {
        const html2canvas = (await import("html2canvas-pro")).default;

        // 1. Render Front Canvas
        setSide("front");
        await new Promise((r) => setTimeout(r, 160));
        if (!cardContainerRef.current) throw new Error("Card element not found");
        const frontCanvas = await html2canvas(cardContainerRef.current, {
          scale: 4,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
        });

        // 2. Render Back Canvas
        setSide("back");
        await new Promise((r) => setTimeout(r, 160));
        if (!cardContainerRef.current) throw new Error("Card element not found");
        const backCanvas = await html2canvas(cardContainerRef.current, {
          scale: 4,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
          logging: false,
        });

        // Restore original side
        setSide(originalSide);

        // 3. Composite into single side-by-side PNG
        const compositeBlob = await createCompositeSideBySidePng(frontCanvas, backCanvas, 40);
        downloadPngBlob(compositeBlob, formatCardPngFilename(card, "composite"));
        toast.success("Downloaded Side-by-Side Composite PNG!", { id: "export-png" });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate PNG", { id: "export-png" });
    } finally {
      setIsExportingPng(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-full">
      {/* Side Toggle & Drag-and-Drop Mode Toolbar */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {showFlipButton && (
          <div className="inline-flex rounded-lg border border-border bg-muted p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSide("front")}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer text-xs ${
                side === "front"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Front Side
            </button>
            <button
              type="button"
              onClick={() => setSide("back")}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer text-xs ${
                side === "back"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Back Side
            </button>
          </div>
        )}

        {showFlipButton && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => setSide(side === "front" ? "back" : "front")}
          >
            <RotateCw className="w-3.5 h-3.5 mr-1" /> Flip
          </Button>
        )}

        {/* Generate as PNG Button with Options */}
        {showPngDownload && (
          <div className="relative">
            <div className="inline-flex rounded-md shadow-xs">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleExportPng("current")}
                disabled={isExportingPng}
                className="h-7 px-2.5 text-xs text-foreground hover:bg-muted cursor-pointer rounded-r-none border-r-0"
                title={`Download ${side === "front" ? "Front" : "Back"} high-res 300+ DPI PNG`}
              >
                <ImageDown className="w-3.5 h-3.5 mr-1 text-primary" />
                {isExportingPng ? "Generating..." : `Download ${side === "front" ? "Front" : "Back"} PNG`}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPngMenu((prev) => !prev)}
                disabled={isExportingPng}
                className="h-7 px-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-l-none"
                title="More PNG export options"
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </div>

            {showPngMenu && (
              <div className="absolute right-0 top-full mt-1 w-54 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl z-50 p-1 text-xs space-y-0.5 animate-in fade-in-50 zoom-in-95">
                <button
                  type="button"
                  onClick={() => handleExportPng("current")}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-muted cursor-pointer flex items-center gap-2"
                >
                  <Camera className="w-3.5 h-3.5 text-primary" />
                  <span>Current ({side.toUpperCase()}) PNG (300 DPI)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPng("both")}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-muted cursor-pointer flex items-center gap-2"
                >
                  <Files className="w-3.5 h-3.5 text-primary" />
                  <span>Both Sides (2 PNG Files)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPng("composite")}
                  className="w-full text-left px-2.5 py-1.5 rounded hover:bg-muted cursor-pointer flex items-center gap-2"
                >
                  <Columns2 className="w-3.5 h-3.5 text-primary" />
                  <span>Side-by-Side Composite PNG</span>
                </button>
              </div>
            )}
          </div>
        )}

        {isDesignerMode && onResetPositions && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs cursor-pointer text-muted-foreground hover:text-foreground"
            onClick={onResetPositions}
            title="Reset dragged elements to canonical coordinates"
          >
            <RotateCcw className="w-3 h-3 mr-1" /> Reset Positions
          </Button>
        )}
      </div>

      {isDesignerMode && (
        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-full border border-border">
          <Sparkles className="w-3 h-3 text-primary shrink-0" />
          <span>Click & drag elements on card to position · Drop image file to set {side} background</span>
        </div>
      )}

      {/* Responsive Card Container */}
      <div className="w-full flex items-center justify-center overflow-x-hidden p-1">
        <div
          className={
            isLandscape
              ? "origin-center transform scale-[0.80] sm:scale-100 transition-transform my-[-20px] sm:my-0"
              : "origin-center transform scale-[0.90] sm:scale-100 transition-transform my-[-15px] sm:my-0"
          }
        >
          <div
            ref={cardContainerRef}
            style={cardStyle}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="relative bg-white rounded-xl shadow-md dark:shadow-2xl dark:shadow-black/80 border border-slate-200/90 dark:border-slate-700/80 overflow-hidden select-none flex flex-col justify-between text-slate-900 transition-all duration-300 font-sans shrink-0"
          >
            {/* Center Snapping Vertical Guideline */}
            {isCenterSnapped && (
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 border-l-2 border-dashed border-primary z-40 pointer-events-none opacity-80" />
            )}

            {/* Drag-and-Drop Image File Overlay */}
            {isDragOverCard && (
              <div className="absolute inset-0 bg-primary/20 backdrop-blur-xs border-2 border-dashed border-primary rounded-xl flex flex-col items-center justify-center text-primary z-50 p-4 text-center">
                <Upload className="w-8 h-8 mb-2 animate-bounce" />
                <span className="text-xs font-bold">Drop Image to Upload</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  Set as {side === "front" ? "Front" : "Back"} Background Template
                </span>
              </div>
            )}

            {side === "front" ? (
              // ================= FRONT SIDE =================
              isAconStudent ? (
                /* OFFICIAL ACON STUDENT ID CARD FRONT - USES ONLY BG IMAGE + DRAGGABLE OVERLAYS */
                <div className="relative w-full h-full overflow-hidden select-none">
                  {/* Full Canvas Background Image */}
                  <img
                    src={config.background?.frontImageUrl || "/templates/acon-student-front.jpg"}
                    alt="Student Card Front Background"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                  />

                  {/* 1. Circular Student Photograph (Draggable) */}
                  <DraggableItem
                    id="photo"
                    defaultPos={{ x: 50, y: 28 }}
                    currentPos={config.positions?.photo}
                    isDesignerMode={isDesignerMode}
                    onPositionChange={onPositionChange}
                    label="Photo"
                    isCentered={true}
                    cardRef={cardContainerRef}
                    onSnapChange={setIsCenterSnapped}
                  >
                    <div className="w-[78px] h-[78px] rounded-full border-[3px] border-white shadow-md overflow-hidden bg-slate-100 flex items-center justify-center">
                      <img
                        src={card.photoUrl || "/templates/generic-avatar.png"}
                        alt={card.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </DraggableItem>

                  {/* 2. Student Full Name (Draggable) */}
                  <DraggableItem
                    id="name"
                    defaultPos={{ x: 50, y: 56 }}
                    currentPos={config.positions?.name}
                    isDesignerMode={isDesignerMode}
                    onPositionChange={onPositionChange}
                    label="Student Name"
                    isCentered={true}
                    cardRef={cardContainerRef}
                    onSnapChange={setIsCenterSnapped}
                    className="w-full px-2 text-center"
                  >
                    <span className="font-bold text-[12.5px] text-white tracking-wide leading-tight inline-block text-center drop-shadow-xs">
                      {card.name}
                    </span>
                  </DraggableItem>

                  {/* 3. Detail Rows (Draggable) */}
                  <DraggableItem
                    id="details"
                    defaultPos={{ x: 6, y: 63 }}
                    currentPos={config.positions?.details}
                    isDesignerMode={isDesignerMode}
                    onPositionChange={onPositionChange}
                    label="Details Block"
                    isCentered={false}
                    cardRef={cardContainerRef}
                    className="w-[88%]"
                  >
                    <div className="space-y-0.5 text-[8.5px] font-medium text-white drop-shadow-xs">
                      <div className="grid grid-cols-[68px_10px_1fr] items-baseline">
                        <span className="font-semibold text-white/90">Validity</span>
                        <span>:</span>
                        <span className="font-bold">{batchValidity}</span>
                      </div>
                      <div className="grid grid-cols-[68px_10px_1fr] items-baseline">
                        <span className="font-semibold text-white/90">Date of Birth</span>
                        <span>:</span>
                        <span>{formatDateDdMonYyyy(card.dob) || "11-MAR-2006"}</span>
                      </div>
                      <div className="grid grid-cols-[68px_10px_1fr] items-baseline">
                        <span className="font-semibold text-white/90">Blood Group</span>
                        <span>:</span>
                        <span>{card.bloodGroup || "A+ ve"}</span>
                      </div>
                      <div className="grid grid-cols-[68px_10px_1fr] items-baseline">
                        <span className="font-semibold text-white/90">Parent's No.</span>
                        <span>:</span>
                        <span>{card.emergencyContact || "+91 8076 417 706"}</span>
                      </div>
                    </div>
                  </DraggableItem>

                  {/* 4. Authorized Signatory Designation (Draggable) */}
                  {config.signature?.enabled !== false && (
                    <DraggableItem
                      id="signature"
                      defaultPos={{ x: 50, y: 86 }}
                      currentPos={config.positions?.signature}
                      isDesignerMode={isDesignerMode}
                      onPositionChange={onPositionChange}
                      label="Signatory"
                      isCentered={true}
                      cardRef={cardContainerRef}
                      onSnapChange={setIsCenterSnapped}
                      className="text-center flex flex-col items-center"
                    >
                      <div className="flex flex-col items-center justify-center pointer-events-none">
                        {config.signature?.imageUrl ? (
                          <img
                            src={config.signature.imageUrl}
                            alt="Signature"
                            className="h-6 object-contain mb-0.5 filter invert brightness-0"
                          />
                        ) : (
                          <div className="w-20 border-b border-white/80 mb-1" />
                        )}
                        <span className="text-[8.5px] font-serif font-medium text-white tracking-wide leading-tight drop-shadow-xs">
                          {config.signature?.label || "Principal Signature"}
                        </span>
                      </div>
                    </DraggableItem>
                  )}
                </div>
              ) : (
                /* STANDARD STAFF / CLINICAL FRONT */
                <div className="flex flex-col h-full justify-between">
                  {/* Header Banner */}
                  <div
                    style={{ backgroundColor: primaryColor }}
                    className="px-2.5 py-2 text-white text-center shadow-sm relative"
                  >
                    <div
                      style={{ backgroundColor: secondaryColor }}
                      className="absolute -bottom-1 left-0 right-0 h-1"
                    />
                    <h4 className="text-[10.5px] font-bold tracking-tight leading-tight uppercase">
                      {config.header.institutionTitle || "ACME HEALTHCARE"}
                    </h4>
                    {config.header.institutionSubtitle && (
                      <p className="text-[7.5px] text-white/90 leading-tight truncate">
                        {config.header.institutionSubtitle}
                      </p>
                    )}
                    {config.header.affiliationText && (
                      <p className="text-[6.5px] text-white/80 italic leading-tight truncate">
                        {config.header.affiliationText}
                      </p>
                    )}
                  </div>

                  {/* Middle Content */}
                  {isLandscape ? (
                    <div className="flex items-center gap-3 p-3 flex-1 relative">
                      <DraggableItem
                        id="photo"
                        defaultPos={{ x: 6, y: 26 }}
                        currentPos={config.positions?.photo}
                        isDesignerMode={isDesignerMode}
                        onPositionChange={onPositionChange}
                        label="Photo"
                        cardRef={cardContainerRef}
                      >
                        <div className="w-[72px] h-[92px] rounded-lg border-2 border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                          <img
                            src={card.photoUrl || "/templates/generic-avatar.png"}
                            alt={card.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </DraggableItem>

                      <div className="flex-1 min-w-0 space-y-1 text-[9px] pl-[82px]">
                        <h3 className="font-bold text-xs text-slate-900 truncate leading-tight uppercase">
                          {card.name}
                        </h3>
                        <p className="text-primary font-bold text-[10px] truncate">{card.role || "Staff"}</p>
                        <p className="text-slate-600 truncate">{card.department || "Hospital Staff"}</p>
                        <div className="pt-1 flex items-center gap-2 text-[8px] font-mono">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-semibold text-slate-700">
                            {card.code}
                          </span>
                          {card.bloodGroup && (
                            <span className="text-red-600 font-bold bg-red-50 px-1 py-0.5 rounded border border-red-200">
                              {card.bloodGroup}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center p-3 text-center flex-1 justify-center relative">
                      <DraggableItem
                        id="photo"
                        defaultPos={{ x: 50, y: 24 }}
                        currentPos={config.positions?.photo}
                        isDesignerMode={isDesignerMode}
                        onPositionChange={onPositionChange}
                        label="Photo"
                        isCentered={true}
                        cardRef={cardContainerRef}
                        onSnapChange={setIsCenterSnapped}
                      >
                        <div className="w-[84px] h-[106px] rounded-xl border-2 border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center shadow-xs mb-2">
                          <img
                            src={card.photoUrl || "/templates/generic-avatar.png"}
                            alt={card.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </DraggableItem>

                      <div className="mt-28 flex flex-col items-center">
                        <h3 className="font-bold text-[11px] text-slate-900 leading-tight uppercase max-w-[190px] truncate">
                          {card.name}
                        </h3>
                        <p className="text-primary font-bold text-[9px] mt-0.5 truncate max-w-[190px]">
                          {card.role || "Hospital Staff"}
                        </p>
                        {card.department && (
                          <p className="text-slate-500 text-[8px] truncate max-w-[190px]">
                            {card.department}
                          </p>
                        )}
                        <span className="inline-block mt-1 font-mono text-[8px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-semibold border border-slate-200">
                          {card.code}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Bottom Bar */}
                  <div
                    style={{ backgroundColor: primaryColor }}
                    className="h-1.5 w-full shrink-0"
                  />
                </div>
              )
            ) : (
              // ================= BACK SIDE =================
              isAconStudent ? (
                /* OFFICIAL ACON STUDENT ID CARD BACK - USES ONLY BG IMAGE + DRAGGABLE OVERLAYS */
                <div className="relative w-full h-full overflow-hidden select-none">
                  {/* Full Canvas Background Image */}
                  <img
                    src={config.background?.backImageUrl || "/templates/acon-student-back.jpg"}
                    alt="Student Card Back Background"
                    className="absolute inset-0 w-full h-full object-fill pointer-events-none"
                  />

                  {/* 1. Top Info Block (Father Name, Mother Name, Address) - Draggable */}
                  <DraggableItem
                    id="backDetails"
                    defaultPos={{ x: 6, y: 7.2 }}
                    currentPos={config.positions?.backDetails}
                    isDesignerMode={isDesignerMode}
                    onPositionChange={onPositionChange}
                    label="Family Info"
                    isCentered={false}
                    cardRef={cardContainerRef}
                    className="w-[88%]"
                  >
                    <div className="space-y-0.5 text-[8.5px] font-semibold text-[#212f60]">
                      <div className="grid grid-cols-[74px_10px_1fr] items-baseline">
                        <span>Father Name</span>
                        <span>:</span>
                        <span className="font-bold">{card.fatherName || "(Late) L. Ibomacha Singh"}</span>
                      </div>
                      <div className="grid grid-cols-[74px_10px_1fr] items-baseline">
                        <span>Mother Name</span>
                        <span>:</span>
                        <span className="font-bold">{card.motherName || "Laikhuram (O) Bimola Devi"}</span>
                      </div>
                      <div className="grid grid-cols-[74px_10px_1fr] items-baseline">
                        <span>Address</span>
                        <span>:</span>
                        <span className="font-medium leading-tight">{card.address || "Kongba Kshetri Leikai, Imphal East."}</span>
                      </div>
                    </div>
                  </DraggableItem>

                  {/* 2. QR Code (Draggable) */}
                  <DraggableItem
                    id="qrCode"
                    defaultPos={{ x: 50, y: 36.7 }}
                    currentPos={config.positions?.qrCode}
                    isDesignerMode={isDesignerMode}
                    onPositionChange={onPositionChange}
                    label="QR Code"
                    isCentered={true}
                    cardRef={cardContainerRef}
                    onSnapChange={setIsCenterSnapped}
                  >
                    <div className="w-[68px] h-[68px] flex items-center justify-center">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                      ) : (
                        <QrIcon className="w-10 h-10 text-[#212f60]" />
                      )}
                    </div>
                  </DraggableItem>
                </div>
              ) : (
                /* STANDARD STAFF BACK */
                <div className="flex flex-col h-full justify-between p-2.5">
                  {/* Top Bar */}
                  <div
                    style={{ backgroundColor: secondaryColor }}
                    className="-mx-2.5 -mt-2.5 h-2 w-[calc(100%+20px)] mb-1.5"
                  />

                  {/* Info Grid */}
                  <div className="space-y-1 text-[8.5px] leading-tight">
                    {card.bloodGroup && (
                      <div className="flex justify-between border-b border-slate-100 pb-0.5">
                        <span className="font-semibold text-slate-500">Blood Group:</span>
                        <span className="font-bold text-red-600 font-mono">{card.bloodGroup}</span>
                      </div>
                    )}
                    {card.emergencyContact && (
                      <div className="flex justify-between border-b border-slate-100 pb-0.5">
                        <span className="font-semibold text-slate-500">Emergency:</span>
                        <span className="font-mono text-slate-800">{card.emergencyContact}</span>
                      </div>
                    )}
                    {card.issueDate && (
                      <div className="flex justify-between border-b border-slate-100 pb-0.5">
                        <span className="font-semibold text-slate-500">Issued On:</span>
                        <span className="text-slate-800">{formatDateDdMonYyyy(card.issueDate)}</span>
                      </div>
                    )}
                    {card.validUntil && (
                      <div className="flex justify-between border-b border-slate-100 pb-0.5">
                        <span className="font-semibold text-slate-500">Valid Upto:</span>
                        <span className="text-slate-800">{formatDateDdMonYyyy(card.validUntil)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span className="font-semibold text-slate-500">Serial No:</span>
                      <span className="font-mono text-slate-600">{card.cardSerialNo}</span>
                    </div>
                  </div>

                  {/* QR Code & Authorized Signatory Container */}
                  <div className="flex items-end justify-between border-t border-slate-100 pt-2 mt-auto">
                    <div className="flex flex-col items-center">
                      <div className="w-13 h-13 bg-white p-0.5 rounded border border-slate-200">
                        {qrDataUrl ? (
                          <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
                        ) : (
                          <QrIcon className="w-full h-full text-slate-400" />
                        )}
                      </div>
                      <span className="text-[6.5px] text-slate-400 mt-0.5">Scan to verify</span>
                    </div>

                    {/* Authorized Signatory Block */}
                    {config.signature?.enabled !== false && (
                      <div className="text-right flex flex-col items-end pb-0.5 max-w-[130px]">
                        {config.signature?.imageUrl ? (
                          <img
                            src={config.signature.imageUrl}
                            alt="Signature"
                            className="h-6 object-contain mb-0.5 max-w-[80px]"
                          />
                        ) : (
                          <div className="w-24 border-b border-slate-400 mb-1" />
                        )}
                        <span className="text-[7.5px] font-bold text-slate-800 leading-tight block">
                          {config.signature?.label || "Authorized Signatory"}
                        </span>
                        <span className="text-[6.5px] text-slate-400 font-medium leading-tight block">
                          Authorized Signatory
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bottom Bar */}
                  <div
                    style={{ backgroundColor: primaryColor }}
                    className="-mx-2.5 -mb-2.5 h-1.5 w-[calc(100%+20px)] mt-1.5"
                  />
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
