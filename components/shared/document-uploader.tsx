'use client';

// ========================================
// Document Uploader Component - Reusable file upload component
// ========================================

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/shared/loading-button';
import { Upload, X, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface DocumentUploaderProps {
  onUpload: (file: File) => Promise<void>;
  acceptedTypes?: string[];
  maxSizeMB?: number;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function DocumentUploader({
  onUpload,
  acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  maxSizeMB = 5,
  label = 'Subir documento',
  description = 'PDF, JPG o PNG (máx. 5MB)',
  disabled = false,
}: DocumentUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Validar tipo
    if (!acceptedTypes.includes(file.type)) {
      setError(`Tipo de archivo no permitido. Formatos aceptados: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Validar tamaño
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError(`El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB`);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError('');

    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir el archivo';
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{label}</Label>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>

      {!selectedFile ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm text-gray-600 mb-1">
              <span className="text-primary font-medium">Haz clic para subir</span> o arrastra el archivo aquí
            </p>
            <p className="text-xs text-gray-500">{description}</p>
          </label>
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 rounded p-2">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            {!uploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <LoadingButton
            onClick={handleUpload}
            loading={uploading}
            disabled={disabled || uploading}
            className="w-full mt-4"
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? 'Subiendo...' : 'Subir archivo'}
          </LoadingButton>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}








