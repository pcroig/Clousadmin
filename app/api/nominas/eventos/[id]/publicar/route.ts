// ========================================
// API: Publicar Nóminas
// ========================================
// Marca las nóminas como publicadas y notifica a los empleados

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  actualizarEstadosNominasLote,
  recalcularEstadisticasEvento,
} from '@/lib/calculos/sync-estados-nominas';

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
            estado: 'definitiva', // Solo publicar las que están en estado definitiva
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

    // Verificar que el evento está en estado definitiva
    if (evento.estado !== 'definitiva') {
      return NextResponse.json(
        {
          error: `No se pueden publicar nóminas en estado '${evento.estado}'. Debe estar en estado 'definitiva'.`,
        },
        { status: 400 }
      );
    }

    // Verificar que hay nóminas para publicar
    if (evento.nominas.length === 0) {
      return NextResponse.json(
        { error: 'No hay nóminas definitivas para publicar' },
        { status: 400 }
      );
    }

    // Verificar que todas las nóminas tienen documentos
    const nominasSinDocumento = evento.nominas.filter((n) => !n.documentoId);
    if (nominasSinDocumento.length > 0) {
      return NextResponse.json(
        {
          error: `${nominasSinDocumento.length} nóminas no tienen documento PDF asociado`,
          nominasSinDocumento: nominasSinDocumento.map((n) => ({
            empleado: `${n.empleado.nombre} ${n.empleado.apellidos}`,
            nominaId: n.id,
          })),
        },
        { status: 400 }
      );
    }

    // Obtener usuarios de los empleados para notificaciones
    const empleadosIds = evento.nominas.map((n) => n.empleadoId);
    const usuarios = await prisma.usuario.findMany({
      where: {
        empleadoId: { in: empleadosIds },
        activo: true,
      },
    });

    // Actualizar en transacción para garantizar atomicidad
    // Usar la función centralizadora para mantener sincronización
    const cantidadActualizada = await actualizarEstadosNominasLote(
      id,
      'publicada',
      {
        fechaPublicacion: new Date(),
        empleadoNotificado: true,
        fechaNotificacion: new Date(),
      }
    );

    // Crear notificaciones para los empleados
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

    // Recalcular estadísticas del evento
    await recalcularEstadisticasEvento(id);

    return NextResponse.json({
      nominasPublicadas: cantidadActualizada,
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
