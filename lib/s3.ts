// ========================================
// S3 File Storage Utilities
// ========================================
// AWS S3 integration for file uploads and retrieval
// Optimized for production with better error handling
// Fallback to local filesystem in development when S3 is not configured

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { promises as fs } from 'fs';
import path from 'path';

const BUCKET_NAME = process.env.S3_BUCKET;

// Local storage configuration (only used in development)
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const LOCAL_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

// Create S3 client only if configured (lazy initialization)
function getS3Client(): S3Client | null {
  if (!isS3Configured()) {
    return null;
  }

  return new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
    // Retry configuration for production reliability
    maxAttempts: 3,
  });
}

// Helper: Extract meaningful error message from AWS SDK errors
function getS3ErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error) {
    const awsError = error as { name: string; message?: string };
    switch (awsError.name) {
      case 'NoSuchBucket':
        return 'El bucket de S3 no existe';
      case 'AccessDenied':
        return 'Acceso denegado a S3. Verifica permisos IAM';
      case 'InvalidAccessKeyId':
        return 'Las credenciales de AWS son inválidas';
      case 'SignatureDoesNotMatch':
        return 'La firma de AWS no coincide. Verifica las credenciales';
      case 'NetworkingError':
        return 'Error de red al conectar con S3';
      default:
        return awsError.message || 'Error desconocido en S3';
    }
  }
  return 'Error al interactuar con S3';
}

// ========================================
// Local Storage Helpers (Development Fallback)
// ========================================

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('[Local Storage] Error creando directorio de uploads:', error);
    throw new Error('Error al crear directorio de uploads local');
  }
}

/**
 * Upload file to local filesystem (development fallback)
 */
async function uploadToLocal(
  file: Buffer,
  key: string
): Promise<string> {
  await ensureUploadDir();
  
  const filePath = path.join(LOCAL_UPLOAD_DIR, key);
  const dirPath = path.dirname(filePath);
  
  // Create subdirectories if needed
  await fs.mkdir(dirPath, { recursive: true });
  
  await fs.writeFile(filePath, file);
  
  // Return URL for local development
  return `${LOCAL_BASE_URL}/api/uploads/${key}`;
}

/**
 * Get local file URL (development fallback)
 */
function getLocalFileUrl(key: string): string {
  return `${LOCAL_BASE_URL}/api/uploads/${key}`;
}

/**
 * Delete file from local filesystem (development fallback)
 */
async function deleteFromLocal(key: string): Promise<void> {
  const filePath = path.join(LOCAL_UPLOAD_DIR, key);
  
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // Ignore if file doesn't exist (idempotent operation)
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('[Local Storage] Error eliminando archivo:', error);
      throw new Error('Error al eliminar archivo local');
    }
  }
}

/**
 * Upload a file to S3 (or local storage in development)
 * @param file Buffer of the file to upload
 * @param key S3 key (path) where to store the file
 * @param contentType MIME type of the file
 * @returns The full URL of the uploaded file (S3 or local)
 */
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  // Fallback to local storage in development
  if (!isS3Configured()) {
    console.warn('[S3] S3 no configurado. Usando almacenamiento local (desarrollo):', key);
    return uploadToLocal(file, key);
  }

  const s3Client = getS3Client();
  if (!s3Client || !BUCKET_NAME) {
    throw new Error('S3 client no disponible');
  }

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
    const errorMessage = getS3ErrorMessage(error);
    console.error('[S3 Upload Error]', errorMessage, error);
    throw new Error(errorMessage);
  }
}

/**
 * Get a pre-signed URL to download a file from S3 (or local URL in development)
 * @param key S3 key (path) of the file
 * @param expiresIn URL expiration time in seconds (default: 5 minutes) - ignored in local mode
 * @returns Pre-signed URL (or local URL in development)
 */
export async function getSignedDownloadUrl(key: string, expiresIn = 300): Promise<string> {
  // Fallback to local storage in development
  if (!isS3Configured()) {
    return getLocalFileUrl(key);
  }

  const s3Client = getS3Client();
  if (!s3Client || !BUCKET_NAME) {
    throw new Error('S3 client no disponible');
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    const errorMessage = getS3ErrorMessage(error);
    console.error('[S3 Get URL Error]', errorMessage, error);
    throw new Error(errorMessage);
  }
}

/**
 * Download a file from S3 as Buffer (or local storage in development)
 * @param key S3 key (path) of the file
 * @returns File content as Buffer
 */
export async function downloadFromS3(key: string): Promise<Buffer> {
  // Fallback to local storage in development
  if (!isS3Configured()) {
    const filePath = path.join(LOCAL_UPLOAD_DIR, key);
    try {
      const fileBuffer = await fs.readFile(filePath);
      return fileBuffer;
    } catch (error) {
      console.error('[Local Storage] Error leyendo archivo:', error);
      throw new Error('Archivo no encontrado en almacenamiento local');
    }
  }

  const s3Client = getS3Client();
  if (!s3Client || !BUCKET_NAME) {
    throw new Error('S3 client no disponible');
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('Respuesta de S3 sin contenido');
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    const errorMessage = getS3ErrorMessage(error);
    console.error('[S3 Download Error]', errorMessage, error);
    throw new Error(errorMessage);
  }
}

/**
 * Delete a file from S3 (or local storage in development)
 * @param key S3 key (path) of the file to delete
 */
export async function deleteFromS3(key: string): Promise<void> {
  // Fallback to local storage in development
  if (!isS3Configured()) {
    await deleteFromLocal(key);
    return;
  }

  const s3Client = getS3Client();
  if (!s3Client || !BUCKET_NAME) {
    throw new Error('S3 client no disponible');
  }

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
  } catch (error) {
    const errorMessage = getS3ErrorMessage(error);
    console.error('[S3 Delete Error]', errorMessage, error);
    throw new Error(errorMessage);
  }
}


