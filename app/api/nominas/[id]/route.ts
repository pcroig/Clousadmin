// ========================================
// API: Obtener Detalles de Nómina
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !['hr_admin', 'platform_admin', 'manager', 'empleado'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const nomina = await prisma.nomina.findFirst({
      where: {
        id,
        empleado: {
          empresaId: session.user.empresaId,
          // Si es empleado, solo puede ver sus propias nóminas
          ...(session.user.rol === 'empleado' ? { id: session.user.empleadoId } : {}),
        },
      },
      include: {
        empleado: {
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
            numeroSeguroSocial: true,
            iban: true,
            equipos: {
              select: {
                equipo: {
                  select: {
                    id: true,
                    nombre: true,
                  },
                },
              },
            },
          },
        },
        contrato: {
          select: {
            id: true,
            tipoContrato: true,
            fechaInicio: true,
            fechaFin: true,
          },
        },
        complementosAsignados: {
          include: {
            empleadoComplemento: {
              include: {
                tipoComplemento: {
                  select: {
                    nombre: true,
                    descripcion: true,
                  },
                },
              },
            },
          },
        },
        documento: {
          select: {
            id: true,
            nombre: true,
            s3Key: true,
          },
        },
        eventoNomina: {
          select: {
            id: true,
            mes: true,
            anio: true,
            estado: true,
          },
        },
        alertas: {
          where: {
            resuelta: false,
          },
          orderBy: [
            { tipo: 'asc' },
            { createdAt: 'desc' },
          ],
        },
      },
    });

    if (!nomina) {
      return NextResponse.json({ error: 'Nómina no encontrada' }, { status: 404 });
    }

    return NextResponse.json(nomina);
  } catch (error) {
    console.error('[GET /api/nominas/[id]] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener nómina' },
      { status: 500 }
    );
  }
}

