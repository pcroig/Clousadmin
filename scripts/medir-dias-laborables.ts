// ========================================
// Script de medición rápida - Días laborables
// ========================================
// Uso:
//   tsx scripts/medir-dias-laborables.ts <empresaId> [fechaInicio=2025-01-01] [rangoEnDias=30]
//
// El objetivo es contar cuántas queries ejecutan las funciones actuales
// de cálculo de ausencias al evaluar un rango de fechas.

import path from 'path';
import { config } from 'dotenv';
import { performance } from 'node:perf_hooks';

import { prisma } from '@/lib/prisma';
import { calcularDias, calcularDiasSolicitados } from '@/lib/calculos/ausencias';

// Cargar variables de entorno estándar
config({ path: path.resolve(__dirname, '../.env') });
config({ path: path.resolve(__dirname, '../.env.local') });

const empresaId = process.argv[2];
const fechaInicioInput = process.argv[3] ?? '2025-01-01';
const rangoDiasInput = process.argv[4] ?? '30';

if (!empresaId) {
  console.error('❌ Debes indicar un empresaId como primer argumento.');
  console.error('   Ejemplo: tsx scripts/medir-dias-laborables.ts 123e4567-e89b-12d3-a456-426614174000 2025-01-01 30');
  process.exit(1);
}

const fechaInicio = new Date(fechaInicioInput);
if (Number.isNaN(fechaInicio.getTime())) {
  console.error(`❌ La fechaInicio "${fechaInicioInput}" no es válida. Usa formato YYYY-MM-DD.`);
  process.exit(1);
}

const rangoDias = Number.parseInt(rangoDiasInput, 10);
if (!Number.isFinite(rangoDias) || rangoDias <= 0) {
  console.error(`❌ El rango en días "${rangoDiasInput}" debe ser un entero positivo.`);
  process.exit(1);
}

const fechaFin = new Date(fechaInicio);
fechaFin.setDate(fechaFin.getDate() + rangoDias - 1);

type QueryEvent = {
  query: string;
  params: string;
  duration: number;
};

const queryEvents: QueryEvent[] = [];

prisma.$on('query', (event) => {
  queryEvents.push({
    query: event.query,
    params: event.params,
    duration: event.duration,
  });
});

async function medir() {
  console.log('🔍 Medición de días laborables/solicitados');
  console.log(`   Empresa: ${empresaId}`);
  console.log(`   Rango: ${fechaInicio.toISOString().slice(0, 10)} → ${fechaFin.toISOString().slice(0, 10)} (${rangoDias} días)`);
  console.log('='.repeat(70));

  try {
    const startSolicitados = performance.now();
    const diasSolicitados = await calcularDiasSolicitados(fechaInicio, fechaFin, empresaId);
    const durationSolicitados = performance.now() - startSolicitados;

    console.log('➡️  calcularDiasSolicitados');
    console.log(`   Resultado: ${diasSolicitados}`);
    console.log(`   Queries ejecutadas: ${queryEvents.length}`);
    console.log(`   Tiempo: ${durationSolicitados.toFixed(2)} ms`);

    // Guardar número de queries hasta este punto para aislar las del siguiente cálculo
    const queriesAntesCalcularDias = queryEvents.length;

    const startCalcularDias = performance.now();
    const resultadoCalcularDias = await calcularDias(fechaInicio, fechaFin, empresaId);
    const durationCalcularDias = performance.now() - startCalcularDias;

    const queriesCalcularDias = queryEvents.length - queriesAntesCalcularDias;

    console.log('\n➡️  calcularDias');
    console.log(`   Resultado: ${JSON.stringify(resultadoCalcularDias, null, 2)}`);
    console.log(`   Queries ejecutadas (solo esta llamada): ${queriesCalcularDias}`);
    console.log(`   Tiempo: ${durationCalcularDias.toFixed(2)} ms`);

    console.log('\n📊 Detalle de queries (orden de ejecución):');
    queryEvents.forEach((event, index) => {
      console.log(`   [${index + 1}] ${event.duration} ms -> ${event.query}`);
    });
  } catch (error) {
    console.error('❌ Error durante la medición:');
    console.error(error);
    console.error('\n💡 Verifica que la base de datos esté accesible y que el empresaId exista.');
  } finally {
    await prisma.$disconnect();
  }
}

void medir();



