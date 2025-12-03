// ========================================
// API Empleados - GET (Listar) y POST (Crear)
// ========================================

import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { NextRequest } from 'next/server';

import {
  handleApiError,
  requireAuthAsHR,
  successResponse,
} from '@/lib/api-handler';
import { getBaseUrl } from '@/lib/email';
import { logAccesoSensibles } from '@/lib/auditoria';
import { UsuarioRol } from '@/lib/constants/enums';
import { CARPETAS_SISTEMA } from '@/lib/documentos';
import { decryptEmpleadoList, encryptEmpleadoData } from '@/lib/empleado-crypto';
import { invitarEmpleado } from '@/lib/invitaciones';
import { getOrCreateDefaultJornada } from '@/lib/jornadas/get-or-create-default';
import { crearNotificacionEmpleadoCreado } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';
import { empleadoSelectListado } from '@/lib/prisma/selects';
import {
  buildPaginationMeta,
  parsePaginationParams,
} from '@/lib/utils/pagination';

// GET /api/empleados - Listar todos los empleados (solo HR Admin)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePaginationParams(searchParams);

    const where: Prisma.empleadosWhereInput = {
      empresaId: session.user.empresaId,
    };

    const activosParam = searchParams.get('activos');
    if (!activosParam || activosParam === 'true') {
      where.activo = true;
    } else if (activosParam === 'false') {
      where.activo = false;
    }

    const [empleados, total] = await Promise.all([
      prisma.empleados.findMany({
        where,
        select: empleadoSelectListado,
        orderBy: {
          apellidos: 'asc',
        },
        skip,
        take: limit,
      }),
      prisma.empleados.count({ where }),
    ]);

    const empleadosDesencriptados = decryptEmpleadoList(empleados);

    await logAccesoSensibles({
      request,
      session,
      recurso: 'empleados',
      camposAccedidos: ['listado'],
    });

    return successResponse({
      data: empleadosDesencriptados,
      pagination: buildPaginationMeta(page, limit, total),
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/empleados');
  }
}

