// ========================================
// Script para activar todas las cuentas
// ========================================
// Este script actualiza todas las cuentas de usuarios y empleados a activo=true

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Activando todas las cuentas...\n');

  // Actualizar todos los usuarios a activo
  const usuariosActualizados = await prisma.usuarios.updateMany({
    where: {
      activo: false,
    },
    data: {
      activo: true,
    },
  });

  console.log(`✅ Usuarios actualizados: ${usuariosActualizados.count}`);

  // Actualizar todos los empleados a activo
  const empleadosActualizados = await prisma.empleados.updateMany({
    where: {
      activo: false,
    },
    data: {
      activo: true,
    },
  });

  console.log(`✅ Empleados actualizados: ${empleadosActualizados.count}`);

  // Actualizar TODAS las cuentas a activo (por si acaso)
  const todosUsuarios = await prisma.usuarios.updateMany({
    data: {
      activo: true,
    },
  });

  const todosEmpleados = await prisma.empleados.updateMany({
    data: {
      activo: true,
    },
  });

  console.log(`✅ Total usuarios actualizados (forzado): ${todosUsuarios.count}`);
  console.log(`✅ Total empleados actualizados (forzado): ${todosEmpleados.count}`);

  // Verificar cuentas específicas del seed
  const emailsSeed = [
    'admin@clousadmin.com',
    'carlos.martinez@clousadmin.com',
    'ana.garcia@clousadmin.com',
    'laura.sanchez@clousadmin.com',
    'miguel.lopez@clousadmin.com',
    'sara.fernandez@clousadmin.com',
  ];

  console.log('\n📋 Verificando cuentas del seed:');
  for (const email of emailsSeed) {
    const usuario = await prisma.usuarios.findUnique({
      where: { email },
      include: { empleado: true },
    });

    if (usuario) {
      console.log(`  ${email}: activo=${usuario.activo}, empleado.activo=${usuario.empleado?.activo || 'N/A'}`);
      
      // Forzar actualización si no está activo
      if (!usuario.activo) {
        await prisma.usuarios.update({
          where: { email },
          data: { activo: true },
        });
        console.log(`    ✅ Activado`);
      }

      if (usuario.empleado && !usuario.empleado.activo) {
        await prisma.empleados.update({
          where: { id: usuario.empleado.id },
          data: { activo: true },
        });
        console.log(`    ✅ Empleado activado`);
      }
    } else {
      console.log(`  ${email}: ❌ No encontrado`);
    }
  }

  console.log('\n✅ Script completado');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

