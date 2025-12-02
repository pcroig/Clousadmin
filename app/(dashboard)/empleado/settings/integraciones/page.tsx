// ========================================
// Integrations Settings Page - Employee
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

  if (session.user.rol !== UsuarioRol.empleado) {
    redirect('/login');
  }

  // Verificar si Google OAuth está configurado
  const googleConfigured = isGoogleOAuthConfigured();

  // Obtener integraciones personales del usuario
  const personalIntegrations = await prisma.integraciones.findMany({
    where: {
      empresaId: session.user.empresaId,
      tipo: 'calendario',
      usuarioId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <IntegrationsClient
      googleConfigured={googleConfigured}
      personalIntegrations={personalIntegrations}
      userRole="empleado"
    />
  );
}
