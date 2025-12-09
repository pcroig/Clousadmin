#!/usr/bin/env tsx
// ========================================
// Script de migración: Corregir fechas de ausencias antiguas
// ========================================
//
// PROBLEMA:
// Las ausencias creadas ANTES del fix de Date.UTC() tienen fechas incorrectas.
// Están almacenadas con timezone shift (ej: 2025-12-13T23:00:00.000Z cuando deberían ser 2025-12-14T00:00:00.000Z)
//
// SOLUCIÓN:
// Este script identifica y corrige las fechas que tienen componente de tiempo (HH:MM:SS) diferente a 00:00:00 UTC
//
// EJECUCIÓN:
// tsx scripts/fix-ausencias-fechas.ts --dry-run  (simular sin cambios)
// tsx scripts/fix-ausencias-fechas.ts --apply    (aplicar cambios reales)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AusenciaConFechaIncorrecta {
  id: string;
  tipo: string;
  fechaInicio: Date;
  fechaFin: Date;
  empleadoId: string;
  empresaId: string;
}

interface CorreccionFecha {
  id: string;
  tipo: string;
  empleadoId: string;
  fechaInicioAntes: string;
  fechaFinAntes: string;
  fechaInicioDespues: string;
  fechaFinDespues: string;
  diasCorregidosInicio: number;
  diasCorregidosFin: number;
}

/**
 * Verifica si una fecha tiene componente de tiempo diferente a 00:00:00.000 UTC
 */
function tieneTiempoIncorrecto(fecha: Date): boolean {
  const hours = fecha.getUTCHours();
  const minutes = fecha.getUTCMinutes();
  const seconds = fecha.getUTCSeconds();
  const ms = fecha.getUTCMilliseconds();

  return hours !== 0 || minutes !== 0 || seconds !== 0 || ms !== 0;
}

/**
 * Corrige una fecha extrayendo año/mes/día y recreándola a medianoche UTC
 */
function corregirFecha(fechaIncorrecta: Date): Date {
  // La fecha incorrecta está almacenada como UTC pero representa la hora local
  // Ej: 2025-12-13T23:00:00.000Z representa 2025-12-14 00:00:00 en Madrid (UTC+1)

  // Para corregir, necesitamos interpretar la fecha en la zona horaria local
  // y luego crear una nueva fecha UTC con esos valores
  const local = new Date(fechaIncorrecta.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));

  return new Date(Date.UTC(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    0, 0, 0, 0
  ));
}

/**
 * Calcula cuántos días de diferencia hay entre dos fechas
 */
