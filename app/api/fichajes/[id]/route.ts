// ========================================
// API Fichajes [ID] - GET, PATCH, DELETE
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const fichajeApprovalSchema = z.object({
  accion: z.enum(['aprobar', 'rechazar']),
});

const fichajeEditSchema = z.object({
  tipo: z.enum(['entrada', 'pausa_inicio', 'pausa_fin', 'salida']).optional(),
  fecha: z.string().optional(),
  hora: z.string().optional(),
  motivoEdicion: z.string(),
});

interface Params {
  id: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const fichaje = await prisma.fichaje.findUnique({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
            puesto: true,
          },
        },
        eventos: {
          orderBy: {
            hora: 'asc',
          },
        },
      },
    });

    if (!fichaje) {
      return NextResponse.json({ error: 'Fichaje no encontrado' }, { status: 404 });
    }

    // Verificar permisos
    if (
      session.user.rol === 'empleado' &&
      fichaje.empleadoId !== session.user.empleadoId
    ) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    return NextResponse.json(fichaje);
  } catch (error) {
    console.error('[API GET Fichaje]', error);
    return NextResponse.json({ error: 'Error al obtener fichaje' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Obtener fichaje
    const fichaje = await prisma.fichaje.findUnique({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!fichaje) {
      return NextResponse.json({ error: 'Fichaje no encontrado' }, { status: 404 });
    }

    // Caso 1: Aprobar/Rechazar fichaje (solo HR/Manager)
    if (body.accion) {
      if (session.user.rol !== 'hr_admin' && session.user.rol !== 'manager') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }

      const validatedData = fichajeApprovalSchema.parse(body);

      if (validatedData.accion === 'aprobar') {
        const actualizado = await prisma.fichaje.update({
          where: { id },
          data: {
            estado: 'finalizado',
            fechaAprobacion: new Date(),
          },
        });

        return NextResponse.json(actualizado);
      } else if (validatedData.accion === 'rechazar') {
        const actualizado = await prisma.fichaje.update({
          where: { id },
          data: {
            estado: 'pendiente', // Rechazado pasa a pendiente
            fechaAprobacion: new Date(),
          },
        });

        return NextResponse.json(actualizado);
      }
    }

    // TODO: Implement edit functionality with new FichajeEvento schema

    return NextResponse.json({ error: 'Acción no especificada' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[API PATCH Fichaje]', error);
    return NextResponse.json({ error: 'Error al actualizar fichaje' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Solo HR puede eliminar fichajes
    if (session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.fichaje.delete({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API DELETE Fichaje]', error);
    return NextResponse.json({ error: 'Error al eliminar fichaje' }, { status: 500 });
  }
}

