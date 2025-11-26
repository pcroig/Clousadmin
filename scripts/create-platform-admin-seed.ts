// ========================================
// Script: Crear Admin Plataforma por defecto
// ========================================
// Ejecutar con: npx tsx scripts/create-platform-admin-seed.ts
// Crea empresa base "Clousadmin Platform" y usuario platform_admin

import { hash } from 'bcryptjs';
import { PrismaClient, UsuarioRol } from '@prisma/client';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'pabloroigburgui@gmail.com';
const ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD || 'Admin123!';

async function main() {
  console.log('🚀 Creando empresa base y admin de plataforma...');

  const empresa = await prisma.empresa.upsert({
    where: { cif: 'PLATFORM-0001' },
    update: {},
    create: {
      nombre: 'Clousadmin Platform',
      cif: 'PLATFORM-0001',
      email: 'platform@clousadmin.com',
      telefono: '+34 900 000 000',
      direccion: 'Calle Plataforma 1, Madrid',
    },
  });

  console.log(`✅ Empresa base lista (ID: ${empresa.id})`);

  const existingUser = await prisma.usuario.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existingUser) {
    console.log('ℹ️  El usuario ya existía. Actualizando rol y estado...');
    await prisma.usuario.update({
      where: { id: existingUser.id },
      data: {
        rol: UsuarioRol.platform_admin,
        activo: true,
        emailVerificado: true,
        empresaId: empresa.id,
      },
    });
    console.log('✅ Usuario actualizado como platform_admin');
    return;
  }

  const hashedPassword = await hash(ADMIN_PASSWORD, 12);

  await prisma.usuario.create({
    data: {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      nombre: 'Pablo',
      apellidos: 'Roig',
      rol: UsuarioRol.platform_admin,
      activo: true,
      emailVerificado: true,
      empresaId: empresa.id,
    },
  });

  console.log('✅ Usuario platform_admin creado correctamente');
  console.log(`   Email: ${ADMIN_EMAIL}`);
  console.log(
    `   Contraseña: ${
      process.env.PLATFORM_ADMIN_PASSWORD ? '**** (tomada de env)' : ADMIN_PASSWORD
    }`
  );
}

main()
  .catch((error) => {
    console.error('❌ Error creando admin:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



