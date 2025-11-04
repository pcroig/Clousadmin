// ========================================
// Add Persona Document Form
// ========================================
// Formulario para subir documento (contrato/DNI) y autocompletar con IA

'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/shared/loading-button';

interface AddPersonaDocumentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddPersonaDocumentForm({ onSuccess, onCancel }: AddPersonaDocumentFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validar tipo de archivo
      if (!selectedFile.type.includes('pdf') && !selectedFile.type.includes('image')) {
        toast.error('Solo se permiten archivos PDF o imágenes');
        return;
      }

      // Validar tamaño (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('El archivo no puede superar 5MB');
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUploadAndExtract = async () => {
    if (!file) {
      toast.error('Selecciona un archivo');
      return;
    }

    setUploading(true);
    setExtracting(true);

    try {
      // Subir archivo a S3 y extraer datos con IA
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/documentos/extraer', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setExtractedData(data.datosExtraidos);
        toast.success('Datos extraídos correctamente del documento');
      } else {
        toast.error(data.error || 'Error al extraer datos del documento');
      }
    } catch (error) {
      console.error('[AddPersonaDocumentForm] Error:', error);
      toast.error('Error al procesar el documento');
    } finally {
      setUploading(false);
      setExtracting(false);
    }
  };

  const handleCreateEmpleado = async () => {
    if (!extractedData) {
      toast.error('No hay datos extraídos');
      return;
    }

    setCreating(true);

    try {
      const response = await fetch('/api/empleados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extractedData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Empleado creado correctamente');
        onSuccess();
      } else {
        toast.error(data.error || 'Error al crear empleado');
      }
    } catch (error) {
      console.error('[AddPersonaDocumentForm] Error:', error);
      toast.error('Error al crear empleado');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="font-medium text-blue-900 mb-2">📄 Subir documento para autocompletar</p>
        <ul className="space-y-1 text-blue-800">
          <li>• Sube un contrato laboral o DNI/NIE</li>
          <li>• La IA extraerá automáticamente los datos del empleado</li>
          <li>• Podrás revisar y editar los datos antes de guardar</li>
          <li>• Formatos admitidos: PDF, JPG, PNG (max 5MB)</li>
        </ul>
      </div>

      {/* Selector de archivo */}
      {!extractedData && (
        <div className="space-y-4">
          <div>
            <Label>Documento</Label>
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full h-32 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {file ? file.name : 'Haz clic para seleccionar un archivo'}
                  </span>
                  <span className="text-xs text-gray-400">PDF, JPG, PNG (max 5MB)</span>
                </div>
              </Button>
            </div>
          </div>

          {file && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border">
              <FileText className="h-5 w-5 text-gray-600" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
              >
                Cambiar
              </Button>
            </div>
          )}

          <LoadingButton
            onClick={handleUploadAndExtract}
            loading={uploading || extracting}
            disabled={!file}
            className="w-full"
          >
            {extracting ? 'Extrayendo datos con IA...' : 'Subir y Extraer Datos'}
          </LoadingButton>
        </div>
      )}

      {/* Datos extraídos */}
      {extractedData && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Datos extraídos correctamente</span>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Datos del Empleado</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {extractedData.nombre && (
                <div>
                  <span className="text-gray-500">Nombre:</span>
                  <span className="ml-2 font-medium">{extractedData.nombre}</span>
                </div>
              )}
              {extractedData.apellidos && (
                <div>
                  <span className="text-gray-500">Apellidos:</span>
                  <span className="ml-2 font-medium">{extractedData.apellidos}</span>
                </div>
              )}
              {extractedData.email && (
                <div>
                  <span className="text-gray-500">Email:</span>
                  <span className="ml-2 font-medium">{extractedData.email}</span>
                </div>
              )}
              {extractedData.nif && (
                <div>
                  <span className="text-gray-500">DNI/NIE:</span>
                  <span className="ml-2 font-medium">{extractedData.nif}</span>
                </div>
              )}
              {extractedData.telefono && (
                <div>
                  <span className="text-gray-500">Teléfono:</span>
                  <span className="ml-2 font-medium">{extractedData.telefono}</span>
                </div>
              )}
              {extractedData.puesto && (
                <div>
                  <span className="text-gray-500">Puesto:</span>
                  <span className="ml-2 font-medium">{extractedData.puesto}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Puedes editar manualmente estos datos después de crear el empleado
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setExtractedData(null);
                setFile(null);
              }}
              className="flex-1"
            >
              Cancelar y Subir Otro
            </Button>
            <LoadingButton
              onClick={handleCreateEmpleado}
              loading={creating}
              className="flex-1"
            >
              Crear Empleado
            </LoadingButton>
          </div>
        </div>
      )}

      {/* Botón cancelar general */}
      {!extractedData && (
        <div className="flex justify-end pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}




