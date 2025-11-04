// ========================================
// API: Analytics - Métricas de Fichajes
// ========================================
// GET: Obtener métricas de fichajes (horas trabajadas, tendencias, absentismo)

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  handleApiError,
  successResponse,
} from '@/lib/api-handler';

// Función auxiliar para calcular antigüedad
function calcularAntiguedad(fechaAlta: Date): string {
  const hoy = new Date();
  const mesesAntiguedad =
    (hoy.getFullYear() - fechaAlta.getFullYear()) * 12 +
    (hoy.getMonth() - fechaAlta.getMonth());

  if (mesesAntiguedad < 6) return 'menos_6_meses';
  if (mesesAntiguedad < 12) return '6_12_meses';
  if (mesesAntiguedad < 36) return '1_3_años';
  if (mesesAntiguedad < 60) return '3_5_años';
  return 'mas_5_años';
}

// Función para calcular días laborables en un mes
function calcularDiasLaborables(year: number, month: number): number {
  let count = 0;
  const fecha = new Date(year, month, 1);
  while (fecha.getMonth() === month) {
    const dayOfWeek = fecha.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    fecha.setDate(fecha.getDate() + 1);
  }
  return count;
}

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
    const where: any = {
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

    // Obtener empleados con equipos
    let empleados = await prisma.empleado.findMany({
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

    // Filtrar por antigüedad si aplica
    if (antiguedad && antiguedad !== 'todos') {
      empleados = empleados.filter(
        (e) => calcularAntiguedad(e.fechaAlta) === antiguedad
      );
    }

    const empleadoIds = empleados.map((e) => e.id);

    // Obtener mes actual
    const hoy = new Date();
    const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMesActual = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    // 1. Total horas trabajadas mes actual
    const fichajesMesActual = await prisma.fichaje.findMany({
      where: {
        empresaId: session.user.empresaId,
        empleadoId: { in: empleadoIds },
        fecha: {
          gte: inicioMesActual,
          lte: finMesActual,
        },
        estado: { in: ['finalizado', 'revisado'] },
      },
      select: {
        horasTrabajadas: true,
        empleadoId: true,
      },
    });

    const totalHorasMes = fichajesMesActual.reduce(
      (sum, f) => sum + Number(f.horasTrabajadas || 0),
      0
    );

    // 2. Cambio respecto mes anterior
    const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);

    const fichajesMesAnterior = await prisma.fichaje.findMany({
      where: {
        empresaId: session.user.empresaId,
        empleadoId: { in: empleadoIds },
        fecha: {
          gte: inicioMesAnterior,
          lte: finMesAnterior,
        },
        estado: { in: ['finalizado', 'revisado'] },
      },
      select: {
        horasTrabajadas: true,
      },
    });

    const totalHorasMesAnterior = fichajesMesAnterior.reduce(
      (sum, f) => sum + Number(f.horasTrabajadas || 0),
      0
    );

    const cambioHoras = totalHorasMes - totalHorasMesAnterior;

    // 3. Promedio horas/día
    const diasLaborables = calcularDiasLaborables(
      hoy.getFullYear(),
      hoy.getMonth()
    );
    const promedioHorasDia =
      empleados.length > 0 && diasLaborables > 0
        ? totalHorasMes / (empleados.length * diasLaborables)
        : 0;

    // 4. Horas trabajadas diarias del mes actual
    const horasDiarias: { fecha: string; horas: number }[] = [];
    const fecha = new Date(inicioMesActual);

    while (fecha <= finMesActual && fecha <= hoy) {
      const dayOfWeek = fecha.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const fichajesDia = await prisma.fichaje.findMany({
          where: {
            empresaId: session.user.empresaId,
            empleadoId: { in: empleadoIds },
            fecha: new Date(fecha.toISOString().split('T')[0]),
            estado: { in: ['finalizado', 'revisado'] },
          },
          select: {
            horasTrabajadas: true,
          },
        });

        const horasDia = fichajesDia.reduce(
          (sum, f) => sum + Number(f.horasTrabajadas || 0),
          0
        );

        horasDiarias.push({
          fecha: fecha.toISOString().split('T')[0],
          horas: Math.round(horasDia * 10) / 10,
        });
      }
      fecha.setDate(fecha.getDate() + 1);
    }

    // 5. Tasa de absentismo
    const ausenciasMes = await prisma.ausencia.count({
      where: {
        empresaId: session.user.empresaId,
        empleadoId: { in: empleadoIds },
        fechaInicio: {
          lte: finMesActual,
        },
        fechaFin: {
          gte: inicioMesActual,
        },
        estado: { in: ['en_curso', 'completada', 'auto_aprobada'] },
      },
    });

    const diasPosiblesTrabajo = empleados.length * diasLaborables;
    const tasaAbsentismo =
      diasPosiblesTrabajo > 0 ? (ausenciasMes / diasPosiblesTrabajo) * 100 : 0;

    // 6. Balance de horas acumulado
    const horasEsperadas = empleados.length * diasLaborables * 8;
    const balanceAcumulado = totalHorasMes - horasEsperadas;

    // 7. NUEVA: Promedio de horas por equipo
    const horasPorEquipo: Record<string, { total: number; empleados: number }> = {};

    empleados.forEach((emp) => {
      const fichajesEmpleado = fichajesMesActual.filter(
        (f) => f.empleadoId === emp.id
      );
      const horasEmpleado = fichajesEmpleado.reduce(
        (sum, f) => sum + Number(f.horasTrabajadas || 0),
        0
      );

      if (emp.equipos.length === 0) {
        if (!horasPorEquipo['Sin equipo']) {
          horasPorEquipo['Sin equipo'] = { total: 0, empleados: 0 };
        }
        horasPorEquipo['Sin equipo'].total += horasEmpleado;
        horasPorEquipo['Sin equipo'].empleados += 1;
      } else {
        emp.equipos.forEach((eq) => {
          const nombreEquipo = eq.equipo.nombre;
          if (!horasPorEquipo[nombreEquipo]) {
            horasPorEquipo[nombreEquipo] = { total: 0, empleados: 0 };
          }
          horasPorEquipo[nombreEquipo].total += horasEmpleado;
          horasPorEquipo[nombreEquipo].empleados += 1;
        });
      }
    });

    const promedioHorasPorEquipo = Object.entries(horasPorEquipo).map(
      ([equipo, data]) => ({
        equipo,
        promedio: Math.round((data.total / data.empleados) * 10) / 10,
      })
    );

    // 8. NUEVA: Absentismo por equipo
    const absentismoPorEquipo: Record<string, number> = {};

    for (const emp of empleados) {
      const ausenciasEmpleado = await prisma.ausencia.count({
        where: {
          empresaId: session.user.empresaId,
          empleadoId: emp.id,
          fechaInicio: { lte: finMesActual },
          fechaFin: { gte: inicioMesActual },
          estado: { in: ['en_curso', 'completada', 'auto_aprobada'] },
        },
      });

      if (emp.equipos.length === 0) {
        absentismoPorEquipo['Sin equipo'] =
          (absentismoPorEquipo['Sin equipo'] || 0) + ausenciasEmpleado;
      } else {
        emp.equipos.forEach((eq) => {
          const nombreEquipo = eq.equipo.nombre;
          absentismoPorEquipo[nombreEquipo] =
            (absentismoPorEquipo[nombreEquipo] || 0) + ausenciasEmpleado;
        });
      }
    }

    // Calcular tasa de absentismo por equipo (%)
    const tasaAbsentismoPorEquipo = Object.entries(absentismoPorEquipo).map(
      ([equipo, ausencias]) => {
        const empleadosEquipo = horasPorEquipo[equipo]?.empleados || 1;
        const diasPosibles = empleadosEquipo * diasLaborables;
        const tasa = (ausencias / diasPosibles) * 100;
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
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/analytics/fichajes');
  }
}
