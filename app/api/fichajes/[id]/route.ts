// ========================================
// API Fichajes [ID] - GET, PATCH, DELETE
// ========================================

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  forbiddenResponse,
  handleApiError,
  notFoundResponse,
  requireAuth,
  requireAuthAsHR,
  successResponse,
} from '@/lib/api-handler';
import {
  actualizarCalculosFichaje,
  validarFichajeCompleto,
} from '@/lib/calculos/fichajes';
import { EstadoFichaje, UsuarioRol } from '@/lib/constants/enums';
import { crearNotificacionFichajeAprobado, crearNotificacionFichajeModificado, crearNotificacionFichajeRechazado } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { getJsonBody } from '@/lib/utils/json';

const fichajeApprovalSchema = z.object({
  accion: z.enum(['aprobar', 'rechazar']),
});

const fichajeEditSchema = z.object({
  tipo: z.enum(['entrada', 'pausa_inicio', 'pausa_fin', 'salida']).optional(),
  fecha: z.string().optional(),
  hora: z.string().optional(),
  motivoEdicion: z.string(),
});

interface Params {
  id: string;
}

// GET /api/fichajes/[id] - Obtener fichaje por ID
export async function GET(
  req: NextRequest,
  context: { params: Promise<Params> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    const fichaje = await prisma.fichaje.findUnique({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
            puesto: true,
          },
        },
        eventos: {
          orderBy: {
            hora: 'asc',
          },
        },
      },
    });

    if (!fichaje) {
      return notFoundResponse('Fichaje no encontrado');
    }

    // Verificar permisos: empleados solo pueden ver sus propios fichajes
    if (
      session.user.rol === UsuarioRol.empleado &&
      fichaje.empleadoId !== session.user.empleadoId
    ) {
      return forbiddenResponse('No tienes permiso para ver este fichaje');
    }

    return successResponse(fichaje);
  } catch (error) {
    return handleApiError(error, 'API GET /api/fichajes/[id]');
  }
}

