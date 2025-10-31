// ========================================
// API Jornadas Asignar - POST
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const asignarSchema = z.object({
  empleadoIds: z.array(z.string().uuid()).optional(),
  equipoId: z.string().uuid().optional(),
  aplicarATodos: z.boolean().optional(),
});

interface Params {
  id: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id: jornadaId } = await params;
    const body = await req.json();
    const { empleadoIds, equipoId, aplicarATodos } = asignarSchema.parse(body);

    // Verificar que la jornada existe y pertenece a la empresa
    const jornada = await prisma.jornada.findUnique({
      where: {
        id: jornadaId,
        empresaId: session.user.empresaId,
      },
    });

    if (!jornada) {
      return NextResponse.json({ error: 'Jornada no encontrada' }, { status: 404 });
    }

    let empleadosActualizados = 0;

    if (aplicarATodos) {
      // Aplicar a todos los empleados de la empresa
      const result = await prisma.empleado.updateMany({
        where: {
          empresaId: session.user.empresaId,
          activo: true,
        },
        data: {
          jornadaId: jornadaId,
        },
      });
      empleadosActualizados = result.count;
    } else if (equipoId) {
      // Aplicar a todos los empleados de un equipo
      const result = await prisma.empleado.updateMany({
        where: {
          empresaId: session.user.empresaId,
          equipos: {
            some: {
              equipoId: equipoId,
            },
          },
          activo: true,
        },
        data: {
          jornadaId: jornadaId,
        },
      });
      empleadosActualizados = result.count;
    } else if (empleadoIds && empleadoIds.length > 0) {
      // Aplicar a empleados específicos
      const result = await prisma.empleado.updateMany({
        where: {
          id: {
            in: empleadoIds,
          },
          empresaId: session.user.empresaId,
        },
        data: {
          jornadaId: jornadaId,
        },
      });
      empleadosActualizados = result.count;
    } else {
      return NextResponse.json(
        { error: 'Debe especificar empleados, equipo o aplicar a todos' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      empleadosActualizados,
      mensaje: `Jornada asignada a ${empleadosActualizados} empleado(s)`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[API POST Asignar Jornada]', error);
    return NextResponse.json({ error: 'Error al asignar jornada' }, { status: 500 });
  }
}

