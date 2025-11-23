// ========================================
// File Helpers & Formatting Utilities
// ========================================
// Centraliza utilidades comunes relacionadas con archivos:
// - Formateo de tamaños
// - Identificación de tipos/MIME
// - Generación de IDs y previews
// - Cálculos auxiliares para progreso/velocidad

import crypto from 'crypto';

export type FileKind =
  | 'image'
  | 'pdf'
  | 'doc'
  | 'sheet'
  | 'presentation'
  | 'archive'
  | 'text'
  | 'audio'
  | 'video'
  | 'other';

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
] as const;

const PDF_MIME_TYPES = ['application/pdf'] as const;

const WORD_MIME_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

const SHEET_MIME_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
] as const;

const PRESENTATION_MIME_TYPES = [
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

const ARCHIVE_MIME_TYPES = [
  'application/zip',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/x-tar',
] as const;

const TEXT_MIME_TYPES = ['text/plain', 'text/markdown'] as const;

const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac'] as const;
const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'] as const;

export function formatFileSize(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes)) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
  return `${formatFileSize(bytesPerSecond, 1)}/s`;
}

export function estimateTimeRemaining(totalBytes: number, uploadedBytes: number, elapsedMs: number): string {
  if (uploadedBytes === 0 || elapsedMs <= 0) return 'Calculando…';
  const uploadRate = uploadedBytes / (elapsedMs / 1000);
  if (uploadRate <= 0) return 'Calculando…';
  const remainingBytes = Math.max(totalBytes - uploadedBytes, 0);
  const secondsRemaining = remainingBytes / uploadRate;
  if (!Number.isFinite(secondsRemaining)) return 'Calculando…';
  if (secondsRemaining < 1) return 'Menos de 1s';
  if (secondsRemaining < 60) return `${Math.ceil(secondsRemaining)}s`;
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = Math.ceil(secondsRemaining % 60);
  return `${minutes}m ${seconds}s`;
}

export function getFileExtension(name: string): string {
  const parts = name.split('.');
  if (parts.length <= 1) return '';
  return parts.pop()?.toLowerCase() || '';
}

export function isImageMimeType(mime: string | undefined): boolean {
  if (!mime) return false;
  return IMAGE_MIME_TYPES.includes(mime as (typeof IMAGE_MIME_TYPES)[number]);
}

export function isPreviewableImage(file: File): boolean {
  return isImageMimeType(file.type);
}

export function getFileKind(input: { mimeType?: string; extension?: string }): FileKind {
  const mime = input.mimeType?.toLowerCase();
  const ext = input.extension?.toLowerCase();

  if (mime) {
    if (IMAGE_MIME_TYPES.includes(mime as (typeof IMAGE_MIME_TYPES)[number])) return 'image';
    if (PDF_MIME_TYPES.includes(mime as (typeof PDF_MIME_TYPES)[number])) return 'pdf';
    if (WORD_MIME_TYPES.includes(mime as (typeof WORD_MIME_TYPES)[number])) return 'doc';
    if (SHEET_MIME_TYPES.includes(mime as (typeof SHEET_MIME_TYPES)[number])) return 'sheet';
    if (PRESENTATION_MIME_TYPES.includes(mime as (typeof PRESENTATION_MIME_TYPES)[number])) return 'presentation';
    if (ARCHIVE_MIME_TYPES.includes(mime as (typeof ARCHIVE_MIME_TYPES)[number])) return 'archive';
    if (TEXT_MIME_TYPES.includes(mime as (typeof TEXT_MIME_TYPES)[number])) return 'text';
    if (AUDIO_MIME_TYPES.includes(mime as (typeof AUDIO_MIME_TYPES)[number])) return 'audio';
    if (VIDEO_MIME_TYPES.includes(mime as (typeof VIDEO_MIME_TYPES)[number])) return 'video';
  }

  if (ext) {
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'doc';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet';
    if (['ppt', 'pptx'].includes(ext)) return 'presentation';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
    if (['txt', 'md'].includes(ext)) return 'text';
    if (['mp3', 'wav', 'aac'].includes(ext)) return 'audio';
    if (['mp4', 'mov', 'avi'].includes(ext)) return 'video';
  }

  return 'other';
}

export function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9.\-_\sáéíóúÁÉÍÓÚñÑ]/g, '_')
    .replace(/\s+/g, '_');
}

export function generateClientFileId(prefix = 'upload'): string {
  if (typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}`;
}

export function createPreviewUrl(file: File): string | null {
  if (!isPreviewableImage(file)) return null;
  return URL.createObjectURL(file);
}

export function revokePreviewUrl(url?: string | null): void {
  if (!url) return;
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export function getDefaultDescription(acceptedTypes?: string[], maxSizeMB?: number): string {
  const types = acceptedTypes?.length ? acceptedTypes.map((type) => type.split('/')[1]?.toUpperCase() || type).join(', ') : 'PDF, JPG, PNG';
  const sizeText = maxSizeMB ? `máx. ${maxSizeMB}MB` : '';
  return `${types}${sizeText ? ` (${sizeText})` : ''}`;
}

export function calculateOverallProgress(items: Array<{ progress: number }>): number {
  if (!items.length) return 0;
  const total = items.reduce((acc, item) => acc + item.progress, 0);
  return Math.round(total / items.length);
}



