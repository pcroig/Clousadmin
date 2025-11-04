// ========================================
// Script: Crear carpetas para empleados existentes
// ========================================
// Ejecutar una vez para crear carpetas del sistema
// para todos los empleados que no las tienen

import { prisma } from '../lib/prisma';
import { CARPETAS_SISTEMA } from '../lib/documentos';

async function crearCarpetasParaEmpleadosExistentes() {
  console.log('🚀 Iniciando creación de carpetas para empleados existentes...\n');

  // Obtener todos los empleados activos
  const empleados = await prisma.empleado.findMany({
    where: {
      activo: true,
    },
    include: {
      carpetas: true,
    },
  });

  console.log(`📊 Total de empleados activos: ${empleados.length}\n`);

  let empleadosConCarpetas = 0;
  let empleadosSinCarpetas = 0;
  let carpetasCreadas = 0;

  for (const empleado of empleados) {
    const nombreCompleto = `${empleado.nombre} ${empleado.apellidos}`;

    // Verificar si ya tiene carpetas del sistema
    const carpetasSistemaExistentes = empleado.carpetas.filter(c => c.esSistema);

    if (carpetasSistemaExistentes.length === CARPETAS_SISTEMA.length) {
      console.log(`✓ ${nombreCompleto}: Ya tiene todas las carpetas del sistema`);
      empleadosConCarpetas++;
      continue;
    }

    console.log(`⚙️  ${nombreCompleto}: Creando carpetas...`);
    empleadosSinCarpetas++;

    // Obtener nombres de carpetas que ya existen
    const nombresExistentes = carpetasSistemaExistentes.map(c => c.nombre);

    // Crear carpetas faltantes
    for (const nombreCarpeta of CARPETAS_SISTEMA) {
      if (!nombresExistentes.includes(nombreCarpeta)) {
        await prisma.carpeta.create({
          data: {
            empresaId: empleado.empresaId,
            empleadoId: empleado.id,
            nombre: nombreCarpeta,
            esSistema: true,
            compartida: false,
          },
        });
        carpetasCreadas++;
        console.log(`   ├─ Creada: ${nombreCarpeta}`);
      } else {
        console.log(`   ├─ Ya existe: ${nombreCarpeta}`);
      }
    }
  }

  console.log('\n✅ Proceso completado!\n');
  console.log('📊 Resumen:');
  console.log(`   • Empleados con carpetas completas: ${empleadosConCarpetas}`);
  console.log(`   • Empleados sin carpetas: ${empleadosSinCarpetas}`);
  console.log(`   • Carpetas creadas: ${carpetasCreadas}`);
}

// Ejecutar script
crearCarpetasParaEmpleadosExistentes()
  .catch((error) => {
    console.error('❌ Error ejecutando script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
