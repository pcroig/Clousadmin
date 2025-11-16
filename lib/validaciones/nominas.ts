// ========================================
// Validaciones de Nóminas - Sistema de Alertas
// ========================================
// Detecta anomalías y datos faltantes antes del cierre de nómina

import { prisma } from '@/lib/prisma';
import { obtenerHorasEsperadas } from '../calculos/fichajes';
import { EstadoAusencia } from '@/lib/constants/enums';

/**
 * Tipos de alertas
 */
export type TipoAlerta = 'critico' | 'advertencia' | 'info';
export type CategoriaAlerta =
  | 'datos_faltantes'
  | 'fichajes'
  | 'ausencias'
  | 'horas'
  | 'cambios';

export interface Alerta {
  empleadoId: string;
  tipo: TipoAlerta;
  categoria: CategoriaAlerta;
  codigo: string;
  mensaje: string;
  detalles?: any;
  accionUrl?: string;
}

/**
 * Detecta alertas críticas para un empleado
 * Bloquean la exportación de nómina
 */
async function detectarAlertasCriticas(
  empleadoId: string,
  mes: number,
  anio: number,
  empresaId: string
): Promise<Alerta[]> {
  const alertas: Alerta[] = [];

  // Obtener datos del empleado
  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    select: {
      nombre: true,
      apellidos: true,
      iban: true,
      nss: true,
      salarioBrutoMensual: true,
    },
  });

  if (!empleado) {
    return alertas;
  }

  // 1. NO_IBAN: Sin IBAN configurado
  if (!empleado.iban) {
    alertas.push({
      empleadoId,
      tipo: 'critico',
      categoria: 'datos_faltantes',
      codigo: 'NO_IBAN',
      mensaje: 'Sin IBAN configurado',
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
      },
      accionUrl: `/hr/organizacion/personas/${empleadoId}`,
    });
  }

  // 2. NO_NSS: Sin número de Seguridad Social
  if (!empleado.nss) {
    alertas.push({
      empleadoId,
      tipo: 'critico',
      categoria: 'datos_faltantes',
      codigo: 'NO_NSS',
      mensaje: 'Sin número de Seguridad Social',
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
      },
      accionUrl: `/hr/organizacion/personas/${empleadoId}`,
    });
  }

  // 3. NO_SALARIO: Salario no configurado
  if (!empleado.salarioBrutoMensual) {
    alertas.push({
      empleadoId,
      tipo: 'critico',
      categoria: 'datos_faltantes',
      codigo: 'NO_SALARIO',
      mensaje: 'Salario no configurado',
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
      },
      accionUrl: `/hr/organizacion/personas/${empleadoId}`,
    });
  }

  // 4. FICHAJE_INCOMPLETO: Fichajes sin salida (día pasado)
  const fechaInicio = new Date(anio, mes - 1, 1);
  const fechaFin = new Date(anio, mes, 0);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fichajesIncompletos = await prisma.fichaje.findMany({
    where: {
      empleadoId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
        lt: hoy, // Solo días pasados
      },
      estado: {
        in: ['en_curso', 'pendiente'],
      },
    },
    select: {
      fecha: true,
    },
    orderBy: {
      fecha: 'asc',
    },
  });

  if (fichajesIncompletos.length > 0) {
    alertas.push({
      empleadoId,
      tipo: 'critico',
      categoria: 'fichajes',
      codigo: 'FICHAJE_INCOMPLETO',
      mensaje: `${fichajesIncompletos.length} fichaje(s) sin cerrar`,
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
        fechas: fichajesIncompletos.map((f) =>
          f.fecha.toISOString().split('T')[0]
        ),
      },
      accionUrl: `/hr/horario/fichajes?empleadoId=${empleadoId}&estado=pendiente`,
    });
  }

  return alertas;
}

/**
 * Detecta alertas de advertencia para un empleado
 * No bloquean exportación pero requieren revisión
 */
