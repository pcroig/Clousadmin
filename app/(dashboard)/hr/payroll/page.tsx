// ========================================
// HR Payroll Page
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';

import { PayrollClient } from './payroll-client';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';


export default async function PayrollPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  const ahora = new Date();
  let mesActual = ahora.getMonth() + 1; // 1-12
  let anioActual = ahora.getFullYear();

  if (ahora.getDate() <= 10) {
    mesActual -= 1;
    if (mesActual === 0) {
      mesActual = 12;
      anioActual -= 1;
    }
  }

  return (
    <PayrollClient
      mesActual={mesActual}
      anioActual={anioActual}
    />
  );
}

