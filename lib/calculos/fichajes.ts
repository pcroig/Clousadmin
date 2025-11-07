// ========================================
// Cálculos y validaciones de Fichajes
// ========================================
// NUEVO MODELO: Fichaje = día completo, FichajeEvento = eventos individuales

import { prisma } from '@/lib/prisma';
import { Fichaje, FichajeEvento, Empleado, Ausencia } from '@prisma/client';
import type { JornadaConfig, DiaConfig } from './fichajes-helpers';

/**
 * Estados posibles del fichaje (del día completo)
 */
export type EstadoFichaje = 'sin_fichar' | 'trabajando' | 'en_pausa' | 'finalizado';

/**
 * Tipo de fichaje con sus eventos incluidos
 */
export type FichajeConEventos = Fichaje & {
  eventos: FichajeEvento[];
};

/**
 * Obtiene el estado actual de fichaje de un empleado
 * Estado derivado de los eventos del fichaje del día
 */
export async function obtenerEstadoFichaje(empleadoId: string): Promise<EstadoFichaje> {
  const hoy = new Date();
  const fechaHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  // Buscar el fichaje del día (único por empleado + fecha)
  const fichajeHoy = await prisma.fichaje.findUnique({
    where: {
      empleadoId_fecha: {
        empleadoId,
        fecha: fechaHoy,
      },
    },
    include: {
      eventos: {
        orderBy: {
          hora: 'asc',
        },
      },
    },
  });

  if (!fichajeHoy || fichajeHoy.eventos.length === 0) {
    return 'sin_fichar';
  }

  // Estado del fichaje completo
  if (fichajeHoy.estado === 'finalizado' || fichajeHoy.estado === 'aprobado') {
    return 'finalizado';
  }

  // Si está en curso, determinar estado actual según último evento
  const ultimoEvento = fichajeHoy.eventos[fichajeHoy.eventos.length - 1];

  switch (ultimoEvento.tipo) {
    case 'entrada':
      return 'trabajando';
    case 'pausa_inicio':
      return 'en_pausa';
    case 'pausa_fin':
      return 'trabajando';
    case 'salida':
      return 'finalizado';
    default:
      return 'sin_fichar';
  }
}

/**
 * Calcula las horas trabajadas a partir de los eventos de un fichaje
 */
export function calcularHorasTrabajadas(eventos: FichajeEvento[]): number {
  if (eventos.length === 0) return 0;

  // Ordenar por hora
  const ordenados = [...eventos].sort((a, b) => 
    new Date(a.hora).getTime() - new Date(b.hora).getTime()
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
          const tiempoTrabajado = (hora.getTime() - inicioTrabajo.getTime()) / (1000 * 60 * 60);
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
          const tiempoTrabajado = (hora.getTime() - inicioTrabajo.getTime()) / (1000 * 60 * 60);
          horasTotales += tiempoTrabajado;
          inicioTrabajo = null;
        }
        break;
    }
  }

  // Si sigue trabajando (sin salida), calcular hasta ahora
  if (inicioTrabajo) {
    const ahora = new Date();
    const tiempoTrabajado = (ahora.getTime() - inicioTrabajo.getTime()) / (1000 * 60 * 60);
    horasTotales += tiempoTrabajado;
  }

  return Math.round(horasTotales * 100) / 100; // Redondear a 2 decimales
}

/**
 * Calcula el tiempo en pausa de un array de eventos
 */
export function calcularTiempoEnPausa(eventos: FichajeEvento[]): number {
  if (eventos.length === 0) return 0;

  const ordenados = [...eventos].sort((a, b) => 
    new Date(a.hora).getTime() - new Date(b.hora).getTime()
  );

  let tiempoPausaTotal = 0;
  let inicioPausa: Date | null = null;

  for (const evento of ordenados) {
    const hora = new Date(evento.hora);

    if (evento.tipo === 'pausa_inicio') {
      inicioPausa = hora;
    } else if (evento.tipo === 'pausa_fin' && inicioPausa) {
      const tiempoPausa = (hora.getTime() - inicioPausa.getTime()) / (1000 * 60 * 60);
      tiempoPausaTotal += tiempoPausa;
      inicioPausa = null;
    }
  }

  // Si sigue en pausa (sin fin de pausa), calcular hasta ahora
  if (inicioPausa) {
    const ahora = new Date();
    const tiempoPausa = (ahora.getTime() - inicioPausa.getTime()) / (1000 * 60 * 60);
    tiempoPausaTotal += tiempoPausa;
  }

  return Math.round(tiempoPausaTotal * 100) / 100;
}

