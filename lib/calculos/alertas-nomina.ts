// ========================================
// Alertas de Nómina - Generación y Validación
// ========================================
// Genera alertas automáticas para detectar anomalías en pre-nóminas

import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Tipos de alertas según severidad
 */
export const ALERT_TYPES = {
  CRITICO: 'critico', // Bloquean exportación
  ADVERTENCIA: 'advertencia', // Requieren revisión
  INFO: 'info', // Solo informativas
} as const;

/**
 * Categorías de alertas
 */
export const ALERT_CATEGORIES = {
  DATOS_FALTANTES: 'datos_faltantes',
  AUSENCIAS: 'ausencias',
  HORAS: 'horas',
  CONTRATO: 'contrato',
} as const;

/**
 * Códigos específicos de alertas
 */
export const ALERT_CODES = {
  // Críticas (datos faltantes)
  NO_IBAN: 'NO_IBAN',
  NO_NSS: 'NO_NSS',
  NO_SALARIO: 'NO_SALARIO',
  
  // Advertencias (ausencias)
  AUSENCIAS_PENDIENTES: 'AUSENCIAS_PENDIENTES',
  
  // Advertencias (horas)
  HORAS_BAJAS: 'HORAS_BAJAS',
  HORAS_ALTAS: 'HORAS_ALTAS',
  
  // Informativas (contrato)
  ALTA_CONTRATO: 'ALTA_CONTRATO',
  BAJA_CONTRATO: 'BAJA_CONTRATO',
} as const;

interface AlertaData {
  tipo: string;
  categoria: string;
  codigo: string;
  mensaje: string;
  detalles?: Record<string, unknown>;
  accionUrl?: string;
}

/**
 * Genera todas las alertas para una nómina específica
 */