function calcularDiferenciaEnDias(fecha1: Date, fecha2: Date): number {
  const diff = fecha2.getTime() - fecha1.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isApply = args.includes('--apply');

  if (!isDryRun && !isApply) {
    console.error('❌ Error: Debes especificar --dry-run o --apply');
    console.log('');
    console.log('Uso:');
    console.log('  tsx scripts/fix-ausencias-fechas.ts --dry-run  # Simular sin hacer cambios');
    console.log('  tsx scripts/fix-ausencias-fechas.ts --apply    # Aplicar cambios reales');
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log('MIGRACIÓN: Corregir fechas de ausencias con timezone incorrecto');
  console.log('='.repeat(80));
  console.log('');
  console.log(`Modo: ${isDryRun ? '🔍 DRY RUN (solo simulación)' : '✅ APPLY (cambios reales)'}`);
  console.log('');

  try {
    // 1. Buscar todas las ausencias
    console.log('1️⃣  Cargando ausencias de la base de datos...');
    const ausencias = await prisma.ausencias.findMany({
      select: {
        id: true,
        tipo: true,
        fechaInicio: true,
        fechaFin: true,
        empleadoId: true,
        empresaId: true,
      },
      orderBy: {
        fechaInicio: 'asc',
      },
    });

    console.log(`   ✓ ${ausencias.length} ausencias encontradas`);
    console.log('');

    // 2. Identificar ausencias con fechas incorrectas
    console.log('2️⃣  Identificando ausencias con fechas incorrectas...');
    const ausenciasIncorrectas: AusenciaConFechaIncorrecta[] = [];

    for (const ausencia of ausencias) {
      const inicioIncorrecto = tieneTiempoIncorrecto(ausencia.fechaInicio);
      const finIncorrecto = tieneTiempoIncorrecto(ausencia.fechaFin);

      if (inicioIncorrecto || finIncorrecto) {
        ausenciasIncorrectas.push(ausencia);
      }
    }

    console.log(`   ✓ ${ausenciasIncorrectas.length} ausencias con fechas incorrectas`);
    console.log(`   ✓ ${ausencias.length - ausenciasIncorrectas.length} ausencias con fechas correctas`);
    console.log('');

    if (ausenciasIncorrectas.length === 0) {
      console.log('✅ ¡No hay ausencias que corregir! Todas las fechas están correctas.');
      return;
    }

    // 3. Calcular correcciones
    console.log('3️⃣  Calculando correcciones...');
    const correcciones: CorreccionFecha[] = [];

    for (const ausencia of ausenciasIncorrectas) {
      const fechaInicioCorregida = corregirFecha(ausencia.fechaInicio);
      const fechaFinCorregida = corregirFecha(ausencia.fechaFin);

      correcciones.push({
        id: ausencia.id,
        tipo: ausencia.tipo,
        empleadoId: ausencia.empleadoId,
        fechaInicioAntes: ausencia.fechaInicio.toISOString(),
        fechaFinAntes: ausencia.fechaFin.toISOString(),
        fechaInicioDespues: fechaInicioCorregida.toISOString(),
        fechaFinDespues: fechaFinCorregida.toISOString(),
        diasCorregidosInicio: calcularDiferenciaEnDias(ausencia.fechaInicio, fechaInicioCorregida),
        diasCorregidosFin: calcularDiferenciaEnDias(ausencia.fechaFin, fechaFinCorregida),
      });
    }

    console.log(`   ✓ ${correcciones.length} correcciones calculadas`);
    console.log('');

    // 4. Mostrar preview de correcciones
    console.log('4️⃣  Preview de correcciones:');
    console.log('');

    // Agrupar por días corregidos
    const correccionesPorDias = new Map<number, CorreccionFecha[]>();
    for (const corr of correcciones) {
      const dias = corr.diasCorregidosInicio; // Asumimos que inicio y fin tienen el mismo shift
      if (!correccionesPorDias.has(dias)) {
        correccionesPorDias.set(dias, []);
      }
      correccionesPorDias.get(dias)!.push(corr);
    }

    // Mostrar resumen por días
    for (const [dias, corrs] of Array.from(correccionesPorDias.entries()).sort((a, b) => a[0] - b[0])) {
      console.log(`   📅 Shift de ${dias} día(s): ${corrs.length} ausencias`);
    }
    console.log('');

    // Mostrar detalles de las primeras 10 correcciones
    console.log('   Detalles (mostrando primeras 10):');
    console.log('   ' + '-'.repeat(76));
    correcciones.slice(0, 10).forEach((corr, idx) => {
      console.log(`   ${idx + 1}. ${corr.tipo.toUpperCase()} (${corr.id.slice(0, 8)}...)`);
      console.log(`      Antes: ${corr.fechaInicioAntes} → ${corr.fechaFinAntes}`);
      console.log(`      Después: ${corr.fechaInicioDespues} → ${corr.fechaFinDespues}`);
      console.log(`      Shift: +${corr.diasCorregidosInicio} día(s)`);
      console.log('');
    });

    if (correcciones.length > 10) {
      console.log(`   ... y ${correcciones.length - 10} más`);
      console.log('');
    }

    // 5. Aplicar correcciones (solo si --apply)
    if (isApply) {
      console.log('5️⃣  Aplicando correcciones...');
      console.log('');

      let corregidas = 0;
      let errores = 0;

      for (const corr of correcciones) {
        try {
          await prisma.ausencias.update({
            where: { id: corr.id },
            data: {
              fechaInicio: new Date(corr.fechaInicioDespues),
              fechaFin: new Date(corr.fechaFinDespues),
            },
          });
          corregidas++;

          if (corregidas % 10 === 0) {
            console.log(`   ⏳ Procesadas ${corregidas}/${correcciones.length}...`);
          }
        } catch (error) {
          console.error(`   ❌ Error al actualizar ausencia ${corr.id}:`, error);
          errores++;
        }
      }

      console.log('');
      console.log(`   ✓ ${corregidas} ausencias corregidas`);
      if (errores > 0) {
        console.log(`   ⚠️  ${errores} errores durante la actualización`);
      }
      console.log('');
    } else {
      console.log('5️⃣  Saltando aplicación de cambios (modo --dry-run)');
      console.log('');
      console.log('   ℹ️  Para aplicar estos cambios, ejecuta:');
      console.log('   tsx scripts/fix-ausencias-fechas.ts --apply');
      console.log('');
    }

    // 6. Resumen final
    console.log('='.repeat(80));
    console.log('RESUMEN');
    console.log('='.repeat(80));
    console.log(`Total ausencias en BD: ${ausencias.length}`);
    console.log(`Ausencias con fechas incorrectas: ${ausenciasIncorrectas.length}`);
    console.log(`Ausencias con fechas correctas: ${ausencias.length - ausenciasIncorrectas.length}`);
    if (isApply) {
      console.log(`Estado: ✅ CORRECCIONES APLICADAS`);
    } else {
      console.log(`Estado: 🔍 SOLO SIMULACIÓN (usa --apply para aplicar cambios)`);
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error fatal durante la migración:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
