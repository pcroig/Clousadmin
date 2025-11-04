// ========================================
// API: Analytics - Métricas de Compensación
// ========================================
// GET: Obtener métricas de compensación (costes, salarios, distribución)

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
    const where: any = {
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

    return successResponse({
      costeTotalNomina: Math.round(costeTotalNomina),
      cambioCoste: Math.round(cambioCoste),
      salarioPromedio: Math.round(salarioPromedio),
      salarioPromedioEquipo,
      evolucionCoste,
      distribucionSalarial,
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/analytics/compensacion');
  }
}
