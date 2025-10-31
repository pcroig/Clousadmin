// ========================================
// API Políticas de Ausencias por Equipo
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const politicaSchema = z.object({
  maxSolapamientoPct: z.number().int().min(0).max(100),
  requiereAntelacionDias: z.number().int().min(0).max(365),
  permitirSolapamientoCompleto: z.boolean().optional().default(false),
});

// GET: Obtener política actual del equipo (o defaults)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'manager'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id: equipoId } = await params;

    // Verificar que el equipo pertenece a la empresa
    const equipo = await prisma.equipo.findFirst({
      where: {
        id: equipoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    // Si es manager, verificar que es su equipo
    if (session.user.rol === 'manager' && equipo.managerId !== session.user.empleadoId) {
      return NextResponse.json(
        { error: 'Solo puedes ver políticas de tus equipos' },
        { status: 403 }
      );
    }

    // Buscar política existente o devolver defaults
    const politica = await prisma.equipoPoliticaAusencias.findUnique({
      where: { equipoId },
    });

    if (politica) {
      return NextResponse.json({
        equipoId: politica.equipoId,
        maxSolapamientoPct: politica.maxSolapamientoPct,
        requiereAntelacionDias: politica.requiereAntelacionDias,
        permitirSolapamientoCompleto: politica.permitirSolapamientoCompleto,
      });
    }

    // Devolver defaults
    return NextResponse.json({
      equipoId,
      maxSolapamientoPct: 50,
      requiereAntelacionDias: 3,
      permitirSolapamientoCompleto: false,
    });
  } catch (error) {
    console.error('[API GET Política Ausencias]', error);
    return NextResponse.json({ error: 'Error al obtener política' }, { status: 500 });
  }
}

// POST/PATCH: Crear o actualizar política
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'manager'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id: equipoId } = await params;
    const body = await req.json();
    const validatedData = politicaSchema.parse(body);

    // Verificar que el equipo pertenece a la empresa
    const equipo = await prisma.equipo.findFirst({
      where: {
        id: equipoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    // Si es manager, verificar que es su equipo
    if (session.user.rol === 'manager' && equipo.managerId !== session.user.empleadoId) {
      return NextResponse.json(
        { error: 'Solo puedes editar políticas de tus equipos' },
        { status: 403 }
      );
    }

    // Upsert política
    const politica = await prisma.equipoPoliticaAusencias.upsert({
      where: { equipoId },
      update: {
        maxSolapamientoPct: validatedData.maxSolapamientoPct,
        requiereAntelacionDias: validatedData.requiereAntelacionDias,
        permitirSolapamientoCompleto: validatedData.permitirSolapamientoCompleto ?? false,
      },
      create: {
        equipoId,
        empresaId: session.user.empresaId,
        maxSolapamientoPct: validatedData.maxSolapamientoPct,
        requiereAntelacionDias: validatedData.requiereAntelacionDias,
        permitirSolapamientoCompleto: validatedData.permitirSolapamientoCompleto ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      politica: {
        equipoId: politica.equipoId,
        maxSolapamientoPct: politica.maxSolapamientoPct,
        requiereAntelacionDias: politica.requiereAntelacionDias,
        permitirSolapamientoCompleto: politica.permitirSolapamientoCompleto,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[API POST Política Ausencias]', error);
    return NextResponse.json({ error: 'Error al guardar política' }, { status: 500 });
  }
}