async function detectarAlertasAdvertencia(
  empleadoId: string,
  mes: number,
  anio: number,
  empresaId: string
): Promise<Alerta[]> {
  const alertas: Alerta[] = [];

  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    select: {
      nombre: true,
      apellidos: true,
      jornadaId: true,
    },
  });

  if (!empleado) {
    return alertas;
  }

  const fechaInicio = new Date(anio, mes - 1, 1);
  fechaInicio.setHours(0, 0, 0, 0);
  const fechaFin = new Date(anio, mes, 0);
  fechaFin.setHours(23, 59, 59, 999);

  // Complementos pendientes de validación
  const complementosPendientes = await prisma.empleadoComplemento.count({
    where: {
      empleadoId,
      activo: true,
      validado: false,
      rechazado: false,
    },
  });

  if (complementosPendientes > 0) {
    alertas.push({
      empleadoId,
      tipo: 'advertencia',
      categoria: 'datos_faltantes',
      codigo: 'COMPLEMENTOS_PENDIENTES',
      mensaje: `${complementosPendientes} complemento(s) pendientes de validar`,
      detalles: {
        complementosPendientes,
      },
      accionUrl: `/hr/organizacion/personas/${empleadoId}?tab=complementos`,
    });
  }

  // Ausencias pendientes de aprobación
  const ausenciasPendientes = await prisma.ausencia.count({
    where: {
      empleadoId,
      estado: EstadoAusencia.pendiente,
      OR: [
        {
          fechaInicio: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        {
          fechaFin: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
      ],
    },
  });

  if (ausenciasPendientes > 0) {
    alertas.push({
      empleadoId,
      tipo: 'advertencia',
      categoria: 'ausencias',
      codigo: 'AUSENCIAS_PENDIENTES',
      mensaje: `${ausenciasPendientes} ausencia(s) pendientes de aprobación`,
      detalles: {
        ausenciasPendientes,
      },
      accionUrl: `/hr/horario/ausencias?empleadoId=${empleadoId}&estado=pendiente`,
    });
  }

  // 1. HORAS_BAJAS / HORAS_ALTAS: Comparar horas trabajadas con esperadas
  const fichajes = await prisma.fichaje.findMany({
    where: {
      empleadoId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
      estado: 'finalizado',
    },
    select: {
      horasTrabajadas: true,
      fecha: true,
    },
  });

  const horasTotales = fichajes.reduce(
    (sum, f) => sum + Number(f.horasTrabajadas || 0),
    0
  );

  // Calcular horas esperadas (aproximadamente 8h x días laborables)
  let horasEsperadas = 0;
  if (empleado.jornadaId) {
    // Calcular sumando las horas esperadas de cada día
    for (const fichaje of fichajes) {
      const horasEsperadasDia = await obtenerHorasEsperadas(
        empleadoId,
        fichaje.fecha
      );
      horasEsperadas += horasEsperadasDia;
    }
  } else {
    // Fallback: 8 horas por día trabajado
    horasEsperadas = fichajes.length * 8;
  }

  if (horasTotales < horasEsperadas * 0.5) {
    alertas.push({
      empleadoId,
      tipo: 'advertencia',
      categoria: 'horas',
      codigo: 'HORAS_BAJAS',
      mensaje: `Solo ${Math.round(horasTotales)}h trabajadas (esperado: ${Math.round(horasEsperadas)}h)`,
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
        horasTrabajadas: Math.round(horasTotales * 100) / 100,
        horasEsperadas: Math.round(horasEsperadas * 100) / 100,
      },
      accionUrl: `/hr/horario/fichajes?empleadoId=${empleadoId}`,
    });
  }

  if (horasTotales > horasEsperadas * 1.5) {
    alertas.push({
      empleadoId,
      tipo: 'advertencia',
      categoria: 'horas',
      codigo: 'HORAS_ALTAS',
      mensaje: `${Math.round(horasTotales)}h trabajadas (esperado: ${Math.round(horasEsperadas)}h)`,
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
        horasTrabajadas: Math.round(horasTotales * 100) / 100,
        horasEsperadas: Math.round(horasEsperadas * 100) / 100,
        posibleError: 'Revisar fichajes',
      },
      accionUrl: `/hr/horario/fichajes?empleadoId=${empleadoId}`,
    });
  }

  // 2. IT_SIN_JUSTIFICANTE: Bajas médicas sin documento
  const bajasIT = await prisma.ausencia.findMany({
    where: {
      empleadoId,
      tipo: {
        in: ['enfermedad', 'maternidad_paternidad'],
      },
      OR: [
        {
          fechaInicio: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        {
          fechaFin: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
      ],
      justificanteUrl: null,
    },
  });

  if (bajasIT.length > 0) {
    alertas.push({
      empleadoId,
      tipo: 'advertencia',
      categoria: 'ausencias',
      codigo: 'IT_SIN_JUSTIFICANTE',
      mensaje: `${bajasIT.length} baja(s) médica(s) sin justificante`,
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
        ausencias: bajasIT.map((a) => ({
          tipo: a.tipo,
          fechaInicio: a.fechaInicio,
          fechaFin: a.fechaFin,
        })),
      },
      accionUrl: `/hr/horario/ausencias?empleadoId=${empleadoId}`,
    });
  }

  // 3. DIAS_SIN_REGISTRO: Días sin fichaje ni ausencia
  // Calcular días laborables del mes
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { config: true },
  });

  const config = empresa?.config as any;
  const diasLaborables = config?.dias_laborables || {
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true,
    sabado: false,
    domingo: false,
  };

  // Obtener festivos del mes
  const festivos = await prisma.festivo.findMany({
    where: {
      empresaId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
      activo: true,
    },
    select: {
      fecha: true,
    },
  });

  const festivosSet = new Set(
    festivos.map((f) => f.fecha.toISOString().split('T')[0])
  );

  // Obtener ausencias del mes
  const ausencias = await prisma.ausencia.findMany({
    where: {
      empleadoId,
      estado: {
        in: [EstadoAusencia.completada, EstadoAusencia.confirmada],
      },
      OR: [
        {
          fechaInicio: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        {
          fechaFin: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        {
          AND: [
            { fechaInicio: { lte: fechaInicio } },
            { fechaFin: { gte: fechaFin } },
          ],
        },
      ],
    },
    select: {
      fechaInicio: true,
      fechaFin: true,
    },
  });

  // Crear set de fechas con ausencias
  const diasConAusencia = new Set<string>();
  for (const ausencia of ausencias) {
    const fecha = new Date(ausencia.fechaInicio);
    const fin = new Date(ausencia.fechaFin);
    while (fecha <= fin) {
      diasConAusencia.add(fecha.toISOString().split('T')[0]);
      fecha.setDate(fecha.getDate() + 1);
    }
  }

  // Crear set de fechas con fichajes
  const diasConFichaje = new Set(
    fichajes.map((f) => f.fecha.toISOString().split('T')[0])
  );

  // Contar días laborables sin registro
  let diasSinRegistro = 0;
  const fecha = new Date(fechaInicio);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const mapaDias: { [key: number]: keyof typeof diasLaborables } = {
    0: 'domingo',
    1: 'lunes',
    2: 'martes',
    3: 'miercoles',
    4: 'jueves',
    5: 'viernes',
    6: 'sabado',
  };

  while (fecha <= fechaFin && fecha < hoy) {
    const fechaStr = fecha.toISOString().split('T')[0];
    const diaSemana = fecha.getDay();
    const nombreDia = mapaDias[diaSemana];

    // Es día laborable?
    const esLaborable = diasLaborables[nombreDia];
    const esFestivo = festivosSet.has(fechaStr);
    const tieneFichaje = diasConFichaje.has(fechaStr);
    const tieneAusencia = diasConAusencia.has(fechaStr);

    if (esLaborable && !esFestivo && !tieneFichaje && !tieneAusencia) {
      diasSinRegistro++;
    }

    fecha.setDate(fecha.getDate() + 1);
  }

  if (diasSinRegistro > 0) {
    alertas.push({
      empleadoId,
      tipo: 'advertencia',
      categoria: 'fichajes',
      codigo: 'DIAS_SIN_REGISTRO',
      mensaje: `${diasSinRegistro} día(s) sin fichar ni ausencia`,
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
        diasSinRegistro,
      },
      accionUrl: `/hr/horario/fichajes?empleadoId=${empleadoId}`,
    });
  }

  return alertas;
}

