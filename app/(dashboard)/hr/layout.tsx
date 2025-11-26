// ========================================
// HR Section Layout - Enforces Onboarding Completion
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

export default async function HrSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  const empleadoId = session.user.empleadoId;

  if (empleadoId) {
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId },
      select: { onboardingCompletado: true },
    });

    // Si el onboarding no está completado, redirigir a login
    // (El onboarding completo se hace ahora en /signup durante la creación de cuenta)
    if (!empleado?.onboardingCompletado) {
      redirect('/login');
    }
  }

  return <>{children}</>;
}

