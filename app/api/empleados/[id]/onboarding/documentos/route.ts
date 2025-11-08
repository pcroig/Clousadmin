// ========================================
// API Route: Subir Documentos de Onboarding (HR)
// ========================================
// Permite a HR subir documentos de onboarding para un empleado
// después de crear el empleado y activar el onboarding

import { NextRequest, NextResponse } from 'next/server';
import {
  requireAuthAsHR,
  handleApiError,
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { subirDocumentoOnboarding } from '@/lib/documentos/onboarding';
import { uploadToS3, getSignedDownloadUrl } from '@/lib/s3';
import { randomBytes } from 'crypto';
import { obtenerOnboardingConfig } from '@/lib/onboarding-config';
import { validarDocumentosRequeridosCompletos } from '@/lib/documentos/onboarding';
import { guardarProgresoDocumentos } from '@/lib/onboarding';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/empleados/[id]/onboarding/documentos - Subir documento de onboarding (HR)
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: empleadoId } = await params;

    // Verificar que el empleado existe y pertenece a la misma empresa
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
      include: {
        empresa: true,
        onboarding: true,
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    if (empleado.empresaId !== session.user.empresaId) {
      return forbiddenResponse('El empleado no pertenece a tu empresa');
    }

    // Verificar que existe un onboarding activo
    if (!empleado.onboarding || empleado.onboarding.completado) {
      return badRequestResponse(
        'El empleado no tiene un onboarding activo. Debes activar el onboarding primero.'
      );
    }

    // Leer FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const nombreDocumento = formData.get('nombreDocumento') as string;
    const tipoDocumento = formData.get('tipoDocumento') as string;

    if (!file || !nombreDocumento || !tipoDocumento) {
      return badRequestResponse(
        'Faltan datos requeridos (file, nombreDocumento, tipoDocumento)'
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
      return badRequestResponse(
        'Tipo de archivo no permitido. Solo PDF, JPG y PNG.'
      );
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return badRequestResponse('El archivo es demasiado grande. Máximo 5MB.');
    }

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generar clave única para S3
    const timestamp = Date.now();
    const randomString = randomBytes(8).toString('hex');
    const fileExtension = file.name.split('.').pop();
    const s3Key = `onboarding/${empleado.empresaId}/${empleadoId}/${tipoDocumento}-${timestamp}-${randomString}.${fileExtension}`;

    // Subir a S3
    const s3Bucket = process.env.S3_BUCKET!;
    await uploadToS3(buffer, s3Key, file.type);

    // Guardar documento en base de datos
    const resultado = await subirDocumentoOnboarding(
      empleado.empresaId,
      empleadoId,
      nombreDocumento,
      tipoDocumento,
      s3Key,
      s3Bucket,
      file.type,
      file.size
    );

    if (!resultado.success) {
      return badRequestResponse(
        resultado.error || 'Error al guardar documento'
      );
    }

    // Generar URL de descarga
    const downloadUrl = await getSignedDownloadUrl(s3Key);

    // Verificar si todos los documentos requeridos están completos y actualizar progreso
    const configResult = await obtenerOnboardingConfig(empleado.empresaId);
    if (configResult.success && configResult.config) {
      const documentosRequeridos = configResult.config.documentosRequeridos || [];
      if (documentosRequeridos.length > 0) {
        const validacionDocs = await validarDocumentosRequeridosCompletos(
          empleado.empresaId,
          empleadoId,
          documentosRequeridos
        );

        // Si todos los documentos requeridos están completos, actualizar progreso
        if (validacionDocs.success && validacionDocs.completo) {
          await guardarProgresoDocumentos(empleado.onboarding.token);
        }
      }
    }

    return successResponse({
      success: true,
      message: 'Documento subido correctamente',
      documento: {
        ...resultado.documento,
        downloadUrl,
      },
    });
  } catch (error) {
    return handleApiError(
      error,
      'API POST /api/empleados/[id]/onboarding/documentos'
    );
  }
}

// GET /api/empleados/[id]/onboarding/documentos - Listar documentos de onboarding (HR)
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id: empleadoId } = await params;

    // Verificar que el empleado existe y pertenece a la misma empresa
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
      include: {
        onboarding: true,
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    if (empleado.empresaId !== session.user.empresaId) {
      return forbiddenResponse('El empleado no pertenece a tu empresa');
    }

    // Listar documentos de onboarding
    const { listarDocumentosOnboarding } = await import(
      '@/lib/documentos/onboarding'
    );
    const resultado = await listarDocumentosOnboarding(
      empleado.empresaId,
      empleadoId
    );

    if (!resultado.success) {
      return badRequestResponse(
        resultado.error || 'Error al listar documentos'
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
          console.error(
            '[GET /api/empleados/[id]/onboarding/documentos] Error generando URL:',
            error
          );
          return {
            ...doc,
            downloadUrl: null,
          };
        }
      })
    );

    return successResponse({
      success: true,
      documentos: documentosConUrls,
      carpeta: resultado.carpeta,
    });
  } catch (error) {
    return handleApiError(
      error,
      'API GET /api/empleados/[id]/onboarding/documentos'
    );
  }
}



