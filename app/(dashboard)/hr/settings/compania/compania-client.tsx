// ========================================
// Company Settings Client - HR
// ========================================

'use client';

import { useState } from 'react';
import { SettingsLayout } from '@/components/settings/settings-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingButton } from '@/components/shared/loading-button';
import { toast } from 'sonner';
import { Building2, Users, UserPlus, Mail, Copy, CheckCircle2 } from 'lucide-react';
import { invitarHRAdminAction } from '@/app/(dashboard)/onboarding/cargar-datos/actions';

interface HrAdmin {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  activo: boolean;
  ultimoAcceso: string | null;
  createdAt: string;
}

interface EmpresaSettings {
  id: string;
  nombre: string;
  cif: string | null;
  email: string | null;
  telefono: string | null;
  createdAt: string;
  empleadosCount: number;
  hrAdmins: HrAdmin[];
}

interface CompanySettingsClientProps {
  empresa: EmpresaSettings;
}

interface InvitacionGenerada {
  email: string;
  nombreCompleto: string;
  url: string;
}

export function CompanySettingsClient({ empresa }: CompanySettingsClientProps) {
  const [nombre, setNombre] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [invitaciones, setInvitaciones] = useState<InvitacionGenerada[]>([]);

  const handleInvitar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await invitarHRAdminAction(email, nombre, apellidos);

      if (result.success && result.invitacionUrl) {
        setInvitaciones((prev) => [
          ...prev,
          {
            email,
            nombreCompleto: `${nombre} ${apellidos}`.trim(),
            url: result.invitacionUrl!,
          },
        ]);
        setNombre('');
        setApellidos('');
        setEmail('');
        toast.success('Invitación creada con éxito');
      } else {
        setError(result.error || 'No se pudo enviar la invitación');
      }
    } catch (err) {
      console.error('[CompanySettings] Error al invitar HR admin:', err);
      setError('Ocurrió un error inesperado, por favor inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarUrl = async (index: number, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedIndex(index);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Error al copiar enlace:', err);
      toast.error('No se pudo copiar el enlace');
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return 'Sin registro';
    try {
      return new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  return (
    <SettingsLayout rol="hr_admin">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Compañía</h2>
          <p className="mt-1 text-sm text-gray-500">
            Gestiona los datos corporativos, el equipo administrador y las invitaciones de acceso.
          </p>
        </div>

        <Card>
          <CardHeader className="flex items-start gap-3">
            <div className="rounded-md bg-[#F1E7DD] p-2">
              <Building2 className="h-5 w-5 text-[#A46A3D]" />
            </div>
            <div>
              <CardTitle>Datos de la empresa</CardTitle>
              <CardDescription>Información principal visible para el resto de administradores.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Nombre legal</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{empresa.nombre}</p>
              <p className="text-xs text-gray-500">Nombre que verán todos los empleados dentro de la plataforma.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">CIF</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{empresa.cif || 'No informado'}</p>
              <p className="text-xs text-gray-500">Puedes actualizarlo contactando con nuestro equipo de soporte.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Contacto principal</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{empresa.email || 'soporte@clousadmin.com'}</p>
              <p className="text-xs text-gray-500">Utilizaremos este email para comunicaciones críticas.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Teléfono</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{empresa.telefono || 'No especificado'}</p>
              <p className="text-xs text-gray-500">Visible solo para administradores con acceso a configuración.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Plan actual</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="border-[#CFE6FF] bg-[#E9F3FF] text-[#1F6FEB]">Plan Pro</Badge>
                <span className="text-xs text-gray-500">Creado el {formatDate(empresa.createdAt)}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Personas en la empresa</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{empresa.empleadosCount} empleados activos</p>
              <p className="text-xs text-gray-500">Incluye empleados, managers y administradores.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-start gap-3">
            <div className="rounded-md bg-[#E3F2FD] p-2">
              <Users className="h-5 w-5 text-[#1F6FEB]" />
            </div>
            <div>
              <CardTitle>Equipo administrador</CardTitle>
              <CardDescription>
                Revisa quién tiene permisos de RR.HH. y el estado de su acceso.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {empresa.hrAdmins.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
                Aún no hay administradores registrados. Invita a un miembro del equipo para empezar.
              </div>
            ) : (
              <ul className="space-y-3">
                {empresa.hrAdmins.map((admin) => (
                  <li
                    key={admin.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {admin.nombre} {admin.apellidos}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Mail className="h-3.5 w-3.5" />
                        <span>{admin.email}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs text-gray-500">
                      <Badge
                        variant="outline"
                        className={admin.activo ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-amber-200 bg-amber-50 text-amber-600'}
                      >
                        {admin.activo ? 'Activo' : 'Pendiente'}
                      </Badge>
                      <span>Último acceso: {admin.activo ? formatDate(admin.ultimoAcceso) : 'Pendiente de activación'}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-start gap-3">
            <div className="rounded-md bg-[#FDF3E7] p-2">
              <UserPlus className="h-5 w-5 text-[#D1863A]" />
            </div>
            <div>
              <CardTitle>Invitar nuevos RR.HH.</CardTitle>
              <CardDescription>
                Envía invitaciones para que otros administradores puedan gestionar la compañía.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleInvitar} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nombre-admin">Nombre</Label>
                  <Input
                    id="nombre-admin"
                    placeholder="Ana"
                    value={nombre}
                    onChange={(event) => setNombre(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellidos-admin">Apellidos</Label>
                  <Input
                    id="apellidos-admin"
                    placeholder="Sánchez"
                    value={apellidos}
                    onChange={(event) => setApellidos(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-admin">Email corporativo</Label>
                <Input
                  id="email-admin"
                  type="email"
                  placeholder="ana.sanchez@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </div>
              )}

              <LoadingButton type="submit" loading={loading} className="w-full md:w-auto">
                Enviar invitación
              </LoadingButton>
            </form>

            {invitaciones.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-900">Invitaciones generadas recientemente</p>
                <ul className="space-y-3">
                  {invitaciones.map((inv, index) => (
                    <li
                      key={`${inv.email}-${index}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-[#F1E7DD] bg-[#FFFBF5] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inv.nombreCompleto}</p>
                        <p className="text-xs text-gray-500">{inv.email}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 text-[#A46A3D] hover:text-[#8c572d]"
                        onClick={() => handleCopiarUrl(index, inv.url)}
                      >
                        {copiedIndex === index ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" /> Copiar enlace
                          </>
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500">
                  Compartir este enlace permite completar el onboarding del nuevo administrador.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}


