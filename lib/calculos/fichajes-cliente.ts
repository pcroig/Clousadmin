// ========================================
// Cálculos de fichajes para cliente (frontend)
// ========================================
// Importante: este archivo NO debe importar `prisma` ni usar APIs de Node.
// Solo contiene lógica pura que puede ejecutarse en el navegador.

import type { fichaje_eventos as FichajeEvento } from '@prisma/client';

import { obtenerNombreDia, normalizarFechaSinHora } from '@/lib/utils/fechas';

interface JornadaClienteConfig extends Record<string, unknown> {
  tipo?: 'fija' | 'flexible';
  descansoMinimo?: string;
  limiteInferior?: string;
  limiteSuperior?: string;
}

interface DiaConfig {
  activo?: boolean;
  entrada?: string;
  salida?: string;
  pausa_inicio?: string;
  pausa_fin?: string;
}

export interface JornadaCliente {
  horasSemanales?: number | string | null;
  config?: JornadaClienteConfig | null;
}

/**
 * Calcula las horas trabajadas a partir de los eventos de un fichaje.
 *
 * Nota: Copia de la lógica de `calcularHorasTrabajadas` en `lib/calculos/fichajes.ts`,
 * pero aislada para uso en componentes cliente sin dependencia de Prisma ni de
 * variables de entorno de servidor.
 */
