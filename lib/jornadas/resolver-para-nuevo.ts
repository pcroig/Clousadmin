// ========================================
// Resolver Jornada para Nuevo Empleado
// ========================================
// Determina qué jornadaId asignar a un empleado al crearlo,
// respetando la jerarquía: equipo > empresa > predefinida

import type { Prisma, PrismaClient } from '@prisma/client';

type JornadaClient = PrismaClient | Prisma.TransactionClient;

/**
 * Resuelve qué jornada asignar a un nuevo empleado.
 *
 * IMPORTANTE: Esta función implementa la lógica de asignación automática
 * respetando el sistema jerárquico de jornadas:
 *
 * 1. Si el empleado pertenece a equipo(s) con jornada asignada:
 *    → Retorna NULL (para que se resuelva dinámicamente vía obtenerJornadaEmpleado)
 *
 * 2. Si la empresa tiene jornada asignada a nivel empresa:
 *    → Retorna NULL (para que se resuelva dinámicamente vía obtenerJornadaEmpleado)
 *
 * 3. Si NO hay asignaciones automáticas (empresa/equipo):
 *    → Retorna ID de jornada predefinida (asignación directa)
 *
 * @param client - Cliente de Prisma o transacción
 * @param empresaId - ID de la empresa
 * @param equipoIds - Array de IDs de equipos a los que pertenece el empleado
 * @returns jornadaId para asignar (null si hay asignación automática, string si es predefinida)
 */
export async function resolverJornadaParaNuevoEmpleado(
  client: JornadaClient,
  empresaId: string,
  equipoIds: string[] = []
): Promise<string | null> {
  // 1. Verificar si hay jornada de equipo para alguno de los equipos del empleado
  if (equipoIds.length > 0) {
    const asignacionesEquipo = await (client as PrismaClient).jornada_asignaciones.findMany({
      where: {
        nivelAsignacion: 'equipo',
      },
      select: {
        equipoIds: true,
      },
    });

    // Buscar si alguno de los equipos del empleado tiene jornada asignada
    for (const asignacion of asignacionesEquipo) {
      let equipoIdsAsignados: string[] = [];

      // Parsear equipoIds (puede ser JSON string o array)
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

      // Verificar si alguno de los equipos del empleado está en esta asignación
      const tieneEquipoConJornada = equipoIds.some(equipoId =>
        equipoIdsAsignados.includes(equipoId)
      );

      if (tieneEquipoConJornada) {
        // El empleado pertenece a un equipo con jornada asignada
        // NO asignar jornadaId directo - dejar null para resolución dinámica
        console.log(
          `[resolverJornadaParaNuevoEmpleado] Empleado pertenece a equipo con jornada → jornadaId: null (resolución dinámica)`
        );
        return null;
      }
    }
  }

  // 2. Verificar si hay jornada de empresa
  const asignacionEmpresa = await (client as PrismaClient).jornada_asignaciones.findFirst({
    where: {
      empresaId,
      nivelAsignacion: 'empresa',
    },
  });

  if (asignacionEmpresa) {
    // Hay jornada asignada a nivel empresa
    // NO asignar jornadaId directo - dejar null para resolución dinámica
    console.log(
      `[resolverJornadaParaNuevoEmpleado] Empresa tiene jornada asignada → jornadaId: null (resolución dinámica)`
    );
    return null;
  }

  // 3. No hay asignaciones automáticas
  // NO crear jornada automáticamente - el empleado debe tener una asignada explícitamente
  console.log(
    `[resolverJornadaParaNuevoEmpleado] Sin asignaciones automáticas → jornadaId: null (requiere asignación explícita)`
  );
  return null;
}
