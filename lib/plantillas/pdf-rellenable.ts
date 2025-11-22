/**
 * Soporte para PDFs rellenables
 * Incluye: PDFs con campos de formulario y extracción con IA Vision
 */

import { PDFCheckBox, PDFDocument, PDFDropdown, PDFTextField } from 'pdf-lib';

import { callAIWithConfig } from '@/lib/ia';
import { deleteOpenAIFile, uploadPDFToOpenAI } from '@/lib/ia/core/providers/openai';
import {
  crearNotificacionDocumentoGeneradoEmpleado,
  crearNotificacionDocumentoPendienteRellenar,
  crearNotificacionFirmaPendiente,
} from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { descargarDocumento, subirDocumento } from '@/lib/s3';

import { resolverVariables } from './ia-resolver';
import { sanitizarNombreArchivo } from './sanitizar';
import { ConfiguracionGeneracion, DatosEmpleado, ResultadoGeneracion } from './tipos';

import type OpenAI from 'openai';

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
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const completion = await callAIWithConfig('plantillas-mapear-campos-pdf', messages);

    const content = completion.choices[0]?.message?.content;
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
export async function rellenarPDFFormulario(
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
 * Escanear PDF con GPT-4 Vision para detectar campos visuales
 * Detecta campos que no son formularios nativos pero visualmente aparecen como campos rellenables
 */
export async function escanearPDFConVision(
  s3Key: string
): Promise<Array<{ nombre: string; tipo: string; confianza: number; descripcion?: string }>> {
  console.log(`[PDF-Vision] Escaneando PDF con Vision: ${s3Key}`);

  let openaiFileId: string | null = null;
  try {
    const pdfBuffer = await descargarDocumento(s3Key);
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();

    console.log(`[PDF-Vision] PDF tiene ${pageCount} páginas`);

    const promptBase = `Analiza el PDF adjunto y detecta todos los campos que parecen ser rellenables.

Por cada campo detectado, determina:
1. Nombre del campo (inferido del texto cercano o etiqueta)
2. Tipo de campo: "text" (texto), "checkbox" (casilla), "dropdown" (desplegable), "number" (número), "date" (fecha)
3. Confianza (0-1) de que es un campo rellenable
4. Descripción breve del campo

Busca indicadores visuales como:
- Líneas horizontales para escribir (____________)
- Espacios en blanco después de etiquetas
- Cajas o recuadros vacíos
- Texto que indica "Nombre:", "Fecha:", "Firma:", etc.
- Casillas de verificación □ o ☐
- Guiones o puntos suspensivos (........)

Ejemplos de campos comunes:
- Nombre, Apellidos
- NIF/DNI, Número de documento
- Dirección, Código postal, Ciudad
- Fecha de nacimiento
- Salario, Importe
- Firma, Fecha de firma

Responde SOLO en JSON con este formato:
{
  "campos": [
    {
      "nombre": "nombre_campo",
      "tipo": "text|checkbox|dropdown|number|date",
      "confianza": 0.95,
      "descripcion": "Descripción del campo"
    }
  ]
}`;
    const prompt = `${promptBase}

NOTA: Este PDF tiene ${pageCount} páginas. Analiza especialmente la primera página para encontrar campos comunes de formularios.`;

    openaiFileId = await uploadPDFToOpenAI(pdfBuffer, 'plantilla.pdf');

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: openaiFileId, detail: 'high' } },
        ],
      },
    ];

    const completion = await callAIWithConfig('plantillas-escanear-pdf', messages);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('La IA no devolvió contenido interpretable');
    }

    const resultado = JSON.parse(content);
    const campos = resultado.campos || [];

    console.log(`[PDF-Vision] Detectados ${campos.length} campos potenciales`);

    return campos;
  } catch (error) {
    console.error('[PDF-Vision] Error al escanear PDF:', error);
    return [];
  } finally {
    if (openaiFileId) {
      deleteOpenAIFile(openaiFileId).catch((cleanupError) => {
        console.warn('[PDF-Vision] No se pudo eliminar archivo temporal en OpenAI:', cleanupError);
      });
    }
  }
}

/**
 * Fusionar campos nativos del PDF con campos detectados por IA
 * Evita duplicados y prioriza campos nativos
 */
