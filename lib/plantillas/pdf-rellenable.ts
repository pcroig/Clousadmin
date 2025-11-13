/**
 * Soporte para PDFs rellenables
 * Incluye: PDFs con campos de formulario y extracción con IA Vision
 */

import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFDropdown } from 'pdf-lib';
import OpenAI from 'openai';
import { DatosEmpleado, ConfiguracionGeneracion, ResultadoGeneracion } from './tipos';
import { resolverVariables } from './ia-resolver';
import { descargarDocumento, subirDocumento } from '@/lib/s3';
import { prisma } from '@/lib/prisma';
import { sanitizarNombreArchivo } from './sanitizar';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extraer campos de formulario de un PDF
 */
export async function extraerCamposPDF(s3Key: string): Promise<string[]> {
  try {
    const buffer = await descargarDocumento(s3Key);
    const pdfDoc = await PDFDocument.load(buffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const nombresCampos = fields.map((field) => field.getName());

    console.log(`[PDF] Encontrados ${nombresCampos.length} campos en el PDF`);
    return nombresCampos;
  } catch (error) {
    console.error('[PDF] Error al extraer campos:', error);
    throw new Error(`Error al extraer campos del PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  }
}

/**
 * Mapear campos de formulario PDF a variables del sistema usando IA
 * Ejemplo: "employee_name" → "empleado_nombre"
 */
async function mapearCamposPDFConIA(
  camposPDF: string[],
  variablesDisponibles: string[]
): Promise<Record<string, string>> {
  console.log(`[PDF-IA] Mapeando ${camposPDF.length} campos con IA...`);

  const prompt = `Eres un experto en mapeo de campos de formularios PDF a variables de sistema.

Tienes estos campos de un formulario PDF:
${camposPDF.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Y estas variables disponibles en el sistema:
${variablesDisponibles.slice(0, 50).map((v, i) => `${i + 1}. ${v}`).join('\n')}
(Y más...)

Para cada campo del PDF, determina cuál variable del sistema corresponde mejor.
Si no hay correspondencia clara, usa null.

Reglas de mapeo:
- "name", "employee_name", "nombre" → "empleado_nombre"
- "surname", "apellidos", "last_name" → "empleado_apellidos"
- "email", "correo" → "empleado_email"
- "nif", "dni", "id_number" → "empleado_nif"
- "salary", "salario" → "contrato_salario_bruto_anual"
- "start_date", "fecha_inicio" → "contrato_fecha_inicio"
- Etc.

Responde SOLO en JSON:
{
  "campo_pdf_1": "variable_sistema_1" o null,
  "campo_pdf_2": "variable_sistema_2" o null,
  ...
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un experto en mapeo de formularios. Respondes SOLO en JSON válido.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No se recibió respuesta de la IA');
    }

    const mapeo = JSON.parse(content);
    console.log(`[PDF-IA] Mapeo completado: ${Object.keys(mapeo).length} campos`);

    return mapeo;
  } catch (error) {
    console.error('[PDF-IA] Error al mapear campos:', error);
    return {};
  }
}

/**
 * Rellenar PDF con campos de formulario estándar
 */
async function rellenarPDFFormulario(
  pdfBuffer: Buffer,
  valores: Record<string, string>
): Promise<Buffer> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    console.log(`[PDF] Rellenando ${fields.length} campos...`);

    for (const field of fields) {
      const nombre = field.getName();
      const valor = valores[nombre];

      if (!valor) continue; // Skip si no hay valor

      try {
        if (field instanceof PDFTextField) {
          field.setText(valor);
        } else if (field instanceof PDFCheckBox) {
          if (valor.toLowerCase() === 'true' || valor === '1' || valor.toLowerCase() === 'sí') {
            field.check();
          } else {
            field.uncheck();
          }
        } else if (field instanceof PDFDropdown) {
          field.select(valor);
        }
      } catch (fieldError) {
        console.warn(`[PDF] No se pudo rellenar campo "${nombre}":`, fieldError);
      }
    }

    // Flatten form (opcional - hace los campos no editables)
    // form.flatten();

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error('[PDF] Error al rellenar formulario:', error);
    throw error;
  }
}

/**
 * Extraer datos de PDF usando IA Vision (para PDFs escaneados o complejos)
 */
export async function extraerDatosPDFConVision(
  pdfBuffer: Buffer,
  camposBuscados: string[]
): Promise<Record<string, string>> {
  console.log(`[PDF-Vision] Extrayendo ${camposBuscados.length} campos con IA Vision...`);

  // Convertir primera página del PDF a base64 (simplificado)
  // En producción, usarías una librería como pdf2pic
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = pdfDoc.getPageCount();

  console.log(`[PDF-Vision] PDF tiene ${pageCount} páginas (analizando primera página)`);

  // Por ahora, retornar vacío y loggear que se necesita implementación completa
  // En producción, convertirías el PDF a imagen y usarías GPT-4 Vision
  console.warn('[PDF-Vision] Extracción con Vision no completamente implementada - requiere pdf2pic');

  // TODO: Implementar conversión PDF → imagen con pdf2pic
  // TODO: Llamar a GPT-4 Vision con la imagen

  return {};
}

/**
 * Generar documento desde plantilla PDF rellenable
 */
export async function generarDocumentoDesdePDFRellenable(
  plantillaId: string,
  empleadoId: string,
  configuracion: ConfiguracionGeneracion,
  solicitadoPor: string
): Promise<ResultadoGeneracion> {
  const inicio = Date.now();

  try {
    // 1. Obtener plantilla
    const plantilla = await prisma.plantillaDocumento.findUnique({
      where: { id: plantillaId },
      select: {
        id: true,
        nombre: true,
        s3Key: true,
        s3Bucket: true,
        formato: true,
        carpetaDestinoDefault: true,
        requiereFirma: true,
        empresaId: true,
        variablesUsadas: true,
        usarIAParaExtraer: true,
      },
    });

    if (!plantilla) {
      throw new Error('Plantilla no encontrada');
    }

    if (plantilla.formato !== 'pdf_rellenable') {
      throw new Error('Solo se soportan plantillas PDF rellenables en esta función');
    }

    // 2. Obtener datos del empleado (mismo include que DOCX)
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
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
        },
      },
    });

    if (!empleado) {
      throw new Error('Empleado no encontrado');
    }

    // 3. Descargar plantilla PDF
    console.log(`[PDF] Descargando plantilla: ${plantilla.s3Key}`);
    const plantillaBuffer = await descargarDocumento(plantilla.s3Key);

    // 4. Extraer campos del PDF
    const camposPDF = await extraerCamposPDF(plantilla.s3Key);

    // 5. Mapear campos PDF a variables del sistema con IA
    const variablesDisponibles = plantilla.variablesUsadas as string[];
    const mapeoCampos = await mapearCamposPDFConIA(camposPDF, variablesDisponibles);

    // 6. Resolver variables necesarias
    const variablesNecesarias = Object.values(mapeoCampos).filter((v): v is string => v !== null);
    const empleadoData: DatosEmpleado = {
      ...empleado,
      salarioBrutoAnual: empleado.salarioBrutoAnual ? Number(empleado.salarioBrutoAnual) : undefined,
      salarioBrutoMensual: empleado.salarioBrutoMensual ? Number(empleado.salarioBrutoMensual) : undefined,
      empresa: empleado.empresa,
    };

    console.log(`[PDF] Resolviendo ${variablesNecesarias.length} variables...`);
    const valoresVariables = await resolverVariables(variablesNecesarias, empleadoData);

    // 7. Crear mapeo campo_PDF → valor
    const valoresCampos: Record<string, string> = {};
    for (const [campoPDF, variableSistema] of Object.entries(mapeoCampos)) {
      if (variableSistema && valoresVariables[variableSistema]) {
        valoresCampos[campoPDF] = valoresVariables[variableSistema];
      }
    }

    // 8. Rellenar PDF
    console.log('[PDF] Rellenando formulario PDF...');
    const pdfRellenado = await rellenarPDFFormulario(plantillaBuffer, valoresCampos);

    // 9. Subir PDF rellenado a S3
    const carpetaDestino = configuracion.carpetaDestino || plantilla.carpetaDestinoDefault || 'Personales';
    const nombreDocumento = sanitizarNombreArchivo(`${plantilla.nombre}_${empleado.apellidos}.pdf`);
    const s3Key = `documentos/${empleado.empresaId}/${empleadoId}/${carpetaDestino}/${nombreDocumento}`;

    await subirDocumento(pdfRellenado, s3Key, 'application/pdf');
    console.log(`[PDF] Documento subido a S3: ${s3Key}`);

    // 10. Crear registros en BD (igual que DOCX)
    let carpeta = await prisma.carpeta.findFirst({
      where: {
        empleadoId: empleadoId,
        nombre: carpetaDestino,
        empresaId: empleado.empresaId,
      },
    });

    if (!carpeta) {
      carpeta = await prisma.carpeta.create({
        data: {
          empresaId: empleado.empresaId,
          empleadoId: empleadoId,
          nombre: carpetaDestino,
          esSistema: false,
        },
      });
    }

    const documento = await prisma.documento.create({
      data: {
        empresaId: empleado.empresaId,
        empleadoId: empleadoId,
        carpetaId: carpeta.id,
        nombre: nombreDocumento,
        tipoDocumento: 'generado',
        mimeType: 'application/pdf',
        tamano: pdfRellenado.length,
        s3Key,
        s3Bucket: process.env.AWS_S3_BUCKET || 'clousadmin-documents',
        requiereFirma: configuracion.requiereFirma || plantilla.requiereFirma,
      },
    });

    await prisma.documentoGenerado.create({
      data: {
        empresaId: empleado.empresaId,
        empleadoId: empleadoId,
        plantillaId: plantilla.id,
        documentoId: documento.id,
        generadoPor: solicitadoPor,
        variablesUtilizadas: variablesNecesarias,
        usadaIA: true,
        confianzaIA: 0.9,
        tiempoGeneracion: Date.now() - inicio,
        requiereFirma: configuracion.requiereFirma || plantilla.requiereFirma,
      },
    });

    // 11. Notificaciones y firma (igual que DOCX)
    if (configuracion.notificarEmpleado) {
      await prisma.notificacion.create({
        data: {
          empresaId: empleado.empresaId,
          usuarioId: empleado.usuarioId,
          tipo: 'info',
          titulo: 'Nuevo documento generado',
          mensaje: `Se ha generado un nuevo documento: ${nombreDocumento}`,
          metadata: {
            documentoId: documento.id,
            plantillaId: plantilla.id,
          },
        },
      });
    }

    const tiempoTotal = Date.now() - inicio;
    console.log(`[PDF] Documento generado exitosamente en ${tiempoTotal}ms`);

    return {
      success: true,
      empleadoId: empleadoId,
      empleadoNombre: `${empleado.nombre} ${empleado.apellidos}`,
      documentoId: documento.id,
      documentoNombre: nombreDocumento,
      tiempoMs: tiempoTotal,
    };
  } catch (error) {
    console.error('[PDF] Error al generar documento:', error);

    return {
      success: false,
      empleadoId: empleadoId,
      error: error instanceof Error ? error.message : 'Error desconocido',
      tiempoMs: Date.now() - inicio,
    };
  }
}
