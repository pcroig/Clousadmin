// ========================================
// Notifications Settings Page - Manager
// ========================================

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { NotificationsClient } from './notifications-client';

export default async function NotificationsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.user.rol !== 'manager') {
    redirect('/login');
  }

  return <NotificationsClient />;
}