export function fusionarCamposDetectados(
  camposNativos: string[],
  camposIA: Array<{ nombre: string; tipo: string; confianza: number }>
): Array<{ nombre: string; origen: 'nativo' | 'ia'; tipo?: string; confianza?: number }> {
  const resultado: Array<{
    nombre: string;
    origen: 'nativo' | 'ia';
    tipo?: string;
    confianza?: number;
  }> = [];

  // Añadir todos los campos nativos primero
  for (const campo of camposNativos) {
    resultado.push({
      nombre: campo,
      origen: 'nativo',
    });
  }

  // Añadir campos de IA que no estén duplicados
  const nombresNativos = new Set(camposNativos.map((c) => c.toLowerCase().trim()));

  for (const campoIA of camposIA) {
    const nombreNormalizado = campoIA.nombre.toLowerCase().trim();

    // Si el campo ya existe en nativos, skip
    if (nombresNativos.has(nombreNormalizado)) {
      continue;
    }

    // Solo añadir campos con confianza >= 0.7
    if (campoIA.confianza >= 0.7) {
      resultado.push({
        nombre: campoIA.nombre,
        origen: 'ia',
        tipo: campoIA.tipo,
        confianza: campoIA.confianza,
      });
    }
  }

  console.log(
    `[Fusionar] Total: ${resultado.length} campos (${camposNativos.length} nativos, ${resultado.length - camposNativos.length} IA)`
  );

  return resultado;
}

/**
 * Extraer datos de PDF usando IA Vision (para PDFs escaneados o complejos)
 */
export async function extraerDatosPDFConVision(
  pdfBuffer: Buffer,
  camposBuscados: string[]
): Promise<Record<string, string>> {
  console.log(`[PDF-Vision] Extrayendo ${camposBuscados.length} campos con IA Vision...`);

  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pageCount = pdfDoc.getPageCount();

  console.log(`[PDF-Vision] PDF tiene ${pageCount} páginas`);

  // Implementación simplificada: usar GPT-4 para extraer texto e inferir campos
  // En producción completa, convertirías PDF a imagen con pdf2pic y usarías GPT-4 Vision

  console.warn('[PDF-Vision] Usando extracción simplificada sin conversión a imagen');

  // Por ahora retornar vacío - esto se mejorará cuando se implemente pdf2pic
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
    const carpetaDestino =
      configuracion.carpetaDestino || plantilla.carpetaDestinoDefault || 'Otros';
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

    const requiereFirmaFinal = configuracion.requiereFirma || plantilla.requiereFirma;
    const permiteRellenar = Boolean(plantilla.permiteRellenar);

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
        s3Bucket: process.env.STORAGE_BUCKET || 'clousadmin-documents',
        requiereFirma: configuracion.requiereFirma || plantilla.requiereFirma,
      },
    });

    const documentoGenerado = await prisma.documentoGenerado.create({
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
        requiereFirma: requiereFirmaFinal,
        pendienteRellenar: permiteRellenar,
      },
    });

    // 11. Notificaciones y firma (igual que DOCX)
    if (configuracion.notificarEmpleado && !permiteRellenar) {
      await crearNotificacionDocumentoGeneradoEmpleado(prisma, {
        empresaId: empleado.empresaId,
        empleadoId,
        documentoId: documento.id,
        documentoNombre: nombreDocumento,
        plantillaId: plantilla.id,
        documentoGeneradoId: documentoGenerado.id,
      });
    }

    if (permiteRellenar && empleado.usuarioId) {
      await crearNotificacionDocumentoPendienteRellenar(prisma, {
        empresaId: empleado.empresaId,
        empleadoId,
        documentoGeneradoId: documentoGenerado.id,
        documentoId: documento.id,
        documentoNombre: nombreDocumento,
      });
    }

    if (!permiteRellenar && requiereFirmaFinal) {
      const solicitudFirma = await prisma.solicitudFirma.create({
        data: {
          empresaId: empleado.empresaId,
          documentoId: documento.id,
          solicitadoPor: solicitadoPor,
          tipo: 'automatica',
          mensaje: configuracion.mensajeFirma || `Por favor firma el documento: ${nombreDocumento}`,
          fechaLimite: configuracion.fechaLimiteFirma,
        },
      });

      await prisma.firma.create({
        data: {
          solicitudFirmaId: solicitudFirma.id,
          empleadoId: empleadoId,
          estado: 'pendiente',
        },
      });

      await crearNotificacionFirmaPendiente(prisma, {
        empresaId: empleado.empresaId,
        empleadoId,
        firmaId: solicitudFirma.id,
        solicitudId: solicitudFirma.id,
        documentoId: documento.id,
        documentoNombre: nombreDocumento,
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
