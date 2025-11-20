// ========================================
// HR Analytics/Informes Page
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';

import { AnalyticsClient } from './analytics-client';


export default async function InformesPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  return <AnalyticsClient />;
}

