import { NextRequest, NextResponse as Response } from 'next/server';
import { z } from 'zod';

import {
  badRequestResponse,
  handleApiError,
  notFoundResponse,
  requireAuth,
  requireAuthAsHROrManager,
  successResponse,
  validateRequest,
} from '@/lib/api-handler';
import { logAccesoSensibles } from '@/lib/auditoria';
import { decryptEmpleadoData, encryptEmpleadoData } from '@/lib/empleado-crypto';
import {
  crearNotificacionAsignadoEquipo,
  crearNotificacionCambioManager,
  crearNotificacionCambioPuesto,
  crearNotificacionJornadaAsignada,
} from '@/lib/notificaciones';
import { prisma, Prisma } from '@/lib/prisma';

import type { empleados } from '@prisma/client';

// Schema de validación para actualizar empleado
const empleadoUpdateSchema = z.object({
  // Información Personal
  nif: z.string().optional(),
  nss: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  estadoCivil: z.string().optional(),
  numeroHijos: z.number().optional(),
  genero: z.string().optional(),

  // Información de Contacto
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  codigoPostal: z.string().optional(),
  ciudad: z.string().optional(),

  // Información Laboral
  puestoId: z.string().optional(),
  equipoIds: z.array(z.string()).optional(),
  managerId: z.string().optional(),
  fechaAlta: z.string().optional(),
  tipoContrato: z.string().optional(),
  categoriaProfesional: z.string().optional(),
  nivelEducacion: z.string().optional(),
  grupoCotizacion: z.number().int().optional(),
  jornadaId: z.string().optional(),

  // Información Bancaria
  iban: z.string().optional(),
  bic: z.string().optional(),
  salarioBaseAnual: z.number().optional(),
  salarioBaseMensual: z.number().optional(),

  // Días personalizados de ausencias
  diasAusenciasPersonalizados: z.number().int().min(0).max(365).nullable().optional(),
});

// GET /api/empleados/[id] - Obtener empleado por ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    const empleado = await prisma.empleados.findUnique({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
            rol: true,
          },
        },
        equipos: {
          include: {
            equipo: true,
          },
        },
        puestoRelacion: true,
        jornada: true,
        manager: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
      },
    });

    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    // Desencriptar datos sensibles antes de retornar
    const empleadoDesencriptado = decryptEmpleadoData(empleado);

    await logAccesoSensibles({
      request,
      session,
      recurso: 'empleado',
      empleadoAccedidoId: empleado.id,
      camposAccedidos: ['perfil', 'datos_personales'],
    });

    return successResponse(empleadoDesencriptado);
  } catch (error) {
    return handleApiError(error, 'API GET /api/empleados/[id]');
  }
}

