// ========================================
// Platform Admin - Invitaciones y Waitlist
// ========================================

import { redirect } from 'next/navigation';

import { InviteSignupConsole } from '@/components/platform/InviteSignupConsole';
import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

export default async function PlatformInvitationsPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.platform_admin) {
    redirect('/login');
  }

  const [invitaciones, waitlist] = await Promise.all([
    prisma.invitacionSignup.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        token: true,
        createdAt: true,
        expiraEn: true,
        usada: true,
        usadoEn: true,
        invitadoPor: true,
      },
    }),
    prisma.waitlist.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        nombre: true,
        empresa: true,
        mensaje: true,
        invitado: true,
        invitadoEn: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <InviteSignupConsole
      adminEmail={session.user.email}
      invitaciones={invitaciones.map((invitacion) => ({
        ...invitacion,
        createdAt: invitacion.createdAt.toISOString(),
        expiraEn: invitacion.expiraEn.toISOString(),
        usadoEn: invitacion.usadoEn ? invitacion.usadoEn.toISOString() : null,
      }))}
      waitlist={waitlist.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt.toISOString(),
        invitadoEn: entry.invitadoEn ? entry.invitadoEn.toISOString() : null,
      }))}
    />
  );
}



