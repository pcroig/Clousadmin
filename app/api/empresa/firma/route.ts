// ========================================
// API: Empresa - Firma Guardada
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { asJsonValue, JSON_NULL } from '@/lib/prisma/json';
import { deleteFromS3, getSignedDownloadUrl, uploadToS3 } from '@/lib/s3';

import type { Prisma } from '@prisma/client';

/**
 * GET /api/empresa/firma - Obtener firma guardada de la empresa
 *
 * Retorna la firma de la empresa si existe
 * Solo accesible por HR admins
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Validar que es HR admin
    if (session.user.rol !== 'hr_admin' && session.user.rol !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Solo HR admins pueden acceder a la firma de empresa' },
        { status: 403 }
      );
    }

    // Obtener empresa
    const empresa = await prisma.empresas.findUnique({
      where: { id: session.user.empresaId },
      select: {
        id: true,
        firmaEmpresaGuardada: true,
        firmaEmpresaS3Key: true,
        firmaEmpresaGuardadaData: true,
        firmaEmpresaGuardadaEn: true,
      },
    });

    if (!empresa) {
      return NextResponse.json(
        { error: 'Empresa no encontrada' },
        { status: 404 }
      );
    }

    let firmaUrl: string | undefined;
    if (empresa.firmaEmpresaGuardada && empresa.firmaEmpresaS3Key) {
      try {
        firmaUrl = await getSignedDownloadUrl(empresa.firmaEmpresaS3Key);
      } catch (error) {
        console.error('[GET /api/empresa/firma] Error generando URL firmada:', error);
      }
    }

    return NextResponse.json({
      firmaGuardada: empresa.firmaEmpresaGuardada,
      firmaS3Key: empresa.firmaEmpresaS3Key,
      firmaGuardadaData: empresa.firmaEmpresaGuardadaData,
      firmaGuardadaEn: empresa.firmaEmpresaGuardadaEn,
      firmaUrl,
    });
  } catch (error) {
    console.error('[GET /api/empresa/firma] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener firma de empresa' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/empresa/firma - Subir/actualizar firma de la empresa
 *
 * Body (multipart/form-data):
 * - file: Imagen de la firma (PNG, SVG, JPEG)
 * - data (opcional): JSON con datos de trazo de firma manuscrita
 *
 * Solo accesible por HR admins
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Validar que es HR admin
    if (session.user.rol !== 'hr_admin' && session.user.rol !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Solo HR admins pueden gestionar la firma de empresa' },
        { status: 403 }
      );
    }

    // Obtener empresa
    const empresa = await prisma.empresas.findUnique({
      where: { id: session.user.empresaId },
      select: {
        id: true,
        firmaEmpresaS3Key: true,
      },
    });

    if (!empresa) {
      return NextResponse.json(
        { error: 'Empresa no encontrada' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const dataStr = formData.get('data') as string | null;

    // Validar que se proporcione el archivo
    if (!file) {
      return NextResponse.json(
        { error: 'Debe proporcionar una imagen de firma' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Use PNG, SVG o JPEG' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'La imagen de firma no puede superar 2MB' },
        { status: 400 }
      );
    }

    // Convertir File a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Eliminar firma anterior si existe
    if (empresa.firmaEmpresaS3Key) {
      try {
        await deleteFromS3(empresa.firmaEmpresaS3Key);
      } catch (error) {
        console.error('[POST /api/empresa/firma] Error eliminando firma anterior:', error);
        // No fallar si no se puede eliminar la firma anterior
      }
    }

    // Subir nueva firma a S3
    const extension = file.type.split('/')[1];
    const s3Key = `firmas/${empresa.id}/empresa/firma.${extension}`;
    await uploadToS3(buffer, s3Key, file.type);

    // Parsear datos de trazo si se proporcionan
    let firmaGuardadaData: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput = JSON_NULL;
    if (dataStr) {
      try {
        const parsed = JSON.parse(dataStr);
        firmaGuardadaData = asJsonValue(parsed);
      } catch {
        return NextResponse.json(
          { error: 'Datos de firma inválidos. Debe ser JSON válido' },
          { status: 400 }
        );
      }
    }

    // Actualizar empresa
    const empresaActualizada = await prisma.empresas.update({
      where: { id: empresa.id },
      data: {
        firmaEmpresaGuardada: true,
        firmaEmpresaS3Key: s3Key,
        firmaEmpresaGuardadaData: firmaGuardadaData,
        firmaEmpresaGuardadaEn: new Date(),
      },
      select: {
        id: true,
        firmaEmpresaGuardada: true,
        firmaEmpresaS3Key: true,
        firmaEmpresaGuardadaData: true,
        firmaEmpresaGuardadaEn: true,
      },
    });

    return NextResponse.json({
      success: true,
      mensaje: 'Firma de empresa guardada correctamente',
      firma: empresaActualizada,
    });
  } catch (error) {
    console.error('[POST /api/empresa/firma] Error:', error);
    return NextResponse.json(
      { error: 'Error al guardar firma de empresa' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/empresa/firma - Eliminar firma de la empresa
 *
 * Solo accesible por HR admins
 */
export async function DELETE(_request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Validar que es HR admin
    if (session.user.rol !== 'hr_admin' && session.user.rol !== 'platform_admin') {
      return NextResponse.json(
        { error: 'Solo HR admins pueden gestionar la firma de empresa' },
        { status: 403 }
      );
    }

    // Obtener empresa
    const empresa = await prisma.empresas.findUnique({
      where: { id: session.user.empresaId },
      select: {
        id: true,
        firmaEmpresaS3Key: true,
      },
    });

    if (!empresa) {
      return NextResponse.json(
        { error: 'Empresa no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar archivo de S3 si existe
    if (empresa.firmaEmpresaS3Key) {
      try {
        await deleteFromS3(empresa.firmaEmpresaS3Key);
      } catch (error) {
        console.error('[DELETE /api/empresa/firma] Error eliminando de S3:', error);
        // Continuar aunque falle la eliminación en S3
      }
    }

    // Actualizar empresa
    await prisma.empresas.update({
      where: { id: empresa.id },
      data: {
        firmaEmpresaGuardada: false,
        firmaEmpresaS3Key: null,
        firmaEmpresaGuardadaData: JSON_NULL,
        firmaEmpresaGuardadaEn: null,
      },
    });

    return NextResponse.json({
      success: true,
      mensaje: 'Firma de empresa eliminada correctamente',
    });
  } catch (error) {
    console.error('[DELETE /api/empresa/firma] Error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar firma de empresa' },
      { status: 500 }
    );
  }
}
