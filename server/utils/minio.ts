import * as Minio from "minio";
// import { Readable } from "node:stream";

const endpoint = process.env.MINIO_ENDPOINT || "localhost";
const port = process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT, 10) : 9000;
const useSSL = process.env.MINIO_USE_SSL === "true";
const accessKey = process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || "minioadmin";
const secretKey = process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || "miniopassword";
export const MINIO_BUCKET = process.env.MINIO_BUCKET || "acme-erp";

export const minioClient = new Minio.Client({
  endPoint: endpoint,
  port: port,
  useSSL: useSSL,
  accessKey: accessKey,
  secretKey: secretKey,
});

let bucketChecked = false;

/**
 * Ensure the default MinIO bucket exists.
 */
export async function ensureBucketExists(bucket: string = MINIO_BUCKET): Promise<void> {
  if (bucketChecked) return;
  try {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket);
    }
    bucketChecked = true;
  } catch (err) {
    console.error(`[MinIO] Error verifying or creating bucket "${bucket}":`, err);
    throw err;
  }
}

/**
 * Upload a File, Buffer, or Stream to MinIO.
 * Returns the object path/key within the bucket (e.g. `leave-docs/LV-2026-0001-report.pdf`).
 */
export async function uploadToMinio(
  file: File | Buffer,
  objectKey: string,
  contentType?: string
): Promise<string> {
  await ensureBucketExists();

  let buffer: Buffer;
  let size: number;
  let detectedType = contentType;

  if (file instanceof File) {
    buffer = Buffer.from(await file.arrayBuffer());
    size = file.size;
    if (!detectedType) {
      detectedType = file.type || undefined;
    }
  } else {
    buffer = file;
    size = buffer.length;
  }

  const metaData: Record<string, string> = {};
  if (detectedType) {
    metaData["Content-Type"] = detectedType;
  }

  await minioClient.putObject(MINIO_BUCKET, objectKey, buffer, size, metaData);
  return objectKey;
}

/**
 * Fetch an object readable stream from MinIO.
 */
export async function getFromMinio(
  objectKey: string,
  bucket: string = MINIO_BUCKET
): Promise<NodeJS.ReadableStream> {
  await ensureBucketExists(bucket);
  return await minioClient.getObject(bucket, objectKey);
}

/**
 * Delete an object from MinIO.
 */
export async function deleteFromMinio(
  objectKey: string,
  bucket: string = MINIO_BUCKET
): Promise<void> {
  await ensureBucketExists(bucket);
  await minioClient.removeObject(bucket, objectKey);
}
