// ========================================
// General Settings Component
// ========================================

'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { CalendarClock, ShieldCheck, BellRing } from 'lucide-react';

interface GeneralSettingsProps {
  usuario: {
    email: string;
    rol: string;
    ultimoAcceso: Date | string | null;
    empresaNombre?: string | null;
  };
}

export function GeneralSettings({ usuario }: GeneralSettingsProps) {
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [incidentAlerts, setIncidentAlerts] = useState(false);

  const formattedLastAccess = useMemo(() => {
    if (!usuario.ultimoAcceso) {
      return 'Sin registros recientes';
    }

    const date = typeof usuario.ultimoAcceso === 'string' ? new Date(usuario.ultimoAcceso) : usuario.ultimoAcceso;

    try {
      return new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(date);
    } catch (error) {
      console.error('Error al formatear fecha de último acceso:', error);
      return date.toLocaleString('es-ES');
    }
  }, [usuario.ultimoAcceso]);

  const getRolLabel = (rol: string) => {
    switch (rol) {
      case 'hr_admin':
        return 'Administrador de RR.HH.';
      case 'manager':
        return 'Manager';
      case 'empleado':
        return 'Empleado';
      case 'platform_admin':
        return 'Administrador de Plataforma';
      default:
        return rol;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">General</h2>
        <p className="mt-1 text-sm text-gray-500">Información de acceso, seguridad y preferencias personales.</p>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Información de la cuenta</CardTitle>
          <CardDescription>Resumen de datos vinculados a tu perfil en Clousadmin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{usuario.email}</p>
              <p className="text-xs text-gray-500">Es el identificador único para iniciar sesión.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Rol en la plataforma</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="border-[#F0E7DD] bg-[#FDF9F3] text-[#A46A3D]">
                  {getRolLabel(usuario.rol)}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">Determina los permisos y vistas disponibles.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Empresa</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{usuario.empresaNombre || 'Asignación pendiente'}</p>
              <p className="text-xs text-gray-500">La compañía a la que está asociada tu cuenta.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Último acceso</p>
              <p className="mt-1 text-sm font-medium text-gray-900">{formattedLastAccess}</p>
              <p className="text-xs text-gray-500">Incluye fecha y hora del último inicio de sesión registrado.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-start gap-3">
          <div className="rounded-md bg-blue-50 p-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Seguridad y acceso</CardTitle>
            <CardDescription>Refuerza la protección de tu cuenta y controla tus inicios de sesión.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Contraseña</p>
                <p className="text-xs text-gray-500">Último cambio registrado hace más de 90 días.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info('El cambio de contraseña estará disponible próximamente.')}
              >
                Actualizar
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Sesiones activas</p>
                <p className="text-xs text-gray-500">Revisa los dispositivos y revoca accesos sospechosos.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-[#1F6FEB] hover:text-[#174EA1]"
                onClick={() => toast.info('El panel de sesiones estará disponible en la siguiente iteración.')}
              >
                Revisar sesiones
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-start gap-3">
          <div className="rounded-md bg-amber-50 p-2">
            <BellRing className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle>Preferencias personales</CardTitle>
            <CardDescription>Configura resúmenes informativos y alertas operativas.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-sm font-medium text-gray-900">Resumen semanal por email</p>
              <p className="text-xs text-gray-500">Recibe cada lunes un resumen con ausencias, fichajes y aniversarios.</p>
            </div>
            <Switch
              checked={weeklySummary}
              onCheckedChange={setWeeklySummary}
              aria-label="Activar resumen semanal"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-sm font-medium text-gray-900">Alertas críticas en tiempo real</p>
              <p className="text-xs text-gray-500">Activa avisos inmediatos ante incidentes relevantes en la empresa.</p>
            </div>
            <Switch
              checked={incidentAlerts}
              onCheckedChange={setIncidentAlerts}
              aria-label="Activar alertas críticas"
            />
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-500">
            <p>
              Estamos trabajando para que estas preferencias sincronicen automáticamente con tu cuenta en todos los dispositivos.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-start gap-3">
          <div className="rounded-md bg-emerald-50 p-2">
            <CalendarClock className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <CardTitle>Historial de actividad</CardTitle>
            <CardDescription>Consultas rápidas sobre los últimos movimientos asociados a tu cuenta.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-gray-600">
            <li>
              • Último cambio de contraseña registrado: <span className="font-medium text-gray-900">pendiente de implementar</span>
            </li>
            <li>
              • Recordatorio: guarda tus dispositivos de confianza para saltarte el doble factor (próximamente)
            </li>
            <li>
              • Los movimientos relevantes quedarán registrados en el libro de auditoría.
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

