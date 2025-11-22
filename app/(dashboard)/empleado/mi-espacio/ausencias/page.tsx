import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';

import { MiEspacioAusenciasClient } from './ausencias-client';

export default async function EmpleadoAusenciasPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.empleado || !session.user.empleadoId) {
    redirect('/login');
  }

  return <MiEspacioAusenciasClient empleadoId={session.user.empleadoId} />;
}








