'use client';

import { FileSignature } from 'lucide-react';
import { useState } from 'react';

import { FirmasDetails } from '@/components/firma/firmas-details';
import { PageMobileHeader } from '@/components/layout/page-mobile-header';
import { DetailsPanel } from '@/components/shared/details-panel';
import { DocumentosTab } from '@/components/shared/mi-espacio/documentos-tab';
import { Button } from '@/components/ui/button';

import type { MiEspacioEmpleado } from '@/types/empleado';

interface MiEspacioDocumentosClientProps {
  empleado: MiEspacioEmpleado;
}

export function MiEspacioDocumentosClient({ empleado }: MiEspacioDocumentosClientProps) {
  const [firmasDetailsOpen, setFirmasDetailsOpen] = useState(false);

  return (
    <>
      <div className="h-full w-full flex flex-col px-1 py-1 sm:max-w-[1800px] sm:mx-auto sm:px-8 sm:py-6">
        {/* Mobile Header - sin fondo */}
        <PageMobileHeader
          title="Documentos"
          actions={[
            {
              icon: FileSignature,
              label: 'Firmas',
              onClick: () => setFirmasDetailsOpen(true),
              isPrimary: true,
            },
          ]}
        />

        {/* Desktop Header */}
        <div className="hidden sm:block mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-sm uppercase tracking-wide text-gray-500">Documentos</p>
                <h2 className="text-2xl font-semibold text-gray-900">Mis carpetas</h2>
              </div>
              <p className="text-sm text-gray-500">
                Accede a tus documentos personales y compartidos
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFirmasDetailsOpen(true)}
              className="gap-2"
            >
              <FileSignature className="h-4 w-4" />
              <span>Firmas</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div>
            <DocumentosTab empleado={empleado} />
          </div>
        </div>
      </div>

      {/* Panel de Firmas */}
      <DetailsPanel
        isOpen={firmasDetailsOpen}
        onClose={() => setFirmasDetailsOpen(false)}
        title="Firmas"
      >
        <FirmasDetails
          isHRView={false}
          onClose={() => setFirmasDetailsOpen(false)}
        />
      </DetailsPanel>
    </>
  );
}
