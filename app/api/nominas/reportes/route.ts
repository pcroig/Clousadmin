// ========================================
// API: Reportes Avanzados de Nóminas
// ========================================
// Genera reportes avanzados (PDF, comparativas, análisis)

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import type { Prisma } from '@prisma/client';

type FormatoReporte = 'json' | 'excel';

type NominaMetric = {
  empleadoId: string;
  totalBruto: number;
  totalNeto: number;
  totalComplementos: number;
  totalDeducciones: number;
  equipos: string[];
  mes: number;
};

type NominaDetalle = NominaMetric & {
  complementos: Array<{ nombre: string; importe: number }>;
};

type ComparativaMetrics = {
  totalNominas: number;
  totalBruto: number;
  totalNeto: number;
  totalComplementos: number;
  promedioNeto: number;
  empleadosUnicos: number;
};

type VariacionesComparativa = {
  totalNeto: number;
  promedioNeto: number;
  totalComplementos: number;
  empleados: number;
};

type EquipoComparativa = {
  equipo: string;
  actual: { total: number; promedio: number; empleados: number };
  anterior: { total: number; promedio: number; empleados: number };
  variacion: number;
};

type ComparativaResultado = {
  anioActual: number;
  anioAnterior: number;
  resumen: {
    actual: ComparativaMetrics;
    anterior: ComparativaMetrics;
    variaciones: VariacionesComparativa;
  };
  porEquipo: EquipoComparativa[];
};

type ResumenPorEquipo = {
  equipo: string;
  totalNeto: number;
  totalBruto: number;
  totalComplementos: number;
  empleados: number;
  promedioNeto: number;
};

type ComplementoResumen = {
  nombre: string;
  vecesAsignado: number;
  totalImporte: number;
  promedioImporte: number;
};

type ResumenResultado = {
  periodo: string;
  resumen: {
    totalNominas: number;
    totalBruto: number;
    totalNeto: number;
    totalComplementos: number;
    totalDeducciones: number;
    promedioNeto: number;
  };
  equipos: ResumenPorEquipo[];
  complementos: ComplementoResumen[];
};

type EquipoReporte = {
  equipo: string;
  empleados: number;
  totalNominas: number;
  totalBruto: number;
  totalNeto: number;
  totalComplementos: number;
  promedioNeto: number;
  medianaNet: number;
  minNeto: number;
  maxNeto: number;
};

type EquiposResultado = {
  anio: number;
  totalEquipos: number;
  equipos: EquipoReporte[];
};

type TendenciaMensual = {
  mes: number;
  totalBruto: number;
  totalNeto: number;
  totalComplementos: number;
  totalDeducciones: number;
  numeroNominas: number;
  empleadosUnicos: number;
  promedioNeto: number;
};

type TendenciaResultado = {
  anio: number;
  tendencia: TendenciaMensual[];
  totales: {
    totalBruto: number;
    totalNeto: number;
    totalComplementos: number;
    totalDeducciones: number;
  };
};

type NominaWithEquipos = {
  empleadoId: string;
  totalBruto: Prisma.Decimal | number;
  totalNeto: Prisma.Decimal | number;
  totalComplementos: Prisma.Decimal | number;
  totalDeducciones: Prisma.Decimal | number;
  empleado: {
    equipos: Array<{
      equipo: {
        nombre: string;
      } | null;
    }>;
  };
  mes: number;
};

type NominaWithComplementos = NominaWithEquipos & {
  complementosAsignados: Array<{
    importe: Prisma.Decimal | number;
    empleado_complementos: {
      tipos_complemento: {
        nombre: string;
      };
    };
  }>;
};

function obtenerEquipos(empleado: NominaWithEquipos['empleado']): string[] {
  const relaciones = empleado.equipos ?? [];
  const nombres = relaciones
    .map((rel) => rel.equipo?.nombre)
    .filter((nombre): nombre is string => Boolean(nombre));

  return nombres.length > 0 ? nombres : ['Sin equipo'];
}

