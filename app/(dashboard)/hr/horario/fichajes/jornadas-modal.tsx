'use client';

// ========================================
// Modal de Gestión de Jornadas - CON EDICIÓN INLINE
// ========================================

import { CalendarX, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { EmployeeListPreview } from '@/components/shared/employee-list-preview';
import { EmptyState } from '@/components/shared/empty-state';
import {
  type JornadaFormData,
  JornadaFormFields,
} from '@/components/shared/jornada-form-fields';
import { LoadingButton } from '@/components/shared/loading-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogScrollableContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type JornadaConfig, type DiaConfig } from '@/lib/calculos/fichajes-helpers';
import { useApi, useMutation } from '@/lib/hooks';

type DiaKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

const DIA_KEYS: DiaKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
const DIA_INICIAL: Record<DiaKey, string> = {
  lunes: 'L',
  martes: 'M',
  miercoles: 'X',
  jueves: 'J',
  viernes: 'V',
  sabado: 'S',
  domingo: 'D',
};

const isDiaConfig = (value: unknown): value is DiaConfig =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getDiaConfig = (config: JornadaConfig | null | undefined, dia: DiaKey): DiaConfig | undefined => {
  if (!config) return undefined;
  const value = config[dia];
  return isDiaConfig(value) ? value : undefined;
};

interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
}

interface Equipo {
  id: string;
  nombre: string;
  miembros: number;
}

interface Jornada {
  id: string;
  horasSemanales: number;
  config: JornadaConfig | null;
  esPredefinida: boolean;
  activa: boolean;
  nivelAsignacion?: 'empresa' | 'equipo' | 'individual';
  equiposAsignados?: string[];
  empleadosPreview?: Array<{
    id: string;
    nombre: string;
    apellidos?: string | null;
    fotoUrl?: string | null;
    avatar?: string | null;
  }>;
  _count?: {
    empleados: number;
  };
}

interface JornadasModalProps {
  open: boolean;
  onClose: () => void;
}

function createDefaultFormData(): JornadaFormData {
  return {
    tipoJornada: 'flexible',
    horasSemanales: '40',
    horariosFijos: {
      lunes: { activo: true, entrada: '09:00', salida: '18:00' },
      martes: { activo: true, entrada: '09:00', salida: '18:00' },
      miercoles: { activo: true, entrada: '09:00', salida: '18:00' },
      jueves: { activo: true, entrada: '09:00', salida: '18:00' },
      viernes: { activo: true, entrada: '09:00', salida: '18:00' },
      sabado: { activo: false, entrada: '', salida: '' },
      domingo: { activo: false, entrada: '', salida: '' },
    },
    tieneDescanso: true,
    descansoMinutos: '60',
  };
}

