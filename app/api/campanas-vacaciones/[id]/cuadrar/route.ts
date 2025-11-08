// ========================================
// API Route: Cuadrar Vacaciones con IA
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cuadrarVacacionesIA } from '@/lib/ia/cuadrar-vacaciones';
import { UsuarioRol } from '@/lib/constants/enums';

import {
  requireAuth,
  handleApiError,
  successResponse,
  badRequestResponse,
} from '@/lib/api-handler';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// POST /api/campanas-vacaciones/[id]/cuadrar - Ejecutar IA para cuadrar vacaciones
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo HR Admin o Manager
    if (session.user.rol !== UsuarioRol.hr_admin && session.user.rol !== UsuarioRol.manager) {
      return badRequestResponse('No tienes permisos para cuadrar campañas');
    }

    const { id: campanaId } = await params;

    // Obtener campaña con preferencias completas
    const campana = await prisma.campanaVacaciones.findFirst({
      where: {
        id: campanaId,
        empresaId: session.user.empresaId,
      },
      include: {
        preferencias: {
          where: {
            completada: true,
          },
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                diasVacaciones: true,
                usuarioId: true,
              },
            },
          },
        },
      },
    });

    if (!campana) {
      return badRequestResponse('Campaña no encontrada');
    }

    if (campana.estado === 'cuadrada') {
      return badRequestResponse('La campaña ya ha sido cuadrada');
    }

    if (campana.preferencias.length === 0) {
      return badRequestResponse('No hay empleados con preferencias completadas');
    }

    // Obtener ausencias ya aprobadas que puedan afectar el cuadrado
    const empleadoIds = campana.preferencias.map(p => p.empleado.id);
    const ausenciasAprobadas = await prisma.ausencia.findMany({
      where: {
        empleadoId: { in: empleadoIds },
        estado: { in: ['en_curso', 'completada', 'auto_aprobada'] },
        tipo: 'vacaciones',
      },
    });

    console.info(`[Cuadrar] Iniciando cuadrado de campaña ${campanaId} con ${campana.preferencias.length} empleados`);

    // Ejecutar IA
    const resultado = await cuadrarVacacionesIA({
      empresaId: session.user.empresaId,
      campanaId,
      solapamientoMaximoPct: campana.solapamientoMaximoPct,
      preferencias: campana.preferencias,
      ausenciasAprobadas,
      fechaInicioObjetivo: campana.fechaInicioObjetivo,
      fechaFinObjetivo: campana.fechaFinObjetivo,
    });

    // Guardar resultado en la campaña
    await prisma.campanaVacaciones.update({
      where: { id: campanaId },
      data: {
        propuestaIA: resultado as any,
        estado: 'cuadrada',
        cuadradaEn: new Date(),
      },
    });

    // Guardar propuestas individuales en cada preferencia
    for (const propuesta of resultado.propuestas) {
      await prisma.preferenciaVacaciones.updateMany({
        where: {
          campanaId,
          empleadoId: propuesta.empleadoId,
        },
        data: {
          propuestaIA: propuesta as any,
        },
      });
    }

    // Enviar notificaciones a los empleados (solo los que tienen usuarioId)
    const notificaciones = campana.preferencias
      .filter(pref => pref.empleado.usuarioId) // Solo empleados con usuario asociado
      .map(pref => ({
        empresaId: session.user.empresaId,
        usuarioId: pref.empleado.usuarioId!,
        tipo: 'success',
        titulo: 'Vacaciones cuadradas',
        mensaje: `Tu campaña de vacaciones "${campana.titulo}" ha sido cuadrada. Revisa la propuesta.`,
        metadata: {
          campanaId,
          tipo: 'campana_vacaciones_cuadrada',
        },
        leida: false,
      }));

    if (notificaciones.length > 0) {
      await prisma.notificacion.createMany({
        data: notificaciones,
      });
    }

    console.info(`[Cuadrar] Campaña ${campanaId} cuadrada exitosamente`);

    return successResponse({
      message: 'Vacaciones cuadradas exitosamente',
      resultado,
    });
  } catch (error) {
    console.error('[Cuadrar] Error al cuadrar vacaciones:', error);
    return handleApiError(error, 'API POST /api/campanas-vacaciones/[id]/cuadrar');
  }
}

