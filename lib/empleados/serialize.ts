// ========================================
// Serializadores de Empleados con datos sensibles
// ========================================

import type { Empleado } from '@prisma/client';

import { decryptEmpleadoData } from '@/lib/empleado-crypto';
import { serializeEmpleado } from '@/lib/utils';
import type { MiEspacioEmpleado } from '@/types/empleado';

/**
 * Serializa un empleado para consumo en Client Components asegurando
 * que los campos sensibles se desencriptan previamente.
 */
export function serializeEmpleadoSeguro<T extends Partial<Empleado>>(empleado: T): MiEspacioEmpleado {
  const empleadoDesencriptado = decryptEmpleadoData(empleado);

  return serializeEmpleado({
    ...empleado,
    ...empleadoDesencriptado,
  });
}




