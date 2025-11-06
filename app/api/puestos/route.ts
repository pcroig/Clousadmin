// ========================================
// API Puestos - Job Positions
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { z } from 'zod';

// Schema de validación
const puestoCreateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  descripcion: z.string().optional(),
  empleadoIds: z.array(z.string().uuid()).optional(),
});

// GET /api/puestos - Listar todos los puestos activos
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const puestos = await prisma.puesto.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
      },
      include: {
        _count: {
          select: {
            empleados: true,
            documentos: true,
          },
        },
        empleados: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            fotoUrl: true,
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return NextResponse.json(puestos);
  } catch (error) {
    console.error('Error loading puestos:', error);
    return NextResponse.json(
      { error: 'Error al cargar puestos' },
      { status: 500 }
    );
  }
}

// POST /api/puestos - Crear nuevo puesto
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = puestoCreateSchema.parse(body);

    // Verificar que no exista un puesto con el mismo nombre
    const existingPuesto = await prisma.puesto.findFirst({
      where: {
        empresaId: session.user.empresaId,
        nombre: validatedData.nombre,
        activo: true,
      },
    });

    if (existingPuesto) {
      return NextResponse.json(
        { error: 'Ya existe un puesto con ese nombre' },
        { status: 400 }
      );
    }

    // Extraer empleadoIds para asignar después
    const { empleadoIds, ...puestoData } = validatedData;

    // Crear puesto en una transacción
    const puesto = await prisma.$transaction(async (tx) => {
      // Crear el puesto
      const nuevoPuesto = await tx.puesto.create({
        data: {
          empresaId: session.user.empresaId,
          nombre: puestoData.nombre,
          descripcion: puestoData.descripcion || null,
        },
      });

      // Asignar empleados si se proporcionaron
      if (empleadoIds && empleadoIds.length > 0) {
        // Validar que los empleados existen y pertenecen a la empresa
        const empleadosExistentes = await tx.empleado.findMany({
          where: {
            id: { in: empleadoIds },
            empresaId: session.user.empresaId,
          },
        });

        if (empleadosExistentes.length !== empleadoIds.length) {
          throw new Error('Uno o más empleados especificados no existen');
        }

        // Actualizar empleados para asignarles el puesto
        await tx.empleado.updateMany({
          where: {
            id: { in: empleadoIds },
            empresaId: session.user.empresaId,
          },
          data: {
            puestoId: nuevoPuesto.id,
          },
        });
      }

      return nuevoPuesto;
    });

    return NextResponse.json(puesto, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error creating puesto:', error);
    return NextResponse.json(
      { error: 'Error al crear puesto' },
      { status: 500 }
    );
  }
}
