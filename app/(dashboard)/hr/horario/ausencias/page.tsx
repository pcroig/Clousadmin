// ========================================
// HR Ausencias Page
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { CAMPANAS_VACACIONES_ENABLED } from '@/lib/constants/feature-flags';
import { UsuarioRol } from '@/lib/constants/enums';

import { AusenciasClient } from './ausencias-client';


export default async function AusenciasPage(props: {
  searchParams: Promise<{ panel?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  const initialCampanasExpanded = searchParams?.panel === 'campanas';

  return (
    <AusenciasClient
      initialCampanasExpanded={initialCampanasExpanded}
      campanasEnabled={CAMPANAS_VACACIONES_ENABLED}
    />
  );
}

