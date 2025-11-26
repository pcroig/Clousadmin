// ========================================
// Export Excel para Gestoría
// ========================================
// Genera archivo Excel con 3 hojas: Resumen, Ausencias, Cambios

import * as XLSX from 'xlsx';

import { EstadoAusencia, EstadoSolicitud } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

import { obtenerResumenesMensuales } from '../calculos/nominas';

import type { Prisma } from '@prisma/client';



/**
 * Genera Excel para gestoría con datos del mes
 */
export async function generarExcelGestoria(
  empresaId: string,
  mes: number,
  anio: number
): Promise<Buffer> {
  console.log(`[generarExcelGestoria] Generando Excel para ${mes}/${anio}`);

  // Crear workbook
  const workbook = XLSX.utils.book_new();

  // === HOJA 1: RESUMEN GENERAL ===
  await agregarHojaResumen(workbook, empresaId, mes, anio);

  // === HOJA 2: AUSENCIAS DETALLE ===
  await agregarHojaAusencias(workbook, empresaId, mes, anio);

  // === HOJA 3: CAMBIOS DEL MES ===
  await agregarHojaCambios(workbook, empresaId, mes, anio);

  // Generar buffer
  const buffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  console.log('[generarExcelGestoria] Excel generado correctamente');

  return buffer;
}

/**
 * Agrega hoja de resumen general
 */
