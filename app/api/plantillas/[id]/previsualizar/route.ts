/**
 * API: /api/plantillas/[id]/previsualizar
 * GET: Generar una previsualización temporal para una plantilla y empleado
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  extraerVariablesDePlantilla,
  resolverVariables,
  type DatosEmpleado,
} from '@/lib/plantillas';
import { descargarDocumento, uploadToS3, getSignedDownloadUrl } from '@/lib/s3';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { randomUUID } from 'crypto';

const PREVIEW_TTL_SECONDS = 60 * 10; // 10 minutos

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const empleadoId = searchParams.get('empleadoId');

    if (!empleadoId) {
      return NextResponse.json(
        { error: 'Debes indicar un empleado para previsualizar' },
        { status: 400 }
      );
    }

    // Await params en Next.js 15+
    const { id } = await params;

    const plantilla = await prisma.plantillaDocumento.findUnique({
      where: { id },
      select: {
        id: true,
        empresaId: true,
        formato: true,
        nombre: true,
        s3Key: true,
      },
    });

    if (!plantilla) {
      return NextResponse.json({ error: 'Plantilla no encontrada' }, { status: 404 });
    }

    if (plantilla.empresaId && plantilla.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const empleado = await prisma.empleado.findFirst({
      where: {
        id: empleadoId,
        empresaId: session.user.empresaId,
      },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            cif: true,
            email: true,
            telefono: true,
            direccion: true,
            web: true,
          },
        },
        jornada: {
          select: {
            nombre: true,
            horasSemanales: true,
          },
        },
        manager: {
          select: {
            nombre: true,
            apellidos: true,
            email: true,
          },
        },
        puestoRelacion: {
          select: {
            nombre: true,
            descripcion: true,
          },
        },
        contratos: {
          orderBy: { fechaInicio: 'desc' },
          take: 1,
          select: {
            id: true,
            tipoContrato: true,
            fechaInicio: true,
            fechaFin: true,
            salarioBrutoAnual: true,
          },
        },
        ausencias: {
          orderBy: { fechaInicio: 'desc' },
          take: 1,
          select: {
            id: true,
            tipo: true,
            fechaInicio: true,
            fechaFin: true,
            diasSolicitados: true,
            estado: true,
          },
        },
      },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado en tu empresa' },
        { status: 404 }
      );
    }

    if (plantilla.formato !== 'docx') {
      return NextResponse.json(
        { error: 'La previsualización solo está disponible para plantillas DOCX' },
        { status: 400 }
      );
    }

    const plantillaBuffer = await descargarDocumento(plantilla.s3Key);
    const variables = await extraerVariablesDePlantilla(plantilla.s3Key);

    const empleadoData: DatosEmpleado = {
      ...empleado,
      salarioBrutoAnual: empleado.salarioBrutoAnual
        ? Number(empleado.salarioBrutoAnual)
        : undefined,
      salarioBrutoMensual: empleado.salarioBrutoMensual
        ? Number(empleado.salarioBrutoMensual)
        : undefined,
      empresa: empleado.empresa,
    };

    const valoresResueltos = await resolverVariables(variables, empleadoData);

    const zip = new PizZip(plantillaBuffer);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
    });

    doc.setData(valoresResueltos);
    doc.render();

    const previewBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    const previewKey = `previews/${session.user.empresaId}/${plantilla.id}/${randomUUID()}.docx`;
    await uploadToS3(
      previewBuffer,
      previewKey,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    const previewUrl = await getSignedDownloadUrl(previewKey, PREVIEW_TTL_SECONDS);
    const variablesFaltantes = variables.filter(
      (variable) => !valoresResueltos[variable]
    );

    return NextResponse.json({
      success: true,
      previewUrl,
      variablesResueltas: valoresResueltos,
      variablesFaltantes,
    });
  } catch (error) {
    console.error('[API] Error al generar previsualización:', error);
    return NextResponse.json(
      {
        error: 'Error al generar previsualización',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