export function JornadasModal({ open, onClose }: JornadasModalProps) {
  // Estado de expansión/edición - UN SOLO ID que puede ser de jornada existente o 'new'
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form data - se usa tanto para crear como para editar
  const [formData, setFormData] = useState<JornadaFormData>(createDefaultFormData());
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [nivelAsignacion, setNivelAsignacion] = useState<'empresa' | 'equipo' | 'individual'>('empresa');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<string>('');

  // Estados auxiliares
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Hooks
  const { data: jornadasData, loading, execute: refetchJornadas } = useApi<Jornada[]>();
  const jornadas = jornadasData ?? [];
  const { execute: eliminarJornada } = useMutation<void>({ method: 'DELETE' });

  useEffect(() => {
    if (open) {
      refetchJornadas('/api/jornadas');
      cargarEmpleados();
      cargarEquipos();
    }
  }, [open]);

  async function cargarEmpleados() {
    try {
      const response = await fetch('/api/empleados');
      if (response.ok) {
        const data = await response.json() as { data?: unknown[] };
        const empleadosArray = Array.isArray(data.data) ? data.data : [];
        setEmpleados(
          empleadosArray.map((empleado: unknown) => {
            const e = empleado as { id: string; nombre: string; apellidos: string };
            return {
              id: e.id,
              nombre: e.nombre,
              apellidos: e.apellidos,
            };
          })
        );
      }
    } catch (error) {
      console.error('Error cargando empleados:', error);
    }
  }

  async function cargarEquipos() {
    try {
      const response = await fetch('/api/equipos');
      if (response.ok) {
        const data = await response.json() as { data?: unknown[] };
        const equiposArray = Array.isArray(data.data) ? data.data : [];
        setEquipos(
          equiposArray.map((equipo: unknown) => {
            const e = equipo as {
              id: string;
              nombre: string;
              _count?: { empleado_equipos?: number };
              numeroMiembros?: number;
            };
            return {
              id: e.id,
              nombre: e.nombre,
              miembros: e._count?.empleado_equipos || e.numeroMiembros || 0,
            };
          })
        );
      }
    } catch (error) {
      console.error('Error cargando equipos:', error);
    }
  }

  function handleNuevaJornada() {
    setEditingId('new');
    setFormData(createDefaultFormData());
    setNivelAsignacion('empresa');
    setEmpleadosSeleccionados([]);
    setEquipoSeleccionado('');
    setErrors({});
  }

  async function handleEditarJornada(jornada: Jornada) {
    setEditingId(jornada.id);

    // Cargar datos del formulario
    const config = jornada.config;
    const esFija = DIA_KEYS.some((dia) => {
      const diaConfig = getDiaConfig(config, dia);
      return Boolean(diaConfig?.entrada && diaConfig?.salida);
    });

    const horariosFijos: Record<DiaKey, { activo: boolean; entrada: string; salida: string }> = {
      lunes: { activo: false, entrada: '', salida: '' },
      martes: { activo: false, entrada: '', salida: '' },
      miercoles: { activo: false, entrada: '', salida: '' },
      jueves: { activo: false, entrada: '', salida: '' },
      viernes: { activo: false, entrada: '', salida: '' },
      sabado: { activo: false, entrada: '', salida: '' },
      domingo: { activo: false, entrada: '', salida: '' },
    };

    if (esFija && config) {
      DIA_KEYS.forEach((dia) => {
        const diaConfig = getDiaConfig(config, dia);
        if (diaConfig) {
          horariosFijos[dia] = {
            activo: Boolean(diaConfig.activo),
            entrada: diaConfig.entrada || '',
            salida: diaConfig.salida || '',
          };
        }
      });
    } else if (config) {
      DIA_KEYS.forEach((dia) => {
        const diaConfig = getDiaConfig(config, dia);
        if (diaConfig) {
          horariosFijos[dia] = {
            activo: Boolean(diaConfig.activo),
            entrada: '',
            salida: '',
          };
        }
      });
    }

    setFormData({
      tipoJornada: esFija ? 'fija' : 'flexible',
      horasSemanales: String(jornada.horasSemanales),
      horariosFijos,
      tieneDescanso: Boolean(config?.descanso),
      descansoMinutos: String(config?.descanso || 60),
    });

    // Cargar información de asignación
    if (jornada.nivelAsignacion) {
      setNivelAsignacion(jornada.nivelAsignacion);

      if (jornada.nivelAsignacion === 'individual') {
        // Cargar todos los empleados asignados
        try {
          const response = await fetch(`/api/jornadas/${jornada.id}`);
          if (response.ok) {
            const data = await response.json();
            const jornadaCompleta = data.data;
            if (jornadaCompleta?.empleados && Array.isArray(jornadaCompleta.empleados)) {
              const empleadosIds = jornadaCompleta.empleados.map((e: any) => e.id);
              setEmpleadosSeleccionados(empleadosIds);
            } else {
              setEmpleadosSeleccionados([]);
            }
          }
        } catch (error) {
          console.error('Error cargando empleados de jornada:', error);
          setEmpleadosSeleccionados([]);
        }
        setEquipoSeleccionado('');
      } else if (jornada.nivelAsignacion === 'equipo') {
        setEquipoSeleccionado('');
        setEmpleadosSeleccionados([]);
      } else {
        setEmpleadosSeleccionados([]);
        setEquipoSeleccionado('');
      }
    } else {
      setNivelAsignacion('empresa');
      setEmpleadosSeleccionados([]);
      setEquipoSeleccionado('');
    }

    setErrors({});
  }

  async function handleGuardar() {
    setGuardando(true);
    setErrors({});

    try {
      const horasSemanales = parseFloat(formData.horasSemanales);
      if (isNaN(horasSemanales) || horasSemanales <= 0) {
        setErrors({ horasSemanales: 'Las horas semanales deben ser un número mayor que 0' });
        return;
      }

      const config: JornadaConfig = {};

      if (formData.tipoJornada === 'fija') {
        DIA_KEYS.forEach((dia) => {
          const horario = formData.horariosFijos[dia];
          if (horario.activo) {
            config[dia] = {
              activo: true,
              entrada: horario.entrada,
              salida: horario.salida,
            };
          } else {
            config[dia] = { activo: false };
          }
        });
      } else {
        DIA_KEYS.forEach((dia) => {
          const horario = formData.horariosFijos[dia];
          config[dia] = { activo: horario.activo };
        });
      }

      if (formData.tieneDescanso) {
        config.descanso = parseInt(formData.descansoMinutos) || 60;
      }

      // 1. Crear o actualizar jornada
      const jornadaBody = {
        horasSemanales,
        config,
      };

      const isCreating = editingId === 'new';
      const url = isCreating ? '/api/jornadas' : `/api/jornadas/${editingId}`;
      const method = isCreating ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jornadaBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || errorData.message || 'Error al guardar jornada';
        toast.error(errorMsg);
        return;
      }

      const result = await response.json();
      const jornadaIdFinal = isCreating ? result.data?.id : editingId;

      // 2. Asignar empleados si hay nivel de asignación
      if (jornadaIdFinal && (nivelAsignacion || empleadosSeleccionados.length > 0 || equipoSeleccionado)) {
        const asignacionBody: any = {
          jornadaId: jornadaIdFinal,
          nivel: nivelAsignacion,
        };

        if (nivelAsignacion === 'individual') {
          asignacionBody.empleadosIds = empleadosSeleccionados;
        } else if (nivelAsignacion === 'equipo') {
          asignacionBody.equipoId = equipoSeleccionado;
        }

        const asignacionResponse = await fetch('/api/jornadas/asignar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(asignacionBody),
        });

        if (!asignacionResponse.ok) {
          const errorData = await asignacionResponse.json().catch(() => ({}));
          const errorMsg = errorData.error || errorData.message || 'Error al asignar jornada';
          toast.error(errorMsg);
          return;
        }
      }

      toast.success(isCreating ? 'Jornada creada' : 'Jornada actualizada');

      // Refrescar lista y cerrar edición
      await refetchJornadas('/api/jornadas');
      setEditingId(null);
    } catch (error) {
      console.error('Error guardando jornada:', error);
      toast.error('Error inesperado al guardar');
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(jornadaId: string) {
    if (!confirm('¿Estás seguro de eliminar esta jornada?')) return;

    try {
      await eliminarJornada(`/api/jornadas/${jornadaId}`, undefined);
      toast.success('Jornada eliminada');
      setEditingId(null);
      refetchJornadas('/api/jornadas');
    } catch (error) {
      toast.error('Error al eliminar la jornada');
    }
  }

  function getTipoBadge(jornada: Jornada) {
    const config = jornada.config;
    const esFija = DIA_KEYS.some((dia) => {
      const diaConfig = getDiaConfig(config, dia);
      return Boolean(diaConfig?.entrada && diaConfig?.salida);
    });

    return (
      <Badge variant={esFija ? 'default' : 'secondary'} className="capitalize">
        {esFija ? 'Fija' : 'Flexible'}
      </Badge>
    );
  }

  function renderAsignados(jornada: Jornada) {
    const numEmpleados = jornada._count?.empleados || 0;

    if (jornada.nivelAsignacion === 'empresa') {
      return (
        <span className="text-sm text-gray-900 font-medium">
          Toda la empresa ({numEmpleados})
        </span>
      );
    }

    if (jornada.nivelAsignacion === 'equipo' && jornada.equiposAsignados && jornada.equiposAsignados.length > 0) {
      return (
        <span className="text-sm text-gray-900">
          {jornada.equiposAsignados.join(', ')} ({numEmpleados})
        </span>
      );
    }

    if (jornada.empleadosPreview && jornada.empleadosPreview.length > 0) {
      return (
        <EmployeeListPreview
          empleados={jornada.empleadosPreview.map((e) => ({
            id: e.id,
            nombre: e.nombre,
            apellidos: e.apellidos ?? undefined,
            fotoUrl: e.fotoUrl ?? undefined,
            avatar: e.avatar ?? undefined,
          }))}
          maxVisible={5}
          dense
          avatarSize="xxs"
        />
      );
    }

    return (
      <span className="text-sm text-gray-500">
        Sin asignar
      </span>
    );
  }

  const isCreating = editingId === 'new';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogScrollableContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gestión de Jornadas</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {/* Tabla de jornadas */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : jornadas.length === 0 && !isCreating ? (
            <EmptyState
              icon={CalendarX}
              title="No hay jornadas configuradas"
              description="Crea la primera jornada para tus empleados"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Asignados</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Fila de crear nueva jornada */}
                {isCreating && (
                  <TableRow>
                    <TableCell colSpan={4} className="p-0">
                      <div className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Crear Nueva Jornada</h3>
                        <JornadaFormFields
                          data={formData}
                          onChange={setFormData}
                          errors={errors}
                          disabled={guardando}
                          showAsignacion={true}
                          nivelAsignacion={nivelAsignacion}
                          onNivelAsignacionChange={setNivelAsignacion}
                          empleados={empleados}
                          empleadosSeleccionados={empleadosSeleccionados}
                          onEmpleadosSeleccionChange={setEmpleadosSeleccionados}
                          equipos={equipos}
                          equipoSeleccionado={equipoSeleccionado}
                          onEquipoSeleccionadoChange={setEquipoSeleccionado}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Filas de jornadas existentes */}
                {jornadas.map((jornada) => (
                  <Fragment key={jornada.id}>
                    <TableRow
                      className={`cursor-pointer hover:bg-gray-50 ${editingId === jornada.id ? 'bg-gray-50' : ''}`}
                      onClick={() => {
                        if (editingId === jornada.id) {
                          setEditingId(null);
                        } else {
                          handleEditarJornada(jornada);
                        }
                      }}
                    >
                      <TableCell>{getTipoBadge(jornada)}</TableCell>
                      <TableCell className="font-medium">{jornada.horasSemanales}h</TableCell>
                      <TableCell>{renderAsignados(jornada)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          {editingId === jornada.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Fila expandida con formulario de edición */}
                    {editingId === jornada.id && (
                      <TableRow>
                        <TableCell colSpan={4} className="p-0">
                          <div className="p-6 border-t">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold">Editar Jornada</h3>
                              {!jornada.esPredefinida && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEliminar(jornada.id);
                                  }}
                                  className="border-red-200 text-red-600 hover:text-red-700 hover:border-red-300 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Eliminar Jornada
                                </Button>
                              )}
                            </div>
                            <JornadaFormFields
                              data={formData}
                              onChange={setFormData}
                              errors={errors}
                              disabled={guardando || jornada.esPredefinida}
                              showAsignacion={true}
                              nivelAsignacion={nivelAsignacion}
                              onNivelAsignacionChange={setNivelAsignacion}
                              empleados={empleados}
                              empleadosSeleccionados={empleadosSeleccionados}
                              onEmpleadosSeleccionChange={setEmpleadosSeleccionados}
                              equipos={equipos}
                              equipoSeleccionado={equipoSeleccionado}
                              onEquipoSeleccionadoChange={setEquipoSeleccionado}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogBody>

        <DialogFooter className="gap-2">
          {editingId ? (
            <>
              <Button
                variant="outline"
                onClick={() => setEditingId(null)}
                disabled={guardando}
              >
                Cancelar
              </Button>
              <LoadingButton onClick={handleGuardar} loading={guardando}>
                {isCreating ? 'Crear Jornada' : 'Guardar Cambios'}
              </LoadingButton>
            </>
          ) : (
            <>
              <Button onClick={onClose} variant="outline">
                Cerrar
              </Button>
              <Button onClick={handleNuevaJornada} className="gap-2">
                <Plus className="w-4 h-4" />
                Nueva Jornada
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogScrollableContent>
    </Dialog>
  );
}
