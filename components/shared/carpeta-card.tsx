// ========================================
// Carpeta Card Component - Reusable
// ========================================
// Tarjeta de carpeta unificada para admin y empleados/managers

'use client';

import { memo } from 'react';
import { Folder } from 'lucide-react';

export interface CarpetaCardData {
  id: string;
  nombre: string;
  esSistema?: boolean;
  compartida?: boolean;
  numeroDocumentos?: number;
  documentos?: Array<{ id: string }>;
}

interface CarpetaCardProps {
  carpeta: CarpetaCardData;
  onClick?: (carpetaId: string) => void;
}

export const CarpetaCard = memo(function CarpetaCard({ carpeta, onClick }: CarpetaCardProps) {
  const documentosCount = carpeta.numeroDocumentos ?? carpeta.documentos?.length ?? 0;

  const handleClick = () => {
    onClick?.(carpeta.id);
  };

  return (
    <div
      className="group cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <div className="bg-gray-50/50 rounded-3xl p-6 group-hover:bg-gray-100/50 transition-all duration-200 border border-gray-200">
        <div className="flex flex-col items-center space-y-3">
          {/* Círculo con icono de carpeta */}
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-200 shadow-sm">
            <Folder className="w-14 h-14 text-gray-600 group-hover:text-gray-700 transition-colors" strokeWidth={1.5} />
          </div>

          {/* Nombre de la carpeta */}
          <div className="text-center w-full">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {carpeta.nombre}
            </p>

            {/* Info adicional */}
            <div className="flex flex-col items-center gap-0.5">
              {carpeta.esSistema && (
                <span className="text-xs text-gray-500 font-medium">Sistema</span>
              )}
              {carpeta.compartida && (
                <span className="text-xs text-gray-500 font-medium">Compartida</span>
              )}
              {documentosCount > 0 && (
                <p className="text-xs text-gray-500">
                  {documentosCount} doc{documentosCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});




