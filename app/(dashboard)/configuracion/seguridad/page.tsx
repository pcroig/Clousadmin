import { redirect } from 'next/navigation';

import { TwoFactorCard } from '@/components/settings/two-factor-card';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function SeguridadPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const usuario = await prisma.usuarios.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      totpEnabled: true,
      totpEnabledAt: true,
      backupCodes: true,
      totpSecret: true,
    },
  });

  if (!usuario) {
    redirect('/login');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Seguridad</h1>
        <p className="text-sm text-muted-foreground">
          Protege tu cuenta con autenticación en dos pasos y gestiona tus códigos de respaldo.
        </p>
      </div>
      <TwoFactorCard
        email={usuario.email}
        totpEnabled={usuario.totpEnabled}
        backupCodesCount={
          Array.isArray(usuario.backupCodes) ? (usuario.backupCodes as unknown[]).length : 0
        }
        hasSecret={Boolean(usuario.totpSecret)}
        enabledAt={usuario.totpEnabledAt?.toISOString() ?? null}
      />
    </div>
  );
}

