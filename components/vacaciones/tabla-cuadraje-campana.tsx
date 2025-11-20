'use client';

// ========================================
// Tabla de Cuadraje de Campaña
// Calendar table with direct editing for vacation campaign
// ========================================

import React, { useState, useMemo, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingButton } from '@/components/shared/loading-button';
import { cn, toDateOnlyString } from '@/lib/utils';
import { format, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface EmpleadoEquipo {
  equipoId: string;
  nombre: string | null;
}

interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
  fotoUrl: string | null;
  email: string;
  equipos: EmpleadoEquipo[];
}

interface Preferencia {
  id: string;
  empleadoId: string;
  completada: boolean;
  aceptada: boolean;
  cambioSolicitado: boolean;
  diasIdeales: string[] | null;
  diasPrioritarios: string[] | null;
  diasAlternativos: string[] | null;
  propuestaIA: Record<string, unknown> | null;
  propuestaEmpleado: Record<string, unknown> | null;
  empleado: Empleado;
}

interface CampanaData {
  id: string;
  titulo: string;
  estado: string;
  fechaInicioObjetivo: string;
  fechaFinObjetivo: string;
  totalEmpleadosAsignados: number;
  empleadosCompletados: number;
  propuestaIA: Record<string, unknown> | null;
  preferencias: Preferencia[];
}

interface TablaCuadrajeCampanaProps {
  campana: CampanaData;
  vistaComparacion: 'solicitado' | 'propuesto';
  onActualizarPreferencia: (
    preferenciaId: string,
    datos: {
      fechaInicio?: string;
      fechaFin?: string;
    }
  ) => Promise<void>;
}

interface EditState {
  preferenciaId: string;
  fechaInicio: string;
  fechaFin: string;
}

type AsignacionesMap = Record<string, string[]>;

interface PropuestaAsignacion {
  fechaInicio?: string;
  fechaFin?: string;
}