/**
 * Detecta alertas informativas para un empleado
 * Información relevante pero no requiere acción
 */
async function detectarAlertasInformativas(
  empleadoId: string,
  mes: number,
  anio: number,
  empresaId: string
): Promise<Alerta[]> {
  const alertas: Alerta[] = [];

  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    select: {
      nombre: true,
      apellidos: true,
      fechaAlta: true,
    },
  });

  if (!empleado) {
    return alertas;
  }

  // 1. ANIVERSARIO: Aniversario laboral
  const fechaAlta = empleado.fechaAlta;
  const mesAlta = fechaAlta.getMonth() + 1;
  const anioAlta = fechaAlta.getFullYear();

  if (mesAlta === mes && anioAlta < anio) {
    const anosServicio = anio - anioAlta;
    alertas.push({
      empleadoId,
      tipo: 'info',
      categoria: 'cambios',
      codigo: 'ANIVERSARIO',
      mensaje: `Aniversario laboral: ${anosServicio} año(s)`,
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
        fechaAlta: fechaAlta,
        anosServicio,
      },
    });
  }

  // 2. Altas/Bajas de contrato dentro del mes
  const contratosMes = await prisma.contrato.findMany({
    where: {
      empleadoId,
      OR: [
        {
          fechaInicio: {
            gte: new Date(anio, mes - 1, 1),
            lte: new Date(anio, mes, 0, 23, 59, 59),
          },
        },
        {
          fechaFin: {
            gte: new Date(anio, mes - 1, 1),
            lte: new Date(anio, mes, 0, 23, 59, 59),
          },
        },
      ],
    },
    select: {
      fechaInicio: true,
      fechaFin: true,
      tipoContrato: true,
    },
  });

  contratosMes.forEach((contrato) => {
    if (
      contrato.fechaInicio &&
      contrato.fechaInicio.getMonth() + 1 === mes &&
      contrato.fechaInicio.getFullYear() === anio
    ) {
      alertas.push({
        empleadoId,
        tipo: 'info',
        categoria: 'cambios',
        codigo: 'ALTA_CONTRATO',
        mensaje: `Alta de contrato (${contrato.tipoContrato})`,
        detalles: {
          fechaInicio: contrato.fechaInicio,
          tipoContrato: contrato.tipoContrato,
        },
      });
    }

    if (
      contrato.fechaFin &&
      contrato.fechaFin.getMonth() + 1 === mes &&
      contrato.fechaFin.getFullYear() === anio
    ) {
      alertas.push({
        empleadoId,
        tipo: 'info',
        categoria: 'cambios',
        codigo: 'BAJA_CONTRATO',
        mensaje: `Baja de contrato (${contrato.tipoContrato})`,
        detalles: {
          fechaFin: contrato.fechaFin,
          tipoContrato: contrato.tipoContrato,
        },
      });
    }
  });

  return alertas;
}