// PATCH /api/empleados/[id] - Actualizar empleado (HR Admin o Manager)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  try {
    // Verificar autenticación y rol HR Admin o Manager
    const authResult = await requireAuthAsHROrManager(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { id } = await params;

    // Validar request body
    const validationResult = await validateRequest(request, empleadoUpdateSchema);
    if (validationResult instanceof Response) return validationResult;
    const { data: validatedData } = validationResult;

    // Extraer equipoIds para manejar relación many-to-many
    const { equipoIds, ...rawEmpleadoData } = validatedData;
    const empleadoData = {
      ...rawEmpleadoData,
      ...(rawEmpleadoData.bic
        ? { bic: rawEmpleadoData.bic.replace(/\s+/g, '').toUpperCase() }
        : {}),
    };

    // Validar foreign keys antes de actualizar
    // Validar managerId si se proporciona
    if (empleadoData.managerId) {
      const managerExiste = await prisma.empleados.findUnique({
        where: {
          id: empleadoData.managerId,
          empresaId: session.user.empresaId,
        },
      });

      if (!managerExiste) {
        return badRequestResponse('El manager especificado no existe');
      }

      // Evitar auto-referencias circulares (un empleado no puede ser su propio manager)
      if (empleadoData.managerId === id) {
        return badRequestResponse('Un empleado no puede ser su propio manager');
      }
    }

    // Validar puestoId si se proporciona
    if (empleadoData.puestoId) {
      const puestoExiste = await prisma.puestos.findUnique({
        where: {
          id: empleadoData.puestoId,
          empresaId: session.user.empresaId,
        },
      });

      if (!puestoExiste) {
        return badRequestResponse('El puesto especificado no existe');
      }
    }

    // Validar jornadaId si se proporciona
    if (empleadoData.jornadaId) {
      const jornadaExiste = await prisma.jornadas.findUnique({
        where: {
          id: empleadoData.jornadaId,
          empresaId: session.user.empresaId,
        },
      });

      if (!jornadaExiste) {
        return badRequestResponse('La jornada especificada no existe');
      }

      // Validar que la jornada esté activa
      if (!jornadaExiste.activa) {
        return badRequestResponse('La jornada especificada está inactiva. Solo se pueden asignar jornadas activas a empleados.');
      }
    }

    // Validar equipoIds si se proporcionan
    if (equipoIds && equipoIds.length > 0) {
      const equiposExistentes = await prisma.equipos.findMany({
        where: {
          id: { in: equipoIds },
          empresaId: session.user.empresaId,
        },
      });

      if (equiposExistentes.length !== equipoIds.length) {
        return badRequestResponse('Uno o más equipos especificados no existen');
      }
    }

    // Validar diasAusenciasPersonalizados si se proporcionan
    if (empleadoData.diasAusenciasPersonalizados !== undefined && empleadoData.diasAusenciasPersonalizados !== null) {
      // Obtener el mínimo global de la empresa
      const empleadoParaValidar = await prisma.empleados.findUnique({
        where: { id, empresaId: session.user.empresaId },
        select: { diasVacaciones: true },
      });

      if (!empleadoParaValidar) {
        return notFoundResponse('Empleado no encontrado');
      }

      // Los días personalizados deben ser >= al mínimo global
      if (empleadoData.diasAusenciasPersonalizados < empleadoParaValidar.diasVacaciones) {
        return badRequestResponse(
          `Los días personalizados deben ser al menos ${empleadoParaValidar.diasVacaciones} (mínimo global de la empresa)`
        );
      }
    }

    // Obtener datos actuales del empleado antes de actualizar
    const empleadoActual = await prisma.empleados.findUnique({
      where: { id, empresaId: session.user.empresaId },
      include: {
        equipos: { select: { equipoId: true } },
        manager: { select: { id: true, nombre: true, apellidos: true } },
      },
    });

    if (!empleadoActual) {
      return notFoundResponse('Empleado no encontrado');
    }

    const oldManagerId = empleadoActual.managerId;
    const oldEquipoIds = empleadoActual.equipos.map(e => e.equipoId);

    // Preparar datos para actualización
    // Limpiar campos undefined para evitar errores de Prisma
    const datosParaActualizar: Prisma.empleadosUpdateInput = {};
    
    // Solo incluir campos que tienen valores definidos y válidos
    if (empleadoData.fechaNacimiento !== undefined) {
      // Validar que la fecha no esté vacía y sea válida
      if (empleadoData.fechaNacimiento && empleadoData.fechaNacimiento.trim() !== '') {
        const fecha = new Date(empleadoData.fechaNacimiento);
        if (!isNaN(fecha.getTime())) {
          datosParaActualizar.fechaNacimiento = fecha;
        } else {
          return badRequestResponse('La fecha de nacimiento proporcionada no es válida');
        }
      } else {
        // Si está vacío, establecer como null
        datosParaActualizar.fechaNacimiento = null;
      }
    }
    if (empleadoData.fechaAlta !== undefined) {
      // Validar que la fecha no esté vacía y sea válida
      if (empleadoData.fechaAlta && empleadoData.fechaAlta.trim() !== '') {
        const fecha = new Date(empleadoData.fechaAlta);
        if (!isNaN(fecha.getTime())) {
          datosParaActualizar.fechaAlta = fecha;
        } else {
          return badRequestResponse('La fecha de alta proporcionada no es válida');
        }
      } else {
        return badRequestResponse('La fecha de alta es requerida');
      }
    }
    if (empleadoData.salarioBaseAnual !== undefined) {
      datosParaActualizar.salarioBaseAnual = new Prisma.Decimal(empleadoData.salarioBaseAnual);
    }
    if (empleadoData.salarioBaseMensual !== undefined) {
      datosParaActualizar.salarioBaseMensual = new Prisma.Decimal(empleadoData.salarioBaseMensual);
    }
    
    // Incluir otros campos que no sean undefined
    Object.keys(empleadoData).forEach((key) => {
      if (
        key !== 'fechaNacimiento' &&
        key !== 'fechaAlta' &&
        key !== 'salarioBaseAnual' &&
        key !== 'salarioBaseMensual' &&
        empleadoData[key as keyof typeof empleadoData] !== undefined
      ) {
        (datosParaActualizar as Record<string, unknown>)[key] =
          empleadoData[key as keyof typeof empleadoData];
      }
    });

    // Encriptar campos sensibles antes de guardar
    const datosEncriptados = encryptEmpleadoData(
      datosParaActualizar as Partial<empleados>
    ) as Prisma.empleadosUpdateInput;

    // Actualizar empleado y relaciones en una transacción
    const empleado = await prisma.$transaction(async (tx) => {
      // Actualizar datos del empleado con encriptación
      // Filtrar campos undefined/nulos que no deben actualizarse
      const datosLimpios = Object.fromEntries(
        Object.entries(datosEncriptados).filter(([, value]) => value !== undefined)
      );
      
      // Si no hay datos para actualizar, retornar el empleado actual
      if (Object.keys(datosLimpios).length === 0) {
        return await tx.empleados.findUnique({
          where: { id, empresaId: session.user.empresaId },
          include: { usuario: { select: { id: true } } },
        });
      }
      
      const updatedEmpleado = await tx.empleados.update({
        where: {
          id,
          empresaId: session.user.empresaId,
        },
        data: datosLimpios,
        include: {
          usuario: { select: { id: true } },
        },
      });

      // Actualizar equipos si se proporcionaron
      if (equipoIds !== undefined) {
        // Eliminar todas las relaciones existentes
        await tx.empleado_equipos.deleteMany({
          where: { empleadoId: id },
        });

        // Crear nuevas relaciones
        if (equipoIds.length > 0) {
          await tx.empleado_equipos.createMany({
            data: equipoIds.map((equipoId) => ({
              empleadoId: id,
              equipoId,
            })),
          });
        }
      }

      return updatedEmpleado;
    });

    // Crear notificaciones de cambios importantes
    try {
      // 1. Cambio de manager
      if (empleadoData.managerId && empleadoData.managerId !== oldManagerId) {
        const nuevoManager = await prisma.empleados.findUnique({
          where: { id: empleadoData.managerId },
          select: { nombre: true, apellidos: true },
        });

        if (nuevoManager) {
          await crearNotificacionCambioManager(
            prisma,
            {
              empleadoId: id,
              empresaId: session.user.empresaId,
              empleadoNombre: `${empleadoActual.nombre} ${empleadoActual.apellidos}`,
              nuevoManagerId: empleadoData.managerId,
              nuevoManagerNombre: `${nuevoManager.nombre} ${nuevoManager.apellidos}`,
              anteriorManagerId: oldManagerId || undefined,
              anteriorManagerNombre: empleadoActual.manager
                ? `${empleadoActual.manager.nombre} ${empleadoActual.manager.apellidos}`
                : undefined,
            },
            { actorUsuarioId: session.user.id }
          );
        }
      }

      // 2. Cambio de jornada
      if (
        empleadoData.jornadaId &&
        empleadoData.jornadaId !== empleadoActual.jornadaId
      ) {
        const nuevaJornada = await prisma.jornadas.findUnique({
          where: { id: empleadoData.jornadaId },
          select: { nombre: true },
        });

        if (nuevaJornada) {
          await crearNotificacionJornadaAsignada(
            prisma,
            {
              empleadoId: id,
              empresaId: session.user.empresaId,
              jornadaNombre: nuevaJornada.nombre,
            },
            { actorUsuarioId: session.user.id }
          );
        }
      }

      // 3. Cambio de puesto
      if (empleadoData.puestoId && empleadoData.puestoId !== empleadoActual.puestoId) {
        const puestoAnterior = empleadoActual.puestoId
          ? await prisma.puestos.findUnique({
              where: { id: empleadoActual.puestoId },
              select: { nombre: true },
            })
          : null;

        const puestoNuevo = await prisma.puestos.findUnique({
          where: { id: empleadoData.puestoId },
          select: { nombre: true },
        });

        if (puestoNuevo) {
          await crearNotificacionCambioPuesto(
            prisma,
            {
              empleadoId: id,
              empresaId: session.user.empresaId,
              puestoAnterior: puestoAnterior?.nombre || null,
              puestoNuevo: puestoNuevo.nombre,
            },
            { actorUsuarioId: session.user.id }
          );
        }
      }
    } catch (error) {
      console.error('[API PATCH /api/empleados/[id]] Error creando notificaciones:', error);
      // No fallar la actualización si falla la notificación
    }

    // 2. Asignación a nuevos equipos
    if (equipoIds !== undefined) {
      const nuevosEquipos = equipoIds.filter(id => !oldEquipoIds.includes(id));

      for (const equipoId of nuevosEquipos) {
        const equipo = await prisma.equipos.findUnique({
          where: { id: equipoId },
          select: { nombre: true },
        });

        if (equipo) {
          await crearNotificacionAsignadoEquipo(
            prisma,
            {
              empleadoId: id,
              empresaId: session.user.empresaId,
              empleadoNombre: `${empleadoActual.nombre} ${empleadoActual.apellidos}`,
              equipoId,
              equipoNombre: equipo.nombre,
            },
            { actorUsuarioId: session.user.id }
          );
        }
      }
    }

    // Desencriptar antes de retornar
    if (!empleado) {
      return notFoundResponse('Empleado no encontrado');
    }

    const empleadoDesencriptado = decryptEmpleadoData(empleado);

    await logAccesoSensibles({
      request,
      session,
      recurso: 'empleado',
      accion: 'modificacion',
      empleadoAccedidoId: id,
      camposAccedidos: Object.keys(datosParaActualizar),
    });

    return successResponse(empleadoDesencriptado);
  } catch (error) {
    return handleApiError(error, 'API PATCH /api/empleados/[id]');
  }
}
