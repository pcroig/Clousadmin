// ========================================
// API: Validar Asignaciones de Jornadas
// ========================================
// Endpoint para validar que todos los empleados tengan exactamente una jornada

import { NextResponse } from 'next/server';

import {
  generarMensajeEmpleadosSinJornada,
  validarAsignacionesCompletas,
} from '@/lib/jornadas/validar-asignaciones';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/jornadas/validar-asignaciones
 *
 * Valida que todos los empleados activos de la empresa tengan exactamente una jornada asignada
 *
 * @returns ValidacionAsignacion
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user?.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const empresaId = session.user.empresaId;

    // Obtener todos los empleados activos con sus jornadas
    const empleados = await prisma.empleados.findMany({
      where: {
        empresaId,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
        jornadaId: true,
        jornada: {
          select: {
            id: true,
            horasSemanales: true,
            config: true,
          },
        },
      },
    });

    // Convertir Decimal a number para horasSemanales
    const empleadosConJornada = empleados.map((emp) => ({
      id: emp.id,
      nombre: emp.nombre,
      apellidos: emp.apellidos,
      jornadaId: emp.jornadaId,
      jornada: emp.jornada
        ? {
            id: emp.jornada.id,
            horasSemanales: Number(emp.jornada.horasSemanales),
            config: emp.jornada.config as Record<string, unknown> | null,
          }
        : null,
    }));

    // Validar asignaciones
    const validacion = validarAsignacionesCompletas(empleadosConJornada);

    // Generar mensaje descriptivo
    const mensajeEmpleadosSinJornada = generarMensajeEmpleadosSinJornada(
      validacion.empleadosSinJornada
    );

    return NextResponse.json({
      valida: validacion.valida,
      totalEmpleados: empleados.length,
      empleadosConJornada: empleados.filter((e) => e.jornadaId).length,
      empleadosSinJornada: validacion.empleadosSinJornada.map((e) => ({
        id: e.id,
        nombre: e.nombre,
        apellidos: e.apellidos,
      })),
      empleadosConMultiplesJornadas: validacion.empleadosConMultiplesJornadas,
      errores: validacion.errores,
      mensajeResumen: validacion.valida
        ? 'Todos los empleados tienen jornada asignada'
        : mensajeEmpleadosSinJornada
        ? `Empleados sin jornada: ${mensajeEmpleadosSinJornada}`
        : 'Hay empleados sin jornada asignada',
    });
  } catch (error) {
    console.error('Error validando asignaciones de jornadas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
