'use client';

// ========================================
// Jornadas Client Component - Rediseñado con Tabla Expandible
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
import { TableHeader as PageHeader } from '@/components/shared/table-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

interface HorarioDia {
  activo: boolean;
  entrada: string;
  salida: string;
}

export function JornadasClient() {
  // Estado de expansión
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Formulario de edición
  const [formData, setFormData] = useState<JornadaFormData>(createDefaultJornada());
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState<string[]>([]);
  const [nivelAsignacion, setNivelAsignacion] = useState<'empresa' | 'equipo' | 'individual'>('empresa');
  const [equiposSeleccionados, setEquiposSeleccionados] = useState<string[]>([]);

  // Estados auxiliares
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [jornadaAEliminar, setJornadaAEliminar] = useState<Jornada | null>(null);

  // Hooks
  const { data: jornadas = [], loading, execute: refetchJornadas } = useApi<Jornada[]>();
  const { validar, mostrarErrores } = useValidacionJornadas();

  const { mutate: eliminarJornada, loading: eliminando } = useMutation<void, void>({
    onSuccess: () => {
      toast.success('Jornada eliminada');
      setExpandedId(null);
      setJornadaAEliminar(null);
      refetchJornadas('/api/jornadas');
    },
    onError: (error) => {
      toast.error(error.message || 'Error al eliminar jornada');
    },
  });

  useEffect(() => {
    refetchJornadas('/api/jornadas');
    cargarEmpleados();
    cargarEquipos();
  }, [refetchJornadas]);

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
    setEquiposSeleccionados([]);
    setErrors({});
  }

  function handleExpandirJornada(jornadaId: string, jornada: Jornada) {
    if (expandedId === jornadaId) {
      // Colapsar
      setExpandedId(null);
      setIsCreating(false);
    } else {
      // Expandir y cargar datos de la jornada
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

    const newHorariosFijos: Record<string, HorarioDia> = {};
    DIA_KEYS.forEach((dia) => {
      const diaConfig = getDiaConfig(config, dia);
      if (diaConfig) {
        newHorariosFijos[dia] = {
          activo: diaConfig.activo ?? true,
          entrada: diaConfig.entrada ?? '09:00',
          salida: diaConfig.salida ?? '18:00',
        };
      } else {
        newHorariosFijos[dia] = {
          activo: dia !== 'sabado' && dia !== 'domingo',
          entrada: '09:00',
          salida: '18:00',
        };
      }
    });

    // Calcular descanso
    let descansoMinutos = '';
    let tieneDescanso = false;

    if (esFija) {
      const primerDiaConPausa = DIA_KEYS.find((dia) => {
        const diaConfig = getDiaConfig(config, dia);
        return Boolean(diaConfig?.pausa_inicio && diaConfig?.pausa_fin);
      });
      if (primerDiaConPausa) {
        const diaConfig = getDiaConfig(config, primerDiaConPausa);
        if (diaConfig?.pausa_inicio && diaConfig?.pausa_fin) {
          const [h1, m1] = diaConfig.pausa_inicio.split(':').map(Number);
          const [h2, m2] = diaConfig.pausa_fin.split(':').map(Number);
          const minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
          descansoMinutos = minutos.toString();
          tieneDescanso = minutos > 0;
        }
      }
    } else {
      const descansoMinimo = typeof config?.descansoMinimo === 'string' ? config.descansoMinimo : '';
      if (descansoMinimo) {
        const [h, m] = descansoMinimo.split(':').map(Number);
        const minutos = h * 60 + m;
        descansoMinutos = minutos.toString();
        tieneDescanso = minutos > 0;
      }
    }

    setFormData({
      tipoJornada: esFija ? 'fija' : 'flexible',
      horasSemanales: jornada.horasSemanales.toString(),
      horariosFijos: newHorariosFijos,
      tieneDescanso,
      descansoMinutos,
    });

    // Reset asignación (se cargará al expandir)
    setNivelAsignacion('empresa');
    setEmpleadosSeleccionados([]);
    setEquiposSeleccionados([]);
  }

  async function handleGuardar(jornadaId?: string) {
    if (!validarFormulario()) return;

    setGuardando(true);
    try {
      // Construir config
      const config: JornadaConfig = {};
      const descansoMinutos = formData.tieneDescanso ? parseInt(formData.descansoMinutos || '0', 10) : 0;

      if (formData.tipoJornada === 'fija') {
        DIA_KEYS.forEach((dia) => {
          const horario = formData.horariosFijos[dia];
          if (descansoMinutos > 0 && horario.activo) {
            const pausaInicio = '14:00';
            const [h, m] = pausaInicio.split(':').map(Number);
            const totalMinutos = h * 60 + m + descansoMinutos;
            const pausaFin = `${Math.floor(totalMinutos / 60).toString().padStart(2, '0')}:${(totalMinutos % 60).toString().padStart(2, '0')}`;

            config[dia] = {
              activo: horario.activo,
              entrada: horario.entrada,
              salida: horario.salida,
              pausa_inicio: pausaInicio,
              pausa_fin: pausaFin,
            };
          } else {
            config[dia] = {
              activo: horario.activo,
              entrada: horario.entrada,
              salida: horario.salida,
            };
          }
        });
      } else {
        DIA_KEYS.forEach((dia) => {
          const estadoDia = formData.horariosFijos[dia];
          config[dia] = { activo: estadoDia?.activo ?? false };
        });

        if (descansoMinutos > 0) {
          const horas = Math.floor(descansoMinutos / 60);
          const minutos = descansoMinutos % 60;
          config.descansoMinimo = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
        }
      }

      config.tipo = formData.tipoJornada;

      // Crear o actualizar jornada
      const url = jornadaId ? `/api/jornadas/${jornadaId}` : '/api/jornadas';
      const method = jornadaId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: formData.tipoJornada,
          horasSemanales: parseFloat(formData.horasSemanales),
          config,
        }),
      });

      if (!response.ok) {
        const error = await response.json() as { error?: string };
        toast.error(error.error || 'Error al guardar jornada');
        setGuardando(false);
        return;
      }

      const jornadaGuardada = await response.json() as { id: string };
      const idJornada = jornadaGuardada.id;

      // Asignar empleados si corresponde
      const debeAsignar = (nivelAsignacion === 'individual' && empleadosSeleccionados.length > 0) ||
                         (nivelAsignacion === 'equipo' && equiposSeleccionados) ||
                         nivelAsignacion === 'empresa';

      if (debeAsignar) {
        await fetch('/api/jornadas/asignar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jornadaId: idJornada,
            nivel: nivelAsignacion,
            equipoIds: nivelAsignacion === 'equipo' && equiposSeleccionados.length > 0 ? equiposSeleccionados : undefined,
            empleadoIds: nivelAsignacion === 'individual' ? empleadosSeleccionados : undefined,
          }),
        });
      }

      // Validar asignaciones completas
      const validacionOk = await validar();
      if (!validacionOk) {
        mostrarErrores();
      }

      toast.success(jornadaId ? 'Jornada actualizada exitosamente' : 'Jornada creada exitosamente');
      setExpandedId(null);
      setIsCreating(false);
      refetchJornadas('/api/jornadas');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar jornada');
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminarJornada() {
    if (!jornadaAEliminar) return;
    await eliminarJornada(`/api/jornadas/${jornadaAEliminar.id}`, undefined, { method: 'DELETE' });
  }

  function validarFormulario(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.horasSemanales || parseFloat(formData.horasSemanales) <= 0) {
      newErrors.horasSemanales = 'Las horas semanales deben ser mayores a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function getTipoBadge(jornada: Jornada) {
    const config = jornada.config;
    const esFija = DIA_KEYS.some((dia) => {
      const diaConfig = getDiaConfig(config, dia);
      return Boolean(diaConfig?.entrada && diaConfig?.salida);
    });

    return esFija ? (
      <Badge className="bg-green-100 text-green-800">Fija</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">Flexible</Badge>
    );
  }

  const DIA_LABELS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  function getDiasLaborables(jornada: Jornada) {
    const config = jornada.config;
    return DIA_KEYS.map((dia, index) => {
      const diaConfig = getDiaConfig(config, dia);
      const activo = diaConfig?.activo ?? false;
      return (
        <span
          key={dia}
          className={`inline-block w-6 h-6 text-center rounded text-[10px] font-medium ${
            activo
              ? 'bg-gray-900 text-white'
              : 'bg-gray-200 text-gray-500'
          }`}
          style={{ marginRight: index < DIA_KEYS.length - 1 ? '4px' : '0' }}
        >
          {DIA_LABELS_SHORT[index]}
        </span>
      );
    });
  }

  function getNombreGenerado(jornada: Jornada) {
    const config = jornada.config;
    const esFija = DIA_KEYS.some((dia) => {
      const diaConfig = getDiaConfig(config, dia);
      return Boolean(diaConfig?.entrada && diaConfig?.salida);
    });

    const tipo = esFija ? 'Fija' : 'Flexible';
    const horas = jornada.horasSemanales;

    return `Jornada ${tipo} ${horas}h`;
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
    <div className="h-full w-full flex flex-col px-1 py-1 sm:max-w-[1800px] sm:mx-auto sm:px-8 sm:py-6">
      <PageHeader
        title="Jornadas Laborales"
        actionButton={{
          label: '+ Nueva Jornada',
          onClick: handleCrear,
        }}
      />

      <div className="flex-1 overflow-y-auto">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Horas Semanales</TableHead>
                <TableHead>Días Laborables</TableHead>
                <TableHead>Asignados</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : !jornadas || jornadas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-0">
                    <EmptyState
                      layout="table"
                      icon={CalendarX}
                      title="No hay jornadas creadas"
                      description="Crea una jornada para asignarla a los empleados"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* Fila para crear nueva jornada */}
                  {isCreating && expandedId === 'new' && (
                    <Fragment>
                      <TableRow>
                        <TableCell colSpan={6} className="p-0">
                          <div className="p-6 bg-gray-50 border-t">
                            <h3 className="text-lg font-semibold mb-4">Nueva Jornada</h3>
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
                              equiposSeleccionados={equiposSeleccionados}
                              onEquiposSeleccionadosChange={setEquiposSeleccionados}
                            />
                            <div className="flex gap-2 mt-6">
                              <LoadingButton onClick={() => handleGuardar()} loading={guardando}>
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
                                      setJornadaAEliminar(jornada);
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
                                equiposSeleccionados={equiposSeleccionados}
                                onEquiposSeleccionadosChange={setEquiposSeleccionados}
                              />
                              {!jornada.esPredefinida && (
                                <div className="flex gap-2 mt-6">
                                  <LoadingButton onClick={() => handleGuardar(jornada.id)} loading={guardando}>
                                    Guardar Cambios
                                  </LoadingButton>
                                  <Button
                                    variant="outline"
                                    onClick={() => setExpandedId(null)}
                                    disabled={guardando}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <AlertDialog
        open={Boolean(jornadaAEliminar)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !eliminando) {
            setJornadaAEliminar(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar jornada?</AlertDialogTitle>
            {jornadaAEliminar ? (
              <AlertDialogDescription>
                Se eliminará la jornada «{getNombreGenerado(jornadaAEliminar)}». Esta acción no se puede
                deshacer y se desasignará de {jornadaAEliminar._count?.empleados ?? 0} empleado
                {jornadaAEliminar._count?.empleados === 1 ? '' : 's'}.
              </AlertDialogDescription>
            ) : (
              <AlertDialogDescription>Confirma la eliminación de la jornada seleccionada.</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminarJornada}
              className="bg-red-600 hover:bg-red-700"
              disabled={eliminando}
            >
              {eliminando ? 'Eliminando...' : 'Eliminar jornada'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
