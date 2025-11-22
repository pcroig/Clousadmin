#!/usr/bin/env tsx
// ========================================
// Script: Verificación Local de Preparación para Producción
// ========================================
// Verifica que el código esté listo para producción
// NO requiere conexión al servidor

import { existsSync, readFileSync } from 'fs';
import * as path from 'path';

import * as dotenv from 'dotenv';

// Cargar .env
const envPath = path.join(process.cwd(), '.env');
dotenv.config({ path: envPath });

console.log('🔍 Verificación Local de Preparación para Producción\n');
console.log('='.repeat(60));
console.log('');

// Colores
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let issues = 0;

// 1. Verificar archivos críticos
console.log('📁 1. Verificando archivos críticos...');
const criticalFiles = [
  'lib/prisma.ts',
  'lib/redis.ts',
  'lib/s3.ts',
  'lib/email.ts',
  'scripts/backup-db.sh',
  'scripts/hetzner/setup-redis.sh',
  'scripts/hetzner/setup-cron.sh',
  'instrumentation.ts',
];

for (const file of criticalFiles) {
  const filePath = path.join(process.cwd(), file);
  if (existsSync(filePath)) {
    console.log(`   ${GREEN}✅${RESET} ${file}`);
  } else {
    console.log(`   ${RED}❌${RESET} ${file} - FALTANTE`);
    issues++;
  }
}
console.log('');

// 2. Verificar configuración de Prisma
console.log('🗄️  2. Verificando configuración de Prisma...');
const prismaSchemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
if (existsSync(prismaSchemaPath)) {
  console.log(`   ${GREEN}✅${RESET} schema.prisma existe`);
  
  const schema = readFileSync(prismaSchemaPath, 'utf-8');
  if (schema.includes('datasource db')) {
    console.log(`   ${GREEN}✅${RESET} Datasource configurado`);
  } else {
    console.log(`   ${RED}❌${RESET} Datasource no encontrado en schema`);
    issues++;
  }
} else {
  console.log(`   ${RED}❌${RESET} schema.prisma no existe`);
  issues++;
}
console.log('');

// 3. Verificar configuración de Redis
console.log('🔴 3. Verificando configuración de Redis...');
const redisLibPath = path.join(process.cwd(), 'lib', 'redis.ts');
if (existsSync(redisLibPath)) {
  const redisCode = readFileSync(redisLibPath, 'utf-8');
  if (redisCode.includes('REDIS_URL')) {
    console.log(`   ${GREEN}✅${RESET} lib/redis.ts usa REDIS_URL`);
  } else {
    console.log(`   ${YELLOW}⚠️${RESET} lib/redis.ts podría no estar usando REDIS_URL`);
  }
  
  if (redisCode.includes('maxRetriesPerRequest')) {
    console.log(`   ${GREEN}✅${RESET} Configuración de retry presente`);
  }
} else {
  console.log(`   ${RED}❌${RESET} lib/redis.ts no existe`);
  issues++;
}
console.log('');

// 4. Verificar configuración de S3/Hetzner
console.log('☁️  4. Verificando configuración de Hetzner Object Storage...');
const s3LibPath = path.join(process.cwd(), 'lib', 's3.ts');
if (existsSync(s3LibPath)) {
  const s3Code = readFileSync(s3LibPath, 'utf-8');
  if (s3Code.includes('STORAGE_ENDPOINT')) {
    console.log(`   ${GREEN}✅${RESET} lib/s3.ts usa STORAGE_ENDPOINT`);
  }
  if (s3Code.includes('forcePathStyle')) {
    console.log(`   ${GREEN}✅${RESET} forcePathStyle configurado (Hetzner)`);
  }
} else {
  console.log(`   ${RED}❌${RESET} lib/s3.ts no existe`);
  issues++;
}
console.log('');

// 5. Verificar configuración de Email
console.log('📧 5. Verificando configuración de Email (Resend)...');
const emailLibPath = path.join(process.cwd(), 'lib', 'email.ts');
if (existsSync(emailLibPath)) {
  const emailCode = readFileSync(emailLibPath, 'utf-8');
  if (emailCode.includes('RESEND_API_KEY')) {
    console.log(`   ${GREEN}✅${RESET} lib/email.ts usa RESEND_API_KEY`);
  }
  if (emailCode.includes('isResendConfigured')) {
    console.log(`   ${GREEN}✅${RESET} Validación de configuración presente`);
  }
} else {
  console.log(`   ${RED}❌${RESET} lib/email.ts no existe`);
  issues++;
}
console.log('');

