#!/usr/bin/env ts-node
/**
 * Script de normalización para carpetas y tipos de documento heredados.
 *
 * - Fusiona las carpetas antiguas "Personales"/"Médicos" con las nuevas
 *   "Otros"/"Justificantes", moviendo sus documentos antes de renombrar/eliminar.
 * - Normaliza `documento.tipoDocumento` para que solo existan
 *   'contrato' | 'nomina' | 'justificante' | 'otro'.
 *
 * Uso:
 *   npx tsx scripts/normalize-document-storage.ts
 */

// Cargar variables de entorno desde .env.local primero, luego .env
import { config } from 'dotenv';

import { existsSync } from 'fs';
import { resolve } from 'path';

// Paso 1: Cargar .env.local primero (tiene prioridad absoluta)
const envLocalPath = resolve(process.cwd(), '.env.local');
let envLocalDatabaseUrl: string | undefined;

if (existsSync(envLocalPath)) {
  const result = config({ path: envLocalPath, override: true });
  if (result.parsed) {
    envLocalDatabaseUrl = result.parsed.DATABASE_URL;
    process.env.DATABASE_URL = envLocalDatabaseUrl;
  }
}

// Paso 2: Cargar .env solo si .env.local no definió DATABASE_URL
if (!envLocalDatabaseUrl) {
  const envPath = resolve(process.cwd(), '.env');
  if (existsSync(envPath)) {
    config({ path: envPath, override: true });
  }
}

// Paso 3: Forzar DATABASE_URL de .env.local si existe (prioridad absoluta)
if (envLocalDatabaseUrl) {
  process.env.DATABASE_URL = envLocalDatabaseUrl;
}

// Verificar que DATABASE_URL está cargada antes de importar prisma
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL no encontrada en las variables de entorno.');
  console.error('Por favor, verifica que existe .env.local o .env con DATABASE_URL configurada.');
  process.exit(1);
}

console.log(`📊 Usando base de datos: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);

import { PrismaClient } from '@prisma/client';

import {
  CarpetaSistema,
  inferirTipoDocumento,
  TIPOS_DOCUMENTO,
} from '../lib/documentos';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

type FolderMapping = {
  legacyName: string;
  targetName: CarpetaSistema;
};

const LEGACY_FOLDER_MAPPINGS: FolderMapping[] = [
  { legacyName: 'Personales', targetName: 'Otros' },
  { legacyName: 'Médicos', targetName: 'Justificantes' },
  { legacyName: 'Medicos', targetName: 'Justificantes' },
];

const DOC_TYPE_NORMALIZATION: Record<string, string> = {
  contrato: TIPOS_DOCUMENTO.CONTRATO,
  contratos: TIPOS_DOCUMENTO.CONTRATO,
  contract: TIPOS_DOCUMENTO.CONTRATO,
  nomina: TIPOS_DOCUMENTO.NOMINA,
  nominas: TIPOS_DOCUMENTO.NOMINA,
  payroll: TIPOS_DOCUMENTO.NOMINA,
  justificante: TIPOS_DOCUMENTO.JUSTIFICANTE,
  justificantes: TIPOS_DOCUMENTO.JUSTIFICANTE,
  medico: TIPOS_DOCUMENTO.JUSTIFICANTE,
  medicos: TIPOS_DOCUMENTO.JUSTIFICANTE,
  dni: TIPOS_DOCUMENTO.OTRO,
  nie: TIPOS_DOCUMENTO.OTRO,
  identificacion: TIPOS_DOCUMENTO.OTRO,
  personal: TIPOS_DOCUMENTO.OTRO,
  personales: TIPOS_DOCUMENTO.OTRO,
  documento: TIPOS_DOCUMENTO.OTRO,
  documentos: TIPOS_DOCUMENTO.OTRO,
  general: TIPOS_DOCUMENTO.OTRO,
  otro: TIPOS_DOCUMENTO.OTRO,
  otros: TIPOS_DOCUMENTO.OTRO,
  null: TIPOS_DOCUMENTO.OTRO,
  undefined: TIPOS_DOCUMENTO.OTRO,
};

async function migrateFolders() {
  console.info('🔄 Normalizando carpetas legacy...');
  for (const mapping of LEGACY_FOLDER_MAPPINGS) {
    const legacyFolders = await prisma.carpeta.findMany({
      where: { nombre: mapping.legacyName },
      select: {
        id: true,
        empresaId: true,
        empleadoId: true,
        compartida: true,
        parentId: true,
      },
    });

    if (legacyFolders.length === 0) {
      continue;
    }

    console.info(
      `  • ${mapping.legacyName} → ${mapping.targetName}: ${legacyFolders.length} carpeta(s)`
    );

    for (const folder of legacyFolders) {
      const target = await prisma.carpeta.findFirst({
        where: {
          empresaId: folder.empresaId,
          empleadoId: folder.empleadoId,
          compartida: folder.compartida,
          parentId: folder.parentId,
          nombre: mapping.targetName,
        },
      });

      if (!target) {
        await prisma.carpeta.update({
          where: { id: folder.id },
          data: { nombre: mapping.targetName },
        });
        continue;
      }

      await prisma.$transaction([
        prisma.documento.updateMany({
          where: { carpetaId: folder.id },
          data: { carpetaId: target.id },
        }),
        prisma.carpeta.updateMany({
          where: { parentId: folder.id },
          data: { parentId: target.id },
        }),
        prisma.carpeta.delete({ where: { id: folder.id } }),
      ]);
    }
  }
}

async function migrateDocumentTypes() {
  console.info('🔄 Normalizando tipoDocumento legacy...');

  const validTypes = Object.values(TIPOS_DOCUMENTO);

  const documentos = await prisma.documento.findMany({
    where: {
      NOT: {
        tipoDocumento: {
          in: validTypes,
        },
      },
    },
    select: {
      id: true,
      tipoDocumento: true,
      carpeta: {
        select: { nombre: true },
      },
    },
  });

  if (documentos.length === 0) {
    console.info('  • No se encontraron documentos legacy');
    return;
  }

  console.info(`  • Documentos a normalizar: ${documentos.length}`);
  const BATCH_SIZE = 200;

  for (let i = 0; i < documentos.length; i += BATCH_SIZE) {
    const batch = documentos.slice(i, i + BATCH_SIZE);
    await prisma.$transaction(
      batch.map((doc) => {
        const rawTipo =
          doc.tipoDocumento?.toLowerCase() ??
          doc.tipoDocumento ??
          'undefined';
        const mapped = DOC_TYPE_NORMALIZATION[rawTipo] as
          | string
          | undefined;
        const inferred = mapped
          ? mapped
          : inferirTipoDocumento(doc.carpeta?.nombre ?? 'Otros', rawTipo);

        return prisma.documento.update({
          where: { id: doc.id },
          data: { tipoDocumento: inferred },
        });
      })
    );
  }
}

async function main() {
  const start = Date.now();
  await migrateFolders();
  await migrateDocumentTypes();
  console.info(
    `✅ Normalización completada en ${((Date.now() - start) / 1000).toFixed(
      1
    )}s`
  );
}

main()
  .catch((error) => {
    console.error('❌ Error ejecutando normalización:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

