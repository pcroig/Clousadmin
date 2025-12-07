// ========================================
// Validación de Asignaciones de Jornadas
// ========================================
// Validaciones centralizadas para asegurar que todos los empleados
// tengan exactamente una jornada asignada

import { obtenerEtiquetaJornada } from './helpers';

import type { JornadaConfig } from '@/lib/calculos/fichajes-helpers';

interface Empleado {
  id: string;
  nombre: string;
  apellidos: string;
  jornadaId: string | null;
}

interface Jornada {
  id: string;
  horasSemanales: number;
  config: JornadaConfig | null;
}

interface EmpleadoConJornada extends Empleado {
  jornada: Jornada | null;
}

export interface ValidacionAsignacion {
  valida: boolean;
  errores: string[];
  empleadosSinJornada: EmpleadoConJornada[];
  empleadosConMultiplesJornadas: Array<{
    empleado: Empleado;
    jornadas: Array<{ id: string; etiqueta: string }>;
  }>;
}

/**
 * Valida que todos los empleados activos tengan exactamente una jornada asignada
 *
 * @param empleados - Lista de empleados activos con su jornada asignada
 * @returns ValidacionAsignacion con detalles de errores
 */
export function validarAsignacionesCompletas(
  empleados: EmpleadoConJornada[]
): ValidacionAsignacion {
  const errores: string[] = [];
  const empleadosSinJornada: EmpleadoConJornada[] = [];
  const empleadosConMultiples: Array<{
    empleado: Empleado;
    jornadas: Array<{ id: string; etiqueta: string }>;
  }> = [];

  // Detectar empleados sin jornada
  empleados.forEach((empleado) => {
    if (!empleado.jornadaId || !empleado.jornada) {
      empleadosSinJornada.push(empleado);
    }
  });

  if (empleadosSinJornada.length > 0) {
    errores.push(
      `${empleadosSinJornada.length} empleado${empleadosSinJornada.length !== 1 ? 's' : ''} sin jornada asignada`
    );
  }

  // NOTE: La validación de empleados con múltiples jornadas no es necesaria
  // en el modelo actual, ya que cada empleado tiene un único campo jornadaId.
  // Sin embargo, mantenemos la estructura por si en el futuro se necesita.

  const valida = errores.length === 0;

  return {
    valida,
    errores,
    empleadosSinJornada,
    empleadosConMultiplesJornadas: empleadosConMultiples,
  };
}

/**
 * Mapea jornadas a empleados asignados
 *
 * @param jornadas - Lista de jornadas con empleados
 * @returns Mapa de jornadaId -> empleados[]
 */
export function obtenerEmpleadosPorJornada(
  jornadas: Array<Jornada & { empleados: Empleado[] }>
): Map<string, Empleado[]> {
  const mapa = new Map<string, Empleado[]>();

  jornadas.forEach((jornada) => {
    mapa.set(jornada.id, jornada.empleados);
  });

  return mapa;
}

/**
 * Genera un mensaje descriptivo de los empleados sin jornada
 *
 * @param empleados - Empleados sin jornada
 * @returns String descriptivo
 */
export function generarMensajeEmpleadosSinJornada(
  empleados: EmpleadoConJornada[]
): string {
  if (empleados.length === 0) return '';

  const nombres = empleados
    .slice(0, 3)
    .map((e) => `${e.nombre} ${e.apellidos}`)
    .join(', ');

  if (empleados.length > 3) {
    return `${nombres} y ${empleados.length - 3} más`;
  }

  return nombres;
}

/**
 * Valida que una asignación propuesta no genere conflictos
 *
 * @param jornadaId - ID de la jornada a asignar
 * @param empleadoIds - IDs de empleados a asignar
 * @param empleadosActuales - Estado actual de empleados
 * @returns ValidacionAsignacion
 */
export function validarAsignacionPropuesta(
  jornadaId: string,
  empleadoIds: string[],
  empleadosActuales: EmpleadoConJornada[]
): ValidacionAsignacion {
  // Simular asignación propuesta
  const empleadosSimulados = empleadosActuales.map((emp) => {
    if (empleadoIds.includes(emp.id)) {
      return {
        ...emp,
        jornadaId,
      };
    }
    return emp;
  });

  // Validar el estado resultante
  return validarAsignacionesCompletas(empleadosSimulados);
}