export async function generarAlertasParaNomina(
  nominaId: string,
  empleadoId: string,
  empresaId: string,
  mes: number,
  anio: number
): Promise<number> {
  console.log(`[Alertas] Generando alertas para nómina ${nominaId}`);

  // Obtener datos del empleado y contrato
  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    include: {
      contratos: {
        where: {
          OR: [
            { fechaInicio: { lte: new Date(anio, mes, 0) } },
            { fechaFin: { gte: new Date(anio, mes - 1, 1) } },
          ],
        },
        orderBy: { fechaInicio: 'desc' },
        take: 1,
      },
    },
  });

  if (!empleado) {
    console.error(`[Alertas] Empleado ${empleadoId} no encontrado`);
    return 0;
  }

  const alertas: AlertaData[] = [];

  // === ALERTAS CRÍTICAS: Datos Faltantes ===
  
  // 1. IBAN faltante
  if (!empleado.iban || empleado.iban.trim() === '') {
    alertas.push({
      tipo: ALERT_TYPES.CRITICO,
      categoria: ALERT_CATEGORIES.DATOS_FALTANTES,
      codigo: ALERT_CODES.NO_IBAN,
      mensaje: 'Sin IBAN configurado',
      detalles: { campo: 'iban' },
      accionUrl: `/hr/organizacion/personas/${empleadoId}`,
    });
  }

  // 2. NSS faltante
  if (!empleado.nss || empleado.nss.trim() === '') {
    alertas.push({
      tipo: ALERT_TYPES.CRITICO,
      categoria: ALERT_CATEGORIES.DATOS_FALTANTES,
      codigo: ALERT_CODES.NO_NSS,
      mensaje: 'Sin número de Seguridad Social',
      detalles: { campo: 'nss' },
      accionUrl: `/hr/organizacion/personas/${empleadoId}`,
    });
  }

  // 3. Salario no configurado
  const contratoActual = empleado.contratos[0];
  if (!contratoActual || (!contratoActual.salarioBrutoAnual && !contratoActual.salarioBrutoMensual)) {
    alertas.push({
      tipo: ALERT_TYPES.CRITICO,
      categoria: ALERT_CATEGORIES.DATOS_FALTANTES,
      codigo: ALERT_CODES.NO_SALARIO,
      mensaje: 'Salario no configurado en el contrato',
      detalles: { contratoId: contratoActual?.id },
      accionUrl: `/hr/organizacion/personas/${empleadoId}`,
    });
  }

  // === ALERTAS DE ADVERTENCIA: Ausencias ===
  
  const inicioMes = new Date(anio, mes - 1, 1);
  const finMes = new Date(anio, mes, 0, 23, 59, 59);

  // 4. Ausencias pendientes de aprobación
  const ausenciasPendientes = await prisma.ausencia.count({
    where: {
      empleadoId,
      estado: 'pendiente',
      OR: [
        {
          fechaInicio: {
            gte: inicioMes,
            lte: finMes,
          },
        },
        {
          fechaFin: {
            gte: inicioMes,
            lte: finMes,
          },
        },
      ],
    },
  });

  if (ausenciasPendientes > 0) {
    alertas.push({
      tipo: ALERT_TYPES.ADVERTENCIA,
      categoria: ALERT_CATEGORIES.AUSENCIAS,
      codigo: ALERT_CODES.AUSENCIAS_PENDIENTES,
      mensaje: `${ausenciasPendientes} ausencia${ausenciasPendientes > 1 ? 's' : ''} pendiente${ausenciasPendientes > 1 ? 's' : ''} de aprobación`,
      detalles: { cantidad: ausenciasPendientes },
      accionUrl: `/hr/ausencias`,
    });
  }

  // === ALERTAS DE ADVERTENCIA/INFO: Horas Trabajadas ===
  
  if (contratoActual) {
    const jornada = await prisma.jornada.findUnique({
      where: { id: contratoActual.jornadaId || '' },
    });

    if (jornada) {
      const horasEsperadasMes = Number(jornada.horasSemanales) * 4.33; // Promedio semanas por mes
      
      const fichajes = await prisma.fichaje.findMany({
        where: {
          empleadoId,
          fecha: {
            gte: inicioMes,
            lte: finMes,
          },
          estado: 'finalizado',
        },
        select: {
          horasTrabajadas: true,
        },
      });

      const horasTrabajadas = fichajes.reduce(
        (sum, f) => sum + Number(f.horasTrabajadas || 0),
        0
      );

      const desviacion = ((horasTrabajadas - horasEsperadasMes) / horasEsperadasMes) * 100;

      // 5. Horas significativamente bajas
      if (desviacion < -20) {
        alertas.push({
          tipo: ALERT_TYPES.ADVERTENCIA,
          categoria: ALERT_CATEGORIES.HORAS,
          codigo: ALERT_CODES.HORAS_BAJAS,
          mensaje: `Horas trabajadas muy bajas (${horasTrabajadas.toFixed(1)}h vs ${horasEsperadasMes.toFixed(1)}h esperadas)`,
          detalles: {
            horasTrabajadas,
            horasEsperadas: horasEsperadasMes,
            desviacion: desviacion.toFixed(1),
          },
          accionUrl: `/hr/fichajes`,
        });
      }

      // 6. Horas significativamente altas
      if (desviacion > 30) {
        alertas.push({
          tipo: ALERT_TYPES.ADVERTENCIA,
          categoria: ALERT_CATEGORIES.HORAS,
          codigo: ALERT_CODES.HORAS_ALTAS,
          mensaje: `Horas trabajadas muy altas (${horasTrabajadas.toFixed(1)}h vs ${horasEsperadasMes.toFixed(1)}h esperadas)`,
          detalles: {
            horasTrabajadas,
            horasEsperadas: horasEsperadasMes,
            desviacion: desviacion.toFixed(1),
          },
          accionUrl: `/hr/fichajes`,
        });
      }
    }
  }

  // === ALERTAS INFORMATIVAS: Cambios de Contrato ===
  
  // 7. Alta durante el mes
  if (contratoActual && contratoActual.fechaInicio >= inicioMes && contratoActual.fechaInicio <= finMes) {
    alertas.push({
      tipo: ALERT_TYPES.INFO,
      categoria: ALERT_CATEGORIES.CONTRATO,
      codigo: ALERT_CODES.ALTA_CONTRATO,
      mensaje: `Alta de contrato el ${contratoActual.fechaInicio.toLocaleDateString('es-ES')}`,
      detalles: {
        contratoId: contratoActual.id,
        fechaInicio: contratoActual.fechaInicio,
      },
      accionUrl: `/hr/organizacion/personas/${empleadoId}`,
    });
  }

  // 8. Baja durante el mes
  if (contratoActual && contratoActual.fechaFin && contratoActual.fechaFin >= inicioMes && contratoActual.fechaFin <= finMes) {
    alertas.push({
      tipo: ALERT_TYPES.INFO,
      categoria: ALERT_CATEGORIES.CONTRATO,
      codigo: ALERT_CODES.BAJA_CONTRATO,
      mensaje: `Baja de contrato el ${contratoActual.fechaFin.toLocaleDateString('es-ES')}`,
      detalles: {
        contratoId: contratoActual.id,
        fechaFin: contratoActual.fechaFin,
      },
      accionUrl: `/hr/organizacion/personas/${empleadoId}`,
    });
  }

  // === CREAR ALERTAS EN LA BD ===
  
  if (alertas.length > 0) {
    await prisma.alertaNomina.createMany({
      data: alertas.map((alerta) => ({
        empresaId,
        empleadoId,
        nominaId,
        ...alerta,
      })),
      skipDuplicates: true,
    });

    console.log(`[Alertas] Creadas ${alertas.length} alertas para nómina ${nominaId}`);
  } else {
    console.log(`[Alertas] No se detectaron anomalías para nómina ${nominaId}`);
  }

  return alertas.length;
}

/**
 * Verifica si una nómina tiene alertas críticas que bloquean la exportación
 */
export async function tieneAlertasCriticas(nominaId: string): Promise<boolean> {
  const count = await prisma.alertaNomina.count({
    where: {
      nominaId,
      tipo: ALERT_TYPES.CRITICO,
      resuelta: false,
    },
  });

  return count > 0;
}

/**
 * Recalcula alertas para todas las nóminas de un evento
 */
export async function recalcularAlertasEvento(eventoNominaId: string): Promise<number> {
  console.log(`[Alertas] Recalculando alertas para evento ${eventoNominaId}`);

  const evento = await prisma.eventoNomina.findUnique({
    where: { id: eventoNominaId },
    include: {
      nominas: {
        select: {
          id: true,
          empleadoId: true,
        },
      },
    },
  });

  if (!evento) {
    throw new Error(`Evento ${eventoNominaId} no encontrado`);
  }

  // Eliminar alertas anteriores del evento
  await prisma.alertaNomina.deleteMany({
    where: {
      nominaId: {
        in: evento.nominas.map((n) => n.id),
      },
    },
  });

  // Regenerar alertas para cada nómina
  let totalAlertas = 0;
  for (const nomina of evento.nominas) {
    const alertasCreadas = await generarAlertasParaNomina(
      nomina.id,
      nomina.empleadoId,
      evento.empresaId,
      evento.mes,
      evento.anio
    );
    totalAlertas += alertasCreadas;
  }

  console.log(`[Alertas] Recalculadas ${totalAlertas} alertas para evento ${eventoNominaId}`);
  return totalAlertas;
}




