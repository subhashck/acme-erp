import crypto from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { and, desc, eq, ilike, inArray, notInArray, or, sql } from "drizzle-orm";
import { db } from "../db/client.ts";
import { magazineMedia, magazineIssueMedia, magazineIssues } from "../db/schema-magazine.ts";
import { uploadToMinio, deleteFromMinio } from "../utils/minio.ts";

export interface ProcessMediaOptions {
  fileBuffer: Buffer;
  originalName: string;
  mimeType: string;
  issueId?: number | null;
  issueIds?: number[];
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
  issueIds: number[];
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
 * 2. Automatically links existing deduplicated media to newly requested issues in magazine_issue_media.
 * 3. If new, compresses/converts raster images to WebP via Sharp and generates a lightweight thumbnail.
 * 4. Uploads optimized WebP assets to MinIO and records metadata in PostgreSQL.
 */
export async function processAndStoreMedia({
  fileBuffer,
  originalName,
  mimeType,
  issueId,
  issueIds,
  userId,
  tags,
}: ProcessMediaOptions): Promise<ProcessMediaResult> {
  const fileHash = calculateBufferHash(fileBuffer);
  const originalSize = fileBuffer.length;
  const cleanTags = sanitizeTags(tags);

  const targetIssueIds = new Set<number>();
  if (issueId && !isNaN(Number(issueId))) targetIssueIds.add(Number(issueId));
  if (Array.isArray(issueIds)) {
    for (const id of issueIds) {
      if (id && !isNaN(Number(id))) targetIssueIds.add(Number(id));
    }
  }

  // 1. Deduplication check in DB
  const [existing] = await db
    .select()
    .from(magazineMedia)
    .where(eq(magazineMedia.fileHash, fileHash))
    .limit(1);

  if (existing) {
    // If target issues specified, associate this existing media with those issues
    for (const tId of targetIssueIds) {
      await db
        .insert(magazineIssueMedia)
        .values({ issueId: tId, mediaId: existing.id })
        .onConflictDoNothing();
    }

    if (!existing.issueId && targetIssueIds.size > 0) {
      await db
        .update(magazineMedia)
        .set({ issueId: Array.from(targetIssueIds)[0] })
        .where(eq(magazineMedia.id, existing.id));
    }

    // Retrieve all linked issue IDs
    const linked = await db
      .select({ issueId: magazineIssueMedia.issueId })
      .from(magazineIssueMedia)
      .where(eq(magazineIssueMedia.mediaId, existing.id));

    const finalIssueIds = Array.from(
      new Set([
        ...(existing.issueId ? [existing.issueId] : []),
        ...linked.map((l) => l.issueId),
      ])
    );

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
      issueId: existing.issueId || (finalIssueIds[0] ?? null),
      issueIds: finalIssueIds,
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
  let thumbBuffer: Buffer | null = null;

  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString("hex");

  if (isSvg) {
    // Keep SVGs unrasterized
    finalBuffer = fileBuffer;
    finalMimeType = "image/svg+xml";
    finalFileName = `vector_${timestamp}_${randomSuffix}.svg`;
    mainObjectKey = `magazine/media/${finalFileName}`;
  } else {
    // Compress and convert raster images to modern high-efficiency WebP
    try {
      const img = sharp(fileBuffer);
      const metadata = await img.metadata();
      width = metadata.width ?? null;
      height = metadata.height ?? null;

      finalBuffer = await sharp(fileBuffer)
        .rotate()
        .webp({ quality: 84, effort: 4 })
        .toBuffer();

      finalMimeType = "image/webp";
      finalFileName = `med_${timestamp}_${randomSuffix}.webp`;
      mainObjectKey = `magazine/media/${finalFileName}`;

      // Create responsive thumbnail (360x270 aspect fit for media grid gallery)
      thumbBuffer = await sharp(fileBuffer)
        .rotate()
        .resize(360, 270, { fit: "cover", position: "center" })
        .webp({ quality: 78, effort: 3 })
        .toBuffer();

      thumbObjectKey = `magazine/media/thumb_${timestamp}_${randomSuffix}.webp`;
    } catch (err: any) {
      console.warn(`[Sharp Processing Fallback] Could not optimize image via sharp: ${err.message}. Storing original buffer.`);
      finalBuffer = fileBuffer;
      finalMimeType = mimeType || "application/octet-stream";
      const ext = path.extname(originalName) || ".bin";
      finalFileName = `raw_${timestamp}_${randomSuffix}${ext}`;
      mainObjectKey = `magazine/media/${finalFileName}`;
    }
  }

  // Upload to MinIO
  await uploadToMinio(finalBuffer, mainObjectKey, finalMimeType);

  if (thumbBuffer && thumbObjectKey) {
    await uploadToMinio(thumbBuffer, thumbObjectKey, "image/webp");
  }

  const publicUrl = `/api/public/magazine/images/${mainObjectKey}`;
  const publicThumbUrl = thumbObjectKey ? `/api/public/magazine/images/${thumbObjectKey}` : null;
  const fileSize = finalBuffer.length;

  const savingsPercentage = originalSize > 0
    ? Math.max(0, Math.round(((originalSize - fileSize) / originalSize) * 100))
    : 0;

  // 3. Store record in DB
  const primaryIssueId = targetIssueIds.size > 0 ? Array.from(targetIssueIds)[0] : (issueId || null);

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
      issueId: primaryIssueId,
      uploadedBy: userId || null,
    })
    .returning();

