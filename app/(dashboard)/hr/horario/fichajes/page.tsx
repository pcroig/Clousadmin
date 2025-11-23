// ========================================
// HR Fichajes Page
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';

import { FichajesClient } from './fichajes-client';


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

