'use client';

/**
 * DarDeBajaModal - Modal para dar de baja empleados (Offboarding)
 * 
 * Características:
 * - Selección de fecha de finalización
 * - Upload opcional de documentos de offboarding
 * - Validación de fecha (no anterior al inicio del contrato)
 * - Feedback claro de las acciones que se realizarán
 * 
 * Acciones que realiza:
 * 1. Finaliza el contrato con la fecha especificada
 * 2. Marca al empleado como inactivo (estado: 'baja')
 * 3. Desactiva el acceso del usuario a la plataforma
 * 4. Guarda documentos de offboarding en carpeta específica
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/shared/loading-button';
import { toast } from 'sonner';
import { AlertTriangle, Upload, X, FileText } from 'lucide-react';

interface DarDeBajaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleado: {
    id: string;
    nombre: string;
    apellidos: string;
    fechaAlta: string;
  };
  contratoId: string | null; // Puede ser null si no hay contrato registrado
  onSuccess?: () => void;
}

export function DarDeBajaModal({
  open,
  onOpenChange,
  empleado,
  contratoId,
  onSuccess,
}: DarDeBajaModalProps) {
  const [fechaFin, setFechaFin] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [documentos, setDocumentos] = useState<File[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  // Calcular fecha mínima (fecha de alta del empleado)
  const fechaMinima = new Date(empleado.fechaAlta).toISOString().split('T')[0];

  // Resetear estado cuando se cierra el modal
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Resetear estado al cerrar
      setDocumentos([]);
      setFechaFin(new Date().toISOString().split('T')[0]);
    }
    onOpenChange(newOpen);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Validar tamaño total (máximo 20MB en total)
      const totalSize = [...documentos, ...newFiles].reduce((acc, file) => acc + file.size, 0);
      const maxSize = 20 * 1024 * 1024; // 20MB
      
      if (totalSize > maxSize) {
        toast.error('El tamaño total de los documentos no puede superar 20MB');
        return;
      }
      
      setDocumentos([...documentos, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setDocumentos(documentos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validar fecha
    if (!fechaFin) {
      toast.error('Debes seleccionar una fecha de finalización');
      return;
    }

    if (fechaFin < fechaMinima) {
      toast.error('La fecha de finalización no puede ser anterior a la fecha de alta del empleado');
      return;
    }

    setLoading(true);

    try {
      // 1. Subir documentos si los hay
      let documentosIds: string[] = [];
      
      if (documentos.length > 0) {
        setUploadingDocs(true);
        
        // Buscar carpeta de Offboarding del empleado (si existe)
        const carpetaResponse = await fetch(`/api/carpetas?empleadoId=${empleado.id}`);
        let carpetaId: string | null = null;
        
        if (carpetaResponse.ok) {
          const data = await carpetaResponse.json();
          const carpetas = data.carpetas || [];
          const carpetaOffboarding = carpetas.find((c: any) => 
            c.nombre === 'Offboarding' && c.empleadoId === empleado.id
          );
          
          if (carpetaOffboarding) {
            carpetaId = carpetaOffboarding.id;
          }
        }

        // Si no existe la carpeta, crearla
        if (!carpetaId) {
          const createCarpetaResponse = await fetch('/api/carpetas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nombre: 'Offboarding',
              empleadoId: empleado.id,
              esSistema: true,
            }),
          });
          
          if (!createCarpetaResponse.ok) {
            const errorData = await createCarpetaResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error al crear carpeta de offboarding');
          }
          
          const carpetaData = await createCarpetaResponse.json();
          carpetaId = carpetaData.carpeta?.id || carpetaData.id;
          
          if (!carpetaId) {
            throw new Error('No se pudo obtener el ID de la carpeta creada');
          }
        }

        // Subir documentos en paralelo para mejor rendimiento
        const uploadPromises = documentos.map(async (documento) => {
          const formData = new FormData();
          formData.append('file', documento);
          formData.append('carpetaId', carpetaId!);
          formData.append('tipoDocumento', 'offboarding');
          formData.append('empleadoId', empleado.id);

          const uploadResponse = await fetch('/api/documentos', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            throw new Error(
              errorData.error || `Error al subir documento: ${documento.name}`
            );
          }

          const uploadData = await uploadResponse.json();
          return uploadData.documento?.id || uploadData.id;
        });

        // Esperar a que todos los documentos se suban
        documentosIds = await Promise.all(uploadPromises);
        
        setUploadingDocs(false);
      }

      // 2. Finalizar contrato (dar de baja)
      // Si hay contrato, usar el endpoint de contratos, si no, usar el endpoint de empleados
      const endpoint = contratoId 
        ? `/api/contratos/${contratoId}/finalizar`
        : `/api/empleados/${empleado.id}/dar-de-baja`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaFin,
          documentosIds: documentosIds.length > 0 ? documentosIds : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(error.error || 'Error al dar de baja');
      }

      const result = await response.json();

      toast.success('Empleado dado de baja correctamente', {
        description: `Se ha procesado la baja de ${empleado.nombre} ${empleado.apellidos}`,
      });

      handleOpenChange(false);
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Recargar página si no hay callback personalizado
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error: any) {
      console.error('[DarDeBajaModal] Error en proceso de baja:', error);
      toast.error(error.message || 'Error al dar de baja al empleado');
    } finally {
      setLoading(false);
      setUploadingDocs(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Dar de Baja a Empleado
          </DialogTitle>
          <DialogDescription>
            Este proceso finalizará el contrato y desactivará el acceso de{' '}
            <strong>{empleado.nombre} {empleado.apellidos}</strong> a la plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Fecha de Finalización */}
          <div className="space-y-2">
            <Label htmlFor="fechaFin">
              Fecha de Finalización <span className="text-red-600">*</span>
            </Label>
            <Input
              id="fechaFin"
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              min={fechaMinima}
              max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              className="w-full"
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Esta fecha marcará el fin del contrato y la fecha de baja del empleado.
            </p>
          </div>

          {/* Upload de Documentos */}
          <div className="space-y-2">
            <Label htmlFor="documentos">
              Documentos de Offboarding <span className="text-gray-500">(Opcional)</span>
            </Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
              <div className="flex flex-col items-center justify-center gap-2">
                <Upload className="w-8 h-8 text-gray-400" />
                <div className="text-center">
                  <label htmlFor="documentos" className="cursor-pointer">
                    <span className="text-sm font-medium text-blue-600 hover:text-blue-700">
                      Seleccionar archivos
                    </span>
                    <Input
                      id="documentos"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={loading}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    PDF, DOC, DOCX, JPG, PNG (máx. 20MB total)
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de documentos seleccionados */}
            {documentos.length > 0 && (
              <div className="space-y-2 mt-3">
                {documentos.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        ({(doc.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={loading}
                      className="ml-2 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advertencias */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-red-900 mb-2">
              Esta acción realizará lo siguiente:
            </h4>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>Finalizará el contrato con la fecha especificada</li>
              <li>Cambiará el estado del empleado a "Baja"</li>
              <li>Desactivará el acceso a la plataforma inmediatamente</li>
              <li>Los datos del empleado se mantendrán en el sistema (archivados)</li>
              {documentos.length > 0 && (
                <li>Se guardarán {documentos.length} documento(s) en la carpeta "Offboarding"</li>
              )}
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading || uploadingDocs}
          >
            Cancelar
          </Button>
          <LoadingButton
            variant="destructive"
            onClick={handleSubmit}
            loading={loading || uploadingDocs}
          >
            {uploadingDocs ? 'Subiendo documentos...' : loading ? 'Procesando...' : 'Dar de Baja'}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

