// ========================================
// Settings Page - HR Admin
// ========================================

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
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
      nombre: true,
      apellidos: true,
      email: true,
      rol: true,
    },
  });

  if (!usuario || usuario.rol !== 'hr_admin') {
    redirect('/login');
  }

  return <SettingsClient usuario={usuario} />;
}
