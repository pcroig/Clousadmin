/**
 * Calendar Integration - Webhook
 * POST /api/integrations/calendar/webhook
 * Recibe notificaciones de cambios en Google Calendar
 */

import { NextRequest, NextResponse } from "next/server";

import { EstadoAusencia, UsuarioRol } from '@/lib/constants/enums';
import { createCalendarProvider } from "@/lib/integrations/calendar/providers";
import { getGoogleOAuthConfig } from "@/lib/oauth/config";
import { OAuthManager } from "@/lib/oauth/oauth-manager";
import { prisma, Prisma } from "@/lib/prisma";

import type { CalendarIntegrationConfig } from "@/lib/integrations/types";


export async function POST(req: NextRequest) {
  try {
    // Obtener headers de Google
    const channelId = req.headers.get("x-goog-channel-id");
    const resourceId = req.headers.get("x-goog-resource-id");
    const resourceState = req.headers.get("x-goog-resource-state");

    console.log("Webhook received:", {
      channelId,
      resourceId,
      resourceState,
    });

    // Verificar que sea una notificación válida
    if (!channelId || !resourceId) {
      return NextResponse.json(
        { error: "Invalid webhook notification" },
        { status: 400 }
      );
    }

    // Si es solo una sincronización inicial (sync), ignorar
    if (resourceState === "sync") {
      return NextResponse.json({ success: true, message: "Sync acknowledged" });
    }

    // Buscar integración por channelId
    const integracion = await prisma.integracion.findFirst({
      where: {
        tipo: "calendario",
        proveedor: "google_calendar",
        activa: true,
      },
    });

    if (!integracion) {
      console.warn("No integration found for channel:", channelId);
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    const config = (integracion.config ?? {}) as CalendarIntegrationConfig;

    // Verificar que el webhook pertenece a esta integración
    if (config.channelId !== channelId || config.resourceId !== resourceId) {
      console.warn("Webhook mismatch:", {
        expected: { channelId: config.channelId, resourceId: config.resourceId },
        received: { channelId, resourceId },
      });
      return NextResponse.json({ error: "Webhook mismatch" }, { status: 400 });
    }

    // Procesar cambios (en background, no bloquear respuesta)
    processCalendarChanges(integracion.id).catch((error) => {
      console.error("Error processing calendar changes:", error);
    });

    // Responder rápido a Google
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error en webhook de calendario:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Procesar cambios en el calendario (ejecutado en background)
 */
async function processCalendarChanges(integracionId: string) {
  try {
    const integracion = await prisma.integracion.findUnique({
      where: { id: integracionId },
    });

    if (!integracion || !integracion.calendarId) {
      return;
    }

    const config = (integracion.config ?? {}) as CalendarIntegrationConfig & {
      ausenciaEventMap?: Record<string, string>;
    };
    const ausenciaEventMap = config.ausenciaEventMap ?? {};

    // Obtener access token válido
    const usuarioId =
      integracion.usuarioId || (await getFirstAdminUsuarioId(integracion.empresaId));

    if (!usuarioId) {
      console.error("No user ID available for token refresh");
      return;
    }

    const oauthConfig = getGoogleOAuthConfig();
    const validToken = await OAuthManager.getValidAccessToken(
      usuarioId,
      "google",
      oauthConfig
    );

    if (!validToken) {
      console.error("Failed to get valid access token");
      return;
    }

    // Obtener eventos del calendario para verificar cambios
    const provider = createCalendarProvider("google_calendar");

    // Verificar cada ausencia mapeada
    for (const [ausenciaId, eventId] of Object.entries(ausenciaEventMap)) {
      try {
        const event = await provider.getEvent(
          validToken,
          integracion.calendarId,
          eventId
        );

        if (!event) {
          // Evento fue eliminado en Google Calendar
          console.log(`Event ${eventId} was deleted, canceling ausencia ${ausenciaId}`);

          await prisma.ausencia.update({
            where: { id: ausenciaId },
            data: {
              estado: EstadoAusencia.cancelada,
              // Podríamos añadir un campo "canceladaPor" con valor "calendar_sync"
            },
          });

          // Eliminar del mapa
          const { [ausenciaId]: removed, ...restMap } = ausenciaEventMap;
          void removed;
          await prisma.integracion.update({
            where: { id: integracionId },
            data: {
              config: {
                ...config,
                ausenciaEventMap: restMap,
              } as Prisma.InputJsonValue,
            },
          });
        }
        // TODO: Detectar cambios de fechas y actualizar ausencia
        // Esto requiere lógica más compleja de validación
      } catch (error) {
        console.error(`Error checking event ${eventId}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in processCalendarChanges:", error);
  }
}

/**
 * Obtener primer usuario admin de la empresa (fallback)
 */
async function getFirstAdminUsuarioId(empresaId: string): Promise<string | null> {
  const admin = await prisma.usuario.findFirst({
    where: {
      empresaId,
      rol: UsuarioRol.hr_admin,
      activo: true,
    },
    select: { id: true },
  });

  return admin?.id || null;
}