export function TablaCuadrajeCampana({
  campana,
  vistaComparacion,
  onActualizarPreferencia,
}: TablaCuadrajeCampanaProps) {
  const [editando, setEditando] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditState | null>(null);
  const [asignaciones, setAsignaciones] = useState<AsignacionesMap>(() =>
    crearAsignacionesIniciales(campana)
  );
  const [guardandoPreferenciaId, setGuardandoPreferenciaId] = useState<string | null>(null);
  const esVistaPropuesta = vistaComparacion === 'propuesto';

  // Generate all dates in the campaign period
  const fechas = useMemo(() => {
    const inicio = new Date(campana.fechaInicioObjetivo + 'T00:00:00');
    const fin = new Date(campana.fechaFinObjetivo + 'T00:00:00');
    return eachDayOfInterval({ start: inicio, end: fin });
  }, [campana.fechaInicioObjetivo, campana.fechaFinObjetivo]);

  useEffect(() => {
    setAsignaciones(crearAsignacionesIniciales(campana));
  }, [campana]);

  // Group preferences by team
  const preferenciasPorEquipo = useMemo(() => {
    const grupos: Record<string, Preferencia[]> = { 'Sin equipo': [] };
    
    campana.preferencias.forEach(pref => {
      if (pref.empleado.equipos.length === 0) {
        grupos['Sin equipo'].push(pref);
      } else {
        // Add to first team (employees can be in multiple teams)
        const equipoNombre = pref.empleado.equipos[0].nombre || 'Sin equipo';
        if (!grupos[equipoNombre]) {
          grupos[equipoNombre] = [];
        }
        grupos[equipoNombre].push(pref);
      }
    });

    // Remove empty "Sin equipo" if no employees without team
    if (grupos['Sin equipo'].length === 0) {
      delete grupos['Sin equipo'];
    }

    return grupos;
  }, [campana.preferencias]);

  const getIniciales = (nombre: string, apellidos: string) => {
    return `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
  };

  const getDiasAsignados = (pref: Preferencia): string[] => {
    if (esVistaPropuesta) {
      return asignaciones[pref.id] ?? obtenerDiasPropuestos(pref);
    }
    return Array.isArray(pref.diasIdeales) ? pref.diasIdeales : [];
  };

  const toggleDia = (pref: Preferencia, fecha: Date) => {
    if (!esVistaPropuesta) {
      return;
    }

    const fechaStr = toDateOnlyString(fecha);

    setAsignaciones((prev) => {
      const base = prev[pref.id] ?? obtenerDiasPropuestos(pref);
      const seleccion = new Set(base);

      if (seleccion.has(fechaStr)) {
        seleccion.delete(fechaStr);
      } else {
        seleccion.add(fechaStr);
      }

      const actualizado = ordenarDias(Array.from(seleccion));

      if (actualizado.length > 0) {
        setEditando(pref.id);
        setEditData({
          preferenciaId: pref.id,
          fechaInicio: actualizado[0],
          fechaFin: actualizado[actualizado.length - 1],
        });
      } else {
        setEditando(pref.id);
        setEditData({
          preferenciaId: pref.id,
          fechaInicio: campana.fechaInicioObjetivo,
          fechaFin: campana.fechaInicioObjetivo,
        });
      }

      return {
        ...prev,
        [pref.id]: actualizado,
      };
    });
  };

  const handleGuardarEdicion = async () => {
    if (!editData) return;

    setGuardandoPreferenciaId(editData.preferenciaId);
    try {
      await onActualizarPreferencia(editData.preferenciaId, {
        fechaInicio: editData.fechaInicio,
        fechaFin: editData.fechaFin,
      });
      setEditando(null);
      setEditData(null);
    } catch (error) {
      // Mantener edición abierta para corrección manual
      console.error('[TablaCuadraje] Error guardando edición', error);
    } finally {
      setGuardandoPreferenciaId(null);
    }
  };

  const handleCancelarEdicion = () => {
    setEditando(null);
    setEditData(null);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r min-w-[250px]">
                Empleado
              </th>
              {fechas.map((fecha) => (
                <th
                  key={fecha.toISOString()}
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase border-r min-w-[60px]"
                >
                  <div>{format(fecha, 'd', { locale: es })}</div>
                  <div className="text-[10px] font-normal text-gray-400">
                    {format(fecha, 'MMM', { locale: es }).toUpperCase()}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(preferenciasPorEquipo).map(([equipoNombre, preferencias], teamIdx) => (
              <React.Fragment key={equipoNombre}>
                {/* Team Header */}
                {Object.keys(preferenciasPorEquipo).length > 1 && (
                  <tr className="bg-gray-100">
                    <td
                      colSpan={fechas.length + 1}
                      className="px-4 py-2 text-sm font-semibold text-gray-700"
                    >
                      Equipo: {equipoNombre}
                    </td>
                  </tr>
                )}

                {/* Employee Rows */}
                {preferencias.map((pref) => {
                  const diasAsignados = getDiasAsignados(pref);
                  const isEditando = editando === pref.id;

                  return (
                    <React.Fragment key={pref.id}>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              {pref.empleado.fotoUrl ? (
                                <AvatarImage src={pref.empleado.fotoUrl} alt={pref.empleado.nombre} />
                              ) : null}
                              <AvatarFallback className="text-xs bg-gray-200 text-gray-700">
                                {getIniciales(pref.empleado.nombre, pref.empleado.apellidos)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {pref.empleado.nombre} {pref.empleado.apellidos}
                              </p>
                              <Badge variant={pref.completada ? 'default' : 'secondary'} className="text-xs mt-1 inline-flex w-fit">
                                {pref.completada ? 'Completado' : 'Pendiente'}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        {fechas.map((fecha) => {
                          const fechaStr = toDateOnlyString(fecha);
                          const isAsignado = diasAsignados.includes(fechaStr);
                          
                          return (
                            <td
                              key={fecha.toISOString()}
                              className={cn(
                                'px-2 py-3 text-center border-r transition-colors',
                                esVistaPropuesta ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed'
                              )}
                              onClick={() => toggleDia(pref, fecha)}
                            >
                              {isAsignado && (
                                <div
                                  className={cn(
                                    'w-3 h-3 rounded-full mx-auto',
                                    vistaComparacion === 'propuesto' ? 'bg-green-600' : 'bg-blue-600'
                                  )}
                                  title={vistaComparacion === 'propuesto' ? 'Día propuesto' : 'Día ideal'}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Inline Edit Row */}
                      {esVistaPropuesta && isEditando && editData && (
                        <tr className="bg-blue-50 border-b">
                          <td
                            colSpan={fechas.length + 1}
                            className="px-4 py-3"
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">
                                  Fecha inicio:
                                </label>
                                <Input
                                  type="date"
                                  value={editData.fechaInicio}
                                  onChange={(e) => setEditData({ ...editData, fechaInicio: e.target.value })}
                                  className="w-40"
                                  min={campana.fechaInicioObjetivo}
                                  max={campana.fechaFinObjetivo}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-sm font-medium text-gray-700">
                                  Fecha fin:
                                </label>
                                <Input
                                  type="date"
                                  value={editData.fechaFin}
                                  onChange={(e) => setEditData({ ...editData, fechaFin: e.target.value })}
                                  className="w-40"
                                  min={campana.fechaInicioObjetivo}
                                  max={campana.fechaFinObjetivo}
                                />
                              </div>
                              <div className="flex items-center gap-2 ml-auto">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelarEdicion}
                                >
                                  Cancelar
                                </Button>
                                <LoadingButton
                                  size="sm"
                                  onClick={handleGuardarEdicion}
                                  loading={guardandoPreferenciaId === pref.id}
                                  disabled={guardandoPreferenciaId === pref.id}
                                >
                                  Guardar
                                </LoadingButton>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Team Separator */}
                {teamIdx < Object.keys(preferenciasPorEquipo).length - 1 && (
                  <tr>
                    <td colSpan={fechas.length + 1} className="h-2 bg-gray-200"></td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function crearAsignacionesIniciales(campana: CampanaData): AsignacionesMap {
  const asignaciones: AsignacionesMap = {};
  campana.preferencias.forEach((pref) => {
    asignaciones[pref.id] = obtenerDiasPropuestos(pref);
  });
  return asignaciones;
}

function obtenerDiasPropuestos(pref: Preferencia): string[] {
  if (pref.propuestaIA) {
    const propuesta = pref.propuestaIA as PropuestaAsignacion;
    if (propuesta.fechaInicio && propuesta.fechaFin) {
      return generarRangoDiasEstatico(propuesta.fechaInicio, propuesta.fechaFin);
    }
  }

  return Array.isArray(pref.diasIdeales) ? pref.diasIdeales : [];
}

function generarRangoDiasEstatico(fechaInicio: string, fechaFin: string): string[] {
  const dias: string[] = [];
  const inicio = new Date(fechaInicio + 'T00:00:00');
  const fin = new Date(fechaFin + 'T00:00:00');
  const cursor = new Date(inicio);

  while (cursor <= fin) {
    dias.push(toDateOnlyString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dias;
}

function ordenarDias(dias: string[]): string[] {
  return dias.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

