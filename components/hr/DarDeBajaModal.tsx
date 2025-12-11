'use client';

import { format } from 'date-fns';
import { FileText, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { CarpetaSelector } from '@/components/shared/carpeta-selector';
import { LoadingButton } from '@/components/shared/loading-button';
import { ResponsiveDatePicker } from '@/components/shared/responsive-date-picker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { parseJson } from '@/lib/utils/json';
interface UploadDocumentoResponse {
  id: string;
  error?: string;
}

interface FinalizarContratoResponse {
  success?: boolean;
  error?: string;
}

interface CrearCarpetaResponse {
  carpeta: { id: string };
  error?: string;
}

interface DarDeBajaModalProps {
  isOpen: boolean;
  onClose: () => void;
  contratoId: string;
  empleadoNombre: string;
  empleadoId: string;
  onSuccess?: () => void;
}

interface DocumentoSubir {
  file: File;
  nombre: string;
  tipo: 'lectura' | 'firma';
  carpetaId?: string;
}

export function DarDeBajaModal({
  isOpen,
  onClose,
  contratoId,
  empleadoNombre,
  empleadoId,
  onSuccess,
}: DarDeBajaModalProps) {
  const [fechaFin, setFechaFin] = useState('');
  const [motivo, setMotivo] = useState('');
  const [documentos, setDocumentos] = useState<DocumentoSubir[]>([]);
  const [loading, setLoading] = useState(false);
  const parseDateValue = (value?: string) => (value ? new Date(`${value}T00:00:00`) : undefined);
  const handleFechaFinSelect = (date: Date | undefined) => setFechaFin(date ? format(date, 'yyyy-MM-dd') : '');
  const [carpetaIdSeleccionada, setCarpetaIdSeleccionada] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, tipo: 'lectura' | 'firma') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocumentos: DocumentoSubir[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`El archivo ${file.name} es muy grande (máximo 10MB)`);
        continue;
      }
      newDocumentos.push({
        file,
        nombre: file.name,
        tipo,
        carpetaId: carpetaIdSeleccionada || undefined,
      });
    }

    setDocumentos([...documentos, ...newDocumentos]);
  };

  const removeDocumento = (index: number) => {
    setDocumentos(documentos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!fechaFin) {
      toast.error('La fecha de finalización es obligatoria');
      return;
    }

    setLoading(true);
    try {
      // 1. Subir documentos si existen
      const documentosIds: string[] = [];
      if (documentos.length > 0) {
        for (const doc of documentos) {
          const formData = new FormData();
          formData.append('file', doc.file);
          formData.append('nombre', doc.nombre);
          formData.append('categoria', 'offboarding');
          formData.append('tipo', doc.tipo);
          formData.append('tipoDocumento', doc.tipo);
          const carpetaDestino = doc.carpetaId || carpetaIdSeleccionada;
          if (carpetaDestino) {
            formData.append('carpetaId', carpetaDestino);
          }

          const uploadResponse = await fetch('/api/documentos', {
            method: 'POST',
            body: formData,
          });

          if (!uploadResponse.ok) {
            const error = await parseJson<{ error?: string }>(uploadResponse).catch(() => null);
            throw new Error(error?.error || `Error al subir ${doc.nombre}`);
          }

          const uploadedDoc = await parseJson<UploadDocumentoResponse>(uploadResponse);
          documentosIds.push(uploadedDoc.id);
        }
      }

      // 2. Finalizar contrato
      const finalizarResponse = await fetch(`/api/contratos/${contratoId}/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaFin,
          motivo: motivo || undefined,
          documentosIds: documentosIds.length > 0 ? documentosIds : undefined,
        }),
      });

      if (!finalizarResponse.ok) {
        const error = await parseJson<{ error?: string }>(finalizarResponse).catch(() => null);
        throw new Error(error?.error || 'Error al finalizar contrato');
      }

      toast.success('Contrato finalizado correctamente');
      onSuccess?.();
      handleClose();
    } catch (error: unknown) {
      console.error('[DarDeBajaModal] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar la baja';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFechaFin('');
      setMotivo('');
      setDocumentos([]);
      setCarpetaIdSeleccionada(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Dar de Baja: {empleadoNombre}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Carpeta destino */}
          <CarpetaSelector
            empleadoId={empleadoId}
            value={carpetaIdSeleccionada}
            onChange={setCarpetaIdSeleccionada}
            defaultNombre="Otros"
            label="Carpeta de destino para los documentos"
            placeholder="Selecciona la carpeta donde guardar los documentos"
            onNuevaCarpeta={async (nombre) => {
              try {
                const response = await fetch('/api/carpetas', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    nombre,
                    empleadoId,
                    compartida: false,
                  }),
                });
                if (!response.ok) {
                  const error = await parseJson<{ error?: string }>(response).catch(() => null);
                  toast.error(error?.error || 'Error al crear carpeta');
                  return null;
                }
                const { carpeta } = await parseJson<CrearCarpetaResponse>(response);
                toast.success('Carpeta creada correctamente');
                return carpeta.id;
              } catch (error) {
                console.error('[DarDeBajaModal] Error creando carpeta:', error);
                toast.error('Error al crear carpeta');
                return null;
              }
            }}
          />

          {/* Fecha de finalización */}
          <div>
            <Label htmlFor="fechaFin" className="required">
              Fecha de Finalización *
            </Label>
            <ResponsiveDatePicker
              date={parseDateValue(fechaFin)}
              onSelect={handleFechaFinSelect}
              placeholder="Seleccionar fecha"
              label="Seleccionar fecha de finalización"
              fromDate={new Date()}
              disabled={loading}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Fecha en la que el contrato será finalizado
            </p>
          </div>

          {/* Motivo */}
          <div>
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Describe el motivo de la finalización (opcional)"
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Documentos */}
          <div>
            <Label>Documentos de Offboarding</Label>
            <p className="text-xs text-gray-500 mb-3">
              Sube documentos para que el empleado pueda ver/descargar o firmar (firma disponible próximamente)
            </p>

            <div className="space-y-3">
              {/* Botones de upload */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('upload-lectura')?.click()}
                  disabled={loading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Subir para Ver/Descargar
                </Button>
                <input
                  id="upload-lectura"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={(e) => handleFileUpload(e, 'lectura')}
                  className="hidden"
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('upload-firma')?.click()}
                  disabled={loading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Subir para Firmar
                </Button>
                <input
                  id="upload-firma"
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={(e) => handleFileUpload(e, 'firma')}
                  className="hidden"
                />
              </div>

              {/* Lista de documentos */}
              {documentos.length > 0 && (
                <div className="space-y-2">
                  {documentos.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.nombre}</p>
                          <p className="text-xs text-gray-500">
                            {doc.tipo === 'lectura' ? 'Ver/Descargar' : 'Requiere firma'}
                          </p>
                          <p className="text-xs text-gray-400">
                            {doc.carpetaId
                              ? 'Se guardará en la carpeta seleccionada'
                              : 'Se guardará en la carpeta "Otros"'}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocumento(index)}
                        disabled={loading}
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400 mt-2">
              <strong>Nota:</strong> La funcionalidad de firma electrónica estará disponible próximamente.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <LoadingButton onClick={handleSubmit} loading={loading}>
            Finalizar Contrato
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
