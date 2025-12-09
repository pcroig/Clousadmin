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
 *   mensaje?: string;
 *   firmantes: Array<{ empleadoId: string; orden?: number; tipo?: string }>;
 *   ordenFirma?: boolean;
 *   recordatorioAutomatico?: boolean;
 *   diasRecordatorio?: number;
 *   posicionFirma?: { pagina: number; x: number; y: number };
 * }
 *
 * NOTA: El título se genera automáticamente del nombre del documento.
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

    // Procesar posicionesFirma (array) o posicionFirma (legacy - single)
    let posicionesFirma: CrearSolicitudFirmaInput['posicionesFirma'];
    let posicionFirma: CrearSolicitudFirmaInput['posicionFirma'];

    // Prioridad 1: posicionesFirma (array - nuevo formato)
    if (Array.isArray(body.posicionesFirma) && body.posicionesFirma.length > 0) {
      posicionesFirma = body.posicionesFirma.map((pos: any) => {
        if (!pos || typeof pos !== 'object') return null;

        const pagina = typeof pos.pagina === 'number' ? pos.pagina : -1;
        const x = typeof pos.x === 'number' ? pos.x : 0;
        const y = typeof pos.y === 'number' ? pos.y : 0;
        const width = typeof pos.width === 'number' ? pos.width : undefined;
        const height = typeof pos.height === 'number' ? pos.height : undefined;

        return { pagina, x, y, width, height };
      }).filter((p): p is NonNullable<typeof p> => p !== null);
    }
    // Fallback: posicionFirma (single - retrocompatibilidad)
    else if (body.posicionFirma && typeof body.posicionFirma === 'object' && body.posicionFirma !== null) {
      const pos = body.posicionFirma as Record<string, unknown>;

      // Detectar formato: v2 usa xPorcentaje/yPorcentaje, v1 usa x/y
      const esFormatoV2 = 'xPorcentaje' in pos && 'yPorcentaje' in pos;

      if (esFormatoV2) {
        // Formato V2 (recomendado): porcentajes
        const pagina = typeof pos.pagina === 'number' ? pos.pagina : -1;
        const xPorcentaje = typeof pos.xPorcentaje === 'number' ? pos.xPorcentaje : 0;
        const yPorcentaje = typeof pos.yPorcentaje === 'number' ? pos.yPorcentaje : 0;
        const widthPorcentaje = typeof pos.widthPorcentaje === 'number' ? pos.widthPorcentaje : undefined;
        const heightPorcentaje = typeof pos.heightPorcentaje === 'number' ? pos.heightPorcentaje : undefined;

        // Validar valores
        if (xPorcentaje < 0 || xPorcentaje > 100 || yPorcentaje < 0 || yPorcentaje > 100) {
          return NextResponse.json(
            { error: 'Las coordenadas en porcentaje deben estar entre 0 y 100' },
            { status: 400 }
          );
        }

        if (widthPorcentaje !== undefined && (widthPorcentaje <= 0 || widthPorcentaje > 100)) {
          return NextResponse.json(
            { error: 'El ancho en porcentaje debe estar entre 0 y 100' },
            { status: 400 }
          );
        }

        if (heightPorcentaje !== undefined && (heightPorcentaje <= 0 || heightPorcentaje > 100)) {
          return NextResponse.json(
            { error: 'El alto en porcentaje debe estar entre 0 y 100' },
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

        // Guardar en formato v2 con metadata
        const pdfDimensiones = typeof pos.pdfDimensiones === 'object' && pos.pdfDimensiones !== null
          ? pos.pdfDimensiones as Record<string, unknown>
          : undefined;

        posicionFirma = {
          version: 'v2',
          porcentajes: {
            pagina,
            xPorcentaje,
            yPorcentaje,
            widthPorcentaje,
            heightPorcentaje,
          },
          pdfDimensiones: pdfDimensiones ? {
            width: typeof pdfDimensiones.width === 'number' ? pdfDimensiones.width : 595,
            height: typeof pdfDimensiones.height === 'number' ? pdfDimensiones.height : 842,
            numPaginas: typeof pdfDimensiones.numPaginas === 'number' ? pdfDimensiones.numPaginas : 1,
          } : undefined,
        } as CrearSolicitudFirmaInput['posicionFirma'];

      } else {
        // Formato V1 (legacy): coordenadas absolutas PDF
        const pagina = typeof pos.pagina === 'number' ? pos.pagina : 0;
        const x = typeof pos.x === 'number' ? pos.x : 0;
        const y = typeof pos.y === 'number' ? pos.y : 0;
        const width = typeof pos.width === 'number' ? pos.width : undefined;
        const height = typeof pos.height === 'number' ? pos.height : undefined;

        const valoresSonNumeros =
          typeof pos.pagina === 'number' && typeof pos.x === 'number' && typeof pos.y === 'number';
        if (!valoresSonNumeros || Number.isNaN(pagina) || Number.isNaN(x) || Number.isNaN(y)) {
          return NextResponse.json(
            { error: 'La posicionFirma debe incluir pagina, x e y numéricos' },
            { status: 400 }
          );
        }

        // Validar rangos razonables (PDF estándar A4: ~595x842 puntos)
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

        // Validar width y height si se proporcionan
        if (width !== undefined && (width < 0 || width > 1000)) {
          return NextResponse.json(
            { error: 'El ancho (width) debe estar entre 0 y 1000' },
            { status: 400 }
          );
        }

        if (height !== undefined && (height < 0 || height > 1000)) {
          return NextResponse.json(
            { error: 'El alto (height) debe estar entre 0 y 1000' },
            { status: 400 }
          );
        }

        const paginaNormalizada = pagina === -1 ? -1 : Math.floor(pagina);
        // Convertir legacy single position a array para consistencia
        posicionesFirma = [{
          pagina: paginaNormalizada,
          x: Math.round(x),
          y: Math.round(y),
          width: width !== undefined ? Math.round(width) : undefined,
          height: height !== undefined ? Math.round(height) : undefined,
        }];
      }
    }

    // Crear input para db-helper
    const documentoId = typeof body.documentoId === 'string' ? body.documentoId : '';
    const mensaje = typeof body.mensaje === 'string' ? body.mensaje : undefined;
    const ordenFirma = typeof body.ordenFirma === 'boolean' ? body.ordenFirma : false;
    const recordatorioAutomatico = typeof body.recordatorioAutomatico === 'boolean' ? body.recordatorioAutomatico : true;
    const diasRecordatorio = typeof body.diasRecordatorio === 'number' ? body.diasRecordatorio : 3;
    const mantenerOriginal = typeof body.mantenerOriginal === 'boolean' ? body.mantenerOriginal : true;
    const incluirFirmaEmpresa = typeof body.incluirFirmaEmpresa === 'boolean' ? body.incluirFirmaEmpresa : true;
    const firmaEmpresaDataURL = typeof body.firmaEmpresaDataURL === 'string' ? body.firmaEmpresaDataURL : undefined;
    const guardarFirmaEmpresa = typeof body.guardarFirmaEmpresa === 'boolean' ? body.guardarFirmaEmpresa : false;

    // Procesar posiciones de firma de empresa (array de posiciones específicas)
    let posicionesFirmaEmpresa: Array<{ pagina: number; x: number; y: number; width?: number; height?: number }> | undefined;
    if (Array.isArray(body.posicionesFirmaEmpresa) && body.posicionesFirmaEmpresa.length > 0) {
      posicionesFirmaEmpresa = body.posicionesFirmaEmpresa.map((pos: any) => {
        if (!pos || typeof pos !== 'object') return null;

        const pagina = typeof pos.pagina === 'number' ? pos.pagina : -1;
        const x = typeof pos.x === 'number' ? pos.x : 0;
        const y = typeof pos.y === 'number' ? pos.y : 0;
        const width = typeof pos.width === 'number' ? pos.width : undefined;
        const height = typeof pos.height === 'number' ? pos.height : undefined;

        return { pagina, x, y, width, height };
      }).filter((p): p is NonNullable<typeof p> => p !== null);
    }

    // Guardar firma de empresa si se proporcionó
    let firmaEmpresaSolicitudS3Key: string | undefined;
    if (incluirFirmaEmpresa && firmaEmpresaDataURL) {
      try {
        // Convertir data URL a buffer
        const base64Data = firmaEmpresaDataURL.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const { uploadToS3 } = await import('@/lib/s3');

        // SIEMPRE guardar firma para esta solicitud específica
        const solicitudS3Key = `firmas/${session.user.empresaId}/solicitud/${Date.now()}-empresa.png`;
        await uploadToS3(buffer, solicitudS3Key, 'image/png');
        firmaEmpresaSolicitudS3Key = solicitudS3Key;
        console.log('[POST /api/firma/solicitudes] Firma de empresa para solicitud guardada:', solicitudS3Key);

        // OPCIONALMENTE guardar como firma predeterminada de la empresa
        if (guardarFirmaEmpresa) {
          const empresaS3Key = `firmas/${session.user.empresaId}/empresa/firma.png`;
          await uploadToS3(buffer, empresaS3Key, 'image/png');

          // Actualizar empresa
          const { prisma } = await import('@/lib/prisma');
          await prisma.empresas.update({
            where: { id: session.user.empresaId },
            data: {
              firmaEmpresaGuardada: true,
              firmaEmpresaS3Key: empresaS3Key,
              firmaEmpresaGuardadaEn: new Date(),
            },
          });

          console.log('[POST /api/firma/solicitudes] Firma de empresa guardada como predeterminada:', empresaS3Key);
        }
      } catch (error) {
        console.error('[POST /api/firma/solicitudes] Error guardando firma de empresa:', error);
        // No fallar la solicitud si falla el guardado de la firma
      }
    }

    const input: CrearSolicitudFirmaInput = {
      documentoId,
      empresaId: session.user.empresaId,
      // titulo se obtiene automáticamente del documento en crearSolicitudFirma
      mensaje,
      firmantes: sanitizedFirmantes,
      ordenFirma,
      proveedor: 'interno', // Fase 1 solo interno
      recordatorioAutomatico,
      diasRecordatorio,
      creadoPor: session.user.email || session.user.id,
      posicionesFirma, // Array de posiciones (nuevo formato)
      posicionFirma,   // Single position (legacy/V2 con porcentajes)
      mantenerOriginal, // CRÍTICO: Toggle para mantener/reemplazar original
      incluirFirmaEmpresa, // Toggle para incluir firma de empresa
      posicionesFirmaEmpresa, // Array de posiciones específicas para firma de empresa
      firmaEmpresaSolicitudS3Key, // S3 key de firma empresa para esta solicitud
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
