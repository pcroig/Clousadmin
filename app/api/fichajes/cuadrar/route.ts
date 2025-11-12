// ========================================
// API: Cuadrar Fichajes Masivamente
// ========================================
// POST: Cuadrar fichajes pendientes creando eventos según jornada

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  validateRequest,
  handleApiError,
  successResponse
} from '@/lib/api-handler';
import { z } from 'zod';
import {
  validarFichajeCompleto,
  actualizarCalculosFichaje,
  obtenerAusenciaMedioDia,
} from '@/lib/calculos/fichajes';
import type { JornadaConfig, DiaConfig } from '@/lib/calculos/fichajes-helpers';

const cuadrarSchema = z.object({
  fichajeIds: z.array(z.string()).min(1, 'Debe proporcionar al menos un fichaje'),
});

// POST /api/fichajes/cuadrar - Cuadrar fichajes masivamente (solo HR Admin)
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(request, cuadrarSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    const { fichajeIds } = validatedData;

    let cuadrados = 0;
    const errores: string[] = [];

    for (const fichajeId of fichajeIds) {
      try {
        // 1. Obtener fichaje con empleado y jornada
        const fichaje = await prisma.fichaje.findUnique({
          where: { id: fichajeId },
          include: {
            empleado: {
              include: {
                jornada: true,
              },
            },
            eventos: {
              orderBy: {
                hora: 'asc',
              },
            },
          },
        });

        if (!fichaje) {
          errores.push(`Fichaje ${fichajeId}: No encontrado`);
          continue;
        }

        // Verificar que el fichaje pertenece a la empresa del usuario
        if (fichaje.empresaId !== session.user.empresaId) {
          errores.push(`Fichaje ${fichajeId}: No autorizado (diferente empresa)`);
          continue;
        }

        // Solo cuadrar fichajes pendientes o en curso
        if (fichaje.estado !== 'pendiente' && fichaje.estado !== 'en_curso') {
          errores.push(`Fichaje ${fichajeId}: Estado no válido (${fichaje.estado})`);
          continue;
        }

        if (!fichaje.empleado.jornada) {
          errores.push(`Fichaje ${fichajeId}: Empleado sin jornada asignada`);
          continue;
        }

        // 2. Verificar ausencia de medio día (afecta qué eventos crear)
        const ausenciaMedioDia = await obtenerAusenciaMedioDia(fichaje.empleadoId, fichaje.fecha);

        // 3. Validar qué eventos faltan
        const validacion = await validarFichajeCompleto(fichajeId);

        if (validacion.completo) {
          // Si ya está completo, solo marcarlo como finalizado
          await prisma.fichaje.update({
            where: { id: fichajeId },
            data: {
              estado: 'finalizado',
              cuadradoMasivamente: true,
              cuadradoPor: session.user.id,
              cuadradoEn: new Date(),
            },
          });
          cuadrados++;
          continue;
        }

        // 4. Crear eventos faltantes según la jornada
        const jornada = fichaje.empleado.jornada;
        const config = jornada.config as JornadaConfig;
        const fechaBase = new Date(fichaje.fecha);
        fechaBase.setHours(0, 0, 0, 0);

        const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
        const nombreDia = diasSemana[fichaje.fecha.getDay()];
        const configDia = config[nombreDia] as DiaConfig | undefined;

        const tiposEventos = fichaje.eventos.map((e) => e.tipo);

        // JORNADA FIJA
        if (config.tipo === 'fija' || (configDia && configDia.entrada && configDia.salida)) {
          // Verificar que el día esté activo
          if (!configDia || configDia.activo === false) {
            errores.push(`Fichaje ${fichajeId}: Día no activo en la jornada`);
            continue;
          }

          // Crear entrada si falta (no crear si hay ausencia de mañana)
          if (!tiposEventos.includes('entrada') 
              && validacion.eventosFaltantes.includes('entrada')
              && (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'tarde')) {
            const [horas, minutos] = configDia.entrada.split(':').map(Number);
            const horaEntrada = new Date(fechaBase);
            horaEntrada.setHours(horas, minutos, 0, 0);

            await prisma.fichajeEvento.create({
              data: {
                fichajeId: fichaje.id,
                tipo: 'entrada',
                hora: horaEntrada,
              },
            });
          }

          // Crear pausa si está configurada y falta (no crear si hay ausencia de medio día)
          if (configDia.pausa_inicio && configDia.pausa_fin && !ausenciaMedioDia.tieneAusencia) {
            if (!tiposEventos.includes('pausa_inicio') && validacion.eventosFaltantes.includes('pausa_inicio')) {
              const [horas, minutos] = configDia.pausa_inicio.split(':').map(Number);
              const horaPausaInicio = new Date(fechaBase);
              horaPausaInicio.setHours(horas, minutos, 0, 0);

              await prisma.fichajeEvento.create({
                data: {
                  fichajeId: fichaje.id,
                  tipo: 'pausa_inicio',
                  hora: horaPausaInicio,
                },
              });
            }

            if (!tiposEventos.includes('pausa_fin') && validacion.eventosFaltantes.includes('pausa_fin')) {
              const [horas, minutos] = configDia.pausa_fin.split(':').map(Number);
              const horaPausaFin = new Date(fechaBase);
              horaPausaFin.setHours(horas, minutos, 0, 0);

              await prisma.fichajeEvento.create({
                data: {
                  fichajeId: fichaje.id,
                  tipo: 'pausa_fin',
                  hora: horaPausaFin,
                },
              });
            }
          }

          // Crear salida si falta (no crear si hay ausencia de tarde)
          if (!tiposEventos.includes('salida') 
              && validacion.eventosFaltantes.includes('salida')
              && (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'manana')) {
            const [horas, minutos] = configDia.salida.split(':').map(Number);
            const horaSalida = new Date(fechaBase);
            horaSalida.setHours(horas, minutos, 0, 0);

            await prisma.fichajeEvento.create({
              data: {
                fichajeId: fichaje.id,
                tipo: 'salida',
                hora: horaSalida,
              },
            });
          }
        }
        // JORNADA FLEXIBLE
        else if (config.tipo === 'flexible') {
          // Verificar que el día esté activo para jornada flexible
          if (!configDia || configDia.activo === false) {
            errores.push(`Fichaje ${fichajeId}: Día no activo en la jornada flexible`);
            continue;
          }

          // Calcular días activos reales de la jornada
          const diasActivos = Object.entries(config).reduce((count, [clave, valor]) => {
            if (['tipo', 'descansoMinimo', 'limiteInferior', 'limiteSuperior'].includes(clave)) {
              return count;
            }
            if (valor && typeof valor === 'object' && !Array.isArray(valor) && (valor as DiaConfig).activo) {
              return count + 1;
            }
            return count;
          }, 0);

          const diasLaborables = diasActivos > 0 ? diasActivos : 5;
          const horasPorDia = Number(jornada.horasSemanales) / diasLaborables;

          // Si no tiene entrada, asumir 09:00 (solo si no hay ausencia de mañana)
          let horaEntrada = new Date(fechaBase);
          const eventoEntrada = fichaje.eventos.find((e) => e.tipo === 'entrada');
          if (eventoEntrada) {
            horaEntrada = new Date(eventoEntrada.hora);
          } else if (validacion.eventosFaltantes.includes('entrada')
                     && (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'tarde')) {
            horaEntrada.setHours(9, 0, 0, 0);

            await prisma.fichajeEvento.create({
              data: {
                fichajeId: fichaje.id,
                tipo: 'entrada',
                hora: horaEntrada,
              },
            });
          }

          // Si tiene descanso mínimo, crear pausas (solo si no hay ausencia de medio día)
          if (config.descansoMinimo 
              && validacion.eventosFaltantes.includes('pausa_inicio')
              && !ausenciaMedioDia.tieneAusencia) {
            const [horasDescanso, minutosDescanso] = config.descansoMinimo.split(':').map(Number);
            const descansoMs = (horasDescanso * 60 + minutosDescanso) * 60 * 1000;

            const horaPausaInicio = new Date(horaEntrada.getTime() + (horasPorDia / 2) * 60 * 60 * 1000);
            const horaPausaFin = new Date(horaPausaInicio.getTime() + descansoMs);

            if (!tiposEventos.includes('pausa_inicio')) {
              await prisma.fichajeEvento.create({
                data: {
                  fichajeId: fichaje.id,
                  tipo: 'pausa_inicio',
                  hora: horaPausaInicio,
                },
              });
            }

            if (!tiposEventos.includes('pausa_fin')) {
              await prisma.fichajeEvento.create({
                data: {
                  fichajeId: fichaje.id,
                  tipo: 'pausa_fin',
                  hora: horaPausaFin,
                },
              });
            }
          }

          // Crear salida si falta (no crear si hay ausencia de tarde)
          if (validacion.eventosFaltantes.includes('salida')
              && (!ausenciaMedioDia.tieneAusencia || ausenciaMedioDia.medioDia === 'manana')) {
            const descansoMs = config.descansoMinimo
              ? (() => {
                  const [h, m] = config.descansoMinimo.split(':').map(Number);
                  return (h * 60 + m) * 60 * 1000;
                })()
              : 0;

            const horaSalida = new Date(horaEntrada.getTime() + horasPorDia * 60 * 60 * 1000 + descansoMs);

            await prisma.fichajeEvento.create({
              data: {
                fichajeId: fichaje.id,
                tipo: 'salida',
                hora: horaSalida,
              },
            });
          }
        }

        // 5. Actualizar cálculos del fichaje (horas trabajadas y en pausa)
        await actualizarCalculosFichaje(fichaje.id);

        // 6. Marcar como finalizado y registrar auditoría
        await prisma.fichaje.update({
          where: { id: fichajeId },
          data: {
            estado: 'finalizado',
            cuadradoMasivamente: true,
            cuadradoPor: session.user.id,
            cuadradoEn: new Date(),
          },
        });

        cuadrados++;
      } catch (error) {
        console.error(`[API Cuadrar] Error procesando ${fichajeId}:`, error);
        errores.push(`Fichaje ${fichajeId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    return successResponse({
      success: true,
      cuadrados,
      errores,
      mensaje: `${cuadrados} fichajes cuadrados correctamente${errores.length > 0 ? `, ${errores.length} errores` : ''}`,
    });
  } catch (error) {
    return handleApiError(error, 'API POST /api/fichajes/cuadrar');
  }
}

