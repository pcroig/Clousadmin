// ========================================
// API Route: Política de Ausencias de Empresa
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UsuarioRol } from '@/lib/constants/enums';

/**
 * GET /api/empresa/politica-ausencias
 * Obtener política de ausencias de la empresa
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener configuración de la empresa
    const empresa = await prisma.empresa.findUnique({
      where: { id: session.user.empresaId },
      select: {
        config: true,
      },
    });

    if (!empresa) {
      return NextResponse.json(
        { error: 'Empresa no encontrada' },
        { status: 404 }
      );
    }

    const config = empresa.config as Record<string, unknown> | null;
    
    // Retornar política de ausencias (valores por defecto si no existen)
    return NextResponse.json({
      maxSolapamientoPct: config?.maxSolapamientoPct || 50,
      requiereAntelacionDias: config?.requiereAntelacionDias || 5,
    });
  } catch (error) {
    console.error('[GET /api/empresa/politica-ausencias] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener política de ausencias' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/empresa/politica-ausencias
 * Actualizar política de ausencias de la empresa
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { maxSolapamientoPct, requiereAntelacionDias } = body;

    // Validaciones
    if (
      typeof maxSolapamientoPct !== 'number' ||
      maxSolapamientoPct < 0 ||
      maxSolapamientoPct > 100
    ) {
      return NextResponse.json(
        { error: 'El porcentaje de solapamiento debe estar entre 0 y 100' },
        { status: 400 }
      );
    }

    if (
      typeof requiereAntelacionDias !== 'number' ||
      requiereAntelacionDias < 0 ||
      requiereAntelacionDias > 365
    ) {
      return NextResponse.json(
        { error: 'Los días de antelación deben estar entre 0 y 365' },
        { status: 400 }
      );
    }

    // Obtener configuración actual
    const empresa = await prisma.empresa.findUnique({
      where: { id: session.user.empresaId },
      select: { config: true },
    });

    if (!empresa) {
      return NextResponse.json(
        { error: 'Empresa no encontrada' },
        { status: 404 }
      );
    }

    const configActual = (empresa.config as Record<string, unknown>) || {};

    // Actualizar config
    await prisma.empresa.update({
      where: { id: session.user.empresaId },
      data: {
        config: {
          ...configActual,
          maxSolapamientoPct,
          requiereAntelacionDias,
        },
      },
    });

    return NextResponse.json({
      maxSolapamientoPct,
      requiereAntelacionDias,
    });
  } catch (error) {
    console.error('[PATCH /api/empresa/politica-ausencias] Error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar política de ausencias' },
      { status: 500 }
    );
  }
}