/**
 * Detecta todas las alertas de un empleado para un mes
 */
export async function detectarAlertasEmpleado(
  empleadoId: string,
  mes: number,
  anio: number,
  empresaId: string
): Promise<Alerta[]> {
  const [criticas, advertencias, informativas] = await Promise.all([
    detectarAlertasCriticas(empleadoId, mes, anio, empresaId),
    detectarAlertasAdvertencia(empleadoId, mes, anio, empresaId),
    detectarAlertasInformativas(empleadoId, mes, anio, empresaId),
  ]);

  return [...criticas, ...advertencias, ...informativas];
}

/**
 * Detecta alertas para todos los empleados activos de una empresa
 * Guarda las alertas en la base de datos
 */
export async function detectarAlertas(
  empresaId: string,
  mes: number,
  anio: number
): Promise<{
  total: number;
  criticas: number;
  advertencias: number;
  informativas: number;
  alertas: Alerta[];
}> {
  console.log(`[detectarAlertas] Detectando alertas para ${mes}/${anio}`);

  // Obtener todos los empleados activos
  const empleados = await prisma.empleado.findMany({
    where: {
      empresaId,
      activo: true,
    },
    select: {
      id: true,
    },
  });

  console.log(`[detectarAlertas] ${empleados.length} empleados activos`);

  // Limpiar alertas antiguas del mismo mes/año
  await prisma.alertaNomina.deleteMany({
    where: {
      empresaId,
      createdAt: {
        gte: new Date(anio, mes - 1, 1),
        lte: new Date(anio, mes, 0, 23, 59, 59),
      },
      resuelta: false,
    },
  });

  // Detectar alertas para cada empleado
  const todasLasAlertas: Alerta[] = [];

  for (const empleado of empleados) {
    const alertas = await detectarAlertasEmpleado(
      empleado.id,
      mes,
      anio,
      empresaId
    );
    todasLasAlertas.push(...alertas);
  }

  // Guardar alertas en la base de datos
  for (const alerta of todasLasAlertas) {
    await prisma.alertaNomina.create({
      data: {
        empresaId,
        empleadoId: alerta.empleadoId,
        tipo: alerta.tipo,
        categoria: alerta.categoria,
        codigo: alerta.codigo,
        mensaje: alerta.mensaje,
        detalles: alerta.detalles || {},
        accionUrl: alerta.accionUrl,
        resuelta: false,
      },
    });
  }

  // Contar por tipo
  const criticas = todasLasAlertas.filter((a) => a.tipo === 'critico').length;
  const advertencias = todasLasAlertas.filter(
    (a) => a.tipo === 'advertencia'
  ).length;
  const informativas = todasLasAlertas.filter((a) => a.tipo === 'info').length;

  console.log(
    `[detectarAlertas] Total: ${todasLasAlertas.length} (${criticas} críticas, ${advertencias} advertencias, ${informativas} info)`
  );

  return {
    total: todasLasAlertas.length,
    criticas,
    advertencias,
    informativas,
    alertas: todasLasAlertas,
  };
}

/**
 * Obtiene las alertas de un mes (desde la base de datos)
 */
