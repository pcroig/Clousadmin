// ========================================
// API: Firma Digital - Firmas Pendientes
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { obtenerFirmasPendientes } from '@/lib/firma-digital/db-helpers';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/firma/pendientes - Obtener firmas pendientes del empleado autenticado
 *
 * Retorna todas las firmas que el empleado debe completar
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener empleado asociado al usuario autenticado
    const empleado = await prisma.empleado.findUnique({
      where: { usuarioId: session.user.id },
      select: { id: true },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'No se encontró empleado asociado al usuario' },
        { status: 404 }
      );
    }

    // Obtener firmas pendientes
    const firmasPendientes = await obtenerFirmasPendientes(
      empleado.id,
      session.user.empresaId
    );

    // Formatear respuesta con información útil
    const firmasFormateadas = firmasPendientes.map((firma) => ({
      id: firma.id,
      solicitudFirmaId: firma.solicitudFirmaId,
      orden: firma.orden,
      tipo: firma.tipo,
      enviadoEn: firma.enviadoEn,
      solicitudFirma: {
        id: firma.solicitudFirma.id,
        titulo: firma.solicitudFirma.titulo,
        mensaje: firma.solicitudFirma.mensaje,
        ordenFirma: firma.solicitudFirma.ordenFirma,
        estado: firma.solicitudFirma.estado,
        createdAt: firma.solicitudFirma.createdAt,
        documento: {
          id: firma.solicitudFirma.documento.id,
          nombre: firma.solicitudFirma.documento.nombre,
          tipoDocumento: firma.solicitudFirma.documento.tipoDocumento,
        },
      },
    }));

    return NextResponse.json({
      firmasPendientes: firmasFormateadas,
      total: firmasFormateadas.length,
    });
  } catch (error) {
    console.error('[GET /api/firma/pendientes] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener firmas pendientes' },
      { status: 500 }
    );
  }
}
