// ========================================
// HR Payroll Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { PayrollClient } from './payroll-client';

import { UsuarioRol } from '@/lib/constants/enums';

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

