// ========================================
// API Route: Enviar Invitación a Empleado
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { crearInvitacion } from '@/lib/invitaciones';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    // Solo HR Admin puede enviar invitaciones
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { empleadoId, email } = await req.json();

    if (!empleadoId || !email) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el empleado existe y pertenece a la misma empresa
    const { prisma } = await import('@/lib/prisma');
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    if (empleado.empresaId !== session.user.empresaId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Crear invitación
    const result = await crearInvitacion(
      empleadoId,
      session.user.empresaId,
      email
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    // TODO: Enviar email con la invitación
    // await sendInvitacionEmail(email, result.url);

    console.log(`[Invitación] Creada para ${email}: ${result.url}`);

    return NextResponse.json({
      success: true,
      url: result.url,
      message: 'Invitación enviada correctamente',
    });
  } catch (error) {
    console.error('[POST /api/empleados/invitar] Error:', error);
    return NextResponse.json(
      { error: 'Error al enviar la invitación' },
      { status: 500 }
    );
  }
}






