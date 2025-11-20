// ========================================
// Object Storage Utilities
// ========================================
// Hetzner Object Storage integration (S3-compatible API)
// Optimized for production with better error handling
// Fallback to local filesystem in development when Object Storage is not configured

import { promises as fs } from 'fs';
import { Readable } from 'node:stream';
import path from 'path';

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';


const BUCKET_NAME = process.env.STORAGE_BUCKET;

// Local storage configuration (only used in development)
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const LOCAL_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Check if Object Storage is configured
 * @returns true if Object Storage environment variables are set
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.STORAGE_ENDPOINT &&
    process.env.STORAGE_REGION &&
    process.env.STORAGE_ACCESS_KEY &&
    process.env.STORAGE_SECRET_KEY &&
    process.env.STORAGE_BUCKET
  );
}

/**
 * True if cloud storage flag is enabled and credentials exist
 */
export function shouldUseCloudStorage(): boolean {
  return process.env.ENABLE_CLOUD_STORAGE === 'true' && isS3Configured();
}

// Create S3-compatible client for Hetzner Object Storage (lazy initialization)
function getS3Client(): S3Client | null {
  if (!isS3Configured()) {
    return null;
  }

  const endpoint = process.env.STORAGE_ENDPOINT!.trim();
  const region = process.env.STORAGE_REGION!.trim();

  // Validar formato del endpoint
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    console.error('[Storage] STORAGE_ENDPOINT debe incluir el protocolo (https://)');
    throw new Error('STORAGE_ENDPOINT debe incluir el protocolo (https://)');
  }

  // Normalizar endpoint (remover trailing slash)
  const normalizedEndpoint = endpoint.replace(/\/$/, '');

  return new S3Client({
    region: region,
    endpoint: normalizedEndpoint,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY!.trim(),
      secretAccessKey: process.env.STORAGE_SECRET_KEY!.trim(),
    },
    // Force path style for Hetzner compatibility (required for custom endpoints)
    // Hetzner Object Storage requiere path style: https://endpoint.com/bucket/key
    forcePathStyle: true,
    // Retry configuration for production reliability
    maxAttempts: 3,
  });
}

// Helper: Extract meaningful error message from S3-compatible API errors
function getS3ErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'name' in error) {
    const storageError = error as { name: string; message?: string };
    switch (storageError.name) {
      case 'NoSuchBucket':
        return 'El bucket no existe en Hetzner Object Storage';
      case 'AccessDenied':
        return 'Acceso denegado. Verifica las credenciales de Hetzner';
      case 'InvalidAccessKeyId':
        return 'Las credenciales de acceso son inválidas';
      case 'SignatureDoesNotMatch':
        return 'La firma no coincide. Verifica las credenciales';
      case 'NetworkingError':
        return 'Error de red al conectar con Object Storage';
      default:
        return storageError.message || 'Error desconocido en Object Storage';
    }
  }
  return 'Error al interactuar con Object Storage';
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

type UploadBody = Buffer | Uint8Array | string | Readable;

function isReadable(body: UploadBody): body is Readable {
  return typeof (body as Readable).pipe === 'function';
}

async function ensureBuffer(body: UploadBody): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body);
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (isReadable(body)) {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  return Buffer.alloc(0);
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
 * Upload a file to Object Storage (or local storage in development)
 * @param file Buffer of the file to upload
 * @param key Object key (path) where to store the file
 * @param contentType MIME type of the file
 * @returns The full URL of the uploaded file (Object Storage or local)
 */
export async function uploadToS3(
  file: UploadBody,
  key: string,
  contentType: string
): Promise<string> {
  // Fallback to local storage in development
  if (!isS3Configured()) {
    console.warn('[Storage] Object Storage no configurado. Usando almacenamiento local (desarrollo):', key);
    const buffer = await ensureBuffer(file);
    return uploadToLocal(buffer, key);
  }

  const s3Client = getS3Client();
  if (!s3Client || !BUCKET_NAME) {
    throw new Error('Object Storage client no disponible');
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

    // Return the Object Storage URL (Hetzner format with path style)
    // Format: https://{endpoint}/{bucket}/{key}
    // IMPORTANTE: Con forcePathStyle: true, Hetzner requiere este formato
    const endpoint = process.env.STORAGE_ENDPOINT!.trim().replace(/\/$/, ''); // Remove trailing slash if present
    const url = `${endpoint}/${BUCKET_NAME}/${key}`;
    
    // Log para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Storage] Archivo subido: ${url}`);
    }
    
    return url;
  } catch (error) {
    const errorMessage = getS3ErrorMessage(error);
    console.error('[Storage Upload Error]', errorMessage, error);
    throw new Error(errorMessage);
  }
}

