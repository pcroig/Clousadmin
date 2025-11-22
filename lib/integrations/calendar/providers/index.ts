/**
 * Calendar Providers Index
 * Factory para crear proveedores de calendario
 */

import { GoogleCalendarProvider } from "./google-calendar";

import type { CalendarProvider } from "@/lib/integrations/types";

export type CalendarProviderName = "google_calendar" | "outlook_calendar";

/**
 * Factory para crear un proveedor de calendario
 */
export function createCalendarProvider(
  provider: CalendarProviderName
): CalendarProvider {
  switch (provider) {
    case "google_calendar":
      return new GoogleCalendarProvider();
    case "outlook_calendar":
      // TODO: Implementar Outlook Calendar Provider
      throw new Error("Outlook Calendar provider not yet implemented");
    default:
      throw new Error(`Unsupported calendar provider: ${provider}`);
  }
}

export { GoogleCalendarProvider };
export type { CalendarProvider };
