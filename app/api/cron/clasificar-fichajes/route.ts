// ========================================
// CRON: Clasificar Fichajes Incompletos
// ========================================
// Se ejecuta automáticamente cada noche a las 23:30 (configurado en AWS EventBridge)
// Procesa todas las empresas activas
//
// AWS EventBridge Setup:
// 1. Crear regla en EventBridge con schedule: cron(30 23 * * ? *)
// 2. Target: API Gateway/ALB -> POST a esta URL
// 3. Agregar header: x-cron-secret: ${CRON_SECRET}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  clasificarFichajesIncompletos,
  aplicarAutoCompletado,
  guardarRevisionManual,
} from '@/lib/ia/clasificador-fichajes';

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar header de seguridad (AWS EventBridge)
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('[CRON] CRON_SECRET no configurado en variables de entorno');
      return NextResponse.json(
        { error: 'Configuración inválida' },
        { status: 500 }
      );
    }

    if (cronSecret !== expectedSecret) {
      console.error('[CRON] Intento de acceso no autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('[CRON] Iniciando clasificación nocturna de fichajes');
    const inicio = Date.now();

    // 2. Obtener todas las empresas activas
    const empresas = await prisma.empresa.findMany({
      select: {
        id: true,
        nombre: true,
      },
    });

    console.log('[CRON] Empresas a procesar:', empresas.length);

    // 3. Fecha a clasificar: día anterior
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    ayer.setHours(0, 0, 0, 0);

    const resultados = [];

    // 4. Procesar cada empresa
    for (const empresa of empresas) {
      try {
        console.log(`[CRON] Procesando empresa: ${empresa.nombre} (${empresa.id})`);

        // 4.1. Primero crear fichajes automáticos para empleados disponibles sin fichaje
        const { crearFichajesAutomaticos } = await import('@/lib/calculos/fichajes');
        const resultadoCreacion = await crearFichajesAutomaticos(empresa.id, ayer);
        console.log(`[CRON] Fichajes creados: ${resultadoCreacion.creados}, errores: ${resultadoCreacion.errores.length}`);

        // 4.2. Luego clasificar fichajes existentes
        const { autoCompletar, revisionManual } = await clasificarFichajesIncompletos(
          empresa.id,
          ayer
        );

        // Aplicar auto-completados
        const resultadoAutoCompletar = await aplicarAutoCompletado(
          autoCompletar,
          empresa.id
        );

        // Guardar revisiones manuales
        const resultadoRevision = await guardarRevisionManual(
          empresa.id,
          revisionManual
        );

        resultados.push({
          empresaId: empresa.id,
          empresaNombre: empresa.nombre,
          autoCompletados: resultadoAutoCompletar.completados,
          enRevision: resultadoRevision.guardados,
          errores: [
            ...resultadoAutoCompletar.errores,
            ...resultadoRevision.errores,
          ],
        });

      } catch (error) {
        console.error(`[CRON] Error procesando empresa ${empresa.nombre}:`, error);
        resultados.push({
          empresaId: empresa.id,
          empresaNombre: empresa.nombre,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    const duracion = Date.now() - inicio;

    console.log('[CRON] Clasificación completada:', {
      empresas: empresas.length,
      duracion: `${duracion}ms`,
      totalAutoCompletados: resultados.reduce((acc, r) => acc + (r.autoCompletados || 0), 0),
      totalEnRevision: resultados.reduce((acc, r) => acc + (r.enRevision || 0), 0),
    });

    return NextResponse.json({
      success: true,
      fecha: ayer.toISOString().split('T')[0],
      empresasProcesadas: empresas.length,
      duracion: `${duracion}ms`,
      resultados,
    });

  } catch (error) {
    console.error('[CRON] Error fatal:', error);
    return NextResponse.json(
      {
        error: 'Error en clasificación nocturna',
        detalle: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}