function toNominaMetric(nomina: NominaWithEquipos): NominaMetric {
  return {
    empleadoId: nomina.empleadoId,
    totalBruto: Number(nomina.totalBruto),
    totalNeto: Number(nomina.totalNeto),
    totalComplementos: Number(nomina.totalComplementos),
    totalDeducciones: Number(nomina.totalDeducciones),
    equipos: obtenerEquipos(nomina.empleado),
    mes: nomina.mes,
  };
}

function toNominaDetalle(nomina: NominaWithComplementos): NominaDetalle {
  return {
    ...toNominaMetric(nomina),
    complementos: nomina.complementosAsignados.map((asignacion) => ({
      nombre: asignacion.empleado_complementos.tipos_complemento.nombre,
      importe: Number(asignacion.importe),
    })),
  };
}

// GET /api/nominas/reportes?tipo=comparativa&anio=2025
// GET /api/nominas/reportes?tipo=resumen&anio=2025&mes=3
// GET /api/nominas/reportes?tipo=equipos&anio=2025
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get('tipo') || 'resumen';
    const anio = parseInt(searchParams.get('anio') || new Date().getFullYear().toString());
    const mes = searchParams.get('mes') ? parseInt(searchParams.get('mes')!) : null;
    const formato = (searchParams.get('formato') as FormatoReporte) || 'json';

    switch (tipo) {
      case 'comparativa':
        return await generarComparativa(session.user.empresaId, anio, formato);
      
      case 'resumen':
        return await generarResumen(session.user.empresaId, anio, mes, formato);
      
      case 'equipos':
        return await generarPorEquipos(session.user.empresaId, anio, formato);
      
      case 'tendencia':
        return await generarTendencia(session.user.empresaId, anio, formato);
      
      default:
        return NextResponse.json({ error: 'Tipo de reporte no válido' }, { status: 400 });
    }
  } catch (error) {
    console.error('[GET /api/nominas/reportes] Error:', error);
    return NextResponse.json(
      { error: 'Error al generar reporte' },
      { status: 500 }
    );
  }
}

// ========================================
// Generadores de reportes
// ========================================

