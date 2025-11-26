// ========================================
// API Route: /api/festivos
// GET - Listar festivos
// POST - Crear festivo personalizado
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  createdResponse,
  handleApiError,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma, Prisma } from '@/lib/prisma';
import { getJsonBody } from '@/lib/utils/json';
import { festivoCreateSchema } from '@/lib/validaciones/schemas';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// GET /api/festivos - Listar festivos
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(req.url);
    const añoParam = searchParams.get('año');
    const tipoParam = searchParams.get('tipo');
    const activoParam = searchParams.get('activo');

    // Construir filtros
    const where: Prisma.FestivoWhereInput = {
      empresaId: session.user.empresaId,
    };

    // Filtrar por año si se proporciona
    if (añoParam) {
      const año = parseInt(añoParam);
      where.fecha = {
        gte: new Date(`${año}-01-01`),
        lt: new Date(`${año + 1}-01-01`),
      };
    }

    // Filtrar por tipo si se proporciona
    if (tipoParam && (tipoParam === 'nacional' || tipoParam === 'empresa')) {
      where.tipo = tipoParam;
    }

    // Filtrar por activo si se proporciona
    if (activoParam !== null) {
      where.activo = activoParam === 'true';
    }

    const festivos = await prisma.festivo.findMany({
      where,
      orderBy: {
        fecha: 'asc',
      },
    });

    // Calcular metadatos
    const total = festivos.length;
    const añoActual = new Date().getFullYear();
    
    const festivosAñoActual = await prisma.festivo.count({
      where: {
        empresaId: session.user.empresaId,
        fecha: {
          gte: new Date(`${añoActual}-01-01`),
          lt: new Date(`${añoActual + 1}-01-01`),
        },
      },
    });

    const festivosAñoProximo = await prisma.festivo.count({
      where: {
        empresaId: session.user.empresaId,
        fecha: {
          gte: new Date(`${añoActual + 1}-01-01`),
          lt: new Date(`${añoActual + 2}-01-01`),
        },
      },
    });

    return successResponse({
      festivos,
      meta: {
        total,
        año: añoParam ? parseInt(añoParam) : null,
        festivosAñoActual,
        festivosAñoProximo,
      },
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/festivos');
  }
}

// POST /api/festivos - Crear festivo personalizado
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo HR Admin puede crear festivos
    if (session.user.rol !== UsuarioRol.hr_admin) {
      return badRequestResponse('No tienes permisos para crear festivos');
    }

    const body = await getJsonBody<Record<string, unknown>>(req);
    const validationResult = festivoCreateSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(
        validationResult.error.issues[0]?.message || 'Datos inválidos'
      );
    }

    const data = validationResult.data;

    // Convertir fecha a Date
    let fecha: Date;
    if (typeof data.fecha === 'string') {
      const [year, month, day] = data.fecha.split('-').map(Number);
      fecha = new Date(Date.UTC(year, month - 1, day));
    } else {
      fecha = data.fecha;
    }

    // Verificar que no exista un festivo en esa fecha
    const festivoExistente = await prisma.festivo.findFirst({
      where: {
        empresaId: session.user.empresaId,
        fecha,
      },
    });

    if (festivoExistente) {
      return badRequestResponse('Ya existe un festivo en esa fecha');
    }

    // Crear festivo
    const festivo = await prisma.festivo.create({
      data: {
        empresaId: session.user.empresaId,
        fecha,
        nombre: data.nombre,
        tipo: 'empresa',
        origen: 'manual',
        activo: data.activo ?? true,
      },
    });

    console.info(`[Festivos] Festivo creado: ${festivo.nombre} (${festivo.fecha.toISOString().split('T')[0]})`);

    return createdResponse({
      id: festivo.id,
      fecha: festivo.fecha.toISOString().split('T')[0],
      nombre: festivo.nombre,
      tipo: festivo.tipo,
      activo: festivo.activo,
      createdAt: festivo.createdAt.toISOString(),
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/festivos');
  }
}

