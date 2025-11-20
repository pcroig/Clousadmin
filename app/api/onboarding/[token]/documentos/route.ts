// ========================================
// API Route: Onboarding Documentos - Subir y listar documentos durante onboarding
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { verificarTokenOnboarding, guardarProgresoDocumentos } from '@/lib/onboarding';
import {
  listarDocumentosOnboarding,
  subirDocumentoOnboarding,
  validarDocumentosRequeridosCompletos,
} from '@/lib/documentos/onboarding';
import { obtenerOnboardingConfig } from '@/lib/onboarding-config';
import { uploadToS3, getSignedDownloadUrl } from '@/lib/s3';
import { randomBytes } from 'crypto';

// GET /api/onboarding/[token]/documentos - Listar documentos subidos
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    // Verificar token
    const verificacion = await verificarTokenOnboarding(token);
    if (!verificacion.valido || !verificacion.onboarding) {
      return NextResponse.json(
        {
          success: false,
          error: verificacion.error || 'Token inválido',
        },
        { status: 401 }
      );
    }

    const { onboarding } = verificacion;

    // Listar documentos de onboarding
    const resultado = await listarDocumentosOnboarding(
      onboarding.empresaId,
      onboarding.empleadoId
    );

    if (!resultado.success) {
      return NextResponse.json(
        {
          success: false,
          error: resultado.error || 'Error al listar documentos',
        },
        { status: 400 }
      );
    }

    // Generar URLs de descarga para cada documento
    const documentosConUrls = await Promise.all(
      (resultado.documentos || []).map(async (doc) => {
        try {
          const downloadUrl = await getSignedDownloadUrl(doc.s3Key);
          return {
            ...doc,
            downloadUrl,
          };
        } catch (error) {
          console.error('[GET /api/onboarding/[token]/documentos] Error generando URL:', error);
          return {
            ...doc,
            downloadUrl: null,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      documentos: documentosConUrls,
      carpeta: resultado.carpeta,
    });
  } catch (error) {
    console.error('[GET /api/onboarding/[token]/documentos] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}

// POST /api/onboarding/[token]/documentos - Subir documento
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    // Verificar token
    const verificacion = await verificarTokenOnboarding(token);
    if (!verificacion.valido || !verificacion.onboarding) {
      return NextResponse.json(
        {
          success: false,
          error: verificacion.error || 'Token inválido',
        },
        { status: 401 }
      );
    }

    const { onboarding } = verificacion;

    // Leer FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const nombreDocumento = formData.get('nombreDocumento') as string;
    const tipoDocumento = formData.get('tipoDocumento') as string;
    const carpetaDestinoNombreRaw = formData.get('carpetaDestino');
    const carpetaDestinoNombre =
      typeof carpetaDestinoNombreRaw === 'string' ? carpetaDestinoNombreRaw.trim() : null;

    if (!file || !nombreDocumento || !tipoDocumento) {
      return NextResponse.json(
        {
          success: false,
          error: 'Faltan datos requeridos (file, nombreDocumento, tipoDocumento)',
        },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tipo de archivo no permitido. Solo PDF, JPG y PNG.',
        },
        { status: 400 }
      );
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          success: false,
          error: 'El archivo es demasiado grande. Máximo 5MB.',
        },
        { status: 400 }
      );
    }

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generar clave única para S3
    const timestamp = Date.now();
    const randomString = randomBytes(8).toString('hex');
    const fileExtension = file.name.split('.').pop();
    const s3Key = `onboarding/${onboarding.empresaId}/${onboarding.empleadoId}/${tipoDocumento}-${timestamp}-${randomString}.${fileExtension}`;

    // Subir a Object Storage
    const s3Bucket = process.env.STORAGE_BUCKET || 'local';
    await uploadToS3(buffer, s3Key, file.type);

    // Guardar documento en base de datos
    const resultado = await subirDocumentoOnboarding(
      onboarding.empresaId,
      onboarding.empleadoId,
      nombreDocumento,
      tipoDocumento,
      s3Key,
      s3Bucket,
      file.type,
      file.size,
      undefined,
      false,
      carpetaDestinoNombre || undefined
    );

    if (!resultado.success) {
      return NextResponse.json(
        {
          success: false,
          error: resultado.error || 'Error al guardar documento',
        },
        { status: 400 }
      );
    }

    // Generar URL de descarga
    const downloadUrl = await getSignedDownloadUrl(s3Key);

    // Verificar si todos los documentos requeridos están completos y actualizar progreso
    const configResult = await obtenerOnboardingConfig(onboarding.empresaId);
    if (configResult.success && configResult.config) {
      const documentosRequeridos = configResult.config.documentosRequeridos || [];
      if (documentosRequeridos.length > 0) {
        const validacionDocs = await validarDocumentosRequeridosCompletos(
          onboarding.empresaId,
          onboarding.empleadoId,
          documentosRequeridos
        );

        // Si todos los documentos requeridos están completos, actualizar progreso
        if (validacionDocs.success && validacionDocs.completo) {
          await guardarProgresoDocumentos(token);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Documento subido correctamente',
      documento: {
        ...resultado.documento,
        downloadUrl,
      },
    });
  } catch (error) {
    console.error('[POST /api/onboarding/[token]/documentos] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}

