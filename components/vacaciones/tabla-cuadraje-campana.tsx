'use client';

// ========================================
// Tabla de Cuadraje de Campaña
// Calendar table with direct editing for vacation campaign
// ========================================

import { eachDayOfInterval, format } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { EmployeeAvatar } from '@/components/shared/employee-avatar';
import { Badge } from '@/components/ui/badge';
import { cn, toDateOnlyString } from '@/lib/utils';

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
  onActualizarPreferencia: (
    preferenciaId: string,
    datos: {
      fechaInicio: string;
      fechaFin: string;
    }
  ) => Promise<void>;
}

type AsignacionesMap = Record<string, string[]>;

interface PropuestaAsignacion {
  fechaInicio?: string;
  fechaFin?: string;
}

export function TablaCuadrajeCampana({
  campana,
  onActualizarPreferencia,
}: TablaCuadrajeCampanaProps) {
  const [asignaciones, setAsignaciones] = useState<AsignacionesMap>(() =>
    crearAsignacionesIniciales(campana)
  );

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

  const toggleDia = async (pref: Preferencia, fecha: Date) => {
    // Check if date is within campaign range
    const campanaInicio = new Date(campana.fechaInicioObjetivo + 'T00:00:00');
    const campanaFin = new Date(campana.fechaFinObjetivo + 'T00:00:00');
    
    // Normalize dates to ignore time component
    const fechaTime = new Date(toDateOnlyString(fecha) + 'T00:00:00').getTime();
    const inicioTime = new Date(toDateOnlyString(campanaInicio) + 'T00:00:00').getTime();
    const finTime = new Date(toDateOnlyString(campanaFin) + 'T00:00:00').getTime();

    if (fechaTime < inicioTime || fechaTime > finTime) {
      toast.error('La fecha seleccionada está fuera del rango de la campaña');
      return;
    }

    const fechaStr = toDateOnlyString(fecha);
    const diasActuales = asignaciones[pref.id] || [];
    const estaAsignado = diasActuales.includes(fechaStr);

    let nuevosDias: string[] = [];
    const sorted = ordenarDias([...diasActuales]);

    if (estaAsignado) {
      // Removing a day.
      // Allow shrinking from ends only to maintain contiguous range
      if (fechaStr === sorted[0]) {
         nuevosDias = sorted.slice(1);
      } else if (fechaStr === sorted[sorted.length - 1]) {
         nuevosDias = sorted.slice(0, -1);
      } else {
         toast.error("Solo puedes reducir el rango desde el inicio o el final.");
         return;
      }
    } else {
      // Adding a day.
      // Extend range to include this day (fill holes)
      const allDates = [...diasActuales, fechaStr];
      const sortedAll = ordenarDias(allDates);
      const minDate = sortedAll[0];
      const maxDate = sortedAll[sortedAll.length - 1];
      
      // Ensure the extended range is valid within campaign limits
      const minDateTime = new Date(minDate + 'T00:00:00').getTime();
      const maxDateTime = new Date(maxDate + 'T00:00:00').getTime();
      
      if (minDateTime < inicioTime || maxDateTime > finTime) {
         toast.error('El rango extendido excede las fechas de la campaña');
         return;
      }

      nuevosDias = generarRangoDiasEstatico(minDate, maxDate);
    }

    if (nuevosDias.length === 0) {
       // If empty, we are clearing the assignment. 
       // Depending on API, we might need to send a delete/cancel or just empty range?
       // The API expects start and end dates. If empty, we can't send valid dates.
       // UI says "Use 'Cancelar' if you want to delete it".
       toast.error("La propuesta debe tener al menos un día. Usa el botón 'Cancelar propuesta' si quieres eliminarla.");
       return;
    }

    // Optimistic update
    setAsignaciones(prev => ({ ...prev, [pref.id]: nuevosDias }));

    try {
        const min = nuevosDias[0];
        const max = nuevosDias[nuevosDias.length - 1];
        await onActualizarPreferencia(pref.id, {
            fechaInicio: min,
            fechaFin: max
        });
    } catch (err) {
        // Revert on error
        setAsignaciones(prev => ({ ...prev, [pref.id]: diasActuales }));
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50/50">
              <th className="sticky left-0 z-20 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r min-w-[250px]">
                Empleado
              </th>
              {fechas.map((fecha) => (
                <th
                  key={fecha.toISOString()}
                  className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase border-r min-w-[48px] select-none"
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
                  <tr className="bg-gray-100/50">
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
                  const diasAsignados = asignaciones[pref.id] || [];
                  const diasIdeales = Array.isArray(pref.diasIdeales) ? pref.diasIdeales : [];
                  
                  return (
                    <tr key={pref.id} className="border-b hover:bg-gray-50/50 transition-colors">
                      <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r group">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar
                            nombre={pref.empleado.nombre}
                            apellidos={pref.empleado.apellidos}
                            fotoUrl={pref.empleado.fotoUrl}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {pref.empleado.nombre} {pref.empleado.apellidos}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={pref.completada ? 'default' : 'secondary'} className="text-[10px] h-5 px-1.5 font-normal">
                                {pref.completada ? 'Completado' : 'Pendiente'}
                              </Badge>
                              {diasIdeales.length > 0 && (
                                <span className="text-[10px] text-gray-500">
                                  Solicita: {diasIdeales.length}d
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      {fechas.map((fecha) => {
                        const fechaStr = toDateOnlyString(fecha);
                        const isAsignado = diasAsignados.includes(fechaStr);
                        const isIdeal = diasIdeales.includes(fechaStr);
                        
                        // Determine cell style
                        let cellClass = 'cursor-pointer transition-colors relative';
                        let content = null;

                        if (isAsignado && isIdeal) {
                          cellClass += ' bg-green-100 hover:bg-green-200 border-green-200';
                          content = (
                            <div className="w-full h-full absolute inset-0 flex items-center justify-center">
                              <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center shadow-sm">
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          );
                        } else if (isAsignado) {
                          cellClass += ' bg-blue-50 hover:bg-blue-100 border-blue-100';
                          content = (
                            <div className="w-full h-full absolute inset-0 flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
                            </div>
                          );
                        } else if (isIdeal) {
                          cellClass += ' bg-gray-50/50 hover:bg-gray-100';
                          content = (
                            <div className="w-full h-full absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full border-2 border-gray-300" />
                            </div>
                          );
                        } else {
                          cellClass += ' hover:bg-gray-50';
                        }

                        return (
                          <td
                            key={fecha.toISOString()}
                            className={cn(
                              'px-0 py-0 border-r h-[50px] min-w-[48px]',
                              cellClass
                            )}
                            onClick={() => toggleDia(pref, fecha)}
                            title={
                              isAsignado && isIdeal 
                                ? 'Asignado (Coincide con solicitud)' 
                                : isAsignado 
                                ? 'Asignado (Propuesta)' 
                                : isIdeal 
                                ? 'Día solicitado' 
                                : undefined
                            }
                          >
                            {content}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Legend */}
      <div className="bg-gray-50 px-4 py-3 border-t flex items-center gap-6 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span>Asignado (Coincide)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Asignado (Propuesta)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full border-2 border-gray-300" />
          <span>Solicitado</span>
        </div>
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

  // If no AI proposal, default to requested days?
  // The user says "simply put as if it were a manual proposal". 
  // If the admin hasn't done anything and no AI, maybe it starts empty or starts with requested?
  // Usually, before "AI squaring", the proposal is empty.
  // But if the user wants to compare, maybe we should NOT auto-fill with requested unless explicitly accepted.
  // However, `diasIdeales` is what the employee asked.
  // If `propuestaIA` is null, it means no assignment yet.
  
  return []; 
}

function generarRangoDiasEstatico(fechaInicio: string, fechaFin: string): string[] {
  const dias: string[] = [];
  const inicio = new Date(fechaInicio + 'T00:00:00');
  const fin = new Date(fechaFin + 'T00:00:00');
  const cursor = new Date(inicio);

  // Safety check to avoid infinite loops
  if (fin < inicio) return [];
  
  // Limit to reasonable range (e.g. 365 days)
  let count = 0;
  while (cursor <= fin && count < 366) {
    dias.push(toDateOnlyString(cursor));
    cursor.setDate(cursor.getDate() + 1);
    count++;
  }

  return dias;
}

function ordenarDias(dias: string[]): string[] {
  return dias.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