// POST /api/empleados - Crear nuevo empleado (solo HR Admin)
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

  const body = await request.json() as Record<string, unknown>;
  const baseUrl = getBaseUrl(request.headers.get('origin') ?? undefined);
    const equipoIdsInput = Array.isArray(body.equipoIds)
      ? body.equipoIds.filter(
          (value): value is string => typeof value === 'string' && value.trim().length > 0
        )
      : [];

    const sanitizeOptionalString = (value: unknown): string | null => {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    };

    const sanitizeEmail = (email: unknown): string | null => {
      if (typeof email !== 'string') return null;
      const trimmed = email.trim().toLowerCase();
      return trimmed.length > 0 ? trimmed : null;
    };

    const sanitizeNif = (nif: unknown): string | null => {
      const sanitized = sanitizeOptionalString(nif);
      return sanitized ? sanitized.toUpperCase() : null;
    };

    const parseDateString = (value: unknown): Date | null => {
      if (typeof value !== 'string') {
        return null;
      }
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const email = sanitizeEmail(body.email);
    const nombre = sanitizeOptionalString(body.nombre);
    const apellidos = sanitizeOptionalString(body.apellidos);

    // Validaciones básicas
    if (!nombre || !apellidos || !email) {
      return handleApiError(
        new Error('Nombre, apellidos y email son requeridos'),
        'API POST /api/empleados'
      );
    }

    // Verificar que el email no exista
    const existingUsuario = await prisma.usuarios.findUnique({
      where: { email },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
            activo: true,
          },
        },
      },
    });

    if (existingUsuario) {
      // Si el usuario ya existe, devolver información del empleado existente
      // para que el frontend pueda manejar el caso apropiadamente
      return Response.json(
        {
          error: 'El email ya está en uso',
          code: 'EMAIL_DUPLICADO',
          empleadoExistente: existingUsuario.empleado ? {
            id: existingUsuario.empleado.id,
            nombre: existingUsuario.empleado.nombre,
            apellidos: existingUsuario.empleado.apellidos,
            email: existingUsuario.empleado.email,
            activo: existingUsuario.empleado.activo,
          } : null,
        },
        { status: 409 } // 409 Conflict es más apropiado que 500 para duplicados
      );
    }

    // Obtener o crear jornada por defecto (garantiza que siempre haya una)
    const jornadaPorDefecto = await getOrCreateDefaultJornada(prisma, session.user.empresaId);

    // Crear usuario y empleado en transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear usuario
      const usuario = await tx.usuarios.create({
        data: {
          email,
          password: await hash(Math.random().toString(36).slice(-8), 10), // Password temporal
          rol: UsuarioRol.empleado,
          nombre,
          apellidos,
          empresaId: session.user.empresaId,
          activo: typeof body.activo === 'boolean' ? body.activo : true,
        },
      });

      // Preparar datos del empleado
      const salarioBaseAnual =
        body.salarioBaseAnual !== undefined && body.salarioBaseAnual !== null && typeof body.salarioBaseAnual === 'number'
          ? new Prisma.Decimal(body.salarioBaseAnual)
          : null;
      const salarioBaseMensual =
        body.salarioBaseMensual !== undefined && body.salarioBaseMensual !== null && typeof body.salarioBaseMensual === 'number'
          ? new Prisma.Decimal(body.salarioBaseMensual)
          : null;

      const bicNormalizado = sanitizeOptionalString(body.bic);

      const empleadoData = {
        usuarioId: usuario.id,
        empresaId: session.user.empresaId,
        nombre,
        apellidos,
        email,
        nif: sanitizeNif(body.nif),
        nss: sanitizeOptionalString(body.nss),
        fechaNacimiento: parseDateString(body.fechaNacimiento),
        telefono: sanitizeOptionalString(body.telefono),
        direccionCalle: sanitizeOptionalString(body.direccionCalle),
        direccionNumero: sanitizeOptionalString(body.direccionNumero),
        direccionPiso: sanitizeOptionalString(body.direccionPiso),
        codigoPostal: sanitizeOptionalString(body.codigoPostal),
        ciudad: sanitizeOptionalString(body.ciudad),
        direccionProvincia: sanitizeOptionalString(body.direccionProvincia),
        estadoCivil: sanitizeOptionalString(body.estadoCivil),
        numeroHijos: typeof body.numeroHijos === 'number' ? body.numeroHijos : 0,
        genero: sanitizeOptionalString(body.genero),
        iban: sanitizeOptionalString(body.iban),
        bic: bicNormalizado ? bicNormalizado.replace(/\s+/g, '').toUpperCase() : null,
        puestoId: sanitizeOptionalString(body.puestoId),
        jornadaId: jornadaPorDefecto.id, // Siempre tendrá una jornada (getOrCreateDefaultJornada garantiza que exista)
        fechaAlta: parseDateString(body.fechaAlta) ?? new Date(),
        tipoContrato: typeof body.tipoContrato === 'string' ? body.tipoContrato : 'indefinido',
        salarioBaseAnual,
        salarioBaseMensual,
        activo: typeof body.activo === 'boolean' ? body.activo : true,
        onboardingCompletado: typeof body.onboardingCompletado === 'boolean' ? body.onboardingCompletado : false,
      } as const;

      // Encriptar datos sensibles antes de crear
      const datosEncriptados = encryptEmpleadoData({
        nif: empleadoData.nif,
        nss: empleadoData.nss,
        iban: empleadoData.iban,
      });
      const empleadoCreateData = {
        ...empleadoData,
        ...datosEncriptados,
      };

      // Crear empleado con datos encriptados
      const empleado = await tx.empleados.create({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: empleadoCreateData as any,
      });

      // Garantizar vínculo bidireccional usuario <-> empleado
      await tx.usuarios.update({
        where: { id: usuario.id },
        data: { empleadoId: empleado.id },
      });

      // Asignar equipos si se proporcionaron
      if (equipoIdsInput.length > 0) {
        await tx.empleado_equipos.createMany({
          data: equipoIdsInput.map((equipoId) => ({
            empleadoId: empleado.id,
            equipoId,
          })),
        });
      }

      // Crear carpetas del sistema automáticamente usando constante
      await tx.carpetas.createMany({
        data: CARPETAS_SISTEMA.map((nombreCarpeta) => ({
          empresaId: session.user.empresaId,
          empleadoId: empleado.id,
          nombre: nombreCarpeta,
          esSistema: true,
        })),
      });

      return { usuario, empleado };
    });

    console.log(`[API POST /api/empleados] Empleado creado: ${result.empleado.id}`);

    // Crear invitación automática y enviar email
    try {
      const invitacionResult = await invitarEmpleado({
        empleadoId: result.empleado.id,
        empresaId: session.user.empresaId,
        email: result.empleado.email,
        nombre: result.empleado.nombre,
        apellidos: result.empleado.apellidos,
        tipoOnboarding: 'completo',
        baseUrl,
      });

      if (!invitacionResult.success) {
        console.error(
          '[API POST /api/empleados] Error creando invitación automática:',
          invitacionResult.error
        );
      } else if (!invitacionResult.emailEnviado) {
        console.warn(
          '[API POST /api/empleados] Invitación creada pero el email no se envió automáticamente'
        );
      } else {
        console.log(
          `[API POST /api/empleados] Invitación enviada a ${result.empleado.email}`
        );
      }
    } catch (error) {
      console.error('[API POST /api/empleados] Error procesando invitación automática:', error);
    }

    // Notificar a HR sobre la creación del empleado
    try {
      await crearNotificacionEmpleadoCreado(
        prisma,
        {
          empleadoId: result.empleado.id,
          empresaId: session.user.empresaId,
          empleadoNombre: `${result.empleado.nombre} ${result.empleado.apellidos}`,
        },
        { actorUsuarioId: session.user.id }
      );
    } catch (error) {
      console.error('[API POST /api/empleados] Error creando notificación:', error);
      // No fallar la creación del empleado si falla la notificación
    }

    return successResponse(result.empleado, 201);
  } catch (error) {
    return handleApiError(error, 'API POST /api/empleados');
  }
}
