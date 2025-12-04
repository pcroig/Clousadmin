/**
 * Script de migración: Convierte posiciones de firma v1 (absolutas) a v2 (porcentajes)
 *
 * Uso:
 * ```bash
 * npx tsx scripts/migrar-posiciones-firma.ts [--dry-run] [--limit=N]
 * ```
 *
 * Opciones:
 * - --dry-run: Solo muestra qué se migraría sin hacer cambios
 * - --limit=N: Procesa solo N registros (útil para testing)
 */

import { prisma } from '@/lib/prisma';
import { downloadFromS3 } from '@/lib/s3';
import {
  obtenerDimensionesPagina,
  pdfAPorcentajes,
  crearPosicionConMetadata,
} from '@/lib/firma-digital/posicion-utils';
import { obtenerMetadataPDF } from '@/lib/firma-digital/pdf-marca';
import type { PosicionFirma, PosicionFirmaConMetadata } from '@/lib/firma-digital/tipos';
import { asJsonValue } from '@/lib/prisma/json';

interface Stats {
  total: number;
  migradas: number;
  yaV2: number;
  sinPosicion: number;
  errores: number;
}

async function migrarPosicion(
  solicitudId: string,
  posicionActual: unknown,
  documentoS3Key: string,
  dryRun: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar que es formato v1
    const pos = posicionActual as Record<string, unknown>;

    if ('version' in pos && pos.version === 'v2') {
      return { success: false, error: 'Ya es v2' };
    }

    if (!('x' in pos && 'y' in pos)) {
      return { success: false, error: 'Formato desconocido' };
    }

    const posV1 = pos as PosicionFirma;

    // Descargar PDF y obtener dimensiones
    const pdfBuffer = await downloadFromS3(documentoS3Key);
    const paginaIndex = posV1.pagina === -1 ? -1 : posV1.pagina - 1;
    const dimensiones = await obtenerDimensionesPagina(pdfBuffer, paginaIndex);

    // Obtener metadata completa del PDF (incluyendo número de páginas)
    const metadata = await obtenerMetadataPDF(pdfBuffer);

    // Convertir v1 → v2
    const porcentajes = pdfAPorcentajes(posV1, dimensiones.width, dimensiones.height);

    const posicionV2: PosicionFirmaConMetadata = crearPosicionConMetadata(porcentajes, {
      width: dimensiones.width,
      height: dimensiones.height,
      numPaginas: metadata.numPaginas,
    });

    if (!dryRun) {
      // Actualizar en BD
      await prisma.solicitudes_firma.update({
        where: { id: solicitudId },
        data: {
          posicionFirma: asJsonValue(posicionV2),
        },
      });
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const limitArg = args.find(arg => arg.startsWith('--limit='));

  let limit: number | undefined;
  if (limitArg) {
    const limitValue = parseInt(limitArg.split('=')[1], 10);
    if (isNaN(limitValue) || limitValue <= 0) {
      console.error('❌ Error: --limit debe ser un número positivo');
      process.exit(1);
    }
    limit = limitValue;
  }

  console.log('\n🔄 Iniciando migración de posiciones de firma v1 → v2\n');
  console.log(`Modo: ${dryRun ? '🔍 DRY RUN (sin cambios)' : '✏️  ESCRITURA'}`);
  if (limit) console.log(`Límite: ${limit} registros`);
  console.log('');

  const stats: Stats = {
    total: 0,
    migradas: 0,
    yaV2: 0,
    sinPosicion: 0,
    errores: 0,
  };

  try {
    // Obtener todas las solicitudes con posición de firma
    const solicitudes = await prisma.solicitudes_firma.findMany({
      where: {
        posicionFirma: {
          not: null,
        },
      },
      select: {
        id: true,
        posicionFirma: true,
        documentos: {
          select: {
            id: true,
            nombre: true,
            s3Key: true,
          },
        },
      },
      take: limit,
    });

    stats.total = solicitudes.length;
    console.log(`📊 Encontradas ${stats.total} solicitudes con posición\n`);

    for (let i = 0; i < solicitudes.length; i++) {
      const solicitud = solicitudes[i];
      const num = `[${i + 1}/${stats.total}]`;

      process.stdout.write(`${num} Procesando ${solicitud.documentos.nombre}... `);

      if (!solicitud.posicionFirma) {
        console.log('⚠️  Sin posición');
        stats.sinPosicion++;
        continue;
      }

      const resultado = await migrarPosicion(
        solicitud.id,
        solicitud.posicionFirma,
        solicitud.documentos.s3Key,
        dryRun
      );

      if (resultado.success) {
        console.log('✅ Migrada');
        stats.migradas++;
      } else if (resultado.error === 'Ya es v2') {
        console.log('ℹ️  Ya es v2');
        stats.yaV2++;
      } else {
        console.log(`❌ Error: ${resultado.error}`);
        stats.errores++;
      }

      // Pequeña pausa para no saturar S3
      if (i < solicitudes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Reporte final
    console.log('\n' + '='.repeat(60));
    console.log('📈 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`Total procesadas:     ${stats.total}`);
    console.log(`✅ Migradas a v2:     ${stats.migradas}`);
    console.log(`ℹ️  Ya eran v2:        ${stats.yaV2}`);
    console.log(`⚠️  Sin posición:      ${stats.sinPosicion}`);
    console.log(`❌ Errores:           ${stats.errores}`);
    console.log('='.repeat(60));

    if (dryRun && stats.migradas > 0) {
      console.log('\n💡 Ejecuta sin --dry-run para aplicar los cambios');
    }

    if (stats.errores > 0) {
      console.log('\n⚠️  Algunos registros tuvieron errores. Revisa los logs arriba.');
    }

  } catch (error) {
    console.error('\n❌ Error fatal en la migración:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
