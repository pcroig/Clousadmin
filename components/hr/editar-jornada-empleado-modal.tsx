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
import { parseJson } from '@/lib/utils/json';

interface Jornada {
  id: string;
  nombre: string;
  horasSemanales: number;
}

interface JornadaPrevia {
  id: string;
  nombre: string;
}

interface JornadaNueva {
  id: string;
  nombre: string;
}

interface EditarJornadaEmpleadoModalProps {
  open: boolean;
  empleadoId: string;
  empleadoNombre: string;
  jornadaActual?: {
    id: string;
    nombre: string;
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
              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-700">Jornada actual:</p>
                <p className="text-base font-semibold text-gray-900">{jornadaActual.nombre}</p>
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
                        {jornada.nombre} ({jornada.horasSemanales}h semanales)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
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
                    {jornadaPrevia?.nombre}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Nueva jornada:</span>
                  <span className="ml-2 font-semibold text-emerald-600">
                    {jornadaNueva?.nombre}
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


