// ========================================
// API: Documentos - Upload y Listado
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import {
  validarMimeType,
  validarTamanoArchivo,
  validarNombreArchivo,
  generarNombreUnico,
  generarRutaStorage,
  puedeSubirACarpeta,
} from '@/lib/documentos';

// GET /api/documentos - Listar documentos
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const carpetaId = searchParams.get('carpetaId');
    const empleadoId = searchParams.get('empleadoId');
    const tipoDocumento = searchParams.get('tipoDocumento');

    // Construir where clause
    const where: any = {
      empresaId: session.user.empresaId,
    };

    // Si no es HR admin, solo puede ver sus propios documentos
    if (session.user.rol !== 'hr_admin') {
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

    const documentos = await prisma.documento.findMany({
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
    });

    return NextResponse.json({ documentos });
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
    if (session.user.rol === 'hr_admin' && empleadoIdParam) {
      empleadoId = empleadoIdParam;
    } else if (carpeta.empleadoId) {
      empleadoId = carpeta.empleadoId;
    }

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

    if (!validarTamanoArchivo(file.size, tipoDocumento)) {
      return NextResponse.json(
        { error: 'Archivo demasiado grande para este tipo de documento' },
        { status: 400 }
      );
    }

    // Generar nombre único
    const nombreUnico = await generarNombreUnico(file.name, carpetaId);

    // Convertir File a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generar ruta de storage
    const rutaStorage = generarRutaStorage(
      session.user.empresaId,
      empleadoId,
      carpeta.nombre,
      nombreUnico
    );

    // Guardar archivo en filesystem local (MVP)
    const uploadDir = join(process.cwd(), 'uploads', session.user.empresaId);
    const fullPath = join(process.cwd(), 'uploads', rutaStorage);
    const dirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));

    // Crear directorios si no existen
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    // Escribir archivo
    await writeFile(fullPath, buffer);

    // Crear registro en DB
    const documento = await prisma.documento.create({
      data: {
        empresaId: session.user.empresaId,
        empleadoId,
        carpetaId,
        nombre: nombreUnico,
        tipoDocumento: tipoDocumento || 'otro',
        mimeType: file.type,
        tamano: file.size,
        s3Key: rutaStorage,
        s3Bucket: 'local', // En MVP es local, en Fase 2 será el bucket de S3
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

    return NextResponse.json({
      success: true,
      documento,
    });
  } catch (error) {
    console.error('Error subiendo documento:', error);
    return NextResponse.json(
      { error: 'Error al subir documento' },
      { status: 500 }
    );
  }
}
