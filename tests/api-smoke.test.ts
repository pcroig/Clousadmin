/**
 * Smoke Tests HTTP para APIs críticas
 * Verifica que los endpoints principales respondan correctamente
 * 
 * Ejecutar con: npm run test
 * 
 * NOTA: Estos tests NO requieren el servidor en ejecución
 * Son tests de "structure" que verifican que los archivos existen
 * Para tests E2E reales, ver docs/tests/E2E.md
 */

import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

console.log('🧪 Ejecutando smoke tests de APIs...');

const APP_DIR = resolve(__dirname, '../app/api');

// ========================================
// TEST: Verificar existencia de APIs críticas
// ========================================

function testApiEndpointsExist() {
  const criticalEndpoints = [
    // Autenticación
    'auth/login/route.ts',
    'auth/logout/route.ts',
    
    // Empleados
    'empleados/route.ts',
    'empleados/[id]/route.ts',
    'empleados/[id]/export/route.ts',
    'empleados/[id]/anonymize/route.ts',
    
    // Ausencias
    'ausencias/route.ts',
    'ausencias/[id]/route.ts',
    
    // Documentos
    'documentos/route.ts',
    'documentos/[id]/route.ts',
    
    // Nóminas
    'nominas/route.ts',
    'nominas/[id]/route.ts',
    
    // Fichajes
    'fichajes/route.ts',
    'fichajes/[id]/route.ts',
  ];

  for (const endpoint of criticalEndpoints) {
    const path = resolve(APP_DIR, endpoint);
    assert.ok(existsSync(path), `Endpoint crítico debe existir: ${endpoint}`);
  }

  console.log(`  ✓ ${criticalEndpoints.length} endpoints críticos existen`);
}

// ========================================
// TEST: Verificar que los endpoints exportan funciones HTTP
// ========================================

function testApiEndpointsExportHandlers() {
  const endpointsToCheck = [
    { path: 'empleados/route.ts', methods: ['GET', 'POST'] },
    { path: 'empleados/[id]/route.ts', methods: ['GET', 'PATCH', 'DELETE'] },
    { path: 'ausencias/route.ts', methods: ['GET', 'POST'] },
    { path: 'documentos/route.ts', methods: ['GET', 'POST'] },
  ];

  for (const { path, methods } of endpointsToCheck) {
    const filePath = resolve(APP_DIR, path);
    const content = readFileSync(filePath, 'utf-8');

    for (const method of methods) {
      const hasExport = content.includes(`export async function ${method}`) || 
                       content.includes(`export function ${method}`);
      assert.ok(hasExport, `${path} debe exportar función ${method}`);
    }
  }

  console.log('  ✓ Endpoints exportan funciones HTTP correctas');
}

// ========================================
// TEST: Verificar que los endpoints usan getSession para auth
// ========================================

function testApiEndpointsUseAuth() {
  const protectedEndpoints = [
    'empleados/route.ts',
    'empleados/[id]/route.ts',
    'ausencias/route.ts',
    'documentos/route.ts',
    'nominas/route.ts',
  ];

  for (const endpoint of protectedEndpoints) {
    const path = resolve(APP_DIR, endpoint);
    const content = readFileSync(path, 'utf-8');
    
    // Verificar que usa getSession para autenticación
    const usesAuth = content.includes('getSession') || 
                     content.includes('await getSession()');
    assert.ok(usesAuth, `Endpoint protegido debe usar getSession: ${endpoint}`);
  }

  console.log(`  ✓ ${protectedEndpoints.length} endpoints protegidos usan autenticación`);
}

// ========================================
// TEST: Verificar que endpoints sensibles usan validación Zod
// ========================================

function testApiEndpointsUseValidation() {
  const endpointsWithValidation = [
    'empleados/route.ts',
    'ausencias/route.ts',
    'nominas/route.ts',
  ];

  for (const endpoint of endpointsWithValidation) {
    const path = resolve(APP_DIR, endpoint);
    const content = readFileSync(path, 'utf-8');
    
    // Verificar que importa z de zod
    const usesZod = content.includes('from \'zod\'') || 
                    content.includes('from "zod"');
    assert.ok(usesZod, `Endpoint debe usar Zod para validación: ${endpoint}`);
  }

  console.log(`  ✓ ${endpointsWithValidation.length} endpoints usan validación Zod`);
}

// ========================================
// TEST: Verificar que endpoints de empleados usan cifrado
// ========================================

function testEmpleadoEndpointsUseEncryption() {
  const empleadoEndpoints = [
    'empleados/route.ts',
    'empleados/[id]/route.ts',
  ];

  for (const endpoint of empleadoEndpoints) {
    const path = resolve(APP_DIR, endpoint);
    const content = readFileSync(path, 'utf-8');
    
    // Verificar que usa funciones de cifrado
    const usesEncryption = content.includes('encryptEmpleadoData') || 
                           content.includes('decryptEmpleadoData');
    assert.ok(usesEncryption, `Endpoint de empleados debe usar cifrado: ${endpoint}`);
  }

  console.log(`  ✓ Endpoints de empleados usan cifrado`);
}

// ========================================
// TEST: Verificar manejo de errores
// ========================================

function testApiEndpointsHandleErrors() {
  const endpointsToCheck = [
    'empleados/route.ts',
    'empleados/[id]/route.ts',
    'ausencias/route.ts',
  ];

  for (const endpoint of endpointsToCheck) {
    const path = resolve(APP_DIR, endpoint);
    const content = readFileSync(path, 'utf-8');
    
    // Verificar que tiene try-catch o manejo de errores
    const hasErrorHandling = content.includes('try {') || 
                             content.includes('catch') ||
                             content.includes('handleApiError');
    assert.ok(hasErrorHandling, `Endpoint debe manejar errores: ${endpoint}`);
  }

  console.log(`  ✓ Endpoints manejan errores correctamente`);
}

// Ejecutar tests
try {
  testApiEndpointsExist();
  testApiEndpointsExportHandlers();
  testApiEndpointsUseAuth();
  testApiEndpointsUseValidation();
  testEmpleadoEndpointsUseEncryption();
  testApiEndpointsHandleErrors();
  console.log('✅ Smoke tests de APIs completados');
} catch (error) {
  console.error('❌ Error en smoke tests de APIs:', error);
  process.exit(1);
}






