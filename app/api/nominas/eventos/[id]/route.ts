// ========================================
// API: Evento de Nómina Individual
// ========================================
// Gestionar un evento específico (actualizar estado, exportar, etc.)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import {
  EVENTO_ESTADOS,
  NOMINA_ESTADOS,
} from '@/lib/constants/nomina-estados';
import { prisma } from '@/lib/prisma';
import { getJsonBody } from '@/lib/utils/json';

const UpdateEventoSchema = z.object({
  estado: z.enum([EVENTO_ESTADOS.ABIERTO, EVENTO_ESTADOS.CERRADO]).optional(),
  fechaExportacion: z.string().datetime().optional(),
  fechaLimiteComplementos: z.string().datetime().optional(),
});

// ========================================
// GET /api/nominas/eventos/[id]
// ========================================
// Obtiene detalles de un evento específico
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    if (!['hr_admin', 'platform_admin', 'manager'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const evento = await prisma.eventos_nomina.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        nominas: {
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                email: true,
                fotoUrl: true,
              },
            },
            complementosAsignados: {
              include: {
                empleado_complementos: {
                  include: {
                    tipos_complemento: true,
                  },
                },
              },
            },
            alertas: {
              where: {
                resuelta: false,
              },
              orderBy: [
                { tipo: 'asc' }, // crítico primero
                { createdAt: 'desc' },
              ],
            },
          },
          orderBy: [
            { empleado: { apellidos: 'asc' } },
            { empleado: { nombre: 'asc' } },
          ],
        },
        _count: {
          select: { notificaciones: true },
        },
      },
    });

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    // Calcular estadísticas agregadas
    const stats = {
      totalNominas: evento.nominas.length,
      nominasConAlertas: evento.nominas.filter((n) => n.alertas.length > 0).length,
      nominasConComplementosPendientes: evento.nominas.filter((n) => n.complementosPendientes).length,
      alertasCriticas: evento.nominas.reduce((sum, n) => sum + n.alertas.filter((a) => a.tipo === 'critico').length, 0),
      alertasAdvertencias: evento.nominas.reduce((sum, n) => sum + n.alertas.filter((a) => a.tipo === 'advertencia').length, 0),
      alertasInformativas: evento.nominas.reduce((sum, n) => sum + n.alertas.filter((a) => a.tipo === 'info').length, 0),
    };

    return NextResponse.json({ evento, stats });
  } catch (error) {
    console.error('[GET /api/nominas/eventos/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener evento' },
      { status: 500 }
    );
  }
}

// ========================================
// PATCH /api/nominas/eventos/[id]
// ========================================
// Actualiza el estado de un evento
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const payload = await getJsonBody<Record<string, unknown>>(req);
    const data = UpdateEventoSchema.parse(payload);

    // Verificar que el evento pertenece a la empresa
    const evento = await prisma.eventos_nomina.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    // Validaciones de transiciones de estado
    if (data.estado && data.estado !== evento.estado) {
      if (data.estado === EVENTO_ESTADOS.CERRADO) {
        const pendientes = await prisma.nominas.count({
          where: {
            eventoNominaId: id,
            estado: {
              not: NOMINA_ESTADOS.PUBLICADA,
            },
          },
        });

        if (pendientes > 0) {
          return NextResponse.json(
            {
              error:
                'No se puede cerrar el evento porque aún hay nóminas sin publicar',
            },
            { status: 400 }
          );
        }
      }
    }

    const updated = await prisma.eventos_nomina.update({
      where: { id },
      data: {
        ...(data.estado && { estado: data.estado }),
        ...(data.fechaExportacion && { fechaExportacion: new Date(data.fechaExportacion) }),
        ...(data.fechaLimiteComplementos && {
          fechaLimiteComplementos: new Date(data.fechaLimiteComplementos)
        }),
      },
    });

    return NextResponse.json({ evento: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[PATCH /api/nominas/eventos/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar evento' },
      { status: 500 }
    );
  }
}
