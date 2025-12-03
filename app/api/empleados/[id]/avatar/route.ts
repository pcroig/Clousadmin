// ========================================
// API Empleados Avatar - POST
// ========================================

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  forbiddenResponse,
  handleApiError,
  notFoundResponse,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { uploadToS3 } from '@/lib/s3';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function getFileExtension(mimeType: string) {
  return MIME_EXTENSION_MAP[mimeType] || 'jpg';
}

// POST /api/empleados/[id]/avatar - Subir avatar
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Verificar permisos: solo el propio empleado o HR Admin
    if (
      session.user.empleadoId !== id &&
      session.user.rol !== UsuarioRol.hr_admin
    ) {
      return forbiddenResponse('No tienes permisos para actualizar este avatar');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return badRequestResponse('No se proporcionó ningún archivo');
    }

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return badRequestResponse('Tipo de archivo no permitido. Solo JPG, PNG y WEBP');
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      return badRequestResponse('El archivo es demasiado grande. Máximo 2MB');
    }

    const empleado = await prisma.empleados.findUnique({
      where: { id },
      select: {
        nombre: true,
        apellidos: true,
        usuarioId: true,
        empresaId: true,
        fotoUrl: true,
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    if (
      session.user.rol === UsuarioRol.hr_admin &&
      session.user.empresaId &&
      empleado.empresaId !== session.user.empresaId
    ) {
      return forbiddenResponse('No puedes actualizar avatares de otra empresa');
    }

    const empresaFolder = empleado.empresaId || session.user.empresaId || 'global';
    const extension = getFileExtension(file.type);
    const objectKey = `avatars/${empresaFolder}/${id}-${Date.now()}-${randomUUID()}.${extension}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const avatarUrl = await uploadToS3(fileBuffer, objectKey, file.type, {
      acl: 'public-read',
      cacheControl: 'public,max-age=31536000,immutable',
    });

    // Actualizar solo empleado.fotoUrl como fuente única de verdad
    await prisma.empleados.update({
      where: { id },
      data: { fotoUrl: avatarUrl },
    });

    // Invalidar cache del layout para que se actualice el avatar en el sidebar
    revalidatePath('/', 'layout');

    return successResponse({
      success: true,
      url: avatarUrl,
      message: 'Avatar actualizado correctamente',
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/empleados/[id]/avatar');
  }
}

