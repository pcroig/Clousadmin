// ========================================
// Script: Encriptar datos históricos de empleados
// ========================================
// Ejecutar con:
//   tsx scripts/encrypt-empleados.ts --confirm-backup [--dry-run]
//
// Requisitos:
//   1. Haber ejecutado backup completo (BD + storage) y confirmarlo con --confirm-backup
//   2. Tener ENCRYPTION_KEY configurada en el entorno actual
//
// El script recorre todos los empleados y cifra los campos sensibles (iban, nif, nss)
// que aún estén en texto plano.

import path from 'path';

import { config } from 'dotenv';

import {
  encryptEmpleadoData,
  getSensitiveFields,
  isFieldEncrypted,
} from '@/lib/empleado-crypto';
import { prisma } from '@/lib/prisma';

import type { Empleado } from '@prisma/client';


// Cargar .env y .env.local si existen
config({ path: path.resolve(process.cwd(), '.env') });
config({ path: path.resolve(process.cwd(), '.env.local') });

const sensitiveFields = getSensitiveFields();
const DEFAULT_BATCH_SIZE = Number(
  process.env.ENCRYPTION_MIGRATION_BATCH_SIZE ?? '200'
);

interface MigracionStats {
  procesados: number;
  actualizados: number;
  sinCambios: number;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const confirmBackup = args.includes('--confirm-backup');

  if (!confirmBackup) {
    console.error(
      '❌ Debes confirmar que existe un backup reciente ejecutando el script con --confirm-backup.\n' +
        'Consulta docs/DISASTER_RECOVERY.md para el procedimiento de backup.'
    );
    process.exit(1);
  }

  return { dryRun };
}

async function encryptBatch(dryRun: boolean): Promise<MigracionStats> {
  let cursor: string | null = null;
  const stats: MigracionStats = {
    procesados: 0,
    actualizados: 0,
    sinCambios: 0,
  };

  while (true) {
    const empleados = await prisma.empleado.findMany({
      select: {
        id: true,
        empresaId: true,
        iban: true,
        nif: true,
        nss: true,
      },
      orderBy: { id: 'asc' },
      take: DEFAULT_BATCH_SIZE,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
    });

    if (empleados.length === 0) {
      break;
    }

    cursor = empleados[empleados.length - 1].id;

    for (const empleado of empleados) {
      stats.procesados += 1;

      const camposPendientes = sensitiveFields.filter((field) => {
        const value = empleado[field];
        if (!value) return false;
        return !isFieldEncrypted(String(value));
      });

      if (camposPendientes.length === 0) {
        stats.sinCambios += 1;
        continue;
      }

      const payload = camposPendientes.reduce<Partial<Empleado>>((acc, field) => {
        acc[field] = empleado[field] as Empleado[typeof field];
        return acc;
      }, {});

      if (dryRun) {
        console.log(
          `🔎 [DRY-RUN] Empleado ${empleado.id} (${empleado.empresaId}) necesita cifrar: ${camposPendientes.join(
            ', '
          )}`
        );
        stats.actualizados += 1;
        continue;
      }

      const encryptedData = encryptEmpleadoData(payload);
      await prisma.empleado.update({
        where: { id: empleado.id },
        data: encryptedData,
      });

      stats.actualizados += 1;
      console.log(
        `✅ Empleado ${empleado.id} (${empleado.empresaId}) campos cifrados: ${camposPendientes.join(
          ', '
        )}`
      );
    }
  }

  return stats;
}

async function main() {
  const { dryRun } = parseArgs();
  console.log(
    `🚀 Iniciando migración de cifrado (${dryRun ? 'modo DRY-RUN' : 'modo ACTUALIZACIÓN'})`
  );
  console.log(`📦 Batch size: ${DEFAULT_BATCH_SIZE}`);

  const stats = await encryptBatch(dryRun);

  console.log('\n📊 Resumen migración:');
  console.log(`   • Registros procesados: ${stats.procesados}`);
  console.log(`   • Registros actualizados: ${stats.actualizados}`);
  console.log(`   • Registros sin cambios: ${stats.sinCambios}`);
  console.log(
    dryRun
      ? '\nℹ️ Ejecuta nuevamente SIN --dry-run para aplicar los cambios.'
      : '\n✅ Migración completada. Ejecuta validaciones y documenta el resultado.'
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('❌ Error en migración de cifrado:', error);
    await prisma.$disconnect();
    process.exit(1);
  });


