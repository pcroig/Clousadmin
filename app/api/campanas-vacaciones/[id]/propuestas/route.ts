import { differenceInBusinessDays } from 'date-fns';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  handleApiError,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';
import { getJsonBody } from '@/lib/utils/json';

export const dynamic = 'force-dynamic';

interface AjustePayload {
  preferenciaId: string;
  fechaInicio: string;
  fechaFin: string;
  tipo?: 'ideal' | 'alternativo' | 'ajustado'; // Optional - for internal use
  motivo?: string; // Optional - not displayed in UI
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    if (session.user.rol !== UsuarioRol.hr_admin && session.user.rol !== UsuarioRol.manager) {
      return badRequestResponse('No tienes permisos para actualizar propuestas');
    }

    const { id: campanaId } = await params;
    const body = await getJsonBody<Record<string, unknown>>(req);

    const ajustesSchema = z.array(
      z.object({
        preferenciaId: z.string(),
        fechaInicio: z.string(),
        fechaFin: z.string(),
        tipo: z.enum(['ideal', 'alternativo', 'ajustado']).optional(),
        motivo: z.string().optional(),
      })
    );
    const ajustesResult = ajustesSchema.safeParse(body.ajustes);
    if (!ajustesResult.success) {
      return badRequestResponse(
        ajustesResult.error.issues[0]?.message || 'Datos de ajustes inválidos'
      );
    }
    const ajustes = ajustesResult.data;

    if (ajustes.length === 0) {
      return badRequestResponse('Debes indicar al menos un ajuste');
    }

    const campana = await prisma.campanaVacaciones.findFirst({
      where: {
        id: campanaId,
        empresaId: session.user.empresaId,
      },
      select: {
        fechaInicioObjetivo: true,
        fechaFinObjetivo: true,
        propuestaIA: true,
      },
    });

    if (!campana) {
      return badRequestResponse('Campaña no encontrada');
    }

    const preferenciaIds = ajustes.map((ajuste) => ajuste.preferenciaId);
    const preferencias = await prisma.preferenciaVacaciones.findMany({
      where: {
        id: { in: preferenciaIds },
        campanaId,
        empresaId: session.user.empresaId,
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
      },
    });

    if (preferencias.length !== preferenciaIds.length) {
      return badRequestResponse('Algunas preferencias no pertenecen a esta campaña');
    }

    const ajustesPorPreferencia = new Map<string, AjustePayload>();
    ajustes.forEach((ajuste) => ajustesPorPreferencia.set(ajuste.preferenciaId, ajuste));

    const nuevasPropuestas: Array<{
      preferenciaId: string;
      empleadoId: string;
      propuesta: Record<string, unknown>;
    }> = [];

    for (const pref of preferencias) {
      const ajuste = ajustesPorPreferencia.get(pref.id);
      if (!ajuste) continue;

      const fechaInicio = new Date(ajuste.fechaInicio);
      const fechaFin = new Date(ajuste.fechaFin);

      if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        return badRequestResponse('Fechas inválidas en los ajustes');
      }

      if (fechaFin < fechaInicio) {
        return badRequestResponse('La fecha fin debe ser posterior a la fecha inicio');
      }

      if (fechaInicio < campana.fechaInicioObjetivo || fechaFin > campana.fechaFinObjetivo) {
        return badRequestResponse('Las fechas deben estar dentro del rango de la campaña');
      }

      const diasCalculados = Math.max(
        1,
        differenceInBusinessDays(fechaFin, fechaInicio) + 1
      );

      nuevasPropuestas.push({
        preferenciaId: pref.id,
        empleadoId: pref.empleado.id,
        propuesta: {
          empleadoId: pref.empleado.id,
          empleadoNombre: `${pref.empleado.nombre} ${pref.empleado.apellidos}`,
          fechaInicio: ajuste.fechaInicio,
          fechaFin: ajuste.fechaFin,
          dias: diasCalculados,
          tipo: ajuste.tipo || 'ajustado',
          motivo: ajuste.motivo || 'Ajuste manual',
          prioridad: ajuste.tipo === 'ideal' ? 9 : ajuste.tipo === 'alternativo' ? 7 : 5,
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const propuesta of nuevasPropuestas) {
        await tx.preferenciaVacaciones.update({
          where: { id: propuesta.preferenciaId },
          data: {
            propuestaIA: asJsonValue(propuesta.propuesta),
          },
        });
      }

      type CampanaPropuestaIA = {
        propuestas?: Array<Record<string, unknown>>;
        [key: string]: unknown;
      };
      const propuestaCampana = ((campana.propuestaIA ?? {}) as CampanaPropuestaIA);
      const propuestasExistentes: Array<Record<string, unknown>> = Array.isArray(propuestaCampana.propuestas)
        ? propuestaCampana.propuestas
        : [];

      const propuestasActualizadas = [...propuestasExistentes];

      for (const propuesta of nuevasPropuestas) {
        const index = propuestasActualizadas.findIndex(
          (p) => p.empleadoId === propuesta.empleadoId
        );
        if (index >= 0) {
          propuestasActualizadas[index] = propuesta.propuesta;
        } else {
          propuestasActualizadas.push(propuesta.propuesta);
        }
      }

      await tx.campanaVacaciones.update({
        where: { id: campanaId },
        data: {
          propuestaIA: asJsonValue({
            ...propuestaCampana,
            propuestas: propuestasActualizadas,
          }),
        },
      });
    });

    return successResponse({
      ajustes: nuevasPropuestas.length,
    });
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/campanas-vacaciones/[id]/propuestas');
  }
}

