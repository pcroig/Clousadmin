/**
 * Sync Existing Absences to Calendar
 * GET /api/integrations/calendar/sync-existing
 * Sincroniza todas las ausencias aprobadas existentes del usuario a Google Calendar
 */

import { NextRequest, NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { EstadoAusencia } from '@/lib/constants/enums';
import { CalendarManager } from "@/lib/integrations/calendar/calendar-manager";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    // Verificar sesión
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.empleadoId) {
      return NextResponse.json(
        { error: "No employee ID" },
        { status: 400 }
      );
    }

    // Buscar todas las ausencias aprobadas del usuario
    const ausencias = await prisma.ausencia.findMany({
      where: {
        empleadoId: session.user.empleadoId,
        estado: {
          in: [
            EstadoAusencia.en_curso,
            EstadoAusencia.completada,
            EstadoAusencia.auto_aprobada,
          ],
        },
      },
      include: {
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
          },
        },
      },
    });

    console.log(`Found ${ausencias.length} approved absences to sync`);

    // Sincronizar cada ausencia
    const results = [];
    for (const ausencia of ausencias) {
      try {
        const syncResults = await CalendarManager.syncAusenciaToCalendars(ausencia);
        results.push({
          ausenciaId: ausencia.id,
          success: true,
          results: syncResults,
        });
        console.log(`Synced ausencia ${ausencia.id}:`, syncResults);
      } catch (error) {
        console.error(`Error syncing ausencia ${ausencia.id}:`, error);
        results.push({
          ausenciaId: ausencia.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalAusencias: ausencias.length,
      results,
    });
  } catch (error) {
    console.error("Error syncing existing absences:", error);
    return NextResponse.json(
      {
        error: "Failed to sync absences",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
