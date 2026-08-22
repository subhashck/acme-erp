import path from "node:path";
import { lookup as mimeLookup } from "mime-types";
import { uploadToMinio, getFromMinio, deleteFromMinio } from "./minio.ts";

/**
 * Save an uploaded leave supporting document file to MinIO.
 * Returns the object key stored in the DB (e.g. `leave-docs/LV-20260222-document.pdf`).
 */
export async function saveLeaveDocument(file: File, requestNo: string): Promise<string> {
  // Sanitise filename: strip path separators and unusual characters, keep extension
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectKey = `leave-docs/${requestNo}-${safeName}`;

  await uploadToMinio(file, objectKey, file.type);
  return objectKey;
}

/**
 * Save an uploaded student document to MinIO.
 * Returns the object key stored in the DB (e.g. `student-docs/STU-12-certificate-mark_sheet.pdf`).
 */
export async function saveStudentDocument(
  file: File,
  studentId: number | string,
  docType: string
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeDocType = docType.replace(/[^a-zA-Z0-9._-]/g, "_");
  const timestamp = Date.now();
  const objectKey = `student-docs/STU-${studentId}-${safeDocType}-${timestamp}-${safeName}`;

  await uploadToMinio(file, objectKey, file.type);
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
