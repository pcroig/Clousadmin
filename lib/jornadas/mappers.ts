/**
 * Mappers centralizados para jornadas
 * Evita duplicación de código en conversiones y generación de etiquetas
 */

import { decimalToNumber } from '@/lib/utils';
import { obtenerEtiquetaJornada } from './helpers';

import type { JornadaConfig } from '@/lib/calculos/fichajes-helpers';

export interface JornadaConEtiqueta {
  id: string;
  etiqueta: string;
  horasSemanales: number;
  config: any;
}

/**
 * Mapea una jornada de Prisma a formato con etiqueta generada
 * Centraliza la lógica de conversión de Decimal y generación de etiqueta
 *
 * @param jornada - Jornada desde Prisma con horasSemanales como Decimal
 * @returns Jornada con horasSemanales como number y etiqueta generada
 */
export function mapJornadaConEtiqueta(jornada: {
  id: string;
  horasSemanales: unknown;
  config: unknown;
}): JornadaConEtiqueta {
  const horasSemanales = decimalToNumber(jornada.horasSemanales as any) ?? 0;
  const config = jornada.config as JornadaConfig | null;

  const etiqueta = obtenerEtiquetaJornada({
    id: jornada.id,
    horasSemanales,
    config,
  });

  return {
    id: jornada.id,
    etiqueta,
    horasSemanales,
    config,
  };
}

/**
 * Mapea una jornada con compatibilidad para 'nombre' y 'etiqueta'
 * Útil para APIs que aún usan el campo 'nombre' para backward compatibility
 *
 * @param jornada - Jornada desde Prisma
 * @returns Jornada con nombre y etiqueta idénticos
 */
export function mapJornadaConNombreYEtiqueta(jornada: {
  id: string;
  horasSemanales: unknown;
  config: unknown;
}): JornadaConEtiqueta & { nombre: string } {
  const mapped = mapJornadaConEtiqueta(jornada);
  return {
    ...mapped,
    nombre: mapped.etiqueta, // Backward compatibility
  };
}
