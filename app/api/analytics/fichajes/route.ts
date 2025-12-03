// ========================================
// API: Analytics - Métricas de Fichajes
// ========================================
// GET: Obtener métricas de fichajes (horas trabajadas, tendencias, absentismo)

import { NextRequest } from 'next/server';

import { FICHAJES_METRICS } from '@/lib/analytics/metrics';
import {
  handleApiError,
  requireAuthAsHR,
  successResponse,
} from '@/lib/api-handler';
import { obtenerRangoFechaAntiguedad } from '@/lib/calculos/antiguedad';
import { EstadoAusencia, EstadoFichaje } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { 
  obtenerRangoMes, 
  obtenerInicioMesActual, 
  obtenerFinMesActual,
  calcularDiasLaborablesMes,
  toMadridDate
} from '@/lib/utils/fechas';

import type { Prisma } from '@prisma/client';

const toNumber = (value: Prisma.Decimal | number | null | undefined): number =>
  value ? Number(value) : 0;

const clampDateRange = (inicio: Date, fin: Date, rangoInicio: Date, rangoFin: Date) => {
  const start = inicio > rangoInicio ? inicio : rangoInicio;
  const end = fin < rangoFin ? fin : rangoFin;
  return end >= start ? { start, end } : { start, end: start };
};

// ELIMINADO: Función calcularDiasLaborables reemplazada por helper centralizado

