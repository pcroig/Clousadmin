// ========================================
// API Route: Finalizar Campaña de Vacaciones
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  handleApiError,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { calcularDias } from '@/lib/calculos/ausencias';
import { EstadoAusencia, UsuarioRol } from '@/lib/constants/enums';
import { crearNotificacionCampanaCuadrada } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { asJsonValue, JSON_NULL } from '@/lib/prisma/json';

import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface VacacionesPropuesta {
  fechaInicio: string | Date;
  fechaFin: string | Date;
  tipo?: string;
  motivo?: string;
}

interface AusenciaPayload {
  preferenciaId: string;
  empleadoId: string;
  equipoId: string | null;
  data: Prisma.AusenciaUncheckedCreateInput;
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

    if (session.user.rol !== UsuarioRol.hr_admin && session.user.rol !== UsuarioRol.manager) {
      return badRequestResponse('No tienes permisos para finalizar campañas');
    }

    const { id: campanaId } = await params;

    const campana = await prisma.campanaVacaciones.findFirst({
      where: {
        id: campanaId,
        empresaId: session.user.empresaId,
      },
      include: {
        preferencias: {
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                equipos: {
                  select: {
                    equipoId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!campana) {
      return badRequestResponse('Campaña no encontrada');
    }

    const preferenciasConPropuesta = campana.preferencias.filter(
      (pref) => pref.propuestaIA !== null
    );

    if (!campana.propuestaIA || preferenciasConPropuesta.length === 0) {
      return badRequestResponse('No hay propuestas para finalizar la campaña');
    }

    const ausenciasPayload: AusenciaPayload[] = [];

    for (const pref of preferenciasConPropuesta) {
      const propuesta = pref.propuestaIA as unknown as VacacionesPropuesta | null;
      if (!propuesta?.fechaInicio || !propuesta?.fechaFin) {
        return badRequestResponse('Una propuesta carece de fechas válidas');
      }
      const fechaInicio = new Date(propuesta.fechaInicio);
      const fechaFin = new Date(propuesta.fechaFin);

      if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
        return badRequestResponse('Fechas inválidas en una propuesta');
      }

      const equipoId = pref.empleado.equipos[0]?.equipoId || null;
      const diasCalculados = await calcularDias(fechaInicio, fechaFin, session.user.empresaId);

      ausenciasPayload.push({
        preferenciaId: pref.id,
        empleadoId: pref.empleado.id,
        equipoId,
        data: {
          empresaId: session.user.empresaId,
          empleadoId: pref.empleado.id,
          equipoId,
          tipo: 'vacaciones' as const,
          fechaInicio,
          fechaFin,
          medioDia: false,
          diasNaturales: diasCalculados.diasNaturales,
          diasLaborables: diasCalculados.diasLaborables,
          diasSolicitados: diasCalculados.diasSolicitados,
          motivo: `Vacaciones asignadas por campaña: ${campana.titulo}`,
          descuentaSaldo: true,
          estado: EstadoAusencia.pendiente,
          diasIdeales: asJsonValue(pref.diasIdeales),
          diasPrioritarios: asJsonValue(pref.diasPrioritarios),
          diasAlternativos: asJsonValue(pref.diasAlternativos),
        },
      });
    }

    const ausenciasCreadas: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const payload of ausenciasPayload) {
        const ausencia = await tx.ausencia.create({
          data: payload.data,
        });
        ausenciasCreadas.push(ausencia.id);

        await tx.preferenciaVacaciones.update({
          where: { id: payload.preferenciaId },
          data: {
            aceptada: true,
            propuestaEnviada: true,
            cambioSolicitado: false,
            propuestaEmpleado: JSON_NULL,
          },
        });
      }

      await tx.campanaVacaciones.update({
        where: { id: campanaId },
        data: {
          estado: 'finalizada',
          finalizadaEn: new Date(),
          cuadradaEn: new Date(),
        },
      });
    });

    await crearNotificacionCampanaCuadrada(
      prisma,
      {
        campanaId,
        empresaId: session.user.empresaId,
        empleadosIds: ausenciasPayload.map((p) => p.empleadoId),
        titulo: campana.titulo,
      },
      { actorUsuarioId: session.user.id }
    );

    return successResponse({
      ausenciasCreadas: ausenciasCreadas.length,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/campanas-vacaciones/[id]/finalizar');
  }
}

