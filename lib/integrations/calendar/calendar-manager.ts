/**
 * Calendar Manager
 * Gestión de sincronización entre Clousadmin y calendarios externos
 */

import { getGoogleCalendarOAuthConfig } from "@/lib/oauth/config";
import { OAuthManager } from "@/lib/oauth/oauth-manager";
import { prisma, Prisma } from "@/lib/prisma";

import {
  ausenciaToCalendarEvent,
  type CalendarIntegrationConfig,
  type SyncResult,
} from "../types";

import { createCalendarProvider } from "./providers";

import type {
  CalendarProviderName} from "./providers";
import type { Ausencia } from "@prisma/client";

export class CalendarManager {
  /**
   * Sincronizar una ausencia a todos los calendarios conectados
   * (tanto de empresa como personales del empleado)
   */
  static async syncAusenciaToCalendars(
    ausencia: Ausencia & { empleado?: { nombre: string; apellidos: string } }
  ): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    try {
      // 1. Obtener el usuarioId del empleado
      const empleado = await prisma.empleado.findUnique({
        where: { id: ausencia.empleadoId },
        select: { usuarioId: true },
      });

      // 2. Buscar integraciones de calendario activas
      const integraciones = await prisma.integracion.findMany({
        where: {
          empresaId: ausencia.empresaId,
          tipo: "calendario",
          activa: true,
          OR: [
            { usuarioId: null }, // Calendario de empresa
            ...(empleado?.usuarioId ? [{ usuarioId: empleado.usuarioId }] : []), // Calendario personal del empleado
          ],
        },
      });

      if (integraciones.length === 0) {
        console.log(
          "No hay integraciones de calendario activas para esta ausencia"
        );
        return results;
      }

      // 2. Sincronizar a cada calendario
      for (const integracion of integraciones) {
        try {
          const result = await this.syncAusenciaToCalendar(
            ausencia,
            integracion.id
          );
          results.push(result);
        } catch (error) {
          console.error(
            `Error syncing to integration ${integracion.id}:`,
            error
          );
          results.push({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            provider: integracion.proveedor,
            calendarId: integracion.calendarId || "unknown",
          });
        }
      }

      return results;
    } catch (error) {
      console.error("Error in syncAusenciaToCalendars:", error);
      throw error;
    }
  }

  /**
   * Sincronizar una ausencia a un calendario específico
   */
  static async syncAusenciaToCalendar(
    ausencia: Ausencia & { empleado?: { nombre: string; apellidos: string } },
    integracionId: string
  ): Promise<SyncResult> {
    try {
      // 1. Obtener integración
      const integracion = await prisma.integracion.findUnique({
        where: { id: integracionId },
      });

      if (!integracion || !integracion.activa) {
        throw new Error("Integration not found or inactive");
      }

      if (!integracion.calendarId) {
        throw new Error("Calendar ID not configured for this integration");
      }

      const config = (integracion.config || {}) as unknown as CalendarIntegrationConfig;

      if (!config.accessToken) {
        throw new Error("Access token not found in integration config");
      }

      // 2. Obtener access token válido (con refresh automático si es necesario)
      // Para calendar, necesitamos el usuarioId de la integración o el del empleado
      const usuarioId = integracion.usuarioId || ausencia.empleadoId;

      if (!usuarioId) {
        throw new Error("Cannot determine user ID for token refresh");
      }

      const oauthConfig = getGoogleCalendarOAuthConfig();
      const validToken = await OAuthManager.getValidAccessToken(
        usuarioId,
        "google",
        oauthConfig
      );

      if (!validToken) {
        throw new Error("Failed to get valid access token");
      }

      // 3. Crear proveedor de calendario
      const provider = createCalendarProvider(
        integracion.proveedor as CalendarProviderName
      );

      // 4. Convertir ausencia a evento de calendario
      const calendarEvent = ausenciaToCalendarEvent(ausencia);

      // 5. Crear o actualizar evento
      // Buscar si ya existe un evento para esta ausencia
      const existingEventId = config.ausenciaEventMap?.[ausencia.id];

      let eventId: string;

      if (existingEventId) {
        // Actualizar evento existente
        const { id } = await provider.updateEvent(
          validToken,
          integracion.calendarId,
          existingEventId,
          calendarEvent
        );
        eventId = id;
      } else {
        // Crear nuevo evento
        const { id } = await provider.createEvent(
          validToken,
          integracion.calendarId,
          calendarEvent
        );
        eventId = id;

        // Guardar mapeo ausenciaId -> eventId en config
        const updatedConfig = {
          ...config,
          ausenciaEventMap: {
            ...(config.ausenciaEventMap || {}),
            [ausencia.id]: eventId,
          },
        };

        await prisma.integracion.update({
          where: { id: integracionId },
          data: { config: updatedConfig as Prisma.InputJsonValue },
        });
      }

      return {
        success: true,
        eventId,
        provider: integracion.proveedor,
        calendarId: integracion.calendarId,
      };
    } catch (error) {
      console.error("Error in syncAusenciaToCalendar:", error);
      throw error;
    }
  }

  /**
   * Eliminar evento de calendario al cancelar/rechazar ausencia
   */
  static async deleteAusenciaFromCalendars(
    ausenciaId: string,
    empresaId: string,
    empleadoId: string
  ): Promise<void> {
    try {
      // Obtener el usuarioId del empleado
      const empleado = await prisma.empleado.findUnique({
        where: { id: empleadoId },
        select: { usuarioId: true },
      });

      // Buscar integraciones que puedan tener el evento
      const integraciones = await prisma.integracion.findMany({
        where: {
          empresaId,
          tipo: "calendario",
          activa: true,
          OR: [
            { usuarioId: null },
            ...(empleado?.usuarioId ? [{ usuarioId: empleado.usuarioId }] : []),
          ],
        },
      });

      for (const integracion of integraciones) {
        try {
          const config = (integracion.config || {}) as unknown as CalendarIntegrationConfig;
          const eventId = config.ausenciaEventMap?.[ausenciaId];

          if (!eventId || !integracion.calendarId) {
            continue;
          }

          // Obtener access token válido
          const usuarioId = integracion.usuarioId || empleadoId;
          const oauthConfig = getGoogleCalendarOAuthConfig();
          const validToken = await OAuthManager.getValidAccessToken(
            usuarioId,
            "google",
            oauthConfig
          );

          if (!validToken) {
            console.warn("No valid token available for deleting event");
            continue;
          }

          // Eliminar evento
          const provider = createCalendarProvider(
            integracion.proveedor as CalendarProviderName
          );
          await provider.deleteEvent(
            validToken,
            integracion.calendarId,
            eventId
          );

          // Eliminar mapeo de config
          const { ausenciaEventMap = {}, ...restConfig } = config;
          delete ausenciaEventMap[ausenciaId];

          await prisma.integracion.update({
            where: { id: integracion.id },
            data: {
              config: {
                ...restConfig,
                ausenciaEventMap,
              } as Prisma.InputJsonValue,
            },
          });
        } catch (error) {
          console.error(
            `Error deleting event from integration ${integracion.id}:`,
            error
          );
          // Continuar con las demás integraciones
        }
      }
    } catch (error) {
      console.error("Error in deleteAusenciaFromCalendars:", error);
      throw error;
    }
  }
}

// Extender el tipo CalendarIntegrationConfig para incluir ausenciaEventMap
declare module "../types" {
  interface CalendarIntegrationConfig {
    ausenciaEventMap?: Record<string, string>; // ausenciaId -> eventId
  }
}
