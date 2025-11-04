// Script para crear datos de prueba de fichajes auto-completados
// Ejecutar con: npx tsx scripts/seed-fichajes-auto.ts

import { PrismaClient } from '@prisma/client';
import { clasificarFichajesIncompletos, aplicarAutoCompletado, guardarRevisionManual } from '../lib/ia/clasificador-fichajes';

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Creando datos de prueba para auto-completado de fichajes...\n');

  // 1. Obtener empresa y empleados
  const empresa = await prisma.empresa.findFirst();
  if (!empresa) {
    throw new Error('No hay empresa en la base de datos. Ejecuta el seed principal primero.');
  }

  const empleados = await prisma.empleado.findMany({
    where: { empresaId: empresa.id },
    take: 4,
  });

  if (empleados.length < 4) {
    throw new Error('Se necesitan al menos 4 empleados. Ejecuta el seed principal primero.');
  }

  console.log(`✓ Empresa: ${empresa.nombre}`);
  console.log(`✓ Empleados: ${empleados.length}\n`);

  // 2. Limpiar datos antiguos de fichajes de prueba
  console.log('🧹 Limpiando fichajes antiguos de prueba...');
  
  const hace7Dias = new Date();
  hace7Dias.setDate(hace7Dias.getDate() - 7);
  
  await prisma.fichaje.deleteMany({
    where: {
      empresaId: empresa.id,
      fecha: { gte: hace7Dias },
    },
  });

  await prisma.autoCompletado.deleteMany({
    where: {
      empresaId: empresa.id,
    },
  });

  console.log('✓ Limpieza completada\n');

  // 3. Crear fichajes de prueba para diferentes escenarios
  console.log('📝 Creando fichajes de prueba...\n');

  // ESCENARIO 1: Sin salida, >8h transcurridas → AUTO-COMPLETAR
  console.log('Escenario 1: Fichaje sin salida (>8h) → AUTO-COMPLETAR');
  const hace3Dias = new Date();
  hace3Dias.setDate(hace3Dias.getDate() - 3);
  hace3Dias.setHours(9, 0, 0, 0);

  await prisma.fichaje.create({
    data: {
      empresaId: empresa.id,
      empleadoId: empleados[0].id,
      tipo: 'entrada',
      fecha: hace3Dias,
      hora: hace3Dias,
      metodo: 'manual',
      estado: 'confirmado',
      autoCompletado: false,
    },
  });
  console.log(`  ✓ ${empleados[0].nombre} ${empleados[0].apellidos} - Entrada 09:00 (hace 3 días, sin salida)`);

  // ESCENARIO 2: Pausa sin cerrar → REVISIÓN MANUAL
  console.log('\nEscenario 2: Fichaje con pausa sin cerrar → REVISIÓN MANUAL');
  const hace4Dias = new Date();
  hace4Dias.setDate(hace4Dias.getDate() - 4);
  hace4Dias.setHours(8, 30, 0, 0);

  await prisma.fichaje.createMany({
    data: [
      {
        empresaId: empresa.id,
        empleadoId: empleados[1].id,
        tipo: 'entrada',
        fecha: hace4Dias,
        hora: hace4Dias,
        metodo: 'manual',
        estado: 'confirmado',
        autoCompletado: false,
      },
      {
        empresaId: empresa.id,
        empleadoId: empleados[1].id,
        tipo: 'pausa_inicio',
        fecha: hace4Dias,
        hora: new Date(hace4Dias.getTime() + 3.5 * 60 * 60 * 1000), // 12:00
        metodo: 'manual',
        estado: 'confirmado',
        autoCompletado: false,
      },
    ],
  });
  console.log(`  ✓ ${empleados[1].nombre} ${empleados[1].apellidos} - Entrada 08:30, Pausa 12:00 (sin cerrar pausa)`);

  // ESCENARIO 3: Sin salida, >8h, con jornada fija → AUTO-COMPLETAR
  console.log('\nEscenario 3: Fichaje sin salida con jornada fija → AUTO-COMPLETAR');
  const hace5Dias = new Date();
  hace5Dias.setDate(hace5Dias.getDate() - 5);
  hace5Dias.setHours(9, 15, 0, 0);

  // Asignar una jornada al empleado (cualquiera que exista)
  const jornada = await prisma.jornada.findFirst({
    where: {
      empresaId: empresa.id,
      activa: true,
    },
  });

  if (jornada) {
    await prisma.empleado.update({
      where: { id: empleados[2].id },
      data: { jornadaId: jornada.id },
    });
  }

  await prisma.fichaje.create({
    data: {
      empresaId: empresa.id,
      empleadoId: empleados[2].id,
      tipo: 'entrada',
      fecha: hace5Dias,
      hora: hace5Dias,
      metodo: 'manual',
      estado: 'confirmado',
      autoCompletado: false,
    },
  });
  console.log(`  ✓ ${empleados[2].nombre} ${empleados[2].apellidos} - Entrada 09:15 (hace 5 días, con jornada fija 09:00-18:00)`);

  // ESCENARIO 4: Sin salida, >8h, múltiples pausas → AUTO-COMPLETAR
  console.log('\nEscenario 4: Fichaje sin salida con pausas cerradas → AUTO-COMPLETAR');
  const hace6Dias = new Date();
  hace6Dias.setDate(hace6Dias.getDate() - 6);
  hace6Dias.setHours(8, 0, 0, 0);

  await prisma.fichaje.createMany({
    data: [
      {
        empresaId: empresa.id,
        empleadoId: empleados[3].id,
        tipo: 'entrada',
        fecha: hace6Dias,
        hora: hace6Dias,
        metodo: 'manual',
        estado: 'confirmado',
        autoCompletado: false,
      },
      {
        empresaId: empresa.id,
        empleadoId: empleados[3].id,
        tipo: 'pausa_inicio',
        fecha: hace6Dias,
        hora: new Date(hace6Dias.getTime() + 4 * 60 * 60 * 1000), // 12:00
        metodo: 'manual',
        estado: 'confirmado',
        autoCompletado: false,
      },
      {
        empresaId: empresa.id,
        empleadoId: empleados[3].id,
        tipo: 'pausa_fin',
        fecha: hace6Dias,
        hora: new Date(hace6Dias.getTime() + 5 * 60 * 60 * 1000), // 13:00
        metodo: 'manual',
        estado: 'confirmado',
        autoCompletado: false,
      },
    ],
  });
  console.log(`  ✓ ${empleados[3].nombre} ${empleados[3].apellidos} - Entrada 08:00, Pausa 12:00-13:00 (sin salida)`);

  console.log('\n✓ Fichajes de prueba creados\n');

  // 4. Ejecutar clasificador para cada día
  console.log('🤖 Ejecutando clasificador automático...\n');

  for (let i = 3; i <= 6; i++) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    fecha.setHours(0, 0, 0, 0);

    console.log(`Procesando fecha: ${fecha.toLocaleDateString('es-ES')}`);

    const { autoCompletar, revisionManual } = await clasificarFichajesIncompletos(
      empresa.id,
      fecha
    );

    console.log(`  → Auto-completar: ${autoCompletar.length}`);
    console.log(`  → Revisión manual: ${revisionManual.length}`);

    // Aplicar auto-completados
    if (autoCompletar.length > 0) {
      const resultados = await aplicarAutoCompletado(autoCompletar, empresa.id);
      console.log(`  ✓ Aplicados ${resultados.completados} auto-completados`);
    }

    // Guardar fichajes en revisión
    if (revisionManual.length > 0) {
      const resultados = await guardarRevisionManual(empresa.id, revisionManual);
      console.log(`  ⚠ Guardados ${resultados.guardados} fichajes en revisión`);
    }

    console.log('');
  }

  // 5. Resumen final
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ DATOS DE PRUEBA CREADOS EXITOSAMENTE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Estadísticas
  const totalAutoCompletados = await prisma.autoCompletado.count({
    where: {
      empresaId: empresa.id,
      tipo: 'fichaje_completado',
      estado: 'aprobado',
    },
  });

  const totalEnRevision = await prisma.autoCompletado.count({
    where: {
      empresaId: empresa.id,
      tipo: 'fichaje_revision',
      estado: 'pendiente',
    },
  });

  const totalFichajes = await prisma.fichaje.count({
    where: {
      empresaId: empresa.id,
      fecha: { gte: hace7Dias },
    },
  });

  console.log('📊 Estadísticas:');
  console.log(`  • Total fichajes creados: ${totalFichajes}`);
  console.log(`  • Fichajes auto-completados: ${totalAutoCompletados}`);
  console.log(`  • Fichajes en revisión: ${totalEnRevision}\n`);

  console.log('🧪 Para probar:');
  console.log('  1. Inicia sesión como HR Admin (admin@clousadmin.com / Admin123!)');
  console.log('  2. Ve al Dashboard HR');
  console.log(`  3. Widget "Auto-completed" debe mostrar:`);
  console.log(`     - Fichajes completados: ${totalAutoCompletados}`);
  console.log(`     - Ausencias completadas: 0`);
  console.log(`     - Solicitudes completadas: 0`);
  console.log('  4. Ve a "Horario > Fichajes"');
  console.log(`  5. Haz clic en "Cuadrar fichajes" para ver los ${totalEnRevision} fichajes pendientes`);
  console.log('  6. Filtra por "Estado Fichaje: Auto-completados" para ver los fichajes procesados\n');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

