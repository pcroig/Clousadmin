// ========================================
// API: Analytics - Métricas de Compensación
// ========================================
// GET: Obtener métricas de compensación (costes, salarios, distribución)

import { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
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

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const toNumber = (value: Prisma.Decimal | number | null | undefined) =>
  Number(value ?? 0);

const calcularVariacion = (actual: number, anterior: number) => {
  if (anterior <= 0) {
    return 0;
  }
  return Number((((actual - anterior) / anterior) * 100).toFixed(1));
};

// GET /api/analytics/compensacion - Obtener métricas de compensación (solo HR Admin)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const genero = searchParams.get('genero');
    const equipoId = searchParams.get('equipo');
    const antiguedad = searchParams.get('antiguedad');

    // Construir filtros base
    const where: Prisma.EmpleadoWhereInput = {
      empresaId: session.user.empresaId,
      estadoEmpleado: 'activo',
    };

    if (genero && genero !== 'todos') {
      where.genero = genero;
    }

    // Si hay filtro de equipo
    if (equipoId && equipoId !== 'todos') {
      where.equipos = {
        some: {
          equipoId: equipoId,
        },
      };
    }

    // Obtener empleados con salarios y equipos
    let empleados = await prisma.empleado.findMany({
      where,
      select: {
        id: true,
        salarioBrutoMensual: true,
        salarioBrutoAnual: true,
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

    // 1. Coste total nómina mensual
    const costeTotalNomina = empleados.reduce(
      (sum, e) => sum + Number(e.salarioBrutoMensual || 0),
      0
    );

    // 2. Cambio coste respecto mes anterior
    const mesAnterior = new Date();
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);
    mesAnterior.setHours(0, 0, 0, 0);

    const empleadosMesAnterior = await prisma.empleado.findMany({
      where: {
        ...where,
        fechaAlta: { lte: mesAnterior },
        OR: [{ fechaBaja: null }, { fechaBaja: { gt: mesAnterior } }],
      },
      select: {
        salarioBrutoMensual: true,
      },
    });

    const costeMesAnterior = empleadosMesAnterior.reduce(
      (sum, e) => sum + Number(e.salarioBrutoMensual || 0),
      0
    );

    const cambioCoste = costeTotalNomina - costeMesAnterior;

    // 3. Salario promedio empresa
    const salarioPromedio =
      empleados.length > 0 ? costeTotalNomina / empleados.length : 0;

    // 4. Salario promedio por equipo
    const porEquipo: Record<string, { total: number; count: number }> = {};

    empleados.forEach((e) => {
      const salario = Number(e.salarioBrutoMensual || 0);

      if (e.equipos.length === 0) {
        if (!porEquipo['Sin equipo']) {
          porEquipo['Sin equipo'] = { total: 0, count: 0 };
        }
        porEquipo['Sin equipo'].total += salario;
        porEquipo['Sin equipo'].count += 1;
      } else {
        e.equipos.forEach((eq) => {
          const nombreEquipo = eq.equipo.nombre;
          if (!porEquipo[nombreEquipo]) {
            porEquipo[nombreEquipo] = { total: 0, count: 0 };
          }
          porEquipo[nombreEquipo].total += salario;
          porEquipo[nombreEquipo].count += 1;
        });
      }
    });

    const salarioPromedioEquipo = Object.entries(porEquipo).map(
      ([equipo, data]) => ({
        equipo,
        promedio: Math.round(data.count > 0 ? data.total / data.count : 0),
      })
    );

    // 5. Evolución coste nómina (últimos 6 meses)
    const evolucionCoste = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      fecha.setDate(1);
      fecha.setHours(0, 0, 0, 0);

      const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

      const empleadosMes = await prisma.empleado.findMany({
        where: {
          empresaId: session.user.empresaId,
          fechaAlta: { lte: finMes },
          OR: [{ fechaBaja: null }, { fechaBaja: { gt: finMes } }],
        },
        select: {
          salarioBrutoMensual: true,
        },
      });

      const coste = empleadosMes.reduce(
        (sum, e) => sum + Number(e.salarioBrutoMensual || 0),
        0
      );

      evolucionCoste.push({
        mes: fecha.toLocaleDateString('es-ES', {
          month: 'short',
          year: 'numeric',
        }),
        coste: Math.round(coste),
      });
    }

    // 6. Distribución salarial (rangos)
    const rangos = {
      'Menos de 20k': 0,
      '20k - 30k': 0,
      '30k - 40k': 0,
      '40k - 50k': 0,
      '50k - 70k': 0,
      'Más de 70k': 0,
    };

    empleados.forEach((e) => {
      const salarioAnual = Number(
        e.salarioBrutoAnual || (e.salarioBrutoMensual ? Number(e.salarioBrutoMensual) * 12 : 0)
      );
      if (salarioAnual < 20000) rangos['Menos de 20k']++;
      else if (salarioAnual < 30000) rangos['20k - 30k']++;
      else if (salarioAnual < 40000) rangos['30k - 40k']++;
      else if (salarioAnual < 50000) rangos['40k - 50k']++;
      else if (salarioAnual < 70000) rangos['50k - 70k']++;
      else rangos['Más de 70k']++;
    });

    const distribucionSalarial = Object.entries(rangos).map(
      ([rango, count]) => ({
        rango,
        empleados: count,
      })
    );

    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    const [
      resumenPorAnio,
      tendenciaMensualRaw,
      nominasDepartamento,
      complementosAsignados,
    ] = await Promise.all([
      prisma.nomina.groupBy({
        by: ['anio'],
        where: {
          anio: { in: [previousYear, currentYear] },
          empleado: {
            empresaId: session.user.empresaId,
          },
        },
        _sum: {
          totalNeto: true,
          totalBruto: true,
          totalComplementos: true,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.nomina.groupBy({
        by: ['anio', 'mes'],
        where: {
          anio: currentYear,
          empleado: {
            empresaId: session.user.empresaId,
          },
        },
        _sum: {
          totalNeto: true,
          totalBruto: true,
          totalComplementos: true,
        },
        _count: {
          _all: true,
        },
        orderBy: {
          mes: 'asc',
        },
      }),
      prisma.nomina.findMany({
        where: {
          anio: currentYear,
          empleado: {
            empresaId: session.user.empresaId,
          },
        },
        select: {
          totalNeto: true,
          totalComplementos: true,
          empleado: {
            select: {
              departamento: {
                select: {
                  nombre: true,
                },
              },
            },
          },
        },
      }),
      prisma.asignacionComplemento.findMany({
        where: {
          nomina: {
            anio: currentYear,
            empleado: {
              empresaId: session.user.empresaId,
            },
          },
        },
        select: {
          importe: true,
          empleadoComplemento: {
            select: {
              tipoComplemento: {
                select: {
                  nombre: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const resumenNominasPorAnio = resumenPorAnio.reduce<
      Record<
        number,
        {
          totalNeto: number;
          totalBruto: number;
          totalComplementos: number;
          totalNominas: number;
        }
      >
    >((acc, item) => {
      acc[item.anio] = {
        totalNeto: toNumber(item._sum.totalNeto),
        totalBruto: toNumber(item._sum.totalBruto),
        totalComplementos: toNumber(item._sum.totalComplementos),
        totalNominas: item._count._all ?? 0,
      };
      return acc;
    }, {});

    const resumenActual =
      resumenNominasPorAnio[currentYear] ?? {
        totalNeto: 0,
        totalBruto: 0,
        totalComplementos: 0,
        totalNominas: 0,
      };

    const resumenAnterior =
      resumenNominasPorAnio[previousYear] ?? {
        totalNeto: 0,
        totalBruto: 0,
        totalComplementos: 0,
        totalNominas: 0,
      };

    const variaciones = {
      totalNeto: calcularVariacion(resumenActual.totalNeto, resumenAnterior.totalNeto),
      totalBruto: calcularVariacion(resumenActual.totalBruto, resumenAnterior.totalBruto),
      totalComplementos: calcularVariacion(
        resumenActual.totalComplementos,
        resumenAnterior.totalComplementos
      ),
    };

    const tendenciaPorMes = tendenciaMensualRaw.reduce<
      Record<
        number,
        {
          totalNeto: number;
          totalBruto: number;
          totalComplementos: number;
          totalNominas: number;
        }
      >
    >((acc, item) => {
      acc[item.mes] = {
        totalNeto: toNumber(item._sum.totalNeto),
        totalBruto: toNumber(item._sum.totalBruto),
        totalComplementos: toNumber(item._sum.totalComplementos),
        totalNominas: item._count._all ?? 0,
      };
      return acc;
    }, {});

    const tendenciaMensual = Array.from({ length: 12 }, (_, index) => {
      const mesNumero = index + 1;
      const data = tendenciaPorMes[mesNumero] ?? {
        totalNeto: 0,
        totalBruto: 0,
        totalComplementos: 0,
        totalNominas: 0,
      };

      return {
        mes: MESES[mesNumero - 1],
        mesNumero,
        totalNeto: data.totalNeto,
        totalBruto: data.totalBruto,
        totalComplementos: data.totalComplementos,
        totalNominas: data.totalNominas,
      };
    }).filter(
      (entry) =>
        entry.totalNeto > 0 ||
        entry.totalBruto > 0 ||
        entry.totalComplementos > 0 ||
        entry.totalNominas > 0
    );

    const departamentosMap = new Map<
      string,
      {
        totalNeto: number;
        totalComplementos: number;
        nominas: number;
      }
    >();

    nominasDepartamento.forEach((nomina) => {
      const departamento =
        nomina.empleado?.departamento?.nombre ?? 'Sin departamento';

      if (!departamentosMap.has(departamento)) {
        departamentosMap.set(departamento, {
          totalNeto: 0,
          totalComplementos: 0,
          nominas: 0,
        });
      }

      const data = departamentosMap.get(departamento)!;
      data.totalNeto += toNumber(nomina.totalNeto);
      data.totalComplementos += toNumber(nomina.totalComplementos);
      data.nominas += 1;
    });

    const porDepartamento = Array.from(departamentosMap.entries())
      .map(([departamento, data]) => ({
        departamento,
        totalNeto: Number(data.totalNeto.toFixed(2)),
        totalComplementos: Number(data.totalComplementos.toFixed(2)),
        promedioNeto:
          data.nominas > 0
            ? Number((data.totalNeto / data.nominas).toFixed(2))
            : 0,
        nominas: data.nominas,
      }))
      .sort((a, b) => b.totalNeto - a.totalNeto);

    const complementosMap = new Map<
      string,
      { totalImporte: number; count: number }
    >();

    complementosAsignados.forEach((asignacion) => {
      const nombre =
        asignacion.empleadoComplemento?.tipoComplemento?.nombre ??
        'Sin tipo';

      if (!complementosMap.has(nombre)) {
        complementosMap.set(nombre, { totalImporte: 0, count: 0 });
      }

      const data = complementosMap.get(nombre)!;
      data.totalImporte += toNumber(asignacion.importe);
      data.count += 1;
    });

    const complementosTop = Array.from(complementosMap.entries())
      .map(([nombre, data]) => ({
        nombre,
        totalImporte: Number(data.totalImporte.toFixed(2)),
        promedioImporte:
          data.count > 0
            ? Number((data.totalImporte / data.count).toFixed(2))
            : 0,
        vecesAsignado: data.count,
      }))
      .sort((a, b) => b.totalImporte - a.totalImporte)
      .slice(0, 5);

    const tieneNominas =
      resumenActual.totalNominas > 0 ||
      resumenAnterior.totalNominas > 0 ||
      tendenciaMensual.length > 0 ||
      porDepartamento.length > 0 ||
      complementosTop.length > 0;

    const nominasAnalytics = tieneNominas
      ? {
          currentYear,
          previousYear,
          resumen: {
            actual: resumenActual,
            anterior: resumenAnterior,
            variaciones,
          },
          tendenciaMensual,
          porDepartamento,
          complementosTop,
        }
      : null;

    return successResponse({
      costeTotalNomina: Math.round(costeTotalNomina),
      cambioCoste: Math.round(cambioCoste),
      salarioPromedio: Math.round(salarioPromedio),
      salarioPromedioEquipo,
      evolucionCoste,
      distribucionSalarial,
      nominas: nominasAnalytics,
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/analytics/compensacion');
  }
}
