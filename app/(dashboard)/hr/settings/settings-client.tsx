// ========================================
// Settings Client Component - HR
// ========================================

'use client';

import { SettingsLayout } from '@/components/settings/settings-layout';
import { GeneralSettings } from '@/components/settings/general-settings';

interface SettingsClientProps {
  usuario: {
    email: string;
    rol: string;
    ultimoAcceso: Date | string | null;
    empresa: {
      nombre: string | null;
    } | null;
  };
}

export function SettingsClient({ usuario }: SettingsClientProps) {
  return (
    <SettingsLayout rol="hr_admin">
      <GeneralSettings
        usuario={{
          email: usuario.email,
          rol: usuario.rol,
          ultimoAcceso: usuario.ultimoAcceso,
          empresaNombre: usuario.empresa?.nombre ?? null,
        }}
      />
    </SettingsLayout>
  );
}
