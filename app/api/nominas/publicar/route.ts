// ========================================
// API: Publicar Nóminas
// ========================================

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { crearNotificacionNominaDisponible } from '@/lib/notificaciones';
import { prisma } from '@/lib/prisma';

// POST /api/nominas/publicar?mes=X&anio=Y
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    // Verificar autenticación y rol
    if (!session || session.user.rol !== UsuarioRol.hr_admin) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Obtener parámetros
    const searchParams = req.nextUrl.searchParams;
    const mes = parseInt(searchParams.get('mes') || '');
    const anio = parseInt(searchParams.get('anio') || '');

    // Validar parámetros
    if (!mes || !anio || mes < 1 || mes > 12 || anio < 2000) {
      return NextResponse.json(
        { error: 'Parámetros inválidos. Usar: ?mes=X&anio=Y' },
        { status: 400 }
      );
    }

    // Obtener nóminas en borrador
    const nominasBorrador = await prisma.nominas.findMany({
      where: {
        empleado: {
          empresaId: session.user.empresaId,
        },
        mes,
        anio,
        estado: 'borrador',
      },
      select: {
        id: true,
        empleadoId: true,
        empleado: {
          select: {
            usuarioId: true,
            nombre: true,
            apellidos: true,
          },
        },
      },
    });

    if (nominasBorrador.length === 0) {
      return NextResponse.json(
        {
          error: 'No hay nóminas en borrador para este mes',
        },
        { status: 400 }
      );
    }

    // Obtener IDs de empleados de la empresa para el updateMany
    const empleadosIds = nominasBorrador.map((n) => n.empleadoId);

    // Actualizar nóminas a estado publicada
    await prisma.nominas.updateMany({
      where: {
        empleadoId: {
          in: empleadosIds,
        },
        mes,
        anio,
        estado: 'borrador',
      },
      data: {
        estado: 'publicada',
        fechaPublicacion: new Date(),
      },
    });

    await Promise.all(
      nominasBorrador.map((nomina) =>
        crearNotificacionNominaDisponible(
          prisma,
          {
            nominaId: nomina.id,
            empresaId: session.user.empresaId,
            empleadoId: nomina.empleadoId,
            mes,
            año: anio,
          },
          { actorUsuarioId: session.user.id }
        )
      )
    );

    return NextResponse.json({
      success: true,
      published: nominasBorrador.length,
      message: `${nominasBorrador.length} nómina(s) publicada(s) correctamente`,
    });
  } catch (error) {
    console.error('[API nominas/publicar] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al publicar nóminas',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: Obtener nombre del mes
 */

