// ========================================
// API: Revisión de Fichajes
// ========================================
// GET: Obtener fichajes pendientes de revisión
// POST: Aprobar/rechazar fichajes en revisión

import { format } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { procesarFichajesDia } from '@/lib/calculos/fichajes';
import { crearNotificacionFichajeResuelto } from '@/lib/notificaciones';
import { prisma, Prisma } from '@/lib/prisma';
import { jornadaSelectCompleta } from '@/lib/prisma/selects';
import { obtenerNombreDia, toMadridDate } from '@/lib/utils/fechas';

// ========================================
// Types para datos JSON de Prisma
// ========================================

interface ConfigDiaJornada {
  activo?: boolean;
  entrada?: string;
  salida?: string;
  pausa_inicio?: string;
  pausa_fin?: string;
}

interface ConfigJornada {
  tipo?: 'fija' | 'flexible';
  descansoMinimo?: string;
  [key: string]: ConfigDiaJornada | string | undefined;
}

interface AusenciaMedioDia {
  empleadoId: string;
  periodo: 'manana' | 'tarde';
}

const DEFAULT_LAZY_RECOVERY_DAYS = 3;
const MAX_LAZY_RECOVERY_DAYS = 14;

const revisionSchema = z.object({
  revisiones: z
    .array(
      z.object({
        id: z.string(),
        accion: z.enum(['actualizar', 'descartar']),
      })
    )
    .min(1, 'Debe proporcionar al menos una revisión'),
});