export async function obtenerAlertas(
  empresaId: string,
  mes: number,
  anio: number,
  tipo?: TipoAlerta
): Promise<any[]> {
  const where: any = {
    empresaId,
    createdAt: {
      gte: new Date(anio, mes - 1, 1),
      lte: new Date(anio, mes, 0, 23, 59, 59),
    },
  };

  if (tipo) {
    where.tipo = tipo;
  }

  return prisma.alertaNomina.findMany({
    where,
    include: {
      empleado: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
        },
      },
    },
    orderBy: [
      { tipo: 'asc' }, // crítico primero
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Marca una alerta como resuelta
 */
export async function resolverAlerta(alertaId: string): Promise<void> {
  await prisma.alertaNomina.update({
    where: { id: alertaId },
    data: {
      resuelta: true,
      fechaResolucion: new Date(),
    },
  });
}

/**
 * Verifica si hay alertas críticas sin resolver
 */
export async function tieneAlertasCriticas(
  empresaId: string,
  mes: number,
  anio: number
): Promise<boolean> {
  const count = await prisma.alertaNomina.count({
    where: {
      empresaId,
      tipo: 'critico',
      resuelta: false,
      createdAt: {
        gte: new Date(anio, mes - 1, 1),
        lte: new Date(anio, mes, 0, 23, 59, 59),
      },
    },
  });

  return count > 0;
}



// ========================================
// Detecta anomalías y datos faltantes antes del cierre de nómina

import { prisma } from '@/lib/prisma';
import { obtenerHorasEsperadas } from '../calculos/fichajes';
import { EstadoAusencia } from '@/lib/constants/enums';

/**
 * Tipos de alertas
 */
export type TipoAlerta = 'critico' | 'advertencia' | 'info';
export type CategoriaAlerta =
  | 'datos_faltantes'
  | 'fichajes'
  | 'ausencias'
  | 'horas'
  | 'cambios';

export interface Alerta {
  empleadoId: string;
  tipo: TipoAlerta;
  categoria: CategoriaAlerta;
  codigo: string;
  mensaje: string;
  detalles?: any;
  accionUrl?: string;
}

/**
 * Detecta alertas críticas para un empleado
 * Bloquean la exportación de nómina
 */
async function detectarAlertasCriticas(
  empleadoId: string,
  mes: number,
  anio: number,
  empresaId: string
): Promise<Alerta[]> {
  const alertas: Alerta[] = [];

  // Obtener datos del empleado
  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    select: {
      nombre: true,
      apellidos: true,
      iban: true,
      nss: true,
      salarioBrutoMensual: true,
    },
  });

  if (!empleado) {
    return alertas;
  }

  // 1. NO_IBAN: Sin IBAN configurado
  if (!empleado.iban) {
    alertas.push({
      empleadoId,
      tipo: 'critico',
      categoria: 'datos_faltantes',
      codigo: 'NO_IBAN',
      mensaje: 'Sin IBAN configurado',
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
      },
      accionUrl: `/hr/organizacion/personas/${empleadoId}`,
    });
  }

  // 2. NO_NSS: Sin número de Seguridad Social
  if (!empleado.nss) {
    alertas.push({
      empleadoId,
      tipo: 'critico',
      categoria: 'datos_faltantes',
      codigo: 'NO_NSS',
      mensaje: 'Sin número de Seguridad Social',
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
      },
      accionUrl: `/hr/organizacion/personas/${empleadoId}`,
    });
  }

  // 3. NO_SALARIO: Salario no configurado
  if (!empleado.salarioBrutoMensual) {
    alertas.push({
      empleadoId,
      tipo: 'critico',
      categoria: 'datos_faltantes',
      codigo: 'NO_SALARIO',
      mensaje: 'Salario no configurado',
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
      },
      accionUrl: `/hr/organizacion/personas/${empleadoId}`,
    });
  }

  // 4. FICHAJE_INCOMPLETO: Fichajes sin salida (día pasado)
  const fechaInicio = new Date(anio, mes - 1, 1);
  const fechaFin = new Date(anio, mes, 0);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const fichajesIncompletos = await prisma.fichaje.findMany({
    where: {
      empleadoId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
        lt: hoy, // Solo días pasados
      },
      estado: {
        in: ['en_curso', 'pendiente'],
      },
    },
    select: {
      fecha: true,
    },
    orderBy: {
      fecha: 'asc',
    },
  });

  if (fichajesIncompletos.length > 0) {
    alertas.push({
      empleadoId,
      tipo: 'critico',
      categoria: 'fichajes',
      codigo: 'FICHAJE_INCOMPLETO',
      mensaje: `${fichajesIncompletos.length} fichaje(s) sin cerrar`,
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
        fechas: fichajesIncompletos.map((f) =>
          f.fecha.toISOString().split('T')[0]
        ),
      },
      accionUrl: `/hr/horario/fichajes?empleadoId=${empleadoId}&estado=pendiente`,
    });
  }

  return alertas;
}

/**
 * Detecta alertas de advertencia para un empleado
 * No bloquean exportación pero requieren revisión
 */
