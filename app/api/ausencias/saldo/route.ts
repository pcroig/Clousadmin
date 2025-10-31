// ========================================
// API Ausencias - Gestión de Saldo
// ========================================
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const saldoSchema = z.object({
  nivel: z.enum(['empresa', 'equipo']),
  equipoIds: z.array(z.string().uuid()).optional(),
  diasTotales: z.number().int().min(0).max(365),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { nivel, equipoIds, diasTotales } = saldoSchema.parse(body);

    const añoActual = new Date().getFullYear();
    let empleadosIds: string[] = [];

    // Determinar empleados afectados
    if (nivel === 'empresa') {
      const empleados = await prisma.empleado.findMany({
        where: { empresaId: session.user.empresaId, activo: true },
        select: { id: true },
      });
      empleadosIds = empleados.map((e) => e.id);
    } else if (nivel === 'equipo' && equipoIds && equipoIds.length > 0) {
      const miembros = await prisma.empleadoEquipo.findMany({
        where: { equipoId: { in: equipoIds } },
        select: { empleadoId: true },
      });
      empleadosIds = [...new Set(miembros.map((m) => m.empleadoId))];
    } else {
      return NextResponse.json({ error: 'Debe especificar equipos' }, { status: 400 });
    }

    // Upsert saldo para cada empleado
    // Si es por equipos, permitir múltiples saldos (uno por equipo)
    const promises = empleadosIds.flatMap(async (empleadoId) => {
      if (nivel === 'equipo' && equipoIds && equipoIds.length > 0) {
        // Crear un saldo por cada equipo seleccionado
        return Promise.all(equipoIds.map(async (equipoId) => {
          const existing = await prisma.empleadoSaldoAusencias.findFirst({
            where: { empleadoId, equipoId, año: añoActual },
          });

          if (existing) {
            return prisma.empleadoSaldoAusencias.update({
              where: { id: existing.id },
              data: { diasTotales },
            });
          } else {
            return prisma.empleadoSaldoAusencias.create({
              data: {
                empleadoId,
                empresaId: session.user.empresaId,
                equipoId,
                año: añoActual,
                diasTotales,
                diasUsados: 0,
                diasPendientes: 0,
                origen: 'manual_hr',
              },
            });
          }
        }));
      } else {
        // Saldo general (equipoId = null)
        const existing = await prisma.empleadoSaldoAusencias.findFirst({
          where: { empleadoId, equipoId: null, año: añoActual },
        });

        if (existing) {
          return [
            prisma.empleadoSaldoAusencias.update({
              where: { id: existing.id },
              data: { diasTotales },
            }),
          ];
        } else {
          return [
            prisma.empleadoSaldoAusencias.create({
              data: {
                empleadoId,
                empresaId: session.user.empresaId,
                equipoId: null,
                año: añoActual,
                diasTotales,
                diasUsados: 0,
                diasPendientes: 0,
                origen: 'manual_hr',
              },
            }),
          ];
        }
      }
    });

    await Promise.all(promises);

    return NextResponse.json({
      success: true,
      empleadosActualizados: empleadosIds.length,
      año: añoActual,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.issues }, { status: 400 });
    }
    console.error('[API POST Ausencias Saldo]', error);
    return NextResponse.json({ error: 'Error al actualizar saldo' }, { status: 500 });
  }
}

