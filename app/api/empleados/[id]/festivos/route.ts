// ========================================
// API Festivos Personalizados de Empleado
// ========================================

import { NextRequest } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  createdResponse,
  handleApiError,
  notFoundResponse,
  requireAuth,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Schema de validación
const festivoEmpleadoCreateSchema = z.object({
  festivoEmpresaId: z.string(),
  fecha: z.union([z.string(), z.date()]),
  nombre: z.string().min(1).max(200),
});

// GET /api/empleados/[id]/festivos
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: empleadoId } = params;

    // Verificar permisos
    const isHR = session.user.rol === UsuarioRol.hr_admin;
    const isOwnProfile = session.user.empleadoId === empleadoId;

    if (!isHR && !isOwnProfile) {
      return badRequestResponse('No tienes permisos');
    }

    // Verificar que el empleado pertenece a la misma empresa
    const empleado = await prisma.empleados.findFirst({
      where: {
        id: empleadoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    const festivos = await prisma.empleado_festivos.findMany({
      where: { empleadoId },
      include: {
        festivoEmpresa: {
          select: {
            fecha: true,
            nombre: true,
          },
        },
      },
      orderBy: { fecha: 'asc' },
    });

    const festivosNormalizados = festivos.map((f) => ({
      id: f.id,
      festivoEmpresaId: f.festivoEmpresaId,
      fecha: f.fecha.toISOString().split('T')[0],
      nombre: f.nombre,
      estado: f.estado,
      festivoEmpresa: {
        fecha: f.festivoEmpresa.fecha.toISOString().split('T')[0],
        nombre: f.festivoEmpresa.nombre,
      },
    }));

    return successResponse(festivosNormalizados);
  } catch (error) {
    return handleApiError(error, 'API GET /api/empleados/[id]/festivos');
  }
}

// POST /api/empleados/[id]/festivos
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: empleadoId } = params;

    // Verificar permisos
    const isHR = session.user.rol === UsuarioRol.hr_admin;
    const isOwnProfile = session.user.empleadoId === empleadoId;

    if (!isHR && !isOwnProfile) {
      return badRequestResponse('No tienes permisos');
    }

    const validationResult = await validateRequest(req, festivoEmpleadoCreateSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data } = validationResult;

    // Verificar empleado
    const empleado = await prisma.empleados.findFirst({
      where: {
        id: empleadoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    // Verificar que el festivo de empresa existe
    const festivoEmpresa = await prisma.festivos.findFirst({
      where: {
        id: data.festivoEmpresaId,
        empresaId: session.user.empresaId,
      },
    });

    if (!festivoEmpresa) {
      return badRequestResponse('Festivo de empresa no encontrado');
    }

    // Convertir fecha
    let fecha: Date;
    if (typeof data.fecha === 'string') {
      const [year, month, day] = data.fecha.split('-').map(Number);
      fecha = new Date(Date.UTC(year, month - 1, day));
    } else {
      fecha = data.fecha;
    }

    // Verificar que no existe ya un reemplazo para este festivo
    const existente = await prisma.empleado_festivos.findFirst({
      where: {
        empleadoId,
        festivoEmpresaId: data.festivoEmpresaId,
      },
    });

    if (existente) {
      return badRequestResponse('Ya existe un reemplazo para este festivo');
    }

    // Crear festivo personalizado
    // Si es HR: estado aprobado
    // Si es empleado: estado pendiente
    const festivo = await prisma.empleado_festivos.create({
      data: {
        empleadoId,
        festivoEmpresaId: data.festivoEmpresaId,
        fecha,
        nombre: data.nombre,
        estado: isHR ? 'aprobado' : 'pendiente',
        solicitadoPor: session.user.id,
        aprobadoPor: isHR ? session.user.id : null,
      },
    });

    console.info(
      `[Festivos Empleado] ${isHR ? 'Creado' : 'Solicitado'} para empleado ${empleadoId}: ${festivo.nombre} (${festivo.fecha.toISOString().split('T')[0]})`
    );

    return createdResponse({
      id: festivo.id,
      festivoEmpresaId: festivo.festivoEmpresaId,
      fecha: festivo.fecha.toISOString().split('T')[0],
      nombre: festivo.nombre,
      estado: festivo.estado,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/empleados/[id]/festivos');
  }
}
