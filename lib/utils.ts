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

interface SaldoAusencia {
  diasUsados: Decimal | number;
  diasPendientes: Decimal | number;
  [key: string]: unknown;
}

interface EmpleadoBase {
  salarioBrutoAnual?: Decimal | null;
  salarioBrutoMensual?: Decimal | null;
  manager?: { salarioBrutoAnual?: Decimal | null; salarioBrutoMensual?: Decimal | null } | null;
  saldosAusencias?: SaldoAusencia[];
  [key: string]: unknown;
}

/**
 * Serializa campos Decimal de un empleado para Client Components
 */
export function serializeEmpleado(empleado: EmpleadoBase) {
  return {
    ...empleado,
    salarioBrutoAnual: decimalToNumber(empleado.salarioBrutoAnual ?? null),
    salarioBrutoMensual: decimalToNumber(empleado.salarioBrutoMensual ?? null),
    manager: empleado.manager ? {
      ...empleado.manager,
      salarioBrutoAnual: decimalToNumber(empleado.manager.salarioBrutoAnual ?? null),
      salarioBrutoMensual: decimalToNumber(empleado.manager.salarioBrutoMensual ?? null),
    } : null,
    // Serializar Decimal en saldosAusencias
    saldosAusencias: empleado.saldosAusencias
      ? empleado.saldosAusencias.map((saldo) => ({
          ...saldo,
          diasUsados: decimalToNumber(
            typeof saldo.diasUsados === 'object' ? saldo.diasUsados : null
          ) ?? 0,
          diasPendientes: decimalToNumber(
            typeof saldo.diasPendientes === 'object' ? saldo.diasPendientes : null
          ) ?? 0,
        }))
      : empleado.saldosAusencias,
  };
}


