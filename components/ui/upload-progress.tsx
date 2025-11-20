"use client";

import { memo, useEffect, useMemo, useState } from "react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { estimateTimeRemaining, formatFileSize, formatSpeed } from "@/lib/utils/file-helpers";

interface UploadProgressProps {
  value: number;
  uploadedBytes: number;
  totalBytes: number;
  startedAt?: number;
  className?: string;
}

function UploadProgressComponent({
  value,
  uploadedBytes,
  totalBytes,
  startedAt,
  className,
}: UploadProgressProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt || uploadedBytes >= totalBytes) return;
    
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 500);

    return () => clearInterval(interval);
  }, [startedAt, uploadedBytes, totalBytes]);

  const elapsedMs = useMemo(() => {
    if (!startedAt) return undefined;
    return currentTime - startedAt;
  }, [currentTime, startedAt]);

  const speed = useMemo(() => {
    if (!elapsedMs || elapsedMs <= 0) return undefined;
    const bytesPerSecond = uploadedBytes / (elapsedMs / 1000);
    return formatSpeed(bytesPerSecond);
  }, [elapsedMs, uploadedBytes]);

  const eta = useMemo(() => {
    if (!elapsedMs) return "—";
    return estimateTimeRemaining(totalBytes, uploadedBytes, elapsedMs);
  }, [elapsedMs, totalBytes, uploadedBytes]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{formatFileSize(uploadedBytes)} / {formatFileSize(totalBytes)}</span>
        <span>{Math.min(100, Math.max(0, value))}%</span>
      </div>
      <Progress value={value} />
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{speed ?? "Calculando…"}</span>
        <span>ETA: {eta}</span>
      </div>
    </div>
  );
}

export const UploadProgress = memo(UploadProgressComponent);

