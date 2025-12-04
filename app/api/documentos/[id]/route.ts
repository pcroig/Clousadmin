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
        documento_carpetas: {
          include: {
            carpeta: true,
          },
        },
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

    // Validar permisos de acceso - el documento debe estar en al menos una carpeta accesible
    if (documento.documento_carpetas.length > 0) {
      // Verificar si el usuario tiene acceso a alguna de las carpetas del documento
      let tieneAcceso = false;

      for (const dc of documento.documento_carpetas) {
        const puedeAcceder = await puedeAccederACarpeta(
          dc.carpetaId,
          session.user.id,
          session.user.rol
        );

        if (puedeAcceder) {
          tieneAcceso = true;
          break;
        }
      }

      if (!tieneAcceso) {
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
      // Obtener la primera carpeta del documento (si tiene)
      const primeraCarpeta = documento.documento_carpetas[0]?.carpeta;

      return NextResponse.json({
        success: true,
        documento: {
          id: documento.id,
          nombre: documento.nombre,
          carpetaId: documento.documento_carpetas[0]?.carpetaId || null,
          empleadoId: documento.empleadoId,
          tipoDocumento: documento.tipoDocumento,
          carpeta: primeraCarpeta
            ? {
                id: primeraCarpeta.id,
                nombre: primeraCarpeta.nombre,
                compartida: primeraCarpeta.compartida,
                asignadoA: primeraCarpeta.asignadoA,
                empleadoId: primeraCarpeta.empleadoId,
                esSistema: primeraCarpeta.esSistema,
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

// PATCH /api/documentos/[id] - Editar documento (nombre y/o carpeta)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'Solo HR Admin puede editar documentos' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json() as { nombre?: unknown; carpetaId?: unknown };
    const { nombre, carpetaId } = body;

    // Validar que al menos se proporciona uno de los campos
    if (!nombre && !carpetaId) {
      return NextResponse.json(
        { error: 'Debes proporcionar al menos nombre o carpetaId' },
        { status: 400 }
      );
    }

    // Validar nombre si se proporciona
    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || nombre.trim().length === 0) {
        return NextResponse.json(
          { error: 'El nombre del documento es requerido' },
          { status: 400 }
        );
      }

      if (nombre.length > 255) {
        return NextResponse.json(
          { error: 'El nombre del documento no puede exceder 255 caracteres' },
          { status: 400 }
        );
      }
    }

    // Validar carpetaId si se proporciona
    if (carpetaId !== undefined && typeof carpetaId !== 'string') {
      return NextResponse.json(
        { error: 'El carpetaId debe ser un string' },
        { status: 400 }
      );
    }

    // Buscar documento
    const documento = await prisma.documentos.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        empresaId: true,
      },
    });

    if (!documento) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    if (documento.empresaId !== session.user.empresaId) {
      return NextResponse.json(
        { error: 'No tienes permisos para editar este documento' },
        { status: 403 }
      );
    }

    // Si se proporciona carpetaId, verificar que la carpeta existe y pertenece a la empresa
    if (carpetaId) {
      const carpeta = await prisma.carpetas.findUnique({
        where: { id: carpetaId as string },
        select: { empresaId: true },
      });

      if (!carpeta) {
        return NextResponse.json(
          { error: 'Carpeta de destino no encontrada' },
          { status: 404 }
        );
      }

      if (carpeta.empresaId !== session.user.empresaId) {
        return NextResponse.json(
          { error: 'No tienes permisos para mover a esta carpeta' },
          { status: 403 }
        );
      }
    }

    // Ejecutar actualización en transacción
    const documentoActualizado = await prisma.$transaction(async (tx) => {
      // 1. Actualizar nombre si se proporcionó
      let doc = documento;
      if (nombre !== undefined) {
        doc = await tx.documentos.update({
          where: { id },
          data: { nombre: nombre.trim() },
        });
      }

      // 2. Mover a nueva carpeta si se proporcionó
      if (carpetaId) {
        // Eliminar relaciones existentes (mover = eliminar + crear nueva)
        await tx.documento_carpetas.deleteMany({
          where: { documentoId: id },
        });

        // Crear relación con nueva carpeta
        await tx.documento_carpetas.create({
          data: {
            documentoId: id,
            carpetaId: carpetaId as string,
          },
        });
      }

      return doc;
    });

    const mensaje = nombre && carpetaId
      ? 'Documento actualizado y movido correctamente'
      : carpetaId
      ? 'Documento movido a otra carpeta correctamente'
      : 'Nombre del documento actualizado correctamente';

    return NextResponse.json({
      success: true,
      message: mensaje,
      documento: documentoActualizado,
    });
  } catch (error) {
    console.error('[PATCH /api/documentos/:id] Error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar documento' },
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
