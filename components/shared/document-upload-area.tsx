'use client';

import { Loader2, Upload } from 'lucide-react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { uploadFilesToCarpeta } from '@/lib/documentos/client-upload';
import { cn } from '@/lib/utils';

type UploadVariant = 'minimal' | 'dropzone';

interface DocumentUploadAreaProps {
  carpetaId?: string;
  disabled?: boolean;
  description?: string;
  buttonLabel?: string;
  onUploaded?: () => void;
  variant?: UploadVariant;
  getExtraFormData?: () => Record<string, string> | undefined;
}

export function DocumentUploadArea({
  carpetaId,
  disabled,
  description,
  buttonLabel = 'Seleccionar archivos',
  onUploaded,
  variant = 'minimal',
  getExtraFormData,
}: DocumentUploadAreaProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);

  const helperText = useMemo(
    () => description ?? 'Los archivos se procesarán inmediatamente.',
    [description]
  );

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);
      void startUpload(files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [carpetaId]
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
    [carpetaId, onUploaded]
  );

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

  return (
    <div className="space-y-3">
      {input}
      {variant === 'dropzone' ? renderDropzone() : renderMinimal()}
      {isUploading && variant === 'dropzone' && (
        <p className="text-xs text-center text-blue-600">{progressText ?? 'Procesando...'}</p>
      )}
      {!carpetaId && (
        <p className="text-xs text-red-500">
          Selecciona una carpeta para activar la subida de documentos.
        </p>
      )}
    </div>
  );
}


