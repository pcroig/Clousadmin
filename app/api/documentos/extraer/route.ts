// ========================================
// API Route: Extraer Datos de Documentos con IA
// ========================================
// POST /api/documentos/extraer
// Extrae datos de empleado desde contrato o DNI usando OpenAI Vision

import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/ia/client';
import { uploadToS3 } from '@/lib/s3';
import { requireAuthAsHR, handleApiError } from '@/lib/api-handler';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 segundos para procesamiento de IA

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

    // Subir archivo a S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Key = `documentos/temp/${Date.now()}-${file.name}`;
    const s3Url = await uploadToS3(buffer, s3Key, file.type);

    console.log(`[API Extraer] Archivo subido a S3: ${s3Url}`);

    // Extraer datos con OpenAI Vision
    const openai = getOpenAIClient();

    let prompt = `Analiza este documento y extrae los siguientes datos del empleado si están disponibles:

- Nombre
- Apellidos
- Email
- NIF/DNI/NIE
- Teléfono
- Fecha de nacimiento
- Dirección (calle, número, piso, código postal, ciudad, provincia)
- NSS (Número de Seguridad Social)
- Puesto de trabajo
- Fecha de alta/inicio
- Salario bruto anual
- Tipo de contrato
- IBAN

Responde SOLO con un objeto JSON válido sin markdown. Si algún dato no está disponible, no lo incluyas en el JSON.

Ejemplo de respuesta:
{
  "nombre": "Juan",
  "apellidos": "García López",
  "email": "juan.garcia@empresa.com",
  "nif": "12345678A",
  "telefono": "+34 600123456",
  "fechaNacimiento": "1990-05-15",
  "direccionCalle": "Calle Mayor",
  "direccionNumero": "123",
  "direccionPiso": "3º B",
  "codigoPostal": "28001",
  "ciudad": "Madrid",
  "direccionProvincia": "Madrid",
  "nss": "281234567890",
  "puesto": "Desarrollador Senior",
  "fechaAlta": "2024-01-15",
  "salarioBrutoAnual": "45000",
  "tipoContrato": "indefinido",
  "iban": "ES7921000813610123456789"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: s3Url,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1, // Baja temperatura para mayor precisión
    });

    const extractedText = response.choices[0]?.message?.content || '{}';
    console.log(`[API Extraer] Respuesta de OpenAI:`, extractedText);

    // Parsear JSON de la respuesta
    let datosExtraidos: any = {};
    try {
      // Limpiar respuesta de posibles markdown
      const cleanedText = extractedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      datosExtraidos = JSON.parse(cleanedText);
    } catch (error) {
      console.error('[API Extraer] Error parseando JSON de OpenAI:', error);
      return NextResponse.json(
        { error: 'Error al extraer datos del documento' },
        { status: 500 }
      );
    }

    console.log(`[API Extraer] Datos extraídos:`, datosExtraidos);

    // Añadir empresaId automáticamente
    datosExtraidos.empresaId = session.user.empresaId;

    return NextResponse.json({
      success: true,
      datosExtraidos,
      s3Url,
    });
  } catch (error) {
    console.error('[API Extraer] Error:', error);
    return NextResponse.json(
      { error: 'Error al procesar documento' },
      { status: 500 }
    );
  }
}




