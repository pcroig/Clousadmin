/**
 * Entry point para los tests de Node ejecutados con `npm run test`.
 * Usa tsx para compilar TypeScript al vuelo.
 */

process.env.NODE_ENV = 'test';
process.env.FORCE_REDIS = 'false';

async function runTests() {
  await import('./auth.test');
  await import('./empleado-crypto.test');
  await import('./antiguedad.test');
  await import('./procesar-excel-validaciones.test');
  await import('./rate-limit.test');
  await import('./api-smoke.test');
  await import('./balance-horas.test');
  await import('./correcciones-fichaje.test');
  await import('./two-factor.test');
}

runTests()
  .then(() => {
    console.log('\n✅ Todos los tests ejecutados con éxito');
  })
  .catch((error) => {
    console.error('❌ Error ejecutando tests:', error);
    process.exit(1);
  });

