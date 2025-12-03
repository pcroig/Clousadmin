'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogHeader, DialogScrollableContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { parseJson } from '@/lib/utils/json';

interface FestivoPersonalizado {
  id: string;
  fecha: string;
  nombre: string;
  activo: boolean;
}

interface FestivosPersonalizadosModalProps {
  open: boolean;
  onClose: () => void;
  empleadoId: string;
  empleadoNombre: string;
}

export function FestivosPersonalizadosModal({
  open,
  onClose,
  empleadoId,
  empleadoNombre,
}: FestivosPersonalizadosModalProps) {
  const [festivos, setFestivos] = useState<FestivoPersonalizado[]>([]);
  const [loading, setLoading] = useState(false);
  const [creando, setCreando] = useState(false);
  const [nuevoFestivo, setNuevoFestivo] = useState({
    fecha: '',
    nombre: '',
  });

  const cargarFestivos = useCallback(async () => {
    if (!empleadoId) return;

    try {
      const response = await fetch(`/api/empleados/${empleadoId}/festivos`);
      if (!response.ok) {
        throw new Error('Error al cargar festivos personalizados');
      }

      const data = await parseJson<FestivoPersonalizado[]>(response);
      setFestivos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando festivos personalizados:', error);
      toast.error('Error al cargar festivos personalizados');
    }
  }, [empleadoId]);

  useEffect(() => {
    if (open) {
      cargarFestivos();
    }
  }, [open, cargarFestivos]);

  const handleCrearFestivo = async () => {
    if (!nuevoFestivo.fecha || !nuevoFestivo.nombre) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/empleados/${empleadoId}/festivos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empleadoId,
          fecha: nuevoFestivo.fecha,
          nombre: nuevoFestivo.nombre,
          activo: true,
        }),
      });

      if (!response.ok) {
        const error = await parseJson<{ error?: string }>(response).catch(() => ({
          error: 'Error desconocido',
        }));
        throw new Error(error.error || 'Error al crear festivo personalizado');
      }

      toast.success('Festivo personalizado creado correctamente');
      setNuevoFestivo({ fecha: '', nombre: '' });
      setCreando(false);
      cargarFestivos();
    } catch (error) {
      console.error('Error creando festivo personalizado:', error);
      toast.error(error instanceof Error ? error.message : 'Error al crear festivo personalizado');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarFestivo = async (festivoId: string) => {
    if (!confirm('¿Estás seguro de eliminar este festivo personalizado?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/empleados/${empleadoId}/festivos/${festivoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Error al eliminar festivo personalizado');
      }

      toast.success('Festivo personalizado eliminado correctamente');
      cargarFestivos();
    } catch (error) {
      console.error('Error eliminando festivo personalizado:', error);
      toast.error('Error al eliminar festivo personalizado');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivo = async (festivoId: string, activo: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/empleados/${empleadoId}/festivos/${festivoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !activo }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar festivo personalizado');
      }

      toast.success('Festivo personalizado actualizado correctamente');
      cargarFestivos();
    } catch (error) {
      console.error('Error actualizando festivo personalizado:', error);
      toast.error('Error al actualizar festivo personalizado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogScrollableContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Festivos personalizados - {empleadoNombre}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Configura festivos locales específicos para este empleado. Estos festivos se usarán en lugar de
              los festivos de empresa en las mismas fechas al calcular días laborables para ausencias.
            </p>

            {/* Formulario para crear nuevo festivo */}
            {creando ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Fecha
                    </label>
                    <Input
                      type="date"
                      value={nuevoFestivo.fecha}
                      onChange={(e) => setNuevoFestivo({ ...nuevoFestivo, fecha: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">
                      Nombre del festivo
                    </label>
                    <Input
                      type="text"
                      value={nuevoFestivo.nombre}
                      onChange={(e) => setNuevoFestivo({ ...nuevoFestivo, nombre: e.target.value })}
                      placeholder="Ej: Fiesta local de..."
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCrearFestivo} disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCreando(false);
                      setNuevoFestivo({ fecha: '', nombre: '' });
                    }}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setCreando(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Añadir festivo personalizado
              </Button>
            )}

            {/* Lista de festivos personalizados */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">
                Festivos personalizados ({festivos.length})
              </h4>
              {festivos.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">
                    No hay festivos personalizados configurados
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Los festivos de la empresa se aplicarán a este empleado
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {festivos.map((festivo) => (
                    <div
                      key={festivo.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {festivo.nombre}
                          </span>
                          {festivo.activo && (
                            <Badge variant="success" className="text-xs">
                              Activo
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(festivo.fecha), 'PPP', { locale: es })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActivo(festivo.id, festivo.activo)}
                          disabled={loading}
                        >
                          {festivo.activo ? 'Desactivar' : 'Activar'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEliminarFestivo(festivo.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogBody>
      </DialogScrollableContent>
    </Dialog>
  );
}