async function agregarHojaResumen(
  workbook: XLSX.WorkBook,
  empresaId: string,
  mes: number,
  anio: number
) {
  // Obtener resúmenes mensuales
  const resumenes = await obtenerResumenesMensuales(empresaId, mes, anio);

  // Obtener datos de empleados
  const empleados = await prisma.empleado.findMany({
    where: {
      empresaId,
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      apellidos: true,
      nif: true,
      nss: true,
      iban: true,
    },
  });

  // Crear map para lookup rápido
  const empleadosMap = new Map(
    empleados.map((e) => [e.id, e])
  );

  // Crear datos para la hoja
  const data: (string | number)[][] = [];

  // Header
  data.push([
    'Empleado',
    'NIF',
    'NSS',
    'IBAN',
    'Salario Base',
    'Días Laborables',
    'Días Trabajados',
    'Vacaciones',
    'Bajas IT',
    'Permisos Retribuidos',
    'Permisos No Retribuidos',
    'Horas Trabajadas',
    'Horas Extras',
  ]);

  // Datos
  for (const resumen of resumenes) {
    const empleado = empleadosMap.get(resumen.empleadoId);
    if (!empleado) continue;

    data.push([
      `${empleado.nombre} ${empleado.apellidos}`,
      empleado.nif || '',
      empleado.nss || '',
      empleado.iban || '',
      resumen.salarioBase || '',
      resumen.diasLaborables,
      resumen.diasTrabajados,
      resumen.diasVacaciones,
      resumen.diasBajaIT,
      resumen.diasPermisosRetribuidos,
      resumen.diasPermisosNoRetribuidos,
      resumen.horasTrabajadas,
      resumen.horasExtras,
    ]);
  }

  // Crear worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Aplicar estilos al header (primera fila)
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    
    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4472C4' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // Ajustar ancho de columnas
  worksheet['!cols'] = [
    { wch: 30 }, // Empleado
    { wch: 12 }, // NIF
    { wch: 15 }, // NSS
    { wch: 30 }, // IBAN
    { wch: 15 }, // Salario
    { wch: 18 }, // Días Laborables
    { wch: 18 }, // Días Trabajados
    { wch: 12 }, // Vacaciones
    { wch: 10 }, // Bajas IT
    { wch: 20 }, // Permisos Retribuidos
    { wch: 22 }, // Permisos No Retribuidos
    { wch: 18 }, // Horas Trabajadas
    { wch: 15 }, // Horas Extras
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumen General');
}

/**
 * Agrega hoja de ausencias detalle
 */
async function agregarHojaAusencias(
  workbook: XLSX.WorkBook,
  empresaId: string,
  mes: number,
  anio: number
) {
  const fechaInicio = new Date(anio, mes - 1, 1);
  const fechaFin = new Date(anio, mes, 0);

  // Obtener todas las ausencias del mes
  const ausencias = await prisma.ausencia.findMany({
    where: {
      empresaId,
      estado: {
        in: [EstadoAusencia.completada, EstadoAusencia.confirmada],
      },
      OR: [
        {
          fechaInicio: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        {
          fechaFin: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        {
          AND: [
            { fechaInicio: { lte: fechaInicio } },
            { fechaFin: { gte: fechaFin } },
          ],
        },
      ],
    },
    include: {
      empleado: {
        select: {
          nombre: true,
          apellidos: true,
        },
      },
    },
    orderBy: {
      fechaInicio: 'asc',
    },
  });

  // Crear datos para la hoja
  const data: (string | number)[][] = [];

  // Header
  data.push([
    'Empleado',
    'Tipo',
    'Fecha Inicio',
    'Fecha Fin',
    'Días',
    'Retribuido',
    'Justificante',
  ]);

  // Datos
  for (const ausencia of ausencias) {
    const tipoTexto = {
      vacaciones: 'Vacaciones',
      enfermedad: 'Enfermedad',
      enfermedad_familiar: 'Enfermedad Familiar',
      maternidad_paternidad: 'Maternidad/Paternidad',
      otro: 'Otro',
    }[ausencia.tipo] || ausencia.tipo;

    const retribuido = ['vacaciones', 'enfermedad_familiar', 'maternidad_paternidad'].includes(
      ausencia.tipo
    )
      ? 'Sí'
      : 'No';

    data.push([
      `${ausencia.empleado.nombre} ${ausencia.empleado.apellidos}`,
      tipoTexto,
      ausencia.fechaInicio.toISOString().split('T')[0],
      ausencia.fechaFin.toISOString().split('T')[0],
      Number(ausencia.diasSolicitados),
      retribuido,
      ausencia.justificanteUrl ? 'Sí' : 'No',
    ]);
  }

  // Crear worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Aplicar estilos al header
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    
    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4472C4' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // Ajustar ancho de columnas
  worksheet['!cols'] = [
    { wch: 30 }, // Empleado
    { wch: 25 }, // Tipo
    { wch: 15 }, // Fecha Inicio
    { wch: 15 }, // Fecha Fin
    { wch: 8 }, // Días
    { wch: 12 }, // Retribuido
    { wch: 15 }, // Justificante
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ausencias Detalle');
}

/**
 * Agrega hoja de cambios del mes
 */
async function agregarHojaCambios(
  workbook: XLSX.WorkBook,
  empresaId: string,
  mes: number,
  anio: number
) {
  const fechaInicio = new Date(anio, mes - 1, 1);
  const fechaFin = new Date(anio, mes, 0, 23, 59, 59);

  // Crear datos para la hoja
  const data: (string | number)[][] = [];

  // Header
  data.push(['Tipo', 'Empleado', 'Fecha', 'Detalle']);

  // 1. ALTAS: Empleados dados de alta en el mes
  const altas = await prisma.empleado.findMany({
    where: {
      empresaId,
      fechaAlta: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    },
    select: {
      nombre: true,
      apellidos: true,
      fechaAlta: true,
      puesto: true,
    },
    orderBy: {
      fechaAlta: 'asc',
    },
  });

  for (const emp of altas) {
    data.push([
      'ALTA',
      `${emp.nombre} ${emp.apellidos}`,
      emp.fechaAlta.toISOString().split('T')[0],
      emp.puesto || 'Sin puesto',
    ]);
  }

  // 2. BAJAS: Empleados dados de baja en el mes
  const bajas = await prisma.empleado.findMany({
    where: {
      empresaId,
      fechaBaja: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    },
    select: {
      nombre: true,
      apellidos: true,
      fechaBaja: true,
      puesto: true,
    },
    orderBy: {
      fechaBaja: 'asc',
    },
  });

  for (const emp of bajas) {
    data.push([
      'BAJA',
      `${emp.nombre} ${emp.apellidos}`,
      emp.fechaBaja!.toISOString().split('T')[0],
      emp.puesto || 'Sin puesto',
    ]);
  }

  // 3. CAMBIOS SALARIALES: Solicitudes de cambio de datos bancarios/salario aprobadas
  const cambiosSalarioQuery = {
    where: {
      empresaId,
      estado: {
        in: [EstadoSolicitud.aprobada_manual, EstadoSolicitud.auto_aprobada],
      },
      fechaRespuesta: {
        gte: fechaInicio,
        lte: fechaFin,
      },
      tipo: {
        in: ['datos_bancarios', 'datos_personales'],
      },
    },
    include: {
      empleado: {
        select: {
          nombre: true,
          apellidos: true,
        },
      },
    },
    orderBy: {
      fechaRespuesta: 'asc',
    },
  } satisfies Prisma.SolicitudCambioFindManyArgs;

  const cambiosSalario = await prisma.solicitudCambio.findMany(cambiosSalarioQuery);

  for (const cambio of cambiosSalario) {
    const campos = cambio.camposCambiados as Record<string, unknown>;
    let detalle = '';

    if (campos.iban) {
      detalle = `Cambio IBAN: ${campos.iban}`;
    } else if (campos.salario) {
      detalle = `Cambio salario: ${campos.salario}`;
    } else {
      detalle = 'Cambio de datos';
    }

    data.push([
      'CAMBIO DATOS',
      `${cambio.empleado.nombre} ${cambio.empleado.apellidos}`,
      cambio.fechaRespuesta!.toISOString().split('T')[0],
      detalle,
    ]);
  }

  // Si no hay cambios, agregar mensaje
  if (data.length === 1) {
    data.push(['', 'Sin cambios registrados en este mes', '', '']);
  }

  // Crear worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Aplicar estilos al header
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!worksheet[cellAddress]) continue;
    
    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '4472C4' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // Ajustar ancho de columnas
  worksheet['!cols'] = [
    { wch: 15 }, // Tipo
    { wch: 30 }, // Empleado
    { wch: 15 }, // Fecha
    { wch: 40 }, // Detalle
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cambios del Mes');
}

/**
 * Guarda el export en la base de datos y retorna la info
 */
export async function guardarExportGestoria(
  empresaId: string,
  mes: number,
  anio: number,
  archivoUrl: string,
  archivoNombre: string,
  generadoPor: string
): Promise<void> {
  // Contar empleados y alertas
  const numEmpleados = await prisma.empleado.count({
    where: {
      empresaId,
      activo: true,
    },
  });

  const numAlertasCriticas = await prisma.alertaNomina.count({
    where: {
      empresaId,
      tipo: 'critico',
      resuelta: false,
      createdAt: {
        gte: new Date(anio, mes - 1, 1),
        lte: new Date(anio, mes, 0, 23, 59, 59),
      },
    },
  });

  await prisma.exportGestoria.create({
    data: {
      empresaId,
      mes,
      anio,
      archivoUrl,
      archivoNombre,
      generadoPor,
      numEmpleados,
      numAlertasCriticas,
    },
  });

  console.log(
    `[guardarExportGestoria] Export guardado: ${numEmpleados} empleados, ${numAlertasCriticas} alertas críticas`
  );
}











