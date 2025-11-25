// ========================================
// API: Asignar jornadas a empleados sin jornada
// ========================================
// POST: Asigna la jornada por defecto a empleados activos sin jornada

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();

    // Solo HR Admin puede ejecutar esta acción
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.log('[API Asignar Jornadas] Iniciando proceso...');

    // 1. Obtener jornadas de la empresa
    const jornadas = await prisma.jornada.findMany({
      where: {
        empresaId: session.user.empresaId,
        activa: true,
      },
      orderBy: {
        esPredefinida: 'desc', // Priorizar jornadas predefinidas
      },
    });

    if (jornadas.length === 0) {
      return NextResponse.json(
        { error: 'No hay jornadas activas en la empresa' },
        { status: 400 }
      );
    }

    // Usar la primera jornada (predefinida si existe)
    const jornadaPorDefecto = jornadas[0];
    console.log(`[API Asignar Jornadas] Jornada por defecto: ${jornadaPorDefecto.nombre}`);

    // 2. Obtener empleados activos sin jornada
    const empleadosSinJornada = await prisma.empleado.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
        jornadaId: null,
      },
      select: {
        id: true,
        nombre: true,
        apellidos: true,
      },
    });

    console.log(`[API Asignar Jornadas] Empleados sin jornada: ${empleadosSinJornada.length}`);

    if (empleadosSinJornada.length === 0) {
      return NextResponse.json({
        success: true,
        mensaje: 'Todos los empleados ya tienen jornada asignada',
        actualizados: 0,
        jornadaAsignada: jornadaPorDefecto.nombre,
      });
    }

    // 3. Asignar jornada a cada empleado
    const actualizados: string[] = [];
    for (const empleado of empleadosSinJornada) {
      await prisma.empleado.update({
        where: { id: empleado.id },
        data: { jornadaId: jornadaPorDefecto.id },
      });
      actualizados.push(`${empleado.nombre} ${empleado.apellidos}`);
      console.log(`[API Asignar Jornadas] ✓ ${empleado.nombre} ${empleado.apellidos}`);
    }

    console.log(`[API Asignar Jornadas] Proceso completado: ${actualizados.length} empleados actualizados`);

    return NextResponse.json({
      success: true,
      mensaje: `${actualizados.length} empleados actualizados correctamente`,
      actualizados: actualizados.length,
      jornadaAsignada: jornadaPorDefecto.nombre,
      empleados: actualizados,
    });

  } catch (error) {
    console.error('[API Asignar Jornadas] Error:', error);
    return NextResponse.json(
      { error: 'Error al asignar jornadas' },
      { status: 500 }
    );
  }
}



