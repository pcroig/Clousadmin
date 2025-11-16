'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MiEspacioCarpeta, MiEspacioEmpleado } from '@/types/empleado';
import { FirmasTab } from '@/components/firma/firmas-tab';

interface DocumentosTabProps {
  empleado: MiEspacioEmpleado;
}

type DocumentosTabKey = 'personales' | 'compartidos' | 'firmas';

export function DocumentosTab({ empleado }: DocumentosTabProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = useMemo<DocumentosTabKey>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'compartidos' || tabParam === 'firmas') {
      return tabParam;
    }
    return 'personales';
  }, [searchParams]);

  const [activeDocTab, setActiveDocTab] = useState<DocumentosTabKey>(initialTab);

  useEffect(() => {
    setActiveDocTab(initialTab);
  }, [initialTab]);

  const handleChangeTab = (tab: DocumentosTabKey) => {
    setActiveDocTab(tab);
    router.replace(`/empleado/mi-espacio/documentos?tab=${tab}`);
  };

  const carpetas: MiEspacioCarpeta[] = empleado.carpetas ?? [];
  const carpetasPersonales = carpetas.filter((c) => !c.compartida);
  const carpetasCompartidas = carpetas.filter((c) => c.compartida);

  const renderCarpetas = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
      {activeDocTab === 'personales' ? (
        carpetasPersonales.length > 0 ? (
          carpetasPersonales.map((carpeta) => (
            <div key={carpeta.id} className="flex flex-col items-center cursor-pointer group">
              <svg
                className="w-16 h-16 text-gray-600 mb-3 group-hover:text-[#c6613f] transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <p className="text-sm font-medium text-gray-900 text-center">{carpeta.nombre}</p>
              {(carpeta.documentos?.length ?? 0) > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {carpeta.documentos?.length ?? 0} documento
                  {(carpeta.documentos?.length ?? 0) !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <p className="text-sm text-gray-500">No hay carpetas personales</p>
          </div>
        )
      ) : carpetasCompartidas.length > 0 ? (
        carpetasCompartidas.map((carpeta) => (
          <div key={carpeta.id} className="flex flex-col items-center cursor-pointer group">
            <svg
              className="w-16 h-16 text-gray-600 mb-3 group-hover:text-[#c6613f] transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-900 text-center">{carpeta.nombre}</p>
            {(carpeta.documentos?.length ?? 0) > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {carpeta.documentos?.length ?? 0} documento
                {(carpeta.documentos?.length ?? 0) !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        ))
      ) : (
        <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <p className="text-sm text-gray-500">No hay documentos compartidos</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Mis Documentos</h2>
        <p className="text-sm text-gray-500 mt-1">
          Accede a tus documentos personales, compartidos y solicitudes de firma
        </p>
      </div>

      {/* Toggle Personales/Compartidos/Firmas */}
      <div className="inline-flex flex-wrap rounded-lg border border-gray-200 p-1 gap-2">
        <button
          onClick={() => handleChangeTab('personales')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeDocTab === 'personales'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Personales
        </button>
        <button
          onClick={() => handleChangeTab('compartidos')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeDocTab === 'compartidos'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Compartidos
        </button>
        <button
          onClick={() => handleChangeTab('firmas')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeDocTab === 'firmas'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Firmas
        </button>
      </div>

      {activeDocTab === 'firmas' ? <FirmasTab /> : renderCarpetas()}
    </div>
  );
}
