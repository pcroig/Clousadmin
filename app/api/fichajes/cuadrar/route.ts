// ========================================
// API: Cuadrar Fichajes Masivamente
// ========================================
// POST: Cuadrar fichajes pendientes creando eventos según jornada

import { NextRequest } from 'next/server';
import { format } from 'date-fns';
import { z } from 'zod';

import {
  badRequestResponse,
  handleApiError,
  isNextResponse,
  requireAuthAsHR,
  successResponse,
  validateRequest
} from '@/lib/api-handler';
import {
  calcularHorasTrabajadas,
  calcularTiempoEnPausa,
  cerrarFichajeAutomaticamente,
  debeCerrarseAutomaticamente,
} from '@/lib/calculos/fichajes';
import { calcularHorasEsperadasDelDia } from '@/lib/calculos/fichajes-helpers';
import {
  ajustarSalidaPorJornada,
  obtenerPromedioEventosHistoricos,
  validarSecuenciaEventos,
} from '@/lib/calculos/fichajes-historico';
import { prisma } from '@/lib/prisma';
import { crearFechaConHora, normalizarFechaSinHora, obtenerNombreDia, toMadridDate } from '@/lib/utils/fechas';

import type { DiaConfig, JornadaConfig } from '@/lib/calculos/fichajes-helpers';


const cuadrarSchema = z.object({
  fichajeIds: z.array(z.string()).optional(),
  descartarIds: z.array(z.string()).optional(),
}).refine(
  (data) => (data.fichajeIds?.length ?? 0) > 0 || (data.descartarIds?.length ?? 0) > 0,
  { message: 'Debe proporcionar al menos un fichaje' }
);

const MAX_FICHAJES_POR_REQUEST = 50;

