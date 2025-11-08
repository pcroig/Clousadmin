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
  const mesActual = ahora.getMonth() + 1; // 1-12
  const anioActual = ahora.getFullYear();

  return (
    <PayrollClient
      mesActual={mesActual}
      anioActual={anioActual}
    />
  );
}