/**
 * Valida si un empleado puede agregar un evento al fichaje según su estado actual
 */
export async function validarEvento(
  tipoEvento: string,
  empleadoId: string
): Promise<{ valido: boolean; error?: string }> {
  const estadoActual = await obtenerEstadoFichaje(empleadoId);

  switch (tipoEvento) {
    case 'entrada':
      if (estadoActual !== 'sin_fichar' && estadoActual !== 'finalizado') {
        return { valido: false, error: 'Ya tienes una jornada iniciada' };
      }
      
      // Si ya finalizó la jornada hoy, no puede iniciar otra hasta mañana
      if (estadoActual === 'finalizado') {
        return { 
          valido: false, 
          error: 'Ya has finalizado la jornada de hoy. Podrás iniciar una nueva jornada mañana.' 
        };
      }
      break;

    case 'pausa_inicio':
      if (estadoActual !== 'trabajando') {
        return { valido: false, error: 'Debes estar trabajando para pausar' };
      }
      break;

    case 'pausa_fin':
      if (estadoActual !== 'en_pausa') {
        return { valido: false, error: 'No estás en pausa' };
      }
      break;

    case 'salida':
      if (estadoActual === 'sin_fichar' || estadoActual === 'finalizado') {
        return { valido: false, error: 'No tienes una jornada iniciada' };
      }
      // Permitir finalizar desde pausa - el cálculo de horas no sumará el tiempo en pausa
      break;

    default:
      return { valido: false, error: 'Tipo de evento inválido' };
  }

  return { valido: true };
}

/**
 * Valida si el evento está dentro de los límites de la jornada
 */
export async function validarLimitesJornada(
  empleadoId: string,
  hora: Date
): Promise<{ valido: boolean; error?: string }> {
  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    include: {
      jornada: true,
    },
  });

  if (!empleado || !empleado.jornada) {
    return { valido: true }; // Si no tiene jornada, no validar límites
  }

  const config = empleado.jornada.config as JornadaConfig;
  const limiteInferior = typeof config.limiteInferior === 'string' ? config.limiteInferior : undefined;
  const limiteSuperior = typeof config.limiteSuperior === 'string' ? config.limiteSuperior : undefined;

  if (limiteInferior || limiteSuperior) {
    const horaFichaje = `${hora.getHours().toString().padStart(2, '0')}:${hora.getMinutes().toString().padStart(2, '0')}`;

    if (limiteInferior && horaFichaje < limiteInferior) {
      return {
        valido: false,
        error: `No puedes fichar antes de ${limiteInferior}`,
      };
    }

    if (limiteSuperior && horaFichaje > limiteSuperior) {
      return {
        valido: false,
        error: `No puedes fichar después de ${limiteSuperior}`,
      };
    }
  }

  return { valido: true };
}

/**
 * Obtiene el fichaje de un empleado en una fecha específica
 */
export async function obtenerFichaje(
  empleadoId: string,
  fecha: Date
): Promise<FichajeConEventos | null> {
  const fechaSinHora = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  
  return prisma.fichaje.findUnique({
    where: {
      empleadoId_fecha: {
        empleadoId,
        fecha: fechaSinHora,
      },
    },
    include: {
      eventos: {
        orderBy: {
          hora: 'asc',
        },
      },
    },
  });
}

/**
 * Obtiene los fichajes de un empleado en un rango de fechas
 */
export async function obtenerFichajes(
  empleadoId: string,
  fechaInicio: Date,
  fechaFin: Date
): Promise<FichajeConEventos[]> {
  return prisma.fichaje.findMany({
    where: {
      empleadoId,
      fecha: {
        gte: fechaInicio,
        lte: fechaFin,
      },
    },
    include: {
      eventos: {
        orderBy: {
          hora: 'asc',
        },
      },
    },
    orderBy: [
      { fecha: 'desc' },
    ],
  });
}

/**
 * Agrupa fichajes por día (ya no es necesario, pero mantenemos por compatibilidad)
 */
export function agruparFichajesPorDia(
  fichajes: FichajeConEventos[]
): Record<string, FichajeConEventos> {
  return fichajes.reduce((acc, fichaje) => {
    const fechaKey = fichaje.fecha.toISOString().split('T')[0];
    acc[fechaKey] = fichaje;
    return acc;
  }, {} as Record<string, FichajeConEventos>);
}

/**
 * Calcula las horas esperadas de un empleado para una fecha
 */
