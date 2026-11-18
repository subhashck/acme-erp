/**
 * ID Card High-Resolution PNG Generator Engine
 * Generates ultra-crisp (300+ DPI equivalent) PNGs for CR80 PVC Cards
 */
import { toast } from "sonner";
import type { CardRenderData } from "./id-card-pdf";

export interface PngCaptureResult {
  blob: Blob;
  dataUrl: string;
  filename: string;
}

/**
 * Capture an HTML DOM element as a high-resolution PNG Blob
 * Uses scale: 4 for crisp 300+ DPI physical print resolution
 */
export async function captureElementToPng(
  element: HTMLElement,
  scale: number = 4
): Promise<Blob> {
  const html2canvas = (await import("html2canvas-pro")).default;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
    imageTimeout: 15000,
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to convert card canvas to PNG blob"));
    }, "image/png");
  });
}

/**
 * Capture an HTML DOM element as a high-resolution base64 PNG data URL
 * Perfect for embedding directly into jsPDF (doc.addImage(dataUrl, 'PNG', ...))
 */
export async function captureElementToDataUrl(
  element: HTMLElement,
  scale: number = 4
): Promise<string> {
  const html2canvas = (await import("html2canvas-pro")).default;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    logging: false,
    imageTimeout: 15000,
  });

  return canvas.toDataURL("image/png");
}

/**
 * Ensure all <img> tags inside an element have finished loading/decoding
 */
export async function ensureElementImagesLoaded(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );
}

/**
 * Helper to trigger automatic browser download of a Blob
 */
export function downloadPngBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Combine two HTML elements (Front and Back) into a single composite side-by-side PNG
 */
export async function createCompositeSideBySidePng(
  frontCanvas: HTMLCanvasElement,
  backCanvas: HTMLCanvasElement,
  gapPx: number = 40
): Promise<Blob> {
  const totalWidth = frontCanvas.width + backCanvas.width + gapPx;
  const maxHeight = Math.max(frontCanvas.height, backCanvas.height);
  const paddingY = 20;
  const totalHeight = maxHeight + paddingY * 2;

  const compositeCanvas = document.createElement("canvas");
  compositeCanvas.width = totalWidth;
  compositeCanvas.height = totalHeight;

  const ctx = compositeCanvas.getContext("2d");
  if (!ctx) throw new Error("Could not acquire 2D context for composite image");

  // Transparent background
  ctx.clearRect(0, 0, totalWidth, totalHeight);

  // Draw Front on left
  const frontY = paddingY + (maxHeight - frontCanvas.height) / 2;
  ctx.drawImage(frontCanvas, 0, frontY);

  // Draw Back on right
  const backY = paddingY + (maxHeight - backCanvas.height) / 2;
  ctx.drawImage(backCanvas, frontCanvas.width + gapPx, backY);

  return new Promise<Blob>((resolve, reject) => {
    compositeCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export composite PNG"));
    }, "image/png");
  });
}

/**
 * Format a safe sanitized filename for ID card PNG export
 */
export function formatCardPngFilename(
  card: CardRenderData,
  suffix: string = "front"
): string {
  const cleanName = (card.name || "ID_Card")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_");
  const cleanCode = (card.code || card.cardSerialNo || "card")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${cleanName}_${cleanCode}_${suffix}.png`;
}
