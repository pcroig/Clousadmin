import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';

import { MiEspacioNominasClient } from './nominas-client';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

export default async function MiEspacioNominasPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return <MiEspacioNominasClient />;
}
