import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { optimizeImageIfApplicable } from "../../server/utils/upload.ts";

describe("Upload Utilities - Automatic WebP Optimization", () => {
  it("converts uploaded JPEG/PNG images to WebP with image/webp mimetype", async () => {
    const pngBuffer = await sharp({
      create: {
        width: 150,
        height: 150,
        channels: 4,
        background: { r: 240, g: 80, b: 80, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const mockFile = new File([pngBuffer], "student_certificate.png", { type: "image/png" });

    const result = await optimizeImageIfApplicable(mockFile);

    expect(result.isWebpConverted).toBe(true);
    expect(result.mimeType).toBe("image/webp");
    expect(result.buffer.length).toBeGreaterThan(0);

    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(150);
    expect(meta.height).toBe(150);
  });

  it("preserves non-image files such as PDFs in original format without WebP conversion", async () => {
    const pdfContent = "%PDF-1.4 sample pdf content for leave medical certificate";
    const pdfBuffer = Buffer.from(pdfContent);
    const mockFile = new File([pdfBuffer], "medical_proof.pdf", { type: "application/pdf" });

    const result = await optimizeImageIfApplicable(mockFile);

    expect(result.isWebpConverted).toBe(false);
    expect(result.mimeType).toBe("application/pdf");
    expect(result.buffer.toString()).toBe(pdfContent);
  });

  it("preserves SVG vector files without raster conversion", async () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" /></svg>';
    const svgBuffer = Buffer.from(svgContent);
    const mockFile = new File([svgBuffer], "college_seal.svg", { type: "image/svg+xml" });

    const result = await optimizeImageIfApplicable(mockFile);

    expect(result.isWebpConverted).toBe(false);
    expect(result.mimeType).toBe("image/svg+xml");
    expect(result.buffer.toString()).toBe(svgContent);
  });
});