// GET /api/analytics/fichajes - Obtener métricas de fichajes (solo HR Admin)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const equipoId = searchParams.get('equipo');
    const antiguedad = searchParams.get('antiguedad');

    // Construir filtros base
    const where: Prisma.empleadosWhereInput = {
      empresaId: session.user.empresaId,
      estadoEmpleado: 'activo',
    };

    if (equipoId && equipoId !== 'todos') {
      where.equipos = {
        some: {
          equipoId: equipoId,
        },
      };
    }

    // Aplicar filtro de antigüedad en BD (no en memoria)
    if (antiguedad && antiguedad !== 'todos') {
      const rangoFecha = obtenerRangoFechaAntiguedad(antiguedad);
      if (rangoFecha) {
        where.fechaAlta = rangoFecha;
      }
    }

    // Obtener empleados con equipos
    const empleados = await prisma.empleados.findMany({
      where,
      select: {
        id: true,
        fechaAlta: true,
        equipos: {
          select: {
            equipo: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
    });

    const empleadoIds = empleados.map((empleado) => empleado.id);

    // Obtener mes actual
    // FIX: Usar helpers que respetan zona horaria Madrid
    const hoy = toMadridDate(new Date());
    const inicioMesActual = obtenerInicioMesActual();
    const finMesActual = obtenerFinMesActual();

    // 1. Total horas trabajadas mes actual
    const fichajesMesActual = await prisma.fichajes.findMany({
      where: {
        empresaId: session.user.empresaId,
        empleadoId: { in: empleadoIds },
        fecha: {
          gte: inicioMesActual,
          lte: finMesActual,
        },
        estado: { in: [EstadoFichaje.finalizado, EstadoFichaje.pendiente] },
      },
      select: {
        horasTrabajadas: true,
        empleadoId: true,
      },
    });

    const totalHorasMes = fichajesMesActual.reduce<number>((sum, fichaje) => {
      return sum + toNumber(fichaje.horasTrabajadas);
    }, 0);

    // 2. Cambio respecto mes anterior
    // FIX: Usar helper que respeta zona horaria Madrid
    const { inicio: inicioMesAnterior, fin: finMesAnterior } = obtenerRangoMes(1);

    const fichajesMesAnterior = await prisma.fichajes.findMany({
      where: {
        empresaId: session.user.empresaId,
        empleadoId: { in: empleadoIds },
        fecha: {
          gte: inicioMesAnterior,
          lte: finMesAnterior,
        },
        estado: { in: [EstadoFichaje.finalizado, EstadoFichaje.pendiente] },
      },
      select: {
        horasTrabajadas: true,
      },
    });

    const totalHorasMesAnterior = fichajesMesAnterior.reduce<number>((sum, fichaje) => {
      return sum + toNumber(fichaje.horasTrabajadas);
    }, 0);

    const cambioHoras = totalHorasMes - totalHorasMesAnterior;

    // 3. Promedio horas/día
    // FIX: Usar helper centralizado que respeta zona horaria
    const diasLaborables = calcularDiasLaborablesMes(
      hoy.getUTCFullYear(),
      hoy.getUTCMonth()
    );
    const promedioHorasDia =
      empleados.length > 0 && diasLaborables > 0
        ? totalHorasMes / (empleados.length * diasLaborables)
        : 0;

    // 4. Horas trabajadas diarias del mes actual
    // Optimización: 1 query para todo el mes, luego agrupar en memoria
    const fichajesMesParaDias = await prisma.fichajes.findMany({
      where: {
        empresaId: session.user.empresaId,
        empleadoId: { in: empleadoIds },
        fecha: {
          gte: inicioMesActual,
          lte: finMesActual <= hoy ? finMesActual : hoy,
        },
        estado: { in: [EstadoFichaje.finalizado, EstadoFichaje.pendiente] },
      },
      select: {
        fecha: true,
        horasTrabajadas: true,
      },
    });

    // Agrupar por fecha
    const horasPorFecha: Record<string, number> = {};
    for (const fichaje of fichajesMesParaDias) {
      const fechaStr = fichaje.fecha.toISOString().split('T')[0];
      horasPorFecha[fechaStr] = (horasPorFecha[fechaStr] || 0) + toNumber(fichaje.horasTrabajadas);
    }

    // Generar array de días laborables
    const horasDiarias: { fecha: string; horas: number }[] = [];
    const fecha = new Date(inicioMesActual);

    while (fecha <= finMesActual && fecha <= hoy) {
      const dayOfWeek = fecha.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const fechaStr = fecha.toISOString().split('T')[0];
        const horas = horasPorFecha[fechaStr] || 0;
        horasDiarias.push({
          fecha: fechaStr,
          horas: Math.round(horas * 10) / 10,
        });
      }
      fecha.setDate(fecha.getDate() + 1);
    }

    // 5. Tasa de absentismo
    // Corregido: Calcular días reales de ausencia, no número de ausencias
    const ausenciasMes = await prisma.ausencias.findMany({
      where: {
        empresaId: session.user.empresaId,
        empleadoId: { in: empleadoIds },
        fechaInicio: {
          lte: finMesActual,
        },
        fechaFin: {
          gte: inicioMesActual,
        },
        estado: { in: [EstadoAusencia.confirmada, EstadoAusencia.completada] },
      },
      select: {
        fechaInicio: true,
        fechaFin: true,
      },
    });

    // Calcular días totales de ausencia
    const totalDiasAusencia = ausenciasMes.reduce<number>((sum, ausencia) => {
      const fechaFinAusencia = ausencia.fechaFin ?? finMesActual;
      const { start, end } = clampDateRange(
        ausencia.fechaInicio,
        fechaFinAusencia,
        inicioMesActual,
        finMesActual
      );
      const dias = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + Math.max(dias, 0);
    }, 0);

    const diasPosiblesTrabajo = empleados.length * diasLaborables;
    const tasaAbsentismo =
      diasPosiblesTrabajo > 0 ? (totalDiasAusencia / diasPosiblesTrabajo) * 100 : 0;

    // 6. Balance de horas acumulado
    const horasEsperadas = empleados.length * diasLaborables * 8;
    const balanceAcumulado = totalHorasMes - horasEsperadas;

    // 7. NUEVA: Promedio de horas por equipo
    const horasPorEquipo: Record<string, { total: number; empleados: number }> = {};

    for (const empleado of empleados) {
      const fichajesEmpleado = fichajesMesActual.filter(
        (fichaje) => fichaje.empleadoId === empleado.id
      );
      const horasEmpleado = fichajesEmpleado.reduce<number>((sum, fichaje) => {
        return sum + toNumber(fichaje.horasTrabajadas);
      }, 0);

      if (empleado.equipos.length === 0) {
        if (!horasPorEquipo['Sin equipo']) {
          horasPorEquipo['Sin equipo'] = { total: 0, empleados: 0 };
        }
        horasPorEquipo['Sin equipo'].total += horasEmpleado;
        horasPorEquipo['Sin equipo'].empleados += 1;
      } else {
        for (const relacion of empleado.equipos) {
          const nombreEquipo = relacion.equipo?.nombre ?? 'Sin equipo';
          if (!horasPorEquipo[nombreEquipo]) {
            horasPorEquipo[nombreEquipo] = { total: 0, empleados: 0 };
          }
          horasPorEquipo[nombreEquipo].total += horasEmpleado;
          horasPorEquipo[nombreEquipo].empleados += 1;
        }
      }
    }

    const promedioHorasPorEquipo = Object.entries(horasPorEquipo).map(
      ([equipo, data]) => ({
        equipo,
        promedio: Math.round((data.total / data.empleados) * 10) / 10,
      })
    );

    // 8. NUEVA: Absentismo por equipo
    // Optimización: 1 query para todas las ausencias, calcular días reales
    const ausenciasMesPorEmpleado = await prisma.ausencias.findMany({
      where: {
        empresaId: session.user.empresaId,
        empleadoId: { in: empleadoIds },
        fechaInicio: { lte: finMesActual },
        fechaFin: { gte: inicioMesActual },
        estado: { in: [EstadoAusencia.confirmada, EstadoAusencia.completada] },
      },
      select: {
        empleadoId: true,
        fechaInicio: true,
        fechaFin: true,
      },
    });

    // Agrupar días de ausencia por empleado
    const diasAusenciaPorEmpleado: Record<string, number> = {};
    for (const ausencia of ausenciasMesPorEmpleado) {
      const fechaFinAusencia = ausencia.fechaFin ?? finMesActual;
      const { start, end } = clampDateRange(
        ausencia.fechaInicio,
        fechaFinAusencia,
        inicioMesActual,
        finMesActual
      );
      const dias = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      diasAusenciaPorEmpleado[ausencia.empleadoId] =
        (diasAusenciaPorEmpleado[ausencia.empleadoId] || 0) + Math.max(dias, 0);
    }

    // Distribuir días de ausencia por equipo
    const absentismoPorEquipo: Record<string, number> = {};
    for (const empleado of empleados) {
      const diasAusenciaEmpleado = diasAusenciaPorEmpleado[empleado.id] || 0;

      if (empleado.equipos.length === 0) {
        absentismoPorEquipo['Sin equipo'] =
          (absentismoPorEquipo['Sin equipo'] || 0) + diasAusenciaEmpleado;
      } else {
        for (const relacion of empleado.equipos) {
          const nombreEquipo = relacion.equipo?.nombre ?? 'Sin equipo';
          absentismoPorEquipo[nombreEquipo] =
            (absentismoPorEquipo[nombreEquipo] || 0) + diasAusenciaEmpleado;
        }
      }
    }

    // Calcular tasa de absentismo por equipo (%)
    const tasaAbsentismoPorEquipo = Object.entries(absentismoPorEquipo).map(
      ([equipo, diasAusencia]) => {
        const empleadosEquipo = horasPorEquipo[equipo]?.empleados ?? 0;
        const diasPosibles = empleadosEquipo * diasLaborables;
        const tasa = diasPosibles > 0 ? (diasAusencia / diasPosibles) * 100 : 0;
        return {
          equipo,
          tasa: Math.round(tasa * 10) / 10,
        };
      }
    );

    return successResponse({
      totalHorasMes: Math.round(totalHorasMes * 10) / 10,
      cambioHoras: Math.round(cambioHoras * 10) / 10,
      promedioHorasDia: Math.round(promedioHorasDia * 10) / 10,
      horasDiarias,
      tasaAbsentismo: Math.round(tasaAbsentismo * 10) / 10,
      balanceAcumulado: Math.round(balanceAcumulado * 10) / 10,
      promedioHorasPorEquipo,
      tasaAbsentismoPorEquipo,
      metadata: {
        metrics: FICHAJES_METRICS,
      },
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/analytics/fichajes');
  }
}
