// ========================================
// API Fichajes - GET, POST
// ========================================
// NUEVO MODELO: Fichaje = día completo, POST crea eventos dentro del fichaje

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validarEvento, validarLimitesJornada, calcularHorasTrabajadas, calcularTiempoEnPausa } from '@/lib/calculos/fichajes';
import {
  requireAuth,
  validateRequest,
  handleApiError,
  successResponse,
  createdResponse,
  badRequestResponse,
  forbiddenResponse,
} from '@/lib/api-handler';
import { z } from 'zod';

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
    if (authResult instanceof Response) return authResult;
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
    const empleadoId = searchParams.get('empleadoId');
    const fecha = searchParams.get('fecha');
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const estado = searchParams.get('estado');
    const propios = searchParams.get('propios');

    // 3. Construir filtros
    const where: any = {
      empresaId: session.user.empresaId,
    };

    // Filtrar por empleado
    if (empleadoId) {
      // Verificar permisos
      if (session.user.rol === 'empleado' && empleadoId !== session.user.empleadoId) {
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
    } else if (session.user.rol === 'empleado') {
      // Empleados solo ven sus propios fichajes
      if (session.user.empleadoId) {
        where.empleadoId = session.user.empleadoId;
      } else {
        return badRequestResponse('No tienes un empleado asignado. Contacta con HR.');
      }
    } else if (session.user.rol === 'manager') {
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
      where.estado = estado;
    }

    // 4. Obtener fichajes con sus eventos
    const fichajes = await prisma.fichaje.findMany({
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
      take: 500, // Límite para performance
    });

    return successResponse(fichajes);
  } catch (error) {
    return handleApiError(error, 'API GET /api/fichajes');
  }
}

// POST /api/fichajes - Crear evento de fichaje
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    // Validar request body
    const validationResult = await validateRequest(req, fichajeEventoCreateSchema);
    if (validationResult instanceof Response) return validationResult;
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

    const validacion = await validarEvento(validatedData.tipo, empleadoId);

    if (!validacion.valido) {
      return badRequestResponse(validacion.error || 'Evento inválido');
    }

    // Validar que es día laborable (solo para entrada)
    if (validatedData.tipo === 'entrada') {
      const { esDiaLaboral } = await import('@/lib/calculos/fichajes');
      const esLaboral = await esDiaLaboral(empleadoId, fecha);
      
      if (!esLaboral) {
        return badRequestResponse('No puedes fichar en un día no laborable (fin de semana, festivo o con ausencia)');
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
          estado: 'en_curso',
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
    const todosEventos = [...fichaje.eventos, evento];
    const horasTrabajadas = calcularHorasTrabajadas(todosEventos);
    const horasEnPausa = calcularTiempoEnPausa(todosEventos);

    // 9. Si es salida manual, cambiar estado a finalizado solo si es fichaje completo manual
    let nuevoEstado = fichaje.estado;
    if (validatedData.tipo === 'salida' && !fichaje.autoCompletado) {
      // Verificar que tiene entrada
      const tieneEntrada = todosEventos.some(e => e.tipo === 'entrada');
      if (tieneEntrada) {
        nuevoEstado = 'finalizado';
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
