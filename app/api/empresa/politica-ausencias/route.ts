// ========================================
// API Route: Política de Ausencias de Empresa
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';
import { getJsonBody } from '@/lib/utils/json';

/**
 * GET /api/empresa/politica-ausencias
 * Obtener política de ausencias de la empresa
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener configuración de la empresa
    const empresa = await prisma.empresas.findUnique({
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

    const config = (empresa.config as Record<string, unknown> | null) ?? null;
    const maxSolapamientoPct =
      typeof config?.maxSolapamientoPct === 'number' ? (config.maxSolapamientoPct as number) : 50;
    const requiereAntelacionDias =
      typeof config?.requiereAntelacionDias === 'number' ? (config.requiereAntelacionDias as number) : 5;
    const diasVacacionesDefault =
      typeof config?.diasVacacionesDefault === 'number' ? (config.diasVacacionesDefault as number) : 22;
    const carryOverConfig = (config?.carryOver as Record<string, unknown> | undefined) ?? undefined;
    const carryOverModo =
      carryOverConfig && typeof carryOverConfig.modo === 'string' && carryOverConfig.modo === 'extender'
        ? 'extender'
        : 'limpiar';
    const carryOverMeses =
      carryOverConfig && carryOverConfig.modo === 'extender' ? 4 : 0;

    // Retornar política de ausencias (valores por defecto si no existen)
    return NextResponse.json({
      maxSolapamientoPct,
      requiereAntelacionDias,
      diasVacacionesDefault,
      carryOverModo,
      carryOverMeses,
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

    const body = await getJsonBody<Record<string, unknown>>(req);
    const {
      maxSolapamientoPct,
      requiereAntelacionDias,
      carryOverModo,
      carryOverMeses,
    } = body as {
      maxSolapamientoPct?: number;
      requiereAntelacionDias?: number;
      carryOverModo?: 'limpiar' | 'extender';
      carryOverMeses?: number;
    };

    // Validaciones solo si se proporcionan los campos
    if (
      maxSolapamientoPct !== undefined &&
      (typeof maxSolapamientoPct !== 'number' ||
        maxSolapamientoPct < 0 ||
        maxSolapamientoPct > 100)
    ) {
      return NextResponse.json(
        { error: 'El porcentaje de solapamiento debe estar entre 0 y 100' },
        { status: 400 }
      );
    }

    if (
      requiereAntelacionDias !== undefined &&
      (typeof requiereAntelacionDias !== 'number' ||
        requiereAntelacionDias < 0 ||
        requiereAntelacionDias > 365)
    ) {
      return NextResponse.json(
        { error: 'Los días de antelación deben estar entre 0 y 365' },
        { status: 400 }
      );
    }

    if (carryOverModo && carryOverModo !== 'limpiar' && carryOverModo !== 'extender') {
      return NextResponse.json(
        { error: 'El modo de limpieza debe ser "limpiar" o "extender"' },
        { status: 400 }
      );
    }

    // Obtener configuración actual
    const empresa = await prisma.empresas.findUnique({
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

    // Solo actualizar los campos que se proporcionan
    const configActualizada: Record<string, unknown> = { ...configActual };

    if (maxSolapamientoPct !== undefined) {
      configActualizada.maxSolapamientoPct = maxSolapamientoPct;
    }

    if (requiereAntelacionDias !== undefined) {
      configActualizada.requiereAntelacionDias = requiereAntelacionDias;
    }

    if (typeof carryOverModo === 'string') {
      configActualizada.carryOver = {
        modo: carryOverModo,
        mesesExtension: carryOverModo === 'extender' ? 4 : 0,
      };
    }

    // Actualizar config
    await prisma.empresas.update({
      where: { id: session.user.empresaId },
      data: {
        config: asJsonValue(configActualizada),
      },
    });

    // Retornar los valores actuales (incluyendo los que no se modificaron)
    const carryOverFinal = (configActualizada.carryOver as Record<string, unknown> | undefined) ?? {
      modo: 'limpiar',
      mesesExtension: 0,
    };
    const maxSolFinal = typeof configActualizada.maxSolapamientoPct === 'number'
      ? configActualizada.maxSolapamientoPct
      : 50;
    const reqAntelFinal = typeof configActualizada.requiereAntelacionDias === 'number'
      ? configActualizada.requiereAntelacionDias
      : 5;

    return NextResponse.json({
      maxSolapamientoPct: maxSolFinal,
      requiereAntelacionDias: reqAntelFinal,
      carryOverModo:
        typeof carryOverFinal.modo === 'string' && carryOverFinal.modo === 'extender'
          ? 'extender'
          : 'limpiar',
      carryOverMeses:
        typeof carryOverFinal.modo === 'string' && carryOverFinal.modo === 'extender'
          ? 4
          : 0,
    });
  } catch (error) {
    console.error('[PATCH /api/empresa/politica-ausencias] Error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar política de ausencias' },
      { status: 500 }
    );
  }
}




