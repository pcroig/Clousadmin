// ========================================
// API Actualizar Ausencias Masivo
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { actualizarSaldo } from '@/lib/calculos/ausencias';
import { z } from 'zod';

const actualizarMasivoSchema = z.object({
  ausenciasIds: z.array(z.string().uuid()),
  accion: z.enum(['aprobar', 'rechazar']),
  motivoRechazo: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar sesión y permisos
    const session = await getSession();
    if (!session || (session.user.rol !== 'hr_admin' && session.user.rol !== 'manager')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener información del empleado si es manager
    let empleadoManager = null;
    if (session.user.rol === 'manager' && session.user.empleadoId) {
      empleadoManager = await prisma.empleado.findUnique({
        where: { id: session.user.empleadoId },
        include: { equipos: { include: { equipo: true } } }
      });
    }

    // 2. Validar body
    const body = await req.json();
    const validatedData = actualizarMasivoSchema.parse(body);

    if (validatedData.accion === 'rechazar' && !validatedData.motivoRechazo) {
      return NextResponse.json(
        { error: 'El motivo de rechazo es obligatorio' },
        { status: 400 }
      );
    }

    // 3. Obtener todas las ausencias
    const ausencias = await prisma.ausencia.findMany({
      where: {
        id: { in: validatedData.ausenciasIds },
        empresaId: session.user.empresaId,
        estado: 'pendiente', // Solo ausencias pendientes
      },
      include: {
        empleado: true,
      },
    });

    if (ausencias.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron ausencias pendientes' },
        { status: 404 }
      );
    }

    // 4. Procesar en lote
    const resultados = {
      exitosas: 0,
      fallidas: 0,
      errores: [] as string[],
    };

    for (const ausencia of ausencias) {
      try {
        // Verificar permisos si es manager (solo su equipo)
        if (session.user.rol === 'manager' && empleadoManager) {
          const equiposManager = empleadoManager.equipos.map(e => e.equipo.id);
          if (ausencia.equipoId && !equiposManager.includes(ausencia.equipoId)) {
            resultados.errores.push(
              `No tienes permiso para gestionar la ausencia de ${ausencia.empleado.nombre}`
            );
            resultados.fallidas++;
            continue;
          }
        }

        // Actualizar ausencia
        if (validatedData.accion === 'aprobar') {
          await prisma.ausencia.update({
            where: { id: ausencia.id },
            data: {
              estado: 'aprobada',
              aprobadaPor: session.user.id,
              aprobadaEn: new Date(),
            },
          });

          // Actualizar saldo: diasPendientes -> diasUsados
          if (ausencia.descuentaSaldo) {
            const año = new Date(ausencia.fechaInicio).getFullYear();
            await actualizarSaldo(
              ausencia.empleadoId,
              año,
              'aprobar',
              Number(ausencia.diasSolicitados)
            );
          }

          resultados.exitosas++;
        } else if (validatedData.accion === 'rechazar') {
          await prisma.ausencia.update({
            where: { id: ausencia.id },
            data: {
              estado: 'rechazada',
              aprobadaPor: session.user.id,
              aprobadaEn: new Date(),
              motivoRechazo: validatedData.motivoRechazo,
            },
          });

          // Actualizar saldo: diasPendientes -> liberar
          if (ausencia.descuentaSaldo) {
            const año = new Date(ausencia.fechaInicio).getFullYear();
            await actualizarSaldo(
              ausencia.empleadoId,
              año,
              'rechazar',
              Number(ausencia.diasSolicitados)
            );
          }

          resultados.exitosas++;
        }
      } catch (error) {
        console.error(`Error procesando ausencia ${ausencia.id}:`, error);
        resultados.errores.push(
          `Error al procesar ausencia de ${ausencia.empleado.nombre}`
        );
        resultados.fallidas++;
      }
    }

    // 5. Retornar resumen
    return NextResponse.json({
      success: true,
      mensaje: `Procesadas ${resultados.exitosas} ausencias correctamente`,
      resultados,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[API Actualizar Masivo Ausencias]', error);
    return NextResponse.json(
      { error: 'Error al procesar ausencias' },
      { status: 500 }
    );
  }
}

