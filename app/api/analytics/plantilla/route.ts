// ========================================
// API: Analytics - Métricas de Plantilla
// ========================================
// GET: Obtener métricas de plantilla (headcount, evolución, distribución)

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

// GET /api/analytics/plantilla - Obtener métricas de plantilla (solo HR Admin)
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

    // Si hay filtro de equipo, filtrar por relación EmpleadoEquipo
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
      },
    });

    // Filtrar por antigüedad si aplica
    if (antiguedad && antiguedad !== 'todos') {
      empleados = empleados.filter(
        (e) => calcularAntiguedad(e.fechaAlta) === antiguedad
      );
    }

    // 1. Total empleados
    const totalEmpleados = empleados.length;

    // 2. Cambio respecto mes anterior
    const mesAnterior = new Date();
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);
    mesAnterior.setHours(0, 0, 0, 0);

    const empleadosMesAnterior = await prisma.empleado.count({
      where: {
        ...where,
        fechaAlta: { lte: mesAnterior },
        OR: [{ fechaBaja: null }, { fechaBaja: { gt: mesAnterior } }],
      },
    });

    const cambioMes = totalEmpleados - empleadosMesAnterior;

    // 3. Empleados por equipo
    const equiposCount: Record<string, number> = {};

    empleados.forEach((emp) => {
      if (emp.equipos.length === 0) {
        equiposCount['Sin equipo'] = (equiposCount['Sin equipo'] || 0) + 1;
      } else {
        emp.equipos.forEach((eq) => {
          const nombreEquipo = eq.equipo.nombre;
          equiposCount[nombreEquipo] = (equiposCount[nombreEquipo] || 0) + 1;
        });
      }
    });

    const porEquipo = Object.entries(equiposCount).map(([equipo, count]) => ({
      equipo,
      empleados: count,
    }));

    // 4. Evolución plantilla (últimos 12 meses)
    const evolucionPlantilla = [];
    for (let i = 11; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      fecha.setDate(1);
      fecha.setHours(0, 0, 0, 0);

      const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

      const count = await prisma.empleado.count({
        where: {
          empresaId: session.user.empresaId,
          fechaAlta: { lte: finMes },
          OR: [{ fechaBaja: null }, { fechaBaja: { gt: finMes } }],
        },
      });

      evolucionPlantilla.push({
        mes: fecha.toLocaleDateString('es-ES', {
          month: 'short',
          year: 'numeric',
        }),
        empleados: count,
      });
    }

    // 5. Altas y bajas del mes actual
    const inicioMesActual = new Date();
    inicioMesActual.setDate(1);
    inicioMesActual.setHours(0, 0, 0, 0);

    const altasMes = await prisma.empleado.count({
      where: {
        empresaId: session.user.empresaId,
        fechaAlta: { gte: inicioMesActual },
      },
    });

    const bajasMes = await prisma.empleado.count({
      where: {
        empresaId: session.user.empresaId,
        fechaBaja: { gte: inicioMesActual },
      },
    });

    // 6. Distribución por género
    const porGenero = empleados.reduce((acc: any, e) => {
      const gen = e.genero || 'No especificado';
      acc[gen] = (acc[gen] || 0) + 1;
      return acc;
    }, {});

    const distribucionGenero = Object.entries(porGenero).map(
      ([genero, count]) => ({
        genero,
        empleados: count,
      })
    );

    // 7. Evolución de altas y bajas (últimos 6 meses)
    const evolucionAltasBajas = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
      const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

      const altas = await prisma.empleado.count({
        where: {
          empresaId: session.user.empresaId,
          fechaAlta: {
            gte: inicioMes,
            lte: finMes,
          },
        },
      });

      const bajas = await prisma.empleado.count({
        where: {
          empresaId: session.user.empresaId,
          fechaBaja: {
            gte: inicioMes,
            lte: finMes,
          },
        },
      });

      evolucionAltasBajas.push({
        mes: fecha.toLocaleDateString('es-ES', {
          month: 'short',
          year: 'numeric',
        }),
        altas,
        bajas,
      });
    }

    return successResponse({
      totalEmpleados,
      cambioMes,
      porEquipo,
      evolucionPlantilla,
      altasMes,
      bajasMes,
      distribucionGenero,
      evolucionAltasBajas,
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/analytics/plantilla');
  }
}
