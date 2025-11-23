// ========================================
// API: Exportar Evento de Nómina a Excel
// ========================================
// Exporta todas las nóminas de un evento a formato Excel para gestoría

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ========================================
// GET /api/nominas/eventos/[id]/exportar
// ========================================
// Genera un archivo Excel con todas las nóminas del evento
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Solo HR puede exportar
    if (!['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener evento con todas las nóminas
    const evento = await prisma.eventoNomina.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        nominas: {
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                email: true,
                nif: true,
                nss: true,
                telefono: true,
                direccionCalle: true,
                direccionNumero: true,
                direccionPiso: true,
                codigoPostal: true,
                ciudad: true,
                direccionProvincia: true,
                fechaNacimiento: true,
                iban: true,
                titularCuenta: true,
                jornada: {
                  select: {
                    horasSemanales: true,
                  },
                },
              },
            },
            contrato: {
              select: {
                id: true,
                tipoContrato: true,
                fechaInicio: true,
                fechaFin: true,
                salarioBrutoAnual: true,
              },
            },
            complementosAsignados: {
              include: {
                empleadoComplemento: {
                  include: {
                    tipoComplemento: true,
                  },
                },
              },
            },
          },
          orderBy: {
            empleado: {
              apellidos: 'asc',
            },
          },
        },
      },
    });

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    // Verificar que hay nóminas para exportar
    if (evento.nominas.length === 0) {
      return NextResponse.json(
        { error: 'No hay nóminas para exportar' },
        { status: 400 }
      );
    }

    // Preparar datos para Excel
    const datosEmpleados = evento.nominas.map((nomina) => {
      const empleado = nomina.empleado;
      const contrato = nomina.contrato;
      const direccionCompleta = [
        empleado.direccionCalle,
        empleado.direccionNumero,
        empleado.direccionPiso,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

      const horasSemana = empleado.jornada?.horasSemanales
        ? Number(empleado.jornada.horasSemanales)
        : null;

      // Construir columnas de complementos
      const complementos: Record<string, number> = {};
      nomina.complementosAsignados.forEach((asignacion) => {
        const nombreComplemento = asignacion.empleadoComplemento.tipoComplemento.nombre;
        complementos[nombreComplemento] = parseFloat(asignacion.importe.toString());
      });

      return {
        // Datos del empleado
        'NIF/NIE': empleado.nif || '',
        'Nombre': empleado.nombre,
        'Apellidos': empleado.apellidos,
        'Email': empleado.email || '',
        'Teléfono': empleado.telefono || '',
        'Fecha Nacimiento': empleado.fechaNacimiento
          ? empleado.fechaNacimiento.toLocaleDateString('es-ES')
          : '',
        'NSS': empleado.nss || '',
        'IBAN': empleado.iban || '',
        'Titular Cuenta': empleado.titularCuenta || '',

        // Dirección
        'Dirección': direccionCompleta,
        'CP': empleado.codigoPostal || '',
        'Ciudad': empleado.ciudad || '',
        'Provincia': empleado.direccionProvincia || '',

        // Datos del contrato
        'Tipo Contrato': contrato?.tipoContrato || '',
        'Fecha Inicio': contrato?.fechaInicio
          ? contrato.fechaInicio.toLocaleDateString('es-ES')
          : '',
        'Fecha Fin': contrato?.fechaFin
          ? contrato.fechaFin.toLocaleDateString('es-ES')
          : 'Indefinido',
        'Salario Bruto Anual': parseFloat(
          contrato?.salarioBrutoAnual?.toString() || '0'
        ),
        'Horas/Semana': horasSemana ?? '',

        // Datos de la nómina
        'Mes': evento.mes,
        'Año': evento.anio,
        'Días Trabajados': nomina.diasTrabajados || 0,
        'Días Ausencias': nomina.diasAusencias || 0,
        'Salario Base': parseFloat(nomina.salarioBase?.toString() || '0'),
        'Total Complementos': parseFloat(nomina.totalComplementos?.toString() || '0'),
        'Total Deducciones': parseFloat(nomina.totalDeducciones?.toString() || '0'),
        'Total Bruto': parseFloat(nomina.totalBruto?.toString() || '0'),
        'Total Neto': parseFloat(nomina.totalNeto?.toString() || '0'),

        // Complementos individuales (se agregarán dinámicamente)
        ...complementos,
      };
    });

    // Crear hoja de resumen
    const resumen = [
      { Campo: 'Empresa', Valor: session.user.empresaId },
      { Campo: 'Mes', Valor: evento.mes },
      { Campo: 'Año', Valor: evento.anio },
      { Campo: 'Total Empleados', Valor: evento.nominas.length },
      {
        Campo: 'Total Bruto',
        Valor: evento.nominas.reduce(
          (sum, n) => sum + parseFloat(n.totalBruto?.toString() || '0'),
          0
        ),
      },
      {
        Campo: 'Total Complementos',
        Valor: evento.nominas.reduce(
          (sum, n) => sum + parseFloat(n.totalComplementos?.toString() || '0'),
          0
        ),
      },
      { Campo: 'Fecha Exportación', Valor: new Date().toLocaleDateString('es-ES') },
    ];

    // Crear libro de Excel
    const workbook = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const wsResumen = XLSX.utils.json_to_sheet(resumen);
    XLSX.utils.book_append_sheet(workbook, wsResumen, 'Resumen');

    // Hoja 2: Datos completos
    const wsDatos = XLSX.utils.json_to_sheet(datosEmpleados);
    XLSX.utils.book_append_sheet(workbook, wsDatos, 'Nóminas');

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const fechaExportacion = new Date();

    await prisma.nomina.updateMany({
      where: { eventoNominaId: id },
      data: {
        exportadaEn: fechaExportacion,
      },
    });

    await prisma.eventoNomina.update({
      where: { id },
      data: {
        fechaExportacion,
      },
    });

    // Configurar headers para descarga de archivo
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set(
      'Content-Disposition',
      `attachment; filename="nominas_${evento.mes}_${evento.anio}.xlsx"`
    );

    return new NextResponse(excelBuffer, { headers });
  } catch (error) {
    console.error('[GET /api/nominas/eventos/[id]/exportar] Error:', error);
    return NextResponse.json(
      { error: 'Error al exportar nóminas' },
      { status: 500 }
    );
  }
}
