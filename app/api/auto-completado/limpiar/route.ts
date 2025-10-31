// ========================================
// API AutoCompletado - Limpiar contadores por tipo
// ========================================
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { tipo } = await req.json();
    if (!['fichajes', 'ausencias', 'solicitudes'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    const empresaId = session.user.empresaId;

    // 1) Limpiar estados de dominio cuando aplique
    if (tipo === 'fichajes') {
      await prisma.fichaje.updateMany({
        where: { empresaId, estado: 'revisado' },
        data: { estado: 'finalizado', fechaAprobacion: new Date() },
      });
    } else if (tipo === 'ausencias') {
      // Para ausencias auto_aprobadas: cambiar a en_curso si ya empezó, o completada si ya pasó
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      // Ausencias que ya empezaron → en_curso
      await prisma.ausencia.updateMany({
        where: {
          empresaId,
          estado: 'auto_aprobada',
          fechaInicio: { lte: hoy },
          fechaFin: { gte: hoy },
        },
        data: {
          estado: 'en_curso',
          aprobadaEn: new Date(),
        },
      });

      // Ausencias que ya pasaron → completada
      await prisma.ausencia.updateMany({
        where: {
          empresaId,
          estado: 'auto_aprobada',
          fechaFin: { lt: hoy },
        },
        data: {
          estado: 'completada',
          aprobadaEn: new Date(),
        },
      });
    }
    // Para solicitudes, implementaremos más adelante si aplica

    // 2) Archivar entradas de autoCompletado para que no cuenten
    const mapTipo: Record<string, string> = {
      fichajes: 'fichaje',
      ausencias: 'ausencia',
      solicitudes: 'solicitud',
    };
    const autoCompletados = await prisma.autoCompletado.updateMany({
      where: {
        empresaId,
        tipo: mapTipo[tipo],
        estado: { in: ['aprobado', 'requiere_revision'] },
      },
      data: { estado: 'archivado', aprobadoEn: new Date() },
    });

    return NextResponse.json({ success: true, archivados: autoCompletados.count });
  } catch (error) {
    console.error('[API POST Limpiar AutoCompletado]', error);
    return NextResponse.json({ error: 'Error al limpiar' }, { status: 500 });
  }
}


