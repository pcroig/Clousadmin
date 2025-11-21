// ========================================
// API: Eventos de Nómina
// ========================================
// Gestionar el ciclo mensual de nóminas (EventoNomina)

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { UsuarioRol } from '@/lib/constants/enums';
import { crearNotificacionComplementosPendientes } from '@/lib/notificaciones';
import { generarPrenominasEvento } from '@/lib/calculos/generar-prenominas';

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
      ? await prisma.compensacionHoraExtra.findMany({
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

      const { nominas, ...eventoSinNominas } = evento;

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
// Genera un nuevo evento de nómina mensual
// 1. Crea el evento
// 2. SIEMPRE genera pre-nóminas para todos los empleados activos (estado: pendiente)
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
    const fechaLimite = data.fechaLimiteComplementos
      ? new Date(data.fechaLimiteComplementos)
      : new Date(data.anio, data.mes, 0, 23, 59, 59); // Último día del mes

    // Crear el evento de nómina (estado: abierto)
    const evento = await prisma.eventoNomina.create({
      data: {
        empresaId: session.user.empresaId,
        mes: data.mes,
        anio: data.anio,
        estado: 'abierto',
        fechaLimiteComplementos: fechaLimite,
        totalEmpleados: 0,
      },
    });

    let resultadoGeneracion: Awaited<
      ReturnType<typeof generarPrenominasEvento>
    >;
    try {
      resultadoGeneracion = await generarPrenominasEvento({
        eventoId: evento.id,
        empresaId: session.user.empresaId,
        mes: data.mes,
        anio: data.anio,
      });
    } catch (error) {
      await prisma.eventoNomina.delete({ where: { id: evento.id } }).catch(() => {});
      throw error;
    }

    const eventoActualizado = await prisma.eventoNomina.findUnique({
      where: { id: evento.id },
    });

    if (!eventoActualizado) {
      throw new Error('No se pudo recuperar el evento generado');
    }

    // Enviar notificaciones a los managers para completar complementos
    const managers = await prisma.empleado.findMany({
      where: {
        empresaId: session.user.empresaId,
        usuario: {
          rol: UsuarioRol.manager,
          activo: true,
        },
      },
      select: {
        id: true,
      },
    });

    if (resultadoGeneracion.empleadosConComplementos > 0) {
      await Promise.all(
        managers.map((manager) =>
          crearNotificacionComplementosPendientes(prisma, {
            nominaId: evento.id,
            empresaId: session.user.empresaId,
            managerId: manager.id,
            empleadosCount: resultadoGeneracion.empleadosConComplementos,
            mes: data.mes,
            año: data.anio,
          })
        )
      );
    }

    return NextResponse.json(
      {
        evento: eventoActualizado,
        nominasGeneradas: resultadoGeneracion.prenominasCreadas,
        prenominasVinculadas: resultadoGeneracion.prenominasVinculadas,
        notificacionesEnviadas:
          resultadoGeneracion.empleadosConComplementos > 0 ? managers.length : 0,
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