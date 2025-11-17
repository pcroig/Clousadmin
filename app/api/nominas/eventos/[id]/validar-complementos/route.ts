// ========================================
// API: Validar Complementos Masivamente
// ========================================
// Permite validar o rechazar complementos de empleados de un evento

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const ValidarComplementosSchema = z.object({
  complementoIds: z.array(z.string()),
  accion: z.enum(['validar', 'rechazar']),
  motivoRechazo: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: eventoId } = await params;

    // Verificar que el evento existe y pertenece a la empresa
    const evento = await prisma.eventoNomina.findFirst({
      where: {
        id: eventoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const data = ValidarComplementosSchema.parse(body);

    // Para managers, verificar que solo estén validando complementos de su equipo
    if (session.user.rol === 'manager') {
      // Obtener empleados del manager
      const empleadosManager = await prisma.empleado.findMany({
        where: {
          empresaId: session.user.empresaId,
          equipos: {
            some: {
              equipo: {
                managerId: session.user.id,
              },
            },
          },
        },
        select: { id: true },
      });

      const empleadoIds = empleadosManager.map((e) => e.id);

      // Verificar que todos los complementos pertenecen a empleados del manager
      const complementos = await prisma.empleadoComplemento.findMany({
        where: {
          id: { in: data.complementoIds },
        },
        select: { empleadoId: true },
      });

      const todosSonDelManager = complementos.every((c) =>
        empleadoIds.includes(c.empleadoId)
      );

      if (!todosSonDelManager) {
        return NextResponse.json(
          { error: 'No tienes permiso para validar complementos de estos empleados' },
          { status: 403 }
        );
      }
    } else if (!['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Realizar la validación o rechazo
    if (data.accion === 'validar') {
      await prisma.empleadoComplemento.updateMany({
        where: {
          id: { in: data.complementoIds },
        },
        data: {
          validado: true,
          rechazado: false,
          validadoPor: session.user.id,
          fechaValidacion: new Date(),
          motivoRechazo: null,
        },
      });
    } else {
      if (!data.motivoRechazo) {
        return NextResponse.json(
          { error: 'Debe proporcionar un motivo de rechazo' },
          { status: 400 }
        );
      }

      await prisma.empleadoComplemento.updateMany({
        where: {
          id: { in: data.complementoIds },
        },
        data: {
          validado: false,
          rechazado: true,
          validadoPor: session.user.id,
          fechaValidacion: new Date(),
          motivoRechazo: data.motivoRechazo,
        },
      });
    }

    return NextResponse.json({
      success: true,
      complementosActualizados: data.complementoIds.length,
      accion: data.accion,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[POST /api/nominas/eventos/[id]/validar-complementos] Error:', error);
    return NextResponse.json(
      { error: 'Error al validar complementos' },
      { status: 500 }
    );
  }
}