async function detectarAlertasAdvertencia(
  empleadoId: string,
  mes: number,
  anio: number,
  empresaId: string
): Promise<Alerta[]> {
  const alertas: Alerta[] = [];

  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    select: {
      nombre: true,
      apellidos: true,
      jornadaId: true,
    },
  });

  if (!empleado) {
    return alertas;
  }

  const fechaInicio = new Date(anio, mes - 1, 1);
  fechaInicio.setHours(0, 0, 0, 0);
  const fechaFin = new Date(anio, mes, 0);
  fechaFin.setHours(23, 59, 59, 999);

  // Complementos pendientes de validación
  const complementosPendientes = await prisma.empleadoComplemento.count({
    where: {
      empleadoId,
      activo: true,
      validado: false,
      rechazado: false,
    },
  });

  if (complementosPendientes > 0) {
    alertas.push({
      empleadoId,
      tipo: 'advertencia',
      categoria: 'datos_faltantes',
      codigo: 'COMPLEMENTOS_PENDIENTES',
      mensaje: `${complementosPendientes} complemento(s) pendientes de validar`,
      detalles: {
        complementosPendientes,
      },
      accionUrl: `/hr/organizacion/personas/${empleadoId}?tab=complementos`,
    });
  }

  // Ausencias pendientes de aprobación
  const ausenciasPendientes = await prisma.ausencia.count({
    where: {
      empleadoId,
      estado: EstadoAusencia.pendiente,
      OR: [
        {
          fechaInicio: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        {
          fechaFin: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
      ],
    },
  });

  if (ausenciasPendientes > 0) {
    alertas.push({
      empleadoId,
      tipo: 'advertencia',
      categoria: 'ausencias',
      codigo: 'AUSENCIAS_PENDIENTES',
      mensaje: `${ausenciasPendientes} ausencia(s) pendientes de aprobación`,
      detalles: {
        ausenciasPendientes,
      },
      accionUrl: `/hr/horario/ausencias?empleadoId=${empleadoId}&estado=pendiente`,
    });
  }

  // 1. HORAS_BAJAS / HORAS_ALTAS: Comparar horas trabajadas con esperadas
  const fichajes = await prisma.fichaje.findMany({
    where: {
      empleadoId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
      estado: 'finalizado',
    },
    select: {
      horasTrabajadas: true,
      fecha: true,
    },
  });

  const horasTotales = fichajes.reduce(
    (sum, f) => sum + Number(f.horasTrabajadas || 0),
    0
  );

  // Calcular horas esperadas (aproximadamente 8h x días laborables)
  let horasEsperadas = 0;
  if (empleado.jornadaId) {
    // Calcular sumando las horas esperadas de cada día
    for (const fichaje of fichajes) {
      const horasEsperadasDia = await obtenerHorasEsperadas(
        empleadoId,
        fichaje.fecha
      );
      horasEsperadas += horasEsperadasDia;
    }
  } else {
    // Fallback: 8 horas por día trabajado
    horasEsperadas = fichajes.length * 8;
  }

  if (horasTotales < horasEsperadas * 0.5) {
    alertas.push({
      empleadoId,
      tipo: 'advertencia',
      categoria: 'horas',
      codigo: 'HORAS_BAJAS',
      mensaje: `Solo ${Math.round(horasTotales)}h trabajadas (esperado: ${Math.round(horasEsperadas)}h)`,
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
        horasTrabajadas: Math.round(horasTotales * 100) / 100,
        horasEsperadas: Math.round(horasEsperadas * 100) / 100,
      },
      accionUrl: `/hr/horario/fichajes?empleadoId=${empleadoId}`,
    });
  }

  if (horasTotales > horasEsperadas * 1.5) {
    alertas.push({
      empleadoId,
      tipo: 'advertencia',
      categoria: 'horas',
      codigo: 'HORAS_ALTAS',
      mensaje: `${Math.round(horasTotales)}h trabajadas (esperado: ${Math.round(horasEsperadas)}h)`,
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
        horasTrabajadas: Math.round(horasTotales * 100) / 100,
        horasEsperadas: Math.round(horasEsperadas * 100) / 100,
        posibleError: 'Revisar fichajes',
      },
      accionUrl: `/hr/horario/fichajes?empleadoId=${empleadoId}`,
    });
  }

  // 2. IT_SIN_JUSTIFICANTE: Bajas médicas sin documento
  const bajasIT = await prisma.ausencia.findMany({
    where: {
      empleadoId,
      tipo: {
        in: ['enfermedad', 'maternidad_paternidad'],
      },
      OR: [
        {
          fechaInicio: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        {
          fechaFin: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
      ],
      justificanteUrl: null,
    },
  });

  if (bajasIT.length > 0) {
    alertas.push({
      empleadoId,
      tipo: 'advertencia',
      categoria: 'ausencias',
      codigo: 'IT_SIN_JUSTIFICANTE',
      mensaje: `${bajasIT.length} baja(s) médica(s) sin justificante`,
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
        ausencias: bajasIT.map((a) => ({
          tipo: a.tipo,
          fechaInicio: a.fechaInicio,
          fechaFin: a.fechaFin,
        })),
      },
      accionUrl: `/hr/horario/ausencias?empleadoId=${empleadoId}`,
    });
  }

  // 3. DIAS_SIN_REGISTRO: Días sin fichaje ni ausencia
  // Calcular días laborables del mes
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: { config: true },
  });

  const config = empresa?.config as any;
  const diasLaborables = config?.dias_laborables || {
    lunes: true,
    martes: true,
    miercoles: true,
    jueves: true,
    viernes: true,
    sabado: false,
    domingo: false,
  };

  // Obtener festivos del mes
  const festivos = await prisma.festivo.findMany({
    where: {
      empresaId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
      activo: true,
    },
    select: {
      fecha: true,
    },
  });

  const festivosSet = new Set(
    festivos.map((f) => f.fecha.toISOString().split('T')[0])
  );

  // Obtener ausencias del mes
  const ausencias = await prisma.ausencia.findMany({
    where: {
      empleadoId,
      estado: {
        in: [EstadoAusencia.completada, EstadoAusencia.confirmada],
      },
      OR: [
        {
          fechaInicio: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        {
          fechaFin: {
            gte: fechaInicio,
            lte: fechaFin,
          },
        },
        {
          AND: [
            { fechaInicio: { lte: fechaInicio } },
            { fechaFin: { gte: fechaFin } },
          ],
        },
      ],
    },
    select: {
      fechaInicio: true,
      fechaFin: true,
    },
  });

  // Crear set de fechas con ausencias
  const diasConAusencia = new Set<string>();
  for (const ausencia of ausencias) {
    const fecha = new Date(ausencia.fechaInicio);
    const fin = new Date(ausencia.fechaFin);
    while (fecha <= fin) {
      diasConAusencia.add(fecha.toISOString().split('T')[0]);
      fecha.setDate(fecha.getDate() + 1);
    }
  }

  // Crear set de fechas con fichajes
  const diasConFichaje = new Set(
    fichajes.map((f) => f.fecha.toISOString().split('T')[0])
  );

  // Contar días laborables sin registro
  let diasSinRegistro = 0;
  const fecha = new Date(fechaInicio);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const mapaDias: { [key: number]: keyof typeof diasLaborables } = {
    0: 'domingo',
    1: 'lunes',
    2: 'martes',
    3: 'miercoles',
    4: 'jueves',
    5: 'viernes',
    6: 'sabado',
  };

  while (fecha <= fechaFin && fecha < hoy) {
    const fechaStr = fecha.toISOString().split('T')[0];
    const diaSemana = fecha.getDay();
    const nombreDia = mapaDias[diaSemana];

    // Es día laborable?
    const esLaborable = diasLaborables[nombreDia];
    const esFestivo = festivosSet.has(fechaStr);
    const tieneFichaje = diasConFichaje.has(fechaStr);
    const tieneAusencia = diasConAusencia.has(fechaStr);

    if (esLaborable && !esFestivo && !tieneFichaje && !tieneAusencia) {
      diasSinRegistro++;
    }

    fecha.setDate(fecha.getDate() + 1);
  }

  if (diasSinRegistro > 0) {
    alertas.push({
      empleadoId,
      tipo: 'advertencia',
      categoria: 'fichajes',
      codigo: 'DIAS_SIN_REGISTRO',
      mensaje: `${diasSinRegistro} día(s) sin fichar ni ausencia`,
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
        diasSinRegistro,
      },
      accionUrl: `/hr/horario/fichajes?empleadoId=${empleadoId}`,
    });
  }

  return alertas;
}

