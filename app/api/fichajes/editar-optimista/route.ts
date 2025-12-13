// ========================================
// API: Editar Fichaje Optimista (Empleados)
// ========================================
// Endpoint transaccional para que empleados editen fichajes optimistamente.
// Aplica cambios Y crea solicitud en una sola transacción atómica.

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  createdResponse,
  handleApiError,
  isNextResponse,
  requireAuth,
  validateRequest,
} from '@/lib/api-handler';
import { actualizarCalculosFichaje } from '@/lib/calculos/fichajes';
import { crearNotificacionFichajeRequiereRevision } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { idSchema } from '@/lib/validaciones/schemas';

const editarOptimistaSchema = z.object({
  fichajeId: idSchema,
  motivo: z.string().min(1, 'El motivo es requerido'),
  cambios: z.object({
    eliminados: z.array(z.string()),
    nuevos: z.array(
      z.object({
        tipo: z.enum(['entrada', 'pausa_inicio', 'pausa_fin', 'salida']),
        hora: z.string(), // ISO string
      })
    ),
    editados: z.array(
      z.object({
        id: z.string(),
        tipo: z.enum(['entrada', 'pausa_inicio', 'pausa_fin', 'salida']).optional(),
        hora: z.string().optional(), // ISO string
      })
    ),
  }),
  detalles: z.any(), // Detalles completos para auditoría
});

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (isNextResponse(authResult)) return authResult;
    const { session } = authResult;

    if (!session.user.empleadoId) {
      return badRequestResponse('No tienes un empleado asignado. Contacta con HR.');
    }

    const validation = await validateRequest(req, editarOptimistaSchema);
    if (isNextResponse(validation)) return validation;

    const { fichajeId, motivo, cambios, detalles } = validation.data;

    // Validar que el fichaje existe y pertenece al empleado
    const fichaje = await prisma.fichajes.findFirst({
      where: {
        id: fichajeId,
        empleadoId: session.user.empleadoId,
        empresaId: session.user.empresaId,
      },
      select: { id: true, estado: true, fecha: true },
    });

    if (!fichaje) {
      return badRequestResponse('No se encontró el fichaje seleccionado.');
    }

    // CRÍTICO: Validar que el fichaje NO esté rechazado
    if (fichaje.estado === 'rechazado') {
      return badRequestResponse('Este fichaje fue rechazado y no se puede editar.');
    }

    // Ejecutar todo en una transacción atómica
    const resultado = await prisma.$transaction(async (tx) => {
      // 1. Eliminar eventos
      if (cambios.eliminados.length > 0) {
        await tx.fichaje_eventos.deleteMany({
          where: {
            id: { in: cambios.eliminados },
            fichajeId,
          },
        });
      }

      // 2. Crear eventos nuevos
      for (const evento of cambios.nuevos) {
        await tx.fichaje_eventos.create({
          data: {
            fichajeId,
            tipo: evento.tipo,
            hora: new Date(evento.hora),
            editado: true,
            motivoEdicion: motivo,
          },
        });
      }

      // 3. Actualizar eventos modificados
      for (const evento of cambios.editados) {
        const updateData: Record<string, unknown> = {
          editado: true,
          motivoEdicion: motivo,
        };

        if (evento.tipo) updateData.tipo = evento.tipo;
        if (evento.hora) updateData.hora = new Date(evento.hora);

        await tx.fichaje_eventos.update({
          where: { id: evento.id },
          data: updateData,
        });
      }

      // 4. Recalcular horas trabajadas
      await actualizarCalculosFichaje(fichajeId, tx);

      // 5. Crear solicitud de corrección para auditoría
      const solicitud = await tx.solicitudes_correccion_fichaje.create({
        data: {
          empresaId: session.user.empresaId,
          empleadoId: session.user.empleadoId!, // Non-null assertion (validated above)
          fichajeId,
          motivo,
          detalles,
        },
      });

      return { solicitud };
    });

    // 6. Notificar a HR (fuera de la transacción para no bloquear)
    const empleadoSolicitante = await prisma.empleados.findUnique({
      where: { id: session.user.empleadoId },
      select: { nombre: true, apellidos: true },
    });

    if (empleadoSolicitante) {
      await crearNotificacionFichajeRequiereRevision(
        prisma,
        {
          fichajeId,
          empresaId: session.user.empresaId,
          empleadoId: session.user.empleadoId,
          empleadoNombre: `${empleadoSolicitante.nombre} ${empleadoSolicitante.apellidos}`,
          fecha: fichaje.fecha,
          razon: motivo,
        },
        { actorUsuarioId: session.user.id }
      );
    }

    return createdResponse(resultado.solicitud);
  } catch (error) {
    return handleApiError(error, 'API POST /api/fichajes/editar-optimista');
  }
}
