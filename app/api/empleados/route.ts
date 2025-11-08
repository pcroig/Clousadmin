// ========================================
// API Empleados - GET (Listar) y POST (Crear)
// ========================================

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuthAsHR,
  handleApiError,
  successResponse,
} from '@/lib/api-handler';
import { hash } from 'bcryptjs';

import { UsuarioRol } from '@/lib/constants/enums';

// GET /api/empleados - Listar todos los empleados (solo HR Admin)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const empleados = await prisma.empleado.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
      },
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
            rol: true,
            nombre: true,
            apellidos: true,
          },
        },
        manager: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
        puestoRelacion: {
          select: {
            id: true,
            nombre: true,
          },
        },
        equipos: {
          include: {
            equipo: {
              select: {
                id: true,
                nombre: true,
              },
            },
          },
        },
      },
      orderBy: {
        apellidos: 'asc',
      },
    });

    return successResponse(empleados);
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

    const body = await request.json();

    // Validaciones básicas
    if (!body.nombre || !body.apellidos || !body.email) {
      return handleApiError(
        new Error('Nombre, apellidos y email son requeridos'),
        'API POST /api/empleados'
      );
    }

    // Verificar que el email no exista
    const existingUsuario = await prisma.usuario.findUnique({
      where: { email: body.email },
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

    // Crear usuario y empleado en transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear usuario
            const usuario = await tx.usuario.create({
        data: {
          email: body.email,
          password: await hash(Math.random().toString(36).slice(-8), 10), // Password temporal                                                              
          rol: UsuarioRol.empleado,
          nombre: body.nombre,
          apellidos: body.apellidos,
          empresaId: session.user.empresaId,
          activo: body.activo !== undefined ? body.activo : true,
        },
      });

      // Crear empleado
      const empleado = await tx.empleado.create({
        data: {
          usuarioId: usuario.id,
          empresaId: session.user.empresaId,
          nombre: body.nombre,
          apellidos: body.apellidos,
          email: body.email,
          nif: body.nif,
          nss: body.nss,
          fechaNacimiento: body.fechaNacimiento ? new Date(body.fechaNacimiento) : null,
          telefono: body.telefono,
          direccionCalle: body.direccionCalle,
          direccionNumero: body.direccionNumero,
          direccionPiso: body.direccionPiso,
          codigoPostal: body.codigoPostal,
          ciudad: body.ciudad,
          direccionProvincia: body.direccionProvincia,
          estadoCivil: body.estadoCivil,
          numeroHijos: body.numeroHijos || 0,
          genero: body.genero,
          iban: body.iban,
          titularCuenta: body.titularCuenta,
          puestoId: body.puestoId || null,
          fechaAlta: body.fechaAlta ? new Date(body.fechaAlta) : new Date(),
          tipoContrato: body.tipoContrato || 'indefinido',
          salarioBrutoAnual: body.salarioBrutoAnual
            ? parseFloat(body.salarioBrutoAnual)
            : null,
          salarioBrutoMensual: body.salarioBrutoMensual
            ? parseFloat(body.salarioBrutoMensual)
            : null,
          activo: body.activo !== undefined ? body.activo : true,
          onboardingCompletado: body.onboardingCompletado || false,
        },
      });

      // Garantizar vínculo bidireccional usuario <-> empleado
      await tx.usuario.update({
        where: { id: usuario.id },
        data: { empleadoId: empleado.id },
      });

      // Asignar equipos si se proporcionaron
      if (body.equipoIds && Array.isArray(body.equipoIds) && body.equipoIds.length > 0) {
        await tx.empleadoEquipo.createMany({
          data: body.equipoIds.map((equipoId: string) => ({
            empleadoId: empleado.id,
            equipoId,
          })),
        });
      }

      // Crear carpetas del sistema automáticamente
      const carpetasSistema = [
        { nombre: 'Nóminas', esSistema: true },
        { nombre: 'Contratos', esSistema: true },
        { nombre: 'Justificantes', esSistema: true },
        { nombre: 'Médicos', esSistema: true },
        { nombre: 'Otros documentos', esSistema: true },
      ];

      await tx.carpeta.createMany({
        data: carpetasSistema.map((carpeta) => ({
          empresaId: session.user.empresaId,
          empleadoId: empleado.id,
          nombre: carpeta.nombre,
          esSistema: carpeta.esSistema,
        })),
      });

      return { usuario, empleado };
    });

    console.log(`[API POST /api/empleados] Empleado creado: ${result.empleado.id}`);

    return successResponse(result.empleado, 201);
  } catch (error) {
    return handleApiError(error, 'API POST /api/empleados');
  }
}
