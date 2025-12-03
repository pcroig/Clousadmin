/**
 * API: /api/plantillas
 * GET: Listar plantillas
 * POST: Subir plantilla personalizada
 */

import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { extraerVariablesDePlantilla } from '@/lib/plantillas';
import { sanitizarNombreArchivo } from '@/lib/plantillas/sanitizar';
import { prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';
import { subirDocumento } from '@/lib/s3';

/**
 * GET /api/plantillas
 * Listar plantillas disponibles (oficiales + personalizadas de la empresa)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoria = searchParams.get('categoria');
    const tipo = searchParams.get('tipo');
    const activa = searchParams.get('activa');
    const autoOnboarding = searchParams.get('autoOnboarding');
    const autoOffboarding = searchParams.get('autoOffboarding');

    // Filtros
    const where: Prisma.plantillas_documentosWhereInput = {
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

    if (autoOnboarding === 'true') {
      where.autoGenerarOnboarding = true;
    }

    if (autoOffboarding === 'true') {
      where.autoGenerarOffboarding = true;
    }

    const plantillas = await prisma.plantillas_documentos.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        categoria: true,
        tipo: true,
        formato: true,
        s3Key: true,
        activa: true,
        esOficial: true,
        requiereContrato: true,
        requiereFirma: true,
        carpetaDestinoDefault: true,
        autoGenerarOnboarding: true,
        autoGenerarOffboarding: true,
        requiereRevision: true,
        permiteRellenar: true,
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
    const session = await getSession();

    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const nombre = formData.get('nombre') as string;
    const descripcion = formData.get('descripcion') as string | null;
    const categoria = (formData.get('categoria') as string) || 'general'; // Default a 'general'
    const carpetaDestinoDefaultInput = formData.get('carpetaDestinoDefault') as string | null;
    const carpetaDestinoDefault =
      (carpetaDestinoDefaultInput?.toString().trim() || 'Otros');
    const requiereContrato = formData.get('requiereContrato') === 'true';
    const requiereFirma = formData.get('requiereFirma') === 'true';
    const autoGenerarOnboarding = formData.get('autoGenerarOnboarding') === 'true';
    const autoGenerarOffboarding = formData.get('autoGenerarOffboarding') === 'true';
    const requiereRevision = formData.get('requiereRevision') === 'true';
    const permiteRellenar = formData.get('permiteRellenar') === 'true';

    // Validaciones
    if (!file) {
      return NextResponse.json({ error: 'Falta archivo' }, { status: 400 });
    }

    if (!nombre) {
      return NextResponse.json({ error: 'Falta el nombre de la plantilla' }, { status: 400 });
    }

    // Validar tipo de archivo - solo DOCX por ahora (PDF rellenable en fase posterior)
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || extension !== 'docx') {
      return NextResponse.json(
        { 
          error: 'Solo se permiten archivos DOCX con variables. El soporte para PDFs rellenables llegará en una fase posterior.',
          tip: 'Crea tu plantilla en Word usando variables como {{empleado_nombre}}, {{empleado_nif}}, etc.'
        },
        { status: 400 }
      );
    }

    const formato = 'docx';

    // Leer archivo
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generar nombre de archivo único
    const nombreArchivo = sanitizarNombreArchivo(`${nombre}_${Date.now()}.${extension}`);
    const s3Key = `plantillas/${session.user.empresaId}/${nombreArchivo}`;

    // Subir a S3
    await subirDocumento(buffer, s3Key, file.type);

    // Extraer variables de la plantilla DOCX
    let variablesUsadas: string[] = [];
    try {
      variablesUsadas = await extraerVariablesDePlantilla(s3Key);
    } catch (error) {
      console.warn('[API] No se pudieron extraer variables:', error);
    }

    // Crear registro en BD
    const plantilla = await prisma.plantillas_documentos.create({
      data: {
        empresaId: session.user.empresaId,
        nombre,
        descripcion,
        categoria,
        tipo: 'personalizada',
        formato,
        s3Key,
        s3Bucket: process.env.STORAGE_BUCKET || 'clousadmin-documents',
        variablesUsadas: asJsonValue(variablesUsadas),
        carpetaDestinoDefault,
        requiereContrato,
        requiereFirma,
        autoGenerarOnboarding,
        autoGenerarOffboarding,
        requiereRevision,
        permiteRellenar,
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
