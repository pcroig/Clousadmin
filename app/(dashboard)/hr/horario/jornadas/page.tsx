// ========================================
// HR Jornadas Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { JornadasClient } from './jornadas-client';

export default async function JornadasPage() {
  const session = await getSession();

  if (!session || session.user.rol !== 'hr_admin') {
    redirect('/login');
  }

  return <JornadasClient />;
}

