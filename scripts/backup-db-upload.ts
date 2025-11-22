#!/usr/bin/env node
// ========================================
// Upload backup to Hetzner Object Storage
// ========================================
// Este script usa el SDK de AWS ya instalado en el proyecto
// para subir el backup a Hetzner Object Storage
// Configuración consistente con lib/s3.ts

import { existsSync, readFileSync, statSync } from 'fs';
import { basename } from 'path';

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT;
const STORAGE_REGION = process.env.STORAGE_REGION;
const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY;
const STORAGE_SECRET_KEY = process.env.STORAGE_SECRET_KEY;
const BACKUP_BUCKET = process.env.BACKUP_BUCKET || process.env.STORAGE_BUCKET;

if (!STORAGE_ENDPOINT || !STORAGE_REGION || !STORAGE_ACCESS_KEY || !STORAGE_SECRET_KEY || !BACKUP_BUCKET) {
  console.error('❌ Faltan variables de entorno requeridas');
  process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('❌ Debes proporcionar la ruta del archivo a subir');
  process.exit(1);
}

// Verificar que el archivo existe
if (!existsSync(filePath)) {
  console.error(`❌ El archivo no existe: ${filePath}`);
  process.exit(1);
}

// Verificar tamaño del archivo (máximo 5GB - razonable para backups de aplicaciones HR)
const fileStats = statSync(filePath);
const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
if (fileStats.size > MAX_FILE_SIZE) {
  console.error(`❌ El archivo es demasiado grande: ${(fileStats.size / 1024 / 1024).toFixed(2)}MB (máximo 5GB)`);
  console.error('   Si tu backup es mayor a 5GB, revisa la base de datos (posibles datos no optimizados)');
  process.exit(1);
}

const objectKey = `backups/postgres/${basename(filePath)}`;

async function uploadBackup() {
  try {
    // Configuración consistente con lib/s3.ts
    const s3Client = new S3Client({
      endpoint: STORAGE_ENDPOINT,
      region: STORAGE_REGION,
      credentials: {
        accessKeyId: STORAGE_ACCESS_KEY,
        secretAccessKey: STORAGE_SECRET_KEY,
      },
      // Configuración consistente con lib/s3.ts (forcePathStyle: false para Hetzner)
      forcePathStyle: false,
      // Retry configuration para producción
      maxAttempts: 3,
    });

    console.log(`📤 Leyendo archivo: ${filePath} (${(fileStats.size / 1024 / 1024).toFixed(2)}MB)...`);
    const fileContent = readFileSync(filePath);

    console.log(`☁️  Subiendo a Hetzner Object Storage: ${objectKey}...`);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BACKUP_BUCKET,
        Key: objectKey,
        Body: fileContent,
        ContentType: 'application/gzip',
      })
    );

    console.log(`✅ Backup subido exitosamente: s3://${BACKUP_BUCKET}/${objectKey}`);
  } catch (error) {
    console.error('❌ Error subiendo backup:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

uploadBackup();

