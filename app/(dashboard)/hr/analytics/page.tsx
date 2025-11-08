// ========================================
// HR Analytics/Informes Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AnalyticsClient } from './analytics-client';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function InformesPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  return <AnalyticsClient />;
}

