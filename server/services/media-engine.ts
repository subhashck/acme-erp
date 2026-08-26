import crypto from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import { magazineMedia } from "../db/schema-magazine.ts";
import { uploadToMinio, deleteFromMinio } from "../utils/minio.ts";

export interface ProcessMediaOptions {
  fileBuffer: Buffer;
  originalName: string;
  mimeType: string;
  issueId?: number | null;
  userId?: string | null;
  tags?: string[];
}

export interface ProcessMediaResult {
  id: number;
  fileHash: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  originalSize: number;
  width: number | null;
  height: number | null;
  objectKey: string;
  thumbnailKey: string | null;
  url: string;
  thumbnailUrl: string | null;
  tags: string[];
  issueId: number | null;
  isDuplicate: boolean;
  savingsPercentage: number;
}

/**
 * Normalizes and sanitizes a list of tag strings.
 */
export function sanitizeTags(tags?: string[]): string[] {
  if (!Array.isArray(tags)) return [];
  const set = new Set<string>();
  for (const t of tags) {
    if (typeof t === "string") {
      const clean = t.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
      if (clean.length > 0) {
        set.add(clean);
      }
    }
  }
  return Array.from(set).slice(0, 15);
}

/**
 * Calculates SHA-256 hash of a file buffer.
 */
