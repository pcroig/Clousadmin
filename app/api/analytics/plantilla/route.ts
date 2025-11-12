// ========================================
// API: Analytics - Métricas de Plantilla
// ========================================
// GET: Obtener métricas de plantilla (headcount, evolución, distribución)

import { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  handleApiError,
  successResponse,
} from '@/lib/api-handler';
import { obtenerRangoFechaAntiguedad } from '@/lib/calculos/antiguedad';

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
    const where: Prisma.EmpleadoWhereInput = {
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

    // Aplicar filtro de antigüedad en BD (no en memoria)
    if (antiguedad && antiguedad !== 'todos') {
      const rangoFecha = obtenerRangoFechaAntiguedad(antiguedad);
      if (rangoFecha) {
        where.fechaAlta = rangoFecha;
      }
    }

    // Obtener empleados con equipos
    const empleados = await prisma.empleado.findMany({
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
    // Optimización: Cargar todos los empleados una vez y calcular en memoria
    const todosEmpleados = await prisma.empleado.findMany({
      where: {
        empresaId: session.user.empresaId,
      },
      select: {
        fechaAlta: true,
        fechaBaja: true,
      },
    });

    const evolucionPlantilla = [];
    for (let i = 11; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      fecha.setDate(1);
      fecha.setHours(0, 0, 0, 0);

      const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

      // Calcular en memoria
      const count = todosEmpleados.filter((emp) => {
        const altaAntes = emp.fechaAlta <= finMes;
        const sinBajaOBajaDespues = !emp.fechaBaja || emp.fechaBaja > finMes;
        return altaAntes && sinBajaOBajaDespues;
      }).length;

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
    const porGenero = empleados.reduce((acc: Record<string, number>, e) => {
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
    // Optimización: Usar todosEmpleados ya cargado y calcular en memoria
    const evolucionAltasBajas = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
      const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

      // Calcular en memoria
      const altas = todosEmpleados.filter((emp) => {
        return emp.fechaAlta >= inicioMes && emp.fechaAlta <= finMes;
      }).length;

      const bajas = todosEmpleados.filter((emp) => {
        return emp.fechaBaja && emp.fechaBaja >= inicioMes && emp.fechaBaja <= finMes;
      }).length;

      evolucionAltasBajas.push({
        mes: fecha.toLocaleDateString('es-ES', {
          month: 'short',
          year: 'numeric',
        }),
        altas,
        bajas,
      });
    }

    // 7. Distribución por antigüedad
    const hoy = new Date();
    const distribucionAntiguedad = empleados.reduce<Record<string, number>>(
      (acc, emp) => {
        const antiguedadAnios = Math.floor(
          (hoy.getTime() - emp.fechaAlta.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
        );

        let rango: string;
        if (antiguedadAnios < 1) {
          rango = '< 1 año';
        } else if (antiguedadAnios < 3) {
          rango = '1-3 años';
        } else if (antiguedadAnios < 5) {
          rango = '3-5 años';
        } else {
          rango = '> 5 años';
        }

        acc[rango] = (acc[rango] || 0) + 1;
        return acc;
      },
      { '< 1 año': 0, '1-3 años': 0, '3-5 años': 0, '> 5 años': 0 }
    );

    const distribucionAntiguedadArray = Object.entries(distribucionAntiguedad).map(
      ([rango, empleados]) => ({
        rango,
        empleados,
      })
    );

    return successResponse({
      totalEmpleados,
      cambioMes,
      porEquipo,
      evolucionPlantilla,
      altasMes,
      bajasMes,
      distribucionGenero,
      evolucionAltasBajas,
      distribucionAntiguedad: distribucionAntiguedadArray,
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/analytics/plantilla');
  }
}
