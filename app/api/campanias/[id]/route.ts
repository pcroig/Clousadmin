// ========================================
// API Campaña de Vacaciones - Detalle
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Detalle de campaña con respuestas de empleados
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'manager'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id: campaniaId } = await params;

    const campania = await prisma.campaniaVacaciones.findFirst({
      where: {
        id: campaniaId,
        empresaId: session.user.empresaId,
      },
      include: {
        equipo: {
          select: {
            id: true,
            nombre: true,
            miembros: {
              include: {
                empleado: {
                  select: {
                    id: true,
                    nombre: true,
                    apellidos: true,
                    fotoUrl: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        respuestas: {
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                fotoUrl: true,
              },
            },
          },
          orderBy: {
            respondido: 'desc',
            fechaRespuesta: 'desc',
          },
        },
        ausencias: {
          select: {
            id: true,
            empleadoId: true,
            fechaInicio: true,
            fechaFin: true,
            diasSolicitados: true,
          },
        },
      },
    });

    if (!campania) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    // Si es manager, verificar que es su equipo
    if (session.user.rol === 'manager') {
      if (campania.equipo.miembros.length === 0 || campania.creadaPor !== session.user.id) {
        const esManagerEquipo = campania.equipo.miembros.some(
          (m) => m.equipo.managerId === session.user.empleadoId
        );
        if (!esManagerEquipo) {
          return NextResponse.json(
            { error: 'Solo puedes ver campañas de tus equipos' },
            { status: 403 }
          );
        }
      }
    }

    // Formatear datos para la UI
    const totalEmpleados = campania.equipo.miembros.length;
    const respuestasData = campania.equipo.miembros.map((miembro) => {
      const respuesta = campania.respuestas.find((r) => r.empleadoId === miembro.empleadoId);
      return {
        empleadoId: miembro.empleadoId,
        nombre: `${miembro.empleado.nombre} ${miembro.empleado.apellidos}`,
        fotoUrl: miembro.empleado.fotoUrl,
        respondido: respuesta?.respondido || false,
        fechaRespuesta: respuesta?.fechaRespuesta || null,
        diasIdeales: respuesta?.diasIdeales || null,
        diasPrioritarios: respuesta?.diasPrioritarios || null,
        diasAlternativos: respuesta?.diasAlternativos || null,
      };
    });

    return NextResponse.json({
      ...campania,
      totalEmpleados,
      respondidos: respuestasData.filter((r) => r.respondido).length,
      pendientes: respuestasData.filter((r) => !r.respondido).length,
      respuestas: respuestasData,
    });
  } catch (error) {
    console.error('[API GET Campaña Detalle]', error);
    return NextResponse.json({ error: 'Error al obtener campaña' }, { status: 500 });
  }
}

