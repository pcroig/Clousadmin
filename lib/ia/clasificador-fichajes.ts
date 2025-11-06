// ========================================
// Clasificador de Fichajes Incompletos
// ========================================
// Lógica determinística para identificar y completar fichajes incompletos
// Sin IA: usa reglas basadas en horarios de jornada y patrones
// NUEVO MODELO: Fichaje tiene eventos dentro

import { prisma } from '@/lib/prisma';
import { Fichaje, FichajeEvento, Empleado, Jornada } from '@prisma/client';
import {
  crearNotificacionFichajeAutocompletado,
  crearNotificacionFichajeRequiereRevision,
} from '@/lib/notificaciones';

/**
 * Resultado de clasificación de un fichaje incompleto
 */
export interface FichajeClasificado {
  empleadoId: string;
  empleadoNombre: string;
  fecha: Date;
  fichaje: Fichaje & { eventos: FichajeEvento[] };
  accion: 'auto_completar' | 'revision_manual';
  razon: string;
  confianza: number; // 0-100
  salidaSugerida?: Date;
  metadatos: {
    horasTranscurridas?: number;
    horarioJornada?: string;
    patronIrregular?: boolean;
  };
}

/**
 * Clasificar fichajes incompletos de una empresa para una fecha
 */
export async function clasificarFichajesIncompletos(
  empresaId: string,
  fecha: Date
): Promise<{
  autoCompletar: FichajeClasificado[];
  revisionManual: FichajeClasificado[];
}> {
  console.log('[Clasificador] Procesando empresa:', empresaId, 'fecha:', fecha.toISOString().split('T')[0]);

  const fechaSinHora = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

  // NOTA: NO creamos fichajes automáticos aquí. Los fichajes se crean:
  // 1. Automáticamente en el CRON nocturno (antes de ejecutar clasificador)
  // 2. Cuando el empleado ficha por primera vez en el día
  // El clasificador solo analiza fichajes existentes

  console.log('[Clasificador] Analizando fichajes existentes para fecha:', fechaSinHora.toISOString().split('T')[0]);

  // 1. Obtener todos los fichajes del día con sus eventos
  const fichajes = await prisma.fichaje.findMany({
    where: {
      empresaId,
      fecha: fechaSinHora,
    },
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
    orderBy: {
      fecha: 'asc',
    },
  });

  const autoCompletar: FichajeClasificado[] = [];
  const revisionManual: FichajeClasificado[] = [];

  // 2. Analizar cada fichaje (ya están agrupados por empleado + fecha)
  for (const fichaje of fichajes) {
    const clasificacion = await clasificarJornada(
      fichaje.empleadoId,
      fichaje,
      fichaje.empleado,
      fecha
    );

    if (clasificacion) {
      if (clasificacion.accion === 'auto_completar') {
        autoCompletar.push(clasificacion);
      } else {
        revisionManual.push(clasificacion);
      }
    }
  }

  return { autoCompletar, revisionManual };
}

/**
 * Clasificar la jornada de un empleado
 * NUEVO MODELO: Recibe un fichaje con sus eventos
 */