// 6. Verificar scripts de Hetzner
console.log('🛠️  6. Verificando scripts de Hetzner...');
const hetznerScripts = [
  'scripts/hetzner/setup-redis.sh',
  'scripts/hetzner/setup-cron.sh',
  'scripts/backup-db.sh',
];

for (const script of hetznerScripts) {
  const scriptPath = path.join(process.cwd(), script);
  if (existsSync(scriptPath)) {
    const content = readFileSync(scriptPath, 'utf-8');
    if (content.startsWith('#!/bin/bash')) {
      console.log(`   ${GREEN}✅${RESET} ${script} (shebang presente)`);
    } else {
      console.log(`   ${YELLOW}⚠️${RESET} ${script} (sin shebang)`);
    }
  } else {
    console.log(`   ${RED}❌${RESET} ${script} - FALTANTE`);
    issues++;
  }
}
console.log('');

// 7. Verificar instrumentation.ts
console.log('⚙️  7. Verificando instrumentation.ts (workers)...');
const instrumentationPath = path.join(process.cwd(), 'instrumentation.ts');
if (existsSync(instrumentationPath)) {
  const instCode = readFileSync(instrumentationPath, 'utf-8');
  if (instCode.includes('DISABLE_EMBEDDED_WORKER')) {
    console.log(`   ${GREEN}✅${RESET} instrumentation.ts verifica DISABLE_EMBEDDED_WORKER`);
  }
  if (instCode.includes('worker')) {
    console.log(`   ${GREEN}✅${RESET} Código de worker presente`);
  }
} else {
  console.log(`   ${YELLOW}⚠️${RESET} instrumentation.ts no existe (opcional si no usas workers embebidos)`);
}
console.log('');

// 8. Verificar next.config.ts
console.log('⚙️  8. Verificando next.config.ts...');
const nextConfigPath = path.join(process.cwd(), 'next.config.ts');
if (existsSync(nextConfigPath)) {
  const nextConfig = readFileSync(nextConfigPath, 'utf-8');
  if (nextConfig.includes('remotePatterns')) {
    console.log(`   ${GREEN}✅${RESET} remotePatterns configurado para imágenes`);
  }
  if (nextConfig.includes('STORAGE_ENDPOINT')) {
    console.log(`   ${GREEN}✅${RESET} Configuración dinámica de STORAGE_ENDPOINT`);
  }
} else {
  console.log(`   ${RED}❌${RESET} next.config.ts no existe`);
  issues++;
}
console.log('');

// Resumen
console.log('='.repeat(60));
console.log('');
if (issues === 0) {
  console.log(`${GREEN}✅ Código listo para producción${RESET}`);
  console.log('');
  console.log(`${BLUE}📋 Próximos pasos en el servidor:${RESET}`);
  console.log('');
  console.log('1. Conectarse al servidor:');
  console.log('   ssh usuario@tu-servidor-hetzner.com');
  console.log('');
  console.log('2. Ir al directorio del proyecto:');
  console.log('   cd /opt/clousadmin  # o donde esté desplegado');
  console.log('');
  console.log('3. Ejecutar migraciones:');
  console.log('   npm install --production');
  console.log('   npx prisma generate');
  console.log('   npx prisma migrate deploy');
  console.log('');
  console.log('4. Instalar Redis (si no está instalado):');
  console.log('   ./scripts/hetzner/setup-redis.sh');
  console.log('   # Copiar la REDIS_URL generada al .env');
  console.log('');
  console.log('5. Configurar CRONs:');
  console.log('   CRON_SECRET="tu-secret" APP_URL="https://app.hrcron.com" \\');
  console.log('   DATABASE_URL="..." STORAGE_ENDPOINT="..." \\');
  console.log('   STORAGE_ACCESS_KEY="..." STORAGE_SECRET_KEY="..." \\');
  console.log('   STORAGE_REGION="eu-central-1" BACKUP_BUCKET="clousadmin-backups" \\');
  console.log('   ./scripts/hetzner/setup-cron.sh');
  console.log('');
  console.log('6. Probar backup manual:');
  console.log('   ./scripts/backup-db.sh');
  console.log('');
  console.log('7. Verificar producción:');
  console.log('   ./scripts/hetzner/verify-production.sh');
  console.log('');
} else {
  console.log(`${RED}❌ Se encontraron ${issues} problema(s)${RESET}`);
  console.log('');
  console.log('Corrige los problemas antes de desplegar a producción.');
  process.exit(1);
}



