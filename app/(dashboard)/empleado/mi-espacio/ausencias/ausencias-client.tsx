'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { PageMobileHeader } from '@/components/layout/page-mobile-header';
import { AusenciasTab } from '@/components/shared/mi-espacio/ausencias-tab';

interface MiEspacioAusenciasClientProps {
  empleadoId: string;
}

export function MiEspacioAusenciasClient({ empleadoId }: MiEspacioAusenciasClientProps) {
  const [solicitudModalOpen, setSolicitudModalOpen] = useState(false);

  return (
    <div className="h-full w-full flex flex-col px-1 py-1 sm:max-w-[1800px] sm:mx-auto sm:px-8 sm:py-6">
      {/* Mobile Header - sin fondo */}
      <PageMobileHeader
        title="Ausencias"
        actions={[
          {
            label: 'Solicitar ausencia',
            onClick: () => setSolicitudModalOpen(true),
            icon: Plus,
            isPrimary: true,
          },
        ]}
      />

      {/* Desktop Header */}
      <div className="hidden sm:flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ausencias</h1>
          <p className="text-sm text-gray-500">
            Consulta tu saldo, calendario y solicita nuevas ausencias
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div>
          <AusenciasTab
            empleadoId={empleadoId}
            contexto="empleado"
            externalModalOpen={solicitudModalOpen}
            onExternalModalOpenChange={setSolicitudModalOpen}
          />
        </div>
      </div>
    </div>
  );
}









