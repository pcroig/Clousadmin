// ========================================
// Jornadas Helpers - Funciones de utilidad para jornadas
// ========================================

import type { JornadaConfig, DiaConfig } from '@/lib/calculos/fichajes-helpers';

type DiaKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

const DIA_KEYS: DiaKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

const isDiaConfig = (value: unknown): value is DiaConfig =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getDiaConfig = (config: JornadaConfig | null | undefined, dia: DiaKey): DiaConfig | undefined => {
  if (!config) return undefined;
  const value = config[dia];
  return isDiaConfig(value) ? value : undefined;
};

/**
 * Genera una etiqueta descriptiva para una jornada basada en su configuración
 * Ya que las jornadas ya no tienen campo 'nombre', generamos una descripción automática
 *
 * @param jornada - Objeto con configuración de jornada
 * @returns String descriptivo de la jornada
 *
 * Ejemplos:
 * - "Jornada Fija 40h (09:00-18:00)"
 * - "Jornada Flexible 35h"
 * - "Jornada 40h"
 */
export function obtenerEtiquetaJornada(jornada: {
  horasSemanales: number;
  config?: JornadaConfig | null;
  id?: string;
}): string {
  const config = jornada.config;

  // Determinar si es fija o flexible
  const esFija = DIA_KEYS.some((dia) => {
    const diaConfig = getDiaConfig(config, dia);
    return Boolean(diaConfig?.entrada && diaConfig?.salida);
  });

  const tipo = esFija ? 'Fija' : 'Flexible';

  // Si es fija, intentar obtener el horario del primer día activo
  if (esFija) {
    const primerDiaActivo = DIA_KEYS
      .map((dia) => getDiaConfig(config, dia))
      .find((diaConfig) => diaConfig?.activo && diaConfig?.entrada && diaConfig?.salida);

    if (primerDiaActivo?.entrada && primerDiaActivo?.salida) {
      return `Jornada ${tipo} ${jornada.horasSemanales}h (${primerDiaActivo.entrada}-${primerDiaActivo.salida})`;
    }
  }

  // Fallback genérico
  return `Jornada ${tipo} ${jornada.horasSemanales}h`;
}

/**
 * Genera una etiqueta corta para una jornada (para listados compactos)
 *
 * @param jornada - Objeto con configuración de jornada
 * @returns String descriptivo corto
 *
 * Ejemplos:
 * - "40h Fija"
 * - "35h Flexible"
 */
export function obtenerEtiquetaJornadaCorta(jornada: {
  horasSemanales: number;
  config?: JornadaConfig | null;
}): string {
  const config = jornada.config;

  const esFija = DIA_KEYS.some((dia) => {
    const diaConfig = getDiaConfig(config, dia);
    return Boolean(diaConfig?.entrada && diaConfig?.salida);
  });

  const tipo = esFija ? 'Fija' : 'Flexible';
  return `${jornada.horasSemanales}h ${tipo}`;
}

/**
 * Obtiene la descripción del horario de una jornada
 *
 * @param jornada - Objeto con configuración de jornada
 * @returns String con el horario o las horas semanales
 *
 * Ejemplos:
 * - "09:00 - 18:00"
 * - "40h semanales"
 */
export function obtenerDescripcionHorario(jornada: {
  horasSemanales: number;
  config?: JornadaConfig | null;
}): string {
  const config = jornada.config;
  const primerDiaActivo = DIA_KEYS
    .map((dia) => getDiaConfig(config, dia))
    .find((diaConfig) => diaConfig?.activo);

  if (primerDiaActivo?.entrada && primerDiaActivo?.salida) {
    return `${primerDiaActivo.entrada} - ${primerDiaActivo.salida}`;
  }

  return `${jornada.horasSemanales}h semanales`;
}
