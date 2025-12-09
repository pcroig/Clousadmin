// ========================================
// API Fichajes Eventos Corregidos - POST
// ========================================
// Endpoint unificado para crear eventos optimistamente + solicitud de corrección
// Soporta 3 casos de uso:
// 1. añadir_manual: Crear fichaje manual completo
// 2. completar_descanso: Completar pausas faltantes al finalizar
// 3. corregir_finalizado: Editar fichaje ya finalizado (UI pendiente)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, badRequestResponse, createdResponse } from '@/lib/api-handler';
import { prisma } from '@/lib/prisma';
import { EstadoFichaje } from '@/lib/constants/enums';
import { actualizarCalculosFichaje } from '@/lib/calculos/fichajes';
import { registrarAutoCompletado } from '@/lib/auto-completado';
import { normalizarFechaSinHora } from '@/lib/utils/fechas';
import { optionalIdSchema } from '@/lib/validaciones/schemas';

const eventosCorregidosSchema = z.object({
  fichajeId: optionalIdSchema, // Opcional para caso "añadir_manual" (se crea en el endpoint)
  fecha: z.string().optional(), // Para caso "añadir_manual" cuando es fecha pasada
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres'),
  eventos: z.array(z.object({
    tipo: z.enum(['entrada', 'pausa_inicio', 'pausa_fin', 'salida']), // Todos los tipos para unificación
    hora: z.string() // ISO string
  })).min(1, 'Debe proporcionar al menos un evento'),
  crearSalida: z.boolean().optional().default(false), // Para caso 2 (finalizar con descanso incompleto)
  origen: z.string().optional().default('edicion_manual') // Track origin: 'añadir_manual', 'completar_descanso', 'corregir_finalizado'
});

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) {
    return authResult; // Return error response
  }
  const session = authResult.session;

  // Validar request
  const body = await req.json();
  const validation = eventosCorregidosSchema.safeParse(body);

  if (!validation.success) {
    return badRequestResponse(validation.error.issues[0]?.message || 'Datos inválidos');
  }

  const { fichajeId, fecha, motivo, eventos, crearSalida, origen } = validation.data;

  // Obtener o crear fichaje
  let fichaje;
  if (fichajeId) {
    // Fichaje existente (caso 2 y 3)
    fichaje = await prisma.fichajes.findUnique({
      where: { id: fichajeId },
      include: {
        eventos: { orderBy: { hora: 'asc' } },
        jornada: { select: { activa: true } }
      }
    });

    if (!fichaje || fichaje.empleadoId !== session.user.empleadoId) {
      return badRequestResponse('Fichaje no encontrado o no autorizado');
    }

    // Solo permitir editar si NO está finalizado (caso 2)
    // Caso 3 (corregir_finalizado) requiere otro flujo
    if (fichaje.estado === 'finalizado' && origen !== 'corregir_finalizado') {
      return badRequestResponse('No puedes editar un fichaje ya finalizado');
    }
  } else {
    // Crear fichaje nuevo (caso 1: añadir_manual)
    const fechaParsed = fecha ? normalizarFechaSinHora(new Date(fecha)) : normalizarFechaSinHora(new Date());

    // Verificar si ya existe fichaje para esta fecha
    const fichajeExistente = await prisma.fichajes.findUnique({
      where: {
        empleadoId_fecha: {
          empleadoId: session.user.empleadoId!,
          fecha: fechaParsed
        }
      }
    });

    if (fichajeExistente) {
      return badRequestResponse('Ya existe un fichaje para esta fecha. Usa el modal de edición para modificarlo.');
    }

    // Obtener empleado para obtener jornadaId
    const empleado = await prisma.empleados.findUnique({
      where: { id: session.user.empleadoId!, empresaId: session.user.empresaId! },
      select: { jornadaId: true }
    });

    if (!empleado) {
      return badRequestResponse('Empleado no encontrado');
    }

    fichaje = await prisma.fichajes.create({
      data: {
        empresaId: session.user.empresaId!,
        empleadoId: session.user.empleadoId!,
        jornadaId: empleado.jornadaId,
        fecha: fechaParsed,
        tipoFichaje: 'ordinario',
        estado: 'en_curso',
      },
      include: {
        eventos: true,
        jornada: { select: { activa: true } }
      }
    });
  }

  // ============================================
  // FLUJO OPTIMISTA: TODO EN UNA TRANSACCIÓN
  // ============================================

  const resultado = await prisma.$transaction(async (tx) => {
    // 1. Crear eventos editados optimistamente
    const eventosCreados = [];
    for (const evento of eventos) {
      const horaDate = new Date(evento.hora);

      const eventoCreado = await tx.fichaje_eventos.create({
        data: {
          fichajeId: fichaje!.id,
          tipo: evento.tipo,
          hora: horaDate,
          editado: true,
          motivoEdicion: motivo,
          editadoPor: session.user.empleadoId,
        }
      });

      eventosCreados.push(eventoCreado);
    }

    // 2. Crear evento de salida si es caso de finalizar (completar_descanso)
    let eventoSalida = null;
    if (crearSalida) {
      eventoSalida = await tx.fichaje_eventos.create({
        data: {
          fichajeId: fichaje!.id,
          tipo: 'salida',
          hora: new Date(),
          editado: true, // Marcar como editado porque es una corrección manual
          motivoEdicion: 'Salida automática al completar descanso',
          editadoPor: session.user.empleadoId,
        }
      });
    }

    // 3. Recalcular horas trabajadas y en pausa
    await actualizarCalculosFichaje(fichaje!.id, tx);

    // 4. Marcar fichaje como finalizado
    const fichajeActualizado = await tx.fichajes.update({
      where: { id: fichaje!.id },
      data: { estado: EstadoFichaje.finalizado }
    });

    // 5. Crear solicitud de corrección (pendiente de aprobación)
    const solicitud = await tx.solicitudes_correccion_fichaje.create({
      data: {
        empresaId: session.user.empresaId!,
        fichajeId: fichaje!.id,
        empleadoId: session.user.empleadoId!,
        estado: 'pendiente',
        motivo,
        detalles: {
          eventos: eventosCreados.map(e => ({
            id: e.id,
            tipo: e.tipo,
            hora: e.hora.toISOString(),
            editado: true
          })),
          eventoSalidaId: eventoSalida?.id,
          origen
        }
      }
    });

    // 6. Registrar en auto_completados
    await registrarAutoCompletado(tx, {
      empresaId: session.user.empresaId!,
      empleadoId: session.user.empleadoId!,
      tipo: 'fichaje_corregido_optimista',
      estado: 'pendiente', // Pendiente de aprobación CRON
      datosOriginales: {
        solicitudId: solicitud.id,
        fichajeId: fichaje!.id,
        eventosCreados: eventosCreados.map(e => ({ id: e.id, tipo: e.tipo, hora: e.hora.toISOString() })),
        eventoSalidaId: eventoSalida?.id,
        motivo,
        origen
      },
      sugerencias: {
        accion: 'aprobar_automaticamente',
        razon: origen === 'añadir_manual'
          ? 'Fichaje manual creado por empleado'
          : origen === 'completar_descanso'
            ? 'Corrección de pausas al finalizar jornada'
            : 'Corrección de fichaje finalizado'
      }
    });

    return {
      fichaje: fichajeActualizado,
      solicitud,
      eventosCreados,
      eventoSalida
    };
  });

  return createdResponse({
    ...resultado,
    mensaje: 'Eventos guardados correctamente. Pendientes de aprobación automática en 48h.'
  });
}
