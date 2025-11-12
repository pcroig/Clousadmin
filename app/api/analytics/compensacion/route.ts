// ========================================
// API: Analytics - Métricas de Compensación
// ========================================
// GET: Obtener métricas de compensación (costes, salarios, distribución)

import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  handleApiError,
  successResponse,
} from '@/lib/api-handler';
import { obtenerRangoFechaAntiguedad } from '@/lib/calculos/antiguedad';
import {
  toNumber,
  calcularVariacion,
  MESES,
} from '@/lib/utils/analytics-helpers';

const empleadoConEquiposSelect = Prisma.validator<Prisma.EmpleadoSelect>()({
  id: true,
  salarioBrutoMensual: true,
  salarioBrutoAnual: true,
  fechaAlta: true,
  genero: true,
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
});

type EmpleadoConEquipos = Prisma.EmpleadoGetPayload<{
  select: typeof empleadoConEquiposSelect;
}>;

const nominaConEquiposSelect = Prisma.validator<Prisma.NominaSelect>()({
  id: true,
  totalNeto: true,
  totalComplementos: true,
  empleado: {
    select: {
      equipos: {
        select: {
          equipo: {
            select: {
              nombre: true,
            },
          },
        },
      },
    },
  },
});

type NominaConEquipos = Prisma.NominaGetPayload<{
  select: typeof nominaConEquiposSelect;
}>;

const asignacionComplementoSelect =
  Prisma.validator<Prisma.AsignacionComplementoSelect>()({
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
  });

type AsignacionComplementoDetalle = Prisma.AsignacionComplementoGetPayload<{
  select: typeof asignacionComplementoSelect;
}>;

type NominaHistorico = {
  anio: number;
  mes: number;
  _sum: {
    totalBruto: Prisma.Decimal | null;
  };
};

type NominaGroupResumen = {
  anio: number;
  _sum: {
    totalNeto: Prisma.Decimal | null;
    totalBruto: Prisma.Decimal | null;
    totalComplementos: Prisma.Decimal | null;
  };
  _count: {
    _all: number | null;
  };
};

