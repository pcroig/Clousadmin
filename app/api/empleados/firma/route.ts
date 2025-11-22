// ========================================
// API: Empleados - Firma Guardada
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deleteFromS3, getSignedDownloadUrl, uploadToS3 } from '@/lib/s3';

/**
 * GET /api/empleados/firma - Obtener firma guardada del empleado autenticado
 *
 * Retorna la firma guardada si existe
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener empleado autenticado
    const empleado = await prisma.empleado.findUnique({
      where: { usuarioId: session.user.id },
      select: {
        id: true,
        firmaGuardada: true,
        firmaS3Key: true,
        firmaGuardadaData: true,
      },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    let firmaUrl: string | undefined;
    if (empleado.firmaGuardada && empleado.firmaS3Key) {
      try {
        firmaUrl = await getSignedDownloadUrl(empleado.firmaS3Key);
      } catch (error) {
        console.error('[GET /api/empleados/firma] Error generando URL firmada:', error);
      }
    }

    return NextResponse.json({
      firmaGuardada: empleado.firmaGuardada,
      firmaS3Key: empleado.firmaS3Key,
      firmaGuardadaData: empleado.firmaGuardadaData,
      firmaUrl,
    });
  } catch (error) {
    console.error('[GET /api/empleados/firma] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener firma guardada' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/empleados/firma - Subir/actualizar firma guardada
 *
 * Body (multipart/form-data):
 * - file: Imagen de la firma (PNG, SVG, JPEG)
 * - data (opcional): JSON con datos de trazo de firma manuscrita
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener empleado autenticado
    const empleado = await prisma.empleado.findUnique({
      where: { usuarioId: session.user.id },
      select: {
        id: true,
        firmaS3Key: true,
        empresaId: true,
      },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
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
    if (empleado.firmaS3Key) {
      try {
        await deleteFromS3(empleado.firmaS3Key);
      } catch (error) {
        console.error('[POST /api/empleados/firma] Error eliminando firma anterior:', error);
        // No fallar si no se puede eliminar la firma anterior
      }
    }

    // Subir nueva firma a S3
    const extension = file.type.split('/')[1];
    const s3Key = `firmas/${empleado.empresaId}/${empleado.id}/firma.${extension}`;
    await uploadToS3(buffer, s3Key, file.type);

    // Parsear datos de trazo si se proporcionan
    let firmaGuardadaData = null;
    if (dataStr) {
      try {
        firmaGuardadaData = JSON.parse(dataStr);
      } catch (error) {
        return NextResponse.json(
          { error: 'Datos de firma inválidos. Debe ser JSON válido' },
          { status: 400 }
        );
      }
    }

    // Actualizar empleado
    const empleadoActualizado = await prisma.empleado.update({
      where: { id: empleado.id },
      data: {
        firmaGuardada: true,
        firmaS3Key: s3Key,
        firmaGuardadaData,
      },
      select: {
        id: true,
        firmaGuardada: true,
        firmaS3Key: true,
        firmaGuardadaData: true,
      },
    });

    return NextResponse.json({
      success: true,
      mensaje: 'Firma guardada correctamente',
      firma: empleadoActualizado,
    });
  } catch (error) {
    console.error('[POST /api/empleados/firma] Error:', error);
    return NextResponse.json(
      { error: 'Error al guardar firma' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/empleados/firma - Eliminar firma guardada
 *
 * Elimina la firma guardada del empleado autenticado
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener empleado autenticado
    const empleado = await prisma.empleado.findUnique({
      where: { usuarioId: session.user.id },
      select: {
        id: true,
        firmaS3Key: true,
      },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar archivo de S3 si existe
    if (empleado.firmaS3Key) {
      try {
        await deleteFromS3(empleado.firmaS3Key);
      } catch (error) {
        console.error('[DELETE /api/empleados/firma] Error eliminando de S3:', error);
        // Continuar aunque falle la eliminación en S3
      }
    }

    // Actualizar empleado
    await prisma.empleado.update({
      where: { id: empleado.id },
      data: {
        firmaGuardada: false,
        firmaS3Key: null,
        firmaGuardadaData: null,
      },
    });

    return NextResponse.json({
      success: true,
      mensaje: 'Firma eliminada correctamente',
    });
  } catch (error) {
    console.error('[DELETE /api/empleados/firma] Error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar firma' },
      { status: 500 }
    );
  }
}
