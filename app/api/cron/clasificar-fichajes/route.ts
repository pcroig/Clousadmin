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
// Se ejecuta todas las noches a las 00:01

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
import { chunk, enqueueJob } from '@/lib/queue';
import { normalizarFechaSinHora } from '@/lib/utils/fechas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    // CRÍTICO: Usar normalizarFechaSinHora para consistencia con la BD
    const hoy = normalizarFechaSinHora(new Date());
    const ayer = normalizarFechaSinHora(new Date(hoy.getTime() - 24 * 60 * 60 * 1000));

    console.log(`[CRON Cerrar Jornadas] Procesando día: ${ayer.toISOString().split('T')[0]}`);

    // Obtener todas las empresas
    const empresas = await prisma.empresas.findMany();

    // OPTIMIZACIÓN: Procesar empresas EN PARALELO para reducir tiempo de ejecución
    // Antes: 3 empresas × 20s = 60s (secuencial)
    // Ahora: max(20s, 20s, 20s) = 20-25s (paralelo)
    console.log(`[CRON Cerrar Jornadas] Procesando ${empresas.length} empresas en paralelo...`);

    const resultadosPorEmpresa = await Promise.all(
      empresas.map(async (empresa) => {
        let fichajesCreados = 0;
        let fichajesPendientes = 0;
        let fichajesFinalizados = 0;
        const errores: string[] = [];

        try {
          console.log(`[CRON Cerrar Jornadas] Procesando empresa: ${empresa.nombre}`);

          // PASO 1: Procesar fichajes del día ANTERIOR (siempre cerrar)
          const empleadosAyer = await obtenerEmpleadosDisponibles(empresa.id, ayer);
          console.log(`[CRON Cerrar Jornadas] ${empleadosAyer.length} empleados disponibles ayer en ${empresa.nombre}`);

          for (const empleado of empleadosAyer) {
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

              // Si no existe fichaje, verificar si hay ausencia de día completo
              if (!fichaje) {
                // Verificar ausencia de día completo
                // (ausencia sin periodo específico = día completo)
                const ausenciaDiaCompleto = await prisma.ausencias.findFirst({
                  where: {
                    empleadoId: empleado.id,
                    fechaInicio: { lte: ayer },
                    fechaFin: { gte: ayer },
                    estado: { in: ['confirmada', 'completada'] }, // Ausencias aprobadas
                    periodo: null, // null = día completo
                  }
                });

                if (ausenciaDiaCompleto) {
                  console.log(`[CRON Cerrar Jornadas] Empleado ${empleado.nombre} ${empleado.apellidos} tiene ausencia día completo, NO crear fichaje`);
                  continue; // NO crear fichajes para ausencias de día completo
                }

                // CRÍTICO: No crear fichajes para empleados sin jornada asignada
                if (!empleado.jornada?.id) {
                  console.warn(
                    `[CRON Cerrar Jornadas] Empleado ${empleado.nombre} ${empleado.apellidos} no tiene jornada asignada. Omitiendo.`
                  );
                  continue;
                }

                // Si no hay ausencia día completo, crear fichaje pendiente
                fichaje = await prisma.fichajes.create({
                  data: {
                    empresaId: empresa.id,
                    empleadoId: empleado.id,
                    jornadaId: empleado.jornada.id,
                    tipoFichaje: 'ordinario', // CRON solo crea fichajes ordinarios
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

              // BLOQUEO: Ignorar fichajes rechazados (congelados)
              if (fichaje.estado === 'rechazado') {
                console.log(
                  `[CRON Cerrar Jornadas] Fichaje ${fichaje.id} está rechazado (congelado), omitiendo`
                );
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
              const mensaje = `Error procesando empleado de ayer ${empleado.nombre} ${empleado.apellidos}: ${
                error instanceof Error ? error.message : 'Error desconocido'
              }`;
              errores.push(mensaje);
              console.error(`[CRON Cerrar Jornadas] ${mensaje}`);
            }
          }

          console.log(`[CRON Cerrar Jornadas] Empresa ${empresa.nombre} procesada exitosamente`);
        } catch (error) {
          const mensaje = `Error procesando empresa ${empresa.nombre}: ${
            error instanceof Error ? error.message : 'Error desconocido'
          }`;
          errores.push(mensaje);
          console.error(`[CRON Cerrar Jornadas] ${mensaje}`);
        }

        return { fichajesCreados, fichajesPendientes, fichajesFinalizados, errores };
      })
    );

    // Agregar resultados de todas las empresas procesadas en paralelo
    const fichajesCreados = resultadosPorEmpresa.reduce((sum, r) => sum + r.fichajesCreados, 0);
    const fichajesPendientes = resultadosPorEmpresa.reduce((sum, r) => sum + r.fichajesPendientes, 0);
    const fichajesFinalizados = resultadosPorEmpresa.reduce((sum, r) => sum + r.fichajesFinalizados, 0);
    const errores = resultadosPorEmpresa.flatMap((r) => r.errores);

    // ========================================
    // PASO 2: Encolar jobs para calcular eventos propuestos
    // ========================================
    console.log('[CRON Cerrar Jornadas] Iniciando encolado de jobs para eventos propuestos');

    let jobsEncolados = 0;
    let batchesEncolados = 0;

    try {
      // Buscar fichajes pendientes que necesitan eventos propuestos
      const fichajesPendientesParaCalcular = await prisma.fichajes.findMany({
        where: {
          fecha: ayer,
          estado: EstadoFichaje.pendiente,
          tipoFichaje: 'ordinario', // Solo ordinarios
          eventosPropuestosCalculados: false,
          jornadaId: { not: null }, // Solo fichajes con jornada asignada
        },
        select: {
          id: true,
          empleadoId: true,
        },
      });

      console.log(
        `[CRON Cerrar Jornadas] ${fichajesPendientesParaCalcular.length} fichajes pendientes requieren cálculo de eventos propuestos`
      );

      if (fichajesPendientesParaCalcular.length > 0) {
        // Filtrar fichajes que NO tienen ausencia de medio día
        // (ausencias medio día se cuadran manualmente)
        const fichajesParaCalcular: string[] = [];

        for (const fichaje of fichajesPendientesParaCalcular) {
          // Verificar ausencia de medio día
          const ausenciaMedioDia = await prisma.ausencias.findFirst({
            where: {
              empleadoId: fichaje.empleadoId,
              fechaInicio: { lte: ayer },
              fechaFin: { gte: ayer },
              estado: { in: ['confirmada', 'completada'] }, // Ausencias aprobadas
              periodo: { in: ['manana', 'tarde'] },
            },
          });

          if (!ausenciaMedioDia) {
            // No tiene ausencia medio día → Calcular eventos propuestos
            fichajesParaCalcular.push(fichaje.id);
          } else {
            console.log(
              `[CRON Cerrar Jornadas] Fichaje ${fichaje.id} tiene ausencia medio día, se omite del cálculo automático`
            );
          }
        }

        console.log(
          `[CRON Cerrar Jornadas] ${fichajesParaCalcular.length} fichajes serán procesados (${fichajesPendientesParaCalcular.length - fichajesParaCalcular.length} omitidos por ausencia medio día)`
        );

        // Dividir en batches de 50
        const batches = chunk(fichajesParaCalcular, 50);

        // Encolar cada batch
        for (const batch of batches) {
          try {
            await enqueueJob('calcular-eventos-propuestos', {
              fichajeIds: batch,
            });
            batchesEncolados++;
            jobsEncolados += batch.length;
          } catch (error) {
            const mensaje = `Error encolando batch de ${batch.length} fichajes: ${
              error instanceof Error ? error.message : 'Error desconocido'
            }`;
            errores.push(mensaje);
            console.error(`[CRON Cerrar Jornadas] ${mensaje}`);
          }
        }

        console.log(
          `[CRON Cerrar Jornadas] ${batchesEncolados} batches encolados (${jobsEncolados} fichajes en total)`
        );
      }
    } catch (error) {
      const mensaje = `Error en encolado de jobs: ${
        error instanceof Error ? error.message : 'Error desconocido'
      }`;
      errores.push(mensaje);
      console.error(`[CRON Cerrar Jornadas] ${mensaje}`);
    }

    const huboErrores = errores.length > 0;
    const resultado = {
      success: !huboErrores,
      fechaAyer: ayer.toISOString().split('T')[0],
      empresas: empresas.length,
      fichajesCreados,
      fichajesPendientes,
      fichajesFinalizados,
      jobsEncolados,
      batchesEncolados,
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
        jobsEncolados: resultado.jobsEncolados,
        batchesEncolados: resultado.batchesEncolados,
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
