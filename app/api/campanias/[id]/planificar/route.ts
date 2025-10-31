// ========================================
// API Planificar Vacaciones con IA
// ========================================
// Ejecuta optimización IA y crea ausencias asignadas

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { optimizarVacacionesEquipo } from '@/lib/ia/optimizar-vacaciones';
import { calcularDias } from '@/lib/calculos/ausencias';

// POST: Ejecutar planificación IA
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'manager'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id: campaniaId } = await params;

    // Verificar que la campaña existe
    const campania = await prisma.campaniaVacaciones.findFirst({
      where: {
        id: campaniaId,
        empresaId: session.user.empresaId,
      },
      include: {
        equipo: {
          include: {
            miembros: {
              include: {
                empleado: {
                  select: {
                    id: true,
                    nombre: true,
                    apellidos: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!campania) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    // Si es manager, verificar permisos
    if (session.user.rol === 'manager' && campania.creadaPor !== session.user.id) {
      return NextResponse.json(
        { error: 'Solo puedes planificar campañas que has creado' },
        { status: 403 }
      );
    }

    // Verificar que la campaña está abierta
    if (campania.estado !== 'abierta') {
      return NextResponse.json(
        { error: 'La campaña debe estar abierta para planificar' },
        { status: 400 }
      );
    }

    console.log(`[API Planificar] Iniciando optimización para campaña ${campaniaId}`);

    // Ejecutar optimización IA
    const resultado = await optimizarVacacionesEquipo(campaniaId);

    // Crear ausencias para cada asignación
    const ausenciasCreadas = [];
    const errores = [];

    for (const asignacion of resultado.asignaciones) {
      try {
        // Agrupar fechas consecutivas en rangos
        const fechas = asignacion.fechas.map((f) => new Date(f)).sort((a, b) => a.getTime() - b.getTime());

        // Agrupar fechas consecutivas
        const rangos: { inicio: Date; fin: Date }[] = [];
        let inicioActual = fechas[0];
        let finActual = fechas[0];

        for (let i = 1; i < fechas.length; i++) {
          const diffDias = (fechas[i].getTime() - finActual.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDias === 1) {
            // Fecha consecutiva
            finActual = fechas[i];
          } else {
            // Nueva secuencia
            rangos.push({ inicio: inicioActual, fin: finActual });
            inicioActual = fechas[i];
            finActual = fechas[i];
          }
        }
        rangos.push({ inicio: inicioActual, fin: finActual });

        // Crear una ausencia por cada rango
        for (const rango of rangos) {
          const calculos = await calcularDias(rango.inicio, rango.fin, campania.empresaId);

          const ausencia = await prisma.ausencia.create({
            data: {
              empresaId: campania.empresaId,
              empleadoId: asignacion.empleadoId,
              equipoId: campania.equipoId,
              campaniaId: campania.id,
              tipo: 'vacaciones',
              fechaInicio: rango.inicio,
              fechaFin: rango.fin,
              diasNaturales: calculos.diasNaturales,
              diasLaborables: calculos.diasLaborables,
              diasSolicitados: calculos.diasSolicitados,
              descuentaSaldo: true,
              estado: 'en_curso', // Aprobada automáticamente por IA
              optimizadaIA: true,
              notasIA: `Asignada automáticamente por optimización IA de campaña "${campania.nombre}"`,
            },
          });

          // Actualizar saldo (mover a usados directamente, sin pasar por pendientes)
          const año = rango.inicio.getFullYear();
          // Buscar saldo general (equipoId null) o específico del equipo
          const saldoGeneral = await prisma.empleadoSaldoAusencias.findUnique({
            where: {
              empleadoId_equipoId_año: {
                empleadoId: asignacion.empleadoId,
                equipoId: null,
                año,
              },
            },
          });

          if (saldoGeneral) {
            await prisma.empleadoSaldoAusencias.update({
              where: { id: saldoGeneral.id },
              data: {
                diasUsados: {
                  increment: calculos.diasSolicitados,
                },
              },
            });
          }

          ausenciasCreadas.push(ausencia);
        }

        // Notificar al empleado
        const empleado = campania.equipo.miembros.find((m) => m.empleadoId === asignacion.empleadoId);
        if (empleado) {
          const usuario = await prisma.usuario.findUnique({
            where: { empleadoId: asignacion.empleadoId },
            select: { id: true },
          });

          if (usuario) {
            await prisma.notificacion.create({
              data: {
                usuarioId: usuario.id,
                tipo: 'vacaciones_planificadas',
                titulo: 'Vacaciones planificadas',
                mensaje: `Tus vacaciones para la campaña "${campania.nombre}" han sido planificadas: ${fechas.length} días asignados`,
                metadata: {
                  campaniaId,
                  ausenciaIds: ausenciasCreadas.map((a) => a.id),
                  fechas: asignacion.fechas,
                } as any,
              },
            });
          }
        }
      } catch (error) {
        console.error(`[API Planificar] Error creando ausencia para ${asignacion.empleadoId}:`, error);
        errores.push({
          empleadoId: asignacion.empleadoId,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    // Actualizar campaña
    await prisma.campaniaVacaciones.update({
      where: { id: campaniaId },
      data: {
        estado: 'planificada',
        planificadaEn: new Date(),
      },
    });

    console.log(
      `[API Planificar] Completado: ${ausenciasCreadas.length} ausencias creadas, ${errores.length} errores`
    );

    return NextResponse.json({
      success: true,
      asignaciones: resultado.asignaciones,
      conflictos: resultado.conflictos,
      disponibilidadPorDia: resultado.disponibilidadPorDia,
      ausenciasCreadas: ausenciasCreadas.length,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    console.error('[API POST Planificar Campaña]', error);
    return NextResponse.json({ error: 'Error al planificar vacaciones' }, { status: 500 });
  }
}

