// ========================================
// Integrations Settings Page - HR Admin
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { isGoogleOAuthConfigured } from '@/lib/oauth/config';
import { prisma } from '@/lib/prisma';

import { IntegrationsClient } from './integrations-client';


export default async function IntegrationsPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Verificar si Google OAuth está configurado
  const googleConfigured = isGoogleOAuthConfigured();

  // Obtener integraciones activas de la empresa y del usuario
  const integraciones = await prisma.integraciones.findMany({
    where: {
      empresaId: session.user.empresaId,
      tipo: 'calendario',
      OR: [
        { usuarioId: null }, // Integraciones de empresa
        { usuarioId: session.user.id }, // Integraciones personales
      ],
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Separar integraciones personales vs empresa
  const empresaIntegrations = integraciones.filter((i) => i.usuarioId === null);
  const personalIntegrations = integraciones.filter((i) => i.usuarioId === session.user.id);

  return (
    <IntegrationsClient
      googleConfigured={googleConfigured}
      empresaIntegrations={empresaIntegrations}
      personalIntegrations={personalIntegrations}
      userRole="hr_admin"
    />
  );
}
