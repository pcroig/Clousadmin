// ========================================
// API: Analytics de Nóminas
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const anio = parseInt(searchParams.get('anio') || new Date().getFullYear().toString());

    // Obtener todas las nóminas del año de la empresa
    const nominas = await prisma.nomina.findMany({
      where: {
        anio,
        empleado: {
          empresaId: session.user.empresaId,
        },
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

    // Cálculo de métricas generales
    const totalBruto = nominas.reduce((sum, n) => sum + Number(n.totalBruto), 0);
    const totalNeto = nominas.reduce((sum, n) => sum + Number(n.totalNeto), 0);
    const totalComplementos = nominas.reduce((sum, n) => sum + Number(n.totalComplementos), 0);

    const empleadosUnicos = new Set(nominas.map(n => n.empleadoId)).size;
    const promedioNeto = empleadosUnicos > 0 ? totalNeto / empleadosUnicos : 0;

    // Distribución por equipo
    const porEquipo: Record<string, { total: number; count: number }> = {};

    const getEquipos = (empleado: typeof nominas[number]['empleado']) => {
      const relaciones = empleado.equipos ?? [];
      const nombres = relaciones
        .map((rel) => rel.equipo?.nombre)
        .filter((nombre): nombre is string => Boolean(nombre));
      return nombres.length > 0 ? nombres : ['Sin equipo'];
    };

    nominas.forEach((nomina) => {
      const equipos = getEquipos(nomina.empleado);
      equipos.forEach((equipo) => {
        if (!porEquipo[equipo]) {
          porEquipo[equipo] = { total: 0, count: 0 };
        }
        porEquipo[equipo].total += Number(nomina.totalNeto);
        porEquipo[equipo].count += 1;
      });
    });

    const distribucionEquipos = Object.entries(porEquipo).map(([nombre, data]) => ({
      equipo: nombre,
      total: data.total,
      promedio: data.count > 0 ? data.total / data.count : 0,
      empleados: data.count,
    }));

    // Tendencia mensual
    const porMes: Record<number, { bruto: number; neto: number; complementos: number; count: number }> = {};

    for (let mes = 1; mes <= 12; mes++) {
      porMes[mes] = { bruto: 0, neto: 0, complementos: 0, count: 0 };
    }

    nominas.forEach(nomina => {
      if (!porMes[nomina.mes]) {
        porMes[nomina.mes] = { bruto: 0, neto: 0, complementos: 0, count: 0 };
      }
      porMes[nomina.mes].bruto += Number(nomina.totalBruto);
      porMes[nomina.mes].neto += Number(nomina.totalNeto);
      porMes[nomina.mes].complementos += Number(nomina.totalComplementos);
      porMes[nomina.mes].count += 1;
    });

    const tendenciaMensual = Object.entries(porMes).map(([mes, data]) => ({
      mes: parseInt(mes),
      totalBruto: data.bruto,
      totalNeto: data.neto,
      totalComplementos: data.complementos,
      numeroNominas: data.count,
    }));

    // Comparación con año anterior (opcional)
    const nominasAnioAnterior = await prisma.nomina.findMany({
      where: {
        anio: anio - 1,
        empleado: {
          empresaId: session.user.empresaId,
        },
      },
      select: {
        totalNeto: true,
      },
    });

    const totalNetoAnioAnterior = nominasAnioAnterior.reduce(
      (sum, n) => sum + Number(n.totalNeto),
      0
    );

    const variacionAnioAnterior =
      totalNetoAnioAnterior > 0
        ? ((totalNeto - totalNetoAnioAnterior) / totalNetoAnioAnterior) * 100
        : 0;

    // ========================================
    // NUEVOS REPORTES AVANZADOS
    // ========================================

    // 1. Distribución Salarial Detallada (percentiles y rangos)
    const salariosNetos = nominas.map((n) => Number(n.totalNeto)).sort((a, b) => a - b);
    const calcularPercentil = (arr: number[], percentil: number) => {
      const index = Math.ceil((percentil / 100) * arr.length) - 1;
      return arr[index] || 0;
    };

    const distribucionSalarial = {
      min: salariosNetos[0] || 0,
      p10: calcularPercentil(salariosNetos, 10),
      p25: calcularPercentil(salariosNetos, 25),
      mediana: calcularPercentil(salariosNetos, 50),
      p75: calcularPercentil(salariosNetos, 75),
      p90: calcularPercentil(salariosNetos, 90),
      max: salariosNetos[salariosNetos.length - 1] || 0,
      promedio: salariosNetos.length > 0
        ? salariosNetos.reduce((a, b) => a + b, 0) / salariosNetos.length
        : 0,
    };

    // Rangos salariales (agrupar en rangos de 10k)
    const rangosSalariales: Record<string, number> = {};
    salariosNetos.forEach((salario) => {
      const rango = Math.floor(salario / 10000) * 10000;
      const rangoLabel = `${rango}-${rango + 10000}€`;
      rangosSalariales[rangoLabel] = (rangosSalariales[rangoLabel] || 0) + 1;
    });

    const distribucionPorRango = Object.entries(rangosSalariales)
      .map(([rango, cantidad]) => ({
        rango,
        cantidad,
      }))
      .sort((a, b) => {
        const aNum = parseInt(a.rango.split('-')[0]);
        const bNum = parseInt(b.rango.split('-')[0]);
        return aNum - bNum;
      });

    // 2. Análisis por Puesto (extraído del contrato)
    const porPuesto: Record<string, { total: number; count: number; salarios: number[] }> = {};

    for (const nomina of nominas) {
      const empleadoContrato = await prisma.contrato.findFirst({
        where: {
          empleadoId: nomina.empleadoId,
          OR: [
            { fechaFin: null },
            { fechaFin: { gte: new Date(nomina.anio, nomina.mes - 1, 1) } },
          ],
        },
        select: {
          puesto: true,
        },
      });

      const puesto = empleadoContrato?.puesto || 'Sin puesto definido';

      if (!porPuesto[puesto]) {
        porPuesto[puesto] = { total: 0, count: 0, salarios: [] };
      }

      porPuesto[puesto].total += Number(nomina.totalNeto);
      porPuesto[puesto].count += 1;
      porPuesto[puesto].salarios.push(Number(nomina.totalNeto));
    }

    const distribucionPorPuesto = Object.entries(porPuesto).map(([puesto, data]) => {
      const salariosOrdenados = data.salarios.sort((a, b) => a - b);
      return {
        puesto,
        total: data.total,
        promedio: data.count > 0 ? data.total / data.count : 0,
        empleados: data.count,
        min: salariosOrdenados[0] || 0,
        max: salariosOrdenados[salariosOrdenados.length - 1] || 0,
        mediana: calcularPercentil(salariosOrdenados, 50),
      };
    }).sort((a, b) => b.total - a.total);

    // 3. Análisis de Complementos
    const complementosStats: Record<string, { count: number; totalImporte: number }> = {};

    for (const nomina of nominas) {
      const complementos = await prisma.asignacionComplemento.findMany({
        where: { nominaId: nomina.id },
        include: {
          empleadoComplemento: {
            include: {
              tipoComplemento: true,
            },
          },
        },
      });

      complementos.forEach((comp) => {
        const nombre = comp.empleadoComplemento.tipoComplemento.nombre;
        if (!complementosStats[nombre]) {
          complementosStats[nombre] = { count: 0, totalImporte: 0 };
        }
        complementosStats[nombre].count += 1;
        complementosStats[nombre].totalImporte += Number(comp.importe);
      });
    }

    const complementosMasComunes = Object.entries(complementosStats)
      .map(([nombre, data]) => ({
        nombre,
        vecesAsignado: data.count,
        totalImporte: data.totalImporte,
        importePromedio: data.count > 0 ? data.totalImporte / data.count : 0,
      }))
      .sort((a, b) => b.vecesAsignado - a.vecesAsignado)
      .slice(0, 10); // Top 10 complementos

    // 4. Comparativa detallada entre equipos
    const equiposDetallados = distribucionEquipos.map((infoEquipo) => {
      const nominasEquipo = nominas.filter((nomina) => {
        const equipos = getEquipos(nomina.empleado);
        return equipos.includes(infoEquipo.equipo);
      });

      const salariosNeto = nominasEquipo.map((n) => Number(n.totalNeto)).sort((a, b) => a - b);

      return {
        equipo: infoEquipo.equipo,
        total: infoEquipo.total,
        promedio: infoEquipo.promedio,
        empleados: infoEquipo.empleados,
        min: salariosNeto[0] || 0,
        max: salariosNeto[salariosNeto.length - 1] || 0,
        mediana: calcularPercentil(salariosNeto, 50),
        complementosPromedio:
          nominasEquipo.reduce((sum, n) => sum + Number(n.totalComplementos), 0) /
          (nominasEquipo.length || 1),
      };
    });

    return NextResponse.json({
      anio,
      resumen: {
        totalBruto,
        totalNeto,
        totalComplementos,
        empleadosUnicos,
        promedioNeto,
        variacionAnioAnterior: Math.round(variacionAnioAnterior * 100) / 100,
      },
      distribucionEquipos,
      equiposDetallados,
      tendenciaMensual,
      // NUEVOS REPORTES
      distribucionSalarial,
      distribucionPorRango,
      distribucionPorPuesto,
      complementosMasComunes,
    });
  } catch (error) {
    console.error('[GET /api/nominas/analytics] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener analytics de nóminas' },
      { status: 500 }
    );
  }
}
