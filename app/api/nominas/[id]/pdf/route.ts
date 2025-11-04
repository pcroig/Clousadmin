// ========================================
// API: Descargar PDF de Nómina
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession, canAccessEmpleado } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface Params {
  id: string;
}

// GET /api/nominas/[id]/pdf
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const session = await getSession();

    // Verificar autenticación
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    console.log(`[API nominas/pdf] GET ${id}`);

    // Obtener nómina
    const nomina = await prisma.nomina.findUnique({
      where: { id },
      include: {
        documento: true,
        empleado: {
          select: {
            id: true,
            empresaId: true,
          },
        },
      },
    });

    if (!nomina) {
      return NextResponse.json(
        { error: 'Nómina no encontrada' },
        { status: 404 }
      );
    }

    // Verificar permisos
    const puedeAcceder = await canAccessEmpleado(
      session,
      nomina.empleadoId
    );

    if (!puedeAcceder) {
      return NextResponse.json(
        { error: 'No autorizado para ver esta nómina' },
        { status: 403 }
      );
    }

    // Verificar que tiene documento
    if (!nomina.documento) {
      return NextResponse.json(
        { error: 'Nómina sin documento asociado' },
        { status: 404 }
      );
    }

    // Log de auditoría (opcional, podría guardarse en una tabla)
    console.log(
      `[API nominas/pdf] Usuario ${session.user.id} accedió a nómina ${id}`
    );

    // Obtener archivo desde filesystem
    const fullPath = join(
      process.cwd(),
      'uploads',
      nomina.documento.s3Key
    );

    try {
      const fileBuffer = await readFile(fullPath);

      // Retornar PDF
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${nomina.documento.nombre}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    } catch (fileError) {
      console.error('[API nominas/pdf] Error leyendo archivo:', fileError);
      return NextResponse.json(
        { error: 'Error al leer archivo de nómina' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API nominas/pdf] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener PDF',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}




