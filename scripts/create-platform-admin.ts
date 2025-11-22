// ========================================
// Script: Crear o elevar un Platform Admin
// ========================================

/**
 * Este script permite crear (o actualizar) un usuario con rol platform_admin.
 * Uso:
 *   npm run create:platform-admin -- --email=admin@clous.app --password="TuPassword123!" --nombre=Pablo --apellidos=Roig
 *
 * Parámetros soportados (por flag o variable de entorno):
 *   --email / PLATFORM_ADMIN_EMAIL            (obligatorio si no existe un usuario previo)
 *   --password / PLATFORM_ADMIN_PASSWORD      (obligatorio al crear un usuario nuevo)
 *   --nombre / PLATFORM_ADMIN_NAME            (opcional, defecto "Platform")
 *   --apellidos / PLATFORM_ADMIN_LASTNAME     (opcional, defecto "Admin")
 *   --reset-password                          (opcional, fuerza reset de password aunque exista)
 *
 * Si el usuario ya existe:
 *   - Se le asigna rol platform_admin
 *   - Se marca como activo y con email verificado
 *   - Solo se resetea la contraseña si proporcionas --password o la flag --reset-password
 */

import 'dotenv/config';
import { hash } from 'bcryptjs';

import { UsuarioRol } from '../lib/constants/enums';
import { prisma } from '../lib/prisma';

function getArgValue(key: string): string | undefined {
  const prefix = `--${key}=`;
  const direct = process.argv.find((arg) => arg.startsWith(prefix));
  if (direct) {
    return direct.slice(prefix.length).trim();
  }

  const index = process.argv.findIndex((arg) => arg === `--${key}`);
  if (index >= 0 && process.argv[index + 1]) {
    return process.argv[index + 1].trim();
  }

  return undefined;
}

function hasFlag(key: string) {
  return process.argv.includes(`--${key}`);
}

async function main() {
  const email =
    getArgValue('email') ||
    process.env.PLATFORM_ADMIN_EMAIL ||
    '';

  const password =
    getArgValue('password') ||
    process.env.PLATFORM_ADMIN_PASSWORD;

  const nombre =
    getArgValue('nombre') ||
    process.env.PLATFORM_ADMIN_NAME ||
    'Platform';

  const apellidos =
    getArgValue('apellidos') ||
    process.env.PLATFORM_ADMIN_LASTNAME ||
    'Admin';

  if (!email) {
    throw new Error('Debes proporcionar --email o configurar PLATFORM_ADMIN_EMAIL');
  }

  const normalizedEmail = email.toLowerCase();
  const existingUser = await prisma.usuario.findUnique({
    where: { email: normalizedEmail },
  });

  const shouldResetPassword = Boolean(password) || hasFlag('reset-password');

  if (!existingUser && !password) {
    throw new Error(
      'El usuario no existe aún, debes proporcionar --password (o PLATFORM_ADMIN_PASSWORD) para crearlo'
    );
  }

  if (password && password.length < 10) {
    console.warn('⚠️  Se recomienda usar una contraseña de al menos 10 caracteres.');
  }

  const hashedPassword = password ? await hash(password, 12) : undefined;

  if (!existingUser) {
    const created = await prisma.usuario.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword!,
        nombre,
        apellidos,
        rol: UsuarioRol.platform_admin,
        activo: true,
        emailVerificado: true,
      },
    });

    console.log('✅ Usuario platform_admin creado correctamente:');
    console.log(`   ID: ${created.id}`);
    console.log(`   Email: ${created.email}`);
    console.log('   Recuerda guardar la contraseña proporcionada.');
    return;
  }

  const updateData: Record<string, unknown> = {
    rol: UsuarioRol.platform_admin,
    activo: true,
    emailVerificado: true,
  };

  if (nombre) {
    updateData.nombre = nombre;
  }

  if (apellidos) {
    updateData.apellidos = apellidos;
  }

  if (shouldResetPassword && hashedPassword) {
    updateData.password = hashedPassword;
  }

  const updated = await prisma.usuario.update({
    where: { id: existingUser.id },
    data: updateData,
  });

  console.log('✅ Usuario actualizado como platform_admin:');
  console.log(`   ID: ${updated.id}`);
  console.log(`   Email: ${updated.email}`);
  if (shouldResetPassword && password) {
    console.log('   La contraseña ha sido reemplazada. Comunica la nueva contraseña de forma segura.');
  } else if (!shouldResetPassword) {
    console.log('   La contraseña existente se mantuvo (usa --password para resetearla).');
  }
}

main()
  .catch((error) => {
    console.error('❌ Error creando/actualizando platform_admin:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

