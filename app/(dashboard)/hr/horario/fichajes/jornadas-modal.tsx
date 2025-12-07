'use client';

// ========================================
// Modal de Gestión de Jornadas - Con Tabla Expandible
// ========================================
// ACTUALIZADO: 7 Diciembre 2025 - Ahora usa tabla expandible inline
// igual que jornadas-client.tsx

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
  DialogLarge as Dialog,
  DialogLargeContent as DialogContent,
  DialogLargeHeader as DialogHeader,
  DialogLargeTitle as DialogTitle,
} from '@/components/ui/dialog-large';
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
import { useValidacionJornadas } from '@/lib/hooks/use-validacion-jornadas';

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

export function JornadasModal({ open, onClose }: JornadasModalProps) {
  // Estado de expansión
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Formulario de edición
  const [formData, setFormData] = useState<JornadaFormData>(createDefaultJornada());
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [nivelAsignacion, setNivelAsignacion] = useState<'empresa' | 'equipo' | 'individual'>('empresa');
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<string>('');

  // Estados auxiliares
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Hooks
  const { data: jornadas = [], loading, execute: refetchJornadas } = useApi<Jornada[]>();
  const { validar, mostrarErrores } = useValidacionJornadas();

  const { mutate: eliminarJornada } = useMutation<void, void>({
    onSuccess: () => {
      refetchJornadas('/api/jornadas');
    },
  });

  useEffect(() => {
    if (open) {
      refetchJornadas('/api/jornadas');
      cargarEmpleados();
      cargarEquipos();
    }
  }, [open, refetchJornadas]);

  async function cargarEmpleados() {
    try {
      const response = await fetch('/api/empleados');
      if (response.ok) {
        const data = await response.json() as { data?: Empleado[] };
        setEmpleados(Array.isArray(data.data) ? data.data : []);
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

  function createDefaultJornada(): JornadaFormData {
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

  function handleCrear() {
    setIsCreating(true);
    setExpandedId('new');
    setFormData(createDefaultJornada());
    setNivelAsignacion('empresa');
    setEmpleadosSeleccionados([]);
    setEquipoSeleccionado('');
    setErrors({});
  }

  function handleExpandirJornada(jornadaId: string, jornada: Jornada) {
    if (expandedId === jornadaId) {
      setExpandedId(null);
      setIsCreating(false);
    } else {
      setExpandedId(jornadaId);
      setIsCreating(false);
      cargarDatosJornada(jornada);
    }
  }

  function cargarDatosJornada(jornada: Jornada) {
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
    }

    setFormData({
      tipoJornada: esFija ? 'fija' : 'flexible',
      horasSemanales: String(jornada.horasSemanales),
      horariosFijos,
      tieneDescanso: Boolean(config?.descanso),
      descansoMinutos: String(config?.descanso || 60),
    });
  }

  async function handleGuardarJornada(jornadaId?: string) {
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

      const body = {
        horasSemanales,
        config,
        nivelAsignacion,
        empleadosIds: nivelAsignacion === 'individual' ? empleadosSeleccionados : undefined,
        equipoId: nivelAsignacion === 'equipo' ? equipoSeleccionado : undefined,
      };

      const url = jornadaId ? `/api/jornadas/${jornadaId}` : '/api/jornadas';
      const method = jornadaId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Error al guardar jornada');
      }

      toast.success(jornadaId ? 'Jornada actualizada' : 'Jornada creada');

      // Validar después de guardar
      const esValido = await validar();
      if (!esValido) {
        mostrarErrores();
      }

      refetchJornadas('/api/jornadas');
      setExpandedId(null);
      setIsCreating(false);
    } catch (error) {
      console.error('Error guardando jornada:', error);
      toast.error('Error al guardar la jornada');
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(jornadaId: string) {
    if (!confirm('¿Estás seguro de eliminar esta jornada?')) return;

    try {
      eliminarJornada(`/api/jornadas/${jornadaId}`, undefined);
      toast.success('Jornada eliminada');
      setExpandedId(null);
    } catch (error) {
      toast.error('Error al eliminar la jornada');
    }
  }

  function getNombreGenerado(jornada: Jornada): string {
    const config = jornada.config;
    const esFija = DIA_KEYS.some((dia) => {
      const diaConfig = getDiaConfig(config, dia);
      return Boolean(diaConfig?.entrada && diaConfig?.salida);
    });

    if (esFija && config) {
      const primerDiaActivo = DIA_KEYS.find((dia) => {
        const diaConfig = getDiaConfig(config, dia);
        return diaConfig?.activo && diaConfig.entrada && diaConfig.salida;
      });

      if (primerDiaActivo) {
        const diaConfig = getDiaConfig(config, primerDiaActivo);
        return `Jornada Fija ${jornada.horasSemanales}h (${diaConfig?.entrada}-${diaConfig?.salida})`;
      }
    }

    return `Jornada Flexible ${jornada.horasSemanales}h`;
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

  function getDiasLaborables(jornada: Jornada) {
    return DIA_KEYS.map((dia) => {
      const diaConfig = getDiaConfig(jornada.config, dia);
      const activo = diaConfig?.activo ?? false;

      return (
        <span
          key={dia}
          className={`w-6 h-6 rounded-md text-[10px] font-semibold flex items-center justify-center border ${
            activo
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-gray-50 text-gray-400 border-gray-200'
          }`}
        >
          {DIA_INICIAL[dia]}
        </span>
      );
    });
  }

  function renderAsignados(jornada: Jornada) {
    if (!jornada.empleadosPreview || jornada.empleadosPreview.length === 0) {
      return (
        <span className="text-sm text-gray-500">
          {jornada._count?.empleados || 0} empleado{jornada._count?.empleados !== 1 ? 's' : ''}
        </span>
      );
    }

    return (
      <EmployeeListPreview
        empleados={jornada.empleadosPreview.map((e) => ({
          id: e.id,
          nombre: e.nombre,
          apellidos: e.apellidos ?? undefined,
          fotoUrl: e.fotoUrl ?? undefined,
          avatar: e.avatar ?? undefined,
        }))}
        maxVisible={3}
        avatarSize="md"
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestión de Jornadas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Botón crear */}
          <div className="flex justify-end">
            <Button onClick={handleCrear} disabled={isCreating} className="gap-2">
              <Plus className="w-4 h-4" />
              Nueva Jornada
            </Button>
          </div>

          {/* Tabla con filas expandibles */}
          {loading ? (
            <div className="text-center py-8 text-gray-500">Cargando...</div>
          ) : jornadas.length === 0 ? (
            <EmptyState
              icon={CalendarX}
              title="No hay jornadas configuradas"
              description="Crea la primera jornada para tus empleados"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Asignados</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Fila para crear nueva jornada */}
                {isCreating && expandedId === 'new' && (
                  <Fragment>
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <div className="p-6 bg-gray-50">
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
                          <div className="flex justify-end gap-2 mt-4">
                            <LoadingButton onClick={() => handleGuardarJornada()} loading={guardando}>
                              Crear Jornada
                            </LoadingButton>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setExpandedId(null);
                                setIsCreating(false);
                              }}
                              disabled={guardando}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                )}

                {/* Filas de jornadas existentes */}
                {jornadas.map((jornada) => (
                  <Fragment key={jornada.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleExpandirJornada(jornada.id, jornada)}
                    >
                      <TableCell>
                        <div className="font-medium text-gray-900">{getNombreGenerado(jornada)}</div>
                      </TableCell>
                      <TableCell>{getTipoBadge(jornada)}</TableCell>
                      <TableCell>{jornada.horasSemanales}h</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {getDiasLaborables(jornada)}
                        </div>
                      </TableCell>
                      <TableCell>{renderAsignados(jornada)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          {expandedId === jornada.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Fila expandida con formulario de edición */}
                    {expandedId === jornada.id && !isCreating && (
                      <TableRow>
                        <TableCell colSpan={6} className="p-0">
                          <div className="p-6 bg-gray-50 border-t">
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
                            <div className="flex justify-end gap-2 mt-4">
                              {!jornada.esPredefinida && (
                                <LoadingButton onClick={() => handleGuardarJornada(jornada.id)} loading={guardando}>
                                  Guardar Cambios
                                </LoadingButton>
                              )}
                              <Button
                                variant="outline"
                                onClick={() => setExpandedId(null)}
                                disabled={guardando}
                              >
                                Cerrar
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
