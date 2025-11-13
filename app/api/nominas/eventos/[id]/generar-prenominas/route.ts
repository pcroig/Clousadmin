// ========================================
// API: Generar Pre-nóminas para un Evento
// ========================================
// Permite crear (o recalcular) las pre-nóminas de un evento ya existente

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import {
  recalcularEstadisticasEvento,
  sincronizarEstadoEvento,
} from '@/lib/calculos/sync-estados-nominas';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const HORAS_EXTRA_MULTIPLICADOR = new Decimal(1.5);
  const HORAS_MENSUALES_ESTIMADAS = new Decimal(160);

  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const evento = await prisma.eventoNomina.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        _count: { select: { nominas: true } },
      },
    });

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    if (!['generando', 'complementos_pendientes'].includes(evento.estado)) {
      return NextResponse.json(
        {
          error: `No se pueden generar pre-nóminas en estado '${evento.estado}'.`,
        },
        { status: 400 }
      );
    }

    if (evento._count.nominas > 0) {
      const stats = await prisma.nomina.aggregate({
        where: { eventoNominaId: id },
        _count: { _all: true },
      });

      await sincronizarEstadoEvento(id);

      return NextResponse.json({
        nominasGeneradas: 0,
        yaExistian: true,
        totalNominas: stats._count._all,
        message: 'Las pre-nóminas ya estaban generadas',
      });
    }

    // Obtener empleados activos y sus contratos vigentes
    const empleados = await prisma.empleado.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
      },
      include: {
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
        complementos: {
          where: { activo: true },
          include: { tipoComplemento: true },
        },
        ausencias: {
          where: {
            fechaInicio: { lte: new Date(evento.anio, evento.mes, 0) },
            fechaFin: { gte: new Date(evento.anio, evento.mes - 1, 1) },
          },
        },
      },
    });

    if (empleados.length === 0) {
      return NextResponse.json(
        {
          error: 'No hay empleados activos para generar pre-nóminas',
        },
        { status: 400 }
      );
    }

    const totalDiasMes = new Date(evento.anio, evento.mes, 0).getDate();
    let empleadosConComplementos = 0;
    let complementosAsignados = 0;
    let empleadosConComplementosPendientes = 0;

    await prisma.$transaction(async (tx) => {
      for (const empleado of empleados) {
        const contratoVigente = empleado.contratos[0];
        if (!contratoVigente) {
          continue;
        }

        let diasAusencias = 0;
        for (const ausencia of empleado.ausencias) {
          const inicio = new Date(
            Math.max(
              ausencia.fechaInicio.getTime(),
              new Date(evento.anio, evento.mes - 1, 1).getTime()
            )
          );
          const fin = new Date(
            Math.min(
              ausencia.fechaFin.getTime(),
              new Date(evento.anio, evento.mes, 0).getTime()
            )
          );

          const dias = Math.ceil(
            (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)
          ) + 1;

          diasAusencias += dias;
        }

        const diasTrabajados = Math.max(0, totalDiasMes - diasAusencias);

        // Calcular salario mensual desde el anual del contrato
        const salarioAnual = contratoVigente.salarioBrutoAnual ?? new Decimal(0);
        const salarioMensual = salarioAnual.div(12);
        const salarioBase = salarioMensual.mul(diasTrabajados).div(totalDiasMes);
        const precioHora = salarioMensual.div(HORAS_MENSUALES_ESTIMADAS);

        const tieneComplementosVariables = empleado.complementos.some(
          (comp) => !comp.importePersonalizado && !comp.tipoComplemento.importeFijo
        );

        const compensacionesPendientes = await tx.compensacionHoraExtra.findMany({
          where: {
            empleadoId: empleado.id,
            tipoCompensacion: 'nomina',
            estado: 'aprobada',
            nominaId: null,
          },
        });

        let horasExtras = new Decimal(0);
        compensacionesPendientes.forEach((comp) => {
          horasExtras = horasExtras.plus(new Decimal(comp.horasBalance));
        });

        const importeHorasExtras = horasExtras.gt(0)
          ? precioHora.mul(horasExtras).mul(HORAS_EXTRA_MULTIPLICADOR)
          : new Decimal(0);

        const nuevaNomina = await tx.nomina.create({
          data: {
            empleadoId: empleado.id,
            contratoId: contratoVigente.id,
            eventoNominaId: evento.id,
            mes: evento.mes,
            anio: evento.anio,
            estado: 'pre_nomina',
            salarioBase,
            totalComplementos: importeHorasExtras,
            totalDeducciones: new Decimal(0),
            totalBruto: salarioBase.plus(importeHorasExtras),
            totalNeto: salarioBase.plus(importeHorasExtras),
            diasTrabajados,
            diasAusencias,
            complementosPendientes: tieneComplementosVariables,
          },
        });

        if (compensacionesPendientes.length > 0) {
          await tx.compensacionHoraExtra.updateMany({
            where: {
              id: { in: compensacionesPendientes.map((c) => c.id) },
            },
            data: {
              nominaId: nuevaNomina.id,
            },
          });
        }

        if (empleado.complementos.length > 0) {
          empleadosConComplementos += 1;
          complementosAsignados += empleado.complementos.length;
        }

        if (tieneComplementosVariables) {
          empleadosConComplementosPendientes += 1;
        }
      }

      await tx.eventoNomina.update({
        where: { id: evento.id },
        data: {
          estado: 'complementos_pendientes',
          fechaGeneracion: new Date(),
          totalEmpleados: empleados.length,
          empleadosConComplementos,
          complementosAsignados,
        },
      });
    });

    await recalcularEstadisticasEvento(evento.id);
    await sincronizarEstadoEvento(evento.id);

    return NextResponse.json({
      nominasGeneradas: empleados.length,
      empleadosProcesados: empleados.length,
      alertasGeneradas: 0, // Las alertas se detectan en procesos posteriores
      complementosPendientes: empleadosConComplementosPendientes > 0,
      empleadosConComplementosPendientes,
    });
  } catch (error) {
    console.error('[POST /api/nominas/eventos/[id]/generar-prenominas] Error:', error);
    return NextResponse.json(
      { error: 'Error al generar pre-nóminas' },
      { status: 500 }
    );
  }
}


