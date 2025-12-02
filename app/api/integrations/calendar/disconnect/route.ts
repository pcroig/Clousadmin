/**
 * Calendar Integration - Disconnect
 * DELETE /api/integrations/calendar/disconnect
 * Desconectar integración de calendario
 */

import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-handler";
import { UsuarioRol } from '@/lib/constants/enums';
import { getGoogleOAuthConfig } from "@/lib/oauth/config";
import { OAuthManager } from "@/lib/oauth/oauth-manager";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(req.url);
    const integrationId = searchParams.get("id");

    if (!integrationId) {
      return NextResponse.json(
        { error: "Integration ID is required" },
        { status: 400 }
      );
    }

    // Obtener integración
    const integracion = await prisma.integraciones.findUnique({
      where: { id: integrationId },
    });

    if (!integracion) {
      return NextResponse.json(
        { error: "Integration not found" },
        { status: 404 }
      );
    }

    // Verificar permisos
    if (integracion.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Solo el dueño de la integración o un HR admin puede desconectar
    const isOwner = integracion.usuarioId === session.user.id;
    const isHRAdmin = session.user.rol === UsuarioRol.hr_admin;

    if (!isOwner && !isHRAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Revocar tokens OAuth
    const usuarioId = integracion.usuarioId || session.user.id;
    const config = getGoogleOAuthConfig();

    try {
      await OAuthManager.revokeTokens(usuarioId, "google", config);
    } catch (error) {
      console.error("Error revoking OAuth tokens:", error);
      // Continuar aunque falle la revocación
    }

    // Eliminar integración
    await prisma.integraciones.delete({
      where: { id: integrationId },
    });

    return NextResponse.json({
      success: true,
      message: "Calendar integration disconnected",
    });
  } catch (error) {
    console.error("Error desconectando calendario:", error);
    return NextResponse.json(
      { error: "Failed to disconnect calendar" },
      { status: 500 }
    );
  }
}
