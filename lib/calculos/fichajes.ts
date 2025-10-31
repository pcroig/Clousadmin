// ========================================
// Cálculos y validaciones de Fichajes
// ========================================
// NUEVO MODELO: Fichaje = día completo, FichajeEvento = eventos individuales

import { prisma } from '@/lib/prisma';
import { Fichaje, FichajeEvento, Empleado } from '@prisma/client';

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
  
  console.log('[obtenerEstadoFichaje]', {
    empleadoId,
    fechaHoy: fechaHoy.toISOString(),
  });

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
  console.log('[obtenerEstadoFichaje] Último evento:', { tipo: ultimoEvento.tipo, hora: ultimoEvento.hora });

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

  const config = empleado.jornada.config as any;

  if (config.limiteInferior || config.limiteSuperior) {
    const horaFichaje = `${hora.getHours().toString().padStart(2, '0')}:${hora.getMinutes().toString().padStart(2, '0')}`;

    if (config.limiteInferior && horaFichaje < config.limiteInferior) {
      return {
        valido: false,
        error: `No puedes fichar antes de ${config.limiteInferior}`,
      };
    }

    if (config.limiteSuperior && horaFichaje > config.limiteSuperior) {
      return {
        valido: false,
        error: `No puedes fichar después de ${config.limiteSuperior}`,
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
  const config = jornada.config as any;

  // Obtener día de la semana (0 = domingo, 1 = lunes, ...)
  const diaSemana = fecha.getDay();
  const nombresDias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const nombreDia = nombresDias[diaSemana];

  if (config[nombreDia] && config[nombreDia].activo) {
    // Si tiene configuración específica para el día
    const entrada = config[nombreDia].entrada; // e.g., "09:00"
    const salida = config[nombreDia].salida; // e.g., "18:00"
    const pausa = config[nombreDia].pausa || 0; // e.g., 1 hora

    if (entrada && salida) {
      const [horaE, minE] = entrada.split(':').map(Number);
      const [horaS, minS] = salida.split(':').map(Number);

      const minutosEntrada = horaE * 60 + minE;
      const minutosSalida = horaS * 60 + minS;

      const minutosTrabajoTotal = minutosSalida - minutosEntrada;
      const minutosTrabajoNeto = minutosTrabajoTotal - (pausa * 60);

      return minutosTrabajoNeto / 60; // Convertir a horas
    }
  }

  // Jornada flexible: dividir horas semanales entre días activos
  const diasActivos = Object.keys(config).filter(dia => config[dia]?.activo).length;
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
 * Considera: jornada, festivos, ausencias, fines de semana
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

  // 4. Verificar si es fin de semana
  const { esFinDeSemana } = await import('@/lib/calculos/ausencias');
  if (esFinDeSemana(fechaSinHora)) {
    return false;
  }

  // 5. Verificar configuración de jornada para ese día
  const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const nombreDia = diasSemana[fechaSinHora.getDay()];
  const config = empleado.jornada.config as any;

  if (config[nombreDia] && config[nombreDia].activo === false) {
    return false;
  }

  // 6. Verificar festivos
  const { esFestivo } = await import('@/lib/calculos/ausencias');
  const esFestivoHoy = await esFestivo(fechaSinHora, empleado.empresaId);
  if (esFestivoHoy) {
    return false;
  }

  // 7. Verificar ausencias (aprobadas o pendientes)
  const ausencia = await prisma.ausencia.findFirst({
    where: {
      empleadoId,
      estado: {
        in: ['aprobada', 'pendiente', 'auto_aprobada'],
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

  console.log('[crearFichajesAutomaticos] Empresa:', empresaId, 'Fecha:', fechaSinHora.toISOString().split('T')[0]);

  // Obtener empleados disponibles
  const empleadosDisponibles = await obtenerEmpleadosDisponibles(empresaId, fechaSinHora);

  console.log('[crearFichajesAutomaticos] Empleados disponibles:', empleadosDisponibles.length);

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
        console.log('[crearFichajesAutomaticos] Fichaje creado para:', empleado.nombre, empleado.apellidos);
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : 'Error desconocido';
      errores.push(`${empleado.nombre} ${empleado.apellidos}: ${mensaje}`);
      console.error('[crearFichajesAutomaticos] Error creando fichaje:', error);
    }
  }

  console.log('[crearFichajesAutomaticos] Resultado:', { creados, errores: errores.length });

  return { creados, errores };
}
