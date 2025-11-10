// ========================================
// Notifications Settings Page - Empleado
// ========================================

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { NotificationsClient } from './notifications-client';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function NotificationsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.user.rol !== UsuarioRol.empleado) {
    redirect('/login');
  }

  return <NotificationsClient />;
}



