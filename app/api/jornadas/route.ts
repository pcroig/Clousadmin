// ========================================
// API Jornadas - GET, POST
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jornadaCreateSchema } from '@/lib/validaciones/schemas';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    // Verificar sesión y permisos (solo HR)
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener jornadas de la empresa
    const jornadas = await prisma.jornada.findMany({
      where: {
        empresaId: session.user.empresaId,
        activa: true,
      },
      orderBy: {
        nombre: 'asc',
      },
      include: {
        _count: {
          select: {
            empleados: true,
          },
        },
      },
    });

    return NextResponse.json(jornadas);
  } catch (error) {
    console.error('[API GET Jornadas]', error);
    return NextResponse.json(
      { error: 'Error al obtener jornadas' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verificar sesión y permisos (solo HR)
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Validar body
    const body = await req.json();
    const validatedData = jornadaCreateSchema.parse(body);

    // Validar que la empresa sea la del usuario
    if (validatedData.empresaId !== session.user.empresaId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Crear configuración por defecto si no se proporciona
    let config = validatedData.config;
    if (!config) {
      if (validatedData.tipo === 'fija') {
        // Configuración por defecto: L-V 9:00-18:00 con 1h pausa
        config = {
          lunes: { activo: true, entrada: '09:00', salida: '18:00', pausa: 1 },
          martes: { activo: true, entrada: '09:00', salida: '18:00', pausa: 1 },
          miercoles: { activo: true, entrada: '09:00', salida: '18:00', pausa: 1 },
          jueves: { activo: true, entrada: '09:00', salida: '18:00', pausa: 1 },
          viernes: { activo: true, entrada: '09:00', salida: '18:00', pausa: 1 },
          sabado: { activo: false },
          domingo: { activo: false },
        };
      } else {
        // Jornada flexible: todos los días activos
        config = {
          lunes: { activo: true },
          martes: { activo: true },
          miercoles: { activo: true },
          jueves: { activo: true },
          viernes: { activo: true },
          sabado: { activo: false },
          domingo: { activo: false },
        };
      }
    }

    // Crear jornada
    const jornada = await prisma.jornada.create({
      data: {
        nombre: validatedData.nombre,
        empresaId: validatedData.empresaId,
        horasSemanales: validatedData.horasSemanales,
        config: config as any,
        esPredefinida: false,
        activa: true,
      },
    });

    return NextResponse.json(jornada, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[API POST Jornadas]', error);
    return NextResponse.json(
      { error: 'Error al crear jornada' },
      { status: 500 }
    );
  }
}

