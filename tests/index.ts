/**
 * Entry point para los tests de Node ejecutados con `npm run test`.
 * Usa tsx para compilar TypeScript al vuelo.
 */

import './auth.test';
import './empleado-crypto.test';
import './antiguedad.test';
import './procesar-excel-validaciones.test';
import './rate-limit.test';
import './api-smoke.test';
import './balance-horas.test';
import './correcciones-fichaje.test';

console.log('\n✅ Todos los tests ejecutados con éxito');

