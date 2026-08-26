import path from "node:path";
import { lookup as mimeLookup } from "mime-types";
import sharp from "sharp";
import { uploadToMinio, getFromMinio, deleteFromMinio } from "./minio.ts";

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/tiff",
  "image/avif",
  "image/bmp",
];

/**
 * Checks if a file is an image and converts it into compressed WebP format.
 * Non-image files (PDFs, DOCX, ZIPs, SVGs) are preserved in their native format.
 */
export async function optimizeImageIfApplicable(file: File): Promise<{
  buffer: Buffer;
  mimeType: string;
  isWebpConverted: boolean;
}> {
  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name).toLowerCase();
  const isImage =
    IMAGE_MIME_TYPES.includes(file.type) ||
    /\.(jpe?g|png|gif|tiff?|avif|bmp)$/i.test(ext);

  // Preserve vector SVGs and non-image document formats
  if (!isImage || file.type === "image/svg+xml" || ext === ".svg") {
    return {
      buffer: rawBuffer,
      mimeType: file.type || (mimeLookup(ext) as string) || "application/octet-stream",
      isWebpConverted: false,
    };
  }

  try {
    const webpBuffer = await sharp(rawBuffer)
      .rotate() // Auto-orient based on EXIF tags
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    return {
      buffer: webpBuffer,
      mimeType: "image/webp",
      isWebpConverted: true,
    };
  } catch (err) {
    console.warn(
      `[Image Optimization Warning] Could not convert "${file.name}" to WebP, saving original:`,
      err
    );
    return {
      buffer: rawBuffer,
      mimeType: file.type || "application/octet-stream",
      isWebpConverted: false,
    };
  }
}

/**
 * Save an uploaded leave supporting document file to MinIO.
 * Images are automatically converted and saved as space-saving WebP.
 * Returns the object key stored in the DB (e.g. `leave-docs/LV-20260222-document.webp` or `...document.pdf`).
 */
export async function saveLeaveDocument(file: File, requestNo: string): Promise<string> {
  const { buffer, mimeType, isWebpConverted } = await optimizeImageIfApplicable(file);

  let safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (isWebpConverted) {
    const parsed = path.parse(safeName);
    safeName = `${parsed.name}.webp`;
  }
  const objectKey = `leave-docs/${requestNo}-${safeName}`;

  await uploadToMinio(buffer, objectKey, mimeType);
  return objectKey;
}

/**
 * Save an uploaded student document to MinIO.
 * Images (certificates, ID cards, photos) are automatically converted and saved as space-saving WebP.
 * Returns the object key stored in the DB (e.g. `student-docs/STU-12-certificate-mark_sheet.webp` or `...pdf`).
 */
export async function saveStudentDocument(
  file: File,
  studentId: number | string,
  docType: string
): Promise<string> {
  const { buffer, mimeType, isWebpConverted } = await optimizeImageIfApplicable(file);

  let safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  if (isWebpConverted) {
    const parsed = path.parse(safeName);
    safeName = `${parsed.name}.webp`;
  }
  const safeDocType = docType.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const objectKey = `student-docs/STU-${studentId}-${safeDocType}-${timestamp}-${safeName}`;

  await uploadToMinio(buffer, objectKey, mimeType);
  return objectKey;
}

/**
 * Retrieve a readable stream for any stored document directly from MinIO.
 */
export async function getDocumentStream(objectKey: string): Promise<{
  stream: NodeJS.ReadableStream;
  mimeType: string;
  filename: string;
} | null> {
  const filename = path.basename(objectKey);
  const ext = path.extname(filename).toLowerCase();
  const mimeType = (mimeLookup(ext) as string | false) || "application/octet-stream";

  try {
    const minioStream = await getFromMinio(objectKey);
    return {
      stream: minioStream,
      mimeType,
      filename,
    };
  } catch (err: any) {
    console.error(`[MinIO] Failed to retrieve document "${objectKey}":`, err);
    return null;
  }
}

/**
 * Alias for retrieving leave document stream.
 */
export const getLeaveDocumentStream = getDocumentStream;

/**
 * Delete a document from MinIO.
 */
export async function deleteDocument(objectKey: string): Promise<void> {
  await deleteFromMinio(objectKey);
}

/**
 * Alias for deleting leave document.
 */
export const deleteLeaveDocument = deleteDocument;
