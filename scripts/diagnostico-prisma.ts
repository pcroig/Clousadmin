// ========================================
// Script de Diagnóstico - Prisma y Base de Datos
// ========================================
// Ejecutar con: tsx scripts/diagnostico-prisma.ts
// Verifica conexión a BD, Prisma Client, y variables de entorno

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import path from 'path';

// Cargar .env
config({ path: path.resolve(__dirname, '../.env') });
config({ path: path.resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function diagnosticar() {
  console.log('🔍 DIAGNÓSTICO PRISMA Y BASE DE DATOS\n');
  console.log('='.repeat(60));

  // 1. Verificar variables de entorno
  console.log('\n📋 1. Verificando variables de entorno...');
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL no está definida en .env o .env.local');
    console.log('\n💡 Solución: Crea un archivo .env.local con:');
    console.log('   DATABASE_URL="postgresql://usuario:password@localhost:5432/clousadmin"');
    process.exit(1);
  }

  // Ocultar contraseña para logging
  const urlSinPassword = databaseUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`✅ DATABASE_URL encontrada: ${urlSinPassword}`);

  // 2. Verificar conexión a base de datos
  console.log('\n📋 2. Probando conexión a base de datos...');
  try {
    await prisma.$connect();
    console.log('✅ Conexión exitosa a la base de datos');
  } catch (error: any) {
    console.error('❌ ERROR al conectar a la base de datos:');
    console.error(`   ${error.message}`);
    console.log('\n💡 Posibles soluciones:');
    console.log('   - Verifica que PostgreSQL esté ejecutándose');
    console.log('   - Verifica que la base de datos exista');
    console.log('   - Verifica usuario y contraseña en DATABASE_URL');
    process.exit(1);
  }

  // 3. Verificar que las tablas existan
  console.log('\n📋 3. Verificando esquema de base de datos...');
  try {
    const empresas = await prisma.empresa.findMany({ take: 1 });
    console.log(`✅ Tabla 'empresas' accesible (${empresas.length} registros encontrados)`);

    const fichajes = await prisma.fichaje.findMany({ take: 1 });
    console.log(`✅ Tabla 'fichajes' accesible (${fichajes.length} registros encontrados)`);

    const empleados = await prisma.empleado.findMany({ take: 1 });
    console.log(`✅ Tabla 'empleados' accesible (${empleados.length} registros encontrados)`);
  } catch (error: any) {
    console.error('❌ ERROR al acceder a las tablas:');
    console.error(`   ${error.message}`);
    console.log('\n💡 Posibles soluciones:');
    console.log('   - Ejecuta las migraciones: npx prisma migrate deploy');
    console.log('   - O crea las migraciones: npx prisma migrate dev --name initial');
    process.exit(1);
  }

  // 4. Verificar Prisma Client
  console.log('\n📋 4. Verificando Prisma Client...');
  try {
    const clientVersion = await prisma.$queryRaw`SELECT version()`;
    console.log('✅ Prisma Client está funcionando correctamente');
  } catch (error: any) {
    console.error('❌ ERROR con Prisma Client:');
    console.error(`   ${error.message}`);
    console.log('\n💡 Solución: Regenera Prisma Client');
    console.log('   npx prisma generate');
    process.exit(1);
  }

  // 5. Contar registros
  console.log('\n📋 5. Contando registros en base de datos...');
  try {
    const [countEmpresas, countEmpleados, countFichajes] = await Promise.all([
      prisma.empresa.count(),
      prisma.empleado.count(),
      prisma.fichaje.count(),
    ]);

    console.log(`   Empresas: ${countEmpresas}`);
    console.log(`   Empleados: ${countEmpleados}`);
    console.log(`   Fichajes: ${countFichajes}`);

    if (countEmpresas === 0) {
      console.log('\n⚠️  ADVERTENCIA: No hay empresas en la base de datos');
      console.log('💡 Ejecuta: npm run seed');
    }
  } catch (error: any) {
    console.error('❌ ERROR al contar registros:');
    console.error(`   ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ DIAGNÓSTICO COMPLETADO');
  console.log('\n💡 Si todo está OK pero Prisma Studio no funciona:');
  console.log('   1. Detén Prisma Studio (Ctrl+C)');
  console.log('   2. Ejecuta: npx prisma generate');
  console.log('   3. Ejecuta: npx prisma studio');

  await prisma.$disconnect();
}

diagnosticar().catch((error) => {
  console.error('❌ ERROR FATAL:', error);
  process.exit(1);
});

