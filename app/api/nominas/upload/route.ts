// ========================================
// API: Upload Nóminas (ZIP o PDFs)
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { procesarNominas } from '@/lib/imports/nominas-upload';

import { UsuarioRol } from '@/lib/constants/enums';

// POST /api/nominas/upload
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    // Verificar autenticación y rol
    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    console.log('[API nominas/upload] POST');

    // Obtener form data
    const formData = await req.formData();
    const files = formData.getAll('nominas') as File[];
    const mes = parseInt(formData.get('mes') as string);
    const anio = parseInt(formData.get('anio') as string);

    // Validar
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron archivos' },
        { status: 400 }
      );
    }

    if (!mes || !anio || mes < 1 || mes > 12 || anio < 2000) {
      return NextResponse.json(
        { error: 'Mes o año inválido' },
        { status: 400 }
      );
    }

    console.log(
      `[API nominas/upload] ${files.length} archivo(s) para ${mes}/${anio}`
    );

    // Convertir files a buffers
    const filesWithBuffers: Array<{ filename: string; buffer: Buffer }> = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      filesWithBuffers.push({
        filename: file.name,
        buffer,
      });
    }

    // Procesar nóminas (extract ZIPs, match employees)
    const result = await procesarNominas(
      filesWithBuffers,
      session.user.empresaId,
      mes,
      anio
    );

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      stats: result.stats,
      results: result.results.map((r) => ({
        filename: r.filename,
        empleado: r.empleado,
        confidence: r.confidence,
        autoAssigned: r.autoAssigned,
        candidates: r.candidates,
      })), // No enviamos buffers en la respuesta
    });
  } catch (error) {
    console.error('[API nominas/upload] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al procesar archivos',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}