// POST /api/fichajes/cuadrar - Cuadrar fichajes masivamente (solo HR Admin)
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (isNextResponse(authResult)) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(request, cuadrarSchema);
    if (isNextResponse(validationResult)) return validationResult;
    const { data: validatedData } = validationResult;

    const fichajeIds = [...new Set(validatedData.fichajeIds ?? [])];
    const descartarIds = [...new Set(validatedData.descartarIds ?? [])];

    if (fichajeIds.length > MAX_FICHAJES_POR_REQUEST) {
      return badRequestResponse(
        `Máximo ${MAX_FICHAJES_POR_REQUEST} fichajes por solicitud`,
        {
          recibidos: fichajeIds.length,
          limite: MAX_FICHAJES_POR_REQUEST,
        }
      );
    }

    let cuadrados = 0;
    const errores: string[] = [];

    // ----------------------------------------------------------------------
    // OPTIMIZACIÓN: Carga masiva de datos (Batch Processing)
    // Evitamos N+1 queries cargando todo lo necesario en 2-3 consultas grandes
    // ----------------------------------------------------------------------

    // 1. Cargar todos los fichajes solicitados con sus relaciones
    if (descartarIds.length > 0) {
      const fichajesDescartar = await prisma.fichajes.findMany({
        where: {
          id: { in: descartarIds },
          empresaId: session.user.empresaId,
        },
        include: {
          eventos: true,
        },
      });

      for (const fichaje of fichajesDescartar) {
        if (fichaje.eventos.length > 0) {
          errores.push(`Fichaje ${fichaje.id}: Solo se pueden descartar días sin fichajes`);
          continue;
        }

        if (fichaje.estado !== 'pendiente' && fichaje.estado !== 'en_curso') {
          errores.push(`Fichaje ${fichaje.id}: Solo se pueden descartar fichajes pendientes`);
          continue;
        }

        await prisma.fichajes.update({
          where: { id: fichaje.id },
          data: {
            estado: 'finalizado',
            horasTrabajadas: 0,
            horasEnPausa: 0,
            autoCompletado: false,
            cuadradoMasivamente: true,
            cuadradoPor: session.user.id,
            cuadradoEn: new Date(),
            fechaAprobacion: new Date(),
          },
        });
        cuadrados++;
      }
    }

    if (fichajeIds.length === 0) {
      return successResponse({
        success: true,
        cuadrados,
        errores,
        mensaje: `${cuadrados} fichajes procesados${errores.length ? `, ${errores.length} errores` : ''}`,
      });
    }

    const fichajes = await prisma.fichajes.findMany({
      where: {
        id: { in: fichajeIds },
        empresaId: session.user.empresaId, // Seguridad: solo de mi empresa
        tipoFichaje: 'ordinario', // Solo cuadrar fichajes ordinarios
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
    });

    // Validar que no se intenten cuadrar fichajes extraordinarios
    if (fichajes.length < fichajeIds.length) {
      const fichajesEncontrados = new Set(fichajes.map(f => f.id));
      const extraordinariosIntento = fichajeIds.filter(id => !fichajesEncontrados.has(id));

      if (extraordinariosIntento.length > 0) {
        return badRequestResponse(
          'Los fichajes extraordinarios deben cuadrarse manualmente mediante edición de eventos.',
          { fichajesExtraordinarios: extraordinariosIntento }
        );
      }
    }

    if (fichajes.length === 0) {
      return successResponse({
        success: true,
        cuadrados: 0,
        errores: ['No se encontraron fichajes válidos para procesar'],
        mensaje: 'No se procesaron fichajes',
      });
    }

    // 2. Extraer IDs y Fechas para buscar ausencias en batch
    const empleadoIds = Array.from(new Set(fichajes.map((f) => f.empleadoId)));
    // Calcular rango de fechas para optimizar query de ausencias
    const fechas = fichajes.map((f) => f.fecha);
    const minFecha = new Date(Math.min(...fechas.map((d) => d.getTime())));
    const maxFecha = new Date(Math.max(...fechas.map((d) => d.getTime())));
    // Ajustar maxFecha al final del día
    maxFecha.setHours(23, 59, 59, 999);
    minFecha.setHours(0, 0, 0, 0);

    // 3. Cargar ausencias de medio día relevantes en el rango
    // Solo nos importan las ausencias CONFIRMADAS o COMPLETADAS y de MEDIO DIA
    const ausenciasMedioDia = await prisma.ausencias.findMany({
      where: {
        empresaId: session.user.empresaId,
        empleadoId: { in: empleadoIds },
        medioDia: true, // Solo medio día afecta al horario intra-día
        estado: { in: ['confirmada', 'completada'] }, // Usando strings directos para evitar import circular si enum falla
        // Solapamiento con el rango de fechas de los fichajes
        fechaInicio: { lte: maxFecha },
        fechaFin: { gte: minFecha },
      },
    });

    // Mapa para búsqueda rápida: "empleadoId_fechaISO" -> Ausencia
    const mapaAusencias = new Map<string, typeof ausenciasMedioDia[0]>();
    for (const ausencia of ausenciasMedioDia) {
      // Las ausencias de medio día suelen ser de un solo día, pero por si acaso iteramos
      const current = new Date(ausencia.fechaInicio);
      while (current <= ausencia.fechaFin) {
        const key = `${ausencia.empleadoId}_${format(toMadridDate(current), 'yyyy-MM-dd')}`;
        mapaAusencias.set(key, ausencia);
        current.setDate(current.getDate() + 1);
      }
    }

    // 4. Procesar cada fichaje en memoria
    // Usamos una transacción o promesas paralelas controladas si el volumen es muy alto.
    // Para simplificar y evitar deadlocks masivos, procesamos secuencialmente pero con datos ya en memoria.
    // Solo escribiremos (writes) dentro del loop.

    // OPTIMIZACIÓN CONCURRENCIA: Usar transacción interactiva para asegurar consistencia
    // Aunque sea secuencial, la transacción asegura que no se modifique el fichaje mientras procesamos.
    // NOTA: Para batches muy grandes, Prisma recomienda transactions pequeñas.
    // Aquí procesamos todo en una sola transacción para garantizar integridad total.

    await prisma.$transaction(async (tx) => {
      for (const fichaje of fichajes) {
        const fichajeId = fichaje.id;
        try {
          // PASO 0: Verificar si el fichaje debe cerrarse automáticamente ANTES de cuadrar
          // (Ej: fichaje en_curso de ayer o que pasó el limiteSuperior)
          if (fichaje.estado === 'en_curso') {
            const debeCerrarse = debeCerrarseAutomaticamente(fichaje);
            if (debeCerrarse) {
              console.log(`[API Cuadrar] Fichaje ${fichajeId} debe cerrarse automáticamente antes de cuadrar`);
              await cerrarFichajeAutomaticamente(fichajeId, tx);
              // Continuar con el cuadrado normal (el fichaje ahora está en pendiente o finalizado)
            }
          }

          // Re-fetch dentro de la transacción para lock/concurrencia (optimista)
          // O confiar en la carga previa si el riesgo es bajo.
          // Para seguridad máxima en "cuadrar", verificamos estado una vez más.
          const fichajeActual = await tx.fichajes.findUnique({
             where: { id: fichajeId },
             select: { estado: true }
          });

          if (!fichajeActual || (fichajeActual.estado !== 'pendiente' && fichajeActual.estado !== 'en_curso')) {
             // Si cambió de estado desde la carga inicial, lo saltamos silenciosamente o logueamos
             console.warn(`[API Cuadrar] Fichaje ${fichajeId} cambió de estado o no existe, saltando.`);
             errores.push(`Fichaje ${fichajeId}: Ya procesado o estado inválido`);
             continue;
          }

          // Validaciones básicas en memoria
          if (!fichaje.empleado.jornada) {
            errores.push(`Fichaje ${fichajeId}: Empleado sin jornada asignada`);
            continue;
          }

          // Recuperar ausencia del mapa
          const fechaKey = `${fichaje.empleadoId}_${format(toMadridDate(fichaje.fecha), 'yyyy-MM-dd')}`;
          const ausenciaMatch = mapaAusencias.get(fechaKey);
          
          // Simular objeto AusenciaMedioDia
          // Casteamos el tipo Ausencia para evitar conflictos con includes opcionales
          const ausenciaMedioDiaInfo = {
            tieneAusencia: !!ausenciaMatch && (ausenciaMatch.periodo === 'manana' || ausenciaMatch.periodo === 'tarde'),
            medioDia: (ausenciaMatch?.periodo === 'manana' || ausenciaMatch?.periodo === 'tarde')
              ? (ausenciaMatch.periodo as 'manana' | 'tarde')
              : null, 
            ausencia: ausenciaMatch as unknown as Record<string, unknown> | null,
          };

          const jornada = fichaje.empleado.jornada;
          const config = jornada.config as JornadaConfig;
          const nombreDia = obtenerNombreDia(fichaje.fecha);
          const configDia = config[nombreDia] as DiaConfig | undefined;

          // Determinar eventos requeridos (Lógica espejo de validarFichajeCompleto)
          let eventosRequeridos: string[] = [];
          
          // -- JORNADA FIJA --
          if (config.tipo === 'fija' || (configDia?.entrada && configDia?.salida)) {
             if (!configDia || configDia.activo === false) {
               // Día no laborable
             } else {
               if (!ausenciaMedioDiaInfo.tieneAusencia || ausenciaMedioDiaInfo.medioDia === 'tarde') eventosRequeridos.push('entrada');
               if (!ausenciaMedioDiaInfo.tieneAusencia || ausenciaMedioDiaInfo.medioDia === 'manana') eventosRequeridos.push('salida');
               if (configDia.pausa_inicio && configDia.pausa_fin && !ausenciaMedioDiaInfo.tieneAusencia) {
                 eventosRequeridos.push('pausa_inicio');
                 eventosRequeridos.push('pausa_fin');
               }
             }
          } 
          // -- JORNADA FLEXIBLE --
          else if (config.tipo === 'flexible') {
            if (configDia && configDia.activo !== false) {
               if (!ausenciaMedioDiaInfo.tieneAusencia || ausenciaMedioDiaInfo.medioDia === 'tarde') eventosRequeridos.push('entrada');
               if (!ausenciaMedioDiaInfo.tieneAusencia || ausenciaMedioDiaInfo.medioDia === 'manana') eventosRequeridos.push('salida');
               if (config.descansoMinimo && !ausenciaMedioDiaInfo.tieneAusencia) {
                  // En flexible con descanso mínimo forzamos pausas para cuadrar horas exactas si faltan
                  eventosRequeridos.push('pausa_inicio');
                  eventosRequeridos.push('pausa_fin');
               }
            } else if (configDia === undefined) {
               // Fallback: si no hay configuración del día, asumir día laborable básico
               if (!ausenciaMedioDiaInfo.tieneAusencia || ausenciaMedioDiaInfo.medioDia === 'tarde') eventosRequeridos.push('entrada');
               if (!ausenciaMedioDiaInfo.tieneAusencia || ausenciaMedioDiaInfo.medioDia === 'manana') eventosRequeridos.push('salida');
            }
          }
          else {
             // Fallback
             eventosRequeridos = ['entrada', 'salida'];
          }

          const tiposEventos = fichaje.eventos.map((e) => e.tipo);
          let eventosFaltantes = eventosRequeridos.filter((req) => !tiposEventos.includes(req));

          // PUNTO 4: Logging de auditoría para fichajes parciales
          // Garantizamos que los eventos originales se mantienen y solo se añaden los faltantes
          if (fichaje.eventos.length > 0 && eventosFaltantes.length > 0) {
            const eventosMantenidos = fichaje.eventos.map(e => e.tipo).join(', ');
            const eventosFaltantesStr = eventosFaltantes.join(', ');
            console.log(`[API Cuadrar] Fichaje parcial ${fichajeId}:`);
            console.log(`  - Eventos mantenidos (${fichaje.eventos.length}): ${eventosMantenidos}`);
            console.log(`  - Eventos a añadir (${eventosFaltantes.length}): ${eventosFaltantesStr}`);
          } else if (fichaje.eventos.length === 0) {
            console.log(`[API Cuadrar] Fichaje vacío ${fichajeId}: Creando ${eventosRequeridos.length} eventos según jornada`);
          }

          const minutosDescansoConfig = (() => {
            if (configDia?.pausa_inicio && configDia?.pausa_fin) {
              const [inicioH, inicioM] = configDia.pausa_inicio.split(':').map(Number);
              const [finH, finM] = configDia.pausa_fin.split(':').map(Number);
              const minutos = (finH * 60 + (finM ?? 0)) - (inicioH * 60 + (inicioM ?? 0));
              return Math.max(minutos, 0);
            }
            if (typeof config.descansoMinimo === 'string') {
              const [h, m] = config.descansoMinimo.split(':').map(Number);
              return Math.max(h * 60 + (m ?? 0), 0);
            }
            return 0;
          })();

          if (
            minutosDescansoConfig > 0 &&
            eventosFaltantes.includes('pausa_fin') &&
            !tiposEventos.includes('pausa_fin')
          ) {
            const ultimaPausaInicio = [...fichaje.eventos]
              .filter((e) => e.tipo === 'pausa_inicio')
              .sort((a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime())
              .pop();

            if (ultimaPausaInicio) {
              const existeFinPosterior = fichaje.eventos.some(
                (ev) =>
                  ev.tipo === 'pausa_fin' &&
                  new Date(ev.hora).getTime() > new Date(ultimaPausaInicio.hora).getTime()
              );

              if (!existeFinPosterior) {
                const horaFin = new Date(new Date(ultimaPausaInicio.hora).getTime() + minutosDescansoConfig * 60 * 1000);
                const eventoSalida = fichaje.eventos.find((e) => e.tipo === 'salida');

                if (eventoSalida && horaFin.getTime() >= new Date(eventoSalida.hora).getTime()) {
                  console.warn(`[API Cuadrar] Fichaje ${fichajeId}: pausa_fin calculada pasaría de la salida, no se crea`);
                } else {
                  await tx.fichaje_eventos.create({
                    data: {
                      fichajeId,
                      tipo: 'pausa_fin',
                      hora: horaFin,
                      editado: true, // Evento propuesto por el sistema al cuadrar
                      motivoEdicion: 'Pausa fin completada automáticamente al cuadrar',
                    },
                  });
                  tiposEventos.push('pausa_fin');
                  eventosFaltantes = eventosRequeridos.filter((req) => !tiposEventos.includes(req));
                }
              }
            }
          }

          // Si no faltan eventos, solo cerrar
          if (eventosFaltantes.length === 0) {
            await tx.fichajes.update({
              where: { id: fichajeId },
              data: {
                estado: 'finalizado',
                cuadradoMasivamente: true,
                cuadradoPor: session.user.id,
                cuadradoEn: new Date(),
              },
            });
            cuadrados++;
            continue;
          }

          // Intentar completar eventos usando promedio histórico
          const promedioHistorico = await obtenerPromedioEventosHistoricos(
            fichaje.empleadoId,
            fichaje.fecha,
            jornada.id,
            5
          );

          if (promedioHistorico && validarSecuenciaEventos(promedioHistorico)) {
            const horasEsperadasDia = calcularHorasEsperadasDelDia(jornada, fichaje.fecha);
            const descansoMinimoStr =
              typeof config.descansoMinimo === 'string' ? config.descansoMinimo : undefined;
            const promedioAjustado = ajustarSalidaPorJornada(
              promedioHistorico,
              fichaje.fecha,
              horasEsperadasDia,
              descansoMinimoStr
            );

            const registrarEventoDesdePromedio = async (
              tipo: 'entrada' | 'pausa_inicio' | 'pausa_fin' | 'salida',
              hora: Date | null
            ) => {
              if (!hora) return;
              if (!eventosFaltantes.includes(tipo) || tiposEventos.includes(tipo)) {
                return;
              }

              await tx.fichaje_eventos.create({
                data: {
                  fichajeId,
                  tipo,
                  hora,
                  editado: true, // Evento propuesto por el sistema al cuadrar
                  motivoEdicion: 'Evento creado automáticamente al cuadrar fichaje',
                },
              });
              tiposEventos.push(tipo);
            };

            await registrarEventoDesdePromedio('entrada', promedioAjustado.entrada);
            await registrarEventoDesdePromedio('pausa_inicio', promedioAjustado.pausa_inicio);
            await registrarEventoDesdePromedio('pausa_fin', promedioAjustado.pausa_fin);
            await registrarEventoDesdePromedio('salida', promedioAjustado.salida);

            eventosFaltantes = eventosRequeridos.filter((req) => !tiposEventos.includes(req));

            console.log(`[API Cuadrar] Promedio histórico aplicado para fichaje ${fichajeId}`, {
              empleadoId: fichaje.empleadoId,
              eventosRestantes: eventosFaltantes,
            });
          } else {
            console.log(
              `[API Cuadrar] Sin promedio histórico disponible para fichaje ${fichajeId}, usando fallback de jornada`
            );
          }

          // Re-evaluar tras el promedio
          const fechaBase = normalizarFechaSinHora(fichaje.fecha);
          if (eventosFaltantes.length === 0) {
            // Saltar creación manual pero continuar para recalcular horas al final
          } else {
            // Lógica de creación de eventos (solo los faltantes)
            if (config.tipo === 'fija' || (configDia?.entrada && configDia.salida)) {
              if (!configDia) continue; // Safety check

              // Entrada - solo si falta y no hay ausencia de mañana
              if (eventosFaltantes.includes('entrada') && !tiposEventos.includes('entrada')) {
                const [horas, minutos] = (configDia.entrada || '09:00').split(':').map(Number);
                const hora = crearFechaConHora(fechaBase, horas, minutos);
                await tx.fichaje_eventos.create({ data: { fichajeId, tipo: 'entrada', hora, editado: true, motivoEdicion: 'Entrada propuesta al cuadrar' } });
              }
              
              // Pausas - solo si faltan y no hay ausencia de medio día
              if (
                eventosFaltantes.includes('pausa_inicio') &&
                configDia.pausa_inicio &&
                !tiposEventos.includes('pausa_inicio')
              ) {
                const [h, m] = configDia.pausa_inicio.split(':').map(Number);
                const hora = crearFechaConHora(fechaBase, h, m);
                await tx.fichaje_eventos.create({ data: { fichajeId, tipo: 'pausa_inicio', hora, editado: true, motivoEdicion: 'Pausa inicio propuesta al cuadrar' } });
              }
              if (
                eventosFaltantes.includes('pausa_fin') &&
                configDia.pausa_fin &&
                !tiposEventos.includes('pausa_fin')
              ) {
                const [h, m] = configDia.pausa_fin.split(':').map(Number);
                const hora = crearFechaConHora(fechaBase, h, m);
                await tx.fichaje_eventos.create({ data: { fichajeId, tipo: 'pausa_fin', hora, editado: true, motivoEdicion: 'Pausa fin propuesta al cuadrar' } });
              }
              
              // Salida - solo si falta y no hay ausencia de tarde
              if (eventosFaltantes.includes('salida') && !tiposEventos.includes('salida')) {
                const [h, m] = (configDia.salida || '18:00').split(':').map(Number);
                const hora = crearFechaConHora(fechaBase, h, m);
                await tx.fichaje_eventos.create({ data: { fichajeId, tipo: 'salida', hora, editado: true, motivoEdicion: 'Salida propuesta al cuadrar' } });
              }
            } 
            else if (config.tipo === 'flexible') {
              // Lógica flexible (calculada) - MANTENER eventos originales
              // Calcular horas por día promedio
               const diasActivos = Object.entries(config).reduce((count, [k, v]) => {
                if (['tipo', 'descansoMinimo', 'limiteInferior', 'limiteSuperior'].includes(k)) return count;
                if (v && typeof v === 'object' && !Array.isArray(v) && (v as DiaConfig).activo) return count + 1;
                return count;
              }, 0);
              const diasLab = diasActivos > 0 ? diasActivos : 5;
              const horasPorDia = Number(jornada.horasSemanales) / diasLab;

              // Entrada - usar la existente o crear una nueva
              let horaEntrada = new Date(fechaBase);
              const eventoEntrada = fichaje.eventos.find(e => e.tipo === 'entrada');
              
              if (eventoEntrada) {
                // Usar la entrada registrada
                horaEntrada = new Date(eventoEntrada.hora);
              } else if (eventosFaltantes.includes('entrada') && !tiposEventos.includes('entrada')) {
                // Solo crear si no existe
                horaEntrada = crearFechaConHora(fechaBase, 9, 0); // Default 9:00
                await tx.fichaje_eventos.create({ data: { fichajeId, tipo: 'entrada', hora: horaEntrada, editado: true, motivoEdicion: 'Entrada propuesta al cuadrar (jornada flexible)' } });
              }

              // Pausas (si descansoMinimo) - solo si no existen
              if (config.descansoMinimo && eventosFaltantes.includes('pausa_inicio')) {
                 const [hDesc, mDesc] = config.descansoMinimo.split(':').map(Number);
                 const descansoMs = (hDesc * 60 + mDesc) * 60 * 1000;
                 
                 // Mitad de jornada
                 const horaPausaInicio = new Date(horaEntrada.getTime() + (horasPorDia / 2) * 60 * 60 * 1000);
                 const horaPausaFin = new Date(horaPausaInicio.getTime() + descansoMs);

                 if (!tiposEventos.includes('pausa_inicio'))
                   await tx.fichaje_eventos.create({ data: { fichajeId, tipo: 'pausa_inicio', hora: horaPausaInicio, editado: true, motivoEdicion: 'Pausa inicio propuesta al cuadrar (jornada flexible)' } });

                 if (!tiposEventos.includes('pausa_fin') && eventosFaltantes.includes('pausa_fin'))
                   await tx.fichaje_eventos.create({ data: { fichajeId, tipo: 'pausa_fin', hora: horaPausaFin, editado: true, motivoEdicion: 'Pausa fin propuesta al cuadrar (jornada flexible)' } });
              }

              // Salida - solo si no existe
              if (eventosFaltantes.includes('salida') && !tiposEventos.includes('salida')) {
                 let durationMs = horasPorDia * 60 * 60 * 1000;
                 // Si hay descanso minimo, sumarlo a la duración de la estancia
                 if (config.descansoMinimo) {
                    const [h, m] = config.descansoMinimo.split(':').map(Number);
                    durationMs += (h * 60 + m) * 60 * 1000;
                 }
                 const horaSalida = new Date(horaEntrada.getTime() + durationMs);
                 await tx.fichaje_eventos.create({ data: { fichajeId, tipo: 'salida', hora: horaSalida, editado: true, motivoEdicion: 'Salida propuesta al cuadrar (jornada flexible)' } });
              }
            }
          }

          // Crear eventos faltantes MANTENIENDO los eventos originales

          // 5. Actualizar cálculos y estado final
          // FIX: Calcular horas DENTRO de la transacción para evitar race conditions
          // Obtener todos los eventos actualizados (incluyendo los recién creados)
          const eventosActualizados = await tx.fichaje_eventos.findMany({
            where: { fichajeId },
            orderBy: { hora: 'asc' },
          });

          // Calcular horas trabajadas y en pausa usando las funciones puras
          const horasTrabajadas = calcularHorasTrabajadas(eventosActualizados);

          if (horasTrabajadas === null) {
            errores.push(`Fichaje ${fichajeId}: Secuencia de eventos inválida, no se puede cerrar`);
            continue;
          }

          const horasEnPausa = calcularTiempoEnPausa(eventosActualizados);
          
          await tx.fichajes.update({
            where: { id: fichajeId },
            data: {
              estado: 'finalizado',
              horasTrabajadas,
              horasEnPausa,
              cuadradoMasivamente: true,
              cuadradoPor: session.user.id,
              cuadradoEn: new Date(),
              fechaAprobacion: new Date(),
            },
          });

          cuadrados++;

        } catch (error) {
          console.error(`[API Cuadrar] Error procesando ${fichajeId}:`, error);
          errores.push(`Fichaje ${fichajeId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }
    }, {
      timeout: 20000, // Aumentar timeout para batches grandes
      maxWait: 5000 
    });

    // FIX: Ya no necesitamos post-procesamiento de cálculo de horas
    // porque se hace dentro de la transacción (líneas 421-432)
    console.log(`[API Cuadrar] Transacción completada. ${cuadrados} fichajes cuadrados con horas calculadas.`);

    return successResponse({
      success: true,
      cuadrados,
      errores,
      mensaje: `${cuadrados} fichajes cuadrados correctamente${errores.length > 0 ? `, ${errores.length} errores` : ''}`,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/fichajes/cuadrar');
  }
}

