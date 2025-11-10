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
import { prisma } from '@/lib/prisma';
import { EstadoFichaje } from '@/lib/constants/enums';

import {
  validarFichajeCompleto,
  actualizarCalculosFichaje,
  obtenerEmpleadosDisponibles,
} from '@/lib/calculos/fichajes';

export async function POST(request: NextRequest) {
  try {
    // Verificar CRON_SECRET
    const cronSecret = request.headers.get('authorization');
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('[CRON Cerrar Jornadas] Iniciando proceso...');

    // Fecha de ayer (el día que queremos cerrar)
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    ayer.setHours(0, 0, 0, 0);

    console.log(`[CRON Cerrar Jornadas] Procesando día: ${ayer.toISOString().split('T')[0]}`);

    // Obtener todas las empresas activas
    const empresas = await prisma.empresa.findMany({
      where: {
        activa: true,
      },
    });

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
            let fichaje = await prisma.fichaje.findUnique({
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
              fichaje = await prisma.fichaje.create({
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
                await prisma.fichaje.update({
                  where: { id: fichaje.id },
                  data: {
                    estado: EstadoFichaje.finalizado,
                  },
                });

                console.log(`[CRON Cerrar Jornadas] Fichaje finalizado: ${empleado.nombre} ${empleado.apellidos}`);
                fichajesFinalizados++;
              } else {
                // Fichaje incompleto: pendiente de cuadrar
                await prisma.fichaje.update({
                  where: { id: fichaje.id },
                  data: {
                    estado: EstadoFichaje.pendiente,
                  },
                });

                console.log(`[CRON Cerrar Jornadas] Fichaje pendiente: ${empleado.nombre} ${empleado.apellidos} - ${validacion.razon}`);
                fichajesPendientes++;
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

    const resultado = {
      success: true,
      fecha: ayer.toISOString().split('T')[0],
      empresas: empresas.length,
      fichajesCreados,
      fichajesPendientes,
      fichajesFinalizados,
      errores,
    };

    console.log('[CRON Cerrar Jornadas] Proceso completado:', resultado);

    return new Response(JSON.stringify(resultado), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[CRON Cerrar Jornadas] Error fatal:', error);
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
