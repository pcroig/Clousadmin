// ========================================
// API Empleados - Validar Jornadas Completas
// ========================================
// Verifica que todos los empleados activos tengan una jornada asignada

import { NextRequest } from 'next/server';

import {
  handleApiError,
  requireAuthAsHR,
  successResponse,
} from '@/lib/api-handler';
import { obtenerJornadaEmpleado } from '@/lib/jornadas/helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Obtener todos los empleados activos con sus equipos
    const empleados = await prisma.empleados.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        jornadaId: true,
        equipos: {
          select: {
            equipoId: true,
          },
        },
      },
    });

    // Verificar jornada efectiva para cada empleado (considerando jerarquía: individual > equipo > empresa)
    const empleadosSinJornada = [];

    for (const emp of empleados) {
      // Extraer IDs de equipos
      const equipoIds = emp.equipos
        .map((eq) => eq.equipoId)
        .filter((id): id is string => Boolean(id));

      // Resolver jornada efectiva
      const jornadaInfo = await obtenerJornadaEmpleado({
        empleadoId: emp.id,
        equipoIds,
        jornadaIdDirecta: emp.jornadaId,
      });

      if (!jornadaInfo || !jornadaInfo.jornadaId) {
        empleadosSinJornada.push({
          id: emp.id,
          nombre: emp.nombre,
          apellidos: emp.apellidos,
        });
      }
    }

    return successResponse({
      completo: empleadosSinJornada.length === 0,
      totalEmpleados: empleados.length,
      empleadosConJornada: empleados.length - empleadosSinJornada.length,
      empleadosSinJornada,
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/empleados/validar-jornadas-completas');
  }
}
