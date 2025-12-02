'use client';

import { PageMobileHeader } from '@/components/layout/page-mobile-header';
import { DocumentosTab } from '@/components/shared/mi-espacio/documentos-tab';

import type { MiEspacioEmpleado } from '@/types/empleado';

interface MiEspacioDocumentosClientProps {
  empleado: MiEspacioEmpleado;
}

export function MiEspacioDocumentosClient({ empleado }: MiEspacioDocumentosClientProps) {
  return (
    <div className="h-full w-full flex flex-col px-1 py-1 sm:max-w-[1800px] sm:mx-auto sm:px-8 sm:py-6">
      {/* Mobile Header - sin fondo */}
      <PageMobileHeader title="Documentos" />

      {/* Desktop Header */}
      <div className="hidden sm:block mb-6">
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">Documentos</p>
            <h2 className="text-2xl font-semibold text-gray-900">Mis carpetas</h2>
          </div>
          <p className="text-sm text-gray-500">
            Accede a tus documentos personales y compartidos
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div>
          <DocumentosTab empleado={empleado} />
        </div>
      </div>
    </div>
  );
}
