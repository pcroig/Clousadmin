// ========================================
// Onboarding - Cargar Datos Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { OnboardingClient } from './onboarding-client';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function CargarDatosPage() {
  const session = await getSession();

  // Verificar autenticación
  if (!session) {
    redirect('/login');
  }

  // Solo HR admins pueden acceder al onboarding
  if (session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/empleado/dashboard');
  }

  // Obtener sedes existentes
  const sedes = await prisma.sede.findMany({
    where: {
      empresaId: session.user.empresaId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Obtener integraciones existentes
  const integraciones = await prisma.integracion.findMany({
    where: {
      empresaId: session.user.empresaId,
    },
  });

  // Obtener datos de la empresa
  const empresa = await prisma.empresa.findUnique({
    where: {
      id: session.user.empresaId,
    },
    select: {
      nombre: true,
      web: true,
    },
  });

  return (
    <OnboardingClient
      sedes={sedes}
      integraciones={integraciones}
      nombreEmpresa={empresa?.nombre || ''}
    />
  );
}














