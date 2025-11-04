// ========================================
// Script de Fix: Vincular usuarios sin empleadoId
// ========================================
// Ejecutar con: npx tsx scripts/fix-usuarios-sin-empleado.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Iniciando fix de usuarios sin empleadoId...\n');

  // Buscar todos los usuarios sin empleadoId
  const usuariosSinEmpleado = await prisma.usuario.findMany({
    where: {
      empleadoId: null,
    },
    include: {
      empleado: true,
    },
  });

  console.log(`📋 Encontrados ${usuariosSinEmpleado.length} usuarios sin empleadoId\n`);

  let fixed = 0;
  let errors = 0;

  for (const usuario of usuariosSinEmpleado) {
    try {
      // Buscar si existe un empleado con este usuarioId
      const empleado = await prisma.empleado.findUnique({
        where: { usuarioId: usuario.id },
      });

      if (empleado) {
        // Vincular usuario con empleado
        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { empleadoId: empleado.id },
        });

        console.log(`✅ Vinculado: ${usuario.email} → Empleado ${empleado.nombre} ${empleado.apellidos}`);
        fixed++;
      } else {
        console.log(`⚠️  Sin empleado: ${usuario.email} (rol: ${usuario.rol})`);
      }
    } catch (error) {
      console.error(`❌ Error procesando ${usuario.email}:`, error);
      errors++;
    }
  }

  console.log('\n📊 Resumen:');
  console.log(`   - Usuarios vinculados: ${fixed}`);
  console.log(`   - Errores: ${errors}`);
  console.log(`   - Sin empleado asociado: ${usuariosSinEmpleado.length - fixed - errors}`);
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


