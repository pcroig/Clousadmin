// ========================================
// API Route: /api/empresa/calendario-laboral
// PATCH - Actualizar configuración de días laborables
// ========================================

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  handleApiError,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { DIAS_LABORABLES_DEFAULT } from '@/lib/calculos/dias-laborables';
import { UsuarioRol } from '@/lib/constants/enums';
import { persistDiasLaborables } from '@/lib/empresa/calendario-laboral';
import { prisma, Prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';
import { getJsonBody } from '@/lib/utils/json';
import { calendarioLaboralUpdateSchema, limitesGlobalesFichajeSchema } from '@/lib/validaciones/schemas';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// PATCH /api/empresa/calendario-laboral - Actualizar días laborables y límites globales
export async function PATCH(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo HR Admin puede actualizar el calendario laboral
    if (session.user.rol !== UsuarioRol.hr_admin) {
      return badRequestResponse('No tienes permisos para modificar el calendario laboral');
    }

    const body = await getJsonBody<Record<string, unknown>>(req);

    // Validate diasLaborables (optional in body)
    let diasLaborables = null;
    if (body.diasLaborables) {
      const diasValidation = calendarioLaboralUpdateSchema.safeParse(body.diasLaborables);
      if (!diasValidation.success) {
        return badRequestResponse(
          diasValidation.error.issues[0]?.message || 'Días laborables inválidos'
        );
      }
      diasLaborables = diasValidation.data;
    }

    // Validate límites globales (optional in body)
    const limitesValidation = limitesGlobalesFichajeSchema.safeParse({
      limiteInferiorFichaje: body.limiteInferiorFichaje,
      limiteSuperiorFichaje: body.limiteSuperiorFichaje,
    });

    if (!limitesValidation.success) {
      return badRequestResponse(
        limitesValidation.error.issues[0]?.message || 'Límites de fichaje inválidos'
      );
    }

    const limitesGlobales = limitesValidation.data;

    // Get current empresa config
    const empresa = await prisma.empresas.findUnique({
      where: { id: session.user.empresaId },
      select: { config: true },
    });

    if (!empresa) {
      return badRequestResponse('Empresa no encontrada');
    }

    const configActual =
      typeof empresa.config === 'object' && empresa.config !== null
        ? (empresa.config as Record<string, unknown>)
        : {};

    // Merge updates into config
    const nuevaConfig = {
      ...configActual,
      ...(diasLaborables && { diasLaborables }),
      ...(limitesGlobales.limiteInferiorFichaje && { limiteInferiorFichaje: limitesGlobales.limiteInferiorFichaje }),
      ...(limitesGlobales.limiteSuperiorFichaje && { limiteSuperiorFichaje: limitesGlobales.limiteSuperiorFichaje }),
    };

    await prisma.empresas.update({
      where: { id: session.user.empresaId },
      data: {
        config: asJsonValue(nuevaConfig),
      },
    });

    console.info(`[Calendario Laboral] Configuración actualizada para empresa ${session.user.empresaId}`);

    return successResponse({
      message: 'Calendario laboral actualizado exitosamente',
      diasLaborables: diasLaborables || configActual.diasLaborables,
      limiteInferiorFichaje: limitesGlobales.limiteInferiorFichaje || configActual.limiteInferiorFichaje,
      limiteSuperiorFichaje: limitesGlobales.limiteSuperiorFichaje || configActual.limiteSuperiorFichaje,
    });
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/empresa/calendario-laboral');
  }
}

// GET /api/empresa/calendario-laboral - Obtener configuración actual
export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const empresa = await prisma.empresas.findUnique({
      where: { id: session.user.empresaId },
      select: { config: true },
    });

    if (!empresa) {
      return badRequestResponse('Empresa no encontrada');
    }

    const config = empresa.config as Prisma.JsonValue;
    const diasLaborables = (
      typeof config === 'object' && config !== null && 'diasLaborables' in config
        ? config.diasLaborables
        : null
    ) || DIAS_LABORABLES_DEFAULT;

    const limiteInferiorFichaje = (
      typeof config === 'object' && config !== null && 'limiteInferiorFichaje' in config
        ? config.limiteInferiorFichaje
        : null
    ) as string | null;

    const limiteSuperiorFichaje = (
      typeof config === 'object' && config !== null && 'limiteSuperiorFichaje' in config
        ? config.limiteSuperiorFichaje
        : null
    ) as string | null;

    return successResponse({
      diasLaborables,
      limiteInferiorFichaje: limiteInferiorFichaje || '07:00', // Default value
      limiteSuperiorFichaje: limiteSuperiorFichaje || '21:00', // Default value
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/empresa/calendario-laboral');
  }
}

