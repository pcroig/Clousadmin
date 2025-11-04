// ========================================
// HR Ausencias Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AusenciasClient } from './ausencias-client';

export default async function AusenciasPage() {
  const session = await getSession();

  if (!session || session.user.rol !== 'hr_admin') {
    redirect('/login');
  }

  return <AusenciasClient />;
}

