// ========================================
// Carpeta Card Component - Reusable
// ========================================
// Tarjeta de carpeta unificada para admin y empleados/managers

'use client';

import { Folder } from 'lucide-react';
import { memo } from 'react';

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
    <>
      {/* MOBILE: Lista compacta */}
      <button
        className="sm:hidden w-full flex items-center gap-3 p-2.5 bg-white rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors text-left"
        onClick={handleClick}
      >
        {/* Icono de carpeta */}
        <div className="flex-shrink-0">
          <Folder className="w-8 h-8 text-[#d97757]" strokeWidth={1.5} />
        </div>

        {/* Nombre e info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate">
            {carpeta.nombre}
          </p>
          <p className="text-[10px] text-gray-500">
            {documentosCount} {documentosCount === 1 ? 'archivo' : 'archivos'}
          </p>
        </div>

        {/* Badges opcionales */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {carpeta.compartida && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
              Compartida
            </span>
          )}
        </div>

        {/* Chevron */}
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* DESKTOP: Grid con diseño original */}
      <div
        className="hidden sm:block group cursor-pointer"
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
    </>
  );
});