async function generarComparativa(empresaId: string, anioActual: number, formato: FormatoReporte) {
  const anioAnterior = anioActual - 1;

  // Obtener nóminas de ambos años
  const includeEmpleado = {
    empleado: {
      include: {
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
  } satisfies Prisma.nominasInclude;

  const [nominasActualRaw, nominasAnteriorRaw] = await Promise.all([
    prisma.nominas.findMany({
      where: {
        empleado: { empresaId },
        anio: anioActual,
      },
      include: includeEmpleado,
    }),
    prisma.nominas.findMany({
      where: {
        empleado: { empresaId },
        anio: anioAnterior,
      },
      include: includeEmpleado,
    }),
  ]);

  const nominasActual = nominasActualRaw.map(toNominaMetric);
  const nominasAnterior = nominasAnteriorRaw.map(toNominaMetric);

  const calcularMetricas = (nominas: NominaMetric[]): ComparativaMetrics => {
    const totalNominas = nominas.length;
    const totalBruto = nominas.reduce((sum, n) => sum + n.totalBruto, 0);
    const totalNeto = nominas.reduce((sum, n) => sum + n.totalNeto, 0);
    const totalComplementos = nominas.reduce((sum, n) => sum + n.totalComplementos, 0);

    return {
      totalNominas,
      totalBruto,
      totalNeto,
      totalComplementos,
      promedioNeto: totalNominas > 0 ? totalNeto / totalNominas : 0,
      empleadosUnicos: new Set(nominas.map((n) => n.empleadoId)).size,
    };
  };

  const metricsActual = calcularMetricas(nominasActual);
  const metricsAnterior = calcularMetricas(nominasAnterior);

  // Calcular variaciones
  const variaciones: VariacionesComparativa = {
    totalNeto: metricsAnterior.totalNeto > 0
      ? ((metricsActual.totalNeto - metricsAnterior.totalNeto) / metricsAnterior.totalNeto) * 100
      : 0,
    promedioNeto: metricsAnterior.promedioNeto > 0
      ? ((metricsActual.promedioNeto - metricsAnterior.promedioNeto) / metricsAnterior.promedioNeto) * 100
      : 0,
    totalComplementos: metricsAnterior.totalComplementos > 0
      ? ((metricsActual.totalComplementos - metricsAnterior.totalComplementos) / metricsAnterior.totalComplementos) * 100
      : 0,
    empleados: metricsAnterior.empleadosUnicos > 0
      ? ((metricsActual.empleadosUnicos - metricsAnterior.empleadosUnicos) / metricsAnterior.empleadosUnicos) * 100
      : 0,
  };

  // Comparativa por equipo
  const acumuladoEquipos: Record<
    string,
    {
      actual: { total: number; count: number };
      anterior: { total: number; count: number };
    }
  > = {};

  const acumularEquipos = (nominas: NominaMetric[], tipo: 'actual' | 'anterior') => {
    nominas.forEach((nomina) => {
      nomina.equipos.forEach((equipo) => {
        if (!acumuladoEquipos[equipo]) {
          acumuladoEquipos[equipo] = {
            actual: { total: 0, count: 0 },
            anterior: { total: 0, count: 0 },
          };
        }

        acumuladoEquipos[equipo][tipo].total += nomina.totalNeto;
        acumuladoEquipos[equipo][tipo].count += 1;
      });
    });
  };

  acumularEquipos(nominasActual, 'actual');
  acumularEquipos(nominasAnterior, 'anterior');

  const comparativaEquipos: EquipoComparativa[] = Object.entries(acumuladoEquipos).map(([equipo, data]) => {
    const actualPromedio = data.actual.count > 0 ? data.actual.total / data.actual.count : 0;
    const anteriorPromedio = data.anterior.count > 0 ? data.anterior.total / data.anterior.count : 0;
    const variacion =
      data.anterior.total > 0 ? ((data.actual.total - data.anterior.total) / data.anterior.total) * 100 : 0;

    return {
      equipo,
      actual: {
        total: data.actual.total,
        promedio: actualPromedio,
        empleados: data.actual.count,
      },
      anterior: {
        total: data.anterior.total,
        promedio: anteriorPromedio,
        empleados: data.anterior.count,
      },
      variacion,
    };
  });

  const resultado: ComparativaResultado = {
    anioActual,
    anioAnterior,
    resumen: {
      actual: metricsActual,
      anterior: metricsAnterior,
      variaciones,
    },
    porEquipo: comparativaEquipos,
  };

  if (formato === 'excel') {
    return generarExcelComparativa(resultado);
  }

  return NextResponse.json(resultado);
}

async function generarResumen(empresaId: string, anio: number, mes: number | null, formato: FormatoReporte) {
  const where = {
    empleado: { empresaId },
    anio,
    ...(mes ? { mes } : {}),
  };

  const nominas = await prisma.nominas.findMany({
    where,
    include: {
      empleado: {
        include: {
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
      complementosAsignados: {
        include: {
          empleado_complementos: {
            include: {
              tipos_complemento: true,
            },
          },
        },
      },
    },
  });

  const nominasDetalladas: NominaDetalle[] = nominas.map(toNominaDetalle);

  const totalNominas = nominasDetalladas.length;
  const totalBruto = nominasDetalladas.reduce((sum, n) => sum + n.totalBruto, 0);
  const totalNeto = nominasDetalladas.reduce((sum, n) => sum + n.totalNeto, 0);
  const totalComplementos = nominasDetalladas.reduce((sum, n) => sum + n.totalComplementos, 0);
  const totalDeducciones = nominasDetalladas.reduce((sum, n) => sum + n.totalDeducciones, 0);

  const acumuladoEquipos: Record<string, { total: number; bruto: number; complementos: number; count: number }> = {};

  nominasDetalladas.forEach((nomina) => {
    nomina.equipos.forEach((equipo) => {
      if (!acumuladoEquipos[equipo]) {
        acumuladoEquipos[equipo] = { total: 0, bruto: 0, complementos: 0, count: 0 };
      }

      acumuladoEquipos[equipo].total += nomina.totalNeto;
      acumuladoEquipos[equipo].bruto += nomina.totalBruto;
      acumuladoEquipos[equipo].complementos += nomina.totalComplementos;
      acumuladoEquipos[equipo].count += 1;
    });
  });

  const equipos: ResumenPorEquipo[] = Object.entries(acumuladoEquipos).map(([equipo, data]) => ({
    equipo,
    totalNeto: data.total,
    totalBruto: data.bruto,
    totalComplementos: data.complementos,
    empleados: data.count,
    promedioNeto: data.count > 0 ? data.total / data.count : 0,
  }));

  const complementosAcumulados: Record<string, { count: number; total: number }> = {};
  nominasDetalladas.forEach((nomina) => {
    nomina.complementos.forEach((comp) => {
      if (!complementosAcumulados[comp.nombre]) {
        complementosAcumulados[comp.nombre] = { count: 0, total: 0 };
      }
      complementosAcumulados[comp.nombre].count += 1;
      complementosAcumulados[comp.nombre].total += comp.importe;
    });
  });

  const complementos: ComplementoResumen[] = Object.entries(complementosAcumulados)
    .map(([nombre, data]) => ({
      nombre,
      vecesAsignado: data.count,
      totalImporte: data.total,
      promedioImporte: data.count > 0 ? data.total / data.count : 0,
    }))
    .sort((a, b) => b.vecesAsignado - a.vecesAsignado)
    .slice(0, 10);

  const resultado: ResumenResultado = {
    periodo: mes ? `${mes}/${anio}` : `${anio}`,
    resumen: {
      totalNominas,
      totalBruto,
      totalNeto,
      totalComplementos,
      totalDeducciones,
      promedioNeto: totalNominas > 0 ? totalNeto / totalNominas : 0,
    },
    equipos,
    complementos,
  };

  if (formato === 'excel') {
    return generarExcelResumen(resultado);
  }

  return NextResponse.json(resultado);
}

async function generarPorEquipos(empresaId: string, anio: number, formato: FormatoReporte) {
  const nominasRaw = await prisma.nominas.findMany({
    where: {
      empleado: { empresaId },
      anio,
    },
    include: {
      empleado: {
        include: {
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
    },
  });

  const nominas = nominasRaw.map(toNominaMetric);

  const acumuladoEquipos: Record<
    string,
    { nominas: NominaMetric[]; totalBruto: number; totalNeto: number; totalComplementos: number }
  > = {};

  nominas.forEach((nomina) => {
    nomina.equipos.forEach((equipo) => {
      if (!acumuladoEquipos[equipo]) {
        acumuladoEquipos[equipo] = {
          nominas: [],
          totalBruto: 0,
          totalNeto: 0,
          totalComplementos: 0,
        };
      }

      acumuladoEquipos[equipo].nominas.push(nomina);
      acumuladoEquipos[equipo].totalBruto += nomina.totalBruto;
      acumuladoEquipos[equipo].totalNeto += nomina.totalNeto;
      acumuladoEquipos[equipo].totalComplementos += nomina.totalComplementos;
    });
  });

  const equiposReporte: EquipoReporte[] = Object.entries(acumuladoEquipos)
    .map(([equipo, data]) => {
      const salariosOrdenados = data.nominas.map((n) => n.totalNeto).sort((a, b) => a - b);
      const mediana =
        salariosOrdenados.length === 0
          ? 0
          : salariosOrdenados[Math.floor(salariosOrdenados.length / 2)];
      const min = salariosOrdenados[0] ?? 0;
      const max = salariosOrdenados[salariosOrdenados.length - 1] ?? 0;

      return {
        equipo,
        empleados: new Set(data.nominas.map((n) => n.empleadoId)).size,
        totalNominas: data.nominas.length,
        totalBruto: data.totalBruto,
        totalNeto: data.totalNeto,
        totalComplementos: data.totalComplementos,
        promedioNeto: data.nominas.length > 0 ? data.totalNeto / data.nominas.length : 0,
        medianaNet: mediana,
        minNeto: min,
        maxNeto: max,
      };
    })
    .sort((a, b) => b.totalNeto - a.totalNeto);

  const resultado: EquiposResultado = {
    anio,
    totalEquipos: equiposReporte.length,
    equipos: equiposReporte,
  };

  if (formato === 'excel') {
    return generarExcelEquipos(resultado);
  }

  return NextResponse.json(resultado);
}

async function generarTendencia(empresaId: string, anio: number, formato: FormatoReporte) {
  const nominas = await prisma.nominas.findMany({
    where: {
      empleado: { empresaId },
      anio,
    },
  });

  const acumuladoPorMes: Record<
    number,
    {
      totalBruto: number;
      totalNeto: number;
      totalComplementos: number;
      totalDeducciones: number;
      numeroNominas: number;
      empleadosUnicos: Set<string>;
    }
  > = {};

  for (let mesIter = 1; mesIter <= 12; mesIter++) {
    acumuladoPorMes[mesIter] = {
      totalBruto: 0,
      totalNeto: 0,
      totalComplementos: 0,
      totalDeducciones: 0,
      numeroNominas: 0,
      empleadosUnicos: new Set<string>(),
    };
  }

  nominas.forEach((nomina) => {
    const data = acumuladoPorMes[nomina.mes];
    data.totalBruto += Number(nomina.totalBruto);
    data.totalNeto += Number(nomina.totalNeto);
    data.totalComplementos += Number(nomina.totalComplementos);
    data.totalDeducciones += Number(nomina.totalDeducciones);
    data.numeroNominas += 1;
    data.empleadosUnicos.add(nomina.empleadoId);
  });

  const tendencia: TendenciaMensual[] = Object.entries(acumuladoPorMes)
    .map(([mesStr, data]) => {
      const mesNumero = Number(mesStr);
      const promedioNeto = data.numeroNominas > 0 ? data.totalNeto / data.numeroNominas : 0;

      return {
        mes: mesNumero,
        totalBruto: data.totalBruto,
        totalNeto: data.totalNeto,
        totalComplementos: data.totalComplementos,
        totalDeducciones: data.totalDeducciones,
        numeroNominas: data.numeroNominas,
        empleadosUnicos: data.empleadosUnicos.size,
        promedioNeto,
      };
    })
    .sort((a, b) => a.mes - b.mes);

  const resultado: TendenciaResultado = {
    anio,
    tendencia,
    totales: {
      totalBruto: tendencia.reduce((sum, m) => sum + m.totalBruto, 0),
      totalNeto: tendencia.reduce((sum, m) => sum + m.totalNeto, 0),
      totalComplementos: tendencia.reduce((sum, m) => sum + m.totalComplementos, 0),
      totalDeducciones: tendencia.reduce((sum, m) => sum + m.totalDeducciones, 0),
    },
  };

  if (formato === 'excel') {
    return generarExcelTendencia(resultado);
  }

  return NextResponse.json(resultado);
}

// ========================================
// Generadores de Excel
// ========================================

function generarExcelComparativa(data: ComparativaResultado) {
  const workbook = XLSX.utils.book_new();

  // Hoja 1: Resumen
  const resumenData = [
    ['Comparativa de Años', '', ''],
    ['Métrica', `${data.anioAnterior}`, `${data.anioActual}`, 'Variación %'],
    ['Total Neto', data.resumen.anterior.totalNeto, data.resumen.actual.totalNeto, data.resumen.variaciones.totalNeto],
    ['Promedio Neto', data.resumen.anterior.promedioNeto, data.resumen.actual.promedioNeto, data.resumen.variaciones.promedioNeto],
    ['Total Complementos', data.resumen.anterior.totalComplementos, data.resumen.actual.totalComplementos, data.resumen.variaciones.totalComplementos],
    ['Empleados', data.resumen.anterior.empleadosUnicos, data.resumen.actual.empleadosUnicos, data.resumen.variaciones.empleados],
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

  // Hoja 2: Por Equipo
  const equipoData = data.porEquipo.map((equipo) => ({
    Equipo: equipo.equipo,
    [`Total ${data.anioAnterior}`]: equipo.anterior.total,
    [`Promedio ${data.anioAnterior}`]: equipo.anterior.promedio,
    [`Empleados ${data.anioAnterior}`]: equipo.anterior.empleados,
    [`Total ${data.anioActual}`]: equipo.actual.total,
    [`Promedio ${data.anioActual}`]: equipo.actual.promedio,
    [`Empleados ${data.anioActual}`]: equipo.actual.empleados,
    'Variación %': equipo.variacion,
  }));

  const wsEquipos = XLSX.utils.json_to_sheet(equipoData);
  XLSX.utils.book_append_sheet(workbook, wsEquipos, 'Por equipo');

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const headers = new Headers();
  headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  headers.set('Content-Disposition', `attachment; filename="comparativa_${data.anioAnterior}_${data.anioActual}.xlsx"`);

  return new NextResponse(excelBuffer, { headers });
}

function generarExcelResumen(data: ResumenResultado) {
  const workbook = XLSX.utils.book_new();

  // Hoja 1: Resumen
  const resumenData = [
    { Campo: 'Período', Valor: data.periodo },
    { Campo: 'Total Nóminas', Valor: data.resumen.totalNominas },
    { Campo: 'Total Bruto', Valor: data.resumen.totalBruto },
    { Campo: 'Total Neto', Valor: data.resumen.totalNeto },
    { Campo: 'Total Complementos', Valor: data.resumen.totalComplementos },
    { Campo: 'Total Deducciones', Valor: data.resumen.totalDeducciones },
    { Campo: 'Promedio Neto', Valor: data.resumen.promedioNeto },
  ];

  const wsResumen = XLSX.utils.json_to_sheet(resumenData);
  XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

  // Hoja 2: Por Equipo
  const wsEquipos = XLSX.utils.json_to_sheet(data.equipos);
  XLSX.utils.book_append_sheet(workbook, wsEquipos, 'Equipos');

  // Hoja 3: Complementos
  const wsComp = XLSX.utils.json_to_sheet(data.complementos);
  XLSX.utils.book_append_sheet(workbook, wsComp, 'Complementos');

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const headers = new Headers();
  headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  headers.set('Content-Disposition', `attachment; filename="resumen_${data.periodo.replace('/', '_')}.xlsx"`);

  return new NextResponse(excelBuffer, { headers });
}

function generarExcelEquipos(data: EquiposResultado) {
  const workbook = XLSX.utils.book_new();

  const ws = XLSX.utils.json_to_sheet(data.equipos);
  XLSX.utils.book_append_sheet(workbook, ws, 'Por equipo');

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const headers = new Headers();
  headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  headers.set('Content-Disposition', `attachment; filename="equipos_${data.anio}.xlsx"`);

  return new NextResponse(excelBuffer, { headers });
}

function generarExcelTendencia(data: TendenciaResultado) {
  const workbook = XLSX.utils.book_new();

  const ws = XLSX.utils.json_to_sheet(data.tendencia);
  XLSX.utils.book_append_sheet(workbook, ws, 'Tendencia Mensual');

  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  const headers = new Headers();
  headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  headers.set('Content-Disposition', `attachment; filename="tendencia_${data.anio}.xlsx"`);

  return new NextResponse(excelBuffer, { headers });
}

