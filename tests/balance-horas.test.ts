import { strict as assert } from 'node:assert';

import {
  calcularHorasTrabajadasDelDia,
  generarDiasDelPeriodo,
} from '@/lib/calculos/balance-horas';

import type { FichajeConEventos } from '@/lib/calculos/fichajes';

function crearFichaje(
  fechaISO: string,
  horasTrabajadas?: number | null
): FichajeConEventos {
  return {
    id: 'fichaje-id',
    empresaId: 'empresa-id',
    empleadoId: 'empleado-id',
    fecha: new Date(fechaISO),
    estado: 'finalizado',
    horasTrabajadas: horasTrabajadas ?? null,
    horasEnPausa: null,
    cuadradoMasivamente: false,
    cuadradoPor: null,
    cuadradoEn: null,
    autoCompletado: false,
    fechaAprobacion: null,
    createdAt: new Date(fechaISO),
    updatedAt: new Date(fechaISO),
    eventos: [
      {
        id: 'entrada',
        fichajeId: 'fichaje-id',
        tipo: 'entrada',
        hora: new Date(`${fechaISO}T09:00:00Z`),
        ubicacion: null,
        editado: false,
        motivoEdicion: null,
        horaOriginal: null,
        editadoPor: null,
        createdAt: new Date(`${fechaISO}T09:00:00Z`),
      },
      {
        id: 'salida',
        fichajeId: 'fichaje-id',
        tipo: 'salida',
        hora: new Date(`${fechaISO}T17:00:00Z`),
        ubicacion: null,
        editado: false,
        motivoEdicion: null,
        horaOriginal: null,
        editadoPor: null,
        createdAt: new Date(`${fechaISO}T17:00:00Z`),
      },
    ],
  };
}

function testGenerarDiasDelPeriodo() {
  const inicio = new Date('2025-01-30T10:00:00Z');
  const fin = new Date('2025-02-02T23:59:00Z');

  const dias = generarDiasDelPeriodo(inicio, fin);
  assert.strictEqual(dias.length, 4, 'Debe incluir ambos extremos');
  assert.deepStrictEqual(
    dias.map((dia) => dia.key),
    ['2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02']
  );

  for (const dia of dias) {
    assert.strictEqual(
      dia.fecha.getUTCHours(),
      0,
      'Cada fecha debe normalizarse al inicio del día (UTC)'
    );
  }
}

function testCalcularHorasTrabajadasDelDia() {
  const fichajeConCache = crearFichaje('2025-01-01', 7.25);
  assert.strictEqual(
    calcularHorasTrabajadasDelDia(fichajeConCache),
    7.25,
    'Debe usar horas cacheadas cuando existen'
  );

  const fichajeSinCache = crearFichaje('2025-01-02', null);
  assert.strictEqual(
    calcularHorasTrabajadasDelDia(fichajeSinCache),
    8,
    'Debe calcular horas a partir de los eventos cuando no hay cache'
  );

  assert.strictEqual(
    calcularHorasTrabajadasDelDia(undefined),
    0,
    'Sin fichaje retorna 0'
  );
}

testGenerarDiasDelPeriodo();
testCalcularHorasTrabajadasDelDia();

console.log('✅ Tests balance-horas OK');


