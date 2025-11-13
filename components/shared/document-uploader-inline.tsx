'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  file: File;
  id: string;
  nombre: string;
  tipoDocumento?: string;
}

interface DocumentUploaderInlineProps {
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  acceptedTypes?: string;
  disabled?: boolean;
  carpetaId?: string; // Si ya existe la carpeta
}

export function DocumentUploaderInline({
  onFilesChange,
  maxFiles = 10,
  acceptedTypes = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  disabled = false,
  carpetaId,
}: DocumentUploaderInlineProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    if (selectedFiles.length === 0) return;
    
    // Validar número máximo de archivos
    if (files.length + selectedFiles.length > maxFiles) {
      alert(`Máximo ${maxFiles} archivos permitidos`);
      return;
    }

    // Crear objetos UploadedFile
    const newFiles: UploadedFile[] = selectedFiles.map((file) => ({
      file,
      id: `${Date.now()}-${Math.random()}`,
      nombre: file.name,
      tipoDocumento: 'otro',
    }));

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
    
    // Resetear input
    event.target.value = '';
  };

  const handleRemoveFile = (fileId: string) => {
    const updatedFiles = files.filter((f) => f.id !== fileId);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const handleUpdateFileName = (fileId: string, newName: string) => {
    const updatedFiles = files.map((f) =>
      f.id === fileId ? { ...f, nombre: newName } : f
    );
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Zona de subida */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
        <input
          id="file-upload"
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={handleFileSelect}
          disabled={disabled || files.length >= maxFiles}
          className="hidden"
        />
        <label
          htmlFor="file-upload"
          className={cn(
            'cursor-pointer flex flex-col items-center gap-2',
            (disabled || files.length >= maxFiles) && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Upload className="w-10 h-10 text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Click para subir archivos
            </p>
            <p className="text-xs text-gray-500 mt-1">
              o arrastra y suelta aquí
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Formatos: {acceptedTypes} (máx. {maxFiles} archivos)
          </p>
        </label>
      </div>

      {/* Lista de archivos seleccionados */}
      {files.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Archivos seleccionados ({files.length})
          </Label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {files.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <Input
                    value={uploadedFile.nombre}
                    onChange={(e) => handleUpdateFileName(uploadedFile.id, e.target.value)}
                    disabled={disabled}
                    className="h-8 text-sm"
                    placeholder="Nombre del documento"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formatFileSize(uploadedFile.file.size)}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveFile(uploadedFile.id)}
                  disabled={disabled}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info adicional */}
      {files.length === 0 && (
        <p className="text-xs text-gray-500 text-center">
          Los documentos se subirán al crear la carpeta
        </p>
      )}
    </div>
  );
}

