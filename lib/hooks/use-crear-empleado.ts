// ========================================
// Hook: Crear Empleado con Carpetas Automáticas
// ========================================
// Para usar cuando se implemente la funcionalidad de crear empleados

import { prisma } from '../prisma';
import { crearCarpetasSistemaParaEmpleado } from '../documentos';

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
  data: {
    empresaId: string;
    nombre: string;
    apellidos: string;
    email: string;
    // Añadir otros campos necesarios según el modelo Empleado
    [key: string]: any;
  }
) {
  // Crear empleado en una transacción
  const empleado = await prisma.$transaction(async (tx) => {
    // 1. Crear empleado
    const nuevoEmpleado = await tx.empleado.create({
      data: data as any,
    });

    // 2. Crear carpetas del sistema automáticamente
    const carpetas = await crearCarpetasSistemaParaEmpleado(
      nuevoEmpleado.id,
      data.empresaId
    );

    console.log(`✅ Empleado ${nuevoEmpleado.nombre} ${nuevoEmpleado.apellidos} creado con ${carpetas.length} carpetas`);

    return nuevoEmpleado;
  });

  return empleado;
}

/**
 * Hook de post-creación para integrarse con sistemas existentes
 * Llamar después de crear un empleado para añadir las carpetas
 */
export async function postCrearEmpleado(empleadoId: string, empresaId: string) {
  try {
    // Verificar si ya tiene carpetas
    const carpetasExistentes = await prisma.carpeta.findMany({
      where: {
        empleadoId,
        esSistema: true,
      },
    });

    // Si ya tiene carpetas, no hacer nada
    if (carpetasExistentes.length > 0) {
      console.log('Empleado ya tiene carpetas del sistema');
      return carpetasExistentes;
    }

    // Crear carpetas del sistema
    const carpetas = await crearCarpetasSistemaParaEmpleado(empleadoId, empresaId);

    console.log(`✅ Carpetas del sistema creadas para empleado ${empleadoId}`);

    return carpetas;
  } catch (error) {
    console.error('Error creando carpetas para empleado:', error);
    throw error;
  }
}
