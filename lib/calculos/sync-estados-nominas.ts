// ========================================
// Sincronización de Estados - Nóminas
// ========================================
// Función centralizadora para mantener EventoNomina y Nomina individuales sincronizadas
// PRINCIPIO: El estado del evento debe reflejar el estado AGREGADO de todas sus nóminas

import { prisma } from '@/lib/prisma';

/**
 * Estados válidos de EventoNomina
 */
export type EstadoEventoNomina =
  | 'generando'
  | 'complementos_pendientes'
  | 'lista_exportar'
  | 'exportada'
  | 'definitiva'
  | 'publicada'
  | 'cerrada';

/**
 * Estados válidos de Nomina individual
 */
export type EstadoNomina =
  | 'pre_nomina'
  | 'complementos_pendientes'
  | 'lista_exportar'
  | 'exportada'
  | 'definitiva'
  | 'publicada'
  | 'anulada';

/**
 * Lógica de cálculo del estado del evento basado en las nóminas individuales
 *
 * REGLAS:
 * - Si TODAS las nóminas están en 'publicada' → evento 'publicada'
 * - Si TODAS las nóminas están en 'definitiva' → evento 'definitiva'
 * - Si AL MENOS UNA nómina está en 'exportada' → evento 'exportada'
 * - Si TODAS las nóminas están en 'lista_exportar' → evento 'lista_exportar'
 * - Si HAY complementos pendientes → evento 'complementos_pendientes'
 * - Si está generando → evento 'generando'
 */
export async function sincronizarEstadoEvento(
  eventoNominaId: string
): Promise<{ previo: string; nuevo: string; cambio: boolean }> {
  console.log(`[SyncEstados] Sincronizando evento ${eventoNominaId}`);

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
    console.warn(`[SyncEstados] Evento ${eventoNominaId} no tiene nóminas`);
    return { previo: evento.estado, nuevo: evento.estado, cambio: false };
  }

  const estadoPrevio = evento.estado;
  let estadoCalculado: EstadoEventoNomina;

  // 2. Analizar estados de las nóminas
  const estadosNominas = evento.nominas.map((n) => n.estado);
  const totalNominas = evento.nominas.length;

  const count = {
    publicada: estadosNominas.filter((e) => e === 'publicada').length,
    definitiva: estadosNominas.filter((e) => e === 'definitiva').length,
    exportada: estadosNominas.filter((e) => e === 'exportada').length,
    lista_exportar: estadosNominas.filter((e) => e === 'lista_exportar').length,
    complementos_pendientes: estadosNominas.filter((e) => e === 'complementos_pendientes').length,
    pre_nomina: estadosNominas.filter((e) => e === 'pre_nomina').length,
  };

  const hayComplementosPendientes = evento.nominas.some((n) => n.complementosPendientes);

  console.log(`[SyncEstados] Análisis - Total: ${totalNominas}`, count);

  // 3. Aplicar lógica de cálculo
  if (count.publicada === totalNominas) {
    // TODAS publicadas
    estadoCalculado = 'publicada';
  } else if (count.definitiva === totalNominas) {
    // TODAS definitivas (listas para publicar)
    estadoCalculado = 'definitiva';
  } else if (count.exportada > 0 || count.definitiva > 0) {
    // Al menos una exportada o definitiva → en proceso de importación
    estadoCalculado = 'exportada';
  } else if (count.lista_exportar === totalNominas) {
    // TODAS listas para exportar
    estadoCalculado = 'lista_exportar';
  } else if (hayComplementosPendientes || count.complementos_pendientes > 0) {
    // Hay complementos pendientes de asignar
    estadoCalculado = 'complementos_pendientes';
  } else {
    // Por defecto, si hay pre-nóminas o estados mixtos
    estadoCalculado = 'complementos_pendientes';
  }

  // 4. Actualizar evento si hay cambio
  if (estadoCalculado !== estadoPrevio) {
    console.log(
      `[SyncEstados] Cambio de estado: ${estadoPrevio} → ${estadoCalculado}`
    );

    await prisma.eventoNomina.update({
      where: { id: eventoNominaId },
      data: { estado: estadoCalculado },
    });

    return { previo: estadoPrevio, nuevo: estadoCalculado, cambio: true };
  }

  console.log(`[SyncEstados] Sin cambios - Estado actual: ${estadoPrevio}`);
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
  console.log(`[SyncEstados] Actualizando nómina ${nominaId} a '${nuevoEstado}'`);

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
  console.log(
    `[SyncEstados] Actualización en lote para evento ${eventoNominaId} a '${nuevoEstado}'`
  );

  return await prisma.$transaction(async (tx) => {
    // 1. Actualizar todas las nóminas del evento
    const result = await tx.nomina.updateMany({
      where: {
        eventoNominaId,
        // Solo actualizar si el estado actual permite la transición
        estado: {
          not: 'anulada', // No actualizar nóminas anuladas
        },
      },
      data: {
        estado: nuevoEstado,
        ...camposAdicionales,
      },
    });

    // 2. Sincronizar el estado del evento
    // Obtener evento con nóminas actualizadas
    const evento = await tx.eventoNomina.findUnique({
      where: { id: eventoNominaId },
      include: {
        nominas: {
          select: {
            estado: true,
            complementosPendientes: true,
          },
        },
      },
    });

    if (!evento) {
      throw new Error(`[SyncEstados] Evento ${eventoNominaId} no encontrado`);
    }

    // Calcular estado basado en nóminas actualizadas
    const estadosNominas = evento.nominas.map((n) => n.estado);
    const totalNominas = evento.nominas.length;

    const count = {
      publicada: estadosNominas.filter((e) => e === 'publicada').length,
      definitiva: estadosNominas.filter((e) => e === 'definitiva').length,
      exportada: estadosNominas.filter((e) => e === 'exportada').length,
      lista_exportar: estadosNominas.filter((e) => e === 'lista_exportar').length,
    };

    let estadoCalculado: EstadoEventoNomina = 'complementos_pendientes';

    if (count.publicada === totalNominas) {
      estadoCalculado = 'publicada';
    } else if (count.definitiva === totalNominas) {
      estadoCalculado = 'definitiva';
    } else if (count.exportada > 0 || count.definitiva > 0) {
      estadoCalculado = 'exportada';
    } else if (count.lista_exportar === totalNominas) {
      estadoCalculado = 'lista_exportar';
    }

    await tx.eventoNomina.update({
      where: { id: eventoNominaId },
      data: { estado: estadoCalculado },
    });

    console.log(
      `[SyncEstados] Lote actualizado: ${result.count} nóminas, evento → '${estadoCalculado}'`
    );

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
    pre_nomina: ['complementos_pendientes', 'lista_exportar'],
    complementos_pendientes: ['lista_exportar'],
    lista_exportar: ['exportada'],
    exportada: ['definitiva'],
    definitiva: ['publicada'],
    publicada: ['anulada'], // Solo se puede anular después de publicar
    anulada: [], // Estado final
  };

  return transicionesValidas[estadoActual]?.includes(estadoNuevo) || false;
}

/**
 * Recalcula estadísticas del evento (empleados con complementos, etc.)
 */
export async function recalcularEstadisticasEvento(
  eventoNominaId: string
): Promise<void> {
  console.log(`[SyncEstados] Recalculando estadísticas para evento ${eventoNominaId}`);

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

  console.log(
    `[SyncEstados] Estadísticas actualizadas: ${nominas.length} nóminas, ${empleadosConComplementos} con complementos`
  );
}




