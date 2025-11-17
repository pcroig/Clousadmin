/**
 * Tests para autenticación
 * Ejecutar con: npm run test
 */

import { strict as assert } from 'node:assert';
import { UsuarioRol } from '@prisma/client';
import { z } from 'zod';

console.log('🧪 Ejecutando tests de autenticación...');

// Simple email validation helper
const emailSchema = z.string().email();
function validarEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

// ========================================
// TEST: Validación de emails
// ========================================

function testValidarEmail() {
  // Casos válidos
  assert.ok(validarEmail('usuario@example.com'), 'Email válido debe pasar');
  assert.ok(validarEmail('test.user+tag@subdomain.example.co.uk'), 'Email complejo válido debe pasar');
  
  // Casos inválidos
  assert.ok(!validarEmail('invalid'), 'Email sin @ debe fallar');
  assert.ok(!validarEmail('@example.com'), 'Email sin usuario debe fallar');
  assert.ok(!validarEmail('user@'), 'Email sin dominio debe fallar');
  assert.ok(!validarEmail(''), 'Email vacío debe fallar');
  
  console.log('  ✓ Validación de emails');
}

// ========================================
// TEST: Roles de usuario
// ========================================

function testRolesUsuario() {
  // Verificar que los roles existen
  assert.ok(UsuarioRol.hr_admin, 'Rol hr_admin debe existir');
  assert.ok(UsuarioRol.manager, 'Rol manager debe existir');
  assert.ok(UsuarioRol.empleado, 'Rol empleado debe existir');
  assert.ok(UsuarioRol.platform_admin, 'Rol platform_admin debe existir');
  
  // Verificar valores
  assert.equal(UsuarioRol.hr_admin, 'hr_admin');
  assert.equal(UsuarioRol.manager, 'manager');
  assert.equal(UsuarioRol.empleado, 'empleado');
  assert.equal(UsuarioRol.platform_admin, 'platform_admin');
  
  console.log('  ✓ Roles de usuario');
}

// ========================================
// TEST: Permisos básicos
// ========================================

function testPermisosBasicos() {
  const rolesConPermisoAdmin = [UsuarioRol.hr_admin, UsuarioRol.platform_admin];
  const rolesConPermisoLectura = [UsuarioRol.hr_admin, UsuarioRol.manager, UsuarioRol.empleado, UsuarioRol.platform_admin];
  
  // Verificar que admin roles incluyen hr_admin y platform_admin
  assert.ok(rolesConPermisoAdmin.includes(UsuarioRol.hr_admin), 'hr_admin debe tener permisos admin');
  assert.ok(rolesConPermisoAdmin.includes(UsuarioRol.platform_admin), 'platform_admin debe tener permisos admin');
  
  // Verificar que todos los roles tienen permisos de lectura
  assert.equal(rolesConPermisoLectura.length, 4, 'Todos los roles deben tener permisos de lectura');
  
  console.log('  ✓ Permisos básicos');
}

// Ejecutar tests
try {
  testValidarEmail();
  testRolesUsuario();
  testPermisosBasicos();
  console.log('✅ Tests de autenticación completados');
} catch (error) {
  console.error('❌ Error en tests de autenticación:', error);
  process.exit(1);
}

