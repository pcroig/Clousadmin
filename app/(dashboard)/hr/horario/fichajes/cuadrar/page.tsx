import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';

import { CuadrarFichajesClient } from './cuadrar-fichajes-client';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

export default async function CuadrarFichajesPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  return (
    <main className="p-6">
      <CuadrarFichajesClient />
    </main>
  );
}











