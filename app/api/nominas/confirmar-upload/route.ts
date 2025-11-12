// ========================================
// API: Confirmar Upload de Nóminas
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { confirmarUpload, obtenerSesion } from '@/lib/imports/nominas-upload';
import { join } from 'path';

import { UsuarioRol } from '@/lib/constants/enums';

// POST /api/nominas/confirmar-upload
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    // Verificar autenticación y rol
    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    console.log('[API nominas/confirmar-upload] POST');

    // Obtener body
    const body = await req.json();
    const { sessionId, confirmaciones } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Se requiere sessionId' },
        { status: 400 }
      );
    }

    if (!confirmaciones || !Array.isArray(confirmaciones)) {
      return NextResponse.json(
        { error: 'Se requiere array de confirmaciones' },
        { status: 400 }
      );
    }

    console.log(
      `[API nominas/confirmar-upload] Confirmando ${confirmaciones.length} nómina(s)`
    );

    // Verificar que la sesión existe y pertenece a la empresa correcta
    const uploadSession = obtenerSesion(sessionId);
    if (!uploadSession) {
      return NextResponse.json(
        { error: 'Sesión no encontrada o expirada' },
        { status: 404 }
      );
    }

    if (uploadSession.empresaId !== session.user.empresaId) {
      return NextResponse.json(
        { error: 'No autorizado para esta sesión' },
        { status: 403 }
      );
    }

    // Confirmar upload (crea documentos y nóminas)
    const uploadDir = join(process.cwd(), 'uploads');
    const result = await confirmarUpload(
      sessionId,
      confirmaciones,
      uploadDir,
      session.user.empresaId,
      session.user.id
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: 'Error al confirmar upload',
          details: result.errors,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: result.imported,
      errors: result.errors,
      message: `${result.imported} nómina(s) importada(s) correctamente`,
    });
  } catch (error) {
    console.error('[API nominas/confirmar-upload] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al confirmar upload',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}














