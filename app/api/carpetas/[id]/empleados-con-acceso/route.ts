// ========================================
// API: Carpetas - Empleados con Acceso
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/carpetas/[id]/empleados-con-acceso
 *
 * Obtiene la lista de empleados que tienen acceso a una carpeta específica
 * Solo disponible para HR admins
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo HR admins pueden solicitar firmas
    if (session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'Solo HR admins pueden acceder a esta información' },
        { status: 403 }
      );
    }

    const { id: carpetaId } = await context.params;

    // Obtener la carpeta
    const carpeta = await prisma.carpetas.findUnique({
      where: { id: carpetaId },
      select: {
        id: true,
        nombre: true,
        empleadoId: true,
        compartida: true,
        asignadoA: true,
        esSistema: true,
        empresaId: true,
      },
    });

    if (!carpeta) {
      return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 });
    }

    // Verificar que la carpeta pertenezca a la empresa del usuario
    if (carpeta.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    let empleados: Array<{
      id: string;
      nombre: string;
      apellidos: string;
      email: string;
    }> = [];

    if (carpeta.compartida) {
      // Carpeta compartida: determinar qué empleados tienen acceso
      if (carpeta.asignadoA === 'todos') {
        // Todos los empleados activos de la empresa
        empleados = await prisma.empleados.findMany({
          where: {
            empresaId: session.user.empresaId,
            activo: true,
          },
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
          },
          orderBy: [{ nombre: 'asc' }, { apellidos: 'asc' }],
        });
      } else if (carpeta.asignadoA) {
        const asignadoAString = carpeta.asignadoA;

        // Verificar si es un equipo
        if (asignadoAString.startsWith('equipo:')) {
          const equipoId = asignadoAString.replace('equipo:', '');

          // Obtener todos los empleados del equipo a través de la tabla intermedia
          const empleadoEquipos = await prisma.empleado_equipos.findMany({
            where: {
              equipoId,
            },
            include: {
              empleado: {
                select: {
                  id: true,
                  nombre: true,
                  apellidos: true,
                  email: true,
                  activo: true,
                  empresaId: true,
                },
              },
            },
          });

          // Filtrar solo empleados activos de la empresa
          empleados = empleadoEquipos
            .map((ee) => ee.empleado)
            .filter((emp) => emp.activo && emp.empresaId === session.user.empresaId)
            .map((emp) => ({
              id: emp.id,
              nombre: emp.nombre,
              apellidos: emp.apellidos,
              email: emp.email,
            }))
            .sort((a, b) => {
              const nombreCompare = a.nombre.localeCompare(b.nombre);
              return nombreCompare !== 0 ? nombreCompare : a.apellidos.localeCompare(b.apellidos);
            });
        } else {
          // Empleados específicos (formato: "empleado:id1,empleado:id2,...")
          const empleadoIds = asignadoAString
            .split(',')
            .filter((item) => item.trim().startsWith('empleado:'))
            .map((item) => item.trim().replace('empleado:', ''));

          if (empleadoIds.length > 0) {
            empleados = await prisma.empleados.findMany({
              where: {
                id: { in: empleadoIds },
                empresaId: session.user.empresaId,
                activo: true,
              },
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                email: true,
              },
              orderBy: [{ nombre: 'asc' }, { apellidos: 'asc' }],
            });
          }
        }
      }
    } else if (carpeta.empleadoId) {
      // Carpeta personal: solo el empleado propietario
      const empleado = await prisma.empleados.findUnique({
        where: {
          id: carpeta.empleadoId,
          activo: true,
        },
        select: {
          id: true,
          nombre: true,
          apellidos: true,
          email: true,
        },
      });

      if (empleado) {
        empleados = [empleado];
      }
    }

    return NextResponse.json({
      empleados: empleados || [],
      carpeta: {
        id: carpeta.id,
        nombre: carpeta.nombre,
        compartida: carpeta.compartida,
        esSistema: carpeta.esSistema,
      },
    });
  } catch (error) {
    console.error('[GET /api/carpetas/[id]/empleados-con-acceso] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener empleados con acceso' },
      { status: 500 }
    );
  }
}