async function clasificarJornada(
  empleadoId: string,
  fichaje: Fichaje & { eventos: FichajeEvento[]; empleado: Empleado & { jornada: Jornada | null } },
  empleado: Empleado & { jornada: Jornada | null },
  fecha: Date
): Promise<FichajeClasificado | null> {
  const eventos = fichaje.eventos;
  const empleadoNombre = `${empleado.nombre} ${empleado.apellidos}`;
  
  // CASO 0: Sin eventos (fichaje creado automáticamente) → Revisión manual
  if (eventos.length === 0) {
    return {
      empleadoId,
      empleadoNombre,
      fecha,
      fichaje,
      accion: 'revision_manual',
      razon: 'Sin fichajes registrados en día laboral',
      confianza: 100,
      metadatos: {
        patronIrregular: true,
      },
    };
  }
  
  // Análisis de la jornada usando eventos
  const tieneEntrada = eventos.some(e => e.tipo === 'entrada');
  const tieneSalida = eventos.some(e => e.tipo === 'salida');
  const pausaSinCerrar = eventos.some(e => e.tipo === 'pausa_inicio') &&
                        !eventos.some(e => e.tipo === 'pausa_fin');

  // Si la jornada está completa, no clasificar
  if (tieneEntrada && tieneSalida && !pausaSinCerrar) {
    return null;
  }

  // CASO 1: Pausa sin cerrar → Revisión manual
  if (pausaSinCerrar) {
    return {
      empleadoId,
      empleadoNombre,
      fecha,
      fichaje,
      accion: 'revision_manual',
      razon: 'Pausa iniciada sin finalizar',
      confianza: 100,
      metadatos: {
        patronIrregular: true,
      },
    };
  }

  // CASO 2: Sin entrada → Revisión manual
  if (!tieneEntrada) {
    return {
      empleadoId,
      empleadoNombre,
      fecha,
      fichaje,
      accion: 'revision_manual',
      razon: 'No hay fichaje de entrada registrado',
      confianza: 100,
      metadatos: {
        patronIrregular: true,
      },
    };
  }

  // CASO 3: Tiene entrada pero no salida
  if (tieneEntrada && !tieneSalida) {
    const eventosEntrada = eventos.filter(e => e.tipo === 'entrada' || e.tipo === 'pausa_fin');
    if (eventosEntrada.length === 0) {
      return {
        empleadoId,
        empleadoNombre,
        fecha,
        fichaje,
        accion: 'revision_manual',
        razon: 'Patrón de fichajes irregular',
        confianza: 100,
        metadatos: {
          patronIrregular: true,
        },
      };
    }

    // Obtener la última entrada o reanudación
    const ultimaEntrada = eventosEntrada.sort((a, b) => 
      new Date(b.hora).getTime() - new Date(a.hora).getTime()
    )[0];

    const ahora = new Date();
    const horasTranscurridas = (ahora.getTime() - new Date(ultimaEntrada.hora).getTime()) / (1000 * 60 * 60);

    // Si han pasado más de 8 horas desde la última entrada/reanudación → Auto-completar
    if (horasTranscurridas >= 8) {
      const salidaSugerida = calcularSalidaSugerida(empleado, new Date(ultimaEntrada.hora));

      return {
        empleadoId,
        empleadoNombre,
        fecha,
        fichaje,
        accion: 'auto_completar',
        razon: `Jornada iniciada hace ${Math.round(horasTranscurridas)}h sin fichaje de salida`,
        confianza: 85,
        salidaSugerida,
        metadatos: {
          horasTranscurridas: Math.round(horasTranscurridas * 10) / 10,
          horarioJornada: empleado.jornada ? getDescripcionHorario(empleado.jornada) : 'No definido',
        },
      };
    } else {
      // Si han pasado menos de 8 horas, aún puede estar trabajando → No clasificar
      return null;
    }
  }

  return null;
}

/**
 * Calcular hora de salida sugerida basándose en la jornada del empleado
 */
function calcularSalidaSugerida(
  empleado: Empleado & { jornada: Jornada | null },
  horaEntrada: Date
): Date {
  if (!empleado.jornada) {
    // Sin jornada definida: asumir 8 horas
    const salida = new Date(horaEntrada);
    salida.setHours(salida.getHours() + 8);
    return salida;
  }

  const jornada = empleado.jornada;
  const config = jornada.config as any;

  // Obtener día de la semana
  const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  const nombreDia = diasSemana[horaEntrada.getDay()];

  // Si tiene horario fijo para ese día, usar la hora de salida configurada
  if (config[nombreDia] && config[nombreDia].salida) {
    const [horaSalida, minutoSalida] = config[nombreDia].salida.split(':').map(Number);
    const salida = new Date(horaEntrada);
    salida.setHours(horaSalida, minutoSalida, 0, 0);
    return salida;
  }

  // Jornada flexible: sumar horas de jornada a la entrada
  const horasPorDia = Number(jornada.horasSemanales) / 5; // Asumir 5 días laborables
  const salida = new Date(horaEntrada);
  salida.setHours(salida.getHours() + Math.floor(horasPorDia));
  salida.setMinutes(salida.getMinutes() + ((horasPorDia % 1) * 60));

  return salida;
}

/**
 * Obtener descripción legible del horario de jornada
 */
function getDescripcionHorario(jornada: Jornada): string {
  const config = jornada.config as any;
  const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

  for (const dia of diasSemana) {
    if (config[dia] && config[dia].entrada && config[dia].salida) {
      return `${config[dia].entrada} - ${config[dia].salida}`;
    }
  }

  return `${jornada.horasSemanales}h semanales`;
}

/**
 * Aplicar auto-completado de fichajes
 */