export type SignedUrlOptions = {
  expiresIn?: number;
  responseContentType?: string;
  responseContentDisposition?: string;
};

/**
 * Get a pre-signed URL to download a file from Object Storage (or local URL in development)
 * @param key Object key (path) of the file
 * @param options Signed URL options (expiration, response headers)
 * @returns Pre-signed URL (or local URL in development)
 */
export async function getSignedDownloadUrl(
  key: string,
  options?: SignedUrlOptions
): Promise<string> {
  const { expiresIn = 300, responseContentType, responseContentDisposition } = options ?? {};

  // Fallback to local storage in development
  if (!isS3Configured()) {
    return getLocalFileUrl(key);
  }

  const s3Client = getS3Client();
  if (!s3Client || !BUCKET_NAME) {
    throw new Error('Object Storage client no disponible');
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ...(responseContentType ? { ResponseContentType: responseContentType } : {}),
      ...(responseContentDisposition ? { ResponseContentDisposition: responseContentDisposition } : {}),
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    const errorMessage = getS3ErrorMessage(error);
    console.error('[Storage Get URL Error]', errorMessage, error);
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
    // AWS SDK v3 Body puede ser ReadableStream, Blob, o Readable
    const chunks: Uint8Array[] = [];
    if (response.Body && typeof response.Body === 'object') {
      // Type guard para verificar que es iterable
      const body = response.Body as { [Symbol.asyncIterator]?: () => AsyncIterableIterator<Uint8Array> };
      if (body[Symbol.asyncIterator]) {
        for await (const chunk of body) {
          chunks.push(chunk);
        }
      } else {
        // Fallback: intentar como ReadableStream
        const stream = response.Body as ReadableStream<Uint8Array>;
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
      }
    }

    return Buffer.concat(chunks);
  } catch (error) {
    const errorMessage = getS3ErrorMessage(error);
    console.error('[S3 Download Error]', errorMessage, error);
    throw new Error(errorMessage);
  }
}

/**
 * Delete a file from Object Storage (or local storage in development)
 * @param key Object key (path) of the file to delete
 */
export async function deleteFromS3(key: string): Promise<void> {
  // Fallback to local storage in development
  if (!isS3Configured()) {
    await deleteFromLocal(key);
    return;
  }

  const s3Client = getS3Client();
  if (!s3Client || !BUCKET_NAME) {
    throw new Error('Object Storage client no disponible');
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
    console.error('[Storage Delete Error]', errorMessage, error);
    throw new Error(errorMessage);
  }
}

// ========================================
// Aliases y utilidades adicionales para sistema de plantillas
// ========================================

/**
 * Alias de uploadToS3 para compatibilidad con código de plantillas
 */
export const subirDocumento = uploadToS3;

/**
 * Descargar documento desde S3 como Buffer (para procesamiento de plantillas)
 * @param key S3 key (path) of the file to download
 * @returns Buffer with file contents
 */
export async function descargarDocumento(key: string): Promise<Buffer> {
  // Fallback to local storage in development
  if (!isS3Configured()) {
    const filePath = path.join(LOCAL_UPLOAD_DIR, key);
    try {
      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
      console.error('[Local Storage] Error leyendo archivo:', error);
      throw new Error(`Error al leer archivo local: ${key}`);
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
      throw new Error('No se recibió contenido del documento');
    }

    // Convertir stream a buffer
    // AWS SDK v3 Body puede ser ReadableStream, Blob, o Readable
    const chunks: Uint8Array[] = [];
    if (response.Body && typeof response.Body === 'object') {
      // Type guard para verificar que es iterable
      const body = response.Body as { [Symbol.asyncIterator]?: () => AsyncIterableIterator<Uint8Array> };
      if (body[Symbol.asyncIterator]) {
        for await (const chunk of body) {
          chunks.push(chunk);
        }
      } else {
        // Fallback: intentar como ReadableStream
        const stream = response.Body as ReadableStream<Uint8Array>;
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
        } finally {
          reader.releaseLock();
        }
      }
    }

    return Buffer.concat(chunks);
  } catch (error) {
    const errorMessage = getS3ErrorMessage(error);
    console.error('[S3 Download Error]', errorMessage, error);
    throw new Error(errorMessage);
  }
}
