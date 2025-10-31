// ========================================
// API Calendario Laboral - Configuración por defecto
// ========================================
// Gestiona el calendario laboral por defecto de la empresa (L-V por defecto)

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const calendarioUpdateSchema = z.object({
  diasLaborables: z.array(
    z.object({
      fecha: z.string(), // "YYYY-MM-DD"
      laborable: z.boolean(),
    })
  ),
});

// GET: Obtener calendario laboral por defecto
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: session.user.empresaId },
      select: { config: true },
    });

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const config = empresa.config as any;
    const diasLaborables = config?.calendarioLaboral?.diasLaborables || [];

    // Cargar festivos para excluirlos
    const festivos = await prisma.festivo.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
        tipo: { in: ['nacional', 'autonomico'] },
      },
      select: { fecha: true, nombre: true, tipo: true },
    });

    return NextResponse.json({
      diasLaborables,
      festivos: festivos.map((f) => ({
        fecha: f.fecha.toISOString().split('T')[0],
        nombre: f.nombre,
        tipo: f.tipo,
      })),
    });
  } catch (error) {
    console.error('[API GET Calendario Laboral Default]', error);
    return NextResponse.json({ error: 'Error al obtener calendario' }, { status: 500 });
  }
}

// POST: Actualizar calendario laboral por defecto
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { diasLaborables } = calendarioUpdateSchema.parse(body);

    // Obtener configuración actual
    const empresa = await prisma.empresa.findUnique({
      where: { id: session.user.empresaId },
      select: { config: true },
    });

    if (!empresa) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 });
    }

    const config = (empresa.config as any) || {};
    config.calendarioLaboral = {
      diasLaborables,
      actualizadoEn: new Date().toISOString(),
    };

    await prisma.empresa.update({
      where: { id: session.user.empresaId },
      data: { config },
    });

    return NextResponse.json({
      success: true,
      diasActualizados: diasLaborables.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    console.error('[API POST Calendario Laboral Default]', error);
    return NextResponse.json({ error: 'Error al actualizar calendario' }, { status: 500 });
  }
}

