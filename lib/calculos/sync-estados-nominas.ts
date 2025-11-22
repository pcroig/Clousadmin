// ========================================
// Sincronización de Estados - Nóminas
// ========================================
// Función centralizadora para mantener EventoNomina y Nomina individuales sincronizadas
// PRINCIPIO: El estado del evento debe reflejar el estado AGREGADO de todas sus nóminas

import { prisma } from '@/lib/prisma';
import {
  EVENTO_ESTADOS,
  NOMINA_ESTADOS,
  type EventoEstado,
  type NominaEstado,
} from '@/lib/constants/nomina-estados';

export type EstadoEventoNomina = EventoEstado;
export type EstadoNomina = NominaEstado;

/**
 * Lógica de cálculo del estado del evento basado en las nóminas individuales
 *
 * REGLAS:
 * - Si TODAS las nóminas están en 'publicada' → evento 'cerrado'
 * - En cualquier otro caso → evento 'abierto'
 */
export async function sincronizarEstadoEvento(
  eventoNominaId: string
): Promise<{ previo: string; nuevo: string; cambio: boolean }> {

  // 1. Obtener el evento y todas sus nóminas
  const evento = await prisma.eventoNomina.findUnique({
    where: { id: eventoNominaId },
    include: {
      nominas: {
        select: {
          id: true,
          estado: true,
          complementosPendientes: true,
        },
      },
    },
  });

  if (!evento) {
    throw new Error(`[SyncEstados] Evento ${eventoNominaId} no encontrado`);
  }

  if (evento.nominas.length === 0) {
    return { previo: evento.estado, nuevo: evento.estado, cambio: false };
  }

  const estadoPrevio = evento.estado;
  const todasPublicadas = evento.nominas.every(
    (n) => n.estado === NOMINA_ESTADOS.PUBLICADA
  );
  const estadoCalculado = todasPublicadas
    ? EVENTO_ESTADOS.PUBLICADO
    : EVENTO_ESTADOS.ABIERTO;

  // 4. Actualizar evento si hay cambio
  if (estadoCalculado !== estadoPrevio) {
    await prisma.eventoNomina.update({
      where: { id: eventoNominaId },
      data: { estado: estadoCalculado },
    });

    return { previo: estadoPrevio, nuevo: estadoCalculado, cambio: true };
  }

  return { previo: estadoPrevio, nuevo: estadoPrevio, cambio: false };
}

/**
 * Actualiza el estado de una nómina individual y sincroniza el evento
 */
export async function actualizarEstadoNomina(
  nominaId: string,
  nuevoEstado: EstadoNomina,
  camposAdicionales?: {
    fechaPublicacion?: Date;
    empleadoNotificado?: boolean;
    fechaNotificacion?: Date;
  }
): Promise<void> {

  // 1. Actualizar la nómina
  const nomina = await prisma.nomina.update({
    where: { id: nominaId },
    data: {
      estado: nuevoEstado,
      ...camposAdicionales,
    },
    select: {
      eventoNominaId: true,
    },
  });

  // 2. Sincronizar el evento si está vinculado
  if (nomina.eventoNominaId) {
    await sincronizarEstadoEvento(nomina.eventoNominaId);
  }
}

/**
 * Actualiza el estado de MÚLTIPLES nóminas y sincroniza el evento (transacción)
 */
export async function actualizarEstadosNominasLote(
  eventoNominaId: string,
  nuevoEstado: EstadoNomina,
  camposAdicionales?: {
    fechaPublicacion?: Date;
    empleadoNotificado?: boolean;
    fechaNotificacion?: Date;
  }
): Promise<number> {
  return await prisma.$transaction(async (tx) => {
    // 1. Actualizar todas las nóminas del evento
    const result = await tx.nomina.updateMany({
      where: {
        eventoNominaId,
      },
      data: {
        estado: nuevoEstado,
        ...camposAdicionales,
      },
    });

    // 2. Sincronizar el estado del evento
    const estadoEvento =
      nuevoEstado === NOMINA_ESTADOS.PUBLICADA
        ? EVENTO_ESTADOS.PUBLICADO
        : EVENTO_ESTADOS.ABIERTO;

    await tx.eventoNomina.update({
      where: { id: eventoNominaId },
      data: {
        estado: estadoEvento,
      },
    });

    return result.count;
  });
}

/**
 * Valida que una transición de estado es válida
 */
export function esTransicionValida(
  estadoActual: EstadoNomina,
  estadoNuevo: EstadoNomina
): boolean {
  const transicionesValidas: Record<EstadoNomina, EstadoNomina[]> = {
    [NOMINA_ESTADOS.PENDIENTE]: [
      NOMINA_ESTADOS.COMPLETADA,
      NOMINA_ESTADOS.PUBLICADA, // Se puede saltar la confirmación de complementos
    ],
    [NOMINA_ESTADOS.COMPLETADA]: [NOMINA_ESTADOS.PENDIENTE, NOMINA_ESTADOS.PUBLICADA],
    [NOMINA_ESTADOS.PUBLICADA]: [],
  };

  return transicionesValidas[estadoActual]?.includes(estadoNuevo) || false;
}

/**
 * Recalcula estadísticas del evento (empleados con complementos, etc.)
 */
export async function recalcularEstadisticasEvento(
  eventoNominaId: string
): Promise<void> {

  const nominas = await prisma.nomina.findMany({
    where: { eventoNominaId },
    include: {
      complementosAsignados: true,
    },
  });

  const empleadosConComplementos = new Set(
    nominas
      .filter((n) => n.complementosAsignados.length > 0)
      .map((n) => n.empleadoId)
  ).size;

  const totalComplementosAsignados = nominas.reduce(
    (sum, n) => sum + n.complementosAsignados.length,
    0
  );

  await prisma.eventoNomina.update({
    where: { id: eventoNominaId },
    data: {
      totalEmpleados: nominas.length,
      empleadosConComplementos,
      complementosAsignados: totalComplementosAsignados,
    },
  });
}