/**
 * Detecta alertas informativas para un empleado
 * Información relevante pero no requiere acción
 */
async function detectarAlertasInformativas(
  empleadoId: string,
  mes: number,
  anio: number,
  empresaId: string
): Promise<Alerta[]> {
  const alertas: Alerta[] = [];

  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    select: {
      nombre: true,
      apellidos: true,
      fechaAlta: true,
    },
  });

  if (!empleado) {
    return alertas;
  }

  // 1. ANIVERSARIO: Aniversario laboral
  const fechaAlta = empleado.fechaAlta;
  const mesAlta = fechaAlta.getMonth() + 1;
  const anioAlta = fechaAlta.getFullYear();

  if (mesAlta === mes && anioAlta < anio) {
    const anosServicio = anio - anioAlta;
    alertas.push({
      empleadoId,
      tipo: 'info',
      categoria: 'cambios',
      codigo: 'ANIVERSARIO',
      mensaje: `Aniversario laboral: ${anosServicio} año(s)`,
      detalles: {
        empleado: `${empleado.nombre} ${empleado.apellidos}`,
        fechaAlta: fechaAlta,
        anosServicio,
      },
    });
  }

  // 2. Altas/Bajas de contrato dentro del mes
  const contratosMes = await prisma.contrato.findMany({
    where: {
      empleadoId,
      OR: [
        {
          fechaInicio: {
            gte: new Date(anio, mes - 1, 1),
            lte: new Date(anio, mes, 0, 23, 59, 59),
          },
        },
        {
          fechaFin: {
            gte: new Date(anio, mes - 1, 1),
            lte: new Date(anio, mes, 0, 23, 59, 59),
          },
        },
      ],
    },
    select: {
      fechaInicio: true,
      fechaFin: true,
      tipoContrato: true,
    },
  });

  contratosMes.forEach((contrato) => {
    if (
      contrato.fechaInicio &&
      contrato.fechaInicio.getMonth() + 1 === mes &&
      contrato.fechaInicio.getFullYear() === anio
    ) {
      alertas.push({
        empleadoId,
        tipo: 'info',
        categoria: 'cambios',
        codigo: 'ALTA_CONTRATO',
        mensaje: `Alta de contrato (${contrato.tipoContrato})`,
        detalles: {
          fechaInicio: contrato.fechaInicio,
          tipoContrato: contrato.tipoContrato,
        },
      });
    }

    if (
      contrato.fechaFin &&
      contrato.fechaFin.getMonth() + 1 === mes &&
      contrato.fechaFin.getFullYear() === anio
    ) {
      alertas.push({
        empleadoId,
        tipo: 'info',
        categoria: 'cambios',
        codigo: 'BAJA_CONTRATO',
        mensaje: `Baja de contrato (${contrato.tipoContrato})`,
        detalles: {
          fechaFin: contrato.fechaFin,
          tipoContrato: contrato.tipoContrato,
        },
      });
    }
  });

  return alertas;
}

