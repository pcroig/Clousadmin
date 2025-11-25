/**
 * Tests de integración para servicios de ausencias
 * Requiere base de datos de test configurada
 * 
 * NOTA: Estos tests requieren BD configurada.
 * Ver instrucciones al final del archivo.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { EstadoAusencia } from '@/lib/constants/enums';
import {
  calcularSaldoDisponible,
  validarSaldoSuficiente,
  determinarEstadoTrasAprobacion,
} from '@/lib/calculos/ausencias';
import {
  getPrismaTest,
  cleanDatabase,
  teardownTestDatabase,
  createTestEmpresa,
  createTestEmpleado,
} from '../helpers/db';

// IMPORTANTE: Estos tests requieren BD de test configurada
// Descomenta el describe para ejecutarlos
describe.skip('Ausencias Service Integration', () => {
  const prisma = getPrismaTest();
  
  beforeAll(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanDatabase();
  });

  it('should calculate employee balance correctly', async () => {
    const empresa = await createTestEmpresa(prisma, {
      nombre: 'Test Corp',
    });

    const empleado = await createTestEmpleado(prisma, {
      empresaId: empresa.id,
      nombre: 'Juan',
      apellidos: 'Pérez',
      diasVacaciones: 22,
    });

    const saldo = await calcularSaldoDisponible(empleado.id, 2024);

    expect(saldo.diasTotales).toBe(22);
    expect(saldo.diasUsados).toBe(0);
    expect(saldo.diasDisponibles).toBe(22);
  });

  it('should validate insufficient balance', async () => {
    const empresa = await createTestEmpresa(prisma);
    const empleado = await createTestEmpleado(prisma, {
      empresaId: empresa.id,
      diasVacaciones: 5,
    });

    const validacion = await validarSaldoSuficiente(empleado.id, 2024, 10);

    expect(validacion.suficiente).toBe(false);
    expect(validacion.saldoActual).toBe(5);
    expect(validacion.mensaje).toContain('No tienes suficientes días');
  });
});

/**
 * SETUP REQUERIDO:
 * 1. Configura DATABASE_URL en .env.test
 * 2. Ejecuta: npm run db:test:setup  
 * 3. Elimina .skip del describe
 * 4. Ejecuta: npm test -- ausencias-service
 */
