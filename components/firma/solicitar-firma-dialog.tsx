'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableMultiSelect } from '@/components/shared/searchable-multi-select';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

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
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const PDF_WIDTH = 595;
  const PDF_HEIGHT = 842;

  useEffect(() => {
    if (!open) {
      setEmpleadosSeleccionados([]);
      setTitulo(`Firma de ${documentoNombre}`);
      setPosicionFirma(null);
      setPaginaSeleccionada(-1);
      return;
    }

    if (empleados.length === 0 && !cargandoEmpleados) {
      setCargandoEmpleados(true);
      fetch('/api/empleados?activos=true')
        .then((res) => (res.ok ? res.json() : Promise.reject()))
        .then((data) => {
          const lista = Array.isArray(data?.empleados) ? data.empleados : Array.isArray(data) ? data : [];
          setEmpleados(
            lista.map((empleado: {
              id: string;
              nombre?: string;
              apellidos?: string;
              email?: string;
              usuario?: {
                nombre?: string;
                apellidos?: string;
                email?: string;
              };
            }) => ({
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

  const previewUrl = useMemo(
    () => `/api/documentos/${documentoId}?inline=1&ts=${open ? Date.now() : 0}`,
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

      const data = await res.json();
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
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Solicitar firma</DialogTitle>
        </DialogHeader>

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
            <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="pagina-firma" className="text-xs text-gray-600">
                    Página destino
                  </Label>
                  <Input
                    id="pagina-firma"
                    type="number"
                    min={-1}
                    className="w-28"
                    value={paginaSeleccionada}
                    onChange={(e) => handlePaginaChange(e.target.value)}
                    disabled={loading}
                  />
                  <span className="text-xs text-gray-500">Usa -1 para última página</span>
                </div>
                {posicionFirma ? (
                  <p className="text-xs text-gray-600">
                    Coordenadas seleccionadas: X {Math.round(posicionFirma.x)} pt · Y {Math.round(posicionFirma.y)} pt
                  </p>
                ) : (
                  <p className="text-xs text-gray-500">Aún no has seleccionado una posición personalizada.</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="relative border rounded-lg overflow-hidden bg-gray-100 aspect-[3/4]">
                  {previewUrl && (
                    <iframe
                      src={previewUrl}
                      className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                      title="Previsualización del documento"
                    />
                  )}
                  <div
                    ref={overlayRef}
                    className="absolute inset-0 cursor-crosshair"
                    onClick={handlePosicionClick}
                    title="Haz clic para definir la posición de la firma"
                  >
                    {posicionFirma && (
                      <span
                        className="absolute w-4 h-4 rounded-full border-2 border-white bg-gray-900 shadow"
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
      </DialogContent>
    </Dialog>
  );
}

