"use client";

import { parseJson } from "@/lib/utils/json";

interface UploadCallbacks {
  onFileStart?: (file: File, index: number, total: number) => void;
  onFileSuccess?: (file: File, index: number, total: number) => void;
  onFileError?: (file: File, index: number, total: number, error: string) => void;
}

interface UploadOptions {
  extraFields?: Record<string, string>;
}

export interface UploadSummary {
  successes: number;
  failures: Array<{
    fileName: string;
    message: string;
  }>;
}

/**
 * Sube una lista de archivos a una carpeta llamando a la API de documentos.
 * Ejecuta callbacks opcionales para reflejar progreso en la UI.
 */
export async function uploadFilesToCarpeta(
  carpetaId: string,
  files: File[],
  callbacks?: UploadCallbacks,
  options?: UploadOptions
): Promise<UploadSummary> {
  const summary: UploadSummary = {
    successes: 0,
    failures: [],
  };

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    callbacks?.onFileStart?.(file, index, files.length);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("carpetaId", carpetaId);
    if (options?.extraFields) {
      Object.entries(options.extraFields).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
    }

    try {
      const response = await fetch("/api/documentos", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorPayload = await parseJson<{ error?: string }>(response).catch(() => null);
        const message = errorPayload?.error || "Error al subir documento";
        summary.failures.push({ fileName: file.name, message });
        callbacks?.onFileError?.(file, index, files.length, message);
        continue;
      }

      summary.successes += 1;
      callbacks?.onFileSuccess?.(file, index, files.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido al subir documento";
      summary.failures.push({ fileName: file.name, message });
      callbacks?.onFileError?.(file, index, files.length, message);
    }
  }

  return summary;
}


