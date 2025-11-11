// ========================================
// API: Resumen Mensual de Nóminas
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  obtenerResumenesMensuales,
  calcularResumenMensualEmpresa,
} from '@/lib/calculos/nominas';
import { prisma } from '@/lib/prisma';

import { UsuarioRol } from '@/lib/constants/enums';

// GET /api/nominas/resumen-mensual?mes=X&anio=Y&recalcular=true
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    // Verificar autenticación y rol
    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Obtener parámetros
    const searchParams = req.nextUrl.searchParams;
    const mes = parseInt(searchParams.get('mes') || '');
    const anio = parseInt(searchParams.get('anio') || '');
    const recalcular = searchParams.get('recalcular') === 'true';

    // Validar parámetros
    if (!mes || !anio || mes < 1 || mes > 12 || anio < 2000) {
      return NextResponse.json(
        { error: 'Parámetros inválidos. Usar: ?mes=X&anio=Y' },
        { status: 400 }
      );
    }

    console.log(
      `[API resumen-mensual] GET ${mes}/${anio}, recalcular=${recalcular}`
    );

    // Si se pide recalcular, calcular para toda la empresa
    if (recalcular) {
      await calcularResumenMensualEmpresa(session.user.empresaId, mes, anio);
    }

    // Obtener resúmenes
    const resumenes = await obtenerResumenesMensuales(
      session.user.empresaId,
      mes,
      anio
    );

    // Obtener datos de empleados
    const empleadosIds = resumenes.map((r) => r.empleadoId);
    const empleados = await prisma.empleado.findMany({
      where: {
        id: {
          in: empleadosIds,
        },
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        puesto: true,
        equipos: {
          include: {
            equipo: {
              select: {
                nombre: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    // Crear map para lookup
    const empleadosMap = new Map(empleados.map((e) => [e.id, e]));

    // Combinar datos
    const result = resumenes.map((resumen) => {
      const empleado = empleadosMap.get(resumen.empleadoId);
      return {
        ...resumen,
        empleado: empleado
          ? {
              nombre: `${empleado.nombre} ${empleado.apellidos}`,
              puesto: empleado.puesto || 'Sin puesto',
              equipo: empleado.equipos[0]?.equipo.nombre || 'Sin equipo',
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      mes,
      anio,
      total: result.length,
      resumenes: result,
    });
  } catch (error) {
    console.error('[API resumen-mensual] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener resumen mensual',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}













