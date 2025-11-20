// ========================================
// API Route: Upload Files to S3
// ========================================

import { Readable } from 'node:stream';

import { NextRequest } from 'next/server';

import { badRequestResponse, handleApiError, requireAuth, successResponse } from '@/lib/api-handler';
import { inferirTipoDocumento, obtenerOCrearCarpetaSistema } from '@/lib/documentos';
import { prisma } from '@/lib/prisma';
import { getClientIP, rateLimitApiWrite } from '@/lib/rate-limit';
import { isS3Configured, uploadToS3 } from '@/lib/s3';
import { sanitizeFileName } from '@/lib/utils/file-helpers';

// Configuración de Next.js para manejar uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? '10');

async function getUploadBody(file: File) {
  if (isS3Configured()) {
    const webStream = file.stream() as unknown as ReadableStream;
    return Readable.fromWeb(webStream);
  }
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Rate limiting por usuario + empresa + IP
    const clientIP = getClientIP(req.headers);
    const rateIdentifier = `${session.user.empresaId}:${session.user.id}:${clientIP}`;
    const rateResult = await rateLimitApiWrite(rateIdentifier);
    if (!rateResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Demasiadas subidas seguidas. Intenta nuevamente en unos segundos.',
          retryAfter: rateResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateResult.retryAfter ?? 1),
          },
        }
      );
    }

    // Obtener el archivo del FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const tipo = formData.get('tipo') as string; // 'justificante', 'documento', etc.
    const empleadoId = formData.get('empleadoId') as string | null; // Opcional: para crear documento asociado
    const crearDocumento = formData.get('crearDocumento') === 'true'; // Si debe crear registro en BD

    if (!file) {
      return badRequestResponse('No se proporcionó ningún archivo');
    }

    // Validar tamaño dinámico
    const maxBytes = DEFAULT_MAX_UPLOAD_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      return badRequestResponse(`El archivo es demasiado grande. Máximo ${DEFAULT_MAX_UPLOAD_MB}MB`);
    }

    // Validar tipo de archivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return badRequestResponse('Tipo de archivo no permitido. Solo PDF, JPG o PNG');
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const safeBaseName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, '') || 'archivo');
    const fileName = `${tipo || 'archivo'}_${session.user.empresaId}_${safeBaseName}_${timestamp}_${randomStr}.${extension}`;
    
    // Determinar cuerpo para storage (stream si S3, buffer si local)
    const storageBody = await getUploadBody(file);

    // Subir a S3/local
    const s3Key = `uploads/${session.user.empresaId}/${tipo || 'general'}/${fileName}`;
    const url = await uploadToS3(storageBody, s3Key, file.type);

    let documento = null;

    // Si se solicita crear documento en BD (para justificantes, etc.)
    if (crearDocumento && empleadoId) {
      const tipoNormalizado = (tipo || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      const esJustificante =
        tipoNormalizado === 'justificante' ||
        tipoNormalizado === 'justificantes' ||
        tipoNormalizado === 'medico' ||
        tipoNormalizado === 'medicos';

      // Determinar la carpeta según el tipo solicitado
      const carpetaNombre: 'Justificantes' | 'Otros' = esJustificante ? 'Justificantes' : 'Otros';

      // Obtener o crear carpeta correspondiente
      const carpeta = await obtenerOCrearCarpetaSistema(
        empleadoId,
        session.user.empresaId,
        carpetaNombre
      );

      const tipoDocumentoBD = inferirTipoDocumento(carpetaNombre, tipo);

      // Crear documento en BD
      documento = await prisma.documento.create({
        data: {
          empresaId: session.user.empresaId,
          empleadoId,
          carpetaId: carpeta.id,
          nombre: file.name,
          tipoDocumento: tipoDocumentoBD,
          mimeType: file.type,
          tamano: file.size,
          s3Key,
          s3Bucket: process.env.STORAGE_BUCKET || 'local',
        },
      });
    }

    return successResponse({
      url,
      fileName,
      size: file.size,
      type: file.type,
      createdAt: new Date().toISOString(),
      documento: documento
        ? {
            id: documento.id,
            nombre: documento.nombre,
            carpetaId: documento.carpetaId,
          }
        : null,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/upload');
  }
}





