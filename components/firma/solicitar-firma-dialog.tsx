'use client';

import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SearchableMultiSelect } from '@/components/shared/searchable-multi-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { extractArrayFromResponse } from '@/lib/utils/api-response';
import { parseJson } from '@/lib/utils/json';

interface EmpleadoItem {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
}

interface SolicitarFirmaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentoId: string;
  documentoNombre: string;
  carpetaId?: string | null;
  onSuccess?: () => void;
}

export function SolicitarFirmaDialog({
  open,
  onOpenChange,
  documentoId,
  documentoNombre,
  carpetaId,
  onSuccess,
}: SolicitarFirmaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState<EmpleadoItem[]>([]);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [titulo, setTitulo] = useState(`Firma de ${documentoNombre}`);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false);
  const [posicionesFirma, setPosicionesFirma] = useState<Array<{ x: number; y: number; width: number; height: number }>>([]);
  const [carpetaIdInterno, setCarpetaIdInterno] = useState<string | null>(carpetaId || null);

  // Viewer state
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const SIGNATURE_RECT_WIDTH = 180;
  const SIGNATURE_RECT_HEIGHT = 60;

  // Obtener carpetaId si no se proporcionó
  useEffect(() => {
    if (!open || carpetaIdInterno) return;

    fetch(`/api/documentos/${documentoId}?meta=1`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Error al cargar documento');
        return parseJson<{ documento?: { carpetaId?: string } }>(res);
      })
      .then((data) => {
        const info = data.documento ?? null;
        if (info?.carpetaId) {
          setCarpetaIdInterno(info.carpetaId);
        }
      })
      .catch(() => {
        toast.error('No se pudo cargar la información del documento');
      });
  }, [open, documentoId, carpetaIdInterno]);

  useEffect(() => {
    if (!open) {
      setEmpleadosSeleccionados([]);
      setTitulo(`Firma de ${documentoNombre}`);
      setPosicionesFirma([]);
      setPreviewLoading(true);
      setPreviewError(false);
      return;
    }

    if (empleados.length === 0 && !cargandoEmpleados && carpetaIdInterno) {
      setCargandoEmpleados(true);
      // Obtener empleados con acceso a la carpeta del documento
      fetch(`/api/carpetas/${carpetaIdInterno}/empleados-con-acceso`)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error('Error al cargar empleados');
          }
          return parseJson<{ empleados: EmpleadoItem[] }>(res);
        })
        .then((data) => {
          setEmpleados(data.empleados || []);
        })
        .catch(() => {
          toast.error('No se pudieron cargar los empleados con acceso al documento');
        })
        .finally(() => setCargandoEmpleados(false));
    }
  }, [open, empleados.length, cargandoEmpleados, documentoNombre, carpetaIdInterno]);

  const itemsMultiSelect = useMemo(
    () =>
      empleados.map((empleado) => ({
        value: empleado.id,
        label: `${empleado.nombre} ${empleado.apellidos}`,
      })),
    [empleados]
  );

  const handleSeleccionMasiva = () => {
    if (empleados.length === 0) return;
    const todosSeleccionados = empleadosSeleccionados.length === empleados.length;
    if (todosSeleccionados) {
      setEmpleadosSeleccionados([]);
    } else {
      setEmpleadosSeleccionados(empleados.map((empleado) => empleado.id));
    }
  };

  // Use the new preview endpoint that converts DOCX to PDF for consistent viewing
  const previewUrl = useMemo(
    () => `/api/documentos/${documentoId}/preview?ts=${open ? Date.now() : 0}`,
    [documentoId, open]
  );

  const handlePosicionClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Calcular posición en porcentaje para que sea responsive
    const percentX = (clickX / rect.width) * 100;
    const percentY = (clickY / rect.height) * 100;

    // Centrar el recuadro en el punto de clic
    const rectWidthPercent = (SIGNATURE_RECT_WIDTH / rect.width) * 100;
    const rectHeightPercent = (SIGNATURE_RECT_HEIGHT / rect.height) * 100;

    const x = Math.max(0, Math.min(percentX - rectWidthPercent / 2, 100 - rectWidthPercent));
    const y = Math.max(0, Math.min(percentY - rectHeightPercent / 2, 100 - rectHeightPercent));

    // Crear nuevo recuadro de firma
    const nuevaPosicion = {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      width: Number(rectWidthPercent.toFixed(2)),
      height: Number(rectHeightPercent.toFixed(2)),
    };

    setPosicionesFirma((prev) => [...prev, nuevaPosicion]);
  };

  const eliminarPosicion = (index: number) => {
    setPosicionesFirma((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (empleadosSeleccionados.length === 0) {
      toast.error('Selecciona al menos un firmante');
      return;
    }

    setLoading(true);
    try {
      // Si hay posiciones definidas, convertir la primera de porcentaje a coordenadas PDF
      // (esto es aproximado - idealmente se calcularía basándose en dimensiones reales del PDF)
      let posicionFirma = undefined;
      if (posicionesFirma.length > 0) {
        const pos = posicionesFirma[0];
        // Convertir de porcentaje a coordenadas PDF (aproximado)
        const PDF_WIDTH = 595;
        const PDF_HEIGHT = 842;
        posicionFirma = {
          pagina: -1, // Última página por defecto
          x: (pos.x / 100) * PDF_WIDTH,
          y: PDF_HEIGHT - ((pos.y / 100) * PDF_HEIGHT) - SIGNATURE_RECT_HEIGHT,
          width: SIGNATURE_RECT_WIDTH,
          height: SIGNATURE_RECT_HEIGHT,
        };
      }

      const body = {
        documentoId,
        titulo: titulo.trim() || documentoNombre,
        firmantes: empleadosSeleccionados.map((empleadoId) => ({
          empleadoId,
        })),
        ordenFirma: false,
        posicionFirma,
      };

      const res = await fetch('/api/firma/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await parseJson<{ success?: boolean; error?: string }>(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo crear la solicitud de firma');
      }

      toast.success('Solicitud de firma creada');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al solicitar firma');
    } finally {
      setLoading(false);
    }
  };

  const [modoEdicion, setModoEdicion] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col p-0 gap-0 sm:max-w-6xl h-[95vh] max-h-[95vh]" showCloseButton={false} aria-describedby={undefined}>
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-gray-50/80">
          <DialogTitle className="text-lg font-semibold">Solicitar firma</DialogTitle>
        </DialogHeader>

        {/* Body con scroll */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Firma de contrato indefinido"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Firmantes *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={loading || cargandoEmpleados || empleados.length === 0}
                onClick={handleSeleccionMasiva}
              >
                {empleadosSeleccionados.length === empleados.length && empleados.length > 0
                  ? 'Limpiar selección'
                  : 'Seleccionar todos'}
              </Button>
            </div>
            <SearchableMultiSelect
              items={itemsMultiSelect}
              values={empleadosSeleccionados}
              onChange={setEmpleadosSeleccionados}
              placeholder={cargandoEmpleados ? 'Cargando empleados...' : 'Seleccionar empleados...'}
              emptyMessage="No se encontraron empleados"
              disabled={loading || cargandoEmpleados}
            />
            <p className="text-xs text-gray-500">
              Puedes seleccionar empleados individuales o usar “Seleccionar todos” para un envío masivo.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Posición de la firma (opcional)</Label>
                <p className="text-xs text-gray-500">
                  Activa el modo edición para añadir recuadros de firma en el documento.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {posicionesFirma.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPosicionesFirma([])}
                  >
                    Limpiar todas ({posicionesFirma.length})
                  </Button>
                )}
                <Button
                  type="button"
                  variant={modoEdicion ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setModoEdicion(!modoEdicion)}
                >
                  {modoEdicion ? 'Desactivar edición' : 'Activar edición'}
                </Button>
              </div>
            </div>

            {/* Visor de documento */}
            <div className="border rounded-lg overflow-hidden bg-gray-100">
              <div className="relative h-[500px]">
                {previewLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
                    <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
                    <p className="text-xs text-gray-500">Cargando vista previa...</p>
                  </div>
                )}
                {previewError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 px-4 text-center">
                    <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                    <p className="text-sm font-medium text-gray-900">Error al cargar documento</p>
                    <p className="text-xs text-gray-500 mt-1">
                      No se pudo generar la vista previa. Aún puedes solicitar la firma.
                    </p>
                  </div>
                )}

                {/* Iframe del documento */}
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className={`w-full h-full border-0 ${previewLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ${modoEdicion ? 'pointer-events-none' : ''}`}
                  title="Previsualización del documento"
                  onLoad={() => setPreviewLoading(false)}
                  onError={() => {
                    setPreviewLoading(false);
                    setPreviewError(true);
                  }}
                />

                {/* Overlay para clicks (solo visible en modo edición) */}
                {modoEdicion && (
                  <div
                    ref={overlayRef}
                    className="absolute inset-0 cursor-crosshair z-20 bg-blue-500/5"
                    onClick={handlePosicionClick}
                    title="Haz clic para añadir un recuadro de firma"
                  >
                    {/* Renderizar recuadros de firma */}
                    {posicionesFirma.map((pos, index) => (
                      <div
                        key={index}
                        className="absolute border-2 border-blue-500 bg-blue-500/10 backdrop-blur-sm rounded group"
                        style={{
                          left: `${pos.x}%`,
                          top: `${pos.y}%`,
                          width: `${pos.width}%`,
                          height: `${pos.height}%`,
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-blue-700 font-medium pointer-events-none">
                          Firma
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            eliminarPosicion(index);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Mostrar recuadros también cuando no está en modo edición */}
                {!modoEdicion && posicionesFirma.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none z-10">
                    {posicionesFirma.map((pos, index) => (
                      <div
                        key={index}
                        className="absolute border-2 border-blue-500 bg-blue-500/10 rounded"
                        style={{
                          left: `${pos.x}%`,
                          top: `${pos.y}%`,
                          width: `${pos.width}%`,
                          height: `${pos.height}%`,
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-blue-700 font-medium">
                          Firma
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Info de posiciones */}
              {posicionesFirma.length > 0 && (
                <div className="px-4 py-2 border-t bg-gray-50">
                  <p className="text-xs text-gray-600">
                    {posicionesFirma.length} posición{posicionesFirma.length === 1 ? '' : 'es'} de firma definida{posicionesFirma.length === 1 ? '' : 's'}
                  </p>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50/80">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || empleadosSeleccionados.length === 0}>
            {loading ? (
              <>
                <Spinner className="w-4 h-4 mr-2" /> Creando...
              </>
            ) : (
              'Solicitar firma'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

