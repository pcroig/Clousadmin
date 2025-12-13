#!/usr/bin/env tsx
// Script para corregir las fechas de festivos que tienen desfase de 1 día

import { prisma } from '../lib/prisma';

async function main() {
  console.log('🔧 Corrigiendo fechas de festivos con desfase...\n');

  // Mapa de correcciones: nombre -> día correcto
  const correccionesPorNombre: Record<string, number> = {
    'Año Nuevo': 1,
    'Reyes Magos': 6,
    'Día del Trabajador': 1,
    'Asunción de la Virgen': 15,
    'Fiesta Nacional de España': 12,
    'Todos los Santos': 1,
    'Día de la Constitución': 6,
    'Inmaculada Concepción': 8,
    'Navidad': 25,
  };

  const festivosIncorrectos = await prisma.festivos.findMany({
    where: {
      tipo: 'nacional',
      OR: Object.keys(correccionesPorNombre).map(nombre => ({ nombre })),
    },
  });

  console.log(`📊 Festivos nacionales encontrados: ${festivosIncorrectos.length}\n`);

  let corregidos = 0;
  let sinCambios = 0;

  for (const festivo of festivosIncorrectos) {
    const diaEsperado = correccionesPorNombre[festivo.nombre];
    if (!diaEsperado) continue;

    const fechaActual = festivo.fecha;
    const año = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();
    const diaActual = fechaActual.getUTCDate();

    if (diaActual === diaEsperado) {
      console.log(`✅ ${festivo.nombre} (${año}): Ya correcto (día ${diaActual})`);
      sinCambios++;
      continue;
    }

    // Crear fecha correcta en UTC
    const fechaCorrecta = new Date(Date.UTC(año, mes, diaEsperado));

    console.log(`🔧 ${festivo.nombre} (${año}):`);
    console.log(`   Fecha incorrecta: ${fechaActual.toISOString()} (día ${diaActual})`);
    console.log(`   Fecha correcta:   ${fechaCorrecta.toISOString()} (día ${diaEsperado})`);

    // Verificar si ya existe un festivo en la fecha correcta
    const existente = await prisma.festivos.findFirst({
      where: {
        empresaId: festivo.empresaId,
        fecha: fechaCorrecta,
        id: { not: festivo.id },
      },
    });

    if (existente) {
      console.log(`   ⚠️  Ya existe un festivo en ${fechaCorrecta.toISOString().split('T')[0]}`);
      console.log(`   → Eliminando el festivo duplicado con fecha incorrecta...`);
      
      await prisma.festivos.delete({
        where: { id: festivo.id },
      });
      
      console.log(`   ✅ Duplicado eliminado\n`);
      corregidos++;
      continue;
    }

    // Actualizar la fecha
    await prisma.festivos.update({
      where: { id: festivo.id },
      data: { fecha: fechaCorrecta },
    });

    console.log(`   ✅ Fecha corregida\n`);
    corregidos++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Corrección completada:`);
  console.log(`   📊 Total festivos: ${festivosIncorrectos.length}`);
  console.log(`   ✅ Corregidos: ${corregidos}`);
  console.log(`   ℹ️  Sin cambios: ${sinCambios}`);
  console.log('\n🎉 ¡Festivos corregidos! Ahora las fechas deberían estar bien.\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());








