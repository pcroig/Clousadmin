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
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Obtener todos los empleados activos
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
      },
    });

    // Filtrar empleados sin jornada asignada
    const empleadosSinJornada = empleados.filter(emp => !emp.jornadaId);

    return successResponse({
      completo: empleadosSinJornada.length === 0,
      totalEmpleados: empleados.length,
      empleadosConJornada: empleados.length - empleadosSinJornada.length,
      empleadosSinJornada: empleadosSinJornada.map(emp => ({
        id: emp.id,
        nombre: emp.nombre,
        apellidos: emp.apellidos,
      })),
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/empleados/validar-jornadas-completas');
  }
}
