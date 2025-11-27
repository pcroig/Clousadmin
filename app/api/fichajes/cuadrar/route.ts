// ========================================
// API: Cuadrar Fichajes Masivamente
// ========================================
// POST: Cuadrar fichajes pendientes creando eventos según jornada

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  handleApiError,
  isNextResponse,
  requireAuthAsHR,
  successResponse,
  validateRequest
} from '@/lib/api-handler';
import {
  actualizarCalculosFichaje,
} from '@/lib/calculos/fichajes';
import { prisma } from '@/lib/prisma';
import { obtenerNombreDia } from '@/lib/utils/fechas';

import type { DiaConfig, JornadaConfig } from '@/lib/calculos/fichajes-helpers';


const cuadrarSchema = z.object({
  fichajeIds: z.array(z.string()).min(1, 'Debe proporcionar al menos un fichaje'),
});

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

    const { fichajeIds } = validatedData;

    let cuadrados = 0;
    const errores: string[] = [];

    // ----------------------------------------------------------------------
    // OPTIMIZACIÓN: Carga masiva de datos (Batch Processing)
    // Evitamos N+1 queries cargando todo lo necesario en 2-3 consultas grandes
    // ----------------------------------------------------------------------

    // 1. Cargar todos los fichajes solicitados con sus relaciones
    const fichajes = await prisma.fichaje.findMany({
      where: {
        id: { in: fichajeIds },
        empresaId: session.user.empresaId, // Seguridad: solo de mi empresa
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
    const ausenciasMedioDia = await prisma.ausencia.findMany({
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
        const key = `${ausencia.empleadoId}_${current.toISOString().split('T')[0]}`;
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
          // Re-fetch dentro de la transacción para lock/concurrencia (optimista)
          // O confiar en la carga previa si el riesgo es bajo. 
          // Para seguridad máxima en "cuadrar", verificamos estado una vez más.
          const fichajeActual = await tx.fichaje.findUnique({
             where: { id: fichajeId },
             select: { estado: true } 
          });

          if (!fichajeActual || (fichajeActual.estado !== 'pendiente' && fichajeActual.estado !== 'en_curso')) {
             // Si cambió de estado desde la carga inicial, lo saltamos silenciosamente o logueamos
             console.warn(`[API Cuadrar] Fichaje ${fichajeId} cambió de estado o no existe, saltando.`);
             continue;
          }

          // Validaciones básicas en memoria
          if (!fichaje.empleado.jornada) {
            errores.push(`Fichaje ${fichajeId}: Empleado sin jornada asignada`);
            continue;
          }

          // Recuperar ausencia del mapa
          const fechaKey = `${fichaje.empleadoId}_${fichaje.fecha.toISOString().split('T')[0]}`;
          const ausenciaMatch = mapaAusencias.get(fechaKey);
          
          // Simular objeto AusenciaMedioDia
          // Casteamos el tipo Ausencia para evitar conflictos con includes opcionales
          const ausenciaMedioDiaInfo = {
            tieneAusencia: !!ausenciaMatch,
            medioDia: (ausenciaMatch?.periodo as 'manana' | 'tarde') || null, 
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
            }
          }
          else {
             // Fallback
             eventosRequeridos = ['entrada', 'salida'];
          }

          const tiposEventos = fichaje.eventos.map((e) => e.tipo);
          const eventosFaltantes = eventosRequeridos.filter(req => !tiposEventos.includes(req));

          // Si no faltan eventos, solo cerrar
          if (eventosFaltantes.length === 0) {
            await tx.fichaje.update({
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

          // Crear eventos faltantes
          const fechaBase = new Date(fichaje.fecha);
          fechaBase.setHours(0, 0, 0, 0);

          // Lógica de creación de eventos (reutilizada pero adaptada a variables locales)
          if (config.tipo === 'fija' || (configDia?.entrada && configDia.salida)) {
            if (!configDia) continue; // Safety check

            // Entrada
            if (eventosFaltantes.includes('entrada')) {
               const [horas, minutos] = (configDia.entrada || '09:00').split(':').map(Number);
               const hora = new Date(fechaBase); hora.setHours(horas, minutos, 0, 0);
               await tx.fichajeEvento.create({ data: { fichajeId, tipo: 'entrada', hora } });
            }
            // Pausas
            if (eventosFaltantes.includes('pausa_inicio') && configDia.pausa_inicio) {
               const [h, m] = configDia.pausa_inicio.split(':').map(Number);
               const hora = new Date(fechaBase); hora.setHours(h, m, 0, 0);
               await tx.fichajeEvento.create({ data: { fichajeId, tipo: 'pausa_inicio', hora } });
            }
            if (eventosFaltantes.includes('pausa_fin') && configDia.pausa_fin) {
               const [h, m] = configDia.pausa_fin.split(':').map(Number);
               const hora = new Date(fechaBase); hora.setHours(h, m, 0, 0);
               await tx.fichajeEvento.create({ data: { fichajeId, tipo: 'pausa_fin', hora } });
            }
            // Salida
            if (eventosFaltantes.includes('salida')) {
               const [h, m] = (configDia.salida || '18:00').split(':').map(Number);
               const hora = new Date(fechaBase); hora.setHours(h, m, 0, 0);
               await tx.fichajeEvento.create({ data: { fichajeId, tipo: 'salida', hora } });
            }
          } 
          else if (config.tipo === 'flexible') {
            // Lógica flexible (calculada)
            // Calcular horas por día promedio
             const diasActivos = Object.entries(config).reduce((count, [k, v]) => {
              if (['tipo', 'descansoMinimo', 'limiteInferior', 'limiteSuperior'].includes(k)) return count;
              if (v && typeof v === 'object' && !Array.isArray(v) && (v as DiaConfig).activo) return count + 1;
              return count;
            }, 0);
            const diasLab = diasActivos > 0 ? diasActivos : 5;
            const horasPorDia = Number(jornada.horasSemanales) / diasLab;

            // Entrada
            let horaEntrada = new Date(fechaBase);
            const eventoEntrada = fichaje.eventos.find(e => e.tipo === 'entrada');
            
            if (eventoEntrada) {
              horaEntrada = new Date(eventoEntrada.hora);
            } else if (eventosFaltantes.includes('entrada')) {
              horaEntrada.setHours(9, 0, 0, 0); // Default 9:00
              await tx.fichajeEvento.create({ data: { fichajeId, tipo: 'entrada', hora: horaEntrada } });
            }

            // Pausas (si descansoMinimo)
            if (config.descansoMinimo && eventosFaltantes.includes('pausa_inicio')) {
               const [hDesc, mDesc] = config.descansoMinimo.split(':').map(Number);
               const descansoMs = (hDesc * 60 + mDesc) * 60 * 1000;
               
               // Mitad de jornada
               const horaPausaInicio = new Date(horaEntrada.getTime() + (horasPorDia / 2) * 60 * 60 * 1000);
               const horaPausaFin = new Date(horaPausaInicio.getTime() + descansoMs);

               if (!tiposEventos.includes('pausa_inicio'))
                 await tx.fichajeEvento.create({ data: { fichajeId, tipo: 'pausa_inicio', hora: horaPausaInicio } });
               
               if (!tiposEventos.includes('pausa_fin') && eventosFaltantes.includes('pausa_fin')) // Check doble por si acaso
                 await tx.fichajeEvento.create({ data: { fichajeId, tipo: 'pausa_fin', hora: horaPausaFin } });
            }

            // Salida
            if (eventosFaltantes.includes('salida')) {
               let durationMs = horasPorDia * 60 * 60 * 1000;
               // Si hay descanso minimo, sumarlo a la duración de la estancia
               if (config.descansoMinimo) {
                  const [h, m] = config.descansoMinimo.split(':').map(Number);
                  durationMs += (h * 60 + m) * 60 * 1000;
               }
               const horaSalida = new Date(horaEntrada.getTime() + durationMs);
               await tx.fichajeEvento.create({ data: { fichajeId, tipo: 'salida', hora: horaSalida } });
            }
          }

          // 5. Actualizar cálculos y estado final
          // NOTA: actualizarCalculosFichaje usa prisma global, no la tx. 
          // Lo ideal sería pasarle tx, pero para simplificar refactor, recalcitramos horas "manualmente" aquí o aceptamos la leve race condition en el cálculo.
          // Dado que 'actualizarCalculosFichaje' es una función de librería que hace queries, es mejor llamarla FUERA de la tx si es posible, o refactorizarla.
          // Sin embargo, para mantener integridad, deberíamos actualizar el estado DENTRO de la tx.
          
          await tx.fichaje.update({
            where: { id: fichajeId },
            data: {
              estado: 'finalizado',
              cuadradoMasivamente: true,
              cuadradoPor: session.user.id,
              cuadradoEn: new Date(),
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

    // Post-procesamiento: Actualizar cálculos de horas ANTES de responder
    // CRÍTICO: Debe hacerse de forma síncrona para asegurar consistencia
    console.log('[API Cuadrar] Recalculando horas trabajadas para fichajes cuadrados...');
    for (const fichaje of fichajes) {
      try {
        await actualizarCalculosFichaje(fichaje.id);
      } catch (e) {
        console.error(`[API Cuadrar] Error recalculando horas para ${fichaje.id}`, e);
        // Registrar error pero no fallar toda la operación
        errores.push(`Fichaje ${fichaje.id}: Error calculando horas (${e instanceof Error ? e.message : 'desconocido'})`);
      }
    }

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

