// ========================================
// API: Compensar Horas Extra Masivamente
// ========================================
// Permite compensar horas extra de múltiples empleados de un evento

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';
import { calcularBalanceMensual } from '@/lib/calculos/balance-horas';

const CompensarHorasMasivoSchema = z.object({
  empleadoIds: z.array(z.string()),
  tipoCompensacion: z.enum(['ausencia', 'nomina']),
  horasPorEmpleado: z.record(z.string(), z.number()).optional(), // { empleadoId: horas }
  usarTodasLasHoras: z.boolean().default(true),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id: eventoId } = await params;

    // Verificar que el evento existe y pertenece a la empresa
    const evento = await prisma.eventoNomina.findFirst({
      where: {
        id: eventoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const data = CompensarHorasMasivoSchema.parse(body);

    // Verificar que los empleados pertenecen a la empresa
    const empleados = await prisma.empleado.findMany({
      where: {
        id: { in: data.empleadoIds },
        empresaId: session.user.empresaId,
      },
      include: {
        saldosAusencias: {
          where: {
            anio: evento.anio,
          },
        },
        contratos: {
          where: {
            OR: [
              { fechaFin: null },
              { fechaFin: { gte: new Date(evento.anio, evento.mes - 1, 1) } },
            ],
            fechaInicio: { lte: new Date(evento.anio, evento.mes, 0) },
          },
          orderBy: { fechaInicio: 'desc' },
          take: 1,
        },
      },
    });

    if (empleados.length !== data.empleadoIds.length) {
      return NextResponse.json(
        { error: 'Algunos empleados no fueron encontrados' },
        { status: 404 }
      );
    }

    const compensacionesCreadas: string[] = [];
    const errores: Array<{ empleadoId: string; error: string }> = [];

    for (const empleado of empleados) {
      try {
        // Calcular balance del mes
        const balanceMensual = await calcularBalanceMensual(
          empleado.id,
          evento.mes,
          evento.anio
        );

        let horasACompensar: number;

        if (data.usarTodasLasHoras) {
          horasACompensar = balanceMensual.balanceTotal;
        } else {
          horasACompensar = data.horasPorEmpleado?.[empleado.id] || 0;
        }

        // Validar que haya horas positivas
        if (horasACompensar <= 0) {
          errores.push({
            empleadoId: empleado.id,
            error: 'No hay horas extra positivas para compensar',
          });
          continue;
        }

        // Validar que no exceda el balance
        if (horasACompensar > balanceMensual.balanceTotal) {
          errores.push({
            empleadoId: empleado.id,
            error: 'Las horas a compensar exceden el balance disponible',
          });
          continue;
        }

        // Crear compensación
        if (data.tipoCompensacion === 'ausencia') {
          // Convertir horas a días (8 horas = 1 día)
          const diasAusencia = new Decimal(horasACompensar).div(8);

          // Crear ausencia auto-aprobada
          const ausencia = await prisma.ausencia.create({
            data: {
              empleadoId: empleado.id,
              tipo: 'otro',
              estado: 'aprobada',
              fechaInicio: new Date(), // Placeholder - HR puede cambiar
              fechaFin: new Date(),
              diasSolicitados: diasAusencia.toNumber(),
              descripcion: `Compensación de ${horasACompensar.toFixed(2)} horas extra del mes ${evento.mes}/${evento.anio}`,
              descuentaSaldo: false, // Suma días, no resta
              aprobadoPor: session.user.id,
              fechaAprobacion: new Date(),
            },
          });

          // Actualizar saldo de ausencias
          const saldoExistente = empleado.saldosAusencias[0];

          if (saldoExistente) {
            await prisma.empleadoSaldoAusencias.update({
              where: { id: saldoExistente.id },
              data: {
                diasTotales: {
                  increment: diasAusencia.toNumber(),
                },
              },
            });
          } else {
            // Crear nuevo saldo
            await prisma.empleadoSaldoAusencias.create({
              data: {
                empleadoId: empleado.id,
                anio: evento.anio,
                diasTotales: diasAusencia.toNumber(),
                diasUsados: 0,
              },
            });
          }

          // Crear compensación
          await prisma.compensacionHoraExtra.create({
            data: {
              empresaId: session.user.empresaId,
              empleadoId: empleado.id,
              horasBalance: new Decimal(horasACompensar),
              tipoCompensacion: 'ausencia',
              estado: 'aprobada',
              diasAusencia: diasAusencia,
              ausenciaId: ausencia.id,
              aprobadoPor: session.user.id,
              aprobadoEn: new Date(),
            },
          });

          compensacionesCreadas.push(empleado.id);
        } else {
          // tipoCompensacion === 'nomina'
          // Crear compensación pendiente de asignar a nómina
          await prisma.compensacionHoraExtra.create({
            data: {
              empresaId: session.user.empresaId,
              empleadoId: empleado.id,
              horasBalance: new Decimal(horasACompensar),
              tipoCompensacion: 'nomina',
              estado: 'aprobada',
              aprobadoPor: session.user.id,
              aprobadoEn: new Date(),
            },
          });

          compensacionesCreadas.push(empleado.id);
        }
      } catch (error) {
        console.error(`Error compensando horas para empleado ${empleado.id}:`, error);
        errores.push({
          empleadoId: empleado.id,
          error: 'Error al procesar compensación',
        });
      }
    }

    return NextResponse.json({
      success: true,
      compensacionesCreadas: compensacionesCreadas.length,
      errores: errores.length,
      detalles: {
        compensaciones: compensacionesCreadas,
        errores,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[POST /api/nominas/eventos/[id]/compensar-horas-masivo] Error:', error);
    return NextResponse.json(
      { error: 'Error al compensar horas' },
      { status: 500 }
    );
  }
}

