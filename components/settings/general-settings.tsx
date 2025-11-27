// ========================================
// General Settings Component
// ========================================

'use client';

import { BellRing, CalendarClock, FileSpreadsheet, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { LoadingButton } from '@/components/shared/loading-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { parseJson } from '@/lib/utils/json';


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
  const [showDerechoDialog, setShowDerechoDialog] = useState(false);
  const [isRequestingDerecho, setIsRequestingDerecho] = useState(false);
  const [isExportingDatos, setIsExportingDatos] = useState(false);
  const [isExportingFichajes, setIsExportingFichajes] = useState(false);

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

  const handleExportFichajes = async () => {
    setIsExportingFichajes(true);
    let url: string | null = null;
    try {
      const response = await fetch('/api/empleados/me/fichajes/export');

      if (!response.ok) {
        const payload = await parseJson<{ error?: string }>(response).catch(() => null);
        throw new Error(payload?.error || 'No se pudo generar la exportación');
      }

      const blob = await response.blob();
      url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fichajes-${new Date().getFullYear()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Historial de fichajes descargado correctamente');
    } catch (error) {
      console.error('Exportación fichajes:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Hubo un error generando la exportación de fichajes'
      );
    } finally {
      if (url) {
        window.URL.revokeObjectURL(url);
      }
      setIsExportingFichajes(false);
    }
  };

  const handleExportDatos = async () => {
    setIsExportingDatos(true);
    let url: string | null = null;
    try {
      const response = await fetch('/api/empleados/export/me');

      if (!response.ok) {
        const payload = await parseJson<{ error?: string }>(response).catch(() => null);
        throw new Error(payload?.error || 'No se pudo generar la exportación');
      }

      const blob = await response.blob();
      url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `datos-personales-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Exportación generada correctamente');
    } catch (error) {
      console.error('Exportación datos personales:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Hubo un error generando la exportación de datos'
      );
    } finally {
      if (url) {
        window.URL.revokeObjectURL(url);
      }
      setIsExportingDatos(false);
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
          <div className="rounded-md bg-emerald-50 p-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <CardTitle>Exportar tus datos</CardTitle>
            <CardDescription>
              Descarga un Excel con tu información personal, fichajes, ausencias y contratos vinculados.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            El archivo incluye todas las tablas relevantes para el cumplimiento del derecho de acceso (GDPR).
            Guárdalo en un lugar seguro: contiene información sensible.
          </p>
          <div className="flex justify-end gap-3">
            <LoadingButton
              variant="outline"
              loading={isExportingFichajes}
              onClick={handleExportFichajes}
            >
              Exportar Fichajes
            </LoadingButton>
            <LoadingButton
              variant="outline"
              loading={isExportingDatos}
              onClick={handleExportDatos}
            >
              Descargar Datos (GDPR)
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-start gap-3">
          <div className="rounded-md bg-red-50 p-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <CardTitle>Derecho al olvido</CardTitle>
            <CardDescription>
              Solicita la eliminación/anónimización de tus datos personales ante el equipo de RR.HH.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Registramos tu petición y avisamos automáticamente a RR.HH. para que analice la solicitud.
            Te recomendamos descargar antes una copia de tus datos con la exportación anterior.
          </p>
          <div className="flex justify-end">
            <Button variant="destructive" onClick={() => setShowDerechoDialog(true)}>
              Solicitar derecho al olvido
            </Button>
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

      <Dialog open={showDerechoDialog} onOpenChange={setShowDerechoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              Confirmar solicitud
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Al confirmar registramos tu petición de derecho al olvido y notificamos a RR.HH. para que
            revise el caso. La respuesta puede tardar varios días y no eliminará los datos de forma
            inmediata hasta que se procese la aprobación.
          </p>
          <DialogFooter className="gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowDerechoDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                setIsRequestingDerecho(true);
                try {
                  const response = await fetch('/api/empleados/derecho-olvido', {
                    method: 'POST',
                  });
                  if (!response.ok) {
                    const payload = await parseJson<{ error?: string }>(response).catch(() => null);
                    throw new Error(payload?.error || 'No se pudo registrar la solicitud');
                  }
                  toast.success('Solicitud de derecho al olvido registrada');
                  setShowDerechoDialog(false);
                } catch (error) {
                  console.error('Solicitud derecho al olvido:', error);
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : 'Hubo un error registrando la solicitud'
                  );
                } finally {
                  setIsRequestingDerecho(false);
                }
              }}
              disabled={isRequestingDerecho}
            >
              {isRequestingDerecho ? 'Registrando...' : 'Confirmar solicitud'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

