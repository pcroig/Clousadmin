// ========================================
// HR Jornadas Page
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';

import { JornadasClient } from './jornadas-client';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';


export default async function JornadasPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  return <JornadasClient />;
}

