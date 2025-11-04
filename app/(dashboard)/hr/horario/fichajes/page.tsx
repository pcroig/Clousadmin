// ========================================
// HR Fichajes Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FichajesClient } from './fichajes-client';

export default async function FichajesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const session = await getSession();

  if (!session || session.user.rol !== 'hr_admin') {
    redirect('/login');
  }

  const params = await searchParams;
  return <FichajesClient initialState={params.estado} />;
}