export function calculateBufferHash(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Processes an uploaded image:
 * 1. Checks SHA-256 hash to deduplicate existing files (0 bytes uploaded to MinIO if duplicate).
 * 2. If new, compresses/converts raster images to WebP via Sharp and generates a lightweight thumbnail.
 * 3. Uploads optimized WebP assets to MinIO and records metadata in PostgreSQL.
 */
export async function processAndStoreMedia({
  fileBuffer,
  originalName,
  mimeType,
  issueId,
  userId,
  tags,
}: ProcessMediaOptions): Promise<ProcessMediaResult> {
  const fileHash = calculateBufferHash(fileBuffer);
  const originalSize = fileBuffer.length;
  const cleanTags = sanitizeTags(tags);

  // 1. Deduplication check in DB
  const [existing] = await db
    .select()
    .from(magazineMedia)
    .where(eq(magazineMedia.fileHash, fileHash))
    .limit(1);

  if (existing) {
    const savingsPercentage = existing.originalSize && existing.originalSize > 0
      ? Math.max(0, Math.round(((existing.originalSize - existing.fileSize) / existing.originalSize) * 100))
      : 0;

    return {
      id: existing.id,
      fileHash: existing.fileHash,
      fileName: existing.fileName,
      originalName: existing.originalName,
      mimeType: existing.mimeType,
      fileSize: existing.fileSize,
      originalSize: existing.originalSize ?? existing.fileSize,
      width: existing.width,
      height: existing.height,
      objectKey: existing.objectKey,
      thumbnailKey: existing.thumbnailKey,
      url: existing.url,
      thumbnailUrl: existing.thumbnailUrl,
      tags: (existing.tags as string[]) || [],
      issueId: existing.issueId,
      isDuplicate: true,
      savingsPercentage,
    };
  }

  // 2. Process image according to format
  const isSvg = mimeType === "image/svg+xml" || originalName.toLowerCase().endsWith(".svg");

  let finalBuffer: Buffer;
  let finalMimeType: string;
  let finalFileName: string;
  let mainObjectKey: string;
  let thumbObjectKey: string | null = null;
  let width: number | null = null;
  let height: number | null = null;

  const baseName = path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  const shortHash = fileHash.slice(0, 10);

  if (isSvg) {
    // Preserve SVG vector format
    finalBuffer = fileBuffer;
    finalMimeType = "image/svg+xml";
    finalFileName = `${baseName}_${shortHash}.svg`;
    mainObjectKey = `magazine/media/${shortHash}/${finalFileName}`;

    await uploadToMinio(finalBuffer, mainObjectKey, finalMimeType);
  } else {
    // Process raster image with Sharp into optimized WebP
    const imageInstance = sharp(fileBuffer).rotate(); // Auto-orient based on EXIF
    const metadata = await imageInstance.metadata();

    width = metadata.width ?? null;
    height = metadata.height ?? null;

    // Convert full image to WebP (max 2400px bounding box for high-density displays)
    finalBuffer = await sharp(fileBuffer)
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    // Read updated dimensions if resized
    const processedMeta = await sharp(finalBuffer).metadata();
    width = processedMeta.width ?? width;
    height = processedMeta.height ?? height;

    finalMimeType = "image/webp";
    finalFileName = `${baseName}_${shortHash}.webp`;
    mainObjectKey = `magazine/media/${shortHash}/${finalFileName}`;

    // Generate responsive 360x270 thumbnail for fast media gallery browsing
    const thumbBuffer = await sharp(fileBuffer)
      .rotate()
      .resize({
        width: 360,
        height: 270,
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 75, effort: 3 })
      .toBuffer();

    thumbObjectKey = `magazine/media/${shortHash}/${baseName}_${shortHash}_thumb.webp`;

    // Upload full WebP image and thumbnail to MinIO
    await uploadToMinio(finalBuffer, mainObjectKey, finalMimeType);
    await uploadToMinio(thumbBuffer, thumbObjectKey, "image/webp");
  }

  const publicUrl = `/api/public/magazine/images/${encodeURIComponent(mainObjectKey)}`;
  const publicThumbUrl = thumbObjectKey
    ? `/api/public/magazine/images/${encodeURIComponent(thumbObjectKey)}`
    : publicUrl;

  const fileSize = finalBuffer.length;
  const savingsPercentage = originalSize > 0
    ? Math.max(0, Math.round(((originalSize - fileSize) / originalSize) * 100))
    : 0;

  // 3. Store record in DB
  const [created] = await db
    .insert(magazineMedia)
    .values({
      fileHash,
      fileName: finalFileName,
      originalName,
      mimeType: finalMimeType,
      fileSize,
      originalSize,
      width,
      height,
      objectKey: mainObjectKey,
      thumbnailKey: thumbObjectKey,
      url: publicUrl,
      thumbnailUrl: publicThumbUrl,
      tags: cleanTags,
      issueId: issueId || null,
      uploadedBy: userId || null,
    })
    .returning();

  return {
    id: created.id,
    fileHash: created.fileHash,
    fileName: created.fileName,
    originalName: created.originalName,
    mimeType: created.mimeType,
    fileSize: created.fileSize,
    originalSize: created.originalSize ?? originalSize,
    width: created.width,
    height: created.height,
    objectKey: created.objectKey,
    thumbnailKey: created.thumbnailKey,
    url: created.url,
    thumbnailUrl: created.thumbnailUrl,
    tags: (created.tags as string[]) || [],
    issueId: created.issueId,
    isDuplicate: false,
    savingsPercentage,
  };
}

/**
 * List media assets with search, filtering by tags/issue, and pagination.
 */
export async function listMediaAssets({
  page = 1,
  pageSize = 24,
  search,
  tag,
  issueId,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  tag?: string;
  issueId?: number;
}) {
  const offset = (page - 1) * pageSize;
  const conditions: any[] = [];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(magazineMedia.originalName, term),
        ilike(magazineMedia.fileName, term),
        sql`${magazineMedia.tags}::text ILIKE ${term}`
      )
    );
  }

  if (tag && tag.trim()) {
    const cleanTag = tag.trim().toLowerCase();
    conditions.push(sql`${magazineMedia.tags} @> ${JSON.stringify([cleanTag])}::jsonb`);
  }

  if (issueId) {
    conditions.push(eq(magazineMedia.issueId, issueId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(magazineMedia)
    .where(whereClause);

  const items = await db
    .select()
    .from(magazineMedia)
    .where(whereClause)
    .orderBy(desc(magazineMedia.createdAt))
    .limit(pageSize)
    .offset(offset);

  const data = items.map((item) => {
    const savingsPercentage = item.originalSize && item.originalSize > 0
      ? Math.max(0, Math.round(((item.originalSize - item.fileSize) / item.originalSize) * 100))
      : 0;

    return {
      ...item,
      tags: (item.tags as string[]) || [],
      savingsPercentage,
    };
  });

  return {
    data,
    pagination: {
      page,
      pageSize,
      totalRecords: count,
      totalPages: Math.ceil(count / pageSize) || 1,
    },
  };
}

/**
 * Update media asset metadata (e.g. rename or update tags).
 */
export async function updateMediaAsset(
  id: number,
  updates: {
    originalName?: string;
    tags?: string[];
  }
) {
  const setValues: Record<string, any> = {};

  if (updates.originalName !== undefined) {
    const trimmed = updates.originalName.trim();
    if (trimmed.length > 0) {
      setValues.originalName = trimmed;
    }
  }

  if (updates.tags !== undefined) {
    setValues.tags = sanitizeTags(updates.tags);
  }

  if (Object.keys(setValues).length === 0) {
    const [existing] = await db
      .select()
      .from(magazineMedia)
      .where(eq(magazineMedia.id, id))
      .limit(1);
    return existing || null;
  }

  setValues.updatedAt = new Date();

  const [updated] = await db
    .update(magazineMedia)
    .set(setValues)
    .where(eq(magazineMedia.id, id))
    .returning();

  if (!updated) return null;

  const savingsPercentage = updated.originalSize && updated.originalSize > 0
    ? Math.max(0, Math.round(((updated.originalSize - updated.fileSize) / updated.originalSize) * 100))
    : 0;

  return {
    ...updated,
    tags: (updated.tags as string[]) || [],
    savingsPercentage,
  };
}

/**
 * Retrieves all unique tags currently in use across all media assets.
 */
export async function getAllMediaTags(): Promise<string[]> {
  const result = await db.execute(
    sql`SELECT DISTINCT jsonb_array_elements_text(tags) AS tag FROM "magazine"."magazine_media" ORDER BY tag ASC`
  );

  return (result.rows as any[])
    .map((r) => r.tag)
    .filter((t): t is string => typeof t === "string" && t.trim().length > 0);
}

/**
 * Delete a media asset from both DB and MinIO.
 */
export async function deleteMediaAsset(id: number): Promise<boolean> {
  const [target] = await db
    .select()
    .from(magazineMedia)
    .where(eq(magazineMedia.id, id))
    .limit(1);

  if (!target) return false;

  // Clean up MinIO objects (ignore errors if object was already deleted)
  try {
    if (target.objectKey) await deleteFromMinio(target.objectKey);
    if (target.thumbnailKey) await deleteFromMinio(target.thumbnailKey);
  } catch (err) {
    console.warn(`[MinIO Cleanup Warning] Failed to remove objects for media #${id}:`, err);
  }

  await db.delete(magazineMedia).where(eq(magazineMedia.id, id));
  return true;
}
