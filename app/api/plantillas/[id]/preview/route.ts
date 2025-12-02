/**
 * API: /api/plantillas/[id]/preview
 * GET: Generate a PDF preview for a template with employee data substituted
 *
 * This endpoint returns the actual PDF stream for in-app viewing.
 * For variable metadata (without PDF), use /api/plantillas/[id]/previsualizar
 * 
 * @version 1.5.0 (2025-11-28)
 * - Uses centralized `getPreviewHeaders()` for consistent HTTP headers
 * - Optimized CSP for PDF viewer compatibility in iframes
 * - Explicit X-Frame-Options: SAMEORIGIN for security
 */

import Docxtemplater from 'docxtemplater';
import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';

import { getSession } from '@/lib/auth';
import { getPreviewHeaders } from '@/lib/documentos/preview-headers';
import { convertDocxBufferToPdf } from '@/lib/plantillas/docx-to-pdf';
import { resolverVariables } from '@/lib/plantillas/ia-resolver';
import { extraerVariablesDeTexto } from '@/lib/plantillas/sanitizar';
import { DatosEmpleado } from '@/lib/plantillas/tipos';
import { prisma } from '@/lib/prisma';
import { descargarDocumento } from '@/lib/s3';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;

  try {
    const session = await getSession();

    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const empleadoId = searchParams.get('empleadoId');
    const { id } = params;

    const plantilla = await prisma.plantillas_documentos.findUnique({
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

    const templateBuffer = await descargarDocumento(plantilla.s3Key);

    if (!empleadoId) {
      if (plantilla.formato === 'pdf') {
        const headers = getPreviewHeaders({
          mimeType: 'application/pdf',
          fileName: plantilla.nombre,
          wasConverted: false,
          contentLength: templateBuffer.length,
        });
        
        return new NextResponse(templateBuffer as BodyInit, { headers });
      }

      if (plantilla.formato === 'docx') {
        let pdfBuffer: Buffer;
        try {
          pdfBuffer = await convertDocxBufferToPdf(templateBuffer);
        } catch (conversionError) {
          const message = conversionError instanceof Error ? conversionError.message : 'Error de conversión';

          if (message.includes('LibreOffice no está disponible')) {
            return NextResponse.json(
              {
                error: 'La conversión de documentos Word no está disponible en este momento.',
                details: 'LibreOffice no está instalado en el servidor.',
              },
              { status: 503 }
            );
          }

          throw conversionError;
        }

        const headers = getPreviewHeaders({
          mimeType: 'application/pdf',
          fileName: `${plantilla.nombre}.pdf`,
          wasConverted: true, // DOCX convertido a PDF
          contentLength: pdfBuffer.length,
        });

        return new NextResponse(pdfBuffer as BodyInit, { headers });
      }

      return NextResponse.json(
        { error: 'La previsualización solo está disponible para plantillas DOCX o PDF' },
        { status: 400 }
      );
    }

    if (plantilla.formato !== 'docx') {
      return NextResponse.json(
        { error: 'La previsualización con datos solo está disponible para plantillas DOCX' },
        { status: 400 }
      );
    }

    const empleado = await prisma.empleados.findFirst({
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
            salarioBaseAnual: true,
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

    const zip = new PizZip(templateBuffer);

    // Extract variables from document
    const documentXml = zip.file('word/document.xml')?.asText();
    if (!documentXml) {
      throw new Error('No se pudo leer document.xml de la plantilla');
    }
    const variables = extraerVariablesDeTexto(documentXml);

    // Prepare employee data
    const empresaData = {
      id: empleado.empresa.id,
      nombre: empleado.empresa.nombre,
      cif: empleado.empresa.cif ?? undefined,
      email: empleado.empresa.email ?? undefined,
      telefono: empleado.empresa.telefono ?? undefined,
      direccion: empleado.empresa.direccion ?? undefined,
      web: empleado.empresa.web ?? undefined,
    };

    const empleadoData: DatosEmpleado = {
      id: empleado.id,
      nombre: empleado.nombre,
      apellidos: empleado.apellidos,
      email: empleado.email,
      nif: empleado.nif ?? undefined,
      nss: empleado.nss ?? undefined,
      telefono: empleado.telefono ?? undefined,
      fechaNacimiento: empleado.fechaNacimiento ?? undefined,
      direccionCalle: empleado.direccionCalle ?? undefined,
      direccionNumero: empleado.direccionNumero ?? undefined,
      direccionPiso: empleado.direccionPiso ?? undefined,
      codigoPostal: empleado.codigoPostal ?? undefined,
      ciudad: empleado.ciudad ?? undefined,
      direccionProvincia: empleado.direccionProvincia ?? undefined,
      estadoCivil: empleado.estadoCivil ?? undefined,
      numeroHijos: empleado.numeroHijos ?? undefined,
      genero: empleado.genero ?? undefined,
      iban: empleado.iban ?? undefined,
      bic: empleado.bic ?? undefined,
      puesto: empleado.puesto ?? undefined,
      fechaAlta: empleado.fechaAlta,
      fechaBaja: empleado.fechaBaja ?? undefined,
      tipoContrato: empleado.tipoContrato ?? undefined,
      salarioBaseAnual: empleado.salarioBaseAnual
        ? Number(empleado.salarioBaseAnual)
        : undefined,
      salarioBaseMensual: empleado.salarioBaseMensual
        ? Number(empleado.salarioBaseMensual)
        : undefined,
      empresa: empresaData,
      jornada: empleado.jornada
        ? {
            nombre: empleado.jornada.nombre,
            horasSemanales: Number(empleado.jornada.horasSemanales),
          }
        : undefined,
      manager: empleado.manager
        ? {
            nombre: empleado.manager.nombre,
            apellidos: empleado.manager.apellidos,
            email: empleado.manager.email,
          }
        : undefined,
      puestoRelacion: empleado.puestoRelacion
        ? {
            nombre: empleado.puestoRelacion.nombre,
            descripcion: empleado.puestoRelacion.descripcion ?? undefined,
          }
        : undefined,
      contratos: empleado.contratos?.map((contrato) => ({
        id: contrato.id,
        tipoContrato: contrato.tipoContrato,
        fechaInicio: contrato.fechaInicio,
        fechaFin: contrato.fechaFin ?? undefined,
        salarioBaseAnual: contrato.salarioBaseAnual
          ? Number(contrato.salarioBaseAnual)
          : 0,
      })),
    };

    // Resolve variables
    const valoresResueltos = await resolverVariables(variables, empleadoData);

    // Process template with docxtemplater
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{{',
        end: '}}',
      },
    });

    // Set resolved values
    doc.setData(valoresResueltos);

    try {
      doc.render();
    } catch (renderError) {
      console.error('[Template Preview] Error rendering template:', renderError);
      throw new Error('Error al procesar la plantilla con los datos del empleado');
    }

    // Generate DOCX buffer
    const docxBuffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    // Convert DOCX to PDF
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await convertDocxBufferToPdf(docxBuffer);
    } catch (conversionError) {
      const message = conversionError instanceof Error ? conversionError.message : 'Error de conversión';
      
      if (message.includes('LibreOffice no está disponible')) {
        return NextResponse.json(
          {
            error: 'La conversión de documentos Word no está disponible en este momento.',
            details: 'LibreOffice no está instalado en el servidor.',
          },
          { status: 503 }
        );
      }
      
      throw conversionError;
    }

    // Return the PDF with optimized headers
    const fileName = `Preview_${plantilla.nombre.replace(/\.docx$/i, '')}_${empleado.apellidos}.pdf`;

    const headers = getPreviewHeaders({
      mimeType: 'application/pdf',
      fileName,
      wasConverted: true, // Template con datos + conversión DOCX → PDF
      contentLength: pdfBuffer.length,
    });

    return new NextResponse(pdfBuffer as BodyInit, { headers });
  } catch (error) {
    console.error('[API Template Preview] Error:', error);

    const message = error instanceof Error ? error.message : 'Error al generar previsualización';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

