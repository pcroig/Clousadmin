/**
 * Google Calendar Provider
 * Implementación del proveedor de Google Calendar
 */

import { google } from "googleapis";
import type {
  CalendarProvider,
  CalendarEvent,
} from "@/lib/integrations/types";

export class GoogleCalendarProvider implements CalendarProvider {
  name = "google_calendar" as const;

  /**
   * Crear un calendario dedicado para Clousadmin
   */
  async createCalendar(
    accessToken: string,
    calendarName: string
  ): Promise<{ id: string; name: string }> {
    try {
      const calendar = google.calendar({ version: "v3" });

      const response = await calendar.calendars.insert({
        auth: this.getOAuth2Client(accessToken),
        requestBody: {
          summary: calendarName,
          description:
            "Calendario de ausencias sincronizado con Clousadmin",
          timeZone: "Europe/Madrid",
        },
      });

      if (!response.data.id) {
        throw new Error("Failed to create calendar: No ID returned");
      }

      return {
        id: response.data.id,
        name: response.data.summary || calendarName,
      };
    } catch (error) {
      console.error("Error creating Google Calendar:", error);
      throw new Error("Failed to create Google Calendar");
    }
  }

  /**
   * Listar calendarios del usuario
   */
  async listCalendars(
    accessToken: string
  ): Promise<Array<{ id: string; name: string; primary?: boolean }>> {
    try {
      const calendar = google.calendar({ version: "v3" });

      const response = await calendar.calendarList.list({
        auth: this.getOAuth2Client(accessToken),
      });

      return (
        response.data.items?.map((cal) => ({
          id: cal.id!,
          name: cal.summary || cal.id!,
          primary: cal.primary || false,
        })) || []
      );
    } catch (error) {
      console.error("Error listing Google Calendars:", error);
      throw new Error("Failed to list Google Calendars");
    }
  }

