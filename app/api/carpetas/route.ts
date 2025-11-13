import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/carpetas - Listar carpetas del usuario actual (con filtros)
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const empleadoId = searchParams.get('empleadoId');
    const proceso = searchParams.get('proceso'); // 'onboarding', 'offboarding'

    // Construir where clause
    const where: any = {
      empresaId: session.user.empresaId,
    };

    // Filtrar por empleado si se proporciona
    if (empleadoId) {
      where.empleadoId = empleadoId;
    }

    // Filtrar por proceso vinculado
    if (proceso && (proceso === 'onboarding' || proceso === 'offboarding')) {
      where.vinculadaAProceso = proceso;
    }

    // Si es empleado regular, solo puede ver sus carpetas o las compartidas con él
    if (session.user.rol === 'empleado' && session.user.empleadoId) {
      where.OR = [
        { empleadoId: session.user.empleadoId }, // Carpetas propias
        { compartida: true }, // Carpetas compartidas
      ];
    }

    const carpetas = await prisma.carpeta.findMany({
      where,
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
        _count: {
          select: {
            documentos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      carpetas,
    });
  } catch (error) {
    console.error('Error listando carpetas:', error);
    return NextResponse.json(
      { error: 'Error al listar carpetas' },
      { status: 500 }
    );
  }
}

// POST /api/carpetas - Crear carpeta (solo HR para carpetas compartidas)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      nombre, 
      parentId, 
      compartida, 
      asignadoA, 
      empleadoId,
      vinculadaAProceso,
      requiereFirma,
      requiereRellenarDatos,
      camposRequeridos,
    } = body;

    // Validar nombre
    if (!nombre || nombre.trim().length === 0) {
      return NextResponse.json(
        { error: 'El nombre de la carpeta es requerido' },
        { status: 400 }
      );
    }

    // Solo HR Admin puede crear carpetas compartidas
    if (compartida && session.user.rol !== 'hr_admin') {
      return NextResponse.json(
        { error: 'No autorizado para crear carpetas compartidas' },
        { status: 403 }
      );
    }

    // Validar proceso vinculado
    if (vinculadaAProceso && !['onboarding', 'offboarding'].includes(vinculadaAProceso)) {
      return NextResponse.json(
        { error: 'Proceso vinculado inválido. Debe ser "onboarding" o "offboarding"' },
        { status: 400 }
      );
    }

    // Crear carpeta
    const carpeta = await prisma.carpeta.create({
      data: {
        empresaId: session.user.empresaId,
        nombre,
        parentId: parentId || null,
        empleadoId: empleadoId || null,
        esSistema: false,
        compartida: compartida || false,
        asignadoA: compartida ? asignadoA : null,
        vinculadaAProceso: vinculadaAProceso || null,
        requiereFirma: requiereFirma || false,
        requiereRellenarDatos: requiereRellenarDatos || false,
        camposRequeridos: camposRequeridos || null,
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      carpeta,
    });
  } catch (error) {
    console.error('Error creando carpeta:', error);
    return NextResponse.json(
      { error: 'Error al crear carpeta' },
      { status: 500 }
    );
  }
}
