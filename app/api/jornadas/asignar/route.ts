// ========================================
// API Jornadas - Asignación Masiva
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const asignacionSchema = z.object({
  jornadaId: z.string().uuid(),
  nivel: z.enum(['empresa', 'equipo', 'individual']),
  equipoIds: z.array(z.string().uuid()).optional(),
  empleadoIds: z.array(z.string().uuid()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar sesión y permisos
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // 2. Validar body
    const body = await req.json();
    const validatedData = asignacionSchema.parse(body);

    // 3. Verificar que la jornada existe y pertenece a la empresa
    const jornada = await prisma.jornada.findFirst({
      where: {
        id: validatedData.jornadaId,
        empresaId: session.user.empresaId,
      },
    });

    if (!jornada) {
      return NextResponse.json(
        { error: 'Jornada no encontrada' },
        { status: 404 }
      );
    }

    let empleadosActualizados = 0;

    // 4. Aplicar asignación según nivel
    switch (validatedData.nivel) {
      case 'empresa':
        // Asignar a todos los empleados de la empresa
        const resultEmpresa = await prisma.empleado.updateMany({
          where: {
            empresaId: session.user.empresaId,
            activo: true,
          },
          data: {
            jornadaId: validatedData.jornadaId,
          },
        });
        empleadosActualizados = resultEmpresa.count;
        break;

      case 'equipo':
        if (!validatedData.equipoIds || validatedData.equipoIds.length === 0) {
          return NextResponse.json(
            { error: 'Debes especificar al menos un equipo' },
            { status: 400 }
          );
        }

        // Obtener empleados de los equipos especificados
        const miembrosEquipos = await prisma.empleadoEquipo.findMany({
          where: {
            equipoId: { in: validatedData.equipoIds },
          },
          select: {
            empleadoId: true,
          },
        });

        const empleadoIdsEquipos = [...new Set(miembrosEquipos.map(m => m.empleadoId))];

        if (empleadoIdsEquipos.length > 0) {
          const resultEquipos = await prisma.empleado.updateMany({
            where: {
              id: { in: empleadoIdsEquipos },
              empresaId: session.user.empresaId,
              activo: true,
            },
            data: {
              jornadaId: validatedData.jornadaId,
            },
          });
          empleadosActualizados = resultEquipos.count;
        }
        break;

      case 'individual':
        if (!validatedData.empleadoIds || validatedData.empleadoIds.length === 0) {
          return NextResponse.json(
            { error: 'Debes especificar al menos un empleado' },
            { status: 400 }
          );
        }

        const resultIndividual = await prisma.empleado.updateMany({
          where: {
            id: { in: validatedData.empleadoIds },
            empresaId: session.user.empresaId,
            activo: true,
          },
          data: {
            jornadaId: validatedData.jornadaId,
          },
        });
        empleadosActualizados = resultIndividual.count;
        break;
    }

    return NextResponse.json({
      success: true,
      empleadosActualizados,
      jornada: {
        id: jornada.id,
        nombre: jornada.nombre,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[API POST Jornadas Asignar]', error);
    return NextResponse.json(
      { error: 'Error al asignar jornada' },
      { status: 500 }
    );
  }
}




