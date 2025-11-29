// ========================================
// API: Revisión de Fichajes
// ========================================
// GET: Obtener fichajes pendientes de revisión
// POST: Aprobar/rechazar fichajes en revisión

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { procesarFichajesDia } from '@/lib/calculos/fichajes';
import { crearNotificacionFichajeResuelto } from '@/lib/notificaciones';
import { prisma, Prisma } from '@/lib/prisma';
import { jornadaSelectCompleta } from '@/lib/prisma/selects';
import { obtenerNombreDia } from '@/lib/utils/fechas';

// ========================================
// Types para datos JSON de Prisma
// ========================================

interface DatosOriginales {
  fichajeId?: string;
  fecha?: string;
  eventosExistentes?: Array<{ tipo: string; hora: string | Date }>;
  fichajesExistentes?: Array<{ tipo: string; hora: string | Date }>;
}

interface Sugerencias {
  razon?: string;
  confianza?: number;
  salidaSugerida?: string;
}

interface ConfigDiaJornada {
  activo?: boolean;
  entrada?: string;
  salida?: string;
  pausa_inicio?: string;
  pausa_fin?: string;
}

interface ConfigJornada {
  [key: string]: ConfigDiaJornada | unknown;
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
      `[API Revisión GET] Lazy recovery de fichajes para los últimos ${diasARecuperar} día(s) en empresa ${session.user.empresaId}`
    );

    for (let offset = 1; offset <= diasARecuperar; offset++) {
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
    console.log('[API Revisión GET] Buscando fichajes pendientes anteriores a hoy...');

    let fichajesPendientes;
    try {
      const fechaWhere: Prisma.DateTimeFilter = { lt: hoy };

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

      const empleadoWhere: Prisma.EmpleadoWhereInput = {};
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

      const where: Prisma.FichajeWhereInput = {
        empresaId: session.user.empresaId,
        estado: 'pendiente',
        fecha: fechaWhere,
      };

      if (Object.keys(empleadoWhere).length > 0) {
        where.empleado = empleadoWhere;
      }

      fichajesPendientes = await prisma.fichaje.findMany({
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
    } catch (prismaError) {
      console.error('[API Revisión] Error en Prisma query:', prismaError);
      throw prismaError;
    }

    console.log('[API Revisión] Encontrados:', fichajesPendientes.length, 'fichajes pendientes');

    // Formatear datos para el modal
    const fichajes = fichajesPendientes.map((fichaje) => {
      const eventosRegistrados = fichaje.eventos.map((evento) => ({
        tipo: evento.tipo,
        hora: evento.hora.toISOString(),
        origen: 'registrado' as const,
      }));

      // Calcular vista previa propuesta basándose en la jornada asignada del empleado
      const previewEventos: { tipo: string; hora: string; origen: 'propuesto' }[] = [];
      try {
        const fechaBase = new Date(fichaje.fecha);
        const jornada = fichaje.empleado?.jornada;
        if (jornada?.config) {
          const dias = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
          const nombreDia = dias[fechaBase.getDay()];
          const configJornada = (jornada.config as unknown) as ConfigJornada;
          const confDia = configJornada[nombreDia] as ConfigDiaJornada | undefined;
          
          if (confDia?.activo && confDia.entrada && confDia.salida) {
            const setHora = (base: Date, hhmm: string) => {
              const [h, m] = hhmm.split(':').map(Number);
              const d = new Date(base);
              d.setHours(h || 0, m || 0, 0, 0);
              return d.toISOString();
            };

            previewEventos.push({ tipo: 'entrada', hora: setHora(fechaBase, confDia.entrada), origen: 'propuesto' });
            
            // Pausa dinámica
            let duracionPausaMinutos = 0;
            if (confDia.pausa_inicio && confDia.pausa_fin) {
              const ini = getMinutesFromHHMM(confDia.pausa_inicio);
              const fin = getMinutesFromHHMM(confDia.pausa_fin);
              duracionPausaMinutos = Math.max(0, fin - ini);
            } else if (typeof (configJornada as any).descansoMinimo === 'string') {
               duracionPausaMinutos = getMinutesFromHHMM((configJornada as any).descansoMinimo || '00:00');
            }

            if (duracionPausaMinutos > 0) {
               // Buscar si existe pausa_inicio registrada
               const pausaInicioReal = fichaje.eventos.find(e => e.tipo === 'pausa_inicio');
               
               if (pausaInicioReal) {
                 // Si existe inicio real, proponer fin relativo a la duración
                 const finCalculado = new Date(pausaInicioReal.hora.getTime() + duracionPausaMinutos * 60000);
                 previewEventos.push({ tipo: 'pausa_fin', hora: finCalculado.toISOString(), origen: 'propuesto' });
               } else if (confDia.pausa_inicio && confDia.pausa_fin) {
                 // Si no hay inicio real, y hay horario fijo, proponer ambos fijos
                 previewEventos.push({ tipo: 'pausa_inicio', hora: setHora(fechaBase, confDia.pausa_inicio), origen: 'propuesto' });
                 previewEventos.push({ tipo: 'pausa_fin', hora: setHora(fechaBase, confDia.pausa_fin), origen: 'propuesto' });
               }
            }

            previewEventos.push({ tipo: 'salida', hora: setHora(fechaBase, confDia.salida), origen: 'propuesto' });
          }
        }
      } catch (e) {
        console.warn('[API Revisión] No se pudo construir vista previa por jornada:', e);
      }
      
      // Determinar razón por la que está pendiente
      let razon = 'Requiere revisión manual';
      if (fichaje.eventos.length === 0) {
        razon = 'Sin fichajes registrados en el día';
      } else if (fichaje.estado === 'en_curso') {
        razon = 'Fichaje incompleto (dejado en curso)';
      }

      // Determinar eventos faltantes (lógica básica, idealmente usar validarFichajeCompleto)
      const tiposEventos = fichaje.eventos.map(e => e.tipo);
      const eventosFaltantes: string[] = [];
      
      // Lógica mejorada para sugerir eventos faltantes basada en la jornada (si está disponible en preview)
      if (previewEventos.length > 0) {
        const tiposPreview = previewEventos.map(e => e.tipo);
        for (const tipo of tiposPreview) {
          if (!tiposEventos.includes(tipo)) {
            eventosFaltantes.push(tipo);
          }
        }
      } else {
        // Fallback básico
        if (!tiposEventos.includes('entrada')) eventosFaltantes.push('entrada');
        if (!tiposEventos.includes('salida')) eventosFaltantes.push('salida');
      }
      
      if (eventosFaltantes.length > 0) {
         if (razon === 'Requiere revisión manual' || razon.includes('Fichaje incompleto')) {
             const nombresEventos = eventosFaltantes.map(e => e.replace('_', ' '));
             razon = `Faltan eventos: ${nombresEventos.join(', ')}`;
         }
      }

      const equipoInfo = fichaje.empleado?.equipos?.[0]?.equipo ?? null;

      return {
        id: fichaje.id, // Usar el ID del fichaje directamente
        fichajeId: fichaje.id,
        empleadoId: fichaje.empleadoId,
        empleadoNombre: `${fichaje.empleado.nombre} ${fichaje.empleado.apellidos}`,
        equipoId: equipoInfo?.id ?? null,
        equipoNombre: equipoInfo?.nombre ?? null,
        fecha: fichaje.fecha.toISOString(),
        eventos: previewEventos.length > 0 ? previewEventos : eventosRegistrados,
        eventosRegistrados, // Campo esperado por el modal
        razon,
        eventosFaltantes, // Campo esperado por el modal
        confianza: 0,
        tieneEventosRegistrados: fichaje.eventos.length > 0,
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
          const fichaje = await prisma.fichaje.findUnique({
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

          await prisma.fichaje.update({
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
          const fichaje = await prisma.fichaje.findUnique({
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
              await prisma.fichajeEvento.create({
                data: {
                  fichajeId: fichaje.id,
                  tipo: ev.tipo,
                  hora: ev.hora,
                },
              });
            }
          }

          const { calcularHorasTrabajadas, calcularTiempoEnPausa } = await import('@/lib/calculos/fichajes');

          const fichajeActualizado = await prisma.fichaje.findUnique({
            where: { id: fichajeId },
            include: { eventos: true },
          });

          if (fichajeActualizado) {
          const horasTrabajadas = calcularHorasTrabajadas(fichajeActualizado.eventos) ?? 0;
            const horasEnPausa = calcularTiempoEnPausa(fichajeActualizado.eventos);

            await prisma.fichaje.update({
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
