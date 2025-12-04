/**
 * Script de Verificación: Carpetas Compartidas
 *
 * Este script prueba directamente la query de carpetas compartidas
 * para identificar si el problema está en:
 * 1. Guardado de carpetas
 * 2. Sintaxis de la query de Prisma
 * 3. Lógica de permisos
 *
 * USAGE:
 * tsx scripts/test-carpetas-compartidas.ts <empleadoId>
 */

import { prisma } from '@/lib/prisma';

async function testCarpetasCompartidas(empleadoId: string) {
  console.log('\n🔍 === TEST: Carpetas Compartidas ===\n');

  // 1. Verificar que el empleado existe
  const empleado = await prisma.empleados.findUnique({
    where: { id: empleadoId },
    select: {
      id: true,
      nombre: true,
      apellidos: true,
      empresaId: true,
    },
  });

  if (!empleado) {
    console.error('❌ Empleado no encontrado:', empleadoId);
    process.exit(1);
  }

  console.log('✅ Empleado encontrado:', {
    id: empleado.id,
    nombre: `${empleado.nombre} ${empleado.apellidos}`,
    empresaId: empleado.empresaId,
  });

  // 2. Ver TODAS las carpetas compartidas de la empresa
  console.log('\n📁 Carpetas compartidas en la empresa:\n');
  const todasCompartidas = await prisma.carpetas.findMany({
    where: {
      empresaId: empleado.empresaId,
      empleadoId: null,
      compartida: true,
    },
    select: {
      id: true,
      nombre: true,
      compartida: true,
      asignadoA: true,
      esSistema: true,
    },
  });

  if (todasCompartidas.length === 0) {
    console.log('⚠️  No hay carpetas compartidas en la empresa.');
    console.log('   Crea una carpeta compartida desde HR primero.\n');
    process.exit(0);
  }

  console.table(todasCompartidas);

  // 3. Obtener equipos del empleado
  const equiposDelEmpleado = await prisma.empleado_equipos.findMany({
    where: {
      empleadoId: empleado.id,
    },
    select: {
      equipoId: true,
      equipo: {
        select: {
          nombre: true,
        },
      },
    },
  });

  const equipoIds = equiposDelEmpleado.map((eq) => eq.equipoId);

  console.log('\n👥 Equipos del empleado:\n');
  if (equipoIds.length === 0) {
    console.log('⚠️  El empleado no pertenece a ningún equipo.\n');
  } else {
    console.table(equiposDelEmpleado.map(eq => ({
      equipoId: eq.equipoId,
      nombre: eq.equipo.nombre,
    })));
  }

  // 4. Construir cláusulas OR (igual que en el código real)
  type ClausulaOR =
    | { asignadoA: string }
    | { asignadoA: { contains: string } };

  const clausulasOR: ClausulaOR[] = [
    { asignadoA: 'todos' },
    { asignadoA: { contains: `empleado:${empleado.id}` } },
  ];

  if (equipoIds.length > 0) {
    equipoIds.forEach((equipoId) => {
      clausulasOR.push({ asignadoA: `equipo:${equipoId}` });
    });
  }

  console.log('\n🔎 Cláusulas OR construidas:\n');
  console.log(JSON.stringify(clausulasOR, null, 2));

  // 5. Ejecutar query (igual que en el código real)
  console.log('\n🎯 Ejecutando query de carpetas compartidas...\n');
  const carpetasEncontradas = await prisma.carpetas.findMany({
    where: {
      empresaId: empleado.empresaId,
      empleadoId: null,
      compartida: true,
      OR: clausulasOR,
    },
    select: {
      id: true,
      nombre: true,
      compartida: true,
      asignadoA: true,
      esSistema: true,
    },
  });

  console.log(`✅ Carpetas encontradas para el empleado: ${carpetasEncontradas.length}\n`);

  if (carpetasEncontradas.length === 0) {
    console.log('❌ PROBLEMA IDENTIFICADO: La query no encuentra carpetas.\n');
    console.log('Posibles causas:');
    console.log('1. Ninguna carpeta tiene asignadoA = "todos"');
    console.log('2. Ninguna carpeta tiene asignadoA con "empleado:' + empleado.id + '"');
    if (equipoIds.length > 0) {
      console.log('3. Ninguna carpeta está asignada a los equipos: ' + equipoIds.join(', '));
    }
    console.log('\n📝 Revisa los valores de asignadoA en las carpetas compartidas.\n');
  } else {
    console.table(carpetasEncontradas);
    console.log('✅ Todo funciona correctamente. Las carpetas deberían aparecer.\n');
  }

  // 6. Análisis detallado de cada carpeta
  console.log('\n📊 Análisis detallado:\n');
  for (const carpeta of todasCompartidas) {
    const encontrada = carpetasEncontradas.some(c => c.id === carpeta.id);
    const razon = encontrada
      ? '✅ ENCONTRADA'
      : analyzeWhyNotFound(carpeta, empleado.id, equipoIds);

    console.log(`${encontrada ? '✅' : '❌'} "${carpeta.nombre}"`);
    console.log(`   asignadoA: "${carpeta.asignadoA}"`);
    console.log(`   ${razon}\n`);
  }

  await prisma.$disconnect();
}

function analyzeWhyNotFound(
  carpeta: { asignadoA: string | null },
  empleadoId: string,
  equipoIds: string[]
): string {
  const asignadoA = carpeta.asignadoA;

  if (!asignadoA) {
    return '❌ NO ENCONTRADA: asignadoA es NULL';
  }

  if (asignadoA === 'todos') {
    return '⚠️  DEBERÍA ENCONTRARSE: asignadoA = "todos"';
  }

  if (asignadoA.includes(`empleado:${empleadoId}`)) {
    return '⚠️  DEBERÍA ENCONTRARSE: contiene empleado:' + empleadoId;
  }

  if (asignadoA.startsWith('equipo:')) {
    const equipoId = asignadoA.replace('equipo:', '');
    if (equipoIds.includes(equipoId)) {
      return '⚠️  DEBERÍA ENCONTRARSE: equipo coincide';
    } else {
      return '❌ NO ENCONTRADA: empleado no está en el equipo ' + equipoId;
    }
  }

  if (asignadoA.includes('empleado:')) {
    return '❌ NO ENCONTRADA: empleado no está en la lista';
  }

  return '❌ NO ENCONTRADA: formato de asignadoA desconocido';
}

// Ejecutar
const empleadoId = process.argv[2];

if (!empleadoId) {
  console.error('\n❌ Error: Debes proporcionar un empleadoId\n');
  console.log('Usage: tsx scripts/test-carpetas-compartidas.ts <empleadoId>\n');
  process.exit(1);
}

testCarpetasCompartidas(empleadoId)
  .catch(error => {
    console.error('\n❌ Error ejecutando test:', error);
    process.exit(1);
  });
