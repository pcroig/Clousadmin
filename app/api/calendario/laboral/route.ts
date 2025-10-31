// ========================================
// API Calendario Laboral - Obtener días no laborables
// ========================================
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const año = parseInt(searchParams.get('año') || new Date().getFullYear().toString());

    // Obtener festivos de la empresa
    const festivos = await prisma.festivo.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
        fecha: {
          gte: new Date(año, 0, 1),
          lte: new Date(año, 11, 31),
        },
      },
      orderBy: { fecha: 'asc' },
    });

    // Agrupar por origen
    const festivosNacionales = festivos.filter((f) => f.tipo === 'nacional');
    const festivosEmpresa = festivos.filter((f) => f.tipo === 'empresa');
    const festivosAutonomicos = festivos.filter((f) => f.tipo === 'autonomico');
    const festivosLocales = festivos.filter((f) => f.tipo === 'local');

    return NextResponse.json({
      año,
      diasNoLaborables: festivos.map((f) => ({
        fecha: f.fecha.toISOString().split('T')[0],
        nombre: f.nombre,
        tipo: f.tipo,
        origen: f.origen,
      })),
      resumen: {
        nacional: festivosNacionales.length,
        autonomico: festivosAutonomicos.length,
        local: festivosLocales.length,
        empresa: festivosEmpresa.length,
        total: festivos.length,
      },
    });
  } catch (error) {
    console.error('[API GET Calendario Laboral]', error);
    return NextResponse.json({ error: 'Error al obtener calendario' }, { status: 500 });
  }
}

