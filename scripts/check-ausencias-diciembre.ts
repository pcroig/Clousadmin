#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ausencias = await prisma.ausencias.findMany({
    where: {
      tipo: 'vacaciones',
      fechaInicio: {
        gte: new Date('2025-12-01'),
        lte: new Date('2025-12-31'),
      }
    },
    select: {
      id: true,
      tipo: true,
      estado: true,
      fechaInicio: true,
      fechaFin: true,
      empleadoId: true,
      empleado: {
        select: {
          nombre: true,
          apellidos: true,
        }
      }
    },
    orderBy: [
      { empleadoId: 'asc' },
      { fechaInicio: 'asc' },
    ],
  });

  console.log('=== AUSENCIAS DE VACACIONES EN DICIEMBRE 2025 (Agrupadas por empleado) ===\n');

  let empleadoActual = '';
  let numAusenciasPorEmpleado = 0;

  ausencias.forEach((a, idx) => {
    if (a.empleadoId !== empleadoActual) {
      if (empleadoActual !== '') {
        console.log(`   Total: ${numAusenciasPorEmpleado} ausencias\n`);
      }
      empleadoActual = a.empleadoId;
      numAusenciasPorEmpleado = 0;
      console.log(`👤 EMPLEADO: ${a.empleado.nombre} ${a.empleado.apellidos} (ID: ${a.empleadoId.slice(0, 8)}...)`);
      console.log('-'.repeat(80));
    }

    numAusenciasPorEmpleado++;
    const inicio = new Date(a.fechaInicio);
    const fin = new Date(a.fechaFin);
    const dias = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`  ${numAusenciasPorEmpleado}. ${inicio.toLocaleDateString('es-ES')} - ${fin.toLocaleDateString('es-ES')} (${dias} día${dias === 1 ? '' : 's'})`);
    console.log(`     Estado: ${a.estado} | ID: ${a.id.slice(0, 8)}...`);
    console.log(`     ISO: ${a.fechaInicio.toISOString()} → ${a.fechaFin.toISOString()}`);
  });

  if (numAusenciasPorEmpleado > 0) {
    console.log(`   Total: ${numAusenciasPorEmpleado} ausencias\n`);
  }

  console.log(`\n📊 TOTAL GENERAL: ${ausencias.length} ausencias de vacaciones en diciembre 2025\n`);
}

main().finally(() => process.exit(0));
