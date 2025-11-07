// ========================================
// Notifications Settings Component
// ========================================

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Bell, Mail, MessageSquare } from 'lucide-react';

interface NotificationPreferences {
  emailAusencias: boolean;
  emailFichajes: boolean;
  emailDocumentos: boolean;
  emailNominas: boolean;
  pushAusencias: boolean;
  pushFichajes: boolean;
  pushDocumentos: boolean;
  pushNominas: boolean;
}

export function NotificationsSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    // Email notifications
    emailAusencias: true,
    emailFichajes: true,
    emailDocumentos: true,
    emailNominas: true,
    // Push notifications
    pushAusencias: false,
    pushFichajes: false,
    pushDocumentos: false,
    pushNominas: false,
  });

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const newValue = !preferences[key];
    
    setPreferences((prev) => ({
      ...prev,
      [key]: newValue,
    }));

    // TODO: Guardar en la base de datos
    toast.success('Preferencia actualizada');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Notificaciones</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configura cómo y cuándo quieres recibir notificaciones
        </p>
      </div>

      {/* Notificaciones por email */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Notificaciones por email</CardTitle>
              <CardDescription>
                Recibe actualizaciones importantes en tu correo electrónico
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-ausencias" className="text-sm font-medium">
                Ausencias
              </Label>
              <p className="text-xs text-gray-500">
                Notificaciones sobre solicitudes de ausencias y vacaciones
              </p>
            </div>
            <Switch
              id="email-ausencias"
              checked={preferences.emailAusencias}
              onCheckedChange={() => handleToggle('emailAusencias')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-fichajes" className="text-sm font-medium">
                Fichajes
              </Label>
              <p className="text-xs text-gray-500">
                Alertas sobre fichajes pendientes o incompletos
              </p>
            </div>
            <Switch
              id="email-fichajes"
              checked={preferences.emailFichajes}
              onCheckedChange={() => handleToggle('emailFichajes')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-documentos" className="text-sm font-medium">
                Documentos
              </Label>
              <p className="text-xs text-gray-500">
                Notificaciones cuando hay nuevos documentos disponibles
              </p>
            </div>
            <Switch
              id="email-documentos"
              checked={preferences.emailDocumentos}
              onCheckedChange={() => handleToggle('emailDocumentos')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-nominas" className="text-sm font-medium">
                Nóminas
              </Label>
              <p className="text-xs text-gray-500">
                Aviso cuando tu nómina esté disponible
              </p>
            </div>
            <Switch
              id="email-nominas"
              checked={preferences.emailNominas}
              onCheckedChange={() => handleToggle('emailNominas')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notificaciones push */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Bell className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Notificaciones push</CardTitle>
              <CardDescription>
                Recibe notificaciones en tiempo real en tu dispositivo
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800">
              <strong>Próximamente:</strong> Las notificaciones push estarán disponibles en una
              futura actualización.
            </p>
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div className="space-y-0.5">
              <Label htmlFor="push-ausencias" className="text-sm font-medium">
                Ausencias
              </Label>
              <p className="text-xs text-gray-500">
                Notificaciones push sobre solicitudes de ausencias
              </p>
            </div>
            <Switch
              id="push-ausencias"
              checked={preferences.pushAusencias}
              onCheckedChange={() => handleToggle('pushAusencias')}
              disabled
            />
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div className="space-y-0.5">
              <Label htmlFor="push-fichajes" className="text-sm font-medium">
                Fichajes
              </Label>
              <p className="text-xs text-gray-500">Alertas push sobre fichajes pendientes</p>
            </div>
            <Switch
              id="push-fichajes"
              checked={preferences.pushFichajes}
              onCheckedChange={() => handleToggle('pushFichajes')}
              disabled
            />
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div className="space-y-0.5">
              <Label htmlFor="push-documentos" className="text-sm font-medium">
                Documentos
              </Label>
              <p className="text-xs text-gray-500">Notificaciones push de nuevos documentos</p>
            </div>
            <Switch
              id="push-documentos"
              checked={preferences.pushDocumentos}
              onCheckedChange={() => handleToggle('pushDocumentos')}
              disabled
            />
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div className="space-y-0.5">
              <Label htmlFor="push-nominas" className="text-sm font-medium">
                Nóminas
              </Label>
              <p className="text-xs text-gray-500">Aviso push cuando tu nómina esté lista</p>
            </div>
            <Switch
              id="push-nominas"
              checked={preferences.pushNominas}
              onCheckedChange={() => handleToggle('pushNominas')}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferencias de resumen */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <MessageSquare className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Resúmenes periódicos</CardTitle>
              <CardDescription>
                Recibe resúmenes de actividad en intervalos regulares
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              Próximamente podrás configurar resúmenes diarios o semanales de tu actividad.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

