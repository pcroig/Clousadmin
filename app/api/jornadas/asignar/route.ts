// ========================================
// API Jornadas - Asignación Masiva
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  handleApiError,
  notFoundResponse,
  requireAuthAsHR,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { obtenerEtiquetaJornada } from '@/lib/jornadas/helpers';
import { prisma } from '@/lib/prisma';
import { decimalToNumber } from '@/lib/utils';
import { idSchema } from '@/lib/validaciones/schemas';
import { z } from 'zod';

interface EmpleadoConJornadaResumen {
  id: string;
  nombre: string;
  apellidos: string;
  jornadaId: string | null;
  jornada: {
    id: string;
    horasSemanales: number;
    config: unknown; // JornadaConfig
  } | null;
}

const asignacionSchema = z.object({
  jornadaId: idSchema,
  nivel: z.enum(['empresa', 'equipo', 'individual']),
  equipoIds: z.array(idSchema).optional(),
  empleadoIds: z.array(idSchema).optional(),
});

// POST /api/jornadas/asignar - Asignar jornada masivamente (solo HR Admin)
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(req, asignacionSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Verificar que la jornada existe y pertenece a la empresa
    const jornada = await prisma.jornadas.findFirst({
      where: {
        id: validatedData.jornadaId,
        empresaId: session.user.empresaId,
      },
    });

    if (!jornada) {
      return notFoundResponse('Jornada no encontrada');
    }

    // Validación adicional: empleados únicos
    if (validatedData.nivel === 'individual' && validatedData.empleadoIds) {
      const empleadoIdsSet = new Set(validatedData.empleadoIds);
      if (empleadoIdsSet.size !== validatedData.empleadoIds.length) {
        return badRequestResponse('Hay empleados duplicados en la selección');
      }
    }

    // Validar jornadas previas antes de asignar
    let empleadosConJornadasPrevias: EmpleadoConJornadaResumen[] = [];
    let jornadasPreviasUnicas: string[] = [];

    switch (validatedData.nivel) {
      case 'empresa':
        // Obtener empleados con jornadas diferentes
        const empleadosEmpresa = await prisma.empleados.findMany({
          where: {
            empresaId: session.user.empresaId,
            activo: true,
            AND: [
              { jornadaId: { not: null } },
              { jornadaId: { not: validatedData.jornadaId } },
            ],
          },
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            jornadaId: true,
            jornada: {
              select: {
                id: true,
                horasSemanales: true,
                config: true,
              },
            },
          },
        });
        empleadosConJornadasPrevias = empleadosEmpresa.map((emp) => ({
          ...emp,
          jornada: emp.jornada
            ? {
                id: emp.jornada.id,
                horasSemanales: decimalToNumber(emp.jornada.horasSemanales) ?? 0,
                config: emp.jornada.config,
              }
            : null,
        }));
        break;

      case 'equipo':
        if (!validatedData.equipoIds || validatedData.equipoIds.length === 0) {
          return badRequestResponse('Debes especificar al menos un equipo');
        }
        // Obtener empleados de los equipos con jornadas diferentes
        const miembrosEquipos = await prisma.empleado_equipos.findMany({
          where: {
            equipoId: { in: validatedData.equipoIds },
          },
          select: {
            empleadoId: true,
          },
        });
        const empleadoIdsEquipos = [...new Set(miembrosEquipos.map((m) => m.empleadoId))];

        if (empleadoIdsEquipos.length > 0) {
          const empleadosEquipo = await prisma.empleados.findMany({
            where: {
              id: { in: empleadoIdsEquipos },
              empresaId: session.user.empresaId,
              activo: true,
              AND: [
                { jornadaId: { not: null } },
                { jornadaId: { not: validatedData.jornadaId } },
              ],
            },
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              jornadaId: true,
              jornada: {
                select: {
                  id: true,
                  horasSemanales: true,
                  config: true,
                },
              },
            },
          });
          empleadosConJornadasPrevias = empleadosEquipo.map((emp) => ({
            ...emp,
            jornada: emp.jornada
              ? {
                  id: emp.jornada.id,
                  horasSemanales: decimalToNumber(emp.jornada.horasSemanales) ?? 0,
                  config: emp.jornada.config,
                }
              : null,
          }));
        }
        break;

      case 'individual':
        if (!validatedData.empleadoIds || validatedData.empleadoIds.length === 0) {
          return badRequestResponse('Debes especificar al menos un empleado');
        }
        // Obtener empleados específicos con jornadas diferentes
        const empleadosIndividual = await prisma.empleados.findMany({
          where: {
            id: { in: validatedData.empleadoIds },
            empresaId: session.user.empresaId,
            activo: true,
            AND: [
              { jornadaId: { not: null } },
              { jornadaId: { not: validatedData.jornadaId } },
            ],
          },
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            jornadaId: true,
            jornada: {
              select: {
                id: true,
                horasSemanales: true,
                config: true,
              },
            },
          },
        });
        empleadosConJornadasPrevias = empleadosIndividual.map((emp) => ({
          ...emp,
          jornada: emp.jornada
            ? {
                id: emp.jornada.id,
                horasSemanales: decimalToNumber(emp.jornada.horasSemanales) ?? 0,
                config: emp.jornada.config,
              }
            : null,
        }));
        break;
    }

    // Obtener etiquetas únicas de jornadas previas
    const jornadasPrevias = empleadosConJornadasPrevias
      .map((empleado) => {
        if (!empleado.jornada) return null;
        return obtenerEtiquetaJornada({
          horasSemanales: empleado.jornada.horasSemanales,
          config: empleado.jornada.config as any,
          id: empleado.jornada.id,
        });
      })
      .filter((etiqueta): etiqueta is string => Boolean(etiqueta));
    jornadasPreviasUnicas = [...new Set(jornadasPrevias)];

    let empleadosActualizados = 0;

    // 4. Aplicar asignación según nivel (dentro de una transacción)
    await prisma.$transaction(async (tx) => {
      switch (validatedData.nivel) {
        case 'empresa':
          // Para asignación a empresa: NO asignar jornadaId individualmente
          // Solo guardar metadata en jornada_asignaciones (se hace después)
          // Los empleados resolverán su jornada mediante obtenerJornadaEmpleado()

          // Contar empleados afectados para el mensaje de respuesta
          const countEmpresa = await tx.empleados.count({
            where: {
              empresaId: session.user.empresaId,
              activo: true,
            },
          });
          empleadosActualizados = countEmpresa;
          break;

        case 'equipo':
          if (!validatedData.equipoIds || validatedData.equipoIds.length === 0) {
            throw new Error('Debes especificar al menos un equipo');
          }

          // Para asignación a equipo: NO asignar jornadaId individualmente
          // Solo guardar metadata en jornada_asignaciones (se hace después)

          // Obtener empleados de los equipos especificados para contar
          const miembrosEquipos = await tx.empleado_equipos.findMany({
            where: {
              equipoId: { in: validatedData.equipoIds },
            },
            select: {
              empleadoId: true,
            },
          });

          const empleadoIdsEquipos = [...new Set(miembrosEquipos.map((m) => m.empleadoId))];
          empleadosActualizados = empleadoIdsEquipos.length;
          break;

        case 'individual':
          if (!validatedData.empleadoIds || validatedData.empleadoIds.length === 0) {
            throw new Error('Debes especificar al menos un empleado');
          }

          // Verificar que todos los empleados existan y estén activos
          const empleadosValidos = await tx.empleados.findMany({
            where: {
              id: { in: validatedData.empleadoIds },
              empresaId: session.user.empresaId,
              activo: true,
            },
            select: { id: true },
          });

          const empleadoIdsValidos = empleadosValidos.map(e => e.id);

          if (empleadoIdsValidos.length === 0) {
            throw new Error('Ninguno de los empleados seleccionados está activo');
          }

          if (empleadoIdsValidos.length < validatedData.empleadoIds.length) {
            const inactivos = validatedData.empleadoIds.length - empleadoIdsValidos.length;
            console.warn(`[Asignar Jornada] ${inactivos} empleado(s) inactivo(s) fueron filtrado(s)`);
          }

          // Para asignación individual: SÍ asignar jornadaId directamente
          const resultIndividual = await tx.empleados.updateMany({
            where: {
              id: { in: empleadoIdsValidos },
              empresaId: session.user.empresaId,
              activo: true,
            },
            data: {
              jornadaId: validatedData.jornadaId,
            },
          });
          empleadosActualizados = resultIndividual.count;

          // Actualizar validatedData.empleadoIds para que solo contenga IDs válidos
          // Esto asegura que se guarden solo empleados activos en la metadata
          validatedData.empleadoIds = empleadoIdsValidos;
          break;
      }

      // 5. Guardar metadata de asignación (upsert para manejar re-asignaciones)
      await tx.jornada_asignaciones.upsert({
        where: {
          jornadaId: validatedData.jornadaId,
        },
        create: {
          jornadaId: validatedData.jornadaId,
          empresaId: session.user.empresaId,
          nivelAsignacion: validatedData.nivel,
          equipoIds: (validatedData.nivel === 'equipo' ? validatedData.equipoIds : null) as any,
          empleadoIds: (validatedData.nivel === 'individual' ? validatedData.empleadoIds : null) as any,
        },
        update: {
          nivelAsignacion: validatedData.nivel,
          equipoIds: (validatedData.nivel === 'equipo' ? validatedData.equipoIds : null) as any,
          empleadoIds: (validatedData.nivel === 'individual' ? validatedData.empleadoIds : null) as any,
          updatedAt: new Date(),
        },
      });
    });

    return successResponse({
      success: true,
      empleadosActualizados,
      jornadasPreviasReemplazadas: jornadasPreviasUnicas.length > 0 ? {
        cantidad: empleadosConJornadasPrevias.length,
        nombres: jornadasPreviasUnicas,
      } : null,
      jornada: {
        id: jornada.id,
        etiqueta: obtenerEtiquetaJornada({
          horasSemanales: Number(jornada.horasSemanales),
          config: jornada.config as any,
          id: jornada.id,
        }),
      },
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/jornadas/asignar');
  }
}




