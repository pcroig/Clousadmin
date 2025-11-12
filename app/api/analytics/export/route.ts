// ========================================
// API: Analytics - Exportar a Excel
// ========================================
// GET: Exportar datos de analytics a archivo Excel

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  handleApiError,
} from '@/lib/api-handler';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// Función auxiliar para calcular antigüedad
function calcularAntiguedad(fechaAlta: Date): string {
  const hoy = new Date();
  const mesesAntiguedad =
    (hoy.getFullYear() - fechaAlta.getFullYear()) * 12 +
    (hoy.getMonth() - fechaAlta.getMonth());

  if (mesesAntiguedad < 6) return '< 6 meses';
  if (mesesAntiguedad < 12) return '6-12 meses';
  if (mesesAntiguedad < 36) return '1-3 años';
  if (mesesAntiguedad < 60) return '3-5 años';
  return '> 5 años';
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
    const equipo = searchParams.get('equipo');
    const antiguedad = searchParams.get('antiguedad');

    // Construir filtros base
    const where: any = {
      empresaId: session.user.empresaId,
      estadoEmpleado: 'activo',
    };

    if (genero && genero !== 'todos') {
      where.genero = genero;
    }

    // Obtener empleados con todos los datos necesarios
    let empleados = await prisma.empleado.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        email: true,
        genero: true,
        fechaAlta: true,
        salarioBrutoMensual: true,
        salarioBrutoAnual: true,
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

    // Filtrar por equipo si aplica
    if (equipo && equipo !== 'todos') {
      empleados = empleados.filter((e) =>
        e.equipos.some((eq) => eq.equipo?.nombre === equipo)
      );
    }

    // Filtrar por antigüedad si aplica
    if (antiguedad && antiguedad !== 'todos') {
      empleados = empleados.filter(
        (e) => calcularAntiguedad(e.fechaAlta) === antiguedad
      );
    }

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
      ['Equipo:', equipo || 'Todos'],
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
      Antigüedad: calcularAntiguedad(e.fechaAlta),
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
      'Salario Bruto Mensual': e.salarioBrutoMensual
        ? `${Number(e.salarioBrutoMensual).toFixed(2)}€`
        : 'N/A',
      'Salario Bruto Anual': e.salarioBrutoAnual
        ? `${Number(e.salarioBrutoAnual).toFixed(2)}€`
        : e.salarioBrutoMensual
        ? `${(Number(e.salarioBrutoMensual) * 12).toFixed(2)}€`
        : 'N/A',
    }));

    const wsCompensacion = XLSX.utils.json_to_sheet(compensacionData);

    wsCompensacion['!cols'] = [
      { wch: 15 }, // Nombre
      { wch: 20 }, // Apellidos
      { wch: 20 }, // Equipos
      { wch: 20 }, // Salario Bruto Mensual
      { wch: 20 }, // Salario Bruto Anual
    ];

    XLSX.utils.book_append_sheet(workbook, wsCompensacion, 'Compensación');

    // ====================================
    // Hoja 4: Fichajes (resumen mensual)
    // ====================================
    const empleadoIds = empleados.map((e) => e.id);

    const hoy = new Date();
    const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMesActual = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    const fichajesMes = await prisma.fichaje.findMany({
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
  } catch (error) {
    // Para exportación de archivos, devolver error JSON
    return NextResponse.json(
      { error: 'Error al exportar datos' },
      { status: 500 }
    );
  }
}
