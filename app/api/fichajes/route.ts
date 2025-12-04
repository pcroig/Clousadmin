// ========================================
// API Fichajes - GET, POST
// ========================================
// NUEVO MODELO: Fichaje = día completo, POST crea eventos dentro del fichaje

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  createdResponse,
  forbiddenResponse,
  handleApiError,
  isNextResponse,
  requireAuth,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import {
  calcularHorasTrabajadas,
  calcularTiempoEnPausa,
  esDiaLaboral,
  obtenerHorasEsperadasBatch,
  validarEvento,
  validarFichajeCompleto,
  validarLimitesJornada,
} from '@/lib/calculos/fichajes';
import { normalizarFechaSinHora } from '@/lib/utils/fechas';
import { EstadoFichaje, UsuarioRol } from '@/lib/constants/enums';
import { prisma, Prisma } from '@/lib/prisma';
import {
  buildPaginationMeta,
  parsePaginationParams,
} from '@/lib/utils/pagination';

const fichajeEventoCreateSchema = z.object({
  tipo: z.enum(['entrada', 'pausa_inicio', 'pausa_fin', 'salida']),
  fecha: z.string().optional(), // Opcional, default hoy
  hora: z.string().optional(), // Opcional, default ahora
  ubicacion: z.string().optional(),
  empleadoId: z.string().uuid().optional(),
});

