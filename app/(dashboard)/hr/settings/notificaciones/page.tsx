// ========================================
// Notifications Settings Page - HR
// ========================================

import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { NotificationsClient } from './notifications-client';

export default async function NotificationsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.user.rol !== 'hr_admin') {
    redirect('/login');
  }

  return <NotificationsClient />;
}