type NominaGroupMensual = {
  anio: number;
  mes: number;
  _sum: {
    totalNeto: Prisma.Decimal | null;
    totalBruto: Prisma.Decimal | null;
    totalComplementos: Prisma.Decimal | null;
  };
  _count: {
    _all: number | null;
  };
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

    // Aplicar filtro de antigüedad en BD (no en memoria)
    if (antiguedad && antiguedad !== 'todos') {
      const rangoFecha = obtenerRangoFechaAntiguedad(antiguedad);
      if (rangoFecha) {
        where.fechaAlta = rangoFecha;
      }
    }

    // Obtener empleados con salarios y equipos
    const empleadosArgs: Prisma.EmpleadoFindManyArgs = {
      where,
      select: empleadoConEquiposSelect,
    };
    const empleados: EmpleadoConEquipos[] = await prisma.empleado.findMany(empleadosArgs);

    const empleadosIds = empleados.map((empleado: EmpleadoConEquipos) => empleado.id);

    // 1. Coste total nómina mensual
    const costeTotalNomina = empleados.reduce(
      (sum: number, empleado: EmpleadoConEquipos) =>
        sum + Number(empleado.salarioBrutoMensual || 0),
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

    const costeMesAnterior = empleadosMesAnterior.reduce<number>(
      (
        sum: number,
        empleado: { salarioBrutoMensual: Prisma.Decimal | number | null }
      ) => sum + Number(empleado.salarioBrutoMensual || 0),
      0
    );

    const cambioCoste = costeTotalNomina - costeMesAnterior;

    // 3. Salario promedio empresa
    const salarioPromedio =
      empleados.length > 0 ? costeTotalNomina / empleados.length : 0;

    // 4. Salario promedio por equipo
    const salariosPorEquipo: Record<string, { total: number; count: number }> = {};

    empleados.forEach((empleado: EmpleadoConEquipos) => {
      const salario = Number(empleado.salarioBrutoMensual || 0);

      if (empleado.equipos.length === 0) {
        if (!salariosPorEquipo['Sin equipo']) {
          salariosPorEquipo['Sin equipo'] = { total: 0, count: 0 };
        }
        salariosPorEquipo['Sin equipo'].total += salario;
        salariosPorEquipo['Sin equipo'].count += 1;
      } else {
        empleado.equipos.forEach((eq) => {
          const nombreEquipo = eq.equipo?.nombre ?? 'Sin equipo';
          if (!salariosPorEquipo[nombreEquipo]) {
            salariosPorEquipo[nombreEquipo] = { total: 0, count: 0 };
          }
          salariosPorEquipo[nombreEquipo].total += salario;
          salariosPorEquipo[nombreEquipo].count += 1;
        });
      }
    });

    const salarioPromedioEquipo = Object.entries(salariosPorEquipo).map(
      ([equipo, data]) => ({
        equipo,
        promedio: Math.round(data.count > 0 ? data.total / data.count : 0),
      })
    );

    // 5. Salario promedio por género
    const salariosPorGenero: Record<string, { total: number; count: number }> =
      {};

    empleados.forEach((empleado: EmpleadoConEquipos) => {
      const generoKey = (empleado.genero ?? 'no_especificado').toLowerCase();
      if (!salariosPorGenero[generoKey]) {
        salariosPorGenero[generoKey] = { total: 0, count: 0 };
      }
      salariosPorGenero[generoKey].total += Number(
        empleado.salarioBrutoMensual || 0
      );
      salariosPorGenero[generoKey].count += 1;
    });

    const salarioPromedioPorGenero = Object.entries(salariosPorGenero).map(
      ([generoKey, data]) => ({
        genero: generoKey,
        promedio: data.count > 0 ? Math.round(data.total / data.count) : 0,
      })
    );

    const promedioHombres =
      salarioPromedioPorGenero.find((item) => item.genero === 'hombre')
        ?.promedio ?? 0;
    const promedioMujeres =
      salarioPromedioPorGenero.find((item) => item.genero === 'mujer')
        ?.promedio ?? 0;

    const diferenciaBrecha = promedioHombres - promedioMujeres;
    const porcentajeBrecha =
      promedioMujeres > 0
        ? Number(((diferenciaBrecha / promedioMujeres) * 100).toFixed(1))
        : 0;

    const brechaSalarialGenero = {
      diferencia: Math.round(diferenciaBrecha),
      porcentaje: porcentajeBrecha,
      generoMayor:
        diferenciaBrecha > 0
          ? 'hombre'
          : diferenciaBrecha < 0
            ? 'mujer'
            : 'igual',
    } as const;

    // 5. Evolución coste nómina (últimos 6 meses) - OPTIMIZADO
    // Usar agregación por nóminas en lugar de queries repetidas
    const hace6Meses = new Date();
    hace6Meses.setMonth(hace6Meses.getMonth() - 6);
    hace6Meses.setDate(1);
    hace6Meses.setHours(0, 0, 0, 0);

    const nominaHistoricoWhere: Prisma.NominaWhereInput = {
      empleadoId: { in: empleadosIds },
      anio: { gte: hace6Meses.getFullYear() },
    };

    const nominasHistorico = (await prisma.nomina.groupBy({
      by: ['anio', 'mes'],
      where: nominaHistoricoWhere,
      _sum: {
        totalBruto: true,
      },
      orderBy: [{ anio: 'asc' }, { mes: 'asc' }],
    })) as NominaHistorico[];

    // Construir evolución de costes desde datos históricos
    const evolucionCoste = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      fecha.setDate(1);
      fecha.setHours(0, 0, 0, 0);

      const mesNumero = fecha.getMonth() + 1;
      const anio = fecha.getFullYear();

      // Buscar en datos agregados
      const dataMes = nominasHistorico.find(
        (n) => n.anio === anio && n.mes === mesNumero
      );

      const coste = dataMes ? toNumber(dataMes._sum.totalBruto) : 0;

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

    empleados.forEach((empleado: EmpleadoConEquipos) => {
      const salarioAnual = Number(
        empleado.salarioBrutoAnual ||
          (empleado.salarioBrutoMensual
            ? Number(empleado.salarioBrutoMensual) * 12
            : 0)
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

    // Si no hay empleados, no hacer las queries de nóminas
    if (empleadosIds.length === 0) {
      return successResponse({
        costeTotalNomina: 0,
        cambioCoste: 0,
        salarioPromedio: 0,
        salarioPromedioEquipo: [],
        salarioPromedioPorGenero: [],
        brechaSalarialGenero: {
          diferencia: 0,
          porcentaje: 0,
          generoMayor: 'igual',
        },
        evolucionCoste,
        distribucionSalarial: [],
        nominas: null,
      });
    }

    const resumenPorAnioPromise = prisma.nomina.groupBy({
      by: ['anio'],
      where: {
        anio: { in: [previousYear, currentYear] },
        empleadoId: { in: empleadosIds },
      },
      _sum: {
        totalNeto: true,
        totalBruto: true,
        totalComplementos: true,
      },
      _count: {
        _all: true,
      },
    }) as Promise<NominaGroupResumen[]>;

    const tendenciaMensualPromise = prisma.nomina.groupBy({
      by: ['anio', 'mes'],
      where: {
        anio: currentYear,
        empleadoId: { in: empleadosIds },
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
    }) as Promise<NominaGroupMensual[]>;

    const nominasEquiposArgs: Prisma.NominaFindManyArgs = {
      where: {
        anio: currentYear,
        empleadoId: { in: empleadosIds },
      },
      select: nominaConEquiposSelect,
    };
    const nominasEquiposPromise = prisma.nomina.findMany(nominasEquiposArgs) as Promise<NominaConEquipos[]>;

    const complementosAsignadosArgs: Prisma.AsignacionComplementoFindManyArgs = {
      where: {
        nomina: {
          is: {
            anio: currentYear,
            empleadoId: { in: empleadosIds },
          },
        },
      },
      select: asignacionComplementoSelect,
    };
    const [resumenPorAnioRaw, tendenciaMensualRaw, nominasEquiposRaw] = await Promise.all([
      resumenPorAnioPromise,
      tendenciaMensualPromise,
      nominasEquiposPromise,
    ]);

    const resumenPorAnio = resumenPorAnioRaw as NominaGroupResumen[];
    const nominasEquipos = nominasEquiposRaw as NominaConEquipos[];

    const nominaIds = nominasEquipos.map((nomina) => nomina.id);

    const complementosAsignados =
      nominaIds.length === 0
        ? []
        : await prisma.asignacionComplemento.findMany({
            where: {
              nominaId: { in: nominaIds },
            },
            select: asignacionComplementoSelect,
          }).then(
            (result) => result as AsignacionComplementoDetalle[]
          );

    type ResumenAnio = {
      totalNeto: number;
      totalBruto: number;
      totalComplementos: number;
      totalNominas: number;
    };

    const resumenNominasPorAnio = resumenPorAnio.reduce<Record<number, ResumenAnio>>(
      (acc: Record<number, ResumenAnio>, item: NominaGroupResumen) => {
        acc[item.anio] = {
          totalNeto: toNumber(item._sum.totalNeto),
          totalBruto: toNumber(item._sum.totalBruto),
          totalComplementos: toNumber(item._sum.totalComplementos),
          totalNominas: item._count._all ?? 0,
        };
        return acc;
      },
      {}
    );

    const resumenActual: ResumenAnio = resumenNominasPorAnio[currentYear] ?? {
      totalNeto: 0,
      totalBruto: 0,
      totalComplementos: 0,
      totalNominas: 0,
    };

    const resumenAnterior: ResumenAnio = resumenNominasPorAnio[previousYear] ?? {
      totalNeto: 0,
      totalBruto: 0,
      totalComplementos: 0,
      totalNominas: 0,
    };

    const variaciones = {
      totalNeto: calcularVariacion(
        resumenActual.totalNeto,
        resumenAnterior.totalNeto
      ),
      totalBruto: calcularVariacion(
        resumenActual.totalBruto,
        resumenAnterior.totalBruto
      ),
      totalComplementos: calcularVariacion(
        resumenActual.totalComplementos,
        resumenAnterior.totalComplementos
      ),
    };

    const tendenciaPorMes = tendenciaMensualRaw.reduce<
      Record<number, ResumenAnio>
    >(
      (acc: Record<number, ResumenAnio>, item: NominaGroupMensual) => {
      acc[item.mes] = {
        totalNeto: toNumber(item._sum.totalNeto),
        totalBruto: toNumber(item._sum.totalBruto),
        totalComplementos: toNumber(item._sum.totalComplementos),
        totalNominas: item._count._all ?? 0,
      };
      return acc;
      },
      {}
    );

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

    type EquipoAcumulado = {
      totalNeto: number;
      totalComplementos: number;
      nominas: number;
    };

    const equiposMap = new Map<string, EquipoAcumulado>();

    nominasEquipos.forEach((nomina: NominaConEquipos) => {
      const equipos = nomina.empleado?.equipos ?? [];

      if (equipos.length === 0) {
        if (!equiposMap.has('Sin equipo')) {
          equiposMap.set('Sin equipo', {
            totalNeto: 0,
            totalComplementos: 0,
            nominas: 0,
          });
        }

        const data = equiposMap.get('Sin equipo')!;
        data.totalNeto += toNumber(nomina.totalNeto);
        data.totalComplementos += toNumber(nomina.totalComplementos);
        data.nominas += 1;
        return;
      }

      equipos.forEach((eq) => {
        const nombreEquipo = eq.equipo?.nombre ?? 'Sin equipo';

        if (!equiposMap.has(nombreEquipo)) {
          equiposMap.set(nombreEquipo, {
            totalNeto: 0,
            totalComplementos: 0,
            nominas: 0,
          });
        }

        const data = equiposMap.get(nombreEquipo)!;
        data.totalNeto += toNumber(nomina.totalNeto);
        data.totalComplementos += toNumber(nomina.totalComplementos);
        data.nominas += 1;
      });
    });

    const nominasPorEquipo = Array.from(equiposMap.entries())
      .map(([equipo, data]) => ({
        equipo,
        totalNeto: Number(data.totalNeto.toFixed(2)),
        totalComplementos: Number(data.totalComplementos.toFixed(2)),
        promedioNeto:
          data.nominas > 0
            ? Number((data.totalNeto / data.nominas).toFixed(2))
            : 0,
        nominas: data.nominas,
      }))
      .sort((a, b) => b.totalNeto - a.totalNeto);

    type ComplementoAcumulado = {
      totalImporte: number;
      count: number;
    };

    const complementosMap = new Map<string, ComplementoAcumulado>();

    complementosAsignados.forEach(
      (asignacion: AsignacionComplementoDetalle) => {
        const nombre =
          asignacion.empleadoComplemento?.tipoComplemento?.nombre ?? 'Sin tipo';

        if (!complementosMap.has(nombre)) {
          complementosMap.set(nombre, { totalImporte: 0, count: 0 });
        }

        const data = complementosMap.get(nombre)!;
        data.totalImporte += toNumber(asignacion.importe);
        data.count += 1;
      }
    );

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
      nominasPorEquipo.length > 0 ||
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
          porEquipo: nominasPorEquipo,
          complementosTop,
        }
      : null;

    return successResponse({
      costeTotalNomina: Math.round(costeTotalNomina),
      cambioCoste: Math.round(cambioCoste),
      salarioPromedio: Math.round(salarioPromedio),
      salarioPromedioEquipo,
      salarioPromedioPorGenero,
      brechaSalarialGenero,
      evolucionCoste,
      distribucionSalarial,
      nominas: nominasAnalytics,
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/analytics/compensacion');
  }
}
