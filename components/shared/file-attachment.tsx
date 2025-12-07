// ========================================
// File Attachment - Componente Reutilizable
// ========================================
// Permite adjuntar uno o múltiples archivos con validación y preview

'use client';

import { Paperclip, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface FileAttachmentProps {
  /**
   * Archivos seleccionados actualmente
   */
  files: File[];
  /**
   * Callback cuando cambian los archivos
   */
  onFilesChange: (files: File[]) => void;
  /**
   * Permitir múltiples archivos
   */
  multiple?: boolean;
  /**
   * Tipos MIME aceptados
   */
  acceptedTypes?: string[];
  /**
   * Tamaño máximo por archivo en MB
   */
  maxSizeMB?: number;
  /**
   * Máximo número de archivos
   */
  maxFiles?: number;
  /**
   * Label del campo
   */
  label?: string;
  /**
   * Descripción auxiliar
   */
  description?: string;
  /**
   * Si el campo es obligatorio
   */
  required?: boolean;
  /**
   * Si está deshabilitado
   */
  disabled?: boolean;
}

const DEFAULT_ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const DEFAULT_MAX_SIZE_MB = 10;
const DEFAULT_MAX_FILES = 5;

export function FileAttachment({
  files,
  onFilesChange,
  multiple = true,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  maxSizeMB = DEFAULT_MAX_SIZE_MB,
  maxFiles = DEFAULT_MAX_FILES,
  label,
  description,
  required = false,
  disabled = false,
}: FileAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const validateFile = (file: File): string | null => {
    // Validar tipo
    const isValidType = acceptedTypes.some(
      (type) => file.type === type || (type === 'image/jpg' && file.type === 'image/jpeg')
    );
    if (!isValidType) {
      return `El archivo ${file.name} no es un tipo válido.`;
    }

    // Validar tamaño
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      return `El archivo ${file.name} supera los ${maxSizeMB}MB.`;
    }

    return null;
  };

  const handleSelectFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newFiles = [...files];
    const selected = Array.from(selectedFiles);

    for (const file of selected) {
      // Validar archivo
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        continue;
      }

      // Validar límite de archivos
      if (newFiles.length >= maxFiles) {
        toast.error(`Solo puedes adjuntar hasta ${maxFiles} archivo${maxFiles > 1 ? 's' : ''}.`);
        break;
      }

      // Validar duplicados
      const alreadySelected = newFiles.some(
        (item) =>
          item.name === file.name &&
          item.size === file.size &&
          item.lastModified === file.lastModified
      );

      if (alreadySelected) {
        toast.error(`El archivo ${file.name} ya está seleccionado.`);
        continue;
      }

      newFiles.push(file);
    }

    onFilesChange(newFiles);
    event.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    onFilesChange(files.filter((_, idx) => idx !== index));
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (disabled) return;
    setIsDragging(false);

    const droppedFiles = event.dataTransfer.files;
    if (!droppedFiles) return;

    // Usar el mismo flujo de validación que handleSelectFiles
    const newFiles = [...files];
    const dropped = Array.from(droppedFiles);

    for (const file of dropped) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        continue;
      }

      if (newFiles.length >= maxFiles) {
        toast.error(`Solo puedes adjuntar hasta ${maxFiles} archivo${maxFiles > 1 ? 's' : ''}.`);
        break;
      }

      const alreadySelected = newFiles.some(
        (item) =>
          item.name === file.name &&
          item.size === file.size &&
          item.lastModified === file.lastModified
      );

      if (!alreadySelected) {
        newFiles.push(file);
      }
    }

    onFilesChange(newFiles);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Construir descripción
  const fileTypes = acceptedTypes
    .map((type) => {
      if (type === 'application/pdf') return 'PDF';
      if (type.startsWith('image/')) return type.replace('image/', '').toUpperCase();
      return type;
    })
    .join(', ');

  const defaultDescription = `${fileTypes} · Máx ${maxSizeMB}MB${multiple ? ` · Hasta ${maxFiles} archivos` : ''}`;

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`rounded-lg border border-dashed bg-gray-50/70 p-4 space-y-3 transition-colors ${
          isDragging ? 'border-gray-900 bg-gray-100' : 'border-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <div className="rounded-full bg-white p-2 text-gray-900 shadow-sm">
              <Paperclip className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{description || 'Adjuntar archivos'}</p>
              <p className="text-xs text-gray-500">{defaultDescription}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || files.length >= maxFiles}
            className="w-full sm:w-auto"
          >
            <Upload className="h-4 w-4 mr-2" />
            {multiple ? 'Añadir archivos' : 'Seleccionar archivo'}
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple={multiple}
          className="hidden"
          onChange={handleSelectFiles}
          disabled={disabled}
          required={required && files.length === 0}
        />

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.lastModified}`}
                className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm text-gray-700 shadow-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{file.name}</span>
                  <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveFile(index)}
                  disabled={disabled}
                  className="text-gray-500 hover:text-gray-900 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Eliminar archivo</span>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}







