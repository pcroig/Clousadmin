// ========================================
// Company Settings Client - HR Admin
// ========================================

'use client';

import { CompanySettings } from '@/components/settings/company-settings';
import { SettingsLayout } from '@/components/settings/settings-layout';

interface CompanyClientProps {
  empresa: {
    nombre: string;
    cif: string | null;
    email: string | null;
    telefono: string | null;
    createdAt: Date | string;
    hrAdmins: {
      id: string;
      nombre: string;
      apellidos: string;
      email: string;
      activo: boolean;
      ultimoAcceso: Date | string | null;
    }[];
  };
  sedes: {
    id: string;
    nombre: string;
    ciudad: string;
    activo: boolean;
  }[];
}

export function CompanyClient({ empresa, sedes }: CompanyClientProps) {
  return (
    <SettingsLayout rol="hr_admin">
      <CompanySettings
        empresa={{
          nombre: empresa.nombre,
          cif: empresa.cif,
          email: empresa.email,
          telefono: empresa.telefono,
          createdAt: empresa.createdAt,
        }}
        hrAdmins={empresa.hrAdmins}
        sedes={sedes}
      />
    </SettingsLayout>
  );
}






















