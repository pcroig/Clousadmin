// ========================================
// API: Documentos - Descarga y Eliminación
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { puedeAccederACarpeta } from '@/lib/documentos';

import { UsuarioRol } from '@/lib/constants/enums';
import { deleteFromS3, getSignedDownloadUrl } from '@/lib/s3';
import { logAccesoSensibles } from '@/lib/auditoria';

// GET /api/documentos/[id] - Descargar documento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const documento = await prisma.documento.findUnique({
      where: { id },
      include: {
        carpeta: true,
        empleado: {
          include: {
            usuario: true,
          },
        },
      },
    });

    if (!documento || documento.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    if (!documento.s3Key) {
      return NextResponse.json(
        { error: 'Documento sin ruta de almacenamiento' },
        { status: 500 }
      );
    }

    // Validar permisos de acceso a la carpeta
    if (documento.carpetaId) {
      const puedeAcceder = await puedeAccederACarpeta(
        documento.carpetaId,
        session.user.id,
        session.user.rol
      );

      if (!puedeAcceder) {
        return NextResponse.json(
          { error: 'No tienes permisos para acceder a este documento' },
          { status: 403 }
        );
      }
    } else {
      // Documento sin carpeta: solo HR puede acceder
      if (session.user.rol !== UsuarioRol.hr_admin) {
        return NextResponse.json(
          { error: 'No tienes permisos para acceder a este documento' },
          { status: 403 }
        );
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const inlineParam = searchParams.get('inline') ?? searchParams.get('preview');
    const isInline = inlineParam === '1' || inlineParam === 'true';
    const dispositionType = isInline ? 'inline' : 'attachment';

    const isCloudDocument =
      documento.s3Bucket && documento.s3Bucket !== 'local' && documento.s3Key;

    await logAccesoSensibles({
      request,
      session,
      recurso: 'documento',
      empleadoAccedidoId: documento.empleadoId ?? undefined,
      camposAccedidos: [documento.tipoDocumento ?? 'documento'],
    });

    if (isCloudDocument) {
      const signedUrl = await getSignedDownloadUrl(documento.s3Key, {
        responseContentType: documento.mimeType,
        responseContentDisposition: `${dispositionType}; filename="${encodeURIComponent(
          documento.nombre
        )}"`,
      });
      return NextResponse.redirect(signedUrl, 302);
    }

    // Leer archivo del filesystem (modo local / legado)
    const filePath = join(process.cwd(), 'uploads', documento.s3Key);

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'Archivo no encontrado en el servidor' },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': documento.mimeType,
        'Content-Disposition': `${dispositionType}; filename="${encodeURIComponent(documento.nombre)}"`,
        'Content-Length': documento.tamano.toString(),
      },
    });
  } catch (error) {
    console.error('Error descargando documento:', error);
    return NextResponse.json(
      { error: 'Error al descargar documento' },
      { status: 500 }
    );
  }
}

// DELETE /api/documentos/[id] - Eliminar documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'Solo HR Admin puede eliminar documentos' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const documento = await prisma.documento.findUnique({
      where: { id },
    });

    if (!documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    if (!documento.s3Key) {
      return NextResponse.json(
        { error: 'Documento sin ruta de almacenamiento' },
        { status: 500 }
      );
    }

    const isCloudDocument =
      documento.s3Bucket && documento.s3Bucket !== 'local' && documento.s3Key;

    if (isCloudDocument) {
      await deleteFromS3(documento.s3Key);
    } else {
      // Eliminar archivo del filesystem
      const filePath = join(process.cwd(), 'uploads', documento.s3Key);

      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    }

    // Eliminar registro de DB
    await prisma.documento.delete({
      where: { id },
    });

    await logAccesoSensibles({
      request,
      session,
      recurso: 'documento',
      accion: 'eliminacion',
      empleadoAccedidoId: documento.empleadoId ?? undefined,
      camposAccedidos: [documento.tipoDocumento ?? 'documento'],
    });

    return NextResponse.json({
      success: true,
      message: 'Documento eliminado correctamente',
    });
  } catch (error) {
    console.error('Error eliminando documento:', error);
    return NextResponse.json(
      { error: 'Error al eliminar documento' },
      { status: 500 }
    );
  }
}
