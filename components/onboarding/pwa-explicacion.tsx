'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Apple, Smartphone, Share2, PlusCircle } from 'lucide-react';
import { LoadingButton } from '@/components/shared/loading-button';

interface PWAExplicacionProps {
  onComplete?: () => void;
  showCompleteButton?: boolean;
  loading?: boolean;
}

export function PWAExplicacion({ onComplete, showCompleteButton = false, loading = false }: PWAExplicacionProps) {
  const [activeTab, setActiveTab] = useState('ios');

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
                Desplázate hacia abajo y selecciona "Añadir a pantalla de inicio" <PlusCircle className="inline-block h-4 w-4 mx-1" />.
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
                Selecciona "Añadir a pantalla de inicio" o "Instalar aplicación".
              </li>
              <li>
                Confirma la instalación y Clousadmin aparecerá como una aplicación en tu pantalla de inicio.
              </li>
            </ol>
          </TabsContent>
        </div>
      </Tabs>

      {showCompleteButton && (
        <div className="flex justify-center pt-4 border-t">
          <LoadingButton
            onClick={onComplete}
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

