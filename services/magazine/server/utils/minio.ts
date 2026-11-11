import { Client } from 'minio';
import { Readable } from 'node:stream';
import { required } from '../config.ts';

export const MINIO_BUCKET = required('MINIO_BUCKET');
export const minioClient = new Client({
  endPoint: required('MINIO_ENDPOINT'), port: Number(process.env.MINIO_PORT || 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: required('MINIO_ACCESS_KEY'), secretKey: required('MINIO_SECRET_KEY'),
});
function checkKey(key: string) {
  if (!key.startsWith('magazine/') || key.includes('..')) throw new Error('Invalid Magazine object key');
}
export async function uploadToMinio(buffer: Buffer, key: string, contentType?: string) {
  checkKey(key);
  await minioClient.putObject(MINIO_BUCKET, key, buffer, buffer.length, { 'Content-Type': contentType || 'application/octet-stream' });
  return key;
}
export async function deleteFromMinio(key: string) {
  checkKey(key);
  await minioClient.removeObject(MINIO_BUCKET, key);
}
export async function getDocumentStream(key: string) {
  checkKey(key);
  try {
    const stat = await minioClient.statObject(MINIO_BUCKET, key);
    return { stream: Readable.toWeb(await minioClient.getObject(MINIO_BUCKET, key)),
      mimeType: stat.metaData?.['content-type'] || 'image/webp', filename: key.split('/').pop()! };
  } catch (error: any) {
    if (['NoSuchKey', 'NotFound', 'NoSuchObject'].includes(error.code)) return null;
    throw error;
  }
}
