// ========================================
// API: Publicar Nóminas
// ========================================
// Marca las nóminas como publicadas y notifica a los empleados

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  sincronizarEstadoEvento,
} from '@/lib/calculos/sync-estados-nominas';
import { NOMINA_ESTADOS, EVENTO_ESTADOS } from '@/lib/constants/nomina-estados';

// ========================================
// POST /api/nominas/eventos/[id]/publicar
// ========================================
// Publica las nóminas definitivas y notifica a los empleados
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Solo HR puede publicar nóminas
    if (!['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Verificar que el evento existe y pertenece a la empresa
    const evento = await prisma.eventoNomina.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        nominas: {
          where: {
            estado: {
              in: [NOMINA_ESTADOS.PENDIENTE, NOMINA_ESTADOS.COMPLETADA],
            },
          },
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                email: true,
              },
            },
            documento: true,
          },
        },
      },
    });

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    if (evento.estado === EVENTO_ESTADOS.CERRADO) {
      return NextResponse.json(
        { error: 'Este evento ya está cerrado' },
        { status: 400 }
      );
    }

    // Tomar nóminas que tengan documento (PDF importado)
    const nominasPublicables = evento.nominas.filter(
      (n) => n.documentoId
    );

    if (nominasPublicables.length === 0) {
      return NextResponse.json(
        { error: 'No hay nóminas con PDF listo para publicar' },
        { status: 400 }
      );
    }

    const empleadosIds = nominasPublicables.map((n) => n.empleadoId);
    const usuarios = await prisma.usuario.findMany({
      where: {
        empleadoId: { in: empleadosIds },
        activo: true,
      },
    });

    const ahora = new Date();

    await prisma.nomina.updateMany({
      where: {
        id: {
          in: nominasPublicables.map((n) => n.id),
        },
      },
      data: {
        estado: NOMINA_ESTADOS.PUBLICADA,
        fechaPublicacion: ahora,
        empleadoNotificado: true,
        fechaNotificacion: ahora,
      },
    });

    const notificaciones = await Promise.all(
      usuarios.map((usuario) =>
        prisma.notificacion.create({
          data: {
            usuarioId: usuario.id,
            tipo: 'nomina_publicada',
            titulo: `Nómina ${evento.mes}/${evento.anio} disponible`,
            mensaje: `Tu nómina de ${getNombreMes(evento.mes)} ${evento.anio} ya está disponible en tu carpeta de documentos.`,
            eventoNominaId: evento.id,
          },
        })
      )
    );

    await sincronizarEstadoEvento(id);

    return NextResponse.json({
      nominasPublicadas: nominasPublicables.length,
      empleadosNotificados: notificaciones.length,
      mes: evento.mes,
      anio: evento.anio,
    });
  } catch (error) {
    console.error('[POST /api/nominas/eventos/[id]/publicar] Error:', error);
    return NextResponse.json(
      { error: 'Error al publicar nóminas' },
      { status: 500 }
    );
  }
}

// Helper: Obtener nombre del mes en español
function getNombreMes(mes: number): string {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return meses[mes - 1] || 'Mes desconocido';
}