  for (const tId of targetIssueIds) {
    await db
      .insert(magazineIssueMedia)
      .values({ issueId: tId, mediaId: created.id })
      .onConflictDoNothing();
  }

  const finalIssueIds = Array.from(
    new Set([
      ...(created.issueId ? [created.issueId] : []),
      ...Array.from(targetIssueIds),
    ])
  );

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
    issueIds: finalIssueIds,
    isDuplicate: false,
    savingsPercentage,
  };
}

/**
 * List media assets with search, filtering by tags/issue, and pagination.
 * Supports multi-issue assignment queries and enriches each asset with assigned issues.
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
    conditions.push(
      or(
        eq(magazineMedia.issueId, issueId),
        sql`EXISTS (
          SELECT 1 FROM "magazine"."magazine_issue_media" "mim"
          WHERE "mim"."media_id" = "magazine_media"."id" AND "mim"."issue_id" = ${issueId}
        )`
      )
    );
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

  // Fetch issue links and issue details for all items in batch
  const mediaIds = items.map((i) => i.id);
  const mediaIssuesMap = new Map<number, { id: number; issueNo: string; title: string; slug: string }[]>();

  if (mediaIds.length > 0) {
    const issueLinks = await db
      .select({
        mediaId: magazineIssueMedia.mediaId,
        issueId: magazineIssueMedia.issueId,
        issueNo: magazineIssues.issueNo,
        title: magazineIssues.title,
        slug: magazineIssues.slug,
      })
      .from(magazineIssueMedia)
      .innerJoin(magazineIssues, eq(magazineIssues.id, magazineIssueMedia.issueId))
      .where(inArray(magazineIssueMedia.mediaId, mediaIds));

    for (const link of issueLinks) {
      const list = mediaIssuesMap.get(link.mediaId) || [];
      list.push({ id: link.issueId, issueNo: link.issueNo, title: link.title, slug: link.slug });
      mediaIssuesMap.set(link.mediaId, list);
    }
  }

  const data = items.map((item) => {
    const savingsPercentage = item.originalSize && item.originalSize > 0
      ? Math.max(0, Math.round(((item.originalSize - item.fileSize) / item.originalSize) * 100))
      : 0;

    const assignedIssues = mediaIssuesMap.get(item.id) || [];
    const assignedIssueIds = Array.from(
      new Set([
        ...(item.issueId ? [item.issueId] : []),
        ...assignedIssues.map((i) => i.id),
      ])
    );

    return {
      ...item,
      tags: (item.tags as string[]) || [],
      issueIds: assignedIssueIds,
      issues: assignedIssues,
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
 * Update media asset metadata (e.g. rename, update tags, or manage multi-issue assignments).
 */
