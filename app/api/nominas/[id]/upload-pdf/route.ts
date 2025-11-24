// ========================================
// API: Subir PDF de Nómina Manualmente
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { NOMINA_ESTADOS } from '@/lib/constants/nomina-estados';
import { prisma } from '@/lib/prisma';
import { uploadToS3 } from '@/lib/s3';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Obtener la nómina
    const nomina = await prisma.nomina.findFirst({
      where: {
        id,
        empleado: {
          empresaId: session.user.empresaId,
        },
      },
      include: {
        empleado: true,
        documento: true,
      },
    });

    if (!nomina) {
      return NextResponse.json({ error: 'Nómina no encontrada' }, { status: 404 });
    }

    // Obtener el archivo del FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    // Validar que sea un PDF
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'El archivo debe ser un PDF' }, { status: 400 });
    }

    // Convertir File a Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Nombre del archivo en S3
    const s3Key = `nominas/${session.user.empresaId}/${nomina.empleadoId}/${file.name}`;

    // Subir a S3
    const _s3Url = await uploadToS3(buffer, s3Key, 'application/pdf');

    // Si ya existe un documento, actualizarlo; si no, crear uno nuevo
    const bucketName = process.env.STORAGE_BUCKET || 'local';
    let documento;

    if (nomina.documentoId) {
      // Actualizar documento existente
      documento = await prisma.documento.update({
        where: { id: nomina.documentoId },
        data: {
          nombre: file.name,
          mimeType: 'application/pdf',
          tamano: file.size,
          s3Key,
          s3Bucket: bucketName,
        },
      });
    } else {
      // Crear nuevo documento
      documento = await prisma.documento.create({
        data: {
          empresaId: session.user.empresaId,
          empleadoId: nomina.empleadoId,
          nombre: file.name,
          tipoDocumento: 'nomina',
          mimeType: 'application/pdf',
          tamano: file.size,
          s3Key,
          s3Bucket: bucketName,
        },
      });

      // Vincular documento a la nómina
      await prisma.nomina.update({
        where: { id: nomina.id },
        data: {
          documentoId: documento.id,
        },
      });
    }

    // Actualizar estado de la nómina (publicada)
    await prisma.nomina.update({
      where: { id: nomina.id },
      data: {
        estado: NOMINA_ESTADOS.PUBLICADA,
        fechaPublicacion: new Date(),
        empleadoNotificado: false,
      },
    });

    return NextResponse.json({
      success: true,
      documento,
    });
  } catch (error) {
    console.error('[POST /api/nominas/[id]/upload-pdf] Error:', error);
    return NextResponse.json(
      { error: 'Error al subir el PDF' },
      { status: 500 }
    );
  }
}
