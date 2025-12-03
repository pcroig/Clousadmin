// ========================================
// API: Analytics - Exportar a Excel
// ========================================
// GET: Exportar datos de analytics a archivo Excel

import { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import {
  requireAuthAsHR,
} from '@/lib/api-handler';
import { calcularAntiguedad, obtenerRangoFechaAntiguedad } from '@/lib/calculos/antiguedad';
import { EstadoFichaje } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { obtenerInicioMesActual, obtenerFinMesActual } from '@/lib/utils/fechas';

import type { Prisma } from '@prisma/client';

// Función helper para formatear antigüedad a label
function formatearAntiguedad(fechaAlta: Date): string {
  const rango = calcularAntiguedad(fechaAlta);
  const labels: Record<string, string> = {
    'menos_6_meses': '< 6 meses',
    '6_12_meses': '6-12 meses',
    '1_3_años': '1-3 años',
    '3_5_años': '3-5 años',
    'mas_5_años': '> 5 años',
  };
  return labels[rango] || rango;
}

// GET /api/analytics/export - Exportar datos a Excel (solo HR Admin)
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

    // Construir filtros base (igual que en otros endpoints)
    const where: Prisma.empleadosWhereInput = {
      empresaId: session.user.empresaId,
      estadoEmpleado: 'activo',
    };

    if (genero && genero !== 'todos') {
      where.genero = genero;
    }

    // Filtrar por equipo en BD
    if (equipoId && equipoId !== 'todos') {
      where.equipos = {
        some: {
          equipoId: equipoId,
        },
      };
    }

    // Filtrar por antigüedad en BD
    if (antiguedad && antiguedad !== 'todos') {
      const rangoFecha = obtenerRangoFechaAntiguedad(antiguedad);
      if (rangoFecha) {
        where.fechaAlta = rangoFecha;
      }
    }

    // Obtener empleados con filtros aplicados en BD
    const empleados = await prisma.empleados.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        genero: true,
        fechaAlta: true,
        salarioBaseMensual: true,
        salarioBaseAnual: true,
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
    });

    const equiposToLabel = (equipos: Array<{ equipo: { nombre: string } | null }>) => {
      const nombres = equipos
        .map((eq) => eq.equipo?.nombre)
        .filter((nombre): nombre is string => Boolean(nombre));
      return nombres.length > 0 ? nombres.join(', ') : 'Sin equipo';
    };

    // Crear workbook
    const workbook = XLSX.utils.book_new();

    // ====================================
    // Hoja 1: Información General
    // ====================================
    const hojaInfo = [
      ['Informe de Analytics'],
      ['Fecha de generación:', new Date().toLocaleDateString('es-ES')],
      [''],
      ['Filtros aplicados:'],
      ['Género:', genero || 'Todos'],
      ['Equipo ID:', equipoId || 'Todos'],
      ['Antigüedad:', antiguedad || 'Todos'],
      [''],
      ['Total empleados:', empleados.length],
    ];

    const wsInfo = XLSX.utils.aoa_to_sheet(hojaInfo);
    XLSX.utils.book_append_sheet(workbook, wsInfo, 'Info');

    // ====================================
    // Hoja 2: Plantilla
    // ====================================
    const plantillaData = empleados.map((e) => ({
      Nombre: e.nombre,
      Apellidos: e.apellidos,
      Email: e.email,
      Equipos: equiposToLabel(e.equipos),
      Género: e.genero || 'No especificado',
      'Fecha Alta': e.fechaAlta.toLocaleDateString('es-ES'),
      Antigüedad: formatearAntiguedad(e.fechaAlta),
    }));

    const wsPlantilla = XLSX.utils.json_to_sheet(plantillaData);

    // Ajustar anchos de columnas
    wsPlantilla['!cols'] = [
      { wch: 15 }, // Nombre
      { wch: 20 }, // Apellidos
      { wch: 30 }, // Email
      { wch: 20 }, // Equipos
      { wch: 15 }, // Género
      { wch: 12 }, // Fecha Alta
      { wch: 15 }, // Antigüedad
    ];

    XLSX.utils.book_append_sheet(workbook, wsPlantilla, 'Plantilla');

    // ====================================
    // Hoja 3: Compensación
    // ====================================
    const compensacionData = empleados.map((e) => ({
      Nombre: e.nombre,
      Apellidos: e.apellidos,
      Equipos: equiposToLabel(e.equipos),
      'Salario Base Mensual': e.salarioBaseMensual
        ? `${Number(e.salarioBaseMensual).toFixed(2)}€`
        : 'N/A',
      'Salario Base Anual': e.salarioBaseAnual
        ? `${Number(e.salarioBaseAnual).toFixed(2)}€`
        : e.salarioBaseMensual
        ? `${(Number(e.salarioBaseMensual) * 12).toFixed(2)}€`
        : 'N/A',
    }));

    const wsCompensacion = XLSX.utils.json_to_sheet(compensacionData);

    wsCompensacion['!cols'] = [
      { wch: 15 }, // Nombre
      { wch: 20 }, // Apellidos
      { wch: 20 }, // Equipos
      { wch: 20 }, // Salario Base Mensual
      { wch: 20 }, // Salario Base Anual
    ];

    XLSX.utils.book_append_sheet(workbook, wsCompensacion, 'Compensación');

    // ====================================
    // Hoja 4: Fichajes (resumen mensual)
    // ====================================
    const empleadoIds = empleados.map((e) => e.id);

    // FIX: Usar helpers que respetan zona horaria Madrid
    const inicioMesActual = obtenerInicioMesActual();
    const finMesActual = obtenerFinMesActual();

    const fichajesMes = await prisma.fichajes.findMany({
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
        empleadoId: true,
        horasTrabajadas: true,
        horasEnPausa: true,
      },
    });

    const fichajesPorEmpleado = empleados.map((e) => {
      const fichajesEmpleado = fichajesMes.filter((f) => f.empleadoId === e.id);
      const totalHoras = fichajesEmpleado.reduce(
        (sum, f) => sum + Number(f.horasTrabajadas || 0),
        0
      );
      const totalPausas = fichajesEmpleado.reduce(
        (sum, f) => sum + Number(f.horasEnPausa || 0),
        0
      );

      return {
        Nombre: e.nombre,
        Apellidos: e.apellidos,
        Equipos: equiposToLabel(e.equipos),
        'Horas Trabajadas Mes': totalHoras.toFixed(2),
        'Horas en Pausa': totalPausas.toFixed(2),
        'Días Registrados': fichajesEmpleado.length,
      };
    });

    const wsFichajes = XLSX.utils.json_to_sheet(fichajesPorEmpleado);

    wsFichajes['!cols'] = [
      { wch: 15 }, // Nombre
      { wch: 20 }, // Apellidos
      { wch: 20 }, // Equipos
      { wch: 20 }, // Horas Trabajadas Mes
      { wch: 15 }, // Horas en Pausa
      { wch: 18 }, // Días Registrados
    ];

    XLSX.utils.book_append_sheet(workbook, wsFichajes, 'Fichajes');

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    });

    // Crear response con el archivo
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="analytics_${
          new Date().toISOString().split('T')[0]
        }.xlsx"`,
      },
    });
  } catch {
    // Para exportación de archivos, devolver error JSON
    return NextResponse.json(
      { error: 'Error al exportar datos' },
      { status: 500 }
    );
  }
}