export async function updateMediaAsset(
  id: number,
  updates: {
    originalName?: string;
    tags?: string[];
    issueId?: number | null;
    issueIds?: number[];
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

  if (updates.issueId !== undefined) {
    setValues.issueId = updates.issueId;
    if (updates.issueId) {
      await db
        .insert(magazineIssueMedia)
        .values({ issueId: updates.issueId, mediaId: id })
        .onConflictDoNothing();
    }
  }

  if (updates.issueIds !== undefined) {
    const cleanIds = Array.from(new Set(updates.issueIds.filter((i) => i && !isNaN(Number(i)))));
    if (cleanIds.length === 0) {
      await db.delete(magazineIssueMedia).where(eq(magazineIssueMedia.mediaId, id));
      setValues.issueId = null;
    } else {
      await db
        .delete(magazineIssueMedia)
        .where(
          and(
            eq(magazineIssueMedia.mediaId, id),
            notInArray(magazineIssueMedia.issueId, cleanIds)
          )
        );
      for (const iId of cleanIds) {
        await db
          .insert(magazineIssueMedia)
          .values({ issueId: iId, mediaId: id })
          .onConflictDoNothing();
      }
      setValues.issueId = cleanIds[0];
    }
  }

  if (Object.keys(setValues).length > 0) {
    setValues.updatedAt = new Date();
    await db
      .update(magazineMedia)
      .set(setValues)
      .where(eq(magazineMedia.id, id));
  }

  const [updated] = await db
    .select()
    .from(magazineMedia)
    .where(eq(magazineMedia.id, id))
    .limit(1);

  if (!updated) return null;

  // Retrieve assigned issues
  const issueLinks = await db
    .select({
      issueId: magazineIssueMedia.issueId,
      issueNo: magazineIssues.issueNo,
      title: magazineIssues.title,
      slug: magazineIssues.slug,
    })
    .from(magazineIssueMedia)
    .innerJoin(magazineIssues, eq(magazineIssues.id, magazineIssueMedia.issueId))
    .where(eq(magazineIssueMedia.mediaId, id));

  const assignedIssueIds = Array.from(
    new Set([
      ...(updated.issueId ? [updated.issueId] : []),
      ...issueLinks.map((i) => i.issueId),
    ])
  );

  const savingsPercentage = updated.originalSize && updated.originalSize > 0
    ? Math.max(0, Math.round(((updated.originalSize - updated.fileSize) / updated.originalSize) * 100))
    : 0;

  return {
    ...updated,
    tags: (updated.tags as string[]) || [],
    issueIds: assignedIssueIds,
    issues: issueLinks.map((i) => ({ id: i.issueId, issueNo: i.issueNo, title: i.title, slug: i.slug })),
    savingsPercentage,
  };
}

/**
 * Assign an existing media asset to an issue.
 */
export async function assignMediaToIssue(mediaId: number, issueId: number) {
  await db
    .insert(magazineIssueMedia)
    .values({ issueId, mediaId })
    .onConflictDoNothing();

  await db
    .update(magazineMedia)
    .set({ issueId })
    .where(and(eq(magazineMedia.id, mediaId), sql`"issue_id" IS NULL`));
}

/**
 * Unassign a media asset from an issue.
 */
export async function unassignMediaFromIssue(mediaId: number, issueId: number) {
  await db
    .delete(magazineIssueMedia)
    .where(and(eq(magazineIssueMedia.mediaId, mediaId), eq(magazineIssueMedia.issueId, issueId)));

  const [other] = await db
    .select({ issueId: magazineIssueMedia.issueId })
    .from(magazineIssueMedia)
    .where(eq(magazineIssueMedia.mediaId, mediaId))
    .limit(1);

  await db
    .update(magazineMedia)
    .set({ issueId: other ? other.issueId : null })
    .where(and(eq(magazineMedia.id, mediaId), eq(magazineMedia.issueId, issueId)));
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
