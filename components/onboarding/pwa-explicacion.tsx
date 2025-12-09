'use client';

import { Apple, DownloadCloud, PlusCircle, Share2, Smartphone } from 'lucide-react';
import { useState } from 'react';

import { LoadingButton } from '@/components/shared/loading-button';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePWAInstallPrompt } from '@/lib/hooks/use-pwa-install';

interface PWAExplicacionProps {
  onComplete?: () => void;
  showCompleteButton?: boolean;
  loading?: boolean;
  token?: string; // Token para llamar al endpoint de progreso
}

export function PWAExplicacion({ onComplete, showCompleteButton = false, loading = false, token }: PWAExplicacionProps) {
  const [activeTab, setActiveTab] = useState('ios');
  const [installing, setInstalling] = useState(false);
  const { canInstall, promptInstall } = usePWAInstallPrompt();

  const handleInstall = async () => {
    try {
      setInstalling(true);
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  const handleComplete = async () => {
    if (!token || !onComplete) {
      // Si no hay token, solo llamar a onComplete (onboarding simplificado)
      onComplete?.();
      return;
    }

    try {
      // Llamar al endpoint para guardar el progreso
      const response = await fetch(`/api/onboarding/${token}/pwa-completado`, {
        method: 'POST',
      });

      if (response.ok) {
        onComplete();
      }
    } catch (error) {
      console.error('[PWAExplicacion] Error al guardar progreso:', error);
      // Llamar a onComplete de todos modos
      onComplete();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Instala Clousadmin en tu móvil</h2>
        <p className="text-gray-600">
          Accede a la aplicación directamente desde la pantalla de inicio de tu smartphone.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ios" className="flex items-center gap-2">
            <Apple className="h-4 w-4" />
            <span>iPhone (iOS)</span>
          </TabsTrigger>
          <TabsTrigger value="android" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span>Android</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="ios" className="space-y-4">
            <h3 className="font-semibold text-lg">Para usuarios de iPhone (iOS):</h3>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>
                Abre Safari y visita esta página web (Clousadmin).
              </li>
              <li>
                Toca el icono de <Share2 className="inline-block h-4 w-4 mx-1" /> (Compartir) en la barra inferior de Safari.
              </li>
              <li>
                Desplázate hacia abajo y selecciona «Añadir a pantalla de inicio» <PlusCircle className="inline-block h-4 w-4 mx-1" />.
              </li>
              <li>
                Confirma la adición y Clousadmin aparecerá como una aplicación en tu pantalla de inicio.
              </li>
            </ol>
          </TabsContent>

          <TabsContent value="android" className="space-y-4">
            <h3 className="font-semibold text-lg">Para usuarios de Android:</h3>
            <ol className="list-decimal list-inside space-y-3 text-gray-700">
              <li>
                Abre Chrome y visita esta página web (Clousadmin).
              </li>
              <li>
                Toca el icono de menú <span className="font-bold">⋮</span> (tres puntos) en la esquina superior derecha.
              </li>
              <li>
                Selecciona «Añadir a pantalla de inicio» o «Instalar aplicación».
              </li>
              <li>
                Confirma la instalación y Clousadmin aparecerá como una aplicación en tu pantalla de inicio.
              </li>
            </ol>
          </TabsContent>
        </div>
      </Tabs>

      {canInstall && (
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
          <DownloadCloud className="h-5 w-5 text-[#d97757]" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Listo para instalar</p>
            <p>Clousadmin está optimizado como app. Pulsa instalar para añadirlo a tu móvil.</p>
          </div>
          <Button size="sm" onClick={handleInstall} disabled={installing}>
            {installing ? 'Instalando...' : 'Instalar'}
          </Button>
        </div>
      )}

      {showCompleteButton && (
        <div className="flex justify-center pt-4 border-t">
          <LoadingButton
            onClick={handleComplete}
            loading={loading}
            className="w-full sm:w-auto"
          >
            {loading ? 'Cargando...' : 'Entendido, continuar'}
          </LoadingButton>
        </div>
      )}
    </div>
  );
}

