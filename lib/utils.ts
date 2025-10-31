import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type Decimal } from '@prisma/client/runtime/library';

/**
 * Combina clases de Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Serializa un objeto Decimal de Prisma a number
 */
export function decimalToNumber(decimal: Decimal | null | undefined): number | null {
  if (!decimal) return null;
  return Number(decimal.toFixed(2));
}

/**
 * Serializa campos Decimal de un empleado para Client Components
 */
export function serializeEmpleado(empleado: any) {
  return {
    ...empleado,
    salarioBrutoAnual: decimalToNumber(empleado.salarioBrutoAnual),
    salarioBrutoMensual: decimalToNumber(empleado.salarioBrutoMensual),
    manager: empleado.manager ? {
      ...empleado.manager,
      salarioBrutoAnual: decimalToNumber(empleado.manager.salarioBrutoAnual),
      salarioBrutoMensual: decimalToNumber(empleado.manager.salarioBrutoMensual),
    } : null,
  };
}
