// ========================================
// HR Payroll Eventos Page
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';

import { EventosClient } from './eventos-client';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

export default async function EventosPage() {
  const session = await getSession();

  if (!session || !['hr_admin', 'platform_admin'].includes(session.user.rol)) {
    redirect('/login');
  }

  return <EventosClient />;
}
