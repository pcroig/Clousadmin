// ========================================
// Hook: Crear Empleado con Carpetas Automáticas
// ========================================
// Para usar cuando se implemente la funcionalidad de crear empleados

import { asegurarCarpetasSistemaParaEmpleado } from '../documentos';
import { prisma, Prisma } from '../prisma';

/**
 * Crea un empleado y sus carpetas del sistema automáticamente
 *
 * @example
 * const empleado = await crearEmpleadoConCarpetas({
 *   nombre: 'Ana',
 *   apellidos: 'García',
 *   email: 'ana@empresa.com',
 *   empresaId: 'uuid',
 *   // ... otros campos
 * });
 */
export async function crearEmpleadoConCarpetas(
  data: Prisma.EmpleadoCreateInput & {
    empresaId: string;
    nombre: string;
    apellidos: string;
    email: string;
  }
) {
  // Crear empleado en una transacción
  const empleado = await prisma.$transaction(async (tx) => {
    // 1. Crear empleado
    const nuevoEmpleado = await tx.empleado.create({
      data,
    });

    return nuevoEmpleado;
  });

  // 2. Asegurar carpetas del sistema (fuera de la transacción para evitar deadlocks)
  // La función es idempotente y no duplica carpetas
  const carpetas = await asegurarCarpetasSistemaParaEmpleado(
    empleado.id,
    data.empresaId
  );

  console.log(`✅ Empleado ${empleado.nombre} ${empleado.apellidos} creado con ${carpetas.length} carpetas`);

  return empleado;
}

/**
 * Hook de post-creación para integrarse con sistemas existentes
 * Llamar después de crear un empleado para añadir las carpetas
 * Esta función es idempotente y puede llamarse múltiples veces sin duplicar
 */
export async function postCrearEmpleado(empleadoId: string, empresaId: string) {
  try {
    // Asegurar que todas las carpetas del sistema existan
    // La función es idempotente y no duplica carpetas
    const carpetas = await asegurarCarpetasSistemaParaEmpleado(empleadoId, empresaId);

    console.log(`✅ Carpetas del sistema aseguradas para empleado ${empleadoId}: ${carpetas.length} carpetas`);

    return carpetas;
  } catch (error) {
    console.error('Error asegurando carpetas para empleado:', error);
    throw error;
  }
}
