// ========================================
// Helper: Asegurar que todos los empleados activos tengan jornada
// ========================================

import { prisma } from '@/lib/prisma';

import { getOrCreateDefaultJornada } from './get-or-create-default';

/**
 * Asegura que todos los empleados activos de una empresa tengan jornada asignada
 * Si alguno no tiene, se le asigna la jornada por defecto
 */
export async function asegurarJornadaEmpleados(empresaId: string): Promise<{
  empleadosActualizados: number;
  jornadaAsignada: { id: string; nombre: string } | null;
}> {
  // 1. Obtener empleados activos sin jornada
  const empleadosSinJornada = await prisma.empleado.findMany({
    where: {
      empresaId,
      activo: true,
      jornadaId: null,
    },
    select: {
      id: true,
      nombre: true,
      apellidos: true,
    },
  });

  if (empleadosSinJornada.length === 0) {
    return {
      empleadosActualizados: 0,
      jornadaAsignada: null,
    };
  }

  // 2. Obtener o crear jornada por defecto
  const jornadaDefault = await getOrCreateDefaultJornada(prisma, empresaId);

  // 3. Asignar jornada a todos los empleados sin jornada
  const resultado = await prisma.empleado.updateMany({
    where: {
      empresaId,
      activo: true,
      jornadaId: null,
    },
    data: {
      jornadaId: jornadaDefault.id,
    },
  });

  console.log(
    `[AsegurarJornadaEmpleados] ${resultado.count} empleados actualizados con jornada "${jornadaDefault.nombre}"`
  );

  return {
    empleadosActualizados: resultado.count,
    jornadaAsignada: {
      id: jornadaDefault.id,
      nombre: jornadaDefault.nombre,
    },
  };
}

/**
 * Asegura que un empleado específico tenga jornada asignada
 * Si no tiene, se le asigna la jornada por defecto
 */
export async function asegurarJornadaEmpleado(
  empleadoId: string,
  empresaId: string
): Promise<{ actualizado: boolean; jornadaId: string }> {
  // Verificar si el empleado ya tiene jornada
  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    select: { jornadaId: true, activo: true },
  });

  if (!empleado) {
    throw new Error(`Empleado ${empleadoId} no encontrado`);
  }

  if (empleado.jornadaId) {
    return {
      actualizado: false,
      jornadaId: empleado.jornadaId,
    };
  }

  // Obtener o crear jornada por defecto
  const jornadaDefault = await getOrCreateDefaultJornada(prisma, empresaId);

  // Asignar jornada
  await prisma.empleado.update({
    where: { id: empleadoId },
    data: { jornadaId: jornadaDefault.id },
  });

  return {
    actualizado: true,
    jornadaId: jornadaDefault.id,
  };
}



