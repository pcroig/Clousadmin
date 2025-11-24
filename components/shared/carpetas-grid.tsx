// ========================================
// Carpetas Grid Component - Reusable
// ========================================
// Grid de carpetas con estado vacío y diseño unificado

'use client';

import { Folder } from 'lucide-react';
import { memo } from 'react';

import { CarpetaCard, type CarpetaCardData } from './carpeta-card';

export type { CarpetaCardData };

interface CarpetasGridProps {
  carpetas: CarpetaCardData[];
  onCarpetaClick?: (carpetaId: string) => void;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
}

export const CarpetasGrid = memo(function CarpetasGrid({
  carpetas,
  onCarpetaClick,
  emptyStateTitle = 'No hay carpetas',
  emptyStateDescription = 'Empieza subiendo documentos desde el escritorio principal',
}: CarpetasGridProps) {
  if (carpetas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white py-12 text-center">
        <Folder className="mb-3 h-12 w-12 text-gray-300" strokeWidth={1.5} />
        <p className="text-sm font-medium text-gray-700">{emptyStateTitle}</p>
        <p className="mt-1 text-xs text-gray-500">{emptyStateDescription}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {carpetas.map((carpeta) => (
        <CarpetaCard key={carpeta.id} carpeta={carpeta} onClick={onCarpetaClick} />
      ))}
    </div>
  );
});









