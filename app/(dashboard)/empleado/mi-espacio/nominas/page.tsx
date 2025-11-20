import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';

import { MiEspacioNominasClient } from './nominas-client';

export default async function MiEspacioNominasPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return <MiEspacioNominasClient />;
}
