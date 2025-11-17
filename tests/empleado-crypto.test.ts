/**
 * Tests para helpers de cifrado de empleados.
 * Ejecutar con: npm run test
 */

import { strict as assert } from 'node:assert';

import {
  decryptEmpleadoData,
  encryptEmpleadoData,
  isFieldEncrypted,
} from '@/lib/empleado-crypto';

// Asegurar que existe una ENCRYPTION_KEY en entorno de pruebas.
if (!process.env.ENCRYPTION_KEY) {
  process.env.ENCRYPTION_KEY =
    '3f70cf35f9f2efeff971a06fb8b3f2440d9b30b0271fd6936c9b72bd183216df';
}

function testEncryptDecrypt() {
  const original = {
    iban: 'ES7921000813610123456789',
    nif: '12345678Z',
    nss: '12/12345678/12',
  };

  const encrypted = encryptEmpleadoData(original);

  assert.ok(isFieldEncrypted(encrypted.iban!), 'IBAN debería estar cifrado');
  assert.ok(isFieldEncrypted(encrypted.nif!), 'NIF debería estar cifrado');
  assert.ok(isFieldEncrypted(encrypted.nss!), 'NSS debería estar cifrado');

  const decrypted = decryptEmpleadoData(encrypted);
  assert.equal(decrypted.iban, original.iban);
  assert.equal(decrypted.nif, original.nif);
  assert.equal(decrypted.nss, original.nss);
}

function testNoopWhenFieldsEmpty() {
  const encrypted = encryptEmpleadoData({
    iban: '',
    nif: null,
    nss: undefined,
  });

  assert.equal(encrypted.iban, '', 'IBAN vacío no debe alterarse');
  assert.equal(encrypted.nif, null, 'NIF null no debe alterarse');
  assert.equal(encrypted.nss, undefined, 'NSS undefined no debe alterarse');
}

testEncryptDecrypt();
testNoopWhenFieldsEmpty();


