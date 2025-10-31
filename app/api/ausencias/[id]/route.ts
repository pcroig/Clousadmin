// ========================================
// API Route: Ausencias [ID]
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { actualizarSaldo, calcularDias } from '@/lib/calculos/ausencias';
import { z } from 'zod';

const ausenciaEditSchema = z.object({
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  tipo: z.enum(['vacaciones', 'enfermedad', 'enfermedad_familiar', 'maternidad_paternidad', 'otro']).optional(),
  descripcion: z.string().optional(),
  motivo: z.string().optional(),
  medioDia: z.boolean().optional(),
});

async function editarAusencia(
  req: NextRequest,
  id: string,
  session: any,
  camposEdicion: any
) {
  try {
    // Validar que la ausencia existe
    const ausencia = await prisma.ausencia.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!ausencia) {
      return NextResponse.json(
        { error: 'Ausencia no encontrada' },
        { status: 404 }
      );
    }

    // Verificar permisos: solo HR puede editar, o empleado su propia ausencia pendiente
    if (session.user.rol === 'empleado') {
      if (ausencia.empleadoId !== session.user.empleadoId) {
        return NextResponse.json({ error: 'Solo puedes editar tus propias ausencias' }, { status: 403 });
      }
      if (ausencia.estado !== 'pendiente_aprobacion') {
        return NextResponse.json(
          { error: 'Solo puedes editar ausencias pendientes de aprobación' },
          { status: 400 }
        );
      }
    }

    // Validar datos
    const validatedData = ausenciaEditSchema.parse(camposEdicion);

    // Preparar datos de actualización
    const updateData: any = {};
    
    if (validatedData.fechaInicio) {
      updateData.fechaInicio = new Date(validatedData.fechaInicio);
    }
    if (validatedData.fechaFin) {
      updateData.fechaFin = new Date(validatedData.fechaFin);
    }
    if (validatedData.tipo) {
      updateData.tipo = validatedData.tipo;
    }
    if (validatedData.descripcion !== undefined) {
      updateData.descripcion = validatedData.descripcion;
    }
    if (validatedData.motivo !== undefined) {
      updateData.motivo = validatedData.motivo;
    }
    if (validatedData.medioDia !== undefined) {
      updateData.medioDia = validatedData.medioDia;
    }

    // Si se cambiaron fechas, recalcular días
    if (updateData.fechaInicio || updateData.fechaFin) {
      const fechaInicio = updateData.fechaInicio || ausencia.fechaInicio;
      const fechaFin = updateData.fechaFin || ausencia.fechaFin;
      
      const calculos = await calcularDias(fechaInicio, fechaFin, ausencia.empresaId);
      
      updateData.diasNaturales = calculos.diasNaturales;
      updateData.diasLaborables = calculos.diasLaborables;
      updateData.diasSolicitados = calculos.diasSolicitados;
    }

    // Actualizar ausencia
    const updatedAusencia = await prisma.ausencia.update({
      where: { id },
      data: updateData,
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(updatedAusencia);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[editarAusencia]', error);
    return NextResponse.json(
      { error: 'Error al editar ausencia' },
      { status: 500 }
    );
  }
}

// PATCH /api/ausencias/[id] - Aprobar, Rechazar o Editar ausencia
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Await params in Next.js 15+
    const { id } = await params;

    const body = await req.json();
    const { accion, motivoRechazo, ...camposEdicion } = body;

    // Si hay campos de edición (fechaInicio, fechaFin, tipo, etc.), procesar edición
    if (camposEdicion.fechaInicio || camposEdicion.fechaFin || camposEdicion.tipo || camposEdicion.descripcion) {
      return await editarAusencia(req, id, session, camposEdicion);
    }

    // Si hay acción (aprobar/rechazar), procesar aprobación
    if (accion) {
      if (!['hr_admin', 'manager'].includes(session.user.rol)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      if (!['aprobar', 'rechazar'].includes(accion)) {
        return NextResponse.json(
          { error: 'Acción inválida' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Debe proporcionar acción (aprobar/rechazar) o campos para editar' },
        { status: 400 }
      );
    }

    // Verificar que la ausencia existe y es de la misma empresa
    const ausencia = await prisma.ausencia.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      }
    });

    if (!ausencia) {
      return NextResponse.json(
        { error: 'Ausencia no encontrada' },
        { status: 404 }
      );
    }

    // Determinar nuevo estado según el estado actual y la acción
    let nuevoEstado = ausencia.estado;
    if (accion === 'aprobar') {
      // Si la fecha ya empezó, estado 'en_curso', si no, 'en_curso' también (se cambiará a completada automáticamente cuando pase)
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      nuevoEstado = ausencia.fechaInicio <= hoy ? 'en_curso' : 'en_curso';
    } else if (accion === 'rechazar') {
      nuevoEstado = 'rechazada';
    }

    // Actualizar ausencia
    const updatedAusencia = await prisma.ausencia.update({
      where: { id },
      data: {
        estado: nuevoEstado,
        aprobadaPor: session.user.id,
        aprobadaEn: new Date(),
        ...(accion === 'rechazar' && { motivoRechazo }),
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
            email: true,
          }
        }
      }
    });

    // Actualizar saldo si la ausencia descuenta saldo
    if (ausencia.descuentaSaldo) {
      const año = ausencia.fechaInicio.getFullYear();
      const diasSolicitados = Number(ausencia.diasSolicitados);
      
      if (accion === 'aprobar') {
        // Mover días de pendientes a usados
        await actualizarSaldo(
          ausencia.empleadoId,
          año,
          'aprobar',
          diasSolicitados
        );
      } else {
        // Devolver días pendientes
        await actualizarSaldo(
          ausencia.empleadoId,
          año,
          'rechazar',
          diasSolicitados
        );
      }
    }

    // TODO: Crear notificación para empleado

    return NextResponse.json(updatedAusencia);
  } catch (error) {
    console.error('Error updating ausencia:', error);
    return NextResponse.json(
      { error: 'Error al actualizar ausencia' },
      { status: 500 }
    );
  }
}

// DELETE /api/ausencias/[id] - Cancelar ausencia (solo empleado)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session || !session.user.empleadoId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Await params in Next.js 15+
    const { id } = await params;

    // Verificar que la ausencia es del empleado y está pendiente de aprobación
    const ausencia = await prisma.ausencia.findFirst({
      where: {
        id,
        empleadoId: session.user.empleadoId,
        estado: 'pendiente_aprobacion',
      }
    });

    if (!ausencia) {
      return NextResponse.json(
        { error: 'Ausencia no encontrada o no se puede cancelar' },
        { status: 404 }
      );
    }

    // Actualizar saldo si la ausencia descuentaba saldo
    if (ausencia.descuentaSaldo) {
      const año = ausencia.fechaInicio.getFullYear();
      const diasSolicitados = Number(ausencia.diasSolicitados);
      
      // Devolver días pendientes
      await actualizarSaldo(
        ausencia.empleadoId,
        año,
        'cancelar',
        diasSolicitados
      );
    }

    // Eliminar ausencia
    await prisma.ausencia.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ausencia:', error);
    return NextResponse.json(
      { error: 'Error al cancelar ausencia' },
      { status: 500 }
    );
  }
}

