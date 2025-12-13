'use client';

// ========================================
// Modal para Editar Jornada de un Empleado
// ========================================

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { LoadingButton } from '@/components/shared/loading-button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogScrollableContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { obtenerEtiquetaJornada } from '@/lib/jornadas/helpers';
import { parseJson } from '@/lib/utils/json';

import type { DiaConfig, JornadaConfig } from '@/lib/calculos/fichajes-helpers';

type DiaKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

const DIA_KEYS: Array<{ key: DiaKey; label: string; shortLabel: string }> = [
  { key: 'lunes', label: 'Lunes', shortLabel: 'L' },
  { key: 'martes', label: 'Martes', shortLabel: 'M' },
  { key: 'miercoles', label: 'Miércoles', shortLabel: 'X' },
  { key: 'jueves', label: 'Jueves', shortLabel: 'J' },
  { key: 'viernes', label: 'Viernes', shortLabel: 'V' },
  { key: 'sabado', label: 'Sábado', shortLabel: 'S' },
  { key: 'domingo', label: 'Domingo', shortLabel: 'D' },
];

const isDiaConfig = (value: unknown): value is DiaConfig =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getDiaConfig = (config: JornadaConfig | null | undefined, dia: DiaKey): DiaConfig | undefined => {
  if (!config) return undefined;
  const value = config[dia];
  return isDiaConfig(value) ? value : undefined;
};

interface Jornada {
  id: string;
  horasSemanales: number;
  config: JornadaConfig | null;
}

interface JornadaPrevia {
  id: string;
  horasSemanales: number;
  config: JornadaConfig | null;
}

interface JornadaNueva {
  id: string;
  horasSemanales: number;
  config: JornadaConfig | null;
}

interface EditarJornadaEmpleadoModalProps {
  open: boolean;
  empleadoId: string;
  empleadoNombre: string;
  jornadaActual?: {
    id: string;
    horasSemanales: number;
    config: JornadaConfig | null;
  } | null;
  onClose: () => void;
}

