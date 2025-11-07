// ========================================
// HR Payroll Eventos Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EventosClient } from './eventos-client';

export default async function EventosPage() {
  const session = await getSession();

  if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
    redirect('/login');
  }

  return <EventosClient />;
}
