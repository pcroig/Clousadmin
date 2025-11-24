'use client';

// ========================================
// Modal para Subir Plantilla
// ========================================
// Modal reutilizable para subir plantillas DOCX con detección automática de variables

import { AlertCircle, CheckCircle2, FileText, Upload } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { parseJson } from '@/lib/utils/json';

interface SubirPlantillaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface UploadPlantillaResponse {
  success?: boolean;
  error?: string;
  tip?: string;
}

export function SubirPlantillaModal({
  open,
  onOpenChange,
  onSuccess,
}: SubirPlantillaModalProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [nombrePlantilla, setNombrePlantilla] = useState('');

  const handleArchivoSeleccionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    // Validar tipo de archivo - solo DOCX por ahora
    const extension = archivo.name.split('.').pop()?.toLowerCase();
    if (extension !== 'docx') {
      setError('Solo se permiten archivos .docx con variables. El soporte para PDFs rellenables llegará en una fase posterior.');
      return;
    }

    setArchivoSeleccionado(archivo);
    setError('');

    // Auto-rellenar nombre si está vacío
    if (!nombrePlantilla) {
      const nombreSinExtension = archivo.name.replace(/\.docx$/, '');
      setNombrePlantilla(nombreSinExtension);
    }
  };

  const handleSubirPlantilla = async () => {
    if (!archivoSeleccionado) {
      setError('Selecciona un archivo');
      return;
    }

    if (!nombrePlantilla.trim()) {
      setError('Ingresa un nombre para la plantilla');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', archivoSeleccionado);
      formData.append('nombre', nombrePlantilla.trim());

      const res = await fetch('/api/plantillas', {
        method: 'POST',
        body: formData,
      });

      const data = await parseJson<UploadPlantillaResponse>(res);

      if (data.success) {
        setSuccess('Plantilla subida correctamente. Variables detectadas automáticamente.');
        
        // Resetear formulario
        setTimeout(() => {
          setArchivoSeleccionado(null);
          setNombrePlantilla('');
          setSuccess('');
          onOpenChange(false);
          
          // Callback de éxito
          if (onSuccess) {
            onSuccess();
          }
        }, 1500);
      } else {
        setError(data.error || 'Error al subir plantilla');
        if (data.tip) {
          setError(`${data.error}\n${data.tip}`);
        }
      }
    } catch (err) {
      console.error('[SubirPlantillaModal] Error:', err);
      setError('Error al subir plantilla');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setArchivoSeleccionado(null);
      setNombrePlantilla('');
      setError('');
      setSuccess('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Subir Plantilla
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Instrucciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-900">
              <strong>Instrucciones:</strong> Sube un archivo DOCX que contenga variables en formato{' '}
              <code className="bg-blue-100 px-1 rounded">{'{{nombre_variable}}'}</code>. El sistema
              detectará automáticamente todas las variables.
            </p>
          </div>

          {/* Nombre de la plantilla */}
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la plantilla *</Label>
            <Input
              id="nombre"
              value={nombrePlantilla}
              onChange={(e) => setNombrePlantilla(e.target.value)}
              placeholder="ej: Contrato laboral, Modelo 145, etc."
              disabled={uploading}
            />
          </div>

          {/* Selección de archivo */}
          <div className="space-y-2">
            <Label htmlFor="archivo">Archivo DOCX *</Label>
            <Input
              id="archivo"
              type="file"
              accept=".docx"
              onChange={handleArchivoSeleccionado}
              disabled={uploading}
            />
            <p className="text-xs text-gray-500">
              Solo se aceptan plantillas DOCX con variables. El soporte para PDFs rellenables llegará en una fase posterior.
            </p>
          </div>

          {/* Archivo seleccionado */}
          {archivoSeleccionado && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">{archivoSeleccionado.name}</span>
            </div>
          )}

          {/* Mensajes */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900 whitespace-pre-line">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-900">{success}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleSubirPlantilla} disabled={uploading || !archivoSeleccionado || !nombrePlantilla.trim()}>
            {uploading ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Subir Plantilla
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




