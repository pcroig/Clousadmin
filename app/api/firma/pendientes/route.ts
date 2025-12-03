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
 * Query params:
 * - firmaId: ID de firma específica a obtener (opcional)
 *
 * Retorna todas las firmas pendientes o una específica si se proporciona firmaId
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const firmaId = searchParams.get('firmaId');

    // Obtener empleado asociado al usuario autenticado
    const empleado = await prisma.empleados.findUnique({
      where: { usuarioId: session.user.id },
      select: { id: true },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'No se encontró empleado asociado al usuario' },
        { status: 404 }
      );
    }

    // Si se solicita una firma específica
    if (firmaId) {
      const firma = await prisma.firmas.findFirst({
        where: {
          id: firmaId,
          empleadoId: empleado.id,
          firmado: false,
        },
        include: {
          solicitudes_firma: {
            include: {
              documentos: {
                select: {
                  id: true,
                  nombre: true,
                  tipoDocumento: true,
                },
              },
            },
          },
        },
      });

      if (!firma) {
        return NextResponse.json({ error: 'Firma no encontrada' }, { status: 404 });
      }

      const firmaFormateada = {
        id: firma.id,
        solicitudFirmaId: firma.solicitudFirmaId,
        orden: firma.orden,
        tipo: firma.tipo,
        enviadoEn: firma.enviadoEn,
        solicitudes_firma: {
          id: firma.solicitudes_firma.id,
          titulo: firma.solicitudes_firma.titulo,
          mensaje: firma.solicitudes_firma.mensaje,
          ordenFirma: firma.solicitudes_firma.ordenFirma,
          estado: firma.solicitudes_firma.estado,
          createdAt: firma.solicitudes_firma.createdAt,
          posicionFirma: firma.solicitudes_firma.posicionFirma,
          documento: {
            id: firma.solicitudes_firma.documentos.id,
            nombre: firma.solicitudes_firma.documentos.nombre,
            tipoDocumento: firma.solicitudes_firma.documentos.tipoDocumento,
          },
        },
      };

      return NextResponse.json({ firma: firmaFormateada });
    }

    // Obtener todas las firmas pendientes
    const firmasPendientes = await obtenerFirmasPendientes(
      empleado.id,
      session.user.empresaId
    );

    // Debug: console.log(`[GET /api/firma/pendientes] Empleado ${empleado.id} tiene ${firmasPendientes.length} firmas pendientes`);

    // Obtener firmas completadas recientes (últimos 7 días)
    const unaSemanaAtras = new Date();
    unaSemanaAtras.setDate(unaSemanaAtras.getDate() - 7);

    const firmasCompletadasRecientes = await prisma.firmas.findMany({
      where: {
        empleadoId: empleado.id,
        firmado: true,
        firmadoEn: {
          gte: unaSemanaAtras,
        },
      },
      include: {
        solicitudes_firma: {
          include: {
            documentos: {
              select: {
                id: true,
                nombre: true,
                tipoDocumento: true,
                carpetaId: true,
              },
            },
          },
        },
      },
      orderBy: {
        firmadoEn: 'desc',
      },
    });

    // Combinar y formatear respuesta
    const todasLasFirmas = [
      ...firmasPendientes.map((firma) => ({
        id: firma.id,
        solicitudFirmaId: firma.solicitudFirmaId,
        orden: firma.orden,
        tipo: firma.tipo,
        enviadoEn: firma.enviadoEn,
        firmado: false,
        firmadoEn: null,
        solicitudes_firma: {
          id: firma.solicitudes_firma.id,
          titulo: firma.solicitudes_firma.titulo,
          mensaje: firma.solicitudes_firma.mensaje,
          ordenFirma: firma.solicitudes_firma.ordenFirma,
          estado: firma.solicitudes_firma.estado,
          createdAt: firma.solicitudes_firma.createdAt,
          documento: {
            id: firma.solicitudes_firma.documentos.id,
            nombre: firma.solicitudes_firma.documentos.nombre,
            tipoDocumento: firma.solicitudes_firma.documentos.tipoDocumento,
            carpetaId: firma.solicitudes_firma.documentos.carpetaId || '',
          },
        },
      })),
      ...firmasCompletadasRecientes.map((firma) => ({
        id: firma.id,
        solicitudFirmaId: firma.solicitudFirmaId,
        orden: firma.orden,
        tipo: firma.tipo,
        enviadoEn: firma.enviadoEn,
        firmado: true,
        firmadoEn: firma.firmadoEn,
        solicitudes_firma: {
          id: firma.solicitudes_firma.id,
          titulo: firma.solicitudes_firma.titulo,
          mensaje: firma.solicitudes_firma.mensaje,
          ordenFirma: firma.solicitudes_firma.ordenFirma,
          estado: firma.solicitudes_firma.estado,
          createdAt: firma.solicitudes_firma.createdAt,
          documento: {
            id: firma.solicitudes_firma.documentos.id,
            nombre: firma.solicitudes_firma.documentos.nombre,
            tipoDocumento: firma.solicitudes_firma.documentos.tipoDocumento,
            carpetaId: firma.solicitudes_firma.documentos.carpetaId || '',
          },
        },
      })),
    ];

    const firmasFormateadas = todasLasFirmas;

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
