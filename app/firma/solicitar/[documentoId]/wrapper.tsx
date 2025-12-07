'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamic import para evitar DOMMatrix error en SSR
// pdf.js requiere APIs del navegador que no están disponibles en Node.js
const SolicitarFirmaClient = dynamic(
  () => import('./solicitar-firma-client').then((mod) => ({ default: mod.SolicitarFirmaClient })),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
          <p className="text-sm text-gray-600">Cargando documento...</p>
        </div>
      </div>
    ),
  }
);

interface SolicitarFirmaClientWrapperProps {
  documentoId: string;
}

export function SolicitarFirmaClientWrapper({ documentoId }: SolicitarFirmaClientWrapperProps) {
  return <SolicitarFirmaClient documentoId={documentoId} />;
}
