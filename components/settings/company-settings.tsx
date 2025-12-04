// ========================================
// Company Settings Component (HR Admin)
// ========================================

'use client';

import { Building2, Mail, MapPin, Phone, Plus, ShieldAlert, Trash2, Users } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { crearSedeAction, eliminarSedeAction } from '@/app/(auth)/signup/actions';
import { InvitarHRAdmins } from '@/components/onboarding/invitar-hr-admins';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

interface HRAdmin {
  id: string;
  nombre: string;
  apellidos: string;
  email: string;
  activo: boolean;
  ultimoAcceso: Date | string | null;
}

interface Sede {
  id: string;
  nombre: string;
  ciudad: string;
  activo: boolean;
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
  sedes: Sede[];
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

export function CompanySettings({ empresa, hrAdmins, sedes }: CompanySettingsProps) {
  const [sedesState, setSedesState] = useState(sedes);
  const [nuevoNombreSede, setNuevoNombreSede] = useState('');
  const [formError, setFormError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isAdding, startAddTransition] = useTransition();

  useEffect(() => {
    setSedesState(sedes);
  }, [sedes]);

  const normalizarSede = (sede: Sede | { id: string; nombre: string; ciudad: string; activo?: boolean }): Sede => ({
    id: sede.id,
    nombre: sede.nombre,
    ciudad: sede.ciudad,
    activo: 'activo' in sede ? Boolean(sede.activo) : true,
  });

  const adminsOrdenados = useMemo(() => {
    return hrAdmins.sort((a, b) => {
      if (a.activo === b.activo) {
        return a.nombre.localeCompare(b.nombre);
      }
      return a.activo ? -1 : 1;
    });
  }, [hrAdmins]);

  const sedesOrdenadas = useMemo(() => {
    return [...sedesState].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [sedesState]);

  const handleAgregarSede = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ciudad = nuevoNombreSede.trim();

    if (!ciudad) {
      setFormError('Introduce un nombre para la sede');
      return;
    }

    setFormError('');

    startAddTransition(async () => {
      try {
        const result = await crearSedeAction({ ciudad });
        if (result.success && result.sede) {
          setSedesState((prev) => [...prev, normalizarSede(result.sede as Sede)]);
          setNuevoNombreSede('');
          toast.success('Sede añadida correctamente');
        } else {
          toast.error(result.error || 'No se pudo crear la sede');
        }
      } catch (error) {
        console.error('[CompanySettings] Error creando sede', error);
        toast.error('Error al crear la sede');
      }
    });
  };

  const handleEliminarSede = async (sedeId: string) => {
    if (!confirm('¿Seguro que quieres eliminar esta sede?')) {
      return;
    }

    setDeletingId(sedeId);
    try {
      const result = await eliminarSedeAction(sedeId);
      if (result.success) {
        setSedesState((prev) => prev.filter((sede) => sede.id !== sedeId));
        toast.success('Sede eliminada');
      } else {
        toast.error(result.error || 'No se pudo eliminar la sede');
      }
    } catch (error) {
      console.error('[CompanySettings] Error eliminando sede', error);
      toast.error('Error al eliminar la sede');
    } finally {
      setDeletingId(null);
    }
  };

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
        <CardHeader className="flex items-start gap-3">
          <div className="rounded-md bg-[#E8F5E9] p-2">
            <MapPin className="h-5 w-5 text-[#4CAF50]" />
          </div>
          <div>
            <CardTitle>Sedes</CardTitle>
            <CardDescription>Ubicaciones físicas de tu empresa.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleAgregarSede} className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={nuevoNombreSede}
              onChange={(event) => setNuevoNombreSede(event.target.value)}
              placeholder="Ej. Sede central, Madrid..."
              aria-label="Nombre de la nueva sede"
            />
            <Button type="submit" disabled={isAdding} className="sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              {isAdding ? 'Añadiendo...' : 'Añadir sede'}
            </Button>
          </form>
          {formError && <p className="text-xs text-red-600">{formError}</p>}

          {sedesOrdenadas.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-gray-500">
              Todavía no hay sedes registradas. Añade la primera usando el formulario.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sedesOrdenadas.map((sede) => (
                <div
                  key={sede.id}
                  className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white/70 px-4 py-3"
                >
                  <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {sede.nombre}
                    </p>
                    <p className="text-xs text-gray-500">{sede.ciudad}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEliminarSede(sede.id)}
                    disabled={deletingId === sede.id}
                    className="text-gray-500 hover:text-red-600"
                    aria-label={`Eliminar la sede ${sede.nombre}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
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






















