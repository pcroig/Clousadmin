/**
 * API: /api/plantillas/[id]/escanear-campos
 * POST: Escanear PDF con IA para detectar campos
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import {
  escanearPDFConVision,
  extraerCamposPDF,
  fusionarCamposDetectados,
} from '@/lib/plantillas';
import { prisma, Prisma } from '@/lib/prisma';

/**
 * POST /api/plantillas/[id]/escanear-campos
 * Escanea un PDF para detectar campos rellenables (nativos + IA Vision)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();

    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = params;

    // Obtener plantilla
    const plantilla = await prisma.plantillaDocumento.findUnique({
      where: { id },
    });

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    // Verificar permisos
    if (plantilla.empresaId && plantilla.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Solo PDFs
    if (plantilla.formato !== 'pdf_rellenable') {
      return NextResponse.json(
        { error: 'Solo se pueden escanear plantillas PDF' },
        { status: 400 }
      );
    }

    console.log(`[API] Escaneando PDF: ${plantilla.nombre}`);

    // 1. Extraer campos nativos del PDF
    let camposNativos: string[] = [];
    try {
      camposNativos = await extraerCamposPDF(plantilla.s3Key);
      console.log(`[API] Campos nativos encontrados: ${camposNativos.length}`);
    } catch (error) {
      console.error('[API] Error al extraer campos nativos:', error);
      // Continuar aunque falle - intentaremos con IA
    }

    // 2. Escanear con IA Vision para detectar campos adicionales
    let camposIA: Array<{ nombre: string; tipo: string; confianza: number; descripcion?: string }> =
      [];
    try {
      camposIA = await escanearPDFConVision(plantilla.s3Key);
      console.log(`[API] Campos detectados por IA: ${camposIA.length}`);
    } catch (error) {
      console.error('[API] Error al escanear con IA:', error);
      // Continuar con solo campos nativos
    }

    // 3. Fusionar resultados
    const camposFusionados = fusionarCamposDetectados(camposNativos, camposIA);

    // 4. Guardar en configuracionIA de la plantilla
    const configuracionIA = {
      ...(typeof plantilla.configuracionIA === 'object' && plantilla.configuracionIA !== null
        ? plantilla.configuracionIA as Record<string, unknown>
        : {}),
      ultimoEscaneo: new Date().toISOString(),
      camposDetectados: camposIA,
      camposNativos,
      camposFusionados,
      metodoDeteccion: camposNativos.length > 0 ? 'hibrido' : 'vision',
    };

    await prisma.plantillaDocumento.update({
      where: { id },
      data: {
        configuracionIA: configuracionIA as Prisma.InputJsonValue,
        variablesUsadas: camposFusionados.map((c) => c.nombre) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      success: true,
      camposNativos: camposNativos.length,
      camposIA: camposIA.length,
      camposTotal: camposFusionados.length,
      campos: camposFusionados,
      configuracionIA,
    });
  } catch (error) {
    console.error('[API] Error al escanear campos:', error);
    return NextResponse.json(
      {
        error: 'Error al escanear campos',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

