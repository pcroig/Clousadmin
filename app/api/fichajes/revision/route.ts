// ========================================
// API: Revisión de Fichajes
// ========================================
// GET: Obtener fichajes pendientes de revisión
// POST: Aprobar/rechazar fichajes en revisión

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getSession } from '@/lib/auth';
import { crearNotificacionFichajeResuelto } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
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

const revisionSchema = z.object({
  revisiones: z.array(
    z.object({
      id: z.string(),
      accion: z.literal('actualizar'),
    })
  ).min(1, 'Debe proporcionar al menos una revisión'),
});

export async function GET(_request: NextRequest) {
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

    // Obtener registros de auto_completados con estado "pendiente" (requieren revisión)
    let autoCompletados;
    try {
      autoCompletados = await prisma.autoCompletado.findMany({
        where: {
          empresaId: session.user.empresaId,
          estado: 'pendiente',
          tipo: 'fichaje_revision',
        },
        include: {
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    } catch (prismaError) {
      console.error('[API Revisión] Error en Prisma query:', prismaError);
      throw prismaError;
    }

    console.log('[API Revisión] Encontrados:', autoCompletados.length, 'fichajes');

    const fichajeIds = Array.from(
      new Set(
        autoCompletados
          .map((ac) => {
            const datosOriginales = ac.datosOriginales as DatosOriginales | null;
            return typeof datosOriginales?.fichajeId === 'string' ? datosOriginales.fichajeId : null;
          })
          .filter((id): id is string => Boolean(id))
      )
    );

    const fichajesBatch = fichajeIds.length
      ? await prisma.fichaje.findMany({
          where: { id: { in: fichajeIds } },
          select: {
            id: true,
            fecha: true,
            empleado: {
              select: {
                id: true,
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
        })
      : [];

    const fichajesMap = new Map(fichajesBatch.map((fichaje) => [fichaje.id, fichaje]));

    // Formatear datos para el modal (síncronamente, ya no hay queries dentro)
    const fichajes = autoCompletados.map((ac) => {
      const datosOriginales = (ac.datosOriginales as unknown) as DatosOriginales | null;
      const sugerencias = (ac.sugerencias as unknown) as Sugerencias | null;

      const eventosExistentesRaw = Array.isArray(datosOriginales?.eventosExistentes)
        ? datosOriginales.eventosExistentes
        : Array.isArray(datosOriginales?.fichajesExistentes)
          ? datosOriginales.fichajesExistentes
          : [];

      const eventosRegistrados = eventosExistentesRaw.map((evento: { tipo: string; hora: string | Date }) => ({
        tipo: evento.tipo,
        hora: evento.hora,
        origen: 'registrado' as const,
      }));

      // Calcular vista previa propuesta basándose en la jornada asignada del empleado
      const previewEventos: { tipo: string; hora: string; origen: 'propuesto' }[] = [];
      try {
        const fichajeId = typeof datosOriginales?.fichajeId === 'string' ? datosOriginales.fichajeId : undefined;
        if (fichajeId) {
          const fichaje = fichajesMap.get(fichajeId);
          const fechaBase = datosOriginales?.fecha ? new Date(datosOriginales.fecha) : new Date();
          const jornada = fichaje?.empleado?.jornada;
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
              if (confDia.pausa_inicio && confDia.pausa_fin) {
                previewEventos.push({ tipo: 'pausa_inicio', hora: setHora(fechaBase, confDia.pausa_inicio), origen: 'propuesto' });
                previewEventos.push({ tipo: 'pausa_fin', hora: setHora(fechaBase, confDia.pausa_fin), origen: 'propuesto' });
              }
              previewEventos.push({ tipo: 'salida', hora: setHora(fechaBase, confDia.salida), origen: 'propuesto' });
            }
          }
        }
      } catch (e) {
        console.warn('[API Revisión] No se pudo construir vista previa por jornada:', e);
      }
      
      return {
        id: ac.id,
        fichajeId: datosOriginales?.fichajeId || null,
        empleadoId: ac.empleadoId,
        empleadoNombre: `${ac.empleado.nombre} ${ac.empleado.apellidos}`,
        fecha: datosOriginales?.fecha || new Date().toISOString(),
        eventos: previewEventos.length > 0 ? previewEventos : eventosRegistrados.map((e) => ({ ...e, origen: 'registrado' as const })),
        razon: sugerencias?.razon || 'Requiere revisión manual',
        confianza: sugerencias?.confianza || 0,
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

    const body = await request.json() as Record<string, any>;
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
        const autoCompletado = await prisma.autoCompletado.findUnique({
          where: { id },
          include: { empleado: true },
        });

        if (!autoCompletado) {
          errores.push(`ID ${id}: No encontrado`);
          continue;
        }

        const datos = (autoCompletado.datosOriginales as unknown) as DatosOriginales | null;
        const sugerencias = (autoCompletado.sugerencias as unknown) as Sugerencias | null;

        if (!datos) {
          errores.push(`ID ${id}: No hay datos originales para reconstruir el fichaje`);
          continue;
        }

        const fichajeId = datos.fichajeId;

        if (accion === 'actualizar') {
          if (!fichajeId) {
            errores.push(`ID ${id}: No se encontró fichajeId`);
            continue;
          }

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

          const configJornadaEmpleado = jornadaEmpleado?.config ? (jornadaEmpleado.config as unknown) as ConfigJornada : null;
          if (configJornadaEmpleado && configJornadaEmpleado[nombreDia]) {
            const confDia = configJornadaEmpleado[nombreDia] as ConfigDiaJornada;
            if (confDia.entrada && confDia.salida) {
              eventosAcrear.push({ tipo: 'entrada', hora: setHora(fechaDia, confDia.entrada) });
              // Pausa opcional si está definida
              if (confDia.pausa_inicio && confDia.pausa_fin) {
                eventosAcrear.push({ tipo: 'pausa_inicio', hora: setHora(fechaDia, confDia.pausa_inicio) });
                eventosAcrear.push({ tipo: 'pausa_fin', hora: setHora(fechaDia, confDia.pausa_fin) });
              }
              eventosAcrear.push({ tipo: 'salida', hora: setHora(fechaDia, confDia.salida) });
            }
          }

          // Fallback: si no hay jornada con horas, usar entrada existente y salida sugerida/8h después
          if (eventosAcrear.length === 0) {
            const entradaExistente = fichaje.eventos.find(e => e.tipo === 'entrada');
            let salidaHora: Date | null = null;
            if (sugerencias?.salidaSugerida) {
              salidaHora = new Date(sugerencias.salidaSugerida);
            } else if (entradaExistente) {
              const s = new Date(entradaExistente.hora);
              s.setHours(s.getHours() + 8);
              salidaHora = s;
            }
            if (entradaExistente) {
              eventosAcrear.push({ tipo: 'entrada', hora: new Date(entradaExistente.hora) });
            }
            if (salidaHora) {
              eventosAcrear.push({ tipo: 'salida', hora: salidaHora });
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
            const horasTrabajadas = calcularHorasTrabajadas(fichajeActualizado.eventos);
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

            await crearNotificacionFichajeResuelto(prisma, {
              fichajeId,
              empresaId: session.user.empresaId,
              empleadoId: autoCompletado.empleadoId,
              empleadoNombre: `${autoCompletado.empleado.nombre} ${autoCompletado.empleado.apellidos}`,
              fecha: fichaje.fecha,
            });
          }

          await prisma.autoCompletado.update({
            where: { id },
            data: {
              estado: 'aprobado',
              aprobadoPor: session.user.id,
              aprobadoEn: new Date(),
            },
          });

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

