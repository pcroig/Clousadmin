// ========================================
// Cálculos de fichajes para cliente (frontend)
// ========================================
// Importante: este archivo NO debe importar `prisma` ni usar APIs de Node.
// Solo contiene lógica pura que puede ejecutarse en el navegador.

import type { FichajeEvento } from '@prisma/client';

/**
 * Calcula las horas trabajadas a partir de los eventos de un fichaje.
 *
 * Nota: Copia de la lógica de `calcularHorasTrabajadas` en `lib/calculos/fichajes.ts`,
 * pero aislada para uso en componentes cliente sin dependencia de Prisma ni de
 * variables de entorno de servidor.
 */
export function calcularHorasTrabajadas(eventos: FichajeEvento[]): number {
  if (eventos.length === 0) return 0;

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

  // Si sigue trabajando (sin salida), calcular hasta ahora
  if (inicioTrabajo) {
    const ahora = new Date();
    const tiempoTrabajado =
      (ahora.getTime() - inicioTrabajo.getTime()) / (1000 * 60 * 60);
    horasTotales += tiempoTrabajado;
  }

  // Redondear a 2 decimales
  return Number(horasTotales.toFixed(2));
}









