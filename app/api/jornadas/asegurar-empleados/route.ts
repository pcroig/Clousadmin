// ========================================
// API Jornadas - Asegurar que todos los empleados tengan jornada
// ========================================

import { NextRequest } from 'next/server';

import {
  handleApiError,
  requireAuthAsHR,
  successResponse,
} from '@/lib/api-handler';
import { asegurarJornadaEmpleados } from '@/lib/jornadas/asegurar-jornada-empleados';

// POST /api/jornadas/asegurar-empleados - Asignar jornada por defecto a empleados sin jornada (solo HR Admin)
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Asegurar que todos los empleados activos tengan jornada
    const resultado = await asegurarJornadaEmpleados(session.user.empresaId);

    return successResponse({
      mensaje:
        resultado.empleadosActualizados === 0
          ? 'Todos los empleados ya tienen jornada asignada'
          : `Se asignó jornada ${resultado.jornadaAsignada?.id} a ${resultado.empleadosActualizados} empleado(s)`,
      empleadosActualizados: resultado.empleadosActualizados,
      jornadaAsignada: resultado.jornadaAsignada,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/jornadas/asegurar-empleados');
  }
}



