// ========================================
// API Fichajes Editar Batch - Edición por lotes
// ========================================
// Sistema de edición optimista: todos los cambios se aplican inmediatamente
// El empleado puede rechazar en 48h, lo cual revierte TODOS los cambios

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { format } from 'date-fns';

import {
  handleApiError,
  isNextResponse,
  notFoundResponse,
  requireAuth,
  successResponse,
  validateRequest,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/api-handler';
import { calcularHorasTrabajadas, calcularTiempoEnPausa, validarFichajeCompleto } from '@/lib/calculos/fichajes';
import { prisma } from '@/lib/prisma';
import { idSchema } from '@/lib/validaciones/schemas';

// Schemas de validación
const cambioEventoSchema = z.discriminatedUnion('accion', [
  z.object({
    accion: z.literal('crear'),
    tipo: z.enum(['entrada', 'pausa_inicio', 'pausa_fin', 'salida']),
    hora: z.string(),
  }),
  z.object({
    accion: z.literal('editar'),
    eventoId: idSchema,
    hora: z.string().optional(),
    tipo: z.enum(['entrada', 'pausa_inicio', 'pausa_fin', 'salida']).optional(),
  }),
  z.object({
    accion: z.literal('eliminar'),
    eventoId: idSchema,
  }),
]);

const editarBatchSchema = z.object({
  fichajeId: idSchema,
  cambios: z.array(cambioEventoSchema).min(1, 'Debe haber al menos un cambio'),
  motivo: z.string(), // Motivo opcional, sin validación de longitud mínima
});

// Helper: Simular cambios para validar secuencia
function simularCambios(
  eventosOriginales: Array<{ id: string; tipo: string; hora: Date }>,
  cambios: z.infer<typeof cambioEventoSchema>[]
): Array<{ tipo: string; hora: Date }> {
  // Crear un mapa para acceso rápido por ID
  const eventosMap = new Map(eventosOriginales.map(e => [e.id, { ...e }]));

  // IDs de eventos a eliminar
  const idsAEliminar = new Set<string>();

  // Eventos nuevos a crear
  const eventosNuevos: Array<{ id: string; tipo: string; hora: Date }> = [];

  // Procesar cambios
  for (const cambio of cambios) {
    if (cambio.accion === 'crear') {
      eventosNuevos.push({
        id: `temp_${eventosNuevos.length}`,
        tipo: cambio.tipo,
        hora: new Date(cambio.hora),
      });
    } else if (cambio.accion === 'editar') {
      const evento = eventosMap.get(cambio.eventoId);
      if (evento) {
        evento.tipo = cambio.tipo ?? evento.tipo;
        evento.hora = cambio.hora ? new Date(cambio.hora) : evento.hora;
      }
    } else if (cambio.accion === 'eliminar') {
      idsAEliminar.add(cambio.eventoId);
    }
  }

  // Combinar eventos: originales (editados y no eliminados) + nuevos
  const eventosCombinados = [
    ...Array.from(eventosMap.values()).filter(e => !idsAEliminar.has(e.id)),
    ...eventosNuevos
  ];

  // Ordenar por hora y retornar solo tipo y hora
  return eventosCombinados
    .sort((a, b) => a.hora.getTime() - b.hora.getTime())
    .map(e => ({ tipo: e.tipo, hora: e.hora }));
}

// Helper: Validar secuencia de eventos
function validarSecuenciaEventos(eventos: Array<{ tipo: string; hora: Date }>): { valido: boolean; error?: string } {
  if (eventos.length === 0) {
    return { valido: true }; // Fichaje vacío es válido
  }

  let estadoEsperado = 'sin_fichar';

  for (let i = 0; i < eventos.length; i++) {
    const evento = eventos[i];
    const anterior = eventos[i - 1];

    // Formatear hora para mensajes de error
    const horaFormateada = evento.hora.toTimeString().substring(0, 5);
    const horaAnteriorFormateada = anterior ? anterior.hora.toTimeString().substring(0, 5) : '';

    // Validar que la hora sea posterior al evento anterior
    if (anterior && evento.hora < anterior.hora) {
      return {
        valido: false,
        error: `El evento "${evento.tipo}" a las ${horaFormateada} tiene una hora anterior al evento "${anterior.tipo}" a las ${horaAnteriorFormateada}`,
      };
    }

    // Validar transiciones de estado
    switch (evento.tipo) {
      case 'entrada':
        if (estadoEsperado !== 'sin_fichar' && estadoEsperado !== 'finalizado') {
          return {
            valido: false,
            error: `No se puede registrar "entrada" a las ${horaFormateada}: ya existe una entrada activa (evento ${i + 1} de ${eventos.length})`
          };
        }
        estadoEsperado = 'trabajando';
        break;

      case 'pausa_inicio':
        if (estadoEsperado !== 'trabajando') {
          const eventosAnteriores = eventos.slice(0, i).map(e => `${e.tipo} (${e.hora.toTimeString().substring(0, 5)})`).join(', ');
          return {
            valido: false,
            error: `No se puede iniciar pausa a las ${horaFormateada}: debe haber una entrada antes. Eventos anteriores: ${eventosAnteriores || 'ninguno'}`
          };
        }
        estadoEsperado = 'en_pausa';
        break;

      case 'pausa_fin':
        if (estadoEsperado !== 'en_pausa') {
          return {
            valido: false,
            error: `No se puede finalizar pausa a las ${horaFormateada}: debe haber un inicio de pausa antes (evento ${i + 1} de ${eventos.length})`
          };
        }
        estadoEsperado = 'trabajando';
        break;

      case 'salida':
        if (estadoEsperado === 'sin_fichar' || estadoEsperado === 'finalizado') {
          return {
            valido: false,
            error: `No se puede registrar "salida" a las ${horaFormateada}: no hay jornada iniciada (evento ${i + 1} de ${eventos.length})`
          };
        }
        estadoEsperado = 'finalizado';
        break;

      default:
        return { valido: false, error: `Tipo de evento inválido: "${evento.tipo}"` };
    }
  }

  return { valido: true };
}

// POST /api/fichajes/editar-batch - Editar fichaje con sistema optimista
export async function POST(req: NextRequest) {
  try {
    // 1. Autenticación
    const authResult = await requireAuth(req);
    if (isNextResponse(authResult)) return authResult;
    const { session } = authResult;

    // Solo HR Admin puede editar por lotes
    if (!session.user.empleadoId) {
      return forbiddenResponse('Solo HR puede editar fichajes');
    }

    // 2. Validar request body
    const validationResult = await validateRequest(req, editarBatchSchema);
    if (isNextResponse(validationResult)) return validationResult;
    const { data: validatedData } = validationResult;

    const { fichajeId, cambios, motivo } = validatedData;

    // 3. Verificar que el fichaje existe
    const fichaje = await prisma.fichajes.findUnique({
      where: { id: fichajeId },
      include: {
        eventos: {
          orderBy: { hora: 'asc' },
        },
        empleado: {
          select: { id: true, nombre: true, apellidos: true },
        },
      },
    });

    if (!fichaje || fichaje.empresaId !== session.user.empresaId) {
      return notFoundResponse('Fichaje no encontrado');
    }

    // CRÍTICO: Validar que el fichaje NO esté rechazado
    if (fichaje.estado === 'rechazado') {
      return badRequestResponse('Este fichaje fue rechazado y no se puede editar');
    }

    // CRÍTICO: No permitir editar fichajes propios
    if (session.user.empleadoId === fichaje.empleadoId) {
      return forbiddenResponse('No puedes editar tus propios fichajes');
    }

    // 4. Simular cambios y validar secuencia (ANTES de transacción para fail-fast)
    const eventosSimulados = simularCambios(fichaje.eventos, cambios);
    const validacion = validarSecuenciaEventos(eventosSimulados);

    if (!validacion.valido) {
      // Log detallado para debugging
      console.error('[API Editar-Batch] Validación de secuencia falló:', {
        error: validacion.error,
        eventosOriginales: fichaje.eventos.map(e => ({
          id: e.id,
          tipo: e.tipo,
          hora: e.hora.toISOString(),
        })),
        cambiosRecibidos: cambios,
        eventosSimulados: eventosSimulados.map(e => ({
          tipo: e.tipo,
          hora: e.hora.toISOString(),
        })),
      });

      return badRequestResponse(validacion.error || 'Secuencia de eventos inválida');
    }

    // 5. Aplicar cambios en TRANSACCIÓN
    const resultado = await prisma.$transaction(async (tx) => {
      // CRÍTICO: Verificar edición pendiente DENTRO de transacción (previene race condition)
      const edicionPendiente = await tx.ediciones_fichaje_pendientes.findFirst({
        where: {
          fichajeId,
          estado: 'pendiente',
        },
      });

      if (edicionPendiente) {
        throw new Error(
          'Este fichaje ya tiene una edición pendiente de aprobación. ' +
          'Espera a que el empleado la apruebe o rechace (o que expire en 48h) antes de editarlo nuevamente.'
        );
      }
      const cambiosAplicados: any[] = [];

      // Procesar cada cambio
      for (const cambio of cambios) {
        switch (cambio.accion) {
          case 'crear': {
            const nuevoEvento = await tx.fichaje_eventos.create({
              data: {
                fichajeId,
                tipo: cambio.tipo,
                hora: new Date(cambio.hora),
                editado: true,
                motivoEdicion: motivo,
              },
            });
            cambiosAplicados.push({
              accion: 'crear',
              tipo: cambio.tipo,
              hora: cambio.hora,
              eventoId: nuevoEvento.id,
            });
            break;
          }

          case 'editar': {
            const eventoOriginal = await tx.fichaje_eventos.findUnique({
              where: { id: cambio.eventoId },
            });

            if (!eventoOriginal) {
              throw new Error(`Evento ${cambio.eventoId} no encontrado`);
            }

            await tx.fichaje_eventos.update({
              where: { id: cambio.eventoId },
              data: {
                tipo: cambio.tipo ?? eventoOriginal.tipo,
                hora: cambio.hora ? new Date(cambio.hora) : eventoOriginal.hora,
                editado: true,
                motivoEdicion: motivo,
                horaOriginal: eventoOriginal.horaOriginal ?? eventoOriginal.hora,
              },
            });

            cambiosAplicados.push({
              accion: 'editar',
              eventoId: cambio.eventoId,
              camposAnteriores: {
                hora: eventoOriginal.hora.toISOString(),
                tipo: eventoOriginal.tipo,
                editado: eventoOriginal.editado,
                motivoEdicion: eventoOriginal.motivoEdicion,
                horaOriginal: eventoOriginal.horaOriginal?.toISOString(),
              },
              camposNuevos: {
                hora: cambio.hora ?? eventoOriginal.hora.toISOString(),
                tipo: cambio.tipo ?? eventoOriginal.tipo,
              },
            });
            break;
          }

          case 'eliminar': {
            const eventoEliminado = await tx.fichaje_eventos.findUnique({
              where: { id: cambio.eventoId },
            });

            if (!eventoEliminado) {
              throw new Error(`Evento ${cambio.eventoId} no encontrado`);
            }

            await tx.fichaje_eventos.delete({
              where: { id: cambio.eventoId },
            });

            cambiosAplicados.push({
              accion: 'eliminar',
              eventoId: cambio.eventoId,
              eventoEliminado: {
                tipo: eventoEliminado.tipo,
                hora: eventoEliminado.hora.toISOString(),
                editado: eventoEliminado.editado,
                motivoEdicion: eventoEliminado.motivoEdicion,
                horaOriginal: eventoEliminado.horaOriginal?.toISOString(),
              },
            });
            break;
          }
        }
      }

      // 6. Recalcular horas y estado
      const fichajeActualizado = await tx.fichajes.findUnique({
        where: { id: fichajeId },
        include: {
          eventos: { orderBy: { hora: 'asc' } },
        },
      });

      if (!fichajeActualizado) {
        throw new Error('Error al actualizar fichaje');
      }

      const horasTrabajadas = calcularHorasTrabajadas(fichajeActualizado.eventos) ?? 0;
      const horasEnPausa = calcularTiempoEnPausa(fichajeActualizado.eventos);

      // Determinar nuevo estado
      const validacionCompleto = await validarFichajeCompleto(fichajeId);
      let nuevoEstado = fichaje.estado;
      if (validacionCompleto.completo) {
        nuevoEstado = 'finalizado';
      } else if (fichajeActualizado.eventos.length === 0) {
        nuevoEstado = 'pendiente';
      } else if (fichaje.estado === 'finalizado') {
        nuevoEstado = 'en_curso';
      }

      await tx.fichajes.update({
        where: { id: fichajeId },
        data: {
          horasTrabajadas,
          horasEnPausa,
          estado: nuevoEstado,
        },
      });

      // 7. Obtener datos del editor
      const empleadoIdEditor = session.user.empleadoId!; // Ya validado en línea 147
      const editor = await tx.empleados.findUnique({
        where: { id: empleadoIdEditor },
        select: { nombre: true, apellidos: true },
      });
      const nombreEditor = editor ? `${editor.nombre} ${editor.apellidos}` : 'Administrador';

      // 8. Obtener usuario del empleado (puede ser null si no tiene acceso)
      const usuarioEmpleado = await tx.usuarios.findUnique({
        where: { empleadoId: fichaje.empleadoId },
        select: { id: true },
      });

      // 9. Crear notificación y edición pendiente SOLO si el empleado tiene usuario
      let notificacionId: string | null = null;

      if (usuarioEmpleado) {
        // 9a. Crear notificación especial con botón de rechazo
        const notificacion = await tx.notificaciones.create({
          data: {
            empresaId: session.user.empresaId,
            usuarioId: usuarioEmpleado.id,
            tipo: 'fichaje_editado_batch',
            prioridad: 'alta',
            mensaje: `${nombreEditor} ha editado tu fichaje del ${format(fichaje.fecha, 'dd/MM/yyyy')}. Motivo: ${motivo}`,
            enlace: '/empleado/horario/fichajes',
            textoBoton: 'Ver cambios',
            accionBoton: 'rechazar_edicion',
            leida: false,
          },
        });
        notificacionId = notificacion.id;

        // 9b. Crear registro de edición pendiente (48h para rechazar)
        const expiraEn = new Date();
        expiraEn.setHours(expiraEn.getHours() + 48);

        await tx.ediciones_fichaje_pendientes.create({
          data: {
            fichajeId,
            empresaId: session.user.empresaId,
            empleadoId: fichaje.empleadoId,
            editadoPor: empleadoIdEditor,
            notificacionId: notificacion.id,
            cambios: cambiosAplicados,
            estado: 'pendiente',
            expiraEn,
          },
        });
      } else {
        // 9c. Empleado sin usuario: cambios se aplican directamente sin notificación
        console.warn(
          `[API Editar-Batch] Empleado ${fichaje.empleadoId} no tiene usuario. ` +
          `Cambios aplicados sin notificación ni ventana de rechazo.`
        );
      }

      return { success: true, notificacionId };
    });

    return successResponse(resultado);
  } catch (error) {
    return handleApiError(error, 'API POST /api/fichajes/editar-batch');
  }
}
