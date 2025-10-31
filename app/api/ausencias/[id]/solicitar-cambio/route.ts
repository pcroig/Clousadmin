// ========================================
// API Solicitar Cambio de Ausencia Asignada
// ========================================
// Empleado solicita cambio de fechas para ausencias asignadas por campaña

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { calcularDias } from '@/lib/calculos/ausencias';

const solicitudCambioSchema = z.object({
  nuevaFechaInicio: z.string(),
  nuevaFechaFin: z.string(),
  justificacion: z.string().min(10, 'La justificación debe tener al menos 10 caracteres'),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.user.empleadoId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id: ausenciaId } = await params;
    const body = await req.json();
    const validatedData = solicitudCambioSchema.parse(body);

    // Verificar que la ausencia existe y pertenece al empleado
    const ausencia = await prisma.ausencia.findFirst({
      where: {
        id: ausenciaId,
        empleadoId: session.user.empleadoId,
      },
      include: {
        campania: true,
      },
    });

    if (!ausencia) {
      return NextResponse.json({ error: 'Ausencia no encontrada' }, { status: 404 });
    }

    // Solo se puede solicitar cambio en ausencias asignadas por campaña
    if (!ausencia.campaniaId) {
      return NextResponse.json(
        { error: 'Solo se puede solicitar cambio en ausencias asignadas por campaña' },
        { status: 400 }
      );
    }

    // No se puede cambiar si ya está completada o rechazada
    if (['completada', 'rechazada'].includes(ausencia.estado)) {
      return NextResponse.json(
        { error: 'No se puede modificar una ausencia completada o rechazada' },
        { status: 400 }
      );
    }

    const nuevaFechaInicio = new Date(validatedData.nuevaFechaInicio);
    const nuevaFechaFin = new Date(validatedData.nuevaFechaFin);

    // Calcular días nuevos
    const calculos = await calcularDias(nuevaFechaInicio, nuevaFechaFin, ausencia.empresaId);

    // Crear solicitud de cambio
    const solicitudCambio = await prisma.solicitudCambio.create({
      data: {
        empresaId: ausencia.empresaId,
        empleadoId: session.user.empleadoId,
        tipo: 'cambio_vacaciones',
        descripcion: validatedData.justificacion,
        datosAnteriores: {
          ausenciaId: ausencia.id,
          fechaInicio: ausencia.fechaInicio,
          fechaFin: ausencia.fechaFin,
          diasSolicitados: ausencia.diasSolicitados,
        } as any,
        datosNuevos: {
          fechaInicio: nuevaFechaInicio,
          fechaFin: nuevaFechaFin,
          diasSolicitados: calculos.diasSolicitados,
        } as any,
        estado: 'pendiente_aprobacion',
      },
    });

    // Cambiar ausencia a pendiente de aprobación
    await prisma.ausencia.update({
      where: { id: ausenciaId },
      data: {
        estado: 'pendiente_aprobacion',
      },
    });

    // Notificar a HR/Manager
    const usuariosHR = await prisma.usuario.findMany({
      where: {
        empresaId: session.user.empresaId,
        rol: { in: ['hr_admin', 'manager'] },
      },
      select: { id: true },
    });

    await Promise.all(
      usuariosHR.map((usr) =>
        prisma.notificacion.create({
          data: {
            usuarioId: usr.id,
            tipo: 'solicitud_cambio_vacaciones',
            titulo: 'Solicitud de cambio de vacaciones',
            mensaje: `${session.user.nombre} ${session.user.apellidos} solicita cambiar fechas de vacaciones asignadas`,
            metadata: {
              solicitudId: solicitudCambio.id,
              ausenciaId: ausencia.id,
              empleadoId: session.user.empleadoId,
              fechasAnteriores: {
                inicio: ausencia.fechaInicio,
                fin: ausencia.fechaFin,
              },
              fechasNuevas: {
                inicio: nuevaFechaInicio,
                fin: nuevaFechaFin,
              },
            } as any,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      solicitudCambio: {
        id: solicitudCambio.id,
        estado: solicitudCambio.estado,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[API POST Solicitar Cambio]', error);
    return NextResponse.json({ error: 'Error al solicitar cambio' }, { status: 500 });
  }
}

