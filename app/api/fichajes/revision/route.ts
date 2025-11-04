// ========================================
// API: Revisión de Fichajes
// ========================================
// GET: Obtener fichajes pendientes de revisión
// POST: Aprobar/rechazar fichajes en revisión

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  validateRequest,
  handleApiError,
  successResponse,
} from '@/lib/api-handler';
import { crearNotificacionFichajeResuelto } from '@/lib/notificaciones';
import { obtenerDiasSinFicharPorEmpleado } from '@/lib/calculos/dias-sin-fichar';
import { z } from 'zod';

const revisionSchema = z.object({
  revisiones: z.array(
    z.object({
      id: z.string(),
      accion: z.literal('actualizar'),
    })
  ).min(1, 'Debe proporcionar al menos una revisión'),
});

// GET /api/fichajes/revision - Obtener fichajes pendientes de revisión (solo HR Admin)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Obtener la fecha de hoy (inicio del día)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Obtener registros de auto_completados con estado "pendiente" (requieren revisión)
    // Solo fichajes de días ANTERIORES al día actual
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

      // Filtrar solo fichajes de días anteriores al día actual
      autoCompletados = autoCompletados.filter((ac) => {
        const datosOriginales = ac.datosOriginales as any;
        const fechaFichaje = datosOriginales?.fecha ? new Date(datosOriginales.fecha) : null;
        if (!fechaFichaje) return false;
        
        fechaFichaje.setHours(0, 0, 0, 0);
        return fechaFichaje < hoy;
      });
    } catch (prismaError) {
      console.error('[API Revisión] Error en Prisma query:', prismaError);
      throw prismaError;
    }

    // Formatear datos para el modal
    const fichajes = await Promise.all(autoCompletados.map(async (ac) => {
      const datosOriginales = ac.datosOriginales as any;
      const sugerencias = ac.sugerencias as any;

      const eventosExistentesRaw = Array.isArray(datosOriginales?.eventosExistentes)
        ? datosOriginales.eventosExistentes
        : Array.isArray(datosOriginales?.fichajesExistentes)
          ? datosOriginales.fichajesExistentes
          : [];

      const eventosRegistrados = eventosExistentesRaw.map((evento: any) => ({
        tipo: evento.tipo,
        hora: evento.hora,
        origen: 'registrado' as const,
      }));

      // Calcular vista previa propuesta basándose en la jornada asignada del empleado
      let previewEventos: { tipo: string; hora: string; origen: 'propuesto' }[] = [];
      try {
        const fichajeId = datosOriginales?.fichajeId as string | undefined;
        if (fichajeId) {
          const fichaje = await prisma.fichaje.findUnique({
            where: { id: fichajeId },
            include: { empleado: { include: { jornada: true } } },
          });
          const fechaBase = datosOriginales?.fecha ? new Date(datosOriginales.fecha) : new Date();
          const jornada = fichaje?.empleado?.jornada;
          if (jornada?.config) {
            const dias = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
            const nombreDia = dias[fechaBase.getDay()];
            const confDia: any = (jornada.config as any)[nombreDia];
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
        // Si no se puede construir vista previa por jornada, continuar sin ella
        console.warn('[API Revisión] No se pudo construir vista previa por jornada:', {
          autoCompletadoId: ac.id,
          empleadoId: ac.empleadoId,
          error: e,
        });
      }
      
      return {
        id: ac.id,
        fichajeId: datosOriginales?.fichajeId || null,
        empleadoId: ac.empleadoId,
        empleadoNombre: `${ac.empleado.nombre} ${ac.empleado.apellidos}`,
        fecha: datosOriginales?.fecha || new Date().toISOString(),
        eventos: previewEventos.length > 0 ? previewEventos : eventosRegistrados.map((e: any) => ({ ...e, origen: 'registrado' as const })),
        razon: sugerencias?.razon || 'Requiere revisión manual',
        confianza: sugerencias?.confianza || 0,
      };
    }));

    // Calcular días sin fichar para cada empleado
    const empleadoIds = Array.from(new Set(autoCompletados.map(ac => ac.empleadoId)));
    const diasSinFicharMap = await obtenerDiasSinFicharPorEmpleado(empleadoIds);

    return successResponse({ fichajes, diasSinFicharMap });

  } catch (error) {
    return handleApiError(error, 'API GET /api/fichajes/revision');
  }
}

// POST /api/fichajes/revision - Procesar revisiones de fichajes (solo HR Admin)
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(request, revisionSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const { revisiones } = validatedData;

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

          const datos = autoCompletado.datosOriginales as any;
          const sugerencias = autoCompletado.sugerencias as any;
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
          const diasSemana = ['domingo', 'lunes', 'miercoles','miercoles','jueves','viernes','sabado'];
          // Nota: above array seems wrong: fix mapping properly
          const dias = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
          const nombreDia = dias[fechaDia.getDay()];

          let eventosAcrear: { tipo: 'entrada'|'pausa_inicio'|'pausa_fin'|'salida'; hora: Date }[] = [];

          if (jornadaEmpleado?.config && (jornadaEmpleado.config as any)[nombreDia]?.activo) {
            const confDia = (jornadaEmpleado.config as any)[nombreDia];
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
          }

          await prisma.autoCompletado.update({
            where: { id },
            data: {
              estado: 'aprobado',
              aprobadoPor: session.user.id,
              aprobadoEn: new Date(),
            },
          });

          // Crear notificación de fichaje resuelto
          await crearNotificacionFichajeResuelto(prisma, {
            fichajeId,
            empresaId: session.user.empresaId,
            empleadoId: autoCompletado.empleadoId,
            empleadoNombre: `${autoCompletado.empleado.nombre} ${autoCompletado.empleado.apellidos}`,
            fecha: new Date(datos.fecha),
          });

          actualizados++;
        }
      } catch (error) {
        console.error(`[API Revisión] Error procesando ${id}:`, error);
        errores.push(`ID ${id}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    return successResponse({
      success: true,
      actualizados,
      errores,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/fichajes/revision');
  }
}

