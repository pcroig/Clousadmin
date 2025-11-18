import { NextRequest } from 'next/server';
import { differenceInBusinessDays } from 'date-fns';
import { prisma, Prisma } from '@/lib/prisma';
import { UsuarioRol } from '@/lib/constants/enums';
import {
  requireAuth,
  handleApiError,
  successResponse,
  badRequestResponse,
} from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

interface AjustePayload {
  preferenciaId: string;
  fechaInicio: string;
  fechaFin: string;
  tipo: 'ideal' | 'alternativo' | 'ajustado';
  motivo: string;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    if (session.user.rol !== UsuarioRol.hr_admin && session.user.rol !== UsuarioRol.manager) {
      return badRequestResponse('No tienes permisos para actualizar propuestas');
    }

    const { id: campanaId } = await params;
    const body = await req.json();
    const ajustes: AjustePayload[] = Array.isArray(body.ajustes) ? body.ajustes : [];

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
          tipo: ajuste.tipo,
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
            propuestaIA: propuesta.propuesta as Prisma.JsonValue,
          },
        });
      }

      const propuestaCampana = (campana.propuestaIA as any) || {};
      const propuestasExistentes: any[] = Array.isArray(propuestaCampana.propuestas)
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
          propuestaIA: {
            ...propuestaCampana,
            propuestas: propuestasActualizadas,
          } as Prisma.JsonValue,
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

