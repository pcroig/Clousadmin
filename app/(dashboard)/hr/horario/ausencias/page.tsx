// ========================================
// HR Ausencias Page
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';

import { AusenciasClient } from './ausencias-client';


export default async function AusenciasPage({
  searchParams,
}: {
  searchParams?: { panel?: string };
}) {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  const initialCampanasExpanded = searchParams?.panel === 'campanas';

  return <AusenciasClient initialCampanasExpanded={initialCampanasExpanded} />;
}

