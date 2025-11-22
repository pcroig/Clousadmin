// ========================================
// API: Tipos de Complemento
// ========================================
// CRUD para gestionar el catálogo de tipos de complementos

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Validation schema
const TipoComplementoSchema = z.object({
  nombre: z.string().min(1).max(200),
  descripcion: z.string().optional(),
  esImporteFijo: z.boolean(),
  importeFijo: z.number().optional(),
});

// ========================================
// GET /api/tipos-complemento
// ========================================
// Lista todos los tipos de complemento (solo activos por defecto)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo HR puede ver tipos de complemento
    if (!['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const incluirInactivos = searchParams.get('incluirInactivos') === 'true';

    const tipos = await prisma.tipoComplemento.findMany({
      where: {
        empresaId: session.user.empresaId,
        ...(incluirInactivos ? {} : { activo: true }),
      },
      orderBy: {
        nombre: 'asc',
      },
      include: {
        _count: {
          select: { empleadoComplementos: true },
        },
      },
    });

    return NextResponse.json({ tipos });
  } catch (error) {
    console.error('[GET /api/tipos-complemento] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener tipos de complemento' },
      { status: 500 }
    );
  }
}

// ========================================
// POST /api/tipos-complemento
// ========================================
// Crea un nuevo tipo de complemento
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo HR puede crear tipos
    if (!['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await req.json();
    const data = TipoComplementoSchema.parse(body);

    // Validación: Si es importe fijo, debe tener importeFijo
    if (data.esImporteFijo && !data.importeFijo) {
      return NextResponse.json(
        { error: 'Debe especificar el importe fijo' },
        { status: 400 }
      );
    }

    const tipoComplemento = await prisma.tipoComplemento.create({
      data: {
        empresaId: session.user.empresaId,
        nombre: data.nombre,
        descripcion: data.descripcion || null,
        esImporteFijo: data.esImporteFijo,
        importeFijo: data.importeFijo || null,
      },
    });

    return NextResponse.json({ tipoComplemento }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }

    console.error('[POST /api/tipos-complemento] Error:', error);
    return NextResponse.json(
      { error: 'Error al crear tipo de complemento' },
      { status: 500 }
    );
  }
}
