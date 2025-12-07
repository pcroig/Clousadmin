'use client';

// ========================================
// Modal de Gestión de Jornadas - SIMPLIFICADO
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

export function JornadasModal({ open, onClose }: JornadasModalProps) {
  // Estado de expansión - solo para ver detalles
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Estados auxiliares
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [guardando, setGuardando] = useState(false);

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

  async function handleEliminar(jornadaId: string) {
    if (!confirm('¿Estás seguro de eliminar esta jornada?')) return;

    try {
      await eliminarJornada(`/api/jornadas/${jornadaId}`, undefined);
      toast.success('Jornada eliminada');
      setExpandedId(null);
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

    // Caso 1: Toda la empresa
    if (jornada.nivelAsignacion === 'empresa') {
      return (
        <span className="text-sm text-gray-900 font-medium">
          Toda la empresa ({numEmpleados})
        </span>
      );
    }

    // Caso 2: Por equipos
    if (jornada.nivelAsignacion === 'equipo' && jornada.equiposAsignados && jornada.equiposAsignados.length > 0) {
      return (
        <span className="text-sm text-gray-900">
          {jornada.equiposAsignados.join(', ')} ({numEmpleados})
        </span>
      );
    }

    // Caso 3: Empleados individuales
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

    // Sin asignación
    return (
      <span className="text-sm text-gray-500">
        Sin asignar
      </span>
    );
  }

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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Asignados</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jornadas.map((jornada) => (
                  <Fragment key={jornada.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedId(expandedId === jornada.id ? null : jornada.id)}
                    >
                      <TableCell>{getTipoBadge(jornada)}</TableCell>
                      <TableCell className="font-medium">{jornada.horasSemanales}h</TableCell>
                      <TableCell>{renderAsignados(jornada)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          {expandedId === jornada.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Fila expandida con detalles */}
                    {expandedId === jornada.id && (
                      <TableRow>
                        <TableCell colSpan={4} className="p-0">
                          <div className="p-6 border-t bg-gray-50">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold">Detalles de la jornada</h3>
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

                            {/* Mostrar detalles de configuración */}
                            <div className="space-y-3 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Tipo:</span>{' '}
                                <span className="text-gray-900">{getTipoBadge(jornada)}</span>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Horas semanales:</span>{' '}
                                <span className="text-gray-900">{jornada.horasSemanales}h</span>
                              </div>
                              {jornada.config?.descanso && (
                                <div>
                                  <span className="font-medium text-gray-700">Descanso:</span>{' '}
                                  <span className="text-gray-900">{jornada.config.descanso} minutos</span>
                                </div>
                              )}

                              {/* Días laborables */}
                              <div>
                                <span className="font-medium text-gray-700">Días laborables:</span>
                                <div className="flex gap-2 mt-2">
                                  {DIA_KEYS.map((dia) => {
                                    const diaConfig = getDiaConfig(jornada.config, dia);
                                    const activo = diaConfig?.activo ?? false;
                                    return (
                                      <div key={dia} className="flex flex-col items-center gap-1">
                                        <span
                                          className={`w-8 h-8 rounded-md text-xs font-semibold flex items-center justify-center border ${
                                            activo
                                              ? 'bg-gray-900 text-white border-gray-900'
                                              : 'bg-white text-gray-400 border-gray-200'
                                          }`}
                                        >
                                          {DIA_INICIAL[dia]}
                                        </span>
                                        {activo && diaConfig?.entrada && diaConfig?.salida && (
                                          <span className="text-[10px] text-gray-600">
                                            {diaConfig.entrada}-{diaConfig.salida}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
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
        </DialogBody>

        <DialogFooter className="gap-2">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
          <Button onClick={() => {
            // Navegar a la página de gestión de jornadas para crear/editar
            window.location.href = '/hr/horario/jornadas';
          }} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Jornada
          </Button>
        </DialogFooter>
      </DialogScrollableContent>
    </Dialog>
  );
}
