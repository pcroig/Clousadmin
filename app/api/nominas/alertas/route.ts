// ========================================
// API: Alertas de Nóminas
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  obtenerAlertas,
  detectarAlertas,
  TipoAlerta,
} from '@/lib/validaciones/nominas';

// GET /api/nominas/alertas?mes=X&anio=Y&tipo=critico
export async function GET(req: NextRequest) {
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
    const tipo = searchParams.get('tipo') as TipoAlerta | null;
    const recalcular = searchParams.get('recalcular') === 'true';

    // Validar parámetros
    if (!mes || !anio || mes < 1 || mes > 12 || anio < 2000) {
      return NextResponse.json(
        { error: 'Parámetros inválidos. Usar: ?mes=X&anio=Y' },
        { status: 400 }
      );
    }

    console.log(
      `[API alertas] GET ${mes}/${anio}, tipo=${tipo}, recalcular=${recalcular}`
    );

    // Si se pide recalcular, detectar nuevamente
    if (recalcular) {
      await detectarAlertas(session.user.empresaId, mes, anio);
    }

    // Obtener alertas
    const alertas = await obtenerAlertas(
      session.user.empresaId,
      mes,
      anio,
      tipo || undefined
    );

    // Contar por tipo
    const criticas = alertas.filter((a) => a.tipo === 'critico').length;
    const advertencias = alertas.filter((a) => a.tipo === 'advertencia').length;
    const informativas = alertas.filter((a) => a.tipo === 'info').length;

    return NextResponse.json({
      success: true,
      mes,
      anio,
      total: alertas.length,
      criticas,
      advertencias,
      informativas,
      alertas,
    });
  } catch (error) {
    console.error('[API alertas] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener alertas',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}









