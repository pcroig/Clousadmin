/**
 * Script de migración: documentos.carpetaId → documento_carpetas (tabla intermedia)
 *
 * Este script migra los datos existentes de la relación 1:N a la nueva relación M:N.
 *
 * IMPORTANTE: Ejecutar DESPUÉS de aplicar la migración de Prisma que:
 * 1. Crea tabla documento_carpetas
 * 2. Mantiene temporalmente documentos.carpetaId (lo eliminaremos después)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando migración de documentos a tabla intermedia...\n');

  try {
    // 1. Obtener todos los documentos que tienen carpetaId
    const documentosConCarpeta = await prisma.$queryRaw<
      Array<{ id: string; carpetaId: string }>
    >`
      SELECT id, "carpetaId"
      FROM documentos
      WHERE "carpetaId" IS NOT NULL
    `;

    console.log(`📊 Documentos con carpeta asignada: ${documentosConCarpeta.length}`);

    if (documentosConCarpeta.length === 0) {
      console.log('✅ No hay documentos para migrar.');
      return;
    }

    // 2. Migrar cada documento a la tabla intermedia
    let migrados = 0;
    let errores = 0;

    for (const doc of documentosConCarpeta) {
      try {
        // Verificar si ya existe la relación (por si se ejecuta el script 2 veces)
        const existeRelacion = await prisma.documento_carpetas.findUnique({
          where: {
            documentoId_carpetaId: {
              documentoId: doc.id,
              carpetaId: doc.carpetaId,
            },
          },
        });

        if (existeRelacion) {
          console.log(`⏭️  Relación ya existe para documento ${doc.id}`);
          continue;
        }

        // Crear relación en tabla intermedia
        await prisma.documento_carpetas.create({
          data: {
            documentoId: doc.id,
            carpetaId: doc.carpetaId,
          },
        });

        migrados++;

        if (migrados % 100 === 0) {
          console.log(`   Progreso: ${migrados}/${documentosConCarpeta.length} documentos migrados...`);
        }
      } catch (error) {
        console.error(`❌ Error migrando documento ${doc.id}:`, error);
        errores++;
      }
    }

    console.log(`\n✅ Migración completada:`);
    console.log(`   - Migrados exitosamente: ${migrados}`);
    console.log(`   - Errores: ${errores}`);

    // 3. Verificar integridad
    console.log('\n🔍 Verificando integridad de datos...');

    const totalEnIntermedia = await prisma.documento_carpetas.count();
    console.log(`   - Registros en documento_carpetas: ${totalEnIntermedia}`);

    const docsConCarpetaOriginal = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM documentos
      WHERE "carpetaId" IS NOT NULL
    `;
    console.log(`   - Documentos con carpetaId original: ${docsConCarpetaOriginal[0].count}`);

    if (Number(docsConCarpetaOriginal[0].count) === totalEnIntermedia) {
      console.log('✅ Integridad verificada correctamente!\n');
    } else {
      console.warn('⚠️  ADVERTENCIA: Los números no coinciden. Revisar manualmente.\n');
    }

    // 4. Ahora vamos a sincronizar con carpetas master
    console.log('🔗 Iniciando sincronización con carpetas master...\n');

    // Obtener todas las carpetas master (empleadoId = null, esSistema = true)
    const carpetasMaster = await prisma.carpetas.findMany({
      where: {
        empleadoId: null,
        esSistema: true,
      },
    });

    console.log(`📁 Carpetas master encontradas: ${carpetasMaster.length}`);
    console.log(`   Nombres: ${carpetasMaster.map(c => c.nombre).join(', ')}\n`);

    let sincronizados = 0;

    for (const carpetaMaster of carpetasMaster) {
      console.log(`📂 Sincronizando carpeta master: ${carpetaMaster.nombre}...`);

      // Encontrar todas las carpetas de empleados con el mismo nombre
      const carpetasEmpleados = await prisma.carpetas.findMany({
        where: {
          nombre: carpetaMaster.nombre,
          esSistema: true,
          empleadoId: { not: null },
          empresaId: carpetaMaster.empresaId,
        },
      });

      console.log(`   - Carpetas de empleados encontradas: ${carpetasEmpleados.length}`);

      // Para cada carpeta de empleado, sincronizar sus documentos con la master
      for (const carpetaEmpleado of carpetasEmpleados) {
        // Obtener documentos en carpeta del empleado
        const docsEnCarpetaEmpleado = await prisma.documento_carpetas.findMany({
          where: {
            carpetaId: carpetaEmpleado.id,
          },
        });

        // Para cada documento, agregar relación con carpeta master
        for (const docCarpeta of docsEnCarpetaEmpleado) {
          // Verificar si ya existe
          const existeEnMaster = await prisma.documento_carpetas.findUnique({
            where: {
              documentoId_carpetaId: {
                documentoId: docCarpeta.documentoId,
                carpetaId: carpetaMaster.id,
              },
            },
          });

          if (!existeEnMaster) {
            await prisma.documento_carpetas.create({
              data: {
                documentoId: docCarpeta.documentoId,
                carpetaId: carpetaMaster.id,
              },
            });
            sincronizados++;
          }
        }
      }

      console.log(`   ✅ ${carpetaMaster.nombre} sincronizada`);
    }

    console.log(`\n✅ Sincronización con carpetas master completada:`);
    console.log(`   - Documentos sincronizados a master: ${sincronizados}\n`);

    // 5. Resumen final
    console.log('📊 RESUMEN FINAL:');
    const totalRelaciones = await prisma.documento_carpetas.count();
    console.log(`   - Total de relaciones documento-carpeta: ${totalRelaciones}`);
    console.log(`   - Documentos migrados: ${migrados}`);
    console.log(`   - Documentos sincronizados con master: ${sincronizados}`);
    console.log('\n✅ ¡Migración completada exitosamente!');
    console.log('\n⚠️  SIGUIENTE PASO: Crear una migración de Prisma para eliminar la columna carpetaId de documentos');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
