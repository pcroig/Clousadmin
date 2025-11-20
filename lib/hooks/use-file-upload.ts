'use client';

// ========================================
// useFileUpload Hook
// ========================================
// Gestiona la cola de archivos, progreso, errores, reintentos y cancelaciones.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  calculateOverallProgress,
  createPreviewUrl,
  type FileKind,
  generateClientFileId,
  getDefaultDescription,
  getFileExtension,
  getFileKind,
  revokePreviewUrl,
} from '@/lib/utils/file-helpers';
import {
  FileValidationOptions,
  FileValidationResult,
  validateFile,
  validateFileCount,
} from '@/lib/validaciones/file-upload';

export type UploadStatus = 'queued' | 'uploading' | 'success' | 'error' | 'cancelled';

export interface UploadItem {
  id: string;
  file: File;
  previewUrl?: string | null;
  progress: number;
  status: UploadStatus;
  error?: string;
  attempts: number;
  uploadedBytes: number;
  totalBytes: number;
  startedAt?: number;
  completedAt?: number;
  kind?: FileKind;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  metadata?: Record<string, unknown>;
  error?: string;
  statusCode?: number;
}

export interface UploadHandlerParams {
  file: File;
  signal: AbortSignal;
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
}

export type UploadHandler = (params: UploadHandlerParams) => Promise<UploadResult>;

export interface UseFileUploadOptions extends FileValidationOptions {
  onUpload: UploadHandler;
  autoUpload?: boolean;
  maxRetries?: number;
  onQueueChange?: (items: UploadItem[]) => void;
}

export interface UseFileUploadReturn {
  items: UploadItem[];
  queueProgress: number;
  isUploading: boolean;
  addFiles: (files: FileList | File[]) => Promise<FileValidationResult[]>;
  removeFile: (id: string) => void;
  retryFile: (id: string) => void;
  cancelUpload: (id: string) => void;
  clearCompleted: () => void;
  startUploads: () => Promise<void>;
  validationDescription: string;
}

