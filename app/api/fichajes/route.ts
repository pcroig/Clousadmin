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
import { EstadoFichaje, UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';
import {
  buildPaginationMeta,
  parsePaginationParams,
} from '@/lib/utils/pagination';

const fichajeEventoCreateSchema = z.object({
  tipo: z.enum(['entrada', 'pausa_inicio', 'pausa_fin', 'salida']),
  fecha: z.string().optional(), // Opcional, default hoy
  hora: z.string().optional(), // Opcional, default ahora
  ubicacion: z.string().optional(),
});

// GET /api/fichajes - Listar fichajes
export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
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

    // 3. Construir filtros
    interface FichajeWhereClause {
      empresaId: string;
      empleadoId?: string;
      fecha?: { gte?: Date; lte?: Date };
      estado?: EstadoFichaje;
    }
    
    const where: FichajeWhereClause = {
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
      const empleadosACargo = await prisma.empleado.findMany({
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
      // Crear fecha sin hora para evitar problemas de zona horaria
      const fechaParsed = new Date(fecha);
      const fechaSoloFecha = new Date(fechaParsed.getFullYear(), fechaParsed.getMonth(), fechaParsed.getDate());
      where.fecha = fechaSoloFecha;
    } else if (fechaInicio && fechaFin) {
      // Filtrar por rango
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      where.fecha = {
        gte: new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()),
        lte: new Date(fin.getFullYear(), fin.getMonth(), fin.getDate()),
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

    // 4. Obtener fichajes con sus eventos
    const [fichajes, total] = await Promise.all([
      prisma.fichaje.findMany({
        where,
        include: {
          empleado: {
            select: {
              id: true,
              nombre: true,
              apellidos: true,
              puesto: true,
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
      prisma.fichaje.count({ where }),
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
      const fechaBase = new Date(fichaje.fecha.getFullYear(), fichaje.fecha.getMonth(), fichaje.fecha.getDate());
      const key = `${fichaje.empleadoId}_${fechaBase.toISOString().split('T')[0]}`;

      const horasEsperadas = horasEsperadasMap[key] ?? 0;

      const horasTrabajadas =
        fichaje.horasTrabajadas !== null && fichaje.horasTrabajadas !== undefined
          ? Number(fichaje.horasTrabajadas)
          : calcularHorasTrabajadas(fichaje.eventos as unknown as Array<{ tipo: string; hora: Date }>);

      const horasEnPausa =
        fichaje.horasEnPausa !== null && fichaje.horasEnPausa !== undefined
          ? Number(fichaje.horasEnPausa)
          : calcularTiempoEnPausa(fichaje.eventos as unknown as Array<{ tipo: string; hora: Date }>);

      const balance = Math.round((horasTrabajadas - horasEsperadas) * 100) / 100;

      return {
        ...fichaje,
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
    if (authResult instanceof NextResponse) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(req, fichajeEventoCreateSchema);
    if (validationResult instanceof NextResponse) return validationResult;
    const { data: validatedData } = validationResult;

    // 3. Determinar fecha y hora
    const fechaBase = validatedData.fecha ? new Date(validatedData.fecha) : new Date();
    const fecha = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate());
    const hora = validatedData.hora ? new Date(validatedData.hora) : new Date();

    // 4. Validar que el empleado puede fichar
    const empleadoId = session.user.empleadoId;
    
    if (!empleadoId) {
      return badRequestResponse('No tienes un empleado asignado. Contacta con HR.');
    }

    // Validar que el empleado tiene jornada asignada
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
      select: { jornadaId: true, jornada: { select: { activa: true } } },
    });

    if (!empleado || !empleado.jornadaId) {
      return badRequestResponse('No tienes una jornada laboral asignada. Contacta con HR para que te asignen una jornada antes de fichar.');
    }

    // Validar que la jornada esté activa
    if (!empleado.jornada || !empleado.jornada.activa) {
      return badRequestResponse('Tu jornada laboral está inactiva. Contacta con HR para que te asignen una jornada activa.');
    }

    const validacion = await validarEvento(validatedData.tipo, empleadoId);

    if (!validacion.valido) {
      return badRequestResponse(validacion.error || 'Evento inválido');
    }

    // Validar que es día laborable (solo para entrada)
    if (validatedData.tipo === 'entrada') {
      const esLaboral = await esDiaLaboral(empleadoId, fecha);
      
      if (!esLaboral) {
        return badRequestResponse('No puedes fichar en este día. Puede ser un día no laborable según el calendario de la empresa, un festivo, o tienes una ausencia de día completo.');
      }
    }

    // Validar límites de jornada
    const validacionLimites = await validarLimitesJornada(empleadoId, hora);

    if (!validacionLimites.valido) {
      return badRequestResponse(validacionLimites.error || 'Límites de jornada inválidos');
    }

    // 6. Buscar o crear fichaje del día
    let fichaje = await prisma.fichaje.findUnique({
      where: {
        empleadoId_fecha: {
          empleadoId,
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

      fichaje = await prisma.fichaje.create({
        data: {
          empresaId: session.user.empresaId,
          empleadoId,
          fecha,
          estado: EstadoFichaje.en_curso,
        },
        include: {
          eventos: true,
        },
      });
    }

    // 7. Crear evento dentro del fichaje
    const evento = await prisma.fichajeEvento.create({
      data: {
        fichajeId: fichaje.id,
        tipo: validatedData.tipo,
        hora,
        ubicacion: validatedData.ubicacion,
      },
    });

    // 8. Actualizar cálculos del fichaje
    // Obtener todos los eventos incluyendo el recién creado
    const todosEventos = await prisma.fichajeEvento.findMany({
      where: { fichajeId: fichaje.id },
      orderBy: { hora: 'asc' },
    });
    
    const horasTrabajadas = calcularHorasTrabajadas(todosEventos);
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
    const fichajeActualizado = await prisma.fichaje.update({
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
