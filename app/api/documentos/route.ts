// ========================================
// API: Documentos - Upload y Listado
// ========================================

import { existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { Readable } from 'node:stream';
import { join } from 'path';

import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import {
  generarNombreUnico,
  generarRutaStorage,
  inferirTipoDocumento,
  puedeSubirACarpeta,
  validarMimeType,
  validarNombreArchivo,
  validarTamanoArchivo,
} from '@/lib/documentos';
import { prisma, Prisma } from '@/lib/prisma';
import { getClientIP, rateLimitApiWrite } from '@/lib/rate-limit';
import { shouldUseCloudStorage, uploadToS3 } from '@/lib/s3';
import { sanitizeFileName } from '@/lib/utils/file-helpers';
import {
  buildPaginationMeta,
  parsePaginationParams,
} from '@/lib/utils/pagination';


// GET /api/documentos - Listar documentos
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const clientIP = getClientIP(request.headers);
    const rateIdentifier = `${session.user.empresaId}:${session.user.id}:${clientIP}:documentos`;
    const rateResult = await rateLimitApiWrite(rateIdentifier);

    if (!rateResult.success) {
      return NextResponse.json(
        {
          error: 'Has alcanzado el límite de subidas. Intenta más tarde.',
          retryAfter: rateResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateResult.retryAfter ?? 1),
          },
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const carpetaId = searchParams.get('carpetaId');
    const empleadoId = searchParams.get('empleadoId');
    const tipoDocumento = searchParams.get('tipoDocumento');

    // Construir where clause
    const where: Prisma.DocumentoWhereInput = {
      empresaId: session.user.empresaId,
    };

    // Si no es HR admin, solo puede ver sus propios documentos
    if (session.user.rol !== UsuarioRol.hr_admin) {
      const empleado = await prisma.empleado.findUnique({
        where: { usuarioId: session.user.id },
      });

      if (!empleado) {
        return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
      }

      where.empleadoId = empleado.id;
    } else if (empleadoId) {
      // HR admin puede filtrar por empleado específico
      where.empleadoId = empleadoId;
    }

    if (carpetaId) {
      where.carpetaId = carpetaId;
    }

    if (tipoDocumento) {
      where.tipoDocumento = tipoDocumento;
    }

    const { page, limit, skip } = parsePaginationParams(searchParams);

    const [documentos, total] = await Promise.all([
      prisma.documento.findMany({
        where,
        include: {
          carpeta: true,
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.documento.count({ where }),
    ]);

    return NextResponse.json({
      data: documentos,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    console.error('Error listando documentos:', error);
    return NextResponse.json(
      { error: 'Error al obtener documentos' },
      { status: 500 }
    );
  }
}

// POST /api/documentos - Upload documento
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const carpetaId = formData.get('carpetaId') as string;
    const tipoDocumento = formData.get('tipoDocumento') as string;
    const empleadoIdParam = formData.get('empleadoId') as string | null;

    // Validaciones básicas
    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    if (!carpetaId) {
      return NextResponse.json({ error: 'No se proporcionó carpeta' }, { status: 400 });
    }

    // Obtener carpeta
    const carpeta = await prisma.carpeta.findUnique({
      where: { id: carpetaId },
      include: { empleado: true },
    });

    if (!carpeta) {
      return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 });
    }

    // Validar permisos de escritura
    const puedeSubir = await puedeSubirACarpeta(carpetaId, session.user.id, session.user.rol);

    if (!puedeSubir) {
      return NextResponse.json(
        { error: 'No tienes permisos para subir a esta carpeta' },
        { status: 403 }
      );
    }

    // Determinar empleadoId
    let empleadoId: string | null = null;
    if (session.user.rol === UsuarioRol.hr_admin && empleadoIdParam) {
      empleadoId = empleadoIdParam;
    } else if (carpeta.empleadoId) {
      empleadoId = carpeta.empleadoId;
    }

    const tipoDocumentoFinal = inferirTipoDocumento(carpeta.nombre, tipoDocumento);

    // Validaciones del archivo
    const validacionNombre = validarNombreArchivo(file.name);
    if (!validacionNombre.valido) {
      return NextResponse.json(
        { error: validacionNombre.error },
        { status: 400 }
      );
    }

    if (!validarMimeType(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido' },
        { status: 400 }
      );
    }

    if (!validarTamanoArchivo(file.size, tipoDocumentoFinal)) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande para este tipo de documento' },
        { status: 400 }
      );
    }

    // Generar nombre único
    const baseName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, '') || 'documento');
    const nombreUnico = await generarNombreUnico(baseName, carpetaId);

    // Convertir File a Buffer
    const useCloudStorage = shouldUseCloudStorage();
    const bodyForStorage = useCloudStorage
      ? Readable.fromWeb(file.stream() as unknown as ReadableStream)
      : Buffer.from(await file.arrayBuffer());

    // Generar ruta de storage
    const rutaStorage = generarRutaStorage(
      session.user.empresaId,
      empleadoId,
      carpeta.nombre,
      nombreUnico
    );

    let storageKey = rutaStorage;
    let storageBucket = 'local';
    let localPath: string | null = null;
    let cleanupUpload: (() => Promise<void>) | null = null;

    try {
      if (useCloudStorage) {
        const bucketName = process.env.STORAGE_BUCKET;
        if (!bucketName) {
          throw new Error('STORAGE_BUCKET no configurado');
        }
        storageKey = `documentos/${rutaStorage}`;
        await uploadToS3(bodyForStorage, storageKey, file.type);
        storageBucket = bucketName;
        cleanupUpload = async () => {
          await deleteFromS3(storageKey);
        };
      } else {
        // Guardar archivo en filesystem local
        localPath = join(process.cwd(), 'uploads', rutaStorage);
        const dirPath = localPath.substring(0, localPath.lastIndexOf('/'));

        if (!existsSync(dirPath)) {
          await mkdir(dirPath, { recursive: true });
        }

        await writeFile(localPath, bodyForStorage as Buffer);
        cleanupUpload = async () => {
          if (!localPath) return;
          try {
            await unlink(localPath);
          } catch (cleanupError) {
            console.error('[Documentos] Error eliminando archivo local tras rollback:', cleanupError);
          }
        };
      }

      // Crear registro en DB
      const documento = await prisma.$transaction(async (tx) => {
        return tx.documento.create({
          data: {
            empresaId: session.user.empresaId,
            empleadoId,
            carpetaId,
            nombre: nombreUnico,
            tipoDocumento: tipoDocumentoFinal,
            mimeType: file.type,
            tamano: file.size,
            s3Key: storageKey,
            s3Bucket: storageBucket,
          },
          include: {
            carpeta: true,
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
              },
            },
          },
        });
      });

      cleanupUpload = null;

      // Revalidar la página de la carpeta para mostrar el nuevo documento
      revalidatePath(`/hr/documentos/${carpetaId}`);

      return NextResponse.json({
        success: true,
        documento,
      });
    } catch (error) {
      if (cleanupUpload) {
        try {
          await cleanupUpload();
        } catch (cleanupError) {
          console.error('[Documentos] Error durante rollback de archivo:', cleanupError);
        }
      }
      throw error;
    }
  } catch (error) {
    console.error('Error subiendo documento:', error);
    return NextResponse.json(
      { error: 'Error al subir documento' },
      { status: 500 }
    );
  }
}
