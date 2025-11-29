'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { SearchableMultiSelect } from '@/components/shared/searchable-multi-select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogScrollableContent, DialogTitle } from '@/components/ui/dialog';
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
  onSuccess?: () => void;
}

export function SolicitarFirmaDialog({
  open,
  onOpenChange,
  documentoId,
  documentoNombre,
  onSuccess,
}: SolicitarFirmaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState<EmpleadoItem[]>([]);
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [titulo, setTitulo] = useState(`Firma de ${documentoNombre}`);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false);
  const [posicionFirma, setPosicionFirma] = useState<{ pagina: number; x: number; y: number } | null>(null);
  const [paginaSeleccionada, setPaginaSeleccionada] = useState<number>(-1);
  
  // Viewer state
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const PDF_WIDTH = 595;
  const PDF_HEIGHT = 842;

  useEffect(() => {
    if (!open) {
      setEmpleadosSeleccionados([]);
      setTitulo(`Firma de ${documentoNombre}`);
      setPosicionFirma(null);
      setPaginaSeleccionada(-1);
      setPreviewLoading(true);
      setPreviewError(false);
      return;
    }

    if (empleados.length === 0 && !cargandoEmpleados) {
      setCargandoEmpleados(true);
      fetch('/api/empleados?activos=true')
        .then(async (res) => {
          if (!res.ok) {
            throw new Error('Error al cargar empleados');
          }
          return parseJson<unknown>(res);
        })
        .then((data) => {
          const lista = extractArrayFromResponse<
            {
              id: string;
              nombre?: string;
              apellidos?: string;
              email?: string;
              usuario?: {
                nombre?: string;
                apellidos?: string;
                email?: string;
              };
            }
          >(data, { key: 'empleados' });
          setEmpleados(
            lista.map((empleado) => ({
              id: empleado.id,
              nombre: empleado?.nombre || empleado?.usuario?.nombre || '',
              apellidos: empleado?.apellidos || empleado?.usuario?.apellidos || '',
              email: empleado?.email || empleado?.usuario?.email || '',
            }))
          );
        })
        .catch(() => {
          toast.error('No se pudieron cargar los empleados');
        })
        .finally(() => setCargandoEmpleados(false));
    }
  }, [open, empleados.length, cargandoEmpleados, documentoNombre]);

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
    const relativeX = (event.clientX - rect.left) / rect.width;
    const relativeY = (event.clientY - rect.top) / rect.height;
    const pdfX = Number((relativeX * PDF_WIDTH).toFixed(2));
    const pdfY = Number(((1 - relativeY) * PDF_HEIGHT).toFixed(2));
    setPosicionFirma({
      pagina: paginaSeleccionada,
      x: pdfX,
      y: pdfY,
    });
  };

  const handlePaginaChange = (value: string) => {
    const numero = Number(value);
    if (Number.isNaN(numero)) return;
    setPaginaSeleccionada(numero);
    setPosicionFirma((prev) => (prev ? { ...prev, pagina: numero } : prev));
  };

  const limpiarPosicion = () => setPosicionFirma(null);

  const handleSubmit = async () => {
    if (empleadosSeleccionados.length === 0) {
      toast.error('Selecciona al menos un firmante');
      return;
    }

    setLoading(true);
    try {
      const body = {
        documentoId,
        titulo: titulo.trim() || documentoNombre,
        firmantes: empleadosSeleccionados.map((empleadoId) => ({
          empleadoId,
        })),
        ordenFirma: false,
        posicionFirma: posicionFirma ?? undefined,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogScrollableContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Solicitar firma</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-6">
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
                  Haz clic sobre el documento para definir dónde aparecerá la firma. Por defecto se utilizará la última página.
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={limpiarPosicion} disabled={!posicionFirma}>
                Limpiar posición
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[240px,1fr] gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="pagina-firma" className="text-xs text-gray-600">
                    Página destino
                  </Label>
                  <Input
                    id="pagina-firma"
                    type="number"
                    min={-1}
                    className="w-20"
                    value={paginaSeleccionada}
                    onChange={(e) => handlePaginaChange(e.target.value)}
                    disabled={loading}
                  />
                  <span className="text-xs text-gray-500">-1 es última</span>
                </div>
                {posicionFirma ? (
                  <div className="rounded bg-blue-50 p-2 border border-blue-100">
                    <p className="text-xs text-blue-700 font-medium mb-1">Coordenadas</p>
                    <p className="text-xs text-blue-600">
                      X: {Math.round(posicionFirma.x)}<br />
                      Y: {Math.round(posicionFirma.y)}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic">
                    Sin posición personalizada. La firma se añadirá al final del documento.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="relative border rounded-lg overflow-hidden bg-gray-100 aspect-[3/4]">
                  {previewUrl && (
                    <>
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
                      <iframe
                        src={previewUrl}
                        className={`absolute inset-0 w-full h-full border-0 pointer-events-none transition-opacity duration-300 ${previewLoading ? 'opacity-0' : 'opacity-100'}`}
                        title="Previsualización del documento"
                        onLoad={() => setPreviewLoading(false)}
                        onError={() => {
                          setPreviewLoading(false);
                          setPreviewError(true);
                        }}
                      />
                    </>
                  )}
                  <div
                    ref={overlayRef}
                    className="absolute inset-0 cursor-crosshair z-20"
                    onClick={handlePosicionClick}
                    title="Haz clic para definir la posición de la firma"
                  >
                    {posicionFirma && (
                      <span
                        className="absolute w-4 h-4 rounded-full border-2 border-white bg-gray-900 shadow ring-2 ring-blue-500/50"
                        style={{
                          left: `${(posicionFirma.x / PDF_WIDTH) * 100}%`,
                          top: `${(1 - posicionFirma.y / PDF_HEIGHT) * 100}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </DialogBody>

        <DialogFooter>
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
        </DialogFooter>
      </DialogScrollableContent>
    </Dialog>
  );
}

