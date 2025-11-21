'use client';

import { useState } from 'react';
import { DownloadCloud, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { usePWAInstallPrompt } from '@/lib/hooks/use-pwa-install';
import { useIsMobile } from '@/lib/hooks/use-viewport';

export function PWAInstallBanner() {
  const { canInstall, promptInstall, dismiss } = usePWAInstallPrompt();
  const isMobile = useIsMobile();
  const [installing, setInstalling] = useState(false);

  if (!isMobile || !canInstall) {
    return null;
  }

  const handleInstall = async () => {
    try {
      setInstalling(true);
      await promptInstall();
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 sm:hidden">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-lg shadow-gray-900/10">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-gray-100 p-2">
            <DownloadCloud className="h-5 w-5 text-[#d97757]" />
          </div>
          <div className="flex-1 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">Instala Clousadmin</p>
            <p>Ábrelo como app nativa, con acceso rápido desde tu pantalla de inicio.</p>
            <div className="mt-3 flex gap-2">
              <Button onClick={handleInstall} size="sm" disabled={installing}>
                {installing ? 'Instalando...' : 'Instalar app'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => dismiss()}>
                Más tarde
              </Button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismiss()}
            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar anuncio de instalación"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

