// ========================================
// HR Jornadas Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { JornadasClient } from './jornadas-client';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function JornadasPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  return <JornadasClient />;
}

