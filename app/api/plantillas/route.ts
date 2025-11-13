/**
 * API: /api/plantillas
 * GET: Listar plantillas
 * POST: Subir plantilla personalizada
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { subirDocumento } from '@/lib/s3';
import { extraerVariablesDePlantilla, extraerCamposPDF } from '@/lib/plantillas';
import { sanitizarNombreArchivo } from '@/lib/plantillas/sanitizar';

/**
 * GET /api/plantillas
 * Listar plantillas disponibles (oficiales + personalizadas de la empresa)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const tipo = searchParams.get('tipo');
    const activa = searchParams.get('activa');

    // Filtros
    const where: any = {
      OR: [
        { empresaId: session.user.empresaId }, // Plantillas de la empresa
        { empresaId: null }, // Plantillas oficiales
      ],
    };

    if (categoria) {
      where.categoria = categoria;
    }

    if (tipo) {
      where.tipo = tipo;
    }

    if (activa !== null) {
      where.activa = activa === 'true';
    }

    const plantillas = await prisma.plantillaDocumento.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        categoria: true,
        tipo: true,
        formato: true,
        activa: true,
        esOficial: true,
        requiereContrato: true,
        requiereFirma: true,
        carpetaDestinoDefault: true,
        variablesUsadas: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            documentosGenerados: true,
          },
        },
      },
      orderBy: [
        { esOficial: 'desc' }, // Oficiales primero
        { nombre: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      plantillas: plantillas.map((p) => ({
        ...p,
        variablesUsadas: p.variablesUsadas as string[],
        totalDocumentosGenerados: p._count.documentosGenerados,
      })),
      total: plantillas.length,
    });
  } catch (error) {
    console.error('[API] Error al listar plantillas:', error);
    return NextResponse.json(
      {
        error: 'Error al listar plantillas',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/plantillas
 * Subir plantilla personalizada (DOCX o PDF rellenable)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const nombre = formData.get('nombre') as string;
    const descripcion = formData.get('descripcion') as string | null;
    const categoria = formData.get('categoria') as string;
    const carpetaDestinoDefault = formData.get('carpetaDestinoDefault') as string | null;
    const requiereContrato = formData.get('requiereContrato') === 'true';
    const requiereFirma = formData.get('requiereFirma') === 'true';

    // Validaciones
    if (!file) {
      return NextResponse.json({ error: 'Falta archivo' }, { status: 400 });
    }

    if (!nombre || !categoria) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    // Validar tipo de archivo
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['docx', 'pdf'].includes(extension)) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos DOCX o PDF' },
        { status: 400 }
      );
    }

    const formato = extension === 'docx' ? 'docx' : 'pdf_rellenable';

    // Leer archivo
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generar nombre de archivo único
    const nombreArchivo = sanitizarNombreArchivo(`${nombre}_${Date.now()}.${extension}`);
    const s3Key = `plantillas/${session.user.empresaId}/${nombreArchivo}`;

    // Subir a S3
    await subirDocumento(buffer, s3Key, file.type);

    // Extraer variables de la plantilla
    let variablesUsadas: string[] = [];
    try {
      if (formato === 'docx') {
        variablesUsadas = await extraerVariablesDePlantilla(s3Key);
      } else {
        // PDF rellenable
        variablesUsadas = await extraerCamposPDF(s3Key);
      }
    } catch (error) {
      console.warn('[API] No se pudieron extraer variables:', error);
    }

    // Crear registro en BD
    const plantilla = await prisma.plantillaDocumento.create({
      data: {
        empresaId: session.user.empresaId,
        nombre,
        descripcion,
        categoria,
        tipo: 'personalizada',
        formato,
        s3Key,
        s3Bucket: process.env.AWS_S3_BUCKET || 'clousadmin-documents',
        variablesUsadas: variablesUsadas as any,
        carpetaDestinoDefault,
        requiereContrato,
        requiereFirma,
        activa: true,
        esOficial: false,
      },
    });

    console.log(`[API] Plantilla creada: ${plantilla.id} - ${plantilla.nombre}`);

    return NextResponse.json({
      success: true,
      plantilla: {
        ...plantilla,
        variablesUsadas,
      },
    });
  } catch (error) {
    console.error('[API] Error al crear plantilla:', error);
    return NextResponse.json(
      {
        error: 'Error al crear plantilla',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
