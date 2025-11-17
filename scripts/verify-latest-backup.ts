#!/usr/bin/env node
// ========================================
// Verificar último backup almacenado en Hetzner Object Storage
// ========================================
// Este script usa el SDK de AWS ya instalado en el proyecto
// para verificar el último backup en Hetzner Object Storage

import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream, unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT;
const STORAGE_REGION = process.env.STORAGE_REGION;
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY;
const STORAGE_SECRET_KEY = process.env.STORAGE_SECRET_KEY;
const BACKUP_BUCKET = process.env.BACKUP_BUCKET || process.env.STORAGE_BUCKET;

if (!STORAGE_ENDPOINT || !STORAGE_REGION || !STORAGE_ACCESS_KEY || !STORAGE_SECRET_KEY || !BACKUP_BUCKET) {
  console.error('❌ Faltan variables de entorno requeridas');
  process.exit(1);
}

async function verifyLatestBackup() {
  try {
    // Configuración consistente con lib/s3.ts
    const s3Client = new S3Client({
      endpoint: STORAGE_ENDPOINT,
      region: STORAGE_REGION,
      credentials: {
        accessKeyId: STORAGE_ACCESS_KEY,
        secretAccessKey: STORAGE_SECRET_KEY,
      },
      forcePathStyle: false,
      maxAttempts: 3,
    });

    console.log(`🔍 Buscando último backup en s3://${BACKUP_BUCKET}/backups/postgres/ ...`);

    // Listar objetos en el bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: BACKUP_BUCKET,
      Prefix: 'backups/postgres/',
    });

    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.error('❌ No se encontraron backups en el bucket indicado.');
      process.exit(1);
    }

    // Ordenar por fecha (más reciente primero)
    const sortedBackups = listResponse.Contents.sort(
      (a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0)
    );

    const latest = sortedBackups[0];
    if (!latest.Key) {
      console.error('❌ No se pudo determinar el último backup.');
      process.exit(1);
    }

    const tmpDir = process.env.BACKUP_TMP_DIR || '/tmp';
    const dest = join(tmpDir, latest.Key.split('/').pop() || 'backup.sql.gz');

    console.log(`⬇️  Descargando ${latest.Key} a ${dest} ...`);

    // Descargar el archivo
    const getCommand = new GetObjectCommand({
      Bucket: BACKUP_BUCKET,
      Key: latest.Key,
    });

    const getResponse = await s3Client.send(getCommand);

    if (!getResponse.Body) {
      console.error('❌ No se pudo descargar el backup.');
      process.exit(1);
    }

    // Guardar y verificar integridad
    const writeStream = createWriteStream(dest);
    const gunzip = createGunzip();

    await pipeline(getResponse.Body as NodeJS.ReadableStream, gunzip, writeStream);

    console.log('🧪 Verificando integridad (archivo descomprimido correctamente)...');

    // Limpiar archivo temporal
    if (existsSync(dest)) {
      unlinkSync(dest);
    }

    console.log(`✅ Backup verificado correctamente: ${latest.Key}`);
    console.log(`   Tamaño: ${((latest.Size || 0) / 1024 / 1024).toFixed(2)}MB`);
    console.log(`   Fecha: ${latest.LastModified?.toISOString()}`);
  } catch (error) {
    console.error('❌ Error verificando backup:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

verifyLatestBackup();