export async function aplicarAutoCompletado(
  fichajesClasificados: FichajeClasificado[],
  empresaId: string
): Promise<{ completados: number; errores: string[] }> {
  let completados = 0;
  const errores: string[] = [];

  for (const clasificado of fichajesClasificados) {
    try {
      if (!clasificado.salidaSugerida) {
        errores.push(`${clasificado.empleadoNombre}: No se pudo calcular salida sugerida`);
        continue;
      }

      // Agregar evento de salida al fichaje existente
      await prisma.fichajeEvento.create({
        data: {
          fichajeId: clasificado.fichaje.id,
          tipo: 'salida',
          hora: clasificado.salidaSugerida,
        },
      });

      // Actualizar estado del fichaje y cálculos
      const { calcularHorasTrabajadas, calcularTiempoEnPausa } = await import('@/lib/calculos/fichajes');
      
      // Obtener fichaje actualizado con todos los eventos
      const fichajeActualizado = await prisma.fichaje.findUnique({
        where: { id: clasificado.fichaje.id },
        include: { eventos: true },
      });

      if (fichajeActualizado) {
        const horasTrabajadas = calcularHorasTrabajadas(fichajeActualizado.eventos);
        const horasEnPausa = calcularTiempoEnPausa(fichajeActualizado.eventos);

        await prisma.fichaje.update({
          where: { id: clasificado.fichaje.id },
          data: {
            estado: 'revisado',
            horasTrabajadas,
            horasEnPausa,
            autoCompletado: true,
          },
        });
      }

      // Crear registro en auto_completados para auditoría
      await prisma.autoCompletado.create({
        data: {
          empresaId,
          empleadoId: clasificado.empleadoId,
          tipo: 'fichaje_completado',
          datosOriginales: {
            fecha: clasificado.fecha.toISOString(),
            fichajeId: clasificado.fichaje.id,
            eventosExistentes: clasificado.fichaje.eventos.map(e => ({
              tipo: e.tipo,
              hora: e.hora.toISOString(),
            })),
          },
          sugerencias: {
            salidaSugerida: clasificado.salidaSugerida.toISOString(),
            razon: clasificado.razon,
            confianza: clasificado.confianza,
            metadatos: clasificado.metadatos,
          },
          estado: 'aprobado',
        },
      });

      // Crear notificación de fichaje autocompletado
      await crearNotificacionFichajeAutocompletado(prisma, {
        fichajeId: clasificado.fichaje.id,
        empresaId,
        empleadoId: clasificado.empleadoId,
        empleadoNombre: clasificado.empleadoNombre,
        fecha: clasificado.fecha,
        salidaSugerida: clasificado.salidaSugerida,
        razon: clasificado.razon,
      });

      completados++;
    } catch (error) {
      console.error('[Clasificador] Error aplicando auto-completado:', {
        empleadoId: clasificado.empleadoId,
        empleadoNombre: clasificado.empleadoNombre,
        fecha: clasificado.fecha,
        error,
      });
      errores.push(`${clasificado.empleadoNombre}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  return { completados, errores };
}

/**
 * Guardar fichajes que requieren revisión manual
 */
export async function guardarRevisionManual(
  empresaId: string,
  fichajesClasificados: FichajeClasificado[]
): Promise<{ guardados: number; errores: string[] }> {
  let guardados = 0;
  const errores: string[] = [];

  for (const clasificado of fichajesClasificados) {
    try {
      // Validar que tenemos datos completos
      if (!clasificado.fecha || !clasificado.fichaje || !clasificado.fichaje.eventos) {
        console.error('[Clasificador] Datos incompletos en clasificado:', {
          empleadoId: clasificado.empleadoId,
          empleadoNombre: clasificado.empleadoNombre,
          tieneFecha: !!clasificado.fecha,
          tieneFichaje: !!clasificado.fichaje,
          tieneEventos: !!clasificado.fichaje?.eventos,
        });
        continue;
      }

      // Actualizar estado del fichaje a 'pendiente' (requiere revisión manual)
      await prisma.fichaje.update({
        where: { id: clasificado.fichaje.id },
        data: {
          estado: 'pendiente',
        },
      });

      // Crear registro en auto_completados con estado pendiente
      await prisma.autoCompletado.create({
        data: {
          empresaId,
          empleadoId: clasificado.empleadoId,
          tipo: 'fichaje_revision',
          datosOriginales: {
            fecha: clasificado.fecha.toISOString(),
            fichajeId: clasificado.fichaje.id,
            eventosExistentes: clasificado.fichaje.eventos.map(e => ({
              tipo: e.tipo,
              hora: e.hora.toISOString(),
            })),
          },
          sugerencias: {
            razon: clasificado.razon,
            confianza: clasificado.confianza,
            metadatos: clasificado.metadatos,
            salidaSugerida: clasificado.salidaSugerida?.toISOString(),
          },
          estado: 'pendiente',
          expiraEn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
        },
      });

      // Crear notificación de fichaje que requiere revisión
      await crearNotificacionFichajeRequiereRevision(prisma, {
        fichajeId: clasificado.fichaje.id,
        empresaId,
        empleadoId: clasificado.empleadoId,
        empleadoNombre: clasificado.empleadoNombre,
        fecha: clasificado.fecha,
        razon: clasificado.razon,
      });

      guardados++;
    } catch (error) {
      console.error('[Clasificador] Error guardando revisión manual:', {
        empleadoId: clasificado.empleadoId,
        empleadoNombre: clasificado.empleadoNombre,
        fichajeId: clasificado.fichaje?.id,
        error,
      });
      errores.push(`${clasificado.empleadoNombre}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  return { guardados, errores };
}

