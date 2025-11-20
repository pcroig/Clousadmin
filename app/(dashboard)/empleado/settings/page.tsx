// ========================================
// Settings Page - Empleado
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

import { SettingsClient } from './settings-client';


export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  // Solo traer los campos que necesitamos para evitar serializar Decimals
  const usuario = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      rol: true,
      ultimoAcceso: true,
      empresa: {
        select: {
          nombre: true,
        },
      },
    },
  });

  if (!usuario || usuario.rol !== UsuarioRol.empleado) {
    redirect('/login');
  }

  return <SettingsClient usuario={usuario} />;
}
