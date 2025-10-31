// ========================================
// API Campañas de Vacaciones
// ========================================
// Crear y listar campañas de vacaciones por equipo

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const campaniaCreateSchema = z.object({
  equipoId: z.string().uuid(),
  nombre: z.string().min(1).max(200),
  año: z.number().int().min(2024).max(2030),
  fechaInicio: z.string(), // ISO date
  fechaFin: z.string(), // ISO date
  diasRespuesta: z.number().int().min(1).max(30).default(7),
});

// GET: Listar campañas (filtros: equipo, estado)
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'manager'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const equipoId = searchParams.get('equipoId');
    const estado = searchParams.get('estado');

    const where: any = {
      empresaId: session.user.empresaId,
    };

    if (equipoId) {
      where.equipoId = equipoId;
    }

    if (estado) {
      where.estado = estado;
    }

    // Si es manager, solo ver campañas de sus equipos
    if (session.user.rol === 'manager' && session.user.empleadoId) {
      const equiposGestionados = await prisma.equipo.findMany({
        where: {
          managerId: session.user.empleadoId,
          empresaId: session.user.empresaId,
        },
        select: { id: true },
      });

      where.equipoId = {
        in: equiposGestionados.map((e) => e.id),
      };
    }

    const campanias = await prisma.campaniaVacaciones.findMany({
      where,
      include: {
        equipo: {
          select: {
            id: true,
            nombre: true,
            miembros: {
              select: {
                empleadoId: true,
              },
            },
          },
        },
        respuestas: {
          select: {
            id: true,
            empleadoId: true,
            respondido: true,
            fechaRespuesta: true,
          },
        },
        ausencias: {
          select: {
            id: true,
            empleadoId: true,
            fechaInicio: true,
            fechaFin: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Añadir estadísticas
    const campanasConEstadisticas = campanias.map((c) => ({
      ...c,
      totalEmpleados: c.equipo.miembros.length,
      totalRespuestas: c.respuestas.length,
      respondidos: c.respuestas.filter((r) => r.respondido).length,
      pendientes: c.respuestas.filter((r) => !r.respondido).length,
      totalAusenciasAsignadas: c.ausencias.length,
    }));

    return NextResponse.json(campanasConEstadisticas);
  } catch (error) {
    console.error('[API GET Campañas Vacaciones]', error);
    return NextResponse.json({ error: 'Error al listar campañas' }, { status: 500 });
  }
}

// POST: Crear nueva campaña
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'manager'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = campaniaCreateSchema.parse(body);

    // Validar que el equipo exista y pertenezca a la empresa
    const equipo = await prisma.equipo.findFirst({
      where: {
        id: validatedData.equipoId,
        empresaId: session.user.empresaId,
      },
      include: {
        miembros: {
          include: {
            empleado: {
              select: {
                id: true,
                usuarioId: true,
              },
            },
          },
        },
      },
    });

    if (!equipo) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    // Si es manager, validar que sea su equipo
    if (session.user.rol === 'manager') {
      if (equipo.managerId !== session.user.empleadoId) {
        return NextResponse.json(
          { error: 'Solo puedes crear campañas para tus equipos' },
          { status: 403 }
        );
      }
    }

    // Crear campaña
    const campania = await prisma.campaniaVacaciones.create({
      data: {
        empresaId: session.user.empresaId,
        equipoId: validatedData.equipoId,
        nombre: validatedData.nombre,
        año: validatedData.año,
        fechaInicio: new Date(validatedData.fechaInicio),
        fechaFin: new Date(validatedData.fechaFin),
        diasRespuesta: validatedData.diasRespuesta,
        creadaPor: session.user.id,
      },
      include: {
        equipo: {
          select: {
            nombre: true,
          },
        },
      },
    });

    // Crear respuestas vacías para cada miembro del equipo
    const respuestas = await Promise.all(
      equipo.miembros.map((miembro) =>
        prisma.respuestaCampania.create({
          data: {
            campaniaId: campania.id,
            empleadoId: miembro.empleadoId,
            respondido: false,
          },
        })
      )
    );

    // Crear notificaciones para todos los empleados del equipo
    await Promise.all(
      equipo.miembros.map((miembro) =>
        prisma.notificacion.create({
          data: {
            usuarioId: miembro.empleado.usuarioId,
            tipo: 'campania_vacaciones',
            titulo: 'Nueva campaña de vacaciones',
            mensaje: `Tu equipo está planificando vacaciones: ${campania.nombre}. Tienes ${campania.diasRespuesta} días para indicar tus preferencias.`,
            metadata: {
              campaniaId: campania.id,
              equipoId: equipo.id,
              equipoNombre: equipo.nombre,
            } as any,
          },
        })
      )
    );

    console.log(
      `[API POST Campañas Vacaciones] Campaña creada: ${campania.id}, ${respuestas.length} respuestas inicializadas`
    );

    return NextResponse.json({
      ...campania,
      totalEmpleados: equipo.miembros.length,
      totalRespuestas: respuestas.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('[API POST Campañas Vacaciones]', error);
    return NextResponse.json({ error: 'Error al crear campaña' }, { status: 500 });
  }
}

