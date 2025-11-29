// ========================================
// API Fichajes - Solicitudes de Corrección
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  createdResponse,
  handleApiError,
  isNextResponse,
  requireAuth,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { UsuarioRol } from '@/lib/constants/enums';
import { crearNotificacionFichajeRequiereRevision } from '@/lib/notificaciones';
import { prisma, Prisma } from '@/lib/prisma';

const crearCorreccionSchema = z.object({
  fichajeId: z.string().uuid(),
  motivo: z.string().min(10, 'Explica brevemente el motivo de la corrección'),
  nuevaFecha: z.string().optional(),
  nuevaHora: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (isNextResponse(authResult)) return authResult;
    const { session } = authResult;

    if (!session.user.empleadoId) {
      return badRequestResponse('No tienes un empleado asignado. Contacta con HR.');
    }

    const validation = await validateRequest(req, crearCorreccionSchema);
    if (isNextResponse(validation)) return validation;

    const { fichajeId, motivo, nuevaFecha, nuevaHora } = validation.data;

    if (!nuevaFecha && !nuevaHora) {
      return badRequestResponse('Debes indicar la nueva fecha, la nueva hora o ambas.');
    }

    const fichaje = await prisma.fichaje.findFirst({
      where: {
        id: fichajeId,
        empleadoId: session.user.empleadoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!fichaje) {
      return badRequestResponse('No se encontró el fichaje seleccionado.');
    }

    const solicitud = await prisma.solicitudCorreccionFichaje.create({
      data: {
        empresaId: session.user.empresaId,
        empleadoId: session.user.empleadoId,
        fichajeId,
        motivo,
        detalles: {
          nuevaFecha: nuevaFecha ?? null,
          nuevaHora: nuevaHora ?? null,
        },
      },
    });

    const empleadoSolicitante = await prisma.empleado.findUnique({
      where: { id: session.user.empleadoId },
      select: {
        nombre: true,
        apellidos: true,
      },
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

    return createdResponse(solicitud);
  } catch (error) {
    return handleApiError(error, 'API POST /api/fichajes/correcciones');
  }
}

const obtenerCorreccionesSchema = z.object({
  estado: z
    .enum(['pendiente', 'aprobada', 'rechazada'])
    .optional(),
  propias: z
    .enum(['0', '1'])
    .optional(),
});

async function getManagerEmpleadoIds(managerEmpleadoId: string) {
  const empleados = await prisma.empleado.findMany({
    where: {
      managerId: managerEmpleadoId,
      activo: true,
    },
    select: { id: true },
  });

  return empleados.map((empleado) => empleado.id);
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (isNextResponse(authResult)) return authResult;
    const { session } = authResult;

    const paramsValidation = obtenerCorreccionesSchema.safeParse({
      estado: req.nextUrl.searchParams.get('estado') ?? undefined,
      propias: req.nextUrl.searchParams.get('propias') ?? undefined,
    });

    if (!paramsValidation.success) {
      return badRequestResponse('Parámetros inválidos', paramsValidation.error.issues);
    }

    const { estado, propias } = paramsValidation.data;

    const where: Prisma.SolicitudCorreccionFichajeWhereInput = {
      empresaId: session.user.empresaId,
    };

    if (estado) {
      where.estado = estado;
    }

    if (session.user.rol === UsuarioRol.empleado || propias === '1') {
      if (!session.user.empleadoId) {
        return badRequestResponse('No tienes un empleado asignado. Contacta con HR.');
      }
      where.empleadoId = session.user.empleadoId;
    } else if (session.user.rol === UsuarioRol.manager) {
      if (!session.user.empleadoId) {
        return badRequestResponse('No tienes un empleado asignado. Contacta con HR.');
      }
      const empleadosIds = await getManagerEmpleadoIds(session.user.empleadoId);
      where.empleadoId = {
        in: empleadosIds,
      };
    }

    const solicitudes = await prisma.solicitudCorreccionFichaje.findMany({
      where,
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
        fichaje: {
          select: {
            id: true,
            fecha: true,
            estado: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    return successResponse(solicitudes);
  } catch (error) {
    return handleApiError(error, 'API GET /api/fichajes/correcciones');
  }
}

