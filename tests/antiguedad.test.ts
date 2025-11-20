import { strict as assert } from 'node:assert';

import { obtenerRangoFechaAntiguedad } from '@/lib/calculos/antiguedad';

function assertDate(value: Date | undefined | null): asserts value is Date {
  assert.ok(value instanceof Date && !Number.isNaN(value.getTime()), 'Fecha inválida');
}

function testRangos() {
  const rango = obtenerRangoFechaAntiguedad('6_12_meses');
  assert.ok(rango, 'Debe existir rango para 6_12_meses');
  assertDate(rango.gte);
  assertDate(rango.lt);
  assert.ok(rango.gte!.getTime() < rango.lt!.getTime(), 'gte debe ser más antiguo que lt');

  const mas5 = obtenerRangoFechaAntiguedad('mas_5_años');
  assert.ok(mas5);
  assert.ok(mas5?.lt, 'mas_5_años solo define lt');
  assert.strictEqual(mas5?.gte, undefined);

  const todos = obtenerRangoFechaAntiguedad('todos');
  assert.strictEqual(todos, null);

  const invalido = obtenerRangoFechaAntiguedad('desconocido');
  assert.strictEqual(invalido, null);
}

testRangos();


