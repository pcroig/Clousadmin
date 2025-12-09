import { prisma } from '../lib/prisma';

async function main() {
  console.log('=== FESTIVOS EN BD ===\n');

  const festivos = await prisma.festivos.findMany({
    select: {
      id: true,
      fecha: true,
      nombre: true,
      tipo: true,
      activo: true
    },
    orderBy: { fecha: 'asc' }
  });

  const activos = festivos.filter(f => f.activo === true);
  const inactivos = festivos.filter(f => f.activo === false);

  console.log('TOTAL:', festivos.length);
  console.log('ACTIVOS:', activos.length);
  console.log('INACTIVOS:', inactivos.length);

  console.log('\n--- FESTIVOS INACTIVOS ---');
  inactivos.forEach(f => {
    console.log(`${f.fecha.toISOString().split('T')[0]} | ${f.nombre} | ${f.tipo}`);
  });

  console.log('\n--- FESTIVOS ACTIVOS (primeros 10) ---');
  activos.slice(0, 10).forEach(f => {
    console.log(`${f.fecha.toISOString().split('T')[0]} | ${f.nombre} | ${f.tipo}`);
  });

  await prisma.$disconnect();
}

main();
