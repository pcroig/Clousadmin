// ========================================
// API Route: Solicitudes [ID]
// ========================================
// PATCH: Aprobar o rechazar solicitud de cambio

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHROrManager,
  validateRequest,
  handleApiError,
  successResponse,
  notFoundResponse,
} from '@/lib/api-handler';
import { z } from 'zod';

const solicitudAccionSchema = z.object({
  accion: z.enum(['aprobar', 'rechazar']),
  motivoRechazo: z.string().optional(),
});

// Whitelist de campos permitidos para cambios de datos personales
// Excluye campos sensibles como rol, empresaId, salario, etc.
const ALLOWED_EMPLOYEE_FIELDS = [
  'nombre',
  'apellidos',
  'telefono',
  'direccion',
  'email',
  'fechaNacimiento',
  'numeroSeguridadSocial',
  'cuentaBancaria',
] as const;

// PATCH /api/solicitudes/[id] - Aprobar o Rechazar solicitud (HR Admin o Manager)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación y rol HR Admin o Manager
    const authResult = await requireAuthAsHROrManager(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Validar request body
    const validationResult = await validateRequest(req, solicitudAccionSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const { accion, motivoRechazo } = validatedData;

    // Verificar que la solicitud existe y es de la misma empresa
    const solicitud = await prisma.solicitudCambio.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
            usuario: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!solicitud) {
      return notFoundResponse('Solicitud no encontrada');
    }

    // Verificar que la solicitud está pendiente
    if (solicitud.estado !== 'pendiente') {
      return NextResponse.json(
        { error: `La solicitud ya está ${solicitud.estado}` },
        { status: 400 }
      );
    }

    const ahora = new Date();

    // Usar transacción para asegurar consistencia de datos
    const result = await prisma.$transaction(async (tx) => {
      if (accion === 'aprobar') {
        // Aprobar solicitud
        const solicitudActualizada = await tx.solicitudCambio.update({
          where: { id },
          data: {
            estado: 'aprobada',
            aprobadorId: session.user.id,
            fechaRespuesta: ahora,
          },
          include: {
            empleado: {
              select: {
                nombre: true,
                apellidos: true,
                email: true,
              },
            },
          },
        });

        // Aplicar los cambios al empleado con validación de campos permitidos
        if (solicitud.camposCambiados && typeof solicitud.camposCambiados === 'object') {
          const cambios = solicitud.camposCambiados as Record<string, any>;

          // Filtrar solo campos permitidos
          const cambiosValidados: Record<string, any> = {};
          const camposRechazados: string[] = [];

          for (const [campo, valor] of Object.entries(cambios)) {
            if (ALLOWED_EMPLOYEE_FIELDS.includes(campo as any)) {
              cambiosValidados[campo] = valor;
            } else {
              camposRechazados.push(campo);
            }
          }

          // Log si hay campos rechazados por seguridad
          if (camposRechazados.length > 0) {
            console.warn(`[SOLICITUDES] Campos rechazados por seguridad en solicitud ${id}: ${camposRechazados.join(', ')}`);
          }

          // Aplicar solo cambios validados
          if (Object.keys(cambiosValidados).length > 0) {
            await tx.empleado.update({
              where: { id: solicitud.empleadoId },
              data: cambiosValidados,
            });
          }
        }

        // Crear notificación para el empleado
        if (solicitud.empleado.usuario?.id) {
          await tx.notificacion.create({
            data: {
              empresaId: session.user.empresaId,
              usuarioId: solicitud.empleado.usuario.id,
              tipo: 'success',
              titulo: 'Solicitud aprobada',
              mensaje: `Tu solicitud de ${solicitud.tipo} ha sido aprobada`,
              metadata: {
                solicitudId: solicitud.id,
                tipo: solicitud.tipo,
              },
              leida: false,
            },
          });
        } else {
          console.warn(`[SOLICITUDES] No se pudo crear notificación para solicitud ${id}: empleado sin usuario asociado`);
        }

        return {
          solicitud: solicitudActualizada,
          message: 'Solicitud aprobada correctamente',
        };
      } else {
        // Rechazar solicitud
        const solicitudActualizada = await tx.solicitudCambio.update({
          where: { id },
          data: {
            estado: 'rechazada',
            aprobadorId: session.user.id,
            fechaRespuesta: ahora,
            motivoRechazo: motivoRechazo,
          },
          include: {
            empleado: {
              select: {
                nombre: true,
                apellidos: true,
                email: true,
              },
            },
          },
        });

        // Crear notificación para el empleado
        if (solicitud.empleado.usuario?.id) {
          await tx.notificacion.create({
            data: {
              empresaId: session.user.empresaId,
              usuarioId: solicitud.empleado.usuario.id,
              tipo: 'error',
              titulo: 'Solicitud rechazada',
              mensaje: `Tu solicitud de ${solicitud.tipo} ha sido rechazada${
                motivoRechazo ? `: ${motivoRechazo}` : ''
              }`,
              metadata: {
                solicitudId: solicitud.id,
                tipo: solicitud.tipo,
                motivoRechazo,
              },
              leida: false,
            },
          });
        } else {
          console.warn(`[SOLICITUDES] No se pudo crear notificación para solicitud ${id}: empleado sin usuario asociado`);
        }

        return {
          solicitud: solicitudActualizada,
          message: 'Solicitud rechazada correctamente',
        };
      }
    });

    return successResponse(result);
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/solicitudes/[id]');
  }
}
