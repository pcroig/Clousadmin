// ========================================
// API Puestos - Documents Management
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { uploadToS3 } from '@/lib/s3';



interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/puestos/[id]/documentos - Listar documentos del puesto
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que el puesto pertenece a la empresa
    const puesto = await prisma.puesto.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
    });

    if (!puesto) {
      return NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      );
    }

    // Obtener documentos
    const documentos = await prisma.documento.findMany({
      where: {
        puestoId: id,
        empresaId: session.user.empresaId,
      },
      select: {
        id: true,
        nombre: true,
        tipoDocumento: true,
        mimeType: true,
        tamano: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const documentosConUrl = documentos.map((doc) => ({
      ...doc,
      createdAt: doc.createdAt.toISOString(),
      downloadUrl: `/api/documentos/${doc.id}?inline=1`,
    }));

    return NextResponse.json(documentosConUrl);
  } catch (error) {
    console.error('Error loading documents:', error);
    return NextResponse.json(
      { error: 'Error al cargar documentos' },
      { status: 500 }
    );
  }
}

// POST /api/puestos/[id]/documentos - Subir documento al puesto
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id: puestoId } = await params;

    // Verificar que el puesto pertenece a la empresa
    const puesto = await prisma.puesto.findFirst({
      where: {
        id: puestoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!puesto) {
      return NextResponse.json(
        { error: 'Puesto no encontrado' },
        { status: 404 }
      );
    }

    // Obtener el archivo del FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tipoDocumento = (formData.get('tipoDocumento') as string) || 'otro';

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó un archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'El archivo es demasiado grande (máximo 10MB)' },
        { status: 400 }
      );
    }

    // Subir a S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Key = `puestos/${puestoId}/${Date.now()}-${file.name}`;
    const s3Url = await uploadToS3(buffer, s3Key, file.type);

    // Guardar metadata en la base de datos
    const documento = await prisma.documento.create({
      data: {
        empresaId: session.user.empresaId,
        puestoId,
        nombre: file.name,
        tipoDocumento,
        mimeType: file.type,
        tamano: file.size,
        s3Key,
        s3Bucket: process.env.STORAGE_BUCKET || 'local',
      },
    });

    return NextResponse.json(documento, { status: 201 });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { error: 'Error al subir documento' },
      { status: 500 }
    );
  }
}

// DELETE /api/puestos/[id]/documentos - Eliminar documento del puesto
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id: puestoId } = await params;
    const { searchParams } = new URL(request.url);
    const documentoId = searchParams.get('documentoId');

    if (!documentoId) {
      return NextResponse.json(
        { error: 'Se requiere documentoId' },
        { status: 400 }
      );
    }

    // Verificar que el documento existe y pertenece al puesto y empresa
    const documento = await prisma.documento.findFirst({
      where: {
        id: documentoId,
        puestoId,
        empresaId: session.user.empresaId,
      },
    });

    if (!documento) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar de la base de datos (el archivo en Blob permanece)
    await prisma.documento.delete({
      where: { id: documentoId },
    });

    return NextResponse.json({ message: 'Documento eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Error al eliminar documento' },
      { status: 500 }
    );
  }
}
