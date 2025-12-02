// ========================================
// CRON: Cerrar Jornadas del Día Anterior
// ========================================
//
// Funcionalidad:
// 1. Para cada empresa activa, procesar empleados del día anterior
// 2. Si un empleado no tiene fichaje del día anterior:
//    - Verificar si es día laboral (jornada + festivos + ausencias)
//    - Si es laboral, crear fichaje en estado 'pendiente' (para cuadrar)
// 3. Si un empleado tiene fichaje en estado 'en_curso':
//    - Validar si el fichaje está completo según su jornada
//    - Si está completo: marcar como 'finalizado'
//    - Si está incompleto: marcar como 'pendiente' (para cuadrar)
//
// Se ejecuta todas las noches a las 23:30

import { NextRequest } from 'next/server';

import {
  actualizarCalculosFichaje,
  obtenerEmpleadosDisponibles,
  validarFichajeCompleto,
} from '@/lib/calculos/fichajes';
import { EstadoFichaje } from '@/lib/constants/enums';
import { initCronLogger } from '@/lib/cron/logger';
import { crearNotificacionFichajeRequiereRevision } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  let cronLogger: ReturnType<typeof initCronLogger> | null = null;
  try {
    // Verificar CRON_SECRET
    const cronSecret = request.headers.get('authorization');
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    cronLogger = initCronLogger('Cerrar Jornadas');

    // Fecha de ayer (el día que queremos cerrar)
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    ayer.setHours(0, 0, 0, 0);

    console.log(`[CRON Cerrar Jornadas] Procesando día: ${ayer.toISOString().split('T')[0]}`);

    // Obtener todas las empresas
    const empresas = await prisma.empresas.findMany();

    let fichajesCreados = 0;
    let fichajesPendientes = 0;
    let fichajesFinalizados = 0;
    const errores: string[] = [];

    for (const empresa of empresas) {
      try {
        console.log(`[CRON Cerrar Jornadas] Procesando empresa: ${empresa.nombre}`);

        // Obtener empleados que deberían trabajar ese día
        const empleadosDisponibles = await obtenerEmpleadosDisponibles(empresa.id, ayer);

        console.log(`[CRON Cerrar Jornadas] ${empleadosDisponibles.length} empleados disponibles en ${empresa.nombre}`);

        for (const empleado of empleadosDisponibles) {
          try {
            // Buscar fichaje del día anterior
            let fichaje = await prisma.fichajes.findUnique({
              where: {
                empleadoId_fecha: {
                  empleadoId: empleado.id,
                  fecha: ayer,
                },
              },
              include: {
                eventos: true,
              },
            });

            // Si no existe fichaje, crear uno en estado pendiente
            if (!fichaje) {
              fichaje = await prisma.fichajes.create({
                data: {
                  empresaId: empresa.id,
                  empleadoId: empleado.id,
                  fecha: ayer,
                  estado: EstadoFichaje.pendiente,
                },
                include: {
                  eventos: true,
                },
              });

              console.log(`[CRON Cerrar Jornadas] Fichaje creado para ${empleado.nombre} ${empleado.apellidos}`);
              fichajesCreados++;
              fichajesPendientes++;
              
              // Crear notificación de fichaje pendiente
              await crearNotificacionFichajeRequiereRevision(prisma, {
                fichajeId: fichaje.id,
                empresaId: empresa.id,
                empleadoId: empleado.id,
                empleadoNombre: `${empleado.nombre} ${empleado.apellidos}`,
                fecha: fichaje.fecha,
                razon: 'No se registraron fichajes en el día',
              });
              
              continue;
            }

            // Si el fichaje está en curso, validarlo
            if (fichaje.estado === EstadoFichaje.en_curso) {
              // Validar si está completo
              const validacion = await validarFichajeCompleto(fichaje.id);

              // Actualizar cálculos
              await actualizarCalculosFichaje(fichaje.id);

              if (validacion.completo) {
                // Fichaje completo: finalizar
                await prisma.fichajes.update({
                  where: { id: fichaje.id },
                  data: {
                    estado: EstadoFichaje.finalizado,
                  },
                });

                console.log(`[CRON Cerrar Jornadas] Fichaje finalizado: ${empleado.nombre} ${empleado.apellidos}`);
                fichajesFinalizados++;
              } else {
                // Fichaje incompleto: pendiente de cuadrar
                await prisma.fichajes.update({
                  where: { id: fichaje.id },
                  data: {
                    estado: EstadoFichaje.pendiente,
                  },
                });

                console.log(`[CRON Cerrar Jornadas] Fichaje pendiente: ${empleado.nombre} ${empleado.apellidos} - ${validacion.razon}`);
                fichajesPendientes++;

                // Crear notificación de fichaje pendiente
                await crearNotificacionFichajeRequiereRevision(prisma, {
                  fichajeId: fichaje.id,
                  empresaId: empresa.id,
                  empleadoId: empleado.id,
                  empleadoNombre: `${empleado.nombre} ${empleado.apellidos}`,
                  fecha: fichaje.fecha,
                  razon: validacion.razon ?? 'Faltan eventos por registrar',
                });
              }
            }
          } catch (error) {
            const mensaje = `Error procesando empleado ${empleado.nombre} ${empleado.apellidos}: ${
              error instanceof Error ? error.message : 'Error desconocido'
            }`;
            errores.push(mensaje);
            console.error(`[CRON Cerrar Jornadas] ${mensaje}`);
          }
        }
      } catch (error) {
        const mensaje = `Error procesando empresa ${empresa.nombre}: ${
          error instanceof Error ? error.message : 'Error desconocido'
        }`;
        errores.push(mensaje);
        console.error(`[CRON Cerrar Jornadas] ${mensaje}`);
      }
    }

    const huboErrores = errores.length > 0;
    const resultado = {
      success: !huboErrores,
      fecha: ayer.toISOString().split('T')[0],
      empresas: empresas.length,
      fichajesCreados,
      fichajesPendientes,
      fichajesFinalizados,
      errores,
    };

    if (huboErrores) {
      console.warn('[CRON Cerrar Jornadas] Finalizado con errores:', errores);
    } else {
      console.log('[CRON Cerrar Jornadas] Proceso completado:', resultado);
    }

    await cronLogger.finish({
      success: !huboErrores,
      metadata: {
        empresas: resultado.empresas,
        fichajesCreados: resultado.fichajesCreados,
        fichajesPendientes: resultado.fichajesPendientes,
        fichajesFinalizados: resultado.fichajesFinalizados,
        errores: resultado.errores.length,
      },
      errors: huboErrores ? errores : undefined,
    });

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[CRON Cerrar Jornadas] Error fatal:', error);
    if (cronLogger) {
      await cronLogger.finish({
        success: false,
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
      });
    }
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
