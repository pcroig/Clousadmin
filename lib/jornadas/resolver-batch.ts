// ========================================
// Resolución de Jornadas en Batch (Optimizado)
// ========================================
// Resuelve jornadas efectivas para múltiples empleados de forma eficiente
// evitando el problema N+1

import { prisma } from '@/lib/prisma';

interface EmpleadoConEquipos {
  id: string;
  jornadaId: string | null;
  equipos: Array<{ equipoId: string | null }>;
}

interface JornadaResuelta {
  id: string;
  horasSemanales: any;
  config: unknown;
  activa: boolean;
}

interface ResultadoResolucion {
  jornadaId: string;
  origen: 'individual' | 'equipo' | 'empresa';
  equipoNombre?: string;
}

/**
 * Resuelve jornadas efectivas para múltiples empleados en batch
 * Optimizado para evitar N+1 queries
 *
 * @param empleados Array de empleados con jornadaId y equipos
 * @returns Map de empleadoId -> jornada resuelta
 */
export async function resolverJornadasBatch(
  empleados: EmpleadoConEquipos[]
): Promise<Map<string, JornadaResuelta>> {
  const resultado = new Map<string, JornadaResuelta>();

  // 1. Separar empleados por tipo de asignación
  const conJornadaDirecta: string[] = [];
  const porResolverEnEquipo: Array<{ empleadoId: string; equipoIds: string[] }> = [];
  const porResolverEnEmpresa: string[] = [];

  for (const empleado of empleados) {
    if (empleado.jornadaId) {
      // Jornada individual
      conJornadaDirecta.push(empleado.jornadaId);
    } else {
      const equipoIds = empleado.equipos
        .map(eq => eq.equipoId)
        .filter((id): id is string => Boolean(id));

      if (equipoIds.length > 0) {
        porResolverEnEquipo.push({ empleadoId: empleado.id, equipoIds });
      } else {
        porResolverEnEmpresa.push(empleado.id);
      }
    }
  }

  // 2. Cargar todas las jornadas individuales en una sola query
  const jornadasDirectasMap = new Map<string, JornadaResuelta>();
  if (conJornadaDirecta.length > 0) {
    const jornadas = await prisma.jornadas.findMany({
      where: { id: { in: conJornadaDirecta } },
      select: {
        id: true,
        horasSemanales: true,
        config: true,
        activa: true,
      },
    });

    for (const jornada of jornadas) {
      jornadasDirectasMap.set(jornada.id, jornada);
    }
  }

  // 3. Cargar todas las asignaciones de equipo en una sola query
  const asignacionesEquipo = await prisma.jornada_asignaciones.findMany({
    where: {
      nivelAsignacion: 'equipo',
    },
    include: {
      jornada: {
        select: {
          id: true,
          horasSemanales: true,
          config: true,
          activa: true,
        },
      },
    },
  });

  // Crear mapa de equipoId -> jornada
  const jornadasPorEquipo = new Map<string, JornadaResuelta>();
  for (const asignacion of asignacionesEquipo) {
    let equipoIdsAsignados: string[] = [];

    if (Array.isArray(asignacion.equipoIds)) {
      equipoIdsAsignados = asignacion.equipoIds as string[];
    } else if (typeof asignacion.equipoIds === 'string') {
      try {
        const parsed = JSON.parse(asignacion.equipoIds);
        if (Array.isArray(parsed)) {
          equipoIdsAsignados = parsed.filter((item): item is string => typeof item === 'string');
        }
      } catch {
        equipoIdsAsignados = [];
      }
    }

    for (const equipoId of equipoIdsAsignados) {
      if (!jornadasPorEquipo.has(equipoId)) {
        jornadasPorEquipo.set(equipoId, asignacion.jornada);
      }
    }
  }

  // 4. Cargar jornada de empresa (si existe)
  let jornadaEmpresa: JornadaResuelta | null = null;
  const asignacionEmpresa = await prisma.jornada_asignaciones.findFirst({
    where: {
      nivelAsignacion: 'empresa',
    },
    include: {
      jornada: {
        select: {
          id: true,
          horasSemanales: true,
          config: true,
          activa: true,
        },
      },
    },
  });

  if (asignacionEmpresa) {
    jornadaEmpresa = asignacionEmpresa.jornada;
  }

  // 5. Asignar jornadas a cada empleado
  for (const empleado of empleados) {
    // Prioridad 1: Jornada individual
    if (empleado.jornadaId) {
      const jornada = jornadasDirectasMap.get(empleado.jornadaId);
      if (jornada) {
        resultado.set(empleado.id, jornada);
        continue;
      }
    }

    // Prioridad 2: Jornada de equipo
    const equipoIds = empleado.equipos
      .map(eq => eq.equipoId)
      .filter((id): id is string => Boolean(id));

    for (const equipoId of equipoIds) {
      const jornada = jornadasPorEquipo.get(equipoId);
      if (jornada) {
        resultado.set(empleado.id, jornada);
        break; // Usar el primer equipo con jornada
      }
    }

    if (resultado.has(empleado.id)) continue;

    // Prioridad 3: Jornada de empresa
    if (jornadaEmpresa) {
      resultado.set(empleado.id, jornadaEmpresa);
    }
  }

  return resultado;
}
