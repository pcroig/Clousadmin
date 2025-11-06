/**
 * Integration System Types
 * Tipos compartidos para el sistema de integraciones
 */

import type { Ausencia } from "@prisma/client";

/**
 * Evento de calendario
 */
export interface CalendarEvent {
  id?: string; // ID del evento en el proveedor (Google, Outlook)
  summary: string; // Título del evento
  description?: string;
  start: {
    date?: string; // Para eventos de día completo (formato: YYYY-MM-DD)
    dateTime?: string; // Para eventos con hora específica (formato: ISO 8601)
    timeZone?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  colorId?: string; // Color del evento
  extendedProperties?: {
    private?: Record<string, string>; // Metadatos privados (no visibles para el usuario)
    shared?: Record<string, string>; // Metadatos compartidos
  };
}

/**
 * Proveedor de calendario (Google Calendar, Outlook Calendar, etc.)
 */
export interface CalendarProvider {
  /** Nombre del proveedor */
  name: string;

  /** Crear un calendario dedicado para Clousadmin */
  createCalendar(
    accessToken: string,
    calendarName: string
  ): Promise<{ id: string; name: string }>;

  /** Listar calendarios del usuario */
  listCalendars(
    accessToken: string
  ): Promise<Array<{ id: string; name: string; primary?: boolean }>>;

  /** Crear evento en un calendario */
  createEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEvent
  ): Promise<{ id: string; event: CalendarEvent }>;

  /** Actualizar evento existente */
  updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>
  ): Promise<{ id: string; event: CalendarEvent }>;

  /** Eliminar evento */
  deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void>;

  /** Obtener evento por ID */
  getEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<CalendarEvent | null>;

  /** Configurar webhooks para notificaciones de cambios */
  setupWebhook?(
    accessToken: string,
    calendarId: string,
    webhookUrl: string
  ): Promise<{ channelId: string; resourceId: string; expiration: number }>;

  /** Detener webhooks */
  stopWebhook?(
    accessToken: string,
    channelId: string,
    resourceId: string
  ): Promise<void>;
}

/**
 * Configuración de integración de calendario
 */
export interface CalendarIntegrationConfig {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  calendarId?: string;
  channelId?: string; // Para webhooks
  resourceId?: string; // Para webhooks
  webhookExpiration?: number;
}

/**
 * Resultado de sincronización
 */
export interface SyncResult {
  success: boolean;
  eventId?: string;
  error?: string;
  provider: string;
  calendarId: string;
}

/**
 * Mapeo de tipo de ausencia a color de evento
 */
export const AUSENCIA_COLOR_MAP: Record<string, string> = {
  vacaciones: "10", // Verde
  enfermedad: "11", // Rojo
  enfermedad_familiar: "4", // Naranja claro
  maternidad_paternidad: "8", // Gris
  otro: "7", // Azul cyan
};

/**
 * Utilidad para transformar Ausencia a CalendarEvent
 */
export function ausenciaToCalendarEvent(
  ausencia: Ausencia & { empleado?: { nombre: string; apellidos: string } }
): CalendarEvent {
  const empleadoNombre = ausencia.empleado
    ? `${ausencia.empleado.nombre} ${ausencia.empleado.apellidos}`
    : "Empleado";

  // Formatear tipo de ausencia para mostrar
  const tipoFormatted =
    ausencia.tipo.charAt(0).toUpperCase() +
    ausencia.tipo.slice(1).replace("_", " ");

  // Calcular fecha de fin para evento (Google Calendar end date es exclusivo)
  const fechaFin = new Date(ausencia.fechaFin);
  fechaFin.setDate(fechaFin.getDate() + 1); // +1 día porque el end es exclusivo

  return {
    summary: `${tipoFormatted} - ${empleadoNombre}`,
    description: `Tipo: ${tipoFormatted}\nDías: ${ausencia.diasSolicitados}\nID Ausencia: ${ausencia.id}\nEstado: ${ausencia.estado}${ausencia.descripcion ? `\n\nDescripción: ${ausencia.descripcion}` : ""}`,
    start: {
      date: ausencia.fechaInicio.toISOString().split("T")[0],
    },
    end: {
      date: fechaFin.toISOString().split("T")[0],
    },
    colorId: AUSENCIA_COLOR_MAP[ausencia.tipo] || "7",
    extendedProperties: {
      private: {
        clousadmin_ausencia_id: ausencia.id,
        clousadmin_empresa_id: ausencia.empresaId,
        clousadmin_empleado_id: ausencia.empleadoId,
        clousadmin_tipo: ausencia.tipo,
      },
    },
  };
}
