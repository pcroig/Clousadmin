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

    // 4. Aplicar asignación según nivel
    switch (validatedData.nivel) {
      case 'empresa':
        // Asignar a todos los empleados de la empresa
        const resultEmpresa = await prisma.empleados.updateMany({
          where: {
            empresaId: session.user.empresaId,
            activo: true,
          },
          data: {
            jornadaId: validatedData.jornadaId,
          },
        });
        empleadosActualizados = resultEmpresa.count;
        break;

      case 'equipo':
        if (!validatedData.equipoIds || validatedData.equipoIds.length === 0) {
          return badRequestResponse('Debes especificar al menos un equipo');
        }

        // Obtener empleados de los equipos especificados
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
          const resultEquipos = await prisma.empleados.updateMany({
            where: {
              id: { in: empleadoIdsEquipos },
              empresaId: session.user.empresaId,
              activo: true,
            },
            data: {
              jornadaId: validatedData.jornadaId,
            },
          });
          empleadosActualizados = resultEquipos.count;
        }
        break;

      case 'individual':
        if (!validatedData.empleadoIds || validatedData.empleadoIds.length === 0) {
          return badRequestResponse('Debes especificar al menos un empleado');
        }

        const resultIndividual = await prisma.empleados.updateMany({
          where: {
            id: { in: validatedData.empleadoIds },
            empresaId: session.user.empresaId,
            activo: true,
          },
          data: {
            jornadaId: validatedData.jornadaId,
          },
        });
        empleadosActualizados = resultIndividual.count;
        break;
    }

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




