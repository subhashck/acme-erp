import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.resolve("uploads/leave-docs");

/** Ensure the upload directory exists. */
async function ensureUploadDir() {
  await mkdir(UPLOAD_DIR, { recursive: true });
}

/**
 * Save an uploaded File blob to disk.
 * Returns the relative path stored in the DB (e.g. `uploads/leave-docs/LV-ABC12-report.pdf`).
 */
export async function saveLeaveDocument(file: File, requestNo: string): Promise<string> {
  await ensureUploadDir();

  // Sanitise filename: strip path separators, keep extension
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${requestNo}-${safeName}`;
  const fullPath = path.join(UPLOAD_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buffer);

  // Return a relative path so it stays portable
  return `uploads/leave-docs/${filename}`;
}

/**
 * Resolve a stored relative path to an absolute filesystem path.
 */
export function resolveUploadPath(relativePath: string): string {
  return path.resolve(relativePath);
}