export async function obtenerHorasEsperadas(
  empleadoId: string,
  fecha: Date
): Promise<number> {
  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    include: {
      jornada: true,
    },
  });

  if (!empleado || !empleado.jornada) {
    return 0; // Si no tiene jornada, 0 horas esperadas
  }

  const jornada = empleado.jornada;
  const config = jornada.config as JornadaConfig;

  // Obtener día de la semana (0 = domingo, 1 = lunes, ...)
  const diaSemana = fecha.getDay();
  const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const nombreDia = nombresDias[diaSemana];
  const diaConfig = config[nombreDia] as DiaConfig | undefined;

  if (diaConfig?.activo) {
    // Si tiene configuración específica para el día
    const entrada = diaConfig.entrada; // e.g., "09:00"
    const salida = diaConfig.salida; // e.g., "18:00"
    const pausaInicio = diaConfig.pausa_inicio; // e.g., "14:00"
    const pausaFin = diaConfig.pausa_fin; // e.g., "15:00"

    if (entrada && salida) {
      const [horaE, minE] = entrada.split(':').map(Number);
      const [horaS, minS] = salida.split(':').map(Number);

      const minutosEntrada = horaE * 60 + minE;
      const minutosSalida = horaS * 60 + minS;

      const minutosTrabajoTotal = minutosSalida - minutosEntrada;
      
      // Calcular pausa si está configurada
      let minutosPausa = 0;
      if (pausaInicio && pausaFin) {
        const [horaPI, minPI] = pausaInicio.split(':').map(Number);
        const [horaPF, minPF] = pausaFin.split(':').map(Number);
        const minutosPausaInicio = horaPI * 60 + minPI;
        const minutosPausaFin = horaPF * 60 + minPF;
        minutosPausa = minutosPausaFin - minutosPausaInicio;
      }
      
      const minutosTrabajoNeto = minutosTrabajoTotal - minutosPausa;

      return minutosTrabajoNeto / 60; // Convertir a horas
    }
  }

  // Jornada flexible: dividir horas semanales entre días activos
  const diasActivos = Object.entries(config).reduce((count, [clave, valor]) => {
    if (['tipo', 'descansoMinimo', 'limiteInferior', 'limiteSuperior'].includes(clave)) {
      return count;
    }

    if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
      const configDia = valor as DiaConfig;
      if (configDia.activo) {
        return count + 1;
      }
    }

    return count;
  }, 0);

  if (diasActivos > 0) {
    return Number(jornada.horasSemanales) / diasActivos;
  }

  return 0;
}

/**
 * Actualiza los cálculos agregados del fichaje (horas trabajadas y en pausa)
 * Se llama después de crear/editar un evento
 */
export async function actualizarCalculosFichaje(fichajeId: string): Promise<void> {
  const fichaje = await prisma.fichaje.findUnique({
    where: { id: fichajeId },
    include: {
      eventos: {
        orderBy: {
          hora: 'asc',
        },
      },
    },
  });

  if (!fichaje) {
    throw new Error(`Fichaje ${fichajeId} no encontrado`);
  }

  const horasTrabajadas = calcularHorasTrabajadas(fichaje.eventos);
  const horasEnPausa = calcularTiempoEnPausa(fichaje.eventos);

  await prisma.fichaje.update({
    where: { id: fichajeId },
    data: {
      horasTrabajadas,
      horasEnPausa,
    },
  });
}

/**
 * Verifica si una fecha es día laboral para un empleado
 * Considera:
 * - Calendario laboral de la empresa (diasLaborables config)
 * - Festivos activos de la empresa
 * - Jornada del empleado (días activos)
 * - Ausencias de día completo del empleado
 */
export async function esDiaLaboral(empleadoId: string, fecha: Date): Promise<boolean> {
  // Normalizar fecha (sin hora)
  const fechaSinHora = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  
  // 1. Obtener empleado con jornada
  const empleado = await prisma.empleado.findUnique({
    where: { id: empleadoId },
    include: {
      jornada: true,
    },
  });

  if (!empleado) {
    return false;
  }

  // 2. Verificar si tiene jornada asignada
  if (!empleado.jornada) {
    return false;
  }

  // 3. Verificar jornada activa
  if (!empleado.jornada.activa) {
    return false;
  }

  // 4. Verificar calendario laboral de la EMPRESA (días laborables + festivos)
  const { esDiaLaborable } = await import('@/lib/calculos/dias-laborables');
  const esLaborableEmpresa = await esDiaLaborable(fechaSinHora, empleado.empresaId);
  
  if (!esLaborableEmpresa) {
    // El día no es laborable para la empresa (fin de semana según config o festivo)
    return false;
  }

  // 5. Verificar configuración de JORNADA del empleado para ese día específico
  // (El empleado puede tener días específicos no activos aunque la empresa trabaje)
  const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const nombreDia = diasSemana[fechaSinHora.getDay()];
  const config = empleado.jornada.config as JornadaConfig;
  const diaConfig = config[nombreDia] as DiaConfig | undefined;

  if (diaConfig && diaConfig.activo === false) {
    return false;
  }

  // 6. Verificar ausencias (aprobadas o pendientes)
  // IMPORTANTE: Solo excluir ausencias de día completo (no medio día)
  // Si tiene ausencia de medio día, aún puede trabajar y debe fichar
  const ausencia = await prisma.ausencia.findFirst({
    where: {
      empleadoId,
      medioDia: false, // Solo ausencias de día completo
      estado: {
        in: ['aprobada', 'en_curso', 'auto_aprobada'],
      },
      fechaInicio: {
        lte: fechaSinHora,
      },
      fechaFin: {
        gte: fechaSinHora,
      },
    },
  });

  if (ausencia) {
    return false;
  }

  return true;
}