export function EditarJornadaEmpleadoModal({
  open,
  empleadoId,
  empleadoNombre,
  jornadaActual,
  onClose,
}: EditarJornadaEmpleadoModalProps) {
  const router = useRouter();
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState<string>('');
  const [cargando, setCargando] = useState(false);
  const [cargandoJornadas, setCargandoJornadas] = useState(true);

  // Estado para confirmación de cambio
  const [mostrarAlertaConfirmacion, setMostrarAlertaConfirmacion] = useState(false);
  const [jornadaPrevia, setJornadaPrevia] = useState<JornadaPrevia | null>(null);
  const [jornadaNueva, setJornadaNueva] = useState<JornadaNueva | null>(null);

  useEffect(() => {
    if (open) {
      cargarJornadas();
      setJornadaSeleccionada(jornadaActual?.id || '');
    }
  }, [open, jornadaActual]);

  async function cargarJornadas() {
    setCargandoJornadas(true);
    try {
      const response = await fetch('/api/jornadas');
      if (!response.ok) throw new Error('Error al cargar jornadas');

      const data = await parseJson<Jornada[]>(response);
      setJornadas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando jornadas:', error);
      toast.error('Error al cargar las jornadas disponibles');
    } finally {
      setCargandoJornadas(false);
    }
  }

  async function handleGuardar() {
    if (!jornadaSeleccionada) {
      toast.error('Debes seleccionar una jornada');
      return;
    }

    // Si no hay cambio, no hacer nada
    if (jornadaSeleccionada === jornadaActual?.id) {
      toast.info('No se realizaron cambios');
      onClose();
      return;
    }

    setCargando(true);
    try {
      // Intentar actualizar sin confirmación primero
      const response = await fetch(`/api/empleados/${empleadoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jornadaId: jornadaSeleccionada }),
      });

      const data = await response.json() as Record<string, unknown>;

      if (response.status === 409 && data.code === 'JORNADA_PREVIA_DETECTADA') {
        // Se detectó jornada previa, mostrar confirmación
        setJornadaPrevia(data.jornadaPrevia as JornadaPrevia);
        setJornadaNueva(data.jornadaNueva as JornadaNueva);
        setMostrarAlertaConfirmacion(true);
        setCargando(false);
        return;
      }

      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Error al actualizar jornada');
      }

      toast.success('Jornada actualizada correctamente');
      router.refresh();
      onClose();
    } catch (error) {
      console.error('Error actualizando jornada:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar la jornada');
    } finally {
      setCargando(false);
    }
  }

  async function handleConfirmarCambio() {
    setCargando(true);
    try {
      // Reenviar con confirmación explícita
      const response = await fetch(`/api/empleados/${empleadoId}?confirmar=true`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jornadaId: jornadaSeleccionada }),
      });

      const data = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Error al actualizar jornada');
      }

      toast.success('Jornada actualizada correctamente');
      setMostrarAlertaConfirmacion(false);
      router.refresh();
      onClose();
    } catch (error) {
      console.error('Error confirmando cambio de jornada:', error);
      toast.error(error instanceof Error ? error.message : 'Error al actualizar la jornada');
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogScrollableContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Jornada</DialogTitle>
            <p className="text-sm text-gray-500 mt-2">
              Modificar la jornada laboral de <strong>{empleadoNombre}</strong>
            </p>
          </DialogHeader>

          <DialogBody>
            {jornadaActual && (
              <div className="mb-4 rounded-lg bg-gray-50 p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Jornada actual:</p>
                  <p className="text-base font-semibold text-gray-900">
                    {obtenerEtiquetaJornada({
                      horasSemanales: jornadaActual.horasSemanales,
                      config: jornadaActual.config,
                      id: jornadaActual.id,
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Días laborables:</p>
                  <div className="flex gap-1">
                    {DIA_KEYS.map((dia) => {
                      const diaConfig = getDiaConfig(jornadaActual.config, dia.key);
                      const activo = diaConfig?.activo ?? false;
                      return (
                        <div
                          key={dia.key}
                          className={`flex-1 px-2 py-1.5 rounded text-xs font-medium text-center ${
                            activo
                              ? 'bg-gray-900 text-white'
                              : 'bg-gray-200 text-gray-500'
                          }`}
                        >
                          {dia.shortLabel}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="jornada">Nueva jornada</Label>
              <Select
                value={jornadaSeleccionada}
                onValueChange={setJornadaSeleccionada}
                disabled={cargandoJornadas || cargando}
              >
                <SelectTrigger id="jornada">
                  <SelectValue placeholder="Selecciona una jornada..." />
                </SelectTrigger>
                <SelectContent>
                  {cargandoJornadas ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      Cargando jornadas...
                    </div>
                  ) : jornadas.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No hay jornadas disponibles
                    </div>
                  ) : (
                    jornadas.map((jornada) => (
                      <SelectItem key={jornada.id} value={jornada.id}>
                        {obtenerEtiquetaJornada({
                          horasSemanales: jornada.horasSemanales,
                          config: jornada.config,
                          id: jornada.id,
                        })}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Preview de la jornada seleccionada */}
            {jornadaSeleccionada && jornadaSeleccionada !== jornadaActual?.id && (
              <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                <p className="text-sm font-medium text-emerald-900">Vista previa de la nueva jornada:</p>
                <div className="flex gap-1">
                  {DIA_KEYS.map((dia) => {
                    const jornadaPreview = jornadas.find(j => j.id === jornadaSeleccionada);
                    const diaConfig = getDiaConfig(jornadaPreview?.config, dia.key);
                    const activo = diaConfig?.activo ?? false;
                    return (
                      <div
                        key={dia.key}
                        className={`flex-1 px-2 py-1.5 rounded text-xs font-medium text-center ${
                          activo
                            ? 'bg-emerald-700 text-white'
                            : 'bg-emerald-200 text-emerald-600'
                        }`}
                      >
                        {dia.shortLabel}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </DialogBody>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={cargando}>
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleGuardar}
              loading={cargando}
              disabled={!jornadaSeleccionada || jornadaSeleccionada === jornadaActual?.id}
            >
              Guardar Cambios
            </LoadingButton>
          </DialogFooter>
        </DialogScrollableContent>
      </Dialog>

      {/* Alert Dialog para confirmar cambio de jornada previa */}
      <AlertDialog open={mostrarAlertaConfirmacion} onOpenChange={setMostrarAlertaConfirmacion}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cambio de jornada?</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-3">
                El empleado <strong>{empleadoNombre}</strong> ya tiene asignada una jornada.
              </p>

              <div className="space-y-2 rounded-lg bg-gray-50 p-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Jornada actual:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {jornadaPrevia && obtenerEtiquetaJornada({
                      horasSemanales: jornadaPrevia.horasSemanales,
                      config: jornadaPrevia.config,
                      id: jornadaPrevia.id,
                    })}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Nueva jornada:</span>
                  <span className="ml-2 font-semibold text-emerald-600">
                    {jornadaNueva && obtenerEtiquetaJornada({
                      horasSemanales: jornadaNueva.horasSemanales,
                      config: jornadaNueva.config,
                      id: jornadaNueva.id,
                    })}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-sm font-medium">
                ¿Estás seguro de que deseas reemplazar la jornada actual?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setMostrarAlertaConfirmacion(false);
                setJornadaPrevia(null);
                setJornadaNueva(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarCambio} disabled={cargando}>
              {cargando ? 'Guardando...' : 'Sí, cambiar jornada'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}











