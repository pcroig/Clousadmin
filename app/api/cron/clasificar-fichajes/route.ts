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

import { procesarFichajesDia } from '@/lib/calculos/fichajes';
import { initCronLogger } from '@/lib/cron/logger';
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
    const empresas = await prisma.empresa.findMany();

    let fichajesCreados = 0;
    let fichajesPendientes = 0;
    let fichajesFinalizados = 0;
    const errores: string[] = [];

    for (const empresa of empresas) {
      try {
        console.log(`[CRON Cerrar Jornadas] Procesando empresa: ${empresa.nombre}`);

        const resultadoEmpresa = await procesarFichajesDia(empresa.id, ayer, {
          notificar: true,
        });

        fichajesCreados += resultadoEmpresa.fichajesCreados;
        fichajesPendientes += resultadoEmpresa.fichajesPendientes;
        fichajesFinalizados += resultadoEmpresa.fichajesFinalizados;

        if (resultadoEmpresa.errores.length > 0) {
          for (const mensaje of resultadoEmpresa.errores) {
            const scoped = `[${empresa.nombre}] ${mensaje}`;
            errores.push(scoped);
            console.error(`[CRON Cerrar Jornadas] ${scoped}`);
          }
        }

        console.log(
          `[CRON Cerrar Jornadas] ${empresa.nombre} → empleados: ${resultadoEmpresa.empleadosDisponibles}, ` +
            `creados: ${resultadoEmpresa.fichajesCreados}, pendientes: ${resultadoEmpresa.fichajesPendientes}, finalizados: ${resultadoEmpresa.fichajesFinalizados}`
        );
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
