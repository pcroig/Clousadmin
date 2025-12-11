// ========================================
// API: Obtener Jornada Efectiva de un Empleado
// ========================================
// GET /api/empleados/[id]/jornada-efectiva
// Resuelve la jornada asignada considerando individual > equipo > empresa

import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { obtenerJornadaEmpleado } from '@/lib/jornadas/helpers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: empleadoId } = await params;

    // Obtener datos del empleado con sus equipos
    const empleado = await prisma.empleados.findUnique({
      where: { id: empleadoId },
      select: {
        id: true,
        jornadaId: true,
        equipos: {
          select: {
            equipoId: true,
            equipo: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    // Extraer IDs de equipos
    const equipoIds = empleado.equipos
      .map((eq) => eq.equipoId)
      .filter((id): id is string => Boolean(id));

    // Resolver jornada efectiva
    const jornadaInfo = await obtenerJornadaEmpleado({
      empleadoId: empleado.id,
      equipoIds,
      jornadaIdDirecta: empleado.jornadaId,
    });

    if (!jornadaInfo || !jornadaInfo.jornadaId) {
      return NextResponse.json(
        {
          jornadaId: null,
          origen: null,
          jornada: null,
        },
        { status: 200 }
      );
    }

    // Obtener datos completos de la jornada
    const jornada = await prisma.jornadas.findUnique({
      where: { id: jornadaInfo.jornadaId },
      select: {
        id: true,
        horasSemanales: true,
        config: true,
        activa: true,
      },
    });

    return NextResponse.json({
      jornadaId: jornadaInfo.jornadaId,
      origen: jornadaInfo.origen,
      equipoNombre: jornadaInfo.equipoNombre,
      jornada,
    });
  } catch (error) {
    console.error('[GET /api/empleados/[id]/jornada-efectiva] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener jornada del empleado' },
      { status: 500 }
    );
  }
}
