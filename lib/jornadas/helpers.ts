// ========================================
// Jornadas Helpers - Funciones de utilidad para jornadas
// ========================================

import type { JornadaConfig, DiaConfig } from '@/lib/calculos/fichajes-helpers';

type DiaKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

const DIA_KEYS: DiaKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const isDiaConfig = (value: unknown): value is DiaConfig =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getDiaConfig = (config: JornadaConfig | null | undefined, dia: DiaKey): DiaConfig | undefined => {
  if (!config) return undefined;
  const value = config[dia];
  return isDiaConfig(value) ? value : undefined;
};

/**
 * Genera una etiqueta descriptiva para una jornada basada en su configuración
 * Ya que las jornadas ya no tienen campo 'nombre', generamos una descripción automática
 *
 * @param jornada - Objeto con configuración de jornada
 * @returns String descriptivo de la jornada
 *
 * Ejemplos:
 * - "Jornada Fija 40h (09:00-18:00)"
 * - "Jornada Flexible 35h"
 * - "Jornada 40h"
 */
export function obtenerEtiquetaJornada(jornada: {
  horasSemanales: number;
  config?: JornadaConfig | null;
  id?: string;
}): string {
  const config = jornada.config;

  // Determinar si es fija o flexible
  const esFija = DIA_KEYS.some((dia) => {
    const diaConfig = getDiaConfig(config, dia);
    return Boolean(diaConfig?.entrada && diaConfig?.salida);
  });

  const tipo = esFija ? 'Fija' : 'Flexible';

  // Si es fija, intentar obtener el horario del primer día activo
  if (esFija) {
    const primerDiaActivo = DIA_KEYS
      .map((dia) => getDiaConfig(config, dia))
      .find((diaConfig) => diaConfig?.activo && diaConfig?.entrada && diaConfig?.salida);

    if (primerDiaActivo?.entrada && primerDiaActivo?.salida) {
      return `Jornada ${tipo} ${jornada.horasSemanales}h (${primerDiaActivo.entrada}-${primerDiaActivo.salida})`;
    }
  }

  // Fallback genérico
  return `Jornada ${tipo} ${jornada.horasSemanales}h`;
}

/**
 * Genera una etiqueta corta para una jornada (para listados compactos)
 *
 * @param jornada - Objeto con configuración de jornada
 * @returns String descriptivo corto
 *
 * Ejemplos:
 * - "40h Fija"
 * - "35h Flexible"
 */
export function obtenerEtiquetaJornadaCorta(jornada: {
  horasSemanales: number;
  config?: JornadaConfig | null;
}): string {
  const config = jornada.config;

  const esFija = DIA_KEYS.some((dia) => {
    const diaConfig = getDiaConfig(config, dia);
    return Boolean(diaConfig?.entrada && diaConfig?.salida);
  });

  const tipo = esFija ? 'Fija' : 'Flexible';
  return `${jornada.horasSemanales}h ${tipo}`;
}

/**
 * Obtiene la descripción del horario de una jornada
 *
 * @param jornada - Objeto con configuración de jornada
 * @returns String con el horario o las horas semanales
 *
 * Ejemplos:
 * - "09:00 - 18:00"
 * - "40h semanales"
 */
export function obtenerDescripcionHorario(jornada: {
  horasSemanales: number;
  config?: JornadaConfig | null;
}): string {
  const config = jornada.config;
  const primerDiaActivo = DIA_KEYS
    .map((dia) => getDiaConfig(config, dia))
    .find((diaConfig) => diaConfig?.activo);

  if (primerDiaActivo?.entrada && primerDiaActivo?.salida) {
    return `${primerDiaActivo.entrada} - ${primerDiaActivo.salida}`;
  }

  return `${jornada.horasSemanales}h semanales`;
}

/**
 * Obtiene la jornada efectiva asignada a un empleado
 * Resuelve la jornada teniendo en cuenta la jerarquía:
 * 1. Jornada individual (jornadaId directo en empleado)
 * 2. Jornada de equipo (si el empleado pertenece a un equipo con jornada)
 * 3. Jornada de empresa (si hay una jornada asignada a toda la empresa)
 *
 * @param empleadoId - ID del empleado (usado para futuras validaciones)
 * @param equipoIds - Array de IDs de equipos a los que pertenece el empleado
 * @param jornadaIdDirecta - jornadaId directo del empleado (puede ser null)
 * @returns Objeto con la jornada efectiva y su origen
 */
export async function obtenerJornadaEmpleado(params: {
  empleadoId: string;
  equipoIds?: string[];
  jornadaIdDirecta?: string | null;
}): Promise<{
  jornadaId: string | null;
  origen: 'individual' | 'equipo' | 'empresa' | null;
  equipoNombre?: string;
} | null> {
  const { equipoIds = [], jornadaIdDirecta } = params;

  // 1. Prioridad 1: Jornada asignada directamente al empleado
  if (jornadaIdDirecta) {
    return {
      jornadaId: jornadaIdDirecta,
      origen: 'individual',
    };
  }

  // 2. Prioridad 2: Jornada de equipo
  if (equipoIds.length > 0) {
    const { prisma } = await import('@/lib/prisma');

    // Buscar TODAS las asignaciones de jornada para equipos
    const asignacionesEquipo = await prisma.jornada_asignaciones.findMany({
      where: {
        nivelAsignacion: 'equipo',
      },
      include: {
        jornada: true,
      },
    });

    // Buscar si alguna asignación incluye alguno de los equipos del empleado
    for (const asignacionEquipo of asignacionesEquipo) {
      // Parsear equipoIds (puede ser JSON string o array)
      let equipoIdsAsignados: string[] = [];

      if (Array.isArray(asignacionEquipo.equipoIds)) {
        equipoIdsAsignados = asignacionEquipo.equipoIds as string[];
      } else if (typeof asignacionEquipo.equipoIds === 'string') {
        try {
          const parsed = JSON.parse(asignacionEquipo.equipoIds);
          if (Array.isArray(parsed)) {
            equipoIdsAsignados = parsed.filter((item): item is string => typeof item === 'string');
          }
        } catch {
          equipoIdsAsignados = [];
        }
      }

      // Verificar si alguno de los equipos del empleado está en esta asignación
      const equipoAsignadoId = equipoIds.find((id) =>
        equipoIdsAsignados.includes(id)
      );

      if (equipoAsignadoId) {
        const equipo = await prisma.equipos.findUnique({
          where: { id: equipoAsignadoId },
          select: { nombre: true },
        });

        return {
          jornadaId: asignacionEquipo.jornadaId,
          origen: 'equipo',
          equipoNombre: equipo?.nombre,
        };
      }
    }
  }

  // 3. Prioridad 3: Jornada de empresa
  const { prisma } = await import('@/lib/prisma');
  const asignacionEmpresa = await prisma.jornada_asignaciones.findFirst({
    where: {
      nivelAsignacion: 'empresa',
    },
    include: {
      jornada: true,
    },
  });

  if (asignacionEmpresa) {
    return {
      jornadaId: asignacionEmpresa.jornadaId,
      origen: 'empresa',
    };
  }

  // Sin jornada asignada
  return null;
}
