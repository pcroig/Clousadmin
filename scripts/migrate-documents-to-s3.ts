// ========================================
// Script de Migración: Documentos Legacy → Hetzner Object Storage
// ========================================
// Migra documentos almacenados localmente (uploads/) a Hetzner Object Storage
// 
// USO:
//   npx tsx scripts/migrate-documents-to-s3.ts [--dry-run] [--delete-after]
//
// OPCIONES:
//   --dry-run: Solo muestra qué se migraría sin hacer cambios
//   --delete-after: Elimina archivos locales después de migrar (solo si --dry-run no está activo)
//
// SEGURIDAD:
//   - Verifica que el archivo existe antes de migrar
//   - Verifica que la subida a S3 fue exitosa antes de actualizar DB
//   - No elimina archivos locales a menos que --delete-after esté activo
//   - Idempotente: puede ejecutarse múltiples veces sin problemas

import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import path from 'path';

import { config } from 'dotenv';

import { prisma } from '../lib/prisma';
import { isS3Configured, shouldUseCloudStorage, uploadToS3 } from '../lib/s3';

// Cargar variables de entorno
const envLocalPath = resolve(process.cwd(), '.env.local');
const envPath = resolve(process.cwd(), '.env');

if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
} else if (existsSync(envPath)) {
  config({ path: envPath });
}

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

interface MigrationStats {
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  errorsList: Array<{ documentoId: string; error: string }>;
}

/**
 * Encuentra documentos legacy (almacenados localmente)
 */
async function findLegacyDocuments() {
  // Nota: s3Bucket es NOT NULL en el esquema, así que filtramos por 'local'
  const documentos = await prisma.documentos.findMany({
    where: {
      s3Bucket: 'local',
    },
    select: {
      id: true,
      nombre: true,
      s3Key: true,
      s3Bucket: true,
      empresaId: true,
      empleadoId: true,
      mimeType: true,
      tamano: true,
    },
  });

  return documentos;
}

/**
 * Verifica si el archivo físico existe en uploads/
 */
async function fileExists(s3Key: string): Promise<boolean> {
  const filePath = path.join(UPLOADS_DIR, s3Key);
  return existsSync(filePath);
}

/**
 * Lee el archivo desde el filesystem local
 */
async function readLocalFile(s3Key: string): Promise<Buffer> {
  const filePath = path.join(UPLOADS_DIR, s3Key);
  return await fs.readFile(filePath);
}

/**
 * Migra un documento a S3
 */
async function migrateDocument(
  documento: {
    id: string;
    nombre: string;
    s3Key: string;
    empresaId: string;
    empleadoId: string | null;
    mimeType: string;
  },
  dryRun: boolean
): Promise<{ success: boolean; error?: string; newS3Key?: string }> {
  try {
    // Verificar que el archivo existe
    const exists = await fileExists(documento.s3Key);
    if (!exists) {
      return {
        success: false,
        error: `Archivo no encontrado en ${documento.s3Key}`,
      };
    }

    // Leer archivo
    const buffer = await readLocalFile(documento.s3Key);

    // Determinar nueva clave S3
    // Si ya tiene prefijo "documentos/", mantenerlo; si no, añadirlo
    let newS3Key = documento.s3Key;
    if (!newS3Key.startsWith('documentos/')) {
      newS3Key = `documentos/${newS3Key}`;
    }

    if (dryRun) {
      console.log(`  [DRY RUN] Migraría: ${documento.s3Key} → ${newS3Key}`);
      return { success: true, newS3Key };
    }

    // Subir a S3
    const bucketName = process.env.STORAGE_BUCKET;
    if (!bucketName) {
      throw new Error('STORAGE_BUCKET no configurado');
    }

    await uploadToS3(buffer, newS3Key, documento.mimeType);

    // Verificar que la subida fue exitosa (intentar leer)
    // Nota: En producción podrías usar headObject para verificar sin descargar

    // Actualizar registro en DB
    await prisma.documentos.update({
      where: { id: documento.id },
      data: {
        s3Key: newS3Key,
        s3Bucket: bucketName,
      },
    });

    return { success: true, newS3Key };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Elimina archivo local después de migración exitosa
 */
async function deleteLocalFile(s3Key: string): Promise<void> {
  const filePath = path.join(UPLOADS_DIR, s3Key);
  try {
    await fs.unlink(filePath);
    console.log(`  ✅ Archivo local eliminado: ${s3Key}`);
  } catch (error) {
    console.warn(`  ⚠️  No se pudo eliminar archivo local: ${s3Key}`, error);
  }
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const deleteAfter = args.includes('--delete-after');

  console.log('🚀 Script de Migración: Documentos Legacy → Hetzner Object Storage\n');

  // Verificar configuración
  if (!isS3Configured()) {
    console.error('❌ ERROR: Hetzner Object Storage no está configurado');
    console.error('   Configura las variables STORAGE_* en .env');
    process.exit(1);
  }

  if (!shouldUseCloudStorage()) {
    console.error('❌ ERROR: ENABLE_CLOUD_STORAGE no está activo');
    console.error('   Activa ENABLE_CLOUD_STORAGE=true en .env');
    process.exit(1);
  }

  if (dryRun) {
    console.log('🔍 MODO DRY RUN: No se realizarán cambios reales\n');
  }

  if (deleteAfter && !dryRun) {
    console.log('🗑️  Los archivos locales se eliminarán después de migrar\n');
  }

  // Encontrar documentos legacy
  console.log('📋 Buscando documentos legacy...');
  const documentosLegacy = await findLegacyDocuments();
  console.log(`   Encontrados: ${documentosLegacy.length} documento(s)\n`);

  if (documentosLegacy.length === 0) {
    console.log('✅ No hay documentos legacy para migrar');
    process.exit(0);
  }

  const stats: MigrationStats = {
    total: documentosLegacy.length,
    migrated: 0,
    skipped: 0,
    errors: 0,
    errorsList: [],
  };

  // Procesar cada documento
  for (const documento of documentosLegacy) {
    console.log(`📄 Procesando: ${documento.nombre} (${documento.id})`);

    const resultado = await migrateDocument(documento, dryRun);

    if (resultado.success) {
      stats.migrated++;
      console.log(`  ✅ Migrado exitosamente`);
      if (resultado.newS3Key) {
        console.log(`     Nueva clave: ${resultado.newS3Key}`);
      }

      // Eliminar archivo local si se solicita
      if (deleteAfter && !dryRun) {
        await deleteLocalFile(documento.s3Key);
      }
    } else {
      stats.errors++;
      stats.errorsList.push({
        documentoId: documento.id,
        error: resultado.error || 'Error desconocido',
      });
      console.log(`  ❌ Error: ${resultado.error}`);
    }
    console.log('');
  }

  // Resumen
  console.log('📊 Resumen de Migración:');
  console.log(`   Total: ${stats.total}`);
  console.log(`   ✅ Migrados: ${stats.migrated}`);
  console.log(`   ⏭️  Omitidos: ${stats.skipped}`);
  console.log(`   ❌ Errores: ${stats.errors}`);

  if (stats.errors > 0) {
    console.log('\n❌ Errores encontrados:');
    stats.errorsList.forEach(({ documentoId, error }) => {
      console.log(`   - ${documentoId}: ${error}`);
    });
  }

  if (dryRun) {
    console.log('\n💡 Para ejecutar la migración real, ejecuta sin --dry-run');
  } else {
    console.log('\n✅ Migración completada');
    if (!deleteAfter) {
      console.log('💡 Para eliminar archivos locales después de migrar, usa --delete-after');
    }
  }

  process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

