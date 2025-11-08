// ========================================
// API: Revisión de Fichajes
// ========================================
// GET: Obtener fichajes pendientes de revisión

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  handleApiError,
  successResponse,
} from '@/lib/api-handler';
import { validarFichajeCompleto } from '@/lib/calculos/fichajes';
import { generarEventosPropuestos } from '@/lib/calculos/fichajes-helpers';

import { EstadoAusencia } from '@/lib/constants/enums';

// GET /api/fichajes/revision - Obtener fichajes pendientes de revisión (solo HR Admin)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Obtener la fecha de hoy (inicio del día)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Obtener fichajes con estado 'pendiente' y solo de días ANTERIORES
    const fichajesPendientes = await prisma.fichaje.findMany({
      where: {
        empresaId: session.user.empresaId,
        estado: EstadoAusencia.pendiente_aprobacion,
        fecha: {
          lt: hoy, // Solo días anteriores al día actual
        },
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            jornada: true,
          },
        },
        eventos: {
          orderBy: {
            hora: 'asc',
          },
        },
      },
      orderBy: {
        fecha: 'asc',
      },
    });

    // Formatear datos para el modal
    const fichajes = await Promise.all(
      fichajesPendientes.map(async (fichaje) => {
        // Eventos registrados
        const eventosRegistrados = fichaje.eventos.map((evento) => ({
          tipo: evento.tipo,
          hora: evento.hora.toISOString(),
          origen: 'registrado' as const,
        }));

        // Eventos propuestos basados en la jornada
        const jornada = fichaje.empleado.jornada;
        const previewEventos = jornada ? generarEventosPropuestos(jornada, fichaje.fecha) : [];

        // Obtener validación del fichaje
        const validacion = await validarFichajeCompleto(fichaje.id);

        return {
          id: fichaje.id,
          fichajeId: fichaje.id,
          empleadoId: fichaje.empleadoId,
          empleadoNombre: `${fichaje.empleado.nombre} ${fichaje.empleado.apellidos}`,
          fecha: fichaje.fecha.toISOString(),
          eventos: previewEventos.length > 0 ? previewEventos : eventosRegistrados,
          eventosRegistrados,
          razon: validacion.razon || 'Fichaje incompleto',
          eventosFaltantes: validacion.eventosFaltantes,
        };
      })
    );

    return successResponse({ fichajes });
  } catch (error) {
    return handleApiError(error, 'API GET /api/fichajes/revision');
  }
}
