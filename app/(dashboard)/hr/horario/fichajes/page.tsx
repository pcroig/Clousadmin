// ========================================
// HR Fichajes Page
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';

import { FichajesClient } from './fichajes-client';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';


export default async function FichajesPage(props: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  const params = await searchParams;
  return <FichajesClient initialState={params.estado} />;
}

