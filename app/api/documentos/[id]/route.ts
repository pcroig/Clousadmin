// ========================================
// API: Documentos - Descarga y Eliminación
// ========================================

import { existsSync } from 'fs';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { logAccesoSensibles } from '@/lib/auditoria';
import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { puedeAccederACarpeta } from '@/lib/documentos';
import { crearNotificacionDocumentoEliminado } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { deleteFromS3, getSignedDownloadUrl } from '@/lib/s3';

// GET /api/documentos/[id] - Descargar documento
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const documento = await prisma.documentos.findUnique({
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

    const searchParams = request.nextUrl.searchParams;
    const metaParam = searchParams.get('meta') ?? searchParams.get('metadata');
    const wantsMetadata = metaParam === '1' || metaParam === 'true';

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
    } else if (session.user.rol !== UsuarioRol.hr_admin) {
      // Documento sin carpeta: solo HR puede acceder
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a este documento' },
        { status: 403 }
      );
    }

    if (wantsMetadata) {
      return NextResponse.json({
        success: true,
        documento: {
          id: documento.id,
          nombre: documento.nombre,
          carpetaId: documento.carpetaId,
          empleadoId: documento.empleadoId,
          tipoDocumento: documento.tipoDocumento,
          carpeta: documento.carpeta
            ? {
                id: documento.carpeta.id,
                nombre: documento.carpeta.nombre,
                compartida: documento.carpeta.compartida,
                asignadoA: documento.carpeta.asignadoA,
                empleadoId: documento.carpeta.empleadoId,
                esSistema: documento.carpeta.esSistema,
              }
            : null,
        },
      });
    }

    if (!documento.s3Key) {
      return NextResponse.json(
        { error: 'Documento sin ruta de almacenamiento' },
        { status: 500 }
      );
    }

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
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'Solo HR Admin puede eliminar documentos' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const documento = await prisma.documentos.findUnique({
      where: { id },
      select: {
        id: true,
        s3Key: true,
        s3Bucket: true,
        nombre: true,
        tipoDocumento: true,
        empleadoId: true,
        empresaId: true,
      },
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
    await prisma.documentos.delete({
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

    // Notificar al empleado si el documento le pertenecía
    if (documento.empleadoId) {
      try {
        await crearNotificacionDocumentoEliminado(
          prisma,
          {
            documentoNombre: documento.nombre,
            tipoDocumento: documento.tipoDocumento || 'Documento',
            empresaId: documento.empresaId,
            empleadoId: documento.empleadoId,
          },
          { actorUsuarioId: session.user.id }
        );
      } catch (error) {
        console.error('[Documentos] Error creando notificación de eliminación:', error);
      }
    }

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
