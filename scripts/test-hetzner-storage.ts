#!/usr/bin/env tsx
// Script de diagnóstico para Hetzner Object Storage
// Uso: npx tsx scripts/test-hetzner-storage.ts

// Cargar variables de entorno desde .env
import * as dotenv from 'dotenv';
import * as path from 'path';
import { existsSync } from 'fs';
import { S3Client, PutObjectCommand, GetObjectCommand, ListBucketsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import type { AwsCredentialIdentity } from '@aws-sdk/types';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cargar .env (buscar en el raíz del proyecto)
const envPath = path.join(process.cwd(), '.env');
dotenv.config({ path: envPath });

async function main() {
  const STORAGE_ENDPOINT = process.env.STORAGE_ENDPOINT;
  const STORAGE_REGION = process.env.STORAGE_REGION;
  const STORAGE_ACCESS_KEY = process.env.STORAGE_ACCESS_KEY;
  const STORAGE_SECRET_KEY = process.env.STORAGE_SECRET_KEY;
  const STORAGE_BUCKET = process.env.STORAGE_BUCKET;

  console.log('🔍 Diagnóstico de Hetzner Object Storage\n');
  console.log('='.repeat(60));
  
  // Debug: mostrar ruta del .env
  console.log(`\n📁 Archivos de configuración:`);
  console.log(`   Ruta del script: ${__filename}`);
  console.log(`   Directorio actual: ${process.cwd()}`);
  console.log(`   Archivo .env: ${envPath}`);
  
  // Verificar si el archivo .env existe
  const envExists = existsSync(envPath);
  console.log(`   .env existe: ${envExists ? '✅' : '❌'}`);

  // 1. Verificar variables de entorno
  console.log('\n📋 1. Variables de Entorno:');
  console.log(`   STORAGE_ENDPOINT: ${STORAGE_ENDPOINT ? '✅ Configurado' : '❌ FALTANTE'}`);
  if (STORAGE_ENDPOINT) {
    console.log(`      Valor: ${STORAGE_ENDPOINT}`);
    // Validar formato
    if (!STORAGE_ENDPOINT.startsWith('https://')) {
      console.log(`      ⚠️  ADVERTENCIA: El endpoint debe empezar con https://`);
    }
    if (!STORAGE_ENDPOINT.includes('objectstorage') && !STORAGE_ENDPOINT.includes('your-objectstorage')) {
      console.log(`      ⚠️  ADVERTENCIA: El endpoint no parece ser de Hetzner Object Storage`);
    }
  } else {
    console.log(`      ℹ️  Intenta ejecutar con: npm run test-storage`);
  }

  console.log(`   STORAGE_REGION: ${STORAGE_REGION ? '✅ Configurado' : '❌ FALTANTE'}`);
  if (STORAGE_REGION) {
    console.log(`      Valor: ${STORAGE_REGION}`);
    // Validar región común de Hetzner
    const validRegions = ['fsn1', 'nbg1', 'hel1', 'eu-central-1'];
    if (!validRegions.some(r => STORAGE_REGION.includes(r))) {
      console.log(`      ⚠️  ADVERTENCIA: La región no parece ser estándar de Hetzner`);
    }
  }

  console.log(`   STORAGE_ACCESS_KEY: ${STORAGE_ACCESS_KEY ? '✅ Configurado' : '❌ FALTANTE'}`);
  if (STORAGE_ACCESS_KEY) {
    console.log(`      Valor: ${STORAGE_ACCESS_KEY.substring(0, 8)}... (${STORAGE_ACCESS_KEY.length} caracteres)`);
  }

  console.log(`   STORAGE_SECRET_KEY: ${STORAGE_SECRET_KEY ? '✅ Configurado' : '❌ FALTANTE'}`);
  if (STORAGE_SECRET_KEY) {
    console.log(`      Valor: ${STORAGE_SECRET_KEY.substring(0, 8)}... (${STORAGE_SECRET_KEY.length} caracteres)`);
  }

  console.log(`   STORAGE_BUCKET: ${STORAGE_BUCKET ? '✅ Configurado' : '❌ FALTANTE'}`);
  if (STORAGE_BUCKET) {
    console.log(`      Valor: ${STORAGE_BUCKET}`);
  }

  if (!STORAGE_ENDPOINT || !STORAGE_REGION || !STORAGE_ACCESS_KEY || !STORAGE_SECRET_KEY || !STORAGE_BUCKET) {
    console.log('\n❌ ERROR: Faltan variables de entorno requeridas');
    console.log('   Configura todas las variables STORAGE_* en tu archivo .env');
    process.exit(1);
  }

  // 2. Crear cliente S3
  console.log('\n🔧 2. Creando Cliente S3:');
  let s3Client: S3Client;
  try {
    s3Client = new S3Client({
      region: STORAGE_REGION!,
      endpoint: STORAGE_ENDPOINT!,
      credentials: {
        accessKeyId: STORAGE_ACCESS_KEY!,
        secretAccessKey: STORAGE_SECRET_KEY!,
      } as Credentials,
      forcePathStyle: true, // Requerido para Hetzner
      maxAttempts: 3,
    });
    console.log('   ✅ Cliente S3 creado correctamente');
    console.log(`      Endpoint: ${STORAGE_ENDPOINT}`);
    console.log(`      Región: ${STORAGE_REGION}`);
    console.log(`      Path Style: true (requerido para Hetzner)`);
  } catch (error) {
    console.log('   ❌ Error creando cliente S3:', error);
    process.exit(1);
  }

  // 3. Verificar conexión y credenciales
  console.log('\n🔐 3. Verificando Credenciales:');
  try {
    const listCommand = new ListBucketsCommand({});
    const response = await s3Client.send(listCommand);
    console.log('   ✅ Credenciales válidas');
    console.log(`      Buckets accesibles: ${response.Buckets?.length || 0}`);
    if (response.Buckets && response.Buckets.length > 0) {
      console.log('      Buckets encontrados:');
      response.Buckets.forEach(bucket => {
        console.log(`        - ${bucket.Name} (creado: ${bucket.CreationDate})`);
      });
    }
  } catch (error: unknown) {
    const errorObj = error as { name?: string; message?: string } | null;
    console.log('   ❌ Error verificando credenciales:');
    if (errorObj?.name === 'InvalidAccessKeyId') {
      console.log('      ERROR: Access Key inválido');
    } else if (errorObj?.name === 'SignatureDoesNotMatch') {
      console.log('      ERROR: Secret Key incorrecto o firma no coincide');
    } else if (errorObj?.name === 'NetworkingError') {
      console.log('      ERROR: No se puede conectar al endpoint');
      console.log(`      Verifica que ${STORAGE_ENDPOINT} sea accesible`);
    } else {
      console.log(`      ${errorObj?.name ?? 'Unknown'}: ${errorObj?.message ?? 'Unknown error'}`);
    }
    process.exit(1);
  }

  // 4. Verificar que el bucket existe
  console.log('\n🪣 4. Verificando Bucket:');
  try {
    const headCommand = new HeadBucketCommand({ Bucket: STORAGE_BUCKET! });
    await s3Client.send(headCommand);
    console.log(`   ✅ Bucket "${STORAGE_BUCKET}" existe y es accesible`);
  } catch (error: unknown) {
    const errorObj = error as { name?: string; message?: string } | null;
    console.log(`   ❌ Error accediendo al bucket "${STORAGE_BUCKET}":`);
    if (errorObj?.name === 'NoSuchBucket') {
      console.log('      ERROR: El bucket no existe');
      console.log(`      Verifica que el bucket "${STORAGE_BUCKET}" exista en Hetzner Cloud Console`);
    } else if (errorObj?.name === 'AccessDenied') {
      console.log('      ERROR: Acceso denegado al bucket');
      console.log('      Verifica los permisos del Access Key');
    } else {
      console.log(`      ${errorObj?.name ?? 'Unknown'}: ${errorObj?.message ?? 'Unknown error'}`);
    }
    process.exit(1);
  }

  // 5. Test de upload
  console.log('\n📤 5. Test de Upload:');
  try {
    const testKey = `test/diagnostico-${Date.now()}.txt`;
    const testContent = Buffer.from('Test de diagnóstico de Hetzner Object Storage');
    
    const putCommand = new PutObjectCommand({
      Bucket: STORAGE_BUCKET!,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    });
    
    await s3Client.send(putCommand);
    console.log(`   ✅ Upload exitoso`);
    console.log(`      Key: ${testKey}`);
    
    // Construir URL (formato path style)
    const endpoint = STORAGE_ENDPOINT!.replace(/\/$/, '');
    const fileUrl = `${endpoint}/${STORAGE_BUCKET}/${testKey}`;
    console.log(`      URL: ${fileUrl}`);
    
    // 6. Test de download
    console.log('\n📥 6. Test de Download:');
    const getCommand = new GetObjectCommand({
      Bucket: STORAGE_BUCKET!,
      Key: testKey,
    });
    
    const getResponse = await s3Client.send(getCommand);
    if (getResponse.Body) {
      const chunks: Uint8Array[] = [];
      const body = getResponse.Body as { [Symbol.asyncIterator]?: () => AsyncIterable<Uint8Array> } | null;
      if (body[Symbol.asyncIterator]) {
        for await (const chunk of body) {
          chunks.push(chunk);
        }
      }
      const downloaded = Buffer.concat(chunks).toString();
      console.log(`   ✅ Download exitoso`);
      console.log(`      Contenido: ${downloaded}`);
    }
    
    // 7. Test de signed URL
    console.log('\n🔗 7. Test de Signed URL:');
    const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 300 });
    console.log(`   ✅ Signed URL generada`);
    console.log(`      URL: ${signedUrl.substring(0, 80)}...`);
    console.log(`      Expira en: 300 segundos`);
    
    // 8. Limpiar archivo de test
    console.log('\n🧹 8. Limpiando archivo de test:');
    // (Opcional: eliminar el archivo de test)
    console.log(`   ℹ️  Archivo de test dejado en: ${testKey}`);
    console.log(`      Puedes eliminarlo manualmente desde Hetzner Cloud Console`);
    
  } catch (error: unknown) {
    const errorObj = error as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } } | null;
    console.log('   ❌ Error en test de upload/download:');
    console.log(`      ${errorObj?.name ?? 'Unknown'}: ${errorObj?.message ?? 'Unknown error'}`);
    if (errorObj?.$metadata) {
      console.log(`      Status Code: ${errorObj.$metadata.httpStatusCode}`);
    }
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnóstico completado exitosamente');
  console.log('\n💡 Próximos pasos:');
  console.log('   1. Verifica que las URLs generadas sean accesibles');
  console.log('   2. Si usas Next.js Image, actualiza next.config.ts con el dominio real');
  console.log('   3. Verifica los permisos CORS si necesitas acceso desde el navegador');
  console.log('');
}

// Ejecutar función principal
main().catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

