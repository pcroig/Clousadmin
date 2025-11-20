"use client";

import { CloudUpload, Files, Plus } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FilePreview } from "@/components/ui/file-preview";
import { UploadProgress } from "@/components/ui/upload-progress";
import { type UploadHandler, useFileUpload } from "@/lib/hooks/use-file-upload";
import { cn } from "@/lib/utils";
import { getDefaultDescription } from "@/lib/utils/file-helpers";

interface FileUploadAdvancedProps {
  onUpload: UploadHandler;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  maxFiles?: number;
  allowMultiple?: boolean;
  autoUpload?: boolean;
  description?: string;
  buttonText?: string;
  disabled?: boolean;
  className?: string;
}

export function FileUploadAdvanced({
  onUpload,
  acceptedTypes,
  maxSizeMB = 5,
  maxFiles = 10,
  allowMultiple = true,
  autoUpload = true,
  description,
  buttonText = "Seleccionar archivos",
  disabled = false,
  className,
}: FileUploadAdvancedProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    items,
    addFiles,
    removeFile,
    retryFile,
    cancelUpload,
    startUploads,
    queueProgress,
    isUploading,
    validationDescription,
  } = useFileUpload({
    onUpload,
    acceptedTypes,
    maxSizeMB,
    maxFiles,
    autoUpload,
    allowMultiple,
  });

  const helperText = useMemo(
    () => description ?? validationDescription ?? getDefaultDescription(acceptedTypes, maxSizeMB),
    [acceptedTypes, description, maxSizeMB, validationDescription]
  );

  const handleSelectFiles = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files) return;
      const results = await addFiles(files);
      const firstError = results.find((result) => !result.valid);
      if (firstError?.error) {
        toast.error(firstError.error);
      }
      event.target.value = "";
    },
    [addFiles]
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (disabled) return;
      setIsDragging(false);

      const files = event.dataTransfer.files;
      const results = await addFiles(files);
      const firstError = results.find((result) => !result.valid);
      if (firstError?.error) {
        toast.error(firstError.error);
      }
    },
    [addFiles, disabled]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const pendingItems = items.filter((item) => item.status === "queued");

  return (
    <div className={cn("space-y-6", className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/80 p-8 text-center transition",
          isDragging && "border-gray-900 bg-gray-100",
          disabled && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={allowMultiple}
          accept={acceptedTypes?.join(",")}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={handleSelectFiles}
          disabled={disabled}
        />

        <div className="rounded-full bg-gray-900/5 p-4 text-gray-900">
          <CloudUpload className="size-8" />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-900">
            Arrastra archivos o haz clic para subir
          </p>
          <p className="text-xs text-gray-500">{helperText}</p>
        </div>

        <Button type="button" variant="secondary" size="sm" disabled={disabled}>
          <Plus className="mr-2 size-4" />
          {buttonText}
        </Button>
      </div>

      {items.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/70 p-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Files className="size-4 text-gray-500" />
              <span>
                {items.length} archivo{items.length !== 1 ? "s" : ""} en cola
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!autoUpload && pendingItems.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => startUploads()}
                  disabled={isUploading || disabled}
                >
                  Iniciar subida
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-500"
                onClick={() => pendingItems.forEach((item) => removeFile(item.id))}
                disabled={items.length === 0 || disabled}
              >
                Limpiar cola
              </Button>
            </div>
          </div>

          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((item) => (
                <FilePreview
                  key={item.id}
                  item={item}
                  onRemove={removeFile}
                  onRetry={retryFile}
                  onCancel={cancelUpload}
                  disableActions={disabled}
                />
              ))}
            </div>
          )}

          {items.length > 1 && (
            <div className="rounded-xl border border-gray-100 bg-white/70 p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
                Progreso total
              </p>
              <UploadProgress
                value={queueProgress}
                uploadedBytes={
                  items.reduce((acc, item) => acc + item.uploadedBytes, 0)
                }
                totalBytes={items.reduce((acc, item) => acc + item.totalBytes, 0)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

