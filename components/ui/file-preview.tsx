"use client";

import {
  AlertCircle,
  FileArchive,
  FileAudio,
  FileText,
  FileVideo,
  ImageIcon,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { memo, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { UploadErrorAlert } from "@/components/ui/upload-error-alert";
import { UploadProgress } from "@/components/ui/upload-progress";
import { UploadItem } from "@/lib/hooks/use-file-upload";
import { cn } from "@/lib/utils";
import { FileKind, formatFileSize, isPreviewableImage } from "@/lib/utils/file-helpers";

interface FilePreviewProps {
  item: UploadItem;
  disableActions?: boolean;
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const kindToIcon: Record<FileKind | "generic", React.ReactNode> = {
  image: <ImageIcon className="size-5 text-gray-500" />,
  pdf: <FileText className="size-5 text-red-500" />,
  doc: <FileText className="size-5 text-blue-500" />,
  sheet: <FileText className="size-5 text-emerald-500" />,
  presentation: <FileText className="size-5 text-orange-500" />,
  archive: <FileArchive className="size-5 text-amber-500" />,
  text: <FileText className="size-5 text-gray-500" />,
  audio: <FileAudio className="size-5 text-purple-500" />,
  video: <FileVideo className="size-5 text-indigo-500" />,
  other: <FileText className="size-5 text-gray-500" />,
  generic: <FileText className="size-5 text-gray-500" />,
};

function FilePreviewComponent({
  item,
  disableActions,
  onRemove,
  onRetry,
  onCancel,
}: FilePreviewProps) {
  const icon = kindToIcon[item.kind ?? "generic"];

  const showPreviewImage = useMemo(() => {
    if (!item.previewUrl || !item.file) return false;
    return isPreviewableImage(item.file);
  }, [item.file, item.previewUrl]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm transition hover:border-gray-300 hover:shadow-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-1 gap-4">
          <div className="relative flex size-14 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
            {showPreviewImage ? (
              <Image
                src={item.previewUrl as string}
                alt={item.file.name}
                fill
                className="object-cover"
                sizes="56px"
                unoptimized
              />
            ) : (
              icon
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900">{item.file.name}</p>
            <p className="text-xs text-gray-500">{formatFileSize(item.file.size)}</p>

            <div className="mt-2 flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1",
                  item.status === "success" && "bg-emerald-50 text-emerald-700",
                  item.status === "uploading" && "bg-blue-50 text-blue-700",
                  item.status === "error" && "bg-red-50 text-red-700",
                  item.status === "queued" && "bg-gray-100 text-gray-700",
                  item.status === "cancelled" && "bg-amber-50 text-amber-700"
                )}
              >
                {item.status === "uploading" && (
                  <span className="flex size-2.5 animate-pulse rounded-full bg-current" />
                )}
                {item.status === "error" && <AlertCircle className="size-3.5" />}
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {item.status === "uploading" && onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disableActions}
              onClick={() => onCancel(item.id)}
            >
              <X className="mr-2 size-3.5" />
              Cancelar
            </Button>
          )}

          {item.status === "error" && onRetry && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disableActions}
              onClick={() => onRetry(item.id)}
            >
              <RefreshCw className="mr-2 size-3.5" />
              Reintentar
            </Button>
          )}

          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-red-600"
              disabled={disableActions}
              onClick={() => onRemove(item.id)}
            >
              <Trash2 className="mr-2 size-3.5" />
              Quitar
            </Button>
          )}
        </div>
      </div>

      {item.status === "uploading" && (
        <UploadProgress
          className="mt-4"
          value={item.progress}
          uploadedBytes={item.uploadedBytes}
          totalBytes={item.totalBytes}
          startedAt={item.startedAt}
        />
      )}

      {item.error && (
        <UploadErrorAlert
          className="mt-4"
          message={item.error}
          onRetry={item.status === "error" ? () => onRetry?.(item.id) : undefined}
          disableActions={disableActions}
        />
      )}
    </div>
  );
}

export const FilePreview = memo(FilePreviewComponent);

