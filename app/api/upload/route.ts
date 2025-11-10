// ========================================
// API Route: Upload Files to S3
// ========================================

import { NextRequest } from 'next/server';
import { requireAuth, handleApiError, successResponse, badRequestResponse } from '@/lib/api-handler';
import { uploadToS3 } from '@/lib/s3';
import { prisma } from '@/lib/prisma';
import { obtenerOCrearCarpetaSistema, TIPOS_DOCUMENTO } from '@/lib/documentos';

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
    const empleadoId = formData.get('empleadoId') as string | null; // Opcional: para crear documento asociado
    const crearDocumento = formData.get('crearDocumento') === 'true'; // Si debe crear registro en BD

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

    let documento = null;

    // Si se solicita crear documento en BD (para justificantes, etc.)
    if (crearDocumento && empleadoId) {
      // Determinar la carpeta según el tipo
      let carpetaNombre: 'Justificantes' | 'Médicos' = 'Justificantes';
      if (tipo === TIPOS_DOCUMENTO.MEDICO || tipo === 'medico') {
        carpetaNombre = 'Médicos';
      }

      // Obtener o crear carpeta correspondiente
      const carpeta = await obtenerOCrearCarpetaSistema(
        empleadoId,
        session.user.empresaId,
        carpetaNombre
      );

      // Crear documento en BD
      documento = await prisma.documento.create({
        data: {
          empresaId: session.user.empresaId,
          empleadoId,
          carpetaId: carpeta.id,
          nombre: file.name,
          tipoDocumento: tipo || 'otro',
          mimeType: file.type,
          tamano: file.size,
          s3Key,
          s3Bucket: process.env.S3_BUCKET || 'local',
        },
      });
    }

    return successResponse({
      url,
      fileName,
      size: file.size,
      type: file.type,
      documento: documento ? {
        id: documento.id,
        nombre: documento.nombre,
        carpetaId: documento.carpetaId,
      } : null,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/upload');
  }
}





