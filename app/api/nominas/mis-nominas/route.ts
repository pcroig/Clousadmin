// ========================================
// API: Mis Nóminas (Vista Empleado)
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/nominas/mis-nominas?anio=2025
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    // Verificar autenticación
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener empleado del usuario
    const empleado = await prisma.empleado.findUnique({
      where: { usuarioId: session.user.id },
      select: { id: true },
    });

    if (!empleado) {
      return NextResponse.json(
        { error: 'No se encontró empleado asociado' },
        { status: 404 }
      );
    }

    // Obtener parámetros
    const searchParams = req.nextUrl.searchParams;
    const anio = searchParams.get('anio')
      ? parseInt(searchParams.get('anio')!)
      : new Date().getFullYear();

    // Obtener nóminas publicadas
    const nominas = await prisma.nomina.findMany({
      where: {
        empleadoId: empleado.id,
        anio,
        estado: 'publicada',
      },
      include: {
        documento: {
          select: {
            id: true,
            nombre: true,
            s3Key: true,
            tamano: true,
          },
        },
      },
      orderBy: [
        { anio: 'desc' },
        { mes: 'desc' },
      ],
    });

    // Marcar como vista (empleadoVisto = true, fechaVisto = now)
    // Solo si no estaban ya vistas
    const nominasNoVistas = nominas.filter((n) => !n.empleadoVisto);
    if (nominasNoVistas.length > 0) {
      await prisma.nomina.updateMany({
        where: {
          id: {
            in: nominasNoVistas.map((n) => n.id),
          },
        },
        data: {
          empleadoVisto: true,
          fechaVisto: new Date(),
        },
      });
    }

    // Formatear respuesta
    const resultado = nominas.map((nomina) => ({
      id: nomina.id,
      mes: nomina.mes,
      anio: nomina.anio,
      salarioBruto: Number(nomina.totalBruto), // Mantener nombre para compatibilidad frontend
      deducciones: Number(nomina.totalDeducciones),
      salarioNeto: Number(nomina.totalNeto),
      fechaPublicacion: nomina.fechaPublicacion,
      empleadoVisto: nomina.empleadoVisto,
      fechaVisto: nomina.fechaVisto,
      documento: nomina.documento
        ? {
            id: nomina.documento.id,
            nombre: nomina.documento.nombre,
            tamano: nomina.documento.tamano,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      anio,
      total: resultado.length,
      nominas: resultado,
    });
  } catch (error) {
    console.error('[API mis-nominas] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener nóminas',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}





