export function calcularHorasTrabajadas(eventos: FichajeEvento[]): number | null {
  if (eventos.length === 0) return null;

  // Ordenar por hora
  const ordenados = [...eventos].sort(
    (a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime()
  );

  let horasTotales = 0;
  let inicioTrabajo: Date | null = null;

  for (const evento of ordenados) {
    const hora = new Date(evento.hora);

    switch (evento.tipo) {
      case 'entrada':
        inicioTrabajo = hora;
        break;

      case 'pausa_inicio':
        if (inicioTrabajo) {
          // Sumar tiempo trabajado hasta la pausa
          const tiempoTrabajado =
            (hora.getTime() - inicioTrabajo.getTime()) / (1000 * 60 * 60);
          horasTotales += tiempoTrabajado;
          inicioTrabajo = null;
        }
        break;

      case 'pausa_fin':
        inicioTrabajo = hora; // Reiniciar trabajo
        break;

      case 'salida':
        if (inicioTrabajo) {
          // Sumar tiempo trabajado desde última entrada/reanudación
          const tiempoTrabajado =
            (hora.getTime() - inicioTrabajo.getTime()) / (1000 * 60 * 60);
          horasTotales += tiempoTrabajado;
          inicioTrabajo = null;
        }
        break;
    }
  }

  if (inicioTrabajo) {
    return null;
  }

  return Number(horasTotales.toFixed(2));
}

/**
 * Calcula el progreso de un fichaje en curso (horas acumuladas cerradas + hora de inicio del tramo activo).
 * Usado para mostrar el cronómetro en tiempo real en el widget.
 * 
 * **Validación de secuencia lógica:**
 * - Permite entrada→pausa_inicio→pausa_fin→salida (secuencia válida)
 * - Si detecta evento fuera de orden (ej: pausa_inicio sin entrada previa), lo ignora
 * - Si detecta múltiples entradas consecutivas sin salida, toma la última como válida
 * 
 * @param eventos - Array de eventos de fichaje ordenados (se reordenan internamente si es necesario)
 * @returns { horasAcumuladas, horaEnCurso } - Horas cerradas y timestamp del tramo activo (null si no hay tramo abierto)
 */
export function calcularProgresoEventos(
  eventos: Array<{ tipo: string; hora: string | Date }>
): { horasAcumuladas: number; horaEnCurso: Date | null } {
  if (!eventos || eventos.length === 0) {
    return { horasAcumuladas: 0, horaEnCurso: null };
  }

  const ordenados = [...eventos].sort(
    (a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime()
  );

  let horas = 0;
  let inicioActual: Date | null = null;
  let enPausa = false;

  for (const evento of ordenados) {
    const instante = new Date(evento.hora);

    // Validar que la hora sea válida
    if (Number.isNaN(instante.getTime())) {
      continue;
    }

    switch (evento.tipo) {
      case 'entrada':
        // Si ya hay un tramo abierto, cerrar el anterior primero
        if (inicioActual && !enPausa) {
          const diffHoras = (instante.getTime() - inicioActual.getTime()) / (1000 * 60 * 60);
          if (Number.isFinite(diffHoras) && diffHoras > 0) {
            horas += diffHoras;
          }
        }
        inicioActual = instante;
        enPausa = false;
        break;

      case 'pausa_inicio':
        // Solo válido si hay entrada previa y no estamos ya en pausa
        if (inicioActual && !enPausa) {
          const diffHoras = (instante.getTime() - inicioActual.getTime()) / (1000 * 60 * 60);
          if (Number.isFinite(diffHoras) && diffHoras > 0) {
            horas += diffHoras;
          }
          inicioActual = null;
          enPausa = true;
        }
        break;

      case 'pausa_fin':
        // Solo válido si estamos en pausa
        if (enPausa) {
          inicioActual = instante;
          enPausa = false;
        }
        break;

      case 'salida':
        // Solo válido si hay tramo abierto y no estamos en pausa
        if (inicioActual && !enPausa) {
          const diffHoras = (instante.getTime() - inicioActual.getTime()) / (1000 * 60 * 60);
          if (Number.isFinite(diffHoras) && diffHoras > 0) {
            horas += diffHoras;
          }
          inicioActual = null;
        }
        // Si estamos en pausa al hacer salida, simplemente cerramos
        enPausa = false;
        break;

      default:
        // Ignorar eventos con tipo desconocido
        break;
    }
  }

  return {
    horasAcumuladas: Number(horas.toFixed(4)),
    horaEnCurso: inicioActual,
  };
}

/**
 * Calcula las horas objetivo diarias basadas en la jornada del empleado.
 * Replica la lógica de `calcularHorasEsperadasDesdeConfig` pero sin depender de Prisma.
 */
export function calcularHorasObjetivoDesdeJornada(options: {
  jornada?: JornadaCliente | null;
  fecha?: Date;
}): number {
  const { jornada, fecha = new Date() } = options;

  if (!jornada || !jornada.config) {
    return 8; // Fallback estándar
  }

  const config = jornada.config as JornadaClienteConfig;
  // FIX CRÍTICO: Usar normalizarFechaSinHora para evitar desfases de zona horaria con import estático
  const fechaBase = normalizarFechaSinHora(fecha);
  const nombreDia = obtenerNombreDia(fechaBase);
  const diaConfig = config[nombreDia] as DiaConfig | undefined;
  const tipoJornada = config.tipo ?? (diaConfig?.entrada && diaConfig?.salida ? 'fija' : 'flexible');

  if (tipoJornada === 'fija' || (diaConfig?.entrada && diaConfig?.salida)) {
    if (!diaConfig || diaConfig.activo === false || !diaConfig.entrada || !diaConfig.salida) {
      return 0;
    }

    const [horaE, minE] = diaConfig.entrada.split(':').map(Number);
    const [horaS, minS] = diaConfig.salida.split(':').map(Number);

    let minutosTrabajo = (horaS * 60 + (minS ?? 0)) - (horaE * 60 + (minE ?? 0));

    if (diaConfig.pausa_inicio && diaConfig.pausa_fin) {
      const [horaPI, minPI] = diaConfig.pausa_inicio.split(':').map(Number);
      const [horaPF, minPF] = diaConfig.pausa_fin.split(':').map(Number);
      minutosTrabajo -= (horaPF * 60 + (minPF ?? 0)) - (horaPI * 60 + (minPI ?? 0));
    }

    return Math.max(minutosTrabajo / 60, 0);
  }

  if (tipoJornada === 'flexible') {
    if (!diaConfig || diaConfig.activo === false) {
      return 0;
    }

    const horasSemanalesNum =
      typeof jornada.horasSemanales === 'number'
        ? jornada.horasSemanales
        : Number(jornada.horasSemanales ?? 0);

    if (!Number.isFinite(horasSemanalesNum) || horasSemanalesNum <= 0) {
      return 0;
    }

    const diasActivos = Object.entries(config).reduce((count, [clave, valor]) => {
      if (['tipo', 'descansoMinimo', 'limiteInferior', 'limiteSuperior'].includes(clave)) {
        return count;
      }

      if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
        const dia = valor as DiaConfig;
        if (dia.activo) {
          return count + 1;
        }
      }

      return count;
    }, 0);

    const divisor = diasActivos > 0 ? diasActivos : 5;
    return horasSemanalesNum / divisor;
  }

  return 0;
}