// Helper para parsear horas HH:mm a minutos desde media noche
const getMinutesFromHHMM = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export async function GET(request: NextRequest) {
  try {
    console.log('[API Revisión GET] Iniciando...');
    const session = await getSession();
    console.log('[API Revisión GET] Session:', session ? 'existe' : 'null');
    console.log('[API Revisión GET] Rol:', session?.user?.rol);

    if (!session || session.user.rol !== 'hr_admin') {
      console.log('[API Revisión GET] No autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    console.log('[API Revisión GET] EmpresaId:', session.user.empresaId);

    const searchParams = request.nextUrl.searchParams;
    const fechaInicioParam = searchParams.get('fechaInicio');
    const fechaFinParam = searchParams.get('fechaFin');
    const equipoId = searchParams.get('equipoId');
    const search = searchParams.get('search');

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const lazyDaysFromEnv = Number(process.env.FICHAJES_LAZY_DIAS ?? DEFAULT_LAZY_RECOVERY_DAYS);
    const diasARecuperar =
      Number.isFinite(lazyDaysFromEnv) && lazyDaysFromEnv > 0
        ? Math.min(lazyDaysFromEnv, MAX_LAZY_RECOVERY_DAYS)
        : DEFAULT_LAZY_RECOVERY_DAYS;

    console.log(
      `[API Revisión GET] Lazy recovery de fichajes para los últimos ${diasARecuperar} día(s) (incluyendo hoy) en empresa ${session.user.empresaId}`
    );

    // FIX: Cambiar offset de 1 a 0 para incluir el día de hoy
    for (let offset = 0; offset <= diasARecuperar; offset++) {
      const fechaObjetivo = new Date(hoy);
      fechaObjetivo.setDate(fechaObjetivo.getDate() - offset);

      try {
        await procesarFichajesDia(session.user.empresaId, fechaObjetivo, { notificar: false });
      } catch (error) {
        console.error(
          '[API Revisión GET] Error procesando fallback de fichajes para el día',
          fechaObjetivo.toISOString().split('T')[0],
          error
        );
      }
    }

    console.log('[API Revisión GET] Fecha hoy:', hoy.toISOString());
    console.log('[API Revisión GET] Buscando fichajes pendientes (incluyendo hoy)...');

    let fichajesPendientes;
    // Declarar mapas fuera del try para que estén disponibles en el formateo
    let ausenciasMedioDiaPorFecha = new Map<string, AusenciaMedioDia>();
    
    try {
      // FIX: Cambiar lt a lte para incluir fichajes del día de hoy
      const fechaWhere: Prisma.DateTimeFilter = { lte: hoy };

      if (fechaInicioParam) {
        const inicio = new Date(fechaInicioParam);
        inicio.setHours(0, 0, 0, 0);
        if (!Number.isNaN(inicio.getTime())) {
          fechaWhere.gte = inicio;
        }
      }

      if (fechaFinParam) {
        const fin = new Date(fechaFinParam);
        fin.setHours(23, 59, 59, 999);
        if (!Number.isNaN(fin.getTime())) {
          fechaWhere.lte = fin;
        }
      }

      const empleadoWhere: Prisma.empleadosWhereInput = {};
      if (equipoId && equipoId !== 'todos') {
        empleadoWhere.equipos = {
          some: {
            equipoId,
          },
        };
      }
      if (search) {
        empleadoWhere.OR = [
          { nombre: { contains: search, mode: 'insensitive' } },
          { apellidos: { contains: search, mode: 'insensitive' } },
        ];
      }

      // IMPORTANTE: Obtener empleados con ausencias de día completo para excluirlos
      // Lógica de solapamiento: ausencia.inicio <= rango.fin AND ausencia.fin >= rango.inicio
      const rangoInicio = fechaWhere.gte ?? new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
      const rangoFin = fechaWhere.lte ?? hoy;
      
      const ausenciasDiaCompleto = await prisma.ausencias.findMany({
        where: {
          empresaId: session.user.empresaId,
          medioDia: false, // Solo ausencias de día completo
          estado: { in: ['confirmada', 'completada'] },
          fechaInicio: { lte: rangoFin },
          fechaFin: { gte: rangoInicio },
        },
        select: {
          empleadoId: true,
          fechaInicio: true,
          fechaFin: true,
        },
      });

      // NUEVO: Obtener ausencias de MEDIA JORNADA para ajustar eventos propuestos
      const ausenciasMedioDia = await prisma.ausencias.findMany({
        where: {
          empresaId: session.user.empresaId,
          medioDia: true, // Solo ausencias de media jornada
          estado: { in: ['confirmada', 'completada'] },
          fechaInicio: { lte: rangoFin },
          fechaFin: { gte: rangoInicio },
        },
        select: {
          empleadoId: true,
          fechaInicio: true,
          fechaFin: true,
          periodo: true, // 'manana' o 'tarde'
        },
      });

      // Crear set de empleados con ausencias de día completo por fecha
      const empleadosConAusenciaPorFecha = new Map<string, Set<string>>();
      for (const ausencia of ausenciasDiaCompleto) {
        const current = new Date(ausencia.fechaInicio);
        while (current <= ausencia.fechaFin) {
          const fechaKey = format(toMadridDate(current), 'yyyy-MM-dd');
          if (!empleadosConAusenciaPorFecha.has(fechaKey)) {
            empleadosConAusenciaPorFecha.set(fechaKey, new Set());
          }
          empleadosConAusenciaPorFecha.get(fechaKey)!.add(ausencia.empleadoId);
          current.setDate(current.getDate() + 1);
        }
      }

      // Crear mapa de ausencias de media jornada: "empleadoId_fecha" -> periodo
      ausenciasMedioDiaPorFecha = new Map<string, AusenciaMedioDia>();
      for (const ausencia of ausenciasMedioDia) {
        const current = new Date(ausencia.fechaInicio);
        while (current <= ausencia.fechaFin) {
          const fechaKey = `${ausencia.empleadoId}_${format(toMadridDate(current), 'yyyy-MM-dd')}`;
          ausenciasMedioDiaPorFecha.set(fechaKey, {
            empleadoId: ausencia.empleadoId,
            periodo: ausencia.periodo as 'manana' | 'tarde',
          });
          current.setDate(current.getDate() + 1);
        }
      }

      const where: Prisma.fichajesWhereInput = {
        empresaId: session.user.empresaId,
        estado: 'pendiente',
        fecha: fechaWhere,
      };

      if (Object.keys(empleadoWhere).length > 0) {
        where.empleado = empleadoWhere;
      }

      fichajesPendientes = await prisma.fichajes.findMany({
        where,
        include: {
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              equipos: {
                select: {
                  equipo: {
                    select: {
                      id: true,
                      nombre: true,
                    },
                  },
                },
                take: 1,
              },
              jornada: {
                select: jornadaSelectCompleta,
              },
            },
          },
          eventos: {
            orderBy: { hora: 'asc' },
            select: {
              id: true,
              tipo: true,
              hora: true,
            },
          },
        },
        orderBy: {
          fecha: 'asc',
        },
      });

      // Filtrar fichajes de empleados con ausencia de día completo
      fichajesPendientes = fichajesPendientes.filter((fichaje) => {
        const fechaKey = format(toMadridDate(fichaje.fecha), 'yyyy-MM-dd');
        const empleadosConAusencia = empleadosConAusenciaPorFecha.get(fechaKey);
        return !empleadosConAusencia?.has(fichaje.empleadoId);
      });
    } catch (prismaError) {
      console.error('[API Revisión] Error en Prisma query:', prismaError);
      throw prismaError;
    }

    console.log('[API Revisión] Encontrados:', fichajesPendientes.length, 'fichajes pendientes');

    // Formatear datos para el modal
    const fichajes = fichajesPendientes.map((fichaje) => {
      // PUNTO 1: Usar toMadridDate para normalizar fechas y evitar desfases
      const fechaBase = toMadridDate(fichaje.fecha);
      const fechaFormateada = format(fechaBase, 'yyyy-MM-dd');
      
      const eventosRegistrados = fichaje.eventos.map((evento) => ({
        tipo: evento.tipo,
        hora: evento.hora.toISOString(),
        origen: 'registrado' as const,
      }));

      // PUNTO 5: Verificar si tiene ausencia de media jornada
      const ausenciaMedioDiaKey = `${fichaje.empleadoId}_${fechaFormateada}`;
      const ausenciaMedioDia = ausenciasMedioDiaPorFecha.get(ausenciaMedioDiaKey);
      
      // Calcular vista previa propuesta basándose en la jornada asignada del empleado
      const eventosPropuestos: { tipo: string; hora: string; origen: 'propuesto' }[] = [];
      try {
        const jornada = fichaje.empleado?.jornada;
        if (jornada?.config) {
          const nombreDia = obtenerNombreDia(fechaBase);
          const configJornada = jornada.config as unknown as ConfigJornada;
          const confDia = configJornada[nombreDia] as ConfigDiaJornada | undefined;
          
          // Helper para crear fecha con hora específica
          const setHora = (base: Date, hhmm: string) => {
            const [h, m] = hhmm.split(':').map(Number);
            const d = new Date(base);
            d.setHours(h || 0, m || 0, 0, 0);
            return d.toISOString();
          };
          
          // Verificar si el día está activo y tiene horarios
          const diaActivo = confDia?.activo !== false && (confDia?.entrada || configJornada.tipo === 'flexible');
          
          if (diaActivo) {
            // PUNTO 5: Ajustar eventos según ausencia de media jornada
            // - Si ausencia de mañana: NO proponer entrada ni pausas, SÍ proponer salida
            // - Si ausencia de tarde: SÍ proponer entrada, NO proponer pausas ni salida
            const tieneAusenciaManana = ausenciaMedioDia?.periodo === 'manana';
            const tieneAusenciaTarde = ausenciaMedioDia?.periodo === 'tarde';
            
            // ENTRADA - Solo si no hay ausencia de mañana
            if (!tieneAusenciaManana && confDia?.entrada) {
              eventosPropuestos.push({ tipo: 'entrada', hora: setHora(fechaBase, confDia.entrada), origen: 'propuesto' });
            }
            
            // PUNTO 2: Pausas OBLIGATORIAS si hay descanso configurado (y no hay ausencia de medio día)
            if (!ausenciaMedioDia) {
              let duracionPausaMinutos = 0;
              
              // Prioridad 1: Pausas fijas definidas en el día
              if (confDia?.pausa_inicio && confDia?.pausa_fin) {
                const ini = getMinutesFromHHMM(confDia.pausa_inicio);
                const fin = getMinutesFromHHMM(confDia.pausa_fin);
                duracionPausaMinutos = Math.max(0, fin - ini);
              } 
              // Prioridad 2: descansoMinimo (aplica tanto a fija como flexible)
              else if (typeof configJornada.descansoMinimo === 'string' && configJornada.descansoMinimo !== '00:00') {
                duracionPausaMinutos = getMinutesFromHHMM(configJornada.descansoMinimo);
              }

              if (duracionPausaMinutos > 0) {
                // Buscar si existe pausa_inicio registrada
                const pausaInicioReal = fichaje.eventos.find(e => e.tipo === 'pausa_inicio');
                
                if (pausaInicioReal) {
                  // Si existe inicio real, proponer fin relativo a la duración
                  const finCalculado = new Date(pausaInicioReal.hora.getTime() + duracionPausaMinutos * 60000);
                  eventosPropuestos.push({ tipo: 'pausa_fin', hora: finCalculado.toISOString(), origen: 'propuesto' });
                } else if (confDia?.pausa_inicio && confDia?.pausa_fin) {
                  // Si hay horario fijo de pausas, usar esos
                  eventosPropuestos.push({ tipo: 'pausa_inicio', hora: setHora(fechaBase, confDia.pausa_inicio), origen: 'propuesto' });
                  eventosPropuestos.push({ tipo: 'pausa_fin', hora: setHora(fechaBase, confDia.pausa_fin), origen: 'propuesto' });
                } else if (confDia?.entrada && confDia?.salida) {
                  // Calcular pausas en mitad de jornada
                  const entradaMinutos = getMinutesFromHHMM(confDia.entrada);
                  const salidaMinutos = getMinutesFromHHMM(confDia.salida);
                  const mitadJornada = entradaMinutos + Math.floor((salidaMinutos - entradaMinutos) / 2);
                  const pausaInicioMinutos = mitadJornada - Math.floor(duracionPausaMinutos / 2);
                  const pausaFinMinutos = pausaInicioMinutos + duracionPausaMinutos;
                  
                  const pausaInicioHora = `${Math.floor(pausaInicioMinutos / 60).toString().padStart(2, '0')}:${(pausaInicioMinutos % 60).toString().padStart(2, '0')}`;
                  const pausaFinHora = `${Math.floor(pausaFinMinutos / 60).toString().padStart(2, '0')}:${(pausaFinMinutos % 60).toString().padStart(2, '0')}`;
                  
                  eventosPropuestos.push({ tipo: 'pausa_inicio', hora: setHora(fechaBase, pausaInicioHora), origen: 'propuesto' });
                  eventosPropuestos.push({ tipo: 'pausa_fin', hora: setHora(fechaBase, pausaFinHora), origen: 'propuesto' });
                }
              }
            }

            // SALIDA - Solo si no hay ausencia de tarde
            if (!tieneAusenciaTarde && confDia?.salida) {
              eventosPropuestos.push({ tipo: 'salida', hora: setHora(fechaBase, confDia.salida), origen: 'propuesto' });
            }
          }
        }
      } catch (e) {
        console.warn('[API Revisión] No se pudo construir vista previa por jornada:', e);
      }
      
      // Determinar eventos faltantes (los propuestos que no están registrados)
      const tiposEventosRegistrados = fichaje.eventos.map(e => e.tipo);
      const eventosFaltantes: string[] = [];
      
      if (eventosPropuestos.length > 0) {
        for (const evento of eventosPropuestos) {
          if (!tiposEventosRegistrados.includes(evento.tipo)) {
            eventosFaltantes.push(evento.tipo);
          }
        }
      } else {
        // Fallback básico si no hay jornada configurada
        if (!tiposEventosRegistrados.includes('entrada')) eventosFaltantes.push('entrada');
        if (!tiposEventosRegistrados.includes('salida')) eventosFaltantes.push('salida');
      }
      
      // PUNTO 3: Eliminar texto redundante - la razón solo para fichajes incompletos
      // No mostrar "Sin fichajes registrados" porque ya está en eventos faltantes
      const razon = fichaje.eventos.length > 0 ? 'Fichaje incompleto' : '';

      const equipoInfo = fichaje.empleado?.equipos?.[0]?.equipo ?? null;

      // PUNTO 6: Filtrar eventos propuestos para devolver solo los que FALTAN (no los ya registrados)
      const eventosPropuestosFiltrados = eventosPropuestos.filter(
        ep => !tiposEventosRegistrados.includes(ep.tipo)
      );

      return {
        id: fichaje.id,
        fichajeId: fichaje.id,
        empleadoId: fichaje.empleadoId,
        empleadoNombre: `${fichaje.empleado.nombre} ${fichaje.empleado.apellidos}`,
        equipoId: equipoInfo?.id ?? null,
        equipoNombre: equipoInfo?.nombre ?? null,
        fecha: fechaFormateada, // PUNTO 1: Fecha formateada consistentemente
        eventosRegistrados, // Eventos ya fichados (origen: 'registrado')
        eventosPropuestos: eventosPropuestosFiltrados, // PUNTO 6: Eventos sugeridos (origen: 'propuesto')
        razon,
        eventosFaltantes,
        tieneEventosRegistrados: fichaje.eventos.length > 0,
        ausenciaMedioDia: ausenciaMedioDia ? ausenciaMedioDia.periodo : null, // Info de ausencia media jornada
      };
    });

    console.log('[API Revisión] Fichajes formateados:', fichajes.length);

    return NextResponse.json({ fichajes }, { status: 200 });

  } catch (error) {
    console.error('[API Revisión] Error en GET:', error);
    return NextResponse.json(
      { error: 'Error al obtener fichajes en revisión' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json() as Record<string, unknown>;
    const validation = revisionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', detalles: validation.error.issues },
        { status: 400 }
      );
    }

    const { revisiones } = validation.data;

    console.log('[API Revisión] Procesando revisiones:', revisiones.length);

    let actualizados = 0;
    const errores: string[] = [];

    for (const { id, accion } of revisiones) {
      try {
        // CAMBIO: Ahora el 'id' es directamente el fichajeId
        const fichajeId = id;

        if (accion === 'descartar') {
          const fichaje = await prisma.fichajes.findUnique({
            where: { id: fichajeId },
            include: {
              eventos: true,
              empleado: {
                select: {
                  nombre: true,
                  apellidos: true,
                },
              },
            },
          });

          if (!fichaje) {
            errores.push(`ID ${id}: Fichaje no encontrado`);
            continue;
          }

          if (fichaje.empresaId !== session.user.empresaId) {
            errores.push(`ID ${id}: No autorizado (diferente empresa)`);
            continue;
          }

          if (fichaje.eventos.length > 0) {
            errores.push(`ID ${id}: Solo se pueden descartar días sin fichajes`);
            continue;
          }

          await prisma.fichajes.update({
            where: { id: fichajeId },
            data: {
              estado: 'finalizado',
              horasTrabajadas: 0,
              horasEnPausa: 0,
              autoCompletado: false,
              fechaAprobacion: new Date(),
            },
          });

          actualizados++;
          continue;
        }

        if (accion === 'actualizar') {
          const fichaje = await prisma.fichajes.findUnique({
            where: { id: fichajeId },
            include: { 
              eventos: true,
              empleado: { include: { jornada: true } },
            },
          });

          if (!fichaje) {
            errores.push(`ID ${id}: Fichaje no encontrado`);
            continue;
          }

          // Verificar que el fichaje pertenece a la empresa del usuario
          if (fichaje.empresaId !== session.user.empresaId) {
            errores.push(`ID ${id}: No autorizado (diferente empresa)`);
            continue;
          }

          // Construir el fichaje completo SEGÚN JORNADA asignada del empleado para ese día
          const fechaDia = new Date(fichaje.fecha);
          const jornadaEmpleado = fichaje.empleado?.jornada;

          // Utilidad para parsear HH:mm en la fecha concreta
          const setHora = (base: Date, hhmm: string): Date => {
            const [h, m] = hhmm.split(':').map(Number);
            const d = new Date(base);
            d.setHours(h || 0, m || 0, 0, 0);
            return d;
          };

          // Mapear nombre de día
          const nombreDia = obtenerNombreDia(fechaDia);

          const eventosAcrear: { tipo: 'entrada'|'pausa_inicio'|'pausa_fin'|'salida'; hora: Date }[] = [];
          const eventosExistentesOrdenados = [...fichaje.eventos].sort(
            (a, b) => new Date(a.hora).getTime() - new Date(b.hora).getTime()
          );

          const configJornadaEmpleado = jornadaEmpleado?.config ? (jornadaEmpleado.config as unknown) as ConfigJornada : null;
          let descansoMs = 0;
          if (configJornadaEmpleado && configJornadaEmpleado[nombreDia]) {
            const confDia = configJornadaEmpleado[nombreDia] as ConfigDiaJornada;
            if (confDia.entrada && confDia.salida) {
              if (confDia.pausa_inicio && confDia.pausa_fin) {
                const [pInicioH, pInicioM] = confDia.pausa_inicio.split(':').map(Number);
                const [pFinH, pFinM] = confDia.pausa_fin.split(':').map(Number);
                const minutosDescanso = (pFinH * 60 + (pFinM ?? 0)) - (pInicioH * 60 + (pInicioM ?? 0));
                if (minutosDescanso > 0) {
                  descansoMs = minutosDescanso * 60 * 1000;
                }
              } else if (typeof (configJornadaEmpleado as Record<string, unknown>).descansoMinimo === 'string') {
                const [descH, descM] = ((configJornadaEmpleado as Record<string, string>).descansoMinimo || '00:00')
                  .split(':')
                  .map(Number);
                const minutosDescanso = descH * 60 + (descM ?? 0);
                if (minutosDescanso > 0) {
                  descansoMs = minutosDescanso * 60 * 1000;
                }
              }

              eventosAcrear.push({ tipo: 'entrada', hora: setHora(fechaDia, confDia.entrada) });
              // Pausa opcional si está definida
              if (confDia.pausa_inicio && confDia.pausa_fin) {
                eventosAcrear.push({ tipo: 'pausa_inicio', hora: setHora(fechaDia, confDia.pausa_inicio) });
                eventosAcrear.push({ tipo: 'pausa_fin', hora: setHora(fechaDia, confDia.pausa_fin) });
              }
              eventosAcrear.push({ tipo: 'salida', hora: setHora(fechaDia, confDia.salida) });
            }
          }

          if (descansoMs > 0) {
            const enCurso = eventosExistentesOrdenados
              .filter((e) => e.tipo === 'pausa_inicio')
              .slice()
              .reverse()
              .find((inicio) => {
                const inicioHora = new Date(inicio.hora);
                return !eventosExistentesOrdenados.some(
                  (ev) => ev.tipo === 'pausa_fin' && new Date(ev.hora).getTime() > inicioHora.getTime()
                );
              });

            if (enCurso) {
              const finCalculado = new Date(new Date(enCurso.hora).getTime() + descansoMs);
              eventosAcrear.push({ tipo: 'pausa_fin', hora: finCalculado });
            }
          }

          // Fallback: si no hay jornada con horas, usar entrada existente y salida 8h después
          if (eventosAcrear.length === 0) {
            const entradaExistente = fichaje.eventos.find(e => e.tipo === 'entrada');
            if (entradaExistente) {
              const s = new Date(entradaExistente.hora);
              s.setHours(s.getHours() + 8);
              eventosAcrear.push({ tipo: 'entrada', hora: new Date(entradaExistente.hora) });
              eventosAcrear.push({ tipo: 'salida', hora: s });
            }
          }

          // Crear eventos que falten (no duplicar los ya existentes por tipo/hora)
          for (const ev of eventosAcrear) {
            const yaExiste = fichaje.eventos.some(e => e.tipo === ev.tipo && Math.abs(new Date(e.hora).getTime() - ev.hora.getTime()) < 60000);
            if (!yaExiste) {
              await prisma.fichaje_eventos.create({
                data: {
                  fichajeId: fichaje.id,
                  tipo: ev.tipo,
                  hora: ev.hora,
                },
              });
            }
          }

          const { calcularHorasTrabajadas, calcularTiempoEnPausa } = await import('@/lib/calculos/fichajes');

          const fichajeActualizado = await prisma.fichajes.findUnique({
            where: { id: fichajeId },
            include: { eventos: true },
          });

          if (fichajeActualizado) {
          const horasTrabajadas = calcularHorasTrabajadas(fichajeActualizado.eventos) ?? 0;
            const horasEnPausa = calcularTiempoEnPausa(fichajeActualizado.eventos);

            await prisma.fichajes.update({
              where: { id: fichajeId },
              data: {
                estado: 'finalizado',
                horasTrabajadas,
                horasEnPausa,
                autoCompletado: true,
                fechaAprobacion: new Date(),
              },
            });

            await crearNotificacionFichajeResuelto(
              prisma,
              {
                fichajeId,
                empresaId: session.user.empresaId,
                empleadoId: fichaje.empleadoId,
                empleadoNombre: `${fichaje.empleado.nombre} ${fichaje.empleado.apellidos}`,
                fecha: fichaje.fecha,
              },
              { actorUsuarioId: session.user.id }
            );
          }

          actualizados++;
        }
      } catch (error) {
        console.error(`[API Revisión] Error procesando ${id}:`, error);
        errores.push(`ID ${id}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    console.log('[API Revisión] Resultado:', { actualizados, errores: errores.length });

    return NextResponse.json({
      success: true,
      actualizados,
      errores,
    });

  } catch (error) {
    console.error('[API Revisión] Error en POST:', error);
    return NextResponse.json(
      { error: 'Error al procesar revisiones' },
      { status: 500 }
    );
  }
}