// GET /api/fichajes - Listar fichajes
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (isNextResponse(authResult)) return authResult;
    const { session } = authResult;

    // Validar que la sesión tiene empresaId
    if (!session.user?.empresaId) {
      return handleApiError(
        new Error('Sesión inválida: falta empresaId'),
        'API GET /api/fichajes'
      );
    }

    // 2. Obtener parámetros de query
    const searchParams = req.nextUrl.searchParams;
    const { page, limit, skip } = parsePaginationParams(searchParams);
    const empleadoId = searchParams.get('empleadoId');
    const fecha = searchParams.get('fecha');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const estado = searchParams.get('estado');
    const propios = searchParams.get('propios');
    const equipoId = searchParams.get('equipoId');
    const search = searchParams.get('search');

    // 3. Construir filtros
    const where: Prisma.fichajesWhereInput = {
      empresaId: session.user.empresaId,
    };

    // Filtrar por empleado
    if (empleadoId) {
      // Verificar permisos
      if (session.user.rol === UsuarioRol.empleado && empleadoId !== session.user.empleadoId) {
        return forbiddenResponse('No autorizado');
      }
      where.empleadoId = empleadoId;
    } else if (propios === '1' || propios === 'true') {
      // Forzar a devolver solo los fichajes del usuario autenticado (para widgets), independientemente del rol
      if (session.user.empleadoId) {
        where.empleadoId = session.user.empleadoId;
      } else {
        return badRequestResponse('No tienes un empleado asignado. Contacta con HR.');
      }
    } else if (session.user.rol === UsuarioRol.empleado) {
      // Empleados solo ven sus propios fichajes
      if (session.user.empleadoId) {
        where.empleadoId = session.user.empleadoId;
      } else {
        return badRequestResponse('No tienes un empleado asignado. Contacta con HR.');
      }
    } else if (session.user.rol === UsuarioRol.manager) {
      // Managers solo ven fichajes de sus empleados a cargo
      if (!session.user.empleadoId) {
        return badRequestResponse('No tienes un empleado asignado. Contacta con HR.');
      }

      // Obtener IDs de empleados a cargo
      const empleadosACargo = await prisma.empleados.findMany({
        where: {
          managerId: session.user.empleadoId,
          empresaId: session.user.empresaId,
          activo: true,
        },
        select: {
          id: true,
        },
      });

      const empleadoIds = empleadosACargo.map((e) => e.id);

      if (empleadoIds.length === 0) {
        // Si no tiene empleados a cargo, devolver array vacío
        return successResponse([]);
      }

      where.empleadoId = {
        in: empleadoIds,
      };
    }

    // Filtrar por fecha
    if (fecha) {
      // FIX CRÍTICO: Usar normalizarFechaSinHora para evitar problemas de zona horaria
      const fechaParsed = new Date(fecha);
      where.fecha = normalizarFechaSinHora(fechaParsed);
    } else if (fechaInicio && fechaFin) {
      // Filtrar por rango
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      // FIX CRÍTICO: Usar normalizarFechaSinHora para evitar desfases de zona horaria
      where.fecha = {
        gte: normalizarFechaSinHora(inicio),
        lte: normalizarFechaSinHora(fin),
      };
    }

    // Filtrar por estado
    if (estado && estado !== 'todos') {
      if ((Object.values(EstadoFichaje) as string[]).includes(estado)) {
        where.estado = estado as EstadoFichaje;
      } else {
        return badRequestResponse('Estado de fichaje inválido');
      }
    }

    const andFilters: Prisma.fichajesWhereInput[] = [];

    if (equipoId && equipoId !== 'todos') {
      andFilters.push({
        empleado: {
          equipos: {
            some: {
              equipoId,
            },
          },
        },
      });
    }

    if (search) {
      andFilters.push({
        empleado: {
          OR: [
            { nombre: { contains: search, mode: 'insensitive' } },
            { apellidos: { contains: search, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (andFilters.length > 0) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        ...andFilters
      ];
    }

    // 4. Obtener fichajes con sus eventos
    const [fichajes, total] = await Promise.all([
      prisma.fichajes.findMany({
        where,
        include: {
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              puesto: true,
              equipos: {
                select: {
                  equipo: {
                    select: {
                      id: true,
                      nombre: true,
                    },
                  },
                },
                take: 1,
              },
            },
          },
          eventos: {
            orderBy: {
              hora: 'asc',
            },
          },
        },
        orderBy: [
          { fecha: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.fichajes.count({ where }),
    ]);

    if (fichajes.length === 0) {
      return successResponse({
        data: [],
        pagination: buildPaginationMeta(page, limit, total),
      });
    }

    const horasEsperadasMap = await obtenerHorasEsperadasBatch(
      fichajes.map((fichaje) => ({
        empleadoId: fichaje.empleadoId,
        fecha: fichaje.fecha,
      }))
    );

    const fichajesConBalance = fichajes.map((fichaje) => {
      const equipoAsignado = fichaje.empleado.equipos?.[0]?.equipo ?? null;
      const empleado = {
        id: fichaje.empleado.id,
        nombre: fichaje.empleado.nombre,
        apellidos: fichaje.empleado.apellidos,
        puesto: fichaje.empleado.puesto,
        equipoId: equipoAsignado?.id ?? null,
        equipo: equipoAsignado
          ? {
              id: equipoAsignado.id,
              nombre: equipoAsignado.nombre,
            }
          : null,
      };

      // FIX CRÍTICO: Usar normalizarFechaSinHora
      const fechaBase = normalizarFechaSinHora(fichaje.fecha);
      const key = `${fichaje.empleadoId}_${fechaBase.toISOString().split('T')[0]}`;

      const horasEsperadas = horasEsperadasMap[key] ?? 0;
      const eventos = fichaje.eventos ?? [];

      const horasTrabajadas =
        fichaje.horasTrabajadas !== null && fichaje.horasTrabajadas !== undefined
          ? Number(fichaje.horasTrabajadas)
          : calcularHorasTrabajadas(eventos) ?? 0;

      const horasEnPausa =
        fichaje.horasEnPausa !== null && fichaje.horasEnPausa !== undefined
          ? Number(fichaje.horasEnPausa)
          : calcularTiempoEnPausa(eventos);

      const balance = Math.round((horasTrabajadas - horasEsperadas) * 100) / 100;

      const { empleado: _empleado, ...restoFichaje } = fichaje;

      return {
        ...restoFichaje,
        empleado,
        horasTrabajadas,
        horasEnPausa,
        horasEsperadas,
        balance,
      };
    });

    return successResponse({
      data: fichajesConBalance,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/fichajes');
  }
}

// POST /api/fichajes - Crear evento de fichaje
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (isNextResponse(authResult)) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(req, fichajeEventoCreateSchema);
    if (isNextResponse(validationResult)) return validationResult;
    const { data: validatedData } = validationResult;

    // 3. Determinar empleado objetivo
    const requestedEmpleadoId = validatedData.empleadoId;
    const sessionEmpleadoId = session.user.empleadoId ?? undefined;

    const targetEmpleadoId = requestedEmpleadoId ?? sessionEmpleadoId;

    if (!targetEmpleadoId) {
      return badRequestResponse('No se ha especificado un empleado válido para el fichaje');
    }

    if (requestedEmpleadoId && requestedEmpleadoId !== sessionEmpleadoId) {
      if (session.user.rol === UsuarioRol.empleado) {
        return forbiddenResponse('No puedes registrar fichajes para otros empleados');
      }

      if (session.user.rol === UsuarioRol.manager) {
        if (!sessionEmpleadoId) {
          return forbiddenResponse('No tienes un empleado asignado. Contacta con HR.');
        }

        const empleadosACargo = await prisma.empleados.findMany({
          where: {
            managerId: sessionEmpleadoId,
            empresaId: session.user.empresaId,
            activo: true,
          },
          select: { id: true },
        });

        const puedeGestionar = empleadosACargo.some((emp) => emp.id === requestedEmpleadoId);
        if (!puedeGestionar) {
          return forbiddenResponse('No puedes registrar fichajes para empleados fuera de tu equipo');
        }
      }
    }

    // 4. Determinar fecha y hora
    // FIX CRÍTICO: Usar normalizarFechaSinHora para evitar desfases
    const fechaBase = validatedData.fecha ? new Date(validatedData.fecha) : new Date();
    const fecha = normalizarFechaSinHora(fechaBase);
    const hora = validatedData.hora ? new Date(validatedData.hora) : new Date();

    // Validar que el empleado tiene jornada asignada
    const empleado = await prisma.empleados.findUnique({
      where: { id: targetEmpleadoId, empresaId: session.user.empresaId },
      select: {
        empresaId: true,
        jornadaId: true,
        jornada: { select: { activa: true } },
      },
    });

    if (!empleado) {
      return badRequestResponse('Empleado no encontrado en tu empresa');
    }

    if (!empleado.jornadaId) {
      return badRequestResponse('No tienes una jornada laboral asignada. Contacta con HR para que te asignen una jornada antes de fichar.');
    }

    // Validar que la jornada esté activa
    if (!empleado.jornada || !empleado.jornada.activa) {
      return badRequestResponse('Tu jornada laboral está inactiva. Contacta con HR para que te asignen una jornada activa.');
    }

    const validacion = await validarEvento(validatedData.tipo, targetEmpleadoId);

    if (!validacion.valido) {
      return badRequestResponse(validacion.error || 'Evento inválido');
    }

    // Validar que es día laborable (solo para entrada)
    if (validatedData.tipo === 'entrada') {
      const esLaboral = await esDiaLaboral(targetEmpleadoId, fecha);
      
      if (!esLaboral) {
        return badRequestResponse('No puedes fichar en este día. Puede ser un día no laborable según el calendario de la empresa, un festivo, o tienes una ausencia de día completo.');
      }
    }

    // Validar límites de jornada
    const validacionLimites = await validarLimitesJornada(targetEmpleadoId, hora);

    if (!validacionLimites.valido) {
      return badRequestResponse(validacionLimites.error || 'Límites de jornada inválidos');
    }

    // 6. Buscar o crear fichaje del día
    let fichaje = await prisma.fichajes.findUnique({
      where: {
        empleadoId_fecha: {
          empleadoId: targetEmpleadoId,
          fecha,
        },
      },
      include: {
        eventos: true,
      },
    });

    if (!fichaje) {
      // Crear fichaje del día (solo si es entrada)
      if (validatedData.tipo !== 'entrada') {
        return badRequestResponse('Debes iniciar la jornada primero (entrada)');
      }

      fichaje = await prisma.fichajes.create({
        data: {
          empresaId: empleado.empresaId,
          empleadoId: targetEmpleadoId,
          jornadaId: empleado.jornadaId,
          fecha,
          estado: EstadoFichaje.en_curso,
        },
        include: {
          eventos: true,
        },
      });
    }

    // 7. Crear evento dentro del fichaje
    const _evento = await prisma.fichaje_eventos.create({
      data: {
        fichajeId: fichaje.id,
        tipo: validatedData.tipo,
        hora,
        ubicacion: validatedData.ubicacion,
      },
    });

    // 8. Actualizar cálculos del fichaje
    // Obtener todos los eventos incluyendo el recién creado
    const todosEventos = await prisma.fichaje_eventos.findMany({
      where: { fichajeId: fichaje.id },
      orderBy: { hora: 'asc' },
    });
    
    const horasTrabajadas = calcularHorasTrabajadas(todosEventos) ?? 0;
    const horasEnPausa = calcularTiempoEnPausa(todosEventos);

    // 9. Validar si el fichaje está completo después de agregar el evento
    // Si es salida, validar si el fichaje está completo según la jornada
    let nuevoEstado = fichaje.estado;
    if (validatedData.tipo === 'salida') {
      // Validar si el fichaje está completo según la jornada
      const validacion = await validarFichajeCompleto(fichaje.id);
      
      if (validacion.completo) {
        nuevoEstado = EstadoFichaje.finalizado;
      }
    }

    // 10. Actualizar fichaje con cálculos y estado
    const fichajeActualizado = await prisma.fichajes.update({
      where: { id: fichaje.id },
      data: {
        horasTrabajadas,
        horasEnPausa,
        estado: nuevoEstado,
      },
      include: {
        eventos: {
          orderBy: {
            hora: 'asc',
          },
        },
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
          },
        },
      },
    });

    return createdResponse(fichajeActualizado);
  } catch (error) {
    return handleApiError(error, 'API POST /api/fichajes');
  }
}
