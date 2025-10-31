// ========================================
// API: Aprobar Fichajes Revisados
// ========================================
// Endpoint para que HR apruebe fichajes en estado 'revisado'
// Puede aprobar uno, varios o todos

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const aprobarSchema = z.object({
  fichajesIds: z.array(z.string()).optional(),
  aprobarTodos: z.boolean().optional(),
  empresaId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar sesión y permisos
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.rol !== 'hr_admin') {
      return NextResponse.json(
        { error: 'No autorizado. Solo HR Admin puede aprobar fichajes.' },
        { status: 403 }
      );
    }

    // 2. Validar body
    const body = await req.json();
    const validatedData = aprobarSchema.parse(body);

    const empresaId = validatedData.empresaId || session.user.empresaId;
    let fichajesIds = validatedData.fichajesIds || [];

    // 3. Si aprobarTodos, obtener todos los fichajes revisados
    if (validatedData.aprobarTodos) {
      const fichajesRevisados = await prisma.fichaje.findMany({
        where: {
          empresaId,
          estado: 'revisado',
        },
        select: {
          id: true,
        },
      });

      fichajesIds = fichajesRevisados.map(f => f.id);
    }

    if (fichajesIds.length === 0) {
      return NextResponse.json(
        { error: 'No hay fichajes para aprobar' },
        { status: 400 }
      );
    }

    console.log('[Aprobar Revisados] Aprobando', fichajesIds.length, 'fichajes');

    // 4. Actualizar fichajes a 'finalizado' (aprobado pasa a finalizado)
    const resultado = await prisma.fichaje.updateMany({
      where: {
        id: {
          in: fichajesIds,
        },
        empresaId,
        estado: 'revisado',
      },
      data: {
        estado: 'finalizado',
        fechaAprobacion: new Date(),
      },
    });

    // TODO: Update AutoCompletado records for approved fichajes
    // Note: JSON filtering with 'in' operator needs to be implemented differently

    console.log('[Aprobar Revisados] Aprobados:', resultado.count);

    return NextResponse.json({
      success: true,
      aprobados: resultado.count,
      mensaje: `${resultado.count} fichaje(s) aprobado(s) correctamente`,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[API Aprobar Revisados]', error);
    return NextResponse.json(
      { 
        error: 'Error al aprobar fichajes',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

