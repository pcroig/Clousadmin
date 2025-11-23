// ========================================
// API Route: Responder Propuesta de Campaña (Empleado)
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  handleApiError,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { calcularDias } from '@/lib/calculos/ausencias';
import { EstadoAusencia } from '@/lib/constants/enums';
import { prisma, Prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface VacacionesPropuesta {
  fechaInicio: string | Date;
  fechaFin: string | Date;
  tipo?: string;
  motivo?: string;
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    if (!session.user.empleadoId) {
      return badRequestResponse('Solo los empleados pueden responder propuestas');
    }

    const { id: campanaId } = await params;
    const body = await req.json();
    const accion = body?.accion;

    if (!accion || !['aceptar', 'solicitar_cambio'].includes(accion)) {
      return badRequestResponse('Acción inválida');
    }

    const preferencia = await prisma.preferenciaVacaciones.findFirst({
      where: {
        campanaId,
        empleadoId: session.user.empleadoId,
      },
      include: {
        campana: true,
        empleado: {
          select: {
            id: true,
            equipos: {
              select: {
                equipoId: true,
              },
            },
          },
        },
      },
    });

    if (!preferencia) {
      return badRequestResponse('No estás asignado a esta campaña');
    }

    if (!preferencia.propuestaIA) {
      return badRequestResponse('No hay propuesta disponible');
    }

    if (accion === 'aceptar') {
      const propuesta = preferencia.propuestaIA as VacacionesPropuesta;
      const fechaInicio = new Date(propuesta.fechaInicio);
      const fechaFin = new Date(propuesta.fechaFin);

      if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
        return badRequestResponse('Fechas de propuesta inválidas');
      }

      const equipoId = preferencia.empleado.equipos[0]?.equipoId || null;
      const { diasNaturales, diasLaborables, diasSolicitados } = await calcularDias(
        fechaInicio,
        fechaFin,
        session.user.empresaId
      );

      const ausencia = await prisma.ausencia.create({
        data: {
          empresaId: session.user.empresaId,
          empleadoId: session.user.empleadoId,
          equipoId,
          tipo: 'vacaciones',
          fechaInicio,
          fechaFin,
          medioDia: false,
          diasNaturales,
          diasLaborables,
          diasSolicitados,
          motivo: `Vacaciones de campaña: ${preferencia.campana.titulo}`,
          descuentaSaldo: true,
          estado: EstadoAusencia.pendiente,
          diasIdeales: preferencia.diasIdeales as Prisma.InputJsonValue,
          diasPrioritarios: preferencia.diasPrioritarios as Prisma.InputJsonValue,
          diasAlternativos: preferencia.diasAlternativos as Prisma.InputJsonValue,
        },
      });

      await prisma.preferenciaVacaciones.update({
        where: { id: preferencia.id },
        data: {
          aceptada: true,
          propuestaEnviada: true,
          cambioSolicitado: false,
          propuestaEmpleado: Prisma.JsonNull,
        },
      });

      return successResponse({
        message: 'Propuesta aceptada y ausencia creada',
        ausenciaId: ausencia.id,
      });
    }

    // Solicitar cambio con nuevas fechas
    const diasIdeales = Array.isArray(body.diasIdeales) ? body.diasIdeales : [];
    const diasPrioritarios = Array.isArray(body.diasPrioritarios) ? body.diasPrioritarios : [];
    const diasAlternativos = Array.isArray(body.diasAlternativos) ? body.diasAlternativos : [];

    if (diasIdeales.length === 0 && diasPrioritarios.length === 0 && diasAlternativos.length === 0) {
      return badRequestResponse('Debe proponer al menos una fecha');
    }

    if (diasIdeales.length > 0) {
      const minimoAlternativos = Math.ceil(diasIdeales.length * 0.5);
      if (diasAlternativos.length < minimoAlternativos) {
        return badRequestResponse(
          `Debes añadir al menos ${minimoAlternativos} días alternativos (50% de los días ideales)`
        );
      }
    }

    await prisma.preferenciaVacaciones.update({
      where: { id: preferencia.id },
      data: {
        propuestaEmpleado: {
          diasIdeales,
          diasPrioritarios,
          diasAlternativos,
        } as Prisma.InputJsonValue,
        cambioSolicitado: true,
        propuestaEnviada: true,
        aceptada: false,
      },
    });

    return successResponse({
      message: 'Solicitud de cambio registrada',
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/campanas-vacaciones/[id]/responder');
  }
}






