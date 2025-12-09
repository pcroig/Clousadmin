// ========================================
// API Notificaciones - Rechazar Edición de Fichaje
// ========================================
// Permite al empleado rechazar una edición de fichaje realizada por HR
// Revierte TODOS los cambios del grupo y restaura el estado original

import { NextRequest } from 'next/server';
import { format } from 'date-fns';

import {
  handleApiError,
  isNextResponse,
  notFoundResponse,
  requireAuth,
  successResponse,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/api-handler';
import { calcularHorasTrabajadas, calcularTiempoEnPausa, validarFichajeCompleto } from '@/lib/calculos/fichajes';
import { prisma } from '@/lib/prisma';

// POST /api/notificaciones/[id]/rechazar-edicion - Rechazar edición de fichaje
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;

  try {
    // 1. Autenticación
    const authResult = await requireAuth(req);
    if (isNextResponse(authResult)) return authResult;
    const { session } = authResult;

    if (!session.user.empleadoId) {
      return forbiddenResponse('Solo empleados pueden rechazar ediciones');
    }

    // 2. Buscar notificación y edición pendiente
    const notificacion = await prisma.notificaciones.findUnique({
      where: { id: params.id },
      include: {
        ediciones_fichaje_pendiente: {
          include: {
            fichaje: {
              include: {
                eventos: { orderBy: { hora: 'asc' } },
              },
            },
            editor: {
              select: { nombre: true, apellidos: true },
            },
          },
        },
      },
    });

    if (!notificacion) {
      return notFoundResponse('Notificación no encontrada');
    }

    // Verificar que la notificación pertenece al usuario
    if (notificacion.usuarioId !== session.user.id) {
      return forbiddenResponse('No tienes permiso para rechazar esta edición');
    }

    const edicion = notificacion.ediciones_fichaje_pendiente;

    if (!edicion) {
      return badRequestResponse('Esta notificación no tiene una edición asociada');
    }

    if (edicion.estado !== 'pendiente') {
      return badRequestResponse('Esta edición ya fue procesada');
    }

    // Verificar que no ha expirado (opcional, pero previene rechazos tardíos)
    if (new Date() > edicion.expiraEn) {
      return badRequestResponse('El plazo para rechazar esta edición ha expirado');
    }

    // 3. REVERTIR cambios en TRANSACCIÓN
    await prisma.$transaction(async (tx) => {
      const cambios = edicion.cambios as Array<any>;

      // Revertir en orden inverso para mantener integridad
      const cambiosRevertidos = [...cambios].reverse();

      for (const cambio of cambiosRevertidos) {
        switch (cambio.accion) {
          case 'crear':
            // Eliminar evento creado
            await tx.fichaje_eventos.delete({
              where: { id: cambio.eventoId },
            });
            break;

          case 'editar':
            // Restaurar valores anteriores
            await tx.fichaje_eventos.update({
              where: { id: cambio.eventoId },
              data: {
                hora: new Date(cambio.camposAnteriores.hora),
                tipo: cambio.camposAnteriores.tipo,
                editado: cambio.camposAnteriores.editado || false,
                motivoEdicion: cambio.camposAnteriores.motivoEdicion || null,
                horaOriginal: cambio.camposAnteriores.horaOriginal
                  ? new Date(cambio.camposAnteriores.horaOriginal)
                  : null,
              },
            });
            break;

          case 'eliminar':
            // Recrear evento eliminado
            await tx.fichaje_eventos.create({
              data: {
                fichajeId: edicion.fichajeId,
                tipo: cambio.eventoEliminado.tipo,
                hora: new Date(cambio.eventoEliminado.hora),
                editado: cambio.eventoEliminado.editado || false,
                motivoEdicion: cambio.eventoEliminado.motivoEdicion || null,
                horaOriginal: cambio.eventoEliminado.horaOriginal
                  ? new Date(cambio.eventoEliminado.horaOriginal)
                  : null,
              },
            });
            break;
        }
      }

      // 4. Recalcular horas y estado ORIGINAL
      const fichajeActualizado = await tx.fichajes.findUnique({
        where: { id: edicion.fichajeId },
        include: {
          eventos: { orderBy: { hora: 'asc' } },
        },
      });

      if (!fichajeActualizado) {
        throw new Error('Error al actualizar fichaje');
      }

      const horasTrabajadas = calcularHorasTrabajadas(fichajeActualizado.eventos) ?? 0;
      const horasEnPausa = calcularTiempoEnPausa(fichajeActualizado.eventos);

      // Determinar estado original
      const validacionCompleto = await validarFichajeCompleto(edicion.fichajeId);
      let estadoOriginal = 'en_curso';
      if (validacionCompleto.completo) {
        estadoOriginal = 'finalizado';
      } else if (fichajeActualizado.eventos.length === 0) {
        estadoOriginal = 'pendiente';
      }

      await tx.fichajes.update({
        where: { id: edicion.fichajeId },
        data: {
          horasTrabajadas,
          horasEnPausa,
          estado: estadoOriginal,
        },
      });

      // 5. Marcar edición como rechazada
      await tx.ediciones_fichaje_pendientes.update({
        where: { id: edicion.id },
        data: {
          estado: 'rechazado',
          rechazadoEn: new Date(),
        },
      });

      // 6. Marcar notificación como leída
      await tx.notificaciones.update({
        where: { id: params.id },
        data: { leida: true },
      });

      // 7. Obtener datos del empleado que rechaza
      const empleado = await tx.empleados.findUnique({
        where: { id: edicion.empleadoId },
        select: { nombre: true, apellidos: true },
      });

      // 8. Obtener usuario del HR admin (editor)
      const usuarioEditor = await tx.usuarios.findUnique({
        where: { empleadoId: edicion.editadoPor },
        select: { id: true },
      });

      if (!usuarioEditor) {
        throw new Error('Usuario del editor no encontrado');
      }

      // 9. Notificar a HR Admin que se rechazó la edición
      await tx.notificaciones.create({
        data: {
          empresaId: edicion.empresaId,
          usuarioId: usuarioEditor.id,
          tipo: 'edicion_rechazada',
          prioridad: 'normal',
          mensaje: `${empleado?.nombre} ${empleado?.apellidos} rechazó tu edición del fichaje del ${format(edicion.fichaje.fecha, 'dd/MM/yyyy')}`,
          enlace: '/hr/horario/fichajes',
          textoBoton: 'Ver fichaje',
          leida: false,
        },
      });
    });

    return successResponse({ success: true, mensaje: 'Edición rechazada correctamente' });
  } catch (error) {
    return handleApiError(error, 'API POST /api/notificaciones/[id]/rechazar-edicion');
  }
}
