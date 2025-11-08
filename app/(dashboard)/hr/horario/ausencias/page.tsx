// ========================================
// HR Ausencias Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AusenciasClient } from './ausencias-client';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function AusenciasPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  return <AusenciasClient />;
}

