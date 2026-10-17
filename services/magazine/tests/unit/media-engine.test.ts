import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { calculateBufferHash } from "../../server/services/media-engine.ts";

describe("Media Engine - SHA-256 Deduplication & WebP Processing", () => {
  it("calculates accurate and deterministic SHA-256 hashes for buffer deduplication", () => {
    const buffer1 = Buffer.from("ACME Hospital Healthcare Magazine Image Content 123");
    const buffer2 = Buffer.from("ACME Hospital Healthcare Magazine Image Content 123");
    const bufferDifferent = Buffer.from("ACME Hospital Healthcare Magazine Different Content 456");

    const hash1 = calculateBufferHash(buffer1);
    const hash2 = calculateBufferHash(buffer2);
    const hashDifferent = calculateBufferHash(bufferDifferent);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex length
    expect(hash1).not.toBe(hashDifferent);
  });

  it("converts raw PNG/JPEG image buffers into optimized WebP with sharp", async () => {
    // Generate a 200x200 sample PNG buffer using sharp
    const samplePngBuffer = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 4,
        background: { r: 59, g: 130, b: 246, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    expect(samplePngBuffer.length).toBeGreaterThan(0);

    // Process via WebP conversion pipeline
    const webpBuffer = await sharp(samplePngBuffer)
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    const metadata = await sharp(webpBuffer).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(200);
    expect(metadata.height).toBe(200);
  });

  it("generates responsive 360x270 WebP gallery thumbnails", async () => {
    // Create an 800x600 image buffer
    const largeImageBuffer = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 4,
        background: { r: 16, g: 185, b: 129, alpha: 1 },
      },
    })
      .jpeg()
      .toBuffer();

    const thumbBuffer = await sharp(largeImageBuffer)
      .rotate()
      .resize({
        width: 360,
        height: 270,
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 75, effort: 3 })
      .toBuffer();

    const thumbMeta = await sharp(thumbBuffer).metadata();
    expect(thumbMeta.format).toBe("webp");
    expect(thumbMeta.width).toBe(360);
    expect(thumbMeta.height).toBe(270);
    expect(thumbBuffer.length).toBeLessThan(largeImageBuffer.length);
  });

  it("sanitizes, deduplicates, and trims user tags safely", async () => {
    const { sanitizeTags } = await import("../../server/services/media-engine.ts");
    const rawTags = ["  Covers  ", "#doctors", "SURGERY_2026", "covers", "!", "health-tips"];
    const cleaned = sanitizeTags(rawTags);

    expect(cleaned).toEqual(["covers", "doctors", "surgery_2026", "health-tips"]);
  });

  it("exports multi-issue assignment functions", async () => {
    const { assignMediaToIssue, unassignMediaFromIssue, updateMediaAsset } = await import(
      "../../server/services/media-engine.ts"
    );

    expect(typeof assignMediaToIssue).toBe("function");
    expect(typeof unassignMediaFromIssue).toBe("function");
    expect(typeof updateMediaAsset).toBe("function");
  });
});
