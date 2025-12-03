// ========================================
// API: Procesar Solicitudes de Fichaje Manual
// ========================================
// Procesa solicitudes de fichaje manual pendientes y crea los eventos correspondientes

import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import {
  handleApiError,
  isNextResponse,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { registrarAutoCompletadoSolicitud } from '@/lib/auto-completado';
import { actualizarCalculosFichaje } from '@/lib/calculos/fichajes';
import { EstadoFichaje, EstadoSolicitud } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

// POST /api/solicitudes/procesar-fichajes - Procesar solicitudes de fichaje manual
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación (puede ser ejecutado por cron o por HR admin)
    const authResult = await requireAuth(request);
    if (isNextResponse(authResult)) return authResult;
    const { session: _session } = authResult;

    console.info('[Procesar Fichajes] Iniciando procesamiento de solicitudes pendientes');

    // Buscar solicitudes de fichaje manual pendientes
    const solicitudesPendientes = await prisma.solicitudes_cambio.findMany({
      where: {
        tipo: 'fichaje_manual',
        estado: EstadoSolicitud.pendiente,
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            empresaId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.info(`[Procesar Fichajes] Encontradas ${solicitudesPendientes.length} solicitudes pendientes`);

    let procesadas = 0;
    const errores: string[] = [];

    for (const solicitud of solicitudesPendientes) {
      try {
        const camposCambiados = solicitud.camposCambiados as Record<string, unknown>;
        const { fecha: fechaStr, tipo, hora: horaStr, motivo } = camposCambiados as {
          fecha?: string;
          tipo?: string;
          hora?: string;
          motivo?: string;
        };

        if (!fechaStr || !tipo || !horaStr) {
          errores.push(`Solicitud ${solicitud.id}: Datos incompletos`);
          continue;
        }

        // Validar y parsear fecha (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
          errores.push(`Solicitud ${solicitud.id}: Formato de fecha inválido (esperado YYYY-MM-DD)`);
          continue;
        }

        const fechaParts = fechaStr.split('-');
        const año = parseInt(fechaParts[0]);
        const mes = parseInt(fechaParts[1]) - 1;
        const dia = parseInt(fechaParts[2]);

        if (isNaN(año) || isNaN(mes) || isNaN(dia)) {
          errores.push(`Solicitud ${solicitud.id}: Componentes de fecha inválidos`);
          continue;
        }

        const fecha = new Date(año, mes, dia);
        if (isNaN(fecha.getTime())) {
          errores.push(`Solicitud ${solicitud.id}: Fecha inválida`);
          continue;
        }
        fecha.setHours(0, 0, 0, 0);

        // Parsear hora completa (YYYY-MM-DDTHH:mm:ss o solo HH:mm)
        let horaCompleta: Date;
        if (horaStr.includes('T')) {
          horaCompleta = new Date(horaStr);
        } else {
          // Si solo viene HH:mm, construir fecha completa
          const [hours, minutes] = horaStr.split(':');
          horaCompleta = new Date(fecha);
          horaCompleta.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        console.info(`[Procesar Fichajes] Procesando solicitud ${solicitud.id}: ${tipo} a las ${horaCompleta.toISOString()}`);

        // 1. Buscar o crear fichaje del día
        let fichaje = await prisma.fichajes.findUnique({
          where: {
            empleadoId_fecha: {
              empleadoId: solicitud.empleadoId,
              fecha,
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

        if (!fichaje) {
          console.info(`[Procesar Fichajes] Creando nuevo fichaje para ${solicitud.empleado.nombre} ${solicitud.empleado.apellidos}`);
          fichaje = await prisma.fichajes.create({
            data: {
              empresaId: solicitud.empleado.empresaId,
              empleadoId: solicitud.empleadoId,
              fecha,
              estado: EstadoFichaje.en_curso,
            },
            include: {
              eventos: true,
            },
          });
        }

        // 2. Crear evento
        await prisma.fichaje_eventos.create({
          data: {
            fichajeId: fichaje.id,
            tipo: tipo as 'entrada' | 'pausa_inicio' | 'pausa_fin' | 'salida',
            hora: horaCompleta,
            editado: true,
            motivoEdicion: motivo || 'Fichaje manual',
          },
        });

        console.info(`[Procesar Fichajes] Evento ${tipo} creado para fichaje ${fichaje.id}`);

        // 3. Actualizar cálculos del fichaje
        await actualizarCalculosFichaje(fichaje.id);

        // 4. Actualizar solicitud a auto_aprobada
        await prisma.solicitudes_cambio.update({
          where: { id: solicitud.id },
          data: {
            estado: EstadoSolicitud.auto_aprobada,
            fechaRespuesta: new Date(),
          },
        });

        await registrarAutoCompletadoSolicitud(prisma, {
          empresaId: solicitud.empleado.empresaId,
          solicitudId: solicitud.id,
          empleadoId: solicitud.empleadoId,
          tipoSolicitud: solicitud.tipo,
          camposCambiados: solicitud.camposCambiados as Prisma.JsonValue,
          aprobadoPor: authResult.session.user.id,
          origen: 'procesar_fichajes',
        });

        procesadas++;
        console.info(`[Procesar Fichajes] Solicitud ${solicitud.id} procesada exitosamente`);
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : 'Error desconocido';
        errores.push(`Solicitud ${solicitud.id}: ${mensaje}`);
        console.error(`[Procesar Fichajes] Error procesando solicitud ${solicitud.id}:`, error);
      }
    }

    console.info(`[Procesar Fichajes] Finalizado: ${procesadas} procesadas, ${errores.length} errores`);

    return successResponse({
      success: true,
      procesadas,
      errores,
      mensaje: `${procesadas} solicitudes de fichaje manual procesadas correctamente${errores.length > 0 ? `, ${errores.length} errores` : ''}`,
    });
  } catch (error) {
    console.error('[Procesar Fichajes] Error general:', error);
    return handleApiError(error, 'API POST /api/solicitudes/procesar-fichajes');
  }
}

