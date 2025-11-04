// ========================================
// Documentos Client Component - Empleado View
// ========================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, FileText } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

export function MiEspacioDocumentosClient({ empleado }: any) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'personales' | 'compartidos'>('personales');

  const carpetasPersonales = empleado.carpetas?.filter((c: any) => !c.compartida) || [];
  const carpetasCompartidas = empleado.carpetas?.filter((c: any) => c.compartida) || [];

  const handleAbrirCarpeta = (carpetaId: string) => {
    router.push(`/empleado/mi-espacio/documentos/${carpetaId}`);
  };

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Mis Documentos</h1>
        <p className="text-sm text-gray-600 mt-1">
          Accede a tus documentos personales y compartidos
        </p>
      </div>

      {/* Toggle Personales/Compartidos */}
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div className="inline-flex rounded-lg border border-gray-200 p-1">
          <button
            onClick={() => setActiveTab('personales')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'personales'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Personales
          </button>
          <button
            onClick={() => setActiveTab('compartidos')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'compartidos'
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Compartidos
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6 flex-shrink-0">
        {activeTab === 'personales'
          ? 'Tus carpetas personales del sistema'
          : 'Documentos compartidos por tu empresa'}
      </p>

      {/* Grid de carpetas */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 pb-6">
          {activeTab === 'personales' ? (
            carpetasPersonales.length > 0 ? (
              carpetasPersonales.map((carpeta: any) => (
                <div
                  key={carpeta.id}
                  className="cursor-pointer group"
                  onClick={() => handleAbrirCarpeta(carpeta.id)}
                >
                  {/* Contenedor con fondo suave */}
                  <div className="bg-gray-50/50 rounded-3xl p-6 group-hover:bg-gray-100/50 transition-all duration-200 border border-gray-200">
                    <div className="flex flex-col items-center space-y-3">
                      <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-200 shadow-sm">
                        <Folder className="w-14 h-14 text-gray-600 group-hover:text-gray-700 transition-colors" strokeWidth={1.5} />
                      </div>
                      <div className="text-center w-full">
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          {carpeta.nombre}
                        </p>
                        <div className="flex flex-col items-center gap-0.5">
                          {carpeta.esSistema && (
                            <span className="text-xs text-gray-500 font-medium">Sistema</span>
                          )}
                          {carpeta.documentos && carpeta.documentos.length > 0 && (
                            <p className="text-xs text-gray-500">
                              {carpeta.documentos.length} doc{carpeta.documentos.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full">
                <EmptyState
                  variant="primary"
                  icon={Folder}
                  title="No hay carpetas personales"
                  description="Las carpetas personales aparecerán aquí cuando las tengas disponibles"
                />
              </div>
            )
          ) : carpetasCompartidas.length > 0 ? (
            carpetasCompartidas.map((carpeta: any) => (
              <div
                key={carpeta.id}
                className="cursor-pointer group"
                onClick={() => handleAbrirCarpeta(carpeta.id)}
              >
                {/* Contenedor con fondo suave */}
                <div className="bg-gray-50/50 rounded-3xl p-6 group-hover:bg-gray-100/50 transition-all duration-200 border border-gray-200">
                  <div className="flex flex-col items-center space-y-3">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center group-hover:from-gray-200 group-hover:to-gray-300 transition-all duration-200 shadow-sm">
                      <Folder className="w-14 h-14 text-gray-600 group-hover:text-gray-700 transition-colors" strokeWidth={1.5} />
                    </div>
                    <div className="text-center w-full">
                      <p className="text-sm font-semibold text-gray-900 mb-1">
                        {carpeta.nombre}
                      </p>
                      {carpeta.documentos && carpeta.documentos.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {carpeta.documentos.length} doc{carpeta.documentos.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full">
              <EmptyState
                variant="primary"
                icon={Folder}
                title="No hay documentos compartidos"
                description="Los documentos compartidos por tu empresa aparecerán aquí"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