export function useFileUpload({
  onUpload,
  autoUpload = true,
  maxRetries = 3,
  onQueueChange,
  ...validationOptions
}: UseFileUploadOptions): UseFileUploadReturn {
  const [items, setItems] = useState<UploadItem[]>([]);
  const processingRef = useRef(false);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const mountedRef = useRef(true);
  const itemsRef = useRef<UploadItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    mountedRef.current = true;
    const controllersSnapshot = abortControllers.current;
    return () => {
      mountedRef.current = false;
      controllersSnapshot.forEach((controller) => controller.abort());
      itemsRef.current.forEach((item) => revokePreviewUrl(item.previewUrl));
    };
  }, []);

  useEffect(() => {
    onQueueChange?.(items);
  }, [items, onQueueChange]);

  const validationDescription = useMemo(
    () => getDefaultDescription(validationOptions.acceptedTypes, validationOptions.maxSizeMB),
    [validationOptions.acceptedTypes, validationOptions.maxSizeMB]
  );

  const addFiles = useCallback(
    async (incoming: FileList | File[]): Promise<FileValidationResult[]> => {
      const filesArray = Array.from(incoming instanceof FileList ? incoming : Array.from(incoming));
      const results: FileValidationResult[] = [];
      const allowMultiple = validationOptions.allowMultiple ?? true;

      for (const file of filesArray) {
        if (!allowMultiple && (items.length > 0 || results.some((result) => result.valid))) {
          results.push({
            valid: false,
            error: 'Solo puedes subir un archivo a la vez.',
          });
          continue;
        }

        const countResult = validateFileCount(items.length + results.filter((r) => r.valid).length, {
          maxFiles: validationOptions.maxFiles,
        });
        if (!countResult.valid) {
          results.push(countResult);
          continue;
        }

        const validationResult = await validateFile(file, validationOptions);
        results.push(validationResult);

        if (!validationResult.valid) {
          continue;
        }

        const previewUrl = createPreviewUrl(file);
        const newItem: UploadItem = {
          id: generateClientFileId(),
          file,
          previewUrl,
          progress: 0,
          status: 'queued',
          attempts: 0,
          uploadedBytes: 0,
          totalBytes: file.size,
          kind: getFileKind({ mimeType: file.type, extension: getFileExtension(file.name) }),
        };

        setItems((prev) => [...prev, newItem]);
      }

      if (autoUpload) {
        void processQueue();
      }

      return results;
    },
    [autoUpload, items.length, processQueue, validationOptions]
  );

  const updateItem = useCallback((id: string, updater: (item: UploadItem) => UploadItem) => {
    setItems((prev) => prev.map((item) => (item.id === id ? updater(item) : item)));
  }, []);

  const markItemStatus = useCallback(
    (id: string, status: UploadStatus, extra?: Partial<UploadItem>) => {
      updateItem(id, (item) => ({
        ...item,
        status,
        ...extra,
      }));
    },
    [updateItem]
  );

  const uploadSingle = useCallback(
    async (item: UploadItem): Promise<void> => {
      const controller = new AbortController();
      abortControllers.current.set(item.id, controller);

      const startedAt = Date.now();

      markItemStatus(item.id, 'uploading', {
        attempts: item.attempts + 1,
        startedAt,
        error: undefined,
      });

      const handleProgress = (uploadedBytes: number, totalBytes: number) => {
        updateItem(item.id, (current) => ({
          ...current,
          uploadedBytes,
          totalBytes,
          progress: totalBytes ? Math.round((uploadedBytes / totalBytes) * 100) : current.progress,
        }));
      };

      try {
        const result = await onUpload({
          file: item.file,
          signal: controller.signal,
          onProgress: handleProgress,
        });

        if (!mountedRef.current) return;

        if (result.success) {
          markItemStatus(item.id, 'success', {
            progress: 100,
            completedAt: Date.now(),
          });
        } else {
          markItemStatus(item.id, 'error', {
            error: result.error || 'Error al subir archivo',
          });
        }
      } catch (error) {
        if (!mountedRef.current) return;
        if (controller.signal.aborted) {
          markItemStatus(item.id, 'cancelled', {
            error: 'Subida cancelada por el usuario',
          });
        } else {
          markItemStatus(item.id, 'error', {
            error: error instanceof Error ? error.message : 'Error al subir archivo',
          });
        }
      } finally {
        abortControllers.current.delete(item.id);
      }
    },
    [markItemStatus, onUpload, updateItem]
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      const queuedItems = items.filter((item) => item.status === 'queued');
      for (const nextItem of queuedItems) {
        await uploadSingle(nextItem);
      }
    } finally {
      processingRef.current = false;
    }
  }, [items, uploadSingle]);

  const removeFile = useCallback(
    (id: string) => {
      const controller = abortControllers.current.get(id);
      controller?.abort();
      abortControllers.current.delete(id);

      setItems((prev) => {
        const target = prev.find((item) => item.id === id);
        if (target) {
          revokePreviewUrl(target.previewUrl);
        }
        return prev.filter((item) => item.id !== id);
      });
    },
    []
  );

  const retryFile = useCallback(
    (id: string) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          if (item.attempts >= maxRetries) {
            return {
              ...item,
              error: `Límite de reintentos (${maxRetries}) alcanzado.`,
            };
          }
          return {
            ...item,
            status: 'queued',
            error: undefined,
            progress: 0,
            uploadedBytes: 0,
            totalBytes: item.file.size,
          };
        })
      );
      void processQueue();
    },
    [maxRetries, processQueue]
  );

  const cancelUpload = useCallback((id: string) => {
    const controller = abortControllers.current.get(id);
    controller?.abort();
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) => {
      prev.forEach((item) => {
        if (['success', 'cancelled'].includes(item.status)) {
          revokePreviewUrl(item.previewUrl);
        }
      });
      return prev.filter((item) => !['success', 'cancelled'].includes(item.status));
    });
  }, []);

  const startUploads = useCallback(async () => {
    await processQueue();
  }, [processQueue]);

  const queueProgress = useMemo(() => calculateOverallProgress(items), [items]);
  const isUploading = useMemo(() => items.some((item) => item.status === 'uploading'), [items]);

  return {
    items,
    queueProgress,
    isUploading,
    addFiles,
    removeFile,
    retryFile,
    cancelUpload,
    clearCompleted,
    startUploads,
    validationDescription,
  };
}

