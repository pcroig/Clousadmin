// ========================================
// Integrations Client Component - Employee
// ========================================

'use client';

import { AlertCircle, Calendar, Check, ExternalLink, Plug, User, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { SettingsLayout } from '@/components/settings/settings-layout';
import { LoadingButton } from '@/components/shared/loading-button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';



import type { Integracion } from '@prisma/client';

interface IntegrationsClientProps {
  googleConfigured: boolean;
  personalIntegrations: Integracion[];
  userRole: string;
}

export function IntegrationsClient({
  googleConfigured,
  personalIntegrations,
}: IntegrationsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Handle OAuth callback success/error messages
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'true') {
      toast.success('Calendario conectado correctamente');

      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      router.refresh();
    } else if (error) {
      let errorMessage = 'Error al conectar calendario';

      if (error === 'oauth_error') {
        errorMessage = 'Error en la autenticación con Google. Por favor, intenta de nuevo.';
      } else if (error === 'calendar_creation_failed') {
        errorMessage = 'No se pudo crear el calendario en Google Calendar.';
      } else if (error === 'integration_save_failed') {
        errorMessage = 'No se pudo guardar la integración. Por favor, contacta con soporte.';
      }

      toast.error(errorMessage);

      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, router]);

  const hasPersonalCalendar = personalIntegrations.some(
    (i) => i.proveedor === 'google_calendar' && i.activa
  );

  const handleConnectCalendar = async () => {
    setConnecting(true);

    try {
      // Redirigir a la ruta de conexión
      window.location.href = '/api/integrations/calendar/connect?type=personal';
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast.error('Error al conectar calendario');
      setConnecting(false);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    if (!confirm('¿Estás seguro de que quieres desconectar tu calendario?')) {
      return;
    }

    setDisconnecting(integrationId);

    try {
      const response = await fetch(
        `/api/integrations/calendar/disconnect?id=${integrationId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      toast.success('Calendario desconectado correctamente');
      router.refresh();
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Error al desconectar calendario');
    } finally {
      setDisconnecting(null);
    }
  };

  if (!googleConfigured) {
    return (
      <SettingsLayout rol="empleado">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Integraciones</h2>
            <p className="text-sm text-gray-500 mt-1">
              Conecta Clousadmin con tus herramientas favoritas
            </p>
          </div>

          <Card className="border-yellow-200 bg-yellow-50/30">
            <CardHeader>
              <div className="flex items-start gap-4">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <CardTitle className="text-base text-yellow-900">
                    Integraciones no disponibles
                  </CardTitle>
                  <CardDescription className="mt-2 text-yellow-800">
                    Las integraciones de calendario no están configuradas actualmente.
                    Por favor, contacta con tu administrador de RRHH.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout rol="empleado">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Integraciones</h2>
          <p className="text-sm text-gray-500 mt-1">
            Conecta tu calendario personal para sincronizar tus ausencias automáticamente
          </p>
        </div>
        {/* Google Calendar Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar
          </h2>

          <div className="space-y-4">
            {/* Personal Calendar */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <User className="w-5 h-5 text-purple-700" />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        Mi Calendario Personal
                        {hasPersonalCalendar && (
                          <Badge variant="default" className="bg-green-100 text-green-700">
                            <Check className="w-3 h-3 mr-1" />
                            Conectado
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Sincroniza tus ausencias en tu calendario personal de Google
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {hasPersonalCalendar ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">
                          Calendario Principal
                        </span>
                      </div>
                      {personalIntegrations.map((integration) => (
                        <LoadingButton
                          key={integration.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(integration.id)}
                          loading={disconnecting === integration.id}
                          disabled={disconnecting === integration.id}
                        >
                          <X className="w-4 h-4 mr-2" />
                          {disconnecting === integration.id ? 'Desconectando...' : 'Desconectar'}
                        </LoadingButton>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Tus ausencias aprobadas se sincronizan automáticamente en tu calendario principal de Google
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      Conecta tu calendario personal de Google para ver tus ausencias sincronizadas
                      automáticamente.
                    </p>
                    <LoadingButton
                      onClick={handleConnectCalendar}
                      loading={connecting}
                      disabled={connecting}
                      className="w-full sm:w-auto"
                    >
                      <Plug className="w-4 h-4 mr-2" />
                      {connecting ? 'Conectando...' : 'Conectar Mi Calendario'}
                    </LoadingButton>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <div className="flex items-start gap-4">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <CardTitle className="text-base text-blue-900">
                  ¿Cómo funciona la sincronización?
                </CardTitle>
                <CardDescription className="mt-2 text-blue-800 space-y-2">
                  <p>
                    • Cuando tu ausencia es <strong>aprobada</strong>, se crea automáticamente un
                    evento en tu calendario
                  </p>
                  <p>
                    • Cuando tu ausencia es <strong>rechazada o cancelada</strong>, el evento se
                    elimina del calendario
                  </p>
                  <p>
                    • Los eventos incluyen el tipo de ausencia y las fechas
                  </p>
                  <p className="pt-2">
                    <a
                      href="https://calendar.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-800 underline"
                    >
                      Abrir Google Calendar
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </SettingsLayout>
  );
}
