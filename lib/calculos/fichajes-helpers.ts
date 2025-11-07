// ========================================
// Funciones auxiliares para fichajes
// ========================================
// Funciones reutilizables para generar eventos propuestos y cálculos comunes

import { Jornada } from '@prisma/client';

export type JornadaConfig = {
  tipo?: 'fija' | 'flexible';
  descansoMinimo?: string; // "HH:mm"
  limiteInferior?: string;
  limiteSuperior?: string;
} & Record<string, unknown>;

/**
 * Configuración de día específico
 */
export interface DiaConfig {
  activo?: boolean;
  entrada?: string; // "HH:mm"
  salida?: string; // "HH:mm"
  pausa_inicio?: string; // "HH:mm"
  pausa_fin?: string; // "HH:mm"
}

/**
 * Evento propuesto para vista previa
 */
export interface EventoPropuesto {
  tipo: 'entrada' | 'pausa_inicio' | 'pausa_fin' | 'salida';
  hora: string; // ISO string
  origen: 'propuesto';
}

/**
 * Genera eventos propuestos para un fichaje basándose en la jornada
 */
export function generarEventosPropuestos(
  jornada: Jornada,
  fecha: Date
): EventoPropuesto[] {
  const config = jornada.config as JornadaConfig;
  const fechaBase = new Date(fecha);
  fechaBase.setHours(0, 0, 0, 0);

  const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const nombreDia = diasSemana[fecha.getDay()];
  const configDia = config[nombreDia] as DiaConfig | undefined;

  const eventos: EventoPropuesto[] = [];

  // Función auxiliar para establecer hora
  const setHora = (base: Date, hhmm: string): string => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(base);
    d.setHours(h || 0, m || 0, 0, 0);
    return d.toISOString();
  };

  // JORNADA FIJA
  if (config.tipo === 'fija' || (configDia?.entrada && configDia?.salida)) {
    // Solo si el día está activo
    if (configDia && configDia.activo !== false && configDia.entrada && configDia.salida) {
      eventos.push({
        tipo: 'entrada',
        hora: setHora(fechaBase, configDia.entrada),
        origen: 'propuesto',
      });

      if (configDia.pausa_inicio && configDia.pausa_fin) {
        eventos.push({
          tipo: 'pausa_inicio',
          hora: setHora(fechaBase, configDia.pausa_inicio),
          origen: 'propuesto',
        });
        eventos.push({
          tipo: 'pausa_fin',
          hora: setHora(fechaBase, configDia.pausa_fin),
          origen: 'propuesto',
        });
      }

      eventos.push({
        tipo: 'salida',
        hora: setHora(fechaBase, configDia.salida),
        origen: 'propuesto',
      });
    }
  }
  // JORNADA FLEXIBLE
  else if (config.tipo === 'flexible') {
    // Solo si el día está activo
    if (configDia && configDia.activo !== false) {
      // Calcular días activos reales
      const diasActivos = Object.keys(config).filter((dia) => {
        if (['tipo', 'descansoMinimo', 'limiteInferior', 'limiteSuperior'].includes(dia)) {
          return false;
        }
        const valor = config[dia];
        return valor && typeof valor === 'object' && !Array.isArray(valor) && (valor as DiaConfig).activo === true;
      }).length;

      // Si no hay días activos, asumir 5 días por defecto
      const diasLaborables = diasActivos > 0 ? diasActivos : 5;
      const horasPorDia = Number(jornada.horasSemanales) / diasLaborables;

      const horaEntrada = new Date(fechaBase);
      horaEntrada.setHours(9, 0, 0, 0);

      eventos.push({
        tipo: 'entrada',
        hora: horaEntrada.toISOString(),
        origen: 'propuesto',
      });

      // Si tiene descanso mínimo
      if (config.descansoMinimo) {
        const [horasDescanso, minutosDescanso] = config.descansoMinimo.split(':').map(Number);
        const descansoMs = (horasDescanso * 60 + minutosDescanso) * 60 * 1000;

        const horaPausaInicio = new Date(horaEntrada.getTime() + (horasPorDia / 2) * 60 * 60 * 1000);
        const horaPausaFin = new Date(horaPausaInicio.getTime() + descansoMs);

        eventos.push({
          tipo: 'pausa_inicio',
          hora: horaPausaInicio.toISOString(),
          origen: 'propuesto',
        });
        eventos.push({
          tipo: 'pausa_fin',
          hora: horaPausaFin.toISOString(),
          origen: 'propuesto',
        });

        const horaSalida = new Date(horaEntrada.getTime() + horasPorDia * 60 * 60 * 1000 + descansoMs);
        eventos.push({
          tipo: 'salida',
          hora: horaSalida.toISOString(),
          origen: 'propuesto',
        });
      } else {
        const horaSalida = new Date(horaEntrada.getTime() + horasPorDia * 60 * 60 * 1000);
        eventos.push({
          tipo: 'salida',
          hora: horaSalida.toISOString(),
          origen: 'propuesto',
        });
      }
    }
  }

  return eventos;
}

/**
 * Obtiene la configuración del día de la semana de una jornada
 */
export function obtenerConfigDia(jornada: Jornada, fecha: Date): DiaConfig | undefined {
  const config = jornada.config as JornadaConfig;
  const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const nombreDia = diasSemana[fecha.getDay()];
  return config[nombreDia] as DiaConfig | undefined;
}

/**
 * Calcula la fecha base (sin hora) de una fecha
 */
export function obtenerFechaBase(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

