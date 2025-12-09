// ========================================
// API: Crear Carpeta Centralizada
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/carpetas/centralizada
 *
 * Crea una carpeta centralizada (visible solo para HR)
 * para organizar documentos firmados desde carpetas compartidas
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo HR puede crear carpetas centralizadas
    if (session.user.rol !== 'hr_admin') {
      return NextResponse.json(
        { error: 'Solo recursos humanos puede crear carpetas centralizadas' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { nombre: string };

    if (!body.nombre || body.nombre.trim().length === 0) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const nombreCarpeta = body.nombre.trim();

    // Usar upsert para evitar race condition
    // Si existe, la retornamos; si no, la creamos
    try {
      // Intentar buscar primero
      let carpeta = await prisma.carpetas.findFirst({
        where: {
          empresaId: session.user.empresaId,
          empleadoId: null,
          asignadoA: 'hr',
          nombre: nombreCarpeta,
        },
        select: {
          id: true,
          nombre: true,
        },
      });

      if (carpeta) {
        // Ya existe, retornarla con éxito (idempotente)
        return NextResponse.json({
          success: true,
          carpeta,
          existente: true,
        });
      }

      // No existe, crearla
      carpeta = await prisma.carpetas.create({
        data: {
          empresaId: session.user.empresaId,
          nombre: nombreCarpeta,
          empleadoId: null, // Sin empleado → centralizada
          asignadoA: 'hr', // Solo HR
          compartida: false, // NO es compartida (es centralizada para HR)
          esSistema: false, // No es del sistema (es custom)
        },
        select: {
          id: true,
          nombre: true,
        },
      });

      return NextResponse.json({
        success: true,
        carpeta,
        existente: false,
      });
    } catch (createError: unknown) {
      // Si falla create por unique constraint (race condition),
      // intentar buscar de nuevo
      console.error('[POST /api/carpetas/centralizada] Error al crear:', createError);

      const carpetaExistente = await prisma.carpetas.findFirst({
        where: {
          empresaId: session.user.empresaId,
          empleadoId: null,
          asignadoA: 'hr',
          nombre: nombreCarpeta,
        },
        select: {
          id: true,
          nombre: true,
        },
      });

      if (carpetaExistente) {
        // Otra request la creó entre nuestro findFirst y create
        return NextResponse.json({
          success: true,
          carpeta: carpetaExistente,
          existente: true,
        });
      }

      // Error genuino, propagarlo
      throw createError;
    }
  } catch (error: unknown) {
    console.error('[POST /api/carpetas/centralizada] Error:', error);
    return NextResponse.json({ error: 'Error al crear carpeta' }, { status: 500 });
  }
}
