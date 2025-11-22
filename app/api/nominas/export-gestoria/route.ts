// ========================================
// API: Export Excel para Gestoría
// ========================================

import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { generarExcelGestoria, guardarExportGestoria } from '@/lib/exports/excel-gestoria';
import { shouldUseCloudStorage, uploadToS3 } from '@/lib/s3';
import { tieneAlertasCriticas } from '@/lib/validaciones/nominas';


// GET /api/nominas/export-gestoria?mes=X&anio=Y
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
    const forzar = searchParams.get('forzar') === 'true';

    // Validar parámetros
    if (!mes || !anio || mes < 1 || mes > 12 || anio < 2000) {
      return NextResponse.json(
        { error: 'Parámetros inválidos. Usar: ?mes=X&anio=Y' },
        { status: 400 }
      );
    }

    console.log(
      `[API export-gestoria] GET ${mes}/${anio}, forzar=${forzar}`
    );

    // Verificar alertas críticas (a menos que se fuerce el export)
    if (!forzar) {
      const hayAlertasCriticas = await tieneAlertasCriticas(
        session.user.empresaId,
        mes,
        anio
      );

      if (hayAlertasCriticas) {
        return NextResponse.json(
          {
            error: 'No se puede exportar. Hay alertas críticas sin resolver.',
            code: 'ALERTAS_CRITICAS',
          },
          { status: 400 }
        );
      }
    }

    // Generar Excel
    const buffer = await generarExcelGestoria(
      session.user.empresaId,
      mes,
      anio
    );

    // Guardar archivo (S3 o filesystem para tracking)
    const nombreArchivo = `nominas_${session.user.empresaId}_${anio}_${String(mes).padStart(2, '0')}.xlsx`;
    const rutaArchivo = `exports/${session.user.empresaId}/${nombreArchivo}`;
    let archivoReferencia = rutaArchivo;

    if (shouldUseCloudStorage()) {
      const bucketName = process.env.STORAGE_BUCKET;
      if (!bucketName) {
        throw new Error('STORAGE_BUCKET no configurado');
      }
      const s3Key = `exports/${rutaArchivo}`;
      archivoReferencia = await uploadToS3(
        buffer,
        s3Key,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    } else {
    const fullPath = join(process.cwd(), 'uploads', rutaArchivo);
    try {
      await mkdir(dirname(fullPath), { recursive: true });
      await writeFile(fullPath, buffer);
      } catch (saveError) {
        console.error('[API export-gestoria] Error guardando archivo:', saveError);
      }
    }

      await guardarExportGestoria(
        session.user.empresaId,
        mes,
        anio,
      archivoReferencia,
        nombreArchivo,
        session.user.id
      );

    // Retornar archivo para descarga
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('[API export-gestoria] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al generar export',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}






















