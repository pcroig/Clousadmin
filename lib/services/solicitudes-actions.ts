// ========================================
// Servicios - Acciones sobre Solicitudes
// ========================================
// Helper reutilizable para aprobar o rechazar ausencias y solicitudes
// desde componentes cliente. Centraliza la lógica de fetch y formatea
// las respuestas/errores para ofrecer una API consistente.

'use client';

export type SolicitudTipo =
  | 'ausencia'
  | 'cambio_datos'
  | 'documento'
  | 'fichaje_correccion'
  | 'contrato'
  | 'otro'
  | (string & {});

export type SolicitudAccion = 'aprobar' | 'rechazar';

export interface EjecutarAccionSolicitudOptions {
  solicitudId: string;
  tipo: SolicitudTipo;
  accion: SolicitudAccion;
  motivoRechazo?: string;
  fetchInit?: RequestInit;
}

export interface EjecutarAccionSolicitudResult<TData = unknown> {
  ok: boolean;
  data?: TData;
  error?: string;
  status?: number;
  endpoint: string;
}

/**
 * Determina el endpoint REST a utilizar para una solicitud concreta.
 * - Ausencias -> `/api/ausencias/:id`
 * - Resto de tipos -> `/api/solicitudes/:id`
 */
export function getSolicitudEndpoint(tipo: SolicitudTipo, solicitudId: string): string {
  const basePath = tipo === 'ausencia' ? '/api/ausencias' : '/api/solicitudes';
  return `${basePath}/${solicitudId}`;
}

/**
 * Ejecuta una acción (aprobar/rechazar) contra la API correspondiente,
 * devolviendo un resultado normalizado. No propaga excepciones de red;
 * en su lugar retorna `{ ok: false, error }` para permitir al consumidor
 * decidir cómo notificar.
 */
export async function ejecutarAccionSolicitud<TData = unknown>(
  options: EjecutarAccionSolicitudOptions
): Promise<EjecutarAccionSolicitudResult<TData>> {
  const { solicitudId, tipo, accion, motivoRechazo, fetchInit } = options;

  const endpoint = getSolicitudEndpoint(tipo, solicitudId);

  const payload: Record<string, unknown> = { accion };
  if (accion === 'rechazar' && motivoRechazo) {
    payload.motivoRechazo = motivoRechazo;
  }

  const requestInit: RequestInit = {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(fetchInit?.headers ?? {}),
    },
    body: JSON.stringify(payload),
    ...fetchInit,
  };

  try {
    const response = await fetch(endpoint, requestInit);

    // Intentar parsear JSON si existe.
    const contentType = response.headers.get('Content-Type') ?? '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.clone().json().catch(() => undefined) : undefined;

    if (!response.ok) {
      const mensaje =
        (data as { error?: string } | undefined)?.error ??
        `Error al ${accion === 'aprobar' ? 'aprobar' : 'rechazar'} la solicitud`;

      return {
        ok: false,
        error: mensaje,
        data,
        status: response.status,
        endpoint,
      };
    }

    return {
      ok: true,
      data,
      status: response.status,
      endpoint,
    };
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : `Error al ${accion === 'aprobar' ? 'aprobar' : 'rechazar'} la solicitud`;

    return {
      ok: false,
      error: mensaje,
      endpoint,
    };
  }
}




