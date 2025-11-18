// ========================================
// API Empleados Avatar - POST
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { UsuarioRol } from '@/lib/constants/enums';

import {
  requireAuth,
  handleApiError,
  successResponse,
  notFoundResponse,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/api-handler';

// Nota: S3 upload se implementará cuando esté configurado
// Por ahora retornamos una URL de placeholder

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// POST /api/empleados/[id]/avatar - Subir avatar
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // TODO: Implementar subida a S3
    // const s3Key = `avatars/${session.empresaId}/${params.id}.${file.name.split('.').pop()}`;
    // const avatarUrl = await uploadToS3(file, s3Key);

    // Por ahora, generar URL de placeholder con las iniciales
    const empleado = await prisma.empleado.findUnique({
      where: { id },
      select: {
        nombre: true,
        apellidos: true,
        usuarioId: true,
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    const initials = `${empleado.nombre.charAt(0)}${empleado.apellidos.charAt(0)}`;
    const placeholderUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&size=256`;

    // Actualizar fotoUrl y mantener el avatar del usuario sincronizado
    const updates = [
      prisma.empleado.update({
        where: { id },
        data: { fotoUrl: placeholderUrl },
      }),
    ];

    if (empleado.usuarioId) {
      updates.push(
        prisma.usuario.update({
          where: { id: empleado.usuarioId },
          data: { avatar: placeholderUrl },
        })
      );
    }

    await prisma.$transaction(updates);

    return successResponse({
      success: true,
      url: placeholderUrl,
      message: 'Avatar actualizado correctamente (usando placeholder hasta que S3 esté configurado)',
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/empleados/[id]/avatar');
  }
}

