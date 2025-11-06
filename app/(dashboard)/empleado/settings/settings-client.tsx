// ========================================
// Settings Client Component - Empleado
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  HeadphonesIcon,
  Bell,
  Plug,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { LoadingButton } from '@/components/shared/loading-button';
import Link from 'next/link';

interface SettingsClientProps {
  usuario: {
    nombre: string;
    apellidos: string;
    email: string;
  };
}

export function SettingsClient({ usuario }: SettingsClientProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { logoutAction } = await import('@/app/(auth)/login/actions');
      await logoutAction();
      await new Promise((resolve) => setTimeout(resolve, 100));
      window.location.href = '/login';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
      window.location.href = '/login';
    } finally {
      setLoggingOut(false);
    }
  };

  const settingsOptions = [
    {
      id: 'support',
      title: 'Contactar con soporte',
      description: 'Envíanos tus preguntas o reporta un problema',
      icon: HeadphonesIcon,
      action: () => {
        window.open('mailto:soporte@clousadmin.com?subject=Soporte - ' + usuario.email, '_blank');
      },
      available: true,
    },
    {
      id: 'integrations',
      title: 'Integraciones',
      description: 'Conecta tu calendario personal de Google',
      icon: Plug,
      action: () => {
        router.push('/empleado/settings/integraciones');
      },
      available: true,
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      description: 'Configura tus preferencias de notificaciones',
      icon: Bell,
      action: () => {
        toast.info('Configuración de notificaciones próximamente disponible');
      },
      available: false,
      badge: 'Próximamente',
    },
  ];

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/empleado/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Volver al Dashboard</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-600 mt-1">
          {usuario.nombre} {usuario.apellidos} · {usuario.email}
        </p>
      </div>

      {/* Settings Options */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {settingsOptions.map((option) => (
          <Card
            key={option.id}
            className={`${
              option.available ? 'hover:border-gray-400 cursor-pointer' : 'opacity-75'
            } transition-all`}
            onClick={option.action}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <option.icon className="w-5 h-5 text-gray-700" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {option.title}
                      {option.badge && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-normal">
                          {option.badge}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">{option.description}</CardDescription>
                  </div>
                </div>
                {option.available && <ExternalLink className="w-4 h-4 text-gray-400" />}
              </div>
            </CardHeader>
          </Card>
        ))}

        {/* Logout Section */}
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader>
            <CardTitle className="text-base text-red-700">Cerrar sesión</CardTitle>
            <CardDescription>
              Cierra tu sesión en este dispositivo. Tendrás que volver a iniciar sesión para
              acceder.
            </CardDescription>
            <div className="pt-4">
              <LoadingButton
                variant="destructive"
                onClick={handleLogout}
                loading={loggingOut}
                className="w-full sm:w-auto"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </LoadingButton>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
