// ========================================
// API Route: Upload Files to S3
// ========================================

import { NextRequest } from 'next/server';
import { requireAuth, handleApiError, successResponse, badRequestResponse } from '@/lib/api-handler';
import { uploadToS3 } from '@/lib/s3';

// Configuración de Next.js para manejar uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Obtener el archivo del FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const tipo = formData.get('tipo') as string; // 'justificante', 'documento', etc.

    if (!file) {
      return badRequestResponse('No se proporcionó ningún archivo');
    }

    // Validar tamaño (máximo 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return badRequestResponse('El archivo es demasiado grande. Máximo 5MB');
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
    const fileName = `${tipo || 'archivo'}_${session.user.empresaId}_${timestamp}_${randomStr}.${extension}`;
    
    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Subir a S3
    const s3Key = `uploads/${session.user.empresaId}/${tipo || 'general'}/${fileName}`;
    const url = await uploadToS3(buffer, s3Key, file.type);

    return successResponse({
      url,
      fileName,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/upload');
  }
}





