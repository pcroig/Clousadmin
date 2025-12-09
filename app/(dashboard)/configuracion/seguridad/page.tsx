import { redirect } from 'next/navigation';

import { ChangeEmailCard } from '@/components/settings/change-email-card';
import { CompanySignatureCard } from '@/components/settings/company-signature-card';
import { TwoFactorCard } from '@/components/settings/two-factor-card';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSignedDownloadUrl } from '@/lib/s3';

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
      rol: true,
    },
  });

  if (!usuario) {
    redirect('/login');
  }

  // Solo para HR admins, cargar firma de empresa
  let firmaEmpresa: { firmaGuardada: boolean; firmaUrl?: string | null; firmaGuardadaEn?: string | null } | null = null;

  if (usuario.rol === 'hr_admin' || usuario.rol === 'platform_admin') {
    const empresa = await prisma.empresas.findUnique({
      where: { id: session.user.empresaId },
      select: {
        firmaEmpresaGuardada: true,
        firmaEmpresaS3Key: true,
        firmaEmpresaGuardadaEn: true,
      },
    });

    if (empresa) {
      let firmaUrl: string | null = null;
      if (empresa.firmaEmpresaGuardada && empresa.firmaEmpresaS3Key) {
        try {
          firmaUrl = await getSignedDownloadUrl(empresa.firmaEmpresaS3Key);
        } catch (error) {
          console.error('[SeguridadPage] Error obteniendo firma de empresa:', error);
        }
      }

      firmaEmpresa = {
        firmaGuardada: empresa.firmaEmpresaGuardada,
        firmaUrl,
        firmaGuardadaEn: empresa.firmaEmpresaGuardadaEn?.toISOString() ?? null,
      };
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Seguridad</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona tu email, protege tu cuenta con autenticación en dos pasos y gestiona tus
          códigos de respaldo.
        </p>
      </div>
      <ChangeEmailCard currentEmail={usuario.email} />
      <TwoFactorCard
        email={usuario.email}
        totpEnabled={usuario.totpEnabled}
        backupCodesCount={
          Array.isArray(usuario.backupCodes) ? (usuario.backupCodes as unknown[]).length : 0
        }
        hasSecret={Boolean(usuario.totpSecret)}
        enabledAt={usuario.totpEnabledAt?.toISOString() ?? null}
      />
      {firmaEmpresa && (
        <CompanySignatureCard initialData={firmaEmpresa} />
      )}
    </div>
  );
}

