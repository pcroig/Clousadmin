// ========================================
// API: Eventos de Nómina
// ========================================
// Gestionar el ciclo mensual de nóminas (EventoNomina)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { crearNominasBase } from '@/lib/calculos/crear-nominas-base';
import { prisma } from '@/lib/prisma';
import { getJsonBody } from '@/lib/utils/json';

const GenerarEventoSchema = z.object({
  mes: z.number().int().min(1).max(12),
  anio: z.number().int().min(2020).max(2100),
  fechaLimiteComplementos: z.string().datetime().optional(),
  compensarHoras: z.boolean().optional().default(false),
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

    const eventos = await prisma.eventos_nomina.findMany({
      where: {
        empresaId: session.user.empresaId,
        ...(anio ? { anio: parseInt(anio) } : {}),
      },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      include: {
        _count: {
          select: { nominas: true },
        },
        nominas: {
          select: {
            id: true,
            complementosPendientes: true,
            alertas: {
              where: {
                resuelta: false, // Solo alertas no resueltas
              },
              select: {
                id: true,
                tipo: true, // 'critico', 'advertencia', 'info'
              },
            },
          },
        },
      },
    });

    let rangoInicio: Date | null = null;
    let rangoFin: Date | null = null;

    for (const evento of eventos) {
      const inicio = new Date(evento.anio, evento.mes - 1, 1);
      const fin = new Date(evento.anio, evento.mes, 1); // primer día del mes siguiente

      if (!rangoInicio || inicio < rangoInicio) {
        rangoInicio = inicio;
      }
      if (!rangoFin || fin > rangoFin) {
        rangoFin = fin;
      }
    }

    const compensaciones = rangoInicio && rangoFin
      ? await prisma.compensaciones_horas_extra.findMany({
          where: {
            empresaId: session.user.empresaId,
            createdAt: {
              gte: rangoInicio,
              lt: rangoFin,
            },
          },
          select: {
            estado: true,
            horasBalance: true,
            createdAt: true,
          },
        })
      : [];

    const compensacionesPorMes = compensaciones.reduce<Record<string, typeof compensaciones>>(
      (acc, comp) => {
        const fecha = comp.createdAt;
        const key = `${fecha.getFullYear()}-${fecha.getMonth() + 1}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(comp);
        return acc;
      },
      {}
    );

    const eventosConAlertas = eventos.map((evento) => {
      const alertas = evento.nominas.flatMap((n) => n.alertas);

      const conteoAlertas = {
        criticas: alertas.filter((a) => a.tipo === 'critico').length,
        advertencias: alertas.filter((a) => a.tipo === 'advertencia').length,
        informativas: alertas.filter((a) => a.tipo === 'info').length,
        total: alertas.length,
      };

      const nominasConComplementosPendientes = evento.nominas.filter(
        (n) => n.complementosPendientes
      ).length;

      const key = `${evento.anio}-${evento.mes}`;
      const compensacionesDelMes = compensacionesPorMes[key] ?? [];

      const horasExtra = compensacionesDelMes.reduce(
        (acc, item) => {
          const horas = Number(item.horasBalance);
          if (item.estado === 'pendiente') {
            acc.pendientes += 1;
            acc.horasPendientes += horas;
          } else if (item.estado === 'aprobada') {
            acc.aprobadas += 1;
          }
          acc.total += 1;
          return acc;
        },
        { pendientes: 0, aprobadas: 0, total: 0, horasPendientes: 0 }
      );

      const { nominas: _nominas, ...eventoSinNominas } = evento;

      return {
        ...eventoSinNominas,
        alertas: conteoAlertas,
        nominasConComplementosPendientes,
        tieneComplementos: evento.empleadosConComplementos > 0,
        horasExtra,
      };
    });

    return NextResponse.json({ eventos: eventosConAlertas });
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
// Crea un nuevo evento de nómina mensual Y genera nóminas base automáticamente
// 1. Crea el evento en estado "pendiente"
// 2. Genera nóminas base para todos los empleados activos (con salario, días, alertas)
// 3. El usuario luego ejecuta "Generar Pre-nóminas" para completar los cálculos
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

    const payload = await getJsonBody<Record<string, unknown>>(req);
    const data = GenerarEventoSchema.parse(payload);

    // Verificar que no existe ya un evento para este mes/año
    const existente = await prisma.eventos_nomina.findFirst({
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

    // Calcular fecha límite por defecto (5 del mes siguiente)
    const fechaLimite = data.fechaLimiteComplementos
      ? new Date(data.fechaLimiteComplementos)
      : new Date(data.anio, data.mes, 5); // 5 del mes siguiente

    // ✅ Usar transacción para garantizar atomicidad
    const { evento: eventoActualizado, resultado } = await prisma.$transaction(async (tx) => {
      // 1. Crear el evento de nómina en estado "pendiente"
      const evento = await tx.eventos_nomina.create({
        data: {
          empresaId: session.user.empresaId,
          mes: data.mes,
          anio: data.anio,
          estado: 'pendiente',
          compensarHoras: data.compensarHoras || false,
          fechaLimiteComplementos: fechaLimite,
          totalEmpleados: 0,
          prenominasGeneradas: 0,
        },
      });

      // 2. ✅ Crear nóminas base automáticamente para todos los empleados activos
      const resultado = await crearNominasBase({
        eventoId: evento.id,
        empresaId: session.user.empresaId,
        mes: data.mes,
        anio: data.anio,
      });

      // 3. Actualizar evento con estadísticas
      const eventoActualizado = await tx.eventos_nomina.update({
        where: { id: evento.id },
        data: {
          totalEmpleados: resultado.empleadosActivos,
          prenominasGeneradas: resultado.nominasCreadas,
          empleadosConComplementos: resultado.empleadosConComplementos,
        },
      });

      return { evento: eventoActualizado, resultado };
    });

    return NextResponse.json(
      {
        evento: eventoActualizado,
        resultado,
        message: `Evento creado con ${resultado.nominasCreadas} nóminas base. ` +
          `Revisa complementos y alertas antes de generar pre-nóminas.`,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
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