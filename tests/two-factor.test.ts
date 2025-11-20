import { strict as assert } from 'node:assert';

import {
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
} from '@/lib/auth/two-factor';

console.log('🧪 Ejecutando tests de helpers 2FA...');

function testGenerateBackupCodes() {
  const codes = generateBackupCodes(8);
  assert.equal(codes.length, 8, 'Debe generar la cantidad solicitada');
  codes.forEach((code) => {
    assert.equal(code.length, 8, 'Cada código debe tener longitud 8 (hex uppercase)');
    assert.match(code, /^[0-9A-F]+$/, 'Formato hexadecimal en mayúsculas');
  });
  console.log('  ✓ Generación de códigos de respaldo');
}

function testVerifyBackupCode() {
  const codes = ['AAAA1111', 'BBBB2222'];
  const hashed = hashBackupCodes(codes);

  const first = verifyBackupCode(hashed, 'AAAA1111');
  assert.ok(first.valid, 'El primer código debe ser válido');
  assert.equal(first.remaining.length, 1, 'Debe quedar un código disponible');

  const second = verifyBackupCode(first.remaining, 'bbbb2222');
  assert.ok(second.valid, 'La verificación debe ser case-insensitive');
  assert.equal(second.remaining.length, 0, 'No debe quedar ningún código');

  const invalid = verifyBackupCode(second.remaining, 'CCCC3333');
  assert.ok(!invalid.valid, 'Códigos inexistentes deben fallar');
  console.log('  ✓ Verificación de códigos de respaldo');
}

try {
  testGenerateBackupCodes();
  testVerifyBackupCode();
  console.log('✅ Tests de helpers 2FA completados');
} catch (error) {
  console.error('❌ Error en tests 2FA:', error);
  process.exit(1);
}