  /**
   * Crear evento en un calendario
   */
  async createEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEvent
  ): Promise<{ id: string; event: CalendarEvent }> {
    try {
      const calendar = google.calendar({ version: "v3" });

      const response = await calendar.events.insert({
        auth: this.getOAuth2Client(accessToken),
        calendarId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: event.start.date
            ? { date: event.start.date }
            : {
                dateTime: event.start.dateTime,
                timeZone: event.start.timeZone || "Europe/Madrid",
              },
          end: event.end.date
            ? { date: event.end.date }
            : {
                dateTime: event.end.dateTime,
                timeZone: event.end.timeZone || "Europe/Madrid",
              },
          colorId: event.colorId,
          extendedProperties: event.extendedProperties,
        },
      });

      if (!response.data.id) {
        throw new Error("Failed to create event: No ID returned");
      }

      return {
        id: response.data.id,
        event: this.googleEventToCalendarEvent(response.data),
      };
    } catch (error) {
      console.error("Error creating Google Calendar event:", error);
      throw new Error("Failed to create Google Calendar event");
    }
  }

  /**
   * Actualizar evento existente
   */
  async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>
  ): Promise<{ id: string; event: CalendarEvent }> {
    try {
      const calendar = google.calendar({ version: "v3" });

      const response = await calendar.events.patch({
        auth: this.getOAuth2Client(accessToken),
        calendarId,
        eventId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: event.start
            ? event.start.date
              ? { date: event.start.date }
              : {
                  dateTime: event.start.dateTime,
                  timeZone: event.start.timeZone || "Europe/Madrid",
                }
            : undefined,
          end: event.end
            ? event.end.date
              ? { date: event.end.date }
              : {
                  dateTime: event.end.dateTime,
                  timeZone: event.end.timeZone || "Europe/Madrid",
                }
            : undefined,
          colorId: event.colorId,
          extendedProperties: event.extendedProperties,
        },
      });

      if (!response.data.id) {
        throw new Error("Failed to update event: No ID returned");
      }

      return {
        id: response.data.id,
        event: this.googleEventToCalendarEvent(response.data),
      };
    } catch (error) {
      console.error("Error updating Google Calendar event:", error);
      throw new Error("Failed to update Google Calendar event");
    }
  }

  /**
   * Eliminar evento
   */
  async deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<void> {
    try {
      const calendar = google.calendar({ version: "v3" });

      await calendar.events.delete({
        auth: this.getOAuth2Client(accessToken),
        calendarId,
        eventId,
      });
    } catch (error) {
      console.error("Error deleting Google Calendar event:", error);
      throw new Error("Failed to delete Google Calendar event");
    }
  }

  /**
   * Obtener evento por ID
   */
  async getEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<CalendarEvent | null> {
    try {
      const calendar = google.calendar({ version: "v3" });

      const response = await calendar.events.get({
        auth: this.getOAuth2Client(accessToken),
        calendarId,
        eventId,
      });

      return this.googleEventToCalendarEvent(response.data);
    } catch (error: unknown) {
      const errorObj = error as { code?: number } | null;
      if (errorObj?.code === 404) {
        return null;
      }
      console.error("Error getting Google Calendar event:", error);
      throw new Error("Failed to get Google Calendar event");
    }
  }

  /**
   * Configurar webhooks para notificaciones de cambios
   */
  async setupWebhook(
    accessToken: string,
    calendarId: string,
    webhookUrl: string
  ): Promise<{ channelId: string; resourceId: string; expiration: number }> {
    try {
      const calendar = google.calendar({ version: "v3" });

      // Generar un ID único para el canal
      const channelId = `clousadmin-${calendarId}-${Date.now()}`;

      const response = await calendar.events.watch({
        auth: this.getOAuth2Client(accessToken),
        calendarId,
        requestBody: {
          id: channelId,
          type: "web_hook",
          address: webhookUrl,
          expiration: (Date.now() + 7 * 24 * 60 * 60 * 1000).toString(), // 7 días
        },
      });

      if (!response.data.id || !response.data.resourceId) {
        throw new Error("Failed to setup webhook: Missing channel or resource ID");
      }

      return {
        channelId: response.data.id,
        resourceId: response.data.resourceId,
        expiration: parseInt(response.data.expiration || "0"),
      };
    } catch (error) {
      console.error("Error setting up Google Calendar webhook:", error);
      throw new Error("Failed to setup Google Calendar webhook");
    }
  }

  /**
   * Detener webhooks
   */
  async stopWebhook(
    accessToken: string,
    channelId: string,
    resourceId: string
  ): Promise<void> {
    try {
      const calendar = google.calendar({ version: "v3" });

      await calendar.channels.stop({
        auth: this.getOAuth2Client(accessToken),
        requestBody: {
          id: channelId,
          resourceId,
        },
      });
    } catch (error) {
      console.error("Error stopping Google Calendar webhook:", error);
      throw new Error("Failed to stop Google Calendar webhook");
    }
  }

  /**
   * Helpers
   */

  private getOAuth2Client(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    return oauth2Client;
  }

  private googleEventToCalendarEvent(googleEvent: {
    id?: string | null;
    summary?: string | null;
    description?: string | null;
    start?: {
      date?: string | null;
      dateTime?: string | null;
      timeZone?: string | null;
    } | null;
    end?: {
      date?: string | null;
      dateTime?: string | null;
      timeZone?: string | null;
    } | null;
    location?: string | null;
  }): CalendarEvent {
    return {
      id: googleEvent.id,
      summary: googleEvent.summary || "",
      description: googleEvent.description,
      start: {
        date: googleEvent.start?.date,
        dateTime: googleEvent.start?.dateTime,
        timeZone: googleEvent.start?.timeZone,
      },
      end: {
        date: googleEvent.end?.date,
        dateTime: googleEvent.end?.dateTime,
        timeZone: googleEvent.end?.timeZone,
      },
      colorId: googleEvent.colorId,
      extendedProperties: googleEvent.extendedProperties,
    };
  }
}
