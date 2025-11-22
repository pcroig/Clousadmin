// ========================================
// API: Descargar Todas las Nóminas (ZIP)
// ========================================

import { readFile } from 'fs/promises';
import { join } from 'path';

import AdmZip from 'adm-zip';
import { NextRequest, NextResponse } from 'next/server';

import { logAccesoSensibles } from '@/lib/auditoria';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/nominas/descargar-todas?anio=2025
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    // Verificar autenticación
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener empleado del usuario
    const empleado = await prisma.empleado.findUnique({
      where: { usuarioId: session.user.id },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
      },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'No se encontró empleado asociado' },
        { status: 404 }
      );
    }

    // Obtener parámetros
    const searchParams = req.nextUrl.searchParams;
    const anio = searchParams.get('anio')
      ? parseInt(searchParams.get('anio')!)
      : new Date().getFullYear();

    console.log(
      `[API descargar-todas] GET ${anio} para empleado ${empleado.id}`
    );

    // Registrar acceso a datos sensibles (exportación masiva de nóminas)
    await logAccesoSensibles({
      request: req,
      session,
      recurso: 'nominas_zip',
      empleadoAccedidoId: empleado.id,
      accion: 'exportacion',
      camposAccedidos: [`pdfs_año_${anio}`],
    });

    // Obtener nóminas publicadas del año
    const nominas = await prisma.nomina.findMany({
      where: {
        empleadoId: empleado.id,
        anio,
        estado: 'publicada',
      },
      include: {
        documento: true,
      },
      orderBy: [
        { mes: 'asc' },
      ],
    });

    if (nominas.length === 0) {
      return NextResponse.json(
        { error: 'No hay nóminas para este año' },
        { status: 404 }
      );
    }

    // Crear ZIP
    const zip = new AdmZip();

    for (const nomina of nominas) {
      if (!nomina.documento) continue;

      try {
        const fullPath = join(
          process.cwd(),
          'uploads',
          nomina.documento.s3Key
        );
        const fileBuffer = await readFile(fullPath);

        // Agregar al ZIP con nombre descriptivo
        const mesNombre = getMesNombre(nomina.mes);
        const nombreArchivo = `${anio}_${String(nomina.mes).padStart(2, '0')}_${mesNombre}.pdf`;

        zip.addFile(nombreArchivo, fileBuffer);
      } catch (fileError) {
        console.error(
          `[API descargar-todas] Error leyendo archivo ${nomina.documento.nombre}:`,
          fileError
        );
        // Continuar con los demás archivos
      }
    }

    // Generar buffer del ZIP
    const zipBuffer = zip.toBuffer();

    // Nombre del archivo ZIP
    const nombreZip = `Nominas_${empleado.nombre}_${empleado.apellidos}_${anio}.zip`
      .replace(/\s+/g, '_');

    // Retornar ZIP
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${nombreZip}"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[API descargar-todas] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al generar ZIP',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Obtener nombre del mes
 */
function getMesNombre(mes: number): string {
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  return meses[mes - 1] || `Mes_${mes}`;
}






















