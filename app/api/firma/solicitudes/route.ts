// ========================================
// API: Firma Digital - Solicitudes de Firma
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import {
  crearSolicitudFirma,
  type CrearSolicitudFirmaInput,
  listarSolicitudesFirma,
} from '@/lib/firma-digital/db-helpers';
import { type FirmanteInput, TipoFirma } from '@/lib/firma-digital/tipos';
import { getClientIP, rateLimitApiWrite } from '@/lib/rate-limit';

/**
 * GET /api/firma/solicitudes - Listar solicitudes de firma
 *
 * Query params:
 * - estado: filtrar por estado (pendiente, en_proceso, completada, cancelada)
 * - documentoId: filtrar por documento
 * - empleadoId: filtrar por empleado firmante
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estado = searchParams.get('estado') || undefined;
    const documentoId = searchParams.get('documentoId') || undefined;
    const empleadoId = searchParams.get('empleadoId') || undefined;

    // Solo HR admins pueden ver todas las solicitudes
    // Empleados solo ven solicitudes donde son firmantes
    if (session.user.rol !== UsuarioRol.hr_admin && !empleadoId) {
      return NextResponse.json(
        { error: 'Los empleados deben especificar empleadoId' },
        { status: 403 }
      );
    }

    const solicitudes = await listarSolicitudesFirma(session.user.empresaId, {
      estado,
      documentoId,
      empleadoId,
    });

    return NextResponse.json({ solicitudes });
  } catch (error) {
    console.error('[GET /api/firma/solicitudes] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitudes de firma' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/firma/solicitudes - Crear solicitud de firma
 *
 * Body:
 * {
 *   documentoId: string;
 *   titulo: string;
 *   mensaje?: string;
 *   firmantes: Array<{ empleadoId: string; orden?: number; tipo?: string }>;
 *   ordenFirma?: boolean;
 *   recordatorioAutomatico?: boolean;
 *   diasRecordatorio?: number;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo HR admins pueden crear solicitudes de firma
    if (session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'Solo HR admins pueden crear solicitudes de firma' },
        { status: 403 }
      );
    }

    // Rate limiting
    const clientIP = getClientIP(request.headers);
    const rateIdentifier = `${session.user.empresaId}:${session.user.id}:${clientIP}:firma-solicitudes`;
    const rateResult = await rateLimitApiWrite(rateIdentifier);

    if (!rateResult.success) {
      return NextResponse.json(
        {
          error: 'Demasiadas solicitudes. Intente de nuevo más tarde.',
          retryAfter: rateResult.retryAfter,
        },
        { status: 429 }
      );
    }

    const body = await request.json() as Record<string, unknown>;

    // Validaciones
    if (!body.documentoId) {
      return NextResponse.json(
        { error: 'El campo documentoId es requerido' },
        { status: 400 }
      );
    }

    if (!body.titulo) {
      return NextResponse.json(
        { error: 'El campo titulo es requerido' },
        { status: 400 }
      );
    }

    type FirmanteBody = { empleadoId: string; orden?: number; tipo?: string };
    const firmantesEntrada = Array.isArray(body.firmantes) ? body.firmantes : [];
    const firmantes: FirmanteBody[] = firmantesEntrada.filter(
      (firmante): firmante is FirmanteBody =>
        typeof firmante === 'object' &&
        firmante !== null &&
        typeof (firmante as { empleadoId?: unknown }).empleadoId === 'string'
    );
    const sanitizedFirmantes: FirmanteInput[] = firmantes.map((firmante) => ({
      empleadoId: firmante.empleadoId,
      orden: typeof firmante.orden === 'number' && firmante.orden > 0 ? firmante.orden : undefined,
      tipo: esTipoFirma(firmante.tipo) ? firmante.tipo : undefined,
    }));

    if (sanitizedFirmantes.length === 0) {
      return NextResponse.json(
        { error: 'Debe especificar al menos un firmante' },
        { status: 400 }
      );
    }

    // Validar estructura de firmantes
    for (const firmante of firmantes) {
      if (!firmante.empleadoId) {
        return NextResponse.json(
          { error: 'Cada firmante debe tener un empleadoId' },
          { status: 400 }
        );
      }
    }

    // Si hay orden de firma, validar que todos tengan orden
    if (body.ordenFirma) {
      const todosConOrden = sanitizedFirmantes.every(
        (f) => typeof f.orden === 'number' && f.orden > 0
      );

      if (!todosConOrden) {
        return NextResponse.json(
          { error: 'Si se activa ordenFirma, todos los firmantes deben tener un orden válido' },
          { status: 400 }
        );
      }

      // Validar que no haya órdenes duplicados
      const ordenes = sanitizedFirmantes.map((f) => f.orden);
      const ordenesUnicos = new Set(ordenes);

      if (ordenes.length !== ordenesUnicos.size) {
        return NextResponse.json(
          { error: 'Los órdenes de firma no pueden estar duplicados' },
          { status: 400 }
        );
      }
    }

    let posicionFirma: CrearSolicitudFirmaInput['posicionFirma'];
    if (body.posicionFirma && typeof body.posicionFirma === 'object' && body.posicionFirma !== null) {
      const pos = body.posicionFirma as Record<string, unknown>;
      const pagina = typeof pos.pagina === 'number' ? pos.pagina : 0;
      const x = typeof pos.x === 'number' ? pos.x : 0;
      const y = typeof pos.y === 'number' ? pos.y : 0;

      const valoresSonNumeros =
        typeof pos.pagina === 'number' && typeof pos.x === 'number' && typeof pos.y === 'number';
      if (!valoresSonNumeros || Number.isNaN(pagina) || Number.isNaN(x) || Number.isNaN(y)) {
        return NextResponse.json(
          { error: 'La posicionFirma debe incluir pagina, x e y numéricos' },
          { status: 400 }
        );
      }

      // Validar rangos razonables (PDF estándar A4: ~595x842 puntos)
      // x, y deben estar entre 0 y 1000 (margen amplio para diferentes tamaños)
      if (x < 0 || x > 1000 || y < 0 || y > 1000) {
        return NextResponse.json(
          { error: 'Las coordenadas x e y deben estar entre 0 y 1000' },
          { status: 400 }
        );
      }

      // Validar página: -1 (última página) o >= 1
      if (pagina !== -1 && pagina < 1) {
        return NextResponse.json(
          { error: 'La página debe ser -1 (última) o un número mayor o igual a 1' },
          { status: 400 }
        );
      }

      const paginaNormalizada = pagina === -1 ? -1 : Math.floor(pagina);
      posicionFirma = {
        pagina: paginaNormalizada,
        x: Math.round(x),
        y: Math.round(y),
      };
    }

    // Crear input para db-helper
    const documentoId = typeof body.documentoId === 'string' ? body.documentoId : '';
    const titulo = typeof body.titulo === 'string' ? body.titulo : '';
    const mensaje = typeof body.mensaje === 'string' ? body.mensaje : undefined;
    const ordenFirma = typeof body.ordenFirma === 'boolean' ? body.ordenFirma : false;
    const recordatorioAutomatico = typeof body.recordatorioAutomatico === 'boolean' ? body.recordatorioAutomatico : true;
    const diasRecordatorio = typeof body.diasRecordatorio === 'number' ? body.diasRecordatorio : 3;

    const input: CrearSolicitudFirmaInput = {
      documentoId,
      empresaId: session.user.empresaId,
      titulo,
      mensaje,
      firmantes: sanitizedFirmantes,
      ordenFirma,
      proveedor: 'interno', // Fase 1 solo interno
      recordatorioAutomatico,
      diasRecordatorio,
      creadoPor: session.user.email || session.user.id,
      posicionFirma,
    };

    // Crear solicitud
    const solicitud = await crearSolicitudFirma(input);

    // TODO: Enviar notificaciones a firmantes (Fase 2)

    return NextResponse.json({
      success: true,
      solicitud,
    });
  } catch (error: unknown) {
    console.error('[POST /api/firma/solicitudes] Error:', error);

    // Errores de validación de negocio
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('no encontrado') || errorMessage.includes('no pertenece')) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Error al crear solicitud de firma' },
      { status: 500 }
    );
  }
}

const TIPO_FIRMA_VALUES = Object.values(TipoFirma);
function esTipoFirma(valor: unknown): valor is TipoFirma {
  return typeof valor === 'string' && TIPO_FIRMA_VALUES.includes(valor as TipoFirma);
}
