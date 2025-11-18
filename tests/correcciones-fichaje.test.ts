import { strict as assert } from 'node:assert';

import {
  normalizarFechaCorreccion,
  normalizarHoraCorreccion,
} from '@/lib/fichajes/correcciones';

function testNormalizarFecha() {
  const fecha = normalizarFechaCorreccion('2025-02-10T15:30:00Z');
  assert.ok(fecha, 'Debe parsear fechas válidas');
  assert.strictEqual(fecha?.getHours(), 0, 'Debe normalizar al inicio del día');

  const invalida = normalizarFechaCorreccion('fecha-no-valida');
  assert.strictEqual(invalida, null);
}

function testNormalizarHora() {
  const base = new Date('2025-02-10T00:00:00Z');

  const desdeIso = normalizarHoraCorreccion('2025-02-10T08:15:00Z', base);
  assert.ok(desdeIso);
  assert.strictEqual(desdeIso?.getUTCHours(), 8);

  const desdeHora = normalizarHoraCorreccion('09:45', base);
  assert.ok(desdeHora);
  assert.strictEqual(desdeHora?.getHours(), 9);
  assert.strictEqual(desdeHora?.getMinutes(), 45);

  const invalida = normalizarHoraCorreccion('hora-no-valida', base);
  assert.strictEqual(invalida, null);
}

testNormalizarFecha();
testNormalizarHora();

console.log('✅ Tests correcciones fichaje OK');