/**
 * Detecta todas las alertas de un empleado para un mes
 */
export async function detectarAlertasEmpleado(
  empleadoId: string,
  mes: number,
  anio: number,
  empresaId: string
): Promise<Alerta[]> {
  const [criticas, advertencias, informativas] = await Promise.all([
    detectarAlertasCriticas(empleadoId, mes, anio, empresaId),
    detectarAlertasAdvertencia(empleadoId, mes, anio, empresaId),
    detectarAlertasInformativas(empleadoId, mes, anio, empresaId),
  ]);

  return [...criticas, ...advertencias, ...informativas];
}

/**
 * Detecta alertas para todos los empleados activos de una empresa
 * Guarda las alertas en la base de datos
 */
export async function detectarAlertas(
  empresaId: string,
  mes: number,
  anio: number
): Promise<{
  total: number;
  criticas: number;
  advertencias: number;
  informativas: number;
  alertas: Alerta[];
}> {
  console.log(`[detectarAlertas] Detectando alertas para ${mes}/${anio}`);

  // Obtener todos los empleados activos
  const empleados = await prisma.empleado.findMany({
    where: {
      empresaId,
      activo: true,
    },
    select: {
      id: true,
    },
  });

  console.log(`[detectarAlertas] ${empleados.length} empleados activos`);

  // Limpiar alertas antiguas del mismo mes/año
  await prisma.alertaNomina.deleteMany({
    where: {
      empresaId,
      createdAt: {
        gte: new Date(anio, mes - 1, 1),
        lte: new Date(anio, mes, 0, 23, 59, 59),
      },
      resuelta: false,
    },
  });

  // Detectar alertas para cada empleado
  const todasLasAlertas: Alerta[] = [];

  for (const empleado of empleados) {
    const alertas = await detectarAlertasEmpleado(
      empleado.id,
      mes,
      anio,
      empresaId
    );
    todasLasAlertas.push(...alertas);
  }

  // Guardar alertas en la base de datos
  for (const alerta of todasLasAlertas) {
    await prisma.alertaNomina.create({
      data: {
        empresaId,
        empleadoId: alerta.empleadoId,
        tipo: alerta.tipo,
        categoria: alerta.categoria,
        codigo: alerta.codigo,
        mensaje: alerta.mensaje,
        detalles: alerta.detalles || {},
        accionUrl: alerta.accionUrl,
        resuelta: false,
      },
    });
  }

  // Contar por tipo
  const criticas = todasLasAlertas.filter((a) => a.tipo === 'critico').length;
  const advertencias = todasLasAlertas.filter(
    (a) => a.tipo === 'advertencia'
  ).length;
  const informativas = todasLasAlertas.filter((a) => a.tipo === 'info').length;

  console.log(
    `[detectarAlertas] Total: ${todasLasAlertas.length} (${criticas} críticas, ${advertencias} advertencias, ${informativas} info)`
  );

  return {
    total: todasLasAlertas.length,
    criticas,
    advertencias,
    informativas,
    alertas: todasLasAlertas,
  };
}

/**
 * Obtiene las alertas de un mes (desde la base de datos)
 */
export async function obtenerAlertas(
  empresaId: string,
  mes: number,
  anio: number,
  tipo?: TipoAlerta
): Promise<any[]> {
  const where: any = {
    empresaId,
    createdAt: {
      gte: new Date(anio, mes - 1, 1),
      lte: new Date(anio, mes, 0, 23, 59, 59),
    },
  };

  if (tipo) {
    where.tipo = tipo;
  }

  return prisma.alertaNomina.findMany({
    where,
    include: {
      empleado: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
        },
      },
    },
    orderBy: [
      { tipo: 'asc' }, // crítico primero
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Marca una alerta como resuelta
 */
export async function resolverAlerta(alertaId: string): Promise<void> {
  await prisma.alertaNomina.update({
    where: { id: alertaId },
    data: {
      resuelta: true,
      fechaResolucion: new Date(),
    },
  });
}

/**
 * Verifica si hay alertas críticas sin resolver
 */
export async function tieneAlertasCriticas(
  empresaId: string,
  mes: number,
  anio: number
): Promise<boolean> {
  const count = await prisma.alertaNomina.count({
    where: {
      empresaId,
      tipo: 'critico',
      resuelta: false,
      createdAt: {
        gte: new Date(anio, mes - 1, 1),
        lte: new Date(anio, mes, 0, 23, 59, 59),
      },
    },
  });

  return count > 0;
}




