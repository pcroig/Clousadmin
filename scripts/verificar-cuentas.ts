// ========================================
// Script para verificar estado de cuentas
// ========================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando estado de todas las cuentas...\n');

  const emailsSeed = [
    'admin@clousadmin.com',
    'carlos.martinez@clousadmin.com',
    'ana.garcia@clousadmin.com',
    'laura.sanchez@clousadmin.com',
    'miguel.lopez@clousadmin.com',
    'sara.fernandez@clousadmin.com',
  ];

  console.log('📋 Estado actual de las cuentas:');
  for (const email of emailsSeed) {
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      include: { empleado: true },
    });

    if (usuario) {
      console.log(`\n  ${email}:`);
      console.log(`    Usuario activo: ${usuario.activo} (tipo: ${typeof usuario.activo})`);
      console.log(`    Empleado activo: ${usuario.empleado?.activo || 'N/A'} (tipo: ${typeof usuario.empleado?.activo})`);
      console.log(`    Rol: ${usuario.rol}`);
      console.log(`    Empleado ID: ${usuario.empleadoId || 'N/A'}`);
      
      // Forzar actualización si no está activo
      if (usuario.activo !== true) {
        console.log(`    ⚠️  ACTIVANDO USUARIO...`);
        await prisma.usuario.update({
          where: { email },
          data: { activo: true },
        });
        console.log(`    ✅ Usuario activado`);
      }

      if (usuario.empleado && usuario.empleado.activo !== true) {
        console.log(`    ⚠️  ACTIVANDO EMPLEADO...`);
        await prisma.empleado.update({
          where: { id: usuario.empleado.id },
          data: { activo: true },
        });
        console.log(`    ✅ Empleado activado`);
      }
    } else {
      console.log(`  ${email}: ❌ No encontrado`);
    }
  }

  // Verificar TODAS las cuentas
  const todosUsuarios = await prisma.usuario.findMany();
  console.log(`\n\n📊 Resumen: ${todosUsuarios.length} usuarios totales`);
  
  const usuariosInactivos = todosUsuarios.filter(u => u.activo !== true);
  console.log(`  Usuarios inactivos: ${usuariosInactivos.length}`);
  
  if (usuariosInactivos.length > 0) {
    console.log(`  ⚠️  Activando usuarios inactivos...`);
    await prisma.usuario.updateMany({
      where: {
        activo: false,
      },
      data: {
        activo: true,
      },
    });
    console.log(`  ✅ Todos los usuarios inactivos fueron activados`);
  }

  const todosEmpleados = await prisma.empleado.findMany();
  const empleadosInactivos = todosEmpleados.filter(e => e.activo !== true);
  console.log(`  Empleados inactivos: ${empleadosInactivos.length}`);
  
  if (empleadosInactivos.length > 0) {
    console.log(`  ⚠️  Activando empleados inactivos...`);
    await prisma.empleado.updateMany({
      where: {
        activo: false,
      },
      data: {
        activo: true,
      },
    });
    console.log(`  ✅ Todos los empleados inactivos fueron activados`);
  }

  console.log('\n✅ Verificación completada');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
