/**
 * Obtiene los empleados que deberían tener fichaje en una fecha
 * (empleados activos sin ausencia que tienen día laboral)
 */
export async function obtenerEmpleadosDisponibles(
  empresaId: string,
  fecha: Date
): Promise<Empleado[]> {
  const fechaSinHora = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

  // Obtener todos los empleados activos de la empresa
  const empleados = await prisma.empleado.findMany({
    where: {
      empresaId,
      activo: true,
    },
    include: {
      jornada: true,
    },
  });

  // Filtrar empleados que tienen día laboral
  const empleadosDisponibles: Empleado[] = [];

  for (const empleado of empleados) {
    const esLaboral = await esDiaLaboral(empleado.id, fechaSinHora);
    if (esLaboral) {
      empleadosDisponibles.push(empleado);
    }
  }

  return empleadosDisponibles;
}

/**
 * Crea fichajes automáticos para empleados disponibles que no tienen fichaje
 * Se ejecuta al inicio de cada día o cuando se consultan fichajes
 */
export async function crearFichajesAutomaticos(
  empresaId: string,
  fecha: Date
): Promise<{ creados: number; errores: string[] }> {
  const fechaSinHora = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const errores: string[] = [];
  let creados = 0;

  // Obtener empleados disponibles
  const empleadosDisponibles = await obtenerEmpleadosDisponibles(empresaId, fechaSinHora);

  // Para cada empleado, verificar si ya tiene fichaje
  for (const empleado of empleadosDisponibles) {
    try {
      const fichajeExistente = await prisma.fichaje.findUnique({
        where: {
          empleadoId_fecha: {
            empleadoId: empleado.id,
            fecha: fechaSinHora,
          },
        },
      });

      if (!fichajeExistente) {
        // Crear fichaje vacío en estado "en_curso"
        await prisma.fichaje.create({
          data: {
            empresaId,
            empleadoId: empleado.id,
            fecha: fechaSinHora,
            estado: 'en_curso',
          },
        });

        creados++;
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      errores.push(`${empleado.nombre} ${empleado.apellidos}: ${mensaje}`);
      console.error('[crearFichajesAutomaticos] Error creando fichaje:', {
        empleadoId: empleado.id,
        nombre: `${empleado.nombre} ${empleado.apellidos}`,
        error,
      });
    }
  }

  return { creados, errores };
}

/**
 * Información sobre ausencia de medio día
 */
export interface AusenciaMedioDia {
  tieneAusencia: boolean;
  medioDia: 'mañana' | 'tarde' | null;
  ausencia: Ausencia | null;
}

/**
 * Obtiene información sobre ausencia de medio día para un empleado en una fecha
 */
export async function obtenerAusenciaMedioDia(
  empleadoId: string,
  fecha: Date
): Promise<AusenciaMedioDia> {
  const fechaSinHora = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  
  const ausencia = await prisma.ausencia.findFirst({
    where: {
      empleadoId,
      medioDia: true,
      estado: {
        in: ['aprobada', 'en_curso', 'auto_aprobada'],
      },
      fechaInicio: {
        lte: fechaSinHora,
      },
      fechaFin: {
        gte: fechaSinHora,
      },
    },
  });

  if (!ausencia) {
    return {
      tieneAusencia: false,
      medioDia: null,
      ausencia: null,
    };
  }

  return {
    tieneAusencia: true,
    medioDia: 'mañana', // Por defecto mañana, TODO: Añadir campo 'turno' a Ausencia
    ausencia,
  };
}

/**
 * Resultado de validación de fichaje completo
 */
export interface ValidacionFichajeCompleto {
  completo: boolean;
  eventosRequeridos: string[];
  eventosFaltantes: string[];
  razon?: string;
}

/**
 * Valida si un fichaje está completo según la jornada del empleado
 * Tiene en cuenta:
 * - Jornada fija: entrada + salida + pausa (si configurada)
 * - Jornada flexible: entrada + salida + pausa (si descansoMinimo > 0)
 * - Ausencias de medio día: reduce eventos requeridos proporcionalmente
 */
export async function validarFichajeCompleto(
  fichajeId: string
): Promise<ValidacionFichajeCompleto> {
  const fichaje = await prisma.fichaje.findUnique({
    where: { id: fichajeId },
    include: {
      empleado: {
        include: {
          jornada: true,
        },
      },
      eventos: {
        orderBy: {
          hora: 'asc',
        },
      },
    },
  });

  if (!fichaje) {
    throw new Error(`Fichaje ${fichajeId} no encontrado`);
  }

  if (!fichaje.empleado.jornada) {
    return {
      completo: false,
      eventosRequeridos: [],
      eventosFaltantes: [],
      razon: 'Empleado sin jornada asignada',
    };
  }

  const jornada = fichaje.empleado.jornada;
  const config = jornada.config as JornadaConfig;
  const fechaFichaje = fichaje.fecha;
  
  const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const nombreDia = diasSemana[fechaFichaje.getDay()];
  const configDia = config[nombreDia] as DiaConfig | undefined;

  // Obtener información de ausencia de medio día
  const ausenciaMedioDia = await obtenerAusenciaMedioDia(fichaje.empleadoId, fichaje.fecha);

  let eventosRequeridos: string[] = [];

  // JORNADA FIJA
  // Detectar jornada fija: tiene tipo 'fija' O tiene configDia con entrada/salida
  if (config.tipo === 'fija' || (configDia && configDia.entrada && configDia.salida)) {
    // Si el día no está activo o no está configurado, el fichaje está completo (día no laborable)
    if (!configDia || configDia.activo === false) {
      return {
        completo: true,
        eventosRequeridos: [],
        eventosFaltantes: [],
        razon: 'Día no laborable según jornada',
      };
    }

    // Eventos básicos requeridos
    if (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'tarde') {
      eventosRequeridos.push('entrada');
    }
    
    if (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'mañana') {
      eventosRequeridos.push('salida');
    }

    // Pausa es opcional según configuración
    if (configDia.pausa_inicio && configDia.pausa_fin && !ausenciaMedioDia.tieneAusencia) {
      eventosRequeridos.push('pausa_inicio');
      eventosRequeridos.push('pausa_fin');
    }
  }
  // JORNADA FLEXIBLE
  else if (config.tipo === 'flexible') {
    // Verificar si el día está activo
    if (!configDia || configDia.activo === false) {
      return {
        completo: true,
        eventosRequeridos: [],
        eventosFaltantes: [],
        razon: 'Día no laborable según jornada flexible',
      };
    }

    // Siempre entrada y salida
    if (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'tarde') {
      eventosRequeridos.push('entrada');
    }
    
    if (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'mañana') {
      eventosRequeridos.push('salida');
    }

    // Pausa obligatoria solo si hay descansoMinimo configurado
    if (config.descansoMinimo && !ausenciaMedioDia.tieneAusencia) {
      eventosRequeridos.push('pausa_inicio');
      eventosRequeridos.push('pausa_fin');
    }
  }
  // Fallback: jornada sin tipo o config incompleto
  else {
    eventosRequeridos = ['entrada', 'salida'];
  }

  // Calcular eventos faltantes
  const tiposEventosExistentes = fichaje.eventos.map((e) => e.tipo);
  const eventosFaltantes = eventosRequeridos.filter(
    (requerido) => !tiposEventosExistentes.includes(requerido)
  );

  // Validar coherencia de pausas: si tiene pausa_inicio, debe tener pausa_fin
  const tienePausaInicio = tiposEventosExistentes.includes('pausa_inicio');
  const tienePausaFin = tiposEventosExistentes.includes('pausa_fin');
  
  if (tienePausaInicio && !tienePausaFin) {
    eventosFaltantes.push('pausa_fin');
  } else if (!tienePausaInicio && tienePausaFin) {
    eventosFaltantes.push('pausa_inicio');
  }

  const completo = eventosFaltantes.length === 0;

  return {
    completo,
    eventosRequeridos,
    eventosFaltantes,
    razon: completo ? undefined : `Faltan eventos: ${eventosFaltantes.join(', ')}`,
  };
}
