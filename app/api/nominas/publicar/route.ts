// ========================================
// API: Publicar Nóminas
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/nominas/publicar?mes=X&anio=Y
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();

    // Verificar autenticación y rol
    if (!session || session.user.rol !== 'hr_admin') {
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

    console.log(`[API nominas/publicar] Publicando ${mes}/${anio}`);

    // Obtener nóminas en borrador
    const nominasBorrador = await prisma.nomina.findMany({
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

    console.log(
      `[API nominas/publicar] ${nominasBorrador.length} nómina(s) a publicar`
    );

    // Obtener IDs de empleados de la empresa para el updateMany
    const empleadosIds = nominasBorrador.map((n) => n.empleadoId);

    // Actualizar nóminas a estado publicada
    await prisma.nomina.updateMany({
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

    // Crear notificaciones para empleados
    const notificaciones = nominasBorrador.map((nomina) => ({
      empresaId: session.user.empresaId,
      usuarioId: nomina.empleado.usuarioId,
      tipo: 'info',
      titulo: 'Nómina disponible',
      mensaje: `Tu nómina de ${getMesNombre(mes)} ${anio} ya está disponible`,
      metadata: {
        nominaId: nomina.id,
        mes,
        anio,
      },
      leida: false,
    }));

    await prisma.notificacion.createMany({
      data: notificaciones,
    });

    console.log(
      `[API nominas/publicar] ${notificaciones.length} notificación(es) creada(s)`
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
function getMesNombre(mes: number): string {
  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  return meses[mes - 1] || `Mes ${mes}`;
}

