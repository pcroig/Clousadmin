'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { PageMobileHeader } from '@/components/layout/page-mobile-header';
import { FichajesTab } from '@/components/shared/mi-espacio/fichajes-tab';
import { Button } from '@/components/ui/button';

import type { MiEspacioEmpleado } from '@/types/empleado';

interface MiEspacioFichajesClientProps {
  empleadoId: string;
  empleado?: MiEspacioEmpleado;
}

export function MiEspacioFichajesClient({ empleadoId, empleado }: MiEspacioFichajesClientProps) {
  const [manualModalOpen, setManualModalOpen] = useState(false);

  return (
    <div className="h-full w-full flex flex-col px-1 py-1 sm:max-w-[1800px] sm:mx-auto sm:px-8 sm:py-6">
      {/* Mobile Header - sin fondo */}
      <PageMobileHeader
        title="Fichajes"
        actions={[
          {
            label: 'Solicitar',
            onClick: () => setManualModalOpen(true),
            icon: Plus,
            isPrimary: true,
            isSpecialAction: true,
          },
        ]}
      />

      {/* Desktop Header */}
      <div className="hidden sm:flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fichajes</h1>
          <p className="text-sm text-gray-500">
            Revisa tus jornadas registradas y solicita correcciones si es necesario
          </p>
        </div>
        <Button size="sm" onClick={() => setManualModalOpen(true)}>
          Solicitar fichaje manual
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div>
          <FichajesTab
            empleadoId={empleadoId}
            empleado={empleado}
            contexto="empleado"
            manualModalOpen={manualModalOpen}
            onManualModalOpenChange={setManualModalOpen}
            showManualActionButton={false}
          />
        </div>
      </div>
    </div>
  );
}

