// ========================================
// API Responder a Campaña de Vacaciones
// ========================================
// Empleado envía sus preferencias de fechas

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const responderSchema = z.object({
  diasIdeales: z.array(z.string()).optional(), // Array de fechas ISO: ["2025-08-10", ...]
  diasPrioritarios: z.array(z.string()).optional(),
  diasAlternativos: z.array(z.string()).optional(),
});

// POST: Empleado envía sus preferencias
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.user.empleadoId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id: campaniaId } = await params;
    const body = await req.json();
    const validatedData = responderSchema.parse(body);

    // Verificar que la campaña existe y está abierta
    const campania = await prisma.campaniaVacaciones.findFirst({
      where: {
        id: campaniaId,
        estado: 'abierta',
      },
      include: {
        equipo: {
          include: {
            miembros: {
              where: {
                empleadoId: session.user.empleadoId,
              },
            },
          },
        },
      },
    });

    if (!campania) {
      return NextResponse.json({ error: 'Campaña no encontrada o cerrada' }, { status: 404 });
    }

    // Verificar que el empleado pertenece al equipo
    if (campania.equipo.miembros.length === 0) {
      return NextResponse.json(
        { error: 'No perteneces al equipo de esta campaña' },
        { status: 403 }
      );
    }

    // Verificar límite de días de respuesta
    const limiteRespuesta = new Date(campania.creadaEn);
    limiteRespuesta.setDate(limiteRespuesta.getDate() + campania.diasRespuesta);

    if (new Date() > limiteRespuesta) {
      return NextResponse.json(
        { error: 'El plazo para responder ha expirado' },
        { status: 400 }
      );
    }

    // Upsert respuesta
    const respuesta = await prisma.respuestaCampania.upsert({
      where: {
        campaniaId_empleadoId: {
          campaniaId,
          empleadoId: session.user.empleadoId,
        },
      },
      update: {
        respondido: true,
        fechaRespuesta: new Date(),
        diasIdeales: validatedData.diasIdeales || null,
        diasPrioritarios: validatedData.diasPrioritarios || null,
        diasAlternativos: validatedData.diasAlternativos || null,
      },
      create: {
        campaniaId,
        empleadoId: session.user.empleadoId,
        respondido: true,
        fechaRespuesta: new Date(),
        diasIdeales: validatedData.diasIdeales || null,
        diasPrioritarios: validatedData.diasPrioritarios || null,
        diasAlternativos: validatedData.diasAlternativos || null,
      },
    });

    // Actualizar ausencia si existe (para mantener sincronizado)
    await prisma.ausencia.updateMany({
      where: {
        empleadoId: session.user.empleadoId,
        campaniaId,
      },
      data: {
        respuestaPreferencias: new Date(),
        diasIdeales: validatedData.diasIdeales || null,
        diasPrioritarios: validatedData.diasPrioritarios || null,
        diasAlternativos: validatedData.diasAlternativos || null,
      },
    });

    // Notificar a Manager/HR que un empleado ha respondido
    const usuariosNotificar = await prisma.usuario.findMany({
      where: {
        empresaId: session.user.empresaId,
        rol: { in: ['hr_admin', 'manager'] },
      },
      select: { id: true },
    });

    await Promise.all(
      usuariosNotificar.map((usr) =>
        prisma.notificacion.create({
          data: {
            usuarioId: usr.id,
            tipo: 'respuesta_empleado',
            titulo: 'Empleado ha respondido a campaña',
            mensaje: `${session.user.nombre} ${session.user.apellidos} ha enviado sus preferencias para la campaña "${campania.nombre}"`,
            metadata: {
              campaniaId,
              empleadoId: session.user.empleadoId,
              equipoId: campania.equipoId,
            } as any,
          },
        })
      )
    );

    // Verificar si todos han respondido y notificar
    const totalMiembros = campania.equipo.miembros.length;
    const totalRespuestas = await prisma.respuestaCampania.count({
      where: {
        campaniaId,
        respondido: true,
      },
    });

    if (totalRespuestas === totalMiembros) {
      // Notificar que todos han respondido
      await Promise.all(
        usuariosNotificar.map((usr) =>
          prisma.notificacion.create({
            data: {
              usuarioId: usr.id,
              tipo: 'campania_completa',
              titulo: 'Todos han respondido',
              mensaje: `Todos los empleados han respondido a la campaña "${campania.nombre}". Ya puedes planificar las vacaciones.`,
              metadata: {
                campaniaId,
                equipoId: campania.equipoId,
              } as any,
            },
          })
        )
      );
    }

    return NextResponse.json({
      success: true,
      respuesta: {
        ...respuesta,
        totalRespondidos: totalRespuestas,
        totalMiembros,
        todosHanRespondido: totalRespuestas === totalMiembros,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[API POST Responder Campaña]', error);
    return NextResponse.json({ error: 'Error al responder campaña' }, { status: 500 });
  }
}

