'use client';

import { Loader2, Upload, X, FileText } from 'lucide-react';
import React, { useCallback, useMemo, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';

import { uploadFilesToCarpeta } from '@/lib/documentos/client-upload';
import { cn } from '@/lib/utils';

type UploadVariant = 'minimal' | 'dropzone';
type UploadMode = 'immediate' | 'preview'; // NUEVO: modo preview

interface DocumentUploadAreaProps {
  carpetaId?: string;
  disabled?: boolean;
  description?: string;
  buttonLabel?: string;
  onUploaded?: () => void;
  variant?: UploadVariant;
  mode?: UploadMode; // NUEVO: controla si sube inmediatamente o muestra preview
  onFilesSelected?: (files: File[]) => void; // NUEVO: callback cuando se seleccionan archivos en modo preview
  getExtraFormData?: () => Record<string, string> | undefined;
}

// NUEVO: Interface para el ref handle
export interface DocumentUploadAreaHandle {
  upload: () => Promise<void>;
  selectedFiles: File[];
  isUploading: boolean;
}

export const DocumentUploadArea = forwardRef<DocumentUploadAreaHandle, DocumentUploadAreaProps>((props, ref) => {
  const {
    carpetaId,
    disabled,
    description,
    buttonLabel = 'Seleccionar archivos',
    onUploaded,
    variant = 'minimal',
    mode = 'immediate',
    onFilesSelected,
    getExtraFormData,
  } = props;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // NUEVO: archivos seleccionados en modo preview
  const { mutate } = useSWRConfig();

  const helperText = useMemo(
    () => description ?? 'Los archivos se procesarán inmediatamente.',
    [description]
  );

  const startUpload = useCallback(
    async (files: File[]) => {
      if (!carpetaId) {
        toast.error('Selecciona una carpeta para subir los documentos');
        return;
      }

      setIsUploading(true);
      setProgressText(`Subiendo 1/${files.length}`);

      const extraFormData = getExtraFormData?.();

      const result = await uploadFilesToCarpeta(
        carpetaId,
        files,
        {
          onFileSuccess: (_file, index, total) => {
            const nextIndex = Math.min(index + 2, total);
            setProgressText(index + 1 === total ? 'Procesando...' : `Subiendo ${nextIndex}/${total}`);
          },
          onFileError: (_file, index, total) => {
            const nextIndex = Math.min(index + 2, total);
            setProgressText(index + 1 === total ? 'Procesando...' : `Subiendo ${nextIndex}/${total}`);
          },
        },
        { extraFields: extraFormData }
      );

      setIsUploading(false);
      setProgressText(null);

      if (result.successes > 0) {
        // Revalidar automáticamente los documentos de esta carpeta
        if (carpetaId) {
          await mutate(`/api/documentos?carpetaId=${carpetaId}`);
        }
        // También revalidar lista de carpetas por si cambió el contador
        await mutate('/api/carpetas');

        toast.success(
          result.successes === 1
            ? 'Documento subido correctamente'
            : `${result.successes} documentos subidos correctamente`
        );

        onUploaded?.();
      }

      if (result.failures.length > 0) {
        const firstError = result.failures[0];
        toast.error(firstError.message || 'Algunos archivos no se pudieron subir');
      }
    },
    [carpetaId, onUploaded, mutate, getExtraFormData]
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);

      if (mode === 'preview') {
        // Modo preview: guardar archivos y notificar al padre
        setSelectedFiles(files);
        onFilesSelected?.(files);
      } else {
        // Modo immediate: subir inmediatamente (comportamiento actual)
        void startUpload(files);
      }
    },
    [carpetaId, mode, onFilesSelected, startUpload]
  );

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      onFilesSelected?.(newFiles);
      return newFiles;
    });
  }, [onFilesSelected]);

  // NUEVO: Exponer métodos al componente padre mediante ref
  useImperativeHandle(ref, () => ({
    upload: async () => {
      if (selectedFiles.length > 0) {
        await startUpload(selectedFiles);
        setSelectedFiles([]);
      }
    },
    selectedFiles,
    isUploading,
  }), [selectedFiles, isUploading, startUpload]);

  const handleButtonClick = useCallback(() => {
    if (disabled || !carpetaId || isUploading) return;
    inputRef.current?.click();
  }, [carpetaId, disabled, isUploading]);

  const input = (
    <input
      ref={inputRef}
      type="file"
      multiple
      className="hidden"
      onChange={(event) => {
        handleFiles(event.target.files);
        if (event.target) {
          event.target.value = '';
        }
      }}
      disabled={disabled || !carpetaId || isUploading}
    />
  );

  const renderDropzone = () => (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/80 p-8 text-center transition',
        (disabled || !carpetaId) && 'opacity-50 pointer-events-none'
      )}
      onClick={handleButtonClick}
    >
      <div className="rounded-full bg-gray-900/5 p-4 text-gray-900">
        <Upload className="h-8 w-8" />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-900">Arrastra o haz clic para subir</p>
        <p className="text-xs text-gray-500">{helperText}</p>
      </div>

      <span className="text-sm font-medium text-gray-700">{buttonLabel}</span>
    </div>
  );

  const renderMinimal = () => (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">Subir documentos</p>
        <p className="text-xs text-gray-500">{helperText}</p>
      </div>
      <div className="flex items-center gap-3">
        {isUploading && (
          <span className="text-xs text-blue-600 flex items-center gap-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {progressText ?? 'Procesando...'}
          </span>
        )}
        <button
          type='button'
          onClick={handleButtonClick}
          className='inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50'
          disabled={disabled || !carpetaId || isUploading}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );

  // NUEVO: Renderizar lista de archivos seleccionados en modo preview
  const renderFilesList = () => {
    if (mode !== 'preview' || selectedFiles.length === 0) return null;

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">
          {selectedFiles.length} archivo{selectedFiles.length !== 1 ? 's' : ''} seleccionado{selectedFiles.length !== 1 ? 's' : ''}
        </p>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {input}
      {variant === 'dropzone' ? renderDropzone() : renderMinimal()}
      {isUploading && variant === 'dropzone' && (
        <p className="text-xs text-center text-blue-600">{progressText ?? 'Procesando...'}</p>
      )}
      {renderFilesList()}
      {!carpetaId && (
        <p className="text-xs text-red-500">
          Selecciona una carpeta para activar la subida de documentos.
        </p>
      )}
    </div>
  );
});

DocumentUploadArea.displayName = 'DocumentUploadArea';