// PATCH /api/fichajes/[id] - Aprobar/Rechazar o Editar fichaje
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<Params> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Obtener fichaje
    const fichaje = await prisma.fichaje.findUnique({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!fichaje) {
      return notFoundResponse('Fichaje no encontrado');
    }

    const rawBody = await getJsonBody<unknown>(req);

    // Si tiene accion, procesar aprobación/rechazo
    if (typeof rawBody === 'object' && rawBody !== null && 'accion' in rawBody) {
      // Verificar rol HR Admin o Manager
      if (session.user.rol !== UsuarioRol.hr_admin && session.user.rol !== UsuarioRol.manager) {
        return forbiddenResponse('Solo HR Admin o Manager pueden aprobar/rechazar fichajes');
      }

      // Validar con schema
      const validationResult = fichajeApprovalSchema.safeParse(rawBody);
      if (!validationResult.success) {
        return badRequestResponse(
          validationResult.error.issues[0]?.message || 'Datos inválidos'
        );
      }
      const { accion } = validationResult.data;
      const motivoRechazo =
        typeof rawBody === 'object' &&
        rawBody !== null &&
        'motivoRechazo' in rawBody &&
        typeof (rawBody as Record<string, unknown>).motivoRechazo === 'string'
          ? (rawBody as Record<string, unknown>).motivoRechazo
          : undefined;

      if (accion === 'aprobar') {
        // Validar que el fichaje tiene los eventos mínimos requeridos (entrada y salida)
        const eventos = await prisma.fichajeEvento.findMany({
          where: { fichajeId: fichaje.id },
          orderBy: { hora: 'asc' },
        });

        const tieneEntrada = eventos.some((evento) => evento.tipo === 'entrada');
        const tieneSalida = eventos.some((evento) => evento.tipo === 'salida');

        if (!tieneEntrada || !tieneSalida) {
          return badRequestResponse(
            'No se puede aprobar un fichaje sin eventos de entrada y salida. El fichaje debe tener al menos una entrada y una salida registradas.',
            {
              tieneEntrada,
              tieneSalida,
              eventosRegistrados: eventos.length,
            }
          );
        }

        const actualizado = await prisma.fichaje.update({
          where: { id },
          data: {
            estado: EstadoFichaje.finalizado,
          },
        });

        // Notificar al empleado
        try {
          await crearNotificacionFichajeAprobado(
            prisma,
            {
              fichajeId: fichaje.id,
              empresaId: session.user.empresaId,
              empleadoId: fichaje.empleadoId,
              fecha: fichaje.fecha,
            },
            { actorUsuarioId: session.user.id }
          );
        } catch (error) {
          console.error('[Fichajes] Error creando notificación de aprobación:', error);
        }

        return successResponse(actualizado);
      } else if (accion === 'rechazar') {
        const actualizado = await prisma.fichaje.update({
          where: { id },
          data: {
            estado: EstadoFichaje.pendiente, // Rechazado pasa a pendiente
          },
        });

        // Notificar al empleado
        try {
          await crearNotificacionFichajeRechazado(
            prisma,
            {
              fichajeId: fichaje.id,
              empresaId: session.user.empresaId,
              empleadoId: fichaje.empleadoId,
              fecha: fichaje.fecha,
              motivoRechazo,
            },
            { actorUsuarioId: session.user.id }
          );
        } catch (error) {
          console.error('[Fichajes] Error creando notificación de rechazo:', error);
        }

        return successResponse(actualizado);
      }
    }

    // Caso 2: Editar fichaje (solo HR/Manager o el propio empleado para solicitar corrección)
    const editValidation = fichajeEditSchema.safeParse(rawBody);
    if (!editValidation.success) {
      return badRequestResponse(
        editValidation.error.issues[0]?.message || 'Datos inválidos'
      );
    }
    const validatedData = editValidation.data;

    if (session.user.rol === UsuarioRol.empleado) {
      return forbiddenResponse(
        'Las modificaciones deben solicitarse desde el formulario de correcciones'
      );
    }

    // Actualizar evento del fichaje (por ahora solo actualizar la hora si se proporciona)
    if (validatedData.hora || validatedData.tipo) {
      // Buscar el evento a editar (por defecto el último evento del día)
      const eventos = await prisma.fichajeEvento.findMany({
        where: { fichajeId: id },
        orderBy: { hora: 'desc' },
        take: 1,
      });

      if (eventos.length > 0) {
        const evento = eventos[0];

        await prisma.fichajeEvento.update({
          where: { id: evento.id },
          data: {
            ...(validatedData.hora && {
              hora: new Date(validatedData.hora),
              horaOriginal: evento.hora, // Audit: save original time
            }),
            ...(validatedData.tipo && { tipo: validatedData.tipo }),
            editado: true,
            editadoPor: session.user.id,
            motivoEdicion: validatedData.motivoEdicion || null,
          },
        });

        // Recalcular horas trabajadas
        await actualizarCalculosFichaje(id);

        // Notificar al empleado del cambio
        try {
          const modificadorNombre = session.user.nombre || 'RR.HH.';
          const detalles = validatedData.motivoEdicion
            ? `Motivo: ${validatedData.motivoEdicion}`
            : undefined;

          await crearNotificacionFichajeModificado(
            prisma,
            {
              fichajeId: fichaje.id,
              empresaId: session.user.empresaId,
              empleadoId: fichaje.empleadoId,
              modificadoPorNombre: modificadorNombre,
              accion: 'editado',
              fechaFichaje: fichaje.fecha,
              detalles,
            },
            { actorUsuarioId: session.user.id }
          );
        } catch (error) {
          console.error('[Fichajes] Error creando notificación de edición:', error);
        }
      }
    }

    // Actualizar fecha del fichaje si se proporciona
    if (validatedData.fecha) {
      await prisma.fichaje.update({
        where: { id },
        data: {
          fecha: new Date(validatedData.fecha),
        },
      });
    }

    // Validar si el fichaje está completo después de la edición
    const validacion = await validarFichajeCompleto(id);
    
    // Si el fichaje estaba pendiente y ahora está completo, marcarlo como finalizado
    // Solo si quien edita es HR o Manager
    if (
      validacion.completo &&
      fichaje.estado === EstadoFichaje.pendiente &&
      (session.user.rol === UsuarioRol.hr_admin || session.user.rol === UsuarioRol.manager)
    ) {
      await prisma.fichaje.update({
        where: { id },
        data: { estado: EstadoFichaje.finalizado },
      });
    }

    const fichajeActualizado = await prisma.fichaje.findUnique({
      where: { id },
      include: {
        eventos: {
          orderBy: { hora: 'asc' },
        },
      },
    });

    return successResponse(fichajeActualizado);
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/fichajes/[id]');
  }
}

// DELETE /api/fichajes/[id] - Eliminar fichaje (solo HR Admin)
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<Params> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    await prisma.fichaje.delete({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    return successResponse({ success: true });
  } catch (error) {
    return handleApiError(error, 'API DELETE /api/fichajes/[id]');
  }
}




