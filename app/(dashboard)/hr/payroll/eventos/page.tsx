// ========================================
// HR Payroll Eventos Page
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';

import { EventosClient } from './eventos-client';

export default async function EventosPage() {
  const session = await getSession();

  if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
    redirect('/login');
  }

  return <EventosClient />;
}
