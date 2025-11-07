// ========================================
// API: Eventos de Nómina
// ========================================
// Gestionar el ciclo mensual de nóminas (EventoNomina)

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

const GenerarEventoSchema = z.object({
  mes: z.number().int().min(1).max(12),
  anio: z.number().int().min(2020).max(2100),
  fechaLimiteComplementos: z.string().datetime().optional(),
});

// ========================================
// GET /api/nominas/eventos
// ========================================
// Lista todos los eventos de nómina de la empresa
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo HR puede ver eventos de nómina
    if (!['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const anio = searchParams.get('anio');

    const eventos = await prisma.eventoNomina.findMany({
      where: {
        empresaId: session.user.empresaId,
        ...(anio ? { anio: parseInt(anio) } : {}),
      },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      include: {
        _count: {
          select: { nominas: true },
        },
      },
    });

    return NextResponse.json({ eventos });
  } catch (error) {
    console.error('[GET /api/nominas/eventos] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener eventos de nómina' },
      { status: 500 }
    );
  }
}

// ========================================
// POST /api/nominas/eventos
// ========================================
// Genera un nuevo evento de nómina mensual
// 1. Crea el evento
// 2. Genera pre-nóminas para todos los empleados activos
// 3. Envía notificaciones a managers
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo HR puede generar eventos
    if (!['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await req.json();
    const data = GenerarEventoSchema.parse(body);

    // Verificar que no existe ya un evento para este mes/año
    const existente = await prisma.eventoNomina.findFirst({
      where: {
        empresaId: session.user.empresaId,
        mes: data.mes,
        anio: data.anio,
      },
    });

    if (existente) {
      return NextResponse.json(
        {
          error: `Ya existe un evento de nómina para ${data.mes}/${data.anio}`,
          eventoId: existente.id,
        },
        { status: 400 }
      );
    }

    // Calcular fecha límite por defecto (último día del mes)
    let fechaLimite = data.fechaLimiteComplementos
      ? new Date(data.fechaLimiteComplementos)
      : new Date(data.anio, data.mes, 0, 23, 59, 59); // Último día del mes

    // Obtener todos los empleados activos con sus contratos vigentes
    const empleados = await prisma.empleado.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
      },
      include: {
        contratos: {
          where: {
            // Contratos que están vigentes en el mes de la nómina
            OR: [
              {
                fechaFin: null, // Contratos indefinidos
              },
              {
                fechaFin: {
                  gte: new Date(data.anio, data.mes - 1, 1), // Fin después del inicio del mes
                },
              },
            ],
            fechaInicio: {
              lte: new Date(data.anio, data.mes, 0), // Inicio antes del fin del mes
            },
          },
          orderBy: {
            fechaInicio: 'desc',
          },
          take: 1, // Solo el contrato más reciente
        },
        complementos: {
          where: {
            activo: true,
          },
          include: {
            tipoComplemento: true,
          },
        },
        ausencias: {
          where: {
            // Ausencias que coinciden con el mes de la nómina
            fechaInicio: {
              lte: new Date(data.anio, data.mes, 0),
            },
            fechaFin: {
              gte: new Date(data.anio, data.mes - 1, 1),
            },
          },
        },
      },
    });

    // Crear el evento de nómina
    const evento = await prisma.eventoNomina.create({
      data: {
        empresaId: session.user.empresaId,
        mes: data.mes,
        anio: data.anio,
        estado: 'generando',
        fechaLimiteComplementos: fechaLimite,
        totalEmpleados: empleados.length,
      },
    });

    // Generar pre-nóminas para cada empleado
    const nominasCreadas = [];
    let empleadosConComplementos = 0;
    let totalComplementosAsignados = 0;

    for (const empleado of empleados) {
      const contratoVigente = empleado.contratos[0];

      if (!contratoVigente) {
        console.warn(`[Nómina] Empleado ${empleado.id} sin contrato vigente`);
        continue;
      }

      // Calcular días trabajados en el mes (simplificado)
      const totalDiasMes = new Date(data.anio, data.mes, 0).getDate();
      let diasTrabajados = totalDiasMes;

      // Restar días de ausencias
      let totalDiasAusencias = 0;
      for (const ausencia of empleado.ausencias) {
        // Cálculo simplificado de días de ausencia en el mes
        const inicioAusencia = new Date(Math.max(
          ausencia.fechaInicio.getTime(),
          new Date(data.anio, data.mes - 1, 1).getTime()
        ));
        const finAusencia = new Date(Math.min(
          ausencia.fechaFin.getTime(),
          new Date(data.anio, data.mes, 0).getTime()
        ));

        const dias = Math.ceil(
          (finAusencia.getTime() - inicioAusencia.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;

        totalDiasAusencias += dias;
      }

      diasTrabajados = Math.max(0, totalDiasMes - totalDiasAusencias);

      // Calcular salario base proporcional
      const salarioMensual = contratoVigente.salarioBruto || new Decimal(0);
      const salarioBase = salarioMensual
        .mul(diasTrabajados)
        .div(totalDiasMes);

      // Verificar si tiene complementos con importe variable (sin importePersonalizado ni importeFijo)
      const tieneComplementosVariables = empleado.complementos.some(
        (comp) => !comp.importePersonalizado && !comp.tipoComplemento.importeFijo
      );

      const nomina = await prisma.nomina.create({
        data: {
          empleadoId: empleado.id,
          contratoId: contratoVigente.id,
          eventoNominaId: evento.id,
          mes: data.mes,
          anio: data.anio,
          estado: 'pre_nomina',
          salarioBase: salarioBase,
          totalComplementos: new Decimal(0),
          totalDeducciones: new Decimal(0),
          totalBruto: salarioBase,
          totalNeto: salarioBase, // Se calculará después con complementos y deducciones
          diasTrabajados: diasTrabajados,
          diasAusencias: totalDiasAusencias,
          complementosPendientes: tieneComplementosVariables,
        },
      });

      nominasCreadas.push(nomina);

      if (empleado.complementos.length > 0) {
        empleadosConComplementos++;
        totalComplementosAsignados += empleado.complementos.length;
      }
    }

    // Actualizar evento con estadísticas
    await prisma.eventoNomina.update({
      where: { id: evento.id },
      data: {
        estado: 'complementos_pendientes',
        fechaGeneracion: new Date(),
        empleadosConComplementos,
        complementosAsignados: totalComplementosAsignados,
      },
    });

    // Enviar notificaciones a TODOS los managers
    const managers = await prisma.usuario.findMany({
      where: {
        empresaId: session.user.empresaId,
        rol: 'manager',
        activo: true,
      },
    });

    const notificaciones = await Promise.all(
      managers.map((manager) =>
        prisma.notificacion.create({
          data: {
            usuarioId: manager.id,
            tipo: 'nomina_generada',
            titulo: `Nóminas ${data.mes}/${data.anio} generadas`,
            mensaje: `Se han generado ${nominasCreadas.length} pre-nóminas. Por favor, revisa y asigna complementos antes del ${fechaLimite.toLocaleDateString()}.`,
            eventoNominaId: evento.id,
          },
        })
      )
    );

    return NextResponse.json(
      {
        evento,
        nominasGeneradas: nominasCreadas.length,
        notificacionesEnviadas: notificaciones.length,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[POST /api/nominas/eventos] Error:', error);
    return NextResponse.json(
      { error: 'Error al generar evento de nómina' },
      { status: 500 }
    );
  }
}
