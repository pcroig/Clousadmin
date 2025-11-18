// ========================================
// Company Settings Component (HR Admin)
// ========================================

'use client';

import { useMemo } from 'react';
import { Building2, Mail, Phone, ShieldAlert, Users } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InvitarHRAdmins } from '@/components/onboarding/invitar-hr-admins';

interface HRAdmin {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  activo: boolean;
  ultimoAcceso: Date | string | null;
}

interface CompanySettingsProps {
  empresa: {
    nombre: string;
    cif?: string | null;
    email?: string | null;
    telefono?: string | null;
    createdAt?: Date | string;
  };
  hrAdmins: HRAdmin[];
}

const formatDate = (value?: Date | string | null) => {
  if (!value) return 'Sin registros';
  const date = typeof value === 'string' ? new Date(value) : value;
  try {
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'long',
    }).format(date);
  } catch (error) {
    console.error('[CompanySettings] Error formateando fecha', error);
    return date.toLocaleDateString('es-ES');
  }
};

export function CompanySettings({ empresa, hrAdmins }: CompanySettingsProps) {
  const adminsOrdenados = useMemo(() => {
    return hrAdmins.sort((a, b) => {
      if (a.activo === b.activo) {
        return a.nombre.localeCompare(b.nombre);
      }
      return a.activo ? -1 : 1;
    });
  }, [hrAdmins]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Compañía</h2>
        <p className="mt-1 text-sm text-gray-500">
          Gestiona los datos principales de tu empresa y controla quién tiene acceso administrativo.
        </p>
      </div>

      <Card>
        <CardHeader className="flex items-start gap-3">
          <div className="rounded-md bg-[#F3EEE5] p-2">
            <Building2 className="h-5 w-5 text-[#A46A3D]" />
          </div>
          <div>
            <CardTitle>Resumen de la empresa</CardTitle>
            <CardDescription>Información principal asociada a tu cuenta corporativa.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Nombre legal</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{empresa.nombre}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">CIF</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{empresa.cif || 'Sin especificar'}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Email de contacto</p>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-900">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>{empresa.email || 'Sin especificar'}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Teléfono</p>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium text-gray-900">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{empresa.telefono || 'Sin especificar'}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Fecha de alta</p>
            <p className="mt-1 text-sm font-medium text-gray-900">{formatDate(empresa.createdAt)}</p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Plan activo</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="outline" className="border-[#D6E4FF] bg-[#F2F6FF] text-[#1F6FEB]">
                Plan Pro
              </Badge>
              <Button variant="ghost" size="sm" className="text-xs text-[#1F6FEB]">
                Gestionar facturación
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Equipo de RRHH</CardTitle>
            <CardDescription>
              Lista de administradores con acceso completo a los datos de la empresa.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const element = document.getElementById('invite-hr-admins');
              element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          >
            Invitar nuevo HR admin
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {adminsOrdenados.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
              Aún no hay administradores adicionales. Usa el formulario de invitación para compartir acceso.
            </div>
          ) : (
            <div className="space-y-3">
              {adminsOrdenados.map((admin) => (
                <div
                  key={admin.id}
                  className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {admin.nombre} {admin.apellidos}
                    </p>
                    <p className="text-xs text-gray-500">{admin.email}</p>
                  </div>

                  <div className="flex flex-col items-start gap-1 text-xs text-gray-500 sm:items-end">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {admin.activo ? 'Activo' : 'Pendiente de activación'}
                    </span>
                    <span>
                      Último acceso: <strong className="text-gray-900">{formatDate(admin.ultimoAcceso)}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-800">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4" />
              <p>
                Los HR admins tienen acceso completo a la información sensible de empleados, nóminas y
                configuraciones. Revisa periódicamente la lista y revoca accesos cuando sea necesario.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div id="invite-hr-admins">
        <InvitarHRAdmins />
      </div>
    </div>
  );
}
















