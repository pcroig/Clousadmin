// ========================================
// API Route: Extraer Datos de Documentos con IA
// ========================================
// POST /api/documentos/extraer
// Extrae datos de empleado desde contrato o DNI usando Vision Pattern

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { handleApiError, requireAuthAsHR } from '@/lib/api-handler';
import { deleteOpenAIFile, uploadPDFToOpenAI } from '@/lib/ia/core/providers/openai';
import { AIProvider } from '@/lib/ia/core/types';
import { analyzeDocument } from '@/lib/ia/patterns/vision';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos para procesamiento de IA

// Schema de validación para los datos extraídos
const empleadoDataSchema = z.object({
  nombre: z.string().optional(),
  apellidos: z.string().optional(),
  email: z.string().optional(), // Email opcional, no requiere formato email para evitar errores de validación
  nif: z.string().optional(),
  telefono: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  direccionCalle: z.string().optional(),
  direccionNumero: z.string().optional(),
  direccionPiso: z.string().optional(),
  codigoPostal: z.string().optional(),
  ciudad: z.string().optional(),
  direccionProvincia: z.string().optional(),
  nss: z.string().optional(),
  puesto: z.string().optional(),
  fechaAlta: z.string().optional(),
  salarioBaseAnual: z.string().optional(),
  tipoContrato: z.string().optional(),
  iban: z.string().optional(),
}).partial();

// Descripción de campos a extraer
const fieldsToExtract = {
  nombre: 'Nombre',
  apellidos: 'Apellidos',
  email: 'Email',
  nif: 'DNI/NIE',
  telefono: 'Teléfono (con prefijo internacional si está disponible)',
  fechaNacimiento: 'Fecha de nacimiento (formato YYYY-MM-DD)',
  direccionCalle: 'Dirección - Calle',
  direccionNumero: 'Dirección - Número',
  direccionPiso: 'Dirección - Piso/Puerta',
  codigoPostal: 'Código postal',
  ciudad: 'Ciudad',
  direccionProvincia: 'Provincia',
  nss: 'Número de Seguridad Social',
  puesto: 'Puesto de trabajo',
  fechaAlta: 'Fecha de alta/inicio (formato YYYY-MM-DD)',
  salarioBaseAnual: 'Salario base anual (solo número)',
  tipoContrato: 'Tipo de contrato (indefinido, temporal, etc.)',
  iban: 'IBAN',
};

export async function POST(request: NextRequest) {
  try {
    // Autenticación y validación de rol HR
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Obtener archivo del FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Validar tipo de archivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no soportado. Solo PDF o imágenes.' },
        { status: 400 }
      );
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'El archivo no puede superar 5MB' }, { status: 400 });
    }

    console.log(`[API Extraer] Procesando archivo: ${file.name} (${file.type})`);

    const buffer = Buffer.from(await file.arrayBuffer());

    const isPDF = file.type === 'application/pdf';
    let documentInput: string;
    let openaiFileId: string | null = null;

    // IMPORTANTE: Para Vision API, usar SIEMPRE base64 para imágenes
    // Las URLs de S3 privadas no son accesibles por OpenAI
    // Solo PDFs usan Files API cuando está disponible

    if (isPDF) {
      // Para PDFs: Intentar usar OpenAI Files API si está disponible
      const hasOpenAI = !!process.env.OPENAI_API_KEY;

      if (hasOpenAI) {
        // Producción: Subir a OpenAI Files API
        console.log(`[API Extraer] PDF detectado, subiendo a OpenAI Files API...`);
        try {
          openaiFileId = await uploadPDFToOpenAI(buffer, file.name);
          documentInput = openaiFileId; // Usar file_id
          console.log(`[API Extraer] PDF subido a OpenAI con file_id: ${openaiFileId}`);
        } catch (uploadError: unknown) {
          const errorMessage = uploadError instanceof Error ? uploadError.message : 'Error desconocido';
          console.warn(`[API Extraer] Error subiendo PDF a OpenAI: ${errorMessage}`);
          // Fallback a base64 si falla el upload
          console.log(`[API Extraer] Usando base64 como fallback...`);
          const base64 = buffer.toString('base64');
          documentInput = `data:application/pdf;base64,${base64}`;
        }
      } else {
        // Sin OpenAI: Usar base64 directamente (Anthropic lo soporta)
        console.log(`[API Extraer] PDF detectado, usando base64 directamente...`);
        const base64 = buffer.toString('base64');
        documentInput = `data:application/pdf;base64,${base64}`;
      }
    } else {
      // Para IMÁGENES: SIEMPRE usar base64 (no URLs de S3)
      // OpenAI Vision API requiere URLs públicas o base64
      // S3 privado no es accesible, así que usamos base64
      const base64 = buffer.toString('base64');
      documentInput = `data:${file.type};base64,${base64}`;
      console.log(`[API Extraer] Imagen detectada, usando base64 (tamaño: ${(base64.length / 1024).toFixed(2)} KB)`);
    }

    // Extraer datos usando Vision Pattern
    // Si es PDF y usamos Anthropic, forzar proveedor
    const result = await analyzeDocument(
      documentInput,
      empleadoDataSchema,
      fieldsToExtract,
      {
        additionalInstructions: 'Si algún dato no está disponible o no es visible, no lo incluyas en el JSON.',
        temperature: 0.1, // Baja temperatura para mayor precisión
        imageDetail: 'high', // Alta calidad para documentos
        filename: isPDF ? file.name : undefined, // Incluir filename para PDFs
        provider: isPDF && !openaiFileId && process.env.ANTHROPIC_API_KEY 
          ? AIProvider.ANTHROPIC  // Forzar Anthropic para PDFs en base64
          : undefined,
      }
    );

    if (!result.success || !result.data) {
      console.error('[API Extraer] Error en Vision Pattern:', result.error);
      return NextResponse.json(
        { error: result.error || 'Error al extraer datos del documento' },
        { status: 500 }
      );
    }

    console.log(`[API Extraer] Datos extraídos con ${result.provider}:`, result.data);
    console.log(`[API Extraer] Uso de tokens:`, result.usage);

    // Limpiar archivo de OpenAI si se subió (operación asíncrona en background)
    if (openaiFileId) {
      // Eliminar archivo en background (no esperar)
      deleteOpenAIFile(openaiFileId).catch((err) => {
        console.warn(`[API Extraer] Error eliminando archivo temporal de OpenAI:`, err);
      });
    }

    // Añadir empresaId automáticamente
    const datosExtraidos = {
      ...result.data,
      empresaId: session.user.empresaId,
    };

    return NextResponse.json({
      success: true,
      datosExtraidos,
      metadata: {
        provider: result.provider,
        usage: result.usage,
      },
    });
  } catch (error) {
    console.error('[API Extraer] Error:', error);
    return handleApiError(error, 'API POST /api/documentos/extraer');
  }
}




