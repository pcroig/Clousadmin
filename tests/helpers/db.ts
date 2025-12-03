/**
 * Database helpers para tests
 * Maneja setup, teardown y seeding de la BD de test
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { execSync } from 'child_process';
import path from 'path';

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';


// Cargar .env.test
config({ path: path.resolve(__dirname, '../../.env.test') });

// ========================================
// PRISMA CLIENT SINGLETON
// ========================================

let prismaTest: PrismaClient | undefined;

/**
 * Obtiene una instancia de Prisma para tests
 * Usa singleton para reutilizar conexión
 */
export function getPrismaTest(): PrismaClient {
  if (!prismaTest) {
    // Verificar que estamos en modo test
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'getPrismaTest solo debe usarse en tests (NODE_ENV=test)'
      );
    }

    // Verificar que DATABASE_URL apunta a BD de test
    if (!process.env.DATABASE_URL?.includes('test')) {
      throw new Error(
        'DATABASE_URL debe incluir "test" en el nombre para tests. ' +
          'Actual: ' +
          process.env.DATABASE_URL
      );
    }

    prismaTest = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Log solo en debug
      log: process.env.DEBUG ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  return prismaTest;
}

// ========================================
// SETUP / TEARDOWN
// ========================================

/**
 * Setup de BD de test
 * - Crea BD si no existe
 * - Ejecuta migraciones
 * - Limpia todas las tablas
 */
export async function setupTestDatabase() {
  try {
    // Push schema a BD de test (más rápido que migrate en tests)
    execSync('npx prisma db push --skip-generate', {
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      stdio: 'inherit',
    });

    console.log('✅ BD de test configurada');
  } catch (error) {
    console.error('❌ Error configurando BD de test:', error);
    throw error;
  }
}

/**
 * Limpia todas las tablas de la BD de test
 * Usa transacción para ser atómico
 */
export async function cleanDatabase() {
  const prisma = getPrismaTest();

  // Lista ordenada (dependencias inversas). Algunos modelos pueden haber sido eliminados;
  // por eso validamos antes de llamar a deleteMany para evitar fallos en tests.
  const modeloOrden: string[] = [
    // Documentos
    'firmaDocumento',
    'documentoGenerado',
    'documentoContrato',
    'documentoProcesoOffboarding',
    'campo',
    'carpeta',
    'plantilla',
    'tipoDocumento',
    // Ausencias y calendario
    'ausencia',
    'eventoCalendario',
    'campanaVacaciones',
      // Fichajes
    'fichaje',
    'correccionFichaje',
    'bolsaHoras',
      // Nóminas
    'complementoNomina',
    'eventoNomina',
    'incidenciaNomina',
    'nomina',
    'tipoComplemento',
    // Empleados y organización
    'onboardingProgress',
    'empleado',
    'equipo',
    'puesto',
    'sede',
    'jornada',
      // Festivos
    'festivo',
      // Notificaciones
    'notificacion',
      // Denuncias
    'denuncia',
      // Billing
    'subscription',
    'product',
    'price',
    // Usuarios / empresa
    'usuario',
    'empresa',
      // Solicitudes
    'solicitud',
    'solicitudCorreccionFichaje',
    'solicitudEliminacionDatos',
    'solicitudCambio',
    // Integraciones
    'calendarIntegration',
    // Auditoría
    'auditLog',
  ];

  const prismaAny = prisma as Record<string, { deleteMany?: () => Promise<unknown> }>;

  for (const modelo of modeloOrden) {
    const tabla = prismaAny[modelo];

    if (typeof tabla?.deleteMany !== 'function') {
      console.warn(`[cleanDatabase] Modelo ${modelo} no existe, se omite en tests`);
      continue;
    }

    try {
      await tabla.deleteMany();
    } catch (error: any) {
      // Ignorar tablas que no existan en el esquema actual (P2021)
      if (error?.code === 'P2021') {
        console.warn(`[cleanDatabase] Tabla no encontrada para modelo ${modelo}, se omite`);
        continue;
      }

    console.error('❌ Error limpiando BD:', error);
    throw error;
    }
  }
}

/**
 * Teardown: cierra conexión a BD
 */
export async function teardownTestDatabase() {
  const prisma = getPrismaTest();

  try {
    await prisma.$disconnect();
    console.log('✅ Conexión a BD cerrada');
  } catch (error) {
    console.error('❌ Error cerrando BD:', error);
    throw error;
  }
}

// ========================================
// SEEDING HELPERS
// ========================================

/**
 * Crea una empresa de test
 */
export async function createTestEmpresa(data?: Partial<any>) {
  const prisma = getPrismaTest();

  return prisma.empresas.create({
    data: {
      nombre: data?.nombre || 'Empresa Test',
      nif: data?.nif || '12345678A',
      email: data?.email || 'test@empresa.com',
      telefono: data?.telefono || '+34600000000',
      direccion: data?.direccion || 'Calle Test 123',
      codigoPostal: data?.codigoPostal || '28001',
      ciudad: data?.ciudad || 'Madrid',
      provincia: data?.provincia || 'Madrid',
      pais: data?.pais || 'España',
      ...data,
    },
  });
}

/**
 * Crea un usuario de test
 */
export async function createTestUsuario(
  empresaId: string,
  data?: Partial<any>
) {
  const prisma = getPrismaTest();
  const bcrypt = await import('bcryptjs');

  const hashedPassword = await bcrypt.hash(
    data?.password || 'Password123!',
    10
  );

  return prisma.usuarios.create({
    data: {
      email: data?.email || 'usuario@test.com',
      password: hashedPassword,
      nombre: data?.nombre || 'Usuario',
      apellidos: data?.apellidos || 'Test',
      role: data?.role || 'empleado',
      empresaId,
      ...data,
    },
  });
}

/**
 * Crea un empleado de test
 */
export async function createTestEmpleado(
  empresaId: string,
  data?: Partial<any>
) {
  const prisma = getPrismaTest();

  return prisma.empleados.create({
    data: {
      nombre: data?.nombre || 'Empleado',
      apellidos: data?.apellidos || 'Test',
      email: data?.email || 'empleado@test.com',
      dni: data?.dni || '12345678A',
      fechaIngreso: data?.fechaIngreso || new Date(),
      empresaId,
      activo: data?.activo ?? true,
      ...data,
    },
  });
}

/**
 * Crea un equipo de test
 */
export async function createTestEquipo(empresaId: string, data?: Partial<any>) {
  const prisma = getPrismaTest();

  return prisma.equipos.create({
    data: {
      nombre: data?.nombre || 'Equipo Test',
      empresaId,
      ...data,
    },
  });
}

/**
 * Crea una jornada de test
 */
export async function createTestJornada(empresaId: string, data?: Partial<any>) {
  const prisma = getPrismaTest();

  return prisma.jornadas.create({
    data: {
      nombre: data?.nombre || 'Jornada Completa',
      horasSemanales: data?.horasSemanales || 40,
      empresaId,
      ...data,
    },
  });
}

// ========================================
// GLOBAL HOOKS (opcional)
// ========================================

/**
 * Hook global para setup de BD
 * Usar en tests de integración
 */
export async function globalSetup() {
  await setupTestDatabase();
}

/**
 * Hook global para teardown de BD
 * Usar en tests de integración
 */
export async function globalTeardown() {
  await cleanDatabase();
  await teardownTestDatabase();
}
