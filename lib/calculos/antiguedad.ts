// ========================================
// Cálculos de Antigüedad
// ========================================
// Funciones para calcular y filtrar por antigüedad de empleados

/**
 * Tipo de rango de antigüedad
 */
export type RangoAntiguedad =
  | 'menos_6_meses'
  | '6_12_meses'
  | '1_3_años'
  | '3_5_años'
  | 'mas_5_años'
  | 'todos';

/**
 * Interfaz para rango de fechas
 */
export interface RangoFecha {
  gte?: Date;
  lt?: Date;
}

/**
 * Calcula el rango de antigüedad de un empleado basado en su fecha de alta
 * @param fechaAlta - Fecha de alta del empleado
 * @returns Rango de antigüedad como string
 */
export function calcularAntiguedad(fechaAlta: Date): RangoAntiguedad {
  const hoy = new Date();
  const mesesAntiguedad =
    (hoy.getFullYear() - fechaAlta.getFullYear()) * 12 +
    (hoy.getMonth() - fechaAlta.getMonth());

  if (mesesAntiguedad < 6) return 'menos_6_meses';
  if (mesesAntiguedad < 12) return '6_12_meses';
  if (mesesAntiguedad < 36) return '1_3_años';
  if (mesesAntiguedad < 60) return '3_5_años';
  return 'mas_5_años';
}

/**
 * Convierte un rango de antigüedad en un rango de fechas para filtros de BD
 * @param antiguedad - Rango de antigüedad
 * @returns Objeto con gte y/o lt para usar en Prisma where
 */
export function obtenerRangoFechaAntiguedad(
  antiguedad: string
): RangoFecha | null {
  const hoy = new Date();

  switch (antiguedad) {
    case 'menos_6_meses': {
      const hace6Meses = new Date(hoy);
      hace6Meses.setMonth(hace6Meses.getMonth() - 6);
      return { gte: hace6Meses };
    }

    case '6_12_meses': {
      const hace6Meses = new Date(hoy);
      hace6Meses.setMonth(hace6Meses.getMonth() - 6);
      const hace12Meses = new Date(hoy);
      hace12Meses.setMonth(hace12Meses.getMonth() - 12);
      return { gte: hace12Meses, lt: hace6Meses };
    }

    case '1_3_años': {
      const hace12Meses = new Date(hoy);
      hace12Meses.setMonth(hace12Meses.getMonth() - 12);
      const hace36Meses = new Date(hoy);
      hace36Meses.setMonth(hace36Meses.getMonth() - 36);
      return { gte: hace36Meses, lt: hace12Meses };
    }

    case '3_5_años': {
      const hace36Meses = new Date(hoy);
      hace36Meses.setMonth(hace36Meses.getMonth() - 36);
      const hace60Meses = new Date(hoy);
      hace60Meses.setMonth(hace60Meses.getMonth() - 60);
      return { gte: hace60Meses, lt: hace36Meses };
    }

    case 'mas_5_años': {
      const hace60Meses = new Date(hoy);
      hace60Meses.setMonth(hace60Meses.getMonth() - 60);
      return { lt: hace60Meses };
    }

    case 'todos':
    default:
      return null;
  }
}


