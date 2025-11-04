// ========================================
// S3 File Storage Utilities
// ========================================
// AWS S3 integration for file uploads and retrieval

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.S3_BUCKET!;

/**
 * Upload a file to S3
 * @param file Buffer of the file to upload
 * @param key S3 key (path) where to store the file
 * @param contentType MIME type of the file
 * @returns The full S3 URL of the uploaded file
 */
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  try {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
      })
    );

    // Return the S3 URL
    return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('[S3 Upload Error]', error);
    throw new Error('Error al subir archivo a S3');
  }
}

/**
 * Get a pre-signed URL to download a file from S3
 * @param key S3 key (path) of the file
 * @param expiresIn URL expiration time in seconds (default: 5 minutes)
 * @returns Pre-signed URL
 */
export async function getSignedDownloadUrl(key: string, expiresIn = 300): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('[S3 Get URL Error]', error);
    throw new Error('Error al generar URL de descarga');
  }
}

/**
 * Delete a file from S3
 * @param key S3 key (path) of the file to delete
 */
export async function deleteFromS3(key: string): Promise<void> {
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
  } catch (error) {
    console.error('[S3 Delete Error]', error);
    throw new Error('Error al eliminar archivo de S3');
  }
}

/**
 * Check if S3 is configured
 * @returns true if S3 environment variables are set
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET
  );
}



