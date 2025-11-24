// ========================================
// API Route: Campañas de Vacaciones
// ========================================

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

import {
  badRequestResponse,
  createdResponse,
  handleApiError,
  requireAuth,
  successResponse,
} from '@/lib/api-handler';
import { UsuarioRol } from '@/lib/constants/enums';
import { crearNotificacionCampanaCreada } from '@/lib/notificaciones';
import { prisma, Prisma } from '@/lib/prisma';
import { asJsonValue } from '@/lib/prisma/json';
import { campanaVacacionesCreateSchema } from '@/lib/validaciones/schemas';
import { getJsonBody } from '@/lib/utils/json';

// GET /api/campanas-vacaciones - Obtener campaña activa (single active campaign)
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo retornar la campaña activa (estado='abierta')
    const campana = await prisma.campanaVacaciones.findFirst({
      where: {
        empresaId: session.user.empresaId,
        estado: 'abierta',
      },
      include: {
        preferencias: {
          include: {
            empleado: {
              select: {
                nombre: true,
                apellidos: true,
                fotoUrl: true,
              }
            }
          }
        },
        _count: {
          select: {
            preferencias: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Retornar null si no hay campaña activa, o la campaña
    return successResponse(campana);
  } catch (error) {
    return handleApiError(error, 'API GET /api/campanas-vacaciones');
  }
}

// POST /api/campanas-vacaciones - Crear campaña
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Solo HR Admin o Manager pueden crear campañas
    if (session.user.rol !== UsuarioRol.hr_admin && session.user.rol !== UsuarioRol.manager) {
      return badRequestResponse('No tienes permisos para crear campañas de vacaciones');
    }

    const body = await getJsonBody<Record<string, unknown>>(req);
    const validationResult = campanaVacacionesCreateSchema.safeParse(body);

    if (!validationResult.success) {
      return badRequestResponse(validationResult.error.issues[0]?.message || 'Datos inválidos');
    }

    const data = validationResult.data;

    // Determinar empleados asignados
interface EmpleadoAsignado {
  id: string;
  usuarioId: string | null;
  nombre: string;
  apellidos: string;
  email: string;
  estadoEmpleado?: string | null;
}
    
    let empleadosAsignados: EmpleadoAsignado[] = [];

    const solapamientoMaximoPct =
      data.alcance === 'equipos' ? data.solapamientoMaximoPct ?? null : null;

    if (data.alcance === 'todos') {
      // Todos los empleados activos de la empresa
      empleadosAsignados = await prisma.empleado.findMany({
        where: {
          empresaId: session.user.empresaId,
          estadoEmpleado: 'activo',
        },
        select: {
          id: true,
          usuarioId: true,
          nombre: true,
          apellidos: true,
          email: true,
          estadoEmpleado: true,
        }
      });
    } else if (data.alcance === 'equipos' && data.equipoIds && data.equipoIds.length > 0) {
      // Empleados de equipos seleccionados
      const equipos = await prisma.equipo.findMany({
        where: {
          id: { in: data.equipoIds },
          empresaId: session.user.empresaId,
        },
        include: {
          manager: {
            select: {
              id: true,
              usuarioId: true,
              nombre: true,
              apellidos: true,
              email: true,
              estadoEmpleado: true,
            },
          },
          miembros: {
            include: {
              empleado: {
                select: {
                  id: true,
                  usuarioId: true,
                  nombre: true,
                  apellidos: true,
                  email: true,
                  estadoEmpleado: true,
                }
              }
            }
          }
        }
      });

      // Obtener empleados únicos y activos
      const empleadosSet = new Set<string>();
      empleadosAsignados = [];

      for (const equipo of equipos) {
        for (const miembro of equipo.miembros) {
          if (
            miembro.empleado.estadoEmpleado === 'activo' &&
            !empleadosSet.has(miembro.empleado.id)
          ) {
            empleadosSet.add(miembro.empleado.id);
            empleadosAsignados.push(miembro.empleado);
          }
        }

        if (
          equipo.manager &&
          equipo.manager.estadoEmpleado === 'activo' &&
          !empleadosSet.has(equipo.manager.id)
        ) {
          empleadosSet.add(equipo.manager.id);
          empleadosAsignados.push(equipo.manager);
        }
      }
    } else {
      return badRequestResponse('Debe seleccionar al menos un equipo');
    }

    if (empleadosAsignados.length === 0) {
      return badRequestResponse('No hay empleados asignados a esta campaña');
    }

    // Convertir fechas a Date objects (solo fecha, sin hora para campos DATE)
    let fechaInicioObjetivo: Date;
    let fechaFinObjetivo: Date;

    try {
      if (typeof data.fechaInicioObjetivo === 'string') {
        // Formato YYYY-MM-DD del input date
        const [year, month, day] = data.fechaInicioObjetivo.split('-').map(Number);
        fechaInicioObjetivo = new Date(Date.UTC(year, month - 1, day));
      } else {
        fechaInicioObjetivo = data.fechaInicioObjetivo;
      }

      if (typeof data.fechaFinObjetivo === 'string') {
        const [year, month, day] = data.fechaFinObjetivo.split('-').map(Number);
        fechaFinObjetivo = new Date(Date.UTC(year, month - 1, day));
      } else {
        fechaFinObjetivo = data.fechaFinObjetivo;
      }

      // Validar que las fechas son válidas
      if (isNaN(fechaInicioObjetivo.getTime()) || isNaN(fechaFinObjetivo.getTime())) {
        console.error('[Campaña] Fechas inválidas:', { 
          fechaInicioObjetivo: data.fechaInicioObjetivo, 
          fechaFinObjetivo: data.fechaFinObjetivo 
        });
        return badRequestResponse('Las fechas proporcionadas no son válidas');
      }

      // Validar que fecha fin >= fecha inicio
      if (fechaFinObjetivo < fechaInicioObjetivo) {
        return badRequestResponse('La fecha de fin debe ser posterior o igual a la fecha de inicio');
      }
    } catch (error) {
      console.error('[Campaña] Error parseando fechas:', error);
      return badRequestResponse('Error al procesar las fechas');
    }

    console.info('[Campaña] Creando campaña con fechas:', {
      fechaInicioObjetivo: fechaInicioObjetivo.toISOString().split('T')[0],
      fechaFinObjetivo: fechaFinObjetivo.toISOString().split('T')[0],
      fechaInicioRaw: data.fechaInicioObjetivo,
      fechaFinRaw: data.fechaFinObjetivo,
    });

    // Enforce single active campaign: Close any existing "abierta" campaigns
    const campanasAbiertas = await prisma.campanaVacaciones.findMany({
      where: {
        empresaId: session.user.empresaId,
        estado: 'abierta',
      },
      select: { id: true, titulo: true },
    });

    if (campanasAbiertas.length > 0) {
      console.info(`[Campaña] Cerrando ${campanasAbiertas.length} campaña(s) abierta(s) existente(s)`);
      await prisma.campanaVacaciones.updateMany({
        where: {
          empresaId: session.user.empresaId,
          estado: 'abierta',
        },
        data: {
          estado: 'cerrada',
        },
      });
    }

    // Crear campaña
    const campana = await prisma.campanaVacaciones.create({
      data: {
        empresaId: session.user.empresaId,
        titulo: data.titulo,
        alcance: data.alcance,
        equipoIds: asJsonValue(data.equipoIds || null),
        solapamientoMaximoPct,
        fechaInicioObjetivo,
        fechaFinObjetivo,
        totalEmpleadosAsignados: empleadosAsignados.length,
        empleadosCompletados: 0,
      }
    });

    // Crear preferencias vacías para cada empleado
    try {
      await prisma.preferenciaVacaciones.createMany({
        data: empleadosAsignados.map(emp => ({
          campanaId: campana.id,
          empleadoId: emp.id,
          empresaId: session.user.empresaId,
          diasIdeales: [],
          completada: false,
          aceptada: false,
        }))
      });
      console.info(`[Campaña] ${empleadosAsignados.length} preferencias creadas`);
    } catch (error) {
      console.error('[Campaña] Error creando preferencias:', error);
      // No fallar si hay problema con preferencias, pero loguearlo
    }

    // Crear notificaciones para cada empleado usando la función tipada
    try {
      const empleadosIds = empleadosAsignados.map(emp => emp.id);
      await crearNotificacionCampanaCreada(prisma, {
        campanaId: campana.id,
        empresaId: session.user.empresaId,
        empleadosIds,
        fechaInicio: fechaInicioObjetivo,
        fechaFin: fechaFinObjetivo,
        titulo: data.titulo,
      });
      console.info(`[Campaña] Notificaciones enviadas a ${empleadosIds.length} empleados`);
    } catch (error) {
      console.error('[Campaña] Error creando notificaciones:', error);
      // No fallar si hay problema con notificaciones, pero loguearlo
    }

    console.info(`[Campaña Vacaciones] Campaña creada: ${campana.id} con ${empleadosAsignados.length} empleados`);

    // Retornar solo los datos necesarios para evitar problemas de serialización
    return createdResponse({
      id: campana.id,
      titulo: campana.titulo,
      alcance: campana.alcance,
      estado: campana.estado,
      totalEmpleadosAsignados: campana.totalEmpleadosAsignados,
      empleadosCompletados: campana.empleadosCompletados,
      fechaInicioObjetivo: campana.fechaInicioObjetivo.toISOString().split('T')[0],
      fechaFinObjetivo: campana.fechaFinObjetivo.toISOString().split('T')[0],
      createdAt: campana.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('[Campaña] Error completo:', error);
    return handleApiError(error, 'API POST /api/campanas-vacaciones');
  }
}

